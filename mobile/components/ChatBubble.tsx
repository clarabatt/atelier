import { Text, View } from 'react-native';

interface ChatBubbleProps {
  role: 'user' | 'assistant';
  content: string;
}

export function ChatBubble({ role, content }: ChatBubbleProps) {
  const isUser = role === 'user';
  return (
    <View style={{ alignSelf: isUser ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
      <View
        className={
          isUser
            ? 'bg-indigo-600 rounded-3xl rounded-tr-sm px-4 py-3'
            : 'bg-white border border-slate-100 rounded-3xl rounded-tl-sm px-4 py-3'
        }
      >
        <Text className={`text-sm leading-relaxed ${isUser ? 'text-white' : 'text-slate-800'}`}>
          {content}
        </Text>
      </View>
    </View>
  );
}
