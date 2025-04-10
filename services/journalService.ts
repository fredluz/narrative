import { supabase } from '../lib/supabase';
import { JournalAgent } from './JournalAgent';

// Daily entries from journal_entries table
export interface JournalEntry {
  id: string;
  created_at: string;
  updated_at: string;
  tags: string[];
  title: string;
  user_entry: string;
  ai_analysis: string;
  ai_response: string;
  date?: string; // Client-side convenience property
}

// Checkup entries from checkup_entries table
export interface CheckupEntry {
  id: string;
  created_at: string;
  content: string;
  tags: string[];
  // Foreign key to journal_entries.id (linking each checkup to its associated daily entry)
  daily_entry_id?: string;
  ai_checkup_response?: string; // Add AI response for individual checkups
}

const journalAgent = new JournalAgent();

export const journalService = {
  // Get daily entry for a specific date
  async getEntry(date: string): Promise<JournalEntry | null> {
    console.log('📁 journalService.getEntry called for date:', date);
    const startOfDay = `${date}T00:00:00`;
    const endOfDay = `${date}T23:59:59`;
    
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching journal entry:', error);
      throw new Error('Failed to fetch journal entry');
    }

    if (data) {
      console.log('✅ Found journal entry for date:', date);
      data.date = date;
    } else {
      console.log('ℹ️ No journal entry found for date:', date);
    }

    return data;
  },

  // Get daily entries for a date range
  async getEntries(startDate: string, endDate: string): Promise<JournalEntry[]> {
    console.log('📁 journalService.getEntries called for range:', startDate, 'to', endDate);
    const startDateTime = `${startDate}T00:00:00`;
    const endDateTime = `${endDate}T23:59:59`;
    
    let query = supabase
      .from('journal_entries')
      .select('*')
      .gte('created_at', startDateTime)
      .lte('created_at', endDateTime);

    const { data, error } = await query.order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching journal entries:', error);
      throw new Error('Failed to fetch journal entries');
    }

    console.log('✅ Retrieved', data?.length || 0, 'journal entries');
    return (data || []).map(entry => ({
      ...entry,
      date: new Date(entry.created_at).toISOString().split('T')[0]
    }));
  },

  // Generate combined AI responses via JournalAgent
  async generateAIResponses(entryId: string, content: string): Promise<{ response: string; analysis: string }> {
    console.log('🤖 journalService.generateAIResponses called for entry ID:', entryId);
    console.log('📝 Content length:', content.length);
    try {
      const result = await journalAgent.processJournalEntry(content);
      console.log('✅ AI responses generated, response length:', result.response.length, 'analysis length:', result.analysis.length);
      return result;
    } catch (err) {
      console.error('Error generating AI responses:', err);
      throw new Error('Failed to generate AI responses');
    }
  },

  // Generate just the response
  async generateResponse(content: string): Promise<string> {
    console.log('🤖 journalService.generateResponse called with content length:', content.length);
    try {
      const response = await journalAgent.generateResponse(content);
      console.log('✅ AI response generated, length:', response.length);
      return response;
    } catch (err) {
      console.error('Error generating AI response:', err);
      throw new Error('Failed to generate Johnny\'s response');
    }
  },

  // Generate just the analysis
  async generateAnalysis(content: string): Promise<string> {
    console.log('🤖 journalService.generateAnalysis called with content length:', content.length);
    try {
      const analysis = await journalAgent.generateAnalysis(content);
      console.log('✅ AI analysis generated, length:', analysis.length);
      return analysis;
    } catch (err) {
      console.error('Error generating AI analysis:', err);
      throw new Error('Failed to generate Johnny\'s analysis');
    }
  },

  // Update AI responses for an existing entry
  async updateAIResponses(entryId: string, content: string): Promise<{ response: string; analysis: string }> {
    console.log('🔄 journalService.updateAIResponses called for entry ID:', entryId);
    try {
      console.log('🤖 Generating new AI responses');
      const { response, analysis } = await journalAgent.processJournalEntry(content);
      
      console.log('💾 Updating entry in database with new responses');
      const { error } = await supabase
        .from('journal_entries')
        .update({ 
          ai_response: response,
          ai_analysis: analysis,
          updated_at: new Date().toISOString()
        })
        .eq('id', entryId);

      if (error) {
        console.error('❌ Database error when updating AI responses:', error);
        throw error;
      }
      
      console.log('✅ AI responses updated for entry ID:', entryId);
      return { response, analysis };
    } catch (err) {
      console.error('Error updating AI responses:', err);
      throw new Error('Failed to update AI responses');
    }
  },

  // Get all checkup entries for a specific date (regardless of daily entry association)
  async getCheckupEntries(date: string): Promise<CheckupEntry[]> {
    console.log('📁 journalService.getCheckupEntries called for date:', date);
    const startOfDay = `${date}T00:00:00`;
    const endOfDay = `${date}T23:59:59`;
    
    const { data, error } = await supabase
      .from('checkup_entries')
      .select('*')
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Error fetching checkup entries:', error);
      throw new Error('Failed to fetch checkup entries');
    }
    
    console.log('✅ Retrieved', data?.length || 0, 'checkup entries for', date);
    return data || [];
  },

  // Enhanced saveCheckupEntry to accept an optional AI response parameter
  async saveCheckupEntry(date: string, content: string, tags: string[] = [], aiResponse?: string): Promise<CheckupEntry> {
    console.log('💾 journalService.saveCheckupEntry called for date:', date);
    console.log('📝 Content length:', content.length, 'Tags:', tags, 'AI response provided:', !!aiResponse);
    try {
      // Get previous checkups for today to provide context
      console.log('🔄 Fetching existing checkups for context');
      const todaysCheckups = await this.getCheckupEntries(date);
      
      // Format previous checkups as context with paired responses including full datetime info
      console.log('🔄 Formatting', todaysCheckups.length, 'checkups as context');
      let previousCheckupsContext = "";
      if (todaysCheckups && todaysCheckups.length > 0) {
        // Format all existing checkups in chronological order (oldest first)
        previousCheckupsContext = todaysCheckups
          .map(entry => {
            const entryTime = new Date(entry.created_at).toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: false
            });
            return `[${entryTime}] USER: ${entry.content}\n[${entryTime}] SILVERHAND: ${entry.ai_checkup_response || 'No response recorded'}`;
          })
          .join('\n\n');
      }
      
      // Generate AI response if not provided
      let checkupResponse = aiResponse;
      if (!checkupResponse) {
        console.log('🤖 Generating AI response with context');
        checkupResponse = await journalAgent.generateResponse(content, previousCheckupsContext);
      } else {
        console.log('ℹ️ Using provided AI response');
      }

      // Ensure the entry has a timestamp if it doesn't already
      const now = new Date();
      const currentTime = now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false
      });

      const finalContent = content.startsWith('[') ? content : `[${currentTime}] ${content}`;
      
      // Insert the checkup with AI response
      console.log('💾 Saving checkup entry to database');
      const { data, error } = await supabase
        .from('checkup_entries')
        .insert([{ 
          created_at: now.toISOString(),
          content: finalContent,
          tags,
          daily_entry_id: null,
          ai_checkup_response: checkupResponse
        }])
        .select()
        .single();
      
      if (error) {
        console.error('❌ Database error when saving checkup:', error);
        throw error;
      }
      
      console.log('✅ Checkup entry saved with ID:', data.id);
      return data;
    } catch (err) {
      console.error('Error saving checkup entry:', err);
      throw err;
    }
  },

  // Helper function to generate a human-readable "time since" string
  getTimeSinceString(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.round(diffMs / 60000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins === 1) return '1 minute ago';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return 'more than a week ago';
  },

  // Get checkup entries that aren't yet linked to a daily entry
  async getUnsavedCheckupEntries(date: string): Promise<CheckupEntry[]> {
    console.log('📁 journalService.getUnsavedCheckupEntries called for date:', date);
    const startOfDay = `${date}T00:00:00`;
    const endOfDay = `${date}T23:59:59`;
    
    const { data, error } = await supabase
      .from('checkup_entries')
      .select('*')
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay)
      .is('daily_entry_id', null)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Error fetching unsaved checkup entries:', error);
      throw new Error('Failed to fetch unsaved checkup entries');
    }
    
    console.log('✅ Found', data?.length || 0, 'unsaved checkup entries');
    return data || [];
  },

  // Updated to use processEndOfDay with checkups and responses paired together
  async saveDailyEntry(date: string): Promise<JournalEntry> {
    console.log('💾 journalService.saveDailyEntry called for date:', date);
    try {
      // Get all unlinked checkups for this date
      console.log('🔄 Fetching unlinked checkups for the day');
      const unsavedCheckups = await this.getUnsavedCheckupEntries(date);
      console.log('ℹ️ Found', unsavedCheckups.length, 'checkups to link to daily entry');
      
      // Format checkups with their AI responses paired together with full datetime info
      console.log('🔄 Formatting checkups with responses for daily entry');
      const checkupsWithResponses = unsavedCheckups
        .map(entry => {
          const entryDate = new Date(entry.created_at);
          const formattedDate = entryDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
          });
          const formattedTime = entryDate.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false
          });
          
          return {
            date: formattedDate,
            time: formattedTime,
            content: entry.content,
            response: entry.ai_checkup_response || 'No response recorded'
          };
        });
      
      // Format as input for prompt - each checkup paired with its response
      const formattedContent = checkupsWithResponses
        .map(({date, time, content, response}) => 
          `[${date}, ${time}] USER: ${content}\n[${date}, ${time}] SILVERHAND: ${response}`
        )
        .join('\n\n');

      // Generate AI responses using the enhanced end-of-day prompt with paired data
      console.log('🤖 Generating end-of-day responses');
      const { response, analysis } = await journalAgent.processEndOfDay(formattedContent);

      // Create the daily entry with the generated responses
      console.log('💾 Creating daily entry in database');
      const { data, error } = await supabase
        .from('journal_entries')
        .insert([{
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user_entry: formattedContent,
          title: `Daily Entry - ${date}`,
          tags: [],
          ai_response: response,  // Use the end-of-day response
          ai_analysis: analysis   // Use the end-of-day analysis
        }])
        .select()
        .single();

      if (error) {
        console.error('❌ Database error when creating daily entry:', error);
        throw error;
      }
      
      // Update all unlinked checkups with a foreign key reference to the new daily entry
      const dailyEntryId = data.id;
      console.log('🔄 Linking checkups to daily entry ID:', dailyEntryId);
      const { error: updateError } = await supabase
        .from('checkup_entries')
        .update({ daily_entry_id: dailyEntryId }) // Set the foreign key
        .is('daily_entry_id', null) // Only update checkups without a daily entry link
        .gte('created_at', `${date}T00:00:00`)
        .lte('created_at', `${date}T23:59:59`);
        
      if (updateError) {
        console.error('Error updating checkup entries with daily entry id:', updateError);
        throw new Error('Failed to update checkup entries with daily entry id');
      }
      
      console.log('✅ Daily entry saved with ID:', data.id, 'and checkups linked');
      return { ...data, date };
    } catch (err) {
      console.error('Error generating daily entry:', err);
      throw err;
    }
  },

  // Find all checkups associated with a specific daily entry using the foreign key
  async getCheckupsForDailyEntry(dailyEntryId: string): Promise<CheckupEntry[]> {
    console.log('📁 journalService.getCheckupsForDailyEntry called for entry ID:', dailyEntryId);
    try {
      const { data, error } = await supabase
        .from('checkup_entries')
        .select('*')
        .eq('daily_entry_id', dailyEntryId)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('❌ Database error when fetching checkups:', error);
        throw error;
      }
      
      console.log('✅ Retrieved', data?.length || 0, 'checkups for daily entry ID:', dailyEntryId);
      return data || [];
    } catch (err) {
      console.error('Error fetching checkups for daily entry:', err);
      throw new Error('Failed to fetch checkups for daily entry');
    }
  }
};