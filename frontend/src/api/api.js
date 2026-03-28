import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/v1'

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // Cho phép gửi httpOnly cookie (refresh token)
  timeout: 15000,
})

// Request interceptor: gắn access token từ Zustand store
api.interceptors.request.use((config) => {
  // Import động để tránh circular dependency
  const token = JSON.parse(localStorage.getItem('picspy-auth') || '{}')?.state
    ?.accessToken
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

        // Cập nhật localStorage (Zustand persist)
        const stored = JSON.parse(localStorage.getItem('picspy-auth') || '{}')
        if (stored.state) {
          stored.state.accessToken = newToken
          localStorage.setItem('picspy-auth', JSON.stringify(stored))
        }

        processQueue(null, newToken)
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        // Xóa auth state
        localStorage.removeItem('picspy-auth')
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
