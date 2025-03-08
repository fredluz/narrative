import React, { useState } from 'react';
import { View, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ui/ThemedText';
import { TaskRecommendation as ITaskRecommendation } from '@/services/TaskRecommendationParser';
import { CreateTaskModal } from '@/components/modals/CreateTaskModal';

interface TaskRecommendationProps {
  recommendations: ITaskRecommendation[];
  themeColor: string;
  secondaryColor: string;
  quests: Array<{ id: string; title: string }>;
  onCreateTask: (taskData: any) => Promise<void>;
}

export function TaskRecommendation({
  recommendations,
  themeColor,
  secondaryColor,
  quests,
  onCreateTask
}: TaskRecommendationProps) {
  const [selectedRecommendation, setSelectedRecommendation] = useState<ITaskRecommendation | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);

  const handleCreateTask = async (taskData: any) => {
    try {
      setIsCreatingTask(true);
      await onCreateTask(taskData);
      setIsModalVisible(false);
    } catch (error) {
      console.error('Error creating task:', error);
    } finally {
      setIsCreatingTask(false);
    }
  };

  if (!recommendations.length) return null;

  return (
    <View style={{
      backgroundColor: 'rgba(15, 15, 15, 0.8)',
      borderRadius: 5,
      borderLeftWidth: 3,
      borderColor: secondaryColor,
      marginTop: 15,
      overflow: 'hidden'
    }}>
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
      }}>
        <MaterialIcons
          name="lightbulb"
          size={16}
          color={secondaryColor}
          style={{ marginRight: 8 }}
        />
        <ThemedText style={{
          fontSize: 14,
          fontWeight: 'bold',
          color: secondaryColor,
        }}>
          RECOMMENDED TASKS
        </ThemedText>
      </View>

      <ScrollView style={{ maxHeight: 200 }}>
        {recommendations.map((recommendation, index) => (
          <View
            key={index}
            style={{
              padding: 10,
              borderBottomWidth: 1,
              borderBottomColor: 'rgba(255, 255, 255, 0.05)',
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <ThemedText style={{
                  fontSize: 14,
                  color: '#FFF',
                  fontWeight: 'bold',
                }}>
                  {recommendation.title}
                </ThemedText>
                <ThemedText style={{
                  fontSize: 12,
                  color: '#AAA',
                  marginTop: 2,
                }}>
                  {recommendation.description}
                </ThemedText>

                {/* Quest Tags */}
                {recommendation.suggestedQuestTags.length > 0 && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 }}>
                    {recommendation.suggestedQuestTags.map((tag, tagIndex) => (
                      <View
                        key={tagIndex}
                        style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: 3,
                          marginRight: 4,
                          marginTop: 2,
                        }}
                      >
                        <ThemedText style={{ fontSize: 10, color: themeColor }}>
                          {tag}
                        </ThemedText>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {/* Priority Indicator */}
              <View style={{
                backgroundColor: 
                  recommendation.priority === 'high' ? '#D32F2F' :
                  recommendation.priority === 'medium' ? '#FB8C00' : '#388E3C',
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 4,
                marginLeft: 8,
              }}>
                <ThemedText style={{ fontSize: 10, color: '#FFF', textTransform: 'uppercase' }}>
                  {recommendation.priority}
                </ThemedText>
              </View>

              {/* Create Task Button */}
              <TouchableOpacity
                style={{
                  padding: 8,
                  marginLeft: 8,
                }}
                onPress={() => {
                  setSelectedRecommendation(recommendation);
                  setIsModalVisible(true);
                }}
              >
                <MaterialIcons name="add-task" size={20} color={themeColor} />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      <CreateTaskModal
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onSubmit={handleCreateTask}
        isSubmitting={isCreatingTask}
        quests={quests}
        recommendation={selectedRecommendation || undefined}
      />
    </View>
  );
}