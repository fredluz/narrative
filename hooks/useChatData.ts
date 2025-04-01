import { useState, useCallback, useEffect, useRef } from 'react';
import { ChatMessage } from '@/app/types';
import { useTheme } from '@/contexts/ThemeContext';
import { ChatAgent } from '@/services/agents/ChatAgent';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@clerk/clerk-expo'; // Import useAuth from Clerk
import { updateTask } from '@/services/tasksService'; // Import updateTask


import AsyncStorage from '@react-native-async-storage/async-storage';

const INACTIVITY_TIMEOUT = 5 * 60 * 1000;
const JOHNNY_RESPONSE_DELAY = 2000;
const MESSAGE_STAGGER_DELAY = 1000;
const LOCAL_STORAGE_KEY = 'chat_messages_local'; // key for local storage

// New database access functions for ChatAgent
export async function getCurrentMessagesFromDB(userId: string) {
  if (!userId) {
    throw new Error('User ID is required to fetch current messages');
  }
  
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .is('chat_session_id', null)
    .eq('clerk_id', userId)
    .order('created_at', { ascending: true });
  
  if (error) {
    throw error;
  }
  
  return data || [];
}


export async function createChatSession(summary: string, tags: string[], userId: string) {
  if (!userId) {
    throw new Error('User ID is required to create a chat session');
  }
  
  const { data, error } = await supabase
    .from('chat_sessions')
    .insert([{ 
      summary,
      tags,
      clerk_id: userId
    }])
    .select('id')
    .single();
  
  if (error) {
    throw error;
  }
  
  return data;
}

export async function updateMessagesWithSessionId(messageIds: any[], sessionId: string, userId: string) {
  if (!userId || !sessionId || !messageIds || messageIds.length === 0) {
    throw new Error('User ID, session ID, and message IDs are required to update messages');
  }
  
  const { error } = await supabase
    .from('chat_messages')
    .update({ chat_session_id: sessionId })
    .in('id', messageIds)
    .eq('clerk_id', userId);
  
  if (error) {
    throw error;
  }
  
  return true;
}

export function useChatData() {
  const { themeColor } = useTheme();
  const { userId } = useAuth(); // Get userId from Clerk
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [checkupCreated, setCheckupCreated] = useState(false);
  const [error, setError] = useState<string | null>(null); // Add error state for auth issues
  const chatAgent = new ChatAgent();
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentSessionMessagesRef = useRef<ChatMessage[]>([]);
  const pendingMessagesRef = useRef<ChatMessage[]>([]);
  const johnnyResponseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastMessageRef = useRef<string>('');

  // Keep track of current session messages
  const getCurrentSessionMessages = useCallback(() => {
    return messages.filter(msg => !msg.chat_session_id);
  }, [messages]);

  // Keep track of session messages
  useEffect(() => {
    currentSessionMessagesRef.current = getCurrentSessionMessages();
  }, [messages, getCurrentSessionMessages]);

  // Reset inactivity timer with stronger auth check
  const resetInactivityTimer = useCallback(() => {
    // Clear any existing error
    setError(null);

    // Use Clerk userId for check
    if (!userId) {
      console.error('Cannot reset inactivity timer: No user ID (Clerk)');
      setError('Authentication required');
      return;
    }

    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    setSessionEnded(false);
    setCheckupCreated(false);

    inactivityTimerRef.current = setTimeout(async () => {
      // userId is already available from the hook's scope
      if (!userId) {
        console.error('User ID missing in timer execution (Clerk)');
        return;
      }
      
      const sessionMessages = currentSessionMessagesRef.current;
      if (sessionMessages.length > 0) {
        try {
          // Verify all messages belong to current user before proceeding
          const allMessagesOwnedByUser = sessionMessages.every(msg => 
            !msg.clerk_id || msg.clerk_id === userId);
            
          if (!allMessagesOwnedByUser) {
            console.error('Security issue: Found messages not owned by current user');
            return;
          }
          
          // All messages should have the same clerk_id
          const sessionMessagesWithUserId = sessionMessages.map(msg => ({
            ...msg,
            clerk_id: userId
          }));
          
          const sessionId = await chatAgent.summarizeAndStoreSession(sessionMessagesWithUserId);
          
          // Update local messages with new session ID
          setMessages(prev => prev.map(msg => 
            sessionMessages.some(sMsg => sMsg.id === msg.id) 
              ? { ...msg, chat_session_id: sessionId }
              : msg
          ));
          setCurrentSessionId(null);
          setSessionEnded(true);
          setCheckupCreated(true); // Mark that we've created a checkup
        } catch (error) {
          console.error('Error summarizing session:', error);
        }
      }
    }, INACTIVITY_TIMEOUT);
  }, [userId]); // Depend on Clerk userId

  // End session with stronger auth check
  const endSession = useCallback(async () => {
    // Use Clerk userId for check
    if (!userId) {
      console.error('Cannot end session: No user ID (Clerk)');
      setError('Authentication required to end session');
      return;
    }

    // userId is already available from the hook's scope
    const sessionMessages = currentSessionMessagesRef.current;

    // Set session ended state immediately
    setSessionEnded(true);
    
    // If no messages, just end without creating a record
    if (sessionMessages.length === 0) {
      return;
    }
    
    try {
      // Verify all messages belong to current user
      const allMessagesOwnedByUser = sessionMessages.every(msg => 
        !msg.clerk_id || msg.clerk_id === userId);
        
      if (!allMessagesOwnedByUser) {
        console.error('Security issue: Found messages not owned by current user');
        setError('Cannot end session: Message ownership verification failed');
        return;
      }
      
      // Ensure all messages have clerk_id
      const sessionMessagesWithUserId = sessionMessages.map(msg => ({
        ...msg,
        clerk_id: userId
      }));
      
      const sessionId = await chatAgent.summarizeAndStoreSession(sessionMessagesWithUserId);
      
      // Update local messages with new session ID
      setMessages(prev => prev.map(msg => 
        sessionMessages.some(sMsg => sMsg.id === msg.id) 
          ? { ...msg, chat_session_id: sessionId }
          : msg
      ));
      setCurrentSessionId(null);
      setCheckupCreated(true); // Mark that we've created a checkup
    } catch (error) {
      console.error('Error summarizing session:', error);
      setError('Failed to end session: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }, [userId]); // Depend on Clerk userId

  // Load messages on mount or when userId changes
  useEffect(() => {
    setMessages([]); // Clear messages on user change
    // Use Clerk userId for check
    if (!userId) {
      console.log('No active user session, skipping message loading (Clerk)');
      return;
    }
    // userId is already available from the hook's scope

    const loadLocalMessages = async () => {
      try {
        const key = `${LOCAL_STORAGE_KEY}_${userId}`;
        const stored = await AsyncStorage.getItem(key);
        if (stored) {
          const parsed: ChatMessage[] = JSON.parse(stored);
          const valid = parsed.filter(msg => !msg.chat_session_id && msg.clerk_id === userId);
          setMessages(valid);
        }
      } catch (err) {
        console.error('Error loading messages from local storage:', err);
      }
    };
    
    const loadDatabaseMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('clerk_id', userId)
          .is('chat_session_id', null)
          .order('created_at', { ascending: true });
        if (error) {
          console.error('Error loading messages from database:', error);
          return;
        }
        const valid = data?.filter(msg => msg.clerk_id === userId) || [];
        setMessages(prev => {
          const map = new Map(prev.map(msg => [String(msg.id), msg]));
          valid.forEach(msg => map.set(String(msg.id), msg));
          return Array.from(map.values()).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        });
      } catch (err) {
        console.error('Exception loading messages from DB:', err);
      }
    };

    loadLocalMessages().then(loadDatabaseMessages);
  }, [userId, resetInactivityTimer]); // Depend on Clerk userId

  // Save local messages whenever they change
  useEffect(() => {
    const saveLocal = async () => {
      // Use Clerk userId for check
      if (!userId) return;
      try {
        const key = `${LOCAL_STORAGE_KEY}_${userId}`; // Use Clerk userId
        await AsyncStorage.setItem(key, JSON.stringify(getCurrentSessionMessages()));
      } catch (err) {
        console.error('Error saving messages to local storage:', err);
      }
    };
    saveLocal();
  }, [messages, getCurrentSessionMessages, userId]); // Depend on Clerk userId

  // Add helper: sync unsynced messages to DB
  const syncMessages = useCallback(async () => {
    // Use Clerk userId for check
    if (!userId) return;
    // userId is already available from the hook's scope
    try {
      // Read from local storage
      const key = `${LOCAL_STORAGE_KEY}_${userId}`;
      const stored = await AsyncStorage.getItem(key);
      if (!stored) return;
      const localMessages: ChatMessage[] = JSON.parse(stored);
      // For example, assume messages with string id starting with "client" are unsynced
      const unsynced = localMessages.filter(msg => String(msg.id).startsWith('client'));
      for (const msg of unsynced) {
        try {
          const { data, error } = await supabase
            .from('chat_messages')
            .insert([msg])
            .select()
            .single();
          if (error) throw error;
          // Update local state: replace client id with server id
          setMessages(prev => prev.map(m => (m.id === msg.id ? { ...data, id: data.id } : m)));
        } catch (syncError) {
          console.error('Error syncing message:', syncError);
        }
      }
    } catch (err) {
      console.error('Error in syncMessages:', err);
    }
  }, [userId]); // Depend on Clerk userId

  // Handle user typing
  const handleTyping = useCallback((text: string) => {
    // Clear Johnny's response timer if user is typing
    if (johnnyResponseTimerRef.current) {
      clearTimeout(johnnyResponseTimerRef.current);
    }
    // Update the last message reference
    lastMessageRef.current = text;
  }, []);

  // Modify sendMessage to only update local storage & state immediately for AI responses
  const sendMessage = useCallback(async (messageText: string, userId?: string) => {
    // Clear any existing errors first
    setError(null);

    // Use Clerk userId directly. The userId parameter in the function signature is now redundant but kept for compatibility if needed elsewhere.
    const authenticatedUserId = userId; // Use userId from useAuth()

    if (!messageText.trim() || !authenticatedUserId) {
      const errorMsg = !authenticatedUserId 
        ? 'Authentication required to send messages'
        : 'Message cannot be empty';
        
      console.error(`Cannot send message: ${errorMsg}`);
      setError(errorMsg);
      return;
    }
    
    // Use a client-generated numeric id (negative) for optimistic update
    const clientUserId = -Date.now();
    const userMessage: ChatMessage = {
      id: clientUserId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_user: true,
      message: messageText.trim(),
      chat_session_id: currentSessionId || undefined,
      clerk_id: authenticatedUserId
    };

    // OPTIMISTIC UPDATE: Add message to local state first for immediate UI update
    setMessages(prev => [...prev, userMessage]);
    
    // Add to pending messages for AI response
    pendingMessagesRef.current.push(userMessage);
    
  
    // Instead of awaiting DB insert immediately, let the sync function handle it later
    // (Optional: you can trigger syncMessages() after a delay if desired.)

    // Clear any existing timer
    if (johnnyResponseTimerRef.current) {
      clearTimeout(johnnyResponseTimerRef.current);
    }

    // Set new timer for Johnny's response
    johnnyResponseTimerRef.current = setTimeout(async () => {
      setIsTyping(true);
      try {
        // Get all pending messages and ensure they have clerk_id
        const pendingMessages = [...pendingMessagesRef.current].map(msg => ({
          ...msg,
          clerk_id: authenticatedUserId
        }));
        
        const combinedMessage = pendingMessages
          .map(msg => msg.message)
          .join('\n');

        // Clear pending messages
        pendingMessagesRef.current = [];

        // Pass userId explicitly to generateChatResponse
        const responseMessages = await chatAgent.generateChatResponse(combinedMessage, authenticatedUserId);
        
        // Process each message with a delay between them
        for (let i = 0; i < responseMessages.length; i++) {
          const sendAIMessage = async () => {
            const message = responseMessages[i];
            
            // Use a client-generated numeric id (negative) for AI message
            const clientAiId = -(Date.now() + i);
            const aiMessage: ChatMessage = {
              id: clientAiId,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              is_user: false,
              message: message,
              chat_session_id: currentSessionId || undefined,
              clerk_id: authenticatedUserId // Explicit user ID assignment
            };
            
            // OPTIMISTIC UPDATE: Add AI message to local state immediately
            setMessages(prev => [...prev, aiMessage]);
            
            // Also let syncMessages() handle sending to DB later.
            if (i === responseMessages.length - 1) {
              setIsTyping(false);
            }
          };
          
          setTimeout(sendAIMessage, i * MESSAGE_STAGGER_DELAY);
        }

        resetInactivityTimer();
      } catch (error) {
        console.error('Error in Johnny\'s response:', error);

        // Handle error with proper clerk_id
        const clientErrorId = -Date.now();
        const errorMessage: ChatMessage = {
          id: clientErrorId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_user: false,
          message: "Damn netrunners must be messing with our connection. Try again in a bit.",
          chat_session_id: currentSessionId || undefined,
          clerk_id: authenticatedUserId // Explicit user ID assignment
        };

        // OPTIMISTIC UPDATE: Add error message to local state
        setMessages(prev => [...prev, errorMessage]);

        setIsTyping(false);
      }
    }, JOHNNY_RESPONSE_DELAY);

  }, [currentSessionId, resetInactivityTimer, userId, getCurrentSessionMessages]); // Depend on Clerk userId

  // Add a new function to delete current session messages
  const deleteCurrentMessages = useCallback(async () => {
    // Use Clerk userId for check
    if (!userId) {
      console.error('Cannot delete messages: No user ID (Clerk)');
      setError('Authentication required to delete messages');
      return;
    }

    // userId is already available from the hook's scope

    try {
      // Clear local storage for current session
      const key = `${LOCAL_STORAGE_KEY}_${userId}`;
      await AsyncStorage.removeItem(key); // Use removeItem to clear the local storage
      await AsyncStorage.setItem(key, ''); // Use setItem to reset the local storage
      // Update state to remove current session messages
      setMessages(prev => prev.filter(msg => msg.chat_session_id !== null));
      
      console.log('Successfully deleted current chat messages');
      
      // End the session without creating a record
      setSessionEnded(true);
    } catch (error) {
      console.error('Error deleting current messages:', error);
      setError('Failed to delete messages: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }, [userId]); // Depend on Clerk userId

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (johnnyResponseTimerRef.current) {
        clearTimeout(johnnyResponseTimerRef.current);
      }
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, []);

  return {
    messages: getCurrentSessionMessages(), // Only return current session messages
    sendMessage,
    handleTyping,
    endSession,
    isTyping,
    sessionEnded,
    checkupCreated,
    error, // Expose error state for UI feedback
    authenticated: !!userId, // Use Clerk userId for authentication status
    syncMessages, // Expose sync function so you can trigger it externally if needed
    deleteCurrentMessages // Expose the new function
  };
}
