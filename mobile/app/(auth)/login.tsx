import { useState } from 'react';
import { Platform, View, Text, Pressable, ActivityIndicator } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/auth';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

const FEATURES = [
  { icon: '🧠', text: 'AI-generated questions tailored to your level' },
  { icon: '📈', text: 'Track accuracy and streaks across topics' },
  { icon: '✅', text: 'AI grades written answers instantly' },
];

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
    <View className="flex-1 bg-slate-50">
      {/* Hero */}
      <View className="flex-1 items-center justify-center px-8 gap-3">
        <View className="w-20 h-20 bg-indigo-600 rounded-3xl items-center justify-center mb-2">
          <Text className="text-4xl">⚒️</Text>
        </View>
        <Text className="text-4xl font-bold text-slate-900 tracking-tight">Atelier</Text>
        <Text className="text-base text-slate-500 text-center">
          The AI study workshop that builds real knowledge.
        </Text>
      </View>

      {/* Features */}
      <View className="px-6 mb-6 gap-3">
        {FEATURES.map(({ icon, text }) => (
          <View key={text} className="flex-row items-center gap-3">
            <View className="w-9 h-9 bg-indigo-50 rounded-xl items-center justify-center">
              <Text className="text-lg">{icon}</Text>
            </View>
            <Text className="text-sm text-slate-600 flex-1">{text}</Text>
          </View>
        ))}
      </View>

      {/* CTA */}
      <View className="px-6 pb-12">
        <Pressable
          className="w-full flex-row items-center justify-center gap-3 bg-white border border-slate-200 rounded-2xl py-4 active:bg-slate-50"
          onPress={handleGoogleLogin}
          disabled={isLoading}
          style={{ elevation: 1 }}
        >
          {isLoading ? (
            <ActivityIndicator color="#6366f1" />
          ) : (
            <>
              <Text className="text-xl leading-none">G</Text>
              <Text className="text-slate-800 text-base font-semibold">Continue with Google</Text>
            </>
          )}
        </Pressable>
        <Text className="text-xs text-slate-400 text-center mt-3">
          By continuing, you agree to our Terms of Service.
        </Text>
      </View>
    </View>
  );
}
