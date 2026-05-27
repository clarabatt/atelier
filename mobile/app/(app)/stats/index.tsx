import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { api } from '@/lib/api';

interface TopicStatRow {
  topic_id: string;
  topic_title: string;
  accuracy_pct: number;
  total_answered: number;
  total_skipped: number;
  streak_days: number;
  last_activity_at: string | null;
}

interface UserStats {
  total_topics: number;
  overall_accuracy: number;
  current_streak: number;
  total_answered: number;
  topics: TopicStatRow[];
}

function SummaryCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <View className="flex-1 bg-white border border-slate-100 rounded-2xl p-4 items-center gap-1">
      <Text className="text-2xl font-bold text-slate-900">{value}</Text>
      <Text className="text-xs font-medium text-slate-500 text-center">{label}</Text>
      {sub ? <Text className="text-xs text-slate-400">{sub}</Text> : null}
    </View>
  );
}

function TopicRow({ topic }: { topic: TopicStatRow }) {
  const lastDate = topic.last_activity_at
    ? new Date(topic.last_activity_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : null;

  return (
    <Pressable
      className="bg-white border border-slate-100 rounded-2xl px-4 py-4 mb-2 active:bg-slate-50"
      onPress={() => router.push(`/(app)/topics/${topic.topic_id}` as never)}
    >
      <View className="flex-row justify-between items-start mb-2">
        <Text className="text-sm font-semibold text-slate-900 flex-1 pr-2" numberOfLines={1}>
          {topic.topic_title}
        </Text>
        <Text className="text-sm font-bold text-indigo-600">{topic.accuracy_pct}%</Text>
      </View>
      <View className="flex-row gap-4">
        <Text className="text-xs text-slate-400">{topic.total_answered} answered</Text>
        {topic.total_skipped > 0 && (
          <Text className="text-xs text-slate-400">{topic.total_skipped} skipped</Text>
        )}
        {lastDate && <Text className="text-xs text-slate-400">Last: {lastDate}</Text>}
      </View>
    </Pressable>
  );
}

export default function StatsScreen() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  function load() {
    setLoading(true);
    setError(false);
    api.get<UserStats>('/api/stats')
      .then(({ data }) => setStats(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

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

      {!loading && error && (
        <View className="flex-1 items-center justify-center px-8 gap-3">
          <Text className="text-sm text-slate-500 text-center">Could not load stats.</Text>
          <Pressable onPress={load} className="mt-1">
            <Text className="text-indigo-600 font-semibold text-sm">Try again</Text>
          </Pressable>
        </View>
      )}

      {!loading && !error && stats && (
        <ScrollView className="flex-1" contentContainerClassName="px-5 pt-5 pb-12">
          <View className="flex-row gap-3 mb-3">
            <SummaryCard label="Topics" value={String(stats.total_topics)} />
            <SummaryCard label="Accuracy" value={`${stats.overall_accuracy}%`} />
          </View>
          <View className="flex-row gap-3 mb-6">
            <SummaryCard
              label="Streak"
              value={String(stats.current_streak)}
              sub={stats.current_streak === 1 ? 'day' : 'days'}
            />
            <SummaryCard label="Answered" value={String(stats.total_answered)} />
          </View>

          {stats.topics.length === 0 ? (
            <View className="items-center py-12 gap-2">
              <Text className="text-4xl mb-2">📊</Text>
              <Text className="text-slate-600 font-semibold">Nothing here yet</Text>
              <Text className="text-slate-400 text-sm text-center">
                Complete a practice session to start tracking your progress.
              </Text>
            </View>
          ) : (
            <>
              <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                By topic
              </Text>
              {stats.topics.map((t) => (
                <TopicRow key={t.topic_id} topic={t} />
              ))}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}
