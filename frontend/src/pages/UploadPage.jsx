import { useState, useCallback, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload, CheckCircle, Clock, LayoutGrid, ArrowRight, ArrowLeft,
  Sparkles, Settings, Tag, Coins, ChevronDown, Image as ImageIcon,
  AlertCircle, Loader2, Crown, FileJson, Plus, GitCompare,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/api'
import useTierAccess from '../hooks/useTierAccess'
import { detectDimensions, fileToPreview, deduplicateByPublicId, FALLBACK_CATEGORIES } from './uploadConstants.js'
import {
  ImageDropZone, AIToolSelector, PromptField, StepHeader,
  SourceHistoryPanel, ModelSlot,
} from './UploadComponents.jsx'

// ── Wizard steps ─────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: 'Công cụ & Prompt' },
  { id: 2, label: 'Ảnh tham khảo' },
  { id: 3, label: 'Kết quả AI' },
  { id: 4, label: 'Thông tin' },
]

// ── Default form state ───────────────────────────────────────────
const defaultForm = () => ({
  // Step 1
  aiTool: '',
  aiModel: '',
  parameters: '',
  prompt: '',
  negativePrompt: '',
  workflowJson: '',       // Ultimate only
  showNegative: false,
  showParams: false,
  showWorkflow: false,    // toggle state
  // Step 4
  caption: '',
  tags: '',
  category: '',
  isPremium: false,
  priceInTokens: 10,
})

// ── Main component ───────────────────────────────────────────────
export default function UploadPage() {
  const navigate = useNavigate()
  const tierAccess = useTierAccess()

  const [step, setStep] = useState(1)
  const [form, setForm] = useState(defaultForm())
  const [sourceImages, setSourceImages] = useState([])   // new file uploads
  const [genImages, setGenImages] = useState([])
  const [sourceHistory, setSourceHistory] = useState([])  // Cloudinary refs from past posts
  const [selectedHistoryIds, setSelectedHistoryIds] = useState(new Set())
  const [historyLoading, setHistoryLoading] = useState(false)
  const [sourceTab, setSourceTab] = useState('upload')
  const [multiModelMode, setMultiModelMode] = useState(false)
  const [modelSlots, setModelSlots] = useState([{ id: 'slot-0', aiTool: '', aiModel: '', genImages: [] }])
  const [categories, setCategories] = useState(FALLBACK_CATEGORIES)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => {
    api.get('/categories').then(({ data }) => {
      if (data?.categories?.length) setCategories(data.categories)
    }).catch(() => {})
  }, [])

  // Load source image history
  useEffect(() => {
    setHistoryLoading(true)
    api.get('/posts/me?limit=50').then(({ data }) => {
      const imgs = (data?.posts || []).flatMap(p => p.sourceImages || []).filter(img => img.url && img.publicId)
      setSourceHistory(deduplicateByPublicId(imgs))
    }).catch(() => {}).finally(() => setHistoryLoading(false))
  }, [])

  const hasModelImages = modelSlots.some(s => s.genImages?.length > 0)
  const isDirty = form.prompt.trim().length > 0 || sourceImages.length > 0 || genImages.length > 0 || selectedHistoryIds.size > 0 || hasModelImages

  useEffect(() => {
    if (!isDirty || done) return
    const h = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [isDirty, done])

  const safeNavigate = (path) => {
    if (isDirty && !done) {
      if (!window.confirm('Bài đăng của bạn chưa hoàn tất. Bạn có chắc chắn muốn rời đi?')) return
    }
    navigate(path)
  }

  const toggleHistoryImage = useCallback((img) => {
    setSelectedHistoryIds(prev => {
      const next = new Set(prev)
      if (next.has(img.publicId)) { next.delete(img.publicId) }
      else {
        if (next.size + sourceImages.length >= 5) { toast.error('Tối đa 5 ảnh tham khảo'); return prev }
        next.add(img.publicId)
      }
      return next
    })
  }, [sourceImages.length])

  const updateModelSlot = useCallback((i, updated) => setModelSlots(prev => prev.map((s, idx) => idx === i ? updated : s)), [])
  const removeModelSlot = useCallback((i) => setModelSlots(prev => { prev[i].genImages?.forEach(img => URL.revokeObjectURL(img.preview)); return prev.filter((_, idx) => idx !== i) }), [])
  const addModelSlot = useCallback(() => {
    if (modelSlots.length >= 5) return toast.error('Tối đa 5 model')
    setModelSlots(prev => [...prev, { id: `slot-${Date.now()}`, aiTool: '', aiModel: '', genImages: [] }])
  }, [modelSlots.length])

  // ── Image handlers ─────────────────────────────────────────────
  const addSourceImages = useCallback((files) => {
    const remaining = 5 - sourceImages.length
    const toAdd = files.slice(0, remaining).map(fileToPreview)
    setSourceImages(prev => [...prev, ...toAdd])
  }, [sourceImages.length])

  const removeSourceImage = useCallback((id) => {
    setSourceImages(prev => {
      const img = prev.find(i => i.id === id)
      if (img) URL.revokeObjectURL(img.preview)
      return prev.filter(i => i.id !== id)
    })
  }, [])

  const addGenImages = useCallback((files) => {
    const remaining = 5 - genImages.length
    const toAdd = files.slice(0, remaining).map(fileToPreview)
    setGenImages(prev => [...prev, ...toAdd])
  }, [genImages.length])

  const removeGenImage = useCallback((id) => {
    setGenImages(prev => {
      const img = prev.find(i => i.id === id)
      if (img) URL.revokeObjectURL(img.preview)
      return prev.filter(i => i.id !== id)
    })
  }, [])

  // ── Navigation ─────────────────────────────────────────────────
  const canGoNext = () => {
    if (step === 1) return form.aiTool && form.prompt.trim().length >= 3
    if (step === 2) return true // optional
    if (step === 3) {
      if (multiModelMode)
        return modelSlots.length >= 2 && modelSlots.every(s => s.aiTool && s.genImages?.length >= 1)
      return genImages.length >= 1
    }
    return true
  }

  const goNext = () => {
    if (!canGoNext()) {
      if (step === 1) toast.error('Chọn công cụ AI và nhập prompt')
      if (step === 3) toast.error(multiModelMode ? 'Cần ít nhất 2 model, mỗi model ít nhất 1 ảnh' : 'Cần ít nhất 1 ảnh kết quả AI')
      return
    }
    setStep(s => Math.min(s + 1, 4))
  }

  const goBack = () => setStep(s => Math.max(s - 1, 1))

  // ── Submit ─────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!form.category) return toast.error('Vui lòng chọn danh mục')
    if (multiModelMode) {
      if (modelSlots.length < 2) return toast.error('Cần ít nhất 2 model')
      if (modelSlots.some(s => !s.aiTool)) return toast.error('Mỗi model cần chọn công cụ AI')
      if (modelSlots.some(s => !s.genImages?.length)) return toast.error('Mỗi model cần ít nhất 1 ảnh')
    } else {
      if (genImages.length === 0) return toast.error('Cần ít nhất 1 ảnh kết quả AI')
    }
    setUploading(true); setProgress(0)
    let dims = {}
    try { const f = multiModelMode ? modelSlots[0].genImages[0]?.file : genImages[0]?.file; if (f) dims = await detectDimensions(f) } catch {}
    let workflowJsonStr = ''
    if (tierAccess.canExportJson && form.workflowJson.trim()) {
      try { JSON.parse(form.workflowJson); workflowJsonStr = form.workflowJson.trim() }
      catch { toast.error('JSON Workflow không hợp lệ!'); setUploading(false); setProgress(0); return }
    }
    const fd = new FormData()
    fd.append('prompt', form.prompt.trim())
    if (form.negativePrompt.trim()) fd.append('negativePrompt', form.negativePrompt.trim())
    fd.append('aiTool', multiModelMode ? (modelSlots[0].aiTool || 'other') : form.aiTool)
    if (!multiModelMode && form.aiModel.trim()) fd.append('aiModel', form.aiModel.trim())
    if (form.parameters.trim()) fd.append('parameters', form.parameters.trim())
    fd.append('contentType', 'image')
    fd.append('caption', form.caption.trim())
    fd.append('tags', JSON.stringify(form.tags.split(',').map(t => t.trim()).filter(Boolean)))
    fd.append('category', form.category)
    fd.append('isPremium', String(form.isPremium))
    fd.append('priceInTokens', String(Number(form.priceInTokens)))
    if (dims.resolution) fd.append('resolution', dims.resolution)
    if (dims.orientation) fd.append('orientation', dims.orientation)
    if (dims.aspectRatio) fd.append('aspectRatio', dims.aspectRatio)
    if (workflowJsonStr) fd.append('workflowJson', workflowJsonStr)
    sourceImages.forEach(img => fd.append('sourceImages', img.file))
    if (selectedHistoryIds.size > 0) {
      const refs = sourceHistory.filter(img => selectedHistoryIds.has(img.publicId))
        .map(({ url, publicId, width, height, fileSize, format, thumbnailUrl }) => ({ url, publicId, width, height, fileSize, format, thumbnailUrl }))
      fd.append('sourceImageRefs', JSON.stringify(refs))
    }
    if (multiModelMode) {
      fd.append('modelComparisons', JSON.stringify(modelSlots.map((s, i) => ({ aiTool: s.aiTool, aiModel: s.aiModel || undefined, slotIndex: i }))))
      modelSlots.forEach((s, i) => s.genImages.forEach(img => fd.append(`compImages_${i}`, img.file)))
    } else {
      genImages.forEach(img => fd.append('generatedImages', img.file))
    }
    let fakeP = 0
    const timer = setInterval(() => { fakeP = Math.min(fakeP + 2, 89); setProgress(Math.round(fakeP)) }, 80)
    try {
      await api.post('/posts', fd, { headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: evt => { const r = Math.round((evt.loaded * 100) / evt.total); if (r > fakeP) { fakeP = r; setProgress(r) } } })
      clearInterval(timer); setProgress(100); setTimeout(() => setDone(true), 400)
    } catch (err) {
      clearInterval(timer); setProgress(0)
      toast.error(err.response?.data?.message || 'Upload thất bại, thử lại!')
    } finally { setUploading(false) }
  }

  const resetForm = () => {
    ;[...sourceImages, ...genImages].forEach(i => URL.revokeObjectURL(i.preview))
    modelSlots.forEach(s => s.genImages?.forEach(i => URL.revokeObjectURL(i.preview)))
    setSourceImages([]); setGenImages([])
    setSelectedHistoryIds(new Set())
    setModelSlots([{ id: 'slot-0', aiTool: '', aiModel: '', genImages: [] }])
    setMultiModelMode(false)
    setForm(defaultForm()); setStep(1); setDone(false); setProgress(0)
  }

  // ── Done screen ────────────────────────────────────────────────
  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', duration: 0.5 }}
          className="card p-8 max-w-md w-full text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.1, bounce: 0.5 }}
            className="w-20 h-20 rounded-full bg-green-500/20 border border-green-500/30
              flex items-center justify-center mx-auto mb-5"
          >
            <CheckCircle size={40} className="text-green-400" />
          </motion.div>
          <h2 className="text-2xl font-bold mb-2">Đã gửi thành công!</h2>
          <p className="text-white/60 mb-2">
            Nội dung AI đang trong hàng chờ xử lý & kiểm duyệt.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-white/40 mb-6">
            <Clock size={14} />
            <span>Thường mất 10–60 giây</span>
          </div>
          <div className="flex gap-3 justify-center">
            <button onClick={resetForm} className="btn-secondary">Upload thêm</button>
            <button onClick={() => navigate('/my-posts')} className="btn-primary flex items-center gap-2">
              <LayoutGrid size={16} /> Xem bài của tôi
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  // ── Main render ────────────────────────────────────────────────
  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Page title */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Sparkles size={22} className="text-brand-400" />
            Chia sẻ nội dung AI
          </h1>
          <p className="text-white/40 text-sm mt-1">
            Chia sẻ prompt và tác phẩm AI của bạn với cộng đồng
          </p>
        </div>

        {/* Step indicators */}
        <StepIndicator steps={STEPS} current={step} />

        {/* Step content */}
        <div className="mt-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {step === 1 && (
                <Step1Prompt form={form} setForm={setForm} tierAccess={tierAccess} />
              )}
              {step === 2 && (
                <Step2Source
                  images={sourceImages} onAdd={addSourceImages} onRemove={removeSourceImage}
                  sourceHistory={sourceHistory} historyLoading={historyLoading}
                  selectedHistoryIds={selectedHistoryIds} onToggleHistory={toggleHistoryImage}
                  sourceTab={sourceTab} onTabChange={setSourceTab}
                />
              )}
              {step === 3 && (
                <Step3Generated
                  images={genImages} onAdd={addGenImages} onRemove={removeGenImage}
                  multiModelMode={multiModelMode} onToggleMultiModel={() => setMultiModelMode(v => !v)}
                  modelSlots={modelSlots} onUpdateSlot={updateModelSlot}
                  onRemoveSlot={removeModelSlot} onAddSlot={addModelSlot}
                />
              )}
              {step === 4 && (
                <Step4Meta
                  form={form}
                  setForm={setForm}
                  categories={categories}
                  uploading={uploading}
                  progress={progress}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/5">
          <button
            type="button"
            onClick={goBack}
            disabled={step === 1}
            className="btn-ghost flex items-center gap-2 disabled:opacity-30"
          >
            <ArrowLeft size={16} /> Quay lại
          </button>

          {step < 4 ? (
            <button
              type="button"
              onClick={goNext}
              className="btn-primary flex items-center gap-2"
            >
              Tiếp theo <ArrowRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={uploading}
              className="btn-primary flex items-center gap-2 disabled:opacity-60"
            >
              {uploading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Đang gửi {progress}%
                </>
              ) : (
                <>
                  <Upload size={16} /> Đăng bài
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Step indicator ─────────────────────────────────────────────
function StepIndicator({ steps, current }) {
  return (
    <div className="flex items-center gap-0">
      {steps.map((s, i) => {
        const done = current > s.id
        const active = current === s.id
        return (
          <div key={s.id} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                transition-all duration-300
                ${done ? 'bg-green-500/20 border border-green-500/50 text-green-400'
                  : active ? 'bg-brand-600/30 border border-brand-500 text-brand-300'
                  : 'bg-white/5 border border-white/10 text-white/25'}`}
              >
                {done ? <CheckCircle size={14} /> : s.id}
              </div>
              <span className={`text-[10px] mt-1 whitespace-nowrap
                ${active ? 'text-brand-300' : done ? 'text-green-400/70' : 'text-white/20'}`}>
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-px flex-1 mx-2 mb-4 transition-colors duration-300
                ${done ? 'bg-green-500/40' : 'bg-white/8'}`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

function Step1Prompt({ form, setForm, tierAccess }) {
  const set = (key) => (val) => setForm(f => ({ ...f, [key]: val }))
  const [jsonError, setJsonError] = useState(null)

  const handleJsonChange = (val) => {
    set('workflowJson')(val)
    if (!val.trim()) { setJsonError(null); return }
    try { JSON.parse(val); setJsonError(null) }
    catch (e) { setJsonError(e.message.slice(0, 65)) }
  }

  return (
    <div className="card p-6 space-y-5">
      <StepHeader step={1} total={4} title="Công cụ AI & Prompt"
        subtitle="Chọn tool và nhập prompt bạn đã dùng để tạo ảnh" />

      <AIToolSelector value={form.aiTool} onChange={set('aiTool')} />

      <div>
        <label className="input-label">Phiên bản / Model <span className="text-white/30">(tuỳ chọn)</span></label>
        <input type="text" value={form.aiModel} onChange={e => set('aiModel')(e.target.value)}
          placeholder="v6.1, SDXL, Flux Dev, Turbo..." className="input" />
      </div>

      <PromptField label="Prompt" required value={form.prompt} onChange={set('prompt')}
        placeholder="Mô tả chi tiết nội dung bạn muốn tạo..." maxLength={2000} />

      {/* Negative prompt */}
      <div>
        <button type="button" onClick={() => set('showNegative')(!form.showNegative)}
          className="text-sm text-white/40 hover:text-white/70 flex items-center gap-1.5 transition-colors">
          <ChevronDown size={14} className={`transition-transform ${form.showNegative ? 'rotate-180' : ''}`} />
          {form.showNegative ? 'Ẩn' : 'Thêm'} Negative Prompt
        </button>
        <AnimatePresence>
          {form.showNegative && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden mt-3">
              <PromptField label="Negative Prompt" value={form.negativePrompt} onChange={set('negativePrompt')}
                placeholder="Những gì bạn KHÔNG muốn xuất hiện trong ảnh..." maxLength={1000} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Parameters */}
      <div>
        <button type="button" onClick={() => set('showParams')(!form.showParams)}
          className="text-sm text-white/40 hover:text-white/70 flex items-center gap-1.5 transition-colors">
          <Settings size={13} />
          {form.showParams ? 'Ẩn' : 'Thêm'} Parameters
          <span className="text-white/20 text-xs">--ar, --v, --seed...</span>
        </button>
        <AnimatePresence>
          {form.showParams && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden mt-3"
            >
              <input
                type="text"
                value={form.parameters}
                onChange={e => set('parameters')(e.target.value)}
                placeholder="--ar 16:9 --v 6.1 --seed 12345 --stylize 750"
                className="input font-mono text-sm"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── JSON Workflow — Ultimate only ─────────────────────── */}
      {tierAccess?.canExportJson ? (
        <div>
          <button type="button" onClick={() => set('showWorkflow')(!form.showWorkflow)}
            className="flex items-center gap-2 group">
            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border"
              style={{ background: 'rgba(6,182,212,0.10)', borderColor: 'rgba(6,182,212,0.30)', color: '#06b6d4' }}>
              <Crown size={9} /> Ultimate
            </span>
            <span className="text-sm text-white/40 group-hover:text-white/70 transition-colors flex items-center gap-1">
              <FileJson size={13} />
              {form.showWorkflow ? 'Ẩn' : 'Thêm'} JSON Workflow
            </span>
            <ChevronDown size={13}
              className={`text-white/25 transition-transform ${form.showWorkflow ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {form.showWorkflow && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden mt-3 space-y-2">

                <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs"
                  style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.18)', color: 'rgba(6,182,212,0.85)' }}>
                  <FileJson size={13} className="flex-shrink-0 mt-0.5" />
                  <span>Paste ComfyUI workflow JSON. Người dùng Ultimate có thể <strong>import thẳng vào ComfyUI</strong> để tái tạo kết quả chính xác.</span>
                </div>

                <div className="relative">
                  <textarea value={form.workflowJson} onChange={e => handleJsonChange(e.target.value)}
                    placeholder={'{\n  "nodes": [...],\n  "links": [...]\n}'}
                    rows={8} spellCheck={false}
                    className="input resize-none font-mono text-xs leading-relaxed w-full"
                    style={{ borderColor: jsonError ? 'rgba(239,68,68,0.4)' : undefined, background: 'rgba(0,0,0,0.3)' }} />
                  {form.workflowJson.trim() && (
                    <span className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{
                        background: jsonError ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
                        color: jsonError ? '#ef4444' : '#22c55e',
                        border: `1px solid ${jsonError ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`,
                      }}>
                      {jsonError ? '✗ Invalid' : '✓ Valid JSON'}
                    </span>
                  )}
                </div>
                {jsonError && <p className="text-xs text-red-400/80 font-mono pl-1">⚠ {jsonError}</p>}
                <p className="text-right text-xs text-white/20">{form.workflowJson.length.toLocaleString()} ký tự</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.15)' }}>
            <FileJson size={15} style={{ color: '#06b6d4', opacity: 0.45 }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white/35">JSON Workflow Export</p>
            <p className="text-[11px] text-white/20">Import thẳng vào ComfyUI · Chỉ dành cho Ultimate</p>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0"
            style={{ background: 'rgba(6,182,212,0.10)', border: '1px solid rgba(6,182,212,0.22)', color: '#06b6d4' }}>
            👑 Ultimate
          </span>
        </div>
      )}
    </div>
  )
}


// ── STEP 2: Source images ─────────────────────────────────────────
function Step2Source({
  images, onAdd, onRemove,
  sourceHistory, historyLoading, selectedHistoryIds, onToggleHistory,
  sourceTab, onTabChange,
}) {
  const totalSelected = images.length + selectedHistoryIds.size
  return (
    <div className="card p-6 space-y-4">
      <StepHeader step={2} total={4} title="Ảnh tham khảo / Input"
        subtitle="Ảnh gốc bạn đã dùng làm tham khảo cho AI (không bắt buộc)" />
      <div className="p-3 rounded-xl bg-brand-900/20 border border-brand-700/30 text-sm text-brand-300/80">
        💡 Bước này <strong>không bắt buộc</strong>. Thêm ảnh nếu bạn dùng img2img, inpainting,
        hoặc có ảnh tham khảo phong cách.
      </div>
      <div className="flex gap-1 p-1 rounded-xl bg-white/4 border border-white/6">
        {[{ id: 'upload', label: '⬆️ Upload mới' }, { id: 'history', label: '🗂️ Từ lịch sử' }].map(tab => (
          <button key={tab.id} type="button" onClick={() => onTabChange(tab.id)}
            className={`flex-1 py-1.5 text-sm rounded-lg font-medium transition-all
              ${sourceTab === tab.id ? 'bg-brand-600/30 text-brand-300 border border-brand-500/40' : 'text-white/40 hover:text-white/70'}`}
          >
            {tab.label}
            {tab.id === 'history' && sourceHistory.length > 0 && (
              <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-white/8 text-white/50">{sourceHistory.length}</span>
            )}
          </button>
        ))}
      </div>
      {sourceTab === 'upload' ? (
        <ImageDropZone images={images} onAdd={onAdd} onRemove={onRemove}
          max={5 - selectedHistoryIds.size} label="Ảnh tham khảo" hint="JPG, PNG, WebP · tối đa 20MB/ảnh" />
      ) : (
        <SourceHistoryPanel images={sourceHistory} selectedIds={selectedHistoryIds}
          onToggle={onToggleHistory} loading={historyLoading} />
      )}
      {totalSelected === 0 ? (
        <p className="text-center text-white/25 text-sm py-2">Bỏ qua nếu bạn tạo từ text prompt thuần tuý</p>
      ) : (
        <p className="text-xs text-white/30 text-center">
          {totalSelected}/5 ảnh tham khảo
          {selectedHistoryIds.size > 0 && <span className="text-brand-400"> • {selectedHistoryIds.size} từ lịch sử (không cần upload lại)</span>}
        </p>
      )}
    </div>
  )
}

// ── STEP 3: Generated images ──────────────────────────────────────
function Step3Generated({
  images, onAdd, onRemove,
  multiModelMode, onToggleMultiModel,
  modelSlots, onUpdateSlot, onRemoveSlot, onAddSlot,
}) {
  return (
    <div className="card p-6 space-y-4">
      <StepHeader step={3} total={4} title="Kết quả AI" subtitle="Upload ảnh AI đã tạo ra từ prompt của bạn" />
      <div className="flex items-center justify-between p-3 rounded-xl bg-white/3 border border-white/8">
        <div className="flex items-center gap-2">
          <GitCompare size={16} className="text-brand-400" />
          <div>
            <p className="text-sm font-semibold text-white">« So sánh nhiều model »</p>
            <p className="text-xs text-white/40">Mỗi model có kết quả riêng cho cùng 1 prompt</p>
          </div>
        </div>
        <button type="button" onClick={onToggleMultiModel}
          className={`w-11 h-6 rounded-full transition-colors duration-200 relative flex-shrink-0 ${multiModelMode ? 'bg-brand-600' : 'bg-white/15'}`}>
          <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${multiModelMode ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>
      {multiModelMode ? (
        <div className="space-y-3">
          <p className="text-xs text-white/40">Thêm ít nhất 2 model — mỗi card có công cụ AI và ảnh riêng</p>
          <AnimatePresence>
            {modelSlots.map((slot, i) => (
              <ModelSlot key={slot.id} slot={slot} index={i}
                onUpdate={onUpdateSlot} onRemove={onRemoveSlot} canRemove={modelSlots.length > 1} />
            ))}
          </AnimatePresence>
          {modelSlots.length < 5 && (
            <button type="button" onClick={onAddSlot}
              className="w-full py-2.5 rounded-xl border-2 border-dashed border-white/12 hover:border-brand-500/40 hover:bg-brand-900/20 text-white/40 hover:text-brand-300 text-sm flex items-center justify-center gap-2 transition-all duration-200">
              <Plus size={15} /> Thêm model
            </button>
          )}
          <p className="text-xs text-white/25 text-center">{modelSlots.filter(s => s.genImages?.length > 0).length}/{modelSlots.length} model đã có ảnh</p>
        </div>
      ) : (
        <div className="space-y-3">
          <ImageDropZone images={images} onAdd={onAdd} onRemove={onRemove}
            max={5} label="Ảnh kết quả" hint="Tối thiểu 1, tối đa 5 ảnh" required />
          {images.length === 0 && (
            <div className="flex items-center gap-3 p-4 rounded-xl border border-red-500/20 bg-red-500/5">
              <AlertCircle size={18} className="text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-300/80">Cần ít nhất 1 ảnh kết quả AI để tiếp tục</p>
            </div>
          )}
          {images.length > 0 && <p className="text-xs text-white/30 text-center">Ảnh đầu tiên sẽ là ảnh đại diện cho bài đăng</p>}
        </div>
      )}
    </div>
  )
}

// ── STEP 4: Metadata ─────────────────────────────────────────────
function Step4Meta({ form, setForm, categories, uploading, progress }) {
  const set = (key) => (val) => setForm(f => ({ ...f, [key]: val }))

  return (
    <div className="card p-6 space-y-5">
      <StepHeader step={4} total={4} title="Thông tin bài đăng"
        subtitle="Thêm mô tả và gắn thẻ để dễ tìm kiếm" />

      {/* Caption */}
      <div>
        <label className="input-label">Mô tả ngắn</label>
        <textarea
          rows={3}
          value={form.caption}
          onChange={e => set('caption')(e.target.value)}
          placeholder="Chia sẻ cảm nghĩ về tác phẩm này..."
          maxLength={500}
          className="input resize-none"
        />
        <p className="text-right text-xs text-white/25 mt-1">{form.caption.length}/500</p>
      </div>

      {/* Tags */}
      <div>
        <label className="input-label flex items-center gap-1.5">
          <Tag size={13} /> Tags <span className="text-white/30">(cách nhau bởi dấu phẩy)</span>
        </label>
        <input
          type="text"
          value={form.tags}
          onChange={e => set('tags')(e.target.value)}
          placeholder="portrait, dark, cinematic, fantasy..."
          className="input"
        />
      </div>

      {/* Category */}
      <div>
        <label className="input-label">
          Danh mục <span className="text-red-400">*</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {categories.map(cat => (
            <button
              key={cat.slug}
              type="button"
              onClick={() => set('category')(cat.slug)}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-150
                ${form.category === cat.slug
                  ? 'bg-brand-600/30 border border-brand-500/60 text-brand-300'
                  : 'bg-white/5 border border-white/10 text-white/50 hover:border-white/25'}`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Premium toggle */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-white/3 border border-white/8">
        <div className="flex items-center gap-3">
          <Coins size={18} className="text-yellow-400" />
          <div>
            <p className="text-sm font-semibold">Premium Download</p>
            <p className="text-xs text-white/40">Người dùng tốn token để tải ảnh full-res</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => set('isPremium')(!form.isPremium)}
          className={`w-11 h-6 rounded-full transition-colors duration-200 relative flex-shrink-0
            ${form.isPremium ? 'bg-brand-600' : 'bg-white/15'}`}
        >
          <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform duration-200
            ${form.isPremium ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>

      {/* Price in tokens */}
      {form.isPremium && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
        >
          <label className="input-label">Giá (token)</label>
          <input
            type="number"
            min={1}
            max={500}
            value={form.priceInTokens}
            onChange={e => set('priceInTokens')(parseInt(e.target.value) || 10)}
            className="input w-32"
          />
        </motion.div>
      )}

      {/* Upload progress */}
      {uploading && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-white/60">Đang upload...</span>
            <span className="text-brand-400 font-semibold">{progress}%</span>
          </div>
          <div className="h-2 bg-white/8 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-brand-600 rounded-full"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
