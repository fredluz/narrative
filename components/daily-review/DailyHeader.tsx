import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ui/ThemedText';
import { DailyStats } from '@/services/EndOfDayReviewService';

interface DailyHeaderProps {
  stats: DailyStats;
  themeColor: string;
  secondaryColor: string;
  date: Date;
}

export function DailyHeader({ stats, themeColor, secondaryColor, date }: DailyHeaderProps) {
  const getProductivityColor = (score: number) => {
    if (score >= 80) return '#4CAF50';
    if (score >= 60) return '#FFC107';
    if (score >= 40) return '#FF9800';
    return '#F44336';
  };

  const getMoodEmoji = (score: number) => {
    if (score >= 80) return '😁';
    if (score >= 60) return '🙂';
    if (score >= 40) return '😐';
    return '😕';
  };

  return (
    <View style={styles.container}>
      {/* Date and Mood Row */}
      <View style={styles.headerRow}>
        <View>
          <ThemedText style={[styles.dateText, { color: themeColor }]}>
            {date.toLocaleDateString('en-US', { 
              weekday: 'long',
              month: 'long',
              day: 'numeric'
            })}
          </ThemedText>
          <ThemedText style={styles.subText}>End of Day Review</ThemedText>
        </View>
        <View style={[styles.moodContainer, { borderColor: secondaryColor }]}>
          <ThemedText style={styles.moodEmoji}>{getMoodEmoji(stats.mood)}</ThemedText>
          <ThemedText style={[styles.moodScore, { color: secondaryColor }]}>
            {stats.mood}%
          </ThemedText>
        </View>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        {/* Productivity Score */}
        <View style={[styles.statBox, { borderColor: getProductivityColor(stats.productivity) }]}>
          <MaterialIcons 
            name="trending-up" 
            size={24} 
            color={getProductivityColor(stats.productivity)} 
          />
          <ThemedText style={[styles.statValue, { color: getProductivityColor(stats.productivity) }]}>
            {stats.productivity}%
          </ThemedText>
          <ThemedText style={styles.statLabel}>Productivity</ThemedText>
        </View>

        {/* Tasks Completed */}
        <View style={[styles.statBox, { borderColor: themeColor }]}>
          <MaterialIcons name="check-circle" size={24} color={themeColor} />
          <ThemedText style={[styles.statValue, { color: themeColor }]}>
            {stats.tasksCompleted}
          </ThemedText>
          <ThemedText style={styles.statLabel}>Completed</ThemedText>
        </View>

        {/* Tasks In Progress */}
        <View style={[styles.statBox, { borderColor: secondaryColor }]}>
          <MaterialIcons name="pending" size={24} color={secondaryColor} />
          <ThemedText style={[styles.statValue, { color: secondaryColor }]}>
            {stats.tasksInProgress}
          </ThemedText>
          <ThemedText style={styles.statLabel}>In Progress</ThemedText>
        </View>

        {/* Checkups */}
        <View style={[styles.statBox, { borderColor: themeColor }]}>
          <MaterialIcons name="psychology" size={24} color={themeColor} />
          <ThemedText style={[styles.statValue, { color: themeColor }]}>
            {stats.checkupsCount}
          </ThemedText>
          <ThemedText style={styles.statLabel}>Checkups</ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(20, 20, 20, 0.7)',
    borderRadius: 8,
    padding: 15,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  dateText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  subText: {
    fontSize: 14,
    color: '#AAA',
    marginTop: 4,
  },
  moodContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 30, 30, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  moodEmoji: {
    fontSize: 24,
    marginRight: 8,
  },
  moodScore: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
  },
  statBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'rgba(30, 30, 30, 0.7)',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderLeftWidth: 3,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#AAA',
  },
});