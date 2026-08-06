import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LogOut,
  Upload,
  Bell,
  Coins,
  Eye,
  LayoutGrid,
  User,
  Sun,
  Moon,
  Monitor,
  Globe,
  ChevronDown,
  Film,
  Wallet,
  Shield,
  Sparkles,
} from 'lucide-react'
import useAuthStore from '../../store/auth.store'
import useNotificationStore from '../../store/notification.store'
import { useSettings } from '../../context/SettingsContext'
import toast from 'react-hot-toast'
import { BrandLogo } from '../ui/ContentLoader'

/**
 * Header chỉ hiển thị trên desktop (md+)
 * Mobile dùng BottomNav
 */
const Header = () => {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const { theme, language, changeTheme, changeLanguage, t } = useSettings()

  const unreadCount = useNotificationStore((s) => s.unreadCount)
  const setOpen = useNotificationStore((s) => s.setOpen)
  const isOpen = useNotificationStore((s) => s.isOpen)

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
    toast.success(
      language === 'vi' ? 'Đã đăng xuất thành công' : 'Logged out successfully'
    )
    setIsDropdownOpen(false)
    navigate('/login')
  }

  return (
    <header
      className={`hidden md:block sticky top-0 z-50 h-14 transition-colors duration-300 ${
        isScrolled ? 'shadow-lg shadow-black/5' : ''
      }`}
    >
      {/* Lớp nền Liquid Glass riêng biệt - Không làm ảnh hưởng tới tọa độ absolute bên trong */}
      <div
        className={`absolute inset-0 -z-10 border-b backdrop-blur-md transition-all duration-500 ${
          isScrolled
            ? 'bg-surface-50/70 border-[var(--color-glass-border)]'
            : 'bg-transparent border-transparent'
        }`}
      />

      <div className="max-w-[1692px] mx-auto px-8 h-full flex items-center relative">
        {/* Left: Logo */}
        <div className="flex-1 flex items-center select-none">
          <Link to="/" className="flex items-center group">
            <BrandLogo size="sm" />
          </Link>
        </div>

        {/* Center: Navigation links */}
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
            <Link
              to="/my-posts"
              className="nav-link inline-flex items-center gap-1.5"
            >
              <LayoutGrid size={14} />
              {t.nav.myPosts}
            </Link>
          )}
        </nav>

        {/* Right: Actions */}
        <div className="flex-1 flex items-center justify-end">
          {user ? (
            <div className="flex items-center gap-3">
              {/* Balances: Wallet (VNĐ) & Tokens */}
              <div className="group/balance-pill flex items-center h-8 rounded-full bg-black/40 hover:bg-black/60 border border-white/10 hover:border-white/15 px-1 select-none shadow-sm flex-shrink-0 transition-all duration-300">
                {/* Wallet Balance (VNĐ) */}
                <Link
                  to="/wallet"
                  className="flex items-center gap-1.5 px-2.5 h-full hover:text-emerald-300 transition-colors group/wallet relative"
                  title="Ví cá nhân — Nạp & Rút tiền"
                >
                  <Wallet
                    size={13.5}
                    className="text-emerald-400 flex-shrink-0 transition-transform group-hover/wallet:scale-110 duration-300"
                  />
                  <span className="text-xs font-semibold text-emerald-400 tabular-nums">
                    {(user.vndBalance || 0).toLocaleString('vi-VN')}đ
                  </span>
                </Link>

                {/* Center elegant short divider */}
                <div className="w-[1px] h-3 bg-white/15" />

                {/* Tokens Link */}
                <Link
                  to="/pricing"
                  className="flex items-center gap-1.5 px-2.5 h-full hover:text-brand-300 transition-colors group/token relative overflow-hidden"
                  title="Mua thêm AI Credits"
                >
                  <Coins
                    size={13.5}
                    className="text-yellow-500 flex-shrink-0 group-hover/token:scale-110 transition-transform duration-300"
                  />
                  <span className="text-xs font-semibold text-white/95 tabular-nums">
                    {(user.tokenBalance || 0).toLocaleString()}
                  </span>

                  {user.subscriptionTier && (
                    <span
                      className={`h-[18px] px-2.5 rounded-[4px] flex items-center justify-center text-[8px] uppercase transition-all duration-500 select-none ${
                        user.subscriptionTier === 'free'
                          ? 'bg-white/[0.03] text-[#fafafa] border border-white/10 text-[7px] font-serif font-bold'
                          : user.subscriptionTier === 'founder' ||
                              user.subscriptionTier === 'pro'
                            ? 'bg-[linear-gradient(110deg,#94a3b8,35%,#ffffff,50%,#cbd5e1,65%,#94a3b8)] bg-[length:200%_100%] animate-shimmer text-stone-950 font-serif font-bold shadow-[0_0_12px_rgba(255,255,255,0.3)] border border-white/20'
                            : user.subscriptionTier === 'ultimate'
                              ? 'bg-[linear-gradient(110deg,#bf953f,35%,#fcf6ba,50%,#aa771c,65%,#bf953f)] bg-[length:200%_100%] animate-shimmer text-stone-950 font-serif font-bold shadow-[0_0_14px_rgba(191,149,63,0.4)] border border-amber-500/35'
                              : 'bg-[linear-gradient(110deg,#a855f7,35%,#f3e8ff,50%,#7c3aed,65%,#a855f7)] bg-[length:200%_100%] animate-shimmer text-purple-950 font-serif font-bold shadow-[0_0_12px_rgba(168,85,247,0.3)]'
                      }`}
                      style={{ letterSpacing: '0.12em' }}
                    >
                      <span
                        style={{ marginRight: '-0.12em' }}
                        className="flex items-center gap-1.2"
                      >
                        {user.subscriptionTier === 'ultimate' && (
                          <span className="text-[9px] leading-none">✦</span>
                        )}
                        {(user.subscriptionTier === 'founder' ||
                          user.subscriptionTier === 'pro') && (
                          <span className="text-[8px] leading-none">★</span>
                        )}
                        <span>
                          {user.subscriptionTier === 'founder'
                            ? 'Founder'
                            : user.subscriptionTier}
                        </span>
                        {user.subscriptionTier === 'ultimate' && (
                          <span className="text-[9px] leading-none">✦</span>
                        )}
                      </span>
                    </span>
                  )}
                </Link>
              </div>

              {/* Upload Button */}
              <Link
                to="/upload"
                className="nav-link-primary h-8 !py-0 inline-flex items-center justify-center gap-1.5 flex-shrink-0"
              >
                <Upload size={14} />
                <span>{t.nav.upload}</span>
              </Link>

              {/* Notifications Bell */}
              <button
                onClick={() => setOpen(!isOpen)}
                title="Thông báo"
                className="notification-bell-trigger w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--color-border)] transition-colors text-[var(--color-text-muted)] hover:text-foreground flex-shrink-0 relative cursor-pointer"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-black rounded-full px-1 py-0.5 min-w-[15px] h-[15px] flex items-center justify-center border border-[#0c0c0e]">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Avatar Dropdown Container */}
              <div className="relative inline-block" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-1.5 p-0.5 h-8 rounded-full hover:bg-[var(--color-border)] transition-colors focus:outline-none"
                >
                  <div className="w-7 h-7 rounded-full overflow-hidden border-2 border-brand-500 shadow-sm flex-shrink-0">
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
                  <ChevronDown
                    size={14}
                    className="text-[var(--color-text-muted)] hover:text-foreground transition-transform duration-200 flex-shrink-0"
                    style={{
                      transform: isDropdownOpen ? 'rotate(180deg)' : 'none',
                    }}
                  />
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
                          <p className="text-xs font-semibold truncate text-foreground">
                            {user.username}
                          </p>
                          <p className="text-[10px] text-[var(--color-text-muted)] truncate">
                            {user.email}
                          </p>
                        </div>
                      </div>

                      {/* Navigation Items */}
                      <Link
                        to={`/profile/${user.username}`}
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-foreground hover:bg-[var(--color-border)] transition-colors"
                      >
                        <User
                          size={14}
                          className="text-[var(--color-text-muted)]"
                        />
                        <span>{t.dropdown.profile}</span>
                      </Link>

                      <Link
                        to="/my-posts"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-foreground hover:bg-[var(--color-border)] transition-colors"
                      >
                        <LayoutGrid
                          size={14}
                          className="text-[var(--color-text-muted)]"
                        />
                        <span>{t.dropdown.myPosts}</span>
                      </Link>

                      <Link
                        to="/wallet"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-foreground hover:bg-[var(--color-border)] transition-colors"
                      >
                        <Wallet size={14} className="text-emerald-400" />
                        <span>Ví cá nhân (Nạp/Rút)</span>
                      </Link>

                      <Link
                        to="/studio"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-foreground hover:bg-[var(--color-border)] transition-colors"
                      >
                        <Film size={14} className="text-brand-400" />
                        <span>Creator Studio</span>
                        <span className="ml-auto text-[9px] font-bold text-brand-400 bg-brand-500/10 border border-brand-500/20 px-1.5 py-0.5 rounded-md">
                          NEW
                        </span>
                      </Link>

                      {user.role === 'admin' && (
                        <Link
                          to="/admin"
                          onClick={() => setIsDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-violet-400 hover:bg-violet-500/10 transition-colors"
                        >
                          <Shield size={14} className="text-violet-400" />
                          <span>Admin Panel</span>
                        </Link>
                      )}

                      {/* Divider */}
                      <hr className="my-1 border-[var(--color-border)]" />

                      {/* Language Settings */}
                      <div className="px-3 py-2 flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
                          <Globe size={13} />
                          <span className="text-[10px] font-black uppercase tracking-wider">
                            {t.dropdown.language}
                          </span>
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
                          <span className="text-[10px] font-black uppercase tracking-wider">
                            {t.dropdown.theme}
                          </span>
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
