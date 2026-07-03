import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, Lock, Loader2, Coins, CheckCircle2 } from 'lucide-react'
import api from '../../api/api'
import useAuthStore from '../../store/auth.store'
import toast from 'react-hot-toast'

const formatItemText = (label, fileObj) => {
  if (!fileObj) return label
  const ext = fileObj.format ? ` (.${fileObj.format.toUpperCase()})` : ''
  const size = fileObj.fileSize
    ? ` - ${(fileObj.fileSize / (1024 * 1024)).toFixed(1)} MB`
    : ''
  return `${label}${ext}${size}`
}

const DownloadButton = ({
  post,
  postId: propPostId,
  isPremium: propIsPremium = false,
  priceInTokens: propPriceInTokens = 10,
  className = '',
  variant = 'default', // 'default' | 'compact' | 'detail'
  onUnlock,
}) => {
  const user = useAuthStore((s) => s.user)
  const accessToken = useAuthStore((s) => s.accessToken)
  const refreshMe = useAuthStore((s) => s.refreshMe)
  const isLoggedIn = !!user && !!accessToken

  const postId = post?._id || propPostId
  const isPremium = post ? post.isPremium : propIsPremium
  const priceInVnd = post ? post.priceInVnd || 20000 : 20000

  const [loading, setLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [done, setDone] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [selectedFileType, setSelectedFileType] = useState('original')

  const hasAttachments =
    !!post?.rawFile ||
    !!post?.colorFile ||
    !!post?.sourceImages?.[0] ||
    (post?.modelComparisons && post.modelComparisons.length > 0)

  const getAvailableFileTypes = () => {
    const types = ['original']
    if (post?.modelComparisons?.length) {
      const primaryImg = post.generatedImages?.[0]
      post.modelComparisons.forEach((comp, idx) => {
        const img = comp.generatedImages?.[0]
        if (!img) return
        const isDuplicate =
          primaryImg &&
          ((primaryImg.publicId && primaryImg.publicId === img.publicId) ||
            (primaryImg.url && primaryImg.url === img.url))
        if (!isDuplicate) {
          types.push(`comp_${idx}`)
        }
      })
    }
    if (post?.sourceImages?.[0]) types.push('source')
    if (post?.rawFile) types.push('raw')
    if (post?.colorFile) types.push('color')
    return types
  }

  const availableTypes = getAvailableFileTypes()
  const purchasedTypes = post?.purchasedFileTypes || []
  const isAllPurchased =
    isPremium && availableTypes.every((type) => purchasedTypes.includes(type))

  const doDownload = async (fileType = selectedFileType) => {
    setShowConfirm(false)
    setLoading(true)
    try {
      const { data } = await api.post(`/posts/${postId}/download`, { fileType })

      if (data.downloadUrl) {
        let filename = data.filename
        if (!filename) {
          filename = `picspy-${postId}`
          if (fileType === 'original') {
            const img = post?.generatedImages?.[0]
            filename += img?.format ? `.${img.format}` : '.jpg'
          } else if (fileType.startsWith('comp_')) {
            const compIdx = parseInt(fileType.replace('comp_', ''))
            const img = post?.modelComparisons?.[compIdx]?.generatedImages?.[0]
            filename = `comp_${compIdx + 2}-${filename}`
            filename += img?.format ? `.${img.format}` : '.jpg'
          } else if (fileType === 'source') {
            const img = post?.sourceImages?.[0]
            filename = `RAW-unedited-source-${postId}`
            filename += img?.format ? `.${img.format}` : '.jpg'
          } else if (fileType === 'raw' && post?.rawFile?.originalName) {
            filename = post.rawFile.originalName
          } else if (fileType === 'raw') {
            filename += post.rawFile?.format
              ? `.${post.rawFile.format}`
              : '.raw'
          } else if (fileType === 'color' && post?.colorFile?.originalName) {
            filename = post.colorFile.originalName
          } else if (fileType === 'color') {
            filename += post.colorFile?.format
              ? `.${post.colorFile.format}`
              : '.lut'
          }
        }

        const a = document.createElement('a')
        try {
          // Fetch the file as a Blob to bypass CORS limitations on the a.download attribute
          const response = await fetch(data.downloadUrl)
          if (!response.ok)
            throw new Error('Network error or CORS restriction fetching file')
          const blob = await response.blob()
          const blobUrl = URL.createObjectURL(blob)
          a.href = blobUrl
          a.download = filename
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          setTimeout(() => URL.revokeObjectURL(blobUrl), 100)
        } catch (fetchErr) {
          console.error(
            'Blob download failed, falling back to direct link',
            fetchErr
          )
          a.href = data.downloadUrl
          a.download = filename
          a.target = '_blank'
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
        }

        setDone(true)
        setTimeout(() => setDone(false), 3000)

        // Call unlock callback
        onUnlock?.()

        // Sync balance in navbar for both token and VNĐ deductions
        if (data.tokensSpent > 0) {
          toast.success(
            `Mua thành công! Đã trừ ${data.tokensSpent} token. Đang chuẩn bị tệp...`,
            { duration: 4000 }
          )
          await refreshMe()
        } else if (data.vndSpent > 0) {
          toast.success(
            `Mua thành công! Đã trừ ${data.vndSpent.toLocaleString('vi-VN')}đ. Đang chuẩn bị tệp...`,
            { duration: 4000 }
          )
          if (post && !post.purchasedFileTypes?.includes(fileType)) {
            post.purchasedFileTypes = [
              ...(post.purchasedFileTypes || []),
              fileType,
            ]
          }
          await refreshMe()
        } else {
          toast.success('Đang chuẩn bị tệp tải xuống...')
        }
      }
    } catch (err) {
      const errData = err.response?.data
      if (err.response?.status === 402) {
        if (errData?.error === 'INSUFFICIENT_TOKENS') {
          toast.error(
            `Không đủ token! Cần ${errData.required} token, bạn có ${errData.balance} token.`,
            { duration: 5000 }
          )
        } else {
          toast.error(errData?.message || 'Cần token để tải tệp này')
        }
      } else {
        toast.error(errData?.message || 'Không thể tải tệp')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleInitiateDownload = (fileType) => {
    if (!isLoggedIn) {
      toast('Đăng nhập để tải tệp 💜', { icon: '🔒' })
      return
    }

    setSelectedFileType(fileType)

    const isPurchased = post?.purchasedFileTypes?.includes(fileType)

    if (isPremium && !isPurchased) {
      const balance = user?.vndBalance || 0
      if (balance < priceInVnd) {
        toast.error(
          `Không đủ số dư ví! Cần ${priceInVnd.toLocaleString('vi-VN')}đ, số dư hiện tại của bạn là ${balance.toLocaleString('vi-VN')}đ.`
        )
        return
      }
      setShowConfirm(true)
    } else {
      doDownload(fileType)
    }
  }

  const handleClick = (e) => {
    e.stopPropagation()
    if (!isLoggedIn) {
      toast('Đăng nhập để tải tệp 💜', { icon: '🔒' })
      return
    }
    if (hasAttachments) {
      setDropdownOpen((prev) => !prev)
    } else {
      handleInitiateDownload('original')
    }
  }

  const renderDropdownItem = (label, fileType, mediaItem) => {
    const isPurchased = post?.purchasedFileTypes?.includes(fileType)
    return (
      <button
        onClick={() => {
          setDropdownOpen(false)
          handleInitiateDownload(fileType)
        }}
        className="flex items-center justify-between gap-3 w-full px-3 py-2 rounded-xl text-xs text-white/80 hover:text-white hover:bg-white/5 transition-colors text-left group"
      >
        <div className="flex items-center gap-2 truncate">
          <Download
            size={14}
            className="text-white/40 flex-shrink-0 group-hover:text-white/60"
          />
          <span className="truncate">{formatItemText(label, mediaItem)}</span>
        </div>
        {isPremium &&
          (isPurchased ? (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-500/15 text-green-400 font-semibold flex-shrink-0">
              Đã mua
            </span>
          ) : (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 font-semibold flex-shrink-0">
              {priceInVnd.toLocaleString('vi-VN')}đ
            </span>
          ))}
      </button>
    )
  }

  const renderDropdown = () => {
    return (
      <AnimatePresence>
        {dropdownOpen && (
          <>
            {/* Click outside overlay */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setDropdownOpen(false)}
            />

            {/* Dropdown wrapper */}
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 bottom-full mb-2 bg-[#1a1a2e]/95 backdrop-blur border border-white/10 rounded-2xl p-1.5 shadow-2xl min-w-[280px] z-50 flex flex-col gap-0.5"
            >
              {renderDropdownItem(
                post?.isMultiModel
                  ? `Ảnh model 1 (${post.aiTool || 'AI'})`
                  : post?.sourceImages?.[0]
                    ? 'Ảnh đã chỉnh sửa'
                    : 'Ảnh gốc',
                'original',
                post?.generatedImages?.[0]
              )}

              {(() => {
                const primaryImg = post?.generatedImages?.[0]
                let displayedModelIndex = 2
                return post?.modelComparisons?.map((comp, idx) => {
                  const img = comp.generatedImages?.[0]
                  if (!img) return null
                  const isDuplicate =
                    primaryImg &&
                    ((primaryImg.publicId &&
                      primaryImg.publicId === img.publicId) ||
                      (primaryImg.url && primaryImg.url === img.url))
                  if (isDuplicate) return null
                  const label = `Ảnh model ${displayedModelIndex++} (${comp.aiTool || 'AI'})`
                  return (
                    <div key={idx}>
                      {renderDropdownItem(label, `comp_${idx}`, img)}
                    </div>
                  )
                })
              })()}

              {post?.sourceImages?.[0] &&
                renderDropdownItem(
                  'Ảnh gốc chưa sửa',
                  'source',
                  post.sourceImages[0]
                )}

              {post?.rawFile &&
                renderDropdownItem('Tệp tin RAW', 'raw', post.rawFile)}

              {post?.colorFile &&
                renderDropdownItem('Bộ lọc màu LUT', 'color', post.colorFile)}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    )
  }

  // ─── Compact variant (dùng trong modal toolbar) ──────────
  if (variant === 'compact') {
    return (
      <div className="relative inline-block">
        <motion.button
          onClick={handleClick}
          whileTap={{ scale: 0.9 }}
          disabled={loading}
          className={`flex items-center gap-1.5 text-white/50 hover:text-white transition-colors ${className}`}
          title={
            isPremium
              ? `Premium: ${priceInVnd.toLocaleString('vi-VN')}đ`
              : 'Tải miễn phí'
          }
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : done ? (
            <CheckCircle2 size={16} className="text-green-400" />
          ) : isPremium ? (
            <Lock size={16} />
          ) : (
            <Download size={16} />
          )}
        </motion.button>

        {renderDropdown()}

        <ConfirmModal
          open={showConfirm}
          price={priceInVnd}
          balance={user?.vndBalance || 0}
          onConfirm={() => doDownload(selectedFileType)}
          onCancel={() => setShowConfirm(false)}
        />
      </div>
    )
  }

  // ─── Detail variant (dùng trong detail page) ──────────────
  if (variant === 'detail') {
    const btnStyle =
      isPremium && !isAllPurchased
        ? {
            background: 'oklch(72% 0.18 65)', // Founder Amber
            boxShadow:
              'inset 0 1.5px 0 rgba(255,255,255,0.22), inset 0 -2px 0 rgba(0,0,0,0.2), 0 6px 24px rgba(217,119,6,0.4)',
          }
        : {
            background: 'oklch(52% 0.28 285)', // Studio Violet
            boxShadow:
              'inset 0 1.5px 0 rgba(255,255,255,0.26), inset 0 -2px 0 rgba(0,0,0,0.22), 0 8px 28px rgba(109,40,217,0.45)',
          }

    return (
      <div className="relative w-full">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleClick}
          disabled={loading}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl
            font-bold text-sm text-[#f5f3ff] disabled:opacity-60 transition-all duration-200"
          style={{
            ...btnStyle,
            fontFamily: 'Outfit, sans-serif',
            minHeight: 48,
          }}
        >
          {loading ? (
            <motion.div
              className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
            />
          ) : done ? (
            <CheckCircle2 size={16} />
          ) : isPremium && !isAllPurchased ? (
            <Lock size={16} />
          ) : (
            <Download size={16} />
          )}

          {done
            ? 'Đã tải!'
            : hasAttachments && dropdownOpen
              ? 'Đóng menu'
              : hasAttachments
                ? isAllPurchased
                  ? 'Đã mua trọn bộ'
                  : 'Tải xuống...'
                : isPremium && !isAllPurchased
                  ? `Tải Premium · ${priceInVnd.toLocaleString('vi-VN')}đ`
                  : isAllPurchased
                    ? 'Đã mua 🛍'
                    : 'Tải miễn phí'}
        </motion.button>

        {renderDropdown()}

        <ConfirmModal
          open={showConfirm}
          price={priceInVnd}
          balance={user?.vndBalance || 0}
          onConfirm={() => doDownload(selectedFileType)}
          onCancel={() => setShowConfirm(false)}
        />
      </div>
    )
  }

  // ─── Default variant ──────────────────────────────────────
  return (
    <div className="relative inline-block">
      <motion.button
        onClick={handleClick}
        whileTap={{ scale: 0.97 }}
        disabled={loading}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all
          ${
            done
              ? 'bg-green-600/20 border border-green-500/30 text-green-400'
              : isPremium && !isAllPurchased
                ? 'bg-amber-500/20 border border-amber-500/40 text-amber-400 hover:bg-amber-500/30'
                : 'bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-black/25'
          }
          disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
        style={
          done || (isPremium && !isAllPurchased)
            ? {}
            : {
                backdropFilter: 'var(--color-brand-blur, none)',
                border:
                  '1px solid rgba(255, 255, 255, calc((1 - var(--color-brand-opacity, 1)) * 0.15))',
              }
        }
      >
        {loading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : done ? (
          <CheckCircle2 size={16} />
        ) : isPremium && !isAllPurchased ? (
          <Coins size={16} />
        ) : (
          <Download size={16} />
        )}
        {done
          ? 'Đã tải!'
          : hasAttachments
            ? isAllPurchased
              ? 'Đã mua 🛍'
              : 'Tải xuống'
            : isPremium && !isAllPurchased
              ? `${priceInVnd.toLocaleString('vi-VN')}đ`
              : isAllPurchased
                ? 'Đã mua 🛍'
                : 'Tải miễn phí'}
      </motion.button>

      {renderDropdown()}

      <ConfirmModal
        open={showConfirm}
        price={priceInVnd}
        balance={user?.vndBalance || 0}
        onConfirm={() => doDownload(selectedFileType)}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  )
}

/* ─── Confirm Purchase Dialog ───────────────────────────────── */
const ConfirmModal = ({ open, price, balance, onConfirm, onCancel }) => (
  <AnimatePresence>
    {open && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={(e) => e.target === e.currentTarget && onCancel()}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="bg-[#1a1a2e] border border-white/10 rounded-3xl p-6 max-w-sm w-full shadow-2xl"
        >
          <div className="text-center mb-5">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">💳</span>
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Xác nhận mua</h3>
            <p className="text-white/50 text-sm">Tải tệp chất lượng gốc</p>
          </div>

          <div className="space-y-2 mb-5">
            <div className="flex justify-between items-center py-2 border-b border-white/8">
              <span className="text-white/50 text-sm">Giá tải ảnh</span>
              <span className="text-emerald-400 font-bold">
                {price.toLocaleString('vi-VN')}đ
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-white/50 text-sm">Số dư khả dụng</span>
              <span className="text-white font-semibold">
                {balance.toLocaleString('vi-VN')}đ
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-t border-white/8">
              <span className="text-white/50 text-sm">Số dư còn lại</span>
              <span
                className={`font-bold ${balance - price < 0 ? 'text-red-400' : 'text-green-400'}`}
              >
                {(balance - price).toLocaleString('vi-VN')}đ
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 px-4 rounded-xl border border-white/10 text-white/60 hover:text-white hover:border-white/20 transition-all text-sm font-semibold"
            >
              Hủy
            </button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onConfirm}
              className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-sm shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:from-emerald-400 hover:to-teal-400 transition-all"
            >
              Mua & Tải xuống
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
)

export default DownloadButton
