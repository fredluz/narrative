// ================================================================
// File: services/agents/JournalAgent.ts
// Goal: Ensure correct event emission for suggestion context, remove performanceLogger.
// ================================================================
import OpenAI from 'openai';
import { QuestAgent } from './QuestAgent';
// Import CheckupEntry type from journalService
import { journalService, CheckupEntry } from '../journalService';
import { eventsService, EVENT_NAMES } from '../eventsService'; // Correct path if needed
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
        // Include sourceType in the payload
        eventsService.emit(EVENT_NAMES.ANALYZE_JOURNAL_ENTRY, {
            entry,
            userId,
            sourceType: 'journal' // Added sourceType
        });
      } catch (error) {
        console.error('❌ Error emitting journal analysis event:', error);
      }
    }

    async generateResponse(currentEntry: string, userId: string, previousCheckupsContext?: string): Promise<string> {
      console.log('🚀 JournalAgent.generateResponse called with entry:', currentEntry.substring(0, 50) + '...'); // Log snippet

      try {
        // --- Start suggestion analysis in parallel ---
        console.log('🔍 Triggering suggestion analysis for journal entry...');
        // This correctly triggers the SuggestionContext via the event service
        this.emitJournalAnalysisEvent(currentEntry, userId);
        // --- End suggestion analysis trigger ---

        // Continue with response generation immediately
        console.log('🔄 Proceeding with response generation');
        const recentEntries = await journalService.getRecentEntries(3, userId);

        // Format context for OpenAI, now including timestamp information
        const context = recentEntries?.map(entry => ({
          entry: entry.user_entry || '', // Provide default empty string
          response: entry.ai_response || '', // Provide default empty string
          updated_at: entry.updated_at
        })) || [];

        // Create the prompt with consistent paired format
        const prompt = await this.createResponsePrompt(currentEntry, context, userId, previousCheckupsContext);

        console.log('📤 Sending prompt to AI for response...'); // Removed detailed prompt logging

        // Get current personality for this call
        const personalityType = await personalityService.getUserPersonality(userId);
        const personality = getPersonality(personalityType);

        // Get OpenAI response
        const response = await this.openai.chat.completions.create({
          model: "deepseek-chat",
          messages: [
            {
              role: "system",
              content: personality.prompts.journal.system // Use 'journal' prompt context
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 1000 // Consider adjusting if responses are cut off
        });

        const aiResponse = response.choices[0].message?.content || `Hey choom, looks like my neural circuits are fried. Try again in a bit.`;
        console.log('📥 Received AI response (length):', aiResponse.length);

        

        return aiResponse;
      } catch (error) {
        console.error('❌ Error in generateResponse:', error);
        // Consider returning a more user-friendly error message
        return "Sorry, I encountered an error trying to generate a response.";
      }
    }

    async generateAnalysis(currentEntry: string, userId: string, previousCheckupsContext?: string): Promise<string> {
      console.log('🚀 JournalAgent.generateAnalysis called with entry:', currentEntry.substring(0, 50) + '...');
      console.log('🔄 Previous checkup context available:', !!previousCheckupsContext);

      try {
        // Fetch recent journal entries using the service
        const recentEntries = await journalService.getRecentEntries(3, userId);

        // Format context for OpenAI with timestamp info
        const context = recentEntries?.map(entry => ({
          entry: entry.user_entry || '', // Provide default empty string
          response: entry.ai_response || '', // Provide default empty string
          updated_at: entry.updated_at
        })) || [];

        // Create the prompt with consistent paired format
        const prompt = await this.createResponsePrompt(currentEntry, context, userId, previousCheckupsContext);

        console.log('📤 Sending analysis prompt to AI...'); // Removed detailed prompt logging

        // Get current personality for this call
        const personalityType = await personalityService.getUserPersonality(userId);
        const personality = getPersonality(personalityType);

        // Get OpenAI response with analysis prompt
        const response = await this.openai.chat.completions.create({
          model: "deepseek-chat",
          messages: [
            {
              role: "system",
              content: personality.prompts.analysis.system // Use 'analysis' prompt context
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.7, // Temp might be lower for analysis? Test needed.
          max_tokens: 8000
        });

        const aiAnalysis = response.choices[0].message?.content || 'Not seeing any patterns worth mentioning yet. Keep writing and I might find something.';
        console.log('📥 Received AI analysis (length):', aiAnalysis.length);

        return aiAnalysis;
      } catch (error) {
        console.error('❌ Error in generateAnalysis:', error);
        return "Sorry, I encountered an error during analysis.";
      }
    }

    // Updated prompt creation to better utilize task relevance information
    private async createResponsePrompt(currentEntry: string, context: Array<{ entry: string; response: string; updated_at: string }>, userId: string, previousCheckupsContext?: string): Promise<string> {
      console.log('🔧 Creating response prompt with context entries:', context.length);

      // Fetch relevant quests - RLS handles clerk_id filtering
      const relevantQuests = await this.questAgent.findRelevantQuests(currentEntry, userId);
      console.log('✨ Found relevant quests for prompt:', relevantQuests.map(q => q.title));

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

      // --- Historical Daily Entries Context ---
      if (context.length > 0) {
        prompt += "HISTORICAL CONTEXT (Recent Daily Summaries):\n";
        context.forEach((entry, index) => {
          const entryDate = new Date(entry.updated_at);
          const formattedDate = entryDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          const formattedTime = entryDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
          prompt += `Previous Daily Entry ${index + 1} [${formattedDate}, ${formattedTime}]: "${entry.entry}"\n`;
          prompt += `Your Response: "${entry.response}"\n\n`;
        });
      }

      // --- Relevant Quest & Task Context ---
      if (relevantQuests.length > 0) {
        prompt += `\nRELEVANT QUEST AND TASK DETAILS:\n`;
        relevantQuests.forEach(quest => {
          prompt += `\nQuest: ${quest.title} (Status: ${quest.status || 'Unknown'})\n`;
          prompt += `Description: ${quest.description || 'No description available'}\n`;

          // Add specifically relevant tasks section with explanations
          if (quest.relevantTasks && quest.relevantTasks.length > 0) {
            prompt += 'Relevant Tasks Mentioned:\n';
            quest.relevantTasks.forEach(task => {
              prompt += `- ${task.name} (Desc: ${task.description || 'N/A'}, Why Relevant: ${task.relevance})\n`;
            });
          }

          // Add other tasks for context
          const otherTasks = quest.tasks?.filter(task =>
            !quest.relevantTasks?.some(rt => rt.taskId === task.id)
          );
          if (otherTasks && otherTasks.length > 0) {
            prompt += 'Other Related Tasks:\n';
            otherTasks.forEach(task => {
              prompt += `- ${task.title} (${task.status})\n`;
            });
          }
          if (quest.relevance) {
            prompt += `\nRelevance to Current Entry: ${quest.relevance}\n`;
          }
          prompt += '---\n';
        });
        prompt += '\nFocus on addressing the specifically relevant tasks in your response, keeping the broader quest context in mind.\n\n';
      }

      // --- Today's Previous Checkups Context ---
      if (previousCheckupsContext && previousCheckupsContext.trim()) {
        prompt += `IMPORTANT: EARLIER TODAY'S CONVERSATION (Timestamped):\n${previousCheckupsContext}\n\n`;
        prompt += `REMINDER: You've already responded to the above. Address ONLY what's new in the entry below. Acknowledge continuity if present, but avoid repeating yourself.\n\n`;
      }

      // --- Instructions ---
      prompt += `INSTRUCTIONS FOR YOUR RESPONSE:
1. Respond ONLY to the user's LATEST checkup entry (provided below).
2. Focus on what's NEW or DIFFERENT compared to earlier checkups today.
3. DO NOT repeat advice/commentary already given in your previous responses today.
4. Maintain your characteristic personality style (sarcastic but supportive if Johnny, etc.).
5. **Keep this response brief and focused, like a quick radio check-in or acknowledgement (1-2 paragraphs maximum). Save the deeper analysis for the end-of-day summary.**
6. Keep responses concise and impactful overall.
7. No emojis unless extremely fitting for the personality. Avoid overusing emotes (*action*).\n\n`;

      // --- Current Entry ---
      prompt += `USER'S LATEST CHECKUP ENTRY ([${currentDate}, ${currentTime}]):\n${currentEntry}\n`;
      prompt += `\nYOUR RESPONSE:`; // Added explicit marker for the AI

      return prompt;
    }

    private async createAnalysisPrompt(currentEntry: string, context: Array<{ entry: string; analysis: string; updated_at: string }>, userId: string, previousCheckupsContext?: string): Promise<string> {
      console.log('🔧 Creating analysis prompt...');
      const relevantQuests = await this.questAgent.findRelevantQuests(currentEntry, userId);
      console.log('✨ Found relevant quests for analysis prompt:', relevantQuests.map(q => q.title));

      let prompt = `ANALYZE THE FOLLOWING LATEST JOURNAL ENTRY:\n"${currentEntry}"\n\n`;

       // --- Relevant Quest & Task Context ---
       if (relevantQuests.length > 0) {
        prompt += `RELEVANT QUEST AND TASK CONTEXT:\n`;
        relevantQuests.forEach(quest => {
          prompt += `\nQuest: ${quest.title}\n`;
          if (quest.relevance) prompt += `Why Relevant: ${quest.relevance}\n`;
          if (quest.relevantTasks && quest.relevantTasks.length > 0) {
            prompt += 'Directly Relevant Tasks:\n';
            quest.relevantTasks.forEach(task => prompt += `- ${task.name} (Relevance: ${task.relevance})\n`);
          }
        });
        prompt += 'Consider these relationships in your analysis.\n\n';
      }

      // --- Today's Previous Checkups Context ---
      if (previousCheckupsContext && previousCheckupsContext.trim()) {
        prompt += `CONTEXT FROM EARLIER TODAY (User Entries & Your Responses):\n${previousCheckupsContext}\n\n`;
      }

      // --- Historical Daily Entries Context ---
      if (context.length > 0) {
        prompt += "HISTORICAL CONTEXT (Recent Daily Summaries):\n";
        context.forEach((entry, index) => {
          const entryDate = new Date(entry.updated_at);
          const formattedDate = entryDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          const formattedTime = entryDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
          prompt += `Previous Daily Entry ${index + 1} [${formattedDate}, ${formattedTime}]: "${entry.entry}"\n`;
          prompt += `Your previous analysis: "${entry.analysis}"\n\n`;
        });
      }

      // --- Analysis Instructions ---
      prompt += `YOUR ANALYSIS TASK:
1. Analyze the LATEST entry considering today's earlier entries and historical context to identify patterns, shifts, or insights.
2. Connect the entry to the relevant quests and tasks mentioned above. Analyze progress, blockers, or changes in focus.
3. Identify potential underlying themes or connections.
4. Maintain your characteristic personality style in the analysis.\n\n`;

      prompt += `LATEST JOURNAL ENTRY FOR FINAL ANALYSIS:\n"${currentEntry}"\n\n`;
      prompt += `YOUR ANALYSIS:`; // Added explicit marker

      console.log('✅ Analysis prompt created.');
      return prompt;
    }

    // Process journal entry with mandatory userId
    async processJournalEntry(currentEntry: string, userId: string, previousCheckupsContext?: string): Promise<{ response: string; analysis: string }> {
      console.log('🚀 JournalAgent.processJournalEntry called...');

      try {
        console.log('🔄 Processing journal entry with Promise.all for response and analysis');
        // Run response and analysis generation concurrently
        const [response, analysis] = await Promise.all([
          this.generateResponse(currentEntry, userId, previousCheckupsContext),
          this.generateAnalysis(currentEntry, userId, previousCheckupsContext)
        ]);

        console.log('✅ processJournalEntry complete.');
        return { response, analysis };
      } catch (error) {
        console.error('❌ Error in processJournalEntry:', error);
        // Provide fallback results on error
        return {
            response: "Error generating response.",
            analysis: "Error generating analysis."
        };
      }
    }

    // Updated to accept CheckupEntry array
    async processEndOfDay(allTodaysCheckups: CheckupEntry[], userId: string): Promise<{ response: string; analysis: string }> {
      console.log(`🚀 JournalAgent.processEndOfDay called with ${allTodaysCheckups.length} checkups...`);

      try {
        // Pass the array to the prompt creation function
        const prompt = await this.createEndOfDayPrompt(allTodaysCheckups, userId);
        console.log('📤 Sending end-of-day prompt to AI (length):', prompt.length); // Log prompt length for debugging

        // Get current personality for this call
        const personalityType = await personalityService.getUserPersonality(userId);
        const personality = getPersonality(personalityType);

        // Generate response and analysis concurrently
        console.log('🔄 Generating end-of-day response and analysis concurrently...');
        const [responseResult, analysisResult] = await Promise.all([
            this.openai.chat.completions.create({
                model: "deepseek-reasoner",
                messages: [
                    { role: "system", content: personality.prompts.endOfDay.system },
                    { role: "user", content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 8000 // Adjust as needed
            }),
            this.openai.chat.completions.create({
                model: "deepseek-reasoner", // Use same or different model for analysis
                messages: [
                    { role: "system", content: personality.prompts.analysis.system }, // Use analysis system prompt
                    { role: "user", content: prompt } // Same user prompt can work for analysis too
                ],
                temperature: 0.5, // Potentially lower temp for analysis
                max_tokens: 8000
            })
        ]);

        const responseText = responseResult.choices[0]?.message?.content || "Error generating end-of-day response";
        const analysisText = analysisResult.choices[0]?.message?.content || "Error generating end-of-day analysis";

        console.log('📥 Received end-of-day response (length):', responseText.length);
        console.log('📥 Received end-of-day analysis (length):', analysisText.length);
        // After generating response, check for quest updates
        const questUpdates = responseText+analysisText; // Combine response and analysis for quest updates
        const relevantQuests = await this.questAgent.findRelevantQuests(questUpdates, userId);
        // For each relevant quest, analyze the entry for potential updates
        for (const quest of relevantQuests) {
          await this.questAgent.analyzeContentForQuest(
            questUpdates,
            quest.id,
            userId,
            'journal' // Indicate source is journal
          );
        }

        return { response: responseText, analysis: analysisText };
        
      } catch (error) {
        console.error('❌ Error in processEndOfDay:', error);
        return {
            response: "Error generating end-of-day response.",
            analysis: "Error generating end-of-day analysis."
        };
      }
    }

    // Updated to accept CheckupEntry array and format XML-like context
    private async createEndOfDayPrompt(allTodaysCheckups: CheckupEntry[], userId: string): Promise<string> {
      console.log('🔧 Creating end-of-day prompt...');
      // Get current personality for this call
        const personalityType = await personalityService.getUserPersonality(userId);
        const personality = getPersonality(personalityType);
      // Create the structured checkup log first
      const structuredCheckupLog = allTodaysCheckups.map(checkup => {
        const timestamp = new Date(checkup.created_at).toISOString(); // Use ISO string for consistency
        const userEntry = checkup.content || '';
        const aiResponse = checkup.ai_checkup_response || 'No response recorded';
        // Basic XML escaping for content - corrected implementation
        const escapeXml = (unsafe: string): string => { // Added return type
            return unsafe.replace(/[<>&'"]/g, (c): string => { // Added return type
                switch (c) {
                    case '<': return '<';
                    case '>': return '>';
                    case '&': return '&';
                    case '\'': return '\'';
                    case '"': return '"';
                    default: return c;
                }
            });
        };

        return `  <checkup timestamp="${timestamp}">
    <user_entry>${escapeXml(userEntry)}</user_entry>
    <ai_response>${escapeXml(aiResponse)}</ai_response>
  </checkup>`;
      }).join('\n');

      const fullCheckupContext = `<todays_checkups>\n${structuredCheckupLog}\n</todays_checkups>`;

      // Fetch other context concurrently using the user content from checkups
      const userEntriesString = allTodaysCheckups.map(c => c.content || '').join('\n');
      const [relevantQuests, recentEntries] = await Promise.all([
        this.questAgent.findRelevantQuests(userEntriesString, userId), // Analyze based on user content
        journalService.getRecentEntries(3, userId)
      ]);

      console.log('✨ Found relevant quests for EOD prompt:', relevantQuests.map(q => q.title));
      console.log('✨ Found recent daily entries for EOD prompt:', recentEntries.length);

      let prompt = '';

      // --- Historical Daily Entries Context ---
      if (recentEntries && recentEntries.length > 0) {
        prompt += "HISTORICAL CONTEXT (Recent Daily Summaries):\n";
        recentEntries.forEach(entry => {
          const date = new Date(entry.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          prompt += `[${date}]\nEntry: ${entry.user_entry}\nYour Response: ${entry.ai_response}\nYour Analysis: ${entry.ai_analysis || 'N/A'}\n\n`;
        });
      }

      // --- Relevant Quest & Task Context ---
      if (relevantQuests.length > 0) {
        prompt += `\nRELEVANT QUEST AND TASK PROGRESS TODAY:\n`;
        relevantQuests.forEach(quest => {
          prompt += `\nQuest: ${quest.title} (Status: ${quest.status})\n`;
          if (quest.relevance) prompt += `Overall Relevance Today: ${quest.relevance}\n`;
          if (quest.relevantTasks && quest.relevantTasks.length > 0) {
            prompt += 'Key Tasks Discussed Today:\n';
            quest.relevantTasks.forEach(task => prompt += `- ${task.name} (Context: ${task.description}, Relevance: ${task.relevance})\n`);
          }
          const otherTasks = quest.tasks?.filter(task => !quest.relevantTasks?.some(rt => rt.taskId === task.id));
          if (otherTasks && otherTasks.length > 0) {
            prompt += 'Other Tasks to Consider:\n';
            otherTasks.forEach(task => prompt += `- ${task.title} (${task.status})\n`);
          }
          prompt += '\n';
        });
        prompt += 'Consider how today\'s discussions impacted these quests and tasks.\n\n';
      }

      // --- Today's Checkups (Structured Format) ---
      prompt += `TODAY'S CHECKUPS:\n${fullCheckupContext}\n\n`;

      // --- Analysis/Response Instructions ---
      prompt += `YOUR TASK (End of Day Summary & Analysis):
The checkups above contain pairs of '<user_entry>' and '<ai_response>'.
**Focus your summary and analysis primarily on the content within the <user_entry> tags.** Use the <ai_response> tags mainly for context on the conversational flow, but do not simply repeat or summarize your own previous responses.
Based on ALL the context (historical, quests, today's checkups log), provide a thoughtful end-of-day summary and analysis. Address the user directly. Consider:
1. Key themes, progress, and feelings expressed in the **USER entries** (<user_entry> tags) throughout the day.
2. Connections between the **USER entries** and ongoing quests/tasks.
3. Patterns in the **USER entries** compared to historical entries.
4. Notable shifts in focus, mood, or goals evident in the **USER entries**.
5. Actionable insights or recommendations for tomorrow based on the **user's day**.
Maintain your characteristic personality as ${personality.name}.`;

      console.log('✅ End-of-day prompt created (length):', prompt.length);
      return prompt;
    }
  };
