import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Card } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import styles, { colors } from '@/app/styles/global';
import { useTheme } from '@/contexts/ThemeContext';

interface ChatQuestInterfaceProps {
  messages: { id: string | number; message: string; is_user: boolean; created_at: string; updated_at: string }[];
  onSendMessage: (message: string) => Promise<void>;
  isTyping: boolean;
  userId: string;
  onClose: () => void;
}

export function ChatQuestInterface({ messages, onSendMessage, isTyping, userId, onClose }: ChatQuestInterfaceProps) {
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const { themeColor, secondaryColor } = useTheme();
  const [recordingStatus, setRecordingStatus] = useState<'idle' | 'recording' | 'transcribing'>('idle');
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const recordingInstanceRef = useRef<Audio.Recording | null>(null);
  const [transcriptionDisplay, setTranscriptionDisplay] = useState('');
  const [voiceError, setVoiceError] = useState<string | null>(null);

  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim()) return;
    try {
      await onSendMessage(message);
      setMessage('');
    } catch (err) {
      setError('Failed to send message');
    }
  };

  const handleKeyPress = (e: any) => {
    if (e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Voice input logic
  const requestPermissions = async () => {
    const { status } = await Audio.requestPermissionsAsync();
    return status === 'granted';
  };

  const startRecording = async () => {
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        setVoiceError('Microphone permission denied.');
        return;
      }
      setRecordingStatus('recording');
      setVoiceError(null);
      setTranscriptionDisplay('');
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingInstanceRef.current = recording;
    } catch (error) {
      setVoiceError('Failed to start recording.');
      setRecordingStatus('idle');
    }
  };

  const stopRecordingAndTranscribe = async () => {
    try {
      if (!recordingInstanceRef.current) return;
      await recordingInstanceRef.current.stopAndUnloadAsync();
      setRecordingStatus('transcribing');
      const uri = recordingInstanceRef.current.getURI();
      setAudioUri(uri);
      recordingInstanceRef.current = null;
      // --- TranscriptionAgent integration ---
      // You must have a transcriptionAgent with a requestTranscription(uri) method in your project
      // If not, replace this with your actual transcription logic
      // @ts-ignore
      const { transcriptionAgent } = require('@/services/agents/TranscriptionAgent');
      const transcript = await transcriptionAgent.requestTranscription(uri);
      setTranscriptionDisplay(transcript);
      setRecordingStatus('idle');
      if (transcript) {
        setMessage(transcript);
      }
    } catch (error) {
      setVoiceError('Failed to transcribe audio.');
      setRecordingStatus('idle');
    }
  };

  return (
    <Card style={{ flex: 1, backgroundColor: '#1E1E1E', borderRadius: 8, borderWidth: 1, borderColor: '#333333', overflow: 'hidden' }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#333333', backgroundColor: '#252525' }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#EEEEEE', letterSpacing: 0.5 }}>New Quest Chat</Text>
        <TouchableOpacity onPress={onClose}>
          <MaterialIcons name="close" size={24} color="#AAA" />
        </TouchableOpacity>
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={{ flex: 1, flexDirection: 'column' }}>
          <ScrollView style={{ padding: 10, flex: 1, backgroundColor: '#1A1A1A' }} contentContainerStyle={{ paddingBottom: 20 }} ref={scrollViewRef}>
            {error && (
              <View style={{ padding: 12, marginVertical: 5, borderRadius: 5, backgroundColor: 'rgba(255, 107, 107, 0.1)', borderWidth: 1, borderColor: '#FF6B6B', marginBottom: 16, borderLeftWidth: 3, borderLeftColor: '#FF6B6B' }}>
                <Text style={{ color: '#FF6B6B', fontSize: 14, textAlign: 'center' }}>{error}</Text>
              </View>
            )}
            {messages.map((msg, idx) => (
              <View key={`${msg.id}-${idx}`} style={{
                alignSelf: msg.is_user ? 'flex-end' : 'flex-start',
                backgroundColor: msg.is_user ? themeColor : secondaryColor,
                padding: 12,
                borderRadius: 12,
                marginVertical: 4,
                maxWidth: '80%',
              }}>
                <Text style={{ color: '#FFF', fontSize: 15 }}>{msg.message}</Text>
                <Text style={{ color: '#BBB', fontSize: 10, marginTop: 4, textAlign: 'right' }}>{new Date(msg.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
              </View>
            ))}
            {isTyping && (
              <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', marginVertical: 4 }}>
                <ActivityIndicator size="small" color={secondaryColor} style={{ marginRight: 8 }} />
                <Text style={{ color: secondaryColor, fontSize: 15 }}>AI is typing...</Text>
              </View>
            )}
            {voiceError && (
              <View style={{ padding: 12, marginVertical: 5, borderRadius: 5, backgroundColor: 'rgba(255, 107, 107, 0.1)', borderWidth: 1, borderColor: '#FF6B6B', marginBottom: 16, borderLeftWidth: 3, borderLeftColor: '#FF6B6B' }}>
                <Text style={{ color: '#FF6B6B', fontSize: 14, textAlign: 'center' }}>{voiceError}</Text>
              </View>
            )}
            {transcriptionDisplay ? (
              <View style={{ backgroundColor: '#2A2A2A', borderRadius: 4, padding: 10, marginBottom: 10 }}>
                <Text style={{ color: '#AAA', fontSize: 14 }}>Transcript:</Text>
                <Text style={{ color: '#FFF', marginTop: 4 }}>{transcriptionDisplay}</Text>
              </View>
            ) : null}
          </ScrollView>
          <View style={{ flexDirection: 'row', padding: 10, borderTopWidth: 1, borderTopColor: '#333333', backgroundColor: '#252525', alignItems: 'center' }}>
            {/* Voice input button */}
            <TouchableOpacity
              onPress={() => {
                if (recordingStatus === 'idle') startRecording();
                else if (recordingStatus === 'recording') stopRecordingAndTranscribe();
              }}
              disabled={isTyping || !userId || recordingStatus === 'transcribing'}
              style={{ marginRight: 10, opacity: isTyping || !userId ? 0.5 : 1 }}
            >
              <MaterialIcons name={recordingStatus === 'recording' ? 'stop' : 'mic'} size={28} color={recordingStatus === 'recording' ? '#FF4444' : themeColor} />
            </TouchableOpacity>
            <TextInput
              style={{ flex: 1, padding: 12, backgroundColor: '#1E1E1E', color: '#DDDDDD', borderRadius: 4, fontSize: 15, marginRight: 10, borderWidth: 1, borderColor: '#444444', textAlignVertical: 'center', maxHeight: 100 }}
              value={message}
              onChangeText={setMessage}
              onKeyPress={handleKeyPress}
              placeholder={!userId ? 'Please log in to chat' : 'Type your quest idea...'}
              placeholderTextColor="#666666"
              blurOnSubmit={false}
              multiline={false}
              editable={!!userId && recordingStatus !== 'recording' && recordingStatus !== 'transcribing'}
            />
            <TouchableOpacity
              style={{ justifyContent: 'center', alignItems: 'center', backgroundColor: themeColor, borderRadius: 4, paddingHorizontal: 15, opacity: !userId ? 0.5 : 1 }}
              onPress={handleSend}
              disabled={!userId || isTyping || recordingStatus === 'recording' || recordingStatus === 'transcribing'}
            >
              <MaterialIcons name="send" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Card>
  );
}
