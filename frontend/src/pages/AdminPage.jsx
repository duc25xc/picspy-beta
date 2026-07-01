import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Images, Users, CheckCircle, XCircle, EyeOff, Clock,
  Coins, ShieldAlert, ShieldCheck, RefreshCw, ChevronDown, Search,
  BarChart3, AlertTriangle, Plus, Minus, Tag, Pencil, Trash2, Eye,
  TrendingUp, ToggleLeft, ToggleRight, Check, Square, CheckSquare,
  X, Save, Loader2, Settings, Zap, ZapOff, Timer, UserCheck, Shield, Palette, ArrowRight, Megaphone,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/api'
import useAuthStore from '../store/auth.store'
import { Navigate } from 'react-router-dom'
import { useSettings } from '../context/SettingsContext'
// ─── Guard ─────────────────────────────────────────────────────
const AdminGuard = ({ children }) => {
  const user = useAuthStore((s) => s.user)
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'admin') return <Navigate to="/" replace />
  return children
}

// ─── Stat Card ─────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, color = 'text-white', sub }) => (
  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card p-5">
    <div className="flex items-center justify-between mb-3">
      <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">{label}</span>
      <Icon size={18} className={color} />
    </div>
    <p className={`text-3xl font-black ${color}`}>{value?.toLocaleString() ?? '—'}</p>
    {sub && <p className="text-xs text-white/30 mt-1">{sub}</p>}
  </motion.div>
)

// ─── Status Badge ───────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const map = {
    approved: { label: 'Đã duyệt', cls: 'bg-green-500/15 text-green-400 border-green-500/30',  Icon: CheckCircle },
    pending:  { label: 'Chờ duyệt', cls: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30', Icon: Clock },
    rejected: { label: 'Từ chối',   cls: 'bg-red-500/15 text-red-400 border-red-500/30',         Icon: XCircle },
    hidden:   { label: 'Đã ẩn',     cls: 'bg-white/5 text-white/40 border-white/10',              Icon: EyeOff },
  }
  const { label, cls, Icon: I } = map[status] || map.pending
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${cls}`}>
      <I size={11} />{label}
    </span>
  )
}

// ─── Mini SVG Chart ─────────────────────────────────────────────
const MiniBarChart = ({ data = [], dataKey = 'posts', color = '#7c3aed', label = '' }) => {
  const max = Math.max(...data.map(d => d[dataKey]), 1)
  const w = 100 / data.length

  return (
    <div className="relative">
      <div className="flex items-end gap-0.5 h-20">
        {data.map((d, i) => {
          const pct = (d[dataKey] / max) * 100
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end group relative">
              <div
                className="w-full rounded-t-sm transition-all duration-500"
                style={{
                  height: `${Math.max(pct, 3)}%`,
                  background: color,
                  opacity: 0.7 + (pct / max) * 0.3,
                }}
              />
              {/* Tooltip on hover */}
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-surface-100 border border-white/10 rounded-lg px-2 py-0.5 text-[10px] text-white font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                {d[dataKey]} — {d.label}
              </div>
            </div>
          )
        })}
      </div>
      {/* X axis labels — chỉ show đầu + cuối */}
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-white/30">{data[0]?.label}</span>
        <span className="text-[9px] text-white/20 font-semibold">{label}</span>
        <span className="text-[10px] text-white/30">{data[data.length - 1]?.label}</span>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// TAB: DASHBOARD
// ══════════════════════════════════════════════════════════════════
const DashboardTab = () => {
  const [stats, setStats] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [days, setDays] = useState(7)
  const [loading, setLoading] = useState(true)
  const adminUser = useAuthStore((s) => s.user)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.get('/admin/dashboard'),
      api.get(`/admin/dashboard/analytics?days=${days}`),
    ]).then(([s, a]) => {
      setStats(s.data)
      setAnalytics(a.data)
    }).finally(() => setLoading(false))
  }, [days])

  return (
    <div className="space-y-6">
      {/* Admin balance */}
      <div className="card p-5 border-violet-500/30 bg-violet-600/10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-violet-400 mb-1">Số dư token của Admin</p>
            <p className="text-4xl font-black text-white">{adminUser?.tokenBalance?.toLocaleString() ?? 0} <span className="text-violet-400 text-2xl">token</span></p>
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
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="card p-5 animate-pulse h-24" />)}
        </div>
      ) : stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard icon={Images} label="Tổng bài đăng" value={stats.totalPosts} />
          <StatCard icon={Clock} label="Chờ duyệt" value={stats.pendingPosts} color="text-yellow-400" sub="Cần xử lý ngay" />
          <StatCard icon={CheckCircle} label="Đã duyệt" value={stats.totalApproved} color="text-green-400" />
          <StatCard icon={Users} label="Tổng users" value={stats.totalUsers} color="text-blue-400" />
          <StatCard icon={Images} label="Posts 7 ngày" value={stats.recentPosts} color="text-violet-400" sub="7 ngày gần nhất" />
          <StatCard icon={Users} label="User mới" value={stats.recentUsers} color="text-pink-400" sub="7 ngày gần nhất" />
        </div>
      )}

      {/* Analytics Chart */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold flex items-center gap-2"><TrendingUp size={16} className="text-violet-400" /> Thống kê hoạt động</h3>
          <div className="flex gap-1">
            {[7, 14, 30].map(d => (
              <button key={d} onClick={() => setDays(d)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${days === d ? 'bg-brand-600 text-white' : 'text-white/40 hover:text-white'}`}>
                {d}N
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="h-28 animate-pulse rounded-xl bg-white/5" />
        ) : analytics?.timeline?.length > 0 && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-white/40 mb-2 font-semibold">📸 Bài đăng mới</p>
              <MiniBarChart data={analytics.timeline} dataKey="posts" color="#7c3aed" label="posts" />
            </div>
            <div>
              <p className="text-xs text-white/40 mb-2 font-semibold">👤 Users mới</p>
              <MiniBarChart data={analytics.timeline} dataKey="users" color="#06b6d4" label="users" />
            </div>
          </div>
        )}

        {/* Category breakdown */}
        {analytics?.categoryStats?.length > 0 && (
          <div>
            <p className="text-xs text-white/40 mb-3 font-semibold">📂 Phân bổ danh mục (approved)</p>
            <div className="space-y-2">
              {analytics.categoryStats.slice(0, 5).map(c => {
                const total = analytics.categoryStats.reduce((s, x) => s + x.count, 0)
                const pct = Math.round((c.count / total) * 100)
                return (
                  <div key={c._id} className="flex items-center gap-3">
                    <span className="text-xs text-white/50 w-20 truncate capitalize">{c._id}</span>
                    <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-500 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-white/40 w-10 text-right">{pct}%</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {stats?.pendingPosts > 0 && (
        <div className="card p-4 border-yellow-500/20 bg-yellow-500/5">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-yellow-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-yellow-400">Bài đăng chờ duyệt</p>
              <p className="text-xs text-white/40 mt-0.5">
                Có <span className="text-yellow-400 font-bold">{stats.pendingPosts}</span> bài đăng đang chờ. Vào tab "Bài đăng" để xử lý.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// TAB: POSTS (với Bulk Actions)
// ══════════════════════════════════════════════════════════════════
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
  // Bulk select
  const [selected, setSelected] = useState(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)

  const STATUS_TABS = [
    { key: 'pending',  label: 'Chờ duyệt', color: 'text-yellow-400' },
    { key: 'approved', label: 'Đã duyệt',  color: 'text-green-400' },
    { key: 'rejected', label: 'Từ chối',   color: 'text-red-400' },
    { key: 'hidden',   label: 'Đã ẩn',     color: 'text-white/40' },
    { key: 'all',      label: 'Tất cả',    color: 'text-white' },
  ]

  const fetchPosts = useCallback(async (reset = false) => {
    if (reset) { setLoading(true); setCursor(null); setSelected(new Set()) }
    try {
      const params = { status: activeStatus, limit: 12 }
      if (!reset && cursor) params.cursor = cursor
      const { data } = await api.get('/admin/posts', { params })
      setPosts(reset ? data.posts : p => [...p, ...data.posts])
      setStats(data.stats || {})
      setHasMore(data.pagination.hasMore)
      setCursor(data.pagination.nextCursor)
    } catch { toast.error('Không thể tải bài đăng') }
    finally { setLoading(false) }
  }, [activeStatus, cursor])

  useEffect(() => { fetchPosts(true) }, [activeStatus]) // eslint-disable-line

  const toggleSelect = (id) => setSelected(prev => {
    const s = new Set(prev)
    s.has(id) ? s.delete(id) : s.add(id)
    return s
  })
  const toggleAll = () => setSelected(
    selected.size === posts.length ? new Set() : new Set(posts.map(p => p._id))
  )

  const handleStatus = async (postId, status, reason = '') => {
    setActionLoading(postId)
    try {
      await api.patch(`/admin/posts/${postId}/status`, { status, rejectionReason: reason })
      setPosts(prev => prev.filter(p => p._id !== postId))
      toast.success(`✅ Đã ${status === 'approved' ? 'duyệt' : status === 'rejected' ? 'từ chối' : 'ẩn'}`)
      setRejectModal(null); setRejectReason('')
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi') }
    finally { setActionLoading(null) }
  }

  const handleBulk = async (status) => {
    if (selected.size === 0) return
    setBulkLoading(true)
    try {
      const { data } = await api.post('/admin/posts/bulk', { postIds: [...selected], status })
      toast.success(`✅ ${data.message}`)
      setPosts(prev => prev.filter(p => !selected.has(p._id)))
      setSelected(new Set())
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi bulk action') }
    finally { setBulkLoading(false) }
  }

  const handleDeletePost = async (postId) => {
    const confirm = window.confirm('Bạn có chắc chắn muốn xóa bài đăng này vĩnh viễn? Hành động này không thể hoàn tác.')
    if (!confirm) return

    setActionLoading(postId)
    try {
      await api.delete(`/posts/${postId}`)
      setPosts(prev => prev.filter(p => p._id !== postId))
      toast.success('🗑 Đã xóa bài đăng vĩnh viễn!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể xóa bài đăng')
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Status tabs */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_TABS.map(({ key, label, color }) => (
          <button key={key} onClick={() => setActiveStatus(key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border flex items-center gap-2
              ${activeStatus === key ? 'bg-brand-600 border-brand-500 text-white' : 'bg-surface-50 border-white/10 text-white/60 hover:border-white/20'}`}>
            <span className={color}>{label}</span>
            {stats[key] > 0 && <span className="bg-white/15 text-xs px-1.5 py-0.5 rounded-full font-bold">{stats[key]}</span>}
          </button>
        ))}
      </div>

      {/* Bulk action bar */}
      <AnimatePresence>
        {posts.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
            <button onClick={toggleAll}
              className="flex items-center gap-2 text-xs text-white/60 hover:text-white transition-colors">
              {selected.size === posts.length
                ? <CheckSquare size={15} className="text-brand-400" />
                : <Square size={15} />}
              {selected.size > 0 ? `${selected.size} đã chọn` : 'Chọn tất cả'}
            </button>

            {selected.size > 0 && (
              <div className="flex gap-2 ml-auto">
                {bulkLoading ? <Loader2 size={16} className="animate-spin text-white/40" /> : (
                  <>
                    <button onClick={() => handleBulk('approved')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-600/20 border border-green-500/30 text-green-400 text-xs font-bold hover:bg-green-600/30 transition-all">
                      <CheckCircle size={12} /> Duyệt ({selected.size})
                    </button>
                    <button onClick={() => handleBulk('rejected')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600/20 border border-red-500/30 text-red-400 text-xs font-bold hover:bg-red-600/30 transition-all">
                      <XCircle size={12} /> Từ chối ({selected.size})
                    </button>
                    <button onClick={() => handleBulk('hidden')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white/40 text-xs font-bold hover:text-white/60 transition-all">
                      <EyeOff size={12} /> Ẩn
                    </button>
                  </>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Posts grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="rounded-2xl bg-surface-100 animate-pulse aspect-square" />)}
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
              const img = post.generatedImages?.[0] || post.images?.[0]
              const isActing = actionLoading === post._id
              const isSelected = selected.has(post._id)
              return (
                <motion.div key={post._id} layout initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, scale:0.95 }}
                  className={`card overflow-hidden transition-all ${isSelected ? 'ring-2 ring-brand-500' : ''}`}>
                  {/* Thumbnail */}
                  <div className="relative aspect-video bg-surface-100">
                    {(img?.thumbnailUrl || img?.url) && (
                      <img src={img.thumbnailUrl || img.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                    )}
                    {/* Select checkbox */}
                    <button onClick={() => toggleSelect(post._id)}
                      className="absolute top-2 left-2 w-6 h-6 rounded-lg bg-black/50 backdrop-blur-sm flex items-center justify-center border border-white/20 transition-all hover:border-brand-400">
                      {isSelected ? <Check size={13} className="text-brand-400" /> : <Square size={11} className="text-white/50" />}
                    </button>
                    <div className="absolute top-2 right-2"><StatusBadge status={post.status} /></div>
                    {post.isNSFW && <div className="absolute bottom-2 left-2"><span className="bg-red-600/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">NSFW</span></div>}
                  </div>

                  {/* Info */}
                  <div className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      {post.authorId?.avatar
                        ? <img src={post.authorId.avatar} className="w-7 h-7 rounded-full object-cover" alt="" />
                        : <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-600 to-blue-500 flex items-center justify-center text-white text-xs font-bold">{post.authorId?.username?.[0]?.toUpperCase() || '?'}</div>}
                      <span className="text-sm font-semibold text-white/80">@{post.authorId?.username || 'unknown'}</span>
                    </div>
                    {/* Caption — placeholder nếu không có text */}
                    <p className="text-xs line-clamp-2 min-h-[2.5rem] flex items-center">
                      {post.caption
                        ? <span className="text-white/50">{post.caption}</span>
                        : <span className="text-white/20 italic">Không có tiêu đề</span>
                      }
                    </p>
                    {post.rejectionReason && <p className="text-xs text-red-400/70 italic">⚠ {post.rejectionReason}</p>}

                    {/* Actions */}
                    <div className="flex gap-2 pt-1">
                      {post.status !== 'approved' && (
                        <motion.button whileTap={{ scale: 0.95 }} onClick={() => handleStatus(post._id, 'approved')} disabled={isActing}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-green-600/20 border border-green-500/30 text-green-400 hover:bg-green-600/30 transition-all text-xs font-semibold disabled:opacity-50">
                          <CheckCircle size={13} /> Duyệt
                        </motion.button>
                      )}
                      {post.status !== 'rejected' && (
                        <motion.button whileTap={{ scale: 0.95 }} onClick={() => setRejectModal(post)} disabled={isActing}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-red-600/20 border border-red-500/30 text-red-400 hover:bg-red-600/30 transition-all text-xs font-semibold disabled:opacity-50">
                          <XCircle size={13} /> Từ chối
                        </motion.button>
                      )}
                      {post.status !== 'hidden' && (
                        <motion.button whileTap={{ scale: 0.95 }} onClick={() => handleStatus(post._id, 'hidden')} disabled={isActing}
                          className="flex items-center justify-center gap-1 py-2 px-3 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white/60 transition-all text-xs disabled:opacity-50"
                          title="Ẩn bài đăng"
                        >
                          <EyeOff size={13} />
                        </motion.button>
                      )}
                      <motion.button whileTap={{ scale: 0.95 }} onClick={() => handleDeletePost(post._id)} disabled={isActing}
                        className="flex items-center justify-center gap-1 py-2 px-3 rounded-xl bg-red-600/10 border border-red-500/20 text-red-400 hover:bg-red-600/20 transition-all text-xs disabled:opacity-50"
                        title="Xóa vĩnh viễn"
                      >
                        <Trash2 size={13} />
                      </motion.button>
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
            <ChevronDown size={16} /> Tải thêm
          </button>
        </div>
      )}

      {/* Reject modal */}
      <AnimatePresence>
        {rejectModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={e => e.target === e.currentTarget && setRejectModal(null)}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }}
              className="card p-6 max-w-sm w-full">
              <h3 className="font-bold text-lg mb-1">Từ chối bài đăng</h3>
              <p className="text-sm text-white/40 mb-4">Nhập lý do từ chối (tùy chọn)</p>
              <textarea className="input resize-none mb-4" rows={3}
                placeholder="Ảnh vi phạm quy định, nội dung không phù hợp..."
                value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
              <div className="flex gap-3">
                <button onClick={() => { setRejectModal(null); setRejectReason('') }} className="btn-secondary flex-1">Hủy</button>
                <button onClick={() => handleStatus(rejectModal._id, 'rejected', rejectReason)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-colors">
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

// ══════════════════════════════════════════════════════════════════
// TAB: USERS
// ══════════════════════════════════════════════════════════════════
const TIER_META = {
  free:     { label: 'Miễn phí', color: '#9ca3af', bg: 'rgba(156,163,175,0.12)', border: 'rgba(156,163,175,0.25)', icon: '⭕' },
  founder:  { label: "Founder's", color: '#d97706', bg: 'rgba(217,119,6,0.12)',  border: 'rgba(217,119,6,0.3)',   icon: '⭐' },
  pro:      { label: 'Pro',       color: '#7986eb', bg: 'rgba(121,134,235,0.12)', border: 'rgba(121,134,235,0.3)', icon: '💎' },
  ultimate: { label: 'Ultimate', color: '#06b6d4', bg: 'rgba(6,182,212,0.12)',   border: 'rgba(6,182,212,0.3)',  icon: '👑' },
}

const UsersTab = () => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [hasMore, setHasMore] = useState(false)
  const [cursor, setCursor] = useState(null)
  const [coinModal, setCoinModal] = useState(null)
  const [coinAmount, setCoinAmount] = useState('')
  const [coinLoading, setCoinLoading] = useState(false)
  const [tierModal, setTierModal] = useState(null)
  const [tierLoading, setTierLoading] = useState(false)
  const [selectedTier, setSelectedTier] = useState('free')
  // Ban modal
  const [banModal, setBanModal] = useState(null)      // { user, ban: true/false }
  const [banReason, setBanReason] = useState('')
  const [banDuration, setBanDuration] = useState(0)   // 0 = vĩnh viễn
  const [banLoading, setBanLoading] = useState(false)
  // Role modal
  const [roleModal, setRoleModal] = useState(null)    // user
  const [selectedRole, setSelectedRole] = useState('user')
  const [roleLoading, setRoleLoading] = useState(false)
  const currentAdminId = useAuthStore(s => s.user?._id)

  const fetchUsers = useCallback(async (reset = false) => {
    if (reset) { setLoading(true); setCursor(null) }
    try {
      const params = { limit: 20 }
      if (!reset && cursor) params.cursor = cursor
      if (search.trim()) params.search = search
      const { data } = await api.get('/admin/users', { params })
      setUsers(reset ? data.users : u => [...u, ...data.users])
      setHasMore(data.pagination.hasMore)
      setCursor(data.pagination.nextCursor)
    } catch { toast.error('Không thể tải users') }
    finally { setLoading(false) }
  }, [search, cursor])

  useEffect(() => { const t = setTimeout(() => fetchUsers(true), 400); return () => clearTimeout(t) }, [search]) // eslint-disable-line

  const handleAdjustCoins = async () => {
    const amount = parseInt(coinAmount)
    if (isNaN(amount) || amount === 0) { toast.error('Nhập số xu hợp lệ'); return }
    setCoinLoading(true)
    try {
      const { data } = await api.post(`/admin/users/${coinModal._id}/tokens`, { amount, reason: 'Admin nạp token' })
      toast.success(data.message)
      setUsers(prev => prev.map(u => u._id === coinModal._id ? { ...u, tokenBalance: data.tokenBalance } : u))
      if (coinModal._id === currentAdminId) window.location.reload()
      setCoinModal(null); setCoinAmount('')
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi nạp xu') }
    finally { setCoinLoading(false) }
  }

  const openBanModal = (user, ban) => {
    setBanModal({ user, ban })
    setBanReason('')
    setBanDuration(0)
  }

  const handleBan = async () => {
    if (!banModal) return
    const { user, ban } = banModal
    setBanLoading(true)
    try {
      const { data } = await api.patch(`/admin/users/${user._id}/ban`, {
        ban,
        reason: banReason.trim() || undefined,
        banDurationDays: banDuration > 0 ? banDuration : undefined,
      })
      setUsers(prev => prev.map(u => u._id === user._id
        ? { ...u, isBanned: data.isBanned, banReason: data.banReason }
        : u
      ))
      toast.success(data.message)
      setBanModal(null)
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi ban') }
    finally { setBanLoading(false) }
  }

  const openRoleModal = (user) => {
    setSelectedRole(user.role || 'user')
    setRoleModal(user)
  }

  const handleSetRole = async () => {
    if (!roleModal) return
    setRoleLoading(true)
    try {
      const { data } = await api.patch(`/admin/users/${roleModal._id}/role`, { role: selectedRole })
      toast.success(data.message)
      setUsers(prev => prev.map(u => u._id === roleModal._id ? { ...u, role: data.role } : u))
      setRoleModal(null)
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi đổi role') }
    finally { setRoleLoading(false) }
  }

  const openTierModal = (user) => {
    setSelectedTier(user.subscriptionTier || 'free')
    setTierModal(user)
  }

  const handleChangeTier = async () => {
    if (!tierModal) return
    setTierLoading(true)
    try {
      const { data } = await api.patch(`/admin/users/${tierModal._id}/tier`, {
        tier: selectedTier,
        expireInDays: selectedTier === 'free' ? 0 : 365,
      })
      toast.success(data.message)
      setUsers(prev => prev.map(u =>
        u._id === tierModal._id ? { ...u, subscriptionTier: data.subscriptionTier } : u
      ))
      // Nếu admin tự đổi tier của mình → reload để update navbar token badge
      if (tierModal._id === currentAdminId) window.location.reload()
      setTierModal(null)
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi đổi tier') }
    finally { setTierLoading(false) }
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
        <input type="text" className="input pl-10 text-sm" placeholder="Tìm username, email..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="card p-4 animate-pulse h-16" />)}</div>
      ) : (
        <div className="space-y-2">
          {users.map(user => (
            <motion.div key={user._id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              className={`card p-4 flex items-center gap-3 ${user.isBanned ? 'border-red-500/20' : ''}`}>
              {user.avatar
                ? <img src={user.avatar} className="w-10 h-10 rounded-full object-cover flex-shrink-0" alt="" />
                : <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-blue-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">{user.username?.[0]?.toUpperCase()}</div>}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm">{user.displayName || user.username}</span>
                  <span className="text-xs text-white/40">@{user.username}</span>
                  {user.role === 'admin' && <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-600/30 text-violet-400 font-bold">ADMIN</span>}
                  {user.isBanned && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-600/30 text-red-400 font-bold">BANNED</span>}
                  {/* Tier badge — click to change */}
                  <button
                    onClick={() => openTierModal(user)}
                    title="Nhấp để đổi gói"
                    className="text-[10px] px-2 py-0.5 rounded-full font-bold border transition-all hover:brightness-125"
                    style={{
                      background: TIER_META[user.subscriptionTier || 'free']?.bg,
                      color: TIER_META[user.subscriptionTier || 'free']?.color,
                      borderColor: TIER_META[user.subscriptionTier || 'free']?.border,
                    }}
                  >
                    {TIER_META[user.subscriptionTier || 'free']?.icon} {TIER_META[user.subscriptionTier || 'free']?.label}
                  </button>
                </div>
                <p className="text-xs text-white/40 truncate">{user.email}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-violet-400">{user.tokenBalance || 0} token</p>
                <p className="text-[10px] text-white/30">{user.stats?.postsCount || 0} posts</p>
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                <button onClick={() => { setCoinModal(user); setCoinAmount('') }}
                  className="p-2 rounded-xl bg-violet-600/20 border border-violet-500/30 text-violet-400 hover:bg-violet-600/30 transition-all" title="Điều chỉnh token">
                  <Coins size={14} />
                </button>
                {user._id !== currentAdminId && (
                  <button onClick={() => openRoleModal(user)}
                    className={`p-2 rounded-xl border transition-all ${
                      user.role === 'admin'
                        ? 'bg-violet-600/20 border-violet-500/30 text-violet-400 hover:bg-violet-600/30'
                        : 'bg-white/5 border-white/10 text-white/40 hover:border-violet-500/40 hover:text-violet-400'
                    }`}
                    title="Đổi Role">
                    <Shield size={14} />
                  </button>
                )}
                {user._id !== currentAdminId && (
                  <button onClick={() => openBanModal(user, !user.isBanned)}
                    className={`p-2 rounded-xl border transition-all ${
                      user.isBanned
                        ? 'bg-green-600/20 border-green-500/30 text-green-400 hover:bg-green-600/30'
                        : 'bg-red-600/20 border-red-500/30 text-red-400 hover:bg-red-600/30'
                    }`}
                    title={user.isBanned ? 'Unban' : 'Ban'}>
                    {user.isBanned ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
                  </button>
                )}
              </div>
            </motion.div>
          ))}
          {users.length === 0 && !loading && (
            <div className="text-center py-12"><Users size={32} className="text-white/10 mx-auto mb-3" /><p className="text-white/40 text-sm">Không tìm thấy user</p></div>
          )}
        </div>
      )}

      {hasMore && <button onClick={() => fetchUsers(false)} className="btn-secondary w-full flex items-center justify-center gap-2 text-sm"><ChevronDown size={15} /> Tải thêm</button>}

      {/* Coin modal */}
      <AnimatePresence>
        {coinModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={e => e.target === e.currentTarget && setCoinModal(null)}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }}
              className="card p-6 max-w-sm w-full">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-2xl bg-violet-600/20 flex items-center justify-center"><Coins size={24} className="text-violet-400" /></div>
                <div><h3 className="font-bold text-lg">Điều chỉnh token</h3><p className="text-sm text-white/40">@{coinModal.username} — <span className="text-violet-400 font-bold">{coinModal.tokenBalance || 0} token</span></p></div>
              </div>
              <div className="flex gap-2 mb-2">
                {[100, 500, 1000, 5000].map(v => (
                  <button key={v} onClick={() => setCoinAmount(String(v))}
                    className="flex-1 py-1.5 rounded-lg bg-violet-600/20 border border-violet-500/30 text-violet-400 text-xs font-bold hover:bg-violet-600/30 transition-all">+{v}</button>
                ))}
              </div>
              <div className="relative mb-4">
                <input type="number" className="input text-center text-lg font-bold" placeholder="Nhập số xu (âm để trừ)"
                  value={coinAmount} onChange={e => setCoinAmount(e.target.value)} />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 flex gap-1">
                  <button onClick={() => setCoinAmount(v => String(Math.abs(parseInt(v) || 0)))} className="p-1 text-green-400 hover:text-green-300"><Plus size={14} /></button>
                  <button onClick={() => setCoinAmount(v => String(-(Math.abs(parseInt(v) || 0))))} className="p-1 text-red-400 hover:text-red-300"><Minus size={14} /></button>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setCoinModal(null)} className="btn-secondary flex-1">Hủy</button>
                <motion.button whileTap={{ scale: 0.97 }} onClick={handleAdjustCoins} disabled={coinLoading || !coinAmount}
                  className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50">
                  {coinLoading ? <Loader2 size={16} className="animate-spin" /> : <><Coins size={15} /> Xác nhận</>}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tier Modal */}
      <AnimatePresence>
        {tierModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={e => e.target === e.currentTarget && setTierModal(null)}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }}
              className="card p-6 w-full max-w-sm">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl"
                  style={{ background: TIER_META[selectedTier]?.bg }}>
                  {TIER_META[selectedTier]?.icon}
                </div>
                <div>
                  <h3 className="font-bold text-lg leading-tight">Đổi gói đăng ký</h3>
                  <p className="text-xs text-white/40">@{tierModal.username}</p>
                </div>
              </div>

              {/* Tier grid */}
              <div className="grid grid-cols-2 gap-2 mb-5">
                {Object.entries(TIER_META).map(([key, meta]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedTier(key)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all"
                    style={{
                      background: selectedTier === key ? meta.bg : 'rgba(255,255,255,0.03)',
                      borderColor: selectedTier === key ? meta.border : 'rgba(255,255,255,0.07)',
                      boxShadow: selectedTier === key ? `0 0 0 1.5px ${meta.border}` : 'none',
                    }}
                  >
                    <span className="text-lg">{meta.icon}</span>
                    <div>
                      <p className="text-xs font-bold" style={{ color: selectedTier === key ? meta.color : 'rgba(255,255,255,0.5)' }}>
                        {meta.label}
                      </p>
                      {key !== 'free' && (
                        <p className="text-[10px] text-white/25">
                          {key === 'founder' ? '200 slot' : key === 'pro' ? '1K token/th' : 'Unlimited'}
                        </p>
                      )}
                    </div>
                    {selectedTier === key && (
                      <Check size={13} className="ml-auto flex-shrink-0" style={{ color: meta.color }} />
                    )}
                  </button>
                ))}
              </div>

              {/* Current vs Selected */}
              <div className="flex items-center justify-center gap-2 mb-5 text-xs">
                <span className="px-2.5 py-1 rounded-full font-bold" style={{
                  background: TIER_META[tierModal.subscriptionTier || 'free']?.bg,
                  color: TIER_META[tierModal.subscriptionTier || 'free']?.color,
                }}>{TIER_META[tierModal.subscriptionTier || 'free']?.label}</span>
                <span className="text-white/30">→</span>
                <span className="px-2.5 py-1 rounded-full font-bold" style={{
                  background: TIER_META[selectedTier]?.bg,
                  color: TIER_META[selectedTier]?.color,
                  border: `1px solid ${TIER_META[selectedTier]?.border}`,
                }}>{TIER_META[selectedTier]?.label}</span>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setTierModal(null)} className="btn-secondary flex-1">Hủy</button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleChangeTier}
                  disabled={tierLoading || selectedTier === (tierModal.subscriptionTier || 'free')}
                  className="flex-1 py-2.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2
                    disabled:opacity-40 transition-all"
                  style={{
                    background: 'oklch(52% 0.28 285)',
                    color: '#f5f3ff',
                    boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.22), 0 4px 14px rgba(109,40,217,0.4)',
                  }}
                >
                  {tierLoading
                    ? <Loader2 size={15} className="animate-spin" />
                    : <><Zap size={14} /> Xác nhận</>
                  }
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Ban Modal ── */}
      <AnimatePresence>
        {banModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={e => e.target === e.currentTarget && setBanModal(null)}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }}
              className="card p-6 max-w-sm w-full">
              <div className="flex items-center gap-3 mb-5">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${banModal.ban ? 'bg-red-600/20' : 'bg-green-600/20'}`}>
                  {banModal.ban ? <ShieldAlert size={22} className="text-red-400" /> : <ShieldCheck size={22} className="text-green-400" />}
                </div>
                <div>
                  <h3 className="font-bold text-lg">{banModal.ban ? 'Ban user' : 'Unban user'}</h3>
                  <p className="text-xs text-white/40">@{banModal.user.username}</p>
                </div>
              </div>

              {banModal.ban && (<>
                <div className="mb-3">
                  <label className="input-label">Lý do ban <span className="text-white/30 font-normal">(tuỳ chọn)</span></label>
                  <textarea className="input resize-none text-sm" rows={3}
                    placeholder="Vi phạm quy định, spam, nội dung không phù hợp..."
                    value={banReason} onChange={e => setBanReason(e.target.value)} />
                </div>
                <div className="mb-5">
                  <label className="input-label">Thời hạn ban</label>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    {[{v:0,l:'Vĩnh viễn'},{v:1,l:'1 ngày'},{v:7,l:'7 ngày'},{v:30,l:'30 ngày'},{v:90,l:'90 ngày'}].map(opt => (
                      <button key={opt.v} onClick={() => setBanDuration(opt.v)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                          banDuration === opt.v
                            ? 'bg-red-600/30 border-red-500/50 text-red-300'
                            : 'bg-white/5 border-white/10 text-white/50 hover:border-white/20'
                        }`}>{opt.l}</button>
                    ))}
                  </div>
                </div>
              </>)}

              {!banModal.ban && (
                <p className="text-sm text-white/50 mb-5">Xác nhận gỡ lệnh ban cho user này? Họ sẽ có thể đăng nhập lại bình thường.</p>
              )}

              <div className="flex gap-3">
                <button onClick={() => setBanModal(null)} className="btn-secondary flex-1" disabled={banLoading}>Hủy</button>
                <button onClick={handleBan} disabled={banLoading}
                  className={`flex-1 py-2.5 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors ${
                    banModal.ban ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}>
                  {banLoading ? <Loader2 size={15} className="animate-spin" /> : (banModal.ban ? '🔨 Xác nhận ban' : '✓ Gỡ ban')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Role Modal ── */}
      <AnimatePresence>
        {roleModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={e => e.target === e.currentTarget && setRoleModal(null)}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }}
              className="card p-6 max-w-sm w-full">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-2xl bg-violet-600/20 flex items-center justify-center">
                  <UserCheck size={22} className="text-violet-400" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Đổi Role</h3>
                  <p className="text-xs text-white/40">@{roleModal.username} — hiện tại: <span className={roleModal.role === 'admin' ? 'text-violet-400 font-bold' : 'text-white/60'}>{roleModal.role || 'user'}</span></p>
                </div>
              </div>

              <div className="flex gap-3 mb-5">
                {[{v:'user', l:'👤 User', desc:'Quyền thường'}, {v:'admin', l:'🛡️ Admin', desc:'Toàn quyền quản lý'}].map(opt => (
                  <button key={opt.v} onClick={() => setSelectedRole(opt.v)}
                    className={`flex-1 p-3 rounded-xl border text-left transition-all ${
                      selectedRole === opt.v
                        ? (opt.v === 'admin' ? 'border-violet-500 bg-violet-500/10' : 'border-brand-500 bg-brand-500/10')
                        : 'border-white/10 bg-surface-100 hover:border-white/20'
                    }`}>
                    <p className={`text-sm font-bold ${selectedRole === opt.v ? (opt.v === 'admin' ? 'text-violet-300' : 'text-brand-300') : 'text-white/60'}`}>{opt.l}</p>
                    <p className="text-xs text-white/30 mt-0.5">{opt.desc}</p>
                  </button>
                ))}
              </div>

              {selectedRole === 'admin' && (
                <div className="mb-4 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
                  <p className="text-xs text-yellow-400">⚠ Admin có toàn quyền: duyệt post, ban user, quản lý hệ thống.</p>
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setRoleModal(null)} className="btn-secondary flex-1" disabled={roleLoading}>Hủy</button>
                <button onClick={handleSetRole}
                  disabled={roleLoading || selectedRole === (roleModal.role || 'user')}
                  className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-40">
                  {roleLoading ? <Loader2 size={15} className="animate-spin" /> : <><Shield size={14}/> Xác nhận</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}


// ══════════════════════════════════════════════════════════════════
// TAB: CATEGORIES
// ══════════════════════════════════════════════════════════════════
const CategoriesTab = () => {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newCat, setNewCat] = useState({ name: '', emoji: '🏷️', description: '' })
  const [adding, setAdding] = useState(false)
  const [editId, setEditId] = useState(null)
  const [editData, setEditData] = useState({})
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    api.get('/admin/categories')
      .then(({ data }) => setCategories(data.categories))
      .catch(() => toast.error('Không thể tải danh mục'))
      .finally(() => setLoading(false))
  }, [])

  const handleAdd = async () => {
    if (!newCat.name.trim()) { toast.error('Nhập tên danh mục'); return }
    setAdding(true)
    try {
      const { data } = await api.post('/admin/categories', newCat)
      setCategories(prev => [...prev, data.category])
      setNewCat({ name: '', emoji: '🏷️', description: '' })
      setShowAdd(false)
      toast.success('✅ Đã tạo danh mục')
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi tạo danh mục') }
    finally { setAdding(false) }
  }

  const startEdit = (cat) => { setEditId(cat._id); setEditData({ name: cat.name, emoji: cat.emoji, description: cat.description || '' }) }

  const handleSave = async (id) => {
    setSaving(true)
    try {
      const { data } = await api.put(`/admin/categories/${id}`, editData)
      setCategories(prev => prev.map(c => c._id === id ? data.category : c))
      setEditId(null)
      toast.success('✅ Đã cập nhật')
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi') }
    finally { setSaving(false) }
  }

  const handleToggle = async (cat) => {
    try {
      const { data } = await api.patch(`/admin/categories/${cat._id}/toggle`)
      setCategories(prev => prev.map(c => c._id === cat._id ? { ...c, isActive: data.isActive } : c))
      toast.success(data.message)
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi') }
  }

  const handleDelete = async (cat) => {
    if (!confirm(`Xóa danh mục "${cat.name}"? Các bài đăng sẽ chuyển về "Khác".`)) return
    setDeletingId(cat._id)
    try {
      const { data } = await api.delete(`/admin/categories/${cat._id}`)
      setCategories(prev => prev.filter(c => c._id !== cat._id))
      toast.success(`✅ ${data.message} (${data.migratedPosts} bài → Khác)`)
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi xóa') }
    finally { setDeletingId(null) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-lg">Quản lý danh mục</h2>
          <p className="text-xs text-white/40">Tắt danh mục để ẩn khỏi trang Upload. Xóa sẽ chuyển bài về "Khác".</p>
        </div>
        <button onClick={() => setShowAdd(v => !v)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-all">
          <Plus size={16} /> Thêm mới
        </button>
      </div>

      {/* Add form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="card p-4 space-y-3 border-brand-500/30">
            <p className="text-sm font-semibold text-brand-400">Tạo danh mục mới</p>
            <div className="grid grid-cols-[80px_1fr] gap-3">
              <input className="input text-2xl text-center" placeholder="🏷️" maxLength={4}
                value={newCat.emoji} onChange={e => setNewCat(p => ({ ...p, emoji: e.target.value }))} />
              <input className="input" placeholder="Tên danh mục *" maxLength={50}
                value={newCat.name} onChange={e => setNewCat(p => ({ ...p, name: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleAdd()} />
            </div>
            <input className="input text-sm" placeholder="Mô tả ngắn (tùy chọn)" maxLength={200}
              value={newCat.description} onChange={e => setNewCat(p => ({ ...p, description: e.target.value }))} />
            <div className="flex gap-2">
              <button onClick={() => setShowAdd(false)} className="btn-secondary flex-1 text-sm">Hủy</button>
              <button onClick={handleAdd} disabled={adding}
                className="flex-1 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                {adding ? <Loader2 size={14} className="animate-spin" /> : <><Plus size={14} /> Tạo</>}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category list */}
      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="card p-4 animate-pulse h-16" />)}</div>
      ) : (
        <div className="space-y-2">
          {categories.map(cat => (
            <motion.div key={cat._id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className={`card p-4 flex items-center gap-3 transition-all ${!cat.isActive ? 'opacity-50' : ''}`}>
              {/* Emoji */}
              <span className="text-2xl w-8 text-center flex-shrink-0">{cat.emoji}</span>

              {/* Edit mode */}
              {editId === cat._id ? (
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <input className="input text-sm" placeholder="Tên" value={editData.name}
                    onChange={e => setEditData(p => ({ ...p, name: e.target.value }))} />
                  <input className="input text-sm text-2xl text-center" placeholder="Emoji" maxLength={4}
                    value={editData.emoji} onChange={e => setEditData(p => ({ ...p, emoji: e.target.value }))} />
                  <input className="input text-xs col-span-2" placeholder="Mô tả" value={editData.description}
                    onChange={e => setEditData(p => ({ ...p, description: e.target.value }))} />
                </div>
              ) : (
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{cat.name}</span>
                    <span className="text-[10px] text-white/30 font-mono">/{cat.slug}</span>
                    {!cat.isActive && <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/30 border border-white/10">Tắt</span>}
                    {cat.slug === 'other' && <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/20">Fallback</span>}
                  </div>
                  {cat.description && <p className="text-xs text-white/30 truncate mt-0.5">{cat.description}</p>}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {editId === cat._id ? (
                  <>
                    <button onClick={() => setEditId(null)} className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white transition-all"><X size={14} /></button>
                    <button onClick={() => handleSave(cat._id)} disabled={saving}
                      className="p-2 rounded-xl bg-green-600/20 border border-green-500/30 text-green-400 hover:bg-green-600/30 transition-all">
                      {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    </button>
                  </>
                ) : (
                  <>
                    {/* Toggle active */}
                    <button onClick={() => handleToggle(cat)} disabled={cat.slug === 'other'}
                      className={`p-2 rounded-xl border transition-all ${cat.isActive ? 'bg-green-600/20 border-green-500/30 text-green-400 hover:bg-green-600/30' : 'bg-white/5 border-white/10 text-white/30 hover:text-white/60'} disabled:opacity-30 disabled:cursor-not-allowed`}
                      title={cat.isActive ? 'Tắt danh mục' : 'Bật danh mục'}>
                      {cat.isActive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                    </button>
                    {/* Edit */}
                    <button onClick={() => startEdit(cat)}
                      className="p-2 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 hover:bg-blue-600/30 transition-all" title="Chỉnh sửa">
                      <Pencil size={14} />
                    </button>
                    {/* Delete */}
                    {cat.slug !== 'other' && (
                      <button onClick={() => handleDelete(cat)} disabled={deletingId === cat._id}
                        className="p-2 rounded-xl bg-red-600/20 border border-red-500/30 text-red-400 hover:bg-red-600/30 transition-all disabled:opacity-50" title="Xóa">
                        {deletingId === cat._id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// TAB: SETTINGS
// ══════════════════════════════════════════════════════════════════
function hexToHsl(hex) {
  if (!hex) return { h: 0, s: 0, l: 0 };
  let cleaned = hex.trim().replace('#', '');
  if (cleaned.length === 3) {
    cleaned = cleaned[0] + cleaned[0] + cleaned[1] + cleaned[1] + cleaned[2] + cleaned[2];
  }
  if (cleaned.length !== 6) {
    return { h: 0, s: 0, l: 0 };
  }
  const r = parseInt(cleaned.slice(0, 2), 16) / 255;
  const g = parseInt(cleaned.slice(2, 4), 16) / 255;
  const b = parseInt(cleaned.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) {
      h = (g - b) / d + (g < b ? 6 : 0);
    } else if (max === g) {
      h = (b - r) / d + 2;
    } else if (max === b) {
      h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

const SettingsTab = ({ onDirtyChange }) => {
  const [settings, setSettings] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)

  const { updateBrandColors, setAnnouncement } = useSettings()
  const [primaryColor, setPrimaryColor] = useState('#7c3aed')
  const [gradientColor, setGradientColor] = useState('#3b82f6')
  const [brandOpacity, setBrandOpacity] = useState(1)
  const [brandBlur, setBrandBlur] = useState(0)
  const [enableGradient, setEnableGradient] = useState(true)
  const [shadowStyle, setShadowStyle] = useState('soft')
  const [colorSaving, setColorSaving] = useState(false)

  // Announcement state
  const [announcementText, setAnnouncementText] = useState('')
  const [announcementLink, setAnnouncementLink] = useState('')
  const [announcementEnabled, setAnnouncementEnabled] = useState(false)
  const [announcementSaving, setAnnouncementSaving] = useState(false)

  // Category Style state
  const [categoryStyle, setCategoryStyle] = useState('style-1')
  const [categorySaving, setCategorySaving] = useState(false)
  const [activeSubTab, setActiveSubTab] = useState('general')
  const [selectedConfigPage, setSelectedConfigPage] = useState('home')

  const [savedColors, setSavedColors] = useState({
    primary: '#7c3aed',
    gradient: '#3b82f6',
    opacity: 1,
    blur: 0,
    enableGradient: true,
    shadowStyle: 'soft'
  })

  const [customColors, setCustomColors] = useState({
    primary: '#7c3aed',
    gradient: '#3b82f6',
    opacity: 1,
    blur: 0,
    enableGradient: true,
    shadowStyle: 'soft'
  })

  const COLOR_PRESETS = [
    { name: 'Mặc định (PicSpy)', primary: '#7c3aed', gradient: '#3b82f6', opacity: 1, blur: 0, desc: 'Màu tím PicSpy mặc định' },
    { name: 'Liquid Glass (Mới)', primary: '#345ceb', gradient: '#00c6ff', opacity: 0.75, blur: 12, desc: 'Xanh lam lỏng & trong suốt' },
    { name: 'Cyberpunk Neon', primary: '#ec4899', gradient: '#8b5cf6', opacity: 1, blur: 0, desc: 'Hồng sen & Tím neon rực rỡ' },
    { name: 'Forest Emerald', primary: '#10b981', gradient: '#059669', opacity: 1, blur: 0, desc: 'Xanh lá ngọc lục bảo' },
    { name: 'Amber Glow', primary: '#f59e0b', gradient: '#d97706', opacity: 1, blur: 0, desc: 'Màu hổ phách hoàng kim' }
  ]

  useEffect(() => {
    api.get('/admin/settings')
      .then(({ data }) => {
        setSettings(data.settings)
        const primary = data.settings?.primaryColor || '#7c3aed'
        const gradient = data.settings?.gradientColor || '#3b82f6'
        const opacity = data.settings?.brandOpacity !== undefined ? data.settings.brandOpacity : 1
        const blur = data.settings?.brandBlur !== undefined ? data.settings.brandBlur : 0
        const gradientEnabled = data.settings?.enableGradient !== undefined ? data.settings.enableGradient : true
        const sStyle = data.settings?.shadowStyle || 'soft'

        setPrimaryColor(primary)
        setGradientColor(gradient)
        setBrandOpacity(opacity)
        setBrandBlur(blur)
        setEnableGradient(gradientEnabled)
        setShadowStyle(sStyle)

        // Announcement settings load
        setAnnouncementText(data.settings?.announcementText || '')
        setAnnouncementLink(data.settings?.announcementLink || '')
        setAnnouncementEnabled(data.settings?.announcementEnabled || false)

        // Category style load
        setCategoryStyle(data.settings?.categoryStyle || 'style-1')

        setSavedColors({ primary, gradient, opacity, blur, enableGradient: gradientEnabled, shadowStyle: sStyle })

        // Check if saved colors match any preset
        const matchesPreset = COLOR_PRESETS.some(p => 
          p.primary.toLowerCase() === primary.toLowerCase() &&
          p.gradient.toLowerCase() === gradient.toLowerCase() &&
          p.opacity === opacity &&
          p.blur === blur &&
          gradientEnabled === true &&
          sStyle === 'soft'
        )
        if (!matchesPreset) {
          setCustomColors({ primary, gradient, opacity, blur, enableGradient: gradientEnabled, shadowStyle: sStyle })
        }
      })
      .catch(() => toast.error('Không tải được cài đặt'))
      .finally(() => setLoading(false))
  }, [])

  const hasUnsavedChanges = 
    (primaryColor || '').toLowerCase() !== (savedColors.primary || '').toLowerCase() ||
    (gradientColor || '').toLowerCase() !== (savedColors.gradient || '').toLowerCase() ||
    brandOpacity !== savedColors.opacity ||
    brandBlur !== savedColors.blur ||
    enableGradient !== savedColors.enableGradient ||
    shadowStyle !== savedColors.shadowStyle;

  useEffect(() => {
    onDirtyChange?.(hasUnsavedChanges)
  }, [hasUnsavedChanges, onDirtyChange])

  // Sync customColors state when user edits custom colors (when they don't match any preset)
  useEffect(() => {
    const isPresetActive = COLOR_PRESETS.some(p => 
      p.primary.toLowerCase() === primaryColor.toLowerCase() &&
      p.gradient.toLowerCase() === gradientColor.toLowerCase() &&
      p.opacity === brandOpacity &&
      p.blur === brandBlur &&
      enableGradient === true &&
      shadowStyle === 'soft'
    )
    if (!isPresetActive) {
      setCustomColors({
        primary: primaryColor,
        gradient: gradientColor,
        opacity: brandOpacity,
        blur: brandBlur,
        enableGradient,
        shadowStyle
      })
    }
  }, [primaryColor, gradientColor, brandOpacity, brandBlur, enableGradient, shadowStyle])

  useEffect(() => {
    if (!hasUnsavedChanges) return
    
    const handleBeforeUnload = (e) => {
      e.preventDefault()
      e.returnValue = 'Cấu hình màu của bạn chưa được lưu. Bạn có chắc chắn muốn rời đi?'
      return e.returnValue
    }

    const handleCaptureClick = (e) => {
      const link = e.target.closest('a')
      if (!link) return
      if (link.target === '_blank') return

      const href = link.getAttribute('href')
      if (href) {
        let isInternal = false
        try {
          const url = new URL(href, window.location.href)
          isInternal = url.origin === window.location.origin
        } catch (err) {
          isInternal =
            !href.startsWith('http://') &&
            !href.startsWith('https://') &&
            !href.startsWith('javascript:')
        }

        if (isInternal) {
          if (
            !window.confirm(
              'Cấu hình màu của bạn chưa được lưu. Bạn có chắc chắn muốn rời đi?'
            )
          ) {
            e.preventDefault()
            e.stopPropagation()
          } else {
            onDirtyChange?.(false)
          }
        }
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('click', handleCaptureClick, true)
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('click', handleCaptureClick, true)
    }
  }, [hasUnsavedChanges, onDirtyChange])

  const handleSaveColors = async (
    pColor = primaryColor,
    gColor = gradientColor,
    opacity = brandOpacity,
    blur = brandBlur,
    gradientEnabled = enableGradient,
    sStyle = shadowStyle
  ) => {
    setColorSaving(true)
    try {
      const { data } = await api.put('/admin/settings', {
        primaryColor: pColor,
        gradientColor: gColor,
        brandOpacity: opacity,
        brandBlur: blur,
        enableGradient: gradientEnabled,
        shadowStyle: sStyle
      })
      setSettings(data.settings)
      updateBrandColors(pColor, gColor, opacity, blur, gradientEnabled, sStyle)
      setSavedColors({ primary: pColor, gradient: gColor, opacity, blur, enableGradient: gradientEnabled, shadowStyle: sStyle })
      toast.success('🎨 Đã lưu và áp dụng giao diện màu mới!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể lưu cấu hình màu')
    } finally {
      setColorSaving(false)
    }
  }

  const handleToggleAutoApprove = async () => {
    if (!settings) return
    const next = !settings.autoApprove
    setSaving(true)
    try {
      const { data } = await api.put('/admin/settings', { autoApprove: next })
      setSettings(data.settings)
      toast.success(next ? '⚡ Đã BẬT tự động duyệt ảnh' : '🔒 Đã TẮT — ảnh sẽ chờ duyệt thủ công')
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi cập nhật') }
    finally { setSaving(false) }
  }

  const handleSaveAnnouncement = async () => {
    setAnnouncementSaving(true)
    try {
      const { data } = await api.put('/admin/settings', {
        announcementText,
        announcementLink,
        announcementEnabled
      })
      setSettings(data.settings)
      setAnnouncement({
        text: announcementText,
        link: announcementLink,
        enabled: announcementEnabled
      })
      toast.success('📢 Đã cập nhật thông báo hệ thống!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể lưu thông báo')
    } finally {
      setAnnouncementSaving(false)
    }
  }

  const handleSaveCategoryStyle = async (newStyle) => {
    setCategorySaving(true)
    try {
      const { data } = await api.put('/admin/settings', { categoryStyle: newStyle })
      setSettings(data.settings)
      setCategoryStyle(data.settings?.categoryStyle || 'style-1')
      toast.success('🎨 Đã cập nhật giao diện danh mục nổi bật!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi lưu giao diện danh mục')
    } finally {
      setCategorySaving(false)
    }
  }

  const localPreviewCSSVariables = (() => {
    const { h, s } = hexToHsl(primaryColor);
    const startVal = `hsla(${h}, ${s}%, 44%, ${brandOpacity})`;
    const endVal = enableGradient ? gradientColor : startVal;
    
    const vars = {
      '--local-brand-opacity': brandOpacity,
      '--local-brand-blur': brandBlur > 0 ? `blur(${brandBlur}px)` : 'none',
      '--local-brand-600': startVal,
      '--local-brand-500': `hsla(${h}, ${s}%, 52%, ${brandOpacity})`,
      '--local-brand-gradient-end': endVal,
      '--local-glass-bg': `rgba(15, 15, 19, ${Math.max(0.15, brandOpacity * 0.45)})`,
      '--local-glass-border': `rgba(255, 255, 255, ${0.08 + (1 - brandOpacity) * 0.07})`,
    };

    if (shadowStyle === 'glow') {
      vars['--local-box-shadow-neon-glow'] = `0 0 20px hsla(${h}, ${s}%, 55%, 0.45)`;
    } else {
      vars['--local-box-shadow-neon-glow'] = 'none';
    }

    return vars;
  })();

  if (loading) return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => <div key={i} className="card p-6 animate-pulse h-20" />)}
    </div>
  )

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="font-bold text-xl text-white mb-1">Cài đặt hệ thống</h2>
        <p className="text-sm text-white/40">Quản lý các tính năng và hành vi tự động của PicSpy.</p>
      </div>

      {/* Sub-tabs Navigation */}
      <div className="flex gap-2 p-1.5 rounded-xl bg-white/[0.02] border border-white/5 max-w-md">
        {[
          { key: 'general', label: '📁 Cấu hình Chung' },
          { key: 'branding', label: '🎨 Giao diện & Màu sắc' },
          { key: 'pages', label: '📄 Cài đặt trang' }
        ].map((subTab) => (
          <button
            key={subTab.key}
            type="button"
            onClick={() => setActiveSubTab(subTab.key)}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer text-center
              ${activeSubTab === subTab.key
                ? 'bg-brand-600 text-white shadow-md font-display'
                : 'text-white/60 hover:text-white hover:bg-white/5'}`}
          >
            {subTab.label}
          </button>
        ))}
      </div>

      {activeSubTab === 'general' && (
        // ── Auto Approve Toggle ───
          <motion.div
        className={`card p-6 border transition-all duration-300 ${
          settings?.autoApprove
            ? 'border-green-500/40 bg-green-500/5'
            : 'border-white/10'
        }`}
        layout
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors duration-300 ${
              settings?.autoApprove ? 'bg-green-500/20' : 'bg-white/5'
            }`}>
              {settings?.autoApprove
                ? <Zap size={22} className="text-green-400" />
                : <ZapOff size={22} className="text-white/30" />
              }
            </div>
            <div>
              <h3 className="font-bold text-white text-base mb-1">Tự động duyệt ảnh</h3>
              <p className="text-sm text-white/50 leading-relaxed">
                Khi <strong className="text-white/70">BẬT</strong>: ảnh upload xong sẽ được duyệt tự động sau khi worker xử lý.
                <br />
                Khi <strong className="text-white/70">TẮT</strong>: mọi ảnh sẽ ở trạng thái <span className="text-yellow-400 font-semibold">Chờ duyệt</span> — admin phải duyệt thủ công.
              </p>
              {settings?.autoApprove && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 flex items-center gap-2 text-green-400 text-xs font-semibold"
                >
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  Đang hoạt động — ảnh mới sẽ được duyệt tự động
                </motion.div>
              )}
            </div>
          </div>

          {/* Toggle button */}
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={handleToggleAutoApprove}
            disabled={saving}
            className={`relative w-14 h-7 rounded-full border-2 flex-shrink-0 transition-all duration-300 focus:outline-none ${
              settings?.autoApprove
                ? 'bg-green-500 border-green-400 shadow-[0_0_20px_rgba(34,197,94,0.4)]'
                : 'bg-white/10 border-white/20'
            } disabled:opacity-60`}
          >
            <motion.div
              className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md"
              animate={{ left: settings?.autoApprove ? '28px' : '2px' }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
            {saving && <Loader2 size={10} className="absolute inset-0 m-auto text-white animate-spin" />}
          </motion.button>
        </div>
      </motion.div>)}

      {/* ── Theme Customizer Card ─── */}
      {activeSubTab === 'branding' && (
        <div className="card p-6 border border-white/10 space-y-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center flex-shrink-0">
            <Palette className="text-brand-400" size={22} />
          </div>
          <div>
            <h3 className="font-bold text-white text-base mb-1">Tùy biến Giao diện (Website Theme)</h3>
            <p className="text-sm text-white/50 leading-relaxed">
              Thay đổi tông màu thương hiệu chính (`primary`) và dải màu gradient trên toàn bộ nút, tag, trạng thái của website.
            </p>
          </div>
        </div>

        {/* Color picker inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-white/60 block">Màu chính (Primary Color)</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-10 h-10 rounded-lg overflow-hidden border-0 cursor-pointer bg-transparent"
              />
              <input
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="input py-2 text-xs flex-1"
                placeholder="#hex_color"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-white/60 block">Màu Gradient cuối (Gradient End)</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={gradientColor}
                onChange={(e) => setGradientColor(e.target.value)}
                className="w-10 h-10 rounded-lg overflow-hidden border-0 cursor-pointer bg-transparent"
              />
              <input
                type="text"
                value={gradientColor}
                onChange={(e) => setGradientColor(e.target.value)}
                className="input py-2 text-xs flex-1"
                placeholder="#hex_color"
              />
            </div>
          </div>
        </div>

        {/* Transparency & Backdrop Blur Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-white/5">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-white/60">Độ trong suốt màu chính (Opacity)</label>
              <span className="text-xs font-bold text-brand-400">{Math.round(brandOpacity * 100)}%</span>
            </div>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={brandOpacity}
                onChange={(e) => {
                  const val = parseFloat(e.target.value)
                  setBrandOpacity(val)
                }}
                className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-white/10 accent-brand-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-white/60">Độ nhòe nền (Backdrop Blur)</label>
              <span className="text-xs font-bold text-brand-400">{brandBlur}px</span>
            </div>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="0"
                max="24"
                step="2"
                value={brandBlur}
                onChange={(e) => {
                  const val = parseInt(e.target.value)
                  setBrandBlur(val)
                }}
                className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-white/10 accent-brand-500"
              />
            </div>
          </div>
        </div>

        {/* Advanced Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-white/5">
          {/* Gradient Toggle */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-white/60">Sử dụng dải màu (Gradient Color)</label>
              <span className="text-xs font-bold text-brand-400">{enableGradient ? 'BẬT' : 'TẮT'}</span>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => setEnableGradient(!enableGradient)}
                className={`relative w-12 h-6 rounded-full border transition-all duration-300 flex-shrink-0 focus:outline-none ${
                  enableGradient
                    ? 'bg-brand-500 border-brand-400 shadow-[0_0_12px_rgba(124,58,237,0.3)]'
                    : 'bg-white/10 border-white/20'
                }`}
              >
                <div
                  className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-md transition-all duration-300"
                  style={{ left: enableGradient ? '26px' : '2px' }}
                />
              </button>
              <span className="text-[10px] text-white/40 leading-snug">
                {enableGradient ? 'Bật hiển thị gradient chuyển màu mượt mà' : 'Chỉ sử dụng duy nhất màu chính (Solid)'}
              </span>
            </div>
          </div>

          {/* Shadow Style Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-white/60 block">Hiệu ứng bóng đổ / Tỏa sáng (Shadow Style)</label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { key: 'none', label: 'Không bóng' },
                { key: 'soft', label: 'Mặc định' },
                { key: 'glow', label: 'Sáng Neon' },
              ].map((style) => (
                <button
                  key={style.key}
                  type="button"
                  onClick={() => setShadowStyle(style.key)}
                  className={`px-3 py-2 rounded-lg border text-xs font-bold transition-all text-center cursor-pointer ${
                    shadowStyle === style.key
                      ? 'border-brand-500 bg-brand-500/10 text-white shadow-[0_0_10px_rgba(124,58,237,0.15)]'
                      : 'border-white/5 bg-white/5 hover:border-white/10 text-white/60'
                  }`}
                >
                  {style.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Live Preview buttons sample */}
        <div 
          className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-3 pt-4 border-t border-white/5"
          style={localPreviewCSSVariables}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white/50 block">Bản xem trước nút nhấn (Live Preview)</span>
            <span className="text-[10px] text-yellow-500 font-bold bg-yellow-500/10 px-2 py-0.5 rounded-full animate-pulse">Nháp chưa áp dụng</span>
          </div>
          <div className="flex flex-wrap items-center gap-4 py-3 justify-center">
            {/* Preview Primary Button */}
            <button
              type="button"
              className="px-6 py-2.5 rounded-xl text-xs font-bold text-white transition-all duration-300"
              style={{
                background: 'linear-gradient(135deg, var(--local-brand-600) 0%, var(--local-brand-gradient-end) 100%)',
                backdropFilter: 'var(--local-brand-blur, none)',
                WebkitBackdropFilter: 'var(--local-brand-blur, none)',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25), var(--local-box-shadow-neon-glow, 0 0 0 transparent)',
                border: '1px solid rgba(255, 255, 255, calc((1 - var(--local-brand-opacity, 1)) * 0.15))'
              }}
            >
              Nút Chính mẫu <ArrowRight size={13} className="inline ml-1" />
            </button>
            
            {/* Preview Glass Button */}
            <button
              type="button"
              className="px-6 py-2.5 rounded-xl text-xs font-bold text-white/80 transition-all duration-300 border"
              style={{
                background: 'var(--local-glass-bg)',
                backdropFilter: 'blur(28px) saturate(180%)',
                WebkitBackdropFilter: 'blur(28px) saturate(180%)',
                borderColor: 'var(--local-glass-border)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.25), var(--local-box-shadow-neon-glow, 0 0 0 transparent)',
              }}
            >
              Nút Kính mẫu
            </button>
          </div>
        </div>

        {/* Presets */}
        <div className="space-y-2.5 pt-4 border-t border-white/5">
          <label className="text-xs font-semibold text-white/60 block">Mẫu màu thiết lập sẵn (Theme Presets)</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {COLOR_PRESETS.map((preset) => {
              const isActive = primaryColor.toLowerCase() === preset.primary.toLowerCase() &&
                               gradientColor.toLowerCase() === preset.gradient.toLowerCase() &&
                               brandOpacity === preset.opacity &&
                               brandBlur === preset.blur &&
                               enableGradient === true &&
                               shadowStyle === 'soft'
              return (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => {
                    setPrimaryColor(preset.primary)
                    setGradientColor(preset.gradient)
                    setBrandOpacity(preset.opacity)
                    setBrandBlur(preset.blur)
                    setEnableGradient(true)
                    setShadowStyle('soft')
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    isActive
                      ? 'border-brand-500 bg-brand-500/10 shadow-[0_0_12px_rgba(124,58,237,0.15)]'
                      : 'border-white/5 bg-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-3.5 h-3.5 rounded-full border border-white/20" style={{ background: preset.primary }} />
                    <div className="w-3.5 h-3.5 rounded-full border border-white/20 -ml-1.5" style={{ background: preset.gradient }} />
                    <span className="text-xs font-bold text-white/80 truncate">{preset.name}</span>
                  </div>
                  <span className="text-[10px] text-white/35 leading-tight block truncate">{preset.desc}</span>
                </button>
              )
            })}

            {/* Custom Option */}
            {(() => {
              const isCustomActive = !COLOR_PRESETS.some(p => 
                p.primary.toLowerCase() === primaryColor.toLowerCase() &&
                p.gradient.toLowerCase() === gradientColor.toLowerCase() &&
                p.opacity === brandOpacity &&
                p.blur === brandBlur &&
                enableGradient === true &&
                shadowStyle === 'soft'
              )
              return (
                <button
                  type="button"
                  onClick={() => {
                    setPrimaryColor(customColors.primary)
                    setGradientColor(customColors.gradient)
                    setBrandOpacity(customColors.opacity)
                    setBrandBlur(customColors.blur)
                    setEnableGradient(customColors.enableGradient)
                    setShadowStyle(customColors.shadowStyle)
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    isCustomActive
                      ? 'border-brand-500 bg-brand-500/10 shadow-[0_0_12px_rgba(124,58,237,0.15)]'
                      : 'border-white/5 bg-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-3.5 h-3.5 rounded-full border border-white/20" style={{ background: customColors.primary }} />
                    <div className="w-3.5 h-3.5 rounded-full border border-white/20 -ml-1.5" style={{ background: customColors.gradient }} />
                    <span className="text-xs font-bold text-white/80 truncate">Custom</span>
                  </div>
                  <span className="text-[10px] text-white/35 leading-tight block truncate">Màu tùy chọn của riêng bạn</span>
                </button>
              )
            })()}
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={() => handleSaveColors()}
            disabled={colorSaving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-brand-900/30"
          >
            {colorSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            Lưu cấu hình màu
          </button>
        </div>
      </div>)}

      {/* ── Announcement Banner Card ─── */}
      {activeSubTab === 'general' && (
        <div className="card p-6 border border-white/10 space-y-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center flex-shrink-0">
            <Megaphone className="text-brand-400" size={22} />
          </div>
          <div>
            <h3 className="font-bold text-white text-base mb-1">Thông báo hệ thống (Announcement Banner)</h3>
            <p className="text-sm text-white/50 leading-relaxed">
              Hiển thị một thanh thông báo toàn trang ở đầu website cho toàn bộ người dùng.
            </p>
          </div>
        </div>

        <div className="space-y-4 pt-2">
          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
            <div>
              <span className="text-xs font-semibold text-white block">Trạng thái thông báo</span>
              <span className="text-[10px] text-white/40 block">Bật để hiển thị banner thông báo trên toàn trang</span>
            </div>
            <button
              type="button"
              onClick={() => setAnnouncementEnabled(!announcementEnabled)}
              className={`relative w-12 h-6 rounded-full border transition-all duration-300 flex-shrink-0 focus:outline-none ${
                announcementEnabled
                  ? 'bg-brand-500 border-brand-400 shadow-[0_0_12px_rgba(124,58,237,0.3)]'
                  : 'bg-white/10 border-white/20'
              }`}
            >
              <div
                className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-md transition-all duration-300"
                style={{ left: announcementEnabled ? '26px' : '2px' }}
              />
            </button>
          </div>

          {/* Text Input */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-white/60 block">Nội dung thông báo</label>
            <textarea
              value={announcementText}
              onChange={(e) => setAnnouncementText(e.target.value)}
              className="input text-xs w-full py-2 px-3 resize-none h-16"
              placeholder="Nhập nội dung hiển thị trên banner (ví dụ: Bảo trì hệ thống từ 2h - 4h sáng mai)..."
            />
          </div>

          {/* Link Input */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-white/60 block">Đường dẫn liên kết (Link URL - Tùy chọn)</label>
            <input
              type="text"
              value={announcementLink}
              onChange={(e) => setAnnouncementLink(e.target.value)}
              className="input text-xs w-full py-2 px-3"
              placeholder="https://picspy.com/news/maintenance-update (hoặc bỏ trống nếu không cần click)"
            />
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={handleSaveAnnouncement}
            disabled={announcementSaving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-brand-900/30"
          >
            {announcementSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            Lưu và áp dụng thông báo
          </button>
        </div>
      </div>)}

      {/* ── Page Specific Settings ─── */}
      {activeSubTab === 'pages' && (
        <div className="space-y-6">
          <div className="card p-5 border border-white/10 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-white text-sm mb-1 font-display">Cài đặt giao diện trang</h4>
                <p className="text-xs text-white/40">Chọn trang cụ thể bạn muốn thiết kế và thay đổi phong cách hiển thị.</p>
              </div>
              <div className="relative">
                <select
                  value={selectedConfigPage}
                  onChange={(e) => setSelectedConfigPage(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-brand-500 cursor-pointer pr-10 appearance-none min-w-[200px]"
                >
                  <option value="home" className="bg-[#121214]">🏠 Trang chủ (Home Page)</option>
                  <option value="search" className="bg-[#121214]">🔍 Trang khám phá (Search Page)</option>
                  <option value="profile" className="bg-[#121214]">👤 Trang cá nhân (Profile Page)</option>
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-white/40 text-xs">
                  ▼
                </div>
              </div>
            </div>
          </div>

          {/* Render Home Page Config */}
          {selectedConfigPage === 'home' && (
            <div className="card p-6 border-white/5 space-y-5 bg-white/[0.01]">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Palette size={16} className="text-brand-400" /> Cấu hình Giao diện Danh mục nổi bật
                  </h3>
                  <p className="text-[11px] text-white/40">Chọn kiểu hiển thị của hàng danh mục nổi bật ngoài trang chủ</p>
                </div>
                {categorySaving && (
                  <span className="flex items-center gap-1.5 text-xs text-brand-400 font-semibold">
                    <Loader2 size={12} className="animate-spin" /> Đang cập nhật...
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  {
                    key: 'style-1',
                    title: 'Style 1: Ảnh bìa Đơn (Cổ điển)',
                    desc: 'Tự động lấy 1 ảnh nổi bật nhất có lượt xem cao nhất của danh mục làm ảnh bìa.'
                  },
                  {
                    key: 'style-2',
                    title: 'Style 2: Lưới 4 ảnh nghệ thuật',
                    desc: 'Lấy top 4 ảnh nhiều views nhất sắp xếp dạng lưới Asymmetrical Staggered nghệ thuật.'
                  },
                  {
                    key: 'style-3',
                    title: 'Style 3: Slideshow tự xoay vòng',
                    desc: 'Tự động xoay vòng 5-6 ảnh nổi bật nhất sau mỗi 2 giây bằng hiệu ứng mờ dần (Fade).'
                  },
                  {
                    key: 'style-4',
                    title: 'Style 4: Lát cắt dọc tương tác',
                    desc: 'Chia card làm 3 cột dọc. Hover cột nào cột đó mở rộng (flex-grow) và hiển thị chi tiết prompt.'
                  }
                ].map((styleOpt) => (
                  <div
                    key={styleOpt.key}
                    onClick={() => !categorySaving && handleSaveCategoryStyle(styleOpt.key)}
                    className={`p-4 rounded-xl border transition-all duration-300 cursor-pointer text-left flex flex-col justify-between group min-h-[160px]
                      ${categoryStyle === styleOpt.key
                        ? 'border-brand-500 bg-brand-500/5 shadow-md shadow-brand-500/5'
                        : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'}`}
                  >
                    <div>
                      <p className={`text-xs font-bold transition-colors ${categoryStyle === styleOpt.key ? 'text-brand-300' : 'text-white group-hover:text-brand-300'}`}>
                        {styleOpt.title}
                      </p>
                      <p className="text-[10px] text-white/50 mt-2 leading-relaxed">{styleOpt.desc}</p>
                    </div>
                    <div className="flex justify-end mt-4">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border
                        ${categoryStyle === styleOpt.key
                          ? 'border-brand-500/30 bg-brand-500/10 text-brand-300'
                          : 'border-white/10 text-white/30'}`}>
                        {categoryStyle === styleOpt.key ? 'Đang hoạt động' : 'Kích hoạt'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Render other pages placeholder */}
          {selectedConfigPage !== 'home' && (
            <div className="card p-12 border border-white/5 text-center space-y-3 bg-white/[0.01]">
              <div className="text-3xl">⚙️</div>
              <h4 className="font-bold text-white text-sm">Cài đặt đang được phát triển</h4>
              <p className="text-xs text-white/40 max-w-xs mx-auto leading-relaxed">
                Các tùy chọn giao diện và phong cách hiển thị riêng cho trang này sẽ được cập nhật trong phiên bản tiếp theo.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Info card ─── */}
      <div className="card p-5 border-blue-500/20 bg-blue-500/5">
        <div className="flex gap-3">
          <Timer size={18} className="text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-400 mb-1">Gợi ý sử dụng</p>
            <ul className="text-xs text-white/50 space-y-1 list-disc list-inside">
              <li>Bật Auto-approve khi bạn muốn kiểm thử nhanh hoặc trong giai đoạn beta.</li>
              <li>Tắt trong môi trường production để kiểm soát nội dung chặt chẽ.</li>
              <li>NSFW rõ ràng (score &gt; 0.8) sẽ luôn bị từ chối, bất kể setting này.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// TAB: AUDIT LOGS
// ══════════════════════════════════════════════════════════════════
const ACTION_MAPPING = {
  POST_APPROVED: { label: 'Duyệt bài đăng', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
  POST_REJECTED: { label: 'Từ chối bài đăng', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
  POST_HIDDEN: { label: 'Ẩn bài đăng', color: 'bg-white/5 text-white/50 border-white/10' },
  POST_DELETE: { label: 'Xóa bài đăng', color: 'bg-red-500/20 text-red-300 border-red-500/30' },
  USER_TOKENS_ADJUST: { label: 'Điều chỉnh Token', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  USER_BAN: { label: 'Khóa tài khoản', color: 'bg-red-600/10 text-red-400 border-red-600/20' },
  USER_UNBAN: { label: 'Mở khóa tài khoản', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  USER_TIER_CHANGE: { label: 'Thay đổi Tier', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  USER_ROLE_CHANGE: { label: 'Thay đổi vai trò', color: 'bg-pink-500/10 text-pink-400 border-pink-500/20' },
  SYSTEM_SETTINGS_UPDATE: { label: 'Cập nhật hệ thống', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' }
}

const LogsTab = () => {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [cursor, setCursor] = useState(null)
  const [hasMore, setHasMore] = useState(false)

  const fetchLogs = useCallback(async (reset = false) => {
    if (reset) {
      setLoading(true)
      setCursor(null)
    }
    try {
      const params = { limit: 20 }
      if (!reset && cursor) params.cursor = cursor
      const { data } = await api.get('/admin/audit-logs', { params })
      setLogs(reset ? data.logs : prev => [...prev, ...data.logs])
      setHasMore(data.pagination.hasMore)
      setCursor(data.pagination.nextCursor)
    } catch (err) {
      toast.error('Không thể tải nhật ký hoạt động')
    } finally {
      setLoading(false)
    }
  }, [cursor])

  useEffect(() => {
    fetchLogs(true)
  }, []) // eslint-disable-line

  const formatDetails = (log) => {
    const { action, details } = log
    if (!details) return ''

    switch (action) {
      case 'POST_APPROVED':
        return `Bài đăng: "${details.caption || 'Không tiêu đề'}"`
      case 'POST_REJECTED':
        return `Bài đăng: "${details.caption || 'Không tiêu đề'}" ${details.rejectionReason ? `(Lý do: ${details.rejectionReason})` : ''}`
      case 'POST_HIDDEN':
        return `Bài đăng: "${details.caption || 'Không tiêu đề'}"`
      case 'POST_DELETE':
        return `Bài đăng: "${details.caption || 'Không tiêu đề'}" (Tác giả ID: ${details.authorId || 'unknown'})`
      case 'USER_TOKENS_ADJUST':
        return `Người dùng: @${details.username || 'unknown'} (${details.amount > 0 ? '+' : ''}${details.amount} tokens) - ${details.reason || 'không lý do'}`
      case 'USER_BAN':
        return `Người dùng: @${details.username || 'unknown'} ${details.durationDays ? `trong ${details.durationDays} ngày` : 'vĩnh viễn'} - Lý do: ${details.reason || 'không lý do'}`
      case 'USER_UNBAN':
        return `Người dùng: @${details.username || 'unknown'}`
      case 'USER_TIER_CHANGE':
        return `Người dùng: @${details.username || 'unknown'} (${details.previousTier} → ${details.newTier})`
      case 'USER_ROLE_CHANGE':
        return `Người dùng: @${details.username || 'unknown'} (${details.previousRole} → ${details.newRole})`
      case 'SYSTEM_SETTINGS_UPDATE':
        return `Cập nhật: ${Object.keys(details).join(', ')}`
      default:
        return JSON.stringify(details)
    }
  }

  const formatTime = (dateStr) => {
    const d = new Date(dateStr)
    const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    const date = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    return `${time} - ${date}`
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <div>
        <h2 className="font-bold text-xl text-white mb-1 font-display">Nhật ký hoạt động Admin</h2>
        <p className="text-sm text-white/40">Ghi lại toàn bộ thao tác quản lý hệ thống của Admin.</p>
      </div>

      {loading && logs.length === 0 ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card p-5 animate-pulse flex items-center justify-between gap-4">
              <div className="h-4 bg-white/10 rounded w-1/4"></div>
              <div className="h-4 bg-white/10 rounded w-1/2"></div>
              <div className="h-4 bg-white/10 rounded w-16"></div>
            </div>
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="card p-12 text-center text-white/35">
          <Clock size={40} className="mx-auto mb-3 opacity-25" />
          Nhật ký hoạt động hiện tại chưa có dữ liệu
        </div>
      ) : (
        <div className="card overflow-hidden border border-white/10 divide-y divide-white/5">
          {logs.map((log) => {
            const mapped = ACTION_MAPPING[log.action] || { label: log.action, color: 'bg-white/5 text-white border-white/10' }
            return (
              <div key={log._id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${mapped.color}`}>
                      {mapped.label}
                    </span>
                    <span className="text-[10px] text-white/35 font-medium">{formatTime(log.createdAt)}</span>
                  </div>
                  <p className="text-xs text-white/70 leading-relaxed font-medium">
                    {formatDetails(log)}
                  </p>
                </div>

                {/* Admin user info */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="text-right">
                    <span className="text-xs font-semibold text-white/80 block">@{log.adminId?.username || 'unknown'}</span>
                    <span className="text-[10px] text-white/35 block leading-none">{log.adminId?.email || ''}</span>
                  </div>
                  {log.adminId?.avatar ? (
                    <img src={log.adminId.avatar} className="w-8 h-8 rounded-full border border-white/10 object-cover" alt="" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center text-white text-xs font-bold shadow-md shadow-black/25">
                      {log.adminId?.username?.[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center pt-2">
          <button onClick={() => fetchLogs(false)} className="btn-secondary text-xs flex items-center gap-2 font-bold px-5 py-2">
            <ChevronDown size={14} /> Tải thêm nhật ký
          </button>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// MAIN AdminPage
// ══════════════════════════════════════════════════════════════════
const TABS = [
  { key: 'dashboard',  label: 'Dashboard',  Icon: BarChart3 },
  { key: 'posts',      label: 'Bài đăng',   Icon: Images },
  { key: 'users',      label: 'Users',       Icon: Users },
  { key: 'categories', label: 'Danh mục',   Icon: Tag },
  { key: 'settings',   label: 'Cài đặt',    Icon: Settings },
  { key: 'logs',       label: 'Nhật ký Admin', Icon: Clock },
]

const AdminPage = () => {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [hasUnsavedColors, setHasUnsavedColors] = useState(false)

  return (
    <AdminGuard>
      <div className="min-h-screen pb-24 md:pb-8 p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-display font-black flex items-center gap-2">
                <ShieldCheck size={24} className="text-violet-400" /> Admin Panel
              </h1>
              <p className="text-white/40 text-sm mt-0.5">Quản lý nội dung và người dùng PicSpy</p>
            </div>
          </motion.div>

          {/* Tabs */}
          <div className="flex gap-1 mb-6 bg-surface-50 p-1 rounded-2xl border border-white/10 w-fit flex-wrap">
            {TABS.map(({ key, label, Icon }) => (
              <button key={key} onClick={() => {
                if (activeTab === 'settings' && key !== 'settings' && hasUnsavedColors) {
                  if (!window.confirm('Cấu hình màu của bạn chưa được lưu. Bạn có chắc chắn muốn rời đi?')) {
                    return
                  }
                  setHasUnsavedColors(false)
                }
                setActiveTab(key)
              }}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all
                  ${activeTab === key ? 'bg-brand-600 text-white shadow-[0_0_20px_rgba(124,58,237,0.3)]' : 'text-white/50 hover:text-white/80'}`}>
                <Icon size={16} />{label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
              {activeTab === 'dashboard'  && <DashboardTab />}
              {activeTab === 'posts'      && <PostsTab />}
              {activeTab === 'users'      && <UsersTab />}
              {activeTab === 'categories' && <CategoriesTab />}
              {activeTab === 'settings'   && <SettingsTab onDirtyChange={setHasUnsavedColors} />}
              {activeTab === 'logs'       && <LogsTab />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </AdminGuard>
  )
}

export default AdminPage
