import { create } from 'zustand';
import { runDiagnostic, type DiagnosticMessage } from '@/lib/topics';

interface DiagnosticStore {
  topicId: string | null;
  messages: DiagnosticMessage[];
  isLoading: boolean;
  isDone: boolean;
  startDiagnostic: (topicId: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  reset: () => void;
}

const INITIAL: Pick<DiagnosticStore, 'topicId' | 'messages' | 'isLoading' | 'isDone'> = {
  topicId: null,
  messages: [],
  isLoading: false,
  isDone: false,
};

export const useSessionStore = create<DiagnosticStore>((set, get) => ({
  ...INITIAL,

  startDiagnostic: async (topicId: string) => {
    set({ ...INITIAL, topicId, isLoading: true });
    try {
      const { message, is_final } = await runDiagnostic(topicId, []);
      set({ messages: [{ role: 'assistant', content: message }], isLoading: false, isDone: is_final });
    } catch {
      set({
        messages: [{ role: 'assistant', content: "Couldn't start the diagnostic. Please go back and try again." }],
        isLoading: false,
      });
    }
  },

  sendMessage: async (content: string) => {
    const { topicId, messages } = get();
    if (!topicId || !content.trim()) return;

    const updated: DiagnosticMessage[] = [...messages, { role: 'user', content: content.trim() }];
    set({ messages: updated, isLoading: true });

    try {
      const { message, is_final } = await runDiagnostic(topicId, updated);
      set({
        messages: [...updated, { role: 'assistant', content: message }],
        isLoading: false,
        isDone: is_final,
      });
    } catch {
      set({
        messages: [...updated, { role: 'assistant', content: "Something went wrong. Please try again." }],
        isLoading: false,
      });
    }
  },

  reset: () => set(INITIAL),
}));
