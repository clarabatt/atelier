import { Pressable, Text } from 'react-native';

interface Props {
  selected: boolean;
  onPress: () => void;
  icon: string;
  title: string;
  subtitle: string;
}

export function ModeCard({ selected, onPress, icon, title, subtitle }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={{ flex: 1 }}
      className={`rounded-2xl p-4 border ${
        selected ? 'bg-indigo-50 border-indigo-400' : 'bg-white border-slate-200 active:bg-slate-50'
      }`}
    >
      <Text className="text-2xl mb-2">{icon}</Text>
      <Text className={`text-sm font-semibold ${selected ? 'text-indigo-700' : 'text-slate-800'}`}>
        {title}
      </Text>
      <Text className={`text-xs mt-0.5 ${selected ? 'text-indigo-400' : 'text-slate-400'}`}>
        {subtitle}
      </Text>
    </Pressable>
  );
}
