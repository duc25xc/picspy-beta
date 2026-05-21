import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  LogOut, Upload, Bell, Coins, Eye, LayoutGrid, 
  User, Sun, Moon, Monitor, Globe, ChevronDown 
} from 'lucide-react'
import useAuthStore from '../../store/auth.store'
import { useSettings } from '../../context/SettingsContext'
import toast from 'react-hot-toast'

/**
 * Header chỉ hiển thị trên desktop (md+)
 * Mobile dùng BottomNav
 */
const Header = () => {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const { theme, language, changeTheme, changeLanguage, t } = useSettings()

  const [isScrolled, setIsScrolled] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [avatarError, setAvatarError] = useState(false)
  const dropdownRef = useRef(null)

  // Reset avatarError khi user thay đổi
  useEffect(() => {
    setAvatarError(false)
  }, [user])

  // Phát hiện cuộn trang để kích hoạt hiệu ứng liquid glass
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true)
      } else {
        setIsScrolled(false)
      }
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    await logout()
    toast.success(language === 'vi' ? 'Đã đăng xuất thành công' : 'Logged out successfully')
    setIsDropdownOpen(false)
    navigate('/login')
  }

  return (
    <header 
      className={`hidden md:block sticky top-0 z-50 h-14 transition-all duration-300 ${
        isScrolled 
          ? 'liquid-glass navbar-liquid-glass' 
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="max-w-[1692px] mx-auto px-8 h-full flex items-center">
        {/* Left: Logo — flex-1 để chiếm đều với bên phải */}
        <div className="flex-1 flex items-center">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-brand flex items-center justify-center shadow-lg shadow-brand-900/40 group-hover:scale-105 transition-transform">
              <Eye size={16} className="text-white" />
            </div>
            <span className="font-display font-bold text-lg tracking-wide bg-gradient-to-r from-brand-500 to-indigo-500 bg-clip-text text-transparent">
              PICSPY
            </span>
          </Link>
        </div>

        {/* Center: Navigation links — luôn căn giữa tuyệt đối */}
        <nav className="flex items-center gap-1">
          <Link to="/" className="nav-link">
            {t.nav.explore}
          </Link>
          <Link to="/search" className="nav-link">
            {t.nav.search}
          </Link>
          <Link to="/pricing" className="nav-link">
            {t.nav.pricing}
          </Link>
          {user && (
            <Link to="/my-posts" className="nav-link inline-flex items-center gap-1.5">
              <LayoutGrid size={14} />
              {t.nav.myPosts}
            </Link>
          )}
        </nav>

        {/* Right: Actions — flex-1 justify-end để cân bằng với bên trái */}
        <div className="flex-1 flex items-center justify-end">
          {user ? (
            <div className="flex items-center gap-3">
              {/* Token balance + tier badge */}
              <Link 
                to="/pricing" 
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-50 border hover:bg-[var(--color-border)] transition-all text-foreground hover:scale-102"
              >
                <Coins size={15} className="text-yellow-500" />
                <span className="text-xs font-bold font-sans">
                  {(user.tokenBalance || 0).toLocaleString()}
                </span>
                {user.subscriptionTier && user.subscriptionTier !== 'free' && (
                  <span className={`text-[9px] font-black tracking-wider px-2 py-0.5 rounded-full uppercase flex items-center gap-0.5 ${
                    user.subscriptionTier === 'founder' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                    user.subscriptionTier === 'ultimate' ? 'bg-cyan-500/10 text-cyan-500 border border-cyan-500/20' :
                    'bg-brand-500/10 text-brand-500 border border-brand-500/20'
                  }`}>
                    {user.subscriptionTier === 'founder' ? '🎖️' : user.subscriptionTier === 'ultimate' ? '💎' : '⭐'}
                    {user.subscriptionTier}
                  </span>
                )}
              </Link>

              {/* Upload Button */}
              <Link to="/upload" className="nav-link-primary inline-flex items-center gap-1.5">
                <Upload size={14} />
                <span>{t.nav.upload}</span>
              </Link>

              {/* Notifications */}
              <Link to="/notifications" className="relative p-2 rounded-full hover:bg-[var(--color-border)] transition-colors text-[var(--color-text-muted)] hover:text-foreground">
                <Bell size={18} />
              </Link>

              {/* Avatar Dropdown Container */}
              <div className="relative" ref={dropdownRef}>
                <button 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-1.5 p-0.5 rounded-full hover:bg-[var(--color-border)] transition-colors focus:outline-none"
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-brand-500 shadow-sm">
                    {user.avatar && !avatarError ? (
                      <img 
                        src={user.avatar} 
                        alt={user.username} 
                        className="w-full h-full object-cover" 
                        onError={() => setAvatarError(true)}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-brand flex items-center justify-center text-white text-xs font-black">
                        {user.username?.[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>
                  <ChevronDown size={14} className="text-[var(--color-text-muted)] hover:text-foreground transition-transform duration-200" style={{ transform: isDropdownOpen ? 'rotate(180deg)' : 'none' }} />
                </button>

                {/* Dropdown Menu */}
                <AnimatePresence>
                  {isDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                      className="absolute right-0 mt-2.5 w-64 bg-surface-50 border rounded-2xl shadow-xl z-50 overflow-hidden p-2 flex flex-col gap-1"
                    >
                      {/* User Profile Summary */}
                      <div className="p-3 flex items-center gap-3 bg-surface-100 rounded-xl mb-1">
                        <div className="w-10 h-10 rounded-full overflow-hidden border border-brand-500/20 flex-shrink-0">
                          {user.avatar && !avatarError ? (
                            <img 
                              src={user.avatar} 
                              alt={user.username} 
                              className="w-full h-full object-cover" 
                              onError={() => setAvatarError(true)}
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-brand flex items-center justify-center text-white text-sm font-black">
                              {user.username?.[0]?.toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold truncate text-foreground">{user.username}</p>
                          <p className="text-[10px] text-[var(--color-text-muted)] truncate">{user.email}</p>
                        </div>
                      </div>

                      {/* Navigation Items */}
                      <Link 
                        to={`/profile/${user.username}`}
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-foreground hover:bg-[var(--color-border)] transition-colors"
                      >
                        <User size={14} className="text-[var(--color-text-muted)]" />
                        <span>{t.dropdown.profile}</span>
                      </Link>

                      <Link 
                        to="/my-posts"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-foreground hover:bg-[var(--color-border)] transition-colors"
                      >
                        <LayoutGrid size={14} className="text-[var(--color-text-muted)]" />
                        <span>{t.dropdown.myPosts}</span>
                      </Link>

                      {/* Divider */}
                      <hr className="my-1 border-[var(--color-border)]" />

                      {/* Language Settings */}
                      <div className="px-3 py-2 flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
                          <Globe size={13} />
                          <span className="text-[10px] font-black uppercase tracking-wider">{t.dropdown.language}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1 bg-surface-100 p-0.5 rounded-lg border">
                          <button 
                            onClick={() => changeLanguage('vi')}
                            className={`text-xs py-1 rounded-md font-medium transition-all ${
                              language === 'vi' 
                                ? 'bg-brand-600 text-white shadow-sm' 
                                : 'text-foreground hover:bg-[var(--color-border)]'
                            }`}
                          >
                            VI
                          </button>
                          <button 
                            onClick={() => changeLanguage('en')}
                            className={`text-xs py-1 rounded-md font-medium transition-all ${
                              language === 'en' 
                                ? 'bg-brand-600 text-white shadow-sm' 
                                : 'text-foreground hover:bg-[var(--color-border)]'
                            }`}
                          >
                            EN
                          </button>
                        </div>
                      </div>

                      {/* Theme Settings */}
                      <div className="px-3 py-2 flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
                          <Sun size={13} className="block dark:hidden" />
                          <Moon size={13} className="hidden dark:block" />
                          <span className="text-[10px] font-black uppercase tracking-wider">{t.dropdown.theme}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-0.5 bg-surface-100 p-0.5 rounded-lg border">
                          <button 
                            onClick={() => changeTheme('light')}
                            className={`text-[9px] sm:text-xs py-1 rounded-md font-medium transition-all flex items-center justify-center gap-1 ${
                              theme === 'light' 
                                ? 'bg-brand-600 text-white shadow-sm' 
                                : 'text-foreground hover:bg-[var(--color-border)]'
                            }`}
                            title={t.dropdown.themeLight}
                          >
                            <Sun size={10} />
                            <span>{t.dropdown.themeLight}</span>
                          </button>
                          <button 
                            onClick={() => changeTheme('dark')}
                            className={`text-[9px] sm:text-xs py-1 rounded-md font-medium transition-all flex items-center justify-center gap-1 ${
                              theme === 'dark' 
                                ? 'bg-brand-600 text-white shadow-sm' 
                                : 'text-foreground hover:bg-[var(--color-border)]'
                            }`}
                            title={t.dropdown.themeDark}
                          >
                            <Moon size={10} />
                            <span>{t.dropdown.themeDark}</span>
                          </button>
                          <button 
                            onClick={() => changeTheme('system')}
                            className={`text-[9px] sm:text-xs py-1 rounded-md font-medium transition-all flex items-center justify-center gap-1 ${
                              theme === 'system' 
                                ? 'bg-brand-600 text-white shadow-sm' 
                                : 'text-foreground hover:bg-[var(--color-border)]'
                            }`}
                            title={t.dropdown.themeSystem}
                          >
                            <Monitor size={10} />
                            <span>{t.dropdown.themeSystem}</span>
                          </button>
                        </div>
                      </div>

                      {/* Divider */}
                      <hr className="my-1 border-[var(--color-border)]" />

                      {/* Logout Button */}
                      <button 
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-red-500 hover:bg-red-500/10 transition-colors text-left"
                      >
                        <LogOut size={14} />
                        <span>{t.dropdown.logout}</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          ) : (
            /* Guest Users */
            <div className="flex items-center gap-2">
              <Link to="/login" className="nav-link">
                {t.nav.login}
              </Link>
              <Link to="/register" className="nav-link-primary">
                {t.nav.register}
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header
