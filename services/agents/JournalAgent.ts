import OpenAI from 'openai';
import { QuestAgent } from './QuestAgent';
import { journalService } from '../journalService';
import { eventsService, EVENT_NAMES } from '../eventsService';
import { getPersonality } from './PersonalityPrompts';
import { personalityService } from '../personalityService';

export class JournalAgent {
    private openai: OpenAI;
    private questAgent: QuestAgent;
    
    constructor() {
      this.openai = new OpenAI({
        apiKey: process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY,
        baseURL: 'https://api.deepseek.com',
        dangerouslyAllowBrowser: true
      });
      this.questAgent = new QuestAgent();
    }

    // Helper method to trigger suggestion analysis via SuggestionContext
    private emitJournalAnalysisEvent(entry: string, userId: string): void {
      try {
        console.log('📣 Emitting analyzeJournalEntry event for SuggestionContext');
        eventsService.emit(EVENT_NAMES.ANALYZE_JOURNAL_ENTRY, { entry, userId });
      } catch (error) {
        console.error('❌ Error emitting journal analysis event:', error);
      }
    }

    async generateResponse(currentEntry: string, userId: string, previousCheckupsContext?: string): Promise<string> {
      console.log('🚀 JournalAgent.generateResponse called with entry:', currentEntry);
      
      try {
        // Start task analysis in parallel - don't await it
        console.log('🔍 Starting task suggestion analysis in parallel');
        this.emitJournalAnalysisEvent(currentEntry, userId);
        
        // Continue with response generation immediately
        console.log('🔄 Proceeding with response generation');
        const recentEntries = await journalService.getRecentEntries(3, userId);

        // Format context for OpenAI, now including timestamp information
        const context = recentEntries?.map(entry => ({
          entry: entry.user_entry,
          response: entry.ai_response,
          updated_at: entry.updated_at
        })) || [];

        // Create the prompt with consistent paired format
        const prompt = await this.createResponsePrompt(currentEntry, context, userId, previousCheckupsContext);

        console.log('📤 Sending prompt to AI:', prompt);
        
        // Get current personality for this call
        const personalityType = await personalityService.getUserPersonality(userId);
        const personality = getPersonality(personalityType);
        
        // Get OpenAI response
        const response = await this.openai.chat.completions.create({
          model: "deepseek-chat",
          messages: [
            {
              role: "system",
              content: personality.prompts.journal.system
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 8000
        });

        const aiResponse = response.choices[0].message?.content || `Hey choom, looks like my neural circuits are fried. Try again in a bit.`;
        console.log('📥 Received AI response:', aiResponse);
        
        // After generating response, check for quest updates
        const relevantQuests = await this.questAgent.findRelevantQuests(currentEntry, userId);

        // For each relevant quest, analyze the entry for potential updates
        for (const quest of relevantQuests) {
          await this.questAgent.analyzeContentForQuest(
            currentEntry,
            quest.id,
            userId,
            'journal'
          );
        }

        return aiResponse;
      } catch (error) {
        console.error('❌ Error in generateResponse:', error);
        throw error;
      }
    }

    async generateAnalysis(currentEntry: string, userId: string, previousCheckupsContext?: string): Promise<string> {
      console.log('🚀 JournalAgent.generateAnalysis called with entry:', currentEntry);
      console.log('🔄 Previous context available:', !!previousCheckupsContext);
      
      try {
        // Replace direct SQL call with journalService function
        const recentEntries = await journalService.getRecentEntries(3, userId);

        // Format context for OpenAI with timestamp info
        const context = recentEntries?.map(entry => ({
          entry: entry.user_entry,
          analysis: entry.ai_analysis,
          updated_at: entry.updated_at
        })) || [];

        // Create the prompt with previous checkups context if available
        const prompt = await this.createAnalysisPrompt(currentEntry, context, userId, previousCheckupsContext);

        console.log('📤 Sending analysis prompt to AI:', prompt);
        
        // Get current personality for this call
        const personalityType = await personalityService.getUserPersonality(userId);
        const personality = getPersonality(personalityType);
        
        // Get OpenAI response with analysis prompt
        const response = await this.openai.chat.completions.create({
          model: "deepseek-chat",
          messages: [
            {
              role: "system",
              content: personality.prompts.analysis.system
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
        console.log('📥 Received AI analysis:', aiAnalysis);
        
        return aiAnalysis;
      } catch (error) {
        console.error('❌ Error in generateAnalysis:', error);
        throw error;
      }
    }

    // Updated prompt creation to better utilize task relevance information
    private async createResponsePrompt(currentEntry: string, context: Array<{ entry: string; response: string; updated_at: string }>, userId: string, previousCheckupsContext?: string): Promise<string> {
      console.log('🔧 Creating response prompt with context entries:', context.length);
      
      // First get relevant quests - user_id filtering handled by RLS
      const relevantQuests = await this.questAgent.findRelevantQuests(currentEntry, userId);
      console.log('✨ Found relevant quests:', relevantQuests.map(q => q.title));
      
      const currentTime = new Date().toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
      const currentDate = new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
      
      let prompt = '';

      // First: Historical journal entries
      if (context.length > 0) {
        prompt += "For historical context, here are some recent previous daily journal entries with their dates:\n";
        context.forEach((entry, index) => {
          const entryDate = new Date(entry.updated_at);
          const formattedDate = entryDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
          });
          const formattedTime = entryDate.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false
          });
          
          prompt += `Previous Daily Entry ${index + 1} [${formattedDate}, ${formattedTime}]: "${entry.entry}"\n`;
          prompt += `Your previous response: "${entry.response}"\n\n`;
        });
      }

      // Enhanced quest and task details section
      if (relevantQuests.length > 0) {
        prompt += `\nRELEVANT QUEST AND TASK DETAILS:\n`;
        relevantQuests.forEach(quest => {
          prompt += `\nQuest: ${quest.title}\n`;
          prompt += `Description: ${quest.description || 'No description available'}\n`;
          prompt += `Current Status: ${quest.status || 'Unknown'}\n`;
          
          // Add specifically relevant tasks section with explanations
          if (quest.relevantTasks && quest.relevantTasks.length > 0) {
            prompt += '\nRelevant Tasks (with explanations):\n';
            quest.relevantTasks.forEach(task => {
              prompt += `- ${task.name}\n`;
              prompt += `  Description: ${task.description}\n`;
              prompt += `  Why Relevant: ${task.relevance}\n`;
            });
            prompt += '\n';
          }
          
          // Add other tasks for context
          const otherTasks = quest.tasks?.filter(task => 
            !quest.relevantTasks?.some(rt => rt.taskId === task.id)
          );
          
          if (otherTasks && otherTasks.length > 0) {
            prompt += '\nOther Related Tasks:\n';
            otherTasks.forEach(task => {
              prompt += `- ${task.title} (${task.status})\n`;
            });
          }
          
          if (quest.relevance) {
            prompt += `\nRelevance to Current Entry: ${quest.relevance}\n`;
          }
          if (quest.analysis) {
            prompt += `Previous Analysis: ${quest.analysis}\n`;
          }
          prompt += '---\n';
        });
        prompt += '\nFocus on addressing the specifically relevant tasks in your response, while keeping the broader quest context in mind.\n\n';
      }

      // Third: Today's previous checkups
      if (previousCheckupsContext && previousCheckupsContext.trim()) {
        prompt += `IMPORTANT: Earlier today, you've already had these conversations with the user (in chronological order with timestamps):\n${previousCheckupsContext}\n\n`;
        prompt += `As you can see above, YOU'VE ALREADY RESPONDED to the user's earlier checkups. Do not repeat advice or commentary you've already given in those earlier responses. Your new response should only address what's NEW in their latest entry.\n\n`;
      }
  
      // Fourth: Instructions
      prompt += "\nIMPORTANT INSTRUCTIONS:\n";
     
      prompt += `'1. Respond ONLY to the latest checkup entry (shown below)
  2. DO NOT repeat advice or commentary you've already given in your previous responses
  3. Focus on what's new or different in this latest entry
  4. Keep your characteristic Johnny Silverhand style - snarky but supportive
  5. If the user is clearly continuing a thought from earlier, acknowledge that continuity
  6. no or few emojis
  7. avoid doing emotes like *throws cig* unless there's a very good reason. you're writing, not acting\n\n`;
  
  
      // Fifth: Current entry (repeated at end for LLM focus)
      prompt += `Here's the user's latest checkup entry that you need to respond to:\n[${currentDate}, ${currentTime}] USER: ${currentEntry}\n`;
      return prompt;
    }

    private async createAnalysisPrompt(currentEntry: string, context: Array<{ entry: string; analysis: string; updated_at: string }>, userId: string, previousCheckupsContext?: string): Promise<string> {
      // Get relevant quests first to incorporate into the analysis
      const relevantQuests = await this.questAgent.findRelevantQuests(currentEntry, userId);
      
      let prompt = `Here's the user's latest journal entry that you need to analyze: "${currentEntry}"\n\n`;

      // Add quest and task context early for better analysis
      if (relevantQuests.length > 0) {
        prompt += `\nRELEVANT QUEST AND TASK CONTEXT:\n`;
        relevantQuests.forEach(quest => {
          prompt += `\nQuest: ${quest.title}\n`;
          
          if (quest.relevance) {
            prompt += `Why Relevant: ${quest.relevance}\n`;
          }
          
          // Highlight specifically relevant tasks
          if (quest.relevantTasks && quest.relevantTasks.length > 0) {
            prompt += '\nDirectly Relevant Tasks:\n';
            quest.relevantTasks.forEach(task => {
              prompt += `- ${task.name}\n`;
              prompt += `  Relevance: ${task.relevance}\n`;
            });
          }
        });
        prompt += '\nConsider these quest relationships in your analysis.\n\n';
      }

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
            hour12: false
          });
          
          prompt += `Previous Entry ${index + 1} [${formattedDate}, ${formattedTime}]: "${entry.entry}"\n`;
          prompt += `Your previous analysis: "${entry.analysis}"\n\n`;
        });
      }
  
      prompt += "\nAnalyze the latest entry while considering:\n";
      prompt += "1. Both today's earlier entries and historical context to identify patterns\n";
      prompt += "2. How the entry relates to relevant quests and their specific tasks\n";
      prompt += "3. Any progress or blockers mentioned regarding the relevant tasks\n";
      prompt += "4. Shifts in focus or priority among different quests and tasks\n";
      prompt += "5. Potential connections between tasks that might not be obvious\n";
      
      prompt += `\nHere's the user's latest journal entry again for final analysis: "${currentEntry}"\n\n`;
  
      console.log('✅ Analysis prompt created, ', prompt);
      return prompt;
    }

    // Process journal entry with mandatory userId
    async processJournalEntry(currentEntry: string, userId: string, previousCheckupsContext?: string): Promise<{ response: string; analysis: string }> {
      console.log('🚀 JournalAgent.processJournalEntry called with entry:', currentEntry);
      
      try {
        console.log('🔄 Processing journal entry with Promise.all for response and analysis');
        const [response, analysis] = await Promise.all([
          this.generateResponse(currentEntry, userId, previousCheckupsContext),
          this.generateAnalysis(currentEntry, userId, previousCheckupsContext)
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
    async processEndOfDay(allCheckupEntries: string, userId: string): Promise<{ response: string; analysis: string }> {
      console.log('🚀 JournalAgent.processEndOfDay called with entries length:', allCheckupEntries.length);
      
      try {
        const prompt = await this.createEndOfDayPrompt(allCheckupEntries, userId);
        console.log('📤 Sending end-of-day prompt to AI:', prompt);
        
        // Get current personality for this call
        const personalityType = await personalityService.getUserPersonality(userId);
        const personality = getPersonality(personalityType);
        
        // Generate response with improved personality system prompt
        console.log('🔄 Generating end-of-day response');
        const response = await this.openai.chat.completions.create({
          model: "deepseek-chat",
          messages: [
            {
              role: "system",
              content: personality.prompts.endOfDay.system
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
          model: "deepseek-chat",
          messages: [
            {
              role: "system",
              content: personality.prompts.endOfDay.system
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
        
        console.log('📥 Received end-of-day response:', responseText);
        console.log('📥 Received end-of-day analysis:', analysisText);

        return {
          response: responseText,
          analysis: analysisText
        };
      } catch (error) {
        console.error('❌ Error in processEndOfDay:', error);
        throw error;
      }
    }

    private async createEndOfDayPrompt(allCheckupEntriesWithResponses: string, userId: string): Promise<string> {
      console.log('🔧 Creating end-of-day prompt with entries length:', allCheckupEntriesWithResponses.length);
      
      // First get relevant quests based on all checkups content
      console.log('🔄 Finding relevant quests for end of day analysis');
      const relevantQuests = await this.questAgent.findRelevantQuests(allCheckupEntriesWithResponses, userId);
      console.log('✨ Found relevant quests:', relevantQuests.map(q => q.title));

      // Replace direct SQL call with journalService function
      console.log('🔄 Fetching recent journal entries for context');
      const recentEntries = await journalService.getRecentEntries(3, userId, );

      let prompt = '';

      // First: Historical journal entries
      if (recentEntries && recentEntries.length > 0) {
        prompt += "HISTORICAL CONTEXT:\nHere are some recent previous daily journal entries with their dates:\n\n";
        recentEntries.forEach(entry => {
          const date = new Date(entry.updated_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
          });
          prompt += `[${date}]\nEntry: ${entry.user_entry}\n Your Response: ${entry.ai_response} \nYour Analysis: ${entry.ai_analysis || 'No analysis recorded'}\n\n`;
        });
      }

      // Enhanced quest details section with task relevance
      if (relevantQuests.length > 0) {
        console.log('📝 Adding quest and task details to prompt');
        prompt += `\nRELEVANT QUEST AND TASK PROGRESS:\n`;
        relevantQuests.forEach(quest => {
          prompt += `\nQuest: ${quest.title}\n`;
          prompt += `Status: ${quest.status}\n`;
          
          if (quest.relevance) {
            prompt += `Overall Relevance Today: ${quest.relevance}\n`;
          }
          
          // Highlight specifically relevant tasks first
          if (quest.relevantTasks && quest.relevantTasks.length > 0) {
            prompt += '\nKey Tasks Discussed Today:\n';
            quest.relevantTasks.forEach(task => {
              prompt += `- ${task.name}\n`;
              prompt += `  Context: ${task.description}\n`;
              prompt += `  Relevance Today: ${task.relevance}\n`;
            });
          }
          
          // Other tasks for context
          const otherTasks = quest.tasks?.filter(task => 
            !quest.relevantTasks?.some(rt => rt.taskId === task.id)
          );
          
          if (otherTasks && otherTasks.length > 0) {
            prompt += '\nOther Tasks to Consider:\n';
            otherTasks.forEach(task => {
              prompt += `- ${task.title} (${task.status})\n`;
            });
          }
          
          prompt += '\n';
        });
        prompt += 'Consider how discussions throughout the day have impacted or related to these quests and their specific tasks.\n\n';
      }

      // Third: Today's checkups and responses
      prompt += `TODAY'S CHECKUPS AND RESPONSES:\n${allCheckupEntriesWithResponses}\n\n`;

      // Fourth: Analysis instructions
      prompt += `Based on all the context above, provide a thoughtful end-of-day summary and analysis. Consider:
1. How today's activities and thoughts relate to ongoing quests
2. Patterns or changes compared to recent journal entries
3. Overall progression or shifts throughout today's checkups
4. Notable developments in the user's thoughts, mood, or goals
5. How your responses may have influenced subsequent checkups
6. Recommendations for tomorrow based on all context


Remember to address the user directly as if you've been texting with them throughout the day, and finally have a chance to discuss any insights in person.`;

      console.log('✅ End-of-day prompt created, length:', prompt.length);
      return prompt;
    }
  };