# Current Task: Implement Voice Input for Quest Creation

## Goal
Integrate voice transcription into the "Create Quest" modal (`components/modals/CreateQuestModal.tsx`). Allow users to dictate their thoughts, transcribe the audio, and use an LLM via `QuestAgent` to generate the quest name and description based on the transcript and the user's selected personality.

## Current Progress (April 18, 2025)
### Completed Tasks:
- ✅ Phase 1 (Frontend Modifications):
  - Added imports (useState, useRef, useEffect, Audio from expo-av, etc.)
  - Implemented state variables for voice input mode, recording status
  - Created UI components for mode switching (manual/voice)
  - Implemented recording functionality (start/stop recording, permissions)
  - Added transcription processing logic
  - Implemented error handling and UI feedback
  - Added cleanup effect for proper resource management

- ✅ Phase 2 (Backend Modifications):
  - Added GeneratedQuestData interface to QuestAgent.ts
  - Implemented generateQuestFromVoiceInput method in QuestAgent
  - Set up DeepSeek API integration for quest generation
  - Added error handling and response validation

### In Progress:
- Testing the end-to-end flow (Phase 3)

### Next Steps:
- Complete Phase 3 testing
- Adjust the personality integration when required

## Implementation Plan

### Phase 1: Frontend Modifications (`components/modals/CreateQuestModal.tsx`)

*   **Issue 1.1: Add Imports**
    *   React Hooks: `useState`, `useRef`, `useCallback`, `useEffect`.
    *   React Native Components: `TouchableOpacity`, `ActivityIndicator`, `Alert`, `View`, `Text`.
    *   Expo AV: `import { Audio } from 'expo-av';`
    *   Icons: `import { MaterialIcons } from '@expo/vector-icons';`
    *   Agents:
        *   `import { transcriptionAgent } from '@/services/agents/TranscriptionAgent';`
        *   `import { questAgent } from '@/services/agents/QuestAgent';` 
    *   Contexts/Hooks:
        *   `import { usePersonality } from '@/contexts/PersonalityContext';` (Or actual method for getting personality ID).
        *   `import { useTheme } from '@/contexts/ThemeContext';`

*   **Issue 1.2: Add State Variables**
    *   `inputMode`: `'manual' | 'voice'`, default `'manual'`.
    *   `recordingStatus`: `'idle' | 'recording' | 'transcribing' | 'processing'`, default `'idle'`.
    *   `audioUri`: `string | null`, default `null`.
    *   `recordingInstanceRef`: `useRef<Audio.Recording | null>(null)`.
    *   `transcriptionDisplay`: `string`, default `''` (Optional: for showing transcript).
    *   `generationError`: `string | null`, default `null`.
    *   Get `themeColor`, `secondaryColor` from `useTheme()`.
    *   Get `currentPersonalityId` (or equivalent) from personality context/hook.

*   **Issue 1.3: Implement UI Changes**
    *   **Mode Switcher:** Add "Manual Input" / "Voice Input" buttons. Style active button. `onPress` updates `inputMode` state and clears `generationError`.
    *   **Conditional Views:**
        *   Render existing form (`TextInput`s, etc.) only when `inputMode === 'manual'`.
        *   Render a new view only when `inputMode === 'voice'`. This view contains:
            *   Microphone `TouchableOpacity` (Icon changes based on `recordingStatus`, disabled when transcribing/processing).
            *   `ActivityIndicator` (Visible when transcribing/processing).
            *   Optional `<Text>` for `transcriptionDisplay`.
            *   `<Text>` for `generationError` display.

*   **Issue 1.4: Implement Audio Functions (`requestPermissions`, `startRecording`)**
    *   Copy `requestPermissions` from `JournalPanel.tsx`.
    *   Copy/Adapt `startRecording` from `JournalPanel.tsx`. Set `recordingStatus` to `'recording'`, clear errors (`generationError`, `transcriptionDisplay`).

*   **Issue 1.5: Implement `stopRecordingAndTranscribe` Function**
    *   Stops recording using `recordingInstanceRef`.
    *   Sets `recordingStatus` to `'transcribing'`.
    *   Gets audio URI.
    *   Calls `transcriptionAgent.requestTranscription(uri)`.
    *   On success: Sets `transcriptionDisplay` (optional), sets `recordingStatus` to `'processing'`, calls `handleGenerateQuest(transcript)`.
    *   On failure: Shows `Alert`, sets `recordingStatus` to `'idle'`.

*   **Issue 1.6: Implement `handleGenerateQuest` Function**
    *   `async function handleGenerateQuest(transcript: string)`
    *   Get `currentPersonalityId`. Handle case where it's missing.
    *   Clear `generationError`.
    *   Call `await questAgent.generateQuestFromVoiceInput(transcript, personalityId)`.
    *   On success:
        *   Update modal state (`setQuestName`, `setDescription`) with `generatedData.name`, `generatedData.description`.
        *   Set `inputMode` to `'manual'`.
        *   Clear `transcriptionDisplay`.
    *   On failure: Set `generationError` with the error message.
    *   `finally`: Set `recordingStatus` to `'idle'`.

*   **Issue 1.7: Add `useEffect` Cleanup**
    *   Implement `useEffect(() => { return () => { /* cleanup logic */ }; }, []);` to stop and unload recording if the modal is closed mid-recording.

*   **Issue 1.8: Verify Existing Save Logic**
    *   Ensure the modal's original save button/function (`handleSaveQuest` or similar) correctly uses the `questName` and `description` state, which will now be populated either manually or via voice generation.

### Phase 2: Backend Modifications (`services/agents/QuestAgent.ts`)

*   **Issue 2.1: Add Imports**
    *   LLM client instance (e.g., `openai` configured for DeepSeek).
    *   `personalityService` from '@/services/personalityService'.
    *   Relevant types (e.g., `Quest`).

*   **Issue 2.2: Define `GeneratedQuestData` Interface**
    *   `interface GeneratedQuestData { name: string; description: string; }`

*   **Issue 2.3: Implement `generateQuestFromVoiceInput` Method**
    *   `async generateQuestFromVoiceInput(transcript: string, personalityId: string): Promise<GeneratedQuestData | null>`
    *   Get personality prompt using `personalityService.getPersonalityPrompt(personalityId)`. Handle errors.
    *   Construct system and user prompts for the LLM. **(Requires final user prompt)**. System prompt should instruct the LLM to act according to personality guidelines and output ONLY a JSON object `{"name": "...", "description": "..."}`.
    *   Call LLM API (e.g., `openai.chat.completions.create`) with prompts, specifying `response_format: { type: 'json_object' }`.
    *   Parse and validate the JSON response content. Check for required `name` and `description` fields (strings). Handle parsing errors, potentially trying to extract from markdown code blocks.
    *   Return the validated `{ name, description }` object or throw an error with a descriptive message.

*   **Issue 2.4: Verify `personalityService` Dependency**
    *   Ensure `services/personalityService.ts` has a method like `getPersonalityPrompt(id)` that returns the necessary prompt details.

*   **Issue 2.5: Ensure Singleton Export**
    *   Make sure `QuestAgent` is exported as a singleton instance named `questAgent`.

### Phase 3: Testing

*   **Issue 3.1: Test Manual Input Mode**
    *   Verify creating a quest manually still functions correctly.
*   **Issue 3.2: Test Voice Input Mode**
    *   Verify permissions request flow.
    *   Verify UI feedback during recording, transcribing, and processing states.
    *   Test successful transcription and quest generation (check populated fields, switch to manual mode).
    *   Test transcription error handling (e.g., network error to worker, worker error response).
    *   Test LLM generation error handling (e.g., invalid response format, API error).
    *   Verify saving the quest after successful voice generation works.
