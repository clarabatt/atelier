import { useEffect } from 'react';
import { Platform, ActivityIndicator, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuthStore } from '@/stores/auth';

WebBrowser.maybeCompleteAuthSession();

export default function CallbackScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const { setToken, fetchUser } = useAuthStore();

  useEffect(() => {
    if (Platform.OS !== 'web' || !token) return;

    (async () => {
      await setToken(token);
      await fetchUser();
      const { user } = useAuthStore.getState();
      if (user) {
        router.replace('/(app)');
      } else {
        router.replace('/(auth)/login');
      }
    })();
  }, [token]);

  return (
    <View className="flex-1 items-center justify-center bg-slate-50">
      <ActivityIndicator size="large" color="#2563eb" />
    </View>
  );
}
