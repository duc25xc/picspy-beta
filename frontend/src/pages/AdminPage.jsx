import { useState, useEffect, useCallback, useRef } from 'react'
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
  ChevronLeft,
  ChevronRight,
  Search,
  BarChart3,
  AlertTriangle,
  Plus,
  Minus,
  Tag,
  Pencil,
  Trash2,
  Eye,
  TrendingUp,
  ToggleLeft,
  ToggleRight,
  Check,
  Square,
  CheckSquare,
  X,
  Save,
  Loader2,
  Settings,
  Zap,
  ZapOff,
  Timer,
  UserCheck,
  Shield,
  Palette,
  ArrowRight,
  Megaphone,
  Wallet,
  Flag,
  Heart,
  Calendar,
  ArrowUpDown,
  Image,
  Hourglass,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/api'
import useAuthStore from '../store/auth.store'
import { Navigate } from 'react-router-dom'
import { useSettings } from '../context/SettingsContext'
import { getOptimizedWebpUrl } from '../utils/imageUrl'
import ExifPanel from '../components/post/ExifPanel'
// ─── Guard ─────────────────────────────────────────────────────
const AdminGuard = ({ children }) => {
  const user = useAuthStore((s) => s.user)
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'admin') return <Navigate to="/" replace />
  return children
}

// ─── Stat Card ─────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, color = 'text-white', sub }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    className="card p-5"
  >
    <div className="flex items-center justify-between mb-3">
      <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">
        {label}
      </span>
      <Icon size={18} className={color} />
    </div>
    <p className={`text-3xl font-black ${color}`}>
      {value?.toLocaleString() ?? '—'}
    </p>
    {sub && <p className="text-xs text-white/30 mt-1">{sub}</p>}
  </motion.div>
)

// ─── Status Badge ───────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const map = {
    approved: {
      label: 'Đã duyệt',
      cls: 'bg-green-500/15 text-green-400 border-green-500/30',
      Icon: CheckCircle,
    },
    pending: {
      label: 'Chờ duyệt',
      cls: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
      Icon: Clock,
    },
    rejected: {
      label: 'Từ chối',
      cls: 'bg-red-500/15 text-red-400 border-red-500/30',
      Icon: XCircle,
    },
    hidden: {
      label: 'Đã ẩn',
      cls: 'bg-white/5 text-white/40 border-white/10',
      Icon: EyeOff,
    },
  }
  const { label, cls, Icon: I } = map[status] || map.pending
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${cls}`}
    >
      <I size={11} />
      {label}
    </span>
  )
}

// ─── Mini SVG Chart ─────────────────────────────────────────────
const MiniBarChart = ({
  data = [],
  dataKey = 'posts',
  color = '#7c3aed',
  label = '',
}) => {
  const max = Math.max(...data.map((d) => d[dataKey]), 1)
  const w = 100 / data.length

  return (
    <div className="relative">
      <div className="flex items-end gap-0.5 h-20">
        {data.map((d, i) => {
          const pct = (d[dataKey] / max) * 100
          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center justify-end group relative"
            >
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
        <span className="text-[10px] text-white/30">
          {data[data.length - 1]?.label}
        </span>
      </div>
    </div>
  )
}

// ─── Style Preview Mockup Component ─────────────────────────────
const StylePreview = ({ styleKey }) => {
  return (
    <div className="w-full h-24 bg-black/40 rounded-lg border border-white/5 p-1 flex flex-col justify-between mt-3 overflow-hidden relative group-hover:border-white/10 transition-colors">
      {/* Visual representation */}
      {styleKey === 'style-1' && (
        <div className="w-full h-full rounded-md bg-gradient-to-br from-brand-600/30 to-violet-500/10 relative overflow-hidden">
          <div className="absolute inset-0 bg-white/5 blur-[2px]" />
          {/* Label mockup */}
          <div className="absolute bottom-1.5 left-1.5 right-1.5 h-3 bg-white/10 border border-white/10 rounded-sm" />
        </div>
      )}

      {styleKey === 'style-2' && (
        <div className="w-full h-full grid grid-cols-2 gap-0.5 bg-white/[0.02]">
          <div className="flex flex-col gap-0.5 h-full">
            <div className="flex-[3] bg-gradient-to-br from-brand-600/40 to-violet-500/20 rounded-[2px]" />
            <div className="flex-[2] bg-gradient-to-br from-blue-600/30 to-sky-500/15 rounded-[2px]" />
          </div>
          <div className="flex flex-col gap-0.5 h-full">
            <div className="flex-[2] bg-gradient-to-br from-fuchsia-600/30 to-pink-500/15 rounded-[2px]" />
            <div className="flex-[3] bg-gradient-to-br from-indigo-600/40 to-purple-500/20 rounded-[2px]" />
          </div>
          {/* Label mockup */}
          <div className="absolute bottom-1.5 left-1.5 right-1.5 h-3 bg-white/10 border border-white/10 rounded-sm z-10" />
        </div>
      )}

      {styleKey === 'style-3' && (
        <div className="w-full h-full flex items-center justify-center relative overflow-hidden bg-white/[0.02]">
          <div className="absolute w-[80%] h-[80%] bg-gradient-to-br from-brand-600/40 to-violet-500/20 rounded shadow-lg z-10" />
          <div className="absolute w-[70%] h-[70%] bg-gradient-to-br from-blue-600/20 to-sky-500/10 rounded translate-x-2 -translate-y-1 rotate-[2deg] opacity-70" />
          <div className="absolute w-[70%] h-[70%] bg-gradient-to-br from-fuchsia-600/20 to-pink-500/10 rounded -translate-x-2 -translate-y-1 -rotate-[2deg] opacity-70" />
          {/* Label mockup */}
          <div className="absolute bottom-1.5 left-1.5 right-1.5 h-3 bg-white/15 border border-white/10 rounded-sm z-20" />
        </div>
      )}

      {styleKey === 'style-4' && (
        <div className="w-full h-full flex gap-0.5 bg-white/[0.02]">
          <div className="h-full flex-1 bg-gradient-to-br from-blue-600/30 to-sky-500/15 rounded-[2px] transition-all" />
          <div className="h-full flex-[2.5] bg-gradient-to-br from-brand-600/40 to-violet-500/25 rounded-[2px] border border-brand-500/20 relative">
            <div className="absolute inset-x-0.5 bottom-0.5 h-2 bg-white/20 rounded-[1px]" />
          </div>
          <div className="h-full flex-1 bg-gradient-to-br from-fuchsia-600/30 to-pink-500/15 rounded-[2px] transition-all" />
        </div>
      )}
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
    ])
      .then(([s, a]) => {
        setStats(s.data)
        setAnalytics(a.data)
      })
      .finally(() => setLoading(false))
  }, [days])

  return (
    <div className="space-y-6">
      {/* Admin balance */}
      <div className="card p-5 border-violet-500/30 bg-violet-600/10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-violet-400 mb-1">
              Số dư token của Admin
            </p>
            <p className="text-4xl font-black text-white">
              {adminUser?.tokenBalance?.toLocaleString() ?? 0}{' '}
              <span className="text-violet-400 text-2xl">token</span>
            </p>
            <p className="text-xs text-white/40 mt-1">
              Dùng để test download Premium
            </p>
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
      ) : (
        stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatCard
              icon={Images}
              label="Tổng bài đăng"
              value={stats.totalPosts}
            />
            <StatCard
              icon={Clock}
              label="Chờ duyệt"
              value={stats.pendingPosts}
              color="text-yellow-400"
              sub="Cần xử lý ngay"
            />
            <StatCard
              icon={CheckCircle}
              label="Đã duyệt"
              value={stats.totalApproved}
              color="text-green-400"
            />
            <StatCard
              icon={Users}
              label="Tổng users"
              value={stats.totalUsers}
              color="text-blue-400"
            />
            <StatCard
              icon={Images}
              label="Posts 7 ngày"
              value={stats.recentPosts}
              color="text-violet-400"
              sub="7 ngày gần nhất"
            />
            <StatCard
              icon={Users}
              label="User mới"
              value={stats.recentUsers}
              color="text-pink-400"
              sub="7 ngày gần nhất"
            />
          </div>
        )
      )}

      {/* Analytics Chart */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold flex items-center gap-2">
            <TrendingUp size={16} className="text-violet-400" /> Thống kê hoạt
            động
          </h3>
          <div className="flex gap-1">
            {[7, 14, 30].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${days === d ? 'bg-brand-600 text-white' : 'text-white/40 hover:text-white'}`}
              >
                {d}N
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="h-28 animate-pulse rounded-xl bg-white/5" />
        ) : (
          analytics?.timeline?.length > 0 && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-white/40 mb-2 font-semibold">
                  📸 Bài đăng mới
                </p>
                <MiniBarChart
                  data={analytics.timeline}
                  dataKey="posts"
                  color="#7c3aed"
                  label="posts"
                />
              </div>
              <div>
                <p className="text-xs text-white/40 mb-2 font-semibold">
                  👤 Users mới
                </p>
                <MiniBarChart
                  data={analytics.timeline}
                  dataKey="users"
                  color="#06b6d4"
                  label="users"
                />
              </div>
            </div>
          )
        )}

        {/* Category breakdown */}
        {analytics?.categoryStats?.length > 0 && (
          <div>
            <p className="text-xs text-white/40 mb-3 font-semibold">
              📂 Phân bổ danh mục (approved)
            </p>
            <div className="space-y-2">
              {analytics.categoryStats.slice(0, 5).map((c) => {
                const total = analytics.categoryStats.reduce(
                  (s, x) => s + x.count,
                  0
                )
                const pct = Math.round((c.count / total) * 100)
                return (
                  <div key={c._id} className="flex items-center gap-3">
                    <span className="text-xs text-white/50 w-20 truncate capitalize">
                      {c._id}
                    </span>
                    <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-500 rounded-full transition-all duration-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-white/40 w-10 text-right">
                      {pct}%
                    </span>
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
            <AlertTriangle
              size={18}
              className="text-yellow-400 mt-0.5 flex-shrink-0"
            />
            <div>
              <p className="text-sm font-semibold text-yellow-400">
                Bài đăng chờ duyệt
              </p>
              <p className="text-xs text-white/40 mt-0.5">
                Có{' '}
                <span className="text-yellow-400 font-bold">
                  {stats.pendingPosts}
                </span>{' '}
                bài đăng đang chờ. Vào tab "Bài đăng" để xử lý.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const previewSlideVariants = {
  enter: (d) => ({ opacity: 0, x: d > 0 ? 30 : -30 }),
  center: { opacity: 1, x: 0 },
  exit: (d) => ({ opacity: 0, x: d > 0 ? -30 : 30 }),
}

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
  const [previewModal, setPreviewModal] = useState(null)
  const [previewTab, setPreviewTab] = useState('result')
  const [previewImgIndex, setPreviewImgIndex] = useState(0)
  const [previewDirection, setPreviewDirection] = useState(1)

  useEffect(() => {
    setPreviewTab('result')
    setPreviewImgIndex(0)
  }, [previewModal])

  const getResultImages = useCallback((post) => {
    if (!post) return []
    const list = []
    if (post.generatedImages && post.generatedImages.length > 0) {
      post.generatedImages.forEach((img) => {
        list.push({ ...img, aiTool: post.aiTool, aiModel: post.aiModel })
      })
    } else if (post.images && post.images.length > 0) {
      post.images.forEach((img) => {
        list.push({ ...img })
      })
    }

    if (
      post.isMultiModel &&
      post.modelComparisons &&
      post.modelComparisons.length > 0
    ) {
      post.modelComparisons.forEach((comp) => {
        if (comp.generatedImages && comp.generatedImages.length > 0) {
          comp.generatedImages.forEach((img) => {
            const exists = list.some(
              (existing) =>
                (existing.publicId && existing.publicId === img.publicId) ||
                (existing.url && existing.url === img.url)
            )
            if (!exists) {
              list.push({
                ...img,
                aiTool: comp.aiTool,
                aiModel: comp.aiModel,
              })
            }
          })
        }
      })
    }
    return list
  }, [])
  // Bulk select
  const [selected, setSelected] = useState(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)

  // Buff stats state
  const [buffModal, setBuffModal] = useState(null)
  const [buffViews, setBuffViews] = useState(0)
  const [buffDownloads, setBuffDownloads] = useState(0)
  const [buffLikes, setBuffLikes] = useState(0)
  const [buffBookmarks, setBuffBookmarks] = useState(0)
  const [buffLoading, setBuffLoading] = useState(false)

  const handleBuffStats = async () => {
    if (!buffModal) return
    setBuffLoading(true)
    try {
      const { data } = await api.post(`/admin/posts/${buffModal._id}/buff`, {
        views: buffViews,
        downloads: buffDownloads,
        likes: buffLikes,
        bookmarks: buffBookmarks,
      })
      toast.success(data.message || '✅ Đã buff chỉ số thành công!')
      setPosts((prev) =>
        prev.map((p) => {
          if (p._id === buffModal._id) {
            return {
              ...p,
              stats: {
                ...p.stats,
                viewsCount: (p.stats?.viewsCount || 0) + Number(buffViews),
                downloadsCount:
                  (p.stats?.downloadsCount || 0) + Number(buffDownloads),
                likesCount: (p.stats?.likesCount || 0) + Number(buffLikes),
                bookmarksCount:
                  (p.stats?.bookmarksCount || 0) + Number(buffBookmarks),
              },
            }
          }
          return p
        })
      )
      setBuffModal(null)
      setBuffViews(0)
      setBuffDownloads(0)
      setBuffLikes(0)
      setBuffBookmarks(0)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi buff chỉ số')
    } finally {
      setBuffLoading(false)
    }
  }

  const STATUS_TABS = [
    { key: 'pending', label: 'Chờ duyệt', color: 'text-yellow-400' },
    { key: 'approved', label: 'Đã duyệt', color: 'text-green-400' },
    { key: 'rejected', label: 'Từ chối', color: 'text-red-400' },
    { key: 'hidden', label: 'Đã ẩn', color: 'text-white/40' },
    { key: 'all', label: 'Tất cả', color: 'text-white' },
  ]

  const fetchPosts = useCallback(
    async (reset = false) => {
      if (reset) {
        setLoading(true)
        setCursor(null)
        setSelected(new Set())
      }
      try {
        const params = { status: activeStatus, limit: 12 }
        if (!reset && cursor) params.cursor = cursor
        const { data } = await api.get('/admin/posts', { params })
        setPosts(reset ? data.posts : (p) => [...p, ...data.posts])
        setStats(data.stats || {})
        setHasMore(data.pagination.hasMore)
        setCursor(data.pagination.nextCursor)
      } catch {
        toast.error('Không thể tải bài đăng')
      } finally {
        setLoading(false)
      }
    },
    [activeStatus, cursor]
  )

  useEffect(() => {
    fetchPosts(true)
  }, [activeStatus]) // eslint-disable-line

  const toggleSelect = (id) =>
    setSelected((prev) => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  const toggleAll = () =>
    setSelected(
      selected.size === posts.length
        ? new Set()
        : new Set(posts.map((p) => p._id))
    )

  const handleStatus = async (postId, status, reason = '') => {
    setActionLoading(postId)
    try {
      await api.patch(`/admin/posts/${postId}/status`, {
        status,
        rejectionReason: reason,
      })
      setPosts((prev) => prev.filter((p) => p._id !== postId))
      toast.success(
        `✅ Đã ${status === 'approved' ? 'duyệt' : status === 'rejected' ? 'từ chối' : 'ẩn'}`
      )
      setRejectModal(null)
      setRejectReason('')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi')
    } finally {
      setActionLoading(null)
    }
  }

  const handleBulk = async (status) => {
    if (selected.size === 0) return
    setBulkLoading(true)
    try {
      const { data } = await api.post('/admin/posts/bulk', {
        postIds: [...selected],
        status,
      })
      toast.success(`✅ ${data.message}`)
      setPosts((prev) => prev.filter((p) => !selected.has(p._id)))
      setSelected(new Set())
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi bulk action')
    } finally {
      setBulkLoading(false)
    }
  }

  const handleDeletePost = async (postId) => {
    const confirm = window.confirm(
      'Bạn có chắc chắn muốn xóa bài đăng này vĩnh viễn? Hành động này không thể hoàn tác.'
    )
    if (!confirm) return

    setActionLoading(postId)
    try {
      await api.delete(`/posts/${postId}`)
      setPosts((prev) => prev.filter((p) => p._id !== postId))
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
          <button
            key={key}
            onClick={() => setActiveStatus(key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border flex items-center gap-2
              ${activeStatus === key ? 'bg-brand-600 border-brand-500 text-white' : 'bg-surface-50 border-white/10 text-white/60 hover:border-white/20'}`}
          >
            <span className={color}>{label}</span>
            {stats[key] > 0 && (
              <span className="bg-white/15 text-xs px-1.5 py-0.5 rounded-full font-bold">
                {stats[key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Bulk action bar */}
      <AnimatePresence>
        {posts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10"
          >
            <button
              onClick={toggleAll}
              className="flex items-center gap-2 text-xs text-white/60 hover:text-white transition-colors"
            >
              {selected.size === posts.length ? (
                <CheckSquare size={15} className="text-brand-400" />
              ) : (
                <Square size={15} />
              )}
              {selected.size > 0 ? `${selected.size} đã chọn` : 'Chọn tất cả'}
            </button>

            {selected.size > 0 && (
              <div className="flex gap-2 ml-auto">
                {bulkLoading ? (
                  <Loader2 size={16} className="animate-spin text-white/40" />
                ) : (
                  <>
                    <button
                      onClick={() => handleBulk('approved')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-600/20 border border-green-500/30 text-green-400 text-xs font-bold hover:bg-green-600/30 transition-all"
                    >
                      <CheckCircle size={12} /> Duyệt ({selected.size})
                    </button>
                    <button
                      onClick={() => handleBulk('rejected')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600/20 border border-red-500/30 text-red-400 text-xs font-bold hover:bg-red-600/30 transition-all"
                    >
                      <XCircle size={12} /> Từ chối ({selected.size})
                    </button>
                    <button
                      onClick={() => handleBulk('hidden')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white/40 text-xs font-bold hover:text-white/60 transition-all"
                    >
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
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl bg-surface-100 animate-pulse aspect-square"
            />
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
              const img = post.generatedImages?.[0] || post.images?.[0]
              const isActing = actionLoading === post._id
              const isSelected = selected.has(post._id)
              return (
                <motion.div
                  key={post._id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`card overflow-hidden transition-all ${isSelected ? 'ring-2 ring-brand-500' : ''}`}
                >
                  {/* Thumbnail */}
                  <div
                    className="relative aspect-video bg-surface-100 cursor-pointer group/thumb overflow-hidden"
                    onClick={() => setPreviewModal(post)}
                  >
                    {(img?.thumbnailUrl || img?.url) && (
                      <img
                        src={getOptimizedWebpUrl(
                          img.thumbnailUrl || img.url,
                          400
                        )}
                        alt=""
                        className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    )}
                    {/* Hover preview indicator */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity duration-200">
                      <span className="text-[10px] font-bold text-white bg-black/60 px-2.5 py-1.5 rounded-xl border border-white/10 flex items-center gap-1 shadow-md">
                        <Eye size={12} /> Xem chi tiết
                      </span>
                    </div>
                    {/* Select checkbox */}
                    <button
                      onClick={() => toggleSelect(post._id)}
                      className="absolute top-2 left-2 w-6 h-6 rounded-lg bg-black/50 backdrop-blur-sm flex items-center justify-center border border-white/20 transition-all hover:border-brand-400"
                    >
                      {isSelected ? (
                        <Check size={13} className="text-brand-400" />
                      ) : (
                        <Square size={11} className="text-white/50" />
                      )}
                    </button>
                    <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
                      <StatusBadge status={post.status} />
                      {post.postType && (
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wide border backdrop-blur-sm ${
                            post.postType === 'ai'
                              ? 'bg-violet-900/60 text-violet-200 border-violet-500/30'
                              : post.postType === 'digital-raw'
                                ? 'bg-sky-900/60 text-sky-200 border-sky-500/30'
                                : 'bg-emerald-950/60 text-emerald-200 border-emerald-500/30'
                          }`}
                        >
                          {post.postType === 'ai'
                            ? '✦ AI'
                            : post.postType === 'digital-raw'
                              ? '📷 RAW'
                              : 'DIGITAL'}
                        </span>
                      )}
                    </div>
                    {post.isNSFW && (
                      <div className="absolute bottom-2 left-2">
                        <span className="bg-red-600/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                          NSFW
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      {post.authorId?.avatar ? (
                        <img
                          src={post.authorId.avatar}
                          className="w-7 h-7 rounded-full object-cover"
                          alt=""
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-600 to-blue-500 flex items-center justify-center text-white text-xs font-bold">
                          {post.authorId?.username?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                      <span className="text-sm font-semibold text-white/80">
                        @{post.authorId?.username || 'unknown'}
                      </span>
                    </div>
                    {/* Caption — placeholder nếu không có text */}
                    <p
                      className="text-xs line-clamp-2 min-h-[2.5rem] flex items-center cursor-pointer hover:text-white transition-colors"
                      onClick={() => setPreviewModal(post)}
                    >
                      {post.caption ? (
                        <span className="text-white/50">{post.caption}</span>
                      ) : (
                        <span className="text-white/20 italic">
                          Không có tiêu đề
                        </span>
                      )}
                    </p>
                    {post.rejectionReason && (
                      <p className="text-xs text-red-400/70 italic">
                        ⚠ {post.rejectionReason}
                      </p>
                    )}

                    {/* Stats display */}
                    <div className="flex items-center gap-3 text-[10px] text-white/40 border-t border-white/5 pt-2">
                      <span title="Lượt xem">
                        👁 {post.stats?.viewsCount || 0}
                      </span>
                      <span title="Lượt tải">
                        ⬇ {post.stats?.downloadsCount || 0}
                      </span>
                      <span title="Yêu thích">
                        ❤ {post.stats?.likesCount || 0}
                      </span>
                      <span title="Bookmarks">
                        🔖 {post.stats?.bookmarksCount || 0}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1.5 pt-1">
                      {post.status !== 'approved' && (
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleStatus(post._id, 'approved')}
                          disabled={isActing}
                          className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl bg-green-600/20 border border-green-500/30 text-green-400 hover:bg-green-600/30 transition-all text-xs font-semibold disabled:opacity-50"
                        >
                          <CheckCircle size={13} /> Duyệt
                        </motion.button>
                      )}
                      {post.status !== 'rejected' && (
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setRejectModal(post)}
                          disabled={isActing}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-red-600/20 border border-red-500/30 text-red-400 hover:bg-red-600/30 transition-all text-xs font-semibold disabled:opacity-50"
                        >
                          <XCircle size={13} /> Từ chối
                        </motion.button>
                      )}
                      {post.status !== 'hidden' && (
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleStatus(post._id, 'hidden')}
                          disabled={isActing}
                          className="flex items-center justify-center gap-1 py-2 px-2.5 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white/60 transition-all text-xs disabled:opacity-50"
                          title="Ẩn bài đăng"
                        >
                          <EyeOff size={13} />
                        </motion.button>
                      )}
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setBuffModal(post)
                          setBuffViews(0)
                          setBuffDownloads(0)
                          setBuffLikes(0)
                          setBuffBookmarks(0)
                        }}
                        disabled={isActing}
                        className="flex items-center justify-center gap-1 py-2 px-2.5 rounded-xl bg-yellow-600/10 border border-yellow-500/20 text-yellow-400 hover:bg-yellow-600/20 transition-all text-xs disabled:opacity-50"
                        title="Buff chỉ số"
                      >
                        <Zap size={13} />
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleDeletePost(post._id)}
                        disabled={isActing}
                        className="flex items-center justify-center gap-1 py-2 px-2.5 rounded-xl bg-red-600/10 border border-red-500/20 text-red-400 hover:bg-red-600/20 transition-all text-xs disabled:opacity-50"
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
          <button
            onClick={() => fetchPosts(false)}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <ChevronDown size={16} /> Tải thêm
          </button>
        </div>
      )}

      {/* Buff stats modal */}
      <AnimatePresence>
        {buffModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm !mt-0"
            onClick={(e) => e.target === e.currentTarget && setBuffModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9 }}
              className="card p-6 max-w-sm w-full space-y-4"
            >
              <div>
                <h3 className="font-bold text-lg text-white flex items-center gap-2">
                  <Zap size={18} className="text-yellow-400" /> Buff Chỉ Số Tác
                  Phẩm
                </h3>
                <p className="text-xs text-white/40 mt-1">
                  Cộng thêm số lượng ảo để thử nghiệm logic Trending
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-white/60 font-semibold block mb-1">
                    Cộng thêm lượt xem (Views)
                  </label>
                  <input
                    type="number"
                    className="input"
                    value={buffViews}
                    onChange={(e) =>
                      setBuffViews(Math.max(0, parseInt(e.target.value) || 0))
                    }
                  />
                </div>
                <div>
                  <label className="text-xs text-white/60 font-semibold block mb-1">
                    Cộng thêm lượt tải (Downloads)
                  </label>
                  <input
                    type="number"
                    className="input"
                    value={buffDownloads}
                    onChange={(e) =>
                      setBuffDownloads(
                        Math.max(0, parseInt(e.target.value) || 0)
                      )
                    }
                  />
                </div>
                <div>
                  <label className="text-xs text-white/60 font-semibold block mb-1">
                    Cộng thêm lượt tim (Likes)
                  </label>
                  <input
                    type="number"
                    className="input"
                    value={buffLikes}
                    onChange={(e) =>
                      setBuffLikes(Math.max(0, parseInt(e.target.value) || 0))
                    }
                  />
                </div>
                <div>
                  <label className="text-xs text-white/60 font-semibold block mb-1">
                    Cộng thêm bookmark
                  </label>
                  <input
                    type="number"
                    className="input"
                    value={buffBookmarks}
                    onChange={(e) =>
                      setBuffBookmarks(
                        Math.max(0, parseInt(e.target.value) || 0)
                      )
                    }
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setBuffModal(null)}
                  className="btn-secondary flex-1"
                  disabled={buffLoading}
                >
                  Hủy
                </button>
                <button
                  onClick={handleBuffStats}
                  disabled={buffLoading}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-yellow-600 hover:bg-yellow-500 text-white font-bold text-sm transition-colors flex items-center justify-center gap-1"
                >
                  {buffLoading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    'Xác nhận Buff'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reject modal */}
      <AnimatePresence>
        {rejectModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm !mt-0"
            onClick={(e) =>
              e.target === e.currentTarget && setRejectModal(null)
            }
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9 }}
              className="card p-6 max-w-sm w-full"
            >
              <h3 className="font-bold text-lg mb-1">Từ chối bài đăng</h3>
              <p className="text-sm text-white/40 mb-4">
                Nhập lý do từ chối (tùy chọn)
              </p>
              <textarea
                className="input resize-none mb-4"
                rows={3}
                placeholder="Ảnh vi phạm quy định, nội dung không phù hợp..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setRejectModal(null)
                    setRejectReason('')
                  }}
                  className="btn-secondary flex-1"
                >
                  Hủy
                </button>
                <button
                  onClick={() =>
                    handleStatus(rejectModal._id, 'rejected', rejectReason)
                  }
                  className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-colors"
                >
                  Xác nhận từ chối
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Post Preview Modal */}
      <AnimatePresence>
        {previewModal && (() => {
          const resultImages = getResultImages(previewModal)
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm !mt-0"
              onClick={(e) =>
                e.target === e.currentTarget && setPreviewModal(null)
              }
            >
              <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95 }}
                className="card overflow-hidden max-w-6xl w-full grid grid-cols-1 md:grid-cols-2 bg-[#121216] border border-white/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] rounded-2xl h-[760px] max-h-[92vh]"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Left Column: Image viewport with Tab Switcher & Slider */}
                <div className="relative h-full bg-black/85 flex flex-col items-center justify-center border-r border-white/5 overflow-hidden group/left">
                  {/* Ambient glow background */}
                  {(() => {
                    const list =
                      previewTab === 'result'
                        ? resultImages
                        : previewModal.sourceImages || []
                    const activeImage = list[previewImgIndex]
                    return activeImage?.url ? (
                      <div
                        className="absolute inset-0 opacity-15 scale-110 pointer-events-none transition-all duration-500"
                        style={{
                          backgroundImage: `url(${activeImage.thumbnailUrl || activeImage.url})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          filter: 'blur(28px)',
                        }}
                      />
                    ) : null
                  })()}

                  {/* Image count badge in top right */}
                  {(() => {
                    const list =
                      previewTab === 'result'
                        ? resultImages
                        : previewModal.sourceImages || []
                    if (list.length <= 1) return null
                    return (
                      <div className="absolute top-4 right-4 z-10 px-2.5 py-1 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-bold text-white shadow-md flex items-center gap-1">
                        <Image size={11} className="text-white" />
                        <span>
                          {previewImgIndex + 1} / {list.length}
                        </span>
                      </div>
                    )
                  })()}
                  {/* Segmented Control / Tabs for Result vs Source (only if source images exist) */}
                  {previewModal.sourceImages &&
                    previewModal.sourceImages.length > 0 && (
                      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex p-1 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-xs font-semibold">
                        <button
                          onClick={() => {
                            setPreviewDirection(1)
                            setPreviewTab('result')
                            setPreviewImgIndex(0)
                          }}
                          className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                            previewTab === 'result'
                              ? 'bg-brand-600 text-white shadow-sm'
                              : 'text-white/40 hover:text-white/80'
                          }`}
                        >
                          Kết quả ({resultImages.length})
                        </button>
                        <button
                          onClick={() => {
                            setPreviewDirection(1)
                            setPreviewTab('source')
                            setPreviewImgIndex(0)
                          }}
                          className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                            previewTab === 'source'
                              ? 'bg-brand-600 text-white shadow-sm'
                              : 'text-white/40 hover:text-white/80'
                          }`}
                        >
                          Ảnh gốc ({previewModal.sourceImages.length})
                        </button>
                      </div>
                    )}

                  {/* Main Viewport */}
                  <div className="flex-1 w-full flex items-center justify-center relative overflow-hidden">
                    <AnimatePresence initial={false} custom={previewDirection} mode="wait">
                      {(() => {
                        const list =
                          previewTab === 'result'
                            ? resultImages
                            : previewModal.sourceImages || []
                        const activeImage = list[previewImgIndex]

                        if (!activeImage?.url) {
                          return (
                            <motion.div
                              key="empty"
                              className="text-white/25 text-xs italic"
                            >
                              Không có hình ảnh
                            </motion.div>
                          )
                        }

                        return (
                          <motion.div
                            key={`${previewTab}-${previewImgIndex}`}
                            custom={previewDirection}
                            variants={previewSlideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                            className="absolute inset-0 w-full h-full flex items-center justify-center p-4"
                          >
                            <div className="relative max-w-full max-h-full flex items-center justify-center select-none">
                              <img
                                src={activeImage.url}
                                alt=""
                                className="max-w-full max-h-[660px] object-contain rounded-lg shadow-2xl border border-white/5"
                                draggable={false}
                              />
                              {/* Image dimension & file info overlay in bottom center */}
                              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded bg-black/75 text-[10px] text-white/50 border border-white/5 backdrop-blur-sm whitespace-nowrap z-20">
                                {activeImage.width && activeImage.height
                                  ? `${activeImage.width}x${activeImage.height}`
                                  : ''}
                                {activeImage.fileSize
                                  ? ` · ${(activeImage.fileSize / 1024 / 1024).toFixed(2)} MB`
                                  : ''}
                              </div>
                            </div>
                          </motion.div>
                        )
                      })()}
                    </AnimatePresence>
                  </div>

                  {/* Left/Right arrows if current tab has multiple images */}
                  {(() => {
                    const list =
                      previewTab === 'result'
                        ? resultImages
                        : previewModal.sourceImages || []
                    if (list.length <= 1) return null
                    return (
                      <>
                        <button
                          onClick={() => {
                            setPreviewDirection(-1)
                            setPreviewImgIndex((prev) =>
                              prev === 0 ? list.length - 1 : prev - 1
                            )
                          }}
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-black/80 transition-all cursor-pointer opacity-0 group-hover/left:opacity-100 z-30"
                        >
                          <ChevronLeft size={18} />
                        </button>
                        <button
                          onClick={() => {
                            setPreviewDirection(1)
                            setPreviewImgIndex((prev) =>
                              prev === list.length - 1 ? 0 : prev + 1
                            )
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-black/80 transition-all cursor-pointer opacity-0 group-hover/left:opacity-100 z-30"
                        >
                          <ChevronRight size={18} />
                        </button>
                        {/* Pagination dots */}
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1 z-10 bg-black/45 px-2 py-1 rounded-full border border-white/5">
                          {list.map((_, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                setPreviewDirection(idx > previewImgIndex ? 1 : -1)
                                setPreviewImgIndex(idx)
                              }}
                              className={`w-1.5 h-1.5 rounded-full transition-all cursor-pointer ${
                                previewImgIndex === idx
                                  ? 'bg-brand-500 scale-125'
                                  : 'bg-white/20'
                              }`}
                            />
                          ))}
                        </div>
                      </>
                    )
                  })()}

                  {previewModal.isNSFW && (
                    <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-red-600/90 text-white text-[10px] font-bold shadow-md z-10">
                      NSFW
                    </span>
                  )}
                </div>

                {/* Right Column: Information & Metadata */}
                <div className="flex flex-col h-full overflow-y-auto p-6 space-y-5 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
                  {/* Author & Header */}
                  <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <div className="flex items-center gap-3">
                      {previewModal.authorId?.avatar ? (
                        <img
                          src={previewModal.authorId.avatar}
                          className="w-9 h-9 rounded-full object-cover ring-1 ring-white/10"
                          alt=""
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-600 to-blue-500 flex items-center justify-center text-white text-sm font-bold">
                          {previewModal.authorId?.username?.[0]?.toUpperCase() ||
                            '?'}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-bold text-white leading-tight">
                          {previewModal.authorId?.displayName ||
                            previewModal.authorId?.username}
                        </p>
                        <p className="text-[11px] text-white/40">
                          @{previewModal.authorId?.username}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setPreviewModal(null)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors cursor-pointer"
                    >
                      <X size={15} />
                    </button>
                  </div>

                  {/* Caption */}
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold text-white/35 uppercase tracking-wider">
                      Tiêu đề / Caption
                    </h3>
                    <p className="text-sm text-white/95 font-medium leading-relaxed">
                      {previewModal.caption || (
                        <span className="text-white/20 italic">
                          Không có tiêu đề
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Tags */}
                  {previewModal.tags && previewModal.tags.length > 0 && (
                    <div className="space-y-1.5">
                      <h3 className="text-xs font-bold text-white/35 uppercase tracking-wider">
                        Thẻ (Tags)
                      </h3>
                      <div className="flex flex-wrap gap-1.5">
                        {previewModal.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md bg-white/5 border border-white/8 text-[11px] text-white/60 font-semibold hover:border-white/20 transition-colors"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Details grid */}
                  <div className="grid grid-cols-2 gap-4 bg-white/[0.01] border border-white/5 rounded-xl p-4 text-xs">
                    <div>
                      <span className="text-white/40 block mb-0.5">
                        Trạng thái
                      </span>
                      <StatusBadge status={previewModal.status} />
                    </div>
                    <div>
                      <span className="text-white/40 block mb-0.5">
                        Loại bài đăng
                      </span>
                      <span className="font-bold text-brand-300">
                        {previewModal.postType === 'ai'
                          ? '✦ AI'
                          : previewModal.postType === 'digital-raw'
                            ? '📷 RAW'
                            : 'DIGITAL'}
                        {resultImages.length > 1 &&
                          ` (Bộ sưu tập ${resultImages.length} ảnh)`}
                      </span>
                    </div>
                    <div>
                      <span className="text-white/40 block mb-0.5">
                        Premium / Giá bán
                      </span>
                      <span
                        className={
                          previewModal.isPremium
                            ? 'text-amber-400 font-bold'
                            : 'text-white/40'
                        }
                      >
                        {previewModal.isPremium
                          ? `💎 Có (${previewModal.price || 0} tokens)`
                          : 'Không'}
                      </span>
                    </div>
                    <div>
                      <span className="text-white/40 block mb-0.5">Danh mục</span>
                      <span className="text-white/80 font-semibold">
                        {previewModal.category || 'Khác'}
                      </span>
                    </div>
                    <div>
                      <span className="text-white/40 block mb-0.5">
                        Ngày đăng
                      </span>
                      <span className="text-white/80 font-semibold">
                        {new Date(previewModal.createdAt).toLocaleDateString(
                          'vi-VN',
                          {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          }
                        )}
                      </span>
                    </div>
                    <div>
                      <span className="text-white/40 block mb-0.5">
                        Số lần bị report
                      </span>
                      <span
                        className={`font-bold ${previewModal.reportsCount > 0 ? 'text-red-400' : 'text-white/40'}`}
                      >
                        🚩 {previewModal.reportsCount || 0} lần
                      </span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="space-y-1.5">
                    <h3 className="text-xs font-bold text-white/35 uppercase tracking-wider">
                      Chỉ số tương tác
                    </h3>
                    <div
                      className="flex items-center gap-5"
                      style={{ fontFamily: 'Outfit, sans-serif' }}
                    >
                      <div className="flex items-center gap-1.5 text-white/35 text-xs">
                        <span className="flex items-center gap-1 text-white/60">
                          👁️ {previewModal.stats?.viewsCount || 0}
                        </span>
                        <span>lượt xem</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-white/35 text-xs">
                        <span className="flex items-center gap-1 text-white/60">
                          📥 {previewModal.stats?.downloadsCount || 0}
                        </span>
                        <span>lượt tải</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-white/35 text-xs">
                        <span className="flex items-center gap-1 text-white/60">
                          ❤️ {previewModal.stats?.likesCount || 0}
                        </span>
                        <span>lượt thích</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-white/35 text-xs">
                        <span className="flex items-center gap-1 text-white/60">
                          📌 {previewModal.stats?.bookmarksCount || 0}
                        </span>
                        <span>lưu lại</span>
                      </div>
                    </div>
                  </div>

                  {/* EXIF panel data (Camera & Shot parameters) */}
                  <ExifPanel post={previewModal} compact={true} />

                  {/* Prompt details (AI parameter panel) */}
                  {previewModal.postType === 'ai' && previewModal.prompt && (
                    <div className="space-y-2 border-t border-white/5 pt-4">
                      <h3 className="text-xs font-bold text-white/35 uppercase tracking-wider">
                        Thông số tạo ảnh AI
                      </h3>
                      {previewModal.aiTool && (
                        <div className="flex items-center gap-1.5 text-[11px] text-white/60">
                          <span>Công cụ:</span>
                          <span className="px-2 py-0.5 rounded bg-violet-600/10 border border-violet-500/20 text-violet-400 font-bold">
                            {previewModal.aiTool}
                            {previewModal.aiModel ? ` (${previewModal.aiModel})` : ''}
                          </span>
                        </div>
                      )}
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-white/30 uppercase">
                          Prompt:
                        </p>
                        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] text-white/80 font-mono leading-relaxed max-h-[160px] overflow-y-auto scrollbar-thin select-all">
                          {previewModal.prompt}
                        </div>
                      </div>
                      {previewModal.negativePrompt && (
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-white/30 uppercase">
                            Negative Prompt:
                          </p>
                          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] text-white/80 font-mono leading-relaxed max-h-[100px] overflow-y-auto scrollbar-thin select-all">
                            {previewModal.negativePrompt}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions footer */}
                  <div className="flex gap-2 border-t border-white/5 pt-5 mt-auto">
                    {previewModal.status !== 'approved' && (
                      <button
                        onClick={() => {
                          handleStatus(previewModal._id, 'approved')
                          setPreviewModal(null)
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-green-600 border border-green-500/30 text-white hover:bg-green-500 transition-all text-xs font-bold cursor-pointer"
                      >
                        <CheckCircle size={13} /> Duyệt
                      </button>
                    )}
                    {previewModal.status !== 'rejected' && (
                      <button
                        onClick={() => {
                          setRejectModal(previewModal)
                          setPreviewModal(null)
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-red-600 border border-red-500/30 text-white hover:bg-red-500 transition-all text-xs font-bold cursor-pointer"
                      >
                        <XCircle size={13} /> Từ chối
                      </button>
                    )}
                    {previewModal.status !== 'hidden' && (
                      <button
                        onClick={() => {
                          handleStatus(previewModal._id, 'hidden')
                          setPreviewModal(null)
                        }}
                        className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white transition-all text-xs font-bold cursor-pointer"
                        title="Ẩn bài viết"
                      >
                        <EyeOff size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setBuffModal(previewModal)
                        setBuffViews(0)
                        setBuffDownloads(0)
                        setBuffLikes(0)
                        setBuffBookmarks(0)
                        setPreviewModal(null)
                      }}
                      className="px-3 py-2.5 rounded-xl bg-yellow-600/15 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-600/25 transition-all text-xs font-bold cursor-pointer flex items-center justify-center gap-1"
                      title="Buff chỉ số"
                    >
                      <Zap size={13} /> Buff
                    </button>
                    <button
                      onClick={() => {
                        handleDeletePost(previewModal._id)
                        setPreviewModal(null)
                      }}
                      className="px-3 py-2.5 rounded-xl bg-red-600/10 border border-red-500/20 text-red-400 hover:bg-red-600/20 transition-all text-xs font-bold cursor-pointer"
                      title="Xóa bài viết"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )
        })()}
      </AnimatePresence>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// TAB: USERS
// ══════════════════════════════════════════════════════════════════
const TIER_META = {
  free: {
    label: 'Miễn phí',
    color: '#9ca3af',
    bg: 'rgba(156,163,175,0.12)',
    border: 'rgba(156,163,175,0.25)',
    icon: '⭕',
  },
  founder: {
    label: "Founder's",
    color: '#d97706',
    bg: 'rgba(217,119,6,0.12)',
    border: 'rgba(217,119,6,0.3)',
    icon: '⭐',
  },
  pro: {
    label: 'Pro',
    color: '#7986eb',
    bg: 'rgba(121,134,235,0.12)',
    border: 'rgba(121,134,235,0.3)',
    icon: '💎',
  },
  ultimate: {
    label: 'Ultimate',
    color: '#06b6d4',
    bg: 'rgba(6,182,212,0.12)',
    border: 'rgba(6,182,212,0.3)',
    icon: '👑',
  },
}

const SORT_OPTIONS = [
  { value: 'default', label: 'Mặc định (Gần đây)', icon: Clock },
  { value: 'alphabetical', label: 'Tên A-Z', icon: ArrowUpDown },
  { value: 'alphabetical-desc', label: 'Tên Z-A', icon: ArrowUpDown },
  { value: 'createdAt', label: 'Ngày tạo mới nhất', icon: Calendar },
  { value: 'new-subscribers', label: 'Đăng ký gói mới nhất', icon: Zap },
  { value: 'sub-expiring', label: 'Gói sắp hết hạn', icon: Hourglass },
  { value: 'most-posts', label: 'Nhiều bài viết nhất', icon: Image },
  { value: 'most-followers', label: 'Nhiều followers nhất', icon: Users },
  { value: 'most-likes', label: 'Nhiều tim nhất', icon: Heart },
  { value: 'highest-revenue', label: 'Thu nhập cao nhất', icon: Coins },
]

const UsersTab = () => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [hasMore, setHasMore] = useState(false)
  const [cursor, setCursor] = useState(null)
  const [coinModal, setCoinModal] = useState(null)
  const [coinAmount, setCoinAmount] = useState('')
  const [coinLoading, setCoinLoading] = useState(false)
  const [vndModal, setVndModal] = useState(null)
  const [vndAmount, setVndAmount] = useState('')
  const [vndDescription, setVndDescription] = useState('')
  const [vndLoading, setVndLoading] = useState(false)
  const [tierModal, setTierModal] = useState(null)
  const [tierLoading, setTierLoading] = useState(false)
  const [selectedTier, setSelectedTier] = useState('free')
  // Ban modal
  const [banModal, setBanModal] = useState(null) // { user, ban: true/false }
  const [banReason, setBanReason] = useState('')
  const [banDuration, setBanDuration] = useState(0) // 0 = vĩnh viễn
  const [banLoading, setBanLoading] = useState(false)
  // Role modal
  const [roleModal, setRoleModal] = useState(null) // user
  const [selectedRole, setSelectedRole] = useState('user')
  const [roleLoading, setRoleLoading] = useState(false)
  // Detail modal
  const [detailModal, setDetailModal] = useState(null)

  // CRUD states
  const [createModal, setCreateModal] = useState(false)
  const [createUserForm, setCreateUserForm] = useState({
    username: '',
    email: '',
    displayName: '',
    password: '',
    role: 'user',
    subscriptionTier: 'free',
  })
  const [createUserLoading, setCreateUserLoading] = useState(false)

  const [editModal, setEditModal] = useState(null)
  const [editUserForm, setEditUserForm] = useState({
    username: '',
    email: '',
    displayName: '',
    role: 'user',
    subscriptionTier: 'free',
    tokenBalance: 0,
    vndBalance: 0,
  })
  const [editUserLoading, setEditUserLoading] = useState(false)

  const currentAdminId = useAuthStore((s) => s.user?._id)
  const [sortBy, setSortBy] = useState('default')
  const [page, setPage] = useState(1)
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false)

  const renderDynamicBadge = (user) => {
    if (sortBy === 'createdAt') {
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-white/60 flex items-center gap-1">
          <Calendar size={11} className="text-violet-400" />
          Tạo ngày:{' '}
          {user.createdAt
            ? new Date(user.createdAt).toLocaleDateString('vi-VN')
            : 'N/A'}
        </span>
      )
    }
    if (sortBy === 'new-subscribers') {
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-600/10 border border-amber-500/20 text-amber-400 flex items-center gap-1 font-bold">
          <Zap size={11} className="text-amber-400" />
          Gói: {TIER_META[user.subscriptionTier || 'free']?.label} (Mới)
        </span>
      )
    }
    if (sortBy === 'sub-expiring') {
      if (!user.subscriptionExpiry) return null
      const daysLeft = Math.max(
        0,
        Math.ceil(
          (new Date(user.subscriptionExpiry) - new Date()) /
            (1000 * 60 * 60 * 24)
        )
      )
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-md bg-red-600/10 border border-red-500/20 text-red-400 flex items-center gap-1 font-bold">
          <Hourglass size={11} className="text-red-400" />
          Hết hạn:{' '}
          {new Date(user.subscriptionExpiry).toLocaleDateString('vi-VN')} (
          {daysLeft} ngày còn lại)
        </span>
      )
    }
    if (sortBy === 'most-posts') {
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center gap-1 font-bold">
          <Image size={11} className="text-blue-400" />
          {user.stats?.postsCount || 0} bài đăng
        </span>
      )
    }
    if (sortBy === 'most-followers') {
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-1 font-bold">
          <Users size={11} className="text-emerald-400" />
          {user.stats?.followersCount || 0} followers
        </span>
      )
    }
    if (sortBy === 'most-likes') {
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-md bg-red-600/10 border border-red-500/20 text-red-400 flex items-center gap-1 font-bold">
          <Heart size={11} className="text-red-400 fill-red-400" />
          {user.stats?.totalLikes || 0} yêu thích
        </span>
      )
    }
    if (sortBy === 'highest-revenue') {
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-md bg-yellow-600/10 border border-yellow-500/20 text-yellow-400 flex items-center gap-1 font-bold">
          <Coins size={11} className="text-yellow-400" />
          Doanh thu: {(user.totalEarned || 0).toLocaleString('vi-VN')}đ
        </span>
      )
    }
    return null
  }

  const fetchUsers = useCallback(
    async (reset = false) => {
      const isCustomSort = sortBy && sortBy !== 'default'
      if (reset) {
        setLoading(true)
        setCursor(null)
        setPage(1)
      }
      try {
        const params = { limit: 20 }
        if (isCustomSort) {
          params.sortBy = sortBy
          params.page = reset ? 1 : page + 1
        } else {
          if (!reset && cursor) params.cursor = cursor
        }
        if (search.trim()) params.search = search
        const { data } = await api.get('/admin/users', { params })
        setUsers(reset ? data.users : (u) => [...u, ...data.users])
        setHasMore(data.pagination.hasMore)

        if (isCustomSort) {
          setPage(reset ? 1 : page + 1)
        } else {
          setCursor(data.pagination.nextCursor)
        }
      } catch {
        toast.error('Không thể tải users')
      } finally {
        setLoading(false)
      }
    },
    [search, cursor, sortBy, page]
  )

  useEffect(() => {
    const t = setTimeout(() => fetchUsers(true), 400)
    return () => clearTimeout(t)
  }, [search]) // eslint-disable-line

  useEffect(() => {
    fetchUsers(true)
  }, [sortBy]) // eslint-disable-line

  const scrollLockRef = useRef(null)
  const sortDropdownRef = useRef(null)

  useEffect(() => {
    const clickOutsideSort = (e) => {
      if (
        sortDropdownRef.current &&
        !sortDropdownRef.current.contains(e.target)
      ) {
        setIsSortDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', clickOutsideSort)
    return () => document.removeEventListener('mousedown', clickOutsideSort)
  }, [])

  useEffect(() => {
    const isAnyModalOpen = !!(
      detailModal ||
      coinModal ||
      vndModal ||
      tierModal ||
      banModal ||
      roleModal ||
      createModal ||
      editModal
    )
    const body = document.body

    if (isAnyModalOpen) {
      if (!scrollLockRef.current) {
        const scrollY = window.scrollY
        const lockedWidth = body.getBoundingClientRect().width
        const prev = {
          position: body.style.position,
          top: body.style.top,
          width: body.style.width,
          scrollY,
        }
        scrollLockRef.current = prev
        body.style.position = 'fixed'
        body.style.top = `-${scrollY}px`
        body.style.width = `${lockedWidth}px`
      }
    } else {
      if (scrollLockRef.current) {
        const prev = scrollLockRef.current
        body.style.position = prev.position
        body.style.top = prev.top
        body.style.width = prev.width
        scrollLockRef.current = null
        window.scrollTo({ top: prev.scrollY, behavior: 'instant' })
      }
    }

    return () => {
      if (scrollLockRef.current) {
        const prev = scrollLockRef.current
        body.style.position = prev.position
        body.style.top = prev.top
        body.style.width = prev.width
        window.scrollTo({ top: prev.scrollY, behavior: 'instant' })
      }
    }
  }, [
    !!detailModal,
    !!coinModal,
    !!vndModal,
    !!tierModal,
    !!banModal,
    !!roleModal,
    !!createModal,
    !!editModal,
  ])

  const handleAdjustCoins = async () => {
    const amount = parseInt(coinAmount)
    if (isNaN(amount) || amount === 0) {
      toast.error('Nhập số xu hợp lệ')
      return
    }
    setCoinLoading(true)
    try {
      const { data } = await api.post(`/admin/users/${coinModal._id}/tokens`, {
        amount,
        reason: 'Admin nạp token',
      })
      toast.success(data.message)
      setUsers((prev) =>
        prev.map((u) =>
          u._id === coinModal._id
            ? { ...u, tokenBalance: data.tokenBalance }
            : u
        )
      )
      if (coinModal._id === currentAdminId) window.location.reload()
      setCoinModal(null)
      setCoinAmount('')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi nạp xu')
    } finally {
      setCoinLoading(false)
    }
  }

  const handleAdjustVnd = async () => {
    const amount = parseInt(vndAmount)
    if (isNaN(amount) || amount === 0) {
      toast.error('Nhập số tiền hợp lệ')
      return
    }
    setVndLoading(true)
    try {
      const { data } = await api.post(`/admin/users/${vndModal._id}/deposit`, {
        amount,
        description: vndDescription || 'Admin điều chỉnh ví VNĐ',
      })
      toast.success(data.message)
      setUsers((prev) =>
        prev.map((u) =>
          u._id === vndModal._id ? { ...u, vndBalance: data.vndBalance } : u
        )
      )
      if (vndModal._id === currentAdminId) window.location.reload()
      setVndModal(null)
      setVndAmount('')
      setVndDescription('')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi điều chỉnh ví')
    } finally {
      setVndLoading(false)
    }
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
      setUsers((prev) =>
        prev.map((u) =>
          u._id === user._id
            ? { ...u, isBanned: data.isBanned, banReason: data.banReason }
            : u
        )
      )
      toast.success(data.message)
      setBanModal(null)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi ban')
    } finally {
      setBanLoading(false)
    }
  }

  const openRoleModal = (user) => {
    setSelectedRole(user.role || 'user')
    setRoleModal(user)
  }

  const handleSetRole = async () => {
    if (!roleModal) return
    setRoleLoading(true)
    try {
      const { data } = await api.patch(`/admin/users/${roleModal._id}/role`, {
        role: selectedRole,
      })
      toast.success(data.message)
      setUsers((prev) =>
        prev.map((u) =>
          u._id === roleModal._id ? { ...u, role: data.role } : u
        )
      )
      setRoleModal(null)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi đổi role')
    } finally {
      setRoleLoading(false)
    }
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
      setUsers((prev) =>
        prev.map((u) =>
          u._id === tierModal._id
            ? { ...u, subscriptionTier: data.subscriptionTier }
            : u
        )
      )
      // Nếu admin tự đổi tier của mình → reload để update navbar token badge
      if (tierModal._id === currentAdminId) window.location.reload()
      setTierModal(null)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi đổi tier')
    } finally {
      setTierLoading(false)
    }
  }

  const handleCreateUser = async (e) => {
    e.preventDefault()
    setCreateUserLoading(true)
    try {
      const { data } = await api.post('/admin/users', createUserForm)
      toast.success(data.message)
      setCreateModal(false)
      setCreateUserForm({
        username: '',
        email: '',
        displayName: '',
        password: '',
        role: 'user',
        subscriptionTier: 'free',
      })
      fetchUsers(true)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi tạo user')
    } finally {
      setCreateUserLoading(false)
    }
  }

  const handleEditUser = async (e) => {
    e.preventDefault()
    setEditUserLoading(true)
    try {
      const { data } = await api.put(
        `/admin/users/${editModal._id}`,
        editUserForm
      )
      toast.success(data.message)
      setEditModal(null)
      // Cập nhật danh sách user
      setUsers((prev) =>
        prev.map((u) => (u._id === editModal._id ? data.user : u))
      )
      // Cập nhật detail modal nếu đang xem
      if (detailModal && detailModal._id === editModal._id) {
        setDetailModal(data.user)
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi chỉnh sửa user')
    } finally {
      setEditUserLoading(false)
    }
  }

  const handleDeleteUser = async (user) => {
    const confirm = window.confirm(
      `Bạn có chắc chắn muốn XÓA VĨNH VIỄN tài khoản @${user.username} và mọi bài đăng liên quan không? Hành động này không thể hoàn tác!`
    )
    if (!confirm) return
    try {
      const { data } = await api.delete(`/admin/users/${user._id}`)
      toast.success(data.message)
      setDetailModal(null)
      setEditModal(null)
      setUsers((prev) => prev.filter((u) => u._id !== user._id))
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi xóa user')
    }
  }

  const activeSort =
    SORT_OPTIONS.find((opt) => opt.value === sortBy) || SORT_OPTIONS[0]
  const ActiveIcon = activeSort.icon

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
          />
          <input
            type="text"
            className="input pl-10 text-sm"
            placeholder="Tìm username, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {/* Custom sorting dropdown menu */}
          <div className="relative" ref={sortDropdownRef}>
            <button
              onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
              className="input text-xs py-2 px-3.5 flex items-center justify-between gap-2.5 cursor-pointer min-w-[190px] sm:min-w-[210px] text-left hover:border-white/15 transition-all select-none"
            >
              <div className="flex items-center gap-2 truncate">
                <ActiveIcon
                  size={14}
                  className="text-violet-400 flex-shrink-0"
                />
                <span className="truncate">{activeSort.label}</span>
              </div>
              <ChevronDown
                size={14}
                className="text-white/40 flex-shrink-0 transition-transform duration-200"
                style={{
                  transform: isSortDropdownOpen ? 'rotate(180deg)' : 'none',
                }}
              />
            </button>

            <AnimatePresence>
              {isSortDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute right-0 mt-2 w-[220px] bg-zinc-950/95 border border-white/10 rounded-xl shadow-2xl z-50 p-1 flex flex-col gap-0.5 overflow-hidden backdrop-blur-md"
                >
                  {SORT_OPTIONS.map((opt) => {
                    const OptIcon = opt.icon
                    const isSelected = sortBy === opt.value
                    return (
                      <button
                        key={opt.value}
                        onClick={() => {
                          setSortBy(opt.value)
                          setIsSortDropdownOpen(false)
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-left transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-violet-600/20 text-violet-300 border border-violet-500/25'
                            : 'text-white/70 hover:bg-white/5 border border-transparent'
                        }`}
                      >
                        <OptIcon
                          size={13.5}
                          className={`${isSelected ? 'text-violet-400' : 'text-white/30'} flex-shrink-0`}
                        />
                        <span className="truncate">{opt.label}</span>
                      </button>
                    )
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={() => {
              setCreateUserForm({
                username: '',
                email: '',
                displayName: '',
                password: '',
                role: 'user',
                subscriptionTier: 'free',
              })
              setCreateModal(true)
            }}
            className="btn-primary px-4 flex items-center gap-1.5 whitespace-nowrap text-xs font-bold font-display cursor-pointer"
          >
            <Plus size={14} /> Thêm User
          </button>
        </div>
      </div>

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
              onClick={() => setDetailModal(user)}
              className={`card p-4 flex items-center gap-3 cursor-pointer group transition-all duration-300 border-white/5 bg-white/[0.01] hover:bg-white/[0.04] hover:border-white/12 hover:shadow-[0_8px_30px_rgb(0,0,0,0.5)] ${
                user.isBanned ? 'border-red-500/20' : ''
              }`}
            >
              <div className="flex-1 flex items-center gap-3 min-w-0">
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0 group-hover:scale-105 transition-transform duration-300"
                    alt=""
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-blue-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                    {user.username?.[0]?.toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm group-hover:text-brand-300 transition-colors duration-300">
                      {user.displayName || user.username}
                    </span>
                    <span className="text-xs text-white/40">
                      @{user.username}
                    </span>
                    {user.role === 'admin' && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-600/30 text-violet-400 font-bold">
                        ADMIN
                      </span>
                    )}
                    {user.isBanned && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-600/30 text-red-400 font-bold">
                        BANNED
                      </span>
                    )}
                    {/* Tier badge — click to change */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        openTierModal(user)
                      }}
                      title="Nhấp để đổi gói"
                      className="text-[10px] px-2 py-0.5 rounded-full font-bold border transition-all hover:brightness-125 cursor-pointer"
                      style={{
                        background:
                          TIER_META[user.subscriptionTier || 'free']?.bg,
                        color:
                          TIER_META[user.subscriptionTier || 'free']?.color,
                        borderColor:
                          TIER_META[user.subscriptionTier || 'free']?.border,
                      }}
                    >
                      {TIER_META[user.subscriptionTier || 'free']?.icon}{' '}
                      {TIER_META[user.subscriptionTier || 'free']?.label}
                    </button>
                    {renderDynamicBadge(user)}
                  </div>
                  <p className="text-xs text-white/40 truncate group-hover:text-white/60 transition-colors duration-300">
                    {user.email}
                  </p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-violet-400">
                  {user.tokenBalance || 0} token
                </p>
                <p className="text-[11px] font-bold text-emerald-400">
                  {(user.vndBalance || 0).toLocaleString('vi-VN')}đ
                </p>
                <p className="text-[10px] text-white/30">
                  {user.stats?.postsCount || 0} posts
                </p>
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setCoinModal(user)
                    setCoinAmount('')
                  }}
                  className="p-2 rounded-xl bg-violet-600/20 border border-violet-500/30 text-violet-400 hover:bg-violet-600/30 transition-all cursor-pointer"
                  title="Điều chỉnh token"
                >
                  <Coins size={14} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setVndModal(user)
                    setVndAmount('')
                    setVndDescription('')
                  }}
                  className="p-2 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/30 transition-all cursor-pointer"
                  title="Nạp tiền ví VNĐ"
                >
                  <Wallet size={14} />
                </button>
                {user._id !== currentAdminId && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      openRoleModal(user)
                    }}
                    className={`p-2 rounded-xl border transition-all cursor-pointer ${
                      user.role === 'admin'
                        ? 'bg-violet-600/20 border-violet-500/30 text-violet-400 hover:bg-violet-600/30'
                        : 'bg-white/5 border-white/10 text-white/40 hover:border-violet-500/40 hover:text-violet-400'
                    }`}
                    title="Đổi Role"
                  >
                    <Shield size={14} />
                  </button>
                )}
                {user._id !== currentAdminId && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      openBanModal(user, !user.isBanned)
                    }}
                    className={`p-2 rounded-xl border transition-all cursor-pointer ${
                      user.isBanned
                        ? 'bg-green-600/20 border-green-500/30 text-green-400 hover:bg-green-600/30'
                        : 'bg-red-600/20 border-red-500/30 text-red-400 hover:bg-red-600/30'
                    }`}
                    title={user.isBanned ? 'Unban' : 'Ban'}
                  >
                    {user.isBanned ? (
                      <ShieldCheck size={14} />
                    ) : (
                      <ShieldAlert size={14} />
                    )}
                  </button>
                )}
              </div>
            </motion.div>
          ))}
          {users.length === 0 && !loading && (
            <div className="text-center py-12">
              <Users size={32} className="text-white/10 mx-auto mb-3" />
              <p className="text-white/40 text-sm">Không tìm thấy user</p>
            </div>
          )}
        </div>
      )}

      {hasMore && (
        <button
          onClick={() => fetchUsers(false)}
          className="btn-secondary w-full flex items-center justify-center gap-2 text-sm"
        >
          <ChevronDown size={15} /> Tải thêm
        </button>
      )}

      {/* Coin modal */}
      <AnimatePresence>
        {coinModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm !mt-0"
            onClick={(e) => e.target === e.currentTarget && setCoinModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9 }}
              className="card p-6 max-w-sm w-full"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-2xl bg-violet-600/20 flex items-center justify-center">
                  <Coins size={24} className="text-violet-400" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Điều chỉnh token</h3>
                  <p className="text-sm text-white/40">
                    @{coinModal.username} —{' '}
                    <span className="text-violet-400 font-bold">
                      {coinModal.tokenBalance || 0} token
                    </span>
                  </p>
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
                  <button
                    onClick={() =>
                      setCoinAmount((v) => String(Math.abs(parseInt(v) || 0)))
                    }
                    className="p-1 text-green-400 hover:text-green-300"
                  >
                    <Plus size={14} />
                  </button>
                  <button
                    onClick={() =>
                      setCoinAmount((v) => String(-Math.abs(parseInt(v) || 0)))
                    }
                    className="p-1 text-red-400 hover:text-red-300"
                  >
                    <Minus size={14} />
                  </button>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setCoinModal(null)}
                  className="btn-secondary flex-1"
                >
                  Hủy
                </button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleAdjustCoins}
                  disabled={coinLoading || !coinAmount}
                  className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {coinLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      <Coins size={15} /> Xác nhận
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Vnd modal */}
      <AnimatePresence>
        {vndModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm !mt-0"
            onClick={(e) => e.target === e.currentTarget && setVndModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9 }}
              className="card p-6 max-w-sm w-full"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 flex items-center justify-center">
                  <Wallet size={24} className="text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Điều chỉnh ví VNĐ</h3>
                  <p className="text-sm text-white/40">
                    @{vndModal.username} —{' '}
                    <span className="text-emerald-400 font-bold">
                      {(vndModal.vndBalance || 0).toLocaleString('vi-VN')}đ
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex gap-2 mb-2">
                {[50000, 100000, 200000, 500000].map((v) => (
                  <button
                    key={v}
                    onClick={() => setVndAmount(String(v))}
                    className="flex-1 py-1.5 rounded-lg bg-emerald-600/20 border border-emerald-500/35 text-emerald-400 text-xs font-bold hover:bg-emerald-600/30 transition-all"
                  >
                    +{v.toLocaleString('vi-VN')}đ
                  </button>
                ))}
              </div>
              <div className="relative mb-3">
                <input
                  type="number"
                  className="input text-center text-lg font-bold"
                  placeholder="Nhập số tiền (âm để trừ)"
                  value={vndAmount}
                  onChange={(e) => setVndAmount(e.target.value)}
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 flex gap-1">
                  <button
                    onClick={() =>
                      setVndAmount((v) => String(Math.abs(parseInt(v) || 0)))
                    }
                    className="p-1 text-green-400 hover:text-green-300"
                  >
                    <Plus size={14} />
                  </button>
                  <button
                    onClick={() =>
                      setVndAmount((v) => String(-Math.abs(parseInt(v) || 0)))
                    }
                    className="p-1 text-red-400 hover:text-red-300"
                  >
                    <Minus size={14} />
                  </button>
                </div>
              </div>
              <div className="relative mb-4">
                <input
                  type="text"
                  className="input text-sm"
                  placeholder="Mô tả giao dịch (tùy chọn)"
                  value={vndDescription}
                  onChange={(e) => setVndDescription(e.target.value)}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setVndModal(null)}
                  className="btn-secondary flex-1"
                >
                  Hủy
                </button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleAdjustVnd}
                  disabled={vndLoading || !vndAmount}
                  className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50 !bg-emerald-600 hover:!bg-emerald-500 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                >
                  {vndLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      <Wallet size={15} /> Xác nhận
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tier Modal */}
      <AnimatePresence>
        {tierModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm !mt-0"
            onClick={(e) => e.target === e.currentTarget && setTierModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="card p-6 w-full max-w-sm"
            >
              <div className="flex items-center gap-3 mb-5">
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl"
                  style={{ background: TIER_META[selectedTier]?.bg }}
                >
                  {TIER_META[selectedTier]?.icon}
                </div>
                <div>
                  <h3 className="font-bold text-lg leading-tight">
                    Đổi gói đăng ký
                  </h3>
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
                      background:
                        selectedTier === key
                          ? meta.bg
                          : 'rgba(255,255,255,0.03)',
                      borderColor:
                        selectedTier === key
                          ? meta.border
                          : 'rgba(255,255,255,0.07)',
                      boxShadow:
                        selectedTier === key
                          ? `0 0 0 1.5px ${meta.border}`
                          : 'none',
                    }}
                  >
                    <span className="text-lg">{meta.icon}</span>
                    <div>
                      <p
                        className="text-xs font-bold"
                        style={{
                          color:
                            selectedTier === key
                              ? meta.color
                              : 'rgba(255,255,255,0.5)',
                        }}
                      >
                        {meta.label}
                      </p>
                      {key !== 'free' && (
                        <p className="text-[10px] text-white/25">
                          {key === 'founder'
                            ? '200 slot'
                            : key === 'pro'
                              ? '1K token/th'
                              : 'Unlimited'}
                        </p>
                      )}
                    </div>
                    {selectedTier === key && (
                      <Check
                        size={13}
                        className="ml-auto flex-shrink-0"
                        style={{ color: meta.color }}
                      />
                    )}
                  </button>
                ))}
              </div>

              {/* Current vs Selected */}
              <div className="flex items-center justify-center gap-2 mb-5 text-xs">
                <span
                  className="px-2.5 py-1 rounded-full font-bold"
                  style={{
                    background:
                      TIER_META[tierModal.subscriptionTier || 'free']?.bg,
                    color:
                      TIER_META[tierModal.subscriptionTier || 'free']?.color,
                  }}
                >
                  {TIER_META[tierModal.subscriptionTier || 'free']?.label}
                </span>
                <span className="text-white/30">→</span>
                <span
                  className="px-2.5 py-1 rounded-full font-bold"
                  style={{
                    background: TIER_META[selectedTier]?.bg,
                    color: TIER_META[selectedTier]?.color,
                    border: `1px solid ${TIER_META[selectedTier]?.border}`,
                  }}
                >
                  {TIER_META[selectedTier]?.label}
                </span>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setTierModal(null)}
                  className="btn-secondary flex-1"
                >
                  Hủy
                </button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleChangeTier}
                  disabled={
                    tierLoading ||
                    selectedTier === (tierModal.subscriptionTier || 'free')
                  }
                  className="flex-1 py-2.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2
                    disabled:opacity-40 transition-all"
                  style={{
                    background: 'oklch(52% 0.28 285)',
                    color: '#f5f3ff',
                    boxShadow:
                      'inset 0 1.5px 0 rgba(255,255,255,0.22), 0 4px 14px rgba(109,40,217,0.4)',
                  }}
                >
                  {tierLoading ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <>
                      <Zap size={14} /> Xác nhận
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Ban Modal ── */}
      <AnimatePresence>
        {banModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm !mt-0"
            onClick={(e) => e.target === e.currentTarget && setBanModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9 }}
              className="card p-6 max-w-sm w-full"
            >
              <div className="flex items-center gap-3 mb-5">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center ${banModal.ban ? 'bg-red-600/20' : 'bg-green-600/20'}`}
                >
                  {banModal.ban ? (
                    <ShieldAlert size={22} className="text-red-400" />
                  ) : (
                    <ShieldCheck size={22} className="text-green-400" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-lg">
                    {banModal.ban ? 'Ban user' : 'Unban user'}
                  </h3>
                  <p className="text-xs text-white/40">
                    @{banModal.user.username}
                  </p>
                </div>
              </div>

              {banModal.ban && (
                <>
                  <div className="mb-3">
                    <label className="input-label">
                      Lý do ban{' '}
                      <span className="text-white/30 font-normal">
                        (tuỳ chọn)
                      </span>
                    </label>
                    <textarea
                      className="input resize-none text-sm"
                      rows={3}
                      placeholder="Vi phạm quy định, spam, nội dung không phù hợp..."
                      value={banReason}
                      onChange={(e) => setBanReason(e.target.value)}
                    />
                  </div>
                  <div className="mb-5">
                    <label className="input-label">Thời hạn ban</label>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      {[
                        { v: 0, l: 'Vĩnh viễn' },
                        { v: 1, l: '1 ngày' },
                        { v: 7, l: '7 ngày' },
                        { v: 30, l: '30 ngày' },
                        { v: 90, l: '90 ngày' },
                      ].map((opt) => (
                        <button
                          key={opt.v}
                          onClick={() => setBanDuration(opt.v)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                            banDuration === opt.v
                              ? 'bg-red-600/30 border-red-500/50 text-red-300'
                              : 'bg-white/5 border-white/10 text-white/50 hover:border-white/20'
                          }`}
                        >
                          {opt.l}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {!banModal.ban && (
                <p className="text-sm text-white/50 mb-5">
                  Xác nhận gỡ lệnh ban cho user này? Họ sẽ có thể đăng nhập lại
                  bình thường.
                </p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setBanModal(null)}
                  className="btn-secondary flex-1"
                  disabled={banLoading}
                >
                  Hủy
                </button>
                <button
                  onClick={handleBan}
                  disabled={banLoading}
                  className={`flex-1 py-2.5 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors ${
                    banModal.ban
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {banLoading ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : banModal.ban ? (
                    '🔨 Xác nhận ban'
                  ) : (
                    '✓ Gỡ ban'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Role Modal ── */}
      <AnimatePresence>
        {roleModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm !mt-0"
            onClick={(e) => e.target === e.currentTarget && setRoleModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9 }}
              className="card p-6 max-w-sm w-full"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-2xl bg-violet-600/20 flex items-center justify-center">
                  <UserCheck size={22} className="text-violet-400" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Đổi Role</h3>
                  <p className="text-xs text-white/40">
                    @{roleModal.username} — hiện tại:{' '}
                    <span
                      className={
                        roleModal.role === 'admin'
                          ? 'text-violet-400 font-bold'
                          : 'text-white/60'
                      }
                    >
                      {roleModal.role || 'user'}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mb-5">
                {[
                  { v: 'user', l: '👤 User', desc: 'Quyền thường' },
                  { v: 'admin', l: '🛡️ Admin', desc: 'Toàn quyền quản lý' },
                ].map((opt) => (
                  <button
                    key={opt.v}
                    onClick={() => setSelectedRole(opt.v)}
                    className={`flex-1 p-3 rounded-xl border text-left transition-all ${
                      selectedRole === opt.v
                        ? opt.v === 'admin'
                          ? 'border-violet-500 bg-violet-500/10'
                          : 'border-brand-500 bg-brand-500/10'
                        : 'border-white/10 bg-surface-100 hover:border-white/20'
                    }`}
                  >
                    <p
                      className={`text-sm font-bold ${selectedRole === opt.v ? (opt.v === 'admin' ? 'text-violet-300' : 'text-brand-300') : 'text-white/60'}`}
                    >
                      {opt.l}
                    </p>
                    <p className="text-xs text-white/30 mt-0.5">{opt.desc}</p>
                  </button>
                ))}
              </div>

              {selectedRole === 'admin' && (
                <div className="mb-4 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
                  <p className="text-xs text-yellow-400">
                    ⚠ Admin có toàn quyền: duyệt post, ban user, quản lý hệ
                    thống.
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setRoleModal(null)}
                  className="btn-secondary flex-1"
                  disabled={roleLoading}
                >
                  Hủy
                </button>
                <button
                  onClick={handleSetRole}
                  disabled={
                    roleLoading || selectedRole === (roleModal.role || 'user')
                  }
                  className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  {roleLoading ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <>
                      <Shield size={14} /> Xác nhận
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* User Detail Modal */}
      <AnimatePresence>
        {detailModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-2 md:p-4 bg-black/85 backdrop-blur-sm overflow-hidden !mt-0"
            onClick={(e) =>
              e.target === e.currentTarget && setDetailModal(null)
            }
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="modal-glass w-full max-w-2xl border border-white/8 rounded-2xl shadow-[0_40px_120px_rgba(0,0,0,0.9)] relative max-h-[95vh] flex flex-col overflow-hidden"
            >
              {/* Close Button */}
              <button
                onClick={() => setDetailModal(null)}
                className="absolute top-4 right-4 p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-all cursor-pointer z-10"
              >
                <X size={18} />
              </button>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
                {/* Header profile section */}
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 pb-6 border-b border-white/5">
                  <div className="relative">
                    {detailModal.avatar ? (
                      <img
                        src={detailModal.avatar}
                        className="w-20 h-20 rounded-full object-cover ring-2 ring-brand-500/50 shadow-lg shadow-brand-500/10"
                        alt=""
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-600 to-blue-500 flex items-center justify-center text-white text-2xl font-black shadow-lg">
                        {detailModal.username?.[0]?.toUpperCase()}
                      </div>
                    )}
                    {detailModal.isVerified && (
                      <span
                        className="absolute -bottom-1 -right-1 bg-brand-500 text-white rounded-full p-1 border-2 border-zinc-950"
                        title="Đã xác minh"
                      >
                        <CheckCircle
                          size={14}
                          className="fill-white text-brand-600"
                        />
                      </span>
                    )}
                  </div>

                  <div className="text-center sm:text-left space-y-2 flex-1">
                    <div>
                      <h3 className="font-bold text-xl text-white flex flex-wrap items-center justify-center sm:justify-start gap-2 leading-none font-display">
                        {detailModal.displayName || detailModal.username}
                        <span className="text-xs text-white/40 font-normal font-mono">
                          @{detailModal.username}
                        </span>
                      </h3>
                      <p className="text-xs text-white/40 mt-1">
                        {detailModal.email}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      {/* Role badge */}
                      <span
                        className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
                          detailModal.role === 'admin'
                            ? 'bg-violet-600/10 border-violet-500/25 text-violet-400'
                            : 'bg-white/5 border-white/10 text-white/50'
                        }`}
                      >
                        {detailModal.role?.toUpperCase()}
                      </span>

                      {/* Expire or status badge */}
                      {detailModal.isBanned ? (
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-red-600/10 border border-red-500/25 text-red-400 font-bold">
                          🚫 BANNED
                        </span>
                      ) : (
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-green-600/10 border border-green-500/25 text-green-400 font-bold">
                          ✓ ACTIVE
                        </span>
                      )}

                      {/* Subscription tier */}
                      <span
                        className="text-[10px] px-2.5 py-0.5 rounded-full font-bold border"
                        style={{
                          background:
                            TIER_META[detailModal.subscriptionTier || 'free']
                              ?.bg,
                          color:
                            TIER_META[detailModal.subscriptionTier || 'free']
                              ?.color,
                          borderColor:
                            TIER_META[detailModal.subscriptionTier || 'free']
                              ?.border,
                        }}
                      >
                        {
                          TIER_META[detailModal.subscriptionTier || 'free']
                            ?.icon
                        }{' '}
                        {
                          TIER_META[detailModal.subscriptionTier || 'free']
                            ?.label
                        }
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stats Counters Grid */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                    Thống kê hoạt động
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div className="p-3 rounded-xl bg-white/[0.01] border border-white/5 text-center">
                      <p className="text-xl font-black text-white leading-none mb-1 tabular-nums">
                        {detailModal.stats?.postsCount || 0}
                      </p>
                      <p className="text-[9px] font-bold text-white/40 uppercase">
                        Bài đăng
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.01] border border-white/5 text-center">
                      <p className="text-xl font-black text-white leading-none mb-1 tabular-nums">
                        {detailModal.stats?.totalViews || 0}
                      </p>
                      <p className="text-[9px] font-bold text-white/40 uppercase">
                        Lượt xem
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.01] border border-white/5 text-center">
                      <p className="text-xl font-black text-white leading-none mb-1 tabular-nums">
                        {detailModal.stats?.totalDownloads || 0}
                      </p>
                      <p className="text-[9px] font-bold text-white/40 uppercase">
                        Lượt tải
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.01] border border-white/5 text-center">
                      <p className="text-xl font-black text-white leading-none mb-1 tabular-nums">
                        {detailModal.stats?.totalLikes || 0}
                      </p>
                      <p className="text-[9px] font-bold text-white/40 uppercase">
                        Yêu thích
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.01] border border-white/5 text-center">
                      <p className="text-xl font-black text-white leading-none mb-1 tabular-nums">
                        {detailModal.stats?.followersCount || 0}
                      </p>
                      <p className="text-[9px] font-bold text-white/40 uppercase">
                        Follower
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.01] border border-white/5 text-center">
                      <p className="text-xl font-black text-white leading-none mb-1 tabular-nums">
                        {detailModal.stats?.followingCount || 0}
                      </p>
                      <p className="text-[9px] font-bold text-white/40 uppercase">
                        Following
                      </p>
                    </div>
                  </div>
                </div>

                {/* Financial Wallet Ledgers */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                    Số dư tài chính
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Token Balance */}
                    <div className="p-3.5 rounded-xl bg-violet-600/5 border border-violet-500/15 flex items-center justify-between">
                      <div>
                        <p className="text-[9px] font-bold text-violet-400 uppercase leading-none mb-1">
                          Số dư Token
                        </p>
                        <p className="text-xl font-black text-violet-300 leading-none tabular-nums">
                          {detailModal.tokenBalance || 0}{' '}
                          <span className="text-[10px] font-bold text-violet-400/70">
                            token
                          </span>
                        </p>
                      </div>
                      <Coins size={18} className="text-violet-500/40" />
                    </div>

                    {/* Available Balance */}
                    <div className="p-3.5 rounded-xl bg-emerald-600/5 border border-emerald-500/15 flex items-center justify-between">
                      <div>
                        <p className="text-[9px] font-bold text-emerald-400 uppercase leading-none mb-1">
                          Ví khả dụng (VND)
                        </p>
                        <p className="text-xl font-black text-emerald-300 leading-none tabular-nums">
                          {(detailModal.vndBalance || 0).toLocaleString(
                            'vi-VN'
                          )}
                          đ
                        </p>
                      </div>
                      <Wallet size={18} className="text-emerald-500/40" />
                    </div>

                    {/* Holding Balance */}
                    <div className="p-3.5 rounded-xl bg-amber-600/5 border border-amber-500/15 flex items-center justify-between">
                      <div>
                        <p className="text-[9px] font-bold text-amber-400 uppercase leading-none mb-1">
                          Tiền tạm giữ (Holding)
                        </p>
                        <p className="text-xl font-black text-amber-300 leading-none tabular-nums">
                          {(detailModal.holdingBalance || 0).toLocaleString(
                            'vi-VN'
                          )}
                          đ
                        </p>
                      </div>
                      <Clock size={18} className="text-amber-500/40" />
                    </div>

                    {/* Locked Balance */}
                    <div className="p-3.5 rounded-xl bg-red-600/5 border border-red-500/15 flex items-center justify-between">
                      <div>
                        <p className="text-[9px] font-bold text-red-400 uppercase leading-none mb-1">
                          Đang khóa rút tiền
                        </p>
                        <p className="text-xl font-black text-red-300 leading-none tabular-nums">
                          {(detailModal.lockedBalance || 0).toLocaleString(
                            'vi-VN'
                          )}
                          đ
                        </p>
                      </div>
                      <Shield size={18} className="text-red-500/40" />
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs text-white/40 bg-white/[0.01] border border-white/5 rounded-xl p-2.5">
                    <span>
                      Tổng thu nhập:{' '}
                      <strong className="text-white">
                        {(detailModal.totalEarned || 0).toLocaleString('vi-VN')}
                        đ
                      </strong>
                    </span>
                    <span className="text-white/10">|</span>
                    <span>
                      Đã rút thành công:{' '}
                      <strong className="text-white">
                        {(detailModal.totalWithdrawn || 0).toLocaleString(
                          'vi-VN'
                        )}
                        đ
                      </strong>
                    </span>
                  </div>
                </div>

                {/* Timeline Metadata */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                    Dữ liệu & Thời gian
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs text-white/50 bg-white/[0.01] border border-white/5 rounded-xl p-4">
                    <div className="flex justify-between border-b border-white/5 pb-2">
                      <span>Ngày tạo tài khoản:</span>
                      <strong className="text-white">
                        {detailModal.createdAt
                          ? new Date(detailModal.createdAt).toLocaleDateString(
                              'vi-VN',
                              {
                                day: 'numeric',
                                month: 'numeric',
                                year: 'numeric',
                              }
                            )
                          : 'N/A'}
                      </strong>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-2">
                      <span>Đăng nhập cuối:</span>
                      <strong className="text-white">
                        {detailModal.lastLoginAt
                          ? new Date(detailModal.lastLoginAt).toLocaleString(
                              'vi-VN',
                              {
                                hour: '2-digit',
                                minute: '2-digit',
                                day: 'numeric',
                                month: 'numeric',
                              }
                            )
                          : 'Chưa đăng nhập'}
                      </strong>
                    </div>
                    <div className="flex justify-between sm:col-span-2 pt-1">
                      <span>Thời gian hết hạn gói:</span>
                      <strong className="text-white">
                        {detailModal.subscriptionExpiry
                          ? `${new Date(detailModal.subscriptionExpiry).toLocaleDateString('vi-VN')} (${Math.max(0, Math.ceil((new Date(detailModal.subscriptionExpiry) - new Date()) / (1000 * 60 * 60 * 24)))} ngày còn lại)`
                          : 'Không giới hạn / Free'}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Command Center Footer (Fixed Grid Layout) */}
              <div className="p-4 md:px-8 md:pb-6 md:pt-4 bg-zinc-950/80 backdrop-blur-md border-t border-white/5 grid grid-cols-2 sm:grid-cols-3 gap-2 shrink-0">
                <button
                  onClick={() => {
                    setCoinModal(detailModal)
                    setCoinAmount('')
                    setDetailModal(null)
                  }}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold bg-violet-600/20 border border-violet-500/35 text-violet-400 hover:bg-violet-600/30 transition-all cursor-pointer font-display"
                >
                  <Coins size={13} /> Chỉnh sửa Token
                </button>
                <button
                  onClick={() => {
                    setVndModal(detailModal)
                    setVndAmount('')
                    setVndDescription('')
                    setDetailModal(null)
                  }}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold bg-emerald-600/20 border border-emerald-500/35 text-emerald-400 hover:bg-emerald-600/30 transition-all cursor-pointer font-display"
                >
                  <Wallet size={13} /> Nạp tiền VNĐ
                </button>
                <button
                  onClick={() => {
                    openTierModal(detailModal)
                    setDetailModal(null)
                  }}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold bg-amber-600/20 border border-amber-500/35 text-amber-400 hover:bg-amber-600/30 transition-all cursor-pointer font-display"
                >
                  <Zap size={13} /> Đổi gói
                </button>
                <button
                  onClick={() => {
                    setEditUserForm({
                      username: detailModal.username || '',
                      email: detailModal.email || '',
                      displayName: detailModal.displayName || '',
                      role: detailModal.role || 'user',
                      subscriptionTier: detailModal.subscriptionTier || 'free',
                      tokenBalance: detailModal.tokenBalance || 0,
                      vndBalance: detailModal.vndBalance || 0,
                    })
                    setEditModal(detailModal)
                    setDetailModal(null)
                  }}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 transition-all cursor-pointer font-display"
                >
                  <Pencil size={13} /> Sửa thông tin
                </button>
                {detailModal._id !== currentAdminId && (
                  <button
                    onClick={() => {
                      openRoleModal(detailModal)
                      setDetailModal(null)
                    }}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold bg-sky-600/20 border border-sky-500/35 text-sky-400 hover:bg-sky-600/30 transition-all cursor-pointer font-display"
                  >
                    <UserCheck size={13} /> Đổi Role
                  </button>
                )}
                {detailModal._id !== currentAdminId && (
                  <button
                    onClick={() => {
                      openBanModal(detailModal, !detailModal.isBanned)
                      setDetailModal(null)
                    }}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer font-display ${
                      detailModal.isBanned
                        ? 'bg-green-600/20 border-green-500/35 text-green-400 hover:bg-green-600/30'
                        : 'bg-red-600/20 border-red-500/35 text-red-400 hover:bg-red-600/30'
                    }`}
                  >
                    {detailModal.isBanned ? (
                      <>
                        <Shield size={13} /> Mở khóa
                      </>
                    ) : (
                      <>
                        <ShieldAlert size={13} /> Khóa Nick
                      </>
                    )}
                  </button>
                )}
                {detailModal._id !== currentAdminId && (
                  <button
                    onClick={() => handleDeleteUser(detailModal)}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold bg-red-600/10 hover:bg-red-600/25 border border-red-500/30 text-red-400 transition-all cursor-pointer font-display col-span-2 sm:col-span-1"
                  >
                    <Trash2 size={13} /> Xóa User
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create User Modal */}
      <AnimatePresence>
        {createModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm !mt-0"
            onClick={(e) =>
              e.target === e.currentTarget && setCreateModal(false)
            }
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95 }}
              className="card p-6 max-w-md w-full bg-zinc-950/90 border border-white/10 shadow-2xl relative"
            >
              <button
                onClick={() => setCreateModal(false)}
                className="absolute top-4 right-4 p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 mb-5 border-b border-white/5 pb-4">
                <div className="w-11 h-11 rounded-2xl bg-brand-500/20 flex items-center justify-center">
                  <Plus size={22} className="text-brand-400" />
                </div>
                <div>
                  <h3 className="font-bold text-lg font-display">
                    Tạo tài khoản mới
                  </h3>
                  <p className="text-xs text-white/40">
                    Cấp tài khoản trực tiếp làm việc trên PicSpy
                  </p>
                </div>
              </div>

              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="input-label">Tên hiển thị</label>
                  <input
                    type="text"
                    required
                    className="input text-xs"
                    placeholder="Nguyễn Văn A"
                    value={createUserForm.displayName}
                    onChange={(e) =>
                      setCreateUserForm((prev) => ({
                        ...prev,
                        displayName: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="input-label">Username</label>
                    <input
                      type="text"
                      required
                      className="input text-xs"
                      placeholder="username"
                      value={createUserForm.username}
                      onChange={(e) =>
                        setCreateUserForm((prev) => ({
                          ...prev,
                          username: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="input-label">Mật khẩu</label>
                    <input
                      type="password"
                      required
                      className="input text-xs"
                      placeholder="••••••••"
                      value={createUserForm.password}
                      onChange={(e) =>
                        setCreateUserForm((prev) => ({
                          ...prev,
                          password: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className="input-label">Địa chỉ Email</label>
                  <input
                    type="email"
                    required
                    className="input text-xs"
                    placeholder="email@example.com"
                    value={createUserForm.email}
                    onChange={(e) =>
                      setCreateUserForm((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pb-3">
                  <div>
                    <label className="input-label">Vai trò (Role)</label>
                    <select
                      className="input text-xs py-2 pr-8 appearance-none cursor-pointer"
                      value={createUserForm.role}
                      onChange={(e) =>
                        setCreateUserForm((prev) => ({
                          ...prev,
                          role: e.target.value,
                        }))
                      }
                    >
                      <option value="user" className="bg-[#121214]">
                        👤 User (Thường)
                      </option>
                      <option value="admin" className="bg-[#121214]">
                        🛡️ Admin (Quản trị)
                      </option>
                    </select>
                  </div>
                  <div>
                    <label className="input-label">Gói thành viên</label>
                    <select
                      className="input text-xs py-2 pr-8 appearance-none cursor-pointer"
                      value={createUserForm.subscriptionTier}
                      onChange={(e) =>
                        setCreateUserForm((prev) => ({
                          ...prev,
                          subscriptionTier: e.target.value,
                        }))
                      }
                    >
                      <option value="free" className="bg-[#121214]">
                        ⭕ Miễn phí
                      </option>
                      <option value="pro" className="bg-[#121214]">
                        💎 Gói Pro
                      </option>
                      <option value="ultimate" className="bg-[#121214]">
                        👑 Gói Ultimate
                      </option>
                      <option value="founder" className="bg-[#121214]">
                        ⭐ Founder's Plan
                      </option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setCreateModal(false)}
                    className="btn-secondary flex-1"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={createUserLoading}
                    className="btn-primary flex-1 flex items-center justify-center gap-1.5 font-display text-xs font-bold disabled:opacity-50 cursor-pointer"
                  >
                    {createUserLoading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      '✓ Tạo tài khoản'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit User Modal */}
      <AnimatePresence>
        {editModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm !mt-0"
            onClick={(e) => e.target === e.currentTarget && setEditModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95 }}
              className="card p-6 max-w-md w-full bg-zinc-950/90 border border-white/10 shadow-2xl relative"
            >
              <button
                onClick={() => {
                  setEditModal(null)
                  setDetailModal(editModal) // Re-open detail
                }}
                className="absolute top-4 right-4 p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 mb-5 border-b border-white/5 pb-4">
                <div className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <Pencil size={18} className="text-white/60" />
                </div>
                <div>
                  <h3 className="font-bold text-lg font-display">
                    Chỉnh sửa thông tin
                  </h3>
                  <p className="text-xs text-white/40">
                    Thay đổi thông tin cơ bản và số dư của @{editModal.username}
                  </p>
                </div>
              </div>

              <form onSubmit={handleEditUser} className="space-y-4">
                <div>
                  <label className="input-label">Tên hiển thị</label>
                  <input
                    type="text"
                    required
                    className="input text-xs"
                    placeholder="Tên hiển thị"
                    value={editUserForm.displayName}
                    onChange={(e) =>
                      setEditUserForm((prev) => ({
                        ...prev,
                        displayName: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="input-label">Username</label>
                    <input
                      type="text"
                      required
                      className="input text-xs"
                      placeholder="username"
                      value={editUserForm.username}
                      onChange={(e) =>
                        setEditUserForm((prev) => ({
                          ...prev,
                          username: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="input-label">Địa chỉ Email</label>
                    <input
                      type="email"
                      required
                      className="input text-xs"
                      placeholder="email@example.com"
                      value={editUserForm.email}
                      onChange={(e) =>
                        setEditUserForm((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="input-label">Ví Token</label>
                    <input
                      type="number"
                      required
                      min={0}
                      className="input text-xs"
                      value={editUserForm.tokenBalance}
                      onChange={(e) =>
                        setEditUserForm((prev) => ({
                          ...prev,
                          tokenBalance: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="input-label">Ví VNĐ</label>
                    <input
                      type="number"
                      required
                      min={0}
                      className="input text-xs"
                      value={editUserForm.vndBalance}
                      onChange={(e) =>
                        setEditUserForm((prev) => ({
                          ...prev,
                          vndBalance: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pb-3">
                  <div>
                    <label className="input-label">Vai trò (Role)</label>
                    <select
                      className="input text-xs py-2 pr-8 appearance-none cursor-pointer disabled:opacity-40"
                      disabled={editModal._id === currentAdminId}
                      value={editUserForm.role}
                      onChange={(e) =>
                        setEditUserForm((prev) => ({
                          ...prev,
                          role: e.target.value,
                        }))
                      }
                    >
                      <option value="user" className="bg-[#121214]">
                        👤 User (Thường)
                      </option>
                      <option value="admin" className="bg-[#121214]">
                        🛡️ Admin (Quản trị)
                      </option>
                    </select>
                  </div>
                  <div>
                    <label className="input-label">Gói thành viên</label>
                    <select
                      className="input text-xs py-2 pr-8 appearance-none cursor-pointer"
                      value={editUserForm.subscriptionTier}
                      onChange={(e) =>
                        setEditUserForm((prev) => ({
                          ...prev,
                          subscriptionTier: e.target.value,
                        }))
                      }
                    >
                      <option value="free" className="bg-[#121214]">
                        ⭕ Miễn phí
                      </option>
                      <option value="pro" className="bg-[#121214]">
                        💎 Gói Pro
                      </option>
                      <option value="ultimate" className="bg-[#121214]">
                        👑 Gói Ultimate
                      </option>
                      <option value="founder" className="bg-[#121214]">
                        ⭐ Founder's Plan
                      </option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditModal(null)
                      setDetailModal(editModal) // Re-open detail
                    }}
                    className="btn-secondary flex-1"
                  >
                    Quay lại
                  </button>
                  <button
                    type="submit"
                    disabled={editUserLoading}
                    className="btn-primary flex-1 flex items-center justify-center gap-1.5 font-display text-xs font-bold disabled:opacity-50 cursor-pointer"
                  >
                    {editUserLoading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      '✓ Lưu thay đổi'
                    )}
                  </button>
                </div>
              </form>
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
  const [newCat, setNewCat] = useState({
    name: '',
    emoji: '🏷️',
    description: '',
  })
  const [adding, setAdding] = useState(false)
  const [editId, setEditId] = useState(null)
  const [editData, setEditData] = useState({})
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    api
      .get('/admin/categories')
      .then(({ data }) => setCategories(data.categories))
      .catch(() => toast.error('Không thể tải danh mục'))
      .finally(() => setLoading(false))
  }, [])

  const handleAdd = async () => {
    if (!newCat.name.trim()) {
      toast.error('Nhập tên danh mục')
      return
    }
    setAdding(true)
    try {
      const { data } = await api.post('/admin/categories', newCat)
      setCategories((prev) => [...prev, data.category])
      setNewCat({ name: '', emoji: '🏷️', description: '' })
      setShowAdd(false)
      toast.success('✅ Đã tạo danh mục')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi tạo danh mục')
    } finally {
      setAdding(false)
    }
  }

  const startEdit = (cat) => {
    setEditId(cat._id)
    setEditData({
      name: cat.name,
      emoji: cat.emoji,
      description: cat.description || '',
    })
  }

  const handleSave = async (id) => {
    setSaving(true)
    try {
      const { data } = await api.put(`/admin/categories/${id}`, editData)
      setCategories((prev) =>
        prev.map((c) => (c._id === id ? data.category : c))
      )
      setEditId(null)
      toast.success('✅ Đã cập nhật')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (cat) => {
    try {
      const { data } = await api.patch(`/admin/categories/${cat._id}/toggle`)
      setCategories((prev) =>
        prev.map((c) =>
          c._id === cat._id ? { ...c, isActive: data.isActive } : c
        )
      )
      toast.success(data.message)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi')
    }
  }

  const handleDelete = async (cat) => {
    if (
      !confirm(`Xóa danh mục "${cat.name}"? Các bài đăng sẽ chuyển về "Khác".`)
    )
      return
    setDeletingId(cat._id)
    try {
      const { data } = await api.delete(`/admin/categories/${cat._id}`)
      setCategories((prev) => prev.filter((c) => c._id !== cat._id))
      toast.success(`✅ ${data.message} (${data.migratedPosts} bài → Khác)`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi xóa')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-lg">Quản lý danh mục</h2>
          <p className="text-xs text-white/40">
            Tắt danh mục để ẩn khỏi trang Upload. Xóa sẽ chuyển bài về "Khác".
          </p>
        </div>
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-all"
        >
          <Plus size={16} /> Thêm mới
        </button>
      </div>

      {/* Add form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="card p-4 space-y-3 border-brand-500/30"
          >
            <p className="text-sm font-semibold text-brand-400">
              Tạo danh mục mới
            </p>
            <div className="grid grid-cols-[80px_1fr] gap-3">
              <input
                className="input text-2xl text-center"
                placeholder="🏷️"
                maxLength={4}
                value={newCat.emoji}
                onChange={(e) =>
                  setNewCat((p) => ({ ...p, emoji: e.target.value }))
                }
              />
              <input
                className="input"
                placeholder="Tên danh mục *"
                maxLength={50}
                value={newCat.name}
                onChange={(e) =>
                  setNewCat((p) => ({ ...p, name: e.target.value }))
                }
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              />
            </div>
            <input
              className="input text-sm"
              placeholder="Mô tả ngắn (tùy chọn)"
              maxLength={200}
              value={newCat.description}
              onChange={(e) =>
                setNewCat((p) => ({ ...p, description: e.target.value }))
              }
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowAdd(false)}
                className="btn-secondary flex-1 text-sm"
              >
                Hủy
              </button>
              <button
                onClick={handleAdd}
                disabled={adding}
                className="flex-1 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {adding ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <>
                    <Plus size={14} /> Tạo
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category list */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card p-4 animate-pulse h-16" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {(() => {
            const sorted = [...categories].sort((a, b) => {
              if (a.slug === 'other') return 1
              if (b.slug === 'other') return -1
              return (a.sortOrder || 0) - (b.sortOrder || 0)
            })
            return sorted.map((cat) => (
              <motion.div
                key={cat._id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`card p-4 flex items-center gap-3 transition-all ${!cat.isActive ? 'opacity-50' : ''}`}
              >
                {/* Emoji */}
                <span className="text-2xl w-8 text-center flex-shrink-0">
                  {cat.emoji}
                </span>

                {/* Edit mode */}
                {editId === cat._id ? (
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <input
                      className="input text-sm"
                      placeholder="Tên"
                      value={editData.name}
                      onChange={(e) =>
                        setEditData((p) => ({ ...p, name: e.target.value }))
                      }
                    />
                    <input
                      className="input text-sm text-2xl text-center"
                      placeholder="Emoji"
                      maxLength={4}
                      value={editData.emoji}
                      onChange={(e) =>
                        setEditData((p) => ({ ...p, emoji: e.target.value }))
                      }
                    />
                    <input
                      className="input text-xs col-span-2"
                      placeholder="Mô tả"
                      value={editData.description}
                      onChange={(e) =>
                        setEditData((p) => ({
                          ...p,
                          description: e.target.value,
                        }))
                      }
                    />
                  </div>
                ) : (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{cat.name}</span>
                      <span className="text-[10px] text-white/30 font-mono">
                        /{cat.slug}
                      </span>
                      {!cat.isActive && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/30 border border-white/10">
                          Tắt
                        </span>
                      )}
                      {cat.slug === 'other' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/20">
                          Fallback
                        </span>
                      )}
                    </div>
                    {cat.description && (
                      <p className="text-xs text-white/30 truncate mt-0.5">
                        {cat.description}
                      </p>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {editId === cat._id ? (
                    <>
                      <button
                        onClick={() => setEditId(null)}
                        className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white transition-all"
                      >
                        <X size={14} />
                      </button>
                      <button
                        onClick={() => handleSave(cat._id)}
                        disabled={saving}
                        className="p-2 rounded-xl bg-green-600/20 border border-green-500/30 text-green-400 hover:bg-green-600/30 transition-all"
                      >
                        {saving ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Save size={14} />
                        )}
                      </button>
                    </>
                  ) : (
                    <>
                      {/* Toggle active */}
                      <button
                        onClick={() => handleToggle(cat)}
                        disabled={cat.slug === 'other'}
                        className={`p-2 rounded-xl border transition-all ${cat.isActive ? 'bg-green-600/20 border-green-500/30 text-green-400 hover:bg-green-600/30' : 'bg-white/5 border-white/10 text-white/30 hover:text-white/60'} disabled:opacity-30 disabled:cursor-not-allowed`}
                        title={cat.isActive ? 'Tắt danh mục' : 'Bật danh mục'}
                      >
                        {cat.isActive ? (
                          <ToggleRight size={16} />
                        ) : (
                          <ToggleLeft size={16} />
                        )}
                      </button>
                      {/* Edit */}
                      <button
                        onClick={() => startEdit(cat)}
                        className="p-2 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 hover:bg-blue-600/30 transition-all"
                        title="Chỉnh sửa"
                      >
                        <Pencil size={14} />
                      </button>
                      {/* Delete */}
                      {cat.slug !== 'other' && (
                        <button
                          onClick={() => handleDelete(cat)}
                          disabled={deletingId === cat._id}
                          className="p-2 rounded-xl bg-red-600/20 border border-red-500/30 text-red-400 hover:bg-red-600/30 transition-all disabled:opacity-50"
                          title="Xóa"
                        >
                          {deletingId === cat._id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </motion.div>
            ))
          })()}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// TAB: SETTINGS
// ══════════════════════════════════════════════════════════════════
function hexToHsl(hex) {
  if (!hex) return { h: 0, s: 0, l: 0 }
  let cleaned = hex.trim().replace('#', '')
  if (cleaned.length === 3) {
    cleaned =
      cleaned[0] +
      cleaned[0] +
      cleaned[1] +
      cleaned[1] +
      cleaned[2] +
      cleaned[2]
  }
  if (cleaned.length !== 6) {
    return { h: 0, s: 0, l: 0 }
  }
  const r = parseInt(cleaned.slice(0, 2), 16) / 255
  const g = parseInt(cleaned.slice(2, 4), 16) / 255
  const b = parseInt(cleaned.slice(4, 6), 16) / 255

  const max = Math.max(r, g, b),
    min = Math.min(r, g, b)
  let h = 0,
    s = 0,
    l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === r) {
      h = (g - b) / d + (g < b ? 6 : 0)
    } else if (max === g) {
      h = (b - r) / d + 2
    } else if (max === b) {
      h = (r - g) / d + 4
    }
    h /= 6
  }
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  }
}

const SettingsTab = ({ onDirtyChange }) => {
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const {
    updateBrandColors,
    setAnnouncement,
    setGlobalLoaderType: setGlobalLoaderTypeContext,
    setSplashExtraMs: setSplashExtraMsContext,
    setMyPostsSkeletonMs: setMyPostsSkeletonMsContext,
    setBlurPremiumImages: setBlurPremiumImagesContext,
    postDetailLayout: postDetailLayoutContext,
    setPostDetailLayout: setPostDetailLayoutContext,
    postLoadingDelayMs: postLoadingDelayMsContext,
    setPostLoadingDelayMs: setPostLoadingDelayMsContext,
  } = useSettings()
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
  const [categoriesPageStyle, setCategoriesPageStyle] = useState('style-2')
  const [categorySaving, setCategorySaving] = useState(false)
  const [activeSubTab, setActiveSubTab] = useState('general')
  const [selectedConfigPage, setSelectedConfigPage] = useState('home')
  const [heroBannerMode, setHeroBannerMode] = useState('auto')
  const [heroBannerImage, setHeroBannerImage] = useState('')
  const [heroBannerSaving, setHeroBannerSaving] = useState(false)
  const [heroCollageMode, setHeroCollageMode] = useState('auto')
  const [heroCollageImages, setHeroCollageImages] = useState(Array(8).fill(''))
  const [heroCollageSaving, setHeroCollageSaving] = useState(false)
  const [globalLoaderType, setGlobalLoaderType] = useState('wave')
  const [loaderSaving, setLoaderSaving] = useState(false)
  const [splashExtraMs, setSplashExtraMs] = useState(0)
  const [splashSaving, setSplashSaving] = useState(false)
  const [myPostsSkeletonMs, setMyPostsSkeletonMs] = useState(0)
  const [myPostsSkeletonSaving, setMyPostsSkeletonSaving] = useState(false)
  const [postLoadingDelayMs, setPostLoadingDelayMs] = useState(0)
  const [postLoadingDelaySaving, setPostLoadingDelaySaving] = useState(false)
  const [blurPremiumImages, setBlurPremiumImages] = useState(false)
  const [savingBlur, setSavingBlur] = useState(false)
  const [postDetailLayout, setPostDetailLayout] = useState('left-image')
  const [savingLayout, setSavingLayout] = useState(false)
  const [trendingCarouselInterval, setTrendingCarouselInterval] = useState(5000)
  const [trendingCarouselSaving, setTrendingCarouselSaving] = useState(false)
  const [discoveryAutoScrollInterval, setDiscoveryAutoScrollInterval] =
    useState(10000)
  const [discoveryAutoScrollStagger, setDiscoveryAutoScrollStagger] =
    useState(1000)
  const [savingDiscoveryAutoScroll, setSavingDiscoveryAutoScroll] =
    useState(false)

  const [savedColors, setSavedColors] = useState({
    primary: '#7c3aed',
    gradient: '#3b82f6',
    opacity: 1,
    blur: 0,
    enableGradient: true,
    shadowStyle: 'soft',
  })

  const [customColors, setCustomColors] = useState({
    primary: '#7c3aed',
    gradient: '#3b82f6',
    opacity: 1,
    blur: 0,
    enableGradient: true,
    shadowStyle: 'soft',
  })

  const COLOR_PRESETS = [
    {
      name: 'Mặc định (PicSpy)',
      primary: '#7c3aed',
      gradient: '#3b82f6',
      opacity: 1,
      blur: 0,
      desc: 'Màu tím PicSpy mặc định',
    },
    {
      name: 'Liquid Glass (Mới)',
      primary: '#345ceb',
      gradient: '#00c6ff',
      opacity: 0.75,
      blur: 12,
      desc: 'Xanh lam lỏng & trong suốt',
    },
    {
      name: 'Cyberpunk Neon',
      primary: '#ec4899',
      gradient: '#8b5cf6',
      opacity: 1,
      blur: 0,
      desc: 'Hồng sen & Tím neon rực rỡ',
    },
    {
      name: 'Forest Emerald',
      primary: '#10b981',
      gradient: '#059669',
      opacity: 1,
      blur: 0,
      desc: 'Xanh lá ngọc lục bảo',
    },
    {
      name: 'Amber Glow',
      primary: '#f59e0b',
      gradient: '#d97706',
      opacity: 1,
      blur: 0,
      desc: 'Màu hổ phách hoàng kim',
    },
  ]

  useEffect(() => {
    api
      .get('/admin/settings')
      .then(({ data }) => {
        setSettings(data.settings)
        const primary = data.settings?.primaryColor || '#7c3aed'
        const gradient = data.settings?.gradientColor || '#3b82f6'
        const opacity =
          data.settings?.brandOpacity !== undefined
            ? data.settings.brandOpacity
            : 1
        const blur =
          data.settings?.brandBlur !== undefined ? data.settings.brandBlur : 0
        const gradientEnabled =
          data.settings?.enableGradient !== undefined
            ? data.settings.enableGradient
            : true
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
        setCategoriesPageStyle(data.settings?.categoriesPageStyle || 'style-2')
        setHeroBannerMode(data.settings?.heroBannerMode || 'auto')
        setHeroBannerImage(
          data.settings?.heroBannerImage ||
            'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&q=85'
        )
        setHeroCollageMode(data.settings?.heroCollageMode || 'auto')
        setHeroCollageImages(
          data.settings?.heroCollageImages?.length >= 8
            ? data.settings.heroCollageImages
            : Array(8).fill('')
        )
        setSplashExtraMs(data.settings?.splashExtraMs ?? 0)
        setMyPostsSkeletonMs(data.settings?.myPostsSkeletonMs ?? 0)
        setPostLoadingDelayMs(data.settings?.postLoadingDelayMs ?? 0)
        setBlurPremiumImages(data.settings?.blurPremiumImages || false)
        setPostDetailLayout(data.settings?.postDetailLayout || 'left-image')
        setTrendingCarouselInterval(
          data.settings?.trendingCarouselInterval ?? 5000
        )
        setDiscoveryAutoScrollInterval(
          data.settings?.discoveryAutoScrollInterval ?? 10000
        )
        setDiscoveryAutoScrollStagger(
          data.settings?.discoveryAutoScrollStagger ?? 1000
        )
        setSavedColors({
          primary,
          gradient,
          opacity,
          blur,
          enableGradient: gradientEnabled,
          shadowStyle: sStyle,
        })

        // Check if saved colors match any preset
        const matchesPreset = COLOR_PRESETS.some(
          (p) =>
            p.primary.toLowerCase() === primary.toLowerCase() &&
            p.gradient.toLowerCase() === gradient.toLowerCase() &&
            p.opacity === opacity &&
            p.blur === blur &&
            gradientEnabled === true &&
            sStyle === 'soft'
        )
        if (!matchesPreset) {
          setCustomColors({
            primary,
            gradient,
            opacity,
            blur,
            enableGradient: gradientEnabled,
            shadowStyle: sStyle,
          })
        }
      })
      .catch(() => toast.error('Không tải được cài đặt'))
      .finally(() => setLoading(false))
  }, [])

  const hasUnsavedChanges =
    (primaryColor || '').toLowerCase() !==
      (savedColors.primary || '').toLowerCase() ||
    (gradientColor || '').toLowerCase() !==
      (savedColors.gradient || '').toLowerCase() ||
    brandOpacity !== savedColors.opacity ||
    brandBlur !== savedColors.blur ||
    enableGradient !== savedColors.enableGradient ||
    shadowStyle !== savedColors.shadowStyle

  useEffect(() => {
    onDirtyChange?.(hasUnsavedChanges)
  }, [hasUnsavedChanges, onDirtyChange])

  // Sync customColors state when user edits custom colors (when they don't match any preset)
  useEffect(() => {
    const isPresetActive = COLOR_PRESETS.some(
      (p) =>
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
        shadowStyle,
      })
    }
  }, [
    primaryColor,
    gradientColor,
    brandOpacity,
    brandBlur,
    enableGradient,
    shadowStyle,
  ])

  useEffect(() => {
    if (!hasUnsavedChanges) return

    const handleBeforeUnload = (e) => {
      e.preventDefault()
      e.returnValue =
        'Cấu hình màu của bạn chưa được lưu. Bạn có chắc chắn muốn rời đi?'
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
        shadowStyle: sStyle,
      })
      setSettings(data.settings)
      updateBrandColors(pColor, gColor, opacity, blur, gradientEnabled, sStyle)
      setSavedColors({
        primary: pColor,
        gradient: gColor,
        opacity,
        blur,
        enableGradient: gradientEnabled,
        shadowStyle: sStyle,
      })
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
      toast.success(
        next
          ? '⚡ Đã BẬT tự động duyệt ảnh'
          : '🔒 Đã TẮT — ảnh sẽ chờ duyệt thủ công'
      )
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi cập nhật')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveAnnouncement = async () => {
    setAnnouncementSaving(true)
    try {
      const { data } = await api.put('/admin/settings', {
        announcementText,
        announcementLink,
        announcementEnabled,
      })
      setSettings(data.settings)
      setAnnouncement({
        text: announcementText,
        link: announcementLink,
        enabled: announcementEnabled,
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
      const { data } = await api.put('/admin/settings', {
        categoryStyle: newStyle,
      })
      setSettings(data.settings)
      setCategoryStyle(data.settings?.categoryStyle || 'style-1')
      toast.success('🎨 Đã cập nhật giao diện danh mục nổi bật!')
    } catch (err) {
      toast.error(
        err.response?.data?.message || 'Lỗi khi lưu giao diện danh mục'
      )
    } finally {
      setCategorySaving(false)
    }
  }

  const handleSaveCategoriesPageStyle = async (newStyle) => {
    setCategorySaving(true)
    try {
      const { data } = await api.put('/admin/settings', {
        categoriesPageStyle: newStyle,
      })
      setSettings(data.settings)
      setCategoriesPageStyle(data.settings?.categoriesPageStyle || 'style-2')
      toast.success('🎨 Đã cập nhật giao diện trang danh mục!')
    } catch (err) {
      toast.error(
        err.response?.data?.message || 'Lỗi khi lưu giao diện trang danh mục'
      )
    } finally {
      setCategorySaving(false)
    }
  }

  const handleSaveHeroBanner = async () => {
    setHeroBannerSaving(true)
    try {
      const { data } = await api.put('/admin/settings', {
        heroBannerMode,
        heroBannerImage,
      })
      setSettings(data.settings)
      setHeroBannerMode(data.settings?.heroBannerMode || 'auto')
      setHeroBannerImage(
        data.settings?.heroBannerImage ||
          'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&q=85'
      )
      toast.success('🏞️ Đã lưu cấu hình ảnh bìa số liệu!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi lưu cấu hình ảnh bìa')
    } finally {
      setHeroBannerSaving(false)
    }
  }

  const handleSaveTrendingCarouselInterval = async () => {
    setTrendingCarouselSaving(true)
    try {
      const { data } = await api.put('/admin/settings', {
        trendingCarouselInterval: Number(trendingCarouselInterval),
      })
      setSettings(data.settings)
      setTrendingCarouselInterval(
        data.settings?.trendingCarouselInterval ?? 5000
      )
      toast.success('⏱️ Đã lưu cấu hình tự động chuyển Carousel!')
    } catch (err) {
      toast.error(
        err.response?.data?.message || 'Lỗi khi lưu cấu hình Carousel'
      )
    } finally {
      setTrendingCarouselSaving(false)
    }
  }

  const handleSaveHeroCollage = async () => {
    setHeroCollageSaving(true)
    try {
      const { data } = await api.put('/admin/settings', {
        heroCollageMode,
        heroCollageImages,
      })
      setSettings(data.settings)
      setHeroCollageMode(data.settings?.heroCollageMode || 'auto')
      setHeroCollageImages(
        data.settings?.heroCollageImages?.length >= 8
          ? data.settings.heroCollageImages
          : Array(8).fill('')
      )
      toast.success('🖼️ Đã lưu cấu hình ảnh nền Hero!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi lưu cấu hình ảnh nền')
    } finally {
      setHeroCollageSaving(false)
    }
  }

  const handleSaveGlobalLoader = async (newType) => {
    setLoaderSaving(true)
    try {
      const { data } = await api.put('/admin/settings', {
        globalLoaderType: newType,
      })
      setSettings(data.settings)
      setGlobalLoaderType(data.settings?.globalLoaderType || 'wave')
      setGlobalLoaderTypeContext(data.settings?.globalLoaderType || 'wave')
      toast.success('⚙️ Đã lưu cấu hình hiệu ứng tải toàn hệ thống!')
    } catch (err) {
      toast.error(
        err.response?.data?.message || 'Lỗi khi lưu cấu hình hiệu ứng tải'
      )
    } finally {
      setLoaderSaving(false)
    }
  }

  const handleSaveSplashMs = async (val) => {
    setSplashSaving(true)
    try {
      const { data } = await api.put('/admin/settings', { splashExtraMs: val })
      setSettings(data.settings)
      setSplashExtraMs(data.settings?.splashExtraMs ?? 0)
      setSplashExtraMsContext(data.settings?.splashExtraMs ?? 0)
      toast.success(
        `⏱️ Thời gian loading đã cập nhật: ${val >= 1000 ? (val / 1000).toFixed(1) + 's' : val + 'ms'}`
      )
    } catch (err) {
      toast.error(
        err.response?.data?.message || 'Lỗi khi lưu thời gian loading'
      )
    } finally {
      setSplashSaving(false)
    }
  }

  const handleSaveMyPostsSkeletonMs = async (val) => {
    setMyPostsSkeletonSaving(true)
    try {
      const { data } = await api.put('/admin/settings', {
        myPostsSkeletonMs: val,
      })
      setSettings(data.settings)
      setMyPostsSkeletonMs(data.settings?.myPostsSkeletonMs ?? 0)
      setMyPostsSkeletonMsContext(data.settings?.myPostsSkeletonMs ?? 0)
      toast.success(
        `🖼️ Thời gian Skeleton Loading đã cập nhật: ${val >= 1000 ? (val / 1000).toFixed(1) + 's' : val + 'ms'}`
      )
    } catch (err) {
      toast.error(
        err.response?.data?.message || 'Lỗi khi lưu thời gian Skeleton Loading'
      )
    } finally {
      setMyPostsSkeletonSaving(false)
    }
  }

  const handleSavePostLoadingDelayMs = async (val) => {
    setPostLoadingDelaySaving(true)
    try {
      const { data } = await api.put('/admin/settings', {
        postLoadingDelayMs: val,
      })
      setSettings(data.settings)
      setPostLoadingDelayMs(data.settings?.postLoadingDelayMs ?? 0)
      setPostLoadingDelayMsContext(data.settings?.postLoadingDelayMs ?? 0)
      toast.success(
        val === 0
          ? '⏱️ Đã tắt hiệu ứng trì hoãn tải ảnh!'
          : `⏱️ Đã cập nhật thời gian trì hoãn tải ảnh: ${val >= 1000 ? (val / 1000).toFixed(1) + 's' : val + 'ms'}`
      )
    } catch (err) {
      toast.error(
        err.response?.data?.message || 'Lỗi khi lưu thời gian trì hoãn tải ảnh'
      )
    } finally {
      setPostLoadingDelaySaving(false)
    }
  }

  const handleSaveBlurPremium = async (val) => {
    setSavingBlur(true)
    try {
      const { data } = await api.put('/admin/settings', {
        blurPremiumImages: val,
      })
      setSettings(data.settings)
      setBlurPremiumImages(data.settings?.blurPremiumImages || false)
      if (setBlurPremiumImagesContext) {
        setBlurPremiumImagesContext(data.settings?.blurPremiumImages || false)
      }
      toast.success(
        val
          ? '💎 Đã bật làm mờ & khóa xem trước ảnh Premium!'
          : '💎 Đã tắt làm mờ ảnh Premium!'
      )
    } catch (err) {
      toast.error(
        err.response?.data?.message || 'Lỗi khi cập nhật cài đặt làm mờ'
      )
    } finally {
      setSavingBlur(false)
    }
  }

  const handleSavePostDetailLayout = async (val) => {
    setSavingLayout(true)
    try {
      const { data } = await api.put('/admin/settings', {
        postDetailLayout: val,
      })
      setSettings(data.settings)
      setPostDetailLayout(data.settings?.postDetailLayout || 'left-image')
      if (setPostDetailLayoutContext) {
        setPostDetailLayoutContext(
          data.settings?.postDetailLayout || 'left-image'
        )
      }
      toast.success('💎 Đã cập nhật bố cục trang chi tiết bài viết!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi cập nhật bố cục')
    } finally {
      setSavingLayout(false)
    }
  }

  const handleSaveDiscoveryAutoScrollSettings = async () => {
    setSavingDiscoveryAutoScroll(true)
    try {
      const { data } = await api.put('/admin/settings', {
        discoveryAutoScrollInterval: Number(discoveryAutoScrollInterval),
        discoveryAutoScrollStagger: Number(discoveryAutoScrollStagger),
      })
      setSettings(data.settings)
      setDiscoveryAutoScrollInterval(
        data.settings?.discoveryAutoScrollInterval ?? 10000
      )
      setDiscoveryAutoScrollStagger(
        data.settings?.discoveryAutoScrollStagger ?? 1000
      )
      toast.success('💎 Đã cập nhật cài đặt tự động cuộn khám phá!')
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          'Lỗi khi cập nhật cài đặt tự động cuộn khám phá'
      )
    } finally {
      setSavingDiscoveryAutoScroll(false)
    }
  }

  const localPreviewCSSVariables = (() => {
    const { h, s } = hexToHsl(primaryColor)
    const startVal = `hsla(${h}, ${s}%, 44%, ${brandOpacity})`
    const endVal = enableGradient ? gradientColor : startVal

    const vars = {
      '--local-brand-opacity': brandOpacity,
      '--local-brand-blur': brandBlur > 0 ? `blur(${brandBlur}px)` : 'none',
      '--local-brand-600': startVal,
      '--local-brand-500': `hsla(${h}, ${s}%, 52%, ${brandOpacity})`,
      '--local-brand-gradient-end': endVal,
      '--local-glass-bg': `rgba(15, 15, 19, ${Math.max(0.15, brandOpacity * 0.45)})`,
      '--local-glass-border': `rgba(255, 255, 255, ${0.08 + (1 - brandOpacity) * 0.07})`,
    }

    if (shadowStyle === 'glow') {
      vars['--local-box-shadow-neon-glow'] =
        `0 0 20px hsla(${h}, ${s}%, 55%, 0.45)`
    } else {
      vars['--local-box-shadow-neon-glow'] = 'none'
    }

    return vars
  })()

  if (loading)
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card p-6 animate-pulse h-20" />
        ))}
      </div>
    )

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="font-bold text-xl text-white mb-1">Cài đặt hệ thống</h2>
        <p className="text-sm text-white/40">
          Quản lý các tính năng và hành vi tự động của PicSpy.
        </p>
      </div>

      {/* Sub-tabs Navigation */}
      <div className="flex gap-2 p-1.5 rounded-xl bg-white/[0.02] border border-white/5 max-w-md">
        {[
          { key: 'general', label: '📁 Cấu hình Chung' },
          { key: 'branding', label: '🎨 Giao diện & Màu sắc' },
          { key: 'pages', label: '📄 Cài đặt trang' },
          { key: 'maintenance', label: '⚡ Bảo trì & Test Cron' },
        ].map((subTab) => (
          <button
            key={subTab.key}
            type="button"
            onClick={() => setActiveSubTab(subTab.key)}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer text-center
              ${
                activeSubTab === subTab.key
                  ? 'bg-brand-600 text-white shadow-md font-display'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
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
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors duration-300 ${
                  settings?.autoApprove ? 'bg-green-500/20' : 'bg-white/5'
                }`}
              >
                {settings?.autoApprove ? (
                  <Zap size={22} className="text-green-400" />
                ) : (
                  <ZapOff size={22} className="text-white/30" />
                )}
              </div>
              <div>
                <h3 className="font-bold text-white text-base mb-1">
                  Tự động duyệt ảnh
                </h3>
                <p className="text-sm text-white/50 leading-relaxed">
                  Khi <strong className="text-white/70">BẬT</strong>: ảnh upload
                  xong sẽ được duyệt tự động sau khi worker xử lý.
                  <br />
                  Khi <strong className="text-white/70">TẮT</strong>: mọi ảnh sẽ
                  ở trạng thái{' '}
                  <span className="text-yellow-400 font-semibold">
                    Chờ duyệt
                  </span>{' '}
                  — admin phải duyệt thủ công.
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
              {saving && (
                <Loader2
                  size={10}
                  className="absolute inset-0 m-auto text-white animate-spin"
                />
              )}
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* ── Theme Customizer Card ─── */}
      {activeSubTab === 'branding' && (
        <div className="card p-6 border border-white/10 space-y-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center flex-shrink-0">
              <Palette className="text-brand-400" size={22} />
            </div>
            <div>
              <h3 className="font-bold text-white text-base mb-1">
                Tùy biến Giao diện (Website Theme)
              </h3>
              <p className="text-sm text-white/50 leading-relaxed">
                Thay đổi tông màu thương hiệu chính (`primary`) và dải màu
                gradient trên toàn bộ nút, tag, trạng thái của website.
              </p>
            </div>
          </div>

          {/* Color picker inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-white/60 block">
                Màu chính (Primary Color)
              </label>
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
              <label className="text-xs font-semibold text-white/60 block">
                Màu Gradient cuối (Gradient End)
              </label>
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
                <label className="text-xs font-semibold text-white/60">
                  Độ trong suốt màu chính (Opacity)
                </label>
                <span className="text-xs font-bold text-brand-400">
                  {Math.round(brandOpacity * 100)}%
                </span>
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
                <label className="text-xs font-semibold text-white/60">
                  Độ nhòe nền (Backdrop Blur)
                </label>
                <span className="text-xs font-bold text-brand-400">
                  {brandBlur}px
                </span>
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
                <label className="text-xs font-semibold text-white/60">
                  Sử dụng dải màu (Gradient Color)
                </label>
                <span className="text-xs font-bold text-brand-400">
                  {enableGradient ? 'BẬT' : 'TẮT'}
                </span>
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
                  {enableGradient
                    ? 'Bật hiển thị gradient chuyển màu mượt mà'
                    : 'Chỉ sử dụng duy nhất màu chính (Solid)'}
                </span>
              </div>
            </div>

            {/* Shadow Style Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-white/60 block">
                Hiệu ứng bóng đổ / Tỏa sáng (Shadow Style)
              </label>
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
              <span className="text-xs font-semibold text-white/50 block">
                Bản xem trước nút nhấn (Live Preview)
              </span>
              <span className="text-[10px] text-yellow-500 font-bold bg-yellow-500/10 px-2 py-0.5 rounded-full animate-pulse">
                Nháp chưa áp dụng
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4 py-3 justify-center">
              {/* Preview Primary Button */}
              <button
                type="button"
                className="px-6 py-2.5 rounded-xl text-xs font-bold text-white transition-all duration-300"
                style={{
                  background:
                    'linear-gradient(135deg, var(--local-brand-600) 0%, var(--local-brand-gradient-end) 100%)',
                  backdropFilter: 'var(--local-brand-blur, none)',
                  WebkitBackdropFilter: 'var(--local-brand-blur, none)',
                  boxShadow:
                    '0 4px 14px rgba(0, 0, 0, 0.25), var(--local-box-shadow-neon-glow, 0 0 0 transparent)',
                  border:
                    '1px solid rgba(255, 255, 255, calc((1 - var(--local-brand-opacity, 1)) * 0.15))',
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
                  boxShadow:
                    '0 8px 32px rgba(0,0,0,0.25), var(--local-box-shadow-neon-glow, 0 0 0 transparent)',
                }}
              >
                Nút Kính mẫu
              </button>
            </div>
          </div>

          {/* Presets */}
          <div className="space-y-2.5 pt-4 border-t border-white/5">
            <label className="text-xs font-semibold text-white/60 block">
              Mẫu màu thiết lập sẵn (Theme Presets)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {COLOR_PRESETS.map((preset) => {
                const isActive =
                  primaryColor.toLowerCase() === preset.primary.toLowerCase() &&
                  gradientColor.toLowerCase() ===
                    preset.gradient.toLowerCase() &&
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
                      <div
                        className="w-3.5 h-3.5 rounded-full border border-white/20"
                        style={{ background: preset.primary }}
                      />
                      <div
                        className="w-3.5 h-3.5 rounded-full border border-white/20 -ml-1.5"
                        style={{ background: preset.gradient }}
                      />
                      <span className="text-xs font-bold text-white/80 truncate">
                        {preset.name}
                      </span>
                    </div>
                    <span className="text-[10px] text-white/35 leading-tight block truncate">
                      {preset.desc}
                    </span>
                  </button>
                )
              })}

              {/* Custom Option */}
              {(() => {
                const isCustomActive = !COLOR_PRESETS.some(
                  (p) =>
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
                      <div
                        className="w-3.5 h-3.5 rounded-full border border-white/20"
                        style={{ background: customColors.primary }}
                      />
                      <div
                        className="w-3.5 h-3.5 rounded-full border border-white/20 -ml-1.5"
                        style={{ background: customColors.gradient }}
                      />
                      <span className="text-xs font-bold text-white/80 truncate">
                        Custom
                      </span>
                    </div>
                    <span className="text-[10px] text-white/35 leading-tight block truncate">
                      Màu tùy chọn của riêng bạn
                    </span>
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
              {colorSaving ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Save size={13} />
              )}
              Lưu cấu hình màu
            </button>
          </div>
        </div>
      )}

      {/* ── Announcement Banner Card ─── */}
      {activeSubTab === 'general' && (
        <div className="card p-6 border border-white/10 space-y-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center flex-shrink-0">
              <Megaphone className="text-brand-400" size={22} />
            </div>
            <div>
              <h3 className="font-bold text-white text-base mb-1">
                Thông báo hệ thống (Announcement Banner)
              </h3>
              <p className="text-sm text-white/50 leading-relaxed">
                Hiển thị một thanh thông báo toàn trang ở đầu website cho toàn
                bộ người dùng.
              </p>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            {/* Enable/Disable Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
              <div>
                <span className="text-xs font-semibold text-white block">
                  Trạng thái thông báo
                </span>
                <span className="text-[10px] text-white/40 block">
                  Bật để hiển thị banner thông báo trên toàn trang
                </span>
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
              <label className="text-xs font-semibold text-white/60 block">
                Nội dung thông báo
              </label>
              <textarea
                value={announcementText}
                onChange={(e) => setAnnouncementText(e.target.value)}
                className="input text-xs w-full py-2 px-3 resize-none h-16"
                placeholder="Nhập nội dung hiển thị trên banner (ví dụ: Bảo trì hệ thống từ 2h - 4h sáng mai)..."
              />
            </div>

            {/* Link Input */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-white/60 block">
                Đường dẫn liên kết (Link URL - Tùy chọn)
              </label>
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
              {announcementSaving ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Save size={13} />
              )}
              Lưu và áp dụng thông báo
            </button>
          </div>
        </div>
      )}

      {/* ── Global Loading Style Card ─── */}
      {activeSubTab === 'general' && (
        <div className="card p-6 border border-white/10 space-y-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center flex-shrink-0">
              <RefreshCw className="text-brand-400" size={22} />
            </div>
            <div>
              <h3 className="font-bold text-white text-base mb-1">
                Hiệu ứng tải trang (Global Loading Style)
              </h3>
              <p className="text-sm text-white/50 leading-relaxed">
                Chọn hiệu ứng hiển thị khi người dùng tải trang, đổi chủ đề hoặc
                tải dữ liệu trên toàn hệ thống.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {[
              {
                key: 'wave',
                title: '🌊 Sóng chữ nhiều màu (Liquid Wave)',
                desc: 'Từng chữ PICSPY lần lượt đầy nước từ dưới lên, màu sắc đồng bộ với chủ đề website.',
                preview: (
                  <div className="h-28 rounded-xl bg-black/40 border border-white/5 flex items-center justify-center overflow-hidden p-4">
                    <div
                      className="liquid-loader scale-75 select-none"
                      aria-label="PICSPY"
                    >
                      <div className="letter">
                        <span className="bg">P</span>
                        <span className="fg p1">P</span>
                      </div>
                      <div className="letter">
                        <span className="bg">I</span>
                        <span className="fg i">I</span>
                      </div>
                      <div className="letter">
                        <span className="bg">C</span>
                        <span className="fg c">C</span>
                      </div>
                      <div className="letter">
                        <span className="bg">S</span>
                        <span className="fg s">S</span>
                      </div>
                      <div className="letter">
                        <span className="bg">P</span>
                        <span className="fg p2">P</span>
                      </div>
                      <div className="letter">
                        <span className="bg">Y</span>
                        <span className="fg y">Y</span>
                      </div>
                    </div>
                  </div>
                ),
              },
              {
                key: 'text-wave',
                title: '💧 Sóng nước đơn sắc (Text Wave)',
                desc: 'Chữ PICSPY hiệu ứng nước sóng dạng clip-path đồng nhất, glow nhẹ theo màu chủ đề.',
                preview: (
                  <div className="h-28 rounded-xl bg-black/40 border border-white/5 flex items-center justify-center overflow-hidden">
                    <div className="text-wave-loader size-md select-none">
                      <span>PICSPY</span>
                      <span>PICSPY</span>
                    </div>
                  </div>
                ),
              },
              {
                key: 'banter',
                title: '🇻🇳 Lưới ảnh ngôi sao (Banter Star Grid)',
                desc: 'Hiển thị lưới 9 ô vuông di chuyển theo thuật toán xếp hình với lá cờ Việt Nam mix-blend độc đáo.',
                preview: (
                  <div className="h-28 rounded-xl bg-black/40 border border-white/5 flex items-center justify-center overflow-hidden p-4">
                    <div
                      className="banter-loader-container scale-75 select-none"
                      style={{ backgroundColor: '#0b0f19' }}
                    >
                      <div className="banter-loader">
                        <div className="banter-loader__box"></div>
                        <div className="banter-loader__box"></div>
                        <div className="banter-loader__box"></div>
                        <div className="banter-loader__box"></div>
                        <div className="banter-loader__box"></div>
                        <div className="banter-loader__box"></div>
                        <div className="banter-loader__box"></div>
                        <div className="banter-loader__box"></div>
                        <div className="banter-loader__box"></div>
                      </div>
                      <div className="photo-overlay"></div>
                    </div>
                  </div>
                ),
              },
            ].map((loaderOpt) => (
              <div
                key={loaderOpt.key}
                onClick={() =>
                  !loaderSaving && handleSaveGlobalLoader(loaderOpt.key)
                }
                className={`p-4 rounded-xl border transition-all duration-300 cursor-pointer text-left flex flex-col justify-between group min-h-[220px]
                  ${
                    globalLoaderType === loaderOpt.key
                      ? 'border-brand-500 bg-brand-500/5 shadow-md shadow-brand-500/5'
                      : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                  }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p
                      className={`text-xs font-bold transition-colors ${globalLoaderType === loaderOpt.key ? 'text-brand-300' : 'text-white group-hover:text-brand-300'}`}
                    >
                      {loaderOpt.title}
                    </p>
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-md border
                      ${
                        globalLoaderType === loaderOpt.key
                          ? 'border-brand-500/30 bg-brand-500/10 text-brand-300'
                          : 'border-white/10 text-white/30'
                      }`}
                    >
                      {globalLoaderType === loaderOpt.key
                        ? 'Đang hoạt động'
                        : 'Kích hoạt'}
                    </span>
                  </div>
                  <p className="text-[10px] text-white/50 leading-relaxed">
                    {loaderOpt.desc}
                  </p>
                </div>
                {loaderOpt.preview}
              </div>
            ))}
          </div>

          {/* ── Splash Duration Slider ───────────────────────── */}
          <div className="mt-6 p-5 rounded-xl border border-white/10 bg-white/[0.02] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="text-lg">⏱️</span> Thời gian hiệu ứng Loading
                </h4>
                <p className="text-[11px] text-white/40 mt-0.5">
                  Thời gian cộng thêm vào sau khi hệ thống tải xong dữ liệu để
                  kéo dài hiệu ứng tải trang
                </p>
              </div>
              {splashSaving && (
                <span className="flex items-center gap-1.5 text-xs text-brand-400 font-semibold animate-pulse">
                  Đang lưu...
                </span>
              )}
            </div>

            {/* Value Display */}
            <div className="flex items-baseline gap-2">
              <span
                className="text-3xl font-black tabular-nums tracking-tight"
                style={{
                  color:
                    'hsla(var(--color-brand-h), var(--color-brand-s), 65%, 1)',
                }}
              >
                {splashExtraMs >= 1000
                  ? (splashExtraMs / 1000).toFixed(1)
                  : splashExtraMs}
              </span>
              <span className="text-sm font-bold text-white/40">
                {splashExtraMs >= 1000 ? 'giây' : 'ms'}
              </span>
              {splashExtraMs === 0 && (
                <span className="ml-2 text-[10px] font-semibold text-emerald-400/80 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                  Tắt
                </span>
              )}
            </div>

            {/* Slider */}
            <div className="relative pt-1 pb-2">
              <input
                type="range"
                min={0}
                max={10000}
                step={100}
                value={splashExtraMs}
                onChange={(e) => setSplashExtraMs(Number(e.target.value))}
                onMouseUp={(e) => handleSaveSplashMs(Number(e.target.value))}
                onTouchEnd={(e) => handleSaveSplashMs(Number(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, hsla(var(--color-brand-h), var(--color-brand-s), 55%, 1) 0%, hsla(var(--color-brand-h), var(--color-brand-s), 55%, 1) ${(splashExtraMs / 10000) * 100}%, rgba(255,255,255,0.08) ${(splashExtraMs / 10000) * 100}%, rgba(255,255,255,0.08) 100%)`,
                }}
              />
              {/* Tick marks */}
              <div className="relative w-full h-5 mt-2">
                {[0, 1000, 2000, 3000, 5000, 7000, 10000].map((v) => {
                  const pct = (v / 10000) * 100
                  const isLeftBound = v === 0
                  const isRightBound = v === 10000

                  let transformStyle = 'translateX(-50%)'
                  let leftStyle = `${pct}%`
                  if (isLeftBound) {
                    leftStyle = '0%'
                    transformStyle = 'none'
                  } else if (isRightBound) {
                    leftStyle = 'auto'
                    transformStyle = 'none'
                  }

                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => {
                        setSplashExtraMs(v)
                        handleSaveSplashMs(v)
                      }}
                      className={`absolute text-[9px] font-mono transition-colors cursor-pointer hover:text-brand-300 ${
                        splashExtraMs === v
                          ? 'text-brand-400 font-bold'
                          : 'text-white/25'
                      }`}
                      style={{
                        left: leftStyle,
                        right: isRightBound ? '0%' : 'auto',
                        transform: transformStyle,
                      }}
                    >
                      {v === 0 ? '0' : v >= 1000 ? `${v / 1000}s` : `${v}ms`}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Preset buttons row */}
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Tắt (0ms)', value: 0 },
                { label: 'Nhanh (500ms)', value: 500 },
                { label: 'Vừa (1.5s)', value: 1500 },
                { label: 'Lâu (3s)', value: 3000 },
                { label: 'Rất lâu (5s)', value: 5000 },
                { label: 'Siêu lâu (10s)', value: 10000 },
              ].map((p) => (
                <button
                  key={p.value}
                  onClick={() => {
                    setSplashExtraMs(p.value)
                    handleSaveSplashMs(p.value)
                  }}
                  className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                    splashExtraMs === p.value
                      ? 'border-brand-500/40 bg-brand-500/10 text-brand-300'
                      : 'border-white/8 bg-white/[0.03] text-white/40 hover:border-white/15 hover:text-white/60'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Page Specific Settings ─── */}
      {activeSubTab === 'pages' && (
        <div className="space-y-6">
          <div className="card p-5 border border-white/10 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-white text-sm mb-1 font-display">
                  Cài đặt giao diện trang
                </h4>
                <p className="text-xs text-white/40">
                  Chọn trang cụ thể bạn muốn thiết kế và thay đổi phong cách
                  hiển thị.
                </p>
              </div>
              <div className="relative">
                <select
                  value={selectedConfigPage}
                  onChange={(e) => setSelectedConfigPage(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-brand-500 cursor-pointer pr-10 appearance-none min-w-[200px]"
                >
                  <option value="home" className="bg-[#121214]">
                    🏠 Trang chủ (Home Page)
                  </option>
                  <option value="categories" className="bg-[#121214]">
                    📁 Trang danh mục (Categories Page)
                  </option>
                  <option value="search" className="bg-[#121214]">
                    🔍 Trang khám phá (Search Page)
                  </option>
                  <option value="profile" className="bg-[#121214]">
                    👤 Trang cá nhân (Profile Page)
                  </option>
                  <option value="post-detail" className="bg-[#121214]">
                    💎 Trang chi tiết (Post Detail)
                  </option>
                  <option value="my-posts" className="bg-[#121214]">
                    🖼️ Ảnh của tôi (My Posts)
                  </option>
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-white/40 text-xs">
                  ▼
                </div>
              </div>
            </div>
          </div>

          {/* Render Home Page Config */}
          {selectedConfigPage === 'home' && (
            <>
              <div className="card p-6 border-white/5 space-y-5 bg-white/[0.01]">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Palette size={16} className="text-brand-400" /> Cấu hình
                      Giao diện Danh mục nổi bật
                    </h3>
                    <p className="text-[11px] text-white/40">
                      Chọn kiểu hiển thị của hàng danh mục nổi bật ngoài trang
                      chủ
                    </p>
                  </div>
                  {categorySaving && (
                    <span className="flex items-center gap-1.5 text-xs text-brand-400 font-semibold">
                      <Loader2 size={12} className="animate-spin" /> Đang cập
                      nhật...
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    {
                      key: 'style-1',
                      title: 'Style 1: Ảnh bìa Đơn (Cổ điển)',
                      desc: 'Tự động lấy 1 ảnh nổi bật nhất có lượt xem cao nhất của danh mục làm ảnh bìa.',
                    },
                    {
                      key: 'style-2',
                      title: 'Style 2: Lưới 4 ảnh nghệ thuật',
                      desc: 'Lấy top 4 ảnh nhiều views nhất sắp xếp dạng lưới Asymmetrical Staggered nghệ thuật.',
                    },
                    {
                      key: 'style-3',
                      title: 'Style 3: Slideshow tự xoay vòng',
                      desc: 'Tự động xoay vòng 5-6 ảnh nổi bật nhất sau mỗi 2 giây bằng hiệu ứng mờ dần (Fade).',
                    },
                    {
                      key: 'style-4',
                      title: 'Style 4: Lát cắt dọc tương tác',
                      desc: 'Chia card làm 3 cột dọc. Hover cột nào cột đó mở rộng (flex-grow) và hiển thị chi tiết prompt.',
                    },
                  ].map((styleOpt) => (
                    <div
                      key={styleOpt.key}
                      onClick={() =>
                        !categorySaving && handleSaveCategoryStyle(styleOpt.key)
                      }
                      className={`p-4 rounded-xl border transition-all duration-300 cursor-pointer text-left flex flex-col justify-between group min-h-[160px]
                        ${
                          categoryStyle === styleOpt.key
                            ? 'border-brand-500 bg-brand-500/5 shadow-md shadow-brand-500/5'
                            : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                        }`}
                    >
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <p
                            className={`text-xs font-bold transition-colors ${categoryStyle === styleOpt.key ? 'text-brand-300' : 'text-white group-hover:text-brand-300'}`}
                          >
                            {styleOpt.title}
                          </p>
                          <p className="text-[10px] text-white/50 mt-2 leading-relaxed">
                            {styleOpt.desc}
                          </p>
                        </div>
                        <StylePreview styleKey={styleOpt.key} />
                      </div>
                      <div className="flex justify-end mt-4">
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-md border
                          ${
                            categoryStyle === styleOpt.key
                              ? 'border-brand-500/30 bg-brand-500/10 text-brand-300'
                              : 'border-white/10 text-white/30'
                          }`}
                        >
                          {categoryStyle === styleOpt.key
                            ? 'Đang hoạt động'
                            : 'Kích hoạt'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Hero Banner Landscape Image Config ─── */}
              <div className="card p-6 border border-white/10 space-y-5 bg-white/[0.01]">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center flex-shrink-0">
                    <Images className="text-brand-400" size={22} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base mb-1 font-display">
                      Ảnh bìa Số liệu trang chủ (Hero Banner Image)
                    </h3>
                    <p className="text-sm text-white/50 leading-relaxed">
                      Cài đặt hiển thị cho bức ảnh phong cảnh nằm phía sau thanh
                      số liệu thống kê (Stats bar).
                    </p>
                  </div>
                </div>

                {/* Banner Mode selector */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <button
                    type="button"
                    onClick={() => setHeroBannerMode('auto')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      heroBannerMode === 'auto'
                        ? 'border-brand-500 bg-brand-500/10'
                        : 'border-white/5 bg-white/5 hover:border-white/10'
                    }`}
                  >
                    <p className="text-xs font-bold text-white mb-1">
                      🤖 Tự động (Auto)
                    </p>
                    <span className="text-[10px] text-white/40 leading-relaxed block">
                      Tự động chọn hình nền có lượt xem cao nhất trong hệ thống.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setHeroBannerMode('manual')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      heroBannerMode === 'manual'
                        ? 'border-brand-500 bg-brand-500/10'
                        : 'border-white/5 bg-white/5 hover:border-white/10'
                    }`}
                  >
                    <p className="text-xs font-bold text-white mb-1">
                      ✍️ Thủ công (Manual)
                    </p>
                    <span className="text-[10px] text-white/40 leading-relaxed block">
                      Tự nhập liên kết (URL) ảnh tùy ý của bạn làm hình nền.
                    </span>
                  </button>
                </div>

                {/* Manual URL input if manual mode selected */}
                {heroBannerMode === 'manual' && (
                  <div className="space-y-2 pt-2">
                    <label className="text-xs font-semibold text-white/60 block">
                      Đường dẫn hình ảnh (Image URL)
                    </label>
                    <input
                      type="text"
                      value={heroBannerImage}
                      onChange={(e) => setHeroBannerImage(e.target.value)}
                      className="input text-xs w-full py-2.5 px-3"
                      placeholder="https://example.com/your-custom-landscape.jpg"
                    />
                  </div>
                )}

                {/* Save button */}
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleSaveHeroBanner}
                    disabled={heroBannerSaving}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-brand-900/30 font-display"
                  >
                    {heroBannerSaving ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Save size={13} />
                    )}
                    Lưu cấu hình ảnh bìa
                  </button>
                </div>
              </div>

              {/* ── Hero Collage Images Config ─── */}
              <div className="card p-6 border border-white/10 space-y-5 bg-white/[0.01]">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center flex-shrink-0">
                    <Palette className="text-brand-400" size={22} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base mb-1 font-display">
                      Ảnh nền ghép Hero (Hero Collage Background)
                    </h3>
                    <p className="text-sm text-white/50 leading-relaxed">
                      Cài đặt hiển thị cho 8 bức ảnh ghép đan xen làm hình nền
                      mờ phía sau tiêu đề chính trang chủ.
                    </p>
                  </div>
                </div>

                {/* Collage Mode selector */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <button
                    type="button"
                    onClick={() => setHeroCollageMode('auto')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      heroCollageMode === 'auto'
                        ? 'border-brand-500 bg-brand-500/10'
                        : 'border-white/5 bg-white/5 hover:border-white/10'
                    }`}
                  >
                    <p className="text-xs font-bold text-white mb-1">
                      🤖 Tự động (Auto)
                    </p>
                    <span className="text-[10px] text-white/40 leading-relaxed block">
                      Tự động lấy 8 hình ảnh mới được duyệt gần nhất trong hệ
                      thống.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setHeroCollageMode('manual')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      heroCollageMode === 'manual'
                        ? 'border-brand-500 bg-brand-500/10'
                        : 'border-white/5 bg-white/5 hover:border-white/10'
                    }`}
                  >
                    <p className="text-xs font-bold text-white mb-1">
                      ✍️ Thủ công (Manual)
                    </p>
                    <span className="text-[10px] text-white/40 leading-relaxed block">
                      Tự nhập danh sách 8 liên kết ảnh tĩnh tùy chọn làm hình
                      nền.
                    </span>
                  </button>
                </div>

                {/* Manual 8 URLs input grid */}
                {heroCollageMode === 'manual' && (
                  <div className="space-y-4 pt-2">
                    <label className="text-xs font-semibold text-white/60 block">
                      Danh sách 8 liên kết ảnh (URLs - WebP khuyên dùng)
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {Array.from({ length: 8 }).map((_, idx) => (
                        <div key={idx} className="space-y-1">
                          <span className="text-[10px] text-white/40 font-semibold">
                            Ảnh #{idx + 1}
                          </span>
                          <input
                            type="text"
                            value={heroCollageImages[idx] || ''}
                            onChange={(e) => {
                              const newImgs = [...heroCollageImages]
                              newImgs[idx] = e.target.value
                              setHeroCollageImages(newImgs)
                            }}
                            className="input text-[11px] w-full py-2 px-2.5"
                            placeholder={`URL cho hình nền thứ ${idx + 1}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Save button */}
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleSaveHeroCollage}
                    disabled={heroCollageSaving}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-brand-900/30 font-display"
                  >
                    {heroCollageSaving ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Save size={13} />
                    )}
                    Lưu cấu hình ảnh nền
                  </button>
                </div>
              </div>

              {/* ── Post Loading Delay Slider ───────────────────────── */}
              <div className="card p-6 border border-white/10 space-y-4 bg-white/[0.01]">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span className="text-base">⏱️</span> Thời gian hiệu ứng
                      Loading post
                    </h3>
                    <p className="text-[11px] text-white/40 mt-0.5">
                      Khoảng thời gian trì hoãn tải ảnh (giả lập loading) khi
                      đổi danh mục/tab ngoài trang chủ để người dùng thưởng thức
                      hiệu ứng mượt mà.
                    </p>
                  </div>
                  {postLoadingDelaySaving && (
                    <span className="flex items-center gap-1.5 text-xs text-brand-400 font-semibold animate-pulse">
                      Đang lưu...
                    </span>
                  )}
                </div>

                {/* Value Display */}
                <div className="flex items-baseline gap-2 pt-2">
                  <span
                    className="text-3xl font-black tabular-nums tracking-tight"
                    style={{
                      color:
                        'hsla(var(--color-brand-h), var(--color-brand-s), 65%, 1)',
                    }}
                  >
                    {postLoadingDelayMs >= 1000
                      ? (postLoadingDelayMs / 1000).toFixed(1)
                      : postLoadingDelayMs}
                  </span>
                  <span className="text-sm font-bold text-white/40">
                    {postLoadingDelayMs >= 1000 ? 'giây' : 'ms'}
                  </span>
                  {postLoadingDelayMs === 0 && (
                    <span className="ml-2 text-[10px] font-semibold text-emerald-400/80 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                      Tắt
                    </span>
                  )}
                </div>

                {/* Slider */}
                <div className="relative pt-1 pb-2">
                  <input
                    type="range"
                    min={0}
                    max={5000}
                    step={100}
                    value={postLoadingDelayMs}
                    onChange={(e) =>
                      setPostLoadingDelayMs(Number(e.target.value))
                    }
                    onMouseUp={(e) =>
                      handleSavePostLoadingDelayMs(Number(e.target.value))
                    }
                    onTouchEnd={(e) =>
                      handleSavePostLoadingDelayMs(Number(e.target.value))
                    }
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, hsla(var(--color-brand-h), var(--color-brand-s), 55%, 1) 0%, hsla(var(--color-brand-h), var(--color-brand-s), 55%, 1) ${(postLoadingDelayMs / 5000) * 100}%, rgba(255,255,255,0.08) ${(postLoadingDelayMs / 5000) * 100}%, rgba(255,255,255,0.08) 100%)`,
                    }}
                  />
                  {/* Tick marks */}
                  <div className="relative w-full h-5 mt-2">
                    {[0, 500, 1000, 1500, 2000, 3000, 4000, 5000].map((v) => {
                      const pct = (v / 5000) * 100
                      const isLeftBound = v === 0
                      const isRightBound = v === 5000

                      let transformStyle = 'translateX(-50%)'
                      let leftStyle = `${pct}%`
                      if (isLeftBound) {
                        leftStyle = '0%'
                        transformStyle = 'none'
                      } else if (isRightBound) {
                        leftStyle = 'auto'
                        transformStyle = 'none'
                      }

                      return (
                        <button
                          key={v}
                          type="button"
                          onClick={() => {
                            setPostLoadingDelayMs(v)
                            handleSavePostLoadingDelayMs(v)
                          }}
                          className={`absolute text-[9px] font-mono transition-colors cursor-pointer hover:text-brand-300 ${
                            postLoadingDelayMs === v
                              ? 'text-brand-400 font-bold'
                              : 'text-white/25'
                          }`}
                          style={{
                            left: leftStyle,
                            right: isRightBound ? '0%' : 'auto',
                            transform: transformStyle,
                          }}
                        >
                          {v === 0
                            ? 'Tắt'
                            : v >= 1000
                              ? `${v / 1000}s`
                              : `${v}ms`}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Preset buttons row */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {[
                    { label: 'Tắt (0ms)', value: 0 },
                    { label: 'Nhanh (500ms)', value: 500 },
                    { label: 'Vừa (1.2s)', value: 1200 },
                    { label: 'Kịch tính (3s)', value: 3000 },
                    { label: 'Tối đa (5s)', value: 5000 },
                  ].map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => {
                        setPostLoadingDelayMs(p.value)
                        handleSavePostLoadingDelayMs(p.value)
                      }}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border cursor-pointer
                        ${
                          postLoadingDelayMs === p.value
                            ? 'bg-brand-500/10 border-brand-500/40 text-brand-300 shadow-sm'
                            : 'bg-white/[0.02] border-white/5 text-white/50 hover:bg-white/[0.06] hover:text-white'
                        }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Trending Carousel Autoplay Interval ─── */}
              <div className="card p-6 border border-white/10 space-y-4 bg-white/[0.01]">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Timer size={16} className="text-brand-400" /> Tự động
                      chuyển Carousel Xu hướng (Autoplay)
                    </h3>
                    <p className="text-[11px] text-white/40 mt-0.5">
                      Cài đặt thời gian tự động chuyển tiếp ảnh trong hàng "Xu
                      hướng cộng đồng" ngoài trang chủ.
                    </p>
                  </div>
                  {trendingCarouselSaving && (
                    <span className="flex items-center gap-1.5 text-xs text-brand-400 font-semibold animate-pulse">
                      Đang lưu...
                    </span>
                  )}
                </div>

                <div className="flex items-baseline gap-2 pt-2">
                  <span
                    className="text-3xl font-black tabular-nums tracking-tight"
                    style={{
                      color:
                        'hsla(var(--color-brand-h), var(--color-brand-s), 65%, 1)',
                    }}
                  >
                    {trendingCarouselInterval === 0
                      ? 'Tắt'
                      : (trendingCarouselInterval / 1000).toFixed(1)}
                  </span>
                  <span className="text-sm font-bold text-white/40">
                    {trendingCarouselInterval === 0 ? '' : 'giây'}
                  </span>
                </div>

                <div className="relative pt-1 pb-2">
                  <input
                    type="range"
                    min={0}
                    max={15000}
                    step={500}
                    value={trendingCarouselInterval}
                    onChange={(e) =>
                      setTrendingCarouselInterval(Number(e.target.value))
                    }
                    onMouseUp={() => handleSaveTrendingCarouselInterval()}
                    onTouchEnd={() => handleSaveTrendingCarouselInterval()}
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, hsla(var(--color-brand-h), var(--color-brand-s), 55%, 1) 0%, hsla(var(--color-brand-h), var(--color-brand-s), 55%, 1) ${(trendingCarouselInterval / 15000) * 100}%, rgba(255,255,255,0.08) ${(trendingCarouselInterval / 15000) * 100}%, rgba(255,255,255,0.08) 100%)`,
                    }}
                  />
                  <div className="relative w-full h-5 mt-2">
                    {[0, 2000, 3000, 5000, 8000, 10000, 15000].map((v) => {
                      const pct = (v / 15000) * 100
                      const isLeftBound = v === 0
                      const isRightBound = v === 15000

                      let transformStyle = 'translateX(-50%)'
                      let leftStyle = `${pct}%`
                      if (isLeftBound) {
                        leftStyle = '0%'
                        transformStyle = 'none'
                      } else if (isRightBound) {
                        leftStyle = 'auto'
                        transformStyle = 'none'
                      }

                      return (
                        <button
                          key={v}
                          type="button"
                          onClick={() => {
                            setTrendingCarouselInterval(v)
                            setTimeout(() => {
                              api
                                .put('/admin/settings', {
                                  trendingCarouselInterval: v,
                                })
                                .then(({ data }) => {
                                  setSettings(data.settings)
                                  toast.success(
                                    '⏱️ Đã lưu cấu hình tự động chuyển Carousel!'
                                  )
                                })
                                .catch(() =>
                                  toast.error('Không thể lưu cấu hình')
                                )
                            }, 50)
                          }}
                          className={`absolute text-[9px] font-mono transition-colors cursor-pointer hover:text-brand-300 ${
                            trendingCarouselInterval === v
                              ? 'text-brand-400 font-bold'
                              : 'text-white/25'
                          }`}
                          style={{
                            left: leftStyle,
                            right: isRightBound ? '0%' : 'auto',
                            transform: transformStyle,
                          }}
                        >
                          {v === 0 ? 'Tắt' : `${v / 1000}s`}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {[
                    { label: 'Tắt', value: 0 },
                    { label: 'Nhanh (3s)', value: 3000 },
                    { label: 'Vừa (5s)', value: 5000 },
                    { label: 'Chậm (8s)', value: 8000 },
                    { label: 'Rất chậm (12s)', value: 12000 },
                  ].map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => {
                        setTrendingCarouselInterval(p.value)
                        api
                          .put('/admin/settings', {
                            trendingCarouselInterval: p.value,
                          })
                          .then(({ data }) => {
                            setSettings(data.settings)
                            toast.success(
                              '⏱️ Đã lưu cấu hình tự động chuyển Carousel!'
                            )
                          })
                          .catch(() => toast.error('Không thể lưu cấu hình'))
                      }}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border cursor-pointer
                        ${
                          trendingCarouselInterval === p.value
                            ? 'bg-brand-500/10 border-brand-500/40 text-brand-300 shadow-sm'
                            : 'bg-white/[0.02] border-white/5 text-white/50 hover:bg-white/[0.06] hover:text-white'
                        }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Render Categories Page Config */}
          {selectedConfigPage === 'categories' && (
            <div className="card p-6 border border-white/5 space-y-5 bg-white/[0.01]">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Palette size={16} className="text-brand-400" /> Cấu hình
                    Giao diện Trang danh mục
                  </h3>
                  <p className="text-[11px] text-white/40">
                    Chọn kiểu hiển thị cho các danh mục trên trang /categories
                  </p>
                </div>
                {categorySaving && (
                  <span className="flex items-center gap-1.5 text-xs text-brand-400 font-semibold">
                    <Loader2 size={12} className="animate-spin" /> Đang cập
                    nhật...
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  {
                    key: 'style-1',
                    title: 'Style 1: Ảnh bìa Đơn (Cổ điển)',
                    desc: 'Tự động lấy 1 ảnh nổi bật nhất có lượt xem cao nhất của danh mục làm ảnh bìa.',
                  },
                  {
                    key: 'style-2',
                    title: 'Style 2: Lưới 4 ảnh nghệ thuật',
                    desc: 'Lấy top 4 ảnh nhiều views nhất sắp xếp dạng lưới Asymmetrical Staggered nghệ thuật.',
                  },
                  {
                    key: 'style-3',
                    title: 'Style 3: Slideshow tự xoay vòng',
                    desc: 'Tự động xoay vòng 5-6 ảnh nổi bật nhất sau mỗi 2 giây bằng hiệu ứng mờ dần (Fade).',
                  },
                  {
                    key: 'style-4',
                    title: 'Style 4: Lát cắt dọc tương tác',
                    desc: 'Chia card làm 3 cột dọc. Hover cột nào cột đó mở rộng (flex-grow) và hiển thị chi tiết prompt.',
                  },
                ].map((styleOpt) => (
                  <div
                    key={styleOpt.key}
                    onClick={() =>
                      !categorySaving &&
                      handleSaveCategoriesPageStyle(styleOpt.key)
                    }
                    className={`p-4 rounded-xl border transition-all duration-300 cursor-pointer text-left flex flex-col justify-between group min-h-[160px]
                      ${
                        categoriesPageStyle === styleOpt.key
                          ? 'border-brand-500 bg-brand-500/5 shadow-md shadow-brand-500/5'
                          : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                      }`}
                  >
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <p
                          className={`text-xs font-bold transition-colors ${categoriesPageStyle === styleOpt.key ? 'text-brand-300' : 'text-white group-hover:text-brand-300'}`}
                        >
                          {styleOpt.title}
                        </p>
                        <p className="text-[10px] text-white/50 mt-2 leading-relaxed">
                          {styleOpt.desc}
                        </p>
                      </div>
                      <StylePreview styleKey={styleOpt.key} />
                    </div>
                    <div className="flex justify-end mt-4">
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-md border
                        ${
                          categoriesPageStyle === styleOpt.key
                            ? 'border-brand-500/30 bg-brand-500/10 text-brand-300'
                            : 'border-white/10 text-white/30'
                        }`}
                      >
                        {categoriesPageStyle === styleOpt.key
                          ? 'Đang hoạt động'
                          : 'Kích hoạt'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Render other pages placeholder */}
          {/* Render Post Detail Page Config */}
          {selectedConfigPage === 'post-detail' && (
            <div className="card p-6 border border-white/10 space-y-5 bg-white/[0.01]">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    💎 Cấu hình Trang chi tiết bài viết (Post Detail)
                  </h3>
                  <p className="text-[11px] text-white/40">
                    Quản lý cách hiển thị các ảnh Premium chưa được mở khóa
                  </p>
                </div>
                {savingBlur && (
                  <span className="flex items-center gap-1.5 text-xs text-brand-400 font-semibold">
                    <Loader2 size={12} className="animate-spin" /> Đang cập
                    nhật...
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <div>
                  <h4 className="text-xs font-bold text-white mb-1">
                    Làm mờ & Khóa xem trước ảnh Premium
                  </h4>
                  <p className="text-[11px] text-white/40">
                    Nếu bật, ảnh Premium sẽ bị làm mờ và hiển thị thông báo yêu
                    cầu tải xuống.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleSaveBlurPremium(!blurPremiumImages)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer focus:outline-none
                    ${blurPremiumImages ? 'bg-brand-500' : 'bg-white/10'}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                      ${blurPremiumImages ? 'translate-x-6' : 'translate-x-1'}`}
                  />
                </button>
              </div>

              {/* Cấu hình vị trí panel (Layout Swapping) */}
              <div className="flex flex-col gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-1">
                  <div>
                    <h4 className="text-xs font-bold text-white mb-0.5 font-display">
                      Bố cục bảng điều khiển (Layout Swapping)
                    </h4>
                    <p className="text-[11px] text-white/40">
                      Thay đổi vị trí giữa Bảng ảnh và Bảng thông tin chi tiết
                    </p>
                  </div>
                  {savingLayout && (
                    <span className="flex items-center gap-1.5 text-xs text-brand-400 font-semibold">
                      <Loader2 size={12} className="animate-spin" /> Đang lưu...
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4 pt-1">
                  <button
                    type="button"
                    onClick={() => handleSavePostDetailLayout('left-image')}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      postDetailLayout === 'left-image'
                        ? 'border-brand-500 bg-brand-500/10 text-white'
                        : 'border-white/5 bg-white/[0.01] text-white/60 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-1 w-full max-w-[100px] h-12 bg-black/40 rounded-lg p-1 border border-white/10">
                      <div className="w-[60%] h-full bg-brand-500/20 rounded flex items-center justify-center text-[10px] text-brand-400 font-bold border border-brand-500/30">
                        Ảnh
                      </div>
                      <div className="w-[40%] h-full bg-white/5 rounded flex items-center justify-center text-[10px] text-white/30 border border-white/5">
                        Info
                      </div>
                    </div>
                    <span className="text-xs font-semibold">
                      Ảnh bên trái (Mặc định)
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSavePostDetailLayout('right-image')}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      postDetailLayout === 'right-image'
                        ? 'border-brand-500 bg-brand-500/10 text-white'
                        : 'border-white/5 bg-white/[0.01] text-white/60 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-1 w-full max-w-[100px] h-12 bg-black/40 rounded-lg p-1 border border-white/10">
                      <div className="w-[40%] h-full bg-white/5 rounded flex items-center justify-center text-[10px] text-white/30 border border-white/5">
                        Info
                      </div>
                      <div className="w-[60%] h-full bg-brand-500/20 rounded flex items-center justify-center text-[10px] text-brand-400 font-bold border border-brand-500/30">
                        Ảnh
                      </div>
                    </div>
                    <span className="text-xs font-semibold">Ảnh bên phải</span>
                  </button>
                </div>
              </div>

              {/* Tự động cuộn phần Khám phá (Discovery Autoplay) */}
              <div className="flex flex-col gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-1">
                  <div>
                    <h4 className="text-xs font-bold text-white mb-0.5 font-display">
                      Tự động cuộn Khám phá (Autoplay Discovery)
                    </h4>
                    <p className="text-[11px] text-white/40">
                      Tự động chuyển các hình ảnh trong mục Khám phá dưới chân
                      trang chi tiết
                    </p>
                  </div>
                  {savingDiscoveryAutoScroll && (
                    <span className="flex items-center gap-1.5 text-xs text-brand-400 font-semibold animate-pulse">
                      Đang lưu...
                    </span>
                  )}
                </div>

                <div className="space-y-4">
                  {/* Slider 1: Interval */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-semibold text-white/50">
                      <span>Thời gian chờ chuyển ảnh</span>
                      <span className="text-brand-400 font-mono">
                        {discoveryAutoScrollInterval === 0
                          ? 'Tắt'
                          : `${(discoveryAutoScrollInterval / 1000).toFixed(1)} giây`}
                      </span>
                    </div>
                    <input type="input" style={{ display: 'none' }} />
                    <input
                      type="range"
                      min={0}
                      max={20000}
                      step={1000}
                      value={discoveryAutoScrollInterval}
                      onChange={(e) =>
                        setDiscoveryAutoScrollInterval(Number(e.target.value))
                      }
                      onMouseUp={handleSaveDiscoveryAutoScrollSettings}
                      onTouchEnd={handleSaveDiscoveryAutoScrollSettings}
                      className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, hsla(var(--color-brand-h), var(--color-brand-s), 55%, 1) 0%, hsla(var(--color-brand-h), var(--color-brand-s), 55%, 1) ${(discoveryAutoScrollInterval / 20000) * 100}%, rgba(255,255,255,0.08) ${(discoveryAutoScrollInterval / 20000) * 100}%, rgba(255,255,255,0.08) 100%)`,
                      }}
                    />
                  </div>

                  {/* Slider 2: Stagger */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-semibold text-white/50">
                      <span>
                        Thời gian chuyển tiếp cách nhau giữa các mục (Stagger)
                      </span>
                      <span className="text-brand-400 font-mono">
                        {(discoveryAutoScrollStagger / 1000).toFixed(1)} giây
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={5000}
                      step={500}
                      value={discoveryAutoScrollStagger}
                      onChange={(e) =>
                        setDiscoveryAutoScrollStagger(Number(e.target.value))
                      }
                      onMouseUp={handleSaveDiscoveryAutoScrollSettings}
                      onTouchEnd={handleSaveDiscoveryAutoScrollSettings}
                      className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, hsla(var(--color-brand-h), var(--color-brand-s), 55%, 1) 0%, hsla(var(--color-brand-h), var(--color-brand-s), 55%, 1) ${(discoveryAutoScrollStagger / 5000) * 100}%, rgba(255,255,255,0.08) ${(discoveryAutoScrollStagger / 5000) * 100}%, rgba(255,255,255,0.08) 100%)`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedConfigPage === 'my-posts' && (
            <div className="card p-6 border border-white/10 space-y-5 bg-white/[0.01]">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl">🖼️</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base mb-1 font-display">
                      Cài đặt trang Ảnh của tôi
                    </h3>
                    <p className="text-sm text-white/50 leading-relaxed">
                      Tinh chỉnh trải nghiệm Skeleton Loading khi người dùng
                      truy cập trang quản lý ảnh cá nhân.
                    </p>
                  </div>
                </div>
                {myPostsSkeletonSaving && (
                  <span className="flex items-center gap-1.5 text-xs text-brand-400 font-semibold animate-pulse flex-shrink-0">
                    Đang lưu...
                  </span>
                )}
              </div>

              {/* ── Skeleton Loading Duration ───────────────────────── */}
              <div className="p-5 rounded-xl border border-white/8 bg-white/[0.02] space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="text-lg">⏱️</span> Thời gian hiệu ứng
                    Skeleton Loading
                  </h4>
                  <p className="text-[11px] text-white/40 mt-0.5">
                    Thời gian cộng thêm vào sau khi hệ thống tải xong dữ liệu để
                    kéo dài hiệu ứng Skeleton trang "Ảnh của tôi"
                  </p>
                </div>

                {/* Value Display */}
                <div className="flex items-baseline gap-2">
                  <span
                    className="text-3xl font-black tabular-nums tracking-tight"
                    style={{
                      color:
                        'hsla(var(--color-brand-h), var(--color-brand-s), 65%, 1)',
                    }}
                  >
                    {myPostsSkeletonMs >= 1000
                      ? (myPostsSkeletonMs / 1000).toFixed(1)
                      : myPostsSkeletonMs}
                  </span>
                  <span className="text-sm font-bold text-white/40">
                    {myPostsSkeletonMs >= 1000 ? 'giây' : 'ms'}
                  </span>
                  {myPostsSkeletonMs === 0 && (
                    <span className="ml-2 text-[10px] font-semibold text-emerald-400/80 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                      Tắt
                    </span>
                  )}
                </div>

                {/* Slider */}
                <div className="relative pt-1 pb-2">
                  <input
                    type="range"
                    min={0}
                    max={10000}
                    step={100}
                    value={myPostsSkeletonMs}
                    onChange={(e) =>
                      setMyPostsSkeletonMs(Number(e.target.value))
                    }
                    onMouseUp={(e) =>
                      handleSaveMyPostsSkeletonMs(Number(e.target.value))
                    }
                    onTouchEnd={(e) =>
                      handleSaveMyPostsSkeletonMs(Number(e.target.value))
                    }
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, hsla(var(--color-brand-h), var(--color-brand-s), 55%, 1) 0%, hsla(var(--color-brand-h), var(--color-brand-s), 55%, 1) ${(myPostsSkeletonMs / 10000) * 100}%, rgba(255,255,255,0.08) ${(myPostsSkeletonMs / 10000) * 100}%, rgba(255,255,255,0.08) 100%)`,
                    }}
                  />
                  {/* Tick marks */}
                  <div className="relative w-full h-5 mt-2">
                    {[0, 1000, 2000, 3000, 5000, 7000, 10000].map((v) => {
                      const pct = (v / 10000) * 100
                      const isLeftBound = v === 0
                      const isRightBound = v === 10000

                      let transformStyle = 'translateX(-50%)'
                      let leftStyle = `${pct}%`
                      if (isLeftBound) {
                        leftStyle = '0%'
                        transformStyle = 'none'
                      } else if (isRightBound) {
                        leftStyle = 'auto'
                        transformStyle = 'none'
                      }

                      return (
                        <button
                          key={v}
                          type="button"
                          onClick={() => {
                            setMyPostsSkeletonMs(v)
                            handleSaveMyPostsSkeletonMs(v)
                          }}
                          className={`absolute text-[9px] font-mono transition-colors cursor-pointer hover:text-brand-300 ${
                            myPostsSkeletonMs === v
                              ? 'text-brand-400 font-bold'
                              : 'text-white/25'
                          }`}
                          style={{
                            left: leftStyle,
                            right: isRightBound ? '0%' : 'auto',
                            transform: transformStyle,
                          }}
                        >
                          {v === 0
                            ? '0'
                            : v >= 1000
                              ? `${v / 1000}s`
                              : `${v}ms`}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Preset buttons */}
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'Tắt (0ms)', value: 0 },
                    { label: 'Nhanh (500ms)', value: 500 },
                    { label: 'Vừa (1.5s)', value: 1500 },
                    { label: 'Lâu (3s)', value: 3000 },
                    { label: 'Rất lâu (5s)', value: 5000 },
                    { label: 'Siêu lâu (10s)', value: 10000 },
                  ].map((p) => (
                    <button
                      key={p.value}
                      onClick={() => {
                        setMyPostsSkeletonMs(p.value)
                        handleSaveMyPostsSkeletonMs(p.value)
                      }}
                      className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                        myPostsSkeletonMs === p.value
                          ? 'border-brand-500/40 bg-brand-500/10 text-brand-300'
                          : 'border-white/8 bg-white/[0.03] text-white/40 hover:border-white/15 hover:text-white/60'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {selectedConfigPage !== 'home' &&
            selectedConfigPage !== 'post-detail' &&
            selectedConfigPage !== 'my-posts' && (
              <div className="card p-12 border border-white/5 text-center space-y-3 bg-white/[0.01]">
                <div className="text-3xl">⚙️</div>
                <h4 className="font-bold text-white text-sm">
                  Cài đặt đang được phát triển
                </h4>
                <p className="text-xs text-white/40 max-w-xs mx-auto leading-relaxed">
                  Các tùy chọn giao diện và phong cách hiển thị riêng cho trang
                  này sẽ được cập nhật trong phiên bản tiếp theo.
                </p>
              </div>
            )}
        </div>
      )}

      {activeSubTab === 'maintenance' && (
        <div className="space-y-6">
          <div className="card p-6 border border-white/10 space-y-6 bg-white/[0.01]">
            <div className="border-b border-white/5 pb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 font-display">
                ⚡ Kích hoạt Tác vụ Định kỳ (Manual Cron Triggers)
              </h3>
              <p className="text-[11px] text-white/40 mt-0.5">
                Các tác vụ này tự động chạy ngầm lúc 00:00 hàng ngày. Tại đây
                Admin có thể chủ động kích hoạt thủ công để kiểm tra hoặc cập
                nhật tức thì.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Trigger Settlement */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white mb-1">
                    Quyết toán lượt xem & giải ngân
                  </h4>
                  <p className="text-[10px] text-white/40 leading-relaxed">
                    Quyết toán doanh thu view và chuyển đổi các khoản tiền tạm
                    giữ (Holding) sang số dư khả dụng (Available) cho tất cả
                    Creator.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const confirm = window.confirm(
                      'Bạn có chắc chắn muốn chạy quyết toán lượt xem ngay lập tức?'
                    )
                    if (!confirm) return
                    const toastId = toast.loading('Đang xử lý quyết toán...')
                    try {
                      const { data } = await api.post(
                        '/admin/settlement/trigger'
                      )
                      toast.success(
                        `Quyết toán thành công! Đã xử lý ${data.result?.settledCount || 0} views, tổng số tiền: ${(data.result?.totalAmount || 0).toLocaleString('vi-VN')} VNĐ.`,
                        { id: toastId, duration: 6000 }
                      )
                    } catch (err) {
                      toast.error(
                        err.response?.data?.message || 'Quyết toán thất bại',
                        { id: toastId }
                      )
                    }
                  }}
                  className="w-full mt-2 py-2 px-3 rounded-lg text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white cursor-pointer transition-colors shadow-md text-center"
                >
                  Chạy quyết toán
                </button>
              </div>

              {/* Trigger Score Decay */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white mb-1 font-display">
                    Tính lại điểm Trending (Score Decay)
                  </h4>
                  <p className="text-[10px] text-white/40 leading-relaxed">
                    Tính lại điểm số cho tất cả bài đăng theo thuật toán Hacker
                    News để tự động giảm nhiệt các bài viết cũ và cập nhật vị
                    trí trang chủ.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const toastId = toast.loading('Đang tính lại điểm hot...')
                    try {
                      const { data } = await api.post(
                        '/admin/settlement/trigger-score-decay'
                      )
                      toast.success(
                        `Tính điểm trending thành công! Đã cập nhật ${data.result?.updatedCount || 0} bài đăng.`,
                        { id: toastId, duration: 5000 }
                      )
                    } catch (err) {
                      toast.error(
                        err.response?.data?.message ||
                          'Tính điểm trending thất bại',
                        { id: toastId }
                      )
                    }
                  }}
                  className="w-full mt-2 py-2 px-3 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white cursor-pointer transition-colors shadow-md text-center"
                >
                  Cập nhật điểm Trending
                </button>
              </div>

              {/* Trigger Subscription Downgrade */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white mb-1 font-display">
                    Kiểm tra & hạ cấp các gói hết hạn
                  </h4>
                  <p className="text-[10px] text-white/40 leading-relaxed">
                    Quét toàn bộ cơ sở dữ liệu để tìm và hạ cấp các tài khoản có
                    gói dịch vụ Pro/Ultimate đã quá hạn về gói Free.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const toastId = toast.loading(
                      'Đang kiểm tra gói hết hạn...'
                    )
                    try {
                      const { data } = await api.post(
                        '/admin/settlement/trigger-subscription-cleanup'
                      )
                      toast.success(
                        `Quét hoàn thành! Đã hạ cấp ${data.result?.downgradedCount || 0} tài khoản hết hạn.`,
                        { id: toastId, duration: 5000 }
                      )
                    } catch (err) {
                      toast.error(
                        err.response?.data?.message || 'Kiểm tra thất bại',
                        { id: toastId }
                      )
                    }
                  }}
                  className="w-full mt-2 py-2 px-3 rounded-lg text-xs font-bold bg-red-700 hover:bg-red-600 text-white cursor-pointer transition-colors shadow-md text-center"
                >
                  Kiểm tra hạn gói
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Info card ─── */}
      <div className="card p-5 border-blue-500/20 bg-blue-500/5">
        <div className="flex gap-3">
          <Timer size={18} className="text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-400 mb-1">
              Gợi ý sử dụng
            </p>
            <ul className="text-xs text-white/50 space-y-1 list-disc list-inside">
              <li>
                Bật Auto-approve khi bạn muốn kiểm thử nhanh hoặc trong giai
                đoạn beta.
              </li>
              <li>
                Tắt trong môi trường production để kiểm soát nội dung chặt chẽ.
              </li>
              <li>
                NSFW rõ ràng (score &gt; 0.8) sẽ luôn bị từ chối, bất kể setting
                này.
              </li>
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
  POST_APPROVED: {
    label: 'Duyệt bài đăng',
    color: 'bg-green-500/10 text-green-400 border-green-500/20',
  },
  POST_REJECTED: {
    label: 'Từ chối bài đăng',
    color: 'bg-red-500/10 text-red-400 border-red-500/20',
  },
  POST_HIDDEN: {
    label: 'Ẩn bài đăng',
    color: 'bg-white/5 text-white/50 border-white/10',
  },
  POST_DELETE: {
    label: 'Xóa bài đăng',
    color: 'bg-red-500/20 text-red-300 border-red-500/30',
  },
  USER_TOKENS_ADJUST: {
    label: 'Điều chỉnh Token',
    color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  },
  USER_BAN: {
    label: 'Khóa tài khoản',
    color: 'bg-red-600/10 text-red-400 border-red-600/20',
  },
  USER_UNBAN: {
    label: 'Mở khóa tài khoản',
    color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  },
  USER_TIER_CHANGE: {
    label: 'Thay đổi Tier',
    color: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  },
  USER_ROLE_CHANGE: {
    label: 'Thay đổi vai trò',
    color: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  },
  SYSTEM_SETTINGS_UPDATE: {
    label: 'Cập nhật hệ thống',
    color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  },
}

const LogsTab = () => {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [cursor, setCursor] = useState(null)
  const [hasMore, setHasMore] = useState(false)

  const fetchLogs = useCallback(
    async (reset = false) => {
      if (reset) {
        setLoading(true)
        setCursor(null)
      }
      try {
        const params = { limit: 20 }
        if (!reset && cursor) params.cursor = cursor
        const { data } = await api.get('/admin/audit-logs', { params })
        setLogs(reset ? data.logs : (prev) => [...prev, ...data.logs])
        setHasMore(data.pagination.hasMore)
        setCursor(data.pagination.nextCursor)
      } catch (err) {
        toast.error('Không thể tải nhật ký hoạt động')
      } finally {
        setLoading(false)
      }
    },
    [cursor]
  )

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
    const time = d.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    })
    const date = d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
    return `${time} - ${date}`
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <div>
        <h2 className="font-bold text-xl text-white mb-1 font-display">
          Nhật ký hoạt động Admin
        </h2>
        <p className="text-sm text-white/40">
          Ghi lại toàn bộ thao tác quản lý hệ thống của Admin.
        </p>
      </div>

      {loading && logs.length === 0 ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="card p-5 animate-pulse flex items-center justify-between gap-4"
            >
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
            const mapped = ACTION_MAPPING[log.action] || {
              label: log.action,
              color: 'bg-white/5 text-white border-white/10',
            }
            return (
              <div
                key={log._id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${mapped.color}`}
                    >
                      {mapped.label}
                    </span>
                    <span className="text-[10px] text-white/35 font-medium">
                      {formatTime(log.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-white/70 leading-relaxed font-medium">
                    {formatDetails(log)}
                  </p>
                </div>

                {/* Admin user info */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="text-right">
                    <span className="text-xs font-semibold text-white/80 block">
                      @{log.adminId?.username || 'unknown'}
                    </span>
                    <span className="text-[10px] text-white/35 block leading-none">
                      {log.adminId?.email || ''}
                    </span>
                  </div>
                  {log.adminId?.avatar ? (
                    <img
                      src={log.adminId.avatar}
                      className="w-8 h-8 rounded-full border border-white/10 object-cover"
                      alt=""
                    />
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
          <button
            onClick={() => fetchLogs(false)}
            className="btn-secondary text-xs flex items-center gap-2 font-bold px-5 py-2"
          >
            <ChevronDown size={14} /> Tải thêm nhật ký
          </button>
        </div>
      )}
    </div>
  )
}

const WithdrawalsTab = () => {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState(null)
  const [actionModal, setActionModal] = useState(null) // { txn, type: 'approve' | 'reject' }
  const [adminNote, setAdminNote] = useState('')

  const fetchRequests = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/admin/withdrawals')
      setRequests(data.requests || [])
    } catch (err) {
      toast.error('Không thể tải danh sách rút tiền')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [])

  const handleAction = async () => {
    if (!actionModal) return
    const { txn, type } = actionModal
    setProcessingId(txn._id)
    try {
      const endpoint = `/admin/withdrawals/${txn._id}/${type}`
      const { data } = await api.post(endpoint, { adminNote })
      toast.success(data.message)
      setActionModal(null)
      setAdminNote('')
      await fetchRequests()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Xử lý thất bại')
    } finally {
      setProcessingId(null)
    }
  }

  const formatTime = (dateStr) => {
    const d = new Date(dateStr)
    return `${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - ${d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
  }

  return (
    <div className="space-y-4 font-body">
      <div>
        <h2 className="font-bold text-xl text-white mb-1 font-display">
          Yêu cầu rút tiền
        </h2>
        <p className="text-sm text-white/40">
          Duyệt hoặc từ chối các yêu cầu rút tiền của Creator.
        </p>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-5 animate-pulse h-24" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="card p-12 text-center text-white/35">
          <Wallet size={40} className="mx-auto mb-3 opacity-25" />
          Hiện tại không có yêu cầu rút tiền nào
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((txn) => {
            const user = txn.userId || {}
            const isPending = txn.meta?.statusApproved === undefined
            const isApproved = txn.meta?.statusApproved === true
            const isRejected = txn.meta?.statusApproved === false

            return (
              <motion.div
                key={txn._id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-white/10 hover:border-white/20 transition-all"
              >
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                        alt=""
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gradient-brand flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {user.username?.[0]?.toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h4 className="font-bold text-sm text-white">
                        {user.displayName || user.username}
                      </h4>
                      <p className="text-xs text-white/40">@{user.username}</p>
                    </div>
                    <div className="ml-auto md:ml-0">
                      {isPending && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/25 font-bold">
                          CHỜ DUYỆT
                        </span>
                      )}
                      {isApproved && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/25 font-bold">
                          ĐÃ DUYỆT
                        </span>
                      )}
                      {isRejected && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/25 font-bold">
                          TỪ CHỐI
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-3 bg-white/5 border border-white/10 rounded-2xl grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-white/40 block">Ngân hàng</span>
                      <span className="font-semibold text-white">
                        {txn.meta?.bankDetails?.bankName ||
                          user.bankAccount?.bankName ||
                          'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-white/40 block">Số tài khoản</span>
                      <span className="font-semibold text-emerald-400 font-mono tracking-wider">
                        {txn.meta?.bankDetails?.accountNumber ||
                          user.bankAccount?.accountNumber ||
                          'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-white/40 block">Chủ tài khoản</span>
                      <span className="font-semibold text-white uppercase">
                        {txn.meta?.bankDetails?.accountHolder ||
                          user.bankAccount?.accountHolder ||
                          'N/A'}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/50">
                    <span>
                      Số tiền rút:{' '}
                      <strong className="text-white font-bold">
                        {Math.abs(txn.amount).toLocaleString('vi-VN')} VNĐ
                      </strong>
                    </span>
                    <span>•</span>
                    <span>Tạo lúc: {formatTime(txn.createdAt)}</span>
                    {txn.meta?.adminNote && (
                      <>
                        <span>•</span>
                        <span>
                          Ghi chú Admin:{' '}
                          <em className="text-white/70">
                            "{txn.meta.adminNote}"
                          </em>
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-3 justify-center border-t md:border-t-0 pt-3 md:pt-0 border-white/5 flex-shrink-0 min-w-[200px]">
                  <div className="text-right text-xs space-y-0.5 text-white/40">
                    <p>
                      Khả dụng:{' '}
                      <span className="text-white font-semibold">
                        {(user.vndBalance || 0).toLocaleString()}đ
                      </span>
                    </p>
                    <p>
                      Tạm giữ:{' '}
                      <span className="text-white font-semibold">
                        {(user.holdingBalance || 0).toLocaleString()}đ
                      </span>
                    </p>
                    <p>
                      Đóng băng:{' '}
                      <span className="text-white font-semibold">
                        {(user.lockedBalance || 0).toLocaleString()}đ
                      </span>
                    </p>
                  </div>

                  {isPending && (
                    <div className="flex gap-2 w-full md:w-auto">
                      <button
                        onClick={() => setActionModal({ txn, type: 'reject' })}
                        className="flex-1 md:flex-none px-4 py-2 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-bold transition-all"
                      >
                        Từ chối
                      </button>
                      <button
                        onClick={() => setActionModal({ txn, type: 'approve' })}
                        className="flex-1 md:flex-none px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 border border-green-500/30 text-white text-xs font-bold shadow-[0_0_15px_rgba(34,197,94,0.2)] transition-all"
                      >
                        Duyệt chi
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      <AnimatePresence>
        {actionModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm !mt-0"
            onClick={(e) =>
              e.target === e.currentTarget && setActionModal(null)
            }
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9 }}
              className="card p-6 max-w-sm w-full"
            >
              <h3 className="font-bold text-lg mb-2">
                {actionModal.type === 'approve'
                  ? 'Duyệt yêu cầu rút tiền'
                  : 'Từ chối yêu cầu rút tiền'}
              </h3>
              <p className="text-xs text-white/40 mb-4 leading-relaxed">
                {actionModal.type === 'approve'
                  ? 'Vui lòng xác nhận bạn đã chuyển khoản ngân hàng thành công số tiền này cho người dùng trước khi duyệt.'
                  : 'Vui lòng nhập lý do từ chối để gửi lại tiền từ đóng băng về ví khả dụng cho người dùng.'}
              </p>

              <div className="relative mb-4">
                <input
                  type="text"
                  className="input text-sm"
                  placeholder={
                    actionModal.type === 'approve'
                      ? 'Ghi chú giao dịch (tùy chọn)'
                      : 'Lý do từ chối rút tiền'
                  }
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setActionModal(null)}
                  className="btn-secondary flex-1"
                >
                  Hủy
                </button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleAction}
                  disabled={
                    processingId !== null ||
                    (actionModal.type === 'reject' && !adminNote)
                  }
                  className={`btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50 ${actionModal.type === 'approve' ? '!bg-green-600 hover:!bg-green-500 border-green-500/30' : '!bg-red-600 hover:!bg-red-500 border-red-500/30'}`}
                >
                  {processingId !== null ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    'Xác nhận'
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

const ReportsTab = () => {
  const [reports, setReports] = useState([])
  const [stats, setStats] = useState({
    pending: 0,
    resolved: 0,
    dismissed: 0,
    total: 0,
  })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [processingId, setProcessingId] = useState(null)

  const fetchReports = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/admin/reports', {
        params: { status: filter },
      })
      setReports(data.reports || [])
      if (data.stats) setStats(data.stats)
    } catch (err) {
      toast.error('Không thể tải danh sách báo cáo')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReports()
  }, [filter])

  const handleAction = async (reportId, action) => {
    setProcessingId(reportId)
    try {
      await api.patch(`/admin/reports/${reportId}/action`, { action })
      toast.success(
        action === 'dismiss' ? 'Đã bỏ qua báo cáo' : 'Đã ẩn bài viết thành công'
      )
      await fetchReports()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Thao tác thất bại')
    } finally {
      setProcessingId(null)
    }
  }

  const formatTime = (dateStr) => {
    const d = new Date(dateStr)
    return `${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - ${d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
  }

  return (
    <div className="space-y-4 font-body">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-bold text-xl text-white mb-1 font-display">
            Báo cáo vi phạm
          </h2>
          <p className="text-sm text-white/40 font-medium">
            Xem xét báo cáo của người dùng đối với các bài đăng vi phạm.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-1.5 p-1 bg-white/5 rounded-xl border border-white/5 self-start">
          {['pending', 'resolved', 'dismissed', 'all'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                filter === status
                  ? 'bg-brand-600 text-white shadow-lg'
                  : 'text-white/50 hover:text-white/80'
              }`}
            >
              {status === 'pending' && `Chờ xử lý (${stats.pending || 0})`}
              {status === 'resolved' && `Đã xử lý (${stats.resolved || 0})`}
              {status === 'dismissed' && `Đã bỏ qua (${stats.dismissed || 0})`}
              {status === 'all' && `Tất cả (${stats.total || 0})`}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-5 animate-pulse h-28" />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <div className="card p-12 text-center text-white/35">
          <Flag size={40} className="mx-auto mb-3 opacity-25" />
          Không tìm thấy báo cáo nào trong mục này
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((rep) => {
            const reporter = rep.reporterId || {}
            const post = rep.postId || {}
            const author = post.authorId || {}
            const firstImg = post.generatedImages?.[0] || post.images?.[0]
            const thumbUrl = firstImg?.thumbnailUrl || firstImg?.url

            return (
              <motion.div
                key={rep._id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="card p-5 flex flex-col md:flex-row gap-4 border border-white/10 hover:border-white/20 transition-all bg-[#121225]/40 rounded-2xl"
              >
                {/* Post Preview Thumbnail */}
                <div className="w-20 h-20 rounded-xl overflow-hidden border border-white/10 bg-black/30 flex-shrink-0 relative group">
                  {thumbUrl ? (
                    <img
                      src={thumbUrl}
                      className="w-full h-full object-cover"
                      alt=""
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/25 text-[10px]">
                      No Img
                    </div>
                  )}
                  {post._id && (
                    <a
                      href={`/posts/${post._id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[10px] font-bold"
                    >
                      Xem ảnh
                    </a>
                  )}
                </div>

                {/* Report Info */}
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xs font-semibold text-white/70">
                      Người báo cáo:{' '}
                      <strong className="text-white">
                        @{reporter.username || 'unknown'}
                      </strong>{' '}
                      (${reporter.email || 'N/A'})
                    </span>
                    <span className="text-white/20 text-xs">•</span>
                    <span className="text-xs font-semibold text-white/70">
                      Tác giả:{' '}
                      <strong className="text-white">
                        @{author.username || 'unknown'}
                      </strong>
                    </span>

                    <div className="ml-auto flex items-center gap-2">
                      {rep.status === 'pending' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/25 font-bold">
                          CHỜ XỬ LÝ
                        </span>
                      )}
                      {rep.status === 'resolved' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/25 font-bold">
                          ĐÃ ẨN ẢNH
                        </span>
                      )}
                      {rep.status === 'dismissed' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/50 border border-white/20 font-bold">
                          ĐÃ BỎ QUA
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-3 bg-red-500/5 border border-red-500/15 rounded-xl text-xs text-red-300">
                    <span className="text-white/40 block mb-0.5 font-medium">
                      Lý do báo cáo:
                    </span>
                    <p className="font-semibold leading-relaxed">
                      ${rep.reason}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-white/40 font-medium">
                    <span>
                      ID Bài đăng:{' '}
                      <span className="font-mono">${post._id || 'N/A'}</span>
                    </span>
                    <span>•</span>
                    <span>Gửi lúc: ${formatTime(rep.createdAt)}</span>
                  </div>
                </div>

                {/* Actions */}
                {rep.status === 'pending' && (
                  <div className="flex md:flex-col justify-end gap-2 shrink-0 self-center md:self-end">
                    <button
                      onClick={() => handleAction(rep._id, 'dismiss')}
                      disabled={processingId === rep._id}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white/60 hover:text-white border border-white/10 hover:bg-white/5 transition-all cursor-pointer disabled:opacity-50"
                    >
                      Bỏ qua
                    </button>
                    <button
                      onClick={() => handleAction(rep._id, 'resolve_hide')}
                      disabled={processingId === rep._id}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/20 transition-all cursor-pointer disabled:opacity-50"
                    >
                      Duyệt & Ẩn ảnh
                    </button>
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// MAIN AdminPage
// ══════════════════════════════════════════════════════════════════
const TABS = [
  { key: 'dashboard', label: 'Dashboard', Icon: BarChart3 },
  { key: 'posts', label: 'Bài đăng', Icon: Images },
  { key: 'users', label: 'Users', Icon: Users },
  { key: 'withdrawals', label: 'Rút tiền', Icon: Wallet },
  { key: 'reports', label: 'Báo cáo vi phạm', Icon: Flag },
  { key: 'categories', label: 'Danh mục', Icon: Tag },
  { key: 'settings', label: 'Cài đặt', Icon: Settings },
  { key: 'logs', label: 'Nhật ký Admin', Icon: Clock },
]

const AdminPage = () => {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [hasUnsavedColors, setHasUnsavedColors] = useState(false)

  return (
    <AdminGuard>
      <div className="min-h-screen pb-24 md:pb-8 p-4 md:p-8">
        <div className="max-w-6xl mx-auto font-body">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mb-6"
          >
            <div>
              <h1 className="text-2xl font-display font-black flex items-center gap-2">
                <ShieldCheck size={24} className="text-violet-400" /> Admin
                Panel
              </h1>
              <p className="text-white/40 text-sm mt-0.5">
                Quản lý nội dung và người dùng PicSpy
              </p>
            </div>
          </motion.div>

          {/* Tabs */}
          <div className="flex gap-1 mb-6 bg-surface-50 p-1 rounded-2xl border border-white/10 w-fit flex-wrap">
            {TABS.map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => {
                  if (
                    activeTab === 'settings' &&
                    key !== 'settings' &&
                    hasUnsavedColors
                  ) {
                    if (
                      !window.confirm(
                        'Cấu hình màu của bạn chưa được lưu. Bạn có chắc chắn muốn rời đi?'
                      )
                    ) {
                      return
                    }
                    setHasUnsavedColors(false)
                  }
                  setActiveTab(key)
                }}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all
                  ${activeTab === key ? 'bg-brand-600 text-white shadow-[0_0_20px_rgba(124,58,237,0.3)]' : 'text-white/50 hover:text-white/80'}`}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>

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
              {activeTab === 'withdrawals' && <WithdrawalsTab />}
              {activeTab === 'reports' && <ReportsTab />}
              {activeTab === 'categories' && <CategoriesTab />}
              {activeTab === 'settings' && (
                <SettingsTab onDirtyChange={setHasUnsavedColors} />
              )}
              {activeTab === 'logs' && <LogsTab />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </AdminGuard>
  )
}

export default AdminPage
