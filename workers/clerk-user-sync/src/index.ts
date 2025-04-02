import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Webhook } from 'svix';
import type { ExecutionContext } from '@cloudflare/workers-types'; // Import ExecutionContext

// Define the expected structure of the Clerk user.created event data
// Adjust based on actual Clerk payload if needed
interface UserCreatedEventData {
	id: string;
	email_addresses: { email_address: string; id: string }[];
	first_name: string | null;
	last_name: string | null;
	// Add other relevant fields if needed
}

interface WebhookEvent {
	data: UserCreatedEventData;
	object: 'event';
	type: 'user.created' | string; // Allow other event types but only process user.created
}

// Define the expected shape of the environment variables passed to the worker
export interface Env {
	CLERK_WEBHOOK_SIGNING_SECRET: string;
	SUPABASE_URL: string;
	SUPABASE_SERVICE_ROLE_KEY: string;
}

export default {
	// Add ExecutionContext type annotation back to _ctx
	async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
		// 1. Check request method
		if (request.method !== 'POST') {
			return new Response('Method Not Allowed', { status: 405 });
		}

		// 2. Get environment variables (secrets)
		const signingSecret = env.CLERK_WEBHOOK_SIGNING_SECRET;
		const supabaseUrl = env.SUPABASE_URL;
		const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

		if (!signingSecret || !supabaseUrl || !serviceRoleKey) {
			console.error('Missing environment variables in Cloudflare Worker settings.');
			return new Response('Internal Server Error: Missing configuration', { status: 500 });
		}

		// 3. Verify webhook signature
		const wh = new Webhook(signingSecret);
		let evt: WebhookEvent;

		try {
			const headers = Object.fromEntries(request.headers.entries());
			const payload = await request.text(); // Read body as text for verification

			// svix requires specific header names
			const svixHeaders = {
				'svix-id': headers['svix-id'],
				'svix-timestamp': headers['svix-timestamp'],
				'svix-signature': headers['svix-signature'],
			};

			if (!svixHeaders['svix-id'] || !svixHeaders['svix-timestamp'] || !svixHeaders['svix-signature']) {
				console.error('Missing Svix headers:', svixHeaders);
				return new Response('Error: Missing Svix headers', { status: 400 });
			}

			evt = wh.verify(payload, svixHeaders) as WebhookEvent;
			console.log('Webhook verified successfully. Event type:', evt.type);
		} catch (err) {
			console.error('Error verifying webhook:', err instanceof Error ? err.message : String(err));
			return new Response('Error: Verification failed', { status: 400 });
		}

		// 4. Process only 'user.created' events
		if (evt.type !== 'user.created') {
			console.log(`Ignoring event type: ${evt.type}`);
			return new Response('Event type ignored', { status: 200 }); // OK, but do nothing
		}

		// 5. Extract necessary data
		const clerkUserId = evt.data.id;
		const email = evt.data.email_addresses?.[0]?.email_address;
		const firstName = evt.data.first_name;
		const lastName = evt.data.last_name;
		const displayName = [firstName, lastName].filter(Boolean).join(' ') || null;

		if (!clerkUserId || !email) {
			console.error('Missing clerkUserId or email in webhook payload:', evt.data);
			return new Response('Error: Invalid payload data', { status: 400 });
		}

		console.log(`Processing user.created for Clerk ID: ${clerkUserId}, Email: ${email}`);

		try {
			// 6. Create Supabase Admin Client
			// Use the Service Role Key for admin operations
			const supabaseAdmin: SupabaseClient = createClient(supabaseUrl, serviceRoleKey, {
				auth: {
					autoRefreshToken: false,
					persistSession: false,
				},
			});

			// 7. Create user in Supabase Auth
			console.log(`Attempting to create Supabase auth user for email: ${email}`);
			let supabaseUserId: string | undefined;

			// Try to create the user
			const { data: authUserResponse, error: authError } = await supabaseAdmin.auth.admin.createUser({
				email: email,
				email_confirm: true, // Auto-confirm email for simplicity, adjust if needed
				// You might add user_metadata here if needed
				// user_metadata: { name: displayName }
			});

			if (authError) {
				// Check if the error is because the user already exists
				if (authError.message.includes('User already registered') || (authError as any)?.code === 'user_already_exists') {
					console.warn(`Supabase auth user with email ${email} already exists. Fetching existing user ID.`);
					// If user exists, fetch their ID
					// Note: Supabase Admin API doesn't have a direct getUserByEmail, so we query the table
					const { data: existingUser, error: fetchError } = await supabaseAdmin
						.from('users') // Query the actual auth.users table
						.select('id')
						.eq('email', email)
						.single();

					if (fetchError || !existingUser) {
						console.error('Failed to fetch existing Supabase auth user ID:', fetchError?.message);
						return new Response('Error: Failed to resolve existing auth user', { status: 500 });
					}
					supabaseUserId = existingUser.id;
					console.log(`Found existing Supabase auth user ID: ${supabaseUserId}`);
				} else {
					// For other auth errors, fail the request
					console.error('Error creating Supabase auth user:', authError.message);
					return new Response(`Error: Failed to create Supabase auth user - ${authError.message}`, { status: 500 });
				}
			} else if (authUserResponse?.user?.id) {
				supabaseUserId = authUserResponse.user.id;
				console.log(`Successfully created Supabase auth user. ID: ${supabaseUserId}`);
			} else {
				// If no error but also no user ID, something unexpected happened
				console.error('Failed to get Supabase User ID after creation attempt.');
				return new Response('Error: Could not obtain Supabase User ID', { status: 500 });
			}

			// 8. Create profile in 'profiles' table
			console.log(`Attempting to insert/upsert profile for Supabase ID: ${supabaseUserId}, Clerk ID: ${clerkUserId}`);
			const { error: profileError } = await supabaseAdmin.from('profiles').upsert(
				{
					id: supabaseUserId, // Link to the auth.users table
					clerk_id: clerkUserId, // Store the Clerk user ID
					email: email,
					name: displayName, // Use combined name or null
					display_name: displayName, // Use combined name or null
					ai_personality: 'Default', // Set a default personality or leave null
				},
				{ onConflict: 'clerk_id' } // If clerk_id exists, update instead of erroring (handles retries)
			);

			if (profileError) {
				console.error('Error upserting Supabase profile:', profileError.message);
				// Depending on the error, you might still want to return 200 if the auth user was created
				// but profile failed. Or return 500. Let's return 500 for now.
				return new Response(`Error: Failed to upsert Supabase profile - ${profileError.message}`, { status: 500 });
			}

			console.log(`Successfully upserted profile for Supabase ID: ${supabaseUserId}`);

			// 9. Return success
			return new Response(JSON.stringify({ success: true, supabaseUserId: supabaseUserId }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			});
		} catch (error) {
			console.error('Unexpected error processing webhook:', error instanceof Error ? error.message : String(error));
			return new Response('Internal Server Error', { status: 500 });
		}
	},
};
