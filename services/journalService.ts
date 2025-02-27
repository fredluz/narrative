import { supabase } from '../lib/supabase';

export interface JournalEntry {
  id: string;
  created_at: string;
  updated_at: string;
  tags: string[];
  title: string;
  user_entry: string;
  ai_analysis: string;
  date?: string; // We'll add this for convenience
}

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
  async saveEntry(date: string, content: string, title: string = ''): Promise<JournalEntry> {
    try {
      // First check if entry exists
      const existingEntry = await this.getEntry(date);

      if (existingEntry) {
        // Update existing entry
        console.log('Updating existing entry for date:', date, 'with ID:', existingEntry.id);
        const { data, error } = await supabase
          .from('journal_entries')
          .update({ 
            user_entry: content,
            title: title || existingEntry.title, 
            updated_at: new Date().toISOString() 
          })
          .eq('id', existingEntry.id);

        if (error) {
          console.error('Error updating journal entry:', error.message, error.details, error.hint);
          throw new Error(`Failed to update journal entry: ${error.message}`);
        }

        // For update operations, Supabase might not return data even if successful
        // In this case, we'll fetch the updated entry
        const updatedEntry = await this.getEntry(date);
        if (!updatedEntry) {
          throw new Error('Failed to retrieve updated journal entry');
        }

        return updatedEntry;
      } else {
        // Create new entry with the date's timestamp
        console.log('Creating new entry for date:', date);
        const entryDate = new Date(date);
        // Set time to noon of the selected day to ensure correct date handling
        entryDate.setHours(12, 0, 0, 0);
        
        const { data, error } = await supabase
          .from('journal_entries')
          .insert([{ 
            created_at: entryDate.toISOString(),
            updated_at: new Date().toISOString(),
            user_entry: content,
            title: title || `Journal Entry - ${date}`,
            tags: [],
            ai_analysis: ''
          }]);

        if (error) {
          console.error('Error creating journal entry:', error.message, error.details, error.hint);
          throw new Error(`Failed to create journal entry: ${error.message}`);
        }

        // For insert operations, Supabase might not return data even if successful
        // Fetch the newly created entry
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

  // Generate AI analysis for an entry
  async generateAnalysis(id: string, userEntry: string): Promise<string> {
    // In a real implementation, this would call an AI service
    // For now, we'll simulate it with predefined responses
    let aiResponse = "I've processed your entry. Keep pushing forward, samurai.";
    
    if (userEntry.toLowerCase().includes('deadline') || userEntry.toLowerCase().includes('miss')) {
      aiResponse = "Deadlines are just corpo bullshit anyway. Tomorrow's another day to raise hell.";
    } else if (userEntry.toLowerCase().includes('productive') || userEntry.toLowerCase().includes('finish')) {
      aiResponse = "Not bad, samurai. You're crushing it. Keep pushing those boundaries and stick it to the corporate code.";
    } else if (!userEntry || userEntry.trim() === '') {
      aiResponse = "Wake up, samurai. Nothing to see here yet. Got thoughts? Write 'em down.";
    }
    
    // Save the AI analysis to the entry
    const { error } = await supabase
      .from('journal_entries')
      .update({ ai_analysis: aiResponse })
      .eq('id', id);
      
    if (error) {
      console.error('Error saving AI analysis:', error);
      throw new Error('Failed to save AI analysis');
    }
    
    return aiResponse;
  }
};