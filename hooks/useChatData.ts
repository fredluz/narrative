import { useState } from 'react';
import { ChatMessage } from '@/app/types';
import { useTheme } from '@/contexts/ThemeContext';

export function useChatData() {
  const { themeColor } = useTheme();
  const [messages] = useState<ChatMessage[]>([
    { sender: "Batcomputer", message: "Welcome back, Fred." },
    { sender: "Batcomputer", message: "You've got technical tasks for today: getting feedback and making the database work. Also, don't forget about your date tonight." },
    { sender: "Batcomputer", message: "Which task would you like to tackle first?" },
    { sender: "You", message: "I'm thinking about getting the database running, but I'm worried I'll get distracted and miss my date." },
    { sender: "System", message: "*reading details for 'Build AI Companion'*" },
    { sender: "Batcomputer", message: "Don't worry, I'll remind you when it's time to get ready. For now, you can start working on your app." },
  ]);

  // Return messages first to make order clearer
  return {
    messages,
    themeColor,
  };
}
