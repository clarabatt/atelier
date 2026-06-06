import { Pressable, Text, View } from 'react-native';
import { type SessionResult } from '@/lib/sessions';

interface SessionCompletionProps {
  results: SessionResult | null;
  onBack: () => void;
}

export function SessionCompletion({ results, onBack }: SessionCompletionProps) {
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

type ResultColor = 'text-emerald-600' | 'text-red-500' | 'text-slate-400';

function ResultRow({ label, value, color }: { label: string; value: number; color: ResultColor }) {
  return (
    <View className="flex-row justify-between items-center">
      <Text className="text-sm text-slate-600">{label}</Text>
      <Text className={`text-sm font-bold ${color}`}>{value}</Text>
    </View>
  );
}
