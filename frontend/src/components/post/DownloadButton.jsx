import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Download,
  Lock,
  Loader2,
  CheckCircle2,
  Images,
  Package,
} from 'lucide-react'
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
  onPurchased, // callback(fileType) when a new purchase is made
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

  // ── Local purchased state — tracks ownership within this session ──────────
  //
  // CRITICAL DESIGN:
  //   • Initialized from server-provided post.purchasedFileTypes on mount
  //   • After a successful purchase we ADD the fileType here immediately
  //     so the button shows "Đã sở hữu" without a page reload
  //   • We NEVER shrink this set during the session (refund requires navigation)
  //   • We ONLY reset this set when the user switches to a DIFFERENT post
  //     (postId changes) — prevents refreshMe() re-renders from wiping state
  //
  const [localPurchasedTypes, setLocalPurchasedTypes] = useState(
    () => post?.purchasedFileTypes || []
  )
  // Ref keeps the latest value so setTimeout callbacks never read stale state
  const localPurchasedTypesRef = useRef(localPurchasedTypes)
  useEffect(() => {
    localPurchasedTypesRef.current = localPurchasedTypes
  }, [localPurchasedTypes])

  const trackedPostIdRef = useRef(postId)

  useEffect(() => {
    const serverTypes = post?.purchasedFileTypes || []

    if (trackedPostIdRef.current !== postId) {
      // Different post → full reset from server data
      console.log(
        '[DownloadButton] postId changed → resetting purchasedTypes',
        { postId, serverTypes }
      )
      trackedPostIdRef.current = postId
      setLocalPurchasedTypes(serverTypes)
    } else {
      // Same post → MERGE only (never shrink). This ensures refreshMe() re-renders
      // or parent re-renders can only ADD server-known purchases, never remove local ones.
      setLocalPurchasedTypes((prev) => {
        if (serverTypes.length === 0) return prev // server returned nothing new — keep local
        const merged = Array.from(new Set([...prev, ...serverTypes]))
        if (merged.length === prev.length) return prev // no change — skip re-render
        console.log(
          '[DownloadButton] merging server purchasedTypes into local',
          { prev, serverTypes, merged }
        )
        return merged
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId, post?.purchasedFileTypes])

  // Creator owns this post — treat as already purchased for all file types
  const isOwner =
    !!user &&
    !!post?.authorId &&
    (user._id === post.authorId || user._id === post.authorId?._id)

  // ── Collection detection ─────────────────────────────────────
  const isCollection =
    !!post?.isCollection && (post?.generatedImages?.length || 0) > 1
  const collectionImages = isCollection ? post.generatedImages || [] : []
  const collectionCount = collectionImages.length

  // Use local state so the button reflects purchase immediately after download
  const purchasedTypes = localPurchasedTypes

  // Count unowned images in collection
  const unownedImages = collectionImages.filter((_, idx) => {
    if (isOwner) return false
    return !purchasedTypes.includes(`gen_${idx}`)
  })
  const unownedCount = unownedImages.length

  // Bundle price: price * unownedCount * 0.7, rounded to nearest 1000
  const bundlePrice = isCollection
    ? Math.round((priceInVnd * unownedCount * 0.7) / 1000) * 1000
    : priceInVnd

  const originalPriceOfUnowned = priceInVnd * unownedCount

  const hasAttachments =
    !!post?.rawFile ||
    !!post?.colorFile ||
    !!post?.sourceImages?.[0] ||
    (post?.modelComparisons && post.modelComparisons.length > 0)

  const getAvailableFileTypes = () => {
    if (isCollection) {
      // For collections: each image is gen_0, gen_1, ..., plus 'bundle'
      return [...collectionImages.map((_, idx) => `gen_${idx}`), 'bundle']
    }
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

  // Check if a specific fileType is purchased
  const isTypePurchased = (ft) => {
    if (isOwner) return true
    if (purchasedTypes.includes('bundle')) return true // bundle covers all
    if (ft === 'bundle') {
      return (
        purchasedTypes.includes('bundle') ||
        (collectionCount > 0 &&
          collectionImages.every((_, idx) =>
            purchasedTypes.includes(`gen_${idx}`)
          ))
      )
    }
    return purchasedTypes.includes(ft)
  }

  // Owner always treated as having purchased everything
  const isAllPurchased =
    isOwner ||
    (isPremium &&
      (isCollection
        ? isTypePurchased('bundle')
        : availableTypes.every((type) => purchasedTypes.includes(type))))

  // Debug log — helps trace when isAllPurchased flips unexpectedly
  if (process.env.NODE_ENV !== 'production') {
    console.log('[DownloadButton] render', {
      postId,
      isAllPurchased,
      purchasedTypes,
      isOwner,
      'post.purchasedFileTypes': post?.purchasedFileTypes,
    })
  }

  // ── Download individual file ─────────────────────────────────
  const doDownload = async (fileType = selectedFileType) => {
    setShowConfirm(false)
    setLoading(true)
    try {
      const { data } = await api.post(`/posts/${postId}/download`, { fileType })

      // ─── Bundle: download multiple files sequentially ──────────
      if (data.isBundle && data.downloadItems) {
        toast.success(`Đang tải ${data.downloadItems.length} ảnh...`, {
          duration: 3000,
        })
        for (const item of data.downloadItems) {
          await downloadFile(item.downloadUrl, item.filename)
          await new Promise((r) => setTimeout(r, 300)) // small delay between downloads
        }
        setDone(true)
        setTimeout(() => setDone(false), 4000)
        if (data.vndSpent > 0) {
          // Mark bundle as purchased locally BEFORE anything else
          setLocalPurchasedTypes((prev) => {
            const updated = [...prev]
            if (!updated.includes('bundle')) updated.push('bundle')
            collectionImages.forEach((_, idx) => {
              if (!updated.includes(`gen_${idx}`)) updated.push(`gen_${idx}`)
            })
            console.log(
              '[DownloadButton] bundle purchased → localPurchasedTypes:',
              updated
            )
            return updated
          })
          onPurchased?.('bundle')
          toast.success(
            `Mua thành công cả bộ sưu tập! Đã trừ ${data.vndSpent.toLocaleString('vi-VN')}đ`,
            { duration: 5000 }
          )
          await refreshMe()
        } else {
          toast.success(`Đã tải ${data.downloadItems.length} ảnh thành công!`)
        }
        onUnlock?.()
        return
      }

      // ─── Single file download ──────────────────────────────────
      if (data.downloadUrl) {
        let filename = data.filename
        if (!filename) {
          filename = `picspy-${postId}`
          if (fileType === 'original' || fileType.startsWith('gen_')) {
            const idx = fileType.startsWith('gen_')
              ? parseInt(fileType.replace('gen_', ''))
              : 0
            const img = post?.generatedImages?.[idx]
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

        await downloadFile(data.downloadUrl, filename)

        // Call unlock callback
        onUnlock?.()

        // ─── OWNERSHIP UPDATE ──────────────────────────────────────────
        // A successful downloadUrl means user is entitled to this file.
        // Update ownership state NOW regardless of vndSpent — this covers:
        //   • New purchase  (vndSpent > 0)
        //   • Re-download   (vndSpent = 0, alreadyPurchased: true)
        //   • Token-based   (tokensSpent > 0)
        if (isPremium && !isOwner) {
          setLocalPurchasedTypes((prev) => {
            if (prev.includes(fileType)) return prev
            const next = [...prev, fileType]
            console.log(
              '[DownloadButton] premium download OK → marking owned:',
              {
                fileType,
                next,
                vndSpent: data.vndSpent,
                alreadyOwned: data.vndSpent === 0 && data.tokensSpent === 0,
              }
            )
            return next
          })
          // Notify parent so it can update its post state (profile tab etc.)
          onPurchased?.(fileType)
        }

        // ─── TOAST + BALANCE SYNC ────────────────────────────────────
        if (data.tokensSpent > 0) {
          toast.success(
            `Mua thành công! Đã trừ ${data.tokensSpent} AI Credits.`,
            { duration: 4000 }
          )
          await refreshMe()
        } else if (data.vndSpent > 0) {
          toast.success(
            `Mua thành công! Đã trừ ${data.vndSpent.toLocaleString('vi-VN')}đ.`,
            { duration: 4000 }
          )
          // Refresh balance — localPurchasedTypes already updated above
          await refreshMe()
        } else {
          // Re-download of already-owned file — no charge, no toast needed
        }

        // Show done state AFTER all state updates are queued
        setDone(true)
        setTimeout(() => {
          console.log(
            '[DownloadButton] done timer fired. localPurchasedTypesRef.current:',
            localPurchasedTypesRef.current
          )
          setDone(false)
        }, 3000)
      } // end if (data.downloadUrl)
    } catch (err) {
      const errData = err.response?.data
      if (err.response?.status === 402) {
        if (errData?.error === 'INSUFFICIENT_TOKENS') {
          toast.error(
            `Không đủ AI Credits! Cần ${errData.required} AI Credits, bạn có ${errData.balance} AI Credits.`,
            { duration: 5000 }
          )
        } else {
          toast.error(errData?.message || 'Cần AI Credits để tải tệp này')
        }
      } else {
        toast.error(errData?.message || 'Không thể tải tệp')
      }
    } finally {
      setLoading(false)
    }
  }

  const downloadFile = async (url, filename) => {
    const a = document.createElement('a')
    try {
      const response = await fetch(url)
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
      a.href = url
      a.download = filename
      a.target = '_blank'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
  }

  const handleInitiateDownload = (fileType) => {
    if (!isLoggedIn) {
      toast('Đăng nhập để tải tệp 💜', { icon: '🔒' })
      return
    }

    setSelectedFileType(fileType)

    const purchased = isTypePurchased(fileType)
    if (isPremium && !purchased) {
      const price = fileType === 'bundle' ? bundlePrice : priceInVnd
      const balance = user?.vndBalance || 0
      if (balance < price) {
        toast.error(
          `Không đủ số dư ví! Cần ${price.toLocaleString('vi-VN')}đ, số dư hiện tại: ${balance.toLocaleString('vi-VN')}đ.`
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
    if (isCollection || hasAttachments) {
      setDropdownOpen((prev) => !prev)
    } else {
      handleInitiateDownload('original')
    }
  }

  // ── Render dropdown item (generic) ──────────────────────────
  const renderDropdownItem = (label, fileType, mediaItem, price) => {
    const purchased = isTypePurchased(fileType)
    const isBundleType = fileType === 'bundle'
    return (
      <button
        key={fileType}
        onClick={() => {
          setDropdownOpen(false)
          handleInitiateDownload(fileType)
        }}
        className={`flex items-center justify-between gap-3 w-full px-3 py-2 rounded-xl text-xs text-white/80 hover:text-white transition-colors text-left group
          ${isBundleType ? 'border border-amber-500/20 hover:border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10 mt-1' : 'hover:bg-white/5'}`}
      >
        <div className="flex items-center gap-2 truncate">
          {isBundleType ? (
            <Package size={14} className="text-amber-400 flex-shrink-0" />
          ) : (
            <Download
              size={14}
              className="text-white/40 flex-shrink-0 group-hover:text-white/60"
            />
          )}
          <span
            className={`truncate ${isBundleType ? 'text-amber-300 font-semibold' : ''}`}
          >
            {formatItemText(label, mediaItem)}
          </span>
        </div>
        {isPremium &&
          (purchased ? (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-500/15 text-green-400 font-semibold flex-shrink-0">
              Đã mua
            </span>
          ) : (
            <span
              className={`text-[9px] px-1.5 py-0.5 rounded font-semibold flex-shrink-0
              ${
                isBundleType
                  ? 'bg-amber-500/20 text-amber-300'
                  : 'bg-white/10 text-white/60'
              }`}
            >
              {(price || priceInVnd).toLocaleString('vi-VN')}đ
            </span>
          ))}
      </button>
    )
  }

  // ── Render collection dropdown ───────────────────────────────
  const renderCollectionDropdown = () => {
    const bundlePurchased = isTypePurchased('bundle')
    return (
      <AnimatePresence>
        {dropdownOpen && (
          <>
            {/* Click outside overlay */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setDropdownOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 bottom-full mb-2 bg-[#1a1a2e]/98 backdrop-blur border border-white/10 rounded-2xl p-2 shadow-2xl min-w-[300px] z-50 flex flex-col gap-0.5"
            >
              {/* Header */}
              <div className="flex items-center gap-2 px-2 py-1.5 mb-1">
                <Images size={13} className="text-brand-400" />
                <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider">
                  Bộ sưu tập · {collectionCount} ảnh
                </span>
              </div>

              {/* Bundle option (mua cả bộ hoặc tải cả bộ đã sở hữu) */}
              {isPremium && !isOwner && (
                <div className="px-1 mb-1">
                  {bundlePurchased || unownedCount === 0 ? (
                    <button
                      onClick={() => {
                        setDropdownOpen(false)
                        handleInitiateDownload('bundle')
                      }}
                      className="flex items-center justify-between gap-3 w-full px-3 py-2.5 rounded-xl border border-green-500/20 hover:border-green-500/40 bg-green-500/5 hover:bg-green-500/10 mt-1 transition-all text-left group"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Package
                          size={14}
                          className="text-green-400 flex-shrink-0"
                        />
                        <span className="text-green-300 font-bold text-xs truncate">
                          Tải toàn bộ sưu tập
                        </span>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-500/15 text-green-400 font-semibold flex-shrink-0">
                        Đã mua
                      </span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setDropdownOpen(false)
                        handleInitiateDownload('bundle')
                      }}
                      className="flex flex-col gap-1 w-full px-3 py-2.5 rounded-xl border border-amber-500/20 hover:border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10 mt-1 transition-all text-left group"
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2 truncate">
                          <Package
                            size={14}
                            className="text-amber-400 flex-shrink-0"
                          />
                          <span className="text-amber-300 font-bold text-xs">
                            Mua cả bộ sưu tập (tiết kiệm 30%)
                          </span>
                        </div>
                        <div className="flex flex-col items-end flex-shrink-0">
                          <span className="text-[10px] text-white/40 line-through">
                            {originalPriceOfUnowned.toLocaleString('vi-VN')}đ
                          </span>
                          <span className="text-[11px] font-extrabold text-amber-400">
                            {bundlePrice.toLocaleString('vi-VN')}đ
                          </span>
                        </div>
                      </div>

                      <div className="text-[9px] text-white/35 flex items-center gap-1 mt-0.5">
                        <span>Chi tiết:</span>
                        <span className="font-medium text-white/50">
                          {priceInVnd.toLocaleString('vi-VN')}đ × {unownedCount}{' '}
                          ảnh chưa mua × 70%
                        </span>
                      </div>
                    </button>
                  )}
                </div>
              )}

              {/* Divider */}
              {isPremium && !isOwner && (
                <div className="border-t border-white/5 mx-1 mb-1" />
              )}

              {/* Individual images */}
              <div className="flex flex-col gap-0.5 max-h-[240px] overflow-y-auto px-1">
                {collectionImages.map((img, idx) =>
                  renderDropdownItem(
                    `Ảnh ${idx + 1}`,
                    `gen_${idx}`,
                    img,
                    priceInVnd
                  )
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    )
  }

  const renderDropdown = () => {
    if (isCollection) return renderCollectionDropdown()
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

  // ── Button label logic ────────────────────────────────────────
  const getButtonLabel = () => {
    if (done) return 'Đã tải!'
    if (isCollection) {
      if (isOwner) return `Tải bộ sưu tập (${collectionCount} ảnh)`
      if (dropdownOpen) return 'Đóng menu'
      if (isPremium && !isAllPurchased)
        return `Sở hữu bộ sưu tập · ${bundlePrice.toLocaleString('vi-VN')}đ`
      return `Tải bộ sưu tập (${collectionCount} ảnh)`
    }
    if (hasAttachments && dropdownOpen) return 'Đóng menu'
    if (hasAttachments) return isAllPurchased ? 'Đã sở hữu' : 'Tải xuống...'
    if (isPremium && !isAllPurchased)
      return `Sở hữu Premium · ${priceInVnd.toLocaleString('vi-VN')}đ`
    return isAllPurchased ? 'Đã sở hữu' : 'Tải miễn phí'
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
          ) : isCollection ? (
            <Images size={16} />
          ) : isPremium && !isOwner ? (
            <Lock size={16} />
          ) : (
            <Download size={16} />
          )}
        </motion.button>

        {renderDropdown()}

        <ConfirmModal
          open={showConfirm}
          price={selectedFileType === 'bundle' ? bundlePrice : priceInVnd}
          balance={user?.vndBalance || 0}
          isBundle={selectedFileType === 'bundle'}
          collectionCount={collectionCount}
          onConfirm={() => doDownload(selectedFileType)}
          onCancel={() => setShowConfirm(false)}
          loading={loading}
        />
      </div>
    )
  }

  // ─── Detail variant (dùng trong detail page) ──────────────────
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
          ) : isCollection ? (
            <Images size={16} />
          ) : isPremium && !isAllPurchased ? (
            <Lock size={16} className="stroke-[2.5]" />
          ) : (
            <Download size={16} />
          )}

          {getButtonLabel()}
        </motion.button>

        {renderDropdown()}

        <ConfirmModal
          open={showConfirm}
          price={selectedFileType === 'bundle' ? bundlePrice : priceInVnd}
          balance={user?.vndBalance || 0}
          isBundle={selectedFileType === 'bundle'}
          collectionCount={collectionCount}
          onConfirm={() => doDownload(selectedFileType)}
          onCancel={() => setShowConfirm(false)}
          loading={loading}
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
        ) : isCollection ? (
          <Images size={14} />
        ) : isPremium && !isAllPurchased ? (
          <Lock size={14} className="stroke-[2.5]" />
        ) : (
          <Download size={14} />
        )}
        {done
          ? 'Đã tải!'
          : isCollection
            ? isOwner
              ? `Bộ sưu tập (${collectionCount} ảnh)`
              : isAllPurchased
                ? `Đã sở hữu (${collectionCount} ảnh)`
                : isPremium
                  ? `Sở hữu · ${bundlePrice.toLocaleString('vi-VN')}đ`
                  : `Tải (${collectionCount} ảnh)`
            : hasAttachments
              ? isAllPurchased
                ? 'Đã sở hữu'
                : 'Tải xuống'
              : isPremium && !isAllPurchased
                ? `Sở hữu · ${priceInVnd.toLocaleString('vi-VN')}đ`
                : isAllPurchased
                  ? 'Đã sở hữu'
                  : 'Tải miễn phí'}
      </motion.button>

      {renderDropdown()}

      <ConfirmModal
        open={showConfirm}
        price={selectedFileType === 'bundle' ? bundlePrice : priceInVnd}
        balance={user?.vndBalance || 0}
        isBundle={selectedFileType === 'bundle'}
        collectionCount={collectionCount}
        onConfirm={() => doDownload(selectedFileType)}
        onCancel={() => setShowConfirm(false)}
        loading={loading}
      />
    </div>
  )
}

/* ─── Confirm Purchase Dialog ───────────────────────────────── */
const ConfirmModal = ({
  open,
  price,
  balance,
  onConfirm,
  onCancel,
  isBundle,
  collectionCount,
  loading,
}) => (
  <AnimatePresence>
    {open && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
        onClick={(e) => e.target === e.currentTarget && !loading && onCancel()}
      >
        <motion.div
          initial={{ scale: 0.95, y: 15 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 15 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="relative bg-[#121225]/95 border border-white/10 rounded-[2rem] p-6 max-w-sm w-full shadow-2xl noise"
        >
          <div className="text-center mb-5">
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4
              ${isBundle ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400' : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'}`}
            >
              {isBundle ? (
                <Package size={24} className="stroke-[2]" />
              ) : (
                <Lock size={24} className="stroke-[2]" />
              )}
            </div>
            <h3 className="text-lg font-bold text-white mb-1">
              {isBundle ? 'Mua cả bộ sưu tập' : 'Xác nhận sở hữu'}
            </h3>
            <p className="text-white/40 text-xs">
              {isBundle
                ? `Sở hữu ${collectionCount} ảnh với giá ưu đãi 30%`
                : 'Mở khóa tệp chất lượng gốc'}
            </p>
          </div>

          <div className="space-y-2 mb-6 bg-white/[0.02] border border-white/5 rounded-2xl p-4">
            {isBundle && (
              <div className="flex justify-between items-center py-1.5">
                <span className="text-white/50 text-xs">Số ảnh</span>
                <span className="text-white/80 font-bold text-xs">
                  {collectionCount} ảnh
                </span>
              </div>
            )}
            <div className="flex justify-between items-center py-1.5 border-t border-white/5 first:border-0">
              <span className="text-white/50 text-xs">
                {isBundle ? 'Giá bộ sưu tập (ưu đãi 30%)' : 'Giá sở hữu'}
              </span>
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
              disabled={loading}
              className="w-1/2 py-2.5 px-4 rounded-xl border border-white/10 text-white/60 hover:text-white hover:bg-white/5 transition-all text-xs font-bold uppercase tracking-wider cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Hủy
            </button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onConfirm}
              disabled={loading}
              className="w-1/2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-neutral-950 font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(245,158,11,0.2)] hover:from-amber-400 hover:to-yellow-400 transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading && (
                <Loader2 size={13} className="animate-spin text-neutral-950" />
              )}
              <span>Xác nhận</span>
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
)

export default DownloadButton
