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
  const [isEndingSession, setIsEndingSession] = useState(false);  // Add this line
  const scrollViewRef = useRef<ScrollView>(null);
  const { themeColor, secondaryColor } = useTheme();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentTaskModal, setCurrentTaskModal] = useState<TaskSuggestion | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [quests, setQuests] = useState<Array<{ id: number; title: string }>>([]);

  // Get task and quest suggestions from context
  const { 
    taskSuggestions, 
    questSuggestions, 
    acceptTaskSuggestion, 
    rejectTaskSuggestion, 
    upgradeTaskToQuest,
    rejectQuestSuggestion,
    acceptQuestSuggestion
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
  const hasSuggestions = taskSuggestions.length > 0 || questSuggestions.length > 0;

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

  return (
    <>
      <Card style={{
        flex: 1,
        backgroundColor: colors.backgroundSecondary,
        borderRadius: 8,
        borderWidth: 1, 
        borderColor: themeColor, 
        borderLeftWidth: 3,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 3,
        },
        shadowOpacity: 0.5,
        shadowRadius: 5,
        elevation: 8,
      }}>
        {/* Background with cyberpunk elements */}
        <View style={{ 
          position: 'absolute', 
          width: '100%', 
          height: '100%',
          backgroundColor: '#151515',
        }} />

        {/* Chat header */}
        <View style={{ 
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 15,
          paddingVertical: 15,
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(255, 255, 255, 0.1)',
          backgroundColor: 'rgba(20, 20, 20, 0.7)',
        }}>
          {/* ...existing code... */}
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <Text style={{ 
              fontSize: 18,
              fontWeight: 'bold',
              color: '#FFFFFF',
              textTransform: 'uppercase',
              letterSpacing: 1,
              textShadowColor: themeColor,
              textShadowOffset: { width: 1, height: 1 },
              textShadowRadius: 4
            }}>
              Interface
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
                backgroundColor: 'rgba(30, 30, 30, 0.9)',
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
                textTransform: 'uppercase',
              }}>
                End Session
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={{
                marginLeft: 15,
                backgroundColor: 'rgba(30, 30, 30, 0.9)',
                borderWidth: 1,
                borderColor: '#ff4c4c',
                borderRadius: 4,
                paddingVertical: 4,
                paddingHorizontal: 8,
                flexDirection: 'row',
                alignItems: 'center',
              }}
              onPress={onDeleteMessages}
              disabled={!userId}
            >
              <MaterialIcons 
                name="delete" 
                size={16} 
                color="#ff4c4c"
                style={{ marginRight: 4 }} 
              />
              <Text style={{
                color: '#ff4c4c',
                fontSize: 12,
                fontWeight: 'bold',
                textTransform: 'uppercase',
              }}>
                Delete Chat
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
              style={{ padding: 10, flex: 1 }} 
              contentContainerStyle={{ paddingBottom: 20 }}
              ref={scrollViewRef}
            >
              {/* Error message */}
              {error && (
                <View style={{
                  padding: 12,
                  marginVertical: 5,
                  borderRadius: 5,
                  backgroundColor: 'rgba(255, 50, 50, 0.2)',
                  borderWidth: 1,
                  borderColor: 'rgba(255, 50, 50, 0.5)',
                  marginBottom: 16,
                }}>
                  <Text style={{
                    color: '#FFA0A0',
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
                        backgroundColor: 'rgba(15, 15, 15, 0.8)',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 3 },
                        shadowOpacity: 0.2,
                        shadowRadius: 4,
                        elevation: 3,
                      },
                      !msg.is_user 
                        ? {
                            alignSelf: 'flex-start',
                            borderLeftWidth: 3,
                            borderColor: secondaryColor,
                            marginRight: '15%',
                          }
                        : {
                            alignSelf: 'flex-end',
                            borderLeftWidth: 3,
                            borderColor: themeColor,
                            marginLeft: '15%',
                          }
                    ]}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ 
                        color: !msg.is_user ? secondaryColor : themeColor,
                        fontWeight: 'bold',
                        fontSize: 12,
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                        textShadowColor: !msg.is_user ? secondaryColor : themeColor,
                        textShadowOffset: { width: 0, height: 0 },
                        textShadowRadius: 3,
                      }}>
                        {!msg.is_user ? 'SILVERHAND' : 'YOU'}
                      </Text>
                      <Text style={{ color: '#777', fontSize: 10 }}>
                        {formatTimestamp(msg.updated_at)}
                      </Text>
                    </View>
                    <Text style={{ 
                      fontSize: 18,
                      color: '#BBB',
                      lineHeight: 22,
                      textShadowColor: !msg.is_user ? secondaryColor : themeColor,
                      textShadowOffset: { width: 0, height: 0 },
                      textShadowRadius: 3,
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
                      backgroundColor: 'rgba(15, 15, 15, 0.8)',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 3 },
                      shadowOpacity: 0.2,
                      shadowRadius: 4,
                      elevation: 3,
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
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                      textShadowColor: secondaryColor,
                      textShadowOffset: { width: 0, height: 0 },
                      textShadowRadius: 3,
                    }}>
                      SILVERHAND
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4 }}>
                    <TriangularSpinner size={24} color={secondaryColor} />
                    <Text style={{ 
                      fontSize: 18,
                      color: '#BBB',
                      marginLeft: 8,
                      lineHeight: 22,
                      textShadowColor: secondaryColor,
                      textShadowOffset: { width: 0, height: 0 },
                      textShadowRadius: 3,
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
                  backgroundColor: 'rgba(20, 20, 20, 0.8)',
                  borderWidth: 1,
                  borderColor: secondaryColor,
                }}>
                  <Text style={{
                    color: '#BBB',
                    fontSize: 16,
                    textAlign: 'center',
                    marginBottom: 8,
                  }}>
                    Session ended
                  </Text>
                  
                  {isProcessingSession ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 8 }}>
                      <TriangularSpinner size={16} color={secondaryColor} />
                      <Text style={{
                        color: '#999',
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
                        color: '#BBB',
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
            
            {/* Suggestions list area - displayed only when there are suggestions */}
            {hasSuggestions && (
              <View style={{
                maxHeight: 220,
                borderTopWidth: 1,
                borderTopColor: 'rgba(255, 255, 255, 0.1)',
                backgroundColor: 'rgba(15, 15, 15, 0.95)',
              }}>
                <View style={{ 
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingHorizontal: 15,
                  paddingVertical: 8,
                  backgroundColor: 'rgba(20, 20, 20, 0.8)',
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <MaterialIcons name="lightbulb" size={16} color={secondaryColor} />
                    <Text style={{ 
                      marginLeft: 6,
                      color: secondaryColor,
                      fontWeight: 'bold',
                      fontSize: 14,
                      textTransform: 'uppercase',
                    }}>
                      Suggestions ({taskSuggestions.length + questSuggestions.length})
                    </Text>
                  </View>
                </View>
                
                <ScrollView 
                  horizontal={false}
                  style={{ 
                    maxHeight: 180,
                  }}
                  contentContainerStyle={{
                    padding: 10,
                    paddingBottom: 15,
                  }}
                >
                  {/* Task Suggestions */}
                  {taskSuggestions.length > 0 && (
                    <View style={{ marginBottom: 12 }}>
                      <Text style={{ 
                        color: '#AAA', 
                        fontSize: 12, 
                        marginBottom: 8,
                        paddingHorizontal: 4,
                      }}>
                        TASKS
                      </Text>
                      
                      {taskSuggestions.map((task) => (
                        <View key={task.id} style={{ marginBottom: 8 }}>
                          <CompactTaskSuggestion
                            suggestion={task}
                            onAccept={() => handleAcceptTask(task)}
                            onReject={() => handleRejectTask(task.id)}
                            onExpand={() => handleExpandTask(task)}
                            onUpgradeToQuest={() => handleUpgradeTask(task)}
                          />
                        </View>
                      ))}
                    </View>
                  )}
                  
                  {/* Quest Suggestions */}
                  {questSuggestions.length > 0 && (
                    <View>
                      <Text style={{ 
                        color: '#AAA', 
                        fontSize: 12, 
                        marginBottom: 8,
                        paddingHorizontal: 4,
                      }}>
                        QUESTS
                      </Text>
                      
                      {questSuggestions.map((quest) => (
                        <View key={quest.id} style={{ marginBottom: 8 }}>
                          <View style={{
                            backgroundColor: 'rgba(20, 20, 20, 0.95)',
                            borderRadius: 6,
                            borderLeftWidth: 3,
                            borderColor: secondaryColor,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 3 },
                            shadowOpacity: 0.3,
                            shadowRadius: 4,
                            elevation: 6,
                            overflow: 'hidden',
                          }}>
                            <View style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              padding: 10,
                              paddingHorizontal: 12,
                              borderBottomWidth: 1,
                              borderBottomColor: 'rgba(255, 255, 255, 0.1)',
                            }}>
                              <MaterialIcons name="emoji-events" size={16} color={secondaryColor} />
                              <Text style={{
                                fontSize: 12,
                                fontWeight: 'bold',
                                marginLeft: 6,
                                flex: 1,
                                color: secondaryColor,
                              }}>
                                {quest.title}
                              </Text>
                              <TouchableOpacity style={{ padding: 2 }} onPress={() => handleRejectQuest(quest.id)}>
                                <MaterialIcons name="close" size={16} color="#999" />
                              </TouchableOpacity>
                            </View>
                            
                            <View style={{ padding: 12 }}>
                              <Text style={{
                                color: '#AAA',
                                fontSize: 12,
                                marginBottom: 8
                              }}>
                                {quest.tagline}
                              </Text>
                            </View>
                            
                            <View style={{
                              flexDirection: 'row',
                              borderTopWidth: 1,
                              borderTopColor: 'rgba(255, 255, 255, 0.1)',
                            }}>
                              <TouchableOpacity
                                style={{
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  padding: 8,
                                  backgroundColor: secondaryColor,
                                  flex: 1
                                }}
                                onPress={() => handleAcceptQuest(quest)}
                              >
                                <MaterialIcons name="check" size={14} color="#fff" />
                                <Text style={{
                                  color: '#FFF',
                                  fontSize: 12,
                                  marginLeft: 4
                                }}>
                                  Accept
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </ScrollView>
              </View>
            )}

            {/* Chat input */}
            <View style={{
              flexDirection: 'row',
              padding: 10,
              borderTopWidth: 1,
              borderTopColor: 'rgba(255, 255, 255, 0.1)',
              backgroundColor: 'rgba(20, 20, 20, 0.9)'
            }}>
                            <TextInput
                style={{
                  flex: 1,
                  padding: 12,
                  backgroundColor: 'rgba(25, 25, 25, 0.7)',
                  color: colors.text,
                  borderRadius: 4,
                  fontSize: 15,
                  marginRight: 10,
                  borderLeftWidth: 2, 
                  borderLeftColor: themeColor,
                  textAlignVertical: 'center',
                  maxHeight: 100,
                }}
                value={message}
                onChangeText={handleMessageChange}
                onKeyPress={handleKeyPress}
                placeholder={!userId ? "Please log in to chat" : "Type your message..."}
                placeholderTextColor="#666"
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
                  borderWidth: 1,
                  borderColor: brightAccent,
                  shadowColor: themeColor,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.5,
                  shadowRadius: 5,
                  elevation: 5,
                  opacity: sessionEnded || !userId ? 0.5 : 1,
                }} 
                onPress={handleSend}
                disabled={sessionEnded || !userId}
              >
                <MaterialIcons name="send" size={24} color="#FFF" />
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
          user_id: userId
        } : undefined}
      />
    </>
  );
}
