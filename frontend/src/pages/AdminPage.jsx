import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  Images,
  Users,
  CheckCircle,
  XCircle,
  EyeOff,
  Clock,
  Coins,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  ChevronDown,
  Search,
  BarChart3,
  AlertTriangle,
  Plus,
  Minus,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/api'
import useAuthStore from '../store/auth.store'
import { Navigate } from 'react-router-dom'

// ─── Guard: chỉ admin mới vào được ────────────────────────
const AdminGuard = ({ children }) => {
  const user = useAuthStore((s) => s.user)
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'admin') return <Navigate to="/" replace />
  return children
}

// ─── Stat Card ──────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, color = 'text-white', sub }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    className="card p-5"
  >
    <div className="flex items-center justify-between mb-3">
      <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">{label}</span>
      <Icon size={18} className={color} />
    </div>
    <p className={`text-3xl font-black ${color}`}>{value?.toLocaleString() ?? '—'}</p>
    {sub && <p className="text-xs text-white/30 mt-1">{sub}</p>}
  </motion.div>
)

// ─── Status Badge ───────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const map = {
    approved: { label: 'Đã duyệt', cls: 'bg-green-500/15 text-green-400 border-green-500/30', Icon: CheckCircle },
    pending:  { label: 'Chờ duyệt', cls: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30', Icon: Clock },
    rejected: { label: 'Từ chối', cls: 'bg-red-500/15 text-red-400 border-red-500/30', Icon: XCircle },
    hidden:   { label: 'Đã ẩn', cls: 'bg-white/5 text-white/40 border-white/10', Icon: EyeOff },
  }
  const { label, cls, Icon } = map[status] || map.pending
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${cls}`}>
      <Icon size={11} />{label}
    </span>
  )
}

// ─── Dashboard Tab ──────────────────────────────────────────
const DashboardTab = () => {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const adminUser = useAuthStore((s) => s.user)

  useEffect(() => {
    api.get('/admin/dashboard').then(({ data }) => {
      setStats(data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      {/* Admin coin balance */}
      <div className="card p-5 border-violet-500/30 bg-violet-600/10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-violet-400 mb-1">Số dư xu của Admin</p>
            <p className="text-4xl font-black text-white">{adminUser?.coinBalance?.toLocaleString() ?? 0} <span className="text-violet-400 text-2xl">xu</span></p>
            <p className="text-xs text-white/40 mt-1">Dùng để test download Premium</p>
          </div>
          <div className="w-16 h-16 rounded-2xl bg-violet-600/20 flex items-center justify-center">
            <Coins size={32} className="text-violet-400" />
          </div>
        </div>
      </div>

      {/* Stats grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card p-5 animate-pulse h-24" />
          ))}
        </div>
      ) : stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard icon={Images} label="Tổng bài đăng" value={stats.totalPosts} color="text-white" />
          <StatCard icon={Clock} label="Chờ duyệt" value={stats.pendingPosts} color="text-yellow-400" sub="Cần xử lý ngay" />
          <StatCard icon={CheckCircle} label="Đã duyệt" value={stats.totalApproved} color="text-green-400" />
          <StatCard icon={Users} label="Tổng users" value={stats.totalUsers} color="text-blue-400" />
          <StatCard icon={Images} label="Post 7 ngày" value={stats.recentPosts} color="text-violet-400" sub="7 ngày gần nhất" />
          <StatCard icon={Users} label="User mới" value={stats.recentUsers} color="text-pink-400" sub="7 ngày gần nhất" />
        </div>
      )}

      {/* Quick link */}
      <div className="card p-4 border-yellow-500/20 bg-yellow-500/5">
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} className="text-yellow-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-yellow-400">Bài đăng chờ duyệt</p>
            <p className="text-xs text-white/40 mt-0.5">
              Có <span className="text-yellow-400 font-bold">{stats?.pendingPosts || 0}</span> bài đăng đang chờ bạn phê duyệt. Vào tab "Bài đăng" để xử lý.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Posts Management Tab ───────────────────────────────────
const PostsTab = () => {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({})
  const [activeStatus, setActiveStatus] = useState('pending')
  const [hasMore, setHasMore] = useState(false)
  const [cursor, setCursor] = useState(null)
  const [actionLoading, setActionLoading] = useState(null)
  const [rejectModal, setRejectModal] = useState(null)
  const [rejectReason, setRejectReason] = useState('')

  const STATUS_TABS = [
    { key: 'pending', label: 'Chờ duyệt', color: 'text-yellow-400' },
    { key: 'approved', label: 'Đã duyệt', color: 'text-green-400' },
    { key: 'rejected', label: 'Từ chối', color: 'text-red-400' },
    { key: 'hidden', label: 'Đã ẩn', color: 'text-white/40' },
    { key: 'all', label: 'Tất cả', color: 'text-white' },
  ]

  const fetchPosts = useCallback(async (reset = false) => {
    if (reset) { setLoading(true); setCursor(null) }
    try {
      const params = { status: activeStatus, limit: 12 }
      if (!reset && cursor) params.cursor = cursor
      const { data } = await api.get('/admin/posts', { params })
      setPosts(reset ? data.posts : (p) => [...p, ...data.posts])
      setStats(data.stats || {})
      setHasMore(data.pagination.hasMore)
      setCursor(data.pagination.nextCursor)
    } catch { toast.error('Không thể tải bài đăng') }
    finally { setLoading(false) }
  }, [activeStatus, cursor])

  useEffect(() => { fetchPosts(true) }, [activeStatus]) // eslint-disable-line

  const handleStatus = async (postId, status, reason = '') => {
    setActionLoading(postId)
    try {
      await api.patch(`/admin/posts/${postId}/status`, { status, rejectionReason: reason })
      setPosts((prev) => prev.filter((p) => p._id !== postId))
      toast.success(`Đã ${status === 'approved' ? '✅ duyệt' : status === 'rejected' ? '❌ từ chối' : '🚫 ẩn'} bài đăng`)
      setRejectModal(null)
      setRejectReason('')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi xử lý')
    } finally { setActionLoading(null) }
  }

  return (
    <div className="space-y-4">
      {/* Status tabs */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_TABS.map(({ key, label, color }) => (
          <button
            key={key}
            onClick={() => setActiveStatus(key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border flex items-center gap-2
              ${activeStatus === key
                ? 'bg-brand-600 border-brand-500 text-white'
                : 'bg-surface-50 border-white/10 text-white/60 hover:border-white/20'}`}
          >
            <span className={color}>{label}</span>
            {stats[key] > 0 && (
              <span className="bg-white/15 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">
                {stats[key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Posts grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-surface-100 animate-pulse aspect-square" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20">
          <CheckCircle size={40} className="text-white/10 mx-auto mb-3" />
          <p className="text-white/40">Không có bài đăng nào</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {posts.map((post) => {
              const img = post.images?.[0]
              const isActing = actionLoading === post._id
              return (
                <motion.div
                  key={post._id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="card overflow-hidden"
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-video bg-surface-100">
                    {(img?.thumbnailUrl || img?.url) && (
                      <img
                        src={img.thumbnailUrl || img.url}
                        alt={post.caption || 'Post'}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    )}
                    <div className="absolute top-2 right-2">
                      <StatusBadge status={post.status} />
                    </div>
                    {post.isNSFW && (
                      <div className="absolute top-2 left-2">
                        <span className="bg-red-600/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">NSFW</span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4 space-y-3">
                    {/* Author */}
                    <div className="flex items-center gap-2">
                      {post.authorId?.avatar ? (
                        <img src={post.authorId.avatar} className="w-7 h-7 rounded-full object-cover" alt="" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-600 to-blue-500 flex items-center justify-center text-white text-xs font-bold">
                          {post.authorId?.username?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                      <span className="text-sm font-semibold text-white/80">
                        @{post.authorId?.username || 'unknown'}
                      </span>
                    </div>

                    {post.caption && (
                      <p className="text-xs text-white/50 line-clamp-2">{post.caption}</p>
                    )}

                    {post.rejectionReason && (
                      <p className="text-xs text-red-400/70 italic">⚠ {post.rejectionReason}</p>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-2 pt-1">
                      {post.status !== 'approved' && (
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleStatus(post._id, 'approved')}
                          disabled={isActing}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl
                            bg-green-600/20 border border-green-500/30 text-green-400
                            hover:bg-green-600/30 transition-all text-xs font-semibold disabled:opacity-50"
                        >
                          <CheckCircle size={13} />
                          Duyệt
                        </motion.button>
                      )}
                      {post.status !== 'rejected' && (
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setRejectModal(post)}
                          disabled={isActing}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl
                            bg-red-600/20 border border-red-500/30 text-red-400
                            hover:bg-red-600/30 transition-all text-xs font-semibold disabled:opacity-50"
                        >
                          <XCircle size={13} />
                          Từ chối
                        </motion.button>
                      )}
                      {post.status !== 'hidden' && (
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleStatus(post._id, 'hidden')}
                          disabled={isActing}
                          className="flex items-center justify-center gap-1 py-2 px-3 rounded-xl
                            bg-white/5 border border-white/10 text-white/40
                            hover:text-white/60 transition-all text-xs disabled:opacity-50"
                        >
                          <EyeOff size={13} />
                        </motion.button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center">
          <button onClick={() => fetchPosts(false)} className="btn-secondary flex items-center gap-2 text-sm">
            <ChevronDown size={16} />
            Tải thêm
          </button>
        </div>
      )}

      {/* Reject reason modal */}
      <AnimatePresence>
        {rejectModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && setRejectModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="card p-6 max-w-sm w-full"
            >
              <h3 className="font-bold text-lg mb-1">Từ chối bài đăng</h3>
              <p className="text-sm text-white/40 mb-4">Nhập lý do từ chối (tùy chọn)</p>
              <textarea
                className="input resize-none mb-4"
                rows={3}
                placeholder="Ảnh vi phạm quy định, nội dung không phù hợp..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
              <div className="flex gap-3">
                <button onClick={() => { setRejectModal(null); setRejectReason('') }} className="btn-secondary flex-1">
                  Hủy
                </button>
                <button
                  onClick={() => handleStatus(rejectModal._id, 'rejected', rejectReason)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-colors"
                >
                  Xác nhận từ chối
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Users Tab ──────────────────────────────────────────────
const UsersTab = () => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [hasMore, setHasMore] = useState(false)
  const [cursor, setCursor] = useState(null)
  const [coinModal, setCoinModal] = useState(null)
  const [coinAmount, setCoinAmount] = useState('')
  const [coinLoading, setCoinLoading] = useState(false)
  const currentAdminId = useAuthStore((s) => s.user?._id)

  const fetchUsers = useCallback(async (reset = false) => {
    if (reset) { setLoading(true); setCursor(null) }
    try {
      const params = { limit: 20 }
      if (!reset && cursor) params.cursor = cursor
      if (search.trim()) params.search = search
      const { data } = await api.get('/admin/users', { params })
      setUsers(reset ? data.users : (u) => [...u, ...data.users])
      setHasMore(data.pagination.hasMore)
      setCursor(data.pagination.nextCursor)
    } catch { toast.error('Không thể tải users') }
    finally { setLoading(false) }
  }, [search, cursor])

  useEffect(() => {
    const t = setTimeout(() => fetchUsers(true), 400)
    return () => clearTimeout(t)
  }, [search]) // eslint-disable-line

  const handleAdjustCoins = async () => {
    const amount = parseInt(coinAmount)
    if (isNaN(amount) || amount === 0) { toast.error('Nhập số xu hợp lệ'); return }
    setCoinLoading(true)
    try {
      const { data } = await api.post(`/admin/users/${coinModal._id}/coins`, { amount, reason: 'Admin nạp xu' })
      toast.success(data.message)
      setUsers((prev) => prev.map((u) => u._id === coinModal._id ? { ...u, coinBalance: data.coinBalance } : u))
      // Nếu nạp cho chính admin → cập nhật store
      if (coinModal._id === currentAdminId) {
        // Reload page để refresh auth store
        window.location.reload()
      }
      setCoinModal(null)
      setCoinAmount('')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi nạp xu')
    } finally { setCoinLoading(false) }
  }

  const handleBan = async (user, ban) => {
    const reason = ban ? prompt('Lý do ban (tùy chọn):') ?? '' : ''
    try {
      await api.patch(`/admin/users/${user._id}/ban`, { ban, reason })
      setUsers((prev) => prev.map((u) => u._id === user._id ? { ...u, isBanned: ban } : u))
      toast.success(ban ? `Đã ban @${user.username}` : `Đã unban @${user.username}`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi')
    }
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
        <input
          type="text"
          className="input pl-10 text-sm"
          placeholder="Tìm username, email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* User list */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card p-4 animate-pulse h-16" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {users.map((user) => (
            <motion.div
              key={user._id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className={`card p-4 flex items-center gap-3 ${user.isBanned ? 'border-red-500/20' : ''}`}
            >
              {/* Avatar */}
              {user.avatar ? (
                <img src={user.avatar} className="w-10 h-10 rounded-full object-cover flex-shrink-0" alt="" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-blue-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {user.username?.[0]?.toUpperCase()}
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-white">@{user.username}</span>
                  {user.role === 'admin' && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-600/30 text-violet-400 font-bold">ADMIN</span>
                  )}
                  {user.isBanned && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-600/30 text-red-400 font-bold">BANNED</span>
                  )}
                </div>
                <p className="text-xs text-white/40 truncate">{user.email}</p>
              </div>

              {/* Coin balance */}
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-violet-400">{user.coinBalance || 0} xu</p>
                <p className="text-[10px] text-white/30">{user.stats?.postsCount || 0} posts</p>
              </div>

              {/* Actions */}
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => { setCoinModal(user); setCoinAmount('') }}
                  className="p-2 rounded-xl bg-violet-600/20 border border-violet-500/30 text-violet-400 hover:bg-violet-600/30 transition-all"
                  title="Điều chỉnh xu"
                >
                  <Coins size={15} />
                </button>
                {user.role !== 'admin' && (
                  <button
                    onClick={() => handleBan(user, !user.isBanned)}
                    className={`p-2 rounded-xl border transition-all
                      ${user.isBanned
                        ? 'bg-green-600/20 border-green-500/30 text-green-400 hover:bg-green-600/30'
                        : 'bg-red-600/20 border-red-500/30 text-red-400 hover:bg-red-600/30'}`}
                    title={user.isBanned ? 'Unban' : 'Ban'}
                  >
                    {user.isBanned ? <ShieldCheck size={15} /> : <ShieldAlert size={15} />}
                  </button>
                )}
              </div>
            </motion.div>
          ))}

          {users.length === 0 && !loading && (
            <div className="text-center py-12">
              <Users size={32} className="text-white/10 mx-auto mb-3" />
              <p className="text-white/40 text-sm">Không tìm thấy user nào</p>
            </div>
          )}
        </div>
      )}

      {hasMore && (
        <button onClick={() => fetchUsers(false)} className="btn-secondary w-full flex items-center justify-center gap-2 text-sm">
          <ChevronDown size={15} /> Tải thêm
        </button>
      )}

      {/* Coin adjustment modal */}
      <AnimatePresence>
        {coinModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && setCoinModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="card p-6 max-w-sm w-full"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-2xl bg-violet-600/20 flex items-center justify-center">
                  <Coins size={24} className="text-violet-400" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Điều chỉnh xu</h3>
                  <p className="text-sm text-white/40">@{coinModal.username} — hiện có <span className="text-violet-400 font-bold">{coinModal.coinBalance || 0} xu</span></p>
                </div>
              </div>

              <div className="flex gap-2 mb-2">
                {[100, 500, 1000, 5000].map((v) => (
                  <button
                    key={v}
                    onClick={() => setCoinAmount(String(v))}
                    className="flex-1 py-1.5 rounded-lg bg-violet-600/20 border border-violet-500/30 text-violet-400 text-xs font-bold hover:bg-violet-600/30 transition-all"
                  >
                    +{v}
                  </button>
                ))}
              </div>

              <div className="relative mb-4">
                <input
                  type="number"
                  className="input text-center text-lg font-bold"
                  placeholder="Nhập số xu (âm để trừ)"
                  value={coinAmount}
                  onChange={(e) => setCoinAmount(e.target.value)}
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 flex gap-1">
                  <button onClick={() => setCoinAmount((v) => String(Math.abs(parseInt(v) || 0)))} className="p-1 text-green-400 hover:text-green-300">
                    <Plus size={14} />
                  </button>
                  <button onClick={() => setCoinAmount((v) => String(-(Math.abs(parseInt(v) || 0))))} className="p-1 text-red-400 hover:text-red-300">
                    <Minus size={14} />
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setCoinModal(null)} className="btn-secondary flex-1">Hủy</button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleAdjustCoins}
                  disabled={coinLoading || !coinAmount}
                  className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {coinLoading ? (
                    <motion.div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />
                  ) : (
                    <>
                      <Coins size={15} />
                      Xác nhận
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Main AdminPage ─────────────────────────────────────────
const TABS = [
  { key: 'dashboard', label: 'Dashboard', Icon: BarChart3 },
  { key: 'posts', label: 'Bài đăng', Icon: Images },
  { key: 'users', label: 'Users', Icon: Users },
]

const AdminPage = () => {
  const [activeTab, setActiveTab] = useState('dashboard')

  return (
    <AdminGuard>
      <div className="min-h-screen pb-24 md:pb-8 p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mb-6"
          >
            <div>
              <h1 className="text-2xl font-display font-black flex items-center gap-2">
                <ShieldCheck size={24} className="text-violet-400" />
                Admin Panel
              </h1>
              <p className="text-white/40 text-sm mt-0.5">Quản lý nội dung và người dùng</p>
            </div>
          </motion.div>

          {/* Tabs */}
          <div className="flex gap-1 mb-6 bg-surface-50 p-1 rounded-2xl border border-white/10 w-fit">
            {TABS.map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all
                  ${activeTab === key
                    ? 'bg-brand-600 text-white shadow-[0_0_20px_rgba(124,58,237,0.3)]'
                    : 'text-white/50 hover:text-white/80'}`}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              {activeTab === 'dashboard' && <DashboardTab />}
              {activeTab === 'posts' && <PostsTab />}
              {activeTab === 'users' && <UsersTab />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </AdminGuard>
  )
}

export default AdminPage
