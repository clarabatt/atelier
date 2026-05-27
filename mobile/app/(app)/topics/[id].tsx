import { View, Text, Pressable } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

export default function TopicDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <View className="flex-1 bg-slate-50">
      <View className="px-6 pt-16 pb-4 flex-row items-center gap-3">
        <Pressable
          className="w-9 h-9 items-center justify-center rounded-full bg-white border border-slate-100 active:bg-slate-50"
          onPress={() => router.back()}
        >
          <Text className="text-slate-600 text-lg">‹</Text>
        </Pressable>
        <Text className="text-xl font-semibold text-slate-900">Topic</Text>
      </View>

      <View className="flex-1 items-center justify-center px-8 gap-3">
        <Text className="text-slate-400 text-sm text-center">
          Topic detail coming soon.
        </Text>
        <Text className="text-slate-300 text-xs font-mono">{id}</Text>
      </View>
    </View>
  );
}
