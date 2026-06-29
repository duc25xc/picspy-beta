import { useState } from 'react'
import { motion } from 'framer-motion'
import { Bookmark } from 'lucide-react'
import api from '../../api/api'
import useAuthStore from '../../store/auth.store'
import toast from 'react-hot-toast'

/**
 * BookmarkButton — Toggle bookmark với optimistic update
 */
const BookmarkButton = ({
  postId,
  initialBookmarked = false,
  size = 'md',
  showCount = false,
  initialCount = 0,
  className = '',
  onToggle,
}) => {
  const isLoggedIn = useAuthStore((s) => !!s.user && !!s.accessToken)
  const [bookmarked, setBookmarked] = useState(initialBookmarked)
  const [count, setCount] = useState(initialCount)
  const [loading, setLoading] = useState(false)

  const iconSize = size === 'sm' ? 14 : size === 'lg' ? 22 : 18

  const handleToggle = async (e) => {
    e.stopPropagation()

    if (!isLoggedIn) {
      toast('Đăng nhập để lưu ảnh 💜', { icon: '🔒' })
      return
    }
    if (loading) return

    const wasBookmarked = bookmarked
    setBookmarked(!wasBookmarked)
    setCount((c) => (wasBookmarked ? Math.max(0, c - 1) : c + 1))

    setLoading(true)
    try {
      const { data } = await api.post(`/posts/${postId}/bookmark`)
      setBookmarked(data.bookmarked)
      onToggle?.(data.bookmarked)

      toast(
        data.bookmarked ? 'Đã lưu vào bộ sưu tập' : 'Đã bỏ lưu',
        { icon: data.bookmarked ? '🔖' : '✓', duration: 1500 }
      )
    } catch {
      // Revert
      setBookmarked(wasBookmarked)
      setCount((c) => (wasBookmarked ? c + 1 : Math.max(0, c - 1)))
      toast.error('Không thể thực hiện')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.button
      onClick={handleToggle}
      whileTap={{ scale: 0.85 }}
      className={`flex items-center gap-1.5 transition-colors group ${className}`}
      aria-label={bookmarked ? 'Bỏ lưu' : 'Lưu ảnh'}
    >
      <motion.div
        animate={{ scale: bookmarked ? [1, 1.25, 1] : 1 }}
        transition={{ duration: 0.25 }}
      >
        <Bookmark
          size={iconSize}
          className={`transition-all duration-200 ${
            bookmarked
              ? 'fill-brand-500 text-brand-500'
              : 'text-white/50 group-hover:text-brand-400'
          }`}
        />
      </motion.div>

      {showCount && count > 0 && (
        <span
          className={`text-xs font-semibold transition-colors ${
            bookmarked ? 'text-brand-400' : 'text-white/50'
          }`}
        >
          {count.toLocaleString()}
        </span>
      )}
    </motion.button>
  )
}

export default BookmarkButton
