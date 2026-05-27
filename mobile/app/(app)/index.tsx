import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/auth';
import { fetchTopics, type Topic } from '@/lib/topics';

export default function HomeScreen() {
  const { user } = useAuthStore();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTopics()
      .then(setTopics)
      .catch(() => setTopics([]))
      .finally(() => setLoading(false));
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const initials = user?.display_name
    ? user.display_name.split(' ').slice(0, 2).map((w) => w[0].toUpperCase()).join('')
    : '?';

  const recentTopics = topics
    .filter((t) => t.last_activity_at !== null)
    .sort((a, b) => new Date(b.last_activity_at!).getTime() - new Date(a.last_activity_at!).getTime())
    .slice(0, 2);

  return (
    <View className="flex-1 bg-slate-100">

      {/* Coloured header */}
      <View className="bg-indigo-600 px-6 pt-14 pb-12">
        <View className="flex-row items-start justify-between mb-3">
          <Text className="text-indigo-300 text-sm">{greeting}</Text>
          {user?.picture_url ? (
            <Image
              source={{ uri: user.picture_url }}
              style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: '#818cf8' }}
            />
          ) : (
            <View
              style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: '#818cf8' }}
              className="bg-indigo-500 items-center justify-center"
            >
              <Text className="text-white text-sm font-bold">{initials}</Text>
            </View>
          )}
        </View>
        <Text className="text-white text-3xl font-bold">
          {user?.display_name ?? 'there'} 👋
        </Text>
      </View>

      {/* Card sheet that overlaps the header */}
      <View className="flex-1 px-5 -mt-6">
        {loading ? (
          <View className="bg-white rounded-3xl p-8 items-center" style={{ elevation: 2 }}>
            <ActivityIndicator size="small" color="#6366f1" />
          </View>
        ) : recentTopics.length > 0 ? (
          <View className="bg-white rounded-3xl p-5" style={{ elevation: 2 }}>
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-base font-bold text-slate-800">Recent topics</Text>
              <Pressable onPress={() => router.push('/topics')}>
                <Text className="text-sm text-indigo-600 font-medium">See all →</Text>
              </Pressable>
            </View>

            {recentTopics.map((topic, i) => (
              <Pressable
                key={topic.id}
                className={`flex-row items-center py-3.5 active:bg-slate-50 ${
                  i < recentTopics.length - 1 ? 'border-b border-slate-100' : ''
                }`}
                onPress={() => router.push(`/topics/${topic.id}`)}
              >
                {/* Coloured domain circle */}
                <View className="w-10 h-10 rounded-2xl bg-indigo-50 items-center justify-center mr-3">
                  <Text className="text-base">{domainEmoji(topic.domain)}</Text>
                </View>

                {/* Title + domain */}
                <View className="flex-1 mr-3">
                  <Text className="text-sm font-semibold text-slate-900 mb-0.5" numberOfLines={1}>
                    {topic.title}
                  </Text>
                  <Text className="text-xs text-slate-400 capitalize">{topic.domain}</Text>
                </View>

                {/* Accuracy badge */}
                <View
                  className={`rounded-xl px-2.5 py-1 ${
                    topic.accuracy_pct >= 80
                      ? 'bg-emerald-50'
                      : topic.accuracy_pct >= 50
                        ? 'bg-amber-50'
                        : 'bg-slate-100'
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      topic.accuracy_pct >= 80
                        ? 'text-emerald-600'
                        : topic.accuracy_pct >= 50
                          ? 'text-amber-600'
                          : 'text-slate-400'
                    }`}
                  >
                    {topic.accuracy_pct > 0 ? `${topic.accuracy_pct.toFixed(0)}%` : '—'}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        ) : (
          <Pressable
            className="bg-white rounded-3xl p-6 active:bg-slate-50"
            style={{ elevation: 2 }}
            onPress={() => router.push('/topics')}
          >
            <Text className="text-3xl mb-3">📚</Text>
            <Text className="text-base font-bold text-slate-900 mb-1">Start studying</Text>
            <Text className="text-sm text-slate-500 leading-relaxed">
              Create your first topic and begin your AI-powered learning journey.
            </Text>
          </Pressable>
        )}
      </View>

    </View>
  );
}

function domainEmoji(domain: string): string {
  const map: Record<string, string> = {
    french: '🇫🇷',
    spanish: '🇪🇸',
    english: '🇬🇧',
    history: '🏛️',
    science: '🔬',
    math: '📐',
    maths: '📐',
    music: '🎵',
    art: '🎨',
    geography: '🌍',
    biology: '🧬',
    chemistry: '⚗️',
    physics: '⚡',
    literature: '📖',
  };
  return map[domain.toLowerCase()] ?? '📝';
}
