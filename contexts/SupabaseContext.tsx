import React, { createContext, useContext, ReactNode } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase'; // Ensure this path is correct

// Define the shape of the context value
interface SupabaseContextType {
  supabase: SupabaseClient;
}

// Create the context with an undefined initial value
const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined);

// Define the props for the provider component
interface SupabaseProviderProps {
  children: ReactNode;
}

// Create the provider component
export const SupabaseProvider: React.FC<SupabaseProviderProps> = ({ children }) => {
  // The value provided by the context is just the Supabase client instance
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
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  // Return only the client instance
  return context.supabase;
};
