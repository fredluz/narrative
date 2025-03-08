import { useState, useCallback, useEffect, useRef } from 'react';
import { ChatMessage } from '@/app/types';
import { useTheme } from '@/contexts/ThemeContext';
import { ChatAgent } from '@/services/agents/ChatAgent';
import { supabase } from '@/lib/supabase';

const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds
const JOHNNY_RESPONSE_DELAY = 2000; // 2 seconds delay before Johnny replies
const MESSAGE_STAGGER_DELAY = 1000; // 1 second between sequential messages

export function useChatData() {
  const { themeColor } = useTheme();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [checkupCreated, setCheckupCreated] = useState(false);
  const chatAgent = new ChatAgent();
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentSessionMessagesRef = useRef<ChatMessage[]>([]);
  const pendingMessagesRef = useRef<ChatMessage[]>([]); // Changed from string[] to ChatMessage[]
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

  // Reset inactivity timer
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    setSessionEnded(false);
    setCheckupCreated(false);

    inactivityTimerRef.current = setTimeout(async () => {
      const sessionMessages = currentSessionMessagesRef.current;
      if (sessionMessages.length > 0) {
        try {
          const sessionId = await chatAgent.summarizeAndStoreSession(sessionMessages);
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
  }, []);

  const endSession = useCallback(async () => {
    const sessionMessages = currentSessionMessagesRef.current;
    if (sessionMessages.length > 0) {
      try {
        const sessionId = await chatAgent.summarizeAndStoreSession(sessionMessages);
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
  }, []);

  // Load initial messages and set up real-time subscription
  useEffect(() => {
    // Load initial messages
    const loadMessages = async () => {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .is('chat_session_id', null)  // Only get messages without a session ID
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading messages:', error);
        return;
      }

      setMessages(data || []);
    };

    loadMessages();

    // Set up real-time subscription
    const subscription = supabase
      .channel('chat_messages')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'chat_messages' 
        }, 
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMessage = payload.new as ChatMessage;
            // Only add message if it's not part of a session
            if (!newMessage.chat_session_id) {
              setMessages(prev => [...prev, newMessage]);
              resetInactivityTimer();
            }
          }
        }
      )
      .subscribe();

    // Cleanup subscription
    return () => {
      subscription.unsubscribe();
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [resetInactivityTimer]);

  // Handle user typing
  const handleTyping = useCallback((text: string) => {
    // Clear Johnny's response timer if user is typing
    if (johnnyResponseTimerRef.current) {
      clearTimeout(johnnyResponseTimerRef.current);
    }
    // Update the last message reference
    lastMessageRef.current = text;
  }, []);

  // Handle message sending
  const sendMessage = useCallback(async (messageText: string) => {
    if (!messageText.trim()) return;

    // Create user message
    const userMessage: ChatMessage = {
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_user: true,
      message: messageText.trim(),
      chat_session_id: currentSessionId || undefined
    };

    // Add to pending messages
    pendingMessagesRef.current.push(userMessage);

    try {
      // Save user message to Supabase - local state will update via subscription
      const { error: saveError } = await supabase
        .from('chat_messages')
        .insert([userMessage]);

      if (saveError) throw saveError;

      // Clear any existing timer
      if (johnnyResponseTimerRef.current) {
        clearTimeout(johnnyResponseTimerRef.current);
      }

      // Set new timer for Johnny's response
      johnnyResponseTimerRef.current = setTimeout(async () => {
        // Only proceed with response if user hasn't started typing again
        setIsTyping(true);
        try {
          // Get all pending messages and combine them
          const pendingMessages = [...pendingMessagesRef.current];
          const combinedMessage = pendingMessages
            .map(msg => msg.message)
            .join('\n');

          // Clear pending messages
          pendingMessagesRef.current = [];

          // Get Johnny's response to all messages - returns string[] (multiple messages)
          const responseMessages = await chatAgent.generateChatResponse(combinedMessage);
          console.log('Received response messages:', responseMessages);
          
          // Process each message with a delay between them
          for (let i = 0; i < responseMessages.length; i++) {
            const sendAIMessage = async () => {
              const message = responseMessages[i];
              console.log(`Sending AI message ${i+1}/${responseMessages.length}:`, message);
              
              // Create AI response message
              const aiMessage: ChatMessage = {
                id: Date.now() + 1000 + (i * 100), // Ensure unique IDs with more spacing
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                is_user: false,
                message: message,
                chat_session_id: currentSessionId || undefined
              };
              
              // Save to Supabase
              const { error: aiSaveError } = await supabase
                .from('chat_messages')
                .insert([aiMessage]);
              
              if (aiSaveError) {
                console.error('Error inserting AI message part:', aiSaveError);
              }
              
              // Only stop typing indication after last message
              if (i === responseMessages.length - 1) {
                setIsTyping(false);
              }
            };
            
            // Use setTimeout for sequential delays
            setTimeout(sendAIMessage, i * MESSAGE_STAGGER_DELAY);
          }

          resetInactivityTimer();
        } catch (error) {
          console.error('Error in Johnny\'s response:', error);
          const errorMessage: ChatMessage = {
            id: Date.now() + 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            is_user: false,
            message: "Damn netrunners must be messing with our connection. Try again in a bit.",
            chat_session_id: currentSessionId || undefined
          };

          // Save error message to Supabase - local state will update via subscription
          try {
            await supabase
              .from('chat_messages')
              .insert([errorMessage]);
          } catch (insertError) {
            console.error('Error saving error message:', insertError);
          } finally {
            setIsTyping(false);
          }
        }
      }, JOHNNY_RESPONSE_DELAY);

    } catch (error) {
      console.error('Error in sendMessage:', error);
    }
  }, [currentSessionId, resetInactivityTimer]);

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
    checkupCreated, // Add new state to be exposed
  };
}
