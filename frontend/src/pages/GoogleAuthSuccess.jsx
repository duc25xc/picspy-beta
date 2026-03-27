import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import useAuthStore from '../store/auth.store'
import api from '../api/api'
import toast from 'react-hot-toast'

export default function GoogleAuthSuccess() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()

  // Ref để chống việc chạy 2 lần trong React Strict Mode (Development)
  const isProcessed = useRef(false)

  useEffect(() => {
    if (isProcessed.current) return

    const token = searchParams.get('token')

    const syncUser = async () => {
      if (!token) {
        toast.error('Không tìm thấy mã xác thực từ Google')
        navigate('/login', { replace: true })
        return
      }

      isProcessed.current = true

      try {
        /**
         * 1. Gọi API lấy thông tin User.
         * Ở đây mình dùng endpoint /users/me như trong user.routes.js của bạn.
         * Phải truyền Header Authorization trực tiếp vì token chưa được lưu vào store.
         */
        const response = await api.get('/users/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        const userData = response.data.user

        // 2. Cập nhật vào Zustand Store (hàm setAuth trong auth.store.js)
        // Hàm này sẽ tự động lưu vào localStorage và biến user sẽ không còn null
        setAuth(userData, token)

        toast.success(
          `Chào mừng ${userData.displayName || userData.username} quay trở lại!`
        )

        // 3. Đẩy về trang chủ - lúc này Header sẽ tự động hiển thị Avatar
        navigate('/', { replace: true })
      } catch (error) {
        console.error('Lỗi đồng bộ Google Auth:', error)
        toast.error('Có lỗi xảy ra khi xác thực tài khoản')
        navigate('/login', { replace: true })
      }
    }

    syncUser()
  }, [searchParams, navigate, setAuth])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface">
      <div className="flex flex-col items-center gap-5">
        {/* Hiệu ứng loading khớp với phong cách PicSpy */}
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-2xl bg-brand-500/20 animate-pulse" />
          <div className="w-full h-full rounded-2xl bg-gradient-brand animate-spin shadow-lg shadow-brand-500/20" />
        </div>

        <div className="text-center">
          <h2 className="text-white text-lg font-bold tracking-widest uppercase">
            Đang đồng bộ dữ liệu
          </h2>
          <p className="text-white/40 text-sm mt-2 animate-bounce">
            Vui lòng chờ trong giây lát...
          </p>
        </div>
      </div>
    </div>
  )
}
