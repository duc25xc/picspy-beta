import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutGrid,
  Clock,
  CheckCircle,
  XCircle,
  EyeOff,
  Heart,
  Download,
  Pencil,
  Trash2,
  X,
  Tag,
  ChevronDown,
  RefreshCw,
  ImageOff,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/api'

// ─── Constants ─────────────────────────────────────────────
const STATUS_CONFIG = {
  pending: {
    label: 'Chờ duyệt',
    icon: Clock,
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/15 border-yellow-500/30',
    dot: 'bg-yellow-400',
  },
  approved: {
    label: 'Đã duyệt',
    icon: CheckCircle,
    color: 'text-green-400',
    bg: 'bg-green-500/15 border-green-500/30',
    dot: 'bg-green-400',
  },
  rejected: {
    label: 'Bị từ chối',
    icon: XCircle,
    color: 'text-red-400',
    bg: 'bg-red-500/15 border-red-500/30',
    dot: 'bg-red-400',
  },
  hidden: {
    label: 'Đã ẩn',
    icon: EyeOff,
    color: 'text-white/40',
    bg: 'bg-white/5 border-white/10',
    dot: 'bg-white/40',
  },
}

const CATEGORIES = [
  'nature',
  'anime',
  'minimal',
  'abstract',
  'city',
  'space',
  'dark',
  'light',
  'gradient',
  'other',
]
const CATEGORY_LABELS = {
  nature: '🌿 Thiên nhiên',
  anime: '🎌 Anime',
  minimal: '◻️ Minimal',
  abstract: '🎨 Abstract',
  city: '🌃 Thành phố',
  space: '🚀 Vũ trụ',
  dark: '🌑 Dark',
  light: '☀️ Light',
  gradient: '🌈 Gradient',
  other: '✨ Khác',
}

// ─── Skeleton Card ──────────────────────────────────────────
const SkeletonCard = () => (
  <div className="rounded-2xl bg-surface-50 overflow-hidden animate-pulse">
    <div className="aspect-square bg-surface-100" />
    <div className="p-3 space-y-2">
      <div className="h-3 bg-surface-100 rounded w-2/3" />
      <div className="h-3 bg-surface-100 rounded w-1/3" />
    </div>
  </div>
)

// ─── Status Badge ───────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending
  const Icon = cfg.icon
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${cfg.bg} ${cfg.color}`}
    >
      <Icon size={11} />
      {cfg.label}
    </span>
  )
}

// ─── Edit Modal ─────────────────────────────────────────────
const EditModal = ({ post, onClose, onSave }) => {
  const [form, setForm] = useState({
    caption: post.caption || '',
    category: post.category || '',
    tags: post.tags || [],
    isPremium: post.isPremium || false,
    priceInCoins: post.priceInCoins || 50,
  })
  const [tag, setTag] = useState('')
  const [saving, setSaving] = useState(false)

  const addTag = () => {
    const t = tag
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_]/g, '')
    if (t && !form.tags.includes(t) && form.tags.length < 10) {
      setForm({ ...form, tags: [...form.tags, t] })
    }
    setTag('')
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const { data } = await api.put(`/posts/${post._id}`, {
        ...form,
        tags: JSON.stringify(form.tags),
      })
      toast.success('Đã cập nhật bài đăng')
      onSave(data.post)
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cập nhật thất bại')
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', damping: 20 }}
        className="card w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h3 className="font-bold text-lg">Chỉnh sửa bài đăng</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20"
          >
            <X size={16} />
          </button>
        </div>

        {/* Preview */}
        <div className="p-5 pb-0">
          <div className="relative w-full max-h-[350px] min-h-[160px] overflow-hidden rounded-2xl mb-5 bg-surface-100 flex items-center justify-center border border-white/5">
            <img
              src={post.images?.[0]?.thumbnailUrl || post.images?.[0]?.url}
              alt=""
              className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-20 scale-110"
            />

            <img
              src={post.images?.[0]?.url}
              alt={post.caption}
              className="relative z-10 max-h-[350px] w-auto object-contain shadow-2xl transition-transform duration-500"
            />

            <div className="absolute bottom-2 right-2 z-20">
              <span className="px-2 py-1 rounded-lg bg-black/40 backdrop-blur-md text-[10px] text-white/60">
                Preview Mode
              </span>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Caption */}
          <div>
            <label className="input-label">Mô tả</label>
            <textarea
              className="input resize-none"
              rows={3}
              maxLength={500}
              value={form.caption}
              onChange={(e) => setForm({ ...form, caption: e.target.value })}
              placeholder="Mô tả bức ảnh..."
            />
            <p className="text-xs text-white/30 text-right mt-1">
              {form.caption.length}/500
            </p>
          </div>

          {/* Category */}
          <div>
            <label className="input-label">Danh mục</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setForm({ ...form, category: cat })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border
                    ${
                      form.category === cat
                        ? 'bg-brand-600 border-brand-500 text-white'
                        : 'bg-surface-100 border-white/10 text-white/60 hover:border-brand-500/50'
                    }`}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="input-label">Tags</label>
            <div className="flex gap-2 mb-2">
              <div className="relative flex-1">
                <Tag
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
                />
                <input
                  className="input pl-8 text-sm"
                  placeholder="Thêm tag..."
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault()
                      addTag()
                    }
                  }}
                />
              </div>
              <button
                type="button"
                onClick={addTag}
                className="btn-secondary px-3 text-sm"
              >
                Thêm
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <AnimatePresence>
                {form.tags.map((t) => (
                  <motion.span
                    key={t}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="flex items-center gap-1 badge-brand text-xs px-2.5 py-1"
                  >
                    #{t}
                    <button
                      onClick={() =>
                        setForm({
                          ...form,
                          tags: form.tags.filter((x) => x !== t),
                        })
                      }
                    >
                      <X size={10} />
                    </button>
                  </motion.span>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="btn-secondary flex-1"
              disabled={saving}
            >
              Hủy
            </button>
            <button
              onClick={handleSave}
              className="btn-primary flex-1"
              disabled={saving}
            >
              {saving ? (
                <motion.div
                  className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                />
              ) : (
                'Lưu thay đổi'
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Delete Confirm Modal ───────────────────────────────────
const DeleteConfirmModal = ({ post, onClose, onConfirm }) => {
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await api.delete(`/posts/${post._id}`)
      toast.success('Đã xóa bài đăng')
      onConfirm(post._id)
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Xóa thất bại')
      setDeleting(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="card p-6 max-w-sm w-full text-center"
      >
        <div className="w-14 h-14 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
          <Trash2 size={24} className="text-red-400" />
        </div>
        <h3 className="font-bold text-lg mb-2">Xóa bài đăng?</h3>
        <p className="text-white/50 text-sm mb-1">
          Hành động này không thể hoàn tác.
        </p>
        <p className="text-white/30 text-xs mb-6">
          Ảnh sẽ bị xóa khỏi Cloudinary và database.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="btn-secondary flex-1"
            disabled={deleting}
          >
            Hủy
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
          >
            {deleting ? (
              <motion.div
                className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
              />
            ) : (
              <>
                <Trash2 size={14} /> Xóa
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Post Card ──────────────────────────────────────────────
const PostCard = ({ post, onEdit, onDelete, index }) => {
  const img = post.images?.[0]
  const displayUrl = img?.thumbnailUrl || img?.url

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="group relative rounded-2xl bg-surface-50 overflow-hidden border border-white/5 hover:border-white/10 transition-all duration-300"
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden">
        {displayUrl ? (
          <img
            src={displayUrl}
            alt={post.caption || 'Post'}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-surface-100 flex items-center justify-center">
            <ImageOff size={32} className="text-white/20" />
          </div>
        )}

        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Action buttons */}
        <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => onEdit(post)}
            className="w-8 h-8 rounded-xl bg-black/60 backdrop-blur-sm flex items-center justify-center hover:bg-brand-600 transition-colors"
          >
            <Pencil size={14} />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => onDelete(post)}
            className="w-8 h-8 rounded-xl bg-black/60 backdrop-blur-sm flex items-center justify-center hover:bg-red-600 transition-colors"
          >
            <Trash2 size={14} />
          </motion.button>
        </div>

        {/* Premium badge */}
        {post.isPremium && (
          <div className="absolute top-2 left-2">
            <span className="badge-warning text-xs">💎 Premium</span>
          </div>
        )}

        {/* Bottom stats on hover */}
        <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          <div className="flex items-center gap-3 text-white text-xs">
            <span className="flex items-center gap-1">
              <Heart size={11} className="text-red-400" />
              {(post.stats?.likesCount || 0).toLocaleString()}
            </span>
            <span className="flex items-center gap-1">
              <Download size={11} className="text-brand-400" />
              {(post.stats?.downloadsCount || 0).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="flex items-center justify-between gap-2">
          <StatusBadge status={post.status} />
          <span className="text-xs text-white/30">
            {new Date(post.createdAt).toLocaleDateString('vi-VN')}
          </span>
        </div>
        {post.caption && (
          <p className="text-sm text-white/60 mt-2 line-clamp-1">
            {post.caption}
          </p>
        )}
        {post.status === 'rejected' && post.rejectionReason && (
          <p className="text-xs text-red-400/80 mt-1.5 line-clamp-1">
            ⚠ {post.rejectionReason}
          </p>
        )}
      </div>
    </motion.div>
  )
}

// ─── Stats Row ──────────────────────────────────────────────
const StatsRow = ({ stats }) => (
  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
    {[
      { label: 'Tổng cộng', value: stats.total, color: 'text-white' },
      { label: 'Chờ duyệt', value: stats.pending, color: 'text-yellow-400' },
      { label: 'Đã duyệt', value: stats.approved, color: 'text-green-400' },
      { label: 'Từ chối', value: stats.rejected, color: 'text-red-400' },
      { label: 'Đã ẩn', value: stats.hidden, color: 'text-white/40' },
    ].map(({ label, value, color }) => (
      <div key={label} className="card p-3 text-center">
        <p className={`text-2xl font-black mb-0.5 ${color}`}>{value}</p>
        <p className="text-xs text-white/40">{label}</p>
      </div>
    ))}
  </div>
)

// ─── Main Page ──────────────────────────────────────────────
const MyPostsPage = () => {
  const [posts, setPosts] = useState([])
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    hidden: 0,
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeStatus, setActiveStatus] = useState('all')
  const [hasMore, setHasMore] = useState(false)
  const [cursor, setCursor] = useState(null)
  const [editPost, setEditPost] = useState(null)
  const [deletePost, setDeletePost] = useState(null)
  const [initialLoaded, setInitialLoaded] = useState(false)
  const [isTabChanging, setIsTabChanging] = useState(false)

  const fetchPosts2 = useCallback(
    async ({ reset = false } = {}) => {
      if (!reset && !hasMore && posts.length > 0) return

      if (reset) {
        setLoading(true)
        setCursor(null)
      }

      try {
        const params = { limit: 12 }
        if (!reset && cursor) params.cursor = cursor
        if (activeStatus !== 'all') params.status = activeStatus

        const { data } = await api.get('/posts/me', { params })

        if (reset) {
          setPosts(data.posts)
        } else {
          setPosts((prev) => [...prev, ...data.posts])
        }

        setStats(data.stats)
        setHasMore(data.pagination.hasMore)
        setCursor(data.pagination.nextCursor)
      } catch (err) {
        toast.error(err.response?.data?.message || 'Không thể tải ảnh')
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [activeStatus, cursor, hasMore, posts.length]
  )

  const fetchPosts = useCallback(
    async ({ reset = false } = {}) => {
      if (!reset && !hasMore && posts.length > 0) return

      if (reset) {
        if (!initialLoaded) {
          setLoading(true) // Chỉ hiện Skeletons ở lần tải trang đầu tiên
        } else {
          setIsTabChanging(true) // Chuyển tab chỉ làm mờ nhẹ giao diện
        }
        setCursor(null)
      }

      try {
        const params = { limit: 12 }
        if (!reset && cursor) params.cursor = cursor
        if (activeStatus !== 'all') params.status = activeStatus

        const { data } = await api.get('/posts/me', { params })

        if (reset) {
          setPosts(data.posts)
        } else {
          setPosts((prev) => [...prev, ...data.posts])
        }

        setStats(data.stats)
        setHasMore(data.pagination.hasMore)
        setCursor(data.pagination.nextCursor)
      } catch (err) {
        toast.error(err.response?.data?.message || 'Không thể tải ảnh')
      } finally {
        setLoading(false)
        setIsTabChanging(false) // Tắt trạng thái mờ
        setRefreshing(false)
        setInitialLoaded(true) // Đánh dấu đã qua lần load đầu tiên
      }
    },
    [activeStatus, cursor, hasMore, posts.length, initialLoaded] // Thêm initialLoaded vào dependencies
  )

  // Fetch khi filter thay đổi
  useEffect(() => {
    fetchPosts({ reset: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStatus])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchPosts({ reset: true })
  }

  const handleEditSave = (updatedPost) => {
    setPosts((prev) =>
      prev.map((p) => (p._id === updatedPost._id ? updatedPost : p))
    )
  }

  const handleDeleteConfirm = (deletedId) => {
    setPosts((prev) => prev.filter((p) => p._id !== deletedId))
    setStats((prev) => ({
      ...prev,
      total: Math.max(0, prev.total - 1),
    }))
  }

  const STATUS_TABS = [
    { key: 'all', label: 'Tất cả', count: stats.total },
    { key: 'pending', label: 'Chờ duyệt', count: stats.pending },
    { key: 'approved', label: 'Đã duyệt', count: stats.approved },
    { key: 'rejected', label: 'Từ chối', count: stats.rejected },
    { key: 'hidden', label: 'Đã ẩn', count: stats.hidden },
  ]

  return (
    <div className="min-h-screen pb-24 md:pb-8 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6"
        >
          <div>
            <h1 className="text-2xl font-display font-bold flex items-center gap-2">
              <LayoutGrid size={22} className="text-brand-400" />
              Ảnh của tôi
            </h1>
            <p className="text-white/40 text-sm mt-0.5">
              Quản lý tất cả ảnh bạn đã đăng
            </p>
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleRefresh}
            disabled={loading || refreshing}
            className="btn-secondary text-sm flex items-center gap-2"
          >
            <motion.div
              animate={refreshing ? { rotate: 360 } : {}}
              transition={{
                duration: 0.8,
                repeat: refreshing ? Infinity : 0,
                ease: 'linear',
              }}
            >
              <RefreshCw size={15} />
            </motion.div>
            Làm mới
          </motion.button>
        </motion.div>

        {/* Stats */}
        {!loading && <StatsRow stats={stats} />}

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-5">
          {STATUS_TABS.map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setActiveStatus(key)}
              className={`whitespace-nowrap flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border flex-shrink-0
                ${
                  activeStatus === key
                    ? 'bg-brand-600 border-brand-500 text-white'
                    : 'bg-surface-50 border-white/10 text-white/50 hover:border-white/20 hover:text-white/80'
                }`}
            >
              {label}
              {count > 0 && (
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full font-bold
                  ${activeStatus === key ? 'bg-white/20 text-white' : 'bg-white/10 text-white/40'}`}
                >
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Grid */}
        {/* Grid & Empty State */}
        <motion.div layout className="min-h-[400px]">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="skeleton-state"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3"
              >
                {Array.from({ length: 8 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </motion.div>
            ) : posts.length === 0 ? (
              <motion.div
                key="empty-state"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="text-center py-20"
              >
                <div className="w-20 h-20 rounded-3xl bg-surface-100 flex items-center justify-center mx-auto mb-4">
                  <ImageOff size={32} className="text-white/20" />
                </div>
                <p className="text-white/40 mb-2">Chưa có ảnh nào</p>
                <p className="text-white/20 text-sm mb-6">
                  {activeStatus === 'all'
                    ? 'Hãy upload ảnh đầu tiên của bạn!'
                    : `Không có ảnh nào với trạng thái "${STATUS_CONFIG[activeStatus]?.label || activeStatus}"`}
                </p>
                {activeStatus === 'all' && (
                  <a href="/upload" className="btn-primary">
                    Upload ngay
                  </a>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="data-state"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                // Khi đang đổi tab, làm mờ grid đi một chút và chặn click
                className={`transition-opacity duration-300 ${
                  isTabChanging
                    ? 'opacity-40 pointer-events-none'
                    : 'opacity-100'
                }`}
              >
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  <AnimatePresence>
                    {posts.map((post, i) => (
                      <PostCard
                        key={post._id}
                        post={post}
                        index={i}
                        onEdit={setEditPost}
                        onDelete={setDeletePost}
                      />
                    ))}
                  </AnimatePresence>
                </div>

                {hasMore && (
                  <div className="flex justify-center mt-8">
                    <button
                      onClick={() => fetchPosts()}
                      className="btn-secondary flex items-center gap-2"
                    >
                      <ChevronDown size={16} />
                      Tải thêm
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {editPost && (
          <EditModal
            post={editPost}
            onClose={() => setEditPost(null)}
            onSave={handleEditSave}
          />
        )}
        {deletePost && (
          <DeleteConfirmModal
            post={deletePost}
            onClose={() => setDeletePost(null)}
            onConfirm={handleDeleteConfirm}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export default MyPostsPage
