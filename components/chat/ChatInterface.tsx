import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform,
  Animated 
} from 'react-native';
import { Card } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import styles, { colors } from '@/app/styles/global';
import { ChatMessage } from '@/app/types';
import { useTheme } from '@/contexts/ThemeContext';
import TriangularSpinner from '../loading/TriangularSpinner';
import { useNavigation } from '@react-navigation/native';

interface Props {
  recentMessages: ChatMessage[];
  onSendMessage?: (message: string) => Promise<void>;
  handleTyping?: (text: string) => void;
  isTyping?: boolean;
  sessionEnded?: boolean;
  checkupCreated?: boolean; // Add new prop
  onEndSession?: () => void;
}

export function ChatInterface({ 
  recentMessages,
  onSendMessage, 
  handleTyping,
  isTyping, 
  sessionEnded,
  checkupCreated,
  onEndSession
}: Props) {
  const [message, setMessage] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Remove the unused dot animations as we'll use the TriangularSpinner component
  const { themeColor, secondaryColor } = useTheme();
  const navigation = useNavigation();

  // Remove the animation effect that's not working

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
  
  // Make text more visible against dark backgrounds
  const getBrightAccent = (baseColor: string) => {
    const hex = baseColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    // If already bright, use it directly
    if (r + g + b > 500) {
      return baseColor;
    }
    
    // Otherwise create a bright neon version
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
    
    const messageToSend = message;
    setMessage(''); // Clear immediately for better UX
    
    if (onSendMessage) {
      await onSendMessage(messageToSend);
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
      e.preventDefault(); // Prevent new line
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


  return (
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
            }}
            onPress={onEndSession}
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
        </View>
      </View>

      {/* Chat messages */}
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      >
        <ScrollView 
          style={{ padding: 10, flex: 1 }} 
          contentContainerStyle={{ paddingBottom: 20 }}
          ref={scrollViewRef}
        >
          {recentMessages.map((msg, index) => {
            // Clean message text if it's from the AI (not user)
            let messageText = msg.message;
            if (!msg.is_user && messageText) {
              messageText = messageText.replace(/^["']|["']$/g, ''); // Remove surrounding quotes
              messageText = messageText.replace(/^Johnny Silverhand's response:\s*/i, ''); // Remove prefix
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
          
          {/* Improved typing indicator using TriangularSpinner */}
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
                {/* Replace the placeholder view with the TriangularSpinner component */}
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
          
          {/* Session ended notification with checkup information */}
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
              
              {checkupCreated && (
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
              textAlignVertical: 'center', // Center text vertically
              maxHeight: 100, // Limit height while still allowing some multiline if needed
            }}
            value={message}
            onChangeText={handleMessageChange}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            placeholderTextColor="#666"
            blurOnSubmit={false}
            multiline={false} // Changed to false to better handle Enter key
            editable={!sessionEnded} // Disable input when session has ended
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
              opacity: sessionEnded ? 0.5 : 1, // Fade out when disabled
            }} 
            onPress={handleSend}
            disabled={sessionEnded} // Disable button when session has ended
          >
            <MaterialIcons name="send" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Card>
  );
}
