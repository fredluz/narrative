import { useState, useEffect, useCallback } from 'react';
import { journalService, JournalEntry } from '@/services/journalService';
import { useQuestUpdate } from '@/contexts/QuestUpdateContext';

export function useJournal() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [entries, setEntries] = useState<Record<string, JournalEntry>>({});
  const [localEntries, setLocalEntries] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { triggerUpdate } = useQuestUpdate();

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };
  
  // Fetch entries for the last 7 days
  const fetchRecentEntries = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const today = new Date();
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(today.getDate() - 6); // Fetch last 7 days
      
      const startDate = formatDate(sevenDaysAgo);
      const endDate = formatDate(today);
      
      const journalEntries = await journalService.getEntries(startDate, endDate);
      
      // Convert to our local format
      const entriesRecord: Record<string, JournalEntry> = {};
      const localEntriesRecord: Record<string, string> = {};
      
      journalEntries.forEach((entry: JournalEntry) => {
        if (entry.date) {
          entriesRecord[entry.date] = entry;
          localEntriesRecord[entry.date] = entry.user_entry;
        }
      });
      
      setEntries(entriesRecord);
      setLocalEntries(localEntriesRecord);
    } catch (err: any) {
      const errorMessage = err?.message || "Failed to load journal entries";
      setError(errorMessage);
      console.error("Error in fetchRecentEntries:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load entries when component mounts
  useEffect(() => {
    fetchRecentEntries();
  }, [fetchRecentEntries]);

  const getEntry = (date: Date) => {
    const dateStr = formatDate(date);
    // First check local entries (for unsaved changes)
    if (localEntries[dateStr] !== undefined) {
      return localEntries[dateStr];
    }
    // Then check saved entries
    const entry = entries[dateStr];
    return entry ? entry.user_entry : '';
  };

  const getAiAnalysis = (date: Date) => {
    const dateStr = formatDate(date);
    const entry = entries[dateStr];
    return entry ? entry.ai_analysis : '';
  };

  // Update local entry text without saving to database
  const updateLocalEntry = (date: Date, text: string) => {
    const dateStr = formatDate(date);
    setLocalEntries(prev => ({
      ...prev,
      [dateStr]: text
    }));
  };

  // Save entry to the database
  const saveEntry = async (date: Date) => {
    const dateStr = formatDate(date);
    const text = localEntries[dateStr] || '';
    
    try {
      setLoading(true);
      setError(null); // Clear any previous errors
      console.log(`Attempting to save entry for ${dateStr} with content length: ${text.length}`);
      
      const savedEntry = await journalService.saveEntry(dateStr, text);
      
      // If the entry doesn't have an AI analysis yet, generate one
      if (!savedEntry.ai_analysis && text.trim()) {
        const aiAnalysis = await journalService.generateAnalysis(savedEntry.id, text);
        savedEntry.ai_analysis = aiAnalysis;
      }
      
      setEntries(prev => ({
        ...prev,
        [dateStr]: savedEntry
      }));
      
      // Trigger app-wide update notification
      triggerUpdate();
      console.log(`Successfully saved entry for ${dateStr}`);
    } catch (err: any) {
      const errorMessage = err?.message || "Failed to update journal entry";
      setError(errorMessage);
      console.error("Error in saveEntry:", err);
    } finally {
      setLoading(false);
    }
  };

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

  const refreshEntries = () => {
    fetchRecentEntries();
  };

  return {
    currentDate,
    getEntry,
    getAiAnalysis,
    updateLocalEntry,
    saveEntry,
    goToPreviousDay,
    goToNextDay,
    loading,
    error,
    refreshEntries
  };
}
