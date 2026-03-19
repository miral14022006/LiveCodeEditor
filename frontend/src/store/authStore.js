import { create } from 'zustand';
import api from '../services/api';

const useAuthStore = create((set, get) => ({
    user: JSON.parse(localStorage.getItem('user')) || null,
    accessToken: localStorage.getItem('accessToken') || null,
    refreshToken: localStorage.getItem('refreshToken') || null,
    isLoading: false,
    error: null,

    // ========== REGISTER ==========
    register: async ({ name, email, username, password }) => {
        set({ isLoading: true, error: null });
        try {
            const res = await api.post('/auth/register', { name, email, username, password });
            set({ isLoading: false });
            return res.data;
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Registration failed';
            set({ isLoading: false, error: msg });
            throw new Error(msg);
        }
    },

    // ========== LOGIN ==========
    login: async ({ email, password }) => {
        set({ isLoading: true, error: null });
        try {
            const res = await api.post('/auth/login', { email, password });
            const { accessToken, refreshToken, user } = res.data;

            localStorage.setItem('accessToken', accessToken);
            localStorage.setItem('refreshToken', refreshToken);
            localStorage.setItem('user', JSON.stringify(user));

            set({
                user,
                accessToken,
                refreshToken,
                isLoading: false,
                error: null,
            });

            return res.data;
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Login failed';
            set({ isLoading: false, error: msg });
            throw new Error(msg);
        }
    },

    // ========== LOGOUT ==========
    logout: () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        set({ user: null, accessToken: null, refreshToken: null, error: null });
    },

    // ========== REFRESH TOKEN ==========
    refreshAccessToken: async () => {
        try {
            const refreshToken = get().refreshToken;
            if (!refreshToken) throw new Error('No refresh token');

            const res = await api.post('/auth/refresh-token', { refreshToken });
            const { accessToken } = res.data;

            localStorage.setItem('accessToken', accessToken);
            set({ accessToken });
            return accessToken;
        } catch (err) {
            get().logout();
            throw err;
        }
    },

    clearError: () => set({ error: null }),
}));

export default useAuthStore;
