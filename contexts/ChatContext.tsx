import React, { createContext, useContext, ReactNode } from 'react';
import { useChatData } from '@/hooks/useChatData';
import { ChatMessage } from '@/app/types'; // Assuming ChatMessage type is defined here

// Define the shape of the context value based on useChatData's return type
// Ensure all necessary values and functions are included
type ChatContextType = {
  messages: ChatMessage[];
  sendMessage: (messageText: string, userId?: string) => Promise<void>;
  handleTyping: (text: string) => void;
  endSession: () => Promise<void>;
  isTyping: boolean;
  sessionEnded: boolean;
  checkupCreated: boolean;
  error: string | null;
  authenticated: boolean;
  syncMessages: () => Promise<void>;
  deleteCurrentMessages: () => Promise<void>;
  triggerWelcomeMessage: () => Promise<void>;
};

// Create the context with an undefined default value
const ChatContext = createContext<ChatContextType | undefined>(undefined);

// Create the provider component
interface ChatProviderProps {
  children: ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  // Call useChatData once here
  const chatData = useChatData();

  return (
    <ChatContext.Provider value={chatData}>
      {children}
    </ChatContext.Provider>
  );
};

// Create the custom hook to consume the context
export const useChat = (): ChatContextType => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
