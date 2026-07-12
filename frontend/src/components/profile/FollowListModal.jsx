import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, UserPlus, UserCheck, Loader2, Users } from 'lucide-react'
import api from '../../api/api'
import toast from 'react-hot-toast'
import useAuthStore from '../../store/auth.store'

const FollowListModal = ({ isOpen, onClose, userId, type, username }) => {
  const navigate = useNavigate()
  const { user: currentUser } = useAuthStore()

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [followLoadingMap, setFollowLoadingMap] = useState({})

  // Fetch followers or following
  useEffect(() => {
    if (!isOpen || !userId) return
    
    setLoading(true)
    api.get(`/users/${userId}/${type}`)
      .then(({ data }) => {
        // API returns { followers: [...] } or { following: [...] }
        const list = data[type] || []
        setUsers(list)
      })
      .catch((err) => {
        console.error(err)
        toast.error('Không thể tải danh sách người dùng')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [isOpen, userId, type])

  // Sync follow state across tabs
  useEffect(() => {
    if (!isOpen) return
    const channel = new BroadcastChannel('picspy_follow_sync')
    const handleMessage = (event) => {
      const { creatorId, isFollowing } = event.data
      setUsers((prevUsers) =>
        prevUsers.map((user) => {
          if (!user || user._id !== creatorId) return user
          return {
            ...user,
            isFollowing, // update follow status locally if matching
          }
        })
      )
    }
    channel.addEventListener('message', handleMessage)
    return () => {
      channel.removeEventListener('message', handleMessage)
      channel.close()
    }
  }, [isOpen])

  // Handle follow / unfollow for list items
  const handleFollowToggle = async (targetUser) => {
    if (!currentUser) {
      navigate('/login')
      onClose()
      return
    }

    const targetId = targetUser._id
    if (followLoadingMap[targetId]) return

    setFollowLoadingMap((prev) => ({ ...prev, [targetId]: true }))

    try {
      const { data } = await api.post(`/users/${targetId}/follow`)
      
      // Update local item follow state (note that we might want to also fetch follows if BE returns follows list info)
      setUsers((prevUsers) =>
        prevUsers.map((user) => {
          if (user._id === targetId) {
            const currentIsFollowing = user.isFollowing ?? false;
            // update stats count locally
            const followersDiff = data.following ? 1 : -1
            return {
              ...user,
              isFollowing: data.following,
              stats: {
                ...user.stats,
                followersCount: Math.max(0, (user.stats?.followersCount || 0) + followersDiff)
              }
            }
          }
          return user
        })
      )

      toast.success(data.following ? `Đang theo dõi @${targetUser.username}` : 'Đã hủy theo dõi', {
        duration: 1500,
      })

      // Broadcast event to sync all views
      const channel = new BroadcastChannel('picspy_follow_sync')
      channel.postMessage({ creatorId: targetId, isFollowing: data.following })
      channel.close()

    } catch (err) {
      toast.error('Thao tác thất bại')
    } finally {
      setFollowLoadingMap((prev) => ({ ...prev, [targetId]: false }))
    }
  }

  const handleUserClick = (targetUsername) => {
    navigate(`/profile/${targetUsername}`)
    onClose()
  }

  if (!isOpen) return null

  const title = type === 'followers' 
    ? `Người theo dõi của @${username}`
    : `@${username} đang theo dõi`

  return (
    <AnimatePresence>
      <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md z-[200]">
        {/* Backdrop overlay */}
        <div className="fixed inset-0 w-full h-full cursor-default" onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, scale: 0.93, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.93, y: 15 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="relative bg-[#121220]/95 border border-white/10 rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl z-10 flex flex-col max-h-[75vh]"
          style={{ backdropFilter: 'blur(32px)' }}
        >
          {/* Header */}
          <div className="p-5 border-b border-white/5 flex items-center justify-between shrink-0">
            <h3 className="text-base font-bold tracking-tight text-white pj max-w-[85%] truncate">
              {title}
            </h3>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* User List Content */}
          <div className="p-5 overflow-y-auto no-scrollbar flex-1 min-h-[300px]">
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/5" />
                      <div className="space-y-2">
                        <div className="h-3 w-24 bg-white/10 rounded" />
                        <div className="h-3 w-16 bg-white/5 rounded" />
                      </div>
                    </div>
                    <div className="h-8 w-20 bg-white/10 rounded-lg" />
                  </div>
                ))}
              </div>
            ) : users.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <Users size={32} className="text-white/10" />
                <p className="text-white/30 text-sm pj">
                  {type === 'followers'
                    ? 'Chưa có người theo dõi nào.'
                    : 'Chưa theo dõi người dùng nào.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {users.map((user) => {
                  if (!user) return null
                  const isSelf = currentUser?._id === user._id
                  // If BE does not provide isFollowing, we can default it or check if it matches target
                  const userIsFollowing = user.isFollowing ?? false

                  return (
                    <div key={user._id} className="flex items-center justify-between gap-3 group">
                      {/* Avatar & Name */}
                      <div 
                        className="flex items-center gap-3 cursor-pointer min-w-0" 
                        onClick={() => handleUserClick(user.username)}
                      >
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/5 border border-white/5 shrink-0">
                          {user.avatar ? (
                            <img 
                              src={user.avatar} 
                              alt={user.displayName || user.username} 
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username || '')}&background=8b5cf6&color=fff`
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-bold text-sm bg-brand-600/20 text-brand-400">
                              {user.username?.[0]?.toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-white group-hover:text-brand-400 transition-colors truncate">
                            {user.displayName || user.username}
                          </h4>
                          <p className="text-[11px] text-white/40 truncate">@{user.username}</p>
                        </div>
                      </div>

                      {/* Follow Button */}
                      {!isSelf && (
                        <button
                          onClick={() => handleFollowToggle(user)}
                          disabled={followLoadingMap[user._id]}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
                            userIsFollowing
                              ? 'bg-white/5 hover:bg-white/10 text-white/70 border border-white/10'
                              : 'bg-brand-600 hover:bg-brand-500 text-white shadow-md shadow-brand-600/10'
                          }`}
                        >
                          {followLoadingMap[user._id] ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : userIsFollowing ? (
                            <>
                              <UserCheck size={12} />
                              Đang follow
                            </>
                          ) : (
                            <>
                              <UserPlus size={12} />
                              Follow
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export default FollowListModal
