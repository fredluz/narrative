import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { Card, Button } from 'react-native-paper';
import { useTheme } from '@/contexts/ThemeContext';
import { performanceLogger } from '@/utils/performanceLogger';
import { MaterialIcons } from '@expo/vector-icons';

type MetricsDisplay = {
  operation: string;
  calls: number;
  totalDuration: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
};

export default function LogsScreen() {
  const { themeColor, secondaryColor } = useTheme();
  const [metrics, setMetrics] = useState<MetricsDisplay[]>([]);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof MetricsDisplay;
    direction: 'asc' | 'desc';
  }>({ key: 'totalDuration', direction: 'desc' });

  useEffect(() => {
    // Get metrics and update state
    const currentMetrics = performanceLogger.getMetrics() as MetricsDisplay[];
    setMetrics(currentMetrics);

    // Set up interval to refresh metrics
    const interval = setInterval(() => {
      const updatedMetrics = performanceLogger.getMetrics() as MetricsDisplay[];
      setMetrics(updatedMetrics);
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, []);

  const handleSort = (key: keyof MetricsDisplay) => {
    setSortConfig(current => ({
      key,
      direction:
        current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleReset = () => {
    performanceLogger.reset();
    setMetrics([]);
  };

  const sortedMetrics = [...metrics].sort((a, b) => {
    if (sortConfig.direction === 'asc') {
      return a[sortConfig.key] > b[sortConfig.key] ? 1 : -1;
    }
    return a[sortConfig.key] < b[sortConfig.key] ? 1 : -1;
  });

  const formatDuration = (ms: number) => {
    if (ms < 1) return '< 1ms';
    if (ms < 1000) return `${ms.toFixed(2)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#1a1a1a' }}>
      <ScrollView>
        <View style={{ padding: 16 }}>
          <View style={{ 
            flexDirection: 'row', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: 16 
          }}>
            <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold' }}>
              Performance Logs
            </Text>
            <Button 
              mode="contained" 
              onPress={handleReset}
              buttonColor={themeColor}
              textColor="#fff"
            >
              Reset Metrics
            </Button>
          </View>

          <Card style={{ 
            backgroundColor: '#252525',
            marginBottom: 16,
            borderRadius: 8,
            borderLeftWidth: 3,
            borderLeftColor: themeColor
          }}>
            <Card.Content>
              <Text style={{ color: '#fff', fontSize: 20, marginBottom: 8 }}>
                Performance Metrics
              </Text>
              <Text style={{ color: '#aaa', fontSize: 14, marginBottom: 16 }}>
                Real-time operation timing data
              </Text>

              {/* Header Row */}
              <View style={{ 
                flexDirection: 'row', 
                borderBottomWidth: 1,
                borderBottomColor: '#444',
                paddingBottom: 8,
                marginBottom: 8
              }}>
                <Pressable 
                  onPress={() => handleSort('operation')}
                  style={{ flex: 2, flexDirection: 'row', alignItems: 'center' }}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>Operation</Text>
                  {sortConfig.key === 'operation' && (
                    <MaterialIcons 
                      name={sortConfig.direction === 'asc' ? 'arrow-upward' : 'arrow-downward'} 
                      size={16} 
                      color={themeColor}
                      style={{ marginLeft: 4 }}
                    />
                  )}
                </Pressable>
                <Pressable 
                  onPress={() => handleSort('calls')}
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>Calls</Text>
                  {sortConfig.key === 'calls' && (
                    <MaterialIcons 
                      name={sortConfig.direction === 'asc' ? 'arrow-upward' : 'arrow-downward'} 
                      size={16} 
                      color={themeColor}
                      style={{ marginLeft: 4 }}
                    />
                  )}
                </Pressable>
                <Pressable 
                  onPress={() => handleSort('avgDuration')}
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>Avg</Text>
                  {sortConfig.key === 'avgDuration' && (
                    <MaterialIcons 
                      name={sortConfig.direction === 'asc' ? 'arrow-upward' : 'arrow-downward'} 
                      size={16} 
                      color={themeColor}
                      style={{ marginLeft: 4 }}
                    />
                  )}
                </Pressable>
                <Pressable 
                  onPress={() => handleSort('totalDuration')}
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>Total</Text>
                  {sortConfig.key === 'totalDuration' && (
                    <MaterialIcons 
                      name={sortConfig.direction === 'asc' ? 'arrow-upward' : 'arrow-downward'} 
                      size={16} 
                      color={themeColor}
                      style={{ marginLeft: 4 }}
                    />
                  )}
                </Pressable>
              </View>

              {/* Metrics Rows */}
              {sortedMetrics.map((metric, index) => (
                <View 
                  key={metric.operation}
                  style={{ 
                    flexDirection: 'row',
                    paddingVertical: 8,
                    borderBottomWidth: index < sortedMetrics.length - 1 ? 1 : 0,
                    borderBottomColor: '#333',
                    opacity: metric.calls === 0 ? 0.5 : 1
                  }}
                >
                  <View style={{ flex: 2 }}>
                    <Text style={{ color: secondaryColor }}>{metric.operation}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#fff' }}>{metric.calls}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#fff' }}>{formatDuration(metric.avgDuration)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#fff' }}>{formatDuration(metric.totalDuration)}</Text>
                  </View>
                </View>
              ))}

              {metrics.length === 0 && (
                <Text style={{ color: '#666', textAlign: 'center', paddingVertical: 16 }}>
                  No metrics recorded yet
                </Text>
              )}
            </Card.Content>
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}