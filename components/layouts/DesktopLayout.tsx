// components/layouts/DesktopLayout.tsx
import React, { useEffect, useCallback, useRef } from 'react'; // Added useRef for tracking
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

  // 1. Get Auth state FIRST (using the renamed isLoading from context)
  const { session, isLoading: isAuthLoading, refreshSession } = useSupabase();
  
  // DEBUG: Track auth state changes
  const prevAuthLoadingRef = useRef(isAuthLoading);
  const prevSessionRef = useRef(session);
  
  useEffect(() => {
    if (prevAuthLoadingRef.current !== isAuthLoading) {
      console.log(`[DesktopLayout] AUTH LOADING STATE CHANGED: ${prevAuthLoadingRef.current} -> ${isAuthLoading} at ${new Date().toISOString()}`);
      console.log(`[DesktopLayout] Stack trace for isAuthLoading change:`, new Error().stack);
      prevAuthLoadingRef.current = isAuthLoading;
    }
  }, [isAuthLoading]);
  
  useEffect(() => {
    const prevSessionExists = !!prevSessionRef.current?.user?.id;
    const currentSessionExists = !!session?.user?.id;
    
    if (prevSessionExists !== currentSessionExists) {
      console.log(`[DesktopLayout] SESSION STATE CHANGED: ${prevSessionExists ? 'exists' : 'null'} -> ${currentSessionExists ? 'exists' : 'null'} at ${new Date().toISOString()}`);
      if (currentSessionExists && session?.expires_at) {
        console.log(`[DesktopLayout] New session user ID: ${session.user.id}`);
        console.log(`[DesktopLayout] Session expires: ${new Date(session.expires_at * 1000).toISOString()}`);
      }
      prevSessionRef.current = session;
    } else if (session && prevSessionRef.current && session !== prevSessionRef.current) {
      // Same user but different session object
      console.log(`[DesktopLayout] SESSION OBJECT CHANGED but same login state at ${new Date().toISOString()}`);
      if (prevSessionRef.current.expires_at && session.expires_at) {
        console.log(`[DesktopLayout] Previous expiry: ${new Date(prevSessionRef.current.expires_at * 1000).toISOString()}`);
        console.log(`[DesktopLayout] New expiry: ${new Date(session.expires_at * 1000).toISOString()}`);
      } else {
        console.log('[DesktopLayout] Session expiry information unavailable');
      }
      prevSessionRef.current = session;
    }
  }, [session]);

  const router = useRouter();
  const { themeColor, secondaryColor, textColor } = useTheme();

  // 2. Get Feature Hooks (they will guard themselves internally based on auth state)
  const { mainQuest, loading: questsLoading, error: questsError, reload: reloadQuests } = useQuests();
  const { tasks, loading: tasksLoading, error: tasksError, reload: reloadTasks } = useTasks();
  const {
      messages, sendMessage, handleTyping, endSession, isTyping, deleteCurrentMessages,
      sessionEnded, checkupCreated, error: chatError, authenticated // Get authenticated state from hook
  } = useChatData();

  // DEBUG: Track data loading states
  useEffect(() => {
    console.log(`[DesktopLayout] QUESTS LOADING STATE: ${questsLoading} at ${new Date().toISOString()}`);
  }, [questsLoading]);
  
  useEffect(() => {
    console.log(`[DesktopLayout] TASKS LOADING STATE: ${tasksLoading} at ${new Date().toISOString()}`);
  }, [tasksLoading]);

  // 3. Combine Feature Data Loading States (exclude isAuthLoading here)
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

  // Reload all data function - GUARDED
  const reloadAllData = useCallback(() => {
    // Use the session state directly for the guard
    if (!isAuthLoading && session?.user?.id) {
      console.log(`[DesktopLayout] RELOADING ALL DATA at ${new Date().toISOString()}`);
      reloadQuests();
      reloadTasks();
      // Chat data might auto-reload via its hook or subscriptions
    } else {
      console.log(`[DesktopLayout] SKIPPING RELOAD - auth not ready (${isAuthLoading}) or no session (${!!session?.user?.id}) at ${new Date().toISOString()}`);
    }
  }, [isAuthLoading, session?.user?.id, reloadQuests, reloadTasks]);

  // DEBUG: Function to force a session refresh (helpful for debugging)
  const forceSessionRefresh = useCallback(() => {
    console.log(`[DesktopLayout] MANUALLY FORCING SESSION REFRESH at ${new Date().toISOString()}`);
    refreshSession().then(newSession => {
      console.log(`[DesktopLayout] MANUAL SESSION REFRESH COMPLETED at ${new Date().toISOString()}: `, 
        newSession ? `Session valid until ${newSession.expires_at ? new Date(newSession.expires_at * 1000).toISOString() : 'session expires_at undefined'}` : 'No valid session');
    }).catch(error => {
      console.error(`[DesktopLayout] Error during session refresh: ${error}`);
    });
  }, [refreshSession]);

  // --- Effects ---
  // Effect for Quest Updates - GUARDED
  useEffect(() => {
    console.log(`[DesktopLayout] QUEST UPDATE EFFECT RUNNING - isAuthLoading: ${isAuthLoading}, session: ${!!session?.user?.id}, shouldUpdate: ${shouldUpdate} at ${new Date().toISOString()}`);
    
    // Check initial auth loading AND session existence
    if (!isAuthLoading && session?.user?.id && shouldUpdate) {
      console.log(`[DesktopLayout] QUEST UPDATE TRIGGERED - reloading data at ${new Date().toISOString()}`);
      reloadQuests();
      reloadTasks(); // Also reload tasks
      resetUpdate();
    } else {
      console.log(`[DesktopLayout] QUEST UPDATE EFFECT - conditions not met at ${new Date().toISOString()}`);
    }
  }, [isAuthLoading, session?.user?.id, shouldUpdate, reloadQuests, reloadTasks, resetUpdate]);

  // DEBUG: Log current render path
  let renderPath = "UNKNOWN";
  if (isAuthLoading) {
    renderPath = "INITIAL_AUTH_LOADING";
  } else if (!session?.user?.id) {
    renderPath = "LOGGED_OUT";
  } else if (isDataLoading) {
    renderPath = "DATA_LOADING";
  } else if (combinedError) {
    renderPath = "ERROR";
  } else {
    renderPath = "MAIN_CONTENT";
  }
  
  console.log(`[DesktopLayout] RENDER PATH: ${renderPath} at ${new Date().toISOString()} (render #${renderCount.current})`);

  // --- Render Logic ---

  // A. Render Initial Auth Loading State
  if (isAuthLoading) {
    console.log(`[DesktopLayout] RENDERING: Initial Auth Loading State (${new Date().toISOString()})`);
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }]}>
        <TriangularSpinner size={50} color={themeColor} />
        <Text style={{ color: themeColor, marginTop: 15, fontSize: 16 }}>Initializing...</Text>
        <Text style={{ color: colors.textMuted, marginTop: 10, fontSize: 12 }}>
          Auth Loading: {String(isAuthLoading)} | Render #{renderCount.current}
        </Text>
      </View>
    );
  }

  // B. Render Logged Out State (Auth is confirmed, but no session)
  if (!session?.user?.id) {
    console.log(`[DesktopLayout] RENDERING: Logged Out State (${new Date().toISOString()})`);
    // AuthGuard should have redirected, but this provides UI feedback if needed.
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textMuted, fontSize: 18 }}>Please log in.</Text>
        <TouchableOpacity onPress={() => router.replace('/auth')} style={{ marginTop: 20, padding: 10, backgroundColor: themeColor, borderRadius: 5 }}>
          <Text style={{ color: textColor }}>Go to Login</Text>
        </TouchableOpacity>
        <Text style={{ color: colors.textMuted, marginTop: 20, fontSize: 12 }}>
          Debug Info: Auth Loading: {String(isAuthLoading)} | Has Session: No | Render #{renderCount.current}
        </Text>
      </View>
    );
  }

  // --- At this point, we know auth is NOT loading AND session exists ---
  const userId = session.user.id; // Safe to get userId
  
  console.log(`[DesktopLayout] CONFIRMED USER ID: ${userId} at ${new Date().toISOString()}`);

  // C. Render Data Loading State (Auth confirmed, loading feature data)
  if (isDataLoading) {
    console.log(`[DesktopLayout] RENDERING: Data Loading State (${new Date().toISOString()})`);
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }]}>
        <TriangularSpinner size={50} color={themeColor} />
        <Text style={{ color: themeColor, marginTop: 15, fontSize: 16 }}>Loading Dashboard...</Text>
        <Text style={{ color: colors.textMuted, marginTop: 10, fontSize: 12 }}>
          Auth Loading: {String(isAuthLoading)} | Data Loading: {String(isDataLoading)} | Render #{renderCount.current}
        </Text>
        <TouchableOpacity onPress={forceSessionRefresh} style={{ marginTop: 20, padding: 10, backgroundColor: '#444', borderRadius: 5 }}>
          <Text style={{ color: '#fff' }}>Force Session Refresh (Debug)</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // D. Render Error State (Auth confirmed, but a feature hook reported an error)
  if (combinedError) {
    console.log(`[DesktopLayout] RENDERING: Error State (${new Date().toISOString()})`);
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.error, fontSize: 18, marginBottom: 20 }]}>Error loading dashboard:</Text>
        <Text style={{ color: colors.textMuted, marginBottom: 30, textAlign: 'center' }}>{combinedError}</Text>
        <TouchableOpacity onPress={reloadAllData} style={{ paddingVertical: 10, paddingHorizontal: 20, backgroundColor: themeColor, borderRadius: 5 }}>
          <Text style={{ color: textColor, fontWeight: 'bold' }}>Try Again</Text>
        </TouchableOpacity>
        <Text style={{ color: colors.textMuted, marginTop: 20, fontSize: 12 }}>
          Debug Info: Auth Loading: {String(isAuthLoading)} | Data Loading: {String(isDataLoading)} | Error State | Render #{renderCount.current}
        </Text>
        <TouchableOpacity onPress={forceSessionRefresh} style={{ marginTop: 10, padding: 8, backgroundColor: '#444', borderRadius: 5 }}>
          <Text style={{ color: '#fff', fontSize: 12 }}>Force Session Refresh (Debug)</Text>
        </TouchableOpacity>
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
          Render #{renderCount.current} | Auth: {String(!isAuthLoading)} | User: {userId.slice(0,6)}...
        </Text>
        <TouchableOpacity onPress={forceSessionRefresh} style={{ marginTop: 2, padding: 4, backgroundColor: '#333', borderRadius: 3 }}>
          <Text style={{ color: '#fff', fontSize: 8 }}>Force Refresh</Text>
        </TouchableOpacity>
      </View>
      
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

      {/* Column 3: Journal Panel */}
      <View style={[styles.column, { position: 'relative' }]}>
        <JournalPanel
          themeColor={themeColor}
          textColor={textColor}
          fullColumnMode={true}
          userId={userId}
        />
      </View>
      <SettingsButton />
    </View>
  );
}