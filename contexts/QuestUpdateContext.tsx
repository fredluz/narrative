import React, { createContext, useContext, useState } from 'react';

interface QuestUpdateContextType {
  triggerUpdate: () => void;
  shouldUpdate: boolean;
  resetUpdate: () => void;
}

const QuestUpdateContext = createContext<QuestUpdateContextType | undefined>(undefined);

export function QuestUpdateProvider({ children }: { children: React.ReactNode }) {
  const [shouldUpdate, setShouldUpdate] = useState(false);

  const triggerUpdate = () => setShouldUpdate(true);
  const resetUpdate = () => setShouldUpdate(false);

  return (
    <QuestUpdateContext.Provider value={{ triggerUpdate, shouldUpdate, resetUpdate }}>
      {children}
    </QuestUpdateContext.Provider>
  );
}

export const useQuestUpdate = () => {
  const context = useContext(QuestUpdateContext);
  if (!context) throw new Error('useQuestUpdate must be used within QuestUpdateProvider');
  return context;
};
