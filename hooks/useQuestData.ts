import { useState } from 'react';
import { MainQuest } from '@/app/types';

export function useQuestData() {
  const [mainQuest] = useState<MainQuest>({
    title: "I, Robot - Week 2",
    progress: "20%",
    kanban: {
      ToDo: ["Zoom Meeting with Investors", "Set Up User Authentication"],
      InProgress: ["Get Feedback", "Get Database Up"],
      Done: ["Make UI Mockups"]
    }
  });

  return {
    mainQuest,
  };
}
