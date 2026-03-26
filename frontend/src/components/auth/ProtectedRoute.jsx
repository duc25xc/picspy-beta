import { Navigate, useLocation } from 'react-router-dom'
import useAuthStore from '../../store/auth.store'

/**
 * Bảo vệ routes yêu cầu đăng nhập
 * Lưu lại intended URL để redirect sau khi login thành công
 */
const ProtectedRoute = ({ children }) => {
  const { user, accessToken } = useAuthStore()
  const location = useLocation()

  if (!user || !accessToken) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}

export default ProtectedRoute
