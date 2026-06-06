import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { fetchTopic, updateTopic } from "@/lib/topics";
import { ScreenHeader } from "@/components/ScreenHeader";

export default function EditTopicScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const topicId = Array.isArray(id) ? id[0] : id;

  const [title, setTitle] = useState("");
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ title?: string; domain?: string }>({});

  const domainRef = useRef<TextInput>(null);

  useEffect(() => {
    fetchTopic(topicId)
      .then((t) => {
        setTitle(t.title);
        setDomain(t.domain);
      })
      .catch(() => Alert.alert("Error", "Could not load topic."))
      .finally(() => setLoading(false));
  }, [topicId]);

  async function handleSave() {
    const newErrors: { title?: string; domain?: string } = {};
    if (!title.trim()) newErrors.title = "Title is required";
    if (!domain.trim()) newErrors.domain = "Domain is required";
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSaving(true);
    try {
      await updateTopic(topicId, { title: title.trim(), domain: domain.trim() });
      router.back();
    } catch {
      Alert.alert("Error", "Could not save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <View className="flex-1 bg-slate-50">
      <ScreenHeader title="Edit topic" />

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      ) : (
        <View className="px-5 pt-6 gap-5">
          <View className="gap-2">
            <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Title
            </Text>
            <TextInput
              className={`bg-white border rounded-2xl px-4 py-4 text-base text-slate-900 ${
                errors.title ? "border-red-400" : "border-slate-200"
              }`}
              value={title}
              onChangeText={(v) => {
                setTitle(v);
                setErrors((e) => ({ ...e, title: undefined }));
              }}
              returnKeyType="next"
              onSubmitEditing={() => domainRef.current?.focus()}
              blurOnSubmit={false}
              autoFocus
            />
            {errors.title && (
              <Text className="text-xs text-red-500">{errors.title}</Text>
            )}
          </View>

          <View className="gap-2">
            <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Domain
            </Text>
            <TextInput
              ref={domainRef}
              className={`bg-white border rounded-2xl px-4 py-4 text-base text-slate-900 ${
                errors.domain ? "border-red-400" : "border-slate-200"
              }`}
              value={domain}
              onChangeText={(v) => {
                setDomain(v);
                setErrors((e) => ({ ...e, domain: undefined }));
              }}
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
            {errors.domain && (
              <Text className="text-xs text-red-500">{errors.domain}</Text>
            )}
          </View>

          <Pressable
            className="bg-indigo-600 rounded-2xl py-4 items-center active:bg-indigo-700"
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text className="text-white text-base font-semibold">
                Save changes
              </Text>
            )}
          </Pressable>
        </View>
      )}
    </View>
  );
}
