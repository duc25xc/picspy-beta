import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../api/api'

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isLoading: false,

      // === ACTIONS ===

      setAuth: (user, accessToken) => set({ user, accessToken }),

      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),

      login: async (email, password) => {
        set({ isLoading: true })
        try {
          const { data } = await api.post('/auth/login', { email, password })
          set({
            user: data.user,
            accessToken: data.accessToken,
            isLoading: false,
          })
          return { success: true }
        } catch (err) {
          set({ isLoading: false })
          return {
            success: false,
            message: err.response?.data?.message || 'Đăng nhập thất bại',
          }
        }
      },

      register: async (username, email, password) => {
        set({ isLoading: true })
        try {
          const { data } = await api.post('/auth/register', {
            username,
            email,
            password,
          })
          set({ isLoading: false })
          return { success: true, message: data.message }
        } catch (err) {
          set({ isLoading: false })
          return {
            success: false,
            message: err.response?.data?.message || 'Đăng ký thất bại',
          }
        }
      },

      logout: async () => {
        try {
          await api.post('/auth/logout')
        } catch {
          // Ignore lỗi logout
        } finally {
          set({ user: null, accessToken: null })
        }
      },

      // Refresh access token (gọi từ Axios interceptor)
      refresh: async () => {
        try {
          const { data } = await api.post('/auth/refresh')
          set({ accessToken: data.accessToken })
          return data.accessToken
        } catch {
          set({ user: null, accessToken: null })
          return null
        }
      },

      // Đồng bộ thông tin user mới nhất từ server (token, stats...)
      refreshMe: async () => {
        try {
          const { data } = await api.get('/users/me')
          set((state) => ({ user: { ...state.user, ...data.user } }))
        } catch {
          // Bỏ qua nếu lỗi (token hết hạn sẽ do interceptor xử lý)
        }
      },

      isAuthenticated: () => !!get().user && !!get().accessToken,
    }),
    {
      name: 'picspy-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
      }),
    }
  )
)

export default useAuthStore
