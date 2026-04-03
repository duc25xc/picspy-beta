import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import PostDetailModal from '../components/post/PostDetailModal'

/**
 * PostDeepLinkPage — Xử lý URL deeplink /posts/:id
 * Mở modal PostDetail rồi redirect về / khi đóng
 * Không phá vỡ navigation history
 */
const PostDeepLinkPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [open, setOpen] = useState(true)

  const handleClose = () => {
    setOpen(false)
    // Sau animation close → về trang home
    setTimeout(() => navigate('/'), 200)
  }

  return (
    <AnimatePresence>
      {open && (
        <PostDetailModal
          key={id}
          postId={id}
          onClose={handleClose}
          hasPrev={false}
          hasNext={false}
        />
      )}
    </AnimatePresence>
  )
}

export default PostDeepLinkPage
