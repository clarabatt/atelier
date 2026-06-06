import { useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { router } from 'expo-router';
import { TopicStatus, type Topic } from '@/lib/topics';
import { formatDate } from '@/lib/utils';

interface TopicCardProps {
  topic: Topic;
  onArchive: (id: string, status: TopicStatus) => void;
  onDelete: (id: string, title: string) => void;
}

export function TopicCard({ topic, onArchive, onDelete }: TopicCardProps) {
  const swipeRef = useRef<Swipeable>(null);
  const archiveStatus =
    topic.status === TopicStatus.Archived ? TopicStatus.Active : TopicStatus.Archived;
  const archiveLabel = topic.status === TopicStatus.Archived ? 'Unarchive' : 'Archive';

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
          if (direction === 'left') {
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
    </Swipeable>
  );
}
