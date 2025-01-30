import { useState } from 'react';
import { ChatMessage } from '@/app/types';
import { useTheme } from '@/contexts/ThemeContext';

export function useChatData() {
  const { themeColor } = useTheme();
  const [messages] = useState<ChatMessage[]>([
    { isUser: false, message: "Rise and shine, samurai. Another day in this digital hellhole." },
    { isUser: false, message: "Got your todo list here - feedback loops and database grind. Oh, and try not to ghost your input parameters tonight, got that hot date coming up." },
    { isUser: false, message: "So what's it gonna be? Gonna dive into the code mines or keep staring at my gorgeous interface?" },
    { isUser: true, message: "Thinking about tackling the database first, but yeah, can't mess up tonight's plans." },
    { isUser: false, message: "Database work, huh? Real exciting stuff. Just don't let the corps standardize your thinking patterns. And hey - that date? That's the real quest here. Everything else is just side content." },
    { isUser: false, message: "I'll keep an eye on the clock for ya. Shoot you a text at 6PM. Can't let you dive so deep into the code that you forget about the real world. You know how that goes." }
  ]);

  return {
    messages,
    themeColor,
  };
}
