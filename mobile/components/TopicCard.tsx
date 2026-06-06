import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { TopicStatus, type Topic } from '@/lib/topics';
import { formatDate } from '@/lib/utils';

interface TopicCardProps {
  topic: Topic;
}

export function TopicCard({ topic }: TopicCardProps) {
  return (
    <Pressable
      className="bg-white rounded-2xl p-5 mb-3 border border-slate-100 active:bg-slate-50"
      onPress={() => router.push(`/topics/${topic.id}`)}
    >
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-1 mr-2">
          <Text className="text-base font-semibold text-slate-900" numberOfLines={2}>
            {topic.title}
          </Text>
          {topic.status === TopicStatus.Archived && (
            <Text className="text-xs text-slate-400 mt-0.5">Archived</Text>
          )}
          {topic.status === TopicStatus.NotStarted && (
            <Text className="text-xs text-amber-500 mt-0.5">Pending setup</Text>
          )}
        </View>
        <View className="bg-indigo-50 rounded-lg px-2.5 py-1">
          <Text className="text-xs font-medium text-indigo-600 capitalize">
            {topic.domain}
          </Text>
        </View>
      </View>

      <View className="flex-row items-center justify-between">
        {topic.status === TopicStatus.NotStarted ? (
          <Text className="text-sm text-slate-400">Complete the diagnostic to begin</Text>
        ) : (
          <View className="flex-row items-center gap-1.5">
            <View
              className={`w-2 h-2 rounded-full ${
                topic.accuracy_pct >= 80
                  ? 'bg-emerald-400'
                  : topic.accuracy_pct >= 50
                    ? 'bg-amber-400'
                    : 'bg-slate-300'
              }`}
            />
            <Text className="text-sm text-slate-600">
              {topic.accuracy_pct > 0
                ? `${topic.accuracy_pct.toFixed(0)}% accuracy`
                : 'No attempts yet'}
            </Text>
          </View>
        )}
        <Text className="text-xs text-slate-400">{formatDate(topic.last_activity_at)}</Text>
      </View>
    </Pressable>
  );
}
