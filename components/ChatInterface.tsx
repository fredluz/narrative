import React, { useState } from 'react';
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

interface Props {
  recentMessages: ChatMessage[];
  themeColor: string;
}

export function ChatInterface({ recentMessages, themeColor }: Props) {
  const [message, setMessage] = useState('');
  
  // Generate a secondary color for cyberpunk UI elements
  const getSecondaryColor = (baseColor: string) => {
    // If the color is red-ish, make secondary color blue-ish
    if (baseColor.includes('f') || baseColor.includes('e') || baseColor.includes('d')) {
      return '#1D64AB';
    }
    // Otherwise, make secondary color red-ish
    return '#D81159';
  };
  
  const secondaryColor = getSecondaryColor(themeColor);
  
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

  const handleSend = () => {
    if (message.trim() === '') return;
    console.log('Sending message:', message);
    setMessage('');
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
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
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
        >
          {recentMessages.map((msg, index) => (
            <View 
              key={`${msg.id}-${index}`}
              style={[
                {
                  padding: 12,
                  marginVertical: 5,
                  borderRadius: 6,
                  maxWidth: '85%',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  elevation: 3,
                },
                !msg.isUser 
                  ? {
                      backgroundColor: 'rgba(20, 20, 20, 0.7)',
                      alignSelf: 'flex-start',
                      borderLeftWidth: 2,
                      borderLeftColor: secondaryColor,
                      marginRight: '15%',
                    }
                  : {
                      backgroundColor: 'rgba(30, 30, 30, 0.9)',
                      alignSelf: 'flex-end',
                      borderLeftWidth: 2,
                      borderLeftColor: themeColor,
                      marginLeft: '15%',
                    }
              ]}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ 
                  color: !msg.isUser ? secondaryColor : brightAccent,
                  fontWeight: 'bold',
                  fontSize: 12,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  textShadowColor: !msg.isUser ? secondaryColor : themeColor,
                  textShadowOffset: { width: 0, height: 0 },
                  textShadowRadius: 3,
                }}>
                  {!msg.isUser ? 'SILVERHAND' : 'YOU'}
                </Text>
                <Text style={{ color: '#777', fontSize: 10 }}>
                  {formatTimestamp(msg.updated_at)}
                </Text>
              </View>
              <Text style={{ 
                fontSize: 15,
                lineHeight: 20,
                color: !msg.isUser ? '#DDD' : '#FFF',
                textShadowColor: 'rgba(0, 0, 0, 0.5)',
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 2,
              }}>
                {msg.message}
              </Text>
            </View>
          ))}
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
            }}
            value={message}
            onChangeText={setMessage}
            placeholder="Type your message..."
            placeholderTextColor="#666"
            multiline
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
