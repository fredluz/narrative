# Multiple Personalities Implementation Plan

## Overview

This document outlines a strategy for implementing multiple AI personalities in the QuestLog app. The system will allow users to interact with different AI personalities based on their profile preferences stored in both the 'ai_personality' field of the 'profiles' table and localStorage for quick access.

## Current Architecture

1. **PersonalityPrompts.ts** - Contains personality-specific prompts and a mechanism to retrieve them
2. **ChatAgent.ts** - Handles chat-related AI interactions with customizable personality
3. **JournalAgent.ts** - Handles journal-related AI interactions with customizable personality
4. **SettingsButton.tsx** - UI for changing personalities
5. **personalityService.ts** - Service for managing personality preferences

## Implementation Strategy

### 1. Local Storage Integration

The key to this implementation is using localStorage as the primary source of truth for the current personality, with the database as a backup and synchronization mechanism.

```typescript
// In personalityService.ts
const PERSONALITY_STORAGE_KEY = '@questlog/user_personality/';

export const personalityService = {
  async getUserPersonality(userId: string): Promise<PersonalityType> {
    try {
      // Try localStorage first
      const stored = await AsyncStorage.getItem(PERSONALITY_STORAGE_KEY + userId);
      if (stored) {
        return stored as PersonalityType;
      }
      
      // If not in localStorage, get from database
      const { data, error } = await supabase
        .from('profiles')
        .select('ai_personality')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      
      // Use TFRobot as default
      const personality = (data?.ai_personality as PersonalityType) || 'TFRobot';
      
      // Save to localStorage for next time
      await AsyncStorage.setItem(PERSONALITY_STORAGE_KEY + userId, personality);
      
      return personality;
    } catch (error) {
      console.error('Error getting personality:', error);
      return 'TFRobot';
    }
  },

  async setUserPersonality(userId: string, personality: PersonalityType): Promise<void> {
    try {
      // Update localStorage immediately
      await AsyncStorage.setItem(PERSONALITY_STORAGE_KEY + userId, personality);
      
      // Then update database in background
      await supabase
        .from('profiles')
        .update({ ai_personality: personality })
        .eq('id', userId);
    } catch (error) {
      console.error('Error setting personality:', error);
    }
  }
};
```

### 2. Agent Implementation

Instead of storing personality state in the agents, they should query the current personality each time they need it:

```typescript
export class ChatAgent {
  async generateChatResponse(message: string, userId: string): Promise<string[]> {
    // Get current personality for this call
    const personalityType = await personalityService.getUserPersonality(userId);
    const personality = getPersonality(personalityType);
    
    // Use personality.chatSystem in the prompt
    // ... rest of implementation
  }
}

export class JournalAgent {
  async generateResponse(currentEntry: string, userId: string): Promise<string> {
    // Get current personality for this call
    const personalityType = await personalityService.getUserPersonality(userId);
    const personality = getPersonality(personalityType);
    
    // Use personality.journalResponseSystem in the prompt
    // ... rest of implementation
  }
}
```

### 3. UI Updates

The settings UI already handles personality switching correctly by:
1. Reading initial personality from the service
2. Showing current selection
3. Updating both local storage and database when changed

## Benefits of This Approach

1. **Simplicity**: 
   - No need for complex caching systems
   - No need for agent factories or instance management
   - Each agent call is self-contained

2. **Reliability**:
   - Always uses the latest personality setting
   - No stale state or sync issues
   - Graceful fallback to default personality

3. **Performance**:
   - Fast access via localStorage
   - Background database updates don't block UI
   - Minimal overhead per request

## Implementation Steps

1. **Update PersonalityService**:
   - Implement the localStorage-based service
   - Ensure proper error handling and defaults
   - Add migration helper for existing users

2. **Update Agents**:
   - Remove stored personality state
   - Add personality lookup to each method that needs it
   - Update error handling for missing user IDs

3. **Test Suite**:
   - Verify personality switching works immediately
   - Check database sync happens correctly
   - Validate fallback behavior works

## Migration Plan

1. **For Existing Users**:
   - On first app load, copy database personality to localStorage
   - Keep database updated as backup
   - No downtime needed for migration

2. **Rollback Plan**:
   - Can revert to database-only if needed
   - No data loss risk
   - Simple feature flag to control source of truth

## Future Enhancements

1. **Offline Support**:
   - Already handled by localStorage
   - Queue personality changes when offline
   - Sync when connection returns

2. **Performance Monitoring**:
   - Track personality lookup times
   - Monitor database sync success rates
   - Gather usage analytics

3. **User Preferences**:
   - Allow personality customization
   - Save custom prompts to localStorage
   - Sync preferences to database

## Technical Notes

1. **Error Handling**:
   - Always default to 'TFRobot' if errors occur
   - Log issues but continue functioning
   - Notify user only for permanent failures

2. **Security**:
   - Validate personality values before storage
   - Clear localStorage on logout
   - Maintain database RLS policies

3. **Testing**:
   - Mock localStorage in tests
   - Verify personality changes are immediate
   - Test error recovery scenarios