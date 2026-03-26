import { NavLink, useLocation } from 'react-router-dom'
import { Home, Search, Upload, Bell, User, Eye } from 'lucide-react'
import { motion } from 'framer-motion'
import useAuthStore from '../../store/auth.store'

const navItems = [
  { to: '/', icon: Home, label: 'Trang chủ' },
  { to: '/search', icon: Search, label: 'Tìm kiếm' },
  { to: '/upload', icon: Upload, label: 'Upload', isPrimary: true },
  { to: '/notifications', icon: Bell, label: 'Thông báo' },
  { to: '/profile/me', icon: User, label: 'Hồ sơ' },
]

/**
 * Bottom navigation bar cho mobile
 * Ẩn trên desktop (dùng Header thay thế)
 */
const BottomNav = () => {
  const location = useLocation()
  const { user } = useAuthStore()

  // Ẩn ở trang auth
  if (['/login', '/register', '/forgot-password', '/reset-password'].includes(location.pathname)) return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden pb-safe">
      <div className="bg-surface-50/90 backdrop-blur-xl border-t border-white/5">
        <div className="flex items-center justify-around px-2 py-2">
          {navItems.map(({ to, icon: Icon, label, isPrimary }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 min-w-[44px] min-h-[44px] justify-center rounded-xl transition-all duration-200
                ${isPrimary ? '' : isActive ? 'text-brand-400' : 'text-white/40 hover:text-white/70'}`
              }
            >
              {({ isActive }) =>
                isPrimary ? (
                  // Upload button — primary action
                  <motion.div
                    whileTap={{ scale: 0.9 }}
                    className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-900/60"
                  >
                    <Icon size={22} className="text-white" />
                  </motion.div>
                ) : (
                  <>
                    <Icon size={22} />
                    <span className="text-[10px] font-medium">{label}</span>
                    {isActive && (
                      <motion.div
                        layoutId="nav-indicator"
                        className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-brand-400"
                      />
                    )}
                  </>
                )
              }
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  )
}

export default BottomNav
