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
      
      console.log('Fetching entries from', startDate, 'to', endDate);
      const journalEntries = await journalService.getEntries(startDate, endDate);
      console.log('Fetched entries:', journalEntries);
      
      // Convert to our local format
      const entriesRecord: Record<string, JournalEntry> = {};
      journalEntries.forEach((entry: JournalEntry) => {
        if (entry.date) {
          console.log(`Adding entry for date ${entry.date} to local records:`, entry);
          entriesRecord[entry.date] = entry;
        }
      });
      
      setEntries(entriesRecord);
      console.log('Updated entries state:', entriesRecord);
      
      // Keep any unsaved changes in localEntries
      const todayString = formatDate(today);
      if (!entriesRecord[todayString] && !localEntries[todayString]) {
        console.log(`No entry found for today (${todayString}), creating empty local entry`);
        setLocalEntries(prev => ({
          ...prev,
          [todayString]: ''
        }));
      }
      
      // Check if current date entry exists but has no local counterpart
      const currentDateStr = formatDate(currentDate);
      if (entriesRecord[currentDateStr] && localEntries[currentDateStr] === undefined) {
        console.log(`Found entry for current date ${currentDateStr} but no local entry, initializing local state`);
        // This is important - initialize local entry with the database value
        setLocalEntries(prev => ({
          ...prev,
          [currentDateStr]: entriesRecord[currentDateStr].user_entry || ''
        }));
      }
    } catch (err: any) {
      const errorMessage = err?.message || "Failed to load journal entries";
      setError(errorMessage);
      console.error("Error in fetchRecentEntries:", err);
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  // Load entries whenever currentDate changes
  useEffect(() => {
    console.log('Current date changed to', formatDate(currentDate), '- refreshing entries');
    fetchRecentEntries();
  }, [fetchRecentEntries, currentDate]);

  const getEntry = useCallback((date: Date) => {
    const dateStr = formatDate(date);
    
    // First check local entries (for unsaved changes)
    if (localEntries[dateStr] !== undefined) {
      console.log('Returning local entry for', dateStr, 'length:', localEntries[dateStr]?.length || 0);
      return localEntries[dateStr];
    }
    
    // Then check saved entries
    const entry = entries[dateStr];
    console.log('Returning saved entry for', dateStr, 'exists:', !!entry, 'length:', entry?.user_entry?.length || 0);
    return entry ? entry.user_entry : '';
  }, [entries, localEntries]);

  const getAiAnalysis = useCallback((date: Date) => {
    const dateStr = formatDate(date);
    const entry = entries[dateStr];
    return entry ? entry.ai_analysis : '';
  }, [entries]);

  // Update local entry text without saving to database
  const updateLocalEntry = useCallback((date: Date, text: string) => {
    const dateStr = formatDate(date);
    setLocalEntries(prev => ({
      ...prev,
      [dateStr]: text
    }));
  }, []);

  // Save entry to the database
  const saveEntry = async (date: Date) => {
    const dateStr = formatDate(date);
    let text = localEntries[dateStr];
    
    try {
      setLoading(true);
      setError(null);
      console.log(`Attempting to save entry for ${dateStr} with content:`, text);
      
      const savedEntry = await journalService.saveEntry(dateStr, text || '');
      console.log('Successfully saved entry:', savedEntry);
      
      // Update entries with the saved entry
      setEntries(prev => ({
        ...prev,
        [dateStr]: savedEntry
      }));
      
      // Don't clear local entries - keep the current text
      setLocalEntries(prev => ({
        ...prev,
        [dateStr]: text || ''
      }));
      
      // Trigger app-wide update notification
      triggerUpdate();
      
    } catch (err: any) {
      const errorMessage = err?.message || "Failed to update journal entry";
      setError(errorMessage);
      console.error("Error in saveEntry:", err);
      throw err; // Re-throw to handle in component
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
    refreshEntries: fetchRecentEntries
  };
}
