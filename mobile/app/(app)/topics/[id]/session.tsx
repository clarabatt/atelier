import { useEffect, useState } from 'react';
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
import { router, useLocalSearchParams } from 'expo-router';
import {
  startSession,
  recordAttempt,
  completeSession,
  type SessionQuestion,
  type SessionResult,
  type WeakQuestion,
} from '@/lib/sessions';

type Phase = 'loading' | 'question' | 'reveal' | 'complete';

const FORMAT_LABEL: Record<SessionQuestion['format'], string> = {
  mcq: 'Multiple choice',
  written: 'Written',
  fill_blank: 'Fill in the blank',
};

export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const topicId = Array.isArray(id) ? id[0] : id;

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<SessionQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('loading');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [textAnswer, setTextAnswer] = useState('');
  const [results, setResults] = useState<SessionResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    startSession(topicId)
      .then((data) => {
        setSessionId(data.session_id);
        const unanswered = data.questions.filter((q) => !q.answered);
        setQuestions(unanswered);
        setPhase(unanswered.length > 0 ? 'question' : 'complete');
      })
      .catch(() => setLoadError(true));
  }, [topicId]);

  const question = questions[currentIdx] ?? null;
  const isLastQuestion = currentIdx === questions.length - 1;

  async function handleMcqSelect(option: string) {
    if (phase !== 'question' || !question || !sessionId || submitting) return;
    setSelectedOption(option);
    setSubmitting(true);
    const status = option === question.correct_answer ? 'correct' : 'wrong';
    try {
      await recordAttempt(sessionId, question.id, option, status);
    } catch { /* best effort */ }
    setSubmitting(false);
    setPhase('reveal');
  }

  async function handleWrittenCheck() {
    setPhase('reveal');
  }

  async function handleSelfAssess(status: 'correct' | 'wrong') {
    if (!sessionId || !question || submitting) return;
    setSubmitting(true);
    try {
      await recordAttempt(sessionId, question.id, textAnswer, status);
    } catch { /* best effort */ }
    setSubmitting(false);
    await advance();
  }

  async function advance() {
    if (isLastQuestion) {
      setPhase('loading');
      try {
        if (sessionId) setResults(await completeSession(sessionId));
      } catch { /* show completion anyway */ }
      setPhase('complete');
    } else {
      setCurrentIdx((i) => i + 1);
      setSelectedOption(null);
      setTextAnswer('');
      setPhase('question');
    }
  }

  if (loadError) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center px-8 gap-3">
        <Text className="text-sm text-slate-500 text-center">
          Could not load session. Please go back and try again.
        </Text>
        <Pressable onPress={() => router.back()} className="mt-2">
          <Text className="text-indigo-600 font-semibold text-sm">Go back</Text>
        </Pressable>
      </View>
    );
  }

  if (phase === 'loading' || !question) {
    return (
      <View className="flex-1 bg-slate-50">
        <View className="bg-indigo-600 px-6 pt-14 pb-5 flex-row items-center gap-3">
          <Pressable
            className="w-8 h-8 rounded-full bg-indigo-500 items-center justify-center active:bg-indigo-400"
            onPress={() => router.back()}
          >
            <Text className="text-white text-xl leading-none" style={{ marginTop: -1 }}>‹</Text>
          </Pressable>
          <Text className="text-white text-xl font-bold">Practice</Text>
        </View>
        {phase === 'complete' ? (
          <CompletionScreen results={results} topicId={topicId} onBack={() => router.back()} />
        ) : (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#6366f1" />
          </View>
        )}
      </View>
    );
  }

  if (phase === 'complete') {
    return (
      <View className="flex-1 bg-slate-50">
        <View className="bg-indigo-600 px-6 pt-14 pb-5 flex-row items-center gap-3">
          <Pressable
            className="w-8 h-8 rounded-full bg-indigo-500 items-center justify-center active:bg-indigo-400"
            onPress={() => router.back()}
          >
            <Text className="text-white text-xl leading-none" style={{ marginTop: -1 }}>‹</Text>
          </Pressable>
          <Text className="text-white text-xl font-bold">Practice</Text>
        </View>
        <CompletionScreen results={results} topicId={topicId} onBack={() => router.back()} />
      </View>
    );
  }

  const progressPct = (currentIdx / questions.length) * 100;

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View className="bg-indigo-600 px-6 pt-14 pb-5">
        <View className="flex-row items-center gap-3 mb-4">
          <Pressable
            className="w-8 h-8 rounded-full bg-indigo-500 items-center justify-center active:bg-indigo-400"
            onPress={() => router.back()}
          >
            <Text className="text-white text-xl leading-none" style={{ marginTop: -1 }}>‹</Text>
          </Pressable>
          <Text className="text-white font-semibold flex-1">
            Question {currentIdx + 1} of {questions.length}
          </Text>
        </View>
        <View className="h-1.5 bg-indigo-500 rounded-full">
          <View
            className="h-1.5 bg-white rounded-full"
            style={{ width: `${progressPct}%` }}
          />
        </View>
      </View>

      <ScrollView
        className="flex-1 bg-slate-50"
        contentContainerClassName="px-5 pt-5 pb-12"
        keyboardShouldPersistTaps="handled"
      >
        {/* Question card */}
        <View className="bg-white border border-slate-100 rounded-2xl p-5 mb-4">
          <Text className="text-xs font-semibold text-indigo-500 uppercase tracking-wide mb-2">
            {FORMAT_LABEL[question.format]}
          </Text>
          <Text className="text-base text-slate-900 leading-relaxed">{question.body}</Text>
        </View>

        {/* MCQ options */}
        {question.format === 'mcq' && question.options?.map((option, i) => {
          const isSelected = option === selectedOption;
          const isCorrectOption = option === question.correct_answer;
          const revealed = phase === 'reveal';
          let style = 'bg-white border-slate-200 active:bg-slate-50';
          let textStyle = 'text-slate-900';
          if (revealed) {
            if (isCorrectOption) { style = 'bg-emerald-50 border-emerald-400'; textStyle = 'text-emerald-700 font-semibold'; }
            else if (isSelected) { style = 'bg-red-50 border-red-400'; textStyle = 'text-red-700'; }
            else { style = 'bg-slate-50 border-slate-100'; textStyle = 'text-slate-400'; }
          } else if (isSelected) {
            style = 'bg-indigo-50 border-indigo-400';
          }
          return (
            <Pressable
              key={i}
              className={`border rounded-2xl px-4 py-4 mb-2 ${style}`}
              onPress={() => handleMcqSelect(option)}
              disabled={phase === 'reveal' || submitting}
            >
              <Text className={`text-sm ${textStyle}`}>{option}</Text>
            </Pressable>
          );
        })}

        {/* Written / fill_blank input */}
        {question.format !== 'mcq' && (
          <TextInput
            className="bg-white border border-slate-200 rounded-2xl px-4 py-4 text-base text-slate-900 mb-4"
            placeholder="Type your answer…"
            placeholderTextColor="#94a3b8"
            value={textAnswer}
            onChangeText={setTextAnswer}
            multiline={question.format === 'written'}
            editable={phase === 'question'}
            autoFocus={phase === 'question'}
          />
        )}

        {/* Correct answer reveal (written/fill_blank) */}
        {phase === 'reveal' && question.format !== 'mcq' && (
          <View className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 mb-4">
            <Text className="text-xs font-semibold text-emerald-600 mb-1">Correct answer</Text>
            <Text className="text-sm text-emerald-800">{question.correct_answer}</Text>
          </View>
        )}

        {/* Action buttons */}
        {phase === 'question' && question.format !== 'mcq' && (
          <Pressable
            className="bg-indigo-600 rounded-2xl py-4 items-center active:bg-indigo-700"
            onPress={handleWrittenCheck}
          >
            <Text className="text-white font-semibold">Check answer</Text>
          </Pressable>
        )}

        {phase === 'reveal' && question.format === 'mcq' && (
          <Pressable
            className="bg-indigo-600 rounded-2xl py-4 items-center mt-2 active:bg-indigo-700"
            onPress={advance}
            disabled={submitting}
          >
            <Text className="text-white font-semibold">
              {isLastQuestion ? 'Finish' : 'Next →'}
            </Text>
          </Pressable>
        )}

        {phase === 'reveal' && question.format !== 'mcq' && (
          <View className="flex-row gap-3">
            <Pressable
              className="flex-1 bg-emerald-50 border border-emerald-300 rounded-2xl py-4 items-center active:bg-emerald-100"
              onPress={() => handleSelfAssess('correct')}
              disabled={submitting}
            >
              <Text className="text-emerald-700 font-semibold text-sm">✓  Got it</Text>
            </Pressable>
            <Pressable
              className="flex-1 bg-red-50 border border-red-300 rounded-2xl py-4 items-center active:bg-red-100"
              onPress={() => handleSelfAssess('wrong')}
              disabled={submitting}
            >
              <Text className="text-red-700 font-semibold text-sm">✗  Missed it</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function CompletionScreen({
  results,
  topicId,
  onBack,
}: {
  results: SessionResult | null;
  topicId: string;
  onBack: () => void;
}) {
  const passed = results?.threshold_passed ?? false;
  const minutes = results ? Math.floor(results.time_taken_seconds / 60) : 0;
  const seconds = results ? results.time_taken_seconds % 60 : 0;
  const timeLabel = minutes > 0
    ? `${minutes}m ${seconds}s`
    : `${seconds}s`;

  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="items-center px-6 pt-8 pb-12 gap-4"
    >
      <Text className="text-5xl">{passed ? '🎉' : '📚'}</Text>
      <Text className="text-3xl font-bold text-slate-900">
        {results ? `${results.accuracy_pct}%` : 'Done!'}
      </Text>
      <Text className="text-base text-slate-500">Session complete</Text>

      {results && (
        <View className="bg-white border border-slate-100 rounded-2xl p-5 w-full gap-3">
          <ResultRow label="Correct" value={results.correct} color="text-emerald-600" />
          <ResultRow label="Wrong" value={results.wrong} color="text-red-500" />
          <ResultRow label="Skipped" value={results.skipped} color="text-slate-400" />
          <View className="h-px bg-slate-100 my-1" />
          <View className="flex-row justify-between items-center">
            <Text className="text-sm text-slate-600">Time taken</Text>
            <Text className="text-sm font-bold text-slate-700">{timeLabel}</Text>
          </View>
        </View>
      )}

      {/* Threshold message */}
      {results && (
        <View
          className={`rounded-2xl p-4 w-full ${passed ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'}`}
        >
          {passed ? (
            <>
              <Text className="text-sm font-semibold text-emerald-700 mb-1">
                Well done — your next batch is being generated!
              </Text>
              <ActivityIndicator size="small" color="#059669" style={{ alignSelf: 'flex-start', marginTop: 4 }} />
            </>
          ) : (
            <>
              <Text className="text-sm font-semibold text-amber-700 mb-3">
                Keep practising — you need 80% to unlock the next batch.
              </Text>
              <Pressable
                className="bg-amber-500 rounded-xl py-3 items-center active:bg-amber-600"
                onPress={() => router.replace(`/topics/${topicId}/session`)}
              >
                <Text className="text-white font-semibold text-sm">Try again</Text>
              </Pressable>
            </>
          )}
        </View>
      )}

      {/* Weak questions */}
      {results && results.weak_questions.length > 0 && (
        <View className="w-full">
          <Text className="text-sm font-semibold text-slate-700 mb-3">Review these questions:</Text>
          {results.weak_questions.map((q) => (
            <WeakQuestionCard key={q.id} question={q} />
          ))}
        </View>
      )}

      <Pressable
        className="bg-indigo-600 rounded-2xl py-4 px-10 mt-2 active:bg-indigo-700"
        onPress={onBack}
      >
        <Text className="text-white font-semibold">Back to topic</Text>
      </Pressable>
    </ScrollView>
  );
}

function WeakQuestionCard({ question }: { question: WeakQuestion }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Pressable
      className="bg-white border border-slate-100 rounded-2xl p-4 mb-3"
      onPress={() => setExpanded((v) => !v)}
    >
      <Text className="text-sm text-slate-800 leading-relaxed mb-2">{question.body}</Text>
      {expanded && (
        <>
          <View className="h-px bg-slate-100 mb-2" />
          <Text className="text-xs font-semibold text-emerald-600 mb-1">Correct answer</Text>
          <Text className="text-sm text-emerald-800 mb-2">{question.correct_answer}</Text>
          <Text className="text-xs font-semibold text-slate-500 mb-1">Why</Text>
          <Text className="text-sm text-slate-600">{question.reasoning}</Text>
        </>
      )}
      <Text className="text-xs text-indigo-500 mt-1">{expanded ? 'Collapse ▲' : 'See answer ▼'}</Text>
    </Pressable>
  );
}

function ResultRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View className="flex-row justify-between items-center">
      <Text className="text-sm text-slate-600">{label}</Text>
      <Text className={`text-sm font-bold ${color}`}>{value}</Text>
    </View>
  );
}
