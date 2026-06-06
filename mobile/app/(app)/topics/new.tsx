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
import { createTopic, TopicLevel, QuestionFormat } from "@/lib/topics";
import { ModeCard } from "@/components/ModeCard";
import { ScreenHeader } from "@/components/ScreenHeader";

type LevelMode = "diagnostic" | "manual";

const FORMAT_OPTIONS: { value: QuestionFormat; label: string }[] = [
  { value: QuestionFormat.Mcq, label: "Multiple choice" },
  { value: QuestionFormat.Written, label: "Written" },
  { value: QuestionFormat.FillBlank, label: "Fill in the blank" },
];

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
  const [selectedFormats, setSelectedFormats] = useState<Set<QuestionFormat>>(
    new Set([QuestionFormat.Mcq, QuestionFormat.Written, QuestionFormat.FillBlank]),
  );
  const [errors, setErrors] = useState<{
    title?: string;
    domain?: string;
    level?: string;
    formats?: string;
  }>({});
  const [submitting, setSubmitting] = useState(false);
  const domainRef = useRef<TextInput>(null);

  function toggleFormat(fmt: QuestionFormat) {
    if (selectedFormats.has(fmt) && selectedFormats.size === 1) return;
    setSelectedFormats((prev) => {
      const next = new Set(prev);
      next.has(fmt) ? next.delete(fmt) : next.add(fmt);
      return next;
    });
    if (errors.formats) setErrors((prev) => ({ ...prev, formats: undefined }));
  }

  function validate(): boolean {
    const e: typeof errors = {};
    if (!title.trim()) e.title = "Title is required";
    if (!domain.trim()) e.domain = "Domain is required";
    if (!levelMode) e.level = "Choose how to set your level";
    if (levelMode === "manual" && !selectedLevel) e.level = "Pick a level";
    if (selectedFormats.size === 0) e.formats = "Select at least one type";
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
        [...selectedFormats],
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
      <ScreenHeader title="New topic" />

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

        {/* Question types */}
        <View className="mb-8">
          <Text className="text-sm font-semibold text-slate-700 mb-3">
            Question types
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {FORMAT_OPTIONS.map((opt) => {
              const active = selectedFormats.has(opt.value);
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => toggleFormat(opt.value)}
                  className={`rounded-full px-4 py-2 border ${
                    active
                      ? "bg-indigo-600 border-indigo-600"
                      : "bg-white border-slate-200"
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      active ? "text-white" : "text-slate-600"
                    }`}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {errors.formats ? (
            <Text className="text-xs text-red-500 mt-2 ml-1">
              {errors.formats}
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
