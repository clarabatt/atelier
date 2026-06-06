import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { router } from "expo-router";
import {
  TopicStatus,
  archiveTopic,
  deleteTopic,
  fetchTopics,
  type Topic,
} from "@/lib/topics";

function formatDate(iso: string | null): string {
  if (!iso) return "No activity yet";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface TopicCardProps {
  topic: Topic;
  onArchive: (id: string, status: TopicStatus) => void;
  onDelete: (id: string, title: string) => void;
}

function TopicCard({ topic, onArchive, onDelete }: TopicCardProps) {
  const swipeRef = useRef<Swipeable>(null);
  const archiveStatus =
    topic.status === TopicStatus.Archived ? TopicStatus.Active : TopicStatus.Archived;
  const archiveLabel = topic.status === TopicStatus.Archived ? "Unarchive" : "Archive";

  function renderLeftActions() {
    return (
      <View className="bg-red-500 w-24 justify-center items-center rounded-2xl mb-3 mr-2">
        <Text className="text-white text-sm font-semibold">Delete</Text>
      </View>
    );
  }

  function renderRightActions() {
    return (
      <View className="bg-amber-400 w-28 justify-center items-center rounded-2xl mb-3 ml-2">
        <Text className="text-white text-sm font-semibold">{archiveLabel}</Text>
      </View>
    );
  }

  return (
    <Swipeable
      ref={swipeRef}
      renderLeftActions={renderLeftActions}
      renderRightActions={renderRightActions}
      onSwipeableOpen={(direction) => {
        swipeRef.current?.close();
        setTimeout(() => {
          if (direction === "left") {
            onDelete(topic.id, topic.title);
          } else {
            onArchive(topic.id, archiveStatus);
          }
        }, 50);
      }}
      friction={2}
      leftThreshold={80}
      rightThreshold={80}
    >
      <Pressable
        className="bg-white rounded-2xl p-5 mb-3 border border-slate-100 active:bg-slate-50"
        onPress={() => router.push(`/topics/${topic.id}`)}
      >
        <View className="flex-row items-start justify-between mb-2">
          <View className="flex-1 mr-2">
            <Text
              className="text-base font-semibold text-slate-900"
              numberOfLines={2}
            >
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
            <Text className="text-sm text-slate-400">
              Complete the diagnostic to begin
            </Text>
          ) : (
            <View className="flex-row items-center gap-1.5">
              <View
                className={`w-2 h-2 rounded-full ${
                  topic.accuracy_pct >= 80
                    ? "bg-emerald-400"
                    : topic.accuracy_pct >= 50
                      ? "bg-amber-400"
                      : "bg-slate-300"
                }`}
              />
              <Text className="text-sm text-slate-600">
                {topic.accuracy_pct > 0
                  ? `${topic.accuracy_pct.toFixed(0)}% accuracy`
                  : "No attempts yet"}
              </Text>
            </View>
          )}
          <Text className="text-xs text-slate-400">
            {formatDate(topic.last_activity_at)}
          </Text>
        </View>
      </Pressable>
    </Swipeable>
  );
}

function EmptyState({ showArchived }: { showArchived: boolean }) {
  return (
    <View className="flex-1 items-center justify-center px-8 gap-4">
      <Text className="text-4xl">📚</Text>
      <Text className="text-xl font-semibold text-slate-900 text-center">
        {showArchived ? "No topics yet" : "No active topics"}
      </Text>
      <Text className="text-sm text-slate-500 text-center leading-relaxed">
        {showArchived
          ? "Create your first study topic and let AI build a personalised learning path for you."
          : 'All your topics are archived. Toggle "Show archived" to see them.'}
      </Text>
    </View>
  );
}

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

  async function handleArchive(id: string, newStatus: TopicStatus) {
    try {
      await archiveTopic(id, newStatus);
      load();
    } catch {
      Alert.alert("Error", "Could not update topic status. Please try again.");
    }
  }

  function handleDelete(id: string, title: string) {
    Alert.alert(
      "Delete topic?",
      `This will permanently delete "${title}" and all its questions, sessions, and stats. This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteTopic(id);
              load();
            } catch {
              Alert.alert("Error", "Could not delete topic. Please try again.");
            }
          },
        },
      ],
    );
  }

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
          renderItem={({ item }) => (
            <TopicCard
              topic={item}
              onArchive={handleArchive}
              onDelete={handleDelete}
            />
          )}
          contentContainerClassName="px-6 pb-8 flex-grow"
          ListEmptyComponent={<EmptyState showArchived={showArchived} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}
