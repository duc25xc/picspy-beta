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
    return (
      <div className="relative w-full">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleClick}
          disabled={loading}
          className={`flex items-center justify-center gap-2.5 w-full py-3 px-6 rounded-2xl
            font-extrabold text-sm uppercase tracking-wider transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed min-h-[48px]
            ${
              done
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                : isPremium && !isAllPurchased
                  ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-neutral-950 shadow-[0_4px_24px_rgba(245,158,11,0.25)] hover:shadow-[0_4px_30px_rgba(245,158,11,0.4)] border border-yellow-300/30'
                  : 'bg-white/5 hover:bg-white/10 text-white/90 border border-white/10 hover:border-white/20 shadow-[0_4px_20px_rgba(0,0,0,0.3)]'
            }`}
          style={{
            fontFamily: 'Outfit, sans-serif',
          }}
        >
          {loading ? (
            <motion.div
              className={`w-4 h-4 border-2 rounded-full ${isPremium && !isAllPurchased && !done ? 'border-neutral-950/30 border-t-neutral-950' : 'border-white/30 border-t-white'}`}
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
            />
          ) : done ? (
            <CheckCircle2 size={16} />
          ) : isPremium && !isAllPurchased ? (
            <Lock size={16} className="stroke-[2.5]" />
          ) : (
            <Download size={16} />
          )}

          {done
            ? 'Đã tải!'
            : hasAttachments && dropdownOpen
              ? 'Đóng menu'
              : hasAttachments
                ? isAllPurchased
                  ? 'Đã sở hữu'
                  : 'Tải xuống...'
                : isPremium && !isAllPurchased
                  ? `Sở hữu Premium • ${priceInVnd.toLocaleString('vi-VN')}đ`
                  : isAllPurchased
                    ? 'Đã sở hữu'
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

  // ─── Default variant (dùng trong modal chi tiết ngoài home) ──
  return (
    <div className="relative inline-block">
      <motion.button
        onClick={handleClick}
        whileTap={{ scale: 0.97 }}
        disabled={loading}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed
          ${
            done
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
              : isPremium && !isAllPurchased
                ? 'bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 hover:border-amber-500/40 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.12)]'
                : 'bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white/90 shadow-lg shadow-black/20'
          } ${className}`}
        style={{
          fontFamily: 'Outfit, sans-serif',
        }}
      >
        {loading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : done ? (
          <CheckCircle2 size={14} />
        ) : isPremium && !isAllPurchased ? (
          <Lock size={14} className="stroke-[2.5]" />
        ) : (
          <Download size={14} />
        )}
        {done
          ? 'Đã tải!'
          : hasAttachments
            ? isAllPurchased
              ? 'Đã sở hữu'
              : 'Tải xuống'
            : isPremium && !isAllPurchased
              ? `Sở hữu • ${priceInVnd.toLocaleString('vi-VN')}đ`
              : isAllPurchased
                ? 'Đã sở hữu'
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
        className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
        onClick={(e) => e.target === e.currentTarget && onCancel()}
      >
        <motion.div
          initial={{ scale: 0.95, y: 15 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 15 }}
          className="relative bg-[#121225]/95 border border-white/10 rounded-[2rem] p-6 max-w-sm w-full shadow-2xl noise"
        >
          <div className="text-center mb-5">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4 text-amber-400">
              <Lock size={24} className="stroke-[2]" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Xác nhận sở hữu</h3>
            <p className="text-white/40 text-xs">Mở khóa tệp chất lượng gốc</p>
          </div>

          <div className="space-y-2 mb-6 bg-white/[0.02] border border-white/5 rounded-2xl p-4">
            <div className="flex justify-between items-center py-1.5">
              <span className="text-white/50 text-xs">Giá sở hữu</span>
              <span className="text-amber-400 font-extrabold text-sm">
                {price.toLocaleString('vi-VN')}đ
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-t border-white/5">
              <span className="text-white/50 text-xs">Số dư khả dụng</span>
              <span className="text-white/80 font-bold text-xs">
                {balance.toLocaleString('vi-VN')}đ
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-t border-white/5">
              <span className="text-white/50 text-xs">Số dư còn lại</span>
              <span
                className={`font-black text-xs ${balance - price < 0 ? 'text-red-400' : 'text-emerald-400'}`}
              >
                {(balance - price).toLocaleString('vi-VN')}đ
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="w-1/2 py-2.5 px-4 rounded-xl border border-white/10 text-white/60 hover:text-white hover:bg-white/5 transition-all text-xs font-bold uppercase tracking-wider cursor-pointer"
            >
              Hủy
            </button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onConfirm}
              className="w-1/2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-neutral-950 font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(245,158,11,0.2)] hover:from-amber-400 hover:to-yellow-400 transition-all cursor-pointer"
            >
              Xác nhận
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
)

export default DownloadButton
