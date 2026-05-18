/**
 * useModalUrl — Đồng bộ URL với modal quick-view (Instagram-style routing)
 *
 * Khi modal mở lần đầu → pushState('/posts/:id') → user có thể share/refresh URL
 * Khi prev/next      → replaceState (không thêm history entry thừa)
 * Khi modal đóng     → restore URL về trước
 * Khi user nhấn Back → modal tự động đóng (popstate handler)
 *
 * Không dùng React Router navigate() để tránh re-render toàn trang.
 */
import { useEffect, useRef, useCallback } from 'react'

/**
 * @param {string|null} postId  - ID của post đang mở trong modal (null = đóng)
 * @param {Function}    onClose - Callback để đóng modal từ bên ngoài (e.g. Back button)
 */
const useModalUrl = (postId, onClose) => {
  // URL gốc trước khi modal mở để restore khi đóng
  const prevUrlRef = useRef(null)
  // postId lần trước — phân biệt "mở mới" vs "prev/next"
  const prevPostIdRef = useRef(null)
  // Tránh double-handle
  const isClosingRef = useRef(false)
  // Đang trong modal hay không
  const isModalOpenRef = useRef(false)

  useEffect(() => {
    if (postId) {
      const targetUrl = `/posts/${postId}`
      const wasOpen = isModalOpenRef.current

      if (!wasOpen) {
        // ── Mở modal lần đầu → lưu URL cũ + pushState ──────────────
        if (!window.location.pathname.startsWith('/posts/')) {
          prevUrlRef.current = window.location.pathname + window.location.search
        }
        window.history.pushState({ modalPostId: postId }, '', targetUrl)
        isModalOpenRef.current = true
      } else if (prevPostIdRef.current !== postId) {
        // ── Prev/Next trong modal → chỉ replaceState (không tạo entry thừa) ──
        window.history.replaceState({ modalPostId: postId }, '', targetUrl)
      }

      prevPostIdRef.current = postId

      // ── Xử lý Back button: popstate → đóng modal ─────────────────
      const handlePopState = () => {
        if (!isClosingRef.current) {
          isClosingRef.current = true
          isModalOpenRef.current = false
          prevPostIdRef.current = null
          onClose?.()
          setTimeout(() => { isClosingRef.current = false }, 300)
        }
      }

      window.addEventListener('popstate', handlePopState)
      return () => window.removeEventListener('popstate', handlePopState)
    } else {
      // Modal đã đóng → reset refs
      isModalOpenRef.current = false
      prevPostIdRef.current = null
    }
  }, [postId, onClose])

  /**
   * Gọi khi user chủ động đóng modal (click X, backdrop, Escape).
   * Cần manually restore URL về trước (không tạo history entry mới).
   */
  const closeModal = useCallback(() => {
    if (isClosingRef.current) return
    isClosingRef.current = true
    isModalOpenRef.current = false
    prevPostIdRef.current = null

    // Restore URL gốc
    const restoreUrl = prevUrlRef.current || '/'
    window.history.replaceState(null, '', restoreUrl)

    onClose?.()
    setTimeout(() => { isClosingRef.current = false }, 300)
  }, [onClose])

  return { closeModal }
}

export default useModalUrl

