import React, { useState, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, ScrollView, Animated, useWindowDimensions, Platform } from 'react-native';
import { Card } from 'react-native-paper';
import  styles from '../styles/global.js';
import { MainQuest, KanbanBoard, ChatMessage } from '../types';
import * as Font from 'expo-font';
import {
  useFonts,
  Inter_400Regular,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  Poppins_400Regular,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';




const MobileNavigation: React.FC<{ onPress: (screen: string) => void, activeScreen: string }> = ({ onPress, activeScreen }) => (
  <View style={styles.mobileNavigation}>
    <TouchableOpacity 
      style={[styles.mobileNavButton, activeScreen === 'chat' && styles.mobileNavButtonActive]} 
      onPress={() => onPress('chat')}>
      <Text style={styles.mobileNavText}>Chat</Text>
    </TouchableOpacity>
    <TouchableOpacity 
      style={[styles.mobileNavButton, activeScreen === 'tasks' && styles.mobileNavButtonActive]} 
      onPress={() => onPress('tasks')}>
      <Text style={styles.mobileNavText}>Tasks</Text>
    </TouchableOpacity>
    <TouchableOpacity 
      style={[styles.mobileNavButton, activeScreen === 'quests' && styles.mobileNavButtonActive]} 
      onPress={() => onPress('quests')}>
      <Text style={styles.mobileNavText}>Quests</Text>
    </TouchableOpacity>
    <TouchableOpacity 
      style={[styles.mobileNavButton, activeScreen === 'stats' && styles.mobileNavButtonActive]} 
      onPress={() => onPress('stats')}>
      <Text style={styles.mobileNavText}>Stats</Text>
    </TouchableOpacity>
  </View>
);

interface ChatInterfaceProps {
  themeColor: string;
  recentMessages: ChatMessage[];
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ themeColor, recentMessages }) => (
  <Card style={[styles.chatCard, { borderColor: themeColor, borderWidth: 2, flex: 1 }]}> 
    <Text style={styles.cardTitle}>Direct Messages</Text>
    <ScrollView style={styles.chatScroll}>
      {recentMessages.map((msg: ChatMessage, index: number) => (
        <View key={index} style={msg.sender === "You" ? styles.userMessage : styles.aiMessage}>
          <Text style={styles.messageSender}>{msg.sender}</Text>
          <Text style={styles.messageText}>{msg.message}</Text>
        </View>
      ))}
    </ScrollView>
    <TextInput 
      style={styles.chatInput} 
      placeholder='Type a message...' 
      placeholderTextColor='#AAA'
    />
  </Card>
);

export default function HomeScreen() {
  
  let [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_700Bold,
    Poppins_400Regular,
    Poppins_700Bold,
  });
  const { width } = useWindowDimensions();
  const isMobile = Platform.OS === 'ios' || Platform.OS === 'android' || width < 768;
  const [themeColor, setThemeColor] = useState('#00008B');
  const [taskListVisible, setTaskListVisible] = useState(true);
  const animatedHeight = useRef(new Animated.Value(1)).current;
  const userName = "Fred";
  const tasks = [
    { id: 1, title: "Get Ready for Date with Sam", scheduledFor: "Today 6PM", deadline: "Today 7:30PM", location: "Home", quest: "Could You Be Loved?" },
    { id: 2, title: "Get Feedback", scheduledFor: "Today 9PM", location: "Desktop PC", quest: "I, Robot" },
    { id: 3, title: "Do Laundry", scheduledFor: "Tomorrow 11AM", deadline: "Tomorrow 4PM", location: "Home", quest: "Routine" },
    { id: 4, title: "Get Database Up", scheduledFor: "Monday 9AM", location: "Desktop PC", quest: "I, Robot" },
    { id: 5, title: "Prepare Meeting with Investors", scheduledFor: "Tuesday 3PM", deadline: "Wednesday 3PM", location: "Desktop PC", quest: "I, Robot" },
    { id: 7, title: "Set Up User Authentication", scheduledFor: "Thursday 9PM", location: "Desktop PC", quest: "I, Robot" },
  ];
  
  const mainQuest: MainQuest = {
    title: "I, Robot - Week 2",
    progress: "20%",
    kanban: {
      ToDo: ["Zoom Meeting with Investors", "Set Up User Authentication"],
      InProgress: ["Get Feedback", "Get Database Up"],
      Done: ["Make UI Mockups"]
    }

  };
  
  const recentMessages = [
    { sender: "Batcomputer", message: "Welcome back, Fred." },
    { sender: "Batcomputer", message: "You've got technical tasks for today: getting feedback and making the database work. Also, don't forget about your date tonight." },
    { sender: "Batcomputer", message: "Which task would you like to tackle first?" },
    { sender: "You", message: "I'm thinking about getting the database running, but I'm worried I'll get distracted and miss my date." },
    { sender: "System", message: "*reading details for 'Build AI Companion'*" },
    {sender: "Batcomputer", message: "Don't worry, I'll remind you when it's time to get ready. For now, you can start working on your app." },
  ];

  const toggleTaskList = () => {
    const toValue = taskListVisible ? 0 : 1;
    setTaskListVisible(!taskListVisible);
    
    Animated.timing(animatedHeight, {
      toValue: toValue,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const [activeScreen, setActiveScreen] = useState('chat');

  if (isMobile) {
    return (
      <View style={[styles.container, { backgroundColor: '#181818' }]}>
        <View style={styles.mobileHeader}>
          <Text style={styles.mobileHeaderText}>QuestLog</Text>
        </View>
        
        <View style={styles.mobileContent}>
          {activeScreen === 'chat' && (
            <ChatInterface themeColor={themeColor} recentMessages={recentMessages} />
          )}
          {activeScreen === 'tasks' && (
            <FlatList
              data={tasks}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <Card style={[styles.taskCard, { borderColor: themeColor, borderWidth: 2 }]}> 
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardDetails}>Start: {item.scheduledFor}</Text>
                  {item.deadline && (
                    <Text style={[styles.cardDetails, { color: '#FF4444' }]}>
                      Deadline: {item.deadline}
                    </Text>
                  )}
                </Card>
              )}
            />
          )}
          {activeScreen === 'quests' && (
            <Text style={styles.placeholderText}>Quests Coming Soon!</Text>
          )}
          {activeScreen === 'stats' && (
            <Text style={styles.placeholderText}>Stats Coming Soon!</Text>
          )}
        </View>
        
        <MobileNavigation onPress={setActiveScreen} activeScreen={activeScreen} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: '#181818' }]}> 
      {/* Theme Color Selector */}
      <View style={styles.themeSelector}>
        <Text style={{ color: 'white' }}>Select Theme Color:</Text>
        <TextInput
          style={styles.colorInput}
          placeholder='Enter color hex'
          placeholderTextColor='#888'
          onChangeText={(text) => setThemeColor(text)}
        />
      </View>
      
      {/* Left Column: Kanban */}
      <View style={styles.column}>
        <Card style={[styles.mainQuestCard, { borderColor: themeColor, borderWidth: 2 }]}> 
          <Text style={styles.mainQuestTitle}>{mainQuest.title}</Text>
          <Text style={styles.cardDetails}>Progress: {mainQuest.progress}</Text>
          <View style={styles.kanbanContainer}>
            {(Object.keys(mainQuest.kanban) as Array<keyof KanbanBoard>).map((status) => (
              <View key={status} style={styles.kanbanColumn}>
                <Text style={styles.kanbanTitle}>{status.replace(/([A-Z])/g, ' $1')}</Text>
                {mainQuest.kanban[status].map((task, index) => (
                  <Card key={index} style={styles.kanbanTaskCard}>
                    <Text style={styles.kanbanTask}>{task}</Text>
                  </Card>
                ))}
              </View>
            ))}
          </View>
        </Card>
      </View>

      {/* Middle Column: Chat */}
      <View style={styles.column}>
        <ChatInterface themeColor={themeColor} recentMessages={recentMessages} />
      </View>
      
      {/* Right Column: Collapsible Task List */}
      <View style={styles.column}>
        <TouchableOpacity 
          onPress={toggleTaskList} 
          style={[styles.toggleButton, { backgroundColor: themeColor }]}>
          <Text style={styles.toggleButtonText}>{taskListVisible ? "Hide Tasks" : "Show Upcoming Tasks"}</Text>
        </TouchableOpacity>
        <Animated.View style={[
          styles.taskContainer,
          {
            maxHeight: animatedHeight.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%']
            }),
            opacity: animatedHeight
          }
        ]}>
          <FlatList
            data={tasks}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <Card style={[styles.taskCard, { borderColor: themeColor, borderWidth: 2 }]}> 
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardDetails}>Start: {item.scheduledFor} ({item.location})</Text>
                {item.deadline && (
                  <Text style={[styles.cardDetails, { color: '#FF4444' }]}>Deadline: {item.deadline}</Text>
                )}
                <Text style={styles.cardQuest}>Quest: {item.quest}</Text>
              </Card>
            )}
          />
        </Animated.View>
      </View>
    </View>
  );
}
