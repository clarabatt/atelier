import { useState } from 'react';
import { Platform, View, Text, Pressable, ActivityIndicator } from 'react-native';
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
      window.location.href = loginUrl;
      return;
    }

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
    <View className="flex-1 items-center justify-center bg-slate-50 px-6 gap-4">
      <Text className="text-5xl font-bold text-slate-900 tracking-tight">Atelier</Text>
      <Text className="text-base text-slate-500 mb-4">Your AI study companion</Text>
      <Pressable
        className="w-full items-center bg-blue-600 rounded-xl py-4 active:bg-blue-700"
        onPress={handleGoogleLogin}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-white text-base font-semibold">Continue with Google</Text>
        )}
      </Pressable>
    </View>
  );
}
