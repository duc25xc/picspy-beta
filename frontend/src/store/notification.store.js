import { create } from 'zustand'
import { io } from 'socket.io-client'
import api from '../api/api'
import { toast } from 'sonner'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL

const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  isOpen: false,
  activeTab: 'all',
  socket: null,

  setOpen: (isOpen) => set({ isOpen }),
  setActiveTab: (activeTab) => set({ activeTab }),

  // Fetch notifications with pagination
  fetchNotifications: async (page = 1, limit = 20) => {
    set({ loading: true })
    try {
      const { data } = await api.get(`/notifications?page=${page}&limit=${limit}`)
      set({
        notifications: page === 1 ? data.notifications : [...get().notifications, ...data.notifications],
        unreadCount: data.unreadCount,
        loading: false,
      })
    } catch (err) {
      console.error('Failed to fetch notifications:', err)
      set({ loading: false })
    }
  },

  // Mark all notifications as read
  markAllAsRead: async () => {
    try {
      await api.post('/notifications/read-all')
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
        unreadCount: 0,
      }))
      // Sync auth user store if needed
      const authState = localStorage.getItem('picspy-auth')
      if (authState) {
        const parsed = JSON.parse(authState)
        if (parsed?.state?.user) {
          parsed.state.user.notificationCount = 0
          localStorage.setItem('picspy-auth', JSON.stringify(parsed))
        }
      }
    } catch (err) {
      console.error('Failed to mark notifications as read:', err)
    }
  },

  // Mark a single notification as read
  markAsRead: async (id) => {
    try {
      await api.post(`/notifications/${id}/read`)
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n._id === id ? { ...n, isRead: true } : n
        ),
        unreadCount: Math.max(state.unreadCount - 1, 0),
      }))
    } catch (err) {
      console.error('Failed to mark notification as read:', err)
    }
  },

  // Init Socket connection
  initSocket: (token) => {
    if (get().socket) return

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling']
    })

    socket.on('connect', () => {
      console.log('🔌 Client socket connected')
    })

    socket.on('notification', ({ notification, unreadCount, shouldToast }) => {
      // Add notification to state
      set((state) => ({
        notifications: [notification, ...state.notifications],
        unreadCount,
      }))

      // Sync local storage user model count to avoid stale badge on page reload
      const authState = localStorage.getItem('picspy-auth')
      if (authState) {
        const parsed = JSON.parse(authState)
        if (parsed?.state?.user) {
          parsed.state.user.notificationCount = unreadCount
          localStorage.setItem('picspy-auth', JSON.stringify(parsed))
        }
      }

      // Display Toast if whitelisted
      if (shouldToast) {
        const toastMsg = getToastMessage(notification)
        if (toastMsg) {
          toast(toastMsg, {
            description: notification.metadata?.message || 'Bạn có tương tác mới.',
            action: {
              label: 'Xem',
              onClick: () => {
                set({ isOpen: true }) // Open bell panel
              }
            }
          })
        }
      }
    })

    set({ socket })
  },

  // Disconnect Socket connection
  disconnectSocket: () => {
    const socket = get().socket
    if (socket) {
      socket.disconnect()
      set({ socket: null })
    }
  }
}))

// Helper to format the toast title/message based on notification details
function getToastMessage(notif) {
  const actorName = notif.actors?.[0]?.displayName || notif.actors?.[0]?.username || 'Ai đó'
  const postTitle = notif.metadata?.customTitle || 'ảnh của bạn'
  const actorCount = notif.actors?.length || 1

  const subject = actorCount > 1 
    ? `${actorName} và ${actorCount - 1} người khác`
    : actorName

  switch (notif.type) {
    case 'POST_LIKE':
      return `❤️ ${subject} đã thích ${postTitle}`
    case 'POST_COMMENT':
      return `💬 ${subject} đã bình luận: "${notif.metadata?.message || ''}"`
    case 'COMMENT_REPLY':
      return `💬 ${subject} đã trả lời bình luận của bạn`
    case 'POST_MENTION':
      return `🏷️ ${subject} đã nhắc đến bạn trong một bình luận`
    case 'USER_FOLLOW':
      return `👤 ${subject} đã theo dõi bạn`
    case 'SELL_SUCCESS':
      return `💰 Bạn vừa bán được ảnh ${postTitle}! (+${(notif.metadata?.amount || 0).toLocaleString('vi-VN')} VNĐ)`
    case 'BUY_IMAGE':
      return `🛍️ Giao dịch thành công: Đã mua ảnh ${postTitle}`
    case 'WITHDRAW_SUCCESS':
      return `💸 Lệnh rút tiền đã được duyệt thành công!`
    case 'WITHDRAW_REJECT':
      return `⚠️ Yêu cầu rút tiền bị từ chối: ${notif.metadata?.message || ''}`
    case 'TOPUP_SUCCESS':
      return `💳 Nạp tiền thành công! (+${(notif.metadata?.amount || 0).toLocaleString('vi-VN')} VNĐ)`
    case 'AI_COMPLETE':
      return `✨ Xử lý ảnh AI hoàn tất!`
    case 'AI_FAILED':
      return `❌ Xử lý ảnh AI thất bại: ${notif.metadata?.message || ''}`
    case 'SYSTEM_ALERT':
      return `📢 Thông báo hệ thống: ${notif.metadata?.message || ''}`
    case 'SYSTEM_WARNING':
      return `⚠️ Cảnh báo tài khoản: ${notif.metadata?.message || ''}`
    default:
      return null
  }
}

export default useNotificationStore
