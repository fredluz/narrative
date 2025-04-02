/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

// Define the expected environment variables (secrets)
export interface Env {
	OPENAI_API_KEY: string;
}

// Define the expected response structure from OpenAI
interface OpenAITranscriptionResponse {
	text?: string; // Successful transcription
	error?: { // Error structure from OpenAI
		message: string;
		type: string;
		param: string | null;
		code: string | null;
	};
}

// Define the structure of the response we send back to the client
interface WorkerResponse {
	transcription?: string;
	error?: string;
}

// --- This export default should be the only one ---
export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const requestOrigin = request.headers.get('Origin'); // Get origin here

		// --- CORS Preflight Handling ---
		if (request.method === 'OPTIONS') {
			return handleOptions(request);
		}

		// --- Allow only POST requests ---
		if (request.method !== 'POST') {
			return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
				status: 405,
				headers: corsHeaders(requestOrigin, { 'Content-Type': 'application/json' }), // Pass origin
			});
		}

		// --- Process POST request ---
		try {
			const formData = await request.formData();
			const audioFile = formData.get('file'); // Assuming the file is sent with the key 'file'

			// --- Validate audio file presence ---
			if (!audioFile || !(audioFile instanceof File)) {
				console.error('No audio file found in FormData or incorrect type.');
				return new Response(JSON.stringify({ error: 'Audio file is required in FormData under the key "file"' }), {
					status: 400,
					headers: corsHeaders(requestOrigin, { 'Content-Type': 'application/json' }), // Pass origin
				});
			}

			// --- Validate API Key presence ---
			if (!env.OPENAI_API_KEY) {
				console.error('OPENAI_API_KEY secret not set in Cloudflare environment.');
				return new Response(JSON.stringify({ error: 'Server configuration error: API key missing' }), {
					status: 500,
					headers: corsHeaders(requestOrigin, { 'Content-Type': 'application/json' }), // Pass origin
				});
			}

			// --- Prepare data for OpenAI API ---
			const openAIData = new FormData();
			// Force the filename to end with .webm to potentially help OpenAI identify the format
			openAIData.append('file', audioFile, 'audio.webm');
			openAIData.append('model', 'whisper-1'); // Specify the model

			// --- Call OpenAI API ---
			console.log('Sending request to OpenAI transcription API...');
			const openAIResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${env.OPENAI_API_KEY}`,
					// 'Content-Type' header is set automatically by fetch when using FormData
				},
				body: openAIData,
			});
			// --- Handle OpenAI Response ---
			// Note: Standard .json() doesn't take type arguments. We'll rely on inference or assertion if needed later.
			const responseBody: OpenAITranscriptionResponse = await openAIResponse.json();

			if (!openAIResponse.ok) {
				console.error('OpenAI API Error:', responseBody);
				const errorMessage = responseBody.error?.message || `OpenAI API request failed with status ${openAIResponse.status}`;
				return new Response(JSON.stringify({ error: errorMessage }), {
					status: openAIResponse.status, // Forward OpenAI's error status
					headers: corsHeaders(requestOrigin, { 'Content-Type': 'application/json' }), // Pass origin
				});
			}

			if (!responseBody.text) {
				console.error('OpenAI response missing transcription text:', responseBody);
				return new Response(JSON.stringify({ error: 'Transcription failed: No text received from API' }), {
					status: 500,
					headers: corsHeaders(requestOrigin, { 'Content-Type': 'application/json' }), // Pass origin
				});
			}

			// --- Success: Return transcription ---
			console.log('Transcription successful.');
			const successResponse: WorkerResponse = { transcription: responseBody.text };
			return new Response(JSON.stringify(successResponse), {
				status: 200,
				headers: corsHeaders(requestOrigin, { 'Content-Type': 'application/json' }), // Pass origin
			});

		} catch (error) {
			console.error('Worker Error:', error);
			const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
			return new Response(JSON.stringify({ error: `Internal Server Error: ${errorMessage}` }), {
				status: 500,
				headers: corsHeaders(requestOrigin, { 'Content-Type': 'application/json' }), // Pass origin
			});
		}
	},
};

// --- Helper Functions ---

// Define allowed origins
const allowedOrigins = [
	'http://localhost:8081', // Expo Web development
	'https://narrative.expo.app', // Production/Preview domain
	// Add other origins if needed, e.g., custom domains
];

// Function to generate CORS headers, dynamically setting Allow-Origin
function corsHeaders(requestOrigin: string | null, additionalHeaders: Record<string, string> = {}): Headers {
	const headers = new Headers(additionalHeaders);
	let allowOrigin = ''; // Default to not setting the header if origin is not allowed

	if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
		allowOrigin = requestOrigin; // Allow the specific origin
	} else if (!requestOrigin && allowedOrigins.includes('*')) {
		// Allow wildcard only if explicitly listed and no origin header present (less common)
		allowOrigin = '*';
	}
	// If allowOrigin remains empty, the header won't be set, denying the request

	if (allowOrigin) {
		headers.set('Access-Control-Allow-Origin', allowOrigin);
	}
	// Vary header tells caches that the response depends on the Origin header
	headers.set('Vary', 'Origin');
	headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
	headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization'); // Match client request headers
	headers.set('Access-Control-Max-Age', '86400'); // Optional: Cache preflight response for 1 day

	return headers;
}

// Function to handle OPTIONS requests for CORS preflight
function handleOptions(request: Request): Response {
	const requestHeaders = request.headers;
	const origin = requestHeaders.get('Origin');
	const corsResponseHeaders = corsHeaders(origin); // Generate headers based on request origin

	// Check if the origin is allowed by checking if the Allow-Origin header was set
	if (corsResponseHeaders.has('Access-Control-Allow-Origin')) {
		// Origin is allowed, return 204 No Content with CORS headers
		return new Response(null, {
			status: 204,
			headers: corsResponseHeaders,
		});
	} else {
		// Origin is not allowed or Origin header missing, return 403 Forbidden
		// Or handle standard OPTIONS request if needed, but for CORS preflight, forbidding is appropriate
		return new Response('Origin not allowed', {
			status: 403,
			// Optionally include minimal headers
			headers: { Allow: 'POST, OPTIONS' },
		});
	}
} // Add missing closing brace for handleOptions function
