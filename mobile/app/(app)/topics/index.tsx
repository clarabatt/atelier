import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { fetchTopics, type Topic } from '@/lib/topics';

function formatDate(iso: string | null): string {
  if (!iso) return 'No activity yet';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function TopicCard({ topic }: { topic: Topic }) {
  return (
    <Pressable
      className="bg-white rounded-2xl p-5 mb-3 border border-slate-100 active:bg-slate-50"
      onPress={() => router.push(`/topics/${topic.id}`)}
    >
      <View className="flex-row items-start justify-between mb-2">
        <Text className="text-base font-semibold text-slate-900 flex-1 mr-3" numberOfLines={2}>
          {topic.title}
        </Text>
        <View className="bg-slate-100 rounded-lg px-2.5 py-1">
          <Text className="text-xs font-medium text-slate-500 capitalize">{topic.domain}</Text>
        </View>
      </View>

      <View className="flex-row items-center justify-between">
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
            {topic.accuracy_pct > 0 ? `${topic.accuracy_pct.toFixed(0)}% accuracy` : 'Not started'}
          </Text>
        </View>
        <Text className="text-xs text-slate-400">{formatDate(topic.last_activity_at)}</Text>
      </View>
    </Pressable>
  );
}

function EmptyState() {
  return (
    <View className="flex-1 items-center justify-center px-8 gap-4">
      <Text className="text-4xl">📚</Text>
      <Text className="text-xl font-semibold text-slate-900 text-center">
        No topics yet
      </Text>
      <Text className="text-sm text-slate-500 text-center leading-relaxed">
        Create your first study topic and let AI build a personalised learning path for you.
      </Text>
    </View>
  );
}

export default function TopicsScreen() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTopics()
      .then(setTopics)
      .catch(() => setError('Could not load topics. Pull down to retry.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <View className="flex-1 bg-slate-50">
      <View className="px-6 pt-16 pb-4">
        <Text className="text-3xl font-bold text-slate-900">Topics</Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#64748b" />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-sm text-slate-500 text-center">{error}</Text>
        </View>
      ) : (
        <FlatList
          data={topics}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <TopicCard topic={item} />}
          contentContainerClassName="px-6 pb-8 flex-grow"
          ListEmptyComponent={<EmptyState />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}
