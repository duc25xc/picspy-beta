/**
 * UploadComponents.jsx
 * Reusable sub-components cho UploadPage
 */
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Copy, Check, ChevronDown } from 'lucide-react'
import { useState } from 'react'
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
export function ImageDropZone({ images = [], onAdd, onRemove, max = 5, label, hint, required }) {
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
          <span className="ml-2 text-white/30 font-normal">({images.length}/{max})</span>
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
            <img src={img.preview} alt="" className="w-full h-full object-cover" />
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
              ${isDragActive
                ? 'border-brand-400 bg-brand-900/30'
                : 'border-white/15 hover:border-white/30 hover:bg-white/5'
              }`}
          >
            <input {...getInputProps()} />
            <Plus size={20} className={isDragActive ? 'text-brand-400' : 'text-white/30'} />
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
  const selected = AI_TOOLS.find(t => t.value === value) || null

  return (
    <div className="relative">
      <label className="input-label">
        Công cụ AI <span className="text-red-400">*</span>
      </label>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="input text-left flex items-center justify-between gap-2"
      >
        {selected ? (
          <span className="flex items-center gap-2">
            <span style={{ color: selected.color }} className="font-bold text-lg leading-none">
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
            {AI_TOOLS.map(tool => (
              <button
                key={tool.value}
                type="button"
                onClick={() => { onChange(tool.value); setOpen(false) }}
                className={`w-full px-4 py-2.5 flex items-center gap-3 text-left text-sm transition-colors
                  hover:bg-white/6 ${value === tool.value ? 'bg-white/8' : ''}`}
              >
                <span style={{ color: tool.color }} className="font-bold text-base w-5 text-center">
                  {tool.icon}
                </span>
                <span className={value === tool.value ? 'text-white font-medium' : 'text-white/70'}>
                  {tool.label}
                </span>
                {value === tool.value && <Check size={14} className="ml-auto text-brand-400" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── PromptField ──────────────────────────────────────────────────
export function PromptField({ value, onChange, label, placeholder, maxLength = 2000, required }) {
  const [copied, setCopied] = useState(false)
  const pct = Math.min((value.length / maxLength) * 100, 100)
  const near = value.length > maxLength * 0.85

  const handleCopy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="input-label">
          {label} {required && <span className="text-red-400">*</span>}
        </label>
        <div className="flex items-center gap-2">
          <span className={`text-xs ${near ? 'text-amber-400' : 'text-white/30'}`}>
            {value.length}/{maxLength}
          </span>
          {value.length > 0 && (
            <button
              type="button"
              onClick={handleCopy}
              className="text-xs flex items-center gap-1 text-white/30 hover:text-white/70 transition-colors"
            >
              {copied ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          )}
        </div>
      </div>

      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={label === 'Negative Prompt' ? 3 : 5}
        className="input resize-none leading-relaxed font-mono text-sm"
        style={{ minHeight: label === 'Negative Prompt' ? '80px' : '120px' }}
      />

      {/* Char bar */}
      <div className="h-0.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${near ? 'bg-amber-500' : 'bg-brand-600'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ── StepHeader ───────────────────────────────────────────────────
export function StepHeader({ step, total, title, subtitle }) {
  return (
    <div className="flex items-start gap-4 mb-6">
      <div className="w-9 h-9 rounded-xl bg-brand-600/20 border border-brand-600/40
        flex items-center justify-center flex-shrink-0 mt-0.5">
        <span className="text-sm font-bold text-brand-400">{step}</span>
      </div>
      <div>
        <h2 className="text-base font-bold text-white">{title}</h2>
        {subtitle && <p className="text-sm text-white/40 mt-0.5">{subtitle}</p>}
      </div>
      <span className="ml-auto text-xs text-white/20 font-mono pt-1">{step}/{total}</span>
    </div>
  )
}
