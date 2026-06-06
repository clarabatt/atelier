import { Text, View } from 'react-native';

interface EmptyStateProps {
  showArchived: boolean;
}

export function EmptyState({ showArchived }: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center px-8 gap-4">
      <Text className="text-4xl">📚</Text>
      <Text className="text-xl font-semibold text-slate-900 text-center">
        {showArchived ? 'No topics yet' : 'No active topics'}
      </Text>
      <Text className="text-sm text-slate-500 text-center leading-relaxed">
        {showArchived
          ? 'Create your first study topic and let AI build a personalised learning path for you.'
          : 'All your topics are archived. Toggle "Show archived" to see them.'}
      </Text>
    </View>
  );
}
