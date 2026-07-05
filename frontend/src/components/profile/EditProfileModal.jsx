import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Camera, Loader2, User, Lock, Globe, FileText, Check } from 'lucide-react'
import api from '../../api/api'
import toast from 'react-hot-toast'
import useAuthStore from '../../store/auth.store'

const EditProfileModal = ({ isOpen, onClose, profile, onProfileUpdated }) => {
  const { updateUser } = useAuthStore()
  const fileInputRef = useRef(null)

  const [activeTab, setActiveTab] = useState('info') // 'info' | 'password'
  
  // Info tab state
  const [displayName, setDisplayName] = useState(profile?.displayName || '')
  const [bio, setBio] = useState(profile?.bio || '')
  const [website, setWebsite] = useState(profile?.website || '')
  const [updatingInfo, setUpdatingInfo] = useState(false)

  // Avatar state
  const [avatarPreview, setAvatarPreview] = useState(profile?.avatar || null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  // Password tab state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen && profile) {
      setDisplayName(profile.displayName || '')
      setBio(profile.bio || '')
      setWebsite(profile.website || '')
      setAvatarPreview(profile.avatar || null)
      setActiveTab('info')
      // Reset password states
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    }
  }, [isOpen, profile])

  if (!isOpen) return null

  // Handle avatar click to trigger input file selection
  const handleAvatarClick = () => {
    if (uploadingAvatar) return
    fileInputRef.current?.click()
  }

  // Handle avatar upload to server
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Kích thước ảnh đại diện tối đa 2MB')
      return
    }

    const formData = new FormData()
    formData.append('avatar', file)

    setUploadingAvatar(true)
    const uploadToastId = toast.loading('Đang tải ảnh lên...')

    try {
      const { data } = await api.put('/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      
      const newAvatarUrl = data.user?.avatar || data.avatar
      setAvatarPreview(newAvatarUrl)
      
      // Update local states & global store
      onProfileUpdated({ avatar: newAvatarUrl })
      updateUser({ avatar: newAvatarUrl })

      toast.success('Cập nhật ảnh đại diện thành công', { id: uploadToastId })
    } catch (err) {
      console.error(err)
      toast.error(err.response?.data?.message || 'Không thể tải ảnh lên', { id: uploadToastId })
    } finally {
      setUploadingAvatar(false)
      // Reset input value to allow uploading same file
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Save profile information
  const handleSaveInfo = async (e) => {
    e.preventDefault()
    if (displayName.length > 50) {
      toast.error('Tên hiển thị tối đa 50 ký tự')
      return
    }
    if (bio.length > 200) {
      toast.error('Tiểu sử tối đa 200 ký tự')
      return
    }

    setUpdatingInfo(true)
    try {
      const { data } = await api.put('/me', {
        displayName,
        bio,
        website,
      })

      const updatedUser = data.user
      onProfileUpdated(updatedUser)
      updateUser(updatedUser)
      toast.success('Đã cập nhật thông tin cá nhân')
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra')
    } finally {
      setUpdatingInfo(false)
    }
  }

  // Change password
  const handleChangePassword = async (e) => {
    e.preventDefault()
    const hasPassword = profile?.hasPassword ?? true
    if ((hasPassword && !currentPassword) || !newPassword || !confirmPassword) {
      toast.error('Vui lòng nhập đầy đủ thông tin')
      return
    }
    if (newPassword.length < 8) {
      toast.error('Mật khẩu mới phải từ 8 ký tự trở lên')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Mật khẩu mới không trùng khớp')
      return
    }

    setChangingPassword(true)
    try {
      const payload = hasPassword ? { currentPassword, newPassword } : { newPassword }
      await api.put('/me/password', payload)

      toast.success(hasPassword ? 'Đổi mật khẩu thành công' : 'Đặt mật khẩu thành công')
      
      if (onProfileUpdated) onProfileUpdated({ hasPassword: true })
      updateUser({ hasPassword: true })

      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Thao tác thất bại')
    } finally {
      setChangingPassword(false)
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md z-[200]">
        {/* Backdrop Close Click */}
        <div className="fixed inset-0 w-full h-full cursor-default" onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, scale: 0.93, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.93, y: 15 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="relative bg-[#121220]/95 border border-white/10 rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl z-10 flex flex-col max-h-[90vh]"
          style={{ backdropFilter: 'blur(32px)' }}
        >
          {/* Header */}
          <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0">
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>👤 Thiết lập tài khoản</span>
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex px-6 pt-3 border-b border-white/5 bg-white/[0.01] shrink-0">
            <button
              onClick={() => setActiveTab('info')}
              className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'info'
                  ? 'border-brand-500 text-brand-400 font-bold'
                  : 'border-transparent text-white/40 hover:text-white/70'
              }`}
            >
              <User size={16} />
              Thông tin cá nhân
            </button>
            <button
              onClick={() => setActiveTab('password')}
              className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'password'
                  ? 'border-brand-500 text-brand-400 font-bold'
                  : 'border-transparent text-white/40 hover:text-white/70'
              }`}
            >
              <Lock size={16} />
              {profile?.hasPassword ? 'Đổi mật khẩu' : 'Tạo mật khẩu'}
            </button>
          </div>

          {/* Form Content - Scrollable */}
          <div className="p-6 overflow-y-auto no-scrollbar flex-1">
            {activeTab === 'info' ? (
              <form onSubmit={handleSaveInfo} className="space-y-6">
                {/* Avatar upload */}
                <div className="flex flex-col items-center justify-center mb-6">
                  <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
                    <div className="w-24 h-24 rounded-3xl overflow-hidden border-2 border-white/10 group-hover:border-brand-500/50 transition-all duration-300 relative shadow-inner bg-surface-100 flex items-center justify-center">
                      {avatarPreview ? (
                        <img
                          src={avatarPreview}
                          alt="Avatar Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-3xl font-bold text-white/20">
                          {displayName?.[0]?.toUpperCase() || profile?.username?.[0]?.toUpperCase()}
                        </span>
                      )}

                      {/* Loading spinner */}
                      {uploadingAvatar && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <Loader2 className="text-brand-400 animate-spin" size={24} />
                        </div>
                      )}

                      {/* Hover Overlay */}
                      {!uploadingAvatar && (
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center text-white/90 gap-1">
                          <Camera size={18} />
                          <span className="text-[10px] font-medium">Thay đổi</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-[11px] text-white/30 mt-2.5">Nhấp vào ảnh để thay đổi. Tối đa 2MB.</p>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleAvatarChange}
                    accept="image/*"
                    className="hidden"
                  />
                </div>

                {/* Name fields */}
                <div className="space-y-1.5">
                  <label className="input-label flex items-center gap-1.5">
                    <User size={14} className="text-white/40" />
                    Tên hiển thị
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      className="input"
                      placeholder="Nhập tên hiển thị..."
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      maxLength={50}
                      required
                    />
                    <span className="absolute right-3.5 top-3.5 text-xs text-white/30 font-medium">
                      {displayName.length}/50
                    </span>
                  </div>
                </div>

                {/* Bio text area */}
                <div className="space-y-1.5">
                  <label className="input-label flex items-center gap-1.5">
                    <FileText size={14} className="text-white/40" />
                    Tiểu sử (Bio)
                  </label>
                  <div className="relative">
                    <textarea
                      className="input min-h-[90px] py-3 resize-none"
                      placeholder="Giới thiệu ngắn về bản thân..."
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      maxLength={200}
                    />
                    <span className="absolute right-3.5 bottom-3.5 text-xs text-white/30 font-medium">
                      {bio.length}/200
                    </span>
                  </div>
                </div>

                {/* Website input */}
                <div className="space-y-1.5">
                  <label className="input-label flex items-center gap-1.5">
                    <Globe size={14} className="text-white/40" />
                    Trang web
                  </label>
                  <input
                    type="url"
                    className="input"
                    placeholder="https://yourwebsite.com"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                  />
                </div>

                {/* Footer Actions */}
                <div className="pt-4 border-t border-white/5 flex gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-3 rounded-xl border border-white/10 text-white/60 hover:text-white hover:bg-white/5 transition-all text-sm font-semibold cursor-pointer"
                  >
                    Bỏ qua
                  </button>
                  <button
                    type="submit"
                    disabled={updatingInfo}
                    className="flex-1 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white transition-all text-sm font-bold flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-brand-600/25 active:scale-95 disabled:opacity-60 disabled:pointer-events-none"
                  >
                    {updatingInfo ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Đang lưu...
                      </>
                    ) : (
                      <>
                        <Check size={16} />
                        Lưu thay đổi
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleChangePassword} className="space-y-6">
                {!(profile?.hasPassword) ? (
                  <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 text-amber-500 text-xs leading-relaxed">
                    💡 <b>Liên kết tài khoản Google:</b> Tài khoản của bạn chưa được cài đặt mật khẩu riêng. Bạn có thể cài đặt mật khẩu tại đây để đăng nhập bằng cả Email và Google.
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-white/50 text-xs leading-relaxed">
                    💡 Bạn đang sử dụng mật khẩu riêng. Bạn có thể thay đổi mật khẩu bất cứ lúc nào, hoặc tiếp tục đăng nhập nhanh bằng tài khoản Google đã liên kết.
                  </div>
                )}

                {/* Current password */}
                {profile?.hasPassword && (
                  <div className="space-y-1.5">
                    <label className="input-label">Mật khẩu hiện tại</label>
                    <input
                      type="password"
                      className="input"
                      placeholder="••••••••"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                    />
                  </div>
                )}

                {/* New password */}
                <div className="space-y-1.5">
                  <label className="input-label">Mật khẩu mới</label>
                  <input
                    type="password"
                    className="input"
                    placeholder="Tối thiểu 8 ký tự"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                </div>

                {/* Confirm new password */}
                <div className="space-y-1.5">
                  <label className="input-label">Xác nhận mật khẩu mới</label>
                  <input
                    type="password"
                    className="input"
                    placeholder="Nhập lại mật khẩu mới"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>

                {/* Footer Actions */}
                <div className="pt-4 border-t border-white/5 flex gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-3 rounded-xl border border-white/10 text-white/60 hover:text-white hover:bg-white/5 transition-all text-sm font-semibold cursor-pointer"
                  >
                    Bỏ qua
                  </button>
                  <button
                    type="submit"
                    disabled={changingPassword}
                    className="flex-1 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white transition-all text-sm font-bold flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-brand-600/25 active:scale-95 disabled:opacity-60 disabled:pointer-events-none"
                  >
                    {changingPassword ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Đang xử lý...
                      </>
                    ) : (
                      <>
                        <Check size={16} />
                        {profile?.hasPassword ? 'Đổi mật khẩu' : 'Tạo mật khẩu'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export default EditProfileModal
