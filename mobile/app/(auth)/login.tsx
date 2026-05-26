import { useState } from 'react';
import { Platform, View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/auth';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

export default function LoginScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const { setToken, fetchUser } = useAuthStore();

  const handleGoogleLogin = async () => {
    const redirectUrl = Linking.createURL('callback');
    const loginUrl = `${API_URL}/auth/google/login?redirect_to=${encodeURIComponent(redirectUrl)}`;

    if (Platform.OS === 'web') {
      // On web: redirect the current page through OAuth, token is handled in callback.tsx
      window.location.href = loginUrl;
      return;
    }

    // On native: in-app browser session, token returned inline
    setIsLoading(true);
    try {
      const result = await WebBrowser.openAuthSessionAsync(loginUrl, redirectUrl);

      if (result.type === 'success' && result.url) {
        const { queryParams } = Linking.parse(result.url);
        const token = queryParams?.token as string | undefined;
        if (token) {
          await setToken(token);
          await fetchUser();
          router.replace('/(app)');
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Atelier</Text>
      <Text style={styles.subtitle}>Your AI study companion</Text>
      <Pressable style={styles.button} onPress={handleGoogleLogin} disabled={isLoading}>
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Continue with Google</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    padding: 24,
    gap: 16,
  },
  title: {
    fontSize: 40,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
