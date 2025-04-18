import * as React from 'react';
import { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Modal, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { Audio } from 'expo-av';
import { useTheme } from '@/contexts/ThemeContext';
import { Quest } from '@/app/types';
import { transcriptionAgent } from '@/services/agents/TranscriptionAgent';
import { createQuestAgent } from '@/services/agents/CreateQuestAgent'; // Use the new agent
import { personalityService } from '@/services/personalityService'; // Import personality service
import type { PersonalityType } from '@/services/agents/PersonalityPrompts'; // Import PersonalityType

type QuestStatus = 'Active' | 'On-Hold' | 'Completed';

interface QuestFormData {
  title: string;
  tagline: string;
  description: string; // Changed from optional to required
  status: QuestStatus;
  start_date?: string;
  end_date?: string;
  is_main: boolean;
  clerk_id: string; // Add clerk_id field
  created_at?: string;  // Add timestamp fields
  updated_at?: string;
}

interface CreateQuestModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: QuestFormData) => Promise<void>;
  isSubmitting: boolean;
  userId: string; // Add userId prop
  initialData?: Partial<QuestFormData>; // Add optional initialData prop
}

export function CreateQuestModal({
  visible,
  onClose, 
  onSubmit,
  isSubmitting,
  userId,
  initialData // Destructure initialData
}: CreateQuestModalProps) {
  const { themeColor, secondaryColor } = useTheme();

  // Voice input state
  const [inputMode, setInputMode] = useState<'manual' | 'voice'>('manual');
  const [recordingStatus, setRecordingStatus] = useState<'idle' | 'recording' | 'transcribing' | 'processing'>('idle');
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const recordingInstanceRef = useRef<Audio.Recording | null>(null);
  const [transcriptionDisplay, setTranscriptionDisplay] = useState('');
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isFetchingPersonality, setIsFetchingPersonality] = useState(false); // State for personality fetching
  const [followupQuestions, setFollowupQuestions] = useState<string[]>([]); // Store follow-up questions
  const [followupAnswer, setFollowupAnswer] = useState(''); // Store user's answer to follow-up

  const [formData, setFormData] = React.useState<QuestFormData>({
    title: '',
    tagline: '',
    description: '', // Initialize with empty string since it's required
    status: 'Active',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    is_main: false,
    clerk_id: userId,
    created_at: new Date().toISOString(),  // Initialize with current timestamp
    updated_at: new Date().toISOString()
  });

  // Effect to update internal form state when initialData changes or modal becomes visible
  useEffect(() => {
    if (visible && initialData) {
      console.log("[CreateQuestModal] Receiving initialData:", initialData);
      setFormData(prevData => ({
        ...prevData, // Keep existing defaults like clerk_id, timestamps
        ...initialData, // Overwrite with provided initial data
        clerk_id: userId // Ensure clerk_id is always set correctly
      }));
    } else if (!visible) {
      // Optionally reset form when modal closes? Or keep the pre-filled data?
      // Resetting for now to ensure clean state next time unless pre-filled again.
       setFormData({
         title: '',
         tagline: '',
         description: '',
         status: 'Active',
         start_date: format(new Date(), 'yyyy-MM-dd'),
         is_main: false,
         clerk_id: userId,
         created_at: new Date().toISOString(),
         updated_at: new Date().toISOString()
       });
       setFollowupQuestions([]);
       setFollowupAnswer('');
       setTranscriptionDisplay('');
       setGenerationError(null);
       setInputMode('manual'); // Reset to manual input when closing
    }
  }, [visible, initialData, userId]); // Rerun when visibility or initialData changes

  // Audio permissions and recording functions
  const requestPermissions = async () => {
    const { status } = await Audio.requestPermissionsAsync();
    return status === 'granted';
  };

  const startRecording = async () => {
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        Alert.alert("Permissions Required", "Please grant microphone permissions to use voice input.");
        return;
      }
      
      setRecordingStatus('recording');
      setGenerationError(null);
      setTranscriptionDisplay('');
      
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      recordingInstanceRef.current = recording;
    } catch (error) {
      console.error('Failed to start recording', error);
      Alert.alert("Recording Error", "Failed to start recording. Please try again.");
      setRecordingStatus('idle');
    }
  };

  const stopRecordingAndTranscribe = async () => {
    try {
      if (!recordingInstanceRef.current) {
        return;
      }
      
      await recordingInstanceRef.current.stopAndUnloadAsync();
      setRecordingStatus('transcribing');
      
      const uri = recordingInstanceRef.current.getURI();
      setAudioUri(uri);
      recordingInstanceRef.current = null;
      
      if (!uri) {
        throw new Error("Recording URI is null");
      }
      
      const transcript = await transcriptionAgent.requestTranscription(uri);
      
      if (transcript) {
        setTranscriptionDisplay(transcript);
        setRecordingStatus('processing'); // Keep processing state for now
        
        // Fetch personality before generating quest
        setIsFetchingPersonality(true);
        let personalityType: PersonalityType = 'narrator'; // Default fallback
        try {
          console.log(`[CreateQuestModal] Fetching personality for user: ${userId}`);
          personalityType = await personalityService.getUserPersonality(userId);
          console.log(`[CreateQuestModal] Fetched personality: ${personalityType}`);
        } catch (personalityError) {
          console.error('[CreateQuestModal] Failed to fetch user personality, using default:', personalityError);
          Alert.alert("Personality Error", "Could not fetch your selected AI personality. Using default.");
          // Continue with default personality
        } finally {
          setIsFetchingPersonality(false);
        }

        // Now call generate quest with the fetched (or default) personality
        await handleGenerateQuest(transcript, personalityType);

      } else {
        throw new Error("Failed to transcribe audio");
      }
    } catch (error) {
      console.error('Transcription error', error);
      Alert.alert(
        "Transcription Error", 
        "Failed to transcribe your recording. Please try again."
      );
      setRecordingStatus('idle');
    }
  };

  // Updated handleGenerateQuest for two-step voice interaction
  const handleGenerateQuest = async (transcript: string, personalityType: PersonalityType, followupAnswerProvided?: string) => {
    setGenerationError(null);
    setRecordingStatus('processing'); // Indicate processing starts

    try {
      if (!followupAnswerProvided) {
        // === Step 1: Ask Questions ===
        console.log("[CreateQuestModal] Step 1: Asking follow-up questions...");
        const questions = await createQuestAgent.askFollowUpQuestions(
          transcript,
          personalityType,
          userId
        );

        if (questions && questions.length > 0) {
          setFollowupQuestions(questions);
          // Display questions clearly, maybe prefixing the transcript
          setTranscriptionDisplay(`Questions:\n- ${questions.join('\n- ')}\n\nOriginal Idea:\n${transcript}`);
          setRecordingStatus('idle'); // Ready for user's answer
          console.log("[CreateQuestModal] Step 1: Questions received, awaiting answer.");
        } else {
          // If agent fails to ask questions, maybe try generating directly? Or show error.
          // For now, let's try generating data directly as a fallback.
          console.warn("[CreateQuestModal] Step 1: Agent didn't return questions, attempting direct generation.");
          await handleGenerateQuest(transcript, personalityType, " "); // Pass a dummy followup to trigger step 2
        }

      } else {
        // === Step 2: Generate Quest Data ===
        console.log("[CreateQuestModal] Step 2: Generating quest data with answers...");
        // Build the full conversation history
        const conversation: { role: 'user' | 'agent'; content: string }[] = [
          { role: 'user', content: transcript }, // Initial idea
          { role: 'agent', content: followupQuestions.join(' ') }, // Agent's questions
          { role: 'user', content: followupAnswerProvided } // User's answers
        ];

        const generatedData = await createQuestAgent.generateQuestData(
          conversation,
          personalityType,
          userId
        );

        // Pre-fill the form data
        setFormData({
          ...formData, // Keep existing status, dates etc.
          title: generatedData.name,
          tagline: generatedData.tagline || '',
          description: generatedData.description,
          // Keep existing clerk_id, status, is_main, dates unless generatedData provides them
          status: generatedData.status || formData.status,
          is_main: generatedData.is_main !== undefined ? generatedData.is_main : formData.is_main,
        });

        // Switch to manual mode for review
        setInputMode('manual');
        setTranscriptionDisplay(''); // Clear transcript/questions display
        setFollowupQuestions([]); // Clear stored questions
        setRecordingStatus('idle'); // Reset recording status
        console.log("[CreateQuestModal] Step 2: Quest data generated, switched to manual mode for review.");
      }
    } catch (error) {
      console.error("Error during quest generation:", error);
      setGenerationError(error instanceof Error ? error.message : 'An unknown error occurred during quest generation.');
      setRecordingStatus('idle'); // Reset status on error
    }
    // Note: 'finally' block removed as setRecordingStatus('idle') is handled within try/catch paths
  };

  const handleSubmit = async () => {
    const now = new Date().toISOString();
    await onSubmit({
      ...formData,
      clerk_id: userId,
      created_at: now,  // Always use fresh timestamp when submitting
      updated_at: now
    });
    setFormData({
      title: '',
      tagline: '',
      description: '',
      status: 'Active',
      start_date: format(new Date(), 'yyyy-MM-dd'),
      is_main: false,
      clerk_id: userId,
      created_at: now,
      updated_at: now
    });
  };
  
  // Cleanup recording when modal is closed
  useEffect(() => {
    return () => {
      // Clean up recording if the modal is closed while recording
      if (recordingInstanceRef.current) {
        recordingInstanceRef.current.stopAndUnloadAsync().catch(() => {
          // Ignore errors during cleanup
        });
        recordingInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
      }}>
        <View style={{
          width: '80%',
          backgroundColor: '#1A1A1A',
          borderRadius: 8,
          padding: 20,
          borderWidth: 1,
          borderColor: themeColor,
          maxHeight: '80%',
        }}>          <View style={{ 
            flexDirection: 'row', 
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
            borderBottomWidth: 1,
            borderBottomColor: 'rgba(255, 255, 255, 0.1)',
            paddingBottom: 10
          }}>
            <Text style={{ 
              color: '#FFF', 
              fontSize: 18, 
              fontWeight: 'bold',
              textShadowColor: themeColor,
              textShadowOffset: { width: 0.5, height: 0.5 },
              textShadowRadius: 2
            }}>
              Create New Quest
            </Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color="#AAA" />
            </TouchableOpacity>
          </View>
          
          {/* Input Mode Switcher */}
          <View style={{ 
            flexDirection: 'row', 
            backgroundColor: '#2A2A2A',
            borderRadius: 4,
            marginBottom: 20,
            overflow: 'hidden' 
          }}>
            <TouchableOpacity 
              style={{
                flex: 1,
                backgroundColor: inputMode === 'manual' ? themeColor : 'transparent',
                paddingVertical: 10,
                alignItems: 'center'
              }}
              onPress={() => {
                setInputMode('manual');
                setGenerationError(null);
              }}
            >
              <Text style={{ color: inputMode === 'manual' ? '#FFF' : '#AAA' }}>Manual Input</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={{
                flex: 1,
                backgroundColor: inputMode === 'voice' ? themeColor : 'transparent',
                paddingVertical: 10,
                alignItems: 'center'
              }}
              onPress={() => {
                setInputMode('voice');
                setGenerationError(null);
              }}
            >
              <Text style={{ color: inputMode === 'voice' ? '#FFF' : '#AAA' }}>Voice Input</Text>
            </TouchableOpacity>
          </View>          <ScrollView style={{ maxHeight: '100%' }}>
            {/* Voice Input UI */}
            {inputMode === 'voice' && (
              <View style={{ alignItems: 'center', padding: 20 }}>
                <TouchableOpacity
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 40,
                    backgroundColor: recordingStatus === 'recording' ? 'rgba(255, 0, 0, 0.7)' : themeColor,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginBottom: 20,
                  }}                  onPress={() => {
                    if (recordingStatus === 'idle') {
                      startRecording();
                    } else if (recordingStatus === 'recording') {
                      stopRecordingAndTranscribe();
                    }
                  }}
                  disabled={recordingStatus === 'transcribing' || recordingStatus === 'processing' || isFetchingPersonality} // Disable while fetching personality too
                >
                  <MaterialIcons 
                    name={recordingStatus === 'recording' ? 'stop' : 'mic'} 
                    size={36} 
                    color="#FFF"
                  />
                </TouchableOpacity>

                {/* Recording Indicator Text */}
                {recordingStatus === 'recording' && (
                  <Text style={{ color: '#FF6B6B', fontWeight: 'bold', marginBottom: 15, fontSize: 14 }}>Recording...</Text>
                )}

                {/* Processing Indicator */}
                {(recordingStatus === 'transcribing' || recordingStatus === 'processing' || isFetchingPersonality) && (
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: 15,
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: 4,
                  }}>
                    <ActivityIndicator size="small" color={themeColor} style={{ marginRight: 10 }} />
                    <Text style={{ color: '#FFF', fontSize: 14 }}>
                      {isFetchingPersonality ? 'Fetching personality...' : recordingStatus === 'transcribing' ? 'Transcribing audio...' : 'Processing request...'}
                    </Text>
                  </View>
                )}

                {/* Transcription/Question Display */}
                {transcriptionDisplay && !followupQuestions.length && (
                  <View style={{ 
                    backgroundColor: '#2A2A2A',
                    borderRadius: 4,
                    padding: 15,
                    width: '100%',
                    marginBottom: 15
                  }}>
                    <Text style={{ color: '#FFF', fontSize: 14, marginBottom: 5 }}>Transcript:</Text>
                    <Text style={{ color: '#AAA' }}>{transcriptionDisplay}</Text>
                  </View>
                )}
                {!transcriptionDisplay && !followupQuestions.length && recordingStatus === 'idle' && (
                  <Text style={{ color: '#AAA', marginBottom: 15, textAlign: 'center' }}>
                    Tap the mic to start recording your quest idea
                  </Text>
                )}
                
                {generationError && (
                  <View style={{ 
                    backgroundColor: 'rgba(255, 0, 0, 0.1)',
                    borderRadius: 4,
                    padding: 10,
                    width: '100%',
                    marginBottom: 15
                  }}>
                    <Text style={{ color: '#FF4444' }}>{generationError}</Text>
                  </View>
                )}
                {followupQuestions.length > 0 && (
                  <View style={{ width: '100%', marginBottom: 15 }}>
                    <Text style={{ color: '#FFF', fontWeight: 'bold', marginBottom: 8 }}>More info needed:</Text>
                    {followupQuestions.map((q, i) => (
                      <Text key={i} style={{ color: '#AAA', marginBottom: 4 }}>{q}</Text>
                    ))}
                    <TextInput
                      value={followupAnswer}
                      onChangeText={setFollowupAnswer}
                      placeholder="Type your answer..."
                      placeholderTextColor="#666"
                      style={{ backgroundColor: '#222', color: '#FFF', borderRadius: 4, padding: 10, marginTop: 8, marginBottom: 8 }}
                    />
                    <TouchableOpacity
                      style={{ backgroundColor: themeColor, borderRadius: 4, paddingHorizontal: 15, paddingVertical: 8, alignSelf: 'flex-end' }}
                      onPress={async () => {
                        if (!followupAnswer.trim()) return;
                        setTranscriptionDisplay('');
                        await handleGenerateQuest(transcriptionDisplay, await personalityService.getUserPersonality(userId), followupAnswer);
                        setFollowupAnswer('');
                      }}
                    >
                      <Text style={{ color: '#FFF' }}>Submit Answer</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
            
            {/* Manual Input UI */}
            {inputMode === 'manual' && (
              <>
                <Text style={{ color: '#AAA', fontSize: 14, marginBottom: 5 }}>Title *</Text>
                <TextInput
                  value={formData.title}
                  onChangeText={(text) => setFormData({ ...formData, title: text })}
                  style={{
                    backgroundColor: '#2A2A2A',
                    borderRadius: 4,
                    padding: 10,
                    marginBottom: 15,
                    color: '#FFF',
                  }}
                  placeholderTextColor="#666"
                  placeholder="Enter quest title"
                />

            <Text style={{ color: '#AAA', fontSize: 14, marginBottom: 5 }}>Tagline</Text>
            <TextInput
              value={formData.tagline}
              onChangeText={(text) => setFormData({ ...formData, tagline: text })}
              style={{
                backgroundColor: '#2A2A2A',
                borderRadius: 4,
                padding: 10,
                marginBottom: 15,
                color: '#FFF',
                height: 60,
                textAlignVertical: 'top',
              }}
              multiline={true}
              placeholderTextColor="#666"
              placeholder="Enter a brief description of this quest"
            />

            <Text style={{ color: '#AAA', fontSize: 14, marginBottom: 5 }}>Description</Text>
            <TextInput
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              style={{
                backgroundColor: '#2A2A2A',
                borderRadius: 4,
                padding: 10,
                marginBottom: 15,
                color: '#FFF',
                height: 120,
                textAlignVertical: 'top',
              }}
              multiline={true}
              placeholderTextColor="#666"
              placeholder="Enter a detailed description of this quest"
            />

            <Text style={{ color: '#AAA', fontSize: 14, marginBottom: 5 }}>Start Date *</Text>
            <TextInput
              value={formData.start_date || ''}
              onChangeText={(text) => setFormData({ ...formData, start_date: text })}
              style={{
                backgroundColor: '#2A2A2A',
                borderRadius: 4,
                padding: 10,
                marginBottom: 15,
                color: '#FFF',
              }}
              placeholderTextColor="#666"
              placeholder="YYYY-MM-DD"
            />

            <Text style={{ color: '#AAA', fontSize: 14, marginBottom: 5 }}>End Date</Text>
            <TextInput
              value={formData.end_date || ''}
              onChangeText={(text) => setFormData({ ...formData, end_date: text })}
              style={{
                backgroundColor: '#2A2A2A',
                borderRadius: 4,
                padding: 10,
                marginBottom: 15,
                color: '#FFF',
              }}
              placeholderTextColor="#666"
              placeholder="YYYY-MM-DD (Optional)"
            />

            <Text style={{ color: '#AAA', fontSize: 14, marginBottom: 5 }}>Status *</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
              {['Active', 'On-Hold', 'Completed'].map((status) => (
                <TouchableOpacity 
                  key={status}
                  style={{
                    backgroundColor: formData.status === status ? themeColor : '#2A2A2A',
                    paddingHorizontal: 15,
                    paddingVertical: 8,
                    borderRadius: 4,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                  onPress={() => setFormData({ ...formData, status: status as QuestStatus })}
                >
                  <MaterialIcons 
                    name={
                      status === 'Completed' ? 'check-circle' :
                      status === 'On-Hold' ? 'pause' :
                      'play-arrow'
                    }
                    size={16} 
                    color={formData.status === status ? '#FFF' : '#AAA'}
                    style={{ marginRight: 5 }}
                  />
                  <Text style={{ color: formData.status === status ? '#FFF' : '#AAA' }}>
                    {status}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
              <TouchableOpacity 
                onPress={() => setFormData({ ...formData, is_main: !formData.is_main })}
                style={{ padding: 5 }}
              >
                <MaterialIcons 
                  name={formData.is_main ? "check-box" : "check-box-outline-blank"} 
                  size={24} 
                  color={formData.is_main ? secondaryColor : '#777'}
                />
              </TouchableOpacity>
              <Text style={{ color: '#AAA', marginLeft: 10 }}>Set as main quest</Text>
            </View>            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <TouchableOpacity
                onPress={onClose}
                style={{
                  backgroundColor: 'rgba(50, 50, 50, 0.8)',
                  borderRadius: 4,
                  paddingHorizontal: 15,
                  paddingVertical: 8,
                  marginRight: 10,
                }}
              >
                <Text style={{ color: '#AAA' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={!formData.title || isSubmitting}
                style={{
                  backgroundColor: !formData.title ? 'rgba(40, 40, 40, 0.8)' : themeColor,
                  borderRadius: 4,
                  paddingHorizontal: 15,
                  paddingVertical: 8,
                  opacity: !formData.title ? 0.5 : 1,
                }}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={{ color: '#FFF' }}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
            </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
