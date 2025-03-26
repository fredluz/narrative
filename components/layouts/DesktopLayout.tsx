// components/layouts/DesktopLayout.tsx
import React, { useEffect, useCallback } from 'react'; // Added useCallback
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { KanbanBoard } from '@/components/quests/KanbanBoard';
import { TaskList } from '@/components/tasks/TaskList';
import { PersonalityButton } from '@/components/ui/PersonalityButton';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { useQuests } from '@/services/questsService';
// import { useSuggestions } from '@/contexts/SuggestionContext'; // Uncomment if needed later
import styles from '@/app/styles/global';
import { colors } from '@/app/styles/global';
import { SettingsButton } from '@/components/ui/SettingsButton';
import { useChatData } from '@/hooks/useChatData';
import { useQuestUpdate } from '@/contexts/QuestUpdateContext';
import { JournalPanel } from '@/components/journal/JournalPanel';
import { useSupabase } from '@/contexts/SupabaseContext'; // Use refined context
import TriangularSpinner from '../loading/TriangularSpinner';
import { useTasks } from '@/services/tasksService'; // Import useTasks
import { useJournal } from '@/hooks/useJournal'; // Import useJournal

export function DesktopLayout() {
  // 1. Get Auth state FIRST (using the renamed isLoading from context)
  const { session, isLoading: isAuthLoading } = useSupabase();
  const router = useRouter();
  const { themeColor, secondaryColor, textColor } = useTheme();

  // 2. Get Feature Hooks (they will guard themselves internally based on auth state)
  const { mainQuest, loading: questsLoading, error: questsError, reload: reloadQuests } = useQuests();
  const { tasks, loading: tasksLoading, error: tasksError, reload: reloadTasks } = useTasks();
  const {
      messages, sendMessage, handleTyping, endSession, isTyping, deleteCurrentMessages,
      sessionEnded, checkupCreated, error: chatError, authenticated // Get authenticated state from hook
  } = useChatData();
  const {
      currentDate, // Get necessary state
      loading: journalLoading, error: journalError, refreshEntries: reloadJournal
  } = useJournal();

  // 3. Combine Feature Data Loading States (exclude isAuthLoading here)
  const isDataLoading = questsLoading || tasksLoading || journalLoading;

  // 4. Combine Feature Errors
  const combinedError = questsError || tasksError || chatError || journalError;

  // Other context hooks
  const { shouldUpdate, resetUpdate } = useQuestUpdate();
  // const { taskSuggestions, questSuggestions } = useSuggestions(); // Uncomment if needed

  // --- Helper Functions ---
  // Utility for bright text (can be moved to utils later)
  const getBrightAccent = useCallback((baseColor: string) => {
    // ... (implementation from previous answer) ...
     const hex = baseColor.replace('#', '');
     const r = parseInt(hex.substring(0, 2), 16);
     const g = parseInt(hex.substring(2, 4), 16);
     const b = parseInt(hex.substring(4, 6), 16);
     if (r + g + b > 500) return '#FFFFFF';
     const brightR = Math.min(255, r + 100);
     const brightG = Math.min(255, g + 100);
     const brightB = Math.min(255, b + 100);
     return `#${brightR.toString(16).padStart(2, '0')}${brightG.toString(16).padStart(2, '0')}${brightB.toString(16).padStart(2, '0')}`;
  }, []); // Empty dependency array if it doesn't rely on component state

  // Reload all data function - GUARDED
  const reloadAllData = useCallback(() => {
      // Use the session state directly for the guard
      if (!isAuthLoading && session?.user?.id) {
          console.log("[DesktopLayout] Reloading all feature data...");
          reloadQuests();
          reloadTasks();
          reloadJournal();
          // Chat data might auto-reload via its hook or subscriptions
      } else {
          console.log("[DesktopLayout] Skipping reload - auth not ready or no session.");
      }
  }, [isAuthLoading, session?.user?.id, reloadQuests, reloadTasks, reloadJournal]);

  // --- Effects ---
  // Effect for Quest Updates - GUARDED
  useEffect(() => {
    // Check initial auth loading AND session existence
    if (!isAuthLoading && session?.user?.id && shouldUpdate) {
      console.log('[DesktopLayout] Quest update triggered, reloading quests and tasks.');
      reloadQuests();
      reloadTasks(); // Also reload tasks
      resetUpdate();
    }
  }, [isAuthLoading, session?.user?.id, shouldUpdate, reloadQuests, reloadTasks, resetUpdate]);

  // --- Render Logic ---

  // A. Render Initial Auth Loading State
  if (isAuthLoading) {
    console.log("[DesktopLayout] Rendering: Initial Auth Loading State");
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }]}>
        <TriangularSpinner size={50} color={themeColor} />
        <Text style={{ color: themeColor, marginTop: 15, fontSize: 16 }}>Initializing...</Text>
      </View>
    );
  }

  // B. Render Logged Out State (Auth is confirmed, but no session)
  if (!session?.user?.id) {
    console.log("[DesktopLayout] Rendering: Logged Out State");
    // AuthGuard should have redirected, but this provides UI feedback if needed.
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textMuted, fontSize: 18 }}>Please log in.</Text>
         <TouchableOpacity onPress={() => router.replace('/auth')} style={{ marginTop: 20, padding: 10, backgroundColor: themeColor, borderRadius: 5 }}>
             <Text style={{ color: textColor }}>Go to Login</Text>
         </TouchableOpacity>
      </View>
    );
  }

  // --- At this point, we know auth is NOT loading AND session exists ---
  const userId = session.user.id; // Safe to get userId

  // C. Render Data Loading State (Auth confirmed, loading feature data)
  if (isDataLoading) {
    console.log("[DesktopLayout] Rendering: Data Loading State");
     return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }]}>
        <TriangularSpinner size={50} color={themeColor} />
        <Text style={{ color: themeColor, marginTop: 15, fontSize: 16 }}>Loading Dashboard...</Text>
      </View>
     );
  }

  // D. Render Error State (Auth confirmed, but a feature hook reported an error)
  if (combinedError) {
     console.log("[DesktopLayout] Rendering: Error State");
     return (
         <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: colors.background }]}>
             <Text style={[styles.errorText, { color: colors.error, fontSize: 18, marginBottom: 20 }]}>Error loading dashboard:</Text>
             <Text style={{ color: colors.textMuted, marginBottom: 30, textAlign: 'center' }}>{combinedError}</Text>
             <TouchableOpacity onPress={reloadAllData} style={{ paddingVertical: 10, paddingHorizontal: 20, backgroundColor: themeColor, borderRadius: 5 }}>
                 <Text style={{ color: textColor, fontWeight: 'bold' }}>Try Again</Text>
             </TouchableOpacity>
         </View>
     );
  }

  // E. Render Main Content (Auth ready, User confirmed, Data ready)
  console.log("[DesktopLayout] Rendering: Main Content");
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Column 1: Quests & Tasks */}
      <View style={styles.column}>
        <KanbanBoard
            mainQuest={mainQuest}
            onViewAllQuests={() => router.push('/quests')}
            userId={userId} // Pass confirmed userId
        />
        <TaskList compactMode={true} userId={userId} />
      </View>

      {/* Column 2: Chat */}
      <View style={styles.column}>
        <ChatInterface
          // Pass all relevant state and handlers
          recentMessages={messages}
          onSendMessage={sendMessage}
          handleTyping={handleTyping}
          onEndSession={endSession}
          isTyping={isTyping}
          sessionEnded={sessionEnded}
          onDeleteMessages={deleteCurrentMessages}
          checkupCreated={checkupCreated}
          userId={userId} // Pass confirmed userId
        />
      </View>

      {/* Column 3: Journal */}
      <View style={[styles.column, { position: 'relative' }]}>
        <JournalPanel
          themeColor={themeColor}
          textColor={textColor}
          fullColumnMode={true}
          userId={userId} // Pass confirmed userId
          // showAnalysis might be needed
        />
      </View>
      <PersonalityButton />
      <SettingsButton />
    </View>
  );
}