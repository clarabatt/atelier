import { useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { createTopic, TopicLevel } from "@/lib/topics";
import { ModeCard } from "@/components/ModeCard";
import { BackButton } from "@/components/BackButton";

type LevelMode = "diagnostic" | "manual";

const LEVELS: { value: TopicLevel; label: string; description: string }[] = [
  {
    value: TopicLevel.Beginner,
    label: TopicLevel.Beginner,
    description: "New to this topic",
  },
  {
    value: TopicLevel.Intermediate,
    label: TopicLevel.Intermediate,
    description: "Know the basics",
  },
  {
    value: TopicLevel.Advanced,
    label: TopicLevel.Advanced,
    description: "Solid foundation",
  },
];

export default function NewTopicScreen() {
  const [title, setTitle] = useState("");
  const [domain, setDomain] = useState("");
  const [levelMode, setLevelMode] = useState<LevelMode | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<TopicLevel | null>(null);
  const [errors, setErrors] = useState<{
    title?: string;
    domain?: string;
    level?: string;
  }>({});
  const [submitting, setSubmitting] = useState(false);
  const domainRef = useRef<TextInput>(null);

  function validate(): boolean {
    const e: typeof errors = {};
    if (!title.trim()) e.title = "Title is required";
    if (!domain.trim()) e.domain = "Domain is required";
    if (!levelMode) e.level = "Choose how to set your level";
    if (levelMode === "manual" && !selectedLevel) e.level = "Pick a level";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate() || submitting) return;
    setSubmitting(true);
    try {
      const topic = await createTopic(
        title.trim(),
        domain.trim(),
        levelMode === "manual" ? selectedLevel! : undefined,
      );
      if (levelMode === "manual") {
        router.replace(`/topics/${topic.id}`);
      } else {
        router.replace(`/topics/${topic.id}/chat`);
      }
    } catch {
      setErrors({ title: "Something went wrong — please try again." });
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Header */}
      <View className="bg-indigo-600 px-6 pt-14 pb-6">
        <View className="flex-row items-center gap-3">
          <BackButton />
          <Text className="text-white text-xl font-bold">New topic</Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 bg-slate-50"
        contentContainerClassName="px-6 pt-8 pb-12"
        keyboardShouldPersistTaps="handled"
      >
        {/* Title */}
        <View className="mb-5">
          <Text className="text-sm font-semibold text-slate-700 mb-2">
            Title
          </Text>
          <TextInput
            className={`bg-white rounded-2xl px-4 py-4 text-base text-slate-900 border ${
              errors.title ? "border-red-300" : "border-slate-200"
            }`}
            placeholder="e.g. French prepositions, WWI causes"
            placeholderTextColor="#94a3b8"
            value={title}
            onChangeText={(v) => {
              setTitle(v);
              if (errors.title)
                setErrors((prev) => ({ ...prev, title: undefined }));
            }}
            returnKeyType="next"
            onSubmitEditing={() => domainRef.current?.focus()}
            autoFocus
            autoCapitalize="sentences"
          />
          {errors.title ? (
            <Text className="text-xs text-red-500 mt-1.5 ml-1">
              {errors.title}
            </Text>
          ) : null}
        </View>

        {/* Domain */}
        <View className="mb-8">
          <Text className="text-sm font-semibold text-slate-700 mb-2">
            Domain
          </Text>
          <TextInput
            ref={domainRef}
            className={`bg-white rounded-2xl px-4 py-4 text-base text-slate-900 border ${
              errors.domain ? "border-red-300" : "border-slate-200"
            }`}
            placeholder="e.g. french, history, science"
            placeholderTextColor="#94a3b8"
            value={domain}
            onChangeText={(v) => {
              setDomain(v);
              if (errors.domain)
                setErrors((prev) => ({ ...prev, domain: undefined }));
            }}
            returnKeyType="done"
            onSubmitEditing={() => domainRef.current?.blur()}
            autoCapitalize="none"
          />
          {errors.domain ? (
            <Text className="text-xs text-red-500 mt-1.5 ml-1">
              {errors.domain}
            </Text>
          ) : null}
        </View>

        {/* Level */}
        <View className="mb-8">
          <Text className="text-sm font-semibold text-slate-700 mb-3">
            Starting level
          </Text>

          <View className="flex-row gap-3 mb-4">
            <ModeCard
              selected={levelMode === "manual"}
              onPress={() => {
                setLevelMode("manual");
                setErrors((prev) => ({ ...prev, level: undefined }));
              }}
              icon="✏️"
              title="Set manually"
              subtitle="I know my level"
            />
            <ModeCard
              selected={levelMode === "diagnostic"}
              onPress={() => {
                setLevelMode("diagnostic");
                setSelectedLevel(null);
                setErrors((prev) => ({ ...prev, level: undefined }));
              }}
              icon="🔍"
              title="Run a diagnostic"
              subtitle="AI tests your level"
            />
          </View>

          {levelMode === "manual" && (
            <View className="flex-row gap-2">
              {LEVELS.map((l) => (
                <Pressable
                  key={l.value}
                  onPress={() => {
                    setSelectedLevel(l.value);
                    setErrors((prev) => ({ ...prev, level: undefined }));
                  }}
                  style={{ flex: 1 }}
                  className={`rounded-2xl py-3 px-2 items-center border ${
                    selectedLevel === l.value
                      ? "bg-indigo-50 border-indigo-400"
                      : "bg-white border-slate-200"
                  }`}
                >
                  <Text
                    className={`text-sm font-semibold ${
                      selectedLevel === l.value
                        ? "text-indigo-700"
                        : "text-slate-700"
                    }`}
                  >
                    {l.label}
                  </Text>
                  <Text
                    className={`text-xs mt-0.5 ${
                      selectedLevel === l.value
                        ? "text-indigo-400"
                        : "text-slate-400"
                    }`}
                  >
                    {l.description}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          {errors.level ? (
            <Text className="text-xs text-red-500 mt-2 ml-1">
              {errors.level}
            </Text>
          ) : null}
        </View>

        {/* Submit */}
        <Pressable
          className={`rounded-2xl py-4 items-center ${
            submitting ? "bg-indigo-300" : "bg-indigo-600 active:bg-indigo-700"
          }`}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text className="text-white text-base font-semibold">
              Generate questions
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
