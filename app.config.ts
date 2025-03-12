import {config} from 'dotenv';

config({path: '.env.local'});

export default {
  expo: {
    name: "QuestLog",
    slug: "questlog",
    version: "1.0.0",
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      deepseekApiKey: process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY,
    },
  },
};