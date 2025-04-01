import { supabase } from '../lib/supabase';
import { JournalAgent } from './agents/JournalAgent'; // Ensure this imports the updated JournalAgent
import { SuggestionAgent } from './agents/SuggestionAgent';
import { UpdateAgent } from './agents/UpdateAgent';
import { fetchActiveTasks } from './tasksService';

// Interface for daily entries from journal_entries table
export interface JournalEntry {
  id: string; // Supabase uses string UUIDs by default
  created_at: string;
  updated_at: string;
  tags: string[] | null; // Allow null from DB
  title: string | null; // Allow null from DB
  user_entry: string | null; // Allow null from DB
  ai_analysis: string | null; // Allow null from DB
  ai_response: string | null; // Allow null from DB
  date?: string; // Client-side convenience property
  clerk_id: string;
}

// Interface for Checkup entries from checkup_entries table
export interface CheckupEntry {
  id: string; // Supabase uses string UUIDs by default
  created_at: string;
  content: string;
  tags: string[] | null; // Allow null from DB
  // Foreign key to journal_entries.id (linking each checkup to its associated daily entry)
  daily_entry_id: string | null; // Should be string if referencing UUID
  ai_checkup_response: string | null; // AI response for individual checkups
  clerk_id: string;
}

// Instantiate the JournalAgent (ensure this uses the updated version)
const journalAgent = new JournalAgent();

export const journalService = {
  /**
   * Gets the latest daily journal entry for a specific date and user.
   * @param date - The date in 'YYYY-MM-DD' format.
   * @param userId - The ID of the user.
   * @param signal - Optional AbortController signal to cancel the operation
   * @returns The journal entry or null if not found.
   */
  async getEntry(date: string, userId: string, signal?: AbortSignal): Promise<JournalEntry | null> {
    if (!userId) {
      console.error('[journalService] User ID is missing for getEntry.');
      return null;
    }
    console.log('[journalService] getEntry called for date:', date, 'userId:', userId);
    const startOfDay = `${date}T00:00:00Z`; // Use ISO format with Z for UTC
    const endOfDay = `${date}T23:59:59Z`;

    try {
      // Check if already aborted
      if (signal?.aborted) {
        console.log('[journalService] getEntry aborted before starting');
        throw new DOMException('Aborted', 'AbortError');
      }

      // Using options object with signal property if supported, or fallback to regular query
      const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('clerk_id', userId)
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        // Check if this is an abort error
        if (signal?.aborted) {
          console.log('[journalService] getEntry request aborted for date:', date);
          throw new DOMException('Aborted', 'AbortError');
        }
        console.error('[journalService] Error fetching journal entry:', error);
        throw new Error('Failed to fetch journal entry');
      }

      if (data) {
        console.log('[journalService] ✅ Found journal entry for date:', date);
        // Add client-side date property
        return { ...data, date };
      } else {
        console.log('[journalService] ℹ️ No journal entry found for date:', date);
        return null;
      }
    } catch (err) {
      // If the operation was aborted, throw an AbortError
      if (signal?.aborted || (err instanceof DOMException && err.name === 'AbortError')) {
        console.log('[journalService] getEntry operation aborted');
        throw new DOMException('Aborted', 'AbortError');
      }
      throw err;
    }
  },

  /**
   * Gets all daily journal entries within a date range for a user.
   * @param startDate - The start date in 'YYYY-MM-DD' format.
   * @param endDate - The end date in 'YYYY-MM-DD' format.
   * @param userId - The ID of the user.
   * @returns An array of journal entries.
   */
  async getEntries(startDate: string, endDate: string, userId: string): Promise<JournalEntry[]> {
    if (!userId) {
      console.error('[journalService] User ID is missing for getEntries.');
      return [];
    }
    console.log('[journalService] getEntries called for range:', startDate, 'to', endDate, 'userId:', userId);
    const startDateTime = `${startDate}T00:00:00Z`; // Use ISO format with Z for UTC
    const endDateTime = `${endDate}T23:59:59Z`;

    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('clerk_id', userId)
      .gte('created_at', startDateTime)
      .lte('created_at', endDateTime)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[journalService] Error fetching journal entries:', error);
      throw new Error('Failed to fetch journal entries');
    }

    console.log('[journalService] ✅ Retrieved', data?.length || 0, 'journal entries');
    // Add client-side date property
    return (data || []).map(entry => ({
      ...entry,
      date: new Date(entry.created_at).toISOString().split('T')[0]
    }));
  },

  /**
   * Generates both AI response and analysis for a daily entry content using JournalAgent.
   * @param entryId - The ID of the journal entry (currently unused by agent but kept for potential future use).
   * @param content - The content of the daily entry.
   * @param userId - The ID of the user.
   * @returns An object containing the AI response and analysis.
   */
  async generateAIResponses(entryId: string, content: string, userId: string): Promise<{ response: string; analysis: string }> {
    if (!userId) {
      console.error('[journalService] User ID is missing for generateAIResponses.');
      throw new Error('User ID is required');
    }
    console.log('[journalService] 🤖 generateAIResponses called for entry ID:', entryId, 'userId:', userId);
    console.log('[journalService] 📝 Content length:', content.length);
    try {
      // Calls the updated JournalAgent method
      const result = await journalAgent.processJournalEntry(content, userId);
      console.log('[journalService] ✅ AI responses generated, response length:', result.response.length, 'analysis length:', result.analysis.length);
      return result;
    } catch (err) {
      console.error('[journalService] Error generating AI responses:', err);
      throw new Error('Failed to generate AI responses');
    }
  },

  /**
   * Generates only the AI response for given content using JournalAgent.
   * This also triggers the suggestion analysis event within JournalAgent.
   * @param content - The content (e.g., a checkup entry).
   * @param userId - The ID of the user.
   * @param previousCheckupsContext - Optional context from previous checkups today.
   * @returns The generated AI response string.
   */
  async generateResponse(content: string, userId: string, previousCheckupsContext?: string): Promise<string> {
     if (!userId) {
      console.error('[journalService] User ID is missing for generateResponse.');
      throw new Error('User ID is required');
    }
    console.log('[journalService] 🤖 generateResponse called, userId:', userId, 'context provided:', !!previousCheckupsContext);
    console.log('[journalService] 📝 Content length:', content.length);
    try {
      // Calls the updated JournalAgent method, which emits the suggestion event
      const response = await journalAgent.generateResponse(content, userId, previousCheckupsContext);
      console.log('[journalService] ✅ AI response generated, length:', response.length);
      return response;
    } catch (err) {
      console.error('[journalService] Error generating AI response:', err);
      throw new Error('Failed to generate AI response');
    }
  },

  /**
   * Generates only the AI analysis for given content using JournalAgent.
   * @param content - The content (e.g., a checkup entry or daily summary).
   * @param userId - The ID of the user.
   * @param previousCheckupsContext - Optional context from previous checkups today.
   * @returns The generated AI analysis string.
   */
  async generateAnalysis(content: string, userId: string, previousCheckupsContext?: string): Promise<string> {
    if (!userId) {
      console.error('[journalService] User ID is missing for generateAnalysis.');
      throw new Error('User ID is required');
    }
    console.log('[journalService] 🤖 generateAnalysis called, userId:', userId, 'context provided:', !!previousCheckupsContext);
    console.log('[journalService] 📝 Content length:', content.length);
    try {
      // Calls the updated JournalAgent method
      const analysis = await journalAgent.generateAnalysis(content, userId, previousCheckupsContext);
      console.log('[journalService] ✅ AI analysis generated, length:', analysis.length);
      return analysis;
    } catch (err) {
      console.error('[journalService] Error generating AI analysis:', err);
      throw new Error('Failed to generate AI analysis');
    }
  },

  /**
   * Gets all checkup entries for a specific date and user.
   * @param date - The date in 'YYYY-MM-DD' format.
   * @param userId - The ID of the user.
   * @param signal - Optional AbortController signal to cancel the operation
   * @returns An array of checkup entries.
   */
  async getCheckupEntries(date: string, userId: string, signal?: AbortSignal): Promise<CheckupEntry[]> {
    if (!userId) {
      console.error('[journalService] User ID is missing for getCheckupEntries.');
      return [];
    }
    console.log('[journalService] getCheckupEntries called for date:', date, 'userId:', userId);
    const startOfDay = `${date}T00:00:00Z`; // Use ISO format with Z for UTC
    const endOfDay = `${date}T23:59:59Z`;

    try {
      // Check if already aborted
      if (signal?.aborted) {
        console.log('[journalService] getCheckupEntries aborted before starting');
        throw new DOMException('Aborted', 'AbortError');
      }
      
      const { data, error } = await supabase
        .from('checkup_entries')
        .select('*')
        .eq('clerk_id', userId)
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay)
        .order('created_at', { ascending: true });

      if (error) {
        // Check if this is an abort error
        if (signal?.aborted) {
          console.log('[journalService] getCheckupEntries request aborted for date:', date);
          throw new DOMException('Aborted', 'AbortError');
        }
        console.error('[journalService] Error fetching checkup entries:', error);
        throw new Error('Failed to fetch checkup entries');
      }

      console.log('[journalService] ✅ Retrieved', data?.length || 0, 'checkup entries for', date);
      return data || [];
    } catch (err) {
      // If the operation was aborted, throw an AbortError
      if (signal?.aborted || (err instanceof DOMException && err.name === 'AbortError')) {
        console.log('[journalService] getCheckupEntries operation aborted');
        throw new DOMException('Aborted', 'AbortError');
      }
      throw err;
    }
  },

  /**
   * Saves a checkup entry, generates its AI response (triggering suggestion analysis),
   * and stores both in the database.
   * @param date - The date of the checkup in 'YYYY-MM-DD' format.
   * @param content - The user's content for the checkup.
   * @param userId - The ID of the user.
   * @param tags - Optional array of tags.
   * @param aiResponse - Optional pre-generated AI response (e.g., from ChatAgent).
   * @param signal - Optional AbortController signal to cancel the operation
   * @returns The saved checkup entry.
   */
  async saveCheckupEntry(date: string, content: string, userId: string, tags: string[] = [], aiResponse?: string, signal?: AbortSignal): Promise<CheckupEntry> {
    if (!userId) {
      console.error('[journalService] User ID is required for saveCheckupEntry.');
      throw new Error('User ID is required');
    }
    if (!content || content.trim() === '') {
       console.warn('[journalService] Attempted to save empty checkup entry.');
       throw new Error('Checkup content cannot be empty');
    }
    console.log('[journalService] 💾 saveCheckupEntry called for date:', date, 'userId:', userId);
    console.log('[journalService] 📝 Content length:', content.length, 'Tags:', tags, 'AI resp provided:', !!aiResponse);
    
    try {
      // Check for abort before starting
      if (signal?.aborted) {
        console.log('[journalService] saveCheckupEntry aborted before starting');
        throw new DOMException('Aborted', 'AbortError');
      }
      
      // Fetch today's checkups for context
      console.log('[journalService] 🔄 Fetching existing checkups for context');
      const todaysCheckups = await this.getCheckupEntries(date, userId, signal);

      // Format context
      console.log('[journalService] 🔄 Formatting', todaysCheckups.length, 'checkups as context');
      let previousCheckupsContext = "";
      if (todaysCheckups && todaysCheckups.length > 0) {
        previousCheckupsContext = todaysCheckups
          .map(entry => {
            const entryTime = new Date(entry.created_at).toLocaleTimeString('en-US', {
              hour: '2-digit', minute: '2-digit', hour12: false
            });
            return `[${entryTime}] USER: ${entry.content}\n[${entryTime}] ASSISTANT: ${entry.ai_checkup_response || 'No response recorded'}`;
          })
          .join('\n\n');
      }

      // Check for abort before AI generation
      if (signal?.aborted) {
        console.log('[journalService] saveCheckupEntry aborted before AI generation');
        throw new DOMException('Aborted', 'AbortError');
      }

      // Generate AI response via JournalAgent IF NOT provided
      // This call to generateResponse will trigger the suggestion analysis event
      let checkupResponse = aiResponse;
      if (!checkupResponse) {
        console.log('[journalService] 🤖 Generating AI response via JournalAgent (will trigger suggestions)');
        checkupResponse = await this.generateResponse(content, userId, previousCheckupsContext);
      } else {
        console.log('[journalService] ℹ️ Using provided AI response. Suggestion trigger relies on caller.');
        // IMPORTANT: If aiResponse is provided (e.g., from ChatAgent), the suggestion trigger must happen elsewhere (e.g., ChatAgent calling SuggestionAgent post-session).
      }

      // Check for abort before database save
      if (signal?.aborted) {
        console.log('[journalService] saveCheckupEntry aborted before database save');
        throw new DOMException('Aborted', 'AbortError');
      }

      // Prepare data for insertion
      const now = new Date();
      const entryData = {
          created_at: now.toISOString(),
          content: content, // Store raw content, timestamping can be handled by UI or retrieved from created_at
          tags: tags.length > 0 ? tags : null,
          daily_entry_id: null, // Initially unlinked
          ai_checkup_response: checkupResponse,
          clerk_id: userId
      };

      // Insert the checkup
      console.log('[journalService] 💾 Saving checkup entry to database');
      const { data, error } = await supabase
        .from('checkup_entries')
        .insert([entryData])
        .select()
        .single();

      if (error) {
        // Check if this is an abort error
        if (signal?.aborted) {
          console.log('[journalService] saveCheckupEntry database operation aborted');
          throw new DOMException('Aborted', 'AbortError');
        }
        console.error('[journalService] ❌ Database error when saving checkup:', error);
        throw error;
      }

      console.log('[journalService] ✅ Checkup entry saved with ID:', data.id);
      
      // Trigger concurrent processing with SuggestionAgent and UpdateAgent
      try {
        console.log('[journalService] 🔄 Triggering concurrent agents processing for checkup content...');
        // Fetch active tasks once to be used by both agents
        const activeTasks = await fetchActiveTasks(userId);
        
        // Get agent instances
        const updateAgent = UpdateAgent.getInstance();
        const suggestionAgent = SuggestionAgent.getInstance();
        
        // Process with both agents concurrently
        Promise.allSettled([
          updateAgent.processCheckupForStatusUpdates(content, userId, activeTasks),
          suggestionAgent.analyzeCheckupForSuggestions(content, userId)
        ]).then(([updateResult, suggestionResult]) => {
          // Log results/errors from each promise
          if (updateResult.status === 'rejected') {
            console.error("[journalService] UpdateAgent failed:", updateResult.reason);
          } else {
            console.log("[journalService] ✅ UpdateAgent completed successfully");
          }
          
          if (suggestionResult.status === 'rejected') {
            console.error("[journalService] SuggestionAgent failed:", suggestionResult.reason);
          } else {
            console.log("[journalService] ✅ SuggestionAgent completed successfully");
          }
        });
        
        // Don't await the promise so the function can return immediately
        console.log('[journalService] 🔄 Agents triggered in background, continuing...');
      } catch (agentError) {
        // Log but don't throw, as this shouldn't block the checkup from being saved
        console.error('[journalService] Error triggering agents:', agentError);
      }

      return data;
    } catch (err) {
      // If the operation was aborted, throw an AbortError
      if (signal?.aborted || (err instanceof DOMException && err.name === 'AbortError')) {
        console.log('[journalService] saveCheckupEntry operation aborted');
        throw new DOMException('Aborted', 'AbortError');
      }
      console.error('[journalService] Error saving checkup entry:', err);
      // Re-throw the error so the calling function (e.g., in useJournal) can handle it
      throw err;
    }
  },

  /**
   * Gets checkup entries for a date that are not yet linked to a daily entry.
   * @param date - The date in 'YYYY-MM-DD' format.
   * @param userId - The ID of the user.
   * @returns An array of unlinked checkup entries.
   */
  async getUnsavedCheckupEntries(date: string, userId: string): Promise<CheckupEntry[]> {
    if (!userId) {
      console.error('[journalService] User ID is missing for getUnsavedCheckupEntries.');
      return [];
    }
    console.log('[journalService] getUnsavedCheckupEntries called for date:', date, 'userId:', userId);
    const startOfDay = `${date}T00:00:00Z`;
    const endOfDay = `${date}T23:59:59Z`;

    const { data, error } = await supabase
      .from('checkup_entries')
      .select('*')
      .eq('clerk_id', userId)
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay)
      .is('daily_entry_id', null) // Filter for unlinked entries
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[journalService] Error fetching unsaved checkup entries:', error);
      throw new Error('Failed to fetch unsaved checkup entries');
    }

    console.log('[journalService] ✅ Found', data?.length || 0, 'unsaved checkup entries');
    return data || [];
  },

  /**
   * Creates a daily journal summary entry, potentially saving current text as a final checkup,
   * generates end-of-day AI response/analysis, saves the daily entry, and links checkups.
   * @param date - The date for the daily entry in 'YYYY-MM-DD' format.
   * @param userId - The ID of the user.
   * @param currentText - Optional current text in the editor to be saved as a final checkup.
   * @returns The saved daily journal entry.
   */
  async saveDailyEntry(date: string, userId: string, currentText?: string): Promise<JournalEntry> {
    if (!userId) {
      console.error('[journalService] User ID is required for saveDailyEntry.');
      throw new Error('User ID is required');
    }
    console.log('[journalService] 💾 saveDailyEntry called for date:', date, 'userId:', userId);
    try {
      // Save current text as final checkup if provided
      if (currentText?.trim()) {
        console.log('[journalService] 📝 Saving current text as final checkup');
        // This call will also generate a response and trigger suggestion analysis for this final checkup
        await this.saveCheckupEntry(date, currentText.trim(), userId, []);
      }

      // Fetch ALL checkups for the day (now including the potentially just-saved one)
      console.log('[journalService] 🔄 Fetching ALL checkups for the day');
      const allTodaysCheckups = await this.getCheckupEntries(date, userId);

      if (allTodaysCheckups.length === 0) {
         console.warn('[journalService] No checkup entries found for the day. Cannot create daily summary.');
         // Return a placeholder or throw an error depending on desired behavior
         throw new Error('No checkup entries available to create a daily summary.');
      }

      // Format ONLY user checkups for saving to the daily entry's user_entry field
      console.log('[journalService] 🔄 Formatting ONLY user checkups for daily entry user_entry field');
      const userOnlyFormattedContent = allTodaysCheckups
        .map(entry => {
          const entryTime = new Date(entry.created_at).toLocaleTimeString('en-US', {
            hour: '2-digit', minute: '2-digit', hour12: false
          });
          const userContent = entry.content || '';
          // Exclude the ai_checkup_response here
          return `[${entryTime}] ${userContent}`; // Simpler format, only user content
        })
        .join('\n\n'); // Join with double newline for separation

      // Generate end-of-day AI response and analysis via JournalAgent, passing the full checkup objects
      console.log('[journalService] 🤖 Generating end-of-day response & analysis via JournalAgent (passing full checkup objects)');
      // Pass the raw array of checkup objects instead of the formatted string
      const { response: dailyResponse, analysis: dailyAnalysis } = await journalAgent.processEndOfDay(allTodaysCheckups, userId);

      // Create the daily entry
      const entryTimestamp = new Date().toISOString(); // Use current time for the summary entry
      const dailyEntryData = {
          created_at: entryTimestamp,
          updated_at: entryTimestamp,
          user_entry: userOnlyFormattedContent, // Store ONLY the user's formatted checkups
          title: `Daily Summary - ${date}`,
          tags: null, // Or derive tags if needed
          ai_response: dailyResponse,
          ai_analysis: dailyAnalysis,
          clerk_id: userId
      };

      console.log('[journalService] 💾 Creating daily entry in database');
      const { data: savedDailyEntry, error: insertError } = await supabase
        .from('journal_entries')
        .insert([dailyEntryData])
        .select()
        .single();

      if (insertError) {
        console.error('[journalService] ❌ Database error creating daily entry:', insertError);
        throw insertError;
      }
      if (!savedDailyEntry) {
          throw new Error('Failed to retrieve saved daily entry data.');
      }

      const dailyEntryId = savedDailyEntry.id; // Get the ID of the newly created daily entry

      // Link all of today's checkups to this new daily entry
      console.log('[journalService] 🔄 Linking', allTodaysCheckups.length, 'checkups to daily entry ID:', dailyEntryId);
      const checkupIdsToLink = allTodaysCheckups.map(c => c.id);

      if (checkupIdsToLink.length > 0) {
        const { error: updateError } = await supabase
          .from('checkup_entries')
          .update({ daily_entry_id: dailyEntryId })
          .eq('clerk_id', userId)
          .in('id', checkupIdsToLink); // Link specifically the checkups we processed

        if (updateError) {
          // Log error but don't necessarily fail the whole operation, maybe retry later?
          console.error('[journalService] Error updating checkup entries with daily entry id:', updateError);
          // Consider adding retry logic or background job for linking failures
        }
      }

      console.log('[journalService] ✅ Daily entry saved (ID:', dailyEntryId, ') and checkups linked');
      return { ...savedDailyEntry, date }; // Return the saved entry with the client-side date

    } catch (err) {
      console.error('[journalService] Error saving daily entry:', err);
      throw err; // Re-throw error
    }
  },

  /**
   * Gets checkup entries associated with a specific daily entry ID.
   * @param dailyEntryId - The ID of the daily journal entry.
   * @param userId - The ID of the user.
   * @returns An array of associated checkup entries.
   */
  async getCheckupsForDailyEntry(dailyEntryId: string, userId: string): Promise<CheckupEntry[]> {
    if (!userId) {
      console.error('[journalService] User ID is missing for getCheckupsForDailyEntry.');
      return [];
    }
    if (!dailyEntryId) {
        console.error('[journalService] Daily Entry ID is missing for getCheckupsForDailyEntry.');
        return [];
    }
    console.log('[journalService] getCheckupsForDailyEntry called for entry ID:', dailyEntryId, 'userId:', userId);
    try {
      const { data, error } = await supabase
        .from('checkup_entries')
        .select('*')
        .eq('clerk_id', userId)
        .eq('daily_entry_id', dailyEntryId) // Match the foreign key
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[journalService] ❌ Database error fetching checkups:', error);
        throw error;
      }

      console.log('[journalService] ✅ Retrieved', data?.length || 0, 'checkups for daily entry ID:', dailyEntryId);
      return data || [];
    } catch (err) {
      console.error('[journalService] Error fetching checkups for daily entry:', err);
      throw new Error('Failed to fetch checkups for daily entry');
    }
  },

  /**
   * Gets the most recent daily journal entries for a user.
   * @param limit - The maximum number of entries to retrieve.
   * @param userId - The ID of the user.
   * @returns An array of recent journal entries.
   */
  async getRecentEntries(limit: number, userId: string): Promise<JournalEntry[]> {
    if (!userId) {
      console.error('[journalService] User ID is missing for getRecentEntries.');
      return [];
    }
    console.log('[journalService] getRecentEntries called with limit:', limit, 'userId:', userId);

    try {
      const { data, error } = await supabase
        .from('journal_entries')
        .select('*') // Select all fields
        .eq('clerk_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[journalService] Error fetching recent journal entries:', error);
        throw new Error('Failed to fetch recent journal entries');
      }

      console.log('[journalService] ✅ Retrieved', data?.length || 0, 'recent journal entries');
      // Add client-side date property
      return (data || []).map(entry => ({
          ...entry,
          date: new Date(entry.created_at).toISOString().split('T')[0]
      }));
    } catch (err) {
      console.error('[journalService] Error in getRecentEntries:', err);
      return []; // Return empty array on error
    }
  },
};
