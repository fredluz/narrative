import { supabase } from '../lib/supabase';

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

      if (existingEntry) {
        // Update existing entry
        const { data, error } = await supabase
          .from('journal_entries')
          .update({ 
            user_entry: content,
            title: title || existingEntry.title,
            tags: tags,
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
            ai_analysis: '',
            ai_response: ''
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
  },

  // Update AI responses
  async updateAIResponses(id: string, response: string, analysis: string): Promise<void> {
    const { error } = await supabase
      .from('journal_entries')
      .update({ 
        ai_response: response,
        ai_analysis: analysis,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);
      
    if (error) {
      console.error('Error saving AI responses:', error);
      throw new Error('Failed to save AI responses');
    }
  },

  // Generate both AI responses
  async generateAIResponses(id: string, userEntry: string): Promise<{ response: string, analysis: string }> {
    // Silverhand's responses are more personal and emotional
    const silverhandResponses = [
      "Living the corpo life, huh? Just remember who you really are beneath all that chrome.",
      "Taking risks, making moves... that's what I like to see. Keep that fire burning, samurai.",
      "Sounds like you're starting to see through the matrix they've built. Good. Question everything.",
      "The city's trying to break you down? Let it try. You're stronger than their systems.",
      "Now that's what I call sticking it to the man. Keep pushing those boundaries, choom."
    ];
    
    // Analysis responses are more structured and logical
    const analysisResponses = [
      "Pattern analysis indicates increased focus on long-term objectives. Recommend maintaining current trajectory while monitoring stress levels.",
      "Detected recurring theme of project deadlines. Suggest implementing time-blocking techniques and establishing clearer boundaries.",
      "Analysis shows positive trend in problem-solving approaches. Continue leveraging creative solutions while documenting methodologies.",
      "Risk assessment indicates potential burnout markers. Recommend scheduling strategic breaks and reassessing task prioritization.",
      "Communication patterns show improved stakeholder engagement. Consider documenting successful interaction models for future reference."
    ];

    // In a real implementation, these would come from an AI service
    const response = silverhandResponses[Math.floor(Math.random() * silverhandResponses.length)];
    const analysis = analysisResponses[Math.floor(Math.random() * analysisResponses.length)];
    
    // Save both responses
    await this.updateAIResponses(id, response, analysis);
    
    return { response, analysis };
  }
};