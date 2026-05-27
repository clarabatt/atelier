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
  requestAiCheck,
  type AiCheckResult,
  type SessionQuestion,
  type SessionResult,
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

  const [currentAttemptId, setCurrentAttemptId] = useState<string | null>(null);
  const [lastAnswerWrong, setLastAnswerWrong] = useState(false);
  const [aiCheckResult, setAiCheckResult] = useState<AiCheckResult | null>(null);
  const [aiChecking, setAiChecking] = useState(false);
  const [aiCheckUsed, setAiCheckUsed] = useState(false);

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
    const isCorrect = option === question.correct_answer;
    const status = isCorrect ? 'correct' : 'wrong';
    try {
      const attemptId = await recordAttempt(sessionId, question.id, option, status);
      setCurrentAttemptId(attemptId);
      setLastAnswerWrong(!isCorrect);
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
      const attemptId = await recordAttempt(sessionId, question.id, textAnswer, status);
      setCurrentAttemptId(attemptId);
      setLastAnswerWrong(status === 'wrong');
    } catch { /* best effort */ }
    setSubmitting(false);
    if (status === 'correct') {
      await advance();
    }
    // If wrong, stay in reveal to allow double-check
  }

  async function handleAiCheck() {
    if (!sessionId || !currentAttemptId || aiCheckUsed || aiChecking) return;
    setAiChecking(true);
    try {
      const result = await requestAiCheck(sessionId, currentAttemptId);
      setAiCheckResult(result);
      setAiCheckUsed(true);
    } catch { /* best effort */ }
    setAiChecking(false);
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
      setCurrentAttemptId(null);
      setLastAnswerWrong(false);
      setAiCheckResult(null);
      setAiCheckUsed(false);
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
          <CompletionScreen results={results} onBack={() => router.back()} />
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
        <CompletionScreen results={results} onBack={() => router.back()} />
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

        {/* AI override result card */}
        {aiCheckResult?.verdict === 'overridden' && (
          <View className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 mb-4">
            <Text className="text-xs font-semibold text-emerald-700 mb-1">AI overrode — marked as correct</Text>
            <Text className="text-sm text-emerald-800">{aiCheckResult.explanation}</Text>
          </View>
        )}
        {aiCheckResult?.verdict === 'confirmed' && (
          <View className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-4">
            <Text className="text-xs font-semibold text-slate-500 mb-1">AI confirmed original verdict</Text>
            <Text className="text-sm text-slate-700">{aiCheckResult.explanation}</Text>
          </View>
        )}

        {/* AI double-check button (shown when answer was wrong in reveal phase) */}
        {phase === 'reveal' && lastAnswerWrong && (
          <Pressable
            className={`border rounded-2xl py-3 items-center mb-3 ${
              aiCheckUsed
                ? 'bg-slate-50 border-slate-200'
                : 'bg-white border-indigo-300 active:bg-indigo-50'
            }`}
            onPress={handleAiCheck}
            disabled={aiCheckUsed || aiChecking}
          >
            {aiChecking ? (
              <ActivityIndicator size="small" color="#6366f1" />
            ) : (
              <Text className={`text-sm font-semibold ${aiCheckUsed ? 'text-slate-400' : 'text-indigo-600'}`}>
                {aiCheckUsed ? 'Already checked' : 'Ask AI to double-check'}
              </Text>
            )}
          </Pressable>
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

        {phase === 'reveal' && question.format !== 'mcq' && !currentAttemptId && (
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

        {phase === 'reveal' && question.format !== 'mcq' && currentAttemptId && (
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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function CompletionScreen({
  results,
  onBack,
}: {
  results: SessionResult | null;
  onBack: () => void;
}) {
  return (
    <View className="flex-1 items-center justify-center px-6 gap-4">
      <Text className="text-5xl">🎉</Text>
      <Text className="text-3xl font-bold text-slate-900">
        {results ? `${results.accuracy_pct}%` : 'Done!'}
      </Text>
      <Text className="text-base text-slate-500">Session complete</Text>

      {results && (
        <View className="bg-white border border-slate-100 rounded-2xl p-5 w-full gap-3 mt-2">
          <ResultRow label="Correct" value={results.correct} color="text-emerald-600" />
          <ResultRow label="Wrong" value={results.wrong} color="text-red-500" />
          <ResultRow label="Skipped" value={results.skipped} color="text-slate-400" />
        </View>
      )}

      <Pressable
        className="bg-indigo-600 rounded-2xl py-4 px-10 mt-2 active:bg-indigo-700"
        onPress={onBack}
      >
        <Text className="text-white font-semibold">Back to topic</Text>
      </Pressable>
    </View>
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
