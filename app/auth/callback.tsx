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
        // Check if there's a code in the URL (PKCE flow)
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        
        if (code) {
          setStatusMessage('Processing authentication...');
          console.log('Callback: found authorization code, exchanging...');
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          
          if (error) {
            console.error('Code exchange error:', error);
            setError(`Authentication failed: ${error.message}`);
            setStatusMessage('Authentication failed. Redirecting...');
            setTimeout(() => router.replace('/auth'), 2000);
            return;
          }
          
          if (data.session) {
            console.log('Session established via code exchange');
            setStatusMessage('Authentication successful!');
            
            // Explicitly refresh the session in context
            await refreshSession();
            
            // Short delay to show success message
            setTimeout(() => router.replace('/landing'), 500);
            return;
          }
        }
        
        // Fallback: Check for existing session
        setStatusMessage('Checking session...');
        await refreshSession();
        
        // Double-check for existing session using local query to avoid potential state timing issues
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          setError(`Session error: ${sessionError.message}`);
          setStatusMessage('Session verification failed. Redirecting...');
          setTimeout(() => router.replace('/auth'), 2000);
          return;
        }
        
        if (session) {
          console.log('Existing session found');
          setStatusMessage('Session found! Redirecting...');
          setTimeout(() => router.replace('/landing'), 500);
          return;
        }
        
        console.error('No session or authorization code found');
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