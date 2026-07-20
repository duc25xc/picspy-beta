import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Camera, Loader2, User, Lock, Globe, FileText, Check } from 'lucide-react'
import api from '../../api/api'
import toast from 'react-hot-toast'
import useAuthStore from '../../store/auth.store'
import ConfirmModal from '../common/ConfirmModal'

const EditProfileModal = ({ isOpen, onClose, profile, onProfileUpdated, defaultTab }) => {
  const { updateUser } = useAuthStore()
  const fileInputRef = useRef(null)

  const [activeTab, setActiveTab] = useState(defaultTab || 'info') // 'info' | 'password'
  
  // Info tab state
  const [displayName, setDisplayName] = useState(profile?.displayName || '')
  const [bio, setBio] = useState(profile?.bio || '')
  const [website, setWebsite] = useState(profile?.website || '')
  const [updatingInfo, setUpdatingInfo] = useState(false)

  // Avatar state
  const [avatarPreview, setAvatarPreview] = useState(profile?.avatar || null)
  const [avatarFile, setAvatarFile] = useState(null) // File object not yet uploaded
  const [avatarBlobUrl, setAvatarBlobUrl] = useState(null) // Blob URL for preview
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showConfirmClose, setShowConfirmClose] = useState(false)

  // Custom Cropper states and refs
  const [cropSrc, setCropSrc] = useState(null)
  const [cropZoom, setCropZoom] = useState(1)
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 })
  const [imgDims, setImgDims] = useState({ w: 0, h: 0 })
  const dragStartRef = useRef({ x: 0, y: 0 })
  const isDraggingRef = useRef(false)

  // Password tab state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen && profile) {
      setDisplayName(profile.displayName || '')
      setBio(profile.bio || '')
      setWebsite(profile.website || '')
      setAvatarPreview(profile.avatar || null)
      setActiveTab(defaultTab || 'info')
      // Reset password states
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      // Reset avatar upload states
      setAvatarFile(null)
      setHasUnsavedChanges(false)
      setShowConfirmClose(false)
    }
  }, [isOpen, profile, defaultTab])
  
  // Cleanup blob URL when modal closes
  useEffect(() => {
    if (!isOpen) {
      if (avatarBlobUrl) {
        URL.revokeObjectURL(avatarBlobUrl)
        setAvatarBlobUrl(null)
      }
      setAvatarFile(null)
      setHasUnsavedChanges(false)
      setShowConfirmClose(false)
    }
  }, [isOpen, avatarBlobUrl])

  if (!isOpen) return null

  // Handle avatar click to trigger input file selection
  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  // Handle avatar file selection - trigger custom cropper
  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Kích thước ảnh đại diện tối đa 2MB')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setCropSrc(reader.result)
      setCropZoom(1)
      setCropOffset({ x: 0, y: 0 })
    }
    reader.readAsDataURL(file)

    // Reset input value to allow selecting same file again
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Get base width and height of image in container coordinates based on cover-mode
  const getBaseDimensions = (dims) => {
    if (!dims || dims.w === 0 || dims.h === 0) return { w: 320, h: 320 }
    const containerSize = 320
    const ratio = dims.w / dims.h
    if (ratio > 1) {
      return {
        h: containerSize,
        w: containerSize * ratio
      }
    } else {
      return {
        w: containerSize,
        h: containerSize / ratio
      }
    }
  }

  const baseDims = getBaseDimensions(imgDims)

  // Helper to restrict dragging coordinates so the image always covers the crop box
  const clampOffset = (x, y, zoom, dims) => {
    if (!dims || dims.w === 0 || dims.h === 0) return { x, y }
    
    const containerSize = 320
    const ratio = dims.w / dims.h
    let baseW, baseH
    
    if (ratio > 1) {
      baseH = containerSize
      baseW = containerSize * ratio
    } else {
      baseW = containerSize
      baseH = containerSize / ratio
    }
    
    const scaledW = baseW * zoom
    const scaledH = baseH * zoom
    
    const minX = (containerSize - scaledW) / 2
    const maxX = (scaledW - containerSize) / 2
    const minY = (containerSize - scaledH) / 2
    const maxY = (scaledH - containerSize) / 2
    
    return {
      x: Math.max(minX, Math.min(maxX, x)),
      y: Math.max(minY, Math.min(maxY, y)),
    }
  }

  // Handle image load to extract natural dimensions and reset cropper params
  const handleImageLoad = (e) => {
    const { naturalWidth, naturalHeight } = e.target
    const dims = { w: naturalWidth, h: naturalHeight }
    setImgDims(dims)
    setCropOffset({ x: 0, y: 0 })
    setCropZoom(1)
  }

  // Handle zoom level change and clamp current offset to avoid empty borders
  const handleZoomChange = (newZoom) => {
    setCropZoom(newZoom)
    setCropOffset((prev) => clampOffset(prev.x, prev.y, newZoom, imgDims))
  }

  // Dragging event handlers for the image cropper
  const handleDragStart = (e) => {
    isDraggingRef.current = true
    dragStartRef.current = {
      x: e.clientX - cropOffset.x,
      y: e.clientY - cropOffset.y,
    }
  }

  const handleDragMove = (e) => {
    if (!isDraggingRef.current) return
    const newX = e.clientX - dragStartRef.current.x
    const newY = e.clientY - dragStartRef.current.y
    const clamped = clampOffset(newX, newY, cropZoom, imgDims)
    setCropOffset(clamped)
  }

  const handleDragEnd = () => {
    isDraggingRef.current = false
  }

  const handleTouchStart = (e) => {
    if (e.touches.length !== 1) return
    isDraggingRef.current = true
    dragStartRef.current = {
      x: e.touches[0].clientX - cropOffset.x,
      y: e.touches[0].clientY - cropOffset.y,
    }
  }

  const handleTouchMove = (e) => {
    if (!isDraggingRef.current || e.touches.length !== 1) return
    const newX = e.touches[0].clientX - dragStartRef.current.x
    const newY = e.touches[0].clientY - dragStartRef.current.y
    const clamped = clampOffset(newX, newY, cropZoom, imgDims)
    setCropOffset(clamped)
  }

  const handleTouchEnd = () => {
    isDraggingRef.current = false
  }

  // Draw crop preview onto a 400x400 canvas and convert to WebP Blob/File
  const handleCropApply = () => {
    const canvas = document.createElement('canvas')
    canvas.width = 400
    canvas.height = 400
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = new Image()
    img.src = cropSrc
    img.onload = () => {
      const cw = canvas.width
      const ch = canvas.height

      ctx.fillStyle = '#000000'
      ctx.fillRect(0, 0, cw, ch)

      const containerSize = 320
      const scaleFactor = cw / containerSize

      const imgWidth = img.naturalWidth
      const imgHeight = img.naturalHeight

      const ratio = imgWidth / imgHeight
      let renderW, renderH
      if (ratio > 1) {
        renderH = containerSize
        renderW = containerSize * ratio
      } else {
        renderW = containerSize
        renderH = containerSize / ratio
      }

      const canvasCenterX = cw / 2 + cropOffset.x * scaleFactor
      const canvasCenterY = ch / 2 + cropOffset.y * scaleFactor
      
      const wOnCanvas = renderW * cropZoom * scaleFactor
      const hOnCanvas = renderH * cropZoom * scaleFactor

      ctx.drawImage(
        img,
        canvasCenterX - wOnCanvas / 2,
        canvasCenterY - hOnCanvas / 2,
        wOnCanvas,
        hOnCanvas
      )

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            toast.error('Không thể cắt ảnh')
            return
          }

          const croppedFile = new File([blob], 'avatar.webp', {
            type: 'image/webp',
          })

          if (avatarBlobUrl) {
            URL.revokeObjectURL(avatarBlobUrl)
          }

          const blobUrl = URL.createObjectURL(croppedFile)
          setAvatarFile(croppedFile)
          setAvatarBlobUrl(blobUrl)
          setAvatarPreview(blobUrl)
          setHasUnsavedChanges(true)
          setCropSrc(null)
          toast.success('Đã cắt ảnh đại diện thành công')
        },
        'image/webp',
        0.9
      )
    }
  }

  // Save profile information
  const handleSaveInfo = async (e) => {
    e.preventDefault()
    
    // Validation
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
      let newAvatarUrl = null

      // Step 1: Upload avatar if changed
      if (avatarFile) {
        const formData = new FormData()
        formData.append('avatar', avatarFile)
        
        const uploadToastId = toast.loading('Đang tải ảnh lên...')
        try {
          const { data } = await api.put('/users/me/avatar', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })
          newAvatarUrl = data.user?.avatar || data.avatar
          toast.success('Đã tải ảnh lên', { id: uploadToastId })
        } catch (err) {
          toast.error('Không thể tải ảnh lên', { id: uploadToastId })
          throw err // Stop if avatar upload fails
        }
      }

      // Step 2: Update profile info
      const { data } = await api.put('/users/me', {
        displayName,
        bio,
        website,
      })

      const updatedUser = data.user
      
      // If avatar was uploaded, merge it into user object
      if (newAvatarUrl) {
        updatedUser.avatar = newAvatarUrl
      }

      onProfileUpdated(updatedUser)
      updateUser(updatedUser)
      
      // Cleanup blob URL
      if (avatarBlobUrl) {
        URL.revokeObjectURL(avatarBlobUrl)
        setAvatarBlobUrl(null)
      }
      setAvatarFile(null)
      setHasUnsavedChanges(false)
      
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
      await api.put('/users/me/password', payload)

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

  // Handle modal close with unsaved changes check
  const handleClose = () => {
    // Check if there are unsaved changes (avatar, form fields, or passwords)
    const hasFormChanges = 
      displayName !== (profile?.displayName || '') ||
      bio !== (profile?.bio || '') ||
      website !== (profile?.website || '') ||
      avatarFile !== null ||
      currentPassword !== '' ||
      newPassword !== '' ||
      confirmPassword !== ''

    if (hasFormChanges) {
      setShowConfirmClose(true)
    } else {
      forceClose()
    }
  }

  const forceClose = () => {
    // Cleanup blob URL before closing
    if (avatarBlobUrl) {
      URL.revokeObjectURL(avatarBlobUrl)
      setAvatarBlobUrl(null)
    }
    setAvatarFile(null)
    setHasUnsavedChanges(false)
    setShowConfirmClose(false)
    onClose()
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md z-[200]">
        {/* Backdrop Close Click */}
        <div className="fixed inset-0 w-full h-full cursor-default" onClick={handleClose} />

        <motion.div
          initial={{ opacity: 0, scale: 0.93, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.93, y: 15 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="relative bg-[#121220]/95 border border-white/10 rounded-[2.5rem] w-full max-w-xl overflow-hidden shadow-2xl z-10 flex flex-col max-h-[90vh]"
          style={{ backdropFilter: 'blur(32px)' }}
        >
          {/* Header */}
          <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0">
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>👤 Thiết lập tài khoản</span>
            </h2>
            <button
              onClick={handleClose}
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
                  <div className="relative cursor-pointer select-none" onClick={handleAvatarClick}>
                    {/* Main Avatar Container */}
                    <motion.div
                      whileHover={{ scale: 1.05, borderColor: 'rgba(139, 92, 246, 0.4)' }}
                      whileTap={{ scale: 0.96 }}
                      className="w-24 h-24 rounded-3xl overflow-hidden border-2 border-white/10 transition-all duration-300 relative shadow-lg bg-[#18182a] flex items-center justify-center group"
                    >
                      {avatarPreview ? (
                        <img
                          src={avatarPreview}
                          alt="Avatar Preview"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.username || '')}&background=8b5cf6&color=fff`
                          }}
                        />
                      ) : (
                        <span className="text-3xl font-bold text-white/20">
                          {displayName?.[0]?.toUpperCase() || profile?.username?.[0]?.toUpperCase()}
                        </span>
                      )}

                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center text-white/90 gap-1">
                        <Camera size={18} />
                        <span className="text-[10px] font-medium">Thay đổi</span>
                      </div>

                      {/* Uploading Overlay */}
                      {updatingInfo && (
                        <div className="absolute inset-0 bg-black/75 backdrop-blur-[2px] flex flex-col items-center justify-center text-brand-400 gap-1.5 z-10">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{
                              duration: 0.8,
                              repeat: Infinity,
                              ease: 'linear',
                            }}
                            className="text-brand-400 flex items-center justify-center"
                          >
                            <Loader2 size={24} />
                          </motion.div>
                          <span className="text-[9px] font-bold tracking-wider uppercase text-white/90">Đang lưu</span>
                        </div>
                      )}
                    </motion.div>

                    {/* Camera Edit Badge at bottom right */}
                    <motion.div
                      whileHover={{ scale: 1.12 }}
                      whileTap={{ scale: 0.9 }}
                      className="absolute -bottom-1 -right-1 bg-brand-600 border border-white/10 text-white p-1.5 rounded-xl shadow-lg flex items-center justify-center hover:bg-brand-500 transition-colors z-20"
                    >
                      <Camera size={13} />
                    </motion.div>

                    {/* Draft tag if selected but unsaved */}
                    {avatarFile && (
                      <motion.span
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute -top-2 left-1/2 -translate-x-1/2 bg-amber-500 text-black font-extrabold px-2 py-0.5 rounded-full text-[9px] shadow-lg select-none z-20 whitespace-nowrap tracking-wider uppercase border border-amber-400/20"
                      >
                        Chưa lưu
                      </motion.span>
                    )}
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
                      onChange={(e) => {
                        setDisplayName(e.target.value)
                        setHasUnsavedChanges(true)
                      }}
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
                      onChange={(e) => {
                        setBio(e.target.value)
                        setHasUnsavedChanges(true)
                      }}
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
                    onChange={(e) => {
                      setWebsite(e.target.value)
                      setHasUnsavedChanges(true)
                    }}
                  />
                </div>

                {/* Footer Actions */}
                <div className="pt-4 border-t border-white/5 flex gap-3">
                  <button
                    type="button"
                    onClick={handleClose}
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
                    onClick={handleClose}
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
        
        {/* Hộp thoại xác nhận khi có thay đổi chưa lưu */}
        <ConfirmModal
          isOpen={showConfirmClose}
          onClose={() => setShowConfirmClose(false)}
          onConfirm={forceClose}
          title="Thay đổi chưa được lưu"
          message="Ảnh đã chọn hoặc thông tin thay đổi chưa được lưu. Bạn có chắc chắn muốn bỏ qua các thay đổi này và thoát không?"
          confirmText="Thoát và huỷ"
          cancelText="Ở lại thiết lập"
          type="warning"
          zIndex={300}
        />

        {/* Custom Cropper Modal */}
        <AnimatePresence>
          {cropSrc && (
                <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md z-[350]">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="bg-[#121220] border border-white/10 rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl p-6 flex flex-col items-center"
              >
                <h3 className="text-lg font-bold text-white mb-4">Cắt ảnh đại diện</h3>
                
                {/* Crop Box Container */}
                <div 
                  className="w-80 h-80 border border-white/10 rounded-3xl overflow-hidden relative bg-[#080812] cursor-grab active:cursor-grabbing select-none"
                  onMouseDown={handleDragStart}
                  onMouseMove={handleDragMove}
                  onMouseUp={handleDragEnd}
                  onMouseLeave={handleDragEnd}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                >
                  {/* Visual Squircle Crop Overlay Mask */}
                  <div className="absolute inset-0 border-2 border-brand-500 rounded-3xl pointer-events-none z-10 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]" />
                  
                  {/* The Image */}
                  <img
                    src={cropSrc}
                    alt="Crop Target"
                    onLoad={handleImageLoad}
                    style={{
                      width: `${baseDims.w}px`,
                      height: `${baseDims.h}px`,
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: `translate(-50%, -50%) translate(${cropOffset.x}px, ${cropOffset.y}px) scale(${cropZoom})`,
                      transformOrigin: 'center',
                    }}
                    className="pointer-events-none select-none max-w-none max-h-none transition-transform duration-75"
                  />
                </div>
                
                {/* Zoom Slider */}
                <div className="w-full mt-6 space-y-2">
                  <div className="flex justify-between text-xs text-white/50">
                    <span>Thu nhỏ</span>
                    <span>Phóng to</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.05"
                    value={cropZoom}
                    onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-brand-500"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 w-full mt-6">
                  <button
                    type="button"
                    onClick={() => setCropSrc(null)}
                    className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/60 hover:text-white hover:bg-white/5 transition-all text-xs font-semibold"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleCropApply}
                    className="flex-1 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold transition-all text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-brand-600/20"
                  >
                    Áp dụng
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AnimatePresence>
  )
}

export default EditProfileModal
