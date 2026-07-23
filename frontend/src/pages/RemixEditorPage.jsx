import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  ArrowLeft,
  Image as ImageIcon,
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Coins,
  Crown,
  Plus,
  Check,
  ChevronRight,
  Zap,
  Lock
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/api'
import useAuthStore from '../store/auth.store'
import PromptBlock from '../components/post/PromptBlock'
import { PromptField } from './UploadComponents'

// ── Helper: get the best display URL from an image object ──────────────────
const getBestUrl = (img) => {
  if (!img) return null
  if (typeof img === 'string') return img
  return img.previewUrl || img.url || img.thumbnailUrl || null
}

// ── Step Indicator ──────────────────────────────────────────────────────────
const steps = [
  { id: 1, label: 'Tham khảo', shortLabel: '① Ảnh gốc' },
  { id: 2, label: 'Prompt', shortLabel: '② Prompt' },
  { id: 3, label: 'Kết quả', shortLabel: '③ Kết quả' },
  { id: 4, label: 'Đăng bài', shortLabel: '④ Publish' },
]

// ── AI Check badge ──────────────────────────────────────────────────────────
function AiCheckBadge({ decision }) {
  if (!decision) return null
  const cfg = {
    pass: { bg: 'bg-emerald-500/10 border-emerald-500/25', text: 'text-emerald-400', icon: <CheckCircle size={14} />, label: 'Đạt chuẩn' },
    warning: { bg: 'bg-amber-500/10 border-amber-500/25', text: 'text-amber-400', icon: <AlertTriangle size={14} />, label: 'Cảnh báo' },
    reject: { bg: 'bg-red-500/10 border-red-500/25', text: 'text-red-400', icon: <XCircle size={14} />, label: 'Từ chối' },
  }[decision] || {}
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border ${cfg.bg} ${cfg.text}`}>
      {cfg.icon} {cfg.label}
    </span>
  )
}

export default function RemixEditorPage() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const updateUser = useAuthStore((s) => s.updateUser)

  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)
  const [originalPost, setOriginalPost] = useState(null)

  // Step flow: 1 = ref image, 2 = prompt+check, 3 = generate+results, 4 = publish
  const [step, setStep] = useState(2) // Start at prompt since step 1 is readonly info

  // ── Reference image selection ────────────────────────────────────────────
  // origImages: generatedImages OR sourceImages from original post, shown as reference
  const [origImages, setOrigImages] = useState([])         // kết quả gốc để tham khảo
  const [origSourceImages, setOrigSourceImages] = useState([]) // ảnh gốc/tham khảo của bài gốc
  const [userHistory, setUserHistory] = useState([])        // ảnh kết quả từ bài cũ của user
  const [referenceMode, setReferenceMode] = useState('orig-gen') // 'orig-gen' | 'orig-src' | 'history' | 'none'
  const [selectedHistoryId, setSelectedHistoryId] = useState(null)
  const [activeOrigIdx, setActiveOrigIdx] = useState(0)
  const [loadingHistory, setLoadingHistory] = useState(false)

  const [uploadedRefUrl, setUploadedRefUrl] = useState('')
  const [uploadingRef, setUploadingRef] = useState(false)
  const [uploadingResult, setUploadingResult] = useState(false)

  // ── Generated results list (max 5) ───────────────────────────────────────
  const [genImages, setGenImages] = useState([])  // final result slots (initialised from original post gen images)

  // ── Editor states ─────────────────────────────────────────────────────────
  const [remixPrompt, setRemixPrompt] = useState('')
  const [checkingPrompt, setCheckingPrompt] = useState(false)
  const [promptCheck, setPromptCheck] = useState(null)      // result of free prompt check

  const [generating, setGenerating] = useState(false)
  const [lastGenUrl, setLastGenUrl] = useState('')          // most recent generated image
  const [genAiCheck, setGenAiCheck] = useState(null)       // full AI check from generation
  const [historyVersions, setHistoryVersions] = useState([])

  // ── Publish form ──────────────────────────────────────────────────────────
  const [caption, setCaption] = useState('')
  const [tags, setTags] = useState('')
  const [category, setCategory] = useState('other')
  const [isPremium, setIsPremium] = useState(false)
  const [priceInVnd, setPriceInVnd] = useState(20000)
  const [publishing, setPublishing] = useState(false)
  const [categories, setCategories] = useState(['anime', 'portrait', 'landscape', 'cyberpunk', 'fantasy', 'realistic', 'other'])

  // Derived: is any AI operation in progress?
  const isBusy = checkingPrompt || generating
  const isPublished = session?.status === 'published'

  useEffect(() => {
    fetchSession()
    api.get('/categories').then(({ data }) => {
      if (data?.categories?.length) setCategories(data.categories.map(c => c.name || c))
    }).catch(() => {})
  }, [sessionId])

  const hasDirtyData = useMemo(() => {
    if (isPublished) return false
    const promptDirty = remixPrompt.trim().length > 0
    const imagesDirty = genImages.some(img => img.isNewGenerated)
    const origCaption = originalPost?.caption || 'Untitled'
    const username = user?.username || 'user'
    const defaultCaption = `${origCaption}\n\n— remix by @${username}`
    const captionDirty = caption.trim() !== defaultCaption.trim()
    return promptDirty || imagesDirty || captionDirty
  }, [isPublished, remixPrompt, genImages, caption, originalPost, user])

  // ── Block in-app navigation clicks when isBusy or hasDirtyData ───────────
  useEffect(() => {
    if (!isBusy && !hasDirtyData) return

    const handleGlobalClick = (e) => {
      // Tìm xem click có kích hoạt di chuyển trang không (thẻ <a> hoặc nút quay lại)
      const target = e.target.closest('a, button')
      if (!target) return

      const isLink = target.tagName === 'A' || target.getAttribute('href')
      
      // Nếu là link chuyển trang, hiện confirm
      if (isLink) {
        const msg = isBusy
          ? 'AI đang xử lý... Rời trang sẽ mất tiến trình hiện tại. Bạn có chắc chắn muốn rời đi?'
          : 'Bạn có các thay đổi chưa xuất bản. Rời trang bây giờ sẽ hủy phiên Remix hiện tại của bạn. Bạn có chắc chắn muốn rời đi?'
        const ok = window.confirm(msg)
        if (!ok) {
          e.preventDefault()
          e.stopPropagation()
        }
      }
    }

    // Đăng ký ở capture phase để chặn trước React Router RouterProvider click handlers
    document.addEventListener('click', handleGlobalClick, true)
    return () => document.removeEventListener('click', handleGlobalClick, true)
  }, [isBusy, hasDirtyData])

  // ── beforeunload confirm when isBusy or hasDirtyData ─────────────────────
  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (isBusy || hasDirtyData) {
        e.preventDefault()
        e.returnValue = isBusy
          ? 'AI đang xử lý... Rời trang sẽ mất tiến trình hiện tại. Bạn có chắc?'
          : 'Bạn có thay đổi chưa xuất bản. Rời trang sẽ hủy phiên Remix hiện tại của bạn. Bạn có chắc?'
        return e.returnValue
      }
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [isBusy, hasDirtyData])

  const fetchSession = async () => {
    setLoading(true)
    try {
      const { data } = await api.get(`/remix/sessions/${sessionId}`)
      const sess = data.session
      const orig = sess.originalPostId
      setSession(sess)
      setOriginalPost(orig)
      setRemixPrompt(sess.remixPrompt || orig?.prompt || '')

      // Populate generated images from original post (merge generatedImages + modelComparisons, same as ImageGallery)
      const buildAllGenImages = (orig) => {
        const list = []
        // 1. Primary generatedImages
        ;(orig?.generatedImages || []).forEach(img => list.push({ ...img, isPrimary: true }))
        // 2. Fallback: legacyImages
        if (list.length === 0) {
          ;(orig?.images || []).forEach(img => list.push({ ...img, isPrimary: true }))
        }
        // 3. modelComparisons (multi-model)
        if (orig?.isMultiModel && orig?.modelComparisons?.length > 0) {
          orig.modelComparisons.forEach(comp => {
            ;(comp.generatedImages || []).forEach(img => {
              const exists = list.some(e => (e.publicId && e.publicId === img.publicId) || (e.url && e.url === img.url))
              if (!exists) list.push({ ...img, aiTool: comp.aiTool, aiModel: comp.aiModel, isPrimary: false })
            })
          })
        }
        return list
      }

      const allGen = buildAllGenImages(orig)

      console.log('[Remix] orig.generatedImages:', orig?.generatedImages)
      console.log('[Remix] orig.sourceImages:', orig?.sourceImages)
      console.log('[Remix] full orig keys:', orig ? Object.keys(orig) : 'null')
      console.log('[Remix] isMultiModel:', orig?.isMultiModel, 'modelComparisons:', orig?.modelComparisons?.length)
      console.log('[Remix] allGen (merged):', allGen.length, 'images')

      if (allGen.length > 0) {
        setOrigImages(allGen)
      } else {
        console.warn('[Remix] No generated images found in original post!')
      }
      if (orig?.sourceImages?.length) setOrigSourceImages(orig.sourceImages)

      const slots = []
      if (sess.generatedHistory && sess.generatedHistory.length > 0) {
        setHistoryVersions(sess.generatedHistory)
        const lastVer = sess.generatedHistory[sess.generatedHistory.length - 1]
        setLastGenUrl(lastVer.url)
        if (lastVer.aiCheckResult) setGenAiCheck(lastVer.aiCheckResult)
      } else if (sess.remixImageUrl) {
        setLastGenUrl(sess.remixImageUrl)
        setHistoryVersions([{
          url: sess.remixImageUrl,
          prompt: sess.remixPrompt || orig?.prompt || '',
          aiCheckResult: sess.aiCheckResult
        }])
      }
      if (sess.remixImageUrl) {
        slots.push({
          id: `gen-initial`,
          url: sess.remixImageUrl,
          preview: sess.remixImageUrl,
          isNewGenerated: true,
          label: 'Ảnh mới'
        })
      }
      setGenImages(slots)

      if (sess.aiCheckResult) setGenAiCheck(sess.aiCheckResult)
      
      const origCaption = orig?.caption || 'Untitled'
      const username = user?.username || 'user'
      setCaption(`${origCaption}\n\n— remix by @${username}`)
      
      if (orig?.tags?.length) {
        setTags(orig.tags.join(', '))
      }
      setCategory(orig?.category || 'other')

      // Load user's own source history (sourceImages + generatedImages from their previous posts)
      setLoadingHistory(true)
      api.get('/posts/me/source-history').then(({ data: hData }) => {
        if (hData?.sourceHistory?.length) {
          setUserHistory(hData.sourceHistory)
        }
      }).catch(() => {}).finally(() => setLoadingHistory(false))
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể tải thông tin phiên Remix')
      navigate('/')
    } finally {
      setLoading(false)
    }
  }


  // ── Determine the active reference image URL (for generate API) ───────────
  const getActiveRefUrl = useCallback(() => {
    if (referenceMode === 'orig-gen' && origImages[activeOrigIdx || 0]) return getBestUrl(origImages[activeOrigIdx || 0])
    if (referenceMode === 'orig-src' && origSourceImages[0]) return getBestUrl(origSourceImages[0])
    if (referenceMode === 'history' && selectedHistoryId) {
      const h = userHistory.find(x => (x.publicId || x.url) === selectedHistoryId)
      return h?.url || null
    }
    if (referenceMode === 'upload' && uploadedRefUrl) {
      return uploadedRefUrl
    }
    return null
  }, [referenceMode, origImages, origSourceImages, selectedHistoryId, userHistory, uploadedRefUrl, activeOrigIdx])

  // ── Upload reference image file ───────────────────────────────────────────
  const handleUploadRef = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    // Validate size (max 10MB) and type
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Kích thước ảnh tối đa là 10MB')
      return
    }
    if (!file.type.startsWith('image/')) {
      toast.error('Chỉ chấp nhận định dạng ảnh')
      return
    }

    setUploadingRef(true)
    const fd = new FormData()
    fd.append('image', file)

    try {
      const { data } = await api.post('/remix/upload-image', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      if (data.success) {
        setUploadedRefUrl(data.url)
        toast.success('Tải lên ảnh tham khảo thành công! ✓')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Tải ảnh thất bại. Vui lòng thử lại.')
    } finally {
      setUploadingRef(false)
    }
  }

  // ── Upload result image file ──────────────────────────────────────────────
  const handleUploadResult = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (genImages.length >= 5) {
      toast.error('Danh sách ảnh kết quả tối đa 5 ảnh!')
      return
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error('Kích thước ảnh tối đa là 15MB')
      return
    }
    if (!file.type.startsWith('image/')) {
      toast.error('Chỉ chấp nhận định dạng ảnh')
      return
    }

    setUploadingResult(true)
    const fd = new FormData()
    fd.append('image', file)

    try {
      const { data } = await api.post('/remix/upload-image', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      if (data.success) {
        setGenImages(prev => [...prev, {
          id: `upload-gen-${Date.now()}`,
          url: data.url,
          preview: data.url,
          isNewGenerated: true,
          label: `Ảnh tải lên ${prev.length + 1}`
        }])
        toast.success('Thêm ảnh kết quả tải lên thành công! ✓')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Tải ảnh thất bại. Vui lòng thử lại.')
    } finally {
      setUploadingResult(false)
    }
  }

  // ── Step 2: Free prompt check ─────────────────────────────────────────────
  const handleCheckPrompt = async () => {
    if (!remixPrompt.trim()) { toast.error('Vui lòng nhập prompt'); return }
    setCheckingPrompt(true)
    setPromptCheck(null)
    try {
      const { data } = await api.post(`/remix/sessions/${sessionId}/check-prompt`, { prompt: remixPrompt }, { timeout: 60000 })
      setPromptCheck(data.aiCheckResult)
      if (data.aiCheckResult.decision === 'reject') {
        toast.error('Prompt quá giống bản gốc! Thay đổi thêm bối cảnh hoặc phong cách.')
      } else if (data.aiCheckResult.decision === 'warning') {
        toast('⚠️ Prompt có sự tương đồng cao. Hãy chỉnh thêm để an toàn hơn.', { duration: 4000 })
        setStep(3)
      } else {
        toast.success('Prompt đạt chuẩn! ✓ Bạn có thể tạo ảnh.')
        setStep(3)
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi kiểm duyệt prompt')
    } finally {
      setCheckingPrompt(false)
    }
  }

  // ── Step 3: Generate image (costs 10 AI Credits) ─────────────────────────
  const handleGenerate = async () => {
    if (!remixPrompt.trim()) { toast.error('Vui lòng nhập prompt'); return }
    setGenerating(true)
    setLastGenUrl('')
    setGenAiCheck(null)
    try {
      const refUrl = getActiveRefUrl()
      console.log('[Remix] generate — prompt:', remixPrompt.slice(0, 60))
      console.log('[Remix] generate — refUrl:', refUrl)
      console.log('[Remix] generate — sessionId:', sessionId)

      const { data } = await api.post(`/remix/sessions/${sessionId}/generate`, {
        prompt: remixPrompt,
        ...(refUrl ? { sourceImageUrl: refUrl } : {})
      }, {
        timeout: 120000 // 120s timeout for heavy AI generation + checks
      })

      console.log('[Remix] generate — success:', data)
      const newVersion = {
        url: data.imageUrl,
        prompt: remixPrompt,
        aiCheckResult: data.aiCheckResult
      }
      setHistoryVersions(prev => {
        const isExist = prev.some(v => v.url === data.imageUrl)
        if (isExist) return prev
        return [...prev, newVersion]
      })
      setLastGenUrl(data.imageUrl)
      setGenAiCheck(data.aiCheckResult)
      if (data.tokenBalance !== undefined) updateUser({ tokenBalance: data.tokenBalance })
      toast.success('Sinh ảnh thành công! (-10 AI Credits) 🚀')
    } catch (err) {
      console.error('[Remix] generate — error:', err)
      console.error('[Remix] generate — response:', err.response?.data)
      console.error('[Remix] generate — status:', err.response?.status)
      toast.error(err.response?.data?.message || 'Có lỗi khi sinh ảnh')
    } finally {
      setGenerating(false)
    }
  }

  // ── Add generated image to result slots ──────────────────────────────────
  const handleAddToResults = () => {
    if (!lastGenUrl) return
    if (genImages.length >= 5) { toast.error('Danh sách ảnh kết quả tối đa 5 ảnh!'); return }
    const isDup = genImages.some(img => img.url === lastGenUrl)
    if (isDup) { toast.error('Ảnh này đã có trong danh sách kết quả!'); return }
    setGenImages(prev => [...prev, {
      id: `gen-${Date.now()}`,
      url: lastGenUrl,
      preview: lastGenUrl,
      isNewGenerated: true,
      label: `Ảnh mới ${prev.length + 1}`
    }])
    toast.success(`Đã thêm ảnh ${genImages.length + 1}/5 vào danh sách kết quả ✓`)
  }

  // ── Publish ───────────────────────────────────────────────────────────────
  const handlePublish = async (e) => {
    e.preventDefault()
    if (!caption.trim()) { toast.error('Vui lòng nhập mô tả'); return }
    if (genImages.length === 0) { toast.error('Danh sách ảnh kết quả trống'); return }
    const activeCheck = genAiCheck || promptCheck
    if (!activeCheck) { toast.error('Vui lòng kiểm duyệt prompt trước khi đăng'); return }
    if (activeCheck.decision === 'reject') { toast.error('Prompt bị từ chối. Hãy chỉnh lại trước.'); return }

    setPublishing(true)
    try {
      const parsedTags = tags.split(',').map(t => t.trim()).filter(Boolean)
      const { data } = await api.post(`/remix/sessions/${sessionId}/publish`, {
        caption, tags: JSON.stringify(parsedTags), category, isPremium, priceInVnd,
        generatedImages: genImages.map(img => img.url),
        aiTool: session?.remixImageUrl ? 'picspy' : (originalPost?.aiTool || 'picspy')
      })
      toast.success('Đăng bài Remix thành công! 🎉')
      navigate(`/posts/${data.post._id}`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Đăng bài thất bại')
    } finally {
      setPublishing(false)
    }
  }

  const minAllowedPrice = (() => {
    if (!originalPost) return 1000
    const d = originalPost.remixDiscountPercent ?? 10
    return Math.round(((originalPost.priceInVnd || 20000) * (1 - d / 100)) / 1000) * 1000
  })()

  const canPublish = (genAiCheck || promptCheck) && (genAiCheck || promptCheck)?.decision !== 'reject'

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0b0a12] text-white">
        <RefreshCw className="animate-spin text-violet-500 mb-4" size={32} />
        <p className="text-sm text-white/50 tracking-wider font-medium">ĐANG TẢI PHIÊN REMIX...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0b0a12] text-white pb-24 pt-4 px-4 md:px-6" style={{ fontFamily: 'Outfit, sans-serif' }}>
      <div className="max-w-6xl mx-auto space-y-5">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between py-2">
          <button
            onClick={() => {
              if (isBusy || hasDirtyData) {
                const msg = isBusy
                  ? 'AI đang xử lý... Rời trang sẽ mất tiến trình hiện tại. Bạn có chắc?'
                  : 'Bạn có các thay đổi chưa xuất bản. Rời trang bây giờ sẽ hủy phiên Remix hiện tại của bạn. Bạn có chắc chắn muốn rời đi?'
                const ok = window.confirm(msg)
                if (!ok) return
              }
              navigate(-1)
            }}
            className="flex items-center gap-2 text-white/40 hover:text-white transition-colors text-sm font-semibold"
          >
            <ArrowLeft size={15} /> Quay lại
          </button>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-white/60 bg-white/[0.03] border border-white/8 px-3 py-1 rounded-full">
              <Coins size={11} className="text-yellow-400" />
              <span className="font-bold text-yellow-400">{user?.tokenBalance?.toLocaleString() ?? '—'}</span>
              <span className="text-white/40">AI Credits</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-xs font-bold text-violet-400">
              <Sparkles size={11} className="animate-pulse" /> Official Remix
            </div>
          </div>
        </div>

        {/* Warning banner if published */}
        {isPublished && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3">
            <AlertTriangle className="text-amber-400 flex-shrink-0 mt-0.5" size={18} />
            <div>
              <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wide">Phiên Remix đã được đăng tải</h3>
              <p className="text-xs text-white/60 leading-relaxed mt-1">
                Tác phẩm Remix của bạn đã được xuất bản chính thức lên hệ thống. Bạn không thể thực hiện sinh ảnh, kiểm duyệt prompt hay sửa đổi thêm trong phiên này.
              </p>
            </div>
          </div>
        )}

        {/* ── Main grid ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 items-start">

          {/* ──── LEFT COLUMN: Original post info (sticky) ──────────── */}
          <div className="space-y-5 lg:sticky lg:top-4">

            {/* Original post card */}
            <div className="rounded-2xl bg-white/[0.025] border border-white/6 p-5 space-y-4">
              <h2 className="text-sm font-bold text-white/60 uppercase tracking-wider flex items-center gap-2">
                <ImageIcon size={14} className="text-violet-400" /> Tác phẩm gốc
              </h2>
              {/* Main generated image */}
              {origImages[0] && (
                <div className="space-y-2">
                  <div className="aspect-video rounded-xl overflow-hidden bg-[#13121d] relative border border-white/5">
                    <img src={getBestUrl(origImages[activeOrigIdx || 0] || origImages[0])} alt="Original" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    <div className="absolute bottom-3 left-3 flex items-center gap-2">
                      {originalPost?.authorId?.avatar
                        ? <img src={originalPost.authorId.avatar} className="w-7 h-7 rounded-lg object-cover ring-2 ring-violet-500/20" alt="" />
                        : <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center font-bold text-[10px]">
                            {originalPost?.authorId?.username?.[0]?.toUpperCase()}
                          </div>
                      }
                      <div>
                        <p className="text-[10px] font-bold text-white">@{originalPost?.authorId?.username}</p>
                      </div>
                    </div>
                  </div>

                  {/* Thumbnails if original has multiple generated images */}
                  {origImages.length > 1 && (
                    <div className="pt-1">
                      <p className="text-[9px] text-white/30 font-bold uppercase tracking-wider mb-1">
                        Ảnh kết quả gốc ({origImages.length} ảnh)
                      </p>
                      <div className="grid grid-cols-5 gap-1.5">
                        {origImages.map((img, i) => {
                          const isActive = (activeOrigIdx || 0) === i
                          return (
                            <button
                              key={`orig-thumb-${i}`}
                              type="button"
                              onClick={() => setActiveOrigIdx(i)}
                              className={`aspect-square rounded-lg overflow-hidden border transition-all relative ${
                                isActive ? 'border-violet-500 ring-1 ring-violet-500' : 'border-white/8 hover:border-white/20'
                              }`}
                            >
                              <img src={getBestUrl(img)} className="w-full h-full object-cover" alt="" />
                              <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[7px] text-white/80 py-0.5 text-center font-semibold">
                                #{i + 1}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {/* Source/reference image from original post */}
              {origSourceImages[0] && (
                <div>
                  <p className="text-[10px] text-white/30 font-bold uppercase tracking-wider mb-1.5">Ảnh gốc / Tham khảo</p>
                  <div className="h-28 rounded-xl overflow-hidden bg-[#13121d] border border-white/5">
                    <img src={getBestUrl(origSourceImages[0])} alt="Source reference" className="w-full h-full object-cover" />
                  </div>
                </div>
              )}
              {/* Original prompt */}
              <div>
                <p className="text-[10px] text-white/30 font-bold uppercase tracking-wider mb-1.5">Original Prompt</p>
                {originalPost?.prompt && (
                  <PromptBlock text={originalPost.prompt} variant="prompt" collapseAfter={5} parameters={originalPost.parameters} />
                )}
              </div>
              {originalPost?.isPremium && (
                <div className="flex justify-between items-center bg-amber-500/5 border border-amber-500/10 px-3 py-2 rounded-lg text-xs">
                  <span className="text-amber-400/70 flex items-center gap-1"><Crown size={11} /> Bài gốc Premium:</span>
                  <span className="text-amber-300 font-black">{(originalPost.priceInVnd || 0).toLocaleString('vi-VN')} đ</span>
                </div>
              )}
            </div>

            {/* Reference image selector */}
            <div className="rounded-2xl bg-white/[0.025] border border-white/6 p-5 space-y-3">
              <h2 className="text-sm font-bold text-white/60 uppercase tracking-wider flex items-center gap-2">
                <ImageIcon size={14} className="text-violet-400" /> Ảnh tham khảo cho AI
              </h2>
              {/* Lock overlay on whole reference panel when busy or published */}
              <div className={`relative ${(isBusy || isPublished) ? 'pointer-events-none' : ''}`}>
                {(isBusy || isPublished) && (
                  <div className="absolute inset-0 z-10 bg-[#0b0a12]/60 backdrop-blur-[1px] rounded-xl flex items-center justify-center">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20">
                      {isBusy ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            className="flex items-center justify-center text-violet-400"
                          >
                            <RefreshCw size={11} />
                          </motion.div>
                          <span className="text-[10px] font-bold text-violet-300">AI đang xử lý...</span>
                        </>
                      ) : (
                        <>
                          <Lock size={11} className="text-amber-400" />
                          <span className="text-[10px] font-bold text-amber-350">Phiên đã kết thúc</span>
                        </>
                      )}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'orig-gen', label: 'Ảnh kết quả gốc', show: origImages.length > 0 },
                    { id: 'orig-src', label: 'Ảnh gốc/tham khảo', show: origSourceImages.length > 0 },
                    { id: 'history', label: 'Ảnh cũ của tôi', show: true },
                    { id: 'upload', label: 'Tải lên từ máy', show: true },
                    { id: 'none', label: 'Không dùng ảnh', show: true },
                  ].filter(o => o.show).map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={isBusy || isPublished}
                      onClick={() => setReferenceMode(opt.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all text-xs font-semibold
                        ${referenceMode === opt.id
                          ? 'border-violet-500/70 bg-violet-500/12 text-violet-300'
                          : 'border-white/8 bg-white/[0.02] text-white/50 hover:border-white/20'
                        } ${(isBusy || isPublished) ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                    >
                      {referenceMode === opt.id && <Check size={10} className="inline mr-1" />}
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview of selected reference (Hidden-based list to avoid reflow lag) */}
              <div className={referenceMode === 'orig-gen' && origImages.length > 0 ? 'space-y-2' : 'hidden'}>
                <p className="text-[9px] text-white/30 font-bold uppercase tracking-wider">
                  {origImages.length} ảnh kết quả gốc — chọn ảnh tham khảo
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                  {origImages.map((img, i) => {
                    const url = getBestUrl(img)
                    const isActive = i === 0  // default active is first
                    return (
                      <div key={i} className={`aspect-square rounded-xl overflow-hidden border bg-[#13121d] relative
                        ${isActive ? 'border-violet-500/60 ring-1 ring-violet-500/20' : 'border-white/5'}`}>
                        <img src={url} className="w-full h-full object-cover" alt={`Ảnh ${i + 1}`} loading="lazy" />
                        {isActive && <span className="absolute top-1.5 left-1.5 bg-violet-600/90 text-[8px] font-bold px-1.5 py-0.5 rounded-full">Đang dùng</span>}
                        <span className="absolute bottom-0 inset-x-0 bg-black/70 text-[8px] text-white/60 text-center py-0.5">Ảnh {i + 1}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className={referenceMode === 'orig-src' && origSourceImages.length > 0 ? 'space-y-2' : 'hidden'}>
                <p className="text-[9px] text-white/30 font-bold uppercase tracking-wider">{origSourceImages.length} ảnh tham khảo gốc</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {origSourceImages.map((img, i) => (
                    <div key={i} className={`aspect-square rounded-xl overflow-hidden border bg-[#13121d] relative
                      ${i === 0 ? 'border-indigo-500/60 ring-1 ring-indigo-500/20' : 'border-white/5'}`}>
                      <img src={getBestUrl(img)} className="w-full h-full object-cover" alt={`Ảnh tham khảo ${i + 1}`} loading="lazy" />
                      {i === 0 && <span className="absolute top-1.5 left-1.5 bg-indigo-600/90 text-[8px] font-bold px-1.5 py-0.5 rounded-full">Đang dùng</span>}
                      <span className="absolute bottom-0 inset-x-0 bg-black/70 text-[8px] text-white/60 text-center py-0.5">Ảnh {i + 1}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className={referenceMode === 'history' ? 'space-y-2' : 'hidden'}>
                {loadingHistory ? (
                  <div className="text-xs text-white/40 flex items-center gap-2 py-2">
                    <RefreshCw className="animate-spin" size={11} /> Đang tải lịch sử...
                  </div>
                ) : userHistory.length > 0 ? (
                  <div>
                    <p className="text-[9px] text-white/30 font-bold uppercase tracking-wider mb-2">
                      {userHistory.length} ảnh trong lịch sử — click để chọn
                    </p>
                    <div className="grid grid-cols-5 gap-1.5 max-h-[280px] overflow-y-auto pr-1
                      [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded">
                      {userHistory.map((img, i) => {
                        const id = img.publicId || img.url
                        const isSelected = selectedHistoryId === id
                        return (
                          <button
                            key={id + i}
                            type="button"
                            title={img.postCaption || img.linkedPosts?.[0]?.caption || ''}
                            onClick={() => setSelectedHistoryId(id)}
                            className={`aspect-square rounded-lg overflow-hidden border transition-all cursor-pointer relative group
                              ${isSelected ? 'border-violet-500 ring-1 ring-violet-500/30' : 'border-white/5 opacity-60 hover:opacity-100'}`}
                          >
                            <img src={img.url} className="w-full h-full object-cover" alt="" loading="lazy" />
                            {isSelected && (
                              <div className="absolute inset-0 bg-violet-600/25 flex items-center justify-center">
                                <Check size={12} className="text-white" />
                              </div>
                            )}
                            {/* Type badge */}
                            <span className={`absolute top-0.5 left-0.5 text-[6px] font-bold px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity
                              ${img.type === 'generated' ? 'bg-violet-600/90' : 'bg-emerald-600/90'} text-white`}>
                              {img.type === 'generated' ? 'AI' : 'SRC'}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                    {selectedHistoryId && (() => {
                      const sel = userHistory.find(x => (x.publicId || x.url) === selectedHistoryId)
                      return sel ? (
                        <div className="mt-2 flex items-center gap-2 p-2 rounded-lg bg-violet-500/8 border border-violet-500/15">
                          <img src={sel.url} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" alt="" />
                          <div>
                            <p className="text-[9px] text-violet-300 font-bold">Đã chọn</p>
                            <p className="text-[9px] text-white/40 line-clamp-1">{sel.postCaption || sel.linkedPosts?.[0]?.caption}</p>
                          </div>
                        </div>
                      ) : null
                    })()}
                  </div>
                ) : (
                  <p className="text-xs text-white/30 py-2 text-center">
                    Chưa có lịch sử ảnh AI nào. Hãy tạo bài đăng AI trước!
                  </p>
                )}
              </div>

              {/* Upload ref tab */}
              <div className={referenceMode === 'upload' ? 'space-y-3' : 'hidden'}>
                <p className="text-[9px] text-white/30 font-bold uppercase tracking-wider">Tải lên ảnh tham khảo mới</p>
                <div className="relative border border-dashed border-white/10 rounded-xl p-4 bg-white/[0.01] hover:bg-white/[0.02] transition-all flex flex-col items-center justify-center gap-2">
                  {uploadingRef ? (
                    <div className="flex flex-col items-center gap-2 py-4">
                      <RefreshCw size={24} className="animate-spin text-violet-400" />
                      <span className="text-xs text-white/50">Đang tải ảnh lên...</span>
                    </div>
                  ) : uploadedRefUrl ? (
                    <div className="w-full space-y-2">
                      <div className="h-40 rounded-lg overflow-hidden border border-white/5 bg-[#13121d] relative">
                        <img src={uploadedRefUrl} className="w-full h-full object-cover" alt="Uploaded Reference" />
                        <button
                          type="button"
                          onClick={() => setUploadedRefUrl('')}
                          className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-500 p-1.5 rounded-full text-white transition-all cursor-pointer"
                        >
                          <XCircle size={14} />
                        </button>
                      </div>
                      <p className="text-[10px] text-emerald-400 font-bold text-center">✓ Đã sử dụng ảnh làm tham khảo cho AI</p>
                    </div>
                  ) : (
                    <label className="w-full py-4 flex flex-col items-center justify-center gap-2 cursor-pointer">
                      <Plus size={20} className="text-white/30" />
                      <span className="text-xs text-white/50 font-bold">Chọn ảnh từ thiết bị</span>
                      <span className="text-[9px] text-white/30">Hỗ trợ JPG, PNG, WEBP (Tối đa 10MB)</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleUploadRef}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className={referenceMode === 'none' ? 'space-y-1' : 'hidden'}>
                <p className="text-xs text-white/30 py-1">AI sẽ sinh ảnh thuần dựa trên prompt, không kèm ảnh tham khảo.</p>
              </div>
            </div>
          </div>

          {/* ──── RIGHT COLUMN: Remix Editor ────────────────────────── */}
          <div className="space-y-5">

            {/* ─ PROMPT EDITOR ─ */}
            <div className="rounded-2xl bg-white/[0.025] border border-white/6 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-white/60 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles size={14} className="text-violet-400" /> Prompt Remix Editor
                </h2>
                {promptCheck && <AiCheckBadge decision={promptCheck.decision} />}
              </div>

              {/* Prompt field with lock overlay while checking, generating or published */}
              <div className="relative">
                {(isBusy || isPublished) && (
                  <div className="absolute inset-0 z-20 rounded-xl overflow-hidden pointer-events-auto">
                    {/* Frosted backdrop */}
                    <div className="absolute inset-0 bg-[#0d0d14]/70 backdrop-blur-[2px] rounded-xl" />
                    {/* Shimmer sweep */}
                    <div
                      className="absolute inset-0 rounded-xl"
                      style={{
                        background: 'linear-gradient(105deg, transparent 40%, rgba(121,134,235,0.08) 50%, transparent 60%)',
                        backgroundSize: '200% 100%',
                        animation: 'ai-shimmer 1.6s ease-in-out infinite',
                      }}
                    />
                    {/* Center indicator */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                      <div className="relative">
                        {isBusy ? (
                          <>
                            <div className="w-9 h-9 rounded-full border-2 border-[#7986eb]/30 border-t-[#7986eb] animate-spin" />
                            <Sparkles
                              size={14}
                              className="absolute inset-0 m-auto text-[#a5b0f5]"
                              style={{ animation: 'pulse 1.6s ease-in-out infinite' }}
                            />
                          </>
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-amber-500/10 border border-amber-500/25 flex items-center justify-center">
                            <Lock size={16} className="text-amber-400 animate-pulse" />
                          </div>
                        )}
                      </div>
                      <p className={`text-xs font-bold tracking-wide ${isPublished ? 'text-amber-400' : 'text-[#a5b0f5]'}`}>
                        {checkingPrompt ? 'AI đang kiểm duyệt prompt...' : generating ? 'AI đang sinh ảnh...' : 'Phiên Remix đã kết thúc'}
                      </p>
                      <p className="text-[10px] text-white/30">
                        {isPublished ? 'Bạn không thể chỉnh sửa prompt của phiên đã publish.' : 'Vui lòng chờ trong giây lát'}
                      </p>
                    </div>
                  </div>
                )}
                <PromptField
                  value={remixPrompt}
                  onChange={(isBusy || isPublished) ? () => {} : (val) => setRemixPrompt(val)}
                  label="Prompt"
                  placeholder="Nhập prompt tiếng Anh để tạo bản Remix..."
                  maxLength={5000}
                />
              </div>

              {/* Prompt check result detail */}
              {promptCheck && (
                <div className="space-y-3 p-3.5 rounded-xl bg-black/30 border border-white/5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider">Kết quả Kiểm duyệt Prompt</span>
                    <AiCheckBadge decision={promptCheck.decision} />
                  </div>
                  {promptCheck.message && (
                    <p className={`text-xs leading-relaxed ${promptCheck.decision === 'reject' ? 'text-red-400/80' : promptCheck.decision === 'warning' ? 'text-amber-400/80' : 'text-emerald-400/80'}`}>
                      {promptCheck.message}
                    </p>
                  )}
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <p className="text-[9px] text-white/30 mb-0.5">Prompt Similarity</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${promptCheck.semanticScore >= 88 ? 'bg-red-500' : promptCheck.semanticScore >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            style={{ width: `${promptCheck.semanticScore}%` }}
                          />
                        </div>
                        <span className={`text-xs font-black ${promptCheck.semanticScore >= 88 ? 'text-red-400' : promptCheck.semanticScore >= 80 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {promptCheck.semanticScore}%
                        </span>
                      </div>
                    </div>
                  </div>
                  {/* Changed categories */}
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(promptCheck.changedCategories || {}).map(([key, changed]) => (
                      <span key={key} className={`px-2 py-0.5 rounded-full text-[9px] font-bold border capitalize
                        ${changed ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-white/2 border-white/5 text-white/25'}`}>
                        {changed ? '✓' : '✗'} {key}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="space-y-2">
                {/* Primary: Check prompt (free) */}
                <button
                  type="button"
                  onClick={handleCheckPrompt}
                  disabled={checkingPrompt || generating || isPublished}
                  className="w-full py-3 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {checkingPrompt ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="flex items-center justify-center"
                      >
                        <RefreshCw size={14} />
                      </motion.div>
                      <span>Đang kiểm tra...</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} className="text-emerald-400" />
                      <span>Kiểm duyệt Prompt (Miễn phí)</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* ─ GENERATE & RESULTS ─ */}
            <div className="rounded-2xl bg-white/[0.025] border border-white/6 p-5 space-y-4">
              <h2 className="text-sm font-bold text-white/60 uppercase tracking-wider flex items-center gap-2">
                <Zap size={14} className="text-violet-400" /> Tạo ảnh & Quản lý kết quả
                <span className="ml-auto text-[10px] font-normal text-white/30 normal-case tracking-normal">{genImages.length}/5 ảnh kết quả</span>
              </h2>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating || checkingPrompt || isPublished}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-violet-600/20 transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {generating ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="flex items-center justify-center"
                    >
                      <RefreshCw size={15} />
                    </motion.div>
                    <span>Đang vẽ ảnh mới...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={15} className="animate-pulse" />
                    <span>Tạo ảnh ngay &nbsp;<span className="text-violet-200/70 font-normal text-xs">(-10 AI Credits)</span></span>
                  </>
                )}
              </button>

              {/* Generating Loader/Result Block Wrapper (Non-collapsing Height) */}
              <div className="relative min-h-[360px] w-full">
                {/* 1. First-time Generate Loader (Only when generating and no image exists yet) */}
                {generating && !lastGenUrl && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-white/[0.01] border border-white/5 rounded-xl p-8">
                    <div className="relative w-16 h-16 flex items-center justify-center">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                        className="text-violet-500"
                      >
                        <RefreshCw size={48} />
                      </motion.div>
                      <Sparkles className="text-violet-300 absolute animate-pulse" size={18} />
                    </div>
                    <div className="space-y-1 text-center">
                      <p className="text-sm font-bold text-violet-300">AI đang vẽ tác phẩm mới...</p>
                      <p className="text-xs text-white/40">Hệ thống đang trừ 10 AI Credits từ tài khoản của bạn.</p>
                    </div>
                  </div>
                )}

                {/* 2. Main content area (rendered as soon as we have at least one image) */}
                {lastGenUrl && (
                  <div className="relative w-full">
                    <div className={`grid grid-cols-1 md:grid-cols-2 gap-5 transition-all duration-300 ${generating ? 'blur-sm pointer-events-none opacity-40' : ''}`}>
                      {/* Left Column: Image Preview */}
                      <div className="rounded-xl overflow-hidden border border-white/5 bg-[#13121d] relative aspect-square w-full max-w-[320px] mx-auto md:mx-0">
                        <img src={lastGenUrl} className="w-full h-full object-cover" alt="Generated" />
                        <div className="absolute top-2 right-2">
                          {genAiCheck && <AiCheckBadge decision={genAiCheck.decision} />}
                        </div>
                      </div>

                      {/* Right Column: Versions select, Stats, Action buttons */}
                      <div className="flex flex-col justify-between space-y-4">
                        <div className="space-y-3">
                          {/* Versions selection strip */}
                          {historyVersions.length > 0 && (
                            <div className="space-y-1.5 p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                              <div className="flex items-center justify-between px-1">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-violet-400">Các phiên bản đã tạo ({historyVersions.length})</p>
                                <span className="text-[9px] text-white/35">Click để chọn</span>
                              </div>
                              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                                {historyVersions.map((ver, idx) => {
                                  const isActive = lastGenUrl === ver.url
                                  return (
                                    <button
                                      type="button"
                                      key={idx}
                                      onClick={() => {
                                        setLastGenUrl(ver.url)
                                        setRemixPrompt(ver.prompt)
                                        if (ver.aiCheckResult) setGenAiCheck(ver.aiCheckResult)
                                      }}
                                      className={`flex-shrink-0 relative w-12 h-12 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                                        isActive 
                                          ? 'border-violet-500 ring-2 ring-violet-500/20 scale-95' 
                                          : 'border-white/10 hover:border-white/20'
                                      }`}
                                      title={`Phiên bản ${idx + 1}`}
                                    >
                                      <img src={ver.url} className="w-full h-full object-cover" alt="" />
                                      <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
                                        <span className={`text-[9px] font-extrabold ${isActive ? 'text-violet-300' : 'text-white/60'}`}>
                                          V{idx + 1}
                                        </span>
                                      </div>
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          )}

                          {/* AI check details from generation */}
                          {genAiCheck && (
                            <div className="p-3 rounded-xl bg-black/30 border border-white/5 space-y-2">
                              <div className="grid grid-cols-2 gap-2">
                                <div className="p-2.5 rounded-lg bg-white/[0.03]">
                                  <p className="text-[9px] text-white/30">Prompt Similarity</p>
                                  <p className={`text-base font-black ${genAiCheck.semanticScore >= 88 ? 'text-red-400' : genAiCheck.semanticScore >= 80 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                    {genAiCheck.semanticScore}%
                                  </p>
                                </div>
                                <div className="p-2.5 rounded-lg bg-white/[0.03]">
                                  <p className="text-[9px] text-white/30">Image Similarity</p>
                                  <p className={`text-base font-black ${(genAiCheck.imageScore ?? 0) >= 90 ? 'text-red-400' : (genAiCheck.imageScore ?? 0) >= 80 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                    {genAiCheck.imageScore ?? '—'}%
                                  </p>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {Object.entries(genAiCheck.changedCategories || {}).map(([key, changed]) => (
                                  <span key={key} className={`px-1.5 py-0.5 rounded text-[8px] font-bold border capitalize
                                    ${changed ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-white/2 border-white/5 text-white/25'}`}>
                                    {changed ? '✓' : '✗'} {key}
                                  </span>
                                ))}
                              </div>
                              {genAiCheck.message && (
                                <p className="text-[9px] text-white/40 leading-normal">{genAiCheck.message}</p>
                              )}
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={handleAddToResults}
                          disabled={genImages.length >= 5}
                          className="w-full py-2.5 rounded-xl border border-violet-500/40 bg-violet-500/8 hover:bg-violet-500/15 text-violet-300 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                          <Plus size={13} /> Thêm ảnh này vào kết quả ({genImages.length}/5)
                        </button>
                      </div>
                    </div>

                    {/* Translucent overlay loader during subsequent generations */}
                    {generating && (
                      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-[#0b0a12]/75 backdrop-blur-[2px] rounded-xl border border-white/5">
                        <div className="relative w-12 h-12 flex items-center justify-center">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1.0, repeat: Infinity, ease: 'linear' }}
                            className="text-violet-400"
                          >
                            <RefreshCw size={36} />
                          </motion.div>
                          <Sparkles className="text-violet-300 absolute animate-pulse" size={14} />
                        </div>
                        <p className="text-xs font-bold text-violet-300">Đang vẽ phiên bản mới...</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Result slots (always visible now) */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-white/35 uppercase tracking-wider">
                  Danh sách ảnh kết quả ({genImages.length}/5)
                </p>
                <div className="grid grid-cols-5 gap-1.5">
                  {genImages.map((img, i) => (
                    <div key={img.id} className="aspect-square relative group rounded-lg overflow-hidden border border-white/8 bg-[#13121d]">
                      <img src={img.preview || img.url} className="w-full h-full object-cover" alt={img.label || `Ảnh ${i + 1}`} />
                      {img.isNewGenerated && (
                        <span className="absolute top-1 left-1 bg-violet-600/90 text-[7px] font-bold px-1 py-0.5 rounded text-white">MỚI</span>
                      )}
                      <button
                        type="button"
                        onClick={() => setGenImages(prev => prev.filter((_, j) => j !== i))}
                        className="absolute inset-0 bg-red-500/0 hover:bg-red-500/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                      >
                        <XCircle size={18} className="text-white" />
                      </button>
                      <span className="absolute bottom-0 inset-x-0 bg-black/70 text-[8px] text-white/70 text-center py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {i + 1}/{genImages.length} — Click xoá
                      </span>
                    </div>
                  ))}
                  {/* Clickable empty slots to upload image directly */}
                  {Array.from({ length: 5 - genImages.length }).map((_, i) => {
                    const isFirstEmpty = i === 0
                    return (
                      <label
                        key={`empty-${i}`}
                        className={`aspect-square rounded-lg border border-dashed transition-all flex flex-col items-center justify-center relative
                          ${isFirstEmpty && !uploadingResult
                            ? 'border-violet-500/30 hover:border-violet-500/60 bg-white/[0.01] hover:bg-white/[0.03] cursor-pointer'
                            : 'border-white/8 bg-white/[0.005] cursor-not-allowed'}`}
                      >
                        {isFirstEmpty && uploadingResult ? (
                          <RefreshCw size={12} className="animate-spin text-violet-400" />
                        ) : (
                          <>
                            <Plus size={14} className={isFirstEmpty ? 'text-violet-400/50' : 'text-white/10'} />
                            {isFirstEmpty && <span className="text-[7px] text-violet-400/60 font-bold mt-1">Tải lên</span>}
                          </>
                        )}
                        {isFirstEmpty && !uploadingResult && (
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleUploadResult}
                            className="hidden"
                          />
                        )}
                      </label>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* ─ PUBLISH FORM (visible only when check passed/warning) ─ */}
            {canPublish && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl bg-white/[0.025] border border-white/6 p-5"
              >
                <form onSubmit={handlePublish} className="space-y-4">
                  <h2 className="text-sm font-bold text-white/60 uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-3">
                    <CheckCircle size={14} className="text-emerald-400" /> Đăng tải bản Remix
                  </h2>

                  <div>
                    <label className="text-[10px] font-bold text-white/35 uppercase tracking-wider block mb-1.5">Mô tả</label>
                    <input
                      type="text" required value={caption} onChange={e => setCaption(e.target.value)}
                      placeholder="Mô tả cho bản Remix..."
                      className="w-full bg-black/40 border border-white/8 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-violet-500/50"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-white/35 uppercase tracking-wider block mb-1.5">Tags</label>
                      <input
                        type="text" value={tags} onChange={e => setTags(e.target.value)}
                        placeholder="remix, neon, cyberpunk"
                        className="w-full bg-black/40 border border-white/8 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-violet-500/50"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-white/35 uppercase tracking-wider block mb-1.5">Danh mục</label>
                      <select
                        value={category} onChange={e => setCategory(e.target.value)}
                        className="w-full bg-black/40 border border-white/8 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-violet-500/50 appearance-none capitalize"
                      >
                        {categories.map(c => <option key={c} value={c} className="bg-[#161426] capitalize">{c}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-black/30 border border-white/5">
                    <span className="text-xs text-white/50 font-medium">Bán Premium?</span>
                    <button
                      type="button" onClick={() => setIsPremium(!isPremium)}
                      className={`w-10 h-5 rounded-full transition-colors relative ${isPremium ? 'bg-amber-500' : 'bg-white/10'}`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${isPremium ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </div>

                  {isPremium && (
                    <div className="space-y-2 p-3.5 rounded-xl bg-amber-500/[0.03] border border-amber-500/10">
                      <div className="flex justify-between text-xs">
                        <span className="text-white/50">Giá bán</span>
                        <span className="text-amber-400 font-bold">{priceInVnd.toLocaleString('vi-VN')} đ</span>
                      </div>
                      <input
                        type="range" min={minAllowedPrice} max={1000000} step={5000} value={priceInVnd}
                        onChange={e => setPriceInVnd(Number(e.target.value))}
                        className="w-full accent-amber-500"
                      />
                      <p className="text-[9px] text-white/30">Giá sàn tối thiểu: {minAllowedPrice.toLocaleString('vi-VN')} đ (chống phá giá tác phẩm gốc)</p>
                    </div>
                  )}

                  <button
                    type="submit" disabled={publishing}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/15 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {publishing
                      ? <><RefreshCw className="animate-spin" size={15} /> Đang đăng bài...</>
                      : <><CheckCircle size={15} /> Publish Remix ({genImages.length} ảnh)</>
                    }
                  </button>
                </form>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
