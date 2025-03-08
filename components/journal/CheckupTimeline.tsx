import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ui/ThemedText';
import type { CheckupEntry } from '@/services/journalService';

interface CheckupTimelineProps {
  checkups: CheckupEntry[];
  themeColor: string;
  secondaryColor: string;
}

export function CheckupTimeline({ checkups, themeColor, secondaryColor }: CheckupTimelineProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialIcons name="timeline" size={20} color={themeColor} />
        <ThemedText style={[styles.headerText, { color: themeColor }]}>
          TODAY'S CHECKUPS
        </ThemedText>
      </View>

      <ScrollView style={styles.timeline}>
        {checkups.map((checkup, index) => {
          const time = new Date(checkup.created_at).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          });

          return (
            <View key={checkup.id} style={styles.timelineEntry}>
              {/* Time Marker */}
              <View style={styles.timeColumn}>
                <ThemedText style={styles.timeText}>{time}</ThemedText>
                <View style={[styles.timelineDot, { backgroundColor: themeColor }]} />
                {index < checkups.length - 1 && (
                  <View style={[styles.timelineConnector, { backgroundColor: themeColor }]} />
                )}
              </View>

              {/* Content */}
              <View style={styles.contentColumn}>
                {/* User's Checkup */}
                <View style={[styles.checkupBubble, { borderLeftColor: themeColor }]}>
                  <ThemedText style={styles.checkupText}>
                    {checkup.content}
                  </ThemedText>
                </View>

                {/* Johnny's Response */}
                {checkup.ai_checkup_response && (
                  <View style={[styles.responseBubble, { borderLeftColor: secondaryColor }]}>
                    <MaterialIcons 
                      name="psychology" 
                      size={16} 
                      color={secondaryColor}
                      style={styles.responseIcon} 
                    />
                    <ThemedText style={styles.responseText}>
                      {checkup.ai_checkup_response}
                    </ThemedText>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(20, 20, 20, 0.7)',
    borderRadius: 8,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  timeline: {
    maxHeight: 400,
  },
  timelineEntry: {
    flexDirection: 'row',
    padding: 15,
  },
  timeColumn: {
    width: 60,
    alignItems: 'center',
  },
  timeText: {
    color: '#AAA',
    fontSize: 12,
    marginBottom: 8,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  timelineConnector: {
    width: 2,
    flex: 1,
    marginTop: 4,
    opacity: 0.3,
  },
  contentColumn: {
    flex: 1,
    marginLeft: 15,
  },
  checkupBubble: {
    backgroundColor: 'rgba(30, 30, 30, 0.7)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
  },
  checkupText: {
    color: '#E0E0E0',
    fontSize: 14,
    lineHeight: 20,
  },
  responseBubble: {
    backgroundColor: 'rgba(30, 30, 30, 0.7)',
    borderRadius: 8,
    padding: 12,
    marginLeft: 20,
    marginBottom: 8,
    borderLeftWidth: 3,
  },
  responseIcon: {
    position: 'absolute',
    top: 8,
    left: -28,
    backgroundColor: 'rgba(20, 20, 20, 0.7)',
    padding: 4,
    borderRadius: 12,
  },
  responseText: {
    color: '#BBB',
    fontSize: 13,
    lineHeight: 18,
    fontStyle: 'italic',
  },
});