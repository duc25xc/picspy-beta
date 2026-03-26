import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, Image, X, Tag, DollarSign, Sparkles, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/api'

const CATEGORIES = ['nature', 'anime', 'minimal', 'abstract', 'city', 'space', 'dark', 'light', 'gradient', 'other']
const CATEGORY_LABELS = {
  nature: '🌿 Thiên nhiên', anime: '🎌 Anime', minimal: '◻️ Minimal',
  abstract: '🎨 Abstract', city: '🌃 Thành phố', space: '🚀 Vũ trụ',
  dark: '🌑 Dark', light: '☀️ Light', gradient: '🌈 Gradient', other: '✨ Khác',
}

const UploadPage = () => {
  const [preview, setPreview] = useState(null)
  const [file, setFile] = useState(null)
  const [tag, setTag] = useState('')
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [done, setDone] = useState(false)
  const [form, setForm] = useState({
    caption: '', tags: [], category: '', isPremium: false,
    priceInCoins: 50, isAIGenerated: false, aiTool: '', resolution: '', orientation: '',
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
    onDrop, accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] }, maxFiles: 1, maxSize: 20971520,
  })

  const addTag = () => {
    const t = tag.toLowerCase().trim().replace(/[^a-z0-9_]/g, '')
    if (t && !form.tags.includes(t) && form.tags.length < 10) {
      setForm({ ...form, tags: [...form.tags, t] })
    }
    setTag('')
  }

  const removeTag = (t) => setForm({ ...form, tags: form.tags.filter((x) => x !== t) })

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

    setUploading(true)
    try {
      await api.post('/posts', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => setProgress(Math.round((e.loaded * 100) / e.total)),
      })
      setDone(true)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload thất bại')
      setUploading(false)
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="card p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={36} className="text-green-400" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Đã gửi thành công!</h2>
          <p className="text-white/60 mb-6">Ảnh đang được xử lý. Bạn sẽ nhận thông báo khi hoàn tất kiểm duyệt.</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => { setDone(false); setPreview(null); setFile(null); setProgress(0); setUploading(false) }} className="btn-secondary">
              Upload thêm
            </button>
            <button onClick={() => navigate('/')} className="btn-primary">Về trang chủ</button>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-24 md:pb-8 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-display font-bold mb-1">Upload Wallpaper</h1>
          <p className="text-white/50 mb-6">Chia sẻ tác phẩm của bạn với cộng đồng</p>
        </motion.div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`relative rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer overflow-hidden
              ${isDragActive ? 'border-brand-500 bg-brand-500/10' : 'border-white/20 hover:border-brand-500/50 bg-surface-50'}`}
          >
            <input {...getInputProps()} />
            {preview ? (
              <div className="relative">
                <img src={preview} alt="Preview" className="w-full max-h-80 object-contain" />
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setPreview(null); setFile(null) }}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-brand-500/20 flex items-center justify-center mb-4">
                  <Image size={28} className="text-brand-400" />
                </div>
                <p className="font-medium mb-1">{isDragActive ? 'Thả ảnh vào đây...' : 'Kéo & thả ảnh hoặc click để chọn'}</p>
                <p className="text-sm text-white/40">JPG, PNG, WebP — tối đa 20MB</p>
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
            />
            <p className="text-xs text-white/30 text-right mt-1">{form.caption.length}/500</p>
          </div>

          {/* Category */}
          <div>
            <label className="input-label">Danh mục *</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat} type="button"
                  onClick={() => setForm({ ...form, category: cat })}
                  className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-200 border
                    ${form.category === cat ? 'bg-brand-600 border-brand-500 text-white' : 'bg-surface-100 border-white/10 text-white/70 hover:border-brand-500/50'}`}
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
                <Tag size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  className="input pl-8"
                  placeholder="Thêm tag..."
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag() } }}
                />
              </div>
              <button type="button" onClick={addTag} className="btn-secondary px-4">Thêm</button>
            </div>
            <div className="flex flex-wrap gap-2">
              <AnimatePresence>
                {form.tags.map((t) => (
                  <motion.span
                    key={t} initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                    className="flex items-center gap-1 badge-brand text-sm px-3 py-1.5"
                  >
                    #{t}
                    <button type="button" onClick={() => removeTag(t)} className="ml-1 hover:text-red-400"><X size={12} /></button>
                  </motion.span>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Options */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="input-label">Độ phân giải</label>
              <select className="input" value={form.resolution} onChange={(e) => setForm({ ...form, resolution: e.target.value })}>
                <option value="">Không rõ</option>
                <option value="hd">HD (1080p)</option>
                <option value="2k">2K</option>
                <option value="4k">4K</option>
              </select>
            </div>
            <div>
              <label className="input-label">Chiều ảnh</label>
              <select className="input" value={form.orientation} onChange={(e) => setForm({ ...form, orientation: e.target.value })}>
                <option value="">Không rõ</option>
                <option value="portrait">Dọc (Portrait)</option>
                <option value="landscape">Ngang (Landscape)</option>
                <option value="square">Vuông</option>
              </select>
            </div>
          </div>

          {/* AI Toggle */}
          <label className="flex items-center gap-3 cursor-pointer card p-4">
            <Sparkles size={20} className="text-brand-400" />
            <div className="flex-1">
              <p className="font-medium text-sm">Ảnh AI Generated</p>
              <p className="text-xs text-white/40">Đánh dấu nếu ảnh được tạo bởi AI (Midjourney, SD...)</p>
            </div>
            <div
              onClick={() => setForm({ ...form, isAIGenerated: !form.isAIGenerated })}
              className={`w-12 h-6 rounded-full transition-colors duration-200 relative ${form.isAIGenerated ? 'bg-brand-600' : 'bg-white/20'}`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${form.isAIGenerated ? 'translate-x-7' : 'translate-x-1'}`} />
            </div>
          </label>

          {/* Premium Toggle */}
          <label className="flex items-center gap-3 cursor-pointer card p-4">
            <DollarSign size={20} className="text-yellow-400" />
            <div className="flex-1">
              <p className="font-medium text-sm">Ảnh Premium (tính phí tải)</p>
              <p className="text-xs text-white/40">User cần dùng xu để tải full-res</p>
            </div>
            <div
              onClick={() => setForm({ ...form, isPremium: !form.isPremium })}
              className={`w-12 h-6 rounded-full transition-colors duration-200 relative ${form.isPremium ? 'bg-yellow-500' : 'bg-white/20'}`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${form.isPremium ? 'translate-x-7' : 'translate-x-1'}`} />
            </div>
          </label>

          {form.isPremium && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
              <label className="input-label">Giá tải (xu)</label>
              <input
                type="number" className="input" min={10} max={1000} value={form.priceInCoins}
                onChange={(e) => setForm({ ...form, priceInCoins: parseInt(e.target.value) })}
              />
              <p className="text-xs text-white/30 mt-1">≈ {form.priceInCoins * 5}đ • Creator nhận {Math.floor(form.priceInCoins * 0.7)} xu</p>
            </motion.div>
          )}

          {/* Upload progress */}
          {uploading && (
            <div className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Đang upload...</span>
                <span className="text-sm text-white/60">{progress}%</span>
              </div>
              <div className="h-2 bg-surface-200 rounded-full overflow-hidden">
                <motion.div animate={{ width: `${progress}%` }} className="h-full bg-gradient-brand rounded-full" />
              </div>
            </div>
          )}

          <motion.button
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={uploading || !file}
            className="btn-full"
          >
            {uploading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
