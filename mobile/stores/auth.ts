import { create } from 'zustand';
import { storage } from '@/lib/storage';
import { api } from '@/lib/api';

export interface User {
  id: string;
  email: string;
  display_name: string;
  picture_url: string | null;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  setToken: (token: string) => Promise<void>;
  fetchUser: () => Promise<void>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,

  setToken: async (token: string) => {
    await storage.setItem('session_token', token);
    set({ token });
  },

  fetchUser: async () => {
    try {
      const { data } = await api.get('/api/users/me');
      set({ user: data.user });
    } catch {
      set({ user: null, token: null });
      await storage.deleteItem('session_token');
    }
  },

  logout: async () => {
    await storage.deleteItem('session_token');
    set({ user: null, token: null });
  },

  initialize: async () => {
    const token = await storage.getItem('session_token');
    if (token) {
      set({ token });
      await get().fetchUser();
    }
    set({ isLoading: false });
  },
}));
