import { useState, useEffect } from 'react'
import { NavLink, useLocation, useNavigate, Link } from 'react-router-dom'
import { 
  Home, Search, Upload, Bell, User, LayoutGrid, 
  LogOut, Sun, Moon, Monitor, Globe, ChevronRight, X, Coins 
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import useAuthStore from '../../store/auth.store'
import { useSettings } from '../../context/SettingsContext'
import toast from 'react-hot-toast'

/**
 * Bottom navigation bar cho mobile
 * Ẩn trên desktop (dùng Header thay thế)
 */
const BottomNav = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const { theme, language, changeTheme, changeLanguage, t } = useSettings()

  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [avatarError, setAvatarError] = useState(false)

  // Đóng menu khi thay đổi route
  useEffect(() => {
    setIsMenuOpen(false)
  }, [location.pathname])

  // Reset avatarError khi user thay đổi
  useEffect(() => {
    setAvatarError(false)
  }, [user])

  // Ẩn ở trang auth
  if (['/login', '/register', '/forgot-password', '/reset-password'].includes(location.pathname)) return null

  const handleLogout = async () => {
    await logout()
    toast.success(language === 'vi' ? 'Đã đăng xuất thành công' : 'Logged out successfully')
    setIsMenuOpen(false)
    navigate('/login')
  }

  // Định nghĩa danh sách các tab điều hướng di động
  const guestNavItems = [
    { to: '/', icon: Home, label: language === 'vi' ? 'Trang chủ' : 'Home' },
    { to: '/search', icon: Search, label: t.nav.search },
    { to: '/upload', icon: Upload, label: t.nav.upload, isPrimary: true },
    { to: '/login', icon: User, label: t.nav.login },
  ]

  const authNavItems = [
    { to: '/', icon: Home, label: language === 'vi' ? 'Trang chủ' : 'Home' },
    { to: '/search', icon: Search, label: t.nav.search },
    { to: '/upload', icon: Upload, label: t.nav.upload, isPrimary: true },
    { to: '/my-posts', icon: LayoutGrid, label: language === 'vi' ? 'Ảnh' : 'Photos' },
    // Tab đặc biệt mở Bottom Sheet
    { to: '#menu', icon: User, label: language === 'vi' ? 'Tôi' : 'Me', isMenuTrigger: true },
  ]

  const navItems = user ? authNavItems : guestNavItems

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden pb-safe">
        <div className="bg-[rgba(255,252,245,0.75)] dark:bg-surface-50/90 backdrop-blur-xl border-t border-[var(--color-border)] transition-all">
          <div className="flex items-center justify-around px-2 py-2">
            {navItems.map((item) => {
              const { to, icon: Icon, label, isPrimary, isMenuTrigger } = item
              
              if (isMenuTrigger) {
                // Render nút mở Menu đặc biệt cho user đã đăng nhập
                return (
                  <button
                    key={to}
                    onClick={() => setIsMenuOpen(true)}
                    className="flex flex-col items-center gap-0.5 min-w-[44px] min-h-[44px] justify-center rounded-xl text-foreground/60 hover:text-foreground focus:outline-none relative"
                  >
                    <div className="w-6 h-6 rounded-full overflow-hidden border border-brand-500 shadow-sm flex items-center justify-center">
                      {user.avatar && !avatarError ? (
                        <img 
                          src={user.avatar} 
                          alt={user.username} 
                          className="w-full h-full object-cover" 
                          onError={() => setAvatarError(true)}
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-brand flex items-center justify-center text-white text-[10px] font-black">
                          {user.username?.[0]?.toUpperCase()}
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] font-medium mt-0.5">{label}</span>
                  </button>
                )
              }

              return (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `flex flex-col items-center gap-0.5 min-w-[44px] min-h-[44px] justify-center rounded-xl transition-all duration-200 relative
                    ${isPrimary ? '' : isActive ? 'text-brand-400' : 'text-foreground/60 hover:text-foreground'}`
                  }
                >
                  {({ isActive }) =>
                    isPrimary ? (
                      // Nút Tải lên nổi bật ở giữa
                      <motion.div
                        whileTap={{ scale: 0.9 }}
                        className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-900/40"
                      >
                        <Icon size={22} className="text-white" />
                      </motion.div>
                    ) : (
                      <>
                        <Icon size={20} />
                        <span className="text-[10px] font-medium">{label}</span>
                      </>
                    )
                  }
                </NavLink>
              )
            })}
          </div>
        </div>
      </nav>

      {/* BOTTOM SHEET MENU (Chỉ hiện khi đã đăng nhập và click tab "Tôi") */}
      <AnimatePresence>
        {isMenuOpen && user && (
          <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end">
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />

            {/* Bottom Sheet Panel */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 240 }}
              className="relative bg-surface-50 border-t rounded-t-[28px] p-5 w-full max-h-[85vh] overflow-y-auto shadow-2xl flex flex-col gap-5 z-10"
            >
              {/* Drag Handle & Close Button */}
              <div className="flex items-center justify-between">
                <div className="w-12 h-1 bg-foreground/15 rounded-full mx-auto absolute left-1/2 transform -translate-x-1/2 top-3" />
                <span className="text-sm font-bold text-foreground/80 mt-1">
                  {language === 'vi' ? 'Cài đặt tài khoản' : 'Account Settings'}
                </span>
                <button 
                  onClick={() => setIsMenuOpen(false)}
                  className="p-1 rounded-full bg-foreground/5 text-foreground/75 hover:bg-foreground/10 focus:outline-none"
                >
                  <X size={18} />
                </button>
              </div>

              {/* User profile card */}
              <div className="p-3.5 flex items-center gap-3 bg-surface-100 rounded-2xl border">
                <div className="w-12 h-12 rounded-full overflow-hidden border border-brand-500/20 flex-shrink-0">
                  {user.avatar && !avatarError ? (
                    <img 
                      src={user.avatar} 
                      alt={user.username} 
                      className="w-full h-full object-cover" 
                      onError={() => setAvatarError(true)}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-brand flex items-center justify-center text-white text-base font-black">
                      {user.username?.[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-bold truncate text-foreground">{user.username}</p>
                    {user.subscriptionTier && user.subscriptionTier !== 'free' && (
                      <span className={`text-[8px] font-black tracking-wider px-1.5 py-0.5 rounded-full uppercase ${
                        user.subscriptionTier === 'founder' ? 'bg-amber-500/15 text-amber-500 border border-amber-500/20' :
                        user.subscriptionTier === 'ultimate' ? 'bg-cyan-500/15 text-cyan-500 border border-cyan-500/20' :
                        'bg-brand-500/15 text-brand-500 border border-brand-500/20'
                      }`}>
                        {user.subscriptionTier}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-foreground/50 truncate mt-0.5">{user.email}</p>
                </div>
              </div>

              {/* Coins Balance */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-surface-100 border">
                <div className="flex items-center gap-2 text-foreground/80 font-bold text-xs">
                  <Coins size={16} className="text-yellow-500" />
                  <span>{t.dropdown.tokens}</span>
                </div>
                <span className="text-sm font-black text-foreground">
                  {(user.tokenBalance || 0).toLocaleString()}
                </span>
              </div>

              {/* Navigation Items (Touch Target >= 44px) */}
              <div className="flex flex-col gap-1">
                <Link
                  to={`/profile/${user.username}`}
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-foreground/5 text-foreground font-semibold text-sm transition-colors border"
                  style={{ minHeight: '44px' }}
                >
                  <div className="flex items-center gap-3">
                    <User size={16} className="text-brand-500" />
                    <span>{t.dropdown.profile}</span>
                  </div>
                  <ChevronRight size={16} className="text-foreground/30" />
                </Link>

                <Link
                  to="/my-posts"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-foreground/5 text-foreground font-semibold text-sm transition-colors border"
                  style={{ minHeight: '44px' }}
                >
                  <div className="flex items-center gap-3">
                    <LayoutGrid size={16} className="text-brand-500" />
                    <span>{t.dropdown.myPosts}</span>
                  </div>
                  <ChevronRight size={16} className="text-foreground/30" />
                </Link>
              </div>

              {/* Settings Group */}
              <div className="flex flex-col gap-4 border p-4 rounded-2xl">
                {/* Language Switcher */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-foreground/60">
                    <Globe size={14} className="text-brand-500" />
                    <span className="text-[10px] font-black uppercase tracking-wider">{t.dropdown.language}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 bg-surface-100 p-0.5 rounded-xl border">
                    <button
                      onClick={() => changeLanguage('vi')}
                      className={`text-xs py-2 rounded-lg font-bold transition-all ${
                        language === 'vi'
                          ? 'bg-brand-600 text-white shadow-sm'
                          : 'text-foreground hover:bg-[var(--color-border)]'
                      }`}
                      style={{ minHeight: '36px' }}
                    >
                      Tiếng Việt (VI)
                    </button>
                    <button
                      onClick={() => changeLanguage('en')}
                      className={`text-xs py-2 rounded-lg font-bold transition-all ${
                        language === 'en'
                          ? 'bg-brand-600 text-white shadow-sm'
                          : 'text-foreground hover:bg-[var(--color-border)]'
                      }`}
                      style={{ minHeight: '36px' }}
                    >
                      English (EN)
                    </button>
                  </div>
                </div>

                {/* Theme Switcher */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-foreground/60">
                    <Sun size={14} className="text-brand-500 block dark:hidden" />
                    <Moon size={14} className="text-brand-500 hidden dark:block" />
                    <span className="text-[10px] font-black uppercase tracking-wider">{t.dropdown.theme}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-0.5 bg-surface-100 p-0.5 rounded-xl border">
                    <button
                      onClick={() => changeTheme('light')}
                      className={`text-[10px] py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
                        theme === 'light'
                          ? 'bg-brand-600 text-white shadow-sm'
                          : 'text-foreground hover:bg-[var(--color-border)]'
                      }`}
                      style={{ minHeight: '36px' }}
                    >
                      <Sun size={12} />
                      <span>{t.dropdown.themeLight}</span>
                    </button>
                    <button
                      onClick={() => changeTheme('dark')}
                      className={`text-[10px] py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
                        theme === 'dark'
                          ? 'bg-brand-600 text-white shadow-sm'
                          : 'text-foreground hover:bg-[var(--color-border)]'
                      }`}
                      style={{ minHeight: '36px' }}
                    >
                      <Moon size={12} />
                      <span>{t.dropdown.themeDark}</span>
                    </button>
                    <button
                      onClick={() => changeTheme('system')}
                      className={`text-[10px] py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
                        theme === 'system'
                          ? 'bg-brand-600 text-white shadow-sm'
                          : 'text-foreground hover:bg-[var(--color-border)]'
                      }`}
                      style={{ minHeight: '36px' }}
                    >
                      <Monitor size={12} />
                      <span>{t.dropdown.themeSystem}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Logout button (Touch target 44px) */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-2xl text-red-500 bg-red-500/10 hover:bg-red-500/15 font-bold text-sm transition-colors border border-red-500/20"
                style={{ minHeight: '44px' }}
              >
                <LogOut size={16} />
                <span>{t.dropdown.logout}</span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}

export default BottomNav
