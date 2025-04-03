// components/layouts/DesktopLayout.tsx
import React, { useEffect, useRef, useCallback } from 'react'; // Added useCallback back for getBrightAccent
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { KanbanBoard } from '@/components/quests/KanbanBoard';
import { TaskList } from '@/components/tasks/TaskList';
import { PersonalityButton } from '@/components/ui/PersonalityButton';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { useQuests } from '@/services/questsService';
import styles from '@/app/styles/global';
import { colors } from '@/app/styles/global';
import { SettingsButton } from '@/components/ui/SettingsButton';
// import { useChatData } from '@/hooks/useChatData'; // Remove direct import
import { useChat } from '@/contexts/ChatContext'; // Import useChat hook
import { useQuestUpdate } from '@/contexts/QuestUpdateContext';
import { JournalPanel } from '@/components/journal/JournalPanel';
import { useAuth } from '@clerk/clerk-expo'; // Import Clerk useAuth
import TriangularSpinner from '../loading/TriangularSpinner';
import { useTasks } from '@/services/tasksService'; // Import useTasks

export function DesktopLayout() {
  console.log(`[DesktopLayout] COMPONENT FUNCTION CALLED at ${new Date().toISOString()}`);

  // Track render count for debugging
  const renderCount = useRef(0);
  renderCount.current += 1;

  // Track component mount/unmount
  useEffect(() => {
    console.log(`[DesktopLayout] COMPONENT MOUNTED (render #${renderCount.current}) at ${new Date().toISOString()}`);

    return () => {
      console.log(`[DesktopLayout] COMPONENT UNMOUNTED after ${renderCount.current} renders at ${new Date().toISOString()}`);
    };
  }, []);

  // 1. Get Auth state FIRST (using Clerk)
  const { isLoaded: isClerkLoaded, isSignedIn, userId } = useAuth();

  // DEBUG: Track auth state changes
  const prevClerkLoadedRef = useRef(isClerkLoaded);
  const prevSignedInRef = useRef(isSignedIn);

  useEffect(() => {
    if (prevClerkLoadedRef.current !== isClerkLoaded) {
      console.log(`[DesktopLayout] CLERK LOADED STATE CHANGED: ${prevClerkLoadedRef.current} -> ${isClerkLoaded} at ${new Date().toISOString()}`);
      prevClerkLoadedRef.current = isClerkLoaded;
    }
  }, [isClerkLoaded]);

  useEffect(() => {
    if (prevSignedInRef.current !== isSignedIn) {
      console.log(`[DesktopLayout] CLERK SIGNED_IN STATE CHANGED: ${prevSignedInRef.current} -> ${isSignedIn} at ${new Date().toISOString()}`);
      if (isSignedIn && userId) {
        console.log(`[DesktopLayout] New Clerk User ID: ${userId}`);
      }
      prevSignedInRef.current = isSignedIn;
    }
  }, [isSignedIn, userId]);


  const router = useRouter();
  const { themeColor, secondaryColor, textColor } = useTheme();

  // 2. Get Feature Hooks (they will guard themselves internally based on auth state)
  // Pass userId directly if needed by the hook, or let them use useAuth internally
  const { mainQuest, loading: questsLoading, error: questsError, reload: reloadQuests } = useQuests(); // Assuming useQuests handles auth internally or gets userId
  const { tasks, loading: tasksLoading, error: tasksError, reload: reloadTasks } = useTasks(); // Assuming useTasks handles auth internally or gets userId
  // Use the context hook instead of the direct hook call
  const {
      messages, sendMessage, handleTyping, endSession, isTyping, deleteCurrentMessages,
      sessionEnded, checkupCreated, error: chatError, authenticated
  } = useChat();

  // DEBUG: Track data loading states
  useEffect(() => {
    console.log(`[DesktopLayout] QUESTS LOADING STATE: ${questsLoading} at ${new Date().toISOString()}`);
  }, [questsLoading]);

  useEffect(() => {
    console.log(`[DesktopLayout] TASKS LOADING STATE: ${tasksLoading} at ${new Date().toISOString()}`);
  }, [tasksLoading]);

  // 3. Combine Feature Data Loading States (exclude Clerk loading here)
  const isDataLoading = questsLoading || tasksLoading ;

  // DEBUG: Track combined loading state
  useEffect(() => {
    console.log(`[DesktopLayout] COMBINED DATA LOADING STATE: ${isDataLoading} at ${new Date().toISOString()}`);
  }, [isDataLoading]);

  // 4. Combine Feature Errors
  const combinedError = questsError || tasksError || chatError ;

  // Other context hooks
  const { shouldUpdate, resetUpdate } = useQuestUpdate();

  // DEBUG: Track update state
  useEffect(() => {
    console.log(`[DesktopLayout] SHOULD UPDATE STATE: ${shouldUpdate} at ${new Date().toISOString()}`);
  }, [shouldUpdate]);

  // --- Helper Functions ---
  // Utility for bright text (can be moved to utils later)
  const getBrightAccent = useCallback((baseColor: string) => {
    // ... (implementation unchanged)
    const hex = baseColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    if (r + g + b > 500) return '#FFFFFF';
    const brightR = Math.min(255, r + 100);
    const brightG = Math.min(255, g + 100);
    const brightB = Math.min(255, b + 100);
    return `#${brightR.toString(16).padStart(2, '0')}${brightG.toString(16).padStart(2, '0')}${brightB.toString(16).padStart(2, '0')}`;
  }, []);

  // Reload all data function - GUARDED by Clerk state
  const reloadAllData = useCallback(() => {
    // Use Clerk state for the guard
    if (isClerkLoaded && isSignedIn) {
      console.log(`[DesktopLayout] RELOADING ALL DATA at ${new Date().toISOString()}`);
      reloadQuests();
      reloadTasks();
      // Chat data might auto-reload via its hook or subscriptions
    } else {
      console.log(`[DesktopLayout] SKIPPING RELOAD - Clerk not ready (${isClerkLoaded}) or not signed in (${isSignedIn}) at ${new Date().toISOString()}`);
    }
  }, [isClerkLoaded, isSignedIn, reloadQuests, reloadTasks]);

  // Removed forceSessionRefresh function

  // --- Effects ---
  // Effect for Quest Updates - GUARDED by Clerk state
  useEffect(() => {
    console.log(`[DesktopLayout] QUEST UPDATE EFFECT RUNNING - isClerkLoaded: ${isClerkLoaded}, isSignedIn: ${isSignedIn}, shouldUpdate: ${shouldUpdate} at ${new Date().toISOString()}`);

    // Check Clerk loading AND signed-in status
    if (isClerkLoaded && isSignedIn && shouldUpdate) {
      console.log(`[DesktopLayout] QUEST UPDATE TRIGGERED - reloading data at ${new Date().toISOString()}`);
      reloadQuests();
      reloadTasks(); // Also reload tasks
      resetUpdate();
    } else {
      console.log(`[DesktopLayout] QUEST UPDATE EFFECT - conditions not met at ${new Date().toISOString()}`);
    }
  }, [isClerkLoaded, isSignedIn, shouldUpdate, reloadQuests, reloadTasks, resetUpdate]);

  // DEBUG: Log current render path
  let renderPath = "UNKNOWN";
  if (!isClerkLoaded) { // Clerk is loading
    renderPath = "INITIAL_AUTH_LOADING";
  } else if (!isSignedIn) { // Clerk loaded, but user not signed in
    renderPath = "LOGGED_OUT";
  } else if (isDataLoading) { // Clerk loaded, user signed in, data loading
    renderPath = "DATA_LOADING";
  } else if (combinedError) { // Clerk loaded, user signed in, error loading data
    renderPath = "ERROR";
  } else { // Clerk loaded, user signed in, data loaded
    renderPath = "MAIN_CONTENT";
  }

  console.log(`[DesktopLayout] RENDER PATH: ${renderPath} at ${new Date().toISOString()} (render #${renderCount.current})`);

  // --- Render Logic ---

  // A. Render Initial Auth Loading State (Clerk loading)
  if (!isClerkLoaded) {
    console.log(`[DesktopLayout] RENDERING: Initial Auth Loading State (Clerk) (${new Date().toISOString()})`);
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }]}>
        <TriangularSpinner size={50} color={themeColor} />
        <Text style={{ color: themeColor, marginTop: 15, fontSize: 16 }}>Initializing...</Text>
        <Text style={{ color: colors.textMuted, marginTop: 10, fontSize: 12 }}>
          Clerk Loading: {String(!isClerkLoaded)} | Render #{renderCount.current}
        </Text>
      </View>
    );
  }

  // B. Render Logged Out State (Clerk loaded, but not signed in)
  // NOTE: ClerkProvider/Expo Router should handle redirection, this is a fallback UI.
  if (!isSignedIn) {
    console.log(`[DesktopLayout] RENDERING: Logged Out State (Clerk) (${new Date().toISOString()})`);
    // Ideally, the user should be redirected by the root layout (_layout.tsx)
    // This UI might flash briefly or show if redirection fails.
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textMuted, fontSize: 18 }}>Redirecting to login...</Text>
        {/* Optional: Add a manual redirect button if needed */}
        {/* <TouchableOpacity onPress={() => router.replace('/auth')} style={{ marginTop: 20, padding: 10, backgroundColor: themeColor, borderRadius: 5 }}>
          <Text style={{ color: textColor }}>Go to Login</Text>
        </TouchableOpacity> */}
        <Text style={{ color: colors.textMuted, marginTop: 20, fontSize: 12 }}>
          Debug Info: Clerk Loaded: {String(isClerkLoaded)} | Signed In: No | Render #{renderCount.current}
        </Text>
      </View>
    );
  }

  // --- At this point, we know Clerk IS loaded AND user IS signed in ---
  // userId is guaranteed to be available here if isSignedIn is true.

  console.log(`[DesktopLayout] CONFIRMED CLERK USER ID: ${userId} at ${new Date().toISOString()}`);

  // C. Render Data Loading State (Auth confirmed, loading feature data)
  if (isDataLoading) {
    console.log(`[DesktopLayout] RENDERING: Data Loading State (${new Date().toISOString()})`);
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }]}>
        <TriangularSpinner size={50} color={themeColor} />
        <Text style={{ color: themeColor, marginTop: 15, fontSize: 16 }}>Loading Dashboard...</Text>
        <Text style={{ color: colors.textMuted, marginTop: 10, fontSize: 12 }}>
          Clerk Loaded: {String(isClerkLoaded)} | Signed In: Yes | Data Loading: {String(isDataLoading)} | Render #{renderCount.current}
        </Text>
      </View>
    );
  }

  // D. Render Error State (Auth confirmed, but a feature hook reported an error)
  if (combinedError) {
    console.log(`[DesktopLayout] RENDERING: Error State (${new Date().toISOString()})`);
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.error, fontSize: 18, marginBottom: 20 }]}>Error loading dashboard:</Text>
        <Text style={{ color: colors.textMuted, marginBottom: 30, textAlign: 'center' }}>{String(combinedError)}</Text>
        <TouchableOpacity onPress={reloadAllData} style={{ paddingVertical: 10, paddingHorizontal: 20, backgroundColor: themeColor, borderRadius: 5 }}>
          <Text style={{ color: textColor, fontWeight: 'bold' }}>Try Again</Text>
        </TouchableOpacity>
        <Text style={{ color: colors.textMuted, marginTop: 20, fontSize: 12 }}>
          Debug Info: Clerk Loaded: {String(isClerkLoaded)} | Signed In: Yes | Data Loading: {String(isDataLoading)} | Error State | Render #{renderCount.current}
        </Text>
      </View>
    );
  }

  // E. Render Main Content (Auth ready, User confirmed, Data ready)
  console.log(`[DesktopLayout] RENDERING: Main Content (${new Date().toISOString()})`);
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Added debug info to main view */}
      <View style={{
        position: 'absolute',
        top: 5,
        right: 5,
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: 5,
        borderRadius: 4,
        zIndex: 1000
      }}>
        <Text style={{ color: '#fff', fontSize: 10 }}>
          Render #{renderCount.current} | Clerk: {String(isClerkLoaded)} | User: {userId ? userId.slice(0,6) : 'N/A'}...
        </Text>
        {/* Removed force refresh button */}
      </View>

      {/* Column 1: Quests & Tasks */}
      <View style={styles.column}>
        <KanbanBoard
          mainQuest={mainQuest}
          onViewAllQuests={() => router.push('/quests')}
          userId={userId} // Pass confirmed userId from Clerk
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
          userId={userId} // Pass confirmed userId from Clerk
        />
      </View>

      {/* Column 3: Journal Panel */}
      <View style={[styles.column, { position: 'relative' }]}>
        <JournalPanel
          themeColor={themeColor}
          textColor={textColor}
          fullColumnMode={true}
          userId={userId} // Pass confirmed userId from Clerk
        />
      </View>
      <SettingsButton />
    </View>
  );
}
