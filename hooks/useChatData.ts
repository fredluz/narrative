import { useState, useCallback, useEffect } from 'react';
import { ChatMessage } from '@/app/types';
import { useTheme } from '@/contexts/ThemeContext';
import { ChatAgent } from '@/services/ChatAgent';
import { supabase } from '@/lib/supabase';

export function useChatData() {
  const { themeColor } = useTheme();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const chatAgent = new ChatAgent();

  // Load initial messages and set up real-time subscription
  useEffect(() => {
    // Load initial messages
    const loadMessages = async () => {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(50);

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
            setMessages(prev => [...prev, newMessage]);
          }
        }
      )
      .subscribe();

    // Cleanup subscription
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim()) return;

    // Create user message
    const userMessage: ChatMessage = {
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_user: true,
      message: message.trim()
    };

    try {
      // Save user message to Supabase
      const { error: saveError } = await supabase
        .from('chat_messages')
        .insert([userMessage]);

      if (saveError) throw saveError;

      // Show typing indicator
      setIsTyping(true);

      // Get Johnny's response
      const response = await chatAgent.generateChatResponse(message);

      // Create and save AI response
      const aiMessage: ChatMessage = {
        id: Date.now() + 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_user: false,
        message: response
      };

      const { error: aiSaveError } = await supabase
        .from('chat_messages')
        .insert([aiMessage]);

      if (aiSaveError) throw aiSaveError;

    } catch (error) {
      console.error('Error in sendMessage:', error);
      // Add an error message from Johnny
      const errorMessage: ChatMessage = {
        id: Date.now() + 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_user: false,
        message: "Damn netrunners must be messing with our connection. Try again in a bit."
      };
      
      try {
        await supabase
          .from('chat_messages')
          .insert([errorMessage]);
      } catch (insertError) {
        console.error('Error inserting error message:', insertError);
      }
    } finally {
      setIsTyping(false);
    }
  }, []);

  return {
    messages,
    sendMessage,
    themeColor,
    isTyping,
  };
}
