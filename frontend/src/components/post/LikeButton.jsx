import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart } from 'lucide-react'
import api from '../../api/api'
import useAuthStore from '../../store/auth.store'
import toast from 'react-hot-toast'

/**
 * LikeButton — Toggle like với optimistic update + animation tim
 * Props:
 *   postId: string
 *   initialLiked: bool
 *   initialCount: number
 *   size: 'sm' | 'md' | 'lg'
 */
const LikeButton = ({
  postId,
  initialLiked = false,
  initialCount = 0,
  size = 'md',
  showCount = true,
  className = '',
  onToggle,
}) => {
  const isLoggedIn = useAuthStore((s) => !!s.user && !!s.accessToken)
  const [liked, setLiked] = useState(initialLiked)
  const [count, setCount] = useState(initialCount)
  const [loading, setLoading] = useState(false)
  const [burst, setBurst] = useState(false)

  const iconSize = size === 'sm' ? 14 : size === 'lg' ? 22 : 18

  const handleToggle = async (e) => {
    e.stopPropagation()

    if (!isLoggedIn) {
      toast('Đăng nhập để thích ảnh này 💜', { icon: '🔒' })
      return
    }
    if (loading) return

    // Optimistic update
    const wasLiked = liked
    setLiked(!wasLiked)
    setCount((c) => (wasLiked ? Math.max(0, c - 1) : c + 1))
    if (!wasLiked) setBurst(true)

    setLoading(true)
    try {
      const { data } = await api.post(`/posts/${postId}/like`)
      // Sync với server response
      setLiked(data.liked)
      setCount(data.likesCount)
      onToggle?.(data.liked, data.likesCount)
    } catch {
      // Revert nếu lỗi
      setLiked(wasLiked)
      setCount((c) => (wasLiked ? c + 1 : Math.max(0, c - 1)))
      toast.error('Không thể thực hiện')
    } finally {
      setLoading(false)
      setTimeout(() => setBurst(false), 600)
    }
  }

  return (
    <motion.button
      onClick={handleToggle}
      whileTap={{ scale: 0.85 }}
      className={`relative flex items-center gap-1.5 transition-colors group ${className}`}
      aria-label={liked ? 'Bỏ thích' : 'Thích'}
    >
      <div className="relative">
        <motion.div
          animate={liked ? { scale: [1, 1.5, 0.85, 1.15, 1] } : { scale: 1 }}
          transition={{ duration: 0.45, ease: [0.175, 0.885, 0.32, 1.275] }}
        >
          <Heart
            size={iconSize}
            className={`transition-colors duration-200 ${
              liked
                ? 'fill-red-500 text-red-500'
                : 'text-white/50 group-hover:text-red-400'
            }`}
          />
        </motion.div>

        {/* Burst particles khi like */}
        <AnimatePresence>
          {burst && (
            <>
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
                  animate={{
                    opacity: 0,
                    scale: 1,
                    x: Math.cos((i / 6) * Math.PI * 2) * 16,
                    y: Math.sin((i / 6) * Math.PI * 2) * 16,
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className="absolute inset-0 w-1.5 h-1.5 rounded-full bg-red-400 pointer-events-none"
                  style={{ top: '50%', left: '50%', marginTop: -3, marginLeft: -3 }}
                />
              ))}
            </>
          )}
        </AnimatePresence>
      </div>

      {showCount && (
        <span
          className={`text-xs font-semibold transition-colors ${
            liked ? 'text-red-400' : 'text-white/50 group-hover:text-white/80'
          }`}
        >
          {count > 0 ? count.toLocaleString() : ''}
        </span>
      )}
    </motion.button>
  )
}

export default LikeButton
