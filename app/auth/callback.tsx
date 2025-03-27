import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { TriangularSpinner } from '@/components/loading/TriangularSpinner';
import { useTheme } from '@/contexts/ThemeContext';
import { useSupabase } from '@/contexts/SupabaseContext';

export default function AuthCallback() {
  const router = useRouter();
  const { themeColor } = useTheme();
  const { refreshSession } = useSupabase();
  const [statusMessage, setStatusMessage] = useState('Completing sign in...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        setStatusMessage('Processing authentication...');
        
        // Get the hash from the URL if present
        const hashParams = window.location.hash;
        if (hashParams) {
          // Remove the '#' from the beginning
          const cleanHash = hashParams.substring(1);
          // Parse the hash parameters
          const params = new URLSearchParams(cleanHash);
          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');
          
          if (access_token && refresh_token) {
            const { data, error } = await supabase.auth.setSession({
              access_token,
              refresh_token
            });
            
            if (error) throw error;
            if (data.session) {
              console.log('Session established from hash');
              await refreshSession();
              setTimeout(() => router.replace('/landing'), 500);
              return;
            }
          }
        }

        // If no hash parameters, try getting the current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          throw sessionError;
        }
        
        if (session) {
          console.log('Session established');
          setStatusMessage('Authentication successful!');
          await refreshSession();
          setTimeout(() => router.replace('/landing'), 500);
          return;
        }

        // Check for error in query parameters
        const url = new URL(window.location.href);
        const errorDescription = url.searchParams.get('error_description');
        
        if (errorDescription) {
          throw new Error(errorDescription);
        }
        
        // No session and no error means we need to redirect back to auth
        console.error('No session found');
        setError('No valid session found');
        setStatusMessage('No valid session found. Redirecting...');
        setTimeout(() => router.replace('/auth'), 2000);
        
      } catch (error: any) {
        console.error('Error in OAuth callback:', error);
        setError(`Error: ${error.message}`);
        setStatusMessage('An error occurred. Redirecting...');
        setTimeout(() => router.replace('/auth'), 2000);
      }
    };

    handleOAuthCallback();
  }, [router, refreshSession]);

  return (
    <View style={styles.container}>
      <TriangularSpinner size={40} color={themeColor || '#fff'} />
      <Text style={[styles.statusText, { color: themeColor || '#fff' }]}>
        {statusMessage}
      </Text>
      {error && (
        <Text style={styles.errorText}>
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#181818',
    padding: 20
  },
  statusText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center'
  },
  errorText: {
    marginTop: 10,
    color: '#ff4757',
    fontSize: 14,
    textAlign: 'center'
  }
});