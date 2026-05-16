import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LogOut, Upload, Bell, Coins, Eye, LayoutGrid } from 'lucide-react'
import useAuthStore from '../../store/auth.store'
import toast from 'react-hot-toast'

/**
 * Header chỉ hiển thị trên desktop (md+)
 * Mobile dùng BottomNav
 */
const Header = () => {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    toast.success('Đã đăng xuất')
    navigate('/login')
  }

  return (
    <header className="hidden md:block sticky top-0 z-50 bg-surface/80 backdrop-blur-xl border-b border-white/5">
      <div className="page-container">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-brand flex items-center justify-center shadow-lg shadow-brand-900/50">
              <Eye size={16} className="text-white" />
            </div>
            <span className="font-display font-bold text-lg gradient-text tracking-wide">PICSPY</span>
          </Link>

          {/* Nav */}
          <nav className="flex items-center gap-1">
            <Link to="/" className="btn-ghost text-white/70">Khám phá</Link>
            <Link to="/search" className="btn-ghost text-white/70">Tìm kiếm</Link>
            <Link to="/pricing" className="btn-ghost text-white/70">Gói đăng ký</Link>
            {user && (
              <Link to="/my-posts" className="btn-ghost text-white/70 flex items-center gap-1.5">
                <LayoutGrid size={15} />
                Ảnh của tôi
              </Link>
            )}
          </nav>

          {/* Actions */}
          {user ? (
            <div className="flex items-center gap-3">
              {/* Token balance + tier badge */}
              <Link to="/pricing" className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-100 border border-white/10 hover:border-white/20 transition-colors">
                <Coins size={16} className="text-yellow-400" />
                <span className="text-sm font-semibold">{(user.tokenBalance || 0).toLocaleString()}</span>
                {user.subscriptionTier && user.subscriptionTier !== 'free' && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-1 ${
                    user.subscriptionTier === 'founder' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                    user.subscriptionTier === 'ultimate' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' :
                    'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                  }`}>
                    {user.subscriptionTier === 'founder' ? '🎖️' : user.subscriptionTier === 'ultimate' ? '💎' : '⭐'}
                    {user.subscriptionTier.toUpperCase()}
                  </span>
                )}
              </Link>

              <Link to="/upload" className="btn-primary">
                <Upload size={16} />
                Upload
              </Link>

              <Link to="/notifications" className="relative btn-ghost">
                <Bell size={20} />
              </Link>

              <Link to={`/profile/${user.username}`}>
                <motion.div whileHover={{ scale: 1.05 }} className="w-9 h-9 rounded-full overflow-hidden border-2 border-brand-600">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-brand flex items-center justify-center">
                      <span className="text-white font-bold text-sm">{user.username?.[0]?.toUpperCase()}</span>
                    </div>
                  )}
                </motion.div>
              </Link>

              <button onClick={handleLogout} className="btn-ghost text-white/50 hover:text-red-400">
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="btn-ghost">Đăng nhập</Link>
              <Link to="/register" className="btn-primary">Đăng ký</Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header
