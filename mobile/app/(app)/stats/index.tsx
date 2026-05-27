import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { fetchUserStats, type TopicStatRow, type UserStats } from '@/lib/stats';

export default function StatsScreen() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchUserStats()
      .then(setStats)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <View className="flex-1 bg-slate-50">
      <View className="bg-indigo-600 px-6 pt-14 pb-5">
        <Text className="text-white text-2xl font-bold">Stats</Text>
      </View>

      {loading && (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      )}

      {error && (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-slate-500 text-sm text-center">
            Could not load stats. Please try again later.
          </Text>
        </View>
      )}

      {stats && !loading && (
        <ScrollView contentContainerClassName="px-5 pt-5 pb-12">
          {/* Summary cards */}
          <View className="flex-row flex-wrap gap-3 mb-6">
            <SummaryCard label="Topics" value={String(stats.total_topics)} />
            <SummaryCard label="Accuracy" value={`${stats.overall_accuracy}%`} />
            <SummaryCard label="Streak" value={`${stats.current_streak}d`} />
            <SummaryCard label="Answered" value={String(stats.total_answered)} />
          </View>

          {/* Per-topic table */}
          <Text className="text-sm font-semibold text-slate-700 mb-3">Topics</Text>
          {stats.topics.length === 0 ? (
            <View className="bg-white border border-slate-100 rounded-2xl p-6 items-center">
              <Text className="text-slate-500 text-sm text-center">
                No activity yet. Start a study session to see your stats here.
              </Text>
            </View>
          ) : (
            stats.topics.map((t) => (
              <TopicRow
                key={t.id}
                topic={t}
                onPress={() => router.push(`/topics/${t.id}/stats`)}
              />
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 min-w-[40%] bg-white border border-slate-100 rounded-2xl p-4">
      <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</Text>
      <Text className="text-2xl font-bold text-slate-900">{value}</Text>
    </View>
  );
}

function TopicRow({ topic, onPress }: { topic: TopicStatRow; onPress: () => void }) {
  const lastDate = topic.last_activity_at
    ? new Date(topic.last_activity_at).toLocaleDateString()
    : '—';

  return (
    <Pressable
      className="bg-white border border-slate-100 rounded-2xl p-4 mb-3 active:bg-slate-50"
      onPress={onPress}
    >
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-1 mr-3">
          <Text className="text-sm font-semibold text-slate-900">{topic.title}</Text>
          <Text className="text-xs text-slate-500">{topic.domain}</Text>
        </View>
        <Text className="text-base font-bold text-indigo-600">{topic.accuracy_pct}%</Text>
      </View>
      <View className="flex-row gap-4">
        <Text className="text-xs text-slate-500">Answered: {topic.total_answered}</Text>
        <Text className="text-xs text-slate-500">Skipped: {topic.total_skipped}</Text>
        <Text className="text-xs text-slate-500">Last: {lastDate}</Text>
      </View>
    </Pressable>
  );
}
