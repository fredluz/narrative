import React, { createContext, useContext, ReactNode } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase'; // Import the globally created client

// Define the shape of the context value
interface SupabaseContextType {
  supabase: SupabaseClient; // Client should not be null if imported directly
}

// Create the context. Provide the imported client as the default/initial value.
// Throw error immediately if supabase is somehow null (shouldn't happen).
if (!supabase) {
  throw new Error("Supabase client failed to initialize in lib/supabase.ts");
}
const SupabaseContext = createContext<SupabaseContextType>({ supabase });

// Define the props for the provider component
interface SupabaseProviderProps {
  children: ReactNode;
}

// Create the provider component
export const SupabaseProvider: React.FC<SupabaseProviderProps> = ({ children }) => {
  // The value provided by the context is just the Supabase client instance
  // imported from lib/supabase
  const value = { supabase };

  // Log provider rendering for debugging (optional)
  console.log(`[SupabaseContext] Rendering provider at ${new Date().toISOString()}`);

  return (
    <SupabaseContext.Provider value={value}>
      {children}
    </SupabaseContext.Provider>
  );
};

// Custom hook to easily consume the Supabase client instance
export const useSupabase = (): SupabaseClient => {
  const context = useContext(SupabaseContext);
  if (context === undefined) {
    // This error check remains valid
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  // Return only the client instance
  return context.supabase;
};
