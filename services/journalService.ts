import { supabase } from '../lib/supabase';
import { JournalAgent } from './JournalAgent';

export interface JournalEntry {
  id: string;
  created_at: string;
  updated_at: string;
  tags: string[];
  title: string;
  user_entry: string;
  ai_analysis: string;
  ai_response: string; // Add new field for Johnny's response
  date?: string; // We'll add this for convenience
}

const journalAgent = new JournalAgent();

export const journalService = {
  // Fetch a journal entry for a specific date
  async getEntry(date: string): Promise<JournalEntry | null> {
    // We'll query by date (YYYY-MM-DD) which we need to extract from created_at
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

    if (error && error.code !== 'PGRST116') { // PGRST116 is the "no rows returned" error
      console.error('Error fetching journal entry:', error);
      throw new Error('Failed to fetch journal entry');
    }

    if (data) {
      // Add date field for easier access
      data.date = date;
    }

    return data;
  },

  // Get entries for a date range
  async getEntries(startDate: string, endDate: string): Promise<JournalEntry[]> {
    const startDateTime = `${startDate}T00:00:00`;
    const endDateTime = `${endDate}T23:59:59`;
    
    console.log(`journalService: Getting entries from ${startDateTime} to ${endDateTime}`);
    
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .gte('created_at', startDateTime)
      .lte('created_at', endDateTime)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching journal entries:', error);
      throw new Error('Failed to fetch journal entries');
    }

    // Add date field to each entry for easier access
    const processedEntries = (data || []).map(entry => {
      const dateStr = new Date(entry.created_at).toISOString().split('T')[0];
      return {
        ...entry,
        date: dateStr
      };
    });
    
    console.log(`journalService: Found ${processedEntries.length} entries in date range`);
    processedEntries.forEach(entry => {
      console.log(`journalService: Entry for ${entry.date}, content length: ${entry.user_entry?.length || 0}`);
    });
    
    return processedEntries;
  },

  // Create or update a journal entry
  async saveEntry(date: string, content: string, title: string = '', tags: string[] = []): Promise<JournalEntry> {
    try {
      const existingEntry = await this.getEntry(date);

      // Process the entry with OpenAI - using the combined method for simplicity
      const { response, analysis } = await journalAgent.processJournalEntry(content);

      if (existingEntry) {
        // Update existing entry
        const { data, error } = await supabase
          .from('journal_entries')
          .update({ 
            user_entry: content,
            title: title || existingEntry.title,
            tags: tags,
            ai_response: response,
            ai_analysis: analysis,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingEntry.id);

        if (error) throw error;

        const updatedEntry = await this.getEntry(date);
        if (!updatedEntry) {
          throw new Error('Failed to retrieve updated journal entry');
        }

        return updatedEntry;
      } else {
        // Create new entry
        const entryDate = new Date(date);
        entryDate.setHours(12, 0, 0, 0);
        
        const { data, error } = await supabase
          .from('journal_entries')
          .insert([{ 
            created_at: entryDate.toISOString(),
            updated_at: new Date().toISOString(),
            user_entry: content,
            title: title || `Journal Entry - ${date}`,
            tags: tags,
            ai_response: response,
            ai_analysis: analysis
          }]);

        if (error) throw error;

        const newEntry = await this.getEntry(date);
        if (!newEntry) {
          throw new Error('Failed to retrieve newly created journal entry');
        }

        return newEntry;
      }
    } catch (err) {
      console.error('Exception in saveEntry:', err);
      throw err;
    }
  },

  // Generate AI responses separately
  async generateAIResponses(entryId: string, content: string): Promise<{ response: string; analysis: string }> {
    try {
      // Process the entry with OpenAI - using the combined method
      return await journalAgent.processJournalEntry(content);
    } catch (err) {
      console.error('Error generating AI responses:', err);
      throw new Error('Failed to generate AI responses');
    }
  },

  // Generate just the response
  async generateResponse(content: string): Promise<string> {
    try {
      return await journalAgent.generateResponse(content);
    } catch (err) {
      console.error('Error generating AI response:', err);
      throw new Error('Failed to generate Johnny\'s response');
    }
  },

  // Generate just the analysis
  async generateAnalysis(content: string): Promise<string> {
    try {
      return await journalAgent.generateAnalysis(content);
    } catch (err) {
      console.error('Error generating AI analysis:', err);
      throw new Error('Failed to generate Johnny\'s analysis');
    }
  },

  // Update AI responses separately if needed
  async updateAIResponses(entryId: string, content: string): Promise<{ response: string; analysis: string }> {
    try {
      const { response, analysis } = await journalAgent.processJournalEntry(content);
      
      const { error } = await supabase
        .from('journal_entries')
        .update({ 
          ai_response: response,
          ai_analysis: analysis,
          updated_at: new Date().toISOString()
        })
        .eq('id', entryId);

      if (error) throw error;
      
      return { response, analysis };
    } catch (err) {
      console.error('Error updating AI responses:', err);
      throw new Error('Failed to update AI responses');
    }
  }
};