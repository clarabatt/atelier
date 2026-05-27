import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';

export default function DiagnosticChatScreen() {
  return (
    <View className="flex-1 bg-slate-50">
      <View className="bg-indigo-600 px-6 pt-14 pb-6 flex-row items-center gap-3">
        <Pressable
          className="w-8 h-8 rounded-full bg-indigo-500 items-center justify-center active:bg-indigo-400"
          onPress={() => router.dismissAll()}
        >
          <Text className="text-white text-xl leading-none" style={{ marginTop: -1 }}>‹</Text>
        </Pressable>
        <View>
          <Text className="text-white text-xl font-bold">Diagnostic</Text>
          <Text className="text-indigo-300 text-xs">Let's find your level</Text>
        </View>
      </View>

      <View className="flex-1 items-center justify-center px-8 gap-4">
        <View className="w-16 h-16 rounded-3xl bg-indigo-50 items-center justify-center">
          <Text className="text-3xl">🤖</Text>
        </View>
        <Text className="text-base font-semibold text-slate-900">Diagnostic coming soon</Text>
        <Text className="text-sm text-slate-500 text-center leading-relaxed">
          The AI will ask a few questions here to assess your current level before generating your first batch of exercises.
        </Text>
      </View>
    </View>
  );
}
