import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Camera, Heart, Download, Users, Globe, MapPin, ExternalLink, UserPlus, UserCheck } from 'lucide-react'
import useAuthStore from '../store/auth.store'

// Demo data — Phase 2 thay bằng API call với TanStack Query
const DEMO_USER = {
  username: 'creator_demo',
  displayName: 'Demo Creator',
  bio: '🎨 AI Art enthusiast | Midjourney & Stable Diffusion | Chia sẻ wallpaper chất lượng cao mỗi ngày',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=picspy',
  isVerified: true,
  subscriptionTier: 'pro',
  stats: { postsCount: 48, totalLikes: 12400, totalDownloads: 8900, followersCount: 2340, followingCount: 180 },
  website: 'https://picspy.vn',
  socialLinks: { tiktok: 'creator_demo', instagram: 'creator_demo' },
}

const DEMO_POSTS = [
  { id: 1, img: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400', likes: 1240, isPremium: false },
  { id: 2, img: 'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=400', likes: 890, isPremium: true },
  { id: 3, img: 'https://images.unsplash.com/photo-1557682224-5b8590cd9ec5?w=400', likes: 2100, isPremium: false },
  { id: 4, img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400', likes: 745, isPremium: true },
  { id: 5, img: 'https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=400', likes: 1560, isPremium: false },
  { id: 6, img: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=400', likes: 3200, isPremium: false },
]

const StatItem = ({ label, value }) => (
  <div className="text-center">
    <p className="text-xl font-display font-bold">{typeof value === 'number' ? value.toLocaleString() : value}</p>
    <p className="text-xs text-white/40 mt-0.5">{label}</p>
  </div>
)

const ProfilePage = () => {
  const { username } = useParams()
  const { user: currentUser } = useAuthStore()
  const [isFollowing, setIsFollowing] = useState(false)
  const [activeTab, setActiveTab] = useState('posts')

  const isOwnProfile = currentUser?.username === username

  // Phase 2: thay bằng useQuery
  const profile = DEMO_USER

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      {/* ===== COVER / HEADER ===== */}
      <div className="relative">
        {/* Cover gradient */}
        <div className="h-36 md:h-52 bg-gradient-to-br from-brand-900 via-surface-50 to-surface relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-brand-700/40 via-transparent to-transparent" />
        </div>

        {/* Avatar */}
        <div className="page-container">
          <div className="relative -mt-14 md:-mt-20 mb-4 flex items-end justify-between">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative"
            >
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl overflow-hidden border-4 border-surface shadow-2xl">
                <img
                  src={profile.avatar}
                  alt={profile.displayName}
                  className="w-full h-full object-cover bg-surface-100"
                />
              </div>
              {profile.isVerified && (
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-brand-600 border-2 border-surface flex items-center justify-center">
                  <span className="text-xs">✓</span>
                </div>
              )}
            </motion.div>

            {/* Action buttons */}
            <div className="flex gap-2 mb-2">
              {isOwnProfile ? (
                <button className="btn-secondary text-sm">Chỉnh sửa hồ sơ</button>
              ) : (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsFollowing(!isFollowing)}
                  className={isFollowing ? 'btn-secondary text-sm' : 'btn-primary text-sm'}
                >
                  {isFollowing ? (
                    <><UserCheck size={16} /> Đang follow</>
                  ) : (
                    <><UserPlus size={16} /> Follow</>
                  )}
                </motion.button>
              )}
            </div>
          </div>

          {/* Info */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-display font-bold">{profile.displayName}</h1>
              {profile.subscriptionTier === 'pro' && (
                <span className="badge-brand text-xs">⚡ PRO</span>
              )}
            </div>
            <p className="text-white/50 text-sm mb-3">@{profile.username}</p>
            {profile.bio && (
              <p className="text-white/70 text-sm leading-relaxed mb-4 max-w-lg">{profile.bio}</p>
            )}

            {/* Links */}
            <div className="flex flex-wrap gap-4 text-sm text-white/40 mb-6">
              {profile.website && (
                <a href={profile.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-brand-400 transition-colors">
                  <Globe size={14} />
                  {profile.website.replace('https://', '')}
                </a>
              )}
            </div>

            {/* Stats */}
            <div className="flex gap-6 mb-8 overflow-x-auto no-scrollbar">
              <StatItem label="Ảnh" value={profile.stats.postsCount} />
              <StatItem label="Followers" value={profile.stats.followersCount} />
              <StatItem label="Following" value={profile.stats.followingCount} />
              <StatItem label="Lượt like" value={profile.stats.totalLikes} />
              <StatItem label="Downloads" value={profile.stats.totalDownloads} />
            </div>
          </motion.div>

          {/* Tabs */}
          <div className="flex gap-1 mb-6 border-b border-white/10">
            {[{ key: 'posts', label: '🖼 Ảnh' }, { key: 'bookmarks', label: '🔖 Bookmark' }].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`px-5 py-2.5 text-sm font-medium transition-all duration-200 border-b-2 -mb-px
                  ${activeTab === key ? 'border-brand-500 text-brand-400' : 'border-transparent text-white/40 hover:text-white/70'}`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Posts Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pb-8">
            {DEMO_POSTS.map((post, i) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.06 }}
                className="group relative overflow-hidden rounded-2xl bg-surface-50 cursor-pointer aspect-square"
              >
                <img src={post.img} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" />
                {post.isPremium && (
                  <div className="absolute top-2 right-2 badge-warning text-xs">💎 Premium</div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <div className="flex items-center gap-1.5 text-white font-medium">
                    <Heart size={16} className="text-red-400" />
                    {post.likes.toLocaleString()}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProfilePage
