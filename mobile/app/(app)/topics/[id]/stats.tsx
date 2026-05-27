import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  fetchTopicDetailStats,
  type TopicDetailStats,
  type WeakSpot,
} from '@/lib/stats';

export default function TopicStatsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const topicId = Array.isArray(id) ? id[0] : id;

  const [stats, setStats] = useState<TopicDetailStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchTopicDetailStats(topicId)
      .then(setStats)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [topicId]);

  return (
    <View className="flex-1 bg-slate-50">
      <View className="bg-indigo-600 px-6 pt-14 pb-5 flex-row items-center gap-3">
        <Pressable
          className="w-8 h-8 rounded-full bg-indigo-500 items-center justify-center active:bg-indigo-400"
          onPress={() => router.back()}
        >
          <Text className="text-white text-xl leading-none" style={{ marginTop: -1 }}>‹</Text>
        </Pressable>
        <Text className="text-white text-xl font-bold">Topic stats</Text>
      </View>

      {loading && (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      )}

      {error && (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-slate-500 text-sm text-center">
            Could not load topic stats.
          </Text>
        </View>
      )}

      {stats && !loading && (
        <ScrollView contentContainerClassName="px-5 pt-5 pb-12 gap-6">
          {/* Current batch progress */}
          {stats.current_batch && (
            <View>
              <Text className="text-sm font-semibold text-slate-700 mb-3">
                Current batch (#{stats.current_batch.batch_number})
              </Text>
              <View className="bg-white border border-slate-100 rounded-2xl p-4 flex-row gap-4">
                <StatPill label="Correct" value={stats.current_batch.correct} color="text-emerald-600" />
                <StatPill label="Wrong" value={stats.current_batch.wrong} color="text-red-500" />
                <StatPill label="Skipped" value={stats.current_batch.skipped} color="text-slate-400" />
                <StatPill
                  label="Total Qs"
                  value={stats.current_batch.total_questions}
                  color="text-slate-700"
                />
              </View>
            </View>
          )}

          {/* Accuracy chart */}
          {stats.session_history.length > 0 && (
            <View>
              <Text className="text-sm font-semibold text-slate-700 mb-3">Accuracy over time</Text>
              <View className="bg-white border border-slate-100 rounded-2xl p-4">
                {stats.session_history.length === 1 ? (
                  <View className="items-center py-4">
                    <Text className="text-3xl font-bold text-indigo-600">
                      {stats.session_history[0].accuracy_pct}%
                    </Text>
                    <Text className="text-xs text-slate-500 mt-1">First session</Text>
                  </View>
                ) : (
                  <MiniBarChart points={stats.session_history.map((p) => p.accuracy_pct)} />
                )}
              </View>
            </View>
          )}

          {/* Batch history */}
          {stats.batch_history.length > 0 && (
            <View>
              <Text className="text-sm font-semibold text-slate-700 mb-3">Batch history</Text>
              <View className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
                {stats.batch_history.map((row, i) => (
                  <View
                    key={i}
                    className={`px-4 py-3 flex-row justify-between items-center ${
                      i < stats.batch_history.length - 1 ? 'border-b border-slate-100' : ''
                    }`}
                  >
                    <View>
                      <Text className="text-sm font-semibold text-slate-900">
                        Batch #{row.batch_number}
                      </Text>
                      <Text className="text-xs text-slate-500">
                        {new Date(row.date).toLocaleDateString()} · {row.questions_answered} answered
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className={`text-sm font-bold ${row.passed ? 'text-emerald-600' : 'text-red-500'}`}>
                        {row.accuracy_pct}%
                      </Text>
                      <Text className={`text-xs ${row.passed ? 'text-emerald-500' : 'text-slate-400'}`}>
                        {row.passed ? 'Passed' : 'In progress'}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Weak spots */}
          {stats.weak_spots.length > 0 && (
            <View>
              <Text className="text-sm font-semibold text-slate-700 mb-3">Weak spots</Text>
              {stats.weak_spots.map((spot) => (
                <WeakSpotCard key={spot.id} spot={spot} />
              ))}
            </View>
          )}

          {stats.batch_history.length === 0 &&
            stats.session_history.length === 0 &&
            stats.weak_spots.length === 0 &&
            !stats.current_batch && (
              <View className="items-center py-12">
                <Text className="text-slate-400 text-sm">No activity yet for this topic.</Text>
              </View>
            )}
        </ScrollView>
      )}
    </View>
  );
}

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View className="items-center flex-1">
      <Text className={`text-base font-bold ${color}`}>{value}</Text>
      <Text className="text-xs text-slate-500">{label}</Text>
    </View>
  );
}

function MiniBarChart({ points }: { points: number[] }) {
  const max = Math.max(...points, 1);
  return (
    <View className="flex-row items-end gap-1 h-16">
      {points.map((p, i) => (
        <View
          key={i}
          className="flex-1 rounded-t bg-indigo-400"
          style={{ height: `${(p / max) * 100}%` }}
        />
      ))}
    </View>
  );
}

function WeakSpotCard({ spot }: { spot: WeakSpot }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Pressable
      className="bg-white border border-slate-100 rounded-2xl p-4 mb-3"
      onPress={() => setExpanded((v) => !v)}
    >
      <Text className="text-sm text-slate-800 leading-relaxed mb-1">{spot.body}</Text>
      {expanded && (
        <>
          <View className="h-px bg-slate-100 my-2" />
          <Text className="text-xs font-semibold text-emerald-600 mb-1">Correct answer</Text>
          <Text className="text-sm text-emerald-800 mb-2">{spot.correct_answer}</Text>
          <Text className="text-xs font-semibold text-slate-500 mb-1">Reasoning</Text>
          <Text className="text-sm text-slate-600">{spot.reasoning}</Text>
        </>
      )}
      <Text className="text-xs text-indigo-500 mt-1">{expanded ? 'Collapse ▲' : 'See answer ▼'}</Text>
    </Pressable>
  );
}
