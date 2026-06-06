import { ReactNode } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

interface ActionMenuProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function ActionMenu({ visible, onClose, title, children }: ActionMenuProps) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/40 justify-end" onPress={onClose}>
        <Pressable onPress={() => {}}>
          <View className="bg-white rounded-t-3xl px-5 pt-5 pb-10 gap-1">
            <Text className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
              {title}
            </Text>
            {children}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

interface ActionMenuItemProps {
  icon: string;
  label: string;
  onPress: () => void;
  separator?: boolean;
}

export function ActionMenuItem({ icon, label, onPress, separator = false }: ActionMenuItemProps) {
  return (
    <Pressable
      className={`flex-row items-center py-4 active:bg-slate-50 rounded-xl px-2 ${separator ? 'border-b border-slate-100' : ''}`}
      onPress={onPress}
    >
      <View className="w-8 items-center">
        <Text className="text-lg">{icon}</Text>
      </View>
      <Text className="text-base text-slate-800">{label}</Text>
    </Pressable>
  );
}
