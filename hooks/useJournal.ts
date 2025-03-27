// File: hooks/useJournal.ts
import { useState, useEffect, useCallback } from 'react';
import { journalService, CheckupEntry, JournalEntry } from '@/services/journalService';
import { useQuestUpdate } from '@/contexts/QuestUpdateContext';
import { useSupabase } from '@/contexts/SupabaseContext';
import { useRouter } from 'expo-router';

export function useJournal() {
    const router = useRouter();
    const { session } = useSupabase();
    const [currentDate, setCurrentDate] = useState(new Date());
    // State holds CheckupEntry arrays grouped by date string ('YYYY-MM-DD')
    const [entriesByDate, setEntriesByDate] = useState<Record<string, CheckupEntry[]>>({});
    const [localEntryText, setLocalEntryText] = useState<Record<string, string>>({}); // Tracks unsaved text per date
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { triggerUpdate } = useQuestUpdate();

    const formatDate = (date: Date): string => {
        return date.toISOString().split('T')[0];
    };

    // Fetches checkup entries for the current date and updates state
    const fetchRecentCheckups = useCallback(async () => {
        if (!session?.user?.id) {
            setEntriesByDate({}); // Clear entries if not logged in
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const dateStr = formatDate(currentDate);
            console.log('[useJournal] Fetching checkups for user', session.user.id, 'for', dateStr);
            
            // Just fetch the current day's checkups
            const checkups = await journalService.getCheckupEntries(dateStr, session.user.id);
            console.log('[useJournal] Fetched checkup entries:', checkups.length);

            // Group checkups by date (in this case just one date)
            const groupedEntries: Record<string, CheckupEntry[]> = {
                [dateStr]: checkups.sort((a, b) => 
                    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                )
            };

            setEntriesByDate(groupedEntries);
            console.log('[useJournal] Updated entriesByDate state:', Object.keys(groupedEntries).length, 'dates');

        } catch (err: any) {
            const errorMessage = err?.message || "Failed to load journal entries";
            setError(errorMessage);
            console.error("[useJournal] Error in fetchRecentCheckups:", { error: err, userId: session.user.id });
        } finally {
            setLoading(false);
        }
    }, [session?.user?.id, currentDate]); // Added currentDate as dependency

    // Load entries initially and when session changes
    useEffect(() => {
      fetchRecentCheckups();
    }, [fetchRecentCheckups]); // fetchRecentCheckups includes session?.user?.id dependency

    // Refetch when currentDate changes
    useEffect(() => {
      // This might refetch the whole week range, consider fetching only the specific day if performance is an issue
      console.log('[useJournal] Current date changed, refetching...');
      fetchRecentCheckups();
    }, [currentDate, fetchRecentCheckups]);

    // <<< NEW: Selector function to get checkups for a specific date >>>
    const getCheckupsForDate = useCallback((date: Date): CheckupEntry[] => {
        const dateStr = formatDate(date);
        return entriesByDate[dateStr] || []; // Return empty array if no entries for date
    }, [entriesByDate]);

    // Gets the AI response from the *latest* checkup for a given date
    const getLatestAiResponseForDate = useCallback((date: Date): string | null => {
        const checkups = getCheckupsForDate(date);
        if (checkups.length > 0) {
            return checkups[checkups.length - 1].ai_checkup_response || null;
        }
        return null;
    }, [getCheckupsForDate]);

    // Update local unsaved entry text for the current date
    const updateLocalEntryText = useCallback((date: Date, content: string) => {
        const dateStr = formatDate(date);
        setLocalEntryText(prev => ({
            ...prev,
            [dateStr]: content
        }));
    }, []);

    // Get local unsaved entry text for the current date
    const getLocalEntryText = useCallback((date: Date): string => {
        const dateStr = formatDate(date);
        return localEntryText[dateStr] || '';
    }, [localEntryText]);


    // Saves the current local text as a new CheckupEntry
    const saveCurrentCheckup = useCallback(async (date: Date, tags: string[] = []) => {
        if (!session?.user?.id) throw new Error("Authentication required");

        const dateStr = formatDate(date);
        const contentToSave = getLocalEntryText(date); // Get text from state

        if (!contentToSave.trim()) {
            console.warn("[useJournal] No content to save for checkup.");
            return; // Don't save empty checkups
        }

        setLoading(true);
        try {
            console.log(`[useJournal] Saving checkup for ${dateStr}...`);
            const savedEntry = await journalService.saveCheckupEntry(
                dateStr,
                contentToSave,
                session.user.id,
                tags
            );
            console.log(`[useJournal] Checkup saved (ID: ${savedEntry.id}). Refreshing entries...`);

            // Clear the local text for the saved date
            updateLocalEntryText(date, '');

            // Refresh the list of checkups
            await fetchRecentCheckups();

            triggerUpdate(); // Notify other parts of the app if needed
            return savedEntry;
        } catch (err: any) {
            const errorMessage = err?.message || "Failed to save checkup entry";
            setError(errorMessage);
            console.error("[useJournal] Error in saveCurrentCheckup:", { error: err, date: dateStr });
            throw err; // Re-throw for the component to handle if needed
        } finally {
            setLoading(false);
        }
    }, [session?.user?.id, getLocalEntryText, fetchRecentCheckups, triggerUpdate, updateLocalEntryText]);


    const goToPreviousDay = () => {
        setCurrentDate(prevDate => {
            const newDate = new Date(prevDate);
            newDate.setDate(newDate.getDate() - 1);
            return newDate;
        });
    };

    const goToNextDay = () => {
       setCurrentDate(prevDate => {
            const newDate = new Date(prevDate);
            newDate.setDate(newDate.getDate() + 1);
            const today = new Date();
            // Prevent going past today
            return newDate <= today ? newDate : prevDate;
       });
    };

    return {
        currentDate,
        localEntryText: getLocalEntryText(currentDate), // Provide text for the current date
        checkups: getCheckupsForDate(currentDate), // Provide checkups for the current date
        latestAiResponse: getLatestAiResponseForDate(currentDate), // Provide latest AI response for the current date
        updateLocalEntryText,
        saveCurrentCheckup, // Renamed from saveEntry for clarity
        goToPreviousDay,
        goToNextDay,
        loading,
        error,
        refreshEntries: fetchRecentCheckups, // Expose refresh function
        // getEntry and getAiResponses might be less needed now
    };
}