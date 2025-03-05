import React from 'react';
import { QuestsOverview } from '@/components/quests/QuestsOverview';
import { useRouter } from 'expo-router';
import { useQuests } from '@/services/questsService';
import { useQuestUpdate } from '@/contexts/QuestUpdateContext';

export default function QuestsScreen() {
  const router = useRouter();
  const { quests, setQuestAsMain, mainQuest } = useQuests();
  const { triggerUpdate } = useQuestUpdate();

  const handleQuestSelect = async (questId: number) => {
    await setQuestAsMain(questId);
    triggerUpdate(); // Mark that an update is needed
  };

  return (
    <QuestsOverview 
      onSelectQuest={handleQuestSelect} 
      quests={quests} 
      currentMainQuest={mainQuest}
    />
  );
}
