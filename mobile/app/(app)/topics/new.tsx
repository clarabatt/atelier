import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { createTopic } from '@/lib/topics';

export default function NewTopicScreen() {
  const [title, setTitle] = useState('');
  const [domain, setDomain] = useState('');
  const [errors, setErrors] = useState<{ title?: string; domain?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const domainRef = useRef<TextInput>(null);

  function validate(): boolean {
    const e: { title?: string; domain?: string } = {};
    if (!title.trim()) e.title = 'Title is required';
    if (!domain.trim()) e.domain = 'Domain is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate() || submitting) return;
    setSubmitting(true);
    try {
      const topic = await createTopic(title.trim(), domain.trim());
      router.replace(`/topics/${topic.id}/chat`);
    } catch {
      setErrors({ title: 'Something went wrong — please try again.' });
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View className="bg-indigo-600 px-6 pt-14 pb-6">
        <View className="flex-row items-center gap-3">
          <Pressable
            className="w-8 h-8 rounded-full bg-indigo-500 items-center justify-center active:bg-indigo-400"
            onPress={() => router.back()}
          >
            <Text className="text-white text-xl leading-none" style={{ marginTop: -1 }}>‹</Text>
          </Pressable>
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
          <Text className="text-sm font-semibold text-slate-700 mb-2">Title</Text>
          <TextInput
            className={`bg-white rounded-2xl px-4 py-4 text-base text-slate-900 border ${
              errors.title ? 'border-red-300' : 'border-slate-200'
            }`}
            placeholder="e.g. French prepositions, WWI causes"
            placeholderTextColor="#94a3b8"
            value={title}
            onChangeText={(v) => {
              setTitle(v);
              if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }));
            }}
            returnKeyType="next"
            onSubmitEditing={() => domainRef.current?.focus()}
            autoFocus
            autoCapitalize="sentences"
          />
          {errors.title ? (
            <Text className="text-xs text-red-500 mt-1.5 ml-1">{errors.title}</Text>
          ) : null}
        </View>

        {/* Domain */}
        <View className="mb-8">
          <Text className="text-sm font-semibold text-slate-700 mb-2">Domain</Text>
          <TextInput
            ref={domainRef}
            className={`bg-white rounded-2xl px-4 py-4 text-base text-slate-900 border ${
              errors.domain ? 'border-red-300' : 'border-slate-200'
            }`}
            placeholder="e.g. french, history, science"
            placeholderTextColor="#94a3b8"
            value={domain}
            onChangeText={(v) => {
              setDomain(v);
              if (errors.domain) setErrors((prev) => ({ ...prev, domain: undefined }));
            }}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            autoCapitalize="none"
          />
          {errors.domain ? (
            <Text className="text-xs text-red-500 mt-1.5 ml-1">{errors.domain}</Text>
          ) : null}
        </View>

        {/* Submit */}
        <Pressable
          className={`rounded-2xl py-4 items-center ${
            submitting ? 'bg-indigo-300' : 'bg-indigo-600 active:bg-indigo-700'
          }`}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text className="text-white text-base font-semibold">Create topic</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
