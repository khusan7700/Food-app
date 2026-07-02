import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { User, UserRole } from '@order-eats/types';
import { api } from '@/lib/axios';
import { deleteToken, getToken, saveToken } from '@/lib/auth';

interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

interface AuthResponse {
  user: User;
  token: string;
}

interface AuthStore {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  loginWithKakao: (kakaoAccessToken: string, role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
  updateUser: (patch: Partial<User>) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: true,

      login: async (email, password) => {
        const { data } = await api.post<AuthResponse>('/auth/login', { email, password });
        await saveToken(data.token);
        set({ user: data.user });
      },

      register: async (payload) => {
        const { data } = await api.post<AuthResponse>('/auth/register', payload);
        await saveToken(data.token);
        set({ user: data.user });
      },

      loginWithKakao: async (kakaoAccessToken, role) => {
        const { data } = await api.post<AuthResponse>('/auth/kakao', { kakaoAccessToken, role });
        await saveToken(data.token);
        set({ user: data.user });
      },

      logout: async () => {
        await deleteToken();
        set({ user: null });
      },

      checkSession: async () => {
        set({ isLoading: true });
        try {
          const token = await getToken();
          if (token) {
            const { data } = await api.get<User>('/auth/me');
            set({ user: data });
          }
        } catch {
          await deleteToken();
          set({ user: null });
        } finally {
          set({ isLoading: false });
        }
      },

      updateUser: (patch) => {
        const { user } = get();
        if (user) set({ user: { ...user, ...patch } });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ user: state.user }),
    },
  ),
);
