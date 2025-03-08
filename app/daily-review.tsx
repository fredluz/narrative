import React, { useState, useEffect } from 'react';
import { View, ScrollView, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useJournal } from '@/hooks/useJournal';
import { DailyReview, EndOfDayReviewService } from '@/services/EndOfDayReviewService';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DailyHeader } from '@/components/daily-review/DailyHeader';
import { CheckupTimeline } from '@/components/daily-review/CheckupTimeline';
import { TaskProgress } from '@/components/daily-review/TaskProgress';
import { AIAnalysis } from '@/components/journal/AIAnalysis';
import { ThemedText } from '@/components/ui/ThemedText';
import { journalStyles } from '@/app/styles/journalStyles';

export default function DailyReviewScreen() {
  const { themeColor, secondaryColor } = useTheme();
  const { currentDate } = useJournal();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState<DailyReview | null>(null);

  useEffect(() => {
    const loadReview = async () => {
      try {
        setLoading(true);
        setError(null);
        const dateStr = currentDate.toISOString().split('T')[0];
        const dailyReview = await EndOfDayReviewService.getDailyReview(dateStr);
        setReview(dailyReview);
      } catch (error) {
        console.error('Error loading daily review:', error);
        setError(error instanceof Error ? error.message : 'Failed to load daily review');
      } finally {
        setLoading(false);
      }
    };

    loadReview();
  }, [currentDate]);

  if (loading) {
    return (
      <SafeAreaView style={journalStyles.container}>
        <View style={[journalStyles.contentContainer, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color={themeColor} />
          <ThemedText style={{ marginTop: 10, color: '#AAA' }}>Loading your daily review...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={journalStyles.container}>
        <View style={[journalStyles.contentContainer, { justifyContent: 'center', alignItems: 'center' }]}>
          <MaterialIcons name="error-outline" size={32} color="#F44336" />
          <ThemedText style={{ marginTop: 10, color: '#F44336', textAlign: 'center' }}>
            {error}
          </ThemedText>
          <ThemedText style={{ marginTop: 5, color: '#AAA', textAlign: 'center' }}>
            Try refreshing the page or contact support if the problem persists.
          </ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  if (!review) {
    return (
      <SafeAreaView style={journalStyles.container}>
        <View style={[journalStyles.contentContainer, { justifyContent: 'center', alignItems: 'center' }]}>
          <MaterialIcons name="info-outline" size={32} color={secondaryColor} />
          <ThemedText style={{ marginTop: 10, color: secondaryColor, textAlign: 'center' }}>
            No review data available for this date.
          </ThemedText>
          <ThemedText style={{ marginTop: 5, color: '#AAA', textAlign: 'center' }}>
            Complete some checkups or tasks to generate a daily review.
          </ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={journalStyles.container}>
      <ScrollView style={{ flex: 1 }}>
        <View style={journalStyles.contentContainer}>
          {/* Header with Stats */}
          <DailyHeader
            stats={review.stats}
            themeColor={themeColor}
            secondaryColor={secondaryColor}
            date={currentDate}
          />

          {/* Timeline of Checkups */}
          {review.checkups.length > 0 ? (
            <View style={{ marginTop: 20 }}>
              <CheckupTimeline
                checkups={review.checkups}
                themeColor={themeColor}
                secondaryColor={secondaryColor}
              />
            </View>
          ) : (
            <View style={{
              marginTop: 20,
              backgroundColor: 'rgba(20, 20, 20, 0.7)',
              padding: 15,
              borderRadius: 8,
              borderLeftWidth: 3,
              borderLeftColor: themeColor,
              alignItems: 'center'
            }}>
              <MaterialIcons name="question-answer" size={24} color={themeColor} style={{ marginBottom: 8 }} />
              <ThemedText style={{ color: '#AAA', textAlign: 'center' }}>
                No checkups recorded today. Regular check-ins help track your progress and mood throughout the day.
              </ThemedText>
            </View>
          )}

          {/* Task Progress */}
          <View style={{ marginTop: 20 }}>
            <TaskProgress
              tasks={review.tasks}
              themeColor={themeColor}
              secondaryColor={secondaryColor}
            />
          </View>

          {/* Johnny's Analysis */}
          <View style={{ marginTop: 20 }}>
            <AIAnalysis
              analysis={review.analysis}
              loading={false}
              themeColor={themeColor}
              expanded={true}
            />
          </View>

          {/* Tomorrow's Preview */}
          {review.tomorrowTasks && review.tomorrowTasks.length > 0 && (
            <View style={{
              marginTop: 20,
              backgroundColor: 'rgba(20, 20, 20, 0.7)',
              padding: 15,
              borderRadius: 8,
              borderLeftWidth: 3,
              borderLeftColor: secondaryColor,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
                <MaterialIcons name="next-plan" size={20} color={secondaryColor} />
                <ThemedText style={{
                  fontSize: 16,
                  fontWeight: 'bold',
                  color: secondaryColor,
                  marginLeft: 8,
                }}>
                  TOMORROW'S TASKS
                </ThemedText>
              </View>
              
              {review.tomorrowTasks.map(task => (
                <View 
                  key={task.id}
                  style={{
                    backgroundColor: 'rgba(30, 30, 30, 0.7)',
                    padding: 12,
                    borderRadius: 4,
                    marginBottom: 8,
                    borderLeftWidth: 3,
                    borderLeftColor: themeColor,
                  }}
                >
                  <ThemedText style={{ color: '#E0E0E0', fontSize: 14 }}>
                    {task.title}
                  </ThemedText>
                  {task.quest && (
                    <ThemedText style={{ color: '#AAA', fontSize: 12, marginTop: 4 }}>
                      Quest: {task.quest.title}
                    </ThemedText>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}