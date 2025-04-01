# Current Task: Implement Voice-to-Text for Journal Checkups

**Objective:** Add a feature allowing users to record audio via a microphone button in the `JournalPanel` and have the transcribed text appended to the journal entry input.

**Status:** Planning complete, implementation in progress.

**Key Decisions & Changes:**
*   **UI:** `JournalPanel.tsx` has been updated with a microphone button and `expo-av` integration for recording.
*   **Agent:** `services/agents/TranscriptionAgent.ts` created to handle communication with the backend. Initially targeted Supabase, then Netlify, now **Cloudflare Workers**. Agent uses `fetch` and `FormData`.
*   **Backend:** Switched from Netlify Functions to **Cloudflare Workers** due to execution time limits. The worker will act as a secure proxy.
*   **Transcription Model:** Using OpenAI's **`gpt-4o-mini-transcribe`** model via the backend worker.
*   **API Key:** OpenAI API key will be stored securely as a secret in Cloudflare.

**Next Steps (Implementation):**
1.  Update `memory-bank/activeContext.md` and `memory-bank/techContext.md`.
2.  Remove obsolete Netlify function files (`netlify/functions/transcribe-audio`).
3.  Update `TranscriptionAgent.ts` endpoint URL if necessary (though relative path might still work with local dev proxy).
4.  Create the Cloudflare Worker (`workers/transcribe-audio/index.ts`).
5.  Guide user on Wrangler CLI setup/deployment and secret management.
