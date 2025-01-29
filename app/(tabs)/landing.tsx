import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, ScrollView } from 'react-native';
import { Card } from 'react-native-paper';
import  styles from '../styles/global.js';
import { MainQuest, KanbanBoard } from '../types';



export default function LandingPage() {
  const [themeColor, setThemeColor] = useState('#00008B');
  const [taskListVisible, setTaskListVisible] = useState(true);
  const userName = "Fred";
  const tasks = [
    { id: 1, title: "Refill Medication", deadline: "Today 3PM", location: "Pharmacy", quest: "Filler Episode" },
    { id: 2, title: "Get Feedback", deadline: "Today 9 PM", location: "Desktop PC", quest: "I, Robot" },
    { id: 3, title: "Do Laundry", deadline: "Tommorrow 11 AM", location: "Home", quest: "Filler Episode" },
    { id: 6, title: "Get Ready for Date with Sam", deadline: "Tommorrow 6PM", location: "Home", quest: "Could you be Loved?" },
    { id: 4, title: "Get Database Up", deadline: "Monday 9 PM", location: "Desktop PC", quest: "I, Robot" },
    { id: 5, title: "Set Up API", deadline: "Tuesday 9 PM", location: "Desktop PC", quest: "I, Robot" },
    { id: 7, title: "Set Up User Authentication", deadline: "Thursday 9 PM", location: "Desktop PC", quest: "Build AI Companion" },
  ];
  
  const mainQuest: MainQuest = {
    title: "Build AI Companion - Week 2",
    progress: "20%",
    kanban: {
      ToDo: ["Set Up API", "Set Up User Authentication"],
      InProgress: ["Get Feedback", "Get Database Up"],
      Done: ["Make UI Mockups"]
    }

  };
  
  const recentMessages = [
    { sender: "Batcomputer", message: "Welcome back, Fred." },
    { sender: "Batcomputer", message: "You've got technical tasks for today: getting feedback and making the database work. Also, today's your last day to get your medication refilled. The pharmacy closes at 3PM - less than 2 hours from now." },
    { sender: "Batcomputer", message: "Which task would you like to tackle first?" },
    { sender: "You", message: "I'm thinking feedback, I don't feel like going out right now." },
    { sender: "System", message: "*reading details for 'Build AI Companion'*" },
    { sender: "Batcomputer", message: "Well, then start by getting Mike and Liz's input with a quick text or call." },
    { sender: "Batcomputer", message: "But please don't forget about getting your medication - I'll remind you again in an hour." },
  ];

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
        <Card style={[styles.chatCard, { borderColor: themeColor, borderWidth: 2, flex: 1 }]}> 
          <Text style={styles.cardTitle}>Direct Messages</Text>
          <ScrollView style={styles.chatScroll}>
            {recentMessages.map((msg, index) => (
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
      </View>
      
      {/* Right Column: Collapsible Task List */}
      <View style={styles.column}>
        <TouchableOpacity 
          onPress={() => setTaskListVisible(!taskListVisible)} 
          style={[styles.toggleButton, { backgroundColor: themeColor }]}>
          <Text style={styles.toggleButtonText}>{taskListVisible ? "Hide Tasks" : "Show Upcoming Tasks"}</Text>
        </TouchableOpacity>
        {taskListVisible && (
          <View style={styles.taskContainer}>
            <FlatList
              data={tasks}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <Card style={[styles.taskCard, { borderColor: themeColor, borderWidth: 2 }]}> 
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardDetails}>Due: {item.deadline} ({item.location})</Text>
                  <Text style={styles.cardQuest}>Quest: {item.quest}</Text>
                </Card>
              )}
            />
          </View>
        )}
      </View>
    </View>
  );
}
