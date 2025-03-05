import OpenAI from 'openai';
import { supabase } from '../lib/supabase';

export class JournalAgent {
  private openai: OpenAI;
  
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY,
      baseURL: 'https://api.deepseek.com/v1',
      dangerouslyAllowBrowser: true
    });
  }

  // Updated to handle paired format for checkup entries too
  async generateResponse(currentEntry: string, previousCheckupsContext?: string): Promise<string> {
    console.log('🚀 JournalAgent.generateResponse called with entry:', currentEntry.substring(0, 100) + '...');
    console.log('🔄 Previous context available:', !!previousCheckupsContext);
    
    try {
      // Fetch last 3 daily entries for secondary context with updated_at field
      const { data: recentEntries, error } = await supabase
        .from('journal_entries')
        .select('user_entry, ai_response, updated_at')
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;

      // Format context for OpenAI, now including timestamp information
      const context = recentEntries?.map(entry => ({
        entry: entry.user_entry,
        response: entry.ai_response,
        updated_at: entry.updated_at
      })) || [];

      // Create the prompt with consistent paired format
      const prompt = this.createResponsePrompt(currentEntry, context, previousCheckupsContext);

      console.log('📤 Sending prompt to AI:', prompt);
      
      // Get OpenAI response
      const response = await this.openai.chat.completions.create({
        model: "deepseek-reasoner",
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
        max_tokens: 8000
      });

      const aiResponse = response.choices[0].message?.content || "Listen up, got nothing to say right now. Come back when you've got something interesting.";
      console.log('📥 Received AI response:', aiResponse.substring(0, 100) + '...');
      
      return aiResponse;
    } catch (error) {
      console.error('❌ Error in generateResponse:', error);
      throw error;
    }
  }

  async generateAnalysis(currentEntry: string, previousCheckupsContext?: string): Promise<string> {
    console.log('🚀 JournalAgent.generateAnalysis called with entry:', currentEntry.substring(0, 100) + '...');
    console.log('🔄 Previous context available:', !!previousCheckupsContext);
    
    try {
      // Fetch last 3 entries for context with updated_at field
      const { data: recentEntries, error } = await supabase
        .from('journal_entries')
        .select('user_entry, ai_analysis, updated_at')
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;

      // Format context for OpenAI with timestamp info
      const context = recentEntries?.map(entry => ({
        entry: entry.user_entry,
        analysis: entry.ai_analysis,
        updated_at: entry.updated_at
      })) || [];

      // Create the prompt with previous checkups context if available
      const prompt = this.createAnalysisPrompt(currentEntry, context, previousCheckupsContext);

      console.log('📤 Sending analysis prompt to AI:', prompt);
      
      // Get OpenAI response
      const response = await this.openai.chat.completions.create({
        model: "deepseek-reasoner",
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
        max_tokens: 8000
      });

      const aiAnalysis = response.choices[0].message?.content || 'Not seeing any patterns worth mentioning yet. Keep writing and I might find something.';
      console.log('📥 Received AI analysis:', aiAnalysis.substring(0, 100) + '...');
      
      return aiAnalysis;
    } catch (error) {
      console.error('❌ Error in generateAnalysis:', error);
      throw error;
    }
  }

  // Updated prompt creation to make AI aware of its previous responses
  private createResponsePrompt(currentEntry: string, context: Array<{ entry: string; response: string; updated_at: string }>, previousCheckupsContext?: string): string {
    console.log('🔧 Creating response prompt with context entries:', context.length);
    
    const currentTime = new Date().toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
    const currentDate = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
    
    let prompt = `Here's the user's latest checkup entry that you need to respond to:\n[${currentDate}, ${currentTime}] USER: ${currentEntry}\n\n`;
    
    // First plane of context: Today's previous checkups in paired format with explicit reminder and timestamps
    if (previousCheckupsContext && previousCheckupsContext.trim()) {
      prompt += `IMPORTANT: Earlier today, you've already had these conversations with the user (in chronological order with timestamps):\n${previousCheckupsContext}\n\n`;
      prompt += `As you can see above, YOU'VE ALREADY RESPONDED to the user's earlier checkups. Do not repeat advice or commentary you've already given in those earlier responses. Your new response should only address what's NEW in their latest entry.\n\n`;
    }
    
    // Second plane of context: Historical journal entries with dates from updated_at
    if (context.length > 0) {
      prompt += "For additional historical context, here are some recent previous daily journal entries with their dates:\n";
      context.forEach((entry, index) => {
        // Format the date from updated_at field
        const entryDate = new Date(entry.updated_at);
        const formattedDate = entryDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        });
        const formattedTime = entryDate.toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true
        });
        
        prompt += `Previous Daily Entry ${index + 1} [${formattedDate}, ${formattedTime}]: "${entry.entry}"\n`;
        prompt += `Your previous response: "${entry.response}"\n\n`;
      });
    }

    prompt += "\nIMPORTANT INSTRUCTIONS:\n1. Respond ONLY to the latest checkup entry (shown at the top)\n2. DO NOT repeat advice or commentary you've already given in your previous responses\n3. Focus on what's new or different in this latest entry\n4. Keep your characteristic Johnny Silverhand style - snarky but supportive\n5. If the user is clearly continuing a thought from earlier, acknowledge that continuity\n";

    console.log('✅ Response prompt created, length:', prompt.length);
    return prompt;
  }

  private createAnalysisPrompt(currentEntry: string, context: Array<{ entry: string; analysis: string; updated_at: string }>, previousCheckupsContext?: string): string {
    console.log('🔧 Creating analysis prompt with context entries:', context.length);
    
    let prompt = `Here's the user's latest journal entry that you need to analyze: "${currentEntry}"

`;
    
    if (previousCheckupsContext) {
      prompt += `\nEarlier today, the user wrote:\n${previousCheckupsContext}\n`;
    }
    
    if (context.length > 0) {
      prompt += "\nFor historical context, here are some recent previous entries:\n";
      context.forEach((entry, index) => {
        // Format the date from updated_at field
        const entryDate = new Date(entry.updated_at);
        const formattedDate = entryDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        });
        const formattedTime = entryDate.toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true
        });
        
        prompt += `Previous Entry ${index + 1} [${formattedDate}, ${formattedTime}]: "${entry.entry}"\n`;
        prompt += `Your previous analysis: "${entry.analysis}"\n\n`;
      });
    }

    prompt += "\nAnalyze the latest entry while considering both today's earlier entries and historical context to identify patterns or themes. Focus particularly on any shifts or developments throughout today. Let's hear what Johnny thinks.";

    console.log('✅ Analysis prompt created, length:', prompt.length);
    return prompt;
  }

  // Process journal entry with optional context from previous checkups
  async processJournalEntry(currentEntry: string, previousCheckupsContext?: string): Promise<{ response: string; analysis: string }> {
    console.log('🚀 JournalAgent.processJournalEntry called with entry:', currentEntry.substring(0, 100) + '...');
    
    try {
      console.log('🔄 Processing journal entry with Promise.all for response and analysis');
      const [response, analysis] = await Promise.all([
        this.generateResponse(currentEntry, previousCheckupsContext),
        this.generateAnalysis(currentEntry, previousCheckupsContext)
      ]);

      console.log('✅ processJournalEntry complete, response length:', response.length, 'analysis length:', analysis.length);
      return {
        response,
        analysis
      };
    } catch (error) {
      console.error('❌ Error in processJournalEntry:', error);
      throw error;
    }
  }

  // Updated to recognize paired checkup/response format
  async processEndOfDay(allCheckupEntries: string): Promise<{ response: string; analysis: string }> {
    console.log('🚀 JournalAgent.processEndOfDay called with entries length:', allCheckupEntries.length);
    
    try {
      const prompt = this.createEndOfDayPrompt(allCheckupEntries);
      console.log('📤 Sending end-of-day prompt to AI:', prompt);
      
      // Generate response with improved Johnny Silverhand system prompt
      console.log('🔄 Generating end-of-day response');
      const response = await this.openai.chat.completions.create({
        model: "deepseek-reasoner",
        messages: [
          {
            role: "system",
            content: `You are Johnny Silverhand from Cyberpunk 2077, providing an end-of-day reflection.
            You're a sarcastic, anti-corporate rebel with a grudge against the system. You're abrasive and often an asshole, but you genuinely care about the user underneath your hard exterior.
            
            Review all of today's checkups and your responses holistically to provide a meaningful summary and reflection.
            The input will show each user checkup paired with your response to it.
            Consider patterns, progress, and changes throughout the day. Be insightful but maintain your distinctive voice and attitude.
            
            Your response should include:
            1. A summary of the day's key themes and events
            2. Notable progress or setbacks you've observed
            3. Advice or thoughts for tomorrow
            4. Personal observations only you would make, with your characteristic edge and attitude
            5. Reference specific moments or exchanges from the day when relevant
            
            Keep your cyberpunk attitude but be genuinely helpful. This is your chance to show you've been paying attention all day.`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 8000
      });

      // Analysis prompt updated to also consider the paired responses
      console.log('🔄 Generating end-of-day analysis');
      const analysis = await this.openai.chat.completions.create({
        model: "deepseek-reasoner",
        messages: [
          {
            role: "system",
            content: `Analyze all of today's checkups and responses from a strategic perspective.
            The input contains user entries paired with your responses throughout the day.
            Identify patterns, themes, and significant elements across all exchanges.
            Focus on:
            1. Recurring themes or concerns in both the user's entries and your responses
            2. Emotional patterns and shifts throughout the day
            3. Behavioral insights and potential optimization opportunities
            4. Progress on any mentioned goals or tasks
            5. Areas that may need attention or reflection
            6. How your responses may have influenced subsequent user entries
            
            Be thorough but concise. This analysis should provide genuine value to the user in understanding their day.`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.5,
        max_tokens: 8000
      });

      const responseText = response.choices[0]?.message?.content || "Error generating end-of-day response";
      const analysisText = analysis.choices[0]?.message?.content || "Error generating end-of-day analysis";
      
      console.log('📥 Received end-of-day response:', responseText.substring(0, 100) + '...');
      console.log('📥 Received end-of-day analysis:', analysisText.substring(0, 100) + '...');

      return {
        response: responseText,
        analysis: analysisText
      };
    } catch (error) {
      console.error('❌ Error in processEndOfDay:', error);
      throw error;
    }
  }

  private createEndOfDayPrompt(allCheckupEntriesWithResponses: string): string {
    console.log('🔧 Creating end-of-day prompt with entries length:', allCheckupEntriesWithResponses.length);
    
    const prompt = `Here are all the checkup entries and your responses to them from today, in chronological order:

${allCheckupEntriesWithResponses}

Please provide a thoughtful end-of-day summary and analysis based on this complete record of conversations throughout the day.
Consider how the day progressed from first entry to last, any changes in mood or focus, and overall themes.
Remember to address the user directly as if you've been with them throughout the day.`;

    console.log('✅ End-of-day prompt created, length:', prompt.length);
    return prompt;
  }
};