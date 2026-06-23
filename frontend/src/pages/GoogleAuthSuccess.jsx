import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import useAuthStore from '../store/auth.store'
import api from '../api/api'
import toast from 'react-hot-toast'
import ContentLoader from '../components/ui/ContentLoader'

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
      <div className="flex flex-col items-center gap-6">
        {/* Logo brand animation đồng nhất với toàn hệ thống */}
        <ContentLoader size="lg" />

        <div className="text-center">
          <p className="text-white/40 text-sm mt-1 animate-pulse tracking-widest uppercase text-xs">
            Đang đồng bộ tài khoản...
          </p>
        </div>
      </div>
    </div>
  )
}
