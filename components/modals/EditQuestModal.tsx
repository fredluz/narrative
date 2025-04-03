import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Modal, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { Quest } from '@/app/types';
import { deleteQuest } from '@/services/questsService';

type QuestStatus = 'Active' | 'On-Hold' | 'Completed';

interface QuestFormData {
  title: string;
  tagline: string;
  description: string;
  status: QuestStatus;
  start_date?: string;
  end_date?: string;
  is_main: boolean;
  clerk_id: string; // Add clerk_id field
}

interface EditQuestModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: QuestFormData) => Promise<void>;
  isSubmitting: boolean;
  quest?: Quest; // Make quest optional
  userId: string; // Add userId prop
  onDelete?: () => void; // Add onDelete prop
}

export function EditQuestModal({ 
  visible, 
  onClose, 
  onSubmit,
  isSubmitting,
  quest,
  userId,
  onDelete
}: EditQuestModalProps) {
  const { themeColor, secondaryColor } = useTheme();
  const [formData, setFormData] = useState<QuestFormData>({
    title: '',
    tagline: '',
    description: '',
    status: 'Active',
    start_date: '',
    end_date: '',
    is_main: false,
    clerk_id: userId
  });
  const [isDeleting, setIsDeleting] = useState(false);

  React.useEffect(() => {
    if (quest) {
      setFormData({
        title: quest.title,
        tagline: quest.tagline || '',
        description: quest.description || '',
        status: quest.status,
        start_date: quest.start_date || '',
        end_date: quest.end_date || '',
        is_main: quest.is_main,
        clerk_id: userId
      });
    }
  }, [quest, userId]);

  const handleSubmit = async () => {
    await onSubmit({
      ...formData,
      clerk_id: userId
    });
  };

  const handleDelete = async () => {
    console.log('[EditQuestModal] Starting delete process for quest:', quest?.id);
    if (!quest?.id) {
      console.warn('[EditQuestModal] No quest ID available for deletion');
      return;
    }

    try {
      setIsDeleting(true);
      console.log('[EditQuestModal] Calling deleteQuest with questId:', quest.id, 'userId:', userId);
      await deleteQuest(quest.id, userId);
      console.log('[EditQuestModal] Quest deleted successfully, calling onDelete callback');
      onDelete?.();
      console.log('[EditQuestModal] Closing modal');
      onClose();
    } catch (err) {
      console.error('[EditQuestModal] Error in delete process:', err);
      Alert.alert('Error', 'Failed to delete quest');
    } finally {
      console.log('[EditQuestModal] Resetting delete state');
      setIsDeleting(false);
    }
  };

  // Don't render the modal if there's no quest to edit
  if (!quest) return null;

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
        }}>
          <View style={{ 
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
              Edit Quest
            </Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color="#AAA" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: '100%' }}>
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
              value={formData.start_date}
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
              value={formData.end_date}
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
              <Text style={{ color: '#AAA', marginLeft: 10 }}>Set as main Quest</Text>
            </View>

            {/* Add Delete Button section before the Cancel/Update buttons */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
              <TouchableOpacity
                onPress={handleDelete}
                disabled={isDeleting}
                style={{
                  backgroundColor: '#D32F2F',
                  borderRadius: 4,
                  paddingHorizontal: 15,
                  paddingVertical: 8,
                  opacity: isDeleting ? 0.5 : 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <MaterialIcons name="delete" size={16} color="#FFF" style={{ marginRight: 5 }} />
                    <Text style={{ color: '#FFF' }}>Delete</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
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
                  <Text style={{ color: '#FFF' }}>Update</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}