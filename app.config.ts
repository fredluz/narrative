import {config} from 'dotenv';

config({path: '.env.local'});

export default {
  expo: {
    name: "Narrative",
    slug: "questlog",
    version: "1.0.0",
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      deepseekApiKey: process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY,
      openAiApiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
      openAiApiUrl: process.env.EXPO_PUBLIC_OPENAI_API_URL,
      geminiApiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY,
      "eas": {
        "projectId": "0fb7b7f1-a6a7-4fb2-a8b1-7de0674dfb7f",
    },
  },
}
};