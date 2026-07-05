import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/v1'

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // Cho phép gửi httpOnly cookie (refresh token)
  timeout: 15000,
})

/**
 * Token bridge — tránh circular dependency giữa api.js ↔ auth.store.js
 * auth.store.js sẽ gọi setAuthBridge() sau khi khởi tạo store.
 * Interceptor luôn đọc accessToken trực tiếp từ Zustand in-memory state
 * thay vì localStorage, đảm bảo không bao giờ dùng token của tài khoản cũ.
 */
const _bridge = {
  getToken: () =>
    JSON.parse(localStorage.getItem('picspy-auth') || '{}')?.state?.accessToken ?? null,
  updateToken: (newToken) => {
    // Fallback: cập nhật localStorage trực tiếp nếu bridge chưa được khởi tạo
    const stored = JSON.parse(localStorage.getItem('picspy-auth') || '{}')
    if (stored.state) {
      stored.state.accessToken = newToken
      localStorage.setItem('picspy-auth', JSON.stringify(stored))
    }
  },
  clearAuth: () => {
    localStorage.removeItem('picspy-auth')
  },
}

/**
 * Được gọi từ auth.store.js để gắn getter/setter trực tiếp vào Zustand state
 * Sau khi gọi hàm này, token luôn đọc từ in-memory store (không qua localStorage)
 */
export const setAuthBridge = ({ getToken, updateToken, clearAuth }) => {
  _bridge.getToken = getToken
  _bridge.updateToken = updateToken
  _bridge.clearAuth = clearAuth
}

// Request interceptor: gắn access token từ Zustand store (in-memory)
api.interceptors.request.use((config) => {
  const token = _bridge.getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor: auto refresh khi 401
let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error)
    else prom.resolve(token)
  })
  failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Đang refresh → xếp hàng chờ
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            return api(originalRequest)
          })
          .catch(Promise.reject)
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const { data } = await api.post('/auth/refresh')
        const newToken = data.accessToken

        // Cập nhật Zustand store in-memory + localStorage đồng thời qua bridge
        _bridge.updateToken(newToken)

        processQueue(null, newToken)
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        // Xóa auth state hoàn toàn
        _bridge.clearAuth()
        window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default api
