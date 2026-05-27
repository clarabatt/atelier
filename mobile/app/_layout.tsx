import '../global.css';
import { useEffect } from 'react';
import { Stack, router, useSegments, useRootNavigationState } from 'expo-router';
import { useAuthStore } from '@/stores/auth';

function AuthGuard() {
  const { user, isLoading } = useAuthStore();
  const segments = useSegments();
  const navState = useRootNavigationState();

  useEffect(() => {
    // Wait for auth init AND for Expo Router to finish mounting its navigator.
    // Without the navState check, segments can be empty on a fresh page load
    // (e.g. web redirect back from OAuth), causing a premature redirect to login.
    if (isLoading || !navState?.key) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      router.replace('/(app)');
    }
  }, [user, isLoading, segments, navState?.key]);

  return null;
}

export default function RootLayout() {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    initialize();
  }, []);

  return (
    <>
      <AuthGuard />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
      </Stack>
    </>
  );
}
