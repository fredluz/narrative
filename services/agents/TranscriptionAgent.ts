import * as FileSystem from 'expo-file-system';

// Define the expected response structure from the Netlify Function
interface TranscriptionResponse {
  transcription?: string;
  error?: string;
}

// Define the Cloudflare Worker endpoint URL
const CLOUDFLARE_WORKER_ENDPOINT = 'https://transcribe-audio.fredericorodrigues2000.workers.dev';

class TranscriptionAgent {
  /**
   * Sends an audio file URI to the backend Netlify Function for transcription.
   * @param audioUri The local URI of the recorded audio file.
   * @returns The transcribed text.
   * @throws An error if transcription fails.
   */
  async requestTranscription(audioUri: string): Promise<string> {

    if (!audioUri) {
      throw new Error('Audio URI is required for transcription.');
    }

    try {
      // 1. Prepare FormData
      const formData = new FormData();

      // Extract filename and determine MIME type
      const filename = audioUri.split('/').pop() || 'audio.m4a'; // Default filename
      // Attempt to infer MIME type, default to 'audio/m4a' as expo-av often uses this
      let mimeType = 'audio/m4a';
      if (filename.endsWith('.mp3')) mimeType = 'audio/mpeg';
      else if (filename.endsWith('.wav')) mimeType = 'audio/wav';
      // Add more types if needed based on expo-av output format

      // --- Web-specific handling for blob URI ---
      console.log('[TranscriptionAgent] Fetching blob data for URI:', audioUri);
      const blobResponse = await fetch(audioUri);
      if (!blobResponse.ok) {
        throw new Error(`Failed to fetch blob data: ${blobResponse.statusText}`);
      }
      const audioBlob = await blobResponse.blob();
      console.log('[TranscriptionAgent] Blob fetched, size:', audioBlob.size, 'type:', audioBlob.type);

      // Ensure the MIME type from the blob is used if available, otherwise fallback
      const finalMimeType = audioBlob.type && audioBlob.type !== 'application/octet-stream' ? audioBlob.type : mimeType;

      // Create a File object from the Blob
      const audioFile = new File([audioBlob], filename, { type: finalMimeType });

      // Append the actual File object
      formData.append('file', audioFile);
      // --- End web-specific handling ---

      console.log('[TranscriptionAgent] Sending FormData with File object to:', CLOUDFLARE_WORKER_ENDPOINT);

      // 2. Call the Cloudflare Worker using fetch
      const response = await fetch(CLOUDFLARE_WORKER_ENDPOINT, {
        method: 'POST',
        body: formData,
        // FormData sets the Content-Type header automatically, including the boundary
      });

      console.log('[TranscriptionAgent] Response status:', response.status);

      // 3. Handle the response
      if (!response.ok) {
        let errorBody = 'Unknown error';
        try {
          // Try to parse error details from the response body
          const errorData = await response.json();
          errorBody = errorData?.error || errorData?.message || JSON.stringify(errorData);
        } catch (parseError) {
          // If parsing fails, use the status text
          errorBody = response.statusText;
        }
        console.error('[TranscriptionAgent] Cloudflare worker error response:', errorBody);
        throw new Error(`Transcription failed (${response.status}): ${errorBody}`);
      }

      const data: TranscriptionResponse = await response.json();

      if (data.error) {
        console.error('[TranscriptionAgent] Transcription service error from function:', data.error);
        throw new Error(`Transcription failed: ${data.error}`);
      }

      if (!data.transcription) {
        console.error('[TranscriptionAgent] No transcript received in response data.');
        throw new Error('Transcription failed: No transcript returned.');
      }

      console.log('[TranscriptionAgent] Transcription successful.');
      return data.transcription;

    } catch (err: any) {
      console.error('[TranscriptionAgent] Error during transcription request:', err);
      // Re-throw a more specific error or the original error
      throw new Error(`Failed to get transcription: ${err.message || err}`);
    }
  }
}

// Export a singleton instance
export const transcriptionAgent = new TranscriptionAgent();
