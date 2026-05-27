import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { fetchTopic, type TopicDetail } from '@/lib/topics';

export default function TopicDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const topicId = Array.isArray(id) ? id[0] : id;

  const [topic, setTopic] = useState<TopicDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchTopic(topicId)
      .then(setTopic)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [topicId]);

  return (
    <View className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="bg-indigo-600 px-6 pt-14 pb-6 flex-row items-center gap-3">
        <Pressable
          className="w-8 h-8 rounded-full bg-indigo-500 items-center justify-center active:bg-indigo-400"
          onPress={() => router.back()}
        >
          <Text className="text-white text-xl leading-none" style={{ marginTop: -1 }}>‹</Text>
        </Pressable>
        <View className="flex-1">
          <Text className="text-white text-xl font-bold" numberOfLines={1}>
            {topic?.title ?? ' '}
          </Text>
          {topic && (
            <Text className="text-indigo-300 text-xs capitalize">{topic.domain}</Text>
          )}
        </View>
      </View>

      {/* Body */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      ) : error || !topic ? (
        <View className="flex-1 items-center justify-center px-8 gap-2">
          <Text className="text-sm text-slate-500 text-center">
            Could not load topic. Please go back and try again.
          </Text>
        </View>
      ) : (
        <View className="px-5 pt-5 gap-4">
          {/* Level summary — only shown once diagnostic is complete */}
          {topic.ai_level_summary && (
            <View className="bg-white border border-slate-100 rounded-2xl p-5 gap-2">
              <Text className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">
                Your level
              </Text>
              <Text className="text-sm text-slate-700 leading-relaxed">
                {topic.ai_level_summary}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}
