import { useEffect, useRef, useState } from "react";
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
import { router, useLocalSearchParams } from "expo-router";
import { useSessionStore } from "@/stores/session";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ChatBubble } from "@/components/ChatBubble";

export default function DiagnosticChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const topicId = Array.isArray(id) ? id[0] : id;

  const {
    messages,
    isLoading,
    isDone,
    topicId: storeTopicId,
    startDiagnostic,
    sendMessage,
  } = useSessionStore();

  const [input, setInput] = useState("");
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (storeTopicId !== topicId || messages.length === 0) {
      startDiagnostic(topicId);
    }
  }, [topicId]);

  useEffect(() => {
    const t = setTimeout(
      () => scrollRef.current?.scrollToEnd({ animated: true }),
      80,
    );
    return () => clearTimeout(t);
  }, [messages.length, isLoading]);

  async function handleSend() {
    const text = input.trim();
    if (!text || isLoading || isDone) return;
    setInput("");
    await sendMessage(text);
    inputRef.current?.focus();
  }

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScreenHeader
        title="Diagnostic"
        subtitle="Let's find your level"
        onBack={() => router.dismissAll()}
      />

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        className="flex-1 bg-slate-50"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingVertical: 24,
          gap: 12,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {messages.map((msg, i) => (
          <ChatBubble key={i} role={msg.role} content={msg.content} />
        ))}

        {/* Typing indicator */}
        {isLoading && (
          <View style={{ alignSelf: "flex-start" }}>
            <View className="bg-white border border-slate-100 rounded-3xl rounded-tl-sm px-5 py-4">
              <ActivityIndicator size="small" color="#6366f1" />
            </View>
          </View>
        )}

        {/* Completion card */}
        {isDone && !isLoading && (
          <View className="mt-4 bg-emerald-50 border border-emerald-100 rounded-2xl p-5 items-center gap-3">
            <Text className="text-3xl">✅</Text>
            <Text className="text-base font-bold text-slate-900 text-center">
              Diagnostic complete
            </Text>
            <Text className="text-sm text-slate-500 text-center leading-relaxed">
              Your first batch of questions is ready.
            </Text>
            <Pressable
              className="bg-indigo-600 rounded-xl px-6 py-3 mt-1 active:bg-indigo-700"
              onPress={() =>
                router.replace(`/topics/${topicId}?from=diagnostic`)
              }
            >
              <Text className="text-white font-semibold text-sm">
                See my results
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* Input */}
      {!isDone && (
        <View className="bg-white border-t border-slate-100 px-4 py-3 flex-row items-end gap-3">
          <TextInput
            ref={inputRef}
            className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-base text-slate-900"
            placeholder="Type your answer…"
            placeholderTextColor="#94a3b8"
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
            returnKeyType="send"
            blurOnSubmit={false}
            onSubmitEditing={handleSend}
            editable={!isLoading}
          />
          <Pressable
            className={`w-11 h-11 rounded-full items-center justify-center ${
              input.trim() && !isLoading
                ? "bg-indigo-600 active:bg-indigo-700"
                : "bg-slate-200"
            }`}
            onPress={handleSend}
            disabled={!input.trim() || isLoading}
          >
            <Text
              className={`text-base font-bold ${
                input.trim() && !isLoading ? "text-white" : "text-slate-400"
              }`}
            >
              ↑
            </Text>
          </Pressable>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}
