/**
 * UploadComponents.jsx
 * Reusable sub-components cho UploadPage
 */
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Copy, Check, ChevronDown, Sparkles, Coins, History, HelpCircle, Loader2 } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import toast from 'react-hot-toast'
import api from '../api/api'
import { AI_TOOLS } from './uploadConstants.js'

const ACCEPT = { 'image/jpeg': [], 'image/png': [], 'image/webp': [] }
const MAX_SIZE = 20 * 1024 * 1024 // 20MB

// ── ImageDropZone ────────────────────────────────────────────────
/**
 * Drag-and-drop zone có thể nhận nhiều ảnh.
 * @param {object[]} images   - [{id, file, preview}]
 * @param {Function} onAdd    - (File[]) => void
 * @param {Function} onRemove - (id) => void
 * @param {number}   max      - tối đa bao nhiêu ảnh
 * @param {string}   label    - tiêu đề zone
 * @param {string}   hint     - mô tả phụ
 * @param {boolean}  required - hiển thị dấu *
 */
export function ImageDropZone({
  images = [],
  onAdd,
  onRemove,
  max = 5,
  label,
  hint,
  required,
}) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: ACCEPT,
    maxSize: MAX_SIZE,
    maxFiles: max - images.length,
    onDropAccepted: onAdd,
    onDropRejected: (files) => {
      files.forEach(({ errors }) => {
        if (errors[0]?.code === 'file-too-large') window.alert?.('Ảnh quá 20MB')
      })
    },
    disabled: images.length >= max,
  })

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-white/80">
          {label} {required && <span className="text-red-400">*</span>}
          <span className="ml-2 text-white/30 font-normal">
            ({images.length}/{max})
          </span>
        </label>
        {hint && <span className="text-xs text-white/30">{hint}</span>}
      </div>

      {/* Thumbnails + Add button */}
      <div className="flex flex-wrap gap-2">
        {images.map((img) => (
          <motion.div
            key={img.id}
            layout
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            className="relative w-24 h-24 rounded-xl overflow-hidden border border-white/10 group"
          >
            <img
              src={img.preview}
              alt=""
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={() => onRemove(img.id)}
              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 flex items-center justify-center
                opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80"
            >
              <X size={12} className="text-white" />
            </button>
          </motion.div>
        ))}

        {/* Drop zone / Add button */}
        {images.length < max && (
          <div
            {...getRootProps()}
            className={`w-24 h-24 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer
              transition-all duration-200 select-none
              ${
                isDragActive
                  ? 'border-brand-400 bg-brand-900/30'
                  : 'border-white/15 hover:border-white/30 hover:bg-white/5'
              }`}
          >
            <input {...getInputProps()} />
            <Plus
              size={20}
              className={isDragActive ? 'text-brand-400' : 'text-white/30'}
            />
            <span className="text-[10px] text-white/30 mt-1">
              {isDragActive ? 'Thả vào' : 'Thêm'}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── AIToolSelector ───────────────────────────────────────────────
export function AIToolSelector({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const selected = AI_TOOLS.find((t) => t.value === value) || null

  return (
    <div className="relative">
      <label className="input-label">
        Công cụ AI <span className="text-red-400">*</span>
      </label>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="input text-left flex items-center justify-between gap-2"
      >
        {selected ? (
          <span className="flex items-center gap-2">
            <span
              style={{ color: selected.color }}
              className="font-bold text-lg leading-none"
            >
              {selected.icon}
            </span>
            <span>{selected.label}</span>
          </span>
        ) : (
          <span className="text-white/40">Chọn công cụ AI đã dùng...</span>
        )}
        <ChevronDown
          size={16}
          className={`text-white/40 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 top-full mt-1 left-0 right-0 rounded-xl overflow-hidden border border-white/10
              shadow-[0_16px_48px_rgba(0,0,0,0.5)]"
            style={{ background: '#1a1a24' }}
          >
            {AI_TOOLS.map((tool) => (
              <button
                key={tool.value}
                type="button"
                onClick={() => {
                  onChange(tool.value)
                  setOpen(false)
                }}
                className={`w-full px-4 py-2.5 flex items-center gap-3 text-left text-sm transition-colors
                  hover:bg-white/6 ${value === tool.value ? 'bg-white/8' : ''}`}
              >
                <span
                  style={{ color: tool.color }}
                  className="font-bold text-base w-5 text-center"
                >
                  {tool.icon}
                </span>
                <span
                  className={
                    value === tool.value
                      ? 'text-white font-medium'
                      : 'text-white/70'
                  }
                >
                  {tool.label}
                </span>
                {value === tool.value && (
                  <Check size={14} className="ml-auto text-brand-400" />
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── PromptField ──────────────────────────────────────────────────
export function PromptField({
  value,
  onChange,
  label,
  placeholder,
  maxLength = 2000,
  required,
}) {
  const [copied, setCopied] = useState(false)
  const pct = Math.min((value.length / maxLength) * 100, 100)
  const near = value.length > maxLength * 0.85

  const sharedStyle = {
    lineHeight: '1.625',
    fontSize: '14px',
    fontFamily: 'JetBrains Mono, Fira Code, monospace',
    boxSizing: 'border-box',
  }

  // Selection & AI Scan state
  const textareaRef = useRef(null)
  const backdropRef = useRef(null)
  const [selection, setSelection] = useState({ start: 0, end: 0, text: '' })
  const [loading, setLoading] = useState(false)
  const [scanHistory, setScanHistory] = useState([])
  const [activeHistoryIndex, setActiveHistoryIndex] = useState(-1)

  const isPrimaryPrompt = label === 'Prompt'

  const adjustHeight = () => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      const minH = label === 'Prompt' ? 280 : (label === 'Negative Prompt' ? 90 : 150)
      textarea.style.height = `${Math.max(minH, textarea.scrollHeight)}px`
    }
  }

  useEffect(() => {
    adjustHeight()
  }, [value, label])

  const handleCopy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  // selection inside textarea
  const handleSelect = (e) => {
    if (!isPrimaryPrompt) return
    const start = e.target.selectionStart
    const end = e.target.selectionEnd
    const selectedText = value.slice(start, end).trim()
    if (selectedText.length > 0 && selectedText.length < 50) {
      setSelection({ start, end, text: selectedText })
    } else {
      setSelection({ start: 0, end: 0, text: '' })
    }
  }

  const handleMakeDynamic = () => {
    if (!selection.text) return
    const name = prompt('Nhập tên biến (Ví dụ: location, subject, camera, medium, accent_color...):')
    if (name) {
      const cleanName = name.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_')
      if (!cleanName) return
      
      const replacement = `{argument name="${cleanName}" default="${selection.text}"}`
      const newValue = value.slice(0, selection.start) + replacement + value.slice(selection.end)
      onChange(newValue)
      
      // Save original version to history if empty
      if (scanHistory.length === 0) {
        setScanHistory([{ prompt: value, variables: parseVariables(value) }])
        setActiveHistoryIndex(0)
      }
      
      setSelection({ start: 0, end: 0, text: '' })
    }
  }

  const handleMakeDynamicManual = () => {
    if (selection.text) {
      handleMakeDynamic()
      return
    }

    const targetWord = prompt('Nhập từ khóa trong prompt cần đổi thành biến số (Ví dụ: NEW YORK):')
    if (!targetWord || !targetWord.trim()) return

    const trimmedTarget = targetWord.trim()
    if (!value.includes(trimmedTarget)) {
      toast.error(`Không tìm thấy từ khóa "${trimmedTarget}" trong prompt của bạn!`)
      return
    }

    const name = prompt(`Nhập tên biến cho từ khóa "${trimmedTarget}" (Ví dụ: location, subject, camera...):`)
    if (name) {
      const cleanName = name.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_')
      if (!cleanName) return

      const replacement = `{argument name="${cleanName}" default="${trimmedTarget}"}`
      const newValue = value.replaceAll(trimmedTarget, replacement)
      onChange(newValue)

      if (scanHistory.length === 0) {
        setScanHistory([{ prompt: value, variables: parseVariables(value) }])
        setActiveHistoryIndex(0)
      }
      toast.success(`Đã chuyển đổi "${trimmedTarget}" thành biến số "${cleanName}"!`)
    }
  }

  const parseVariables = (txt) => {
    const regex = /\{argument\s+name="([^"]+)"\s+default="((?:[^"\\]|\\.)*)"\}/g
    const list = []
    let match
    while ((match = regex.exec(txt || '')) !== null) {
      if (!list.some(item => item.fullTag === match[0])) {
        list.push({ fullTag: match[0], name: match[1], default: match[2] })
      }
    }
    return list
  }

  const activeVariables = parseVariables(value)

  const handleDeleteVariable = (fullTag, defaultValue) => {
    const newValue = value.replaceAll(fullTag, defaultValue)
    onChange(newValue)
  }

  const handleAiScan = async () => {
    if (!value || value.trim().length === 0) {
      toast.error('Vui lòng nhập nội dung prompt trước khi quét!')
      return
    }
    setLoading(true)
    try {
      const { data } = await api.post('/ai/extract-arguments', { prompt: value })
      if (data.success) {
        let currentHistory = [...scanHistory]
        if (currentHistory.length === 0) {
          currentHistory = [{ prompt: value, variables: parseVariables(value) }]
        }
        const newScan = { prompt: data.formatted_prompt, variables: data.variables }
        const updatedHistory = [...currentHistory, newScan]
        
        setScanHistory(updatedHistory)
        setActiveHistoryIndex(updatedHistory.length - 1)
        onChange(data.formatted_prompt)
        
        toast.success(`Tự động trích xuất từ khóa động thành công! (Tiêu tốn ${data.tokensCost} token)`)
      }
    } catch (err) {
      console.error(err)
      const msg = err.response?.data?.message || 'Có lỗi xảy ra khi quét từ khóa'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleRestoreHistory = (idx) => {
    if (idx >= 0 && idx < scanHistory.length) {
      setActiveHistoryIndex(idx)
      onChange(scanHistory[idx].prompt)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="input-label">
          {label} {required && <span className="text-red-400">*</span>}
        </label>
        <div className="flex items-center gap-2">
          <span
            className={`text-xs ${near ? 'text-amber-400' : 'text-white/30'}`}
          >
            {value.length}/{maxLength}
          </span>
          {value.length > 0 && (
            <button
              type="button"
              onClick={handleCopy}
              className="text-xs flex items-center gap-1 text-white/30 hover:text-white/70 transition-colors"
            >
              {copied ? (
                <Check size={11} className="text-green-400" />
              ) : (
                <Copy size={11} />
              )}
              {copied ? 'Copied' : 'Copy'}
            </button>
          )}
        </div>
      </div>

      <div className="relative w-full rounded-xl overflow-hidden border border-white/10 bg-black/20 focus-within:border-[#7986eb]">
        {/* Backdrop highlights */}
        {isPrimaryPrompt && (
          <div
            ref={backdropRef}
            className="absolute inset-0 pointer-events-none whitespace-pre-wrap break-words font-mono text-sm leading-relaxed pr-10 bg-transparent border-none p-3.5 select-none overflow-hidden"
            style={{
              ...sharedStyle,
              color: 'transparent',
              minHeight: '280px',
              height: '100%',
              width: '100%',
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word',
            }}
          >
            {(() => {
              // Regex supporting escaped quotes (e.g. \"NĂNG LƯỢNG\")
              const regex = /(\{argument\s+name="[^"]+"\s+default="(?:[^"\\]|\\.)*"\})/g
              const parts = (value || '').split(regex)
              return parts.map((part, index) => {
                const match = part.match(/\{argument\s+name="([^"]+)"\s+default="((?:[^"\\]|\\.)*)"\}/)
                if (match) {
                  return (
                    <span
                      key={index}
                      className="rounded px-1 py-0.5 border-b border-[#7986eb] bg-[#7986eb]/25 text-transparent"
                      style={{
                        boxDecorationBreak: 'clone',
                        WebkitBoxDecorationBreak: 'clone',
                      }}
                    >
                      {part}
                    </span>
                  )
                }
                return <span key={index}>{part}</span>
              })
            })()}
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onSelect={handleSelect}
          placeholder={placeholder}
          maxLength={maxLength}
          rows={label === 'Prompt' ? 10 : (label === 'Negative Prompt' ? 4 : 5)}
          className="w-full resize-none leading-relaxed font-mono text-sm pr-10 focus:ring-0 focus:outline-none bg-transparent border-none p-3.5"
          style={{
            ...sharedStyle,
            minHeight: label === 'Prompt' ? '280px' : (label === 'Negative Prompt' ? '90px' : '150px'),
            position: 'relative',
            zIndex: 1,
            color: 'rgba(255, 255, 255, 0.85)',
            overflow: 'hidden',
          }}
        />
        {/* Helper overlay for selection */}
        {isPrimaryPrompt && selection.text && (
          <div className="absolute right-3 bottom-3 z-10">
            <motion.button
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              type="button"
              onClick={handleMakeDynamic}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#7986eb] text-white shadow-lg hover:bg-[#6c79df] transition-all"
            >
              <Plus size={11} /> Đặt làm biến số
            </motion.button>
          </div>
        )}
      </div>

      {/* Char bar */}
      <div className="h-0.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${near ? 'bg-amber-500' : 'bg-brand-600'}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Dynamic Variables & AI scanning tools */}
      {isPrimaryPrompt && (
        <div className="space-y-3 pt-1">
          {/* Action buttons row */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleAiScan}
              disabled={loading}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white transition-all bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={13} className="animate-spin text-[#7986eb]" />
                  Đang quét...
                </>
              ) : (
                <>
                  <Sparkles size={13} className="text-yellow-400" />
                  Tự động tìm từ khóa <span className="text-[10px] text-white/40 flex items-center gap-0.5 font-normal"><Coins size={9} /> -2 xu</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleMakeDynamicManual}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white transition-all bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20"
            >
              <Plus size={13} className="text-[#a5b0f5]" />
              Đặt biến số thủ công
            </button>

            {/* Selection highlight prompt helper */}
            <span className="text-[10px] text-white/35 flex items-center gap-1">
              <HelpCircle size={10} />
              Mẹo: Bôi đen từ bất kỳ để đặt làm từ khóa động
            </span>
          </div>

          {/* History Drawer */}
          {scanHistory.length > 0 && (
            <div className="flex items-center gap-2 text-xs py-1">
              <span className="text-white/35 flex items-center gap-1">
                <History size={11} /> Lịch sử quét:
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {scanHistory.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleRestoreHistory(idx)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                      idx === activeHistoryIndex
                        ? 'bg-[#7986eb]/25 border border-[#7986eb]/50 text-[#a5b0f5]'
                        : 'bg-white/5 border border-white/10 text-white/50 hover:bg-white/10'
                    }`}
                  >
                    {idx === 0 ? 'Bản gốc' : `Lần quét ${idx}`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Active Variable tags list */}
          {activeVariables.length > 0 && (
            <div className="space-y-1.5 p-3 rounded-xl border border-white/5 bg-white/2">
              <div className="text-[10px] font-bold uppercase tracking-widest text-white/30">
                Danh sách từ khóa động ({activeVariables.length})
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {activeVariables.map((variable) => (
                  <span
                    key={variable.fullTag}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border"
                    style={{
                      background: 'rgba(121,134,235,0.06)',
                      borderColor: 'rgba(121,134,235,0.18)',
                      color: '#a5b0f5',
                    }}
                  >
                    <span className="font-bold text-white/40">{variable.name}:</span>
                    <span>{variable.default}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteVariable(variable.fullTag, variable.default)}
                      title="Xóa biến số"
                      className="p-0.5 rounded-full hover:bg-red-500/10 hover:text-red-400 transition-colors text-white/30"
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── StepHeader ───────────────────────────────────────────────────
export function StepHeader({ step, total, title, subtitle }) {
  return (
    <div className="flex items-start gap-4 mb-6">
      <div
        className="w-9 h-9 rounded-xl bg-brand-600/20 border border-brand-600/40
        flex items-center justify-center flex-shrink-0 mt-0.5"
      >
        <span className="text-sm font-bold text-brand-400">{step}</span>
      </div>
      <div>
        <h2 className="text-base font-bold text-white">{title}</h2>
        {subtitle && <p className="text-sm text-white/40 mt-0.5">{subtitle}</p>}
      </div>
      <span className="ml-auto text-xs text-white/20 font-mono pt-1">
        {step}/{total}
      </span>
    </div>
  )
}

// ── SourceHistoryPanel ───────────────────────────────────────────
// Grid ảnh tham khảo từ lịch sử uploads — click để toggle chọn
export function SourceHistoryPanel({ images, selectedIds, onToggle, loading }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-white/30 text-sm">
        <div className="w-5 h-5 border-2 border-white/20 border-t-brand-400 rounded-full animate-spin mr-2" />
        Đang tải lịch sử ảnh...
      </div>
    )
  }

  if (images.length === 0) {
    return (
      <div className="text-center py-6 text-white/25 text-sm">
        Bạn chưa có ảnh tham khảo nào từ bài đăng trước
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-white/40">
        Click để chọn / bỏ chọn · <span className="text-brand-400">{selectedIds.size}</span> đã chọn
      </p>
      <div className="grid grid-cols-5 sm:grid-cols-6 gap-2 max-h-52 overflow-y-auto pr-1
        scrollbar-thin scrollbar-thumb-white/10">
        {images.map((img) => {
          const isSelected = selectedIds.has(img.publicId)
          return (
            <button
              key={img.publicId}
              type="button"
              onClick={() => onToggle(img)}
              className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all duration-150
                ${isSelected
                  ? 'border-brand-500 ring-2 ring-brand-500/30 scale-[0.96]'
                  : 'border-white/8 hover:border-white/25'}`}
            >
              <img
                src={img.thumbnailUrl || img.url}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
              />
              {isSelected && (
                <div className="absolute inset-0 bg-brand-600/30 flex items-center justify-center">
                  <Check size={18} className="text-white drop-shadow" />
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── ModelSlot ─────────────────────────────────────────────────────
// Một card cho 1 model trong multi-model comparison
export function ModelSlot({ slot, index, onUpdate, onRemove, canRemove }) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/jpeg': [], 'image/png': [], 'image/webp': [] },
    maxSize: 20 * 1024 * 1024,
    maxFiles: 5 - (slot.genImages?.length || 0),
    onDropAccepted: (files) => {
      const toAdd = files.map((f) => ({
        file: f,
        preview: URL.createObjectURL(f),
        id: Math.random().toString(36).slice(2),
      }))
      onUpdate(index, {
        ...slot,
        genImages: [...(slot.genImages || []), ...toAdd].slice(0, 5),
      })
    },
    disabled: (slot.genImages?.length || 0) >= 5,
  })

  const removeImage = (imgId) => {
    const img = slot.genImages.find((i) => i.id === imgId)
    if (img) URL.revokeObjectURL(img.preview)
    onUpdate(index, {
      ...slot,
      genImages: slot.genImages.filter((i) => i.id !== imgId),
    })
  }

  const selectedTool = AI_TOOLS.find((t) => t.value === slot.aiTool) || null

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="card p-4 space-y-3 relative"
      style={{ borderLeft: selectedTool ? `3px solid ${selectedTool.color}` : '3px solid rgba(255,255,255,0.08)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-white/50 uppercase tracking-wider">
          Model {index + 1}
        </span>
        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="text-white/20 hover:text-red-400 transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div>
        <select
          value={slot.aiTool}
          onChange={(e) => onUpdate(index, { ...slot, aiTool: e.target.value })}
          className="input w-full text-sm py-2"
        >
          <option value="">Chọn công cụ AI...</option>
          {AI_TOOLS.map((t) => (
            <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
          ))}
        </select>
      </div>

      {/* Image thumbnails + drop zone */}
      <div className="flex flex-wrap gap-2">
        {(slot.genImages || []).map((img) => (
          <div key={img.id} className="relative w-16 h-16 rounded-lg overflow-hidden border border-white/10 group">
            <img src={img.preview} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => removeImage(img.id)}
              className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center
                opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80"
            >
              <X size={10} className="text-white" />
            </button>
          </div>
        ))}

        {(slot.genImages?.length || 0) < 5 && (
          <div
            {...getRootProps()}
            className={`w-16 h-16 rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer transition-all
              ${isDragActive ? 'border-brand-400 bg-brand-900/30' : 'border-white/12 hover:border-white/25'}`}
          >
            <input {...getInputProps()} />
            <Plus size={16} className={isDragActive ? 'text-brand-400' : 'text-white/25'} />
          </div>
        )}
      </div>
    </motion.div>
  )
}
