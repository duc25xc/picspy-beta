import { useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload, Image, X, Tag, DollarSign, Sparkles,
  CheckCircle, Clock, LayoutGrid, Plus, Zap, Info,
  FolderHeart, Camera, Cpu, Ratio, FileImage,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/api'

// ── Constants ─────────────────────────────────────────────────
const CATEGORIES = ['nature','anime','minimal','abstract','city','space','dark','light','gradient','other']
const CATEGORY_LABELS = {
  nature:'🌿 Thiên nhiên', anime:'🎌 Anime', minimal:'◻️ Minimal',
  abstract:'🎨 Abstract', city:'🌃 Thành phố', space:'🚀 Vũ trụ',
  dark:'🌑 Dark', light:'☀️ Light', gradient:'🌈 Gradient', other:'✨ Khác',
}

// ── Auto-detect dimensions từ browser ─────────────────────────
const detectImageMeta = (file) =>
  new Promise((resolve) => {
    const img = new window.Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const w = img.naturalWidth
      const h = img.naturalHeight
      const maxDim = Math.max(w, h)
      const resolution = maxDim >= 3840 ? '4k' : maxDim >= 2560 ? '2k' : 'hd'
      const ratio = w / h
      const orientation = ratio > 1.15 ? 'landscape' : ratio < 0.87 ? 'portrait' : 'square'
      // Aspect ratio xấp xỉ
      const gcd = (a, b) => b ? gcd(b, a % b) : a
      const g = gcd(w, h)
      const aspectStr = `${w/g}:${h/g}`
      URL.revokeObjectURL(url)
      resolve({ width: w, height: h, resolution, orientation, aspectStr })
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve({}) }
    img.src = url
  })

// ── Spinner ────────────────────────────────────────────────────
const Spinner = ({ size = 16, color = 'border-brand-400' }) => (
  <motion.div
    className={`rounded-full border-2 border-white/20 border-t-current ${color}`}
    style={{ width: size, height: size }}
    animate={{ rotate: 360 }}
    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
  />
)

// ── Upload progress bar ────────────────────────────────────────
const UploadProgressCard = ({ phase, progress, current, total }) => (
  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card p-4 space-y-3">
    {total > 1 && (
      <p className="text-xs text-white/40 font-medium">Đang xử lý ảnh {current}/{total}</p>
    )}
    {/* Upload progress */}
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium flex items-center gap-2">
          {phase === 'uploading' ? (<><Spinner size={14} /><span>Đang gửi ảnh...</span></>) : (<><CheckCircle size={14} className="text-green-400" /><span className="text-green-400">Đã nhận file</span></>)}
        </span>
        <span className="text-sm text-white/60 font-mono">{phase === 'uploading' ? `${progress}%` : '100%'}</span>
      </div>
      <div className="h-2 bg-surface-200 rounded-full overflow-hidden">
        <motion.div
          animate={{ width: phase === 'uploading' ? `${progress}%` : '100%' }}
          transition={{ duration: 0.3 }}
          className="h-full bg-gradient-brand rounded-full relative overflow-hidden"
        >
          <motion.div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
            animate={{ x: ['-100%','100%'] }} transition={{ duration: 1.2, repeat: Infinity, ease:'linear' }} />
        </motion.div>
      </div>
    </div>
    {/* Processing */}
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium flex items-center gap-2">
          {phase === 'processing'
            ? (<><Spinner size={14} color="border-violet-400" /><span className="text-violet-300">Đang xử lý (resize • AI check)...</span></>)
            : (<span className="text-white/30">Chờ xử lý</span>)}
        </span>
      </div>
      <div className="h-2 bg-surface-200 rounded-full overflow-hidden">
        {phase === 'processing' ? (
          <motion.div className="h-full rounded-full"
            style={{ background:'linear-gradient(90deg,#7c3aed,#a78bfa,#7c3aed)', backgroundSize:'200% 100%' }}
            animate={{ backgroundPosition:['0%','100%','0%'] }} transition={{ duration:2, repeat:Infinity }} />
        ) : <div className="h-full w-0" />}
      </div>
    </div>
    <p className="text-xs text-white/30 text-center">Đừng đóng tab trong khi đang upload</p>
  </motion.div>
)

// ── defaultMeta factory ────────────────────────────────────────
const defaultMeta = () => ({
  caption:'', tags:[], category:'', isPremium:false,
  priceInCoins:50, isAIGenerated:false, aiTool:'',
  resolution:'', orientation:'',
})

// ── Main UploadPage ────────────────────────────────────────────
const UploadPage = () => {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const [queue, setQueue]           = useState([]) // [{file, preview, status, detected}]
  const [activeIdx, setActiveIdx]   = useState(0)
  const [tag, setTag]               = useState('')
  const [uploadPhase, setUploadPhase] = useState(null)
  const [progress, setProgress]     = useState(0)
  const [done, setDone]             = useState(false)
  const [uploadedCount, setUploadedCount] = useState(0)
  // Collection name — nhóm nhiều ảnh thành 1 bộ (saved in tags / caption)
  const [collectionName, setCollectionName] = useState('')
  // Shared metadata (áp cho tất cả) vs per-image
  const [sharedMeta, setSharedMeta] = useState(true)
  const [globalForm, setGlobalForm] = useState(defaultMeta())
  const [perImageMeta, setPerImageMeta] = useState([]) // array theo index

  const isUploading = uploadPhase !== null
  const activeItem = queue[activeIdx]
  const detected = activeItem?.detected || {}

  const activeMeta = sharedMeta ? globalForm : (perImageMeta[activeIdx] || { ...defaultMeta(), ...queue[activeIdx]?.detected })
  const setActiveMeta = (updater) => {
    if (sharedMeta) {
      setGlobalForm(p => typeof updater === 'function' ? updater(p) : { ...p, ...updater })
    } else {
      setPerImageMeta(p => {
        const c = [...p]
        c[activeIdx] = typeof updater === 'function' ? updater(c[activeIdx] || defaultMeta()) : { ...(c[activeIdx] || defaultMeta()), ...updater }
        return c
      })
    }
  }

  // ── Add files to queue ────────────────────────────────────────
  const addFiles = useCallback(async (files) => {
    if (isUploading) return
    const remaining = 10 - queue.length
    if (remaining <= 0) return toast.error('Đã đạt tối đa 10 ảnh')
    const toAdd = Array.from(files).slice(0, remaining)
    const newItems = await Promise.all(toAdd.map(async (f) => {
      const preview = URL.createObjectURL(f)
      const detected = await detectImageMeta(f)
      return { file: f, preview, status: 'pending', detected }
    }))
    setQueue(prev => {
      const updated = [...prev, ...newItems]
      setActiveIdx(updated.length - 1)
      return updated
    })
    setPerImageMeta(prev => {
      const copy = [...prev]
      newItems.forEach((item, i) => {
        const idx = queue.length + i
        copy[idx] = { ...defaultMeta(), resolution: item.detected.resolution || '', orientation: item.detected.orientation || '' }
      })
      return copy
    })
  }, [queue.length, isUploading])

  // ── Dropzone (chỉ phần drop-area, thumbnails ở ngoài) ────────
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: addFiles,
    accept: { 'image/*': ['.jpg','.jpeg','.png','.webp'] },
    maxSize: 30 * 1024 * 1024,
    noClick: queue.length > 0,   // Khi đã có ảnh: click dropzone không mở picker
    disabled: isUploading,
    onDropRejected: (files) => {
      if (files[0]?.errors[0]?.code === 'file-too-large') toast.error('File quá lớn! Tối đa 30MB/ảnh')
      else toast.error('Định dạng không hỗ trợ. Dùng JPG, PNG, WebP')
    },
  })

  const removeFromQueue = (idx) => {
    URL.revokeObjectURL(queue[idx]?.preview)
    setQueue(prev => {
      const updated = prev.filter((_,i) => i !== idx)
      if (activeIdx >= updated.length) setActiveIdx(Math.max(0, updated.length - 1))
      return updated
    })
    setPerImageMeta(prev => prev.filter((_,i) => i !== idx))
  }

  const addTag = () => {
    const t = tag.toLowerCase().trim().replace(/[^a-z0-9_]/g,'')
    if (t && !activeMeta.tags.includes(t) && activeMeta.tags.length < 10) {
      setActiveMeta(prev => ({ ...prev, tags: [...prev.tags, t] }))
    }
    setTag('')
  }
  const removeTag = (t) => setActiveMeta(prev => ({ ...prev, tags: prev.tags.filter(x => x !== t) }))

  // ── Apply auto-detected ───────────────────────────────────────
  const applyDetected = () => {
    if (!detected.resolution) return
    setActiveMeta(prev => ({
      ...prev,
      resolution: detected.resolution,
      orientation: detected.orientation,
    }))
    toast.success(`Đã áp dụng: ${detected.resolution.toUpperCase()} ${detected.orientation}`)
  }

  // Áp dụng auto-detect cho TẤT CẢ ảnh
  const applyDetectedAll = async () => {
    setPerImageMeta(queue.map(item => ({
      ...(perImageMeta[queue.indexOf(item)] || defaultMeta()),
      resolution: item.detected?.resolution || '',
      orientation: item.detected?.orientation || '',
    })))
    toast.success('Đã tự động nhận diện cho tất cả ảnh!')
  }

  // ── Submit ────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (queue.length === 0) return toast.error('Chọn ít nhất 1 ảnh')
    if (sharedMeta && !globalForm.category) return toast.error('Chọn danh mục trước')

    setUploadPhase('uploading')
    setProgress(0)
    setUploadedCount(0)

    let successCount = 0
    for (let i = 0; i < queue.length; i++) {
      const item = queue[i]
      const itemMeta = sharedMeta ? globalForm : (perImageMeta[i] || defaultMeta())
      if (!itemMeta.category) {
        toast.error(`Ảnh ${i+1} chưa chọn danh mục, bỏ qua`)
        setQueue(prev => { const c=[...prev]; c[i]={...c[i],status:'error'}; return c })
        continue
      }
      setQueue(prev => { const c=[...prev]; c[i]={...c[i],status:'uploading'}; return c })
      setActiveIdx(i)

      const fd = new FormData()
      fd.append('image', item.file)
      // Nếu có collection name → thêm vào đầu caption
      const captionFinal = collectionName
        ? `[${collectionName}] ${itemMeta.caption}`.trim()
        : itemMeta.caption.trim()
      fd.append('caption', captionFinal)
      fd.append('tags', JSON.stringify([
        ...itemMeta.tags,
        ...(collectionName ? [collectionName.toLowerCase().replace(/\s+/g,'_')] : [])
      ]))
      fd.append('category', itemMeta.category)
      fd.append('isPremium', String(itemMeta.isPremium))
      fd.append('isAIGenerated', String(itemMeta.isAIGenerated))
      fd.append('priceInCoins', String(Number(itemMeta.priceInCoins)))
      if (itemMeta.aiTool) fd.append('aiTool', itemMeta.aiTool)
      if (itemMeta.resolution) fd.append('resolution', itemMeta.resolution)
      if (itemMeta.orientation) fd.append('orientation', itemMeta.orientation)

      let fakeP = 0, serverDone = false
      const fakeTimer = setInterval(() => {
        fakeP = Math.min(fakeP + 1 + Math.random()*2, 89)
        setProgress(Math.round(fakeP))
        if (serverDone && fakeP >= 89) { clearInterval(fakeTimer); setProgress(100) }
      }, 60)

      try {
        await api.post('/posts', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: evt => {
            const real = Math.round((evt.loaded*100)/evt.total)
            if (real > fakeP) { fakeP = real; setProgress(real) }
          },
        })
        serverDone = true
        clearInterval(fakeTimer)
        setProgress(100)
        setUploadPhase('processing')
        await new Promise(r => setTimeout(r, 700))
        setQueue(prev => { const c=[...prev]; c[i]={...c[i],status:'done'}; return c })
        successCount++
        setUploadedCount(successCount)
        if (i < queue.length - 1) { setUploadPhase('uploading'); setProgress(0) }
      } catch (err) {
        clearInterval(fakeTimer)
        toast.error(err.response?.data?.message || `Upload ảnh ${i+1} thất bại`)
        setQueue(prev => { const c=[...prev]; c[i]={...c[i],status:'error'}; return c })
        setUploadPhase('uploading')
        setProgress(0)
      }
    }
    setUploadPhase(null)
    if (successCount > 0) setDone(true)
    else toast.error('Không upload được ảnh nào')
  }

  const resetForm = () => {
    queue.forEach(item => URL.revokeObjectURL(item.preview))
    setQueue([]); setActiveIdx(0); setUploadPhase(null); setProgress(0)
    setDone(false); setUploadedCount(0); setGlobalForm(defaultMeta())
    setPerImageMeta([]); setCollectionName('')
  }

  // ── Done screen ───────────────────────────────────────────────
  if (done) return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <motion.div initial={{ scale:0.9, opacity:0 }} animate={{ scale:1, opacity:1 }}
        transition={{ type:'spring', duration:0.5 }}
        className="card p-8 max-w-md w-full text-center"
      >
        <motion.div initial={{ scale:0 }} animate={{ scale:1 }}
          transition={{ type:'spring', delay:0.1, bounce:0.5 }}
          className="w-20 h-20 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto mb-5"
        >
          <CheckCircle size={40} className="text-green-400" />
        </motion.div>
        <h2 className="text-2xl font-bold mb-2">
          {uploadedCount > 1 ? `Đã gửi ${uploadedCount} ảnh!` : 'Đã gửi thành công!'}
        </h2>
        {collectionName && <p className="text-violet-400 font-semibold mb-1">📁 Bộ sưu tập: {collectionName}</p>}
        <p className="text-white/60 mb-2">Ảnh đang trong hàng chờ xử lý & kiểm duyệt.</p>
        <div className="flex items-center justify-center gap-2 text-sm text-white/40 mb-6">
          <Clock size={14} /><span>Thường mất 10–60 giây</span>
        </div>
        <div className="flex gap-3 justify-center">
          <button onClick={resetForm} className="btn-secondary">Upload thêm</button>
          <button onClick={() => navigate('/my-posts')} className="btn-primary flex items-center gap-2">
            <LayoutGrid size={16} />Xem ảnh của tôi
          </button>
        </div>
      </motion.div>
    </div>
  )

  return (
    <div className="min-h-screen pb-24 md:pb-8 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}>
          <h1 className="text-2xl font-display font-bold mb-1">Upload Ảnh</h1>
          <p className="text-white/50 mb-6">Đăng 1 hoặc nhiều ảnh — tối đa 10 ảnh, 30MB/ảnh</p>
        </motion.div>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* ════════════════════════════════════════════
              BƯỚC 1: Khu vực chọn ảnh
          ════════════════════════════════════════════ */}

          {/* Drop zone — chỉ show khi chưa có ảnh hoặc đang drag */}
          <div
            {...getRootProps()}
            className={`relative rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer overflow-hidden
              ${isDragActive ? 'border-brand-500 bg-brand-500/10 scale-[1.01]' : 'border-white/20 hover:border-brand-500/50 bg-surface-50/50'}
              ${isUploading ? 'pointer-events-none opacity-70' : ''}
              ${queue.length > 0 ? (isDragActive ? 'block' : 'hidden') : 'block'}`}
          >
            <input {...getInputProps()} multiple disabled={isUploading} />
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <motion.div animate={isDragActive ? { scale:1.2 } : { scale:1 }}
                className="w-16 h-16 rounded-2xl bg-brand-500/20 flex items-center justify-center mb-4"
              >
                <Image size={28} className="text-brand-400" />
              </motion.div>
              <p className="font-medium mb-1">
                {isDragActive ? 'Thả ảnh vào đây...' : 'Kéo & thả ảnh hoặc click để chọn'}
              </p>
              <p className="text-sm text-white/40">JPG, PNG, WebP — tối đa 30MB/ảnh — tối đa 10 ảnh</p>
            </div>
          </div>

          {/* ── Preview ảnh active + nút thêm ────────── */}
          {queue.length > 0 && (
            <div
              {...getRootProps()}
              className={`relative rounded-2xl border-2 border-dashed transition-all duration-200 overflow-hidden
                ${isDragActive ? 'border-brand-500 bg-brand-500/10' : 'border-white/10'}
                ${isUploading ? 'pointer-events-none' : ''}`}
            >
              <input {...getInputProps()} multiple disabled={isUploading} />

              {/* Main preview — giữ đúng aspect ratio */}
              {activeItem && (
                <div className="relative bg-black/30">
                  {/* Lấy tỷ lệ tự nhiên, max-height để không quá cao */}
                  <div className="flex items-center justify-center" style={{ maxHeight: '360px' }}>
                    <img
                      src={activeItem.preview}
                      alt="Preview"
                      style={{ maxHeight: '360px', width: 'auto', maxWidth: '100%' }}
                      className="object-contain"
                    />
                  </div>

                  {/* Metadata badges overlay */}
                  {detected.width && (
                    <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5">
                      <span className="px-2 py-1 rounded-lg bg-black/75 backdrop-blur-sm text-[11px] font-mono text-white/80">
                        {detected.width}×{detected.height}
                      </span>
                      <span className="px-2 py-1 rounded-lg bg-black/75 backdrop-blur-sm text-[11px] font-bold text-violet-300 uppercase">
                        {detected.resolution}
                      </span>
                      <span className="px-2 py-1 rounded-lg bg-black/75 backdrop-blur-sm text-[11px] text-blue-300 capitalize">
                        {detected.orientation}
                      </span>
                      {detected.aspectStr && (
                        <span className="px-2 py-1 rounded-lg bg-black/75 backdrop-blur-sm text-[11px] text-white/50">
                          {detected.aspectStr}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="absolute top-3 left-3 text-xs bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-lg text-white/70 max-w-[60%] truncate">
                    {activeItem.file.name} • {(activeItem.file.size/1024/1024).toFixed(1)}MB
                  </div>
                </div>
              )}

              {/* Thumbnail strip — NGOÀI drop zone click area (noClick) */}
              <div
                className="p-3 bg-black/20"
                onClick={e => e.stopPropagation()} // QUAN TRỌNG: ngăn dropzone nhận click
              >
                <div className="flex items-center gap-2 flex-wrap">
                  {queue.map((item, idx) => {
                    const d = item.detected || {}
                    return (
                      <motion.div
                        key={item.preview}
                        layout
                        initial={{ opacity:0, scale:0.85 }}
                        animate={{ opacity:1, scale:1 }}
                        exit={{ opacity:0, scale:0.8 }}
                        onClick={(e) => { e.stopPropagation(); setActiveIdx(idx) }}
                        className={`relative rounded-xl overflow-hidden cursor-pointer flex-shrink-0 transition-all duration-200
                          ${idx===activeIdx
                            ? 'ring-2 ring-violet-500 shadow-[0_0_16px_rgba(124,58,237,0.5)] scale-105'
                            : 'ring-1 ring-white/10 hover:ring-white/30 opacity-70 hover:opacity-100'
                          }`}
                        style={{ width:72, height:72 }}
                      >
                        <img
                          src={item.preview}
                          className="w-full h-full object-cover"
                          alt={`Ảnh ${idx+1}`}
                        />
                        {/* Status */}
                        {item.status==='done' && (
                          <div className="absolute inset-0 bg-green-500/40 flex items-center justify-center">
                            <CheckCircle size={18} className="text-white" />
                          </div>
                        )}
                        {item.status==='error' && (
                          <div className="absolute inset-0 bg-red-500/40 flex items-center justify-center">
                            <X size={18} className="text-white" />
                          </div>
                        )}
                        {item.status==='uploading' && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <Spinner size={18} />
                          </div>
                        )}
                        {/* Remove btn */}
                        {item.status !== 'uploading' && !isUploading && (
                          <button
                            type="button"
                            onClick={e => { e.stopPropagation(); removeFromQueue(idx) }}
                            className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/70 hover:bg-red-500 flex items-center justify-center transition-colors"
                          >
                            <X size={9} className="text-white" />
                          </button>
                        )}
                        {/* Index */}
                        <div className="absolute bottom-0.5 left-0.5 text-[9px] font-bold text-white bg-black/50 px-1 rounded">{idx+1}</div>
                        {/* Per-image detected info */}
                        {d.resolution && (
                          <div className="absolute top-0.5 left-0.5 text-[8px] font-bold uppercase bg-violet-700/80 text-white px-1 rounded">
                            {d.resolution}
                          </div>
                        )}
                      </motion.div>
                    )
                  })}

                  {/* Add more */}
                  {queue.length < 10 && !isUploading && (
                    <motion.button
                      type="button"
                      initial={{ opacity:0, scale:0.8 }}
                      animate={{ opacity:1, scale:1 }}
                      whileHover={{ scale:1.05 }}
                      onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}
                      className="flex-shrink-0 w-[72px] h-[72px] rounded-xl border-2 border-dashed border-white/20 hover:border-brand-500/50 flex flex-col items-center justify-center gap-1 transition-colors"
                    >
                      <Plus size={18} className="text-white/40" />
                      <span className="text-[9px] text-white/30">{10-queue.length} còn lại</span>
                    </motion.button>
                  )}
                </div>
                {/* Hidden input for "Add more" button */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={e => addFiles(Array.from(e.target.files || []))}
                  disabled={isUploading}
                />

                {queue.length > 1 && (
                  <p className="text-xs text-white/30 mt-2">
                    Click thumbnail để chọn ảnh muốn chỉnh thông tin {!sharedMeta && <span className="text-violet-400">• Đang chỉnh ảnh #{activeIdx+1}</span>}
                  </p>
                )}
              </div>

              {/* Drag-to-add overlay */}
              <AnimatePresence>
                {isDragActive && (
                  <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                    className="absolute inset-0 bg-brand-600/20 backdrop-blur-sm flex items-center justify-center z-20"
                  >
                    <p className="text-white font-bold text-lg">Thả ảnh vào đây để thêm</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* ── Auto-detect hint banner ────────────────── */}
          {activeItem && detected.resolution && (activeMeta.resolution !== detected.resolution) && (
            <motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-violet-600/10 border border-violet-500/20"
            >
              <Zap size={15} className="text-violet-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white/70">
                  Phát hiện: <b className="text-violet-300 uppercase">{detected.resolution}</b> •&nbsp;
                  <b className="text-blue-300 capitalize">{detected.orientation}</b>&nbsp;
                  <span className="text-white/40 text-xs">({detected.width}×{detected.height})</span>
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                {queue.length > 1 && sharedMeta && (
                  <button type="button" onClick={applyDetectedAll}
                    className="px-2.5 py-1.5 rounded-lg bg-violet-900/60 border border-violet-700/50 text-white text-xs font-semibold hover:bg-violet-800/60 transition-colors"
                  >Tất cả</button>
                )}
                <button type="button" onClick={applyDetected}
                  className="px-2.5 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-bold hover:bg-violet-500 transition-colors"
                >Áp dụng</button>
              </div>
            </motion.div>
          )}

          {/* ════════════════════════════════════════════
              BƯỚC 2: Collection name (nếu > 1 ảnh)
          ════════════════════════════════════════════ */}
          {queue.length > 1 && (
            <motion.div
              initial={{ opacity:0, height:0 }}
              animate={{ opacity:1, height:'auto' }}
              className="card p-4 space-y-3"
            >
              <div className="flex items-center gap-2.5 mb-1">
                <FolderHeart size={18} className="text-violet-400" />
                <h3 className="font-bold text-sm">Bộ sưu tập (tùy chọn)</h3>
                <span className="text-xs text-white/30">• Nhóm các ảnh này thành 1 album</span>
              </div>
              <input
                className="input"
                placeholder="Ví dụ: Chuyến du lịch Hà Giang 2025"
                value={collectionName}
                onChange={e => setCollectionName(e.target.value)}
                maxLength={60}
                disabled={isUploading}
              />
              {collectionName && (
                <p className="text-xs text-white/40">
                  Tag <code className="text-violet-400 bg-white/5 px-1 rounded">{collectionName.toLowerCase().replace(/\s+/g,'_')}</code> sẽ được thêm vào tất cả ảnh
                </p>
              )}
            </motion.div>
          )}

          {/* ── Shared vs per-image toggle ─────────────── */}
          {queue.length > 1 && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/3 border border-white/8">
              <Info size={15} className="text-white/40 shrink-0" />
              <p className="text-xs text-white/50 flex-1">
                {sharedMeta
                  ? 'Dùng chung 1 bộ thông tin cho tất cả ảnh'
                  : `Chỉnh thông tin riêng — hiện đang chỉnh ảnh #${activeIdx+1}`}
              </p>
              <button type="button"
                onClick={() => {
                  if (sharedMeta) {
                    setPerImageMeta(queue.map(() => ({ ...globalForm })))
                  } else {
                    setGlobalForm({ ...(perImageMeta[0] || defaultMeta()) })
                  }
                  setSharedMeta(v => !v)
                }}
                className="px-3 py-1.5 rounded-xl border border-white/15 text-white/60 text-xs hover:text-white hover:border-white/30 transition-all shrink-0 font-semibold"
              >
                {sharedMeta ? 'Chỉnh riêng từng ảnh' : 'Dùng chung'}
              </button>
            </div>
          )}

          {/* ════════════════════════════════════════════
              BƯỚC 3: Metadata form
          ════════════════════════════════════════════ */}

          {/* Caption */}
          <div>
            <label className="input-label">
              {!sharedMeta && queue.length > 1 ? `Mô tả ảnh #${activeIdx+1}` : 'Mô tả (tùy chọn)'}
            </label>
            <textarea
              className="input resize-none"
              rows={2}
              maxLength={500}
              placeholder="Mô tả ngắn về bức ảnh..."
              value={activeMeta.caption}
              onChange={e => setActiveMeta(p => ({ ...p, caption: e.target.value }))}
              disabled={isUploading}
            />
            <p className="text-xs text-white/30 text-right mt-0.5">{activeMeta.caption.length}/500</p>
          </div>

          {/* Category */}
          <div>
            <label className="input-label">Danh mục *</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <button key={cat} type="button" disabled={isUploading}
                  onClick={() => setActiveMeta(p => ({ ...p, category:cat }))}
                  className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-200 border
                    ${activeMeta.category===cat
                      ? 'bg-brand-600 border-brand-500 text-white shadow-[0_0_12px] shadow-brand-600/30'
                      : 'bg-surface-100 border-white/10 text-white/70 hover:border-brand-500/50'}`}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="input-label">Tags (tối đa 10)</label>
            <div className="flex gap-2 mb-2">
              <div className="relative flex-1">
                <Tag size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                <input className="input pl-8" placeholder="Thêm tag rồi Enter..."
                  value={tag} onChange={e => setTag(e.target.value)}
                  onKeyDown={e => { if (e.key==='Enter'||e.key===',') { e.preventDefault(); addTag() } }}
                  disabled={isUploading}
                />
              </div>
              <button type="button" onClick={addTag} disabled={isUploading} className="btn-secondary px-4">Thêm</button>
            </div>
            <div className="flex flex-wrap gap-2">
              <AnimatePresence>
                {activeMeta.tags.map(t => (
                  <motion.span key={t} initial={{ scale:0 }} animate={{ scale:1 }} exit={{ scale:0 }}
                    className="flex items-center gap-1 badge-brand text-sm px-3 py-1.5"
                  >
                    #{t}
                    <button type="button" onClick={() => removeTag(t)} className="ml-1 hover:text-red-400">
                      <X size={11} />
                    </button>
                  </motion.span>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Resolution + Orientation (auto) */}
          <div>
            <label className="input-label flex items-center gap-2">
              <Camera size={14} className="text-white/40" />
              Thông số kỹ thuật
              {detected.width && (
                <span className="text-[10px] text-white/30 font-normal">
                  • Detected: {detected.width}×{detected.height}px • {detected.aspectStr} ratio
                </span>
              )}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-white/40 mb-1 block">
                  Độ phân giải
                  {detected.resolution && activeMeta.resolution === detected.resolution && (
                    <span className="ml-1.5 text-green-400 font-bold">✓ Tự động</span>
                  )}
                </label>
                <select className="input" value={activeMeta.resolution}
                  onChange={e => setActiveMeta(p => ({ ...p, resolution:e.target.value }))}
                  disabled={isUploading}
                >
                  <option value="">Không rõ</option>
                  <option value="hd">HD (720p–1080p)</option>
                  <option value="2k">2K (1440p)</option>
                  <option value="4k">4K (2160p+)</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1 block">
                  Chiều ảnh
                  {detected.orientation && activeMeta.orientation === detected.orientation && (
                    <span className="ml-1.5 text-green-400 font-bold">✓ Tự động</span>
                  )}
                </label>
                <select className="input" value={activeMeta.orientation}
                  onChange={e => setActiveMeta(p => ({ ...p, orientation:e.target.value }))}
                  disabled={isUploading}
                >
                  <option value="">Không rõ</option>
                  <option value="portrait">Dọc (Portrait)</option>
                  <option value="landscape">Ngang (Landscape)</option>
                  <option value="square">Vuông</option>
                </select>
              </div>
            </div>
          </div>

          {/* AI + Premium toggles */}
          <div className="space-y-3">
            {/* AI */}
            <div className={`flex items-center gap-3 card p-3.5 ${isUploading ? 'opacity-50 pointer-events-none':''}`}>
              <Cpu size={18} className="text-brand-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">Ảnh AI Generated</p>
                <p className="text-xs text-white/40 truncate">Midjourney, Stable Diffusion, DALL·E...</p>
              </div>
              <div onClick={() => setActiveMeta(p => ({ ...p, isAIGenerated:!p.isAIGenerated }))}
                className={`w-11 h-6 rounded-full transition-colors duration-200 relative cursor-pointer flex-shrink-0 ${activeMeta.isAIGenerated?'bg-brand-600':'bg-white/20'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${activeMeta.isAIGenerated?'translate-x-6':'translate-x-1'}`} />
              </div>
            </div>

            {/* Premium */}
            <div className={`flex items-center gap-3 card p-3.5 ${isUploading ? 'opacity-50 pointer-events-none':''}`}>
              <DollarSign size={18} className="text-yellow-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">Ảnh Premium</p>
                <p className="text-xs text-white/40">User trả xu để tải bản gốc full-res</p>
              </div>
              <div onClick={() => setActiveMeta(p => ({ ...p, isPremium:!p.isPremium }))}
                className={`w-11 h-6 rounded-full transition-colors duration-200 relative cursor-pointer flex-shrink-0 ${activeMeta.isPremium?'bg-yellow-500':'bg-white/20'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${activeMeta.isPremium?'translate-x-6':'translate-x-1'}`} />
              </div>
            </div>
          </div>

          {activeMeta.isPremium && (
            <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} className="card p-4 space-y-2">
              <label className="input-label">Giá tải (xu)</label>
              <input type="number" className="input" min={10} max={1000}
                value={activeMeta.priceInCoins}
                onChange={e => setActiveMeta(p => ({ ...p, priceInCoins:parseInt(e.target.value)||50 }))}
                disabled={isUploading}
              />
              <div className="flex gap-2 flex-wrap">
                {[20,50,100,200,500].map(v => (
                  <button key={v} type="button"
                    onClick={() => setActiveMeta(p => ({ ...p, priceInCoins:v }))}
                    className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${activeMeta.priceInCoins===v?'bg-yellow-500/20 border-yellow-500/50 text-yellow-300':'border-white/10 text-white/40 hover:border-white/20'}`}
                  >{v} xu</button>
                ))}
              </div>
              <p className="text-xs text-white/30">
                Creator nhận <b className="text-yellow-400">{Math.floor(activeMeta.priceInCoins*0.7)} xu</b> mỗi lượt tải
                (phí platform 30%)
              </p>
            </motion.div>
          )}

          {/* Upload progress */}
          <AnimatePresence>
            {isUploading && (
              <UploadProgressCard phase={uploadPhase} progress={progress}
                current={uploadedCount+1} total={queue.length} />
            )}
          </AnimatePresence>

          {/* Submit */}
          <motion.button whileTap={{ scale:0.98 }} type="submit"
            disabled={isUploading || queue.length===0}
            className="btn-full"
          >
            {isUploading ? (
              <div className="flex items-center gap-2">
                <Spinner size={18} color="border-white" />
                {uploadPhase==='uploading'
                  ? `Đang gửi ảnh ${uploadedCount+1}/${queue.length} (${progress}%)...`
                  : 'Đang xử lý...'}
              </div>
            ) : (
              <>
                <Upload size={18} />
                {queue.length>1
                  ? `Đăng ${queue.length} ảnh${collectionName?' — '+collectionName:''}`
                  : 'Đăng ảnh'}
              </>
            )}
          </motion.button>
        </form>
      </div>
    </div>
  )
}

export default UploadPage
