/* eslint-disable no-unused-vars */
import { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Heart,
  Download,
  Globe,
  UserPlus,
  UserCheck,
  Zap,
  Crown,
  Star,
  Settings,
  ChevronRight,
  ImageOff,
  Loader2,
  Camera,
  Film,
  ShoppingBag,
  Flag,
  Clock,
  ArrowUpRight,
} from 'lucide-react'
import { IoImages, IoSparkles } from 'react-icons/io5'
import { GiCutDiamond } from 'react-icons/gi'
import useAuthStore from '../store/auth.store'
import api from '../api/api'
import { getOptimizedWebpUrl } from '../utils/imageUrl'
import ConfirmModal from '../components/common/ConfirmModal'
import toast from 'react-hot-toast'
import EditProfileModal from '../components/profile/EditProfileModal'
import FollowListModal from '../components/profile/FollowListModal'
import OrderReportModal from '../components/common/OrderReportModal'
import { useSettings } from '../context/SettingsContext'

// ─── Tier config (đồng bộ với useTierAccess + AdminPage) ────────
const TIER_META = {
  free: {
    label: 'Miễn phí',
    color: '#9ca3af',
    bg: 'rgba(156,163,175,0.12)',
    border: 'rgba(156,163,175,0.2)',
    icon: null,
    badge: null,
  },
  founder: {
    label: "Founder's",
    color: '#d97706',
    bg: 'rgba(217,119,6,0.12)',
    border: 'rgba(217,119,6,0.3)',
    icon: Star,
    badge: '⭐ Founder',
  },
  pro: {
    label: 'Pro',
    color: '#7986eb',
    bg: 'rgba(121,134,235,0.12)',
    border: 'rgba(121,134,235,0.3)',
    icon: Zap,
    badge: '⚡ Pro',
  },
  ultimate: {
    label: 'Ultimate',
    color: '#06b6d4',
    bg: 'rgba(6,182,212,0.12)',
    border: 'rgba(6,182,212,0.3)',
    icon: Crown,
    badge: '👑 Ultimate',
  },
}

// ─── Skeleton ────────────────────────────────────────────────────
const SkeletonCard = () => (
  <div className="aspect-square rounded-2xl bg-white/5 animate-pulse" />
)

const ProfileSkeleton = () => (
  <div className="min-h-screen pb-24 md:pb-8">
    <div className="h-36 md:h-52 bg-white/5 animate-pulse" />
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-14">
      <div className="w-24 h-24 rounded-3xl bg-white/10 animate-pulse mb-4" />
      <div className="h-6 w-40 bg-white/10 rounded-xl animate-pulse mb-2" />
      <div className="h-4 w-24 bg-white/5 rounded-xl animate-pulse mb-6" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  </div>
)

// ─── Stat Item ───────────────────────────────────────────────────
const StatItem = ({ label, value }) => (
  <div className="text-center px-2">
    <p className="text-xl font-display font-bold">
      {typeof value === 'number'
        ? value.toLocaleString('vi-VN')
        : (value ?? '—')}
    </p>
    <p className="text-xs text-white/40 mt-0.5">{label}</p>
  </div>
)

// ─── Tier Badge ──────────────────────────────────────────────────
const TierBadge = ({ tier }) => {
  const meta = TIER_META[tier] ?? TIER_META.free
  if (!meta.badge) return null // Free tier: không hiện badge
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border"
      style={{
        background: meta.bg,
        color: meta.color,
        borderColor: meta.border,
      }}
    >
      {meta.badge}
    </span>
  )
}

// ─── Helper: tính ngày còn lại trong cửa sổ 3 ngày ──────────────
const orderReportDaysLeft = (purchasedAt) => {
  if (!purchasedAt) return 0
  const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000
  const elapsed = Date.now() - new Date(purchasedAt).getTime()
  const remaining = THREE_DAYS_MS - elapsed
  return Math.max(0, Math.ceil(remaining / (1000 * 60 * 60 * 24)))
}

// ─── Profile Page ────────────────────────────────────────────────
const ProfilePage = () => {
  const { username } = useParams()
  const navigate = useNavigate()
  const { user: currentUser } = useAuthStore()

  const [profile, setProfile] = useState(null)
  const [posts, setPosts] = useState([])
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [loadingPosts, setLoadingPosts] = useState(true)
  const [error, setError] = useState(null)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [showUnfollowConfirm, setShowUnfollowConfirm] = useState(false)
  const [avatarError, setAvatarError] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showFollowModal, setShowFollowModal] = useState(false)
  const [followModalType, setFollowModalType] = useState('followers') // 'followers' | 'following'
  // ── Order Report modal ─────────────────────────────────────────
  const [orderReportTarget, setOrderReportTarget] = useState(null) // { post, purchasedAt }

  // ── Refund settings and modal state ────────────────────────────
  const { enableRefund } = useSettings()
  const [showRefundConfirm, setShowRefundConfirm] = useState(false)
  const [refundTarget, setRefundTarget] = useState(null)
  const [refundLoading, setRefundLoading] = useState(false)

  const [searchParams, setSearchParams] = useSearchParams()
  const showEdit = searchParams.get('edit') === 'true'
  // 'editsubtab' drives EditProfileModal's internal tab (info | password)
  const editTab = searchParams.get('editsubtab') || 'info'
  // 'tab' drives the profile content grid (posts | bookmarks | purchases)
  const urlTab = searchParams.get('tab')
  const activeTab =
    !showEdit && ['posts', 'bookmarks', 'purchases'].includes(urlTab)
      ? urlTab
      : 'posts'

  const handleTabChange = (tabKey) => {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('tab', tabKey)
    setSearchParams(nextParams)
  }

  const isOwnProfile = currentUser?.username === username

  const handleProfileUpdated = useCallback((updates) => {
    setProfile((prev) => {
      if (!prev) return prev
      return { ...prev, ...updates }
    })
  }, [])

  // ── Fetch profile ──────────────────────────────────────────────
  useEffect(() => {
    setLoadingProfile(true)
    setError(null)
    setAvatarError(false)
    api
      .get(`/users/${username}`)
      .then(({ data }) => {
        setProfile(data.user)
        // Kiểm tra xem currentUser có đang follow không
        // (nếu BE trả về isFollowing thì dùng, tạm thời để false)
        setIsFollowing(data.isFollowing ?? false)
      })
      .catch((err) => {
        if (err.response?.status === 404) setError('not_found')
        else setError('server')
      })
      .finally(() => setLoadingProfile(false))
  }, [username])

  // ── Fetch user posts / bookmarks / purchases ───────────────────
  useEffect(() => {
    if (!profile?._id) return
    setLoadingPosts(true)

    let request = null
    if (activeTab === 'posts') {
      request = api.get('/posts', {
        params: { authorId: profile._id, status: 'approved', limit: 24 },
      })
    } else if (activeTab === 'bookmarks') {
      request = api.get('/users/me/bookmarks')
    } else if (activeTab === 'purchases') {
      request = api.get('/users/me/purchases')
    }

    if (request) {
      request
        .then(({ data }) => setPosts(data.posts ?? []))
        .catch(() => setPosts([]))
        .finally(() => setLoadingPosts(false))
    } else {
      setPosts([])
      setLoadingPosts(false)
    }
  }, [profile?._id, activeTab])

  // ── Sync follow state across tabs ──────────────────────────────
  useEffect(() => {
    if (!profile?._id) return
    const channel = new BroadcastChannel('picspy_follow_sync')
    const handleMessage = (event) => {
      const { creatorId, isFollowing: newIsFollowing } = event.data
      if (profile._id === creatorId) {
        setIsFollowing(newIsFollowing)
        setProfile((prev) => {
          if (!prev) return prev
          // Tránh cộng trừ sai lệch nếu trạng thái đã khớp từ trước
          const currentIsFollowing = isFollowing
          if (currentIsFollowing === newIsFollowing) return prev
          const diff = newIsFollowing ? 1 : -1
          return {
            ...prev,
            stats: {
              ...prev.stats,
              followersCount: Math.max(
                0,
                (prev.stats?.followersCount || 0) + diff
              ),
            },
          }
        })
      }
    }
    channel.addEventListener('message', handleMessage)
    return () => {
      channel.removeEventListener('message', handleMessage)
      channel.close()
    }
  }, [profile?._id, isFollowing])

  // ── Follow / Unfollow ─────────────────────────────────────────
  const confirmUnfollow = useCallback(async () => {
    if (followLoading) return
    setFollowLoading(true)
    try {
      const { data } = await api.post(`/users/${profile._id}/follow`)
      setIsFollowing(data.following)
      setProfile((prev) => ({
        ...prev,
        stats: {
          ...prev.stats,
          followersCount: Math.max(
            0,
            prev.stats.followersCount + (data.following ? 1 : -1)
          ),
        },
      }))
      toast.success('Đã bỏ theo dõi', { duration: 1500 })

      // Broadcast sự kiện sync cho các tab khác
      const channel = new BroadcastChannel('picspy_follow_sync')
      channel.postMessage({
        creatorId: profile._id,
        isFollowing: data.following,
      })
      channel.close()
    } catch {
      toast.error('Không thể thực hiện')
    } finally {
      setFollowLoading(false)
      setShowUnfollowConfirm(false)
    }
  }, [profile?._id, followLoading])

  const handleFollow = useCallback(async () => {
    if (!currentUser) {
      navigate('/login')
      return
    }
    if (isFollowing) {
      setShowUnfollowConfirm(true)
    } else {
      if (followLoading) return
      setFollowLoading(true)
      try {
        const { data } = await api.post(`/users/${profile._id}/follow`)
        setIsFollowing(data.following)
        setProfile((prev) => ({
          ...prev,
          stats: {
            ...prev.stats,
            followersCount: Math.max(
              0,
              prev.stats.followersCount + (data.following ? 1 : -1)
            ),
          },
        }))
        toast.success(`Đang theo dõi @${profile.username}`, { duration: 1500 })

        // Broadcast sự kiện sync cho các tab khác
        const channel = new BroadcastChannel('picspy_follow_sync')
        channel.postMessage({
          creatorId: profile._id,
          isFollowing: data.following,
        })
        channel.close()
      } catch {
        toast.error('Không thể thực hiện')
      } finally {
        setFollowLoading(false)
      }
    }
  }, [currentUser, navigate, isFollowing, followLoading, profile])

  // ── Refund handling ─────────────────────────────────────────────
  const handleRefundConfirm = async () => {
    if (!refundTarget || refundLoading) return
    setRefundLoading(true)
    try {
      const { data } = await api.post(`/posts/${refundTarget._id}/refund`, {
        fileType: refundTarget.purchasedFileType || 'original',
      })
      toast.success(data.message || 'Hoàn tác đơn hàng thành công!')
      // Xóa khỏi danh sách hiện tại
      setPosts((prev) => prev.filter((p) => p._id !== refundTarget._id))
      // Cập nhật ví khả dụng trong header
      if (useAuthStore.getState().refreshMe) {
        await useAuthStore.getState().refreshMe()
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Hoàn tác thất bại')
    } finally {
      setRefundLoading(false)
      setShowRefundConfirm(false)
      setRefundTarget(null)
    }
  }

  // ── Error / Loading states ─────────────────────────────────────
  if (loadingProfile) return <ProfileSkeleton />

  if (error === 'not_found')
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6">
        <ImageOff size={48} className="text-white/20" />
        <h1 className="text-2xl font-bold">Không tìm thấy người dùng</h1>
        <p className="text-white/40 text-sm">
          @{username} không tồn tại hoặc đã bị khóa.
        </p>
        <Link to="/" className="btn-primary text-sm">
          Về trang chủ
        </Link>
      </div>
    )

  if (error)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6">
        <p className="text-white/40">Đã có lỗi xảy ra. Vui lòng thử lại.</p>
        <button
          onClick={() => window.location.reload()}
          className="btn-secondary text-sm"
        >
          Thử lại
        </button>
      </div>
    )

  const tier = profile.subscriptionTier ?? 'free'
  const tierMeta = TIER_META[tier] ?? TIER_META.free

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      {/* ══════════ COVER ══════════ */}
      <div
        className="h-36 md:h-52 relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${tierMeta.bg.replace('0.12', '0.4')} 0%, hsl(240,20%,8%) 60%)`,
        }}
      >
        {/* Animated glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at 30% 50%, ${tierMeta.color}22 0%, transparent 60%)`,
          }}
        />
      </div>

      {/* ══════════ HEADER ══════════ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative -mt-14 md:-mt-20 mb-4 flex items-end justify-between">
          {/* Avatar */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative"
          >
            <div
              className="w-24 h-24 md:w-32 md:h-32 rounded-3xl overflow-hidden border-4 border-surface shadow-2xl"
              style={{
                borderColor:
                  tier !== 'free' ? tierMeta.color + '66' : undefined,
              }}
            >
              {profile.avatar && !avatarError ? (
                <img
                  src={profile.avatar}
                  alt={profile.displayName}
                  className="w-full h-full object-cover bg-surface-100"
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-3xl font-bold"
                  style={{
                    background: `linear-gradient(135deg, ${tierMeta.color}33, ${tierMeta.color}11)`,
                  }}
                >
                  {profile.username?.[0]?.toUpperCase()}
                </div>
              )}
            </div>
            {/* Verified checkmark */}
            {profile.isVerified && (
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-brand-600 border-2 border-surface flex items-center justify-center">
                <span className="text-xs">✓</span>
              </div>
            )}
          </motion.div>

          {/* Action buttons */}
          <div className="flex gap-2 mb-2">
            {isOwnProfile ? (
              <>
                <button
                  onClick={() => setShowEditModal(true)}
                  className="btn-secondary text-sm flex items-center gap-1.5 cursor-pointer hover:bg-surface-200 transition-colors"
                >
                  <Settings size={14} /> Thiết lập
                </button>
                <Link
                  to="/studio"
                  className="btn-secondary text-sm flex items-center gap-1.5"
                >
                  <Film size={14} /> Creator Studio
                </Link>
                {/* Nút nâng cấp nếu free */}
                {tier === 'free' && (
                  <Link
                    to="/pricing#pro"
                    className="btn-primary text-sm flex items-center gap-1.5"
                  >
                    <Zap size={14} /> Nâng cấp Pro
                  </Link>
                )}
              </>
            ) : (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleFollow}
                disabled={followLoading}
                className={`text-sm flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold transition-all disabled:opacity-60 ${
                  isFollowing ? 'btn-secondary' : 'btn-primary'
                }`}
              >
                {followLoading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : isFollowing ? (
                  <>
                    <UserCheck size={14} /> Đang follow
                  </>
                ) : (
                  <>
                    <UserPlus size={14} /> Follow
                  </>
                )}
              </motion.button>
            )}
          </div>
        </div>

        {/* ══════════ INFO ══════════ */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h1 className="text-xl font-display font-bold">
              {profile.displayName || profile.username}
            </h1>
            <TierBadge tier={tier} />
          </div>
          <p className="text-white/40 text-sm mb-3">@{profile.username}</p>

          {profile.bio && (
            <p className="text-white/70 text-sm leading-relaxed mb-4 max-w-lg">
              {profile.bio}
            </p>
          )}

          {/* Links */}
          <div className="flex flex-wrap gap-4 text-sm text-white/40 mb-6">
            {profile.website && (
              <a
                href={profile.website}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 hover:text-brand-400 transition-colors"
              >
                <Globe size={14} />
                {profile.website.replace(/^https?:\/\//, '')}
              </a>
            )}
          </div>

          {/* Upgrade banner — chỉ hiện cho own profile free */}
          {isOwnProfile && tier === 'free' && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 rounded-2xl flex items-center justify-between gap-3"
              style={{
                background:
                  'linear-gradient(135deg, rgba(121,134,235,0.1) 0%, rgba(6,182,212,0.08) 100%)',
                border: '1px solid rgba(121,134,235,0.2)',
              }}
            >
              <div>
                <p className="text-sm font-bold text-white/80">
                  Nâng cấp lên Pro để mở khoá toàn bộ tính năng
                </p>
                <p className="text-xs text-white/40 mt-0.5">
                  Copy prompt 1-click · Không watermark · Negative prompts · và
                  nhiều hơn
                </p>
              </div>
              <Link
                to="/pricing#pro"
                className="flex items-center gap-1 shrink-0 text-xs font-bold px-3 py-2 rounded-xl transition-all"
                style={{
                  background: 'rgba(121,134,235,0.2)',
                  color: '#7986eb',
                  border: '1px solid rgba(121,134,235,0.3)',
                }}
              >
                Xem gói <ChevronRight size={13} />
              </Link>
            </motion.div>
          )}

          {/* Stats */}
          <div className="flex gap-2 mb-8 overflow-x-auto no-scrollbar border-b border-white/5 pb-6 items-center">
            <StatItem label="Ảnh" value={profile.stats?.postsCount} />
            <div className="w-px bg-white/10 mx-1 self-stretch my-2" />
            <button
              onClick={() => {
                setFollowModalType('followers')
                setShowFollowModal(true)
              }}
              className="focus:outline-none hover:opacity-80 transition-opacity cursor-pointer text-left"
            >
              <StatItem
                label="Followers"
                value={profile.stats?.followersCount}
              />
            </button>
            <button
              onClick={() => {
                setFollowModalType('following')
                setShowFollowModal(true)
              }}
              className="focus:outline-none hover:opacity-80 transition-opacity cursor-pointer text-left"
            >
              <StatItem
                label="Following"
                value={profile.stats?.followingCount}
              />
            </button>
            <div className="w-px bg-white/10 mx-1 self-stretch my-2" />
            <StatItem label="Lượt thích" value={profile.stats?.totalLikes} />
            <StatItem label="Downloads" value={profile.stats?.totalDownloads} />
          </div>
        </motion.div>

        {/* ══════════ TABS ══════════ */}
        <div className="flex gap-1 mb-6 border-b border-white/10">
          {[
            { key: 'posts', label: '🖼 Ảnh' },
            ...(isOwnProfile
              ? [{ key: 'bookmarks', label: '🔖 Bookmark' }]
              : []),
            ...(isOwnProfile ? [{ key: 'purchases', label: '🛍 Đã mua' }] : []),
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handleTabChange(key)}
              className={`px-5 py-2.5 text-sm font-medium transition-all duration-200 border-b-2 -mb-px
                ${
                  activeTab === key
                    ? 'border-brand-500 text-brand-400'
                    : 'border-transparent text-white/40 hover:text-white/70'
                }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ══════════ POSTS GRID ══════════ */}
        <AnimatePresence mode="wait">
          {loadingPosts ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Camera size={40} className="text-white/10" />
              <p className="text-white/30 text-sm">
                {activeTab === 'bookmarks'
                  ? 'Bạn chưa lưu bookmark ảnh nào.'
                  : activeTab === 'purchases'
                    ? 'Bạn chưa mua tệp tin Premium nào.'
                    : isOwnProfile
                      ? 'Bạn chưa đăng ảnh nào.'
                      : 'Người dùng chưa đăng ảnh nào.'}
              </p>
              {isOwnProfile && activeTab === 'posts' && (
                <Link to="/upload" className="btn-primary text-sm mt-2">
                  + Đăng ảnh đầu tiên
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pb-8">
              {posts.map((post, i) => {
                const isPurchasesTab = activeTab === 'purchases'
                const daysLeft = isPurchasesTab
                  ? orderReportDaysLeft(post.purchasedAt)
                  : 0
                const canOrderReport = isPurchasesTab && daysLeft > 0

                return (
                  <motion.div
                    key={post._id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.04, duration: 0.3 }}
                    className="group relative overflow-hidden rounded-2xl bg-surface-50 cursor-pointer aspect-square"
                    onClick={() => {
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                      navigate(`/posts/${post._id}`)
                    }}
                  >
                    <img
                      src={getOptimizedWebpUrl(
                        post.images?.[0]?.thumbnailUrl ||
                          post.images?.[0]?.url ||
                          post.generatedImages?.[0]?.thumbnailUrl ||
                          post.generatedImages?.[0]?.url ||
                          post.thumbnail,
                        400
                      )}
                      alt={post.caption}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      loading="lazy"
                    />

                    {/* Hover overlay — mặc định (stats) */}
                    <div
                      className={`absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-2 ${
                        isPurchasesTab ? 'pb-16' : ''
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 text-white font-medium text-sm">
                          <Heart size={15} className="text-red-400" />
                          {(post.stats?.likesCount ?? 0).toLocaleString(
                            'vi-VN'
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-white font-medium text-sm">
                          <Download size={15} className="text-blue-400" />
                          {(post.stats?.downloadsCount ?? 0).toLocaleString(
                            'vi-VN'
                          )}
                        </div>
                      </div>

                      {/* Action buttons (chỉ trong purchases tab) */}
                      {isPurchasesTab && (
                        <div className="absolute bottom-2 left-2 right-2 flex flex-col gap-1.5 z-20">
                          {canOrderReport ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setOrderReportTarget({
                                  post,
                                  purchasedAt: post.purchasedAt,
                                })
                              }}
                              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-bold text-white transition-all cursor-pointer hover:scale-[1.02]"
                              style={{
                                background:
                                  'linear-gradient(135deg, rgba(217,119,6,0.85) 0%, rgba(180,83,9,0.85) 100%)',
                                backdropFilter: 'blur(8px)',
                                border: '1px solid rgba(217,119,6,0.4)',
                              }}
                            >
                              <Flag size={10} />
                              Order Report
                              <span
                                className="ml-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold"
                                style={{ background: 'rgba(255,255,255,0.2)' }}
                              >
                                <Clock size={8} className="inline mr-0.5" />
                                {daysLeft}d
                              </span>
                            </button>
                          ) : (
                            <div
                              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-medium"
                              style={{
                                background: 'rgba(255,255,255,0.06)',
                                color: 'rgba(255,255,255,0.3)',
                              }}
                            >
                              <Flag size={10} />
                              Hết hạn báo cáo
                            </div>
                          )}

                          {/* Hoàn tác button */}
                          {enableRefund && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setRefundTarget(post)
                                setShowRefundConfirm(true)
                              }}
                              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-bold text-white transition-all cursor-pointer hover:scale-[1.02]"
                              style={{
                                background:
                                  'linear-gradient(135deg, rgba(239,68,68,0.85) 0%, rgba(185,28,28,0.85) 100%)',
                                backdropFilter: 'blur(8px)',
                                border: '1px solid rgba(239,68,68,0.4)',
                              }}
                            >
                              <ArrowUpRight size={10} />
                              Hoàn tác / Hoàn tiền
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* TOP Badges */}
                    <div className="absolute top-2 left-2 flex gap-1 z-10 flex-wrap">
                      {post.isPremium && (
                        <div className="relative overflow-hidden text-[9px] px-2 py-0.5 rounded-full font-bold bg-black/60 border border-amber-500/35 text-amber-400 backdrop-blur-sm flex items-center gap-1 shadow-md">
                          {/* shimmer sweep on hover */}
                          <span
                            className="absolute inset-0 -translate-x-full group-hover:translate-x-full
                            transition-transform duration-700
                            bg-gradient-to-r from-transparent via-amber-300/20 to-transparent"
                          />
                          <GiCutDiamond
                            size={10}
                            className="text-amber-400 shrink-0"
                          />
                          <span>PREMIUM</span>
                        </div>
                      )}
                      {(post.postType === 'ai' || post.isAI) && (
                        <div
                          className="text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-0.5"
                          style={{
                            background: 'rgba(121,134,235,0.85)',
                            color: '#fff',
                          }}
                        >
                          <IoSparkles size={9} className="text-white" />
                          <span>AI</span>
                        </div>
                      )}
                      {post.isCollection &&
                        (post.generatedImages?.length || 0) > 1 && (
                          <div className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-500/85 text-indigo-100 backdrop-blur-sm flex items-center gap-0.5">
                            <IoImages size={10} className="text-indigo-150" />
                            <span>{post.generatedImages.length}</span>
                          </div>
                        )}

                      {/* Purchased badge */}
                      {isPurchasesTab && (
                        <div
                          className="text-[9px] px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5"
                          style={{
                            background: 'rgba(34,197,94,0.75)',
                            color: '#fff',
                          }}
                        >
                          <ShoppingBag size={8} />
                          <span>Đã mua</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Unfollow Confirm Dialog */}
      <ConfirmModal
        isOpen={showUnfollowConfirm}
        onClose={() => setShowUnfollowConfirm(false)}
        onConfirm={confirmUnfollow}
        title="Hủy theo dõi?"
        message={
          profile ? (
            <>
              Bạn có chắc chắn muốn hủy theo dõi{' '}
              <span className="text-white font-bold whitespace-nowrap">
                {profile.displayName || profile.username}
              </span>{' '}
              không?
            </>
          ) : (
            ''
          )
        }
        confirmText="Hủy theo dõi"
        cancelText="Bỏ qua"
        type="danger"
        zIndex={250}
      />

      {/* Edit Profile Dialog */}
      <EditProfileModal
        isOpen={showEditModal || showEdit}
        onClose={() => {
          setShowEditModal(false)
          if (showEdit) {
            const nextParams = new URLSearchParams(searchParams)
            nextParams.delete('edit')
            nextParams.delete('editsubtab')
            setSearchParams(nextParams)
          }
        }}
        defaultTab={editTab}
        profile={profile}
        onProfileUpdated={handleProfileUpdated}
      />

      {/* Followers / Following List Dialog */}
      <FollowListModal
        isOpen={showFollowModal}
        onClose={() => setShowFollowModal(false)}
        userId={profile._id}
        type={followModalType}
        username={profile.username}
      />

      {/* Order Report Modal */}
      <OrderReportModal
        isOpen={!!orderReportTarget}
        onClose={() => setOrderReportTarget(null)}
        post={orderReportTarget?.post}
        purchasedAt={orderReportTarget?.purchasedAt}
      />

      {/* Confirm Refund Modal */}
      <ConfirmModal
        isOpen={showRefundConfirm}
        onClose={() => {
          if (!refundLoading) {
            setShowRefundConfirm(false)
            setRefundTarget(null)
          }
        }}
        onConfirm={handleRefundConfirm}
        title="Xác nhận hoàn tác?"
        message={
          refundTarget ? (
            <>
              Bạn có chắc chắn muốn hoàn tác việc mua ảnh{' '}
              <span className="text-white font-bold break-words">
                "{refundTarget.caption || 'Chất lượng cao'}"
              </span>
              ?
              <br />
              <span className="block mt-3 text-white/50 text-[11px] leading-relaxed">
                Khoản xu đã thanh toán sẽ được hoàn lại, quyền truy cập tệp tin của bạn đối với ảnh này sẽ bị thu hồi.
              </span>
            </>
          ) : (
            ''
          )
        }
        confirmText={refundLoading ? 'Đang hoàn tác...' : 'Xác nhận hoàn tác'}
        cancelText="Hủy bỏ"
        type="danger"
        zIndex={250}
      />
    </div>
  )
}

export default ProfilePage
