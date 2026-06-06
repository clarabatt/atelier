import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  TopicStatus,
  archiveTopic,
  deleteTopic,
  fetchTopic,
  generateBatch,
  type TopicDetail,
} from "@/lib/topics";
import { ActionMenu, ActionMenuItem } from "@/components/ActionMenu";
import { ScreenHeader } from "@/components/ScreenHeader";
import { capitalizeFirst, formatDate } from "@/lib/utils";

export default function TopicDetailScreen() {
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const topicId = Array.isArray(id) ? id[0] : id;
  const showLevelCard = from === "diagnostic";

  const [topic, setTopic] = useState<TopicDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [generatingBatch, setGeneratingBatch] = useState(false);
  const [batchError, setBatchError] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchTopic(topicId)
      .then((t) => {
        if (t.ai_level_summary === null) {
          router.replace(`/topics/${topicId}/chat`);
        } else {
          setTopic(t);
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [topicId]);

  async function handleRetryBatch() {
    if (!topic) return;
    setGeneratingBatch(true);
    setBatchError(false);
    try {
      await generateBatch(topic.id);
      setTopic({ ...topic, has_batch: true });
    } catch {
      setBatchError(true);
    } finally {
      setGeneratingBatch(false);
    }
  }

  async function handleArchiveToggle() {
    if (!topic) return;
    setMenuVisible(false);
    const newStatus =
      topic.status === TopicStatus.Archived
        ? TopicStatus.Active
        : TopicStatus.Archived;
    try {
      await archiveTopic(topic.id, newStatus);
      setTopic({ ...topic, status: newStatus });
    } catch {
      Alert.alert("Error", "Could not update topic status. Please try again.");
    }
  }

  async function confirmDelete() {
    if (!topic) return;
    setDeleting(true);
    try {
      await deleteTopic(topic.id);
      setMenuVisible(false);
      setConfirmingDelete(false);
      router.replace("/topics");
    } catch {
      setDeleting(false);
      Alert.alert("Error", "Could not delete topic. Please try again.");
    }
  }

  function closeMenu() {
    setMenuVisible(false);
    setConfirmingDelete(false);
  }

  const archiveLabel =
    topic?.status === TopicStatus.Archived ? "Unarchive" : "Archive";

  const accuracyColor =
    (topic?.accuracy_pct ?? 0) >= 80
      ? "text-emerald-600"
      : (topic?.accuracy_pct ?? 0) >= 50
        ? "text-amber-500"
        : "text-slate-400";

  const dotColor =
    (topic?.accuracy_pct ?? 0) >= 80
      ? "bg-emerald-400"
      : (topic?.accuracy_pct ?? 0) >= 50
        ? "bg-amber-400"
        : "bg-slate-300";

  const menuButton = (
    <Pressable
      className="w-8 h-8 items-center justify-center rounded-full active:bg-indigo-500"
      onPress={() => setMenuVisible(true)}
    >
      <Text className="text-white text-xl font-bold leading-none">⋮</Text>
    </Pressable>
  );

  return (
    <View className="flex-1 bg-slate-50">
      <ScreenHeader
        title={topic?.title ?? " "}
        subtitle={topic ? capitalizeFirst(topic.domain) : undefined}
        rightAction={topic ? menuButton : undefined}
        onBack={() => router.replace("/topics")}
      />

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
          {showLevelCard && (
            <View className="bg-white border border-slate-100 rounded-2xl p-5 gap-2">
              <Text className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">
                Your level
              </Text>
              <Text className="text-sm text-slate-700 leading-relaxed">
                {topic.ai_level_summary}
              </Text>
            </View>
          )}

          {/* Stats card */}
          <View className="bg-white border border-slate-100 rounded-2xl p-5 gap-3">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <View className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
                <Text className={`text-sm font-semibold ${accuracyColor}`}>
                  {topic.accuracy_pct > 0
                    ? `${topic.accuracy_pct.toFixed(0)}% accuracy`
                    : "No attempts yet"}
                </Text>
              </View>
              {topic.status === TopicStatus.Archived && (
                <View className="bg-slate-100 rounded-lg px-2.5 py-1">
                  <Text className="text-xs font-medium text-slate-500">
                    Archived
                  </Text>
                </View>
              )}
            </View>
            <Text className="text-xs text-slate-400">
              Last activity: {formatDate(topic.last_activity_at)}
            </Text>
          </View>

          {/* Batch state */}
          {topic.has_batch ? (
            <Pressable
              className="bg-indigo-600 rounded-2xl py-4 items-center active:bg-indigo-700"
              onPress={() => router.push(`/topics/${topic.id}/session`)}
            >
              <Text className="text-white text-base font-semibold">
                Start practising
              </Text>
            </Pressable>
          ) : generatingBatch ? (
            <View className="bg-white border border-slate-100 rounded-2xl p-5 items-center gap-3">
              <ActivityIndicator size="small" color="#6366f1" />
              <Text className="text-sm text-slate-500">
                Generating your questions…
              </Text>
            </View>
          ) : (
            <View className="bg-amber-50 border border-amber-100 rounded-2xl p-5 gap-3">
              <Text className="text-sm font-semibold text-amber-800">
                {batchError
                  ? "Question generation failed"
                  : "Questions not ready yet"}
              </Text>
              <Text className="text-xs text-amber-700 leading-relaxed">
                {batchError
                  ? "Something went wrong while generating your exercises. Tap below to try again."
                  : "Your first batch of exercises could not be generated. Tap below to retry."}
              </Text>
              <Pressable
                className="bg-amber-500 rounded-xl py-3 items-center active:bg-amber-600"
                onPress={handleRetryBatch}
              >
                <Text className="text-white text-sm font-semibold">Retry</Text>
              </Pressable>
            </View>
          )}
        </View>
      )}

      <ActionMenu visible={menuVisible} onClose={closeMenu} title="Manage topic">
        {confirmingDelete ? (
          <View className="gap-3 pt-2">
            <Text className="text-sm text-slate-600 leading-relaxed">
              This will permanently delete this topic and all its questions, sessions, and stats.
            </Text>
            <Pressable
              className="bg-red-500 rounded-2xl py-4 items-center active:bg-red-600"
              onPress={confirmDelete}
              disabled={deleting}
            >
              {deleting ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text className="text-white text-base font-semibold">Confirm delete</Text>
              )}
            </Pressable>
            <Pressable
              className="bg-slate-100 rounded-2xl py-4 items-center active:bg-slate-200"
              onPress={() => setConfirmingDelete(false)}
              disabled={deleting}
            >
              <Text className="text-base font-semibold text-slate-600">Go back</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <ActionMenuItem
              icon="✏️"
              label="Edit"
              separator
              onPress={() => { closeMenu(); router.push(`/topics/${topicId}/edit`); }}
            />
            <ActionMenuItem
              icon="📦"
              label={archiveLabel}
              separator
              onPress={handleArchiveToggle}
            />
            <ActionMenuItem
              icon="🗑"
              label="Delete"
              onPress={() => setConfirmingDelete(true)}
            />
            <Pressable
              className="mt-3 bg-slate-100 rounded-2xl py-4 items-center active:bg-slate-200"
              onPress={closeMenu}
            >
              <Text className="text-base font-semibold text-slate-600">Cancel</Text>
            </Pressable>
          </>
        )}
      </ActionMenu>
    </View>
  );
}
