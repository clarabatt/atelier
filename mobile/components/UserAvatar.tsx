import { Image, Pressable, Text, View } from 'react-native';

interface UserAvatarProps {
  pictureUrl?: string | null;
  displayName?: string | null;
  onPress: () => void;
}

export function UserAvatar({ pictureUrl, displayName, onPress }: UserAvatarProps) {
  const initials = displayName
    ? displayName.split(' ').slice(0, 2).map((w) => w[0].toUpperCase()).join('')
    : '?';

  return (
    <Pressable onPress={onPress} hitSlop={8}>
      {pictureUrl ? (
        <Image
          source={{ uri: pictureUrl }}
          style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: '#818cf8' }}
        />
      ) : (
        <View
          style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: '#818cf8' }}
          className="bg-indigo-500 items-center justify-center"
        >
          <Text className="text-white text-sm font-bold">{initials}</Text>
        </View>
      )}
    </Pressable>
  );
}
