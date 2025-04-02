// File: hooks/useJournal.ts
import { useState, useEffect, useCallback } from 'react';
import { journalService, CheckupEntry, JournalEntry } from '@/services/journalService';
import { useQuestUpdate } from '@/contexts/QuestUpdateContext';
import { useAuth } from '@clerk/clerk-expo'; // Import useAuth from Clerk
import { useRouter } from 'expo-router';

export function useJournal() {
    const router = useRouter();
    const { userId } = useAuth(); // Get userId from Clerk
    const [currentDate, setCurrentDate] = useState(new Date());
    // State holds CheckupEntry arrays grouped by date string ('YYYY-MM-DD')
    const [entriesByDate, setEntriesByDate] = useState<Record<string, CheckupEntry[]>>({});
    // Add state for daily journal entry
    const [dailyEntry, setDailyEntry] = useState<JournalEntry | null>(null);
    const [localEntryText, setLocalEntryText] = useState<Record<string, string>>({}); // Tracks unsaved text per date
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { triggerUpdate } = useQuestUpdate();

    const formatDate = (date: Date): string => {
        return date.toISOString().split('T')[0];
    };

    // Fetches the daily journal entry for the current date
    const fetchDailyEntry = useCallback(async () => {
        // Use Clerk userId
        if (!userId) {
            setDailyEntry(null);
            return;
        }

        try {
            const dateStr = formatDate(currentDate);
            console.log('[useJournal] Fetching daily entry for user', userId, 'for', dateStr);

            const entry = await journalService.getEntry(dateStr, userId); // Use Clerk userId
            setDailyEntry(entry);
            console.log('[useJournal] Daily entry fetch result:', entry ? 'Found entry' : 'No entry found');
        } catch (err: any) {
            console.error("[useJournal] Error fetching daily entry:", { error: err, userId: userId }); // Use Clerk userId in log
            // Don't set error state here to avoid affecting the checkup flow
        }
    }, [userId, currentDate]); // Depend on Clerk userId

    // Fetches checkup entries for the current date and updates state
    const fetchRecentCheckups = useCallback(async () => {
        // Use Clerk userId
        if (!userId) {
            setEntriesByDate({}); // Clear entries if not logged in
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const dateStr = formatDate(currentDate);
            console.log('[useJournal] Fetching checkups for user', userId, 'for', dateStr);

            // Just fetch the current day's checkups
            const checkups = await journalService.getCheckupEntries(dateStr, userId); // Use Clerk userId
            console.log('[useJournal] Fetched checkup entries:', checkups.length);

            // Group checkups by date (in this case just one date)
            const groupedEntries: Record<string, CheckupEntry[]> = {
                [dateStr]: checkups.sort((a, b) =>
                    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                )
            };

            setEntriesByDate(groupedEntries);
            console.log('[useJournal] Updated entriesByDate state:', Object.keys(groupedEntries).length, 'dates');

            // Also fetch the daily entry when we fetch checkups
            await fetchDailyEntry();

        } catch (err: any) {
            const errorMessage = err?.message || "Failed to load journal entries";
            setError(errorMessage);
            console.error("[useJournal] Error in fetchRecentCheckups:", { error: err, userId: userId });
        } finally {
            setLoading(false);
        }
    }, [userId, currentDate, fetchDailyEntry]); // Depend on Clerk userId

    // Combined effect to load entries when userId changes or date changes
    useEffect(() => {
        console.log('[useJournal] User ID or date changed, fetching entries...');
        fetchRecentCheckups();
    }, [fetchRecentCheckups]); // fetchRecentCheckups includes both userId and currentDate dependencies

    // Selector function to get checkups for a specific date
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
        // Use Clerk userId
        if (!userId) throw new Error("Authentication required (Clerk)");

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
                userId, // Use Clerk userId
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
    }, [userId, getLocalEntryText, fetchRecentCheckups, triggerUpdate, updateLocalEntryText]); // Depend on Clerk userId


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

    // Function to directly set the current date
    const goToDate = (newDate: Date) => {
        const today = new Date();
        // Prevent going past today
        if (newDate <= today) {
            setCurrentDate(newDate);
        } else {
            setCurrentDate(today); // Or just don't update if future date is selected
        }
    };

    return {
        currentDate,
        localEntryText: getLocalEntryText(currentDate), // Provide text for the current date
        checkups: getCheckupsForDate(currentDate), // Provide checkups for the current date
        latestAiResponse: getLatestAiResponseForDate(currentDate), // Provide latest AI response for the current date
        dailyEntry, // Expose the daily entry to components
        updateLocalEntryText,
        saveCurrentCheckup, // Renamed from saveEntry for clarity
        goToPreviousDay,
        goToNextDay,
        goToDate, // Expose the new function
        loading,
        error,
        refreshEntries: fetchRecentCheckups, // Expose refresh function
    };
}
