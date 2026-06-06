import { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { BackButton } from '@/components/BackButton';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  children?: ReactNode;
}

export function ScreenHeader({ title, subtitle, onBack, children }: ScreenHeaderProps) {
  return (
    <View className={`bg-indigo-600 px-6 pt-14 ${children ? 'pb-5' : 'pb-6'}`}>
      <View className={`flex-row items-center gap-3${children ? ' mb-4' : ''}`}>
        <BackButton onPress={onBack} />
        <View className="flex-1">
          <Text className="text-white text-xl font-bold" numberOfLines={1}>{title}</Text>
          {subtitle ? <Text className="text-indigo-300 text-xs">{subtitle}</Text> : null}
        </View>
      </View>
      {children}
    </View>
  );
}
