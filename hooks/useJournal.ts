import { useState, useEffect, useCallback } from 'react';
import { journalService, JournalEntry } from '@/services/journalService';
import { useQuestUpdate } from '@/contexts/QuestUpdateContext';
import { useSupabase } from '@/contexts/SupabaseContext';

export function useJournal() {
  const { session } = useSupabase();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [entries, setEntries] = useState<Record<string, JournalEntry[]>>({});
  const [localEntries, setLocalEntries] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { triggerUpdate } = useQuestUpdate();
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };
  
  // Fetch entries for the last 7 days
  const fetchRecentEntries = useCallback(async () => {
    if (!session?.user?.id) {
      console.warn("Cannot fetch entries: User not logged in");
      setError("Please log in to view journal entries");
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const today = new Date();
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(today.getDate() - 6); // Fetch last 7 days
      
      const startDate = formatDate(sevenDaysAgo);
      const endDate = formatDate(today);
      
      console.log('Fetching entries for user', session.user.id, 'from', startDate, 'to', endDate);
      const journalEntries = await journalService.getEntries(startDate, endDate, session.user.id);
      console.log('Fetched entries:', journalEntries);
      
      // Convert to our local format, organized by date
      const entriesRecord: Record<string, JournalEntry[]> = {};
      journalEntries.forEach((entry: JournalEntry) => {
        if (entry.date) {
          if (!entriesRecord[entry.date]) {
            entriesRecord[entry.date] = [];
          }
          entriesRecord[entry.date].push(entry);
        }
      });
      
      setEntries(entriesRecord);
      console.log('Updated entries state:', entriesRecord);
      
    } catch (err: any) {
      const errorMessage = err?.message || "Failed to load journal entries";
      setError(errorMessage);
      console.error("Error in fetchRecentEntries:", { error: err, userId: session.user.id });
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  // Load entries whenever currentDate changes
  useEffect(() => {
    console.log('Current date changed to', formatDate(currentDate), '- refreshing entries');
    fetchRecentEntries();
  }, [currentDate]);

  const getEntry = useCallback((date: Date): JournalEntry | null => {
    const dateStr = formatDate(date);
    const dateEntries = entries[dateStr] || [];
    
    // Return the latest entry for the date
    return dateEntries.length > 0 ? dateEntries[dateEntries.length - 1] : null;
  }, [entries]);

  const getAiResponses = useCallback((date: Date): { response: string | null; analysis: string | null } => {
    const entry = getEntry(date);
    return {
      response: entry?.ai_response || null,
      analysis: entry?.ai_analysis || null
    };
  }, [getEntry]);

  // Update local entry text without saving to database
  const updateLocalEntry = useCallback((date: Date, content: string) => {
    const dateStr = formatDate(date);
    setLocalEntries(prev => ({
      ...prev,
      [dateStr]: content
    }));
  }, []);

  // Save entry to the database
  const saveEntry = useCallback(async (date: Date, content: string, tags: string[] = []) => {
    if (!session?.user?.id) {
      console.warn("Cannot save entry: User not logged in");
      throw new Error("Please log in to save journal entries");
    }

    const dateStr = formatDate(date);
    setLoading(true);
    try {
      // Save the checkup entry with user ID
      const savedEntry = await journalService.saveCheckupEntry(
        dateStr, 
        content, 
        session.user.id,
        tags
      );
      
      // Refresh entries to get the latest data
      await fetchRecentEntries();
      
      // Update local state
      setLocalEntries(prev => ({
        ...prev,
        [dateStr]: content
      }));
      
      // Trigger app-wide update notification
      triggerUpdate();
      
      return savedEntry;
    } catch (err: any) {
      const errorMessage = err?.message || "Failed to update journal entry";
      setError(errorMessage);
      console.error("Error in saveEntry:", { error: err, userId: session.user.id });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchRecentEntries, triggerUpdate, session?.user?.id]);

  const goToPreviousDay = () => {
    const prevDay = new Date(currentDate);
    prevDay.setDate(prevDay.getDate() - 1);
    setCurrentDate(prevDay);
  };

  const goToNextDay = () => {
    const nextDay = new Date(currentDate);
    nextDay.setDate(nextDay.getDate() + 1);
    // Don't allow going past today
    const today = new Date();
    if (nextDay <= today) {
      setCurrentDate(nextDay);
    }
  };

  return {
    currentDate,
    getEntry,
    getAiResponses,
    updateLocalEntry,
    saveEntry,
    goToPreviousDay,
    goToNextDay,
    loading,
    error,
    refreshEntries: fetchRecentEntries,
    aiResponse,
    aiAnalysis
  };
}
