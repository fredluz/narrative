import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform,
  Animated,
  FlatList
} from 'react-native';
import { Card } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import styles, { colors } from '@/app/styles/global';
import { ChatMessage } from '@/app/types';
import { useTheme } from '@/contexts/ThemeContext';
import { useSuggestions } from '@/contexts/SuggestionContext';
import TriangularSpinner from '../loading/TriangularSpinner';
import CompactTaskSuggestion from '../suggestions/CompactTaskSuggestion';
import { TaskSuggestion, QuestSuggestion } from '@/services/agents/SuggestionAgent';
import { CreateTaskModal } from '@/components/modals/CreateTaskModal';
import { fetchQuests } from '@/services/questsService';
import { useAuth } from '@clerk/clerk-expo'; // Import useAuth from Clerk
import { personalityService } from '@/services/personalityService';
import { ActivityIndicator } from 'react-native';

interface Props {
  recentMessages: ChatMessage[];
  onSendMessage?: (message: string, userId: string) => Promise<void>;
  handleTyping?: (text: string) => void;
  isTyping?: boolean;
  sessionEnded?: boolean;
  checkupCreated?: boolean;
  onEndSession?: () => void;
  onDeleteMessages?: () => void;
  userId: string;
}

export function ChatInterface({ 
  recentMessages,
  onSendMessage, 
  handleTyping,
  isTyping, 
  sessionEnded,
  checkupCreated,
  onEndSession,
  onDeleteMessages,
  userId
}: Props) {
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isProcessingSession, setIsProcessingSession] = useState(false);
  const [isEndingSession, setIsEndingSession] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const { themeColor, secondaryColor } = useTheme();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentTaskModal, setCurrentTaskModal] = useState<TaskSuggestion | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [quests, setQuests] = useState<Array<{ id: number; title: string }>>([]);
  const { userId: authUserId } = useAuth(); // Get logged-in user's ID
  const [personalityName, setPersonalityName] = useState('ASSISTANT');

  // Define message status colors
  const messageColors = {
    user: themeColor,
    assistant: secondaryColor,
    error: '#FF6B6B',
    info: '#64B5F6'
  };

  // Get task and quest suggestions from context
  const { 
    taskSuggestions, 
    questSuggestions,
    acceptTaskSuggestion, 
    rejectTaskSuggestion, 
    upgradeTaskToQuest,
    rejectQuestSuggestion,
    acceptQuestSuggestion,
    isAcceptingTask,
    isAcceptingQuest,
    } = useSuggestions();

  // Load quests for task modal
  useEffect(() => {
    const loadQuests = async () => {
      if (userId) {
        try {
          const loadedQuests = await fetchQuests(userId);
          setQuests(loadedQuests);
        } catch (err) {
          console.error('Error loading quests:', err);
        }
      }
    };
    
    loadQuests();
  }, [userId]);

  // Add logging when suggestions change
  useEffect(() => {
    console.log('🎯 [ChatInterface] Suggestion state updated:', {
      taskCount: taskSuggestions.length,
      questCount: questSuggestions.length,
    });
  }, [taskSuggestions, questSuggestions]);
  
  // Handle task suggestion actions with logging
  const handleAcceptTask = (task: TaskSuggestion) => {
    console.log('✅ [ChatInterface] Accepting task:', task.title);
    if (userId) {
      setIsSubmitting(true);
      acceptTaskSuggestion(task)
        .finally(() => {
          setIsSubmitting(false);
        });
    }
  };
  
  const handleRejectTask = (taskId: string) => {
    console.log('❌ [ChatInterface] Rejecting task:', taskId);
    rejectTaskSuggestion(taskId);
  };
  
  const handleUpgradeTask = (task: TaskSuggestion) => {
    console.log('⬆️ [ChatInterface] Upgrading task to quest:', task.title);
    upgradeTaskToQuest(task);
  };
  
  // New method to handle expanding a task suggestion to show details modal
  const handleExpandTask = (task: TaskSuggestion) => {
    console.log('🔍 [ChatInterface] Expanding task suggestion:', task.title);
    setCurrentTaskModal(task);
    setShowTaskModal(true);
  };

  // Handle creating a task from the suggestion in the modal
  const handleCreateTaskFromSuggestion = async (formData: any) => {
    try {
      setIsSubmitting(true);
      console.log('📝 [ChatInterface] Creating task from suggestion with form data:', formData);
      
      if (currentTaskModal) {
        // Pass the form data rather than the original suggestion
        await acceptTaskSuggestion({
          ...currentTaskModal,
          ...formData
        });
        setCurrentTaskModal(null);
        setShowTaskModal(false);
      }
    } catch (error) {
      console.error('Error creating task from suggestion:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle quest suggestion actions with logging
  const handleAcceptQuest = (quest: QuestSuggestion) => {
    console.log('✅ [ChatInterface] Accepting quest:', quest.title);
    if (userId) {
      acceptQuestSuggestion(quest);
    }
  };
  
  const handleRejectQuest = (questId: string) => {
    console.log('❌ [ChatInterface] Rejecting quest:', questId);
    rejectQuestSuggestion(questId);
  };

  // Clear message when session ends
  useEffect(() => {
    if (sessionEnded) {
      setMessage('');
    }
  }, [sessionEnded]);
  
  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [recentMessages]);
  
  // Get bright accent color for better visibility
  const getBrightAccent = (baseColor: string) => {
    const hex = baseColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    if (r + g + b > 500) {
      return baseColor;
    }
    
    const brightR = Math.min(255, r + 100);
    const brightG = Math.min(255, g + 100);
    const brightB = Math.min(255, b + 100);
    
    return `#${brightR.toString(16).padStart(2, '0')}${
      brightG.toString(16).padStart(2, '0')}${
      brightB.toString(16).padStart(2, '0')}`;
  };
  
  const brightAccent = getBrightAccent(themeColor);

  const handleSend = async () => {
    if (message.trim() === '') return;
    
    if (!userId) {
      console.warn("User not logged in. Cannot send message.");
      setError("You must be logged in to send messages");
      return;
    }
    
    const messageToSend = message;
    setMessage('');
    
    if (onSendMessage) {
      try {
        await onSendMessage(messageToSend, userId);
      } catch (err) {
        console.error("Error sending message:", err);
        setError("Failed to send message");
      }
    }
  };

  const handleMessageChange = (text: string) => {
    setMessage(text);
    if (handleTyping) {
      handleTyping(text);
    }
  };

  const handleKeyPress = (e: any) => {
    if (e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  // Debug information for suggestions
  useEffect(() => {
    console.log("Available suggestions:", {
      taskCount: taskSuggestions.length,
      questCount: questSuggestions.length, 
    });
  }, [taskSuggestions, questSuggestions]);
  // Check if we have any suggestions to show
  const hasSuggestions = taskSuggestions.length > 0 || questSuggestions.length > 0 ;

  // Update session processing state when session ends
  useEffect(() => {
    if (sessionEnded && !checkupCreated) {
      setIsProcessingSession(true);
    } else if (checkupCreated) {
      setIsProcessingSession(false);
    }
  }, [sessionEnded, checkupCreated]);

  // Add a wrapper for the onEndSession callback
  const handleEndSession = () => {
    if (!isEndingSession && onEndSession) {
      setIsEndingSession(true);
      onEndSession();
    }
  };

  // Fetch personality based on the logged-in user's ID
  useEffect(() => {
    if (authUserId) {
      personalityService.getUserPersonality(authUserId)
        .then(personality => {
          switch(personality) {
            case 'johnny':
              setPersonalityName('SILVERHAND');
              break;
            case 'batman':
              setPersonalityName('BRUCE');
            case 'bt7274':
              setPersonalityName('TITAN');
              break;
            case 'bigBoss':
              setPersonalityName('BOSS');
              break;
            case 'narrator':
              setPersonalityName('NARRATOR');
              break;
            default:
              setPersonalityName('ASSISTANT');
          }
        })
        .catch(error => {
          console.error('Error getting personality:', error);
          setPersonalityName('ASSISTANT'); // Fallback to default
        });
    } else {
      // Reset personality if user logs out
      setPersonalityName('ASSISTANT');
    }
  }, [authUserId]); // Depend on the logged-in user's ID

  return (
    <>
      <Card style={{
        flex: 1,
        backgroundColor: '#1E1E1E',
        borderRadius: 8,
        borderWidth: 1, 
        borderColor: '#333333', 
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 3,
        },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 2,
      }}>
        {/* Chat header */}
        <View style={{ 
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 15,
          paddingVertical: 15,
          borderBottomWidth: 1,
          borderBottomColor: '#333333',
          backgroundColor: '#252525',
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <Text style={{ 
              fontSize: 18,
              fontWeight: 'bold',
              color: '#EEEEEE',
              letterSpacing: 0.5,
            }}>
              CHAT INTERFACE
            </Text>
            <View style={{
              height: 3,
              width: 20,
              backgroundColor: themeColor,
              marginLeft: 8,
              borderRadius: 2,
            }} />
            
            <TouchableOpacity 
              style={{
                marginLeft: 15,
                backgroundColor: 'rgba(33, 150, 243, 0.1)',
                borderWidth: 1,
                borderColor: secondaryColor,
                borderRadius: 4,
                paddingVertical: 4,
                paddingHorizontal: 8,
                flexDirection: 'row',
                alignItems: 'center',
                opacity: isEndingSession ? 0.5 : 1,
              }}
              onPress={handleEndSession}
              disabled={!userId || isEndingSession}
            >
              <MaterialIcons 
                name="timer-off" 
                size={16} 
                color={secondaryColor} 
                style={{ marginRight: 4 }} 
              />
              <Text style={{
                color: secondaryColor,
                fontSize: 12,
                fontWeight: 'bold',
              }}>
                Finish Chat
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <KeyboardAvoidingView 
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        >
          {/* Main content area - split into chat messages and suggestions */}
          <View style={{ flex: 1, flexDirection: 'column' }}>
            {/* Chat messages area - takes up most of the space */}
            <ScrollView 
              style={{ padding: 10, flex: 1, backgroundColor: '#1A1A1A' }} 
              contentContainerStyle={{ paddingBottom: 20 }}
              ref={scrollViewRef}
            >
              {/* Error message */}
              {error && (
                <View style={{
                  padding: 12,
                  marginVertical: 5,
                  borderRadius: 5,
                  backgroundColor: 'rgba(255, 107, 107, 0.1)',
                  borderWidth: 1,
                  borderColor: '#FF6B6B',
                  marginBottom: 16,
                  borderLeftWidth: 3,
                  borderLeftColor: '#FF6B6B',
                }}>
                  <Text style={{
                    color: '#FF6B6B',
                    fontSize: 14,
                    textAlign: 'center',
                  }}>
                    {error}
                  </Text>
                </View>
              )}

              {/* Messages */}
              {recentMessages.map((msg, index) => {
                let messageText = msg.message;
                if (!msg.is_user && messageText) {
                  messageText = messageText.replace(/^["']|["']$/g, '');
                  messageText = messageText.replace(/^Johnny Silverhand's response:\s*/i, '');
                }
                
                return (
                  <View 
                    key={`${msg.id}-${index}`}
                    style={[
                      {
                        padding: 12,
                        marginVertical: 5,
                        borderRadius: 5,
                        maxWidth: '85%',
                        backgroundColor: msg.is_user ? '#252525' : '#2C2C2C',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.2,
                        shadowRadius: 2,
                        elevation: 1,
                      },
                      !msg.is_user 
                        ? {
                            alignSelf: 'flex-start',
                            borderLeftWidth: 3,
                            borderColor: secondaryColor,
                            marginRight: '15%',
                            backgroundColor: 'rgba(33, 150, 243, 0.05)',
                          }
                        : {
                            alignSelf: 'flex-end',
                            borderLeftWidth: 3,
                            borderColor: themeColor,
                            marginLeft: '15%',
                            backgroundColor: 'rgba(76, 175, 80, 0.05)',
                          }
                    ]}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ 
                        color: !msg.is_user ? secondaryColor : themeColor,
                        fontWeight: 'bold',
                        fontSize: 12,
                        letterSpacing: 0.5,
                      }}>
                        {!msg.is_user ? personalityName : 'YOU'}
                      </Text>
                      <Text style={{ color: '#888888', fontSize: 10 }}>
                        {formatTimestamp(msg.updated_at)}
                      </Text>
                    </View>
                    <Text style={{ 
                      fontSize: 15,
                      color: '#DDDDDD',
                      lineHeight: 20,
                    }}>
                      {messageText}
                    </Text>
                  </View>
                );
              })}
              
              {/* Typing indicator */}
              {isTyping && (
                <View 
                  style={[
                    {
                      padding: 12,
                      marginVertical: 5,
                      borderRadius: 5,
                      maxWidth: '85%',
                      backgroundColor: 'rgba(33, 150, 243, 0.05)',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.2,
                      shadowRadius: 2,
                      elevation: 1,
                      alignSelf: 'flex-start',
                      borderLeftWidth: 3,
                      borderColor: secondaryColor,
                      marginRight: '15%',
                    },
                  ]}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ 
                      color: secondaryColor,
                      fontWeight: 'bold',
                      fontSize: 12,
                      letterSpacing: 0.5,
                    }}>
                      {personalityName}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4 }}>
                    <TriangularSpinner size={24} color={secondaryColor} />
                    <Text style={{ 
                      fontSize: 15,
                      color: '#BBBBBB',
                      marginLeft: 8,
                    }}>
                      typing
                    </Text>
                  </View>
                </View>
              )}
              
              {/* Session ended notification */}
              {sessionEnded && (
                <View style={{
                  marginTop: 20,
                  padding: 12,
                  borderRadius: 5,
                  backgroundColor: '#282828',
                  borderWidth: 1,
                  borderColor: '#444444',
                  borderLeftWidth: 3,
                  borderLeftColor: messageColors.info,
                }}>
                  <Text style={{
                    color: '#BBBBBB',
                    fontSize: 16,
                    textAlign: 'center',
                    marginBottom: 8,
                  }}>
                    Session ended
                  </Text>
                  
                  {isProcessingSession ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 8 }}>
                      <TriangularSpinner size={16} color={messageColors.info} />
                      <Text style={{
                        color: '#999999',
                        fontSize: 14,
                        textAlign: 'center',
                        marginLeft: 8,
                      }}>
                        Processing conversation...
                      </Text>
                    </View>
                  ) : checkupCreated && (
                    <View style={{ marginTop: 8 }}>
                      <Text style={{
                        color: '#BBBBBB',
                        fontSize: 14,
                        textAlign: 'center',
                        marginBottom: 8,
                      }}>
                        A checkup entry has been created in your journal based on this conversation.
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </ScrollView>
            
            {hasSuggestions && (
              <View style={{
                flex: 1, // Allow this view to grow
                borderTopWidth: 1,
                borderTopColor: '#333333',
                backgroundColor: '#232323',
              }}>
                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingHorizontal: 15,
                  paddingVertical: 8,
                  backgroundColor: '#252525',
                  borderBottomWidth: 1,
                  borderBottomColor: '#333333',
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <MaterialIcons name="lightbulb" size={16} color="#FFD700" />
                    <Text style={{
                      marginLeft: 6,
                      color: '#EEEEEE',
                      fontWeight: 'bold',
                      fontSize: 14,
                    }}>
                      Suggestions ({taskSuggestions.length + questSuggestions.length})
                    </Text>
                  </View>
                </View>

                <ScrollView
                  horizontal={false}
                  style={{
                    // Remove maxHeight to allow full vertical scroll
                    backgroundColor: '#1A1A1A',
                  }}
                  contentContainerStyle={{
                    padding: 10,
                    paddingBottom: 15,
                  }}
                >
                  {/* --- NEW RENDERING LOGIC --- */}
                  {(() => {
                    const renderedTaskIds = new Set<string>(); // Keep track of tasks rendered under quests

                    return (
                      <>
                        {/* 1. Render Quests and their Associated Pending Tasks */}
                        {questSuggestions.map((quest) => {
                          const isAcceptingThisQuest = isAcceptingQuest === quest.id;
                          const associatedTasks = (quest.pendingTaskClientIds || [])
                            .map(taskId => taskSuggestions.find(t => t.id === taskId))
                            .filter((t): t is TaskSuggestion => !!t); // Filter out undefined

                          // Add associated task IDs to the set
                          associatedTasks.forEach(t => renderedTaskIds.add(t.id));

                          return (
                            <View key={quest.id} style={{ marginBottom: 12 }}>
                              {/* Quest Card */}
                              <View style={{
                                backgroundColor: 'rgba(255, 152, 0, 0.05)',
                                borderRadius: 6,
                                borderLeftWidth: 3,
                                borderColor: '#FF9800',
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 1 },
                                shadowOpacity: 0.2,
                                shadowRadius: 2,
                                elevation: 1,
                                overflow: 'hidden',
                                opacity: isAcceptingThisQuest ? 0.6 : 1
                              }}>
                                <View style={{
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  padding: 10,
                                  paddingHorizontal: 12,
                                  borderBottomWidth: 1,
                                  borderBottomColor: '#333333',
                                }}>
                                  <MaterialIcons name="emoji-events" size={16} color="#FF9800" />
                                  <Text style={{
                                    fontSize: 12,
                                    fontWeight: 'bold',
                                    marginLeft: 6,
                                    flex: 1,
                                    color: '#DDDDDD',
                                  }} numberOfLines={1}>
                                    {quest.title}
                                  </Text>
                                  <TouchableOpacity style={{ padding: 2 }} onPress={() => handleRejectQuest(quest.id)} disabled={isAcceptingThisQuest}>
                                    <MaterialIcons name="close" size={16} color={isAcceptingThisQuest ? "#666" : "#999999"} />
                                  </TouchableOpacity>
                                </View>

                                <View style={{ padding: 12 }}>
                                  <Text style={{
                                    color: '#AAAAAA',
                                    fontSize: 12,
                                    marginBottom: 8
                                  }} numberOfLines={2}>
                                    {quest.tagline}
                                  </Text>
                                </View>

                                <View style={{
                                  flexDirection: 'row',
                                  borderTopWidth: 1,
                                  borderTopColor: '#333333',
                                }}>
                                  {/* --- FIXED QUEST ACCEPT BUTTON --- */}
                                  <TouchableOpacity
                                    style={{ // Apply button styles directly here
                                      flexDirection: 'row',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      paddingVertical: 8,
                                      paddingHorizontal: 10,
                                      backgroundColor: isAcceptingThisQuest ? 'rgba(255, 152, 0, 0.1)' : 'rgba(255, 152, 0, 0.2)', // Keep background subtle
                                      flex: 1,
                                    }}
                                    onPress={() => handleAcceptQuest(quest)}
                                    disabled={isAcceptingThisQuest}
                                  >
                                    {isAcceptingThisQuest ? (
                                      <ActivityIndicator size="small" color="#FF9800" style={{ marginRight: 6 }} />
                                    ) : (
                                      <MaterialIcons name="check" size={14} color="#FF9800" style={{ marginRight: 4 }} />
                                    )}
                                    <Text style={{ // Ensure text style is correct
                                      color: '#FF9800',
                                      fontSize: 12,
                                      fontWeight: 'bold'
                                    }}>
                                      Accept
                                    </Text>
                                  </TouchableOpacity>
                                </View>
                              </View>

                              {/* Associated Task Cards (Rendered below the Quest) */}
                              {associatedTasks.length > 0 && (
                                <View style={{ marginLeft: 15, marginTop: 8, borderLeftWidth: 1, borderLeftColor: '#444', paddingLeft: 10 }}>
                                  {associatedTasks.map((task) => {
                                    const isAcceptingThisTask = isAcceptingTask === task.id;
                                    // Upgrade button should NOT be shown for tasks pending quest creation

                                    return (
                                      <View key={task.id} style={{ marginBottom: 8, opacity: isAcceptingThisTask ? 0.6 : 1 }}>
                                        <CompactTaskSuggestion
                                          suggestion={task}
                                          // Accept is disabled automatically by isPendingQuest inside the component now
                                          onAccept={!isAcceptingThisTask ? () => handleAcceptTask(task) : undefined}
                                          onReject={!isAcceptingThisTask ? () => handleRejectTask(task.id) : undefined}
                                          onExpand={!isAcceptingThisTask ? () => handleExpandTask(task) : undefined}
                                          // Pass handler ONLY if conditions met
                                          onUpgradeToQuest={!isAcceptingThisTask ? () => handleUpgradeTask(task) : undefined}                                          isAccepting={isAcceptingThisTask}
                                          isPendingQuest={true} // These are known pending tasks
                                        />
                                        {isAcceptingThisTask && (
                                          <ActivityIndicator size="small" color={themeColor} style={{ position: 'absolute', right: 10, top: 10 }} />
                                        )}
                                        {/* Pending text is now inside CompactTaskSuggestion */}
                                      </View>
                                    );
                                  })}
                                </View>
                              )}
                            </View>
                          );
                        })}

                        {/* 2. Render Standalone Tasks */}
                        {taskSuggestions
                          .filter(task => !renderedTaskIds.has(task.id)) // Only tasks not rendered above
                          .map((task) => {
                            const isAcceptingThisTask = isAcceptingTask === task.id;
                            // Upgrade shown if no quest_id and no pending quest link

                            return (
                              <View key={task.id} style={{ marginBottom: 8, opacity: isAcceptingThisTask ? 0.6 : 1 }}>
                                <CompactTaskSuggestion
                                  suggestion={task}
                                  // Accept allowed if not pending/accepting
                                  onAccept={!isAcceptingThisTask ? () => handleAcceptTask(task) : undefined}
                                  onReject={!isAcceptingThisTask ? () => handleRejectTask(task.id) : undefined}
                                  onExpand={!isAcceptingThisTask ? () => handleExpandTask(task) : undefined}
                                  // Pass handler ONLY if conditions met
                                  onUpgradeToQuest={!isAcceptingThisTask ? () => handleUpgradeTask(task) : undefined}                                  isAccepting={isAcceptingThisTask}
                                  isPendingQuest={false} // These are standalone
                                />
                                {isAcceptingThisTask && (
                                  <ActivityIndicator size="small" color={themeColor} style={{ position: 'absolute', right: 10, top: 10 }} />
                                )}
                              </View>
                            );
                          })}
                      </>
                    );
                  })()}
                </ScrollView>
              </View>
            )}

            {/* Chat input  */}
            <View style={{
              flexDirection: 'row',
              padding: 10,
              borderTopWidth: 1,
              borderTopColor: '#333333',
              backgroundColor: '#252525'
            }}>
              <TextInput
                style={{
                  flex: 1,
                  padding: 12,
                  backgroundColor: '#1E1E1E',
                  color: '#DDDDDD',
                  borderRadius: 4,
                  fontSize: 15,
                  marginRight: 10,
                  borderWidth: 1,
                  borderColor: '#444444',
                  textAlignVertical: 'center',
                  maxHeight: 100,
                }}
                value={message}
                onChangeText={handleMessageChange}
                onKeyPress={handleKeyPress}
                placeholder={!userId ? "Please log in to chat" : "Type your message..."}
                placeholderTextColor="#666666"
                blurOnSubmit={false}
                multiline={false}
                editable={!sessionEnded && !!userId}
              />
              <TouchableOpacity 
                style={{
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: themeColor,
                  borderRadius: 4,
                  paddingHorizontal: 15,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.2,
                  shadowRadius: 2,
                  elevation: 1,
                  opacity: sessionEnded || !userId ? 0.5 : 1,
                }} 
                onPress={handleSend}
                disabled={sessionEnded || !userId}
              >
                <MaterialIcons name="send" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Card>

      {/* Task Suggestion Modal */}
      <CreateTaskModal
        visible={showTaskModal}
        onClose={() => {
          setShowTaskModal(false);
          setCurrentTaskModal(null);
        }}
        onSubmit={handleCreateTaskFromSuggestion}
        isSubmitting={isSubmitting}
        quests={quests}
        userId={userId}
        initialData={currentTaskModal ? {
          title: currentTaskModal.title,
          description: currentTaskModal.description,
          scheduled_for: currentTaskModal.scheduled_for,
          deadline: currentTaskModal.deadline,
          location: currentTaskModal.location,
          status: 'ToDo',
          priority: currentTaskModal.priority || 'medium',
          subtasks: currentTaskModal.subtasks,
          clerk_id: userId
        } : undefined}
      />
    </>
  );
}
