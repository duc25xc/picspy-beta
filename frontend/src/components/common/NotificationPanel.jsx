import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion' // eslint-disable-line no-unused-vars
import {
  Bell,
  X,
  Heart,
  MessageSquare,
  UserPlus,
  Coins,
  ShieldAlert,
  ArrowUpRight,
  TrendingUp,
  Cpu,
  Bookmark,
  CheckCircle,
  XCircle,
  Zap,
  Eye,
} from 'lucide-react'
import useNotificationStore from '../../store/notification.store'
import useAuthStore from '../../store/auth.store'
import { getOptimizedWebpUrl } from '../../utils/imageUrl'

// Mapping tabs to types
const TAB_FILTER = {
  all: null,
  social: [
    'POST_LIKE',
    'POST_COMMENT',
    'COMMENT_REPLY',
    'USER_FOLLOW',
    'POST_MENTION',
  ],
  income: [
    'BUY_IMAGE',
    'SELL_SUCCESS',
    'WITHDRAW_SUCCESS',
    'WITHDRAW_REJECT',
    'TOPUP_SUCCESS',
  ],
  system: [
    'VIEW_MILESTONE',
    'WEEKLY_TOP',
    'SYSTEM_ALERT',
    'SYSTEM_WARNING',
    'AI_COMPLETE',
    'AI_FAILED',
    'ADMIN_NEW_POST',
    'ADMIN_NEW_USER',
    'ADMIN_NEW_WITHDRAW',
    'ADMIN_NEW_REPORT',
    'ADMIN_STATS_SUMMARY',
    'ADMIN_CATEGORY_REQUEST',
    'POST_APPROVED',
    'SUBSCRIPTION_REQUEST',
    'SUBSCRIPTION_APPROVED',
    'SUBSCRIPTION_REJECTED',
  ],
}

const NotificationPanel = () => {
  const navigate = useNavigate()
  const panelRef = useRef(null)

  const { user } = useAuthStore()
  const {
    isOpen,
    setOpen,
    notifications,
    fetchNotifications,
    markAllAsRead,
    markAsRead,
    activeTab,
    setActiveTab,
    loading,
  } = useNotificationStore()

  // Fetch notifications when opened
  useEffect(() => {
    if (isOpen && user) {
      fetchNotifications(1, 40)
    }
  }, [isOpen, user]) // eslint-disable-line react-hooks/exhaustive-deps

  // Mark all as read when opening or closing to clear the badge count
  const handleClose = () => {
    setOpen(false)
    if (notifications.some((n) => !n.isRead)) {
      markAllAsRead()
    }
  }

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (isOpen && panelRef.current && !panelRef.current.contains(e.target)) {
        // Check if user clicked on Bell button to prevent duplicate toggling
        if (e.target.closest('.notification-bell-trigger')) return
        handleClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, notifications]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null

  // Filter notifications based on active tab
  const allowedTypes = TAB_FILTER[activeTab]
  const filteredNotifications = allowedTypes
    ? notifications.filter((n) => allowedTypes.includes(n.type))
    : notifications

  // Group notifications by timeline
  const groupNotifications = (list) => {
    const today = []
    const yesterday = []
    const last7Days = []
    const older = []

    const now = new Date()
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    ).getTime()
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000
    const startOf7DaysAgo = startOfToday - 7 * 24 * 60 * 60 * 1000

    list.forEach((notif) => {
      const time = new Date(notif.updatedAt || notif.createdAt).getTime()
      if (time >= startOfToday) {
        today.push(notif)
      } else if (time >= startOfYesterday) {
        yesterday.push(notif)
      } else if (time >= startOf7DaysAgo) {
        last7Days.push(notif)
      } else {
        older.push(notif)
      }
    })

    return { today, yesterday, last7Days, older }
  }

  const { today, yesterday, last7Days, older } = groupNotifications(
    filteredNotifications
  )

  // Handle notification click and redirection
  const handleNotifClick = async (notif) => {
    if (!notif.isRead) {
      markAsRead(notif._id)
    }

    setOpen(false) // Close panel

    // Handle deep links/redirection
    const postId =
      notif.metadata?.postId?._id ||
      notif.metadata?.postId ||
      notif.target?._id ||
      notif.target
    const commentId =
      notif.metadata?.commentId?._id || notif.metadata?.commentId

    switch (notif.type) {
      case 'POST_LIKE':
      case 'POST_COMMENT':
      case 'POST_MENTION':
      case 'POST_APPROVED':
        if (postId) navigate(`/posts/${postId}`)
        break
      case 'COMMENT_REPLY':
        if (postId) {
          navigate(`/posts/${postId}?commentId=${commentId || ''}`)
        }
        break
      case 'USER_FOLLOW': {
        const username = notif.actors?.[0]?.username
        if (username) navigate(`/profile/${username}`)
        break
      }
      case 'BUY_IMAGE':
        if (postId) navigate(`/posts/${postId}`)
        break
      case 'SELL_SUCCESS':
        navigate('/studio') // Go to studio income
        break
      case 'WITHDRAW_SUCCESS':
      case 'WITHDRAW_REJECT':
      case 'TOPUP_SUCCESS':
        navigate('/studio') // Go to Studio Wallet panel
        break
      case 'AI_COMPLETE':
        if (postId) navigate(`/posts/${postId}`)
        break
      case 'AI_FAILED':
        navigate('/my-posts')
        break
      case 'VIEW_MILESTONE':
      case 'WEEKLY_TOP':
        if (postId) navigate(`/posts/${postId}`)
        break
      case 'ADMIN_NEW_POST':
        navigate('/admin?tab=posts')
        break
      case 'ADMIN_NEW_USER':
        navigate('/admin?tab=users')
        break
      case 'ADMIN_NEW_WITHDRAW':
        navigate('/admin?tab=withdrawals')
        break
      case 'ADMIN_NEW_REPORT':
        navigate('/admin?tab=reports')
        break
      case 'ADMIN_STATS_SUMMARY':
        navigate('/admin?tab=dashboard')
        break
      case 'ADMIN_CATEGORY_REQUEST':
        navigate('/admin?tab=categories')
        break
      case 'SUBSCRIPTION_REQUEST':
        navigate('/admin?tab=users')
        break
      case 'SUBSCRIPTION_APPROVED':
      case 'SUBSCRIPTION_REJECTED':
        navigate('/pricing')
        break
      default:
        if (notif.metadata?.url) {
          navigate(notif.metadata.url)
        }
        break
    }
  }

  // Render icons dynamically
  const renderNotifIcon = (type) => {
    switch (type) {
      case 'POST_LIKE':
        return (
          <div className="w-7 h-7 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 flex-shrink-0">
            <Heart size={14} className="fill-red-500" />
          </div>
        )
      case 'POST_COMMENT':
      case 'COMMENT_REPLY':
        return (
          <div className="w-7 h-7 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500 flex-shrink-0">
            <MessageSquare size={14} />
          </div>
        )
      case 'POST_MENTION':
        return (
          <div className="w-7 h-7 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 flex-shrink-0">
            <Bookmark size={14} />
          </div>
        )
      case 'USER_FOLLOW':
        return (
          <div className="w-7 h-7 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400 flex-shrink-0">
            <UserPlus size={14} />
          </div>
        )
      case 'SELL_SUCCESS':
      case 'BUY_IMAGE':
      case 'TOPUP_SUCCESS':
      case 'WITHDRAW_SUCCESS':
        return (
          <div className="w-7 h-7 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 flex-shrink-0">
            <Coins size={14} />
          </div>
        )
      case 'WITHDRAW_REJECT':
      case 'SYSTEM_WARNING':
        return (
          <div className="w-7 h-7 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 flex-shrink-0">
            <ShieldAlert size={14} />
          </div>
        )
      case 'VIEW_MILESTONE':
        return (
          <div className="w-7 h-7 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400 flex-shrink-0">
            <Eye size={14} />
          </div>
        )
      case 'WEEKLY_TOP':
        return (
          <div className="w-7 h-7 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-400 flex-shrink-0">
            <TrendingUp size={14} />
          </div>
        )
      case 'AI_COMPLETE':
        return (
          <div className="w-7 h-7 rounded-full bg-violet-500/10 flex items-center justify-center text-violet-400 flex-shrink-0">
            <Cpu size={14} />
          </div>
        )
      case 'AI_FAILED':
        return (
          <div className="w-7 h-7 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 flex-shrink-0">
            <X size={14} />
          </div>
        )
      case 'ADMIN_NEW_POST':
        return (
          <div className="w-7 h-7 rounded-full bg-violet-500/10 flex items-center justify-center text-violet-400 flex-shrink-0">
            <Bookmark size={14} />
          </div>
        )
      case 'ADMIN_NEW_USER':
        return (
          <div className="w-7 h-7 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 flex-shrink-0">
            <UserPlus size={14} />
          </div>
        )
      case 'ADMIN_NEW_WITHDRAW':
        return (
          <div className="w-7 h-7 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400 flex-shrink-0">
            <Coins size={14} />
          </div>
        )
      case 'ADMIN_NEW_REPORT':
        return (
          <div className="w-7 h-7 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 flex-shrink-0">
            <ShieldAlert size={14} />
          </div>
        )
      case 'ADMIN_STATS_SUMMARY':
        return (
          <div className="w-7 h-7 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 flex-shrink-0">
            <TrendingUp size={14} />
          </div>
        )
      case 'SUBSCRIPTION_REQUEST':
        return (
          <div className="w-7 h-7 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400 flex-shrink-0">
            <Zap size={14} />
          </div>
        )
      case 'SUBSCRIPTION_APPROVED':
        return (
          <div className="w-7 h-7 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 flex-shrink-0">
            <CheckCircle size={14} />
          </div>
        )
      case 'SUBSCRIPTION_REJECTED':
        return (
          <div className="w-7 h-7 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 flex-shrink-0">
            <XCircle size={14} />
          </div>
        )
      default:
        return (
          <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white flex-shrink-0">
            <Bell size={14} />
          </div>
        )
    }
  }

  // Render text descriptions dynamically
  const renderNotifText = (notif) => {
    const actorName =
      notif.actors?.[0]?.displayName ||
      notif.actors?.[0]?.username ||
      'Người dùng ẩn danh'
    const actorCount = notif.actors?.length || 0

    const subject =
      actorCount > 1 ? (
        <span className="font-bold text-white">
          {actorName} và {actorCount - 1} người khác
        </span>
      ) : (
        <span className="font-bold text-white">{actorName}</span>
      )

    switch (notif.type) {
      case 'POST_LIKE':
        return <span>{subject} đã thích ảnh của bạn</span>
      case 'POST_COMMENT':
        return (
          <span>
            {subject} đã bình luận:{' '}
            <span className="text-white/70">
              "{notif.metadata?.message || ''}"
            </span>
          </span>
        )
      case 'COMMENT_REPLY':
        return <span>{subject} đã trả lời bình luận của bạn</span>
      case 'POST_MENTION':
        return <span>{subject} đã nhắc đến bạn trong một bình luận</span>
      case 'USER_FOLLOW':
        return <span>{subject} đã theo dõi bạn</span>
      case 'SELL_SUCCESS':
        return (
          <span>
            💰 Bạn vừa bán được ảnh! Nhận được{' '}
            <span className="text-emerald-400 font-bold">
              {(notif.metadata?.amount || 0).toLocaleString('vi-VN')}đ
            </span>
          </span>
        )
      case 'BUY_IMAGE':
        return (
          <span>
            🛍️ Giao dịch mua ảnh thành công! Đã trừ{' '}
            <span className="text-white/95 font-bold">
              {(notif.metadata?.amount || 0).toLocaleString('vi-VN')}đ
            </span>
          </span>
        )
      case 'WITHDRAW_SUCCESS':
        return (
          <span>
            💸 Lệnh rút tiền{' '}
            <span className="text-emerald-400 font-bold">
              {(notif.metadata?.amount || 0).toLocaleString('vi-VN')}đ
            </span>{' '}
            đã được duyệt thành công!
          </span>
        )
      case 'WITHDRAW_REJECT':
        return (
          <span>
            ⚠️ Lệnh rút tiền bị từ chối. Lý do:{' '}
            <span className="text-rose-400 font-medium">
              "{notif.metadata?.message || ''}"
            </span>
          </span>
        )
      case 'TOPUP_SUCCESS':
        return (
          <span>
            💳 Nạp tiền vào ví thành công! (+
            <span className="text-emerald-400 font-bold">
              {(notif.metadata?.amount || 0).toLocaleString('vi-VN')}đ
            </span>
            )
          </span>
        )
      case 'VIEW_MILESTONE':
        return (
          <span>
            🔥 Ảnh của bạn đã đạt mốc{' '}
            <span className="text-amber-400 font-bold">
              {(notif.metadata?.viewsCount || 0).toLocaleString()}
            </span>{' '}
            lượt xem!
          </span>
        )
      case 'WEEKLY_TOP':
        return (
          <span>
            🏆 Tuyệt vời! Bạn đã đạt{' '}
            <span className="text-yellow-400 font-bold">Top 1 Creator</span> của
            tuần này!
          </span>
        )
      case 'AI_COMPLETE':
        return (
          <span>
            ✨ Xử lý ảnh AI thành công:{' '}
            <span className="text-white/80">
              {notif.metadata?.message || ''}
            </span>
          </span>
        )
      case 'AI_FAILED':
        return (
          <span>
            ❌ Xử lý ảnh AI thất bại:{' '}
            <span className="text-rose-400">
              {notif.metadata?.message || ''}
            </span>
          </span>
        )
      case 'SYSTEM_ALERT':
        return <span>📢 {notif.metadata?.message || ''}</span>
      case 'SYSTEM_WARNING':
        return <span>⚠️ Cảnh báo: {notif.metadata?.message || ''}</span>
      case 'ADMIN_NEW_POST':
        return (
          <span>
            {notif.metadata?.message || '🖼️ Có bài đăng mới chờ duyệt.'}
          </span>
        )
      case 'ADMIN_NEW_USER':
        return (
          <span>
            {notif.metadata?.message || '👤 Người dùng mới vừa đăng ký.'}
          </span>
        )
      case 'ADMIN_NEW_WITHDRAW':
        return (
          <span>{notif.metadata?.message || '💸 Yêu cầu rút tiền mới.'}</span>
        )
      case 'ADMIN_NEW_REPORT':
        return (
          <span>{notif.metadata?.message || '🚨 Báo cáo vi phạm mới.'}</span>
        )
      case 'ADMIN_STATS_SUMMARY':
        return (
          <span>
            {notif.metadata?.message || '📊 Thống kê báo cáo hàng ngày.'}
          </span>
        )
      case 'ADMIN_CATEGORY_REQUEST':
        return (
          <span>
            {notif.metadata?.message || '🏷️ Yêu cầu danh mục tùy chỉnh mới từ Creator.'}
          </span>
        )
      case 'POST_APPROVED':
        return (
          <span>
            {notif.metadata?.message || '🎉 Bài viết của bạn đã được Admin phê duyệt và xuất bản!'}
          </span>
        )
      case 'SUBSCRIPTION_REQUEST':
        return (
          <span>⚡ {notif.metadata?.message || 'Có yêu cầu nạp gói mới chờ Admin duyệt.'}</span>
        )
      case 'SUBSCRIPTION_APPROVED':
        return (
          <span>🎉 {notif.metadata?.message || 'Gói của bạn đã được Admin kích hoạt thành công!'}</span>
        )
      case 'SUBSCRIPTION_REJECTED':
        return (
          <span>❌ {notif.metadata?.message || 'Đơn nạp gói của bạn không được duyệt.'}</span>
        )
      default:
        return (
          <span>
            {notif.metadata?.message || 'Bạn có thông báo mới'}
          </span>
        )
    }
  }

  // Render individual notification card
  const renderNotifItem = (notif) => {
    const postImg =
      notif.metadata?.postId?.generatedImages?.[0] ||
      notif.metadata?.postId?.images?.[0]
    const thumbUrl = postImg
      ? getOptimizedWebpUrl(postImg.thumbnailUrl || postImg.url, 100)
      : null

    return (
      <div
        key={notif._id}
        onClick={() => handleNotifClick(notif)}
        className={`group/item flex gap-3 p-3.5 rounded-2xl border transition-all duration-300 cursor-pointer ${
          notif.isRead
            ? 'bg-transparent border-transparent hover:bg-white/[0.02]'
            : 'bg-brand-500/[0.04] border-brand-500/10 hover:bg-brand-500/[0.07] hover:border-brand-500/20'
        }`}
      >
        {/* Left: Type Icon or User Avatar */}
        <div className="relative flex-shrink-0 w-8 h-8 self-start flex items-center justify-center">
          {notif.actors && notif.actors.length > 0 ? (
            <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10 flex-shrink-0">
              <img
                src={notif.actors[0].avatar || '/default-avatar.png'}
                alt=""
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(notif.actors[0].username)}&background=8b5cf6&color=fff`
                }}
              />
            </div>
          ) : (
            renderNotifIcon(notif.type)
          )}
          {/* Badge Icon overlay on avatar */}
          {notif.actors && notif.actors.length > 0 && (
            <div className="absolute -bottom-2 -right-2 z-10 scale-90">
              {renderNotifIcon(notif.type)}
            </div>
          )}
        </div>

        {/* Center: Message and Time */}
        <div className="flex-1 min-w-0">
          <div className="text-xs text-white/55 leading-relaxed">
            {renderNotifText(notif)}
          </div>
          <span className="text-[10px] text-white/30 font-medium block mt-1">
            {new Date(notif.updatedAt || notif.createdAt).toLocaleTimeString(
              'vi-VN',
              { hour: '2-digit', minute: '2-digit' }
            )}
            {' · '}
            {new Date(notif.updatedAt || notif.createdAt).toLocaleDateString(
              'vi-VN'
            )}
          </span>
        </div>

        {/* Right: Post image preview (if exists) */}
        {thumbUrl && (
          <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/5 bg-neutral-900 flex-shrink-0 relative group-hover/item:scale-105 transition-transform duration-300">
            <img src={thumbUrl} alt="" className="w-full h-full object-cover" />
          </div>
        )}
      </div>
    )
  }

  // Render a timeline section
  const renderSection = (title, list) => {
    if (list.length === 0) return null
    return (
      <div className="space-y-2 mb-6">
        <h3 className="text-[10px] font-bold text-white/35 uppercase tracking-wider px-1">
          {title}
        </h3>
        <div className="space-y-1">{list.map((n) => renderNotifItem(n))}</div>
      </div>
    )
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex justify-end">
        {/* Backdrop glass */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-xs"
        />

        {/* Sliding Panel */}
        <motion.div
          ref={panelRef}
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 26, stiffness: 220 }}
          className="relative w-full max-w-md h-full bg-[#121216]/95 border-l border-white/10 backdrop-blur-md shadow-2xl flex flex-col z-10 overflow-hidden font-body"
        >
          {/* Header */}
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell size={18} className="text-brand-400" />
              <h2 className="text-base font-bold text-white">Thông báo</h2>
              {notifications.some((n) => !n.isRead) && (
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              )}
            </div>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-full bg-white/5 text-white/70 hover:text-white hover:bg-white/10 transition-colors focus:outline-none cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* TikTok-style Tabs navigation */}
          <div className="grid grid-cols-4 border-b border-white/5 p-1 bg-black/20 text-xs font-semibold select-none">
            {['all', 'social', 'income', 'system'].map((tab) => {
              const label = {
                all: 'Tất cả',
                social: 'Tương tác',
                income: 'Doanh thu',
                system: 'Hệ thống',
              }[tab]
              const isActive = activeTab === tab
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-2 rounded-xl transition-all cursor-pointer ${
                    isActive
                      ? 'bg-brand-600/90 text-white shadow-sm font-bold'
                      : 'text-white/45 hover:text-white/75 font-medium'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>

          {/* List Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {loading && notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 space-y-3">
                <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-white/30 italic">
                  Đang tải thông báo...
                </span>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center p-4">
                <Bell size={32} className="text-white/10 mb-2" />
                <p className="text-xs text-white/40 font-semibold">
                  Không có thông báo nào
                </p>
                <p className="text-[10px] text-white/20 mt-1 max-w-[200px]">
                  Các thông báo mới về tương tác, doanh thu hoặc hệ thống sẽ
                  xuất hiện tại đây.
                </p>
              </div>
            ) : (
              <>
                {renderSection('Hôm nay', today)}
                {renderSection('Hôm qua', yesterday)}
                {renderSection('7 ngày qua', last7Days)}
                {renderSection('Cũ hơn', older)}
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export default NotificationPanel
