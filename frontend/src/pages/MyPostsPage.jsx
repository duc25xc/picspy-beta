import { useState, useEffect, useCallback } from 'react'
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
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/api'
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
  <div className="rounded-2xl bg-surface-50 overflow-hidden animate-pulse">
    <div className="aspect-square bg-surface-100" />
    <div className="p-3 space-y-2">
      <div className="h-3 bg-surface-100 rounded w-2/3" />
      <div className="h-3 bg-surface-100 rounded w-1/3" />
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
  'midjourney','dalle-3','stable-diffusion','flux','leonardo',
  'firefly','ideogram','bing-creator','playground','canva-ai','comfyui',
  'gemini-flash','gemini-think','gemini-pro',
  'gemini-nano-banana','gemini-nano-banana-pro','gemini-nano-banana-2',
  'chatgpt','deepseek','grok','other',
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
    isPremium:      post.isPremium      || false,
    priceInTokens:  post.priceInTokens  || 10,
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

  // Khởi tạo modelSlots từ post.modelComparisons
  const [modelSlots, setModelSlots] = useState(() => {
    if (post.isMultiModel && post.modelComparisons?.length > 0) {
      return post.modelComparisons.map((s, idx) => ({
        id: `slot-${idx}-${Date.now()}`,
        aiTool: s.aiTool || '',
        aiModel: s.aiModel || '',
        genImages: (s.generatedImages || []).map(img => ({
          id: img.publicId || Math.random().toString(),
          preview: img.url,
          url: img.url,
          publicId: img.publicId,
          isOld: true
        }))
      }))
    }
    // Fallback slot nếu post cũ là single model nhưng user chuyển sang multi-model
    return [
      {
        id: `slot-0-${Date.now()}`,
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
    if (!form.category) return toast.error('Vui lòng chọn danh mục')

    // Validate multi-model
    if (multiModelMode) {
      if (modelSlots.length < 2) return toast.error('Cần ít nhất 2 model để so sánh')
      if (modelSlots.some(s => !s.aiTool)) return toast.error('Mỗi model so sánh cần chọn công cụ AI')
      if (modelSlots.some(s => !s.genImages?.length)) return toast.error('Mỗi model cần ít nhất 1 ảnh kết quả')
    } else {
      if (genImages.length === 0) return toast.error('Cần ít nhất 1 ảnh kết quả AI')
    }

    setSaving(true)
    try {
      const fd = new FormData()
      
      // Append text fields
      fd.append('caption', form.caption.trim())
      fd.append('category', form.category)
      fd.append('tags', JSON.stringify(form.tags))
      fd.append('prompt', form.prompt.trim())
      if (form.negativePrompt.trim()) fd.append('negativePrompt', form.negativePrompt.trim())
      fd.append('aiTool', multiModelMode ? (modelSlots[0].aiTool || 'other') : form.aiTool)
      if (!multiModelMode && form.aiModel.trim()) fd.append('aiModel', form.aiModel.trim())
      if (form.parameters.trim()) fd.append('parameters', form.parameters.trim())
      fd.append('isPremium', String(form.isPremium))
      fd.append('priceInTokens', String(Number(form.priceInTokens)))

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
      return firstSlotImg?.preview || firstSlotImg?.url || post.generatedImages?.[0]?.url || post.images?.[0]?.url
    }
    return genImages[0]?.preview || genImages[0]?.url || post.generatedImages?.[0]?.url || post.images?.[0]?.url
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
        <div className="hidden md:flex md:w-[320px] lg:w-[380px] shrink-0 bg-surface-100/50 flex-col border-r border-white/8">
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
            <div className="relative w-full h-28 rounded-xl overflow-hidden bg-surface-100 border border-white/5">
              <img
                src={getPrimaryPreviewUrl()}
                alt="" className="absolute inset-0 w-full h-full object-cover blur-xl opacity-30 scale-110"
              />
              <img
                src={getPrimaryPreviewUrl()}
                alt={post.caption} className="relative z-10 h-full w-full object-contain"
              />
            </div>
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
                  <label className="input-label">Giá (tokens)</label>
                  <div className="flex items-center gap-3 mt-2">
                    <input type="range" min={1} max={500} step={1}
                      value={form.priceInTokens} onChange={e => set('priceInTokens', Number(e.target.value))}
                      className="flex-1 accent-brand-500"
                    />
                    <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-100 border border-white/10 min-w-[80px] justify-center">
                      <span className="text-yellow-400 text-sm">🪙</span>
                      <span className="font-bold text-sm">{form.priceInTokens}</span>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-white/25 mt-1 px-1">
                    <span>1</span><span>250</span><span>500</span>
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
                    <span className="font-bold">🪙 {form.priceInTokens} tokens</span>
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

// ─── Post Card ──────────────────────────────────────────────
const PostCard = ({ post, onEdit, onDelete, index }) => {
  const img = post.generatedImages?.[0] || post.images?.[0]
  const displayUrl = img?.thumbnailUrl || img?.url

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="group relative rounded-2xl bg-surface-50 overflow-hidden border border-white/5 hover:border-white/10 transition-all duration-300"
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden">
        {displayUrl ? (
          <img
            src={displayUrl}
            alt={post.caption || 'Post'}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-surface-100 flex items-center justify-center">
            <ImageOff size={32} className="text-white/20" />
          </div>
        )}

        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Action buttons */}
        <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => onEdit(post)}
            className="w-8 h-8 rounded-xl bg-black/60 backdrop-blur-sm flex items-center justify-center hover:bg-brand-600 transition-colors"
          >
            <Pencil size={14} />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => onDelete(post)}
            className="w-8 h-8 rounded-xl bg-black/60 backdrop-blur-sm flex items-center justify-center hover:bg-red-600 transition-colors"
          >
            <Trash2 size={14} />
          </motion.button>
        </div>

        {/* Premium badge */}
        {post.isPremium && (
          <div className="absolute top-2 left-2">
            <span className="badge-warning text-xs">💎 Premium</span>
          </div>
        )}

        {/* Bottom stats on hover */}
        <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          <div className="flex items-center gap-3 text-white text-xs">
            <span className="flex items-center gap-1">
              <Heart size={11} className="text-red-400" />
              {(post.stats?.likesCount || 0).toLocaleString()}
            </span>
            <span className="flex items-center gap-1">
              <Download size={11} className="text-brand-400" />
              {(post.stats?.downloadsCount || 0).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="flex items-center justify-between gap-2">
          <StatusBadge status={post.status} />
          <span className="text-xs text-white/30">
            {new Date(post.createdAt).toLocaleDateString('vi-VN')}
          </span>
        </div>
        {post.caption && (
          <p className="text-sm text-white/60 mt-2 line-clamp-1">
            {post.caption}
          </p>
        )}
        {post.status === 'rejected' && post.rejectionReason && (
          <p className="text-xs text-red-400/80 mt-1.5 line-clamp-1">
            ⚠ {post.rejectionReason}
          </p>
        )}
      </div>
    </motion.div>
  )
}

// ─── Stats Row ──────────────────────────────────────────────
const StatsRow = ({ stats }) => (
  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
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
  </div>
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
  // Dynamic categories từ API
  const [categories, setCategories] = useState(FALLBACK_CATEGORIES)

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

  const fetchPosts = useCallback(
    async ({ reset = false } = {}) => {
      if (!reset && !hasMore && posts.length > 0) return

      if (reset) {
        if (!initialLoaded) {
          setLoading(true) // Chỉ hiện Skeletons ở lần tải trang đầu tiên
        } else {
          setIsTabChanging(true) // Chuyển tab chỉ làm mờ nhẹ giao diện
        }
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
        setIsTabChanging(false) // Tắt trạng thái mờ
        setRefreshing(false)
        setInitialLoaded(true) // Đánh dấu đã qua lần load đầu tiên
      }
    },
    [activeStatus, cursor, hasMore, posts.length, initialLoaded] // Thêm initialLoaded vào dependencies
  )

  // Fetch khi filter thay đổi
  useEffect(() => {
    fetchPosts({ reset: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStatus])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchPosts({ reset: true })
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

        {/* Stats */}
        {!loading && <StatsRow stats={stats} />}

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
            {loading ? (
              <motion.div
                key="skeleton-state"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
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
                  <AnimatePresence>
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

export default MyPostsPage
