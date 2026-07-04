import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutGrid,
  Clock,
  CheckCircle,
  XCircle,
  EyeOff,
  Heart,
  Download,
  Pencil,
  Trash2,
  X,
  Tag,
  ChevronDown,
  RefreshCw,
  ImageOff,
  GitCompare,
  PlusCircle,
  Plus,
  Link,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/api'
import { useSettings } from '../context/SettingsContext'
import { getOptimizedWebpUrl } from '../utils/imageUrl'
import { ImageDropZone, SourceHistoryPanel, ModelSlot } from './UploadComponents.jsx'
import { deduplicateByPublicId, fileToPreview } from './uploadConstants.js'


// ─── Constants ─────────────────────────────────────────────
const STATUS_CONFIG = {
  pending: {
    label: 'Chờ duyệt',
    icon: Clock,
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/15 border-yellow-500/30',
    dot: 'bg-yellow-400',
  },
  approved: {
    label: 'Đã duyệt',
    icon: CheckCircle,
    color: 'text-green-400',
    bg: 'bg-green-500/15 border-green-500/30',
    dot: 'bg-green-400',
  },
  rejected: {
    label: 'Bị từ chối',
    icon: XCircle,
    color: 'text-red-400',
    bg: 'bg-red-500/15 border-red-500/30',
    dot: 'bg-red-400',
  },
  hidden: {
    label: 'Đã ẩn',
    icon: EyeOff,
    color: 'text-white/40',
    bg: 'bg-white/5 border-white/10',
    dot: 'bg-white/40',
  },
}

// ── Fallback categories (khi API chưa load xong) ───────────────
const FALLBACK_CATEGORIES = [
  { slug: 'nature',   name: '🌿 Thiên nhiên' },
  { slug: 'anime',    name: '🎌 Anime' },
  { slug: 'minimal',  name: '◻️ Minimal' },
  { slug: 'abstract', name: '🎨 Abstract' },
  { slug: 'city',     name: '🌃 Thành phố' },
  { slug: 'space',    name: '🚀 Vũ trụ' },
  { slug: 'dark',     name: '🌑 Dark' },
  { slug: 'light',    name: '☀️ Light' },
  { slug: 'gradient', name: '🌈 Gradient' },
  { slug: 'other',    name: '✨ Khác' },
]

// ─── Skeleton Card ──────────────────────────────────────────
const SkeletonCard = () => (
  <div className="rounded-2xl bg-surface-50 overflow-hidden border border-white/5 p-0 space-y-0">
    <div className="aspect-square skeleton w-full" />
    <div className="p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="h-4 skeleton rounded-lg w-16" />
        <div className="h-3 skeleton rounded w-12" />
      </div>
      <div className="h-4 skeleton rounded-lg w-full mt-2" />
    </div>
  </div>
)

// ─── Status Badge ───────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending
  const Icon = cfg.icon
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${cfg.bg} ${cfg.color}`}
    >
      <Icon size={11} />
      {cfg.label}
    </span>
  )
}

// ─── Edit Modal ─────────────────────────────────────────────
const AI_TOOL_OPTIONS = [
  'midjourney','dalle-3','stable-diffusion','flux',
  'gemini-nano-banana-pro','gemini-nano-banana-2',
  'chatgpt','seedream','grok',
]

const EditModal = ({ post, onClose, onSave, categories = FALLBACK_CATEGORIES }) => {
  const [tab, setTab]     = useState('info')   // 'info' | 'ai' | 'images' | 'pricing'
  const [form, setForm]   = useState({
    // Info tab
    caption:        post.caption        || '',
    category:       post.category       || '',
    tags:           post.tags           || [],
    // AI tab
    prompt:         post.prompt         || '',
    negativePrompt: post.negativePrompt || '',
    aiTool:         post.aiTool         || '',
    aiModel:        post.aiModel        || '',
    parameters:     post.parameters     || '',
    // Pricing tab
    isPremium:       post.isPremium       || false,
    priceInVnd:      post.priceInVnd      || 20000,
  })
  const [tag, setTag]       = useState('')
  const [saving, setSaving] = useState(false)

  // ── States cho ảnh trong EditModal ──────────────────────────────────
  const [multiModelMode, setMultiModelMode] = useState(post.isMultiModel || false)

  // Khởi tạo sourceImages cũ từ post.sourceImages
  const [sourceImages, setSourceImages] = useState(() => {
    return (post.sourceImages || []).map(img => ({
      id: img.publicId || Math.random().toString(),
      preview: img.url,
      url: img.url,
      publicId: img.publicId,
      isOld: true
    }))
  })

  // Khởi tạo genImages cũ từ post.generatedImages
  const [genImages, setGenImages] = useState(() => {
    return (post.generatedImages || []).map(img => ({
      id: img.publicId || Math.random().toString(),
      preview: img.url,
      url: img.url,
      publicId: img.publicId,
      isOld: true
    }))
  })

  // Khởi tạo modelSlots từ post.modelComparisons và post.generatedImages
  const [modelSlots, setModelSlots] = useState(() => {
    if (post.isMultiModel) {
      // Kiểm tra xem post.modelComparisons[0] có trùng với post.generatedImages[0] không
      const firstCompImg = post.modelComparisons?.[0]?.generatedImages?.[0];
      const firstGenImg = post.generatedImages?.[0];
      const isSlot0Included = firstCompImg && firstGenImg && (
        (firstCompImg.publicId && firstCompImg.publicId === firstGenImg.publicId) ||
        (firstCompImg.url && firstCompImg.url === firstGenImg.url)
      );

      if (isSlot0Included) {
        // Đã bao gồm slot 0, chỉ cần map trực tiếp modelComparisons
        return (post.modelComparisons || []).map((s, idx) => ({
          id: `slot-${idx}-${Date.now()}-${Math.random()}`,
          aiTool: s.aiTool || '',
          aiModel: s.aiModel || '',
          genImages: (s.generatedImages || []).map(img => ({
            id: img.publicId || Math.random().toString(),
            preview: img.url,
            url: img.url,
            publicId: img.publicId,
            isOld: true
          }))
        }));
      } else {
        // Chưa bao gồm slot 0, tạo slot 0 từ generatedImages/aiTool/aiModel chính
        const slot0 = {
          id: `slot-0-${Date.now()}-${Math.random()}`,
          aiTool: post.aiTool || '',
          aiModel: post.aiModel || '',
          genImages: (post.generatedImages || []).map(img => ({
            id: img.publicId || Math.random().toString(),
            preview: img.url,
            url: img.url,
            publicId: img.publicId,
            isOld: true
          }))
        };

        const otherSlots = (post.modelComparisons || []).map((s, idx) => ({
          id: `slot-${idx + 1}-${Date.now()}-${Math.random()}`,
          aiTool: s.aiTool || '',
          aiModel: s.aiModel || '',
          genImages: (s.generatedImages || []).map(img => ({
            id: img.publicId || Math.random().toString(),
            preview: img.url,
            url: img.url,
            publicId: img.publicId,
            isOld: true
          }))
        }));

        return [slot0, ...otherSlots];
      }
    }
    
    // Fallback slot nếu post cũ là single model nhưng user chuyển sang multi-model
    return [
      {
        id: `slot-0-${Date.now()}-${Math.random()}`,
        aiTool: post.aiTool || '',
        aiModel: post.aiModel || '',
        genImages: (post.generatedImages || []).map(img => ({
          id: img.publicId || Math.random().toString(),
          preview: img.url,
          url: img.url,
          publicId: img.publicId,
          isOld: true
        }))
      }
    ]
  })

  const [selectedHistoryIds, setSelectedHistoryIds] = useState(new Set())
  const [sourceHistory, setSourceHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [sourceTab, setSourceTab] = useState('upload') // 'upload' | 'history'

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const addTag = () => {
    const t = tag.toLowerCase().trim().replace(/[^a-z0-9_]/g, '')
    if (t && !form.tags.includes(t) && form.tags.length < 10) set('tags', [...form.tags, t])
    setTag('')
  }

  // ── Image handlers ──────────────────────────────────────────────────
  const addSourceImages = useCallback((files) => {
    const totalCount = sourceImages.length + selectedHistoryIds.size
    const remaining = 5 - totalCount
    if (remaining <= 0) return toast.error('Tối đa 5 ảnh tham khảo')
    const toAdd = files.slice(0, remaining).map(fileToPreview)
    setSourceImages(prev => [...prev, ...toAdd])
  }, [sourceImages.length, selectedHistoryIds.size])

  const removeSourceImage = useCallback((id) => {
    setSourceImages(prev => {
      const img = prev.find(i => i.id === id)
      if (img && !img.isOld) URL.revokeObjectURL(img.preview)
      return prev.filter(i => i.id !== id)
    })
  }, [])

  const addGenImages = useCallback((files) => {
    const remaining = 5 - genImages.length
    if (remaining <= 0) return toast.error('Tối đa 5 ảnh kết quả')
    const toAdd = files.slice(0, remaining).map(fileToPreview)
    setGenImages(prev => [...prev, ...toAdd])
  }, [genImages.length])

  const removeGenImage = useCallback((id) => {
    setGenImages(prev => {
      const img = prev.find(i => i.id === id)
      if (img && !img.isOld) URL.revokeObjectURL(img.preview)
      return prev.filter(i => i.id !== id)
    })
  }, [])

  const setGenImageAsPrimary = useCallback((id) => {
    setGenImages(prev => {
      const idx = prev.findIndex(img => img.id === id)
      if (idx <= 0) return prev
      const next = [...prev]
      const [target] = next.splice(idx, 1)
      next.unshift(target)
      return next
    })
  }, [])

  const setPrimarySlot = useCallback((slotIdx) => {
    if (slotIdx <= 0) return
    setModelSlots(prev => {
      const next = [...prev]
      const [target] = next.splice(slotIdx, 1)
      next.unshift(target)
      return next
    })
  }, [])

  const setPrimaryImageInSlot = useCallback((slotIdx, imgId) => {
    setModelSlots(prev => {
      const next = [...prev]
      const slot = next[slotIdx]
      if (!slot) return prev
      const idx = slot.genImages.findIndex(img => img.id === imgId)
      if (idx <= 0) return prev
      
      const newImages = [...slot.genImages]
      const [target] = newImages.splice(idx, 1)
      newImages.unshift(target)
      
      next[slotIdx] = { ...slot, genImages: newImages }
      return next
    })
  }, [])

  const updateModelSlot = useCallback((i, updated) => setModelSlots(prev => prev.map((s, idx) => idx === i ? updated : s)), [])
  const removeModelSlot = useCallback((i) => setModelSlots(prev => {
    prev[i].genImages?.forEach(img => {
      if (!img.isOld) URL.revokeObjectURL(img.preview)
    })
    return prev.filter((_, idx) => idx !== i)
  }), [])
  const addModelSlot = useCallback(() => {
    if (modelSlots.length >= 5) return toast.error('Tối đa 5 model')
    setModelSlots(prev => [...prev, { id: `slot-${Date.now()}`, aiTool: '', aiModel: '', genImages: [] }])
  }, [modelSlots.length])

  const toggleHistoryImage = useCallback((img) => {
    setSelectedHistoryIds(prev => {
      const next = new Set(prev)
      if (next.has(img.publicId)) {
        next.delete(img.publicId)
      } else {
        const totalCount = sourceImages.length + next.size
        if (totalCount >= 5) {
          toast.error('Tối đa 5 ảnh tham khảo')
          return prev
        }
        next.add(img.publicId)
      }
      return next
    })
  }, [sourceImages.length])

  // Tải lịch sử ảnh tham khảo
  useEffect(() => {
    if (tab === 'images' && sourceTab === 'history' && sourceHistory.length === 0) {
      setHistoryLoading(true)
      api.get('/posts/me', { params: { limit: 50 } })
        .then(({ data }) => {
          const allSrcs = (data.posts || [])
            .flatMap(p => p.sourceImages || [])
            .filter(img => img && img.publicId)
          setSourceHistory(deduplicateByPublicId(allSrcs))
        })
        .catch(() => toast.error('Không thể tải lịch sử ảnh'))
        .finally(() => setHistoryLoading(false))
    }
  }, [tab, sourceTab, sourceHistory.length])

  // Revoke preview URLs khi đóng modal
  const handleClose = () => {
    sourceImages.forEach(img => { if (!img.isOld && img.preview) URL.revokeObjectURL(img.preview) })
    genImages.forEach(img => { if (!img.isOld && img.preview) URL.revokeObjectURL(img.preview) })
    modelSlots.forEach(s => s.genImages?.forEach(img => { if (!img.isOld && img.preview) URL.revokeObjectURL(img.preview) }))
    onClose()
  }

  const handleSave = async () => {
    // ── Helpers ─────────────────────────────────────────────────
    // Strip "programming/junk" special chars; keep letters (incl. Vietnamese), numbers,
    // spaces, and natural punctuation: . , ! ? ; : ' " - ( ) & @ # _
    const JUNK_CHARS = /[%$^*+=\[\]{}<>|\\\/~`]/g
    const PROMPT_JUNK_CHARS = /[%$^|~`]/g // Cho phép các ký tự { } [ ] < > = + * \ / phục vụ bôi đen keyword

    const stripJunk = (text) => text.replace(JUNK_CHARS, '').replace(/\s+/g, ' ').trim()
    const hasJunk = (text) => JUNK_CHARS.test(text)
    const hasJunkPrompt = (text) => PROMPT_JUNK_CHARS.test(text)

    const hasRealContent = (text, isPrompt = false) => {
      if (!text) return false
      const currentJunk = isPrompt ? PROMPT_JUNK_CHARS : JUNK_CHARS
      // Strip spaces + natural punctuation, require ≥2 meaningful chars remain
      const core = text.replace(/[\s.,!?;:'"()\-&@#_]+/g, '').replace(currentJunk, '')
      return core.length >= 2
    }

    // ── Validate + sanitize Mô tả (caption) ─────────────────────
    if (!form.caption.trim()) return toast.error('Vui lòng nhập Mô tả cho bài đăng.')
    if (hasJunk(form.caption)) {
      return toast.error('Mô tả chứa ký tự không hợp lệ (%, $, ^, *, +, =, [, ], {, }, <, >, |, \\, /). Vui lòng chỉ sử dụng chữ cái, số và dấu câu thông thường.')
    }
    if (!hasRealContent(form.caption, false)) {
      return toast.error('Mô tả phải chứa nội dung có nghĩa (ít nhất 2 ký tự chữ/số). Không được chỉ toàn dấu cách hoặc ký tự đặc biệt.')
    }

    if (!form.category) return toast.error('Vui lòng chọn danh mục')

    // ── Detect AI post (hỗ trợ cả bài cũ không có postType) ─────
    const isAiPost = post.postType === 'ai'
      || !!post.aiTool
      || (post.generatedImages?.length > 0)

    if (isAiPost) {
      if (!form.prompt.trim()) {
        return toast.error('Bài đăng AI bắt buộc phải có Prompt. Vui lòng chuyển sang tab "✦ AI & Prompt" và nhập Prompt.')
      }
      if (hasJunkPrompt(form.prompt)) {
        return toast.error('Prompt chứa ký tự không hợp lệ (%, $, ^, |, ~, `). Vui lòng chỉ sử dụng chữ cái, số và dấu câu thông thường.')
      }
      if (!hasRealContent(form.prompt, true)) {
        return toast.error('Prompt phải chứa nội dung có nghĩa (ít nhất 2 ký tự chữ/số). Không được chỉ toàn dấu cách hoặc ký tự đặc biệt.')
      }
      const effectiveAiTool = multiModelMode ? modelSlots[0]?.aiTool : form.aiTool
      if (!effectiveAiTool) return toast.error('Bài đăng AI yêu cầu chọn Công cụ AI.')
    }

    // Validate multi-model
    if (multiModelMode) {
      if (modelSlots.length < 2) return toast.error('Cần ít nhất 2 model để so sánh')
      if (modelSlots.some(s => !s.aiTool)) return toast.error('Mỗi model so sánh cần chọn công cụ AI')
      if (modelSlots.some(s => !s.genImages?.length)) return toast.error('Mỗi model cần ít nhất 1 ảnh kết quả')
    } else if (isAiPost) {
      if (genImages.length === 0) return toast.error('Cần ít nhất 1 ảnh kết quả AI')
    }

    setSaving(true)
    try {
      const fd = new FormData()
      
      // Append text fields (use cleaned values)
      fd.append('caption', stripJunk(form.caption))
      fd.append('category', form.category)
      fd.append('tags', JSON.stringify(form.tags))
      if (form.prompt.trim()) fd.append('prompt', stripJunk(form.prompt))
      if (form.negativePrompt.trim()) fd.append('negativePrompt', form.negativePrompt.trim())
      // Only append aiTool if it has a valid value (avoid sending empty string that fails enum validation)
      const aiToolValue = multiModelMode ? (modelSlots[0].aiTool || '') : form.aiTool
      if (aiToolValue) fd.append('aiTool', aiToolValue)
      if (!multiModelMode && form.aiModel.trim()) fd.append('aiModel', form.aiModel.trim())
      if (form.parameters.trim()) fd.append('parameters', form.parameters.trim())
      fd.append('isPremium', String(form.isPremium))
      fd.append('priceInVnd', String(Number(form.priceInVnd)))

      // ── Xử lý ảnh gốc (Source Images) ──
      // Cũ được giữ lại
      const keepSourceImagePublicIds = sourceImages.filter(img => img.isOld).map(img => img.publicId)
      fd.append('keepSourceImagePublicIds', JSON.stringify(keepSourceImagePublicIds))
      
      // Mới upload
      sourceImages.filter(img => !img.isOld).forEach(img => {
        fd.append('sourceImages', img.file)
      })

      // Chọn từ lịch sử
      if (selectedHistoryIds.size > 0) {
        const refs = sourceHistory.filter(img => selectedHistoryIds.has(img.publicId))
          .map(({ url, publicId, width, height, fileSize, format, thumbnailUrl }) => ({
            url, publicId, width, height, fileSize, format, thumbnailUrl
          }))
        fd.append('sourceImageRefs', JSON.stringify(refs))
      }

      // ── Xử lý ảnh kết quả & Multi-model ──
      if (multiModelMode) {
        const comparisonsPayload = modelSlots.map((s, idx) => ({
          aiTool: s.aiTool,
          aiModel: s.aiModel || undefined,
          slotIndex: idx,
          keepImagePublicIds: s.genImages.filter(img => img.isOld).map(img => img.publicId)
        }))
        fd.append('modelComparisons', JSON.stringify(comparisonsPayload))
        
        // Append các file mới cho model slot
        modelSlots.forEach((s, idx) => {
          s.genImages.filter(img => !img.isOld).forEach(img => {
            fd.append(`compImages_${idx}`, img.file)
          })
        })
      } else {
        const keepGeneratedImagePublicIds = genImages.filter(img => img.isOld).map(img => img.publicId)
        fd.append('keepGeneratedImagePublicIds', JSON.stringify(keepGeneratedImagePublicIds))
        
        // Append các file mới
        genImages.filter(img => !img.isOld).forEach(img => {
          fd.append('generatedImages', img.file)
        })
      }

      const { data } = await api.put(`/posts/${post._id}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      toast.success('Đã cập nhật bài đăng ✓')
      onSave(data.post)
      handleClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cập nhật thất bại')
    } finally {
      setSaving(false)
    }
  }

  const TABS = [
    { id: 'info',    label: '📋 Thông tin' },
    { id: 'ai',      label: '✦ AI & Prompt' },
    { id: 'images',  label: '🖼️ Hình ảnh' },
    { id: 'pricing', label: '💎 Giá' },
  ]

  // Xác định preview ở panel bên trái
  const getPrimaryPreviewUrl = () => {
    if (multiModelMode) {
      const firstSlotImg = modelSlots[0]?.genImages?.[0]
      if (firstSlotImg?.preview) return firstSlotImg.preview
      const remoteUrl = firstSlotImg?.url || post.generatedImages?.[0]?.url || post.images?.[0]?.url
      return getOptimizedWebpUrl(remoteUrl, 600)
    }
    if (genImages[0]?.preview) return genImages[0].preview
    const remoteUrl = genImages[0]?.url || post.generatedImages?.[0]?.url || post.images?.[0]?.url
    return getOptimizedWebpUrl(remoteUrl, 600)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', damping: 20 }}
        className="card w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col md:flex-row"
      >
        {/* ── Left: Image preview (sticky on desktop) ── */}
        <div className="hidden md:flex md:w-[320px] lg:w-[380px] shrink-0 bg-surface-100/50 flex-col border-r border-white/8 group/leftpreview">
          <div className="relative flex-1 flex items-center justify-center p-5 overflow-hidden">
            <img
              src={getPrimaryPreviewUrl()}
              alt=""
              className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-15 scale-110"
            />
            <img
              src={getPrimaryPreviewUrl()}
              alt={post.caption}
              className="relative z-10 max-h-[70vh] w-auto max-w-full object-contain rounded-xl shadow-2xl"
            />

            {/* Quick edit cover image action overlay */}
            <div className="absolute inset-0 z-20 bg-black/20 opacity-0 group-hover/leftpreview:opacity-100 transition-all duration-500 flex items-center justify-center pointer-events-none">
              <button
                type="button"
                onClick={() => setTab('images')}
                className="pointer-events-auto flex items-center gap-2 px-4 py-2.5 rounded-xl text-white/80 hover:text-white font-semibold text-xs border border-white/15 hover:border-white/40 hover:bg-white/10 shadow-lg transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] scale-90 group-hover/leftpreview:scale-100 cursor-pointer"
                style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  fontFamily: 'Outfit, sans-serif',
                  letterSpacing: '0.03em',
                }}
              >
                <Pencil size={11} className="text-white/60 group-hover/leftpreview:text-white transition-colors" />
                Đổi ảnh preview
              </button>
            </div>
          </div>
          {/* Image info bar */}
          <div className="p-4 border-t border-white/5 space-y-1.5">
            {(multiModelMode ? modelSlots[0]?.aiTool : form.aiTool) && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-white/30 w-12">Tool</span>
                <span className="text-xs text-white/60 font-medium">
                  {multiModelMode ? modelSlots[0]?.aiTool : form.aiTool}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-white/30 w-12">Status</span>
              <StatusBadge status={post.status} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-white/30 w-12">Ngày</span>
              <span className="text-xs text-white/40">{new Date(post.createdAt).toLocaleDateString('vi-VN')}</span>
            </div>
          </div>
        </div>

        {/* ── Right: Form (scrollable) ── */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-brand-600/20 border border-brand-500/30 flex items-center justify-center shrink-0">
                <Pencil size={15} className="text-brand-400" />
              </div>
              <div>
                <h3 className="font-bold text-base">Chỉnh sửa bài đăng</h3>
                <p className="text-[11px] text-white/30 mt-0.5 truncate max-w-[220px]">
                  {post.caption || post.prompt?.slice(0, 40) || 'Không có tiêu đề'}
                </p>
              </div>
            </div>
            <button onClick={handleClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors shrink-0">
              <X size={16} />
            </button>
          </div>

          {/* Mobile-only preview */}
          <div className="md:hidden px-5 pt-4 shrink-0">
            <button
              type="button"
              onClick={() => setTab('images')}
              className="relative w-full h-28 rounded-xl overflow-hidden bg-surface-100 border border-white/5 flex items-center justify-center group text-left cursor-pointer"
            >
              <img
                src={getPrimaryPreviewUrl()}
                alt="" className="absolute inset-0 w-full h-full object-cover blur-xl opacity-30 scale-110"
              />
              <img
                src={getPrimaryPreviewUrl()}
                alt={post.caption} className="relative z-10 h-full w-full object-contain"
              />
              <div className="absolute inset-0 z-20 bg-black/20 flex items-center justify-center">
                <span
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-white/95 font-semibold text-[10px] border border-white/15 shadow-md"
                  style={{
                    background: 'rgba(0, 0, 0, 0.4)',
                    fontFamily: 'Outfit, sans-serif',
                  }}
                >
                  <Pencil size={9} className="text-white/60" />
                  Đổi ảnh preview
                </span>
              </div>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-0.5 px-5 pt-3 shrink-0">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-3 py-2 text-xs font-medium rounded-t-lg transition-all border-b-2 -mb-px
                  ${tab === t.id
                    ? 'border-brand-500 text-brand-400'
                    : 'border-transparent text-white/40 hover:text-white/70'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="border-b border-white/8 mx-5 shrink-0" />

          {/* Scrollable content */}
          <div className="p-5 space-y-4 overflow-y-auto flex-1">

            {/* ── INFO TAB ── */}
            {tab === 'info' && (<>
              <div>
                <label className="input-label">Mô tả</label>
                <textarea className="input resize-none" rows={3} maxLength={500}
                  value={form.caption} onChange={e => set('caption', e.target.value)}
                  placeholder="Mô tả bức ảnh..."
                />
                <p className="text-xs text-white/30 text-right mt-1">{form.caption.length}/500</p>
              </div>

              <div>
                <label className="input-label">Danh mục *</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {categories.map(cat => (
                    <button key={cat.slug} type="button" onClick={() => set('category', cat.slug)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border
                        ${form.category === cat.slug
                          ? 'bg-brand-600 border-brand-500 text-white'
                          : 'bg-surface-100 border-white/10 text-white/60 hover:border-brand-500/50'}`}
                    >{cat.name}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="input-label">Tags ({form.tags.length}/10)</label>
                <div className="flex gap-2 mb-2">
                  <div className="relative flex-1">
                    <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                    <input className="input pl-8 text-sm" placeholder="Nhập tag rồi nhấn Enter..."
                      value={tag} onChange={e => setTag(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag() } }}
                    />
                  </div>
                  <button type="button" onClick={addTag} className="btn-secondary px-3 text-sm">Thêm</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <AnimatePresence>
                    {form.tags.map(t => (
                      <motion.span key={t} initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                        className="flex items-center gap-1 badge-brand text-xs px-2.5 py-1"
                      >
                        #{t}
                        <button onClick={() => set('tags', form.tags.filter(x => x !== t))}><X size={10} /></button>
                      </motion.span>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </>)}

            {/* ── AI TAB ── */}
            {tab === 'ai' && (<>
              <div>
                <label className="input-label">Prompt *</label>
                <textarea className="input resize-none font-mono text-sm" rows={5} maxLength={2000}
                  value={form.prompt} onChange={e => set('prompt', e.target.value)}
                  placeholder="Nhập prompt đã dùng để tạo ảnh..."
                />
                <p className="text-xs text-white/30 text-right mt-1">{form.prompt.length}/2000</p>
              </div>

              <div>
                <label className="input-label">Negative Prompt <span className="text-white/30 font-normal">(tuỳ chọn)</span></label>
                <textarea className="input resize-none font-mono text-sm" rows={3} maxLength={1000}
                  value={form.negativePrompt} onChange={e => set('negativePrompt', e.target.value)}
                  placeholder="ugly, blurry, low quality..."
                />
              </div>

              {!multiModelMode && (
                <div>
                  <label className="input-label">Công cụ AI</label>
                  <div className="relative">
                    <select className="input appearance-none pr-8 text-sm" value={form.aiTool} onChange={e => set('aiTool', e.target.value)}>
                      <option value="">-- Chọn --</option>
                      {AI_TOOL_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                    <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                  </div>
                </div>
              )}

              <div>
                <label className="input-label">Parameters <span className="text-white/30 font-normal">(tuỳ chọn)</span></label>
                <textarea className="input resize-none font-mono text-sm" rows={2}
                  value={form.parameters} onChange={e => set('parameters', e.target.value)}
                  placeholder="--ar 9:16 --v 6 --seed 12345..."
                />
              </div>
            </>)}

            {/* ── IMAGES TAB ── */}
            {tab === 'images' && (
              <div className="space-y-6">
                {/* 1. Phần Ảnh gốc / Ảnh tham khảo */}
                <div className="card p-4 space-y-4 border border-white/5 bg-surface-100/30">
                  <div className="flex justify-between items-center">
                    <label className="input-label font-bold text-sm">Ảnh tham khảo / Ảnh gốc</label>
                    <div className="flex bg-white/5 p-0.5 rounded-lg border border-white/10">
                      <button
                        type="button"
                        onClick={() => setSourceTab('upload')}
                        className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                          sourceTab === 'upload' ? 'bg-brand-600 text-white shadow-sm' : 'text-white/40 hover:text-white/70'
                        }`}
                      >
                        Upload mới
                      </button>
                      <button
                        type="button"
                        onClick={() => setSourceTab('history')}
                        className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                          sourceTab === 'history' ? 'bg-brand-600 text-white shadow-sm' : 'text-white/40 hover:text-white/70'
                        }`}
                      >
                        Từ lịch sử
                      </button>
                    </div>
                  </div>

                  {sourceTab === 'upload' ? (
                    <ImageDropZone
                      images={sourceImages}
                      onAdd={addSourceImages}
                      onRemove={removeSourceImage}
                      max={5 - selectedHistoryIds.size}
                      label="Kéo thả ảnh tham khảo vào đây"
                      hint="Hỗ trợ tối đa 5 ảnh để AI học bố cục, phong cách"
                    />
                  ) : (
                    <SourceHistoryPanel
                      images={sourceHistory}
                      selectedIds={selectedHistoryIds}
                      onToggle={toggleHistoryImage}
                      loading={historyLoading}
                    />
                  )}

                  {/* Hiển thị số ảnh tham khảo hiện tại */}
                  <div className="text-xs text-white/35 flex items-center justify-between pt-1">
                    <span>
                      Đã chuẩn bị:{' '}
                      <span className="text-brand-400 font-semibold">
                        {sourceImages.length + selectedHistoryIds.size} / 5
                      </span>{' '}
                      ảnh tham khảo
                    </span>
                    {selectedHistoryIds.size > 0 && (
                      <span className="text-brand-300">({selectedHistoryIds.size} từ lịch sử)</span>
                    )}
                  </div>
                </div>

                {/* 2. Phần Ảnh kết quả AI */}
                <div className="card p-4 space-y-4 border border-white/5 bg-surface-100/30">
                  <div className="flex justify-between items-center">
                    <label className="input-label font-bold text-sm">Ảnh kết quả AI</label>
                    
                    <button
                      type="button"
                      onClick={() => setMultiModelMode(v => !v)}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold transition-all border
                        ${multiModelMode
                          ? 'bg-purple-600/25 border-purple-500/50 text-purple-300 shadow-lg shadow-purple-500/10'
                          : 'bg-white/5 border-white/10 text-white/40 hover:border-purple-500/30 hover:text-purple-300'}`}
                    >
                      <GitCompare size={13} />
                      « So sánh nhiều model »
                    </button>
                  </div>

                  {multiModelMode ? (
                    <div className="space-y-3">
                      <p className="text-xs text-white/35">
                        Thêm ít nhất 2 model — mỗi card có công cụ AI và ảnh riêng để người dùng dễ so sánh.
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <AnimatePresence mode="popLayout">
                          {modelSlots.map((slot, index) => (
                            <ModelSlot
                              key={slot.id}
                              slot={slot}
                              index={index}
                              onUpdate={updateModelSlot}
                              onRemove={removeModelSlot}
                              canRemove={modelSlots.length > 2}
                              onSetPrimarySlot={setPrimarySlot}
                              onSetPrimaryImage={setPrimaryImageInSlot}
                            />
                          ))}
                        </AnimatePresence>

                        {modelSlots.length < 5 && (
                          <motion.button
                            layout
                            type="button"
                            onClick={addModelSlot}
                            className="card p-4 border-2 border-dashed border-white/8 hover:border-white/20 flex flex-col items-center justify-center gap-2 h-[156px] text-white/40 hover:text-white/80 transition-colors"
                          >
                            <Plus size={20} />
                            <span className="text-xs font-semibold">Thêm model</span>
                          </motion.button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <ImageDropZone
                      images={genImages}
                      onAdd={addGenImages}
                      onRemove={removeGenImage}
                      onSetPrimary={setGenImageAsPrimary}
                      max={5}
                      label="Kéo thả ảnh kết quả AI của bạn vào đây"
                      hint="Upload 1–5 ảnh kết quả tốt nhất của bạn"
                      required
                    />
                  )}
                </div>
              </div>
            )}

            {/* ── PRICING TAB ── */}
            {tab === 'pricing' && (<>
              <div>
                <label className="input-label">Loại bài đăng</label>
                <div className="flex gap-3 mt-2">
                  {[
                    { val: false, label: '🆓 Miễn phí', desc: 'Ai cũng tải được' },
                    { val: true,  label: '💎 Premium',  desc: 'Dùng token để tải' },
                  ].map(opt => (
                    <button key={String(opt.val)} type="button" onClick={() => set('isPremium', opt.val)}
                      className={`flex-1 p-3 rounded-xl border text-left transition-all
                        ${form.isPremium === opt.val
                          ? 'border-brand-500 bg-brand-500/10'
                          : 'border-white/10 bg-surface-100 hover:border-white/20'}`}
                    >
                      <p className={`text-sm font-bold ${form.isPremium === opt.val ? 'text-brand-300' : 'text-white/70'}`}>{opt.label}</p>
                      <p className="text-xs text-white/30 mt-0.5">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {form.isPremium && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <label className="input-label">Giá bán (VNĐ)</label>
                  <div className="flex items-center gap-3 mt-2">
                    <input type="range" min={1000} max={200000} step={5000}
                      value={form.priceInVnd} onChange={e => set('priceInVnd', Number(e.target.value))}
                      className="flex-1 accent-brand-500"
                    />
                    <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-100 border border-white/10 min-w-[100px] justify-center">
                      <span className="text-emerald-400 text-sm">đ</span>
                      <span className="font-bold text-sm">{form.priceInVnd?.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-white/25 mt-1 px-1">
                    <span>1.000đ</span><span>100.000đ</span><span>200.000đ</span>
                  </div>
                </motion.div>
              )}

              <div className="rounded-xl bg-surface-50 border border-white/5 p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/40">Trạng thái</span>
                  <span className={form.isPremium ? 'text-yellow-400 font-medium' : 'text-green-400 font-medium'}>
                    {form.isPremium ? '💎 Premium' : '🆓 Miễn phí'}
                  </span>
                </div>
                {form.isPremium && (
                  <div className="flex justify-between">
                    <span className="text-white/40">Giá niêm yết</span>
                    <span className="font-bold">{form.priceInVnd?.toLocaleString()} VNĐ</span>
                  </div>
                )}
              </div>
            </>)}
          </div>

          {/* Footer */}
          <div className="flex gap-3 p-5 border-t border-white/10 shrink-0">
            <button onClick={handleClose} className="btn-secondary flex-1" disabled={saving}>Hủy</button>
            <button onClick={handleSave} disabled={saving}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {saving
                ? <motion.div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />
                : '💾 Lưu thay đổi'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Delete Confirm Modal ───────────────────────────────────
const DeleteConfirmModal = ({ post, onClose, onConfirm }) => {
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await api.delete(`/posts/${post._id}`)
      toast.success('Đã xóa bài đăng')
      onConfirm(post._id)
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Xóa thất bại')
      setDeleting(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="card p-6 max-w-sm w-full text-center"
      >
        <div className="w-14 h-14 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
          <Trash2 size={24} className="text-red-400" />
        </div>
        <h3 className="font-bold text-lg mb-2">Xóa bài đăng?</h3>
        <p className="text-white/50 text-sm mb-1">
          Hành động này không thể hoàn tác.
        </p>
        <p className="text-white/30 text-xs mb-6">
          Ảnh sẽ bị xóa khỏi Cloudinary và database.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="btn-secondary flex-1"
            disabled={deleting}
          >
            Hủy
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
          >
            {deleting ? (
              <motion.div
                className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
              />
            ) : (
              <>
                <Trash2 size={14} /> Xóa
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Post Card Animation Variants ────────────────────────────
const postCardVariants = {
  hidden: { opacity: 0, scale: 0.93 },
  visible: (i) => ({
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.45,
      ease: [0.16, 1, 0.3, 1], // Custom cubic-bezier (ease-out expo)
      delay: Math.min(i * 0.03, 0.3),
    },
  }),
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.2, ease: 'easeOut' }
  }
}

// ─── Post Card ──────────────────────────────────────────────
const PostCard = ({ post, onEdit, onDelete, index }) => {
  const img = post.generatedImages?.[0] || post.images?.[0]
  const displayUrl = getOptimizedWebpUrl(img?.thumbnailUrl || img?.url, 400)

  return (
    <motion.div
      layout
      custom={index}
      variants={postCardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      whileHover={{
        y: -6,
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
        borderColor: 'rgba(255, 255, 255, 0.12)'
      }}
      className="group relative rounded-2xl bg-surface-50 overflow-hidden border border-white/5 transition-colors duration-300"
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden border-b border-white/5">
        {displayUrl ? (
          <img
            src={displayUrl}
            alt={post.caption || 'Post'}
            className="w-full h-full object-cover transform group-hover:scale-106 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-surface-100 flex items-center justify-center">
            <ImageOff size={32} className="text-white/20" />
          </div>
        )}

        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]" />

        {/* Action buttons */}
        <div className="absolute top-2.5 right-2.5 flex gap-1.5 opacity-0 group-hover:opacity-100 translate-y-[-4px] group-hover:translate-y-0 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
          <motion.button
            whileHover={{ scale: 1.1, backgroundColor: '#7c3aed' }}
            whileTap={{ scale: 0.92 }}
            onClick={() => onEdit(post)}
            className="w-8 h-8 rounded-xl bg-black/60 backdrop-blur-md flex items-center justify-center border border-white/10 hover:border-white/20 transition-colors"
          >
            <Pencil size={13} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1, backgroundColor: '#dc2626' }}
            whileTap={{ scale: 0.92 }}
            onClick={() => onDelete(post)}
            className="w-8 h-8 rounded-xl bg-black/60 backdrop-blur-md flex items-center justify-center border border-white/10 hover:border-white/20 transition-colors"
          >
            <Trash2 size={13} />
          </motion.button>
        </div>

        {/* Premium badge */}
        {post.isPremium && (
          <div className="absolute top-2.5 left-2.5">
            <span className="badge-warning text-xs px-2.5 py-1 bg-amber-500/10 text-amber-300 border border-amber-500/20 backdrop-blur-md rounded-lg font-medium">💎 Premium</span>
          </div>
        )}

        {/* Bottom stats on hover — opacity only, no translate to avoid layout shift */}
        <div className="absolute bottom-0 left-0 right-0 px-3 py-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 bg-black/55 backdrop-blur-sm px-2 py-1 rounded-lg border border-white/8">
              <Heart size={11} className="text-red-400 fill-red-400 flex-shrink-0" />
              <span className="text-[11px] font-semibold text-white tabular-nums leading-none">
                {(post.stats?.likesCount || 0).toLocaleString()}
              </span>
            </span>
            <span className="flex items-center gap-1 bg-black/55 backdrop-blur-sm px-2 py-1 rounded-lg border border-white/8">
              <Download size={11} className="text-brand-400 flex-shrink-0" />
              <span className="text-[11px] font-semibold text-white tabular-nums leading-none">
                {(post.stats?.downloadsCount || 0).toLocaleString()}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="flex items-center justify-between gap-2">
          <StatusBadge status={post.status} />
          <span className="text-xs text-white/30 font-medium">
            {new Date(post.createdAt).toLocaleDateString('vi-VN')}
          </span>
        </div>
        {post.caption && (
          <p className="text-sm text-white/70 mt-2 line-clamp-1 font-normal">
            {post.caption}
          </p>
        )}
        {post.status === 'rejected' && post.rejectionReason && (
          <p className="text-xs text-red-400/80 mt-1.5 line-clamp-1 font-medium">
            ⚠ {post.rejectionReason}
          </p>
        )}
      </div>
    </motion.div>
  )
}

// ─── Stats Skeleton Row ──────────────────────────────────────
const StatsSkeletonRow = () => (
  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="card p-3 text-center flex flex-col items-center justify-center h-[76px] space-y-1.5">
        <div className="h-7 skeleton rounded-lg w-10" />
        <div className="h-3.5 skeleton rounded w-16" />
      </div>
    ))}
  </div>
)

// ─── Stats Row ──────────────────────────────────────────────
const StatsRow = ({ stats }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.35, ease: 'easeOut' }}
    className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6"
  >
    {[
      { label: 'Tổng cộng', value: stats.total, color: 'text-white' },
      { label: 'Chờ duyệt', value: stats.pending, color: 'text-yellow-400' },
      { label: 'Đã duyệt', value: stats.approved, color: 'text-green-400' },
      { label: 'Từ chối', value: stats.rejected, color: 'text-red-400' },
      { label: 'Đã ẩn', value: stats.hidden, color: 'text-white/40' },
    ].map(({ label, value, color }) => (
      <div key={label} className="card p-3 text-center">
        <p className={`text-2xl font-black mb-0.5 ${color}`}>{value}</p>
        <p className="text-xs text-white/40">{label}</p>
      </div>
    ))}
  </motion.div>
)

// ─── Main Page ──────────────────────────────────────────────
const MyPostsPage = () => {
  const [posts, setPosts] = useState([])
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    hidden: 0,
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeStatus, setActiveStatus] = useState('all')
  const [hasMore, setHasMore] = useState(false)
  const [cursor, setCursor] = useState(null)
  const [editPost, setEditPost] = useState(null)
  const [deletePost, setDeletePost] = useState(null)
  const [initialLoaded, setInitialLoaded] = useState(false)
  const [isTabChanging, setIsTabChanging] = useState(false)
  const [sourceHistory, setSourceHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  // Dynamic categories từ API
  const [categories, setCategories] = useState(FALLBACK_CATEGORIES)

  // Settings context – thời gian kéo dài Skeleton
  const { myPostsSkeletonMs } = useSettings()

  useEffect(() => {
    api.get('/categories')
      .then(({ data }) => {
        if (data.categories?.length > 0) {
          setCategories(data.categories.map(c => ({
            slug: c.slug,
            name: `${c.emoji || ''} ${c.name}`.trim(),
          })))
        }
      })
      .catch(() => {})
  }, [])

  const fetchPosts2 = useCallback(
    async ({ reset = false } = {}) => {
      if (!reset && !hasMore && posts.length > 0) return

      if (reset) {
        setLoading(true)
        setCursor(null)
      }

      try {
        const params = { limit: 12 }
        if (!reset && cursor) params.cursor = cursor
        if (activeStatus !== 'all') params.status = activeStatus

        const { data } = await api.get('/posts/me', { params })

        if (reset) {
          setPosts(data.posts)
        } else {
          setPosts((prev) => [...prev, ...data.posts])
        }

        setStats(data.stats)
        setHasMore(data.pagination.hasMore)
        setCursor(data.pagination.nextCursor)
      } catch (err) {
        toast.error(err.response?.data?.message || 'Không thể tải ảnh')
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [activeStatus, cursor, hasMore, posts.length]
  )

  const activeStatusRef = useRef(activeStatus)
  useEffect(() => {
    activeStatusRef.current = activeStatus
  }, [activeStatus])

  const fetchPosts = useCallback(
    async ({ reset = false } = {}) => {
      const requestedStatus = activeStatus
      console.log("[MyPosts] fetchPosts start:", { reset, requestedStatus, cursor, hasMore })

      if (!reset && !hasMore && posts.length > 0) {
        console.log("[MyPosts] fetchPosts skipped - no reset and no more posts.")
        return
      }

      if (reset) {
        setLoading(true) // Luôn hiện Skeletons khi tải trang và khi chuyển tab
        setCursor(null)
      }

      try {
        const params = { limit: 12 }
        if (!reset && cursor) params.cursor = cursor
        if (activeStatus !== 'all') params.status = activeStatus

        console.log("[MyPosts] API fetching posts with params:", params)
        const { data } = await api.get('/posts/me', { params })

        console.log(`[MyPosts] API response received, starting ${myPostsSkeletonMs}ms skeleton delay...`)
        if (myPostsSkeletonMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, myPostsSkeletonMs))
        }
        console.log(`[MyPosts] Skeleton delay finished.`)

        if (activeStatusRef.current !== requestedStatus) {
          console.warn("[MyPosts] fetchPosts response IGNORED - activeStatus changed from " + requestedStatus + " to " + activeStatusRef.current)
          return
        }

        console.log("[MyPosts] Updating states with fetched posts count:", data.posts?.length)
        if (reset) {
          setPosts(data.posts)
        } else {
          setPosts((prev) => [...prev, ...data.posts])
        }

        setStats(data.stats)
        setHasMore(data.pagination.hasMore)
        setCursor(data.pagination.nextCursor)
      } catch (err) {
        console.error("[MyPosts] fetchPosts error:", err)
        toast.error(err.response?.data?.message || 'Không thể tải ảnh')
      } finally {
        if (activeStatusRef.current === requestedStatus) {
          setLoading(false)
          setIsTabChanging(false)
          setRefreshing(false)
          setInitialLoaded(true)
          console.log("[MyPosts] fetchPosts loading states set to false.")
        }
      }
    },
    [activeStatus, cursor, hasMore, posts.length]
  )

  const fetchSourceHistory = useCallback(async () => {
    const requestedStatus = 'history'
    console.log("[MyPosts] fetchSourceHistory start.")
    setHistoryLoading(true)
    try {
      const { data } = await api.get('/posts/me/source-history')

      console.log(`[MyPosts] History API response received, starting ${myPostsSkeletonMs}ms skeleton delay...`)
      if (myPostsSkeletonMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, myPostsSkeletonMs))
      }
      console.log(`[MyPosts] Skeleton delay finished.`)

      if (activeStatusRef.current !== requestedStatus) {
        console.warn("[MyPosts] fetchSourceHistory response IGNORED - activeStatus changed from " + requestedStatus + " to " + activeStatusRef.current)
        return
      }

      console.log("[MyPosts] Updating sourceHistory state with count:", data.sourceHistory?.length)
      setSourceHistory(data.sourceHistory || [])
    } catch (err) {
      console.error("[MyPosts] fetchSourceHistory error:", err)
      toast.error('Không thể tải lịch sử ảnh gốc')
    } finally {
      if (activeStatusRef.current === requestedStatus) {
        setHistoryLoading(false)
        setRefreshing(false)
        setInitialLoaded(true)
        console.log("[MyPosts] fetchSourceHistory loading states set to false.")
      }
    }
  }, [])

  // Fetch khi filter thay đổi
  useEffect(() => {
    if (activeStatus === 'history') {
      fetchSourceHistory()
    } else {
      fetchPosts({ reset: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStatus])

  const handleRefresh = () => {
    setRefreshing(true)
    if (activeStatus === 'history') {
      fetchSourceHistory()
    } else {
      fetchPosts({ reset: true })
    }
  }

  const handleEditSave = (updatedPost) => {
    setPosts((prev) =>
      prev.map((p) => (p._id === updatedPost._id ? updatedPost : p))
    )
  }

  const handleDeleteConfirm = (deletedId) => {
    setPosts((prev) => prev.filter((p) => p._id !== deletedId))
    setStats((prev) => ({
      ...prev,
      total: Math.max(0, prev.total - 1),
    }))
  }

  const STATUS_TABS = [
    { key: 'all', label: 'Tất cả', count: stats.total },
    { key: 'pending', label: 'Chờ duyệt', count: stats.pending },
    { key: 'approved', label: 'Đã duyệt', count: stats.approved },
    { key: 'rejected', label: 'Từ chối', count: stats.rejected },
    { key: 'hidden', label: 'Đã ẩn', count: stats.hidden },
    { key: 'history', label: 'Lịch sử tải lên', count: sourceHistory.length },
  ]

  return (
    <div className="min-h-screen pb-24 md:pb-8 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6"
        >
          <div>
            <h1 className="text-2xl font-display font-bold flex items-center gap-2">
              <LayoutGrid size={22} className="text-brand-400" />
              Ảnh của tôi
            </h1>
            <p className="text-white/40 text-sm mt-0.5">
              Quản lý tất cả ảnh bạn đã đăng
            </p>
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleRefresh}
            disabled={loading || refreshing}
            className="btn-secondary text-sm flex items-center gap-2"
          >
            <motion.div
              animate={refreshing ? { rotate: 360 } : {}}
              transition={{
                duration: 0.8,
                repeat: refreshing ? Infinity : 0,
                ease: 'linear',
              }}
            >
              <RefreshCw size={15} />
            </motion.div>
            Làm mới
          </motion.button>
        </motion.div>

        {initialLoaded ? <StatsRow stats={stats} /> : <StatsSkeletonRow />}

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-5">
          {STATUS_TABS.map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setActiveStatus(key)}
              className={`whitespace-nowrap flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border flex-shrink-0
                ${
                  activeStatus === key
                    ? 'bg-brand-600 border-brand-500 text-white'
                    : 'bg-surface-50 border-white/10 text-white/50 hover:border-white/20 hover:text-white/80'
                }`}
            >
              {label}
              {count > 0 && (
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full font-bold
                  ${activeStatus === key ? 'bg-white/20 text-white' : 'bg-white/10 text-white/40'}`}
                >
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Grid */}
        {/* Grid & Empty State */}
        <motion.div layout className="min-h-[400px]">
          <AnimatePresence mode="wait">
            {activeStatus === 'history' ? (
              historyLoading ? (
                <motion.div
                  key="history-skeleton"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
                >
                  {Array.from({ length: 4 }).map((_, i) => (
                    <SkeletonCard key={i} />
                  ))}
                </motion.div>
              ) : sourceHistory.length === 0 ? (
                <motion.div
                  key="history-empty"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="text-center py-20"
                >
                  <div className="w-20 h-20 rounded-3xl bg-surface-100 flex items-center justify-center mx-auto mb-4">
                    <ImageOff size={32} className="text-white/20" />
                  </div>
                  <p className="text-white/40 mb-2">Chưa có ảnh gốc nào</p>
                  <p className="text-white/20 text-sm">
                    Lịch sử tải lên tự động lưu lại các ảnh gốc bạn dùng làm tham khảo khi đăng bài.
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="history-data"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    <AnimatePresence mode="popLayout">
                      {sourceHistory.map((img, i) => (
                        <SourceHistoryCard
                          key={img.publicId}
                          img={img}
                          index={i}
                          onDeleteSuccess={(deletedId) => {
                            setSourceHistory((prev) => prev.filter((item) => item.publicId !== deletedId))
                          }}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )
            ) : loading ? (
              <motion.div
                key="skeleton-state"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3"
              >
                {Array.from({ length: 8 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </motion.div>
            ) : posts.length === 0 ? (
              <motion.div
                key="empty-state"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="text-center py-20"
              >
                <div className="w-20 h-20 rounded-3xl bg-surface-100 flex items-center justify-center mx-auto mb-4">
                  <ImageOff size={32} className="text-white/20" />
                </div>
                <p className="text-white/40 mb-2">Chưa có ảnh nào</p>
                <p className="text-white/20 text-sm mb-6">
                  {activeStatus === 'all'
                    ? 'Hãy upload ảnh đầu tiên của bạn!'
                    : `Không có ảnh nào với trạng thái "${STATUS_CONFIG[activeStatus]?.label || activeStatus}"`}
                </p>
                {activeStatus === 'all' && (
                  <a href="/upload" className="btn-primary">
                    Upload ngay
                  </a>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="data-state"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                // Khi đang đổi tab, làm mờ grid đi một chút và chặn click
                className={`transition-opacity duration-300 ${
                  isTabChanging
                    ? 'opacity-40 pointer-events-none'
                    : 'opacity-100'
                }`}
              >
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  <AnimatePresence mode="popLayout">
                    {posts.map((post, i) => (
                      <PostCard
                        key={post._id}
                        post={post}
                        index={i}
                        onEdit={setEditPost}
                        onDelete={setDeletePost}
                      />
                    ))}
                  </AnimatePresence>
                </div>

                {hasMore && (
                  <div className="flex justify-center mt-8">
                    <button
                      onClick={() => fetchPosts()}
                      className="btn-secondary flex items-center gap-2"
                    >
                      <ChevronDown size={16} />
                      Tải thêm
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {editPost && (
          <EditModal
            post={editPost}
            onClose={() => setEditPost(null)}
            onSave={handleEditSave}
            categories={categories}
          />
        )}
        {deletePost && (
          <DeleteConfirmModal
            post={deletePost}
            onClose={() => setDeletePost(null)}
            onConfirm={handleDeleteConfirm}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── SourceHistoryCard ──────────────────────────────────────────
const SourceHistoryCard = ({ img, onDeleteSuccess, index }) => {
  const [copied, setCopied] = useState(false)
  const [showPostsPopover, setShowPostsPopover] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleCopyLink = async (e) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(img.url)
      setCopied(true)
      toast.success('Đã sao chép liên kết ảnh gốc!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Không thể sao chép liên kết')
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    setShowDeleteConfirm(false)
    try {
      const { data } = await api.delete('/posts/me/source-history', {
        params: { publicId: img.publicId }
      })
      toast.success(data.message || 'Đã gỡ ảnh thành công')
      onDeleteSuccess(img.publicId)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể gỡ ảnh gốc')
    } finally {
      setDeleting(false)
    }
  }

  // Format kích thước file sang KB/MB dễ đọc
  const formatSize = (bytes) => {
    if (!bytes) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }
  return (
    <motion.div
      layout
      custom={index}
      variants={postCardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      whileHover={{
        y: -6,
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
        borderColor: 'rgba(255, 255, 255, 0.12)'
      }}
      className="group relative rounded-2xl bg-surface-50 border border-white/5 overflow-hidden flex flex-col transition-colors duration-300"
    >
      {/* Thumbnail Container */}
      <div className="relative aspect-square w-full overflow-hidden bg-black/40">
        <img
          src={getOptimizedWebpUrl(img.thumbnailUrl || img.url, 400)}
          alt="Source preview"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        
        {/* Hover overlay actions */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-3 flex flex-col justify-between z-10">
          <div className="flex justify-end gap-1.5">
            <button
              onClick={handleCopyLink}
              title="Sao chép liên kết"
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors backdrop-blur-md cursor-pointer"
            >
              {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
            </button>
            
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowDeleteConfirm(true)
              }}
              title="Xóa ảnh gốc"
              disabled={deleting}
              className="w-8 h-8 rounded-lg bg-red-500/20 hover:bg-red-500/40 border border-red-500/30 flex items-center justify-center text-red-400 transition-colors backdrop-blur-md cursor-pointer"
            >
              <Trash2 size={14} />
            </button>
          </div>

          {/* Kích thước / Chiều dài rộng */}
          <div className="text-[10px] text-white/60 font-mono flex items-center justify-between">
            <span>{img.width}x{img.height}</span>
            <span>{formatSize(img.fileSize)}</span>
          </div>
        </div>
      </div>

      {/* Info Body */}
      <div className="p-3.5 flex flex-col gap-2 relative">
        <div className="flex items-center justify-between text-xs text-white/50">
          <span className="font-mono uppercase tracking-wider bg-white/5 px-2 py-0.5 rounded text-[10px] border border-white/5 font-semibold text-white/70">
            {img.format || 'jpg'}
          </span>
          
          {/* Linked posts trigger */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowPostsPopover(!showPostsPopover)
              }}
              className="flex items-center gap-1 hover:text-brand-400 font-medium transition-colors text-white/70 cursor-pointer text-[11px]"
            >
              <Tag size={11} className="text-brand-400" />
              Dùng trong {img.useCount || 0} bài đăng
            </button>

            {/* Linked posts popover */}
            <AnimatePresence>
              {showPostsPopover && (
                <>
                  {/* Backdrop click cover */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowPostsPopover(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 bottom-full mb-2 w-56 bg-[#161620] border border-white/10 rounded-xl shadow-2xl p-2.5 z-50 text-left"
                  >
                    <p className="text-[10px] text-white/40 uppercase tracking-wider font-bold mb-1.5 px-1">
                      Các bài viết liên kết
                    </p>
                    <div className="max-h-36 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-white/15 pr-1">
                      {img.linkedPosts?.map((post) => (
                        <a
                          key={post._id}
                          href={`/posts/${post._id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block p-1.5 rounded-lg hover:bg-white/5 text-white/80 hover:text-white transition-all text-xs truncate flex items-center justify-between"
                        >
                          <span className="truncate mr-2 font-medium">{post.caption}</span>
                          <ExternalLink size={10} className="text-white/30 flex-shrink-0" />
                        </a>
                      ))}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal Overlay */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm rounded-3xl bg-[#14141c] border border-white/10 p-6 text-center shadow-2xl"
            >
              <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4 text-red-500">
                <Trash2 size={22} />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Gỡ bỏ ảnh gốc?</h4>
              <p className="text-sm text-white/50 mb-6 leading-relaxed">
                Ảnh gốc này đang liên kết với <span className="font-semibold text-white">{img.useCount}</span> bài viết. 
                Hành động này sẽ gỡ ảnh gốc khỏi toàn bộ bài viết này và xóa vĩnh viễn tệp trên hệ thống.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 btn-secondary text-sm cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-medium transition-colors text-sm shadow-lg shadow-red-600/15 disabled:opacity-50 cursor-pointer"
                >
                  {deleting ? 'Đang xóa...' : 'Xác nhận xóa'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default MyPostsPage
