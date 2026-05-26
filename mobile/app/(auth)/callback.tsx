import { useEffect } from 'react';
import { Platform, ActivityIndicator, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuthStore } from '@/stores/auth';

// On native: signals openAuthSessionAsync to close the in-app browser and return the URL.
// On web: no-op (we use the page-redirect flow instead of a popup).
WebBrowser.maybeCompleteAuthSession();

export default function CallbackScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const { setToken, fetchUser } = useAuthStore();

  useEffect(() => {
    if (Platform.OS !== 'web' || !token) return;

    (async () => {
      await setToken(token);
      await fetchUser();
      // Only navigate if fetchUser succeeded (user is now set in the store)
      const { user } = useAuthStore.getState();
      if (user) {
        router.replace('/(app)');
      } else {
        router.replace('/(auth)/login');
      }
    })();
  }, [token]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' }}>
      <ActivityIndicator size="large" color="#2563eb" />
    </View>
  );
}
