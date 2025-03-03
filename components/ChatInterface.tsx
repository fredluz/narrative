import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform 
} from 'react-native';
import { Card } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import styles, { colors } from '@/app/styles/global';
import { ChatMessage } from '@/app/types';
import { useTheme } from '@/contexts/ThemeContext';

interface Props {
  recentMessages: ChatMessage[];
  themeColor: string;
  onSendMessage?: (message: string) => Promise<void>;
  handleTyping?: (text: string) => void;  // Add new prop
  isTyping?: boolean;
  sessionEnded?: boolean;
  onEndSession?: () => void;  // Add new prop
}

export function ChatInterface({ 
  recentMessages, 
  themeColor, 
  onSendMessage, 
  handleTyping,
  isTyping, 
  sessionEnded,
  onEndSession
}: Props) {
  const [message, setMessage] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  
  const { secondaryColor } = useTheme();

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
      
      {/* Digital noise effect */}
      <View style={{
        position: 'absolute',
        top: 0,
        height: '100%',
        width: 40,
        right: 20,
        opacity: 0.05,
        backgroundColor: themeColor,
      }} />

      {/* Glitch line - very cyberpunk */}
      <View style={{
        position: 'absolute',
        top: '40%',
        left: -10,
        width: '120%',
        height: 1,
        backgroundColor: secondaryColor,
        opacity: 0.15,
        transform: [{ rotate: '0.5deg' }],
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
          {recentMessages.map((msg, index) => (
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
                {msg.message}
              </Text>
            </View>
          ))}
          
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
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ 
                  fontSize: 18,
                  color: '#BBB',
                  lineHeight: 22,
                  textShadowColor: secondaryColor,
                  textShadowOffset: { width: 0, height: 0 },
                  textShadowRadius: 3,
                }}>
                  typing
                </Text>
                <View style={{ 
                  flexDirection: 'row', 
                  marginLeft: 4,
                  alignItems: 'flex-end',
                }}>
                  {[0, 1, 2].map((i) => (
                    <View
                      key={i}
                      style={{
                        width: 4,
                        height: 4,
                        borderRadius: 2,
                        backgroundColor: '#BBB',
                        marginLeft: 2,
                        opacity: 0.7,
                        transform: [{ translateY: Math.sin(Date.now() / (500 + i * 200)) * 2 }],
                      }}
                    />
                  ))}
                </View>
              </View>
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
            }} 
            onPress={handleSend}
          >
            <MaterialIcons name="send" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Card>
  );
}
