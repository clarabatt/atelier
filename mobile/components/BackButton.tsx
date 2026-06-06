import { Pressable, Text } from "react-native";
import { useRouter } from "expo-router";

interface BackButtonProps {
  onPress?: () => void;
}

export function BackButton({ onPress }: BackButtonProps) {
  const router = useRouter();
  return (
    <Pressable
      className="w-8 h-8 rounded-full bg-indigo-500 items-center justify-center active:bg-indigo-400"
      onPress={onPress ?? (() => router.back())}
    >
      <Text
        className="text-white text-xl leading-none"
        style={{ marginTop: -5 }}
      >
        ‹
      </Text>
    </Pressable>
  );
}
