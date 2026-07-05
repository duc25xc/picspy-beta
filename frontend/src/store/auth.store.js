import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api, { setAuthBridge } from '../api/api'

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
          // Xóa sạch state cũ trước khi set data mới,
          // đảm bảo không có field nào của tài khoản cũ bị giữ lại
          set({
            user: data.user,
            accessToken: data.accessToken,
            isLoading: false,
          })
          // Gọi refreshMe ngay sau login để đồng bộ đầy đủ dữ liệu từ server
          // (login response chỉ trả về một subset của user fields)
          get().refreshMe()
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
      // Dùng REPLACE (không merge) để tránh dữ liệu cũ của tài khoản khác bị giữ lại
      refreshMe: async () => {
        const currentToken = get().accessToken
        if (!currentToken) return
        try {
          const { data } = await api.get('/users/me')
          // Kiểm tra token không đổi trong lúc đang fetch (phòng race condition switch account)
          if (get().accessToken !== currentToken) return
          // Replace toàn bộ user object thay vì merge để tránh stale data
          set({ user: data.user })
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

/**
 * Kết nối bridge sau khi store đã được khởi tạo.
 * Từ đây, api.js luôn đọc/ghi token trực tiếp từ Zustand in-memory state
 * thay vì localStorage — đảm bảo tính nhất quán khi switch account.
 */
setAuthBridge({
  getToken: () => useAuthStore.getState().accessToken,
  updateToken: (newToken) => {
    useAuthStore.setState({ accessToken: newToken })
  },
  clearAuth: () => {
    useAuthStore.setState({ user: null, accessToken: null })
  },
})

export default useAuthStore
