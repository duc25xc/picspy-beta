import { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Heart, Download, Globe, UserPlus, UserCheck,
  Zap, Crown, Star, Settings, ChevronRight,
  ImageOff, Loader2, Camera,
} from 'lucide-react'
import useAuthStore from '../store/auth.store'
import api from '../api/api'

// ─── Tier config (đồng bộ với useTierAccess + AdminPage) ────────
const TIER_META = {
  free:     { label: 'Miễn phí', color: '#9ca3af', bg: 'rgba(156,163,175,0.12)', border: 'rgba(156,163,175,0.2)', icon: null,    badge: null },
  founder:  { label: "Founder's", color: '#d97706', bg: 'rgba(217,119,6,0.12)',  border: 'rgba(217,119,6,0.3)',   icon: Star,     badge: '⭐ Founder' },
  pro:      { label: 'Pro',        color: '#7986eb', bg: 'rgba(121,134,235,0.12)', border: 'rgba(121,134,235,0.3)', icon: Zap,      badge: '⚡ Pro' },
  ultimate: { label: 'Ultimate',   color: '#06b6d4', bg: 'rgba(6,182,212,0.12)',   border: 'rgba(6,182,212,0.3)',  icon: Crown,    badge: '👑 Ultimate' },
}

// ─── Skeleton ────────────────────────────────────────────────────
const SkeletonCard = () => (
  <div className="aspect-square rounded-2xl bg-white/5 animate-pulse" />
)

const ProfileSkeleton = () => (
  <div className="min-h-screen pb-24 md:pb-8">
    <div className="h-36 md:h-52 bg-white/5 animate-pulse" />
    <div className="page-container -mt-14">
      <div className="w-24 h-24 rounded-3xl bg-white/10 animate-pulse mb-4" />
      <div className="h-6 w-40 bg-white/10 rounded-xl animate-pulse mb-2" />
      <div className="h-4 w-24 bg-white/5 rounded-xl animate-pulse mb-6" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    </div>
  </div>
)

// ─── Stat Item ───────────────────────────────────────────────────
const StatItem = ({ label, value }) => (
  <div className="text-center px-2">
    <p className="text-xl font-display font-bold">
      {typeof value === 'number' ? value.toLocaleString('vi-VN') : (value ?? '—')}
    </p>
    <p className="text-xs text-white/40 mt-0.5">{label}</p>
  </div>
)

// ─── Tier Badge ──────────────────────────────────────────────────
const TierBadge = ({ tier }) => {
  const meta = TIER_META[tier] ?? TIER_META.free
  if (!meta.badge) return null   // Free tier: không hiện badge
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border"
      style={{ background: meta.bg, color: meta.color, borderColor: meta.border }}
    >
      {meta.badge}
    </span>
  )
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
  const [activeTab, setActiveTab] = useState('posts')

  const isOwnProfile = currentUser?.username === username

  // ── Fetch profile ──────────────────────────────────────────────
  useEffect(() => {
    setLoadingProfile(true)
    setError(null)
    api.get(`/users/${username}`)
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

  // ── Fetch user posts ───────────────────────────────────────────
  useEffect(() => {
    if (!profile?._id) return
    setLoadingPosts(true)
    api.get('/posts', {
      params: { authorId: profile._id, status: 'approved', limit: 24 }
    })
      .then(({ data }) => setPosts(data.posts ?? []))
      .catch(() => setPosts([]))
      .finally(() => setLoadingPosts(false))
  }, [profile?._id])

  // ── Follow / Unfollow ─────────────────────────────────────────
  const handleFollow = useCallback(async () => {
    if (!currentUser) { navigate('/login'); return }
    setFollowLoading(true)
    try {
      const { data } = await api.post(`/users/${profile._id}/follow`)
      setIsFollowing(data.following)
      setProfile(prev => ({
        ...prev,
        stats: {
          ...prev.stats,
          followersCount: prev.stats.followersCount + (data.following ? 1 : -1),
        },
      }))
    } catch { /* ignore */ }
    finally { setFollowLoading(false) }
  }, [currentUser, navigate, profile?._id])

  // ── Error / Loading states ─────────────────────────────────────
  if (loadingProfile) return <ProfileSkeleton />

  if (error === 'not_found') return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6">
      <ImageOff size={48} className="text-white/20" />
      <h1 className="text-2xl font-bold">Không tìm thấy người dùng</h1>
      <p className="text-white/40 text-sm">@{username} không tồn tại hoặc đã bị khóa.</p>
      <Link to="/" className="btn-primary text-sm">Về trang chủ</Link>
    </div>
  )

  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6">
      <p className="text-white/40">Đã có lỗi xảy ra. Vui lòng thử lại.</p>
      <button onClick={() => window.location.reload()} className="btn-secondary text-sm">Thử lại</button>
    </div>
  )

  const tier = profile.subscriptionTier ?? 'free'
  const tierMeta = TIER_META[tier] ?? TIER_META.free

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      {/* ══════════ COVER ══════════ */}
      <div className="h-36 md:h-52 relative overflow-hidden"
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
      <div className="page-container">
        <div className="relative -mt-14 md:-mt-20 mb-4 flex items-end justify-between">
          {/* Avatar */}
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative">
            <div
              className="w-24 h-24 md:w-32 md:h-32 rounded-3xl overflow-hidden border-4 border-surface shadow-2xl"
              style={{ borderColor: tier !== 'free' ? tierMeta.color + '66' : undefined }}
            >
              {profile.avatar
                ? <img src={profile.avatar} alt={profile.displayName} className="w-full h-full object-cover bg-surface-100" />
                : (
                  <div className="w-full h-full flex items-center justify-center text-3xl font-bold"
                    style={{ background: `linear-gradient(135deg, ${tierMeta.color}33, ${tierMeta.color}11)` }}>
                    {profile.username?.[0]?.toUpperCase()}
                  </div>
                )
              }
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
                <Link to="/settings" className="btn-secondary text-sm flex items-center gap-1.5">
                  <Settings size={14} /> Chỉnh sửa
                </Link>
                {/* Nút nâng cấp nếu free */}
                {tier === 'free' && (
                  <Link to="/pricing#pro" className="btn-primary text-sm flex items-center gap-1.5">
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
                {followLoading
                  ? <Loader2 size={14} className="animate-spin" />
                  : isFollowing
                    ? <><UserCheck size={14} /> Đang follow</>
                    : <><UserPlus size={14} /> Follow</>
                }
              </motion.button>
            )}
          </div>
        </div>

        {/* ══════════ INFO ══════════ */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h1 className="text-xl font-display font-bold">{profile.displayName || profile.username}</h1>
            <TierBadge tier={tier} />
          </div>
          <p className="text-white/40 text-sm mb-3">@{profile.username}</p>

          {profile.bio && (
            <p className="text-white/70 text-sm leading-relaxed mb-4 max-w-lg">{profile.bio}</p>
          )}

          {/* Links */}
          <div className="flex flex-wrap gap-4 text-sm text-white/40 mb-6">
            {profile.website && (
              <a href={profile.website} target="_blank" rel="noreferrer"
                className="flex items-center gap-1 hover:text-brand-400 transition-colors">
                <Globe size={14} />
                {profile.website.replace(/^https?:\/\//, '')}
              </a>
            )}
          </div>

          {/* Upgrade banner — chỉ hiện cho own profile free */}
          {isOwnProfile && tier === 'free' && (
            <motion.div
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 rounded-2xl flex items-center justify-between gap-3"
              style={{
                background: 'linear-gradient(135deg, rgba(121,134,235,0.1) 0%, rgba(6,182,212,0.08) 100%)',
                border: '1px solid rgba(121,134,235,0.2)',
              }}
            >
              <div>
                <p className="text-sm font-bold text-white/80">Nâng cấp lên Pro để mở khoá toàn bộ tính năng</p>
                <p className="text-xs text-white/40 mt-0.5">Copy prompt 1-click · Không watermark · Negative prompts · và nhiều hơn</p>
              </div>
              <Link to="/pricing#pro"
                className="flex items-center gap-1 shrink-0 text-xs font-bold px-3 py-2 rounded-xl transition-all"
                style={{ background: 'rgba(121,134,235,0.2)', color: '#7986eb', border: '1px solid rgba(121,134,235,0.3)' }}
              >
                Xem gói <ChevronRight size={13} />
              </Link>
            </motion.div>
          )}

          {/* Stats */}
          <div className="flex gap-2 mb-8 overflow-x-auto no-scrollbar border-b border-white/5 pb-6">
            <StatItem label="Ảnh" value={profile.stats?.postsCount} />
            <div className="w-px bg-white/10 mx-1" />
            <StatItem label="Followers" value={profile.stats?.followersCount} />
            <StatItem label="Following" value={profile.stats?.followingCount} />
            <div className="w-px bg-white/10 mx-1" />
            <StatItem label="Lượt thích" value={profile.stats?.totalLikes} />
            <StatItem label="Downloads" value={profile.stats?.totalDownloads} />
          </div>
        </motion.div>

        {/* ══════════ TABS ══════════ */}
        <div className="flex gap-1 mb-6 border-b border-white/10">
          {[
            { key: 'posts', label: '🖼 Ảnh' },
            ...(isOwnProfile ? [{ key: 'bookmarks', label: '🔖 Bookmark' }] : []),
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-5 py-2.5 text-sm font-medium transition-all duration-200 border-b-2 -mb-px
                ${activeTab === key
                  ? 'border-brand-500 text-brand-400'
                  : 'border-transparent text-white/40 hover:text-white/70'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ══════════ POSTS GRID ══════════ */}
        <AnimatePresence mode="wait">
          {loadingPosts ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Camera size={40} className="text-white/10" />
              <p className="text-white/30 text-sm">
                {isOwnProfile ? 'Bạn chưa đăng ảnh nào.' : 'Người dùng chưa đăng ảnh nào.'}
              </p>
              {isOwnProfile && (
                <Link to="/upload" className="btn-primary text-sm mt-2">+ Đăng ảnh đầu tiên</Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pb-8">
              {posts.map((post, i) => (
                <motion.div
                  key={post._id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.04, duration: 0.3 }}
                  className="group relative overflow-hidden rounded-2xl bg-surface-50 cursor-pointer aspect-square"
                  onClick={() => navigate(`/posts/${post._id}`)}
                >
                  <img
                    src={post.images?.[0]?.url ?? post.thumbnail}
                    alt={post.caption}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    loading="lazy"
                  />

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-4">
                    <div className="flex items-center gap-1.5 text-white font-medium text-sm">
                      <Heart size={15} className="text-red-400" />
                      {(post.stats?.likesCount ?? 0).toLocaleString('vi-VN')}
                    </div>
                    <div className="flex items-center gap-1.5 text-white font-medium text-sm">
                      <Download size={15} className="text-blue-400" />
                      {(post.stats?.downloadsCount ?? 0).toLocaleString('vi-VN')}
                    </div>
                  </div>

                  {/* AI badge */}
                  {post.isAI && (
                    <div className="absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-full font-bold"
                      style={{ background: 'rgba(121,134,235,0.85)', color: '#fff' }}>
                      ✦ AI
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default ProfilePage
