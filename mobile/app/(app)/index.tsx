import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/auth';

export default function HomeScreen() {
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <View className="flex-1 bg-slate-50 px-6 pt-20 gap-2">
      <Text className="text-3xl font-bold text-slate-900 mb-1">
        Hello, {user?.display_name ?? 'there'}!
      </Text>
      <Text className="text-sm text-slate-500 mb-6">{user?.email}</Text>
      <Text className="text-base text-slate-400 italic">
        Your study topics will appear here.
      </Text>
      <Pressable
        className="mt-auto border border-slate-200 rounded-xl py-4 items-center active:bg-slate-100"
        onPress={handleLogout}
      >
        <Text className="text-slate-500 text-base">Sign out</Text>
      </Pressable>
    </View>
  );
}
