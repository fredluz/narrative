import React, { useEffect, useState } from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSupabase } from '@/contexts/SupabaseContext';
import { useTheme } from '@/contexts/ThemeContext';
import { fetchQuestTasks } from '@/services/tasksService';
import { Task, Quest } from '@/app/types';

interface QuestTasksModalProps {
  visible: boolean;
  onClose: () => void;
  quest?: Quest;
}

export function QuestTasksModal({ visible, onClose, quest }: QuestTasksModalProps) {
  const { session } = useSupabase();
  const { themeColor } = useTheme();
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    const loadData = async () => {
      if (!session?.user?.id || !quest) return;
      try {
        const questTasks = await fetchQuestTasks(quest.id, session.user.id);
        setTasks(questTasks);
      } catch (err) {
        console.error('Error loading quest tasks:', err);
      }
    };
    
    if (visible) {
      loadData();
    }
  }, [visible, quest, session?.user?.id]);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
      }}>
        <View style={{
          width: '80%',
          backgroundColor: '#1A1A1A',
          borderRadius: 8,
          padding: 20,
          borderWidth: 1,
          borderColor: themeColor,
          maxHeight: '80%',
        }}>
          <View style={{ 
            flexDirection: 'row', 
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
            borderBottomWidth: 1,
            borderBottomColor: 'rgba(255, 255, 255, 0.1)',
            paddingBottom: 10
          }}>
            <Text style={{ 
              color: '#FFF', 
              fontSize: 18, 
              fontWeight: 'bold',
              textShadowColor: themeColor,
              textShadowOffset: { width: 0.5, height: 0.5 },
              textShadowRadius: 2
            }}>
              Quest Tasks
            </Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color="#AAA" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: '100%' }}>
            {tasks.length > 0 ? (
              tasks.map((task) => (
                <View key={task.id} style={{
                  padding: 10,
                  backgroundColor: '#2A2A2A',
                  borderRadius: 4,
                  marginBottom: 10,
                }}>
                  <Text style={{ color: '#FFF', fontSize: 16 }}>{task.title}</Text>
                  {task.description && (
                    <Text style={{ color: '#AAA', fontSize: 14, marginTop: 5 }}>
                      {task.description}
                    </Text>
                  )}
                  <View style={{ 
                    flexDirection: 'row', 
                    justifyContent: 'space-between',
                    marginTop: 10 
                  }}>
                    <Text style={{ color: '#888', fontSize: 12 }}>
                      Status: {task.status}
                    </Text>
                    <Text style={{ color: '#888', fontSize: 12 }}>
                      Due: {task.deadline || 'No deadline'}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={{ color: '#AAA', textAlign: 'center', padding: 20 }}>
                No tasks found for this quest
              </Text>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}