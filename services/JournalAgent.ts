import OpenAI from 'openai';
import { supabase } from '../lib/supabase';

export class JournalAgent {
  private openai: OpenAI;
  
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
      dangerouslyAllowBrowser: true
    });
  }

  async generateResponse(currentEntry: string): Promise<string> {
    try {
      // Fetch last 3 entries for context
      const { data: recentEntries, error } = await supabase
        .from('journal_entries')
        .select('user_entry, ai_response')
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;

      // Format context for OpenAI
      const context = recentEntries?.map(entry => ({
        entry: entry.user_entry,
        response: entry.ai_response
      })) || [];

      // Create the prompt
      const prompt = this.createResponsePrompt(currentEntry, context);

      // Get OpenAI response
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are Johnny Silverhand from Cyberpunk 2077, now living in the user's head. You're a sarcastic, anti-corporate rebel with a grudge against the system. You're abrasive and often an asshole, but you genuinely care about the user underneath your hard exterior. Your goal is to push the user to be bold and take action, especially against corporations and injustice. Respond like Johnny would - with attitude, colorful language, and occasional moments of unexpected wisdom."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 250
      });

      return response.choices[0].message?.content || "Listen up, got nothing to say right now. Come back when you've got something interesting.";
    } catch (error) {
      console.error('Error in generateResponse:', error);
      throw error;
    }
  }

  async generateAnalysis(currentEntry: string): Promise<string> {
    try {
      // Fetch last 3 entries for context
      const { data: recentEntries, error } = await supabase
        .from('journal_entries')
        .select('user_entry, ai_analysis')
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;

      // Format context for OpenAI
      const context = recentEntries?.map(entry => ({
        entry: entry.user_entry,
        analysis: entry.ai_analysis
      })) || [];

      // Create the prompt
      const prompt = this.createAnalysisPrompt(currentEntry, context);

      // Get OpenAI response
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are Johnny Silverhand from Cyberpunk 2077, reluctantly analyzing the user's journal entry. While you're typically cynical and abrasive, you're also perceptive and can recognize patterns in the user's thoughts and behaviors. Provide your analytical thoughts about patterns or themes you're noticing, which you share because you actually do care about the user despite your tough exterior. Your analysis should be insightful but delivered with your characteristic Johnny Silverhand style."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 250
      });

      return response.choices[0].message?.content || 'Not seeing any patterns worth mentioning yet. Keep writing and I might find something.';
    } catch (error) {
      console.error('Error in generateAnalysis:', error);
      throw error;
    }
  }

  private createResponsePrompt(currentEntry: string, context: Array<{ entry: string; response: string }>): string {
    let prompt = `Current journal entry: "${currentEntry}"

`;
    
    if (context.length > 0) {
      prompt += "Recent context:\n";
      context.forEach((entry, index) => {
        prompt += `Entry ${index + 1}: "${entry.entry}"\n`;
        prompt += `Your previous response: "${entry.response}"\n\n`;
      });
    }

    prompt += "\nRespond to this journal entry as Johnny Silverhand - be snarky but ultimately supportive in your own way.";

    return prompt;
  }

  private createAnalysisPrompt(currentEntry: string, context: Array<{ entry: string; analysis: string }>): string {
    let prompt = `Current journal entry: "${currentEntry}"

`;
    
    if (context.length > 0) {
      prompt += "Recent context:\n";
      context.forEach((entry, index) => {
        prompt += `Entry ${index + 1}: "${entry.entry}"\n`;
        prompt += `Your previous analysis: "${entry.analysis}"\n\n`;
      });
    }

    prompt += "\nAnalyze patterns or themes you notice in this entry and previous ones. Share your insights reluctantly, as Johnny Silverhand would.";

    return prompt;
  }

  // Original method kept for backward compatibility
  async processJournalEntry(currentEntry: string): Promise<{ response: string; analysis: string }> {
    try {
      const [response, analysis] = await Promise.all([
        this.generateResponse(currentEntry),
        this.generateAnalysis(currentEntry)
      ]);

      return {
        response,
        analysis
      };
    } catch (error) {
      console.error('Error in processJournalEntry:', error);
      throw error;
    }
  }
}