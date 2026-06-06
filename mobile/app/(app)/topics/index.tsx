import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { fetchTopics, type Topic } from "@/lib/topics";
import { TopicCard } from "@/components/TopicCard";
import { EmptyState } from "@/components/EmptyState";

export default function TopicsScreen() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  function load() {
    setLoading(true);
    setError(null);
    fetchTopics(showArchived)
      .then(setTopics)
      .catch(() => setError("Could not load topics. Pull down to retry."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [showArchived]);

  return (
    <View className="flex-1 bg-slate-50">
      <View className="px-6 pt-16 pb-4 flex-row items-center justify-between">
        <Text className="text-3xl font-bold text-slate-900">Topics</Text>
        <Pressable
          className="bg-indigo-600 rounded-xl px-4 py-2 active:bg-indigo-700"
          onPress={() => router.push("/topics/new")}
        >
          <Text className="text-white text-sm font-semibold">+ New topic</Text>
        </Pressable>
      </View>

      <Pressable
        className="mx-6 mb-3 flex-row items-center gap-2"
        onPress={() => setShowArchived((v) => !v)}
      >
        <View
          className={`w-4 h-4 rounded border ${showArchived ? "bg-indigo-600 border-indigo-600" : "border-slate-300"} items-center justify-center`}
        >
          {showArchived && (
            <Text className="text-white text-xs leading-none">✓</Text>
          )}
        </View>
        <Text className="text-sm text-slate-500">Show archived</Text>
      </Pressable>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#6366f1" />
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
          ListEmptyComponent={<EmptyState showArchived={showArchived} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}
