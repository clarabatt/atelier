import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/auth';

export default function HomeScreen() {
  const { user } = useAuthStore();

  return (
    <View className="flex-1 bg-slate-50 px-6 pt-20 gap-2">
      <Text className="text-3xl font-bold text-slate-900 mb-1">
        Hello, {user?.display_name ?? 'there'}!
      </Text>
      <Text className="text-sm text-slate-500 mb-6">{user?.email}</Text>

      <Pressable
        className="bg-white border border-slate-100 rounded-2xl p-5 active:bg-slate-50"
        onPress={() => router.push('/topics')}
      >
        <Text className="text-base font-semibold text-slate-900 mb-1">Study topics</Text>
        <Text className="text-sm text-slate-500">Pick up where you left off →</Text>
      </Pressable>
    </View>
  );
}
