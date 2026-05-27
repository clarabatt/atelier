import { Fragment, useEffect, useState } from 'react';
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
} from '@/lib/sessions';

type Phase = 'loading' | 'main' | 'reveal' | 'skip_transition' | 'skip_queue' | 'complete';

const FORMAT_LABEL: Record<SessionQuestion['format'], string> = {
  mcq: 'Multiple choice',
  written: 'Written',
  fill_blank: 'Fill in the blank',
};

export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const topicId = Array.isArray(id) ? id[0] : id;

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [mainQuestions, setMainQuestions] = useState<SessionQuestion[]>([]);
  const [skippedQuestions, setSkippedQuestions] = useState<SessionQuestion[]>([]);
  const [mainIdx, setMainIdx] = useState(0);
  const [skipIdx, setSkipIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('loading');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [textAnswer, setTextAnswer] = useState('');
  const [textError, setTextError] = useState('');
  const [results, setResults] = useState<SessionResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    startSession(topicId)
      .then((data) => {
        setSessionId(data.session_id);
        const unanswered = data.questions.filter((q) => !q.answered);
        setMainQuestions(unanswered);

        const skippedIds = new Set(data.skipped_queue);
        const skipped = unanswered.filter((q) => skippedIds.has(q.id));
        setSkippedQuestions(skipped);

        if (unanswered.length === 0) {
          setPhase('complete');
        } else {
          setPhase('main');
        }
      })
      .catch(() => setLoadError(true));
  }, [topicId]);

  const isInSkipPhase = phase === 'skip_queue';
  const question = isInSkipPhase
    ? skippedQuestions[skipIdx] ?? null
    : mainQuestions[mainIdx] ?? null;

  const mainRemaining = mainQuestions.length - mainIdx;
  const skipRemaining = skippedQuestions.length - skipIdx;

  async function handleMcqSelect(option: string) {
    if ((phase !== 'main' && phase !== 'skip_queue') || !question || !sessionId || submitting) return;
    setSelectedOption(option);
    setSubmitting(true);
    const status = option === question.correct_answer ? 'correct' : 'wrong';
    try {
      await recordAttempt(sessionId, question.id, option, status);
    } catch { /* best effort */ }
    setSubmitting(false);
    setPhase('reveal');
  }

  function handleWrittenCheck() {
    if (!textAnswer.trim()) {
      setTextError('Please enter an answer before submitting.');
      return;
    }
    setTextError('');
    setPhase('reveal');
  }

  async function handleSelfAssess(status: 'correct' | 'wrong') {
    if (!sessionId || !question || submitting) return;
    setSubmitting(true);
    try {
      await recordAttempt(sessionId, question.id, textAnswer, status);
    } catch { /* best effort */ }
    setSubmitting(false);
    await advanceAfterReveal();
  }

  async function handleFillBlankSubmit() {
    if (!textAnswer.trim()) {
      setTextError('Please enter an answer before submitting.');
      return;
    }
    if (!sessionId || !question || submitting) return;
    setTextError('');
    setSubmitting(true);
    const isCorrect = textAnswer.trim().toLowerCase() === question.correct_answer.trim().toLowerCase();
    const status = isCorrect ? 'correct' : 'wrong';
    try {
      await recordAttempt(sessionId, question.id, textAnswer, status);
    } catch { /* best effort */ }
    setSubmitting(false);
    setSelectedOption(status);
    setPhase('reveal');
  }

  async function handleSkip() {
    if (!sessionId || !question || submitting || phase !== 'main') return;
    setSubmitting(true);
    try {
      await recordAttempt(sessionId, question.id, '', 'skipped');
      const updatedSkipped = [...skippedQuestions, question];
      setSkippedQuestions(updatedSkipped);
    } catch { /* best effort */ }
    setSubmitting(false);
    await advanceMain(true);
  }

  async function advanceAfterReveal() {
    if (isInSkipPhase) {
      if (skipIdx >= skippedQuestions.length - 1) {
        await finish();
      } else {
        setSkipIdx((i) => i + 1);
        resetAnswer();
        setPhase('skip_queue');
      }
    } else {
      await advanceMain(false);
    }
  }

  async function advanceMain(wasSkip: boolean) {
    const nextIdx = mainIdx + 1;
    if (nextIdx >= mainQuestions.length) {
      const queueLen = wasSkip
        ? skippedQuestions.length + 1
        : skippedQuestions.length;
      if (queueLen > 0) {
        setMainIdx(nextIdx);
        resetAnswer();
        setPhase('skip_transition');
      } else {
        await finish();
      }
    } else {
      setMainIdx(nextIdx);
      resetAnswer();
      setPhase('main');
    }
  }

  async function startSkipQueue() {
    if (skippedQuestions.length === 0) {
      await finish();
    } else {
      setSkipIdx(0);
      resetAnswer();
      setPhase('skip_queue');
    }
  }

  async function finish() {
    setPhase('loading');
    try {
      if (sessionId) setResults(await completeSession(sessionId));
    } catch { /* show completion anyway */ }
    setPhase('complete');
  }

  function resetAnswer() {
    setSelectedOption(null);
    setTextAnswer('');
    setTextError('');
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

  if (phase === 'loading') {
    return (
      <View className="flex-1 bg-slate-50">
        <SessionHeader />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      </View>
    );
  }

  if (phase === 'complete') {
    return (
      <View className="flex-1 bg-slate-50">
        <SessionHeader />
        <CompletionScreen results={results} onBack={() => router.back()} />
      </View>
    );
  }

  if (phase === 'skip_transition') {
    return (
      <View className="flex-1 bg-slate-50">
        <SessionHeader />
        <View className="flex-1 items-center justify-center px-6 gap-5">
          <Text className="text-5xl">🔄</Text>
          <Text className="text-xl font-bold text-slate-900 text-center">
            You skipped {skippedQuestions.length} {skippedQuestions.length === 1 ? 'question' : 'questions'}
          </Text>
          <Text className="text-sm text-slate-500 text-center leading-relaxed">
            Let's go back to them now. This time, you must answer each one.
          </Text>
          <Pressable
            className="bg-indigo-600 rounded-2xl py-4 px-10 active:bg-indigo-700"
            onPress={startSkipQueue}
          >
            <Text className="text-white font-semibold">Continue</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const isReveal = phase === 'reveal';
  const totalMain = mainQuestions.length;
  const progressPct = isInSkipPhase
    ? ((skipIdx) / skippedQuestions.length) * 100
    : (mainIdx / Math.max(totalMain, 1)) * 100;

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
            {isInSkipPhase
              ? `Revisiting skipped questions: ${skipRemaining} remaining`
              : `Question ${mainIdx + 1} of ${totalMain}`}
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
            {FORMAT_LABEL[question!.format]}
          </Text>
          {question!.format === 'fill_blank' ? (
            <FillBlankBody
              body={question!.body}
              value={textAnswer}
              onChange={(v) => { setTextAnswer(v); setTextError(''); }}
              editable={!isReveal}
            />
          ) : (
            <Text className="text-base text-slate-900 leading-relaxed">{question!.body}</Text>
          )}
        </View>

        {/* MCQ options */}
        {question!.format === 'mcq' && question!.options?.map((option, i) => {
          const isSelected = option === selectedOption;
          const isCorrect = option === question!.correct_answer;
          let style = 'bg-white border-slate-200 active:bg-slate-50';
          let textStyle = 'text-slate-900';
          if (isReveal) {
            if (isCorrect) { style = 'bg-emerald-50 border-emerald-400'; textStyle = 'text-emerald-700 font-semibold'; }
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
              disabled={isReveal || submitting}
            >
              <Text className={`text-sm ${textStyle}`}>{option}</Text>
            </Pressable>
          );
        })}

        {/* Written textarea */}
        {question!.format === 'written' && (
          <TextInput
            className="bg-white border border-slate-200 rounded-2xl px-4 py-4 text-base text-slate-900 mb-2"
            placeholder="Type your answer…"
            placeholderTextColor="#94a3b8"
            value={textAnswer}
            onChangeText={(v) => { setTextAnswer(v); setTextError(''); }}
            multiline
            editable={!isReveal}
            autoFocus={!isReveal}
          />
        )}

        {textError ? (
          <Text className="text-xs text-red-500 mb-3 px-1">{textError}</Text>
        ) : null}

        {/* Correct answer reveal (written / fill_blank) */}
        {isReveal && question!.format !== 'mcq' && (
          <View className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 mb-4">
            <Text className="text-xs font-semibold text-emerald-600 mb-1">Correct answer</Text>
            <Text className="text-sm text-emerald-800">{question!.correct_answer}</Text>
          </View>
        )}

        {/* Fill-blank result indicator */}
        {isReveal && question!.format === 'fill_blank' && (
          <View
            className={`rounded-2xl p-3 mb-4 ${
              selectedOption === 'correct' ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'
            }`}
          >
            <Text className={`text-sm font-semibold ${selectedOption === 'correct' ? 'text-emerald-700' : 'text-red-700'}`}>
              {selectedOption === 'correct' ? '✓ Correct!' : '✗ Incorrect'}
            </Text>
          </View>
        )}

        {/* Reasoning */}
        {isReveal && (
          <View className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-4">
            <Text className="text-xs font-semibold text-slate-500 mb-1">Reasoning</Text>
            <Text className="text-sm text-slate-700 leading-relaxed">{question!.reasoning}</Text>
          </View>
        )}

        {/* Action buttons — question phase */}
        {!isReveal && question!.format === 'written' && (
          <Pressable
            className="bg-indigo-600 rounded-2xl py-4 items-center active:bg-indigo-700"
            onPress={handleWrittenCheck}
          >
            <Text className="text-white font-semibold">Check answer</Text>
          </Pressable>
        )}

        {!isReveal && question!.format === 'fill_blank' && (
          <Pressable
            className="bg-indigo-600 rounded-2xl py-4 items-center active:bg-indigo-700"
            onPress={handleFillBlankSubmit}
            disabled={submitting}
          >
            {submitting
              ? <ActivityIndicator color="white" />
              : <Text className="text-white font-semibold">Submit</Text>}
          </Pressable>
        )}

        {/* Skip button (main phase only, not in skipped queue) */}
        {!isReveal && !isInSkipPhase && (
          <Pressable
            className="mt-3 py-3 items-center active:bg-slate-100 rounded-2xl"
            onPress={handleSkip}
            disabled={submitting}
          >
            <Text className="text-sm text-slate-400">Skip for now</Text>
          </Pressable>
        )}

        {/* Action buttons — reveal phase */}
        {isReveal && question!.format === 'mcq' && (
          <Pressable
            className="bg-indigo-600 rounded-2xl py-4 items-center mt-2 active:bg-indigo-700"
            onPress={advanceAfterReveal}
            disabled={submitting}
          >
            <Text className="text-white font-semibold">
              {isInSkipPhase && skipIdx >= skippedQuestions.length - 1
                ? 'Finish'
                : !isInSkipPhase && mainIdx >= mainQuestions.length - 1 && skippedQuestions.length === 0
                  ? 'Finish'
                  : 'Next →'}
            </Text>
          </Pressable>
        )}

        {isReveal && question!.format === 'written' && (
          <View className="flex-row gap-3">
            <Pressable
              className="flex-1 bg-emerald-50 border border-emerald-300 rounded-2xl py-4 items-center active:bg-emerald-100"
              onPress={() => handleSelfAssess('correct')}
              disabled={submitting}
            >
              {submitting
                ? <ActivityIndicator color="#059669" />
                : <Text className="text-emerald-700 font-semibold text-sm">✓  Got it</Text>}
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

        {isReveal && question!.format === 'fill_blank' && (
          <Pressable
            className="bg-indigo-600 rounded-2xl py-4 items-center mt-2 active:bg-indigo-700"
            onPress={advanceAfterReveal}
            disabled={submitting}
          >
            <Text className="text-white font-semibold">
              {isInSkipPhase && skipIdx >= skippedQuestions.length - 1 ? 'Finish' : 'Next →'}
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function SessionHeader() {
  return (
    <View className="bg-indigo-600 px-6 pt-14 pb-5 flex-row items-center gap-3">
      <Pressable
        className="w-8 h-8 rounded-full bg-indigo-500 items-center justify-center active:bg-indigo-400"
        onPress={() => router.back()}
      >
        <Text className="text-white text-xl leading-none" style={{ marginTop: -1 }}>‹</Text>
      </Pressable>
      <Text className="text-white text-xl font-bold">Practice</Text>
    </View>
  );
}

function FillBlankBody({
  body,
  value,
  onChange,
  editable,
}: {
  body: string;
  value: string;
  onChange: (v: string) => void;
  editable: boolean;
}) {
  const parts = body.split('___');
  return (
    <View className="flex-row flex-wrap items-center">
      {parts.map((part, i) => (
        <Fragment key={i}>
          <Text className="text-base text-slate-900 leading-relaxed">{part}</Text>
          {i < parts.length - 1 && (
            <TextInput
              className="border-b-2 border-indigo-400 text-base text-indigo-700 min-w-20 pb-0.5 mx-1"
              value={value}
              onChangeText={onChange}
              editable={editable}
              autoFocus={editable}
              style={{ minWidth: 80 }}
            />
          )}
        </Fragment>
      ))}
    </View>
  );
}

function CompletionScreen({
  results,
  onBack,
}: {
  results: SessionResult | null;
  onBack: () => void;
}) {
  const passed = results?.threshold_passed;

  return (
    <View className="flex-1 items-center justify-center px-6 gap-4">
      <Text className="text-5xl">{passed ? '🏆' : '🎉'}</Text>
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

      {results && (
        <View
          className={`w-full rounded-2xl p-4 ${
            passed ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'
          }`}
        >
          <Text className={`text-sm font-semibold text-center ${passed ? 'text-emerald-700' : 'text-amber-700'}`}>
            {passed
              ? results.new_batch_generating
                ? 'Well done! Your next batch is being generated.'
                : 'Well done! Unlock achieved.'
              : 'Keep practising — you need 80% to unlock the next batch.'}
          </Text>
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
