import { useEffect } from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { TriangularSpinner } from '@/components/loading/TriangularSpinner';
import { useTheme } from '@/contexts/ThemeContext';

export default function AuthCallback() {
  const router = useRouter();
  const { themeColor } = useTheme();

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        // Check if there's a code in the URL (PKCE flow)
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        
        if (code) {
          console.log('Callback: found authorization code, exchanging...');
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          
          if (error) {
            console.error('Code exchange error:', error);
            throw error;
          }
          
          if (data.session) {
            console.log('Session established via code exchange');
            router.replace('/landing');
            return;
          }
        }
        
        // Check for existing session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session error:', error);
          throw error;
        }
        
        if (session) {
          console.log('Existing session found');
          router.replace('/landing');
          return;
        }
        
        console.error('No session or authorization code found');
        router.replace('/auth');
        
      } catch (error) {
        console.error('Error in OAuth callback:', error);
        router.replace('/auth');
      }
    };

    handleOAuthCallback();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#181818' }}>
      <TriangularSpinner size={40} color={themeColor || '#fff'} />
      <Text style={{ color: themeColor || '#fff', marginTop: 16 }}>
        Completing sign in...
      </Text>
    </View>
  );
}