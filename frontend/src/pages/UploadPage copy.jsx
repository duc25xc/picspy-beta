import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload,
  Image,
  X,
  Tag,
  DollarSign,
  Sparkles,
  CheckCircle,
  Clock,
  LayoutGrid,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/api'

const CATEGORIES = [
  'nature',
  'anime',
  'minimal',
  'abstract',
  'city',
  'space',
  'dark',
  'light',
  'gradient',
  'other',
]
const CATEGORY_LABELS = {
  nature: '🌿 Thiên nhiên',
  anime: '🎌 Anime',
  minimal: '◻️ Minimal',
  abstract: '🎨 Abstract',
  city: '🌃 Thành phố',
  space: '🚀 Vũ trụ',
  dark: '🌑 Dark',
  light: '☀️ Light',
  gradient: '🌈 Gradient',
  other: '✨ Khác',
}

// ── Processing Dots Animation ──────────────────────────────
const ProcessingDots = () => (
  <span className="inline-flex gap-1 ml-1">
    {[0, 1, 2].map((i) => (
      <motion.span
        key={i}
        className="w-1.5 h-1.5 rounded-full bg-brand-400 inline-block"
        animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }}
        transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
      />
    ))}
  </span>
)

// ── Upload Progress Bar ────────────────────────────────────
const UploadProgressCard = ({ phase, progress }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className="card p-4 space-y-3"
  >
    {/* Phase 1: Gửi file lên server */}
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium flex items-center gap-2">
          {phase === 'uploading' ? (
            <>
              <motion.div
                className="w-3.5 h-3.5 border-2 border-brand-400 border-t-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
              />
              Đang gửi ảnh lên server...
            </>
          ) : (
            <>
              <CheckCircle size={14} className="text-green-400" />
              <span className="text-green-400">Đã nhận file</span>
            </>
          )}
        </span>
        <span className="text-sm text-white/60 font-mono">
          {phase === 'uploading' ? `${progress}%` : '100%'}
        </span>
      </div>
      <div className="h-2 bg-surface-200 rounded-full overflow-hidden">
        <motion.div
          animate={{ width: phase === 'uploading' ? `${progress}%` : '100%' }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="h-full bg-gradient-brand rounded-full relative overflow-hidden"
        >
          {/* Shimmer effect */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
          />
        </motion.div>
      </div>
    </div>

    {/* Phase 2: Server xử lý (Cloudinary + AI worker) */}
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium flex items-center gap-2">
          {phase === 'processing' ? (
            <>
              <motion.div
                className="w-3.5 h-3.5 border-2 border-violet-400 border-t-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
              />
              <span className="text-violet-300">
                Đang xử lý ảnh
                <ProcessingDots />
              </span>
            </>
          ) : (
            <span className="text-white/30">Chờ xử lý</span>
          )}
        </span>
        {phase === 'processing' && (
          <span className="text-xs text-white/40">
            resize • blurHash • AI check
          </span>
        )}
      </div>
      <div className="h-2 bg-surface-200 rounded-full overflow-hidden">
        {phase === 'processing' ? (
          <motion.div
            className="h-full rounded-full"
            style={{
              background: 'linear-gradient(90deg, #7c3aed, #a78bfa, #7c3aed)',
              backgroundSize: '200% 100%',
            }}
            animate={{ backgroundPosition: ['0% 0%', '100% 0%', '0% 0%'] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          />
        ) : (
          <div className="h-full w-0 bg-surface-200 rounded-full" />
        )}
      </div>
    </div>

    <p className="text-xs text-white/30 text-center">
      {phase === 'uploading'
        ? 'Đừng đóng tab này trong khi đang gửi ảnh'
        : 'Quá trình kiểm duyệt thường mất 10–30 giây'}
    </p>
  </motion.div>
)

// ── Main Component ─────────────────────────────────────────
const UploadPage = () => {
  const [preview, setPreview] = useState(null)
  const [file, setFile] = useState(null)
  const [tag, setTag] = useState('')
  const [uploadPhase, setUploadPhase] = useState(null) // null | 'uploading' | 'processing'
  const [progress, setProgress] = useState(0)
  const [done, setDone] = useState(false)
  const [form, setForm] = useState({
    caption: '',
    tags: [],
    category: '',
    isPremium: false,
    priceInCoins: 50,
    isAIGenerated: false,
    aiTool: '',
    resolution: '',
    orientation: '',
  })
  const navigate = useNavigate()

  const onDrop = useCallback((files) => {
    const f = files[0]
    if (!f) return
    setFile(f)
    const url = URL.createObjectURL(f)
    setPreview(url)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    maxFiles: 1,
    maxSize: 20971520,
    onDropRejected: (files) => {
      if (files[0]?.errors[0]?.code === 'file-too-large') {
        toast.error('File quá lớn! Tối đa 20MB')
      } else {
        toast.error('Định dạng không hỗ trợ. Dùng JPG, PNG, WebP')
      }
    },
  })

  const addTag = () => {
    const t = tag
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_]/g, '')
    if (t && !form.tags.includes(t) && form.tags.length < 10) {
      setForm({ ...form, tags: [...form.tags, t] })
    }
    setTag('')
  }

  const removeTag = (t) =>
    setForm({ ...form, tags: form.tags.filter((x) => x !== t) })

  const resetForm = () => {
    setDone(false)
    setPreview(null)
    setFile(null)
    setProgress(0)
    setUploadPhase(null)
    setForm({
      caption: '',
      tags: [],
      category: '',
      isPremium: false,
      priceInCoins: 50,
      isAIGenerated: false,
      aiTool: '',
      resolution: '',
      orientation: '',
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) return toast.error('Vui lòng chọn ảnh')
    if (!form.category) return toast.error('Vui lòng chọn danh mục')

    const fd = new FormData()
    fd.append('image', file)
    Object.entries(form).forEach(([k, v]) => {
      if (k === 'tags') fd.append(k, JSON.stringify(v))
      else fd.append(k, v)
    })

    setUploadPhase('uploading')
    setProgress(0)

    try {
      // Phase 1: Gửi file lên backend (progress bar thật)
      await api.post('/posts', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          const pct = Math.round((e.loaded * 100) / e.total)
          setProgress(pct)
          // Khi gửi xong, chuyển sang phase xử lý
          if (pct >= 100) {
            setTimeout(() => setUploadPhase('processing'), 300)
          }
        },
      })

      // Phase 2: Server đã nhận & đang xử lý (giả lập 1.5s UX)
      // Thực tế worker xử lý async, ta chỉ notify user
      await new Promise((r) => setTimeout(r, 1500))
      setDone(true)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload thất bại')
      setUploadPhase(null)
      setProgress(0)
    }
  }

  // ── Done State ─────────────────────────────────────────
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
            className="w-20 h-20 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto mb-5"
          >
            <CheckCircle size={40} className="text-green-400" />
          </motion.div>

          <h2 className="text-2xl font-bold mb-2">Đã gửi thành công!</h2>
          <p className="text-white/60 mb-2">
            Ảnh đang trong hàng chờ xử lý & kiểm duyệt.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-white/40 mb-6">
            <Clock size={14} />
            <span>Thường mất 10–60 giây để hoàn tất</span>
          </div>

          {/* Status timeline */}
          <div className="flex items-center gap-2 mb-6 text-xs">
            <div className="flex flex-col items-center gap-1">
              <div className="w-6 h-6 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center">
                <CheckCircle size={12} className="text-green-400" />
              </div>
              <span className="text-white/50">Nhận file</span>
            </div>
            <div className="flex-1 h-px bg-yellow-500/30" />
            <div className="flex flex-col items-center gap-1">
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-6 h-6 rounded-full bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center"
              >
                <Clock size={12} className="text-yellow-400" />
              </motion.div>
              <span className="text-yellow-400/80">Xử lý ảnh</span>
            </div>
            <div className="flex-1 h-px bg-white/10" />
            <div className="flex flex-col items-center gap-1">
              <div className="w-6 h-6 rounded-full bg-white/10 border border-white/10 flex items-center justify-center">
                <CheckCircle size={12} className="text-white/20" />
              </div>
              <span className="text-white/30">Duyệt</span>
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <button onClick={resetForm} className="btn-secondary">
              Upload thêm
            </button>
            <button
              onClick={() => navigate('/my-posts')}
              className="btn-primary flex items-center gap-2"
            >
              <LayoutGrid size={16} />
              Xem ảnh của tôi
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  // ── Upload Form ────────────────────────────────────────
  const isUploading = uploadPhase !== null

  return (
    <div className="min-h-screen pb-24 md:pb-8 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl font-display font-bold mb-1">
            Upload Wallpaper
          </h1>
          <p className="text-white/50 mb-6">
            Chia sẻ tác phẩm của bạn với cộng đồng
          </p>
        </motion.div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`relative rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer overflow-hidden
              ${
                isDragActive
                  ? 'border-brand-500 bg-brand-500/10 scale-[1.01]'
                  : 'border-white/20 hover:border-brand-500/50 bg-surface-50'
              }
              ${isUploading ? 'pointer-events-none opacity-70' : ''}`}
          >
            <input {...getInputProps()} disabled={isUploading} />
            {preview ? (
              <div className="relative">
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full max-h-80 object-contain"
                />
                {/* File info badge */}
                <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-sm text-xs text-white/70">
                  {file?.name} • {(file?.size / 1024 / 1024).toFixed(1)}MB
                </div>
                {!isUploading && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setPreview(null)
                      setFile(null)
                    }}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <motion.div
                  animate={isDragActive ? { scale: 1.2 } : { scale: 1 }}
                  className="w-16 h-16 rounded-2xl bg-brand-500/20 flex items-center justify-center mb-4"
                >
                  <Image size={28} className="text-brand-400" />
                </motion.div>
                <p className="font-medium mb-1">
                  {isDragActive
                    ? 'Thả ảnh vào đây...'
                    : 'Kéo & thả ảnh hoặc click để chọn'}
                </p>
                <p className="text-sm text-white/40">
                  JPG, PNG, WebP — tối đa 20MB
                </p>
              </div>
            )}
          </div>

          {/* Caption */}
          <div>
            <label className="input-label">Mô tả (tùy chọn)</label>
            <textarea
              className="input resize-none"
              rows={3}
              maxLength={500}
              placeholder="Mô tả về bức ảnh của bạn..."
              value={form.caption}
              onChange={(e) => setForm({ ...form, caption: e.target.value })}
              disabled={isUploading}
            />
            <p className="text-xs text-white/30 text-right mt-1">
              {form.caption.length}/500
            </p>
          </div>

          {/* Category */}
          <div>
            <label className="input-label">Danh mục *</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  disabled={isUploading}
                  onClick={() => setForm({ ...form, category: cat })}
                  className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-200 border
                    ${
                      form.category === cat
                        ? 'bg-brand-600 border-brand-500 text-white'
                        : 'bg-surface-100 border-white/10 text-white/70 hover:border-brand-500/50'
                    }`}
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
                <Tag
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
                />
                <input
                  className="input pl-8"
                  placeholder="Thêm tag..."
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault()
                      addTag()
                    }
                  }}
                  disabled={isUploading}
                />
              </div>
              <button
                type="button"
                onClick={addTag}
                disabled={isUploading}
                className="btn-secondary px-4"
              >
                Thêm
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <AnimatePresence>
                {form.tags.map((t) => (
                  <motion.span
                    key={t}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className="flex items-center gap-1 badge-brand text-sm px-3 py-1.5"
                  >
                    #{t}
                    <button
                      type="button"
                      onClick={() => removeTag(t)}
                      disabled={isUploading}
                      className="ml-1 hover:text-red-400"
                    >
                      <X size={12} />
                    </button>
                  </motion.span>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Options */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="input-label">Độ phân giải</label>
              <select
                className="input"
                value={form.resolution}
                onChange={(e) =>
                  setForm({ ...form, resolution: e.target.value })
                }
                disabled={isUploading}
              >
                <option value="">Không rõ</option>
                <option value="hd">HD (1080p)</option>
                <option value="2k">2K</option>
                <option value="4k">4K</option>
              </select>
            </div>
            <div>
              <label className="input-label">Chiều ảnh</label>
              <select
                className="input"
                value={form.orientation}
                onChange={(e) =>
                  setForm({ ...form, orientation: e.target.value })
                }
                disabled={isUploading}
              >
                <option value="">Không rõ</option>
                <option value="portrait">Dọc (Portrait)</option>
                <option value="landscape">Ngang (Landscape)</option>
                <option value="square">Vuông</option>
              </select>
            </div>
          </div>

          {/* AI Toggle */}
          <label
            className={`flex items-center gap-3 cursor-pointer card p-4 ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
          >
            <Sparkles size={20} className="text-brand-400" />
            <div className="flex-1">
              <p className="font-medium text-sm">Ảnh AI Generated</p>
              <p className="text-xs text-white/40">
                Đánh dấu nếu ảnh được tạo bởi AI (Midjourney, SD...)
              </p>
            </div>
            <div
              onClick={() =>
                setForm({ ...form, isAIGenerated: !form.isAIGenerated })
              }
              className={`w-12 h-6 rounded-full transition-colors duration-200 relative ${form.isAIGenerated ? 'bg-brand-600' : 'bg-white/20'}`}
            >
              <div
                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${form.isAIGenerated ? 'translate-x-7' : 'translate-x-1'}`}
              />
            </div>
          </label>

          {/* Premium Toggle */}
          <label
            className={`flex items-center gap-3 cursor-pointer card p-4 ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
          >
            <DollarSign size={20} className="text-yellow-400" />
            <div className="flex-1">
              <p className="font-medium text-sm">Ảnh Premium (tính phí tải)</p>
              <p className="text-xs text-white/40">
                User cần dùng xu để tải full-res
              </p>
            </div>
            <div
              onClick={() => setForm({ ...form, isPremium: !form.isPremium })}
              className={`w-12 h-6 rounded-full transition-colors duration-200 relative ${form.isPremium ? 'bg-yellow-500' : 'bg-white/20'}`}
            >
              <div
                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${form.isPremium ? 'translate-x-7' : 'translate-x-1'}`}
              />
            </div>
          </label>

          {form.isPremium && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
            >
              <label className="input-label">Giá tải (xu)</label>
              <input
                type="number"
                className="input"
                min={10}
                max={1000}
                value={form.priceInCoins}
                onChange={(e) =>
                  setForm({ ...form, priceInCoins: parseInt(e.target.value) })
                }
                disabled={isUploading}
              />
              <p className="text-xs text-white/30 mt-1">
                ≈ {form.priceInCoins * 5}đ • Creator nhận{' '}
                {Math.floor(form.priceInCoins * 0.7)} xu
              </p>
            </motion.div>
          )}

          {/* Upload Progress */}
          <AnimatePresence>
            {isUploading && (
              <UploadProgressCard phase={uploadPhase} progress={progress} />
            )}
          </AnimatePresence>

          <motion.button
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isUploading || !file}
            className="btn-full"
          >
            {isUploading ? (
              <div className="flex items-center gap-2">
                <motion.div
                  className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                />
                {uploadPhase === 'uploading'
                  ? `Đang gửi ${progress}%...`
                  : 'Đang xử lý...'}
              </div>
            ) : (
              <>
                <Upload size={18} />
                Đăng ảnh
              </>
            )}
          </motion.button>
        </form>
      </div>
    </div>
  )
}

export default UploadPage
