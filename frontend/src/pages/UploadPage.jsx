import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload,
  CheckCircle,
  Clock,
  LayoutGrid,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Settings,
  Tag,
  Coins,
  ChevronDown,
  Image as ImageIcon,
  AlertCircle,
  Loader2,
  Crown,
  FileJson,
  Plus,
  GitCompare,
  X,
  Check,
} from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import exifr from 'exifr'
import toast from 'react-hot-toast'
import api from '../api/api'
import useTierAccess from '../hooks/useTierAccess'
import { getOptimizedWebpUrl } from '../utils/imageUrl'
import {
  detectDimensions,
  fileToPreview,
  deduplicateByPublicId,
  FALLBACK_CATEGORIES,
  AI_TOOLS,
} from './uploadConstants.js'
import {
  ImageDropZone,
  AIToolSelector,
  PromptField,
  StepHeader,
  ModelSlot,
} from './UploadComponents.jsx'

// ── Default form state ───────────────────────────────────────────
const defaultForm = () => ({
  // Step 1
  aiTool: '',
  aiModel: '',
  parameters: '',
  prompt: '',
  negativePrompt: '',
  workflowJson: '', // Ultimate only
  showNegative: false,
  showParams: false,
  showWorkflow: false, // toggle state
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

  const [uploadType, setUploadType] = useState('ai') // 'ai' or 'digital'
  const [hasLut, setHasLut] = useState(false)
  const [rawFile, setRawFile] = useState(null)
  const [colorFile, setColorFile] = useState(null)
  const [exifInfo, setExifInfo] = useState(null)
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false)

  const [step, setStep] = useState(1)
  const [form, setForm] = useState(defaultForm())
  const [sourceImages, setSourceImages] = useState([]) // new file uploads (before LUT in digital)
  const [genImages, setGenImages] = useState([]) // results (after LUT in digital)
  const [sourceHistory, setSourceHistory] = useState([]) // Cloudinary refs from past posts
  const [selectedHistoryIds, setSelectedHistoryIds] = useState(new Set())
  const [historyLoading, setHistoryLoading] = useState(false)
  const [multiModelMode, setMultiModelMode] = useState(false)
  const [modelSlots, setModelSlots] = useState([
    { id: 'slot-0', aiTool: '', aiModel: '', genImages: [] },
  ])
  const [categories, setCategories] = useState(FALLBACK_CATEGORIES)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [done, setDone] = useState(false)

  // ── Dynamic Steps ────────────────────────────────────────────────
  const steps =
    uploadType === 'ai'
      ? [
          { id: 1, label: 'Công cụ & Prompt' },
          { id: 2, label: 'Ảnh tham khảo' },
          { id: 3, label: 'Kết quả AI' },
          { id: 4, label: 'Thông tin' },
        ]
      : [
          { id: 1, label: 'Tải lên hình ảnh' },
          { id: 2, label: 'Tệp đính kèm' },
          { id: 3, label: 'Thông tin' },
        ]

  useEffect(() => {
    api
      .get('/categories')
      .then(({ data }) => {
        if (data?.categories?.length) setCategories(data.categories)
      })
      .catch(() => {})
  }, [])

  // Load source image history
  useEffect(() => {
    setHistoryLoading(true)
    api
      .get('/posts/me?limit=50')
      .then(({ data }) => {
        const imgs = (data?.posts || [])
          .flatMap((p) => p.sourceImages || [])
          .filter((img) => img.url && img.publicId)
        setSourceHistory(deduplicateByPublicId(imgs))
      })
      .catch(() => {})
      .finally(() => setHistoryLoading(false))
  }, [])

  const hasModelImages = modelSlots.some((s) => s.genImages?.length > 0)
  const isDirty =
    form.prompt.trim().length > 0 ||
    sourceImages.length > 0 ||
    genImages.length > 0 ||
    selectedHistoryIds.size > 0 ||
    hasModelImages ||
    rawFile !== null ||
    colorFile !== null

  useEffect(() => {
    if (!isDirty || done) return
    const h = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [isDirty, done])

  useEffect(() => {
    if (!isDirty || done) return
    const handleCaptureClick = (e) => {
      const link = e.target.closest('a')
      if (!link) return
      if (link.target === '_blank') return

      const href = link.getAttribute('href')
      if (href) {
        let isInternal = false
        try {
          const url = new URL(href, window.location.href)
          isInternal = url.origin === window.location.origin
        } catch (err) {
          isInternal =
            !href.startsWith('http://') &&
            !href.startsWith('https://') &&
            !href.startsWith('javascript:')
        }

        if (isInternal) {
          if (
            !window.confirm(
              'Bài đăng của bạn chưa hoàn tất. Bạn có chắc chắn muốn rời đi?'
            )
          ) {
            e.preventDefault()
            e.stopPropagation()
          }
        }
      }
    }

    window.addEventListener('click', handleCaptureClick, true)
    return () => window.removeEventListener('click', handleCaptureClick, true)
  }, [isDirty, done])

  const safeNavigate = (path) => {
    if (isDirty && !done) {
      if (
        !window.confirm(
          'Bài đăng của bạn chưa hoàn tất. Bạn có chắc chắn muốn rời đi?'
        )
      )
        return
    }
    navigate(path)
  }

  const toggleHistoryImage = useCallback(
    (img) => {
      setSelectedHistoryIds((prev) => {
        const next = new Set(prev)
        if (next.has(img.publicId)) {
          next.delete(img.publicId)
        } else {
          if (next.size + sourceImages.length >= 5) {
            toast.error('Tối đa 5 ảnh tham khảo')
            return prev
          }
          next.add(img.publicId)
        }
        return next
      })
    },
    [sourceImages.length]
  )

  const updateModelSlot = useCallback(
    (i, updated) =>
      setModelSlots((prev) => prev.map((s, idx) => (idx === i ? updated : s))),
    []
  )
  const removeModelSlot = useCallback(
    (i) =>
      setModelSlots((prev) => {
        prev[i].genImages?.forEach((img) => URL.revokeObjectURL(img.preview))
        return prev.filter((_, idx) => idx !== i)
      }),
    []
  )
  const addModelSlot = useCallback(() => {
    if (modelSlots.length >= 5) return toast.error('Tối đa 5 model')
    setModelSlots((prev) => [
      ...prev,
      { id: `slot-${Date.now()}`, aiTool: '', aiModel: '', genImages: [] },
    ])
  }, [modelSlots.length])

  // ── EXIF Helpers ───────────────────────────────────────────────
  const cleanCameraName = (make, model) => {
    if (!make && !model) return null
    const mk = (make || '').trim()
    const md = (model || '').trim()
    if (!mk) return md
    if (!md) return mk
    if (md.toLowerCase().startsWith(mk.toLowerCase())) {
      return md
    }
    return `${mk} ${md}`
  }

  const cleanLensModel = (lens, cameraName) => {
    if (!lens) return null
    let cleaned = lens.trim()

    if (cameraName) {
      const escaped = cameraName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      cleaned = cleaned.replace(new RegExp(escaped, 'gi'), '')

      const parts = cameraName.split(/\s+/).filter((p) => p.length >= 2)
      parts.forEach((part) => {
        const escapedPart = part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        cleaned = cleaned.replace(new RegExp(`\\b${escapedPart}\\b`, 'gi'), '')
        if (part.length > 3) {
          cleaned = cleaned.replace(new RegExp(escapedPart, 'gi'), '')
        }
      })
    }

    cleaned = cleaned.replace(/\s+/g, ' ')
    cleaned = cleaned.replace(/^[,\-\s]+|[,\-\s]+$/g, '')
    cleaned = cleaned.trim()

    if (cleaned.length > 0) {
      cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
    }
    return cleaned || null
  }

  const formatLensInfo = (arr) => {
    if (!Array.isArray(arr) || arr.length < 4) return null
    const rounded = arr.map((v) =>
      typeof v === 'number' ? Math.round(v * 100) / 100 : v
    )
    const [minF, maxF, minA, maxA] = rounded
    const focal = minF === maxF ? `${minF}mm` : `${minF}-${maxF}mm`
    const aperture = minA === maxA ? `f/${minA}` : `f/${minA}-${maxA}`
    return `${focal} ${aperture}`
  }

  const parseGpsCoord = (coord) => {
    if (typeof coord === 'number') return coord
    if (Array.isArray(coord) && coord.length >= 3) {
      const [deg, min, sec] = coord
      return deg + min / 60 + sec / 3600
    }
    return null
  }

  const mapColorSpace = (cs) => {
    if (cs === 1 || String(cs).toLowerCase().includes('srgb')) return 'sRGB'
    if (cs === 2 || String(cs).toLowerCase().includes('adobe'))
      return 'Adobe RGB'
    if (
      cs === 65535 ||
      String(cs).toLowerCase().includes('p3') ||
      String(cs).toLowerCase().includes('wide')
    )
      return 'Display P3 (Wide Color)'
    if (cs) return String(cs)
    return null
  }

  // ── EXIF Reader ────────────────────────────────────────────────
  const handleReadExif = async (file) => {
    try {
      const raw = await exifr.parse(file, {
        pick: [
          'Make',
          'Model',
          'ISO',
          'FNumber',
          'FocalLength',
          'ExposureTime',
          'DateTimeOriginal',
          'LensModel',
          'Software',
          'GPSLatitude',
          'GPSLongitude',
          'ExposureValue',
          'Flash',
          'WhiteBalance',
          'Artist',
          'Copyright',
          'ExposureProgram',
          'MeteringMode',
          'ExposureBiasValue',
          'DigitalZoomRatio',
          'BodySerialNumber',
          'SerialNumber',
          'CameraSerialNumber',
          'LensSerialNumber',
          'LensSpecification',
          'LensInfo',
          'ColorSpace',
        ],
      })
      if (raw) {
        let shutter = raw.ExposureTime
        if (typeof shutter === 'number') {
          if (shutter < 1) {
            shutter = `1/${Math.round(1 / shutter)}s`
          } else {
            shutter = `${shutter}s`
          }
        }

        const cameraName = cleanCameraName(raw.Make, raw.Model)
        const cleanedLens = cleanLensModel(raw.LensModel, cameraName)

        const roundedAperture = raw.FNumber
          ? Math.round(raw.FNumber * 100) / 100
          : null
        const roundedFocalLength = raw.FocalLength
          ? Math.round(raw.FocalLength * 100) / 100
          : null

        const evVal =
          typeof raw.ExposureBiasValue === 'number'
            ? raw.ExposureBiasValue === 0
              ? '0.00 EV'
              : `${raw.ExposureBiasValue > 0 ? '+' : ''}${parseFloat(raw.ExposureBiasValue.toFixed(2))} EV`
            : null

        const zoomVal =
          typeof raw.DigitalZoomRatio === 'number'
            ? `${parseFloat(raw.DigitalZoomRatio.toFixed(2))}x`
            : null

        const serialVal =
          raw.BodySerialNumber ||
          raw.SerialNumber ||
          raw.CameraSerialNumber ||
          null

        const lensSpec = raw.LensSpecification
          ? Array.isArray(raw.LensSpecification)
            ? formatLensInfo(raw.LensSpecification)
            : String(raw.LensSpecification)
          : raw.LensInfo
            ? formatLensInfo(raw.LensInfo)
            : null

        const info = {
          camera: cameraName || null,
          lensModel: cleanedLens || null,
          iso: raw.ISO || null,
          aperture: roundedAperture ? `f/${roundedAperture}` : null,
          focalLength: roundedFocalLength ? `${roundedFocalLength}mm` : null,
          shutterSpeed: shutter || null,
          ev:
            typeof raw.ExposureValue === 'number'
              ? Math.round(raw.ExposureValue * 10) / 10
              : null,
          flash: raw.Flash !== undefined ? raw.Flash : null,
          dateTaken: raw.DateTimeOriginal || null,
          software: raw.Software || null,
          whiteBalance: raw.WhiteBalance || null,
          artist: raw.Artist || null,
          copyright: raw.Copyright || null,
          exposureProgram: raw.ExposureProgram || null,
          meteringMode: raw.MeteringMode || null,
          exposureCompensation: evVal,
          digitalZoomRatio: zoomVal,
          bodySerialNumber: serialVal,
          lensSerialNumber: raw.LensSerialNumber || null,
          lensSpecification: lensSpec,
          colorSpace: mapColorSpace(raw.ColorSpace),
          gpsLat: parseGpsCoord(raw.GPSLatitude),
          gpsLng: parseGpsCoord(raw.GPSLongitude),
        }
        const hasAny = Object.values(info).some((v) => v !== null)
        if (hasAny) {
          setExifInfo(info)
          toast.success('📷 Đã trích xuất thông tin EXIF máy ảnh!')
        }
      }
    } catch (err) {
      console.warn('Exif read err:', err)
    }
  }

  // ── Image handlers ─────────────────────────────────────────────
  const addSourceImages = useCallback(
    (files) => {
      if (uploadType === 'digital') {
        const fileObj = fileToPreview(files[0])
        setSourceImages([fileObj])
        handleReadExif(files[0])
      } else {
        const remaining = 5 - sourceImages.length
        const toAdd = files.slice(0, remaining).map(fileToPreview)
        setSourceImages((prev) => [...prev, ...toAdd])
      }
    },
    [sourceImages.length, uploadType]
  )

  const addGenImages = useCallback(
    (files) => {
      if (uploadType === 'digital') {
        const fileObj = fileToPreview(files[0])
        setGenImages([fileObj])
        handleReadExif(files[0])
      } else {
        const remaining = 5 - genImages.length
        const toAdd = files.slice(0, remaining).map(fileToPreview)
        setGenImages((prev) => [...prev, ...toAdd])
      }
    },
    [genImages.length, uploadType]
  )

  const removeSourceImage = useCallback(
    (id) => {
      if (uploadType === 'digital') {
        setSourceImages([])
      } else {
        setSourceImages((prev) => {
          const img = prev.find((i) => i.id === id)
          if (img) URL.revokeObjectURL(img.preview)
          return prev.filter((i) => i.id !== id)
        })
      }
    },
    [uploadType]
  )

  const removeGenImage = useCallback(
    (id) => {
      if (uploadType === 'digital') {
        setGenImages([])
        setExifInfo(null)
      } else {
        setGenImages((prev) => {
          const img = prev.find((i) => i.id === id)
          if (img) URL.revokeObjectURL(img.preview)
          return prev.filter((i) => i.id !== id)
        })
      }
    },
    [uploadType]
  )

  // ── Navigation ─────────────────────────────────────────────────
  const canGoNext = () => {
    if (uploadType === 'ai') {
      if (step === 1) return form.aiTool && form.prompt.trim().length >= 3
      if (step === 2) return true // optional
      if (step === 3) {
        if (multiModelMode)
          return (
            modelSlots.length >= 2 &&
            modelSlots.every((s) => s.aiTool && s.genImages?.length >= 1)
          )
        return genImages.length >= 1
      }
      return true
    } else {
      if (step === 1) {
        if (hasLut) return sourceImages.length >= 1 && genImages.length >= 1
        return genImages.length >= 1
      }
      if (step === 2) return true // optional attachments
      return true
    }
  }

  const goNext = () => {
    if (!canGoNext()) {
      if (uploadType === 'ai') {
        if (step === 1) toast.error('Chọn công cụ AI và nhập prompt')
        if (step === 3)
          toast.error(
            multiModelMode
              ? 'Cần ít nhất 2 model, mỗi model ít nhất 1 ảnh'
              : 'Cần ít nhất 1 ảnh kết quả AI'
          )
      } else {
        if (step === 1) {
          if (hasLut) toast.error('Cần tải lên cả ảnh gốc và ảnh kết quả')
          else toast.error('Cần tải lên hình ảnh của bạn')
        }
      }
      return
    }
    const maxStep = uploadType === 'ai' ? 4 : 3
    setStep((s) => Math.min(s + 1, maxStep))
  }

  const goBack = () => setStep((s) => Math.max(s - 1, 1))

  // ── Submit ─────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!form.category) return toast.error('Vui lòng chọn danh mục')

    if (uploadType === 'ai') {
      if (multiModelMode) {
        if (modelSlots.length < 2) return toast.error('Cần ít nhất 2 model')
        if (modelSlots.some((s) => !s.aiTool))
          return toast.error('Mỗi model cần chọn công cụ AI')
        if (modelSlots.some((s) => !s.genImages?.length))
          return toast.error('Mỗi model cần ít nhất 1 ảnh')
      } else {
        if (genImages.length === 0)
          return toast.error('Cần ít nhất 1 ảnh kết quả AI')
      }
    } else {
      if (hasLut) {
        if (sourceImages.length === 0)
          return toast.error('Vui lòng tải lên ảnh gốc (trước khi áp LUT)')
        if (genImages.length === 0)
          return toast.error('Vui lòng tải lên ảnh kết quả (sau khi áp LUT)')
      } else {
        if (genImages.length === 0)
          return toast.error('Vui lòng tải lên hình ảnh của bạn')
      }
    }

    setUploading(true)
    setProgress(0)
    let dims = {}
    try {
      const f =
        uploadType === 'ai' && multiModelMode
          ? modelSlots[0].genImages[0]?.file
          : genImages[0]?.file
      if (f) dims = await detectDimensions(f)
    } catch {}

    let workflowJsonStr = ''
    if (
      uploadType === 'ai' &&
      tierAccess.canExportJson &&
      form.workflowJson.trim()
    ) {
      try {
        JSON.parse(form.workflowJson)
        workflowJsonStr = form.workflowJson.trim()
      } catch {
        toast.error('JSON Workflow không hợp lệ!')
        setUploading(false)
        setProgress(0)
        return
      }
    }

    const fd = new FormData()
    fd.append('postType', uploadType)

    if (uploadType === 'ai') {
      fd.append('prompt', form.prompt.trim())
      if (form.negativePrompt.trim())
        fd.append('negativePrompt', form.negativePrompt.trim())
      fd.append(
        'aiTool',
        multiModelMode ? modelSlots[0].aiTool || 'other' : form.aiTool
      )
      if (!multiModelMode && form.aiModel.trim())
        fd.append('aiModel', form.aiModel.trim())
      if (form.parameters.trim())
        fd.append('parameters', form.parameters.trim())
      if (workflowJsonStr) fd.append('workflowJson', workflowJsonStr)
    }

    fd.append('contentType', 'image')
    fd.append('caption', form.caption.trim())
    fd.append(
      'tags',
      JSON.stringify(
        form.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      )
    )
    fd.append('category', form.category)
    fd.append('isPremium', String(form.isPremium))
    fd.append('priceInTokens', String(Number(form.priceInTokens)))

    if (dims.resolution) fd.append('resolution', dims.resolution)
    if (dims.orientation) fd.append('orientation', dims.orientation)
    if (dims.aspectRatio) fd.append('aspectRatio', dims.aspectRatio)

    sourceImages.forEach((img) => fd.append('sourceImages', img.file))

    if (uploadType === 'digital') {
      if (rawFile) fd.append('rawFile', rawFile.file)
      if (colorFile) fd.append('colorFile', colorFile.file)
    }

    if (uploadType === 'ai' && selectedHistoryIds.size > 0) {
      const refs = sourceHistory
        .filter((img) => selectedHistoryIds.has(img.publicId))
        .map(
          ({
            url,
            publicId,
            width,
            height,
            fileSize,
            format,
            thumbnailUrl,
          }) => ({
            url,
            publicId,
            width,
            height,
            fileSize,
            format,
            thumbnailUrl,
          })
        )
      fd.append('sourceImageRefs', JSON.stringify(refs))
    }

    if (uploadType === 'ai' && multiModelMode) {
      fd.append(
        'modelComparisons',
        JSON.stringify(
          modelSlots.map((s, i) => ({
            aiTool: s.aiTool,
            aiModel: s.aiModel || undefined,
            slotIndex: i,
          }))
        )
      )
      modelSlots.forEach((s, i) =>
        s.genImages.forEach((img) => fd.append(`compImages_${i}`, img.file))
      )
    } else {
      genImages.forEach((img) => fd.append('generatedImages', img.file))
    }

    let fakeP = 0
    const timer = setInterval(() => {
      fakeP = Math.min(fakeP + 2, 89)
      setProgress(Math.round(fakeP))
    }, 80)

    try {
      await api.post('/posts', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (evt) => {
          const r = Math.round((evt.loaded * 100) / evt.total)
          if (r > fakeP) {
            fakeP = r
            setProgress(r)
          }
        },
      })
      clearInterval(timer)
      setProgress(100)
      setTimeout(() => setDone(true), 400)
    } catch (err) {
      clearInterval(timer)
      setProgress(0)
      toast.error(err.response?.data?.message || 'Upload thất bại, thử lại!')
    } finally {
      setUploading(false)
    }
  }

  const resetForm = () => {
    ;[...sourceImages, ...genImages].forEach((i) =>
      URL.revokeObjectURL(i.preview)
    )
    modelSlots.forEach((s) =>
      s.genImages?.forEach((i) => URL.revokeObjectURL(i.preview))
    )
    setSourceImages([])
    setGenImages([])
    setSelectedHistoryIds(new Set())
    setModelSlots([{ id: 'slot-0', aiTool: '', aiModel: '', genImages: [] }])
    setMultiModelMode(false)
    setForm(defaultForm())
    setStep(1)
    setDone(false)
    setProgress(0)
    setHasLut(false)
    setRawFile(null)
    setColorFile(null)
    setExifInfo(null)
    setShowHistoryDrawer(false)
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
            {uploadType === 'ai'
              ? 'Nội dung AI đang trong hàng chờ xử lý & kiểm duyệt.'
              : 'Hình ảnh của bạn đã được tải lên và đang kiểm duyệt.'}
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-white/40 mb-6">
            <Clock size={14} />
            <span>Thường mất 10–60 giây</span>
          </div>
          <div className="flex gap-3 justify-center">
            <button onClick={resetForm} className="btn-secondary">
              Upload thêm
            </button>
            <button
              onClick={() => navigate('/my-posts')}
              className="btn-primary flex items-center gap-2"
            >
              <LayoutGrid size={16} /> Xem bài của tôi
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  const maxStep = uploadType === 'ai' ? 4 : 3

  // ── Main render ────────────────────────────────────────────────
  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Page title */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              {uploadType === 'ai' ? (
                <>
                  <Sparkles size={22} className="text-brand-400" />
                  Chia sẻ nội dung AI
                </>
              ) : (
                <>
                  <ImageIcon size={22} className="text-brand-400" />
                  Chia sẻ ảnh Thực Tế (Digital)
                </>
              )}
            </h1>
            <p className="text-white/40 text-sm mt-1">
              {uploadType === 'ai'
                ? 'Chia sẻ prompt và tác phẩm AI của bạn với cộng đồng'
                : 'Chia sẻ các tác phẩm nhiếp ảnh, file RAW gốc và preset màu LUT'}
            </p>
          </div>
        </div>

        {/* Options to select Upload Mode */}
        <div className="flex gap-3 mb-8 p-1 rounded-2xl bg-white/5 border border-white/10 relative overflow-hidden">
          <button
            type="button"
            onClick={() => {
              if (
                isDirty &&
                !window.confirm(
                  'Thay đổi chế độ sẽ đặt lại form. Bạn có chắc chắn?'
                )
              )
                return
              resetForm()
              setUploadType('ai')
            }}
            className={`relative flex-1 py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-300 z-10 cursor-pointer select-none
              ${
                uploadType === 'ai'
                  ? 'text-white'
                  : 'text-white/45 hover:text-white/70'
              }
            `}
          >
            {uploadType === 'ai' && (
              <motion.div
                layoutId="activeUploadModeTab"
                className="absolute inset-0 bg-brand-600 rounded-xl z-0 border border-brand-500/30 shadow-[0_0_20px_rgba(124,58,237,0.3)]"
                transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <Sparkles size={16} /> Chia sẻ nội dung AI
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (
                isDirty &&
                !window.confirm(
                  'Thay đổi chế độ sẽ đặt lại form. Bạn có chắc chắn?'
                )
              )
                return
              resetForm()
              setUploadType('digital')
            }}
            className={`relative flex-1 py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-300 z-10 cursor-pointer select-none
              ${
                uploadType === 'digital'
                  ? 'text-white'
                  : 'text-white/45 hover:text-white/70'
              }
            `}
          >
            {uploadType === 'digital' && (
              <motion.div
                layoutId="activeUploadModeTab"
                className="absolute inset-0 bg-brand-600 rounded-xl z-0 border border-brand-500/30 shadow-[0_0_20px_rgba(124,58,237,0.3)]"
                transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <ImageIcon size={16} /> Chia sẻ ảnh Thực Tế (Digital)
            </span>
          </button>
        </div>

        {/* Step indicators */}
        <StepIndicator steps={steps} current={step} />

        {/* Step content */}
        <div className="mt-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${uploadType}-${step}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {uploadType === 'ai' ? (
                <>
                  {step === 1 && (
                    <Step1Prompt
                      form={form}
                      setForm={setForm}
                      tierAccess={tierAccess}
                    />
                  )}
                  {step === 2 && (
                    <Step2Source
                      images={sourceImages}
                      onAdd={addSourceImages}
                      onRemove={removeSourceImage}
                      selectedHistoryIds={selectedHistoryIds}
                      sourceHistory={sourceHistory}
                      onToggleHistory={toggleHistoryImage}
                      setShowHistoryDrawer={setShowHistoryDrawer}
                    />
                  )}
                  {step === 3 && (
                    <Step3Generated
                      images={genImages}
                      onAdd={addGenImages}
                      onRemove={removeGenImage}
                      multiModelMode={multiModelMode}
                      onToggleMultiModel={() => setMultiModelMode((v) => !v)}
                      modelSlots={modelSlots}
                      onUpdateSlot={updateModelSlot}
                      onRemoveSlot={removeModelSlot}
                      onAddSlot={addModelSlot}
                    />
                  )}
                  {step === 4 && (
                    <Step4Meta
                      form={form}
                      setForm={setForm}
                      categories={categories}
                      uploading={uploading}
                      progress={progress}
                      step={4}
                      total={4}
                    />
                  )}
                </>
              ) : (
                <>
                  {step === 1 && (
                    <Step1DigitalImage
                      images={genImages}
                      sourceImages={sourceImages}
                      hasLut={hasLut}
                      setHasLut={setHasLut}
                      onAddGen={addGenImages}
                      onRemoveGen={() => removeGenImage()}
                      onAddSource={addSourceImages}
                      onRemoveSource={() => removeSourceImage()}
                      exifInfo={exifInfo}
                    />
                  )}
                  {step === 2 && (
                    <Step2DigitalAttachments
                      rawFile={rawFile}
                      setRawFile={setRawFile}
                      colorFile={colorFile}
                      setColorFile={setColorFile}
                    />
                  )}
                  {step === 3 && (
                    <Step4Meta
                      form={form}
                      setForm={setForm}
                      categories={categories}
                      uploading={uploading}
                      progress={progress}
                      step={3}
                      total={3}
                    />
                  )}
                </>
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

          {step < maxStep ? (
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

      {/* History drawer sliding from right */}
      <AnimatePresence>
        {showHistoryDrawer && (
          <HistoryDrawer
            images={sourceHistory}
            selectedIds={selectedHistoryIds}
            onToggle={toggleHistoryImage}
            loading={historyLoading}
            onClose={() => setShowHistoryDrawer(false)}
          />
        )}
      </AnimatePresence>
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
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                transition-all duration-300
                ${
                  done
                    ? 'bg-green-500/20 border border-green-500/50 text-green-400'
                    : active
                      ? 'bg-brand-600/30 border border-brand-500 text-brand-300'
                      : 'bg-white/5 border border-white/10 text-white/25'
                }`}
              >
                {done ? <CheckCircle size={14} /> : s.id}
              </div>
              <span
                className={`text-[10px] mt-1 whitespace-nowrap
                ${active ? 'text-brand-300' : done ? 'text-green-400/70' : 'text-white/20'}`}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`h-px flex-1 mx-2 mb-4 transition-colors duration-300
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
  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }))
  const [jsonError, setJsonError] = useState(null)

  // Visual parameters states
  const [aspectRatio, setAspectRatio] = useState('')
  const [version, setVersion] = useState('')
  const [seed, setSeed] = useState('')
  const [customParams, setCustomParams] = useState('')

  // Sync visual parameter states to form.parameters
  useEffect(() => {
    const parts = []
    if (aspectRatio) parts.push(`--ar ${aspectRatio}`)
    if (version) {
      if (version.startsWith('niji')) {
        parts.push(`--niji ${version.split(' ')[1]}`)
      } else {
        parts.push(`--v ${version}`)
      }
    }
    if (seed) parts.push(`--seed ${seed}`)
    if (customParams) parts.push(customParams.trim())

    const formatted = parts.filter(Boolean).join(' ')
    setForm((prev) => ({ ...prev, parameters: formatted }))
  }, [aspectRatio, version, seed, customParams])

  // Sync form.parameters back to visual states (for edits/back navigation)
  useEffect(() => {
    if (form.parameters && !aspectRatio && !version && !seed && !customParams) {
      const arMatch = form.parameters.match(/--ar\s+([0-9:]+)/)
      const vMatch = form.parameters.match(/--v\s+([0-9.]+)/)
      const nijiMatch = form.parameters.match(/--niji\s+(\d+)/)
      const seedMatch = form.parameters.match(/--seed\s+(\d+)/)

      let cleanParams = form.parameters
      if (arMatch) {
        setAspectRatio(arMatch[1])
        cleanParams = cleanParams.replace(arMatch[0], '')
      }
      if (vMatch) {
        setVersion(vMatch[1])
        cleanParams = cleanParams.replace(vMatch[0], '')
      } else if (nijiMatch) {
        setVersion(`niji ${nijiMatch[1]}`)
        cleanParams = cleanParams.replace(nijiMatch[0], '')
      }
      if (seedMatch) {
        setSeed(seedMatch[1])
        cleanParams = cleanParams.replace(seedMatch[0], '')
      }
      setCustomParams(cleanParams.trim().replace(/\s+/g, ' '))
    }
  }, [form.parameters])

  // Auto-extract parameters from prompt text (e.g. aspect_ratio or command-line flags)
  useEffect(() => {
    if (!form.prompt) return

    // 1. Aspect Ratio extraction
    const arTagMatch = form.prompt.match(/\{argument\s+name="aspect_ratio"\s+default="([0-9:]+)"\}/i)
    const arTextMatch = form.prompt.match(/tỷ lệ khung hình là\s+([0-9:]+)/i)
    const arCmdMatch = form.prompt.match(/--ar\s+([0-9:]+)/i)
    const extractedAr = arTagMatch?.[1] || arTextMatch?.[1] || arCmdMatch?.[1]
    if (extractedAr && extractedAr !== aspectRatio) {
      setAspectRatio(extractedAr)
    }

    // 2. Version extraction
    const vCmdMatch = form.prompt.match(/--v\s+([0-9.]+)/i)
    const nijiCmdMatch = form.prompt.match(/--niji\s+(\d+)/i)
    const extractedVersion = vCmdMatch ? vCmdMatch[1] : (nijiCmdMatch ? `niji ${nijiCmdMatch[1]}` : null)
    if (extractedVersion && extractedVersion !== version) {
      setVersion(extractedVersion)
    }

    // 3. Seed extraction
    const seedCmdMatch = form.prompt.match(/--seed\s+(\d+)/i)
    const extractedSeed = seedCmdMatch?.[1]
    if (extractedSeed && extractedSeed !== seed) {
      setSeed(extractedSeed)
    }
  }, [form.prompt])

  const handleJsonChange = (val) => {
    set('workflowJson')(val)
    if (!val.trim()) {
      setJsonError(null)
      return
    }
    try {
      JSON.parse(val)
      setJsonError(null)
    } catch (e) {
      setJsonError(e.message.slice(0, 65))
    }
  }

  return (
    <div className="card p-6 space-y-5">
      <StepHeader
        step={1}
        total={4}
        title="Công cụ AI & Prompt"
        subtitle="Chọn tool và nhập prompt bạn đã dùng để tạo ảnh"
      />

      <AIToolSelector value={form.aiTool} onChange={set('aiTool')} />

      <PromptField
        label="Prompt"
        required
        value={form.prompt}
        onChange={set('prompt')}
        placeholder="Mô tả chi tiết nội dung bạn muốn tạo..."
        maxLength={2000}
      />

      {/* Negative prompt */}
      <div>
        <button
          type="button"
          onClick={() => set('showNegative')(!form.showNegative)}
          className="text-sm text-white/40 hover:text-white/70 flex items-center gap-1.5 transition-colors"
        >
          <ChevronDown
            size={14}
            className={`transition-transform ${form.showNegative ? 'rotate-180' : ''}`}
          />
          {form.showNegative ? 'Ẩn' : 'Thêm'} Negative Prompt
        </button>
        <AnimatePresence>
          {form.showNegative && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden mt-3"
            >
              <PromptField
                label="Negative Prompt"
                value={form.negativePrompt}
                onChange={set('negativePrompt')}
                placeholder="Những gì bạn KHÔNG muốn xuất hiện trong ảnh..."
                maxLength={1000}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Parameters */}
      <div>
        <button
          type="button"
          onClick={() => set('showParams')(!form.showParams)}
          className="text-sm text-white/40 hover:text-white/70 flex items-center gap-1.5 transition-colors"
        >
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
              className="overflow-hidden mt-3 p-4 rounded-xl border border-white/5 bg-white/2 space-y-4"
            >
              {/* Aspect Ratio Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-white/50 uppercase tracking-wider block">
                  Tỷ lệ khung hình (Aspect Ratio)
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {[
                    { label: '1:1 Square', value: '1:1' },
                    { label: '16:9 Landscape', value: '16:9' },
                    { label: '9:16 Portrait', value: '9:16' },
                    { label: '4:3 Photo', value: '4:3' },
                    { label: '3:2 Classic', value: '3:2' },
                    { label: '4:5 Social', value: '4:5' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        setAspectRatio(
                          aspectRatio === opt.value ? '' : opt.value
                        )
                      }
                      className={`px-2.5 py-2 rounded-lg text-xs font-semibold text-center border transition-all ${
                        aspectRatio === opt.value
                          ? 'bg-[#7986eb]/25 border-[#7986eb] text-[#a5b0f5]'
                          : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                      }`}
                    >
                      <div className="text-[10px] text-white/40 mb-0.5">
                        {opt.value}
                      </div>
                      <div>{opt.label.split(' ')[1]}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Version & Seed Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Model Version Dropdown */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-white/50 uppercase tracking-wider block">
                    Phiên bản AI (Model Version)
                  </label>
                  <select
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    className="input text-sm text-white/80 bg-black/40 border border-white/10 rounded-xl px-3 py-2 w-full focus:outline-none focus:ring-1 focus:ring-[#7986eb]"
                  >
                    <option value="">Mặc định / Không chỉ định</option>
                    <option value="6.1">Midjourney v6.1 (--v 6.1)</option>
                    <option value="6.0">Midjourney v6.0 (--v 6.0)</option>
                    <option value="5.2">Midjourney v5.2 (--v 5.2)</option>
                    <option value="5.0">Midjourney v5.0 (--v 5.0)</option>
                    <option value="niji 6">Niji v6 (--niji 6)</option>
                    <option value="niji 5">Niji v5 (--niji 5)</option>
                  </select>
                </div>

                {/* Seed Number Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-white/50 uppercase tracking-wider block">
                    Số ngẫu nhiên (Seed)
                  </label>
                  <input
                    type="number"
                    value={seed}
                    onChange={(e) => setSeed(e.target.value)}
                    placeholder="Ví dụ: 123456"
                    className="input text-sm w-full"
                  />
                </div>
              </div>

              {/* Custom Parameters */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-white/50 uppercase tracking-wider block">
                  Tham số khác (Custom parameters)
                </label>
                <input
                  type="text"
                  value={customParams}
                  onChange={(e) => setCustomParams(e.target.value)}
                  placeholder="Ví dụ: --stylize 250 --chaos 10 --no text"
                  className="input font-mono text-sm w-full"
                />
              </div>

              {/* Auto Generated Display */}
              {form.parameters && (
                <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[10px] text-white/35 font-bold uppercase tracking-wider">
                    Tham số tự động sinh:
                  </span>
                  <code className="text-xs text-[#a5b0f5] bg-[#7986eb]/10 px-2 py-0.5 rounded font-mono">
                    {form.parameters}
                  </code>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── JSON Workflow — Ultimate only ─────────────────────── */}
      {tierAccess?.canExportJson ? (
        <div>
          <button
            type="button"
            onClick={() => set('showWorkflow')(!form.showWorkflow)}
            className="flex items-center gap-2 group"
          >
            <span
              className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border"
              style={{
                background: 'rgba(6,182,212,0.10)',
                borderColor: 'rgba(6,182,212,0.30)',
                color: '#06b6d4',
              }}
            >
              <Crown size={9} /> Ultimate
            </span>
            <span className="text-sm text-white/40 group-hover:text-white/70 transition-colors flex items-center gap-1">
              <FileJson size={13} />
              {form.showWorkflow ? 'Ẩn' : 'Thêm'} JSON Workflow
            </span>
            <ChevronDown
              size={13}
              className={`text-white/25 transition-transform ${form.showWorkflow ? 'rotate-180' : ''}`}
            />
          </button>

          <AnimatePresence>
            {form.showWorkflow && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden mt-3 space-y-2"
              >
                <div
                  className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs"
                  style={{
                    background: 'rgba(6,182,212,0.06)',
                    border: '1px solid rgba(6,182,212,0.18)',
                    color: 'rgba(6,182,212,0.85)',
                  }}
                >
                  <FileJson size={13} className="flex-shrink-0 mt-0.5" />
                  <span>
                    Paste ComfyUI workflow JSON. Người dùng Ultimate có thể{' '}
                    <strong>import thẳng vào ComfyUI</strong> để tái tạo kết quả
                    chính xác.
                  </span>
                </div>

                <div className="relative">
                  <textarea
                    value={form.workflowJson}
                    onChange={(e) => handleJsonChange(e.target.value)}
                    placeholder={'{\n  "nodes": [...],\n  "links": [...]\n}'}
                    rows={8}
                    spellCheck={false}
                    className="input resize-none font-mono text-xs leading-relaxed w-full"
                    style={{
                      borderColor: jsonError
                        ? 'rgba(239,68,68,0.4)'
                        : undefined,
                      background: 'rgba(0,0,0,0.3)',
                    }}
                  />
                  {form.workflowJson.trim() && (
                    <span
                      className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{
                        background: jsonError
                          ? 'rgba(239,68,68,0.15)'
                          : 'rgba(34,197,94,0.15)',
                        color: jsonError ? '#ef4444' : '#22c55e',
                        border: `1px solid ${jsonError ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`,
                      }}
                    >
                      {jsonError ? '✗ Invalid' : '✓ Valid JSON'}
                    </span>
                  )}
                </div>
                {jsonError && (
                  <p className="text-xs text-red-400/80 font-mono pl-1">
                    ⚠ {jsonError}
                  </p>
                )}
                <p className="text-right text-xs text-white/20">
                  {form.workflowJson.length.toLocaleString()} ký tự
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{
            background: 'rgba(255,255,255,0.025)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              background: 'rgba(6,182,212,0.08)',
              border: '1px solid rgba(6,182,212,0.15)',
            }}
          >
            <FileJson size={15} style={{ color: '#06b6d4', opacity: 0.45 }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white/35">
              JSON Workflow Export
            </p>
            <p className="text-[11px] text-white/20">
              Import thẳng vào ComfyUI · Chỉ dành cho Ultimate
            </p>
          </div>
          <span
            className="text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0"
            style={{
              background: 'rgba(6,182,212,0.10)',
              border: '1px solid rgba(6,182,212,0.22)',
              color: '#06b6d4',
            }}
          >
            👑 Ultimate
          </span>
        </div>
      )}
    </div>
  )
}

// ── STEP 2: Source images ─────────────────────────────────────────
function Step2Source({
  images,
  onAdd,
  onRemove,
  selectedHistoryIds,
  sourceHistory,
  onToggleHistory,
  setShowHistoryDrawer,
}) {
  const selectedHistoryImages = sourceHistory.filter((img) =>
    selectedHistoryIds.has(img.publicId)
  )
  const totalSelected = images.length + selectedHistoryIds.size

  return (
    <div className="card p-6 space-y-6">
      <StepHeader
        step={2}
        total={4}
        title="Ảnh tham khảo / Input"
        subtitle="Ảnh gốc bạn đã dùng làm tham khảo cho AI (không bắt buộc)"
      />

      <div className="p-4 rounded-2xl bg-brand-900/10 border border-brand-700/20 text-sm text-brand-300/85 flex items-start gap-2.5">
        <Sparkles size={16} className="text-brand-400 mt-0.5 flex-shrink-0" />
        <span>
          💡 Bước này <strong>không bắt buộc</strong>. Thêm ảnh nếu bạn dùng
          img2img, controlnet, hoặc có ảnh tham khảo phong cách.
        </span>
      </div>

      {totalSelected > 0 && (
        <div className="space-y-3">
          <label className="text-xs font-semibold text-white/45 uppercase tracking-wider block">
            Ảnh tham khảo đã chọn ({totalSelected}/5)
          </label>
          <div className="flex flex-wrap gap-3">
            {images.map((img) => (
              <motion.div
                key={img.id}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative w-24 h-24 rounded-2xl overflow-hidden border border-white/10 group bg-black/40"
              >
                <img
                  src={img.preview}
                  alt=""
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => onRemove(img.id)}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 flex items-center justify-center
                    opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80"
                >
                  <X size={12} className="text-white" />
                </button>
                <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 bg-black/60 rounded text-[9px] font-bold text-white/60">
                  Local
                </span>
              </motion.div>
            ))}

            {selectedHistoryImages.map((img) => (
              <motion.div
                key={img.publicId}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative w-24 h-24 rounded-2xl overflow-hidden border border-white/10 group bg-black/40"
              >
                <img
                  src={img.thumbnailUrl || getOptimizedWebpUrl(img.url, 150)}
                  alt=""
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => onToggleHistory(img)}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 flex items-center justify-center
                    opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80"
                >
                  <X size={12} className="text-white" />
                </button>
                <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 bg-brand-600/80 rounded text-[9px] font-bold text-brand-100">
                  Lịch sử
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {totalSelected < 5 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-white/70 block">
              Tải lên từ máy
            </label>
            <UnifiedDropZone onAdd={onAdd} max={5 - totalSelected} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-white/70 block">
              Hoặc sử dụng ảnh cũ
            </label>
            <button
              type="button"
              onClick={() => setShowHistoryDrawer(true)}
              className="w-full aspect-[3/2] sm:aspect-auto sm:h-[108px] rounded-2xl border border-white/10 hover:border-brand-500/40 bg-white/2 hover:bg-brand-900/10 flex flex-col items-center justify-center gap-2 transition-all duration-300 group select-none text-center"
            >
              <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:scale-105 group-hover:border-brand-500/30 transition-all duration-300">
                <LayoutGrid
                  size={18}
                  className="text-white/40 group-hover:text-brand-400 transition-colors"
                />
              </div>
              <span className="text-xs font-semibold text-white/80 group-hover:text-brand-300 transition-colors">
                Chọn từ thư viện lịch sử
              </span>
            </button>
          </div>
        </div>
      )}

      {totalSelected === 0 && (
        <p className="text-center text-white/20 text-xs py-2">
          Bỏ qua bước này nếu bạn tạo từ text prompt thuần túy
        </p>
      )}
    </div>
  )
}

function UnifiedDropZone({ onAdd, max }) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/jpeg': [], 'image/png': [], 'image/webp': [] },
    maxSize: 20 * 1024 * 1024,
    maxFiles: max,
    onDropAccepted: onAdd,
  })

  return (
    <div
      {...getRootProps()}
      className={`relative rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all duration-300 p-6 select-none text-center h-[108px] bg-white/2
        ${isDragActive ? 'border-brand-500 bg-brand-950/20' : 'border-white/10 hover:border-white/20 hover:bg-white/4'}`}
    >
      <input {...getInputProps()} />
      <Upload size={20} className="text-white/30 mb-1.5" />
      <span className="text-xs text-white/45">
        Kéo thả ảnh hoặc click để chọn
      </span>
      <span className="text-[10px] text-white/25 mt-0.5">
        JPG, PNG, WebP (Tối đa {max} ảnh)
      </span>
    </div>
  )
}

function HistoryDrawer({ images, selectedIds, onToggle, loading, onClose }) {
  return (
    <div className="fixed inset-0 z-[999] overflow-hidden">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
      />

      <div className="absolute inset-y-0 right-0 pl-10 max-w-full flex">
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="w-screen max-w-md"
        >
          <div className="h-full flex flex-col bg-[#111116] border-l border-white/10 shadow-2xl overflow-y-hidden">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <LayoutGrid size={18} className="text-brand-400" />
                  Lịch sử tải lên
                </h3>
                <p className="text-xs text-white/40 mt-1">
                  Chọn ảnh từ các bài đăng trước để làm tham khảo
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-white/10">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-white/40 gap-3">
                  <Loader2 size={24} className="animate-spin text-brand-400" />
                  <span className="text-sm">Đang tải lịch sử ảnh...</span>
                </div>
              ) : images.length === 0 ? (
                <div className="text-center py-20 text-white/30 text-sm">
                  Bạn chưa có ảnh tham khảo nào trong lịch sử.
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs text-white/40">
                    Đang chọn{' '}
                    <span className="text-brand-400 font-bold">
                      {selectedIds.size}
                    </span>{' '}
                    ảnh
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    {images.map((img) => {
                      const isSelected = selectedIds.has(img.publicId)
                      return (
                        <button
                          key={img.publicId}
                          type="button"
                          onClick={() => onToggle(img)}
                          className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all duration-200 group
                            ${
                              isSelected
                                ? 'border-brand-500 ring-4 ring-brand-500/20 scale-[0.96]'
                                : 'border-white/5 hover:border-white/20'
                            }`}
                        >
                          <img
                            src={img.thumbnailUrl || getOptimizedWebpUrl(img.url, 150)}
                            alt=""
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                          {isSelected && (
                            <div className="absolute inset-0 bg-brand-600/30 backdrop-blur-[1px] flex items-center justify-center">
                              <CheckCircle
                                size={22}
                                className="text-white drop-shadow-md fill-brand-600"
                              />
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-white/10 bg-black/20 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-xl bg-brand-600 text-white font-bold text-sm transition-all hover:bg-brand-500"
              >
                Xác nhận ({selectedIds.size})
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

// ── STEP 3: Generated images ──────────────────────────────────────
function Step3Generated({
  images,
  onAdd,
  onRemove,
  multiModelMode,
  onToggleMultiModel,
  modelSlots,
  onUpdateSlot,
  onRemoveSlot,
  onAddSlot,
}) {
  return (
    <div className="card p-6 space-y-4">
      <StepHeader
        step={3}
        total={4}
        title="Kết quả AI"
        subtitle="Upload ảnh AI đã tạo ra từ prompt của bạn"
      />
      <div className="flex items-center justify-between p-3 rounded-xl bg-white/3 border border-white/8">
        <div className="flex items-center gap-2">
          <GitCompare size={16} className="text-brand-400" />
          <div>
            <p className="text-sm font-semibold text-white">
              « So sánh nhiều model »
            </p>
            <p className="text-xs text-white/40">
              Mỗi model có kết quả riêng cho cùng 1 prompt
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onToggleMultiModel}
          className={`w-11 h-6 rounded-full transition-colors duration-200 relative flex-shrink-0 ${multiModelMode ? 'bg-brand-600' : 'bg-white/15'}`}
        >
          <div
            className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${multiModelMode ? 'translate-x-6' : 'translate-x-1'}`}
          />
        </button>
      </div>
      {multiModelMode ? (
        <div className="space-y-3">
          <p className="text-xs text-white/40">
            Thêm ít nhất 2 model — mỗi card có công cụ AI và ảnh riêng
          </p>
          <AnimatePresence>
            {modelSlots.map((slot, i) => (
              <ModelSlot
                key={slot.id}
                slot={slot}
                index={i}
                onUpdate={onUpdateSlot}
                onRemove={onRemoveSlot}
                canRemove={modelSlots.length > 1}
              />
            ))}
          </AnimatePresence>
          {modelSlots.length < 5 && (
            <button
              type="button"
              onClick={onAddSlot}
              className="w-full py-2.5 rounded-xl border-2 border-dashed border-white/12 hover:border-brand-500/40 hover:bg-brand-900/20 text-white/40 hover:text-brand-300 text-sm flex items-center justify-center gap-2 transition-all duration-200"
            >
              <Plus size={15} /> Thêm model
            </button>
          )}
          <p className="text-xs text-white/25 text-center">
            {modelSlots.filter((s) => s.genImages?.length > 0).length}/
            {modelSlots.length} model đã có ảnh
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <ImageDropZone
            images={images}
            onAdd={onAdd}
            onRemove={onRemove}
            max={5}
            label="Ảnh kết quả"
            hint="Tối thiểu 1, tối đa 5 ảnh"
            required
          />
          {images.length === 0 && (
            <div className="flex items-center gap-3 p-4 rounded-xl border border-red-500/20 bg-red-500/5">
              <AlertCircle size={18} className="text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-300/80">
                Cần ít nhất 1 ảnh kết quả AI để tiếp tục
              </p>
            </div>
          )}
          {images.length > 0 && (
            <p className="text-xs text-white/30 text-center">
              Ảnh đầu tiên sẽ là ảnh đại diện cho bài đăng
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ── STEP 4: Metadata ─────────────────────────────────────────────
function Step4Meta({
  form,
  setForm,
  categories,
  uploading,
  progress,
  step = 4,
  total = 4,
}) {
  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }))

  return (
    <div className="card p-6 space-y-5">
      <StepHeader
        step={step}
        total={total}
        title="Thông tin bài đăng"
        subtitle="Thêm mô tả và gắn thẻ để dễ tìm kiếm"
      />

      {/* Caption */}
      <div>
        <label className="input-label">Mô tả ngắn</label>
        <textarea
          rows={3}
          value={form.caption}
          onChange={(e) => set('caption')(e.target.value)}
          placeholder="Chia sẻ cảm nghĩ về tác phẩm này..."
          maxLength={500}
          className="input resize-none"
        />
        <p className="text-right text-xs text-white/25 mt-1">
          {form.caption.length}/500
        </p>
      </div>

      {/* Tags */}
      <div>
        <label className="input-label flex items-center gap-1.5">
          <Tag size={13} /> Tags{' '}
          <span className="text-white/30">(cách nhau bởi dấu phẩy)</span>
        </label>
        <input
          type="text"
          value={form.tags}
          onChange={(e) => set('tags')(e.target.value)}
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
          {categories.map((cat) => (
            <button
              key={cat.slug}
              type="button"
              onClick={() => set('category')(cat.slug)}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-150
                ${
                  form.category === cat.slug
                    ? 'bg-brand-600/30 border border-brand-500/60 text-brand-300'
                    : 'bg-white/5 border border-white/10 text-white/50 hover:border-white/25'
                }`}
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
            <p className="text-xs text-white/40">
              Người dùng tốn token để tải ảnh full-res
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => set('isPremium')(!form.isPremium)}
          className={`w-11 h-6 rounded-full transition-colors duration-200 relative flex-shrink-0
            ${form.isPremium ? 'bg-brand-600' : 'bg-white/15'}`}
        >
          <div
            className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform duration-200
            ${form.isPremium ? 'translate-x-6' : 'translate-x-1'}`}
          />
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
            onChange={(e) =>
              set('priceInTokens')(parseInt(e.target.value) || 10)
            }
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

// ── STEP 1: Digital Image Upload ──────────────────────────────────
function Step1DigitalImage({
  images,
  sourceImages,
  hasLut,
  setHasLut,
  onAddGen,
  onRemoveGen,
  onAddSource,
  onRemoveSource,
  exifInfo,
}) {
  return (
    <div className="card p-6 space-y-5">
      <StepHeader
        step={1}
        total={3}
        title="Tải lên hình ảnh tác phẩm"
        subtitle="Kéo thả ảnh chụp kỹ thuật số (JPG/PNG). EXIF máy ảnh sẽ được đọc tự động."
      />

      {/* LUT Option Switch */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-white/3 border border-white/8">
        <div className="flex items-center gap-3">
          <GitCompare size={18} className="text-brand-400" />
          <div>
            <p className="text-sm font-semibold">Tác phẩm có áp dụng LUT màu</p>
            <p className="text-xs text-white/40">
              Cho phép người dùng so sánh ảnh gốc (RAW) và ảnh sau chỉnh sửa
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setHasLut(!hasLut)}
          className={`w-11 h-6 rounded-full transition-colors duration-200 relative flex-shrink-0
            ${hasLut ? 'bg-brand-600' : 'bg-white/15'}`}
        >
          <div
            className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform duration-200
            ${hasLut ? 'translate-x-6' : 'translate-x-1'}`}
          />
        </button>
      </div>

      {hasLut ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-white/80 block">
              Ảnh gốc (Chưa chỉnh sửa)
            </label>
            <LargeDropZone
              image={sourceImages[0]}
              onAdd={onAddSource}
              onRemove={onRemoveSource}
              label="Kéo thả ảnh gốc vào đây"
              subtitle="Ảnh gốc chưa áp preset hoặc LUT màu"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-white/80 block">
              Ảnh kết quả (Sau khi áp LUT)
            </label>
            <LargeDropZone
              image={images[0]}
              onAdd={onAddGen}
              onRemove={onRemoveGen}
              label="Kéo thả ảnh sau khi áp LUT"
              subtitle="Ảnh kết quả hoàn thiện cuối cùng"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <label className="text-sm font-semibold text-white/80 block">
            Hình ảnh tác phẩm
          </label>
          <LargeDropZone
            image={images[0]}
            onAdd={onAddGen}
            onRemove={onRemoveGen}
            label="Kéo thả ảnh của bạn vào đây"
            subtitle="Định dạng JPG, PNG hoặc WebP"
          />
        </div>
      )}

      {/* EXIF Readout panel */}
      {exifInfo && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl border border-brand-500/20 bg-brand-900/10 flex flex-col gap-2"
        >
          <div className="flex items-center gap-2 text-brand-400 font-bold text-xs uppercase tracking-wider">
            <Sparkles size={14} className="animate-pulse" /> Đã đọc thông tin
            máy ảnh (EXIF)
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-1 text-xs">
            <div>
              <span className="text-white/40 block mb-0.5">Máy ảnh</span>
              <span className="text-white/90 font-medium truncate block">
                {exifInfo.camera || 'Không rõ'}
              </span>
            </div>
            <div>
              <span className="text-white/40 block mb-0.5">Ống kính</span>
              <span className="text-white/90 font-medium truncate block">
                {exifInfo.lensModel || 'Không rõ'}
              </span>
            </div>
            <div>
              <span className="text-white/40 block mb-0.5">Tiêu cự</span>
              <span className="text-white/90 font-medium">
                {exifInfo.focalLength || 'Không rõ'}
              </span>
            </div>
            <div>
              <span className="text-white/40 block mb-0.5">Khẩu độ</span>
              <span className="text-white/90 font-medium">
                {exifInfo.aperture || 'Không rõ'}
              </span>
            </div>
            <div>
              <span className="text-white/40 block mb-0.5">Tốc độ chụp</span>
              <span className="text-white/90 font-medium">
                {exifInfo.shutterSpeed || 'Không rõ'}
              </span>
            </div>
            <div>
              <span className="text-white/40 block mb-0.5">ISO</span>
              <span className="text-white/90 font-medium">
                {exifInfo.iso || 'Không rõ'}
              </span>
            </div>
            <div>
              <span className="text-white/40 block mb-0.5">Cân bằng trắng</span>
              <span className="text-white/90 font-medium">
                {exifInfo.whiteBalance || 'Không rõ'}
              </span>
            </div>
            {exifInfo.exposureProgram && (
              <div>
                <span className="text-white/40 block mb-0.5">Chế độ chụp</span>
                <span className="text-white/90 font-medium truncate block">
                  {exifInfo.exposureProgram}
                </span>
              </div>
            )}
            {exifInfo.meteringMode && (
              <div>
                <span className="text-white/40 block mb-0.5">Đo sáng</span>
                <span className="text-white/90 font-medium truncate block">
                  {exifInfo.meteringMode}
                </span>
              </div>
            )}
            {exifInfo.exposureCompensation && (
              <div>
                <span className="text-white/40 block mb-0.5">
                  Bù trừ sáng (EV)
                </span>
                <span className="text-white/90 font-medium">
                  {exifInfo.exposureCompensation}
                </span>
              </div>
            )}
            {exifInfo.digitalZoomRatio && (
              <div>
                <span className="text-white/40 block mb-0.5">Zoom số</span>
                <span className="text-white/90 font-medium">
                  {exifInfo.digitalZoomRatio}
                </span>
              </div>
            )}
            {exifInfo.colorSpace && (
              <div>
                <span className="text-white/40 block mb-0.5">
                  Không gian màu
                </span>
                <span className="text-white/90 font-medium">
                  {exifInfo.colorSpace}
                </span>
              </div>
            )}
            <div>
              <span className="text-white/40 block mb-0.5">Toạ độ GPS</span>
              <span className="text-white/90 font-medium">
                {exifInfo.gpsLat !== null &&
                exifInfo.gpsLng !== null &&
                exifInfo.gpsLat !== undefined &&
                exifInfo.gpsLng !== undefined
                  ? `${parseFloat(exifInfo.gpsLat.toFixed(4))}, ${parseFloat(exifInfo.gpsLng.toFixed(4))}`
                  : 'Không có'}
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}

// ── STEP 2: Digital Attachments Upload ──────────────────────────────
function Step2DigitalAttachments({
  rawFile,
  setRawFile,
  colorFile,
  setColorFile,
}) {
  const {
    getRootProps: getRawProps,
    getInputProps: getRawInputProps,
    isDragActive: isRawActive,
  } = useDropzone({
    maxFiles: 1,
    maxSize: 100 * 1024 * 1024, // 100MB
    onDropAccepted: (files) => {
      const f = files[0]
      setRawFile({
        file: f,
        name: f.name,
        size: (f.size / (1024 * 1024)).toFixed(1) + ' MB',
        format: f.name.split('.').pop().toLowerCase(),
      })
      toast.success('📎 Đã đính kèm file RAW!')
    },
  })

  const {
    getRootProps: getColorProps,
    getInputProps: getColorInputProps,
    isDragActive: isColorActive,
  } = useDropzone({
    maxFiles: 1,
    maxSize: 20 * 1024 * 1024, // 20MB
    onDropAccepted: (files) => {
      const f = files[0]
      setColorFile({
        file: f,
        name: f.name,
        size: (f.size / 1024).toFixed(1) + ' KB',
        format: f.name.split('.').pop().toLowerCase(),
      })
      toast.success('🎨 Đã đính kèm file màu!')
    },
  })

  return (
    <div className="card p-6 space-y-6">
      <StepHeader
        step={2}
        total={3}
        title="Tệp đính kèm tùy chọn"
        subtitle="Đính kèm file RAW gốc và preset màu LUT để tăng tính chuyên nghiệp"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* RAW FILE ZONE */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-white/80 block">
            File RAW gốc (Tùy chọn)
          </label>
          <p className="text-xs text-white/35">
            Hỗ trợ các định dạng .CR2, .NEF, .ARW, .DNG... tối đa 100MB
          </p>
          {rawFile ? (
            <div className="p-4 rounded-xl border border-brand-500/20 bg-brand-900/10 flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">
                  {rawFile.name}
                </p>
                <p className="text-[10px] text-white/40">
                  {rawFile.format} · {rawFile.size}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRawFile(null)}
                className="text-xs font-semibold text-red-400 hover:text-red-300 transition-colors"
              >
                Xóa
              </button>
            </div>
          ) : (
            <div
              {...getRawProps()}
              className={`p-6 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all text-center
                ${isRawActive ? 'border-brand-500 bg-brand-950/20' : 'border-white/10 hover:border-white/20 hover:bg-white/4'}`}
            >
              <input {...getRawInputProps()} />
              <Upload size={20} className="text-white/30 mb-2" />
              <span className="text-xs text-white/45">
                Kéo thả file RAW hoặc click để chọn
              </span>
            </div>
          )}
        </div>

        {/* COLOR FILE ZONE */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-white/80 block">
            File preset màu/LUT (Tùy chọn)
          </label>
          <p
            className="text-xs text-white/35"
            style={{ paddingBottom: '16px' }}
          >
            Hỗ trợ các định dạng .CUBE, .XMP... tối đa 20MB
          </p>
          {colorFile ? (
            <div className="p-4 rounded-xl border border-brand-500/20 bg-brand-900/10 flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">
                  {colorFile.name}
                </p>
                <p className="text-[10px] text-white/40">
                  {colorFile.format} · {colorFile.size}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setColorFile(null)}
                className="text-xs font-semibold text-red-400 hover:text-red-300 transition-colors"
              >
                Xóa
              </button>
            </div>
          ) : (
            <div
              {...getColorProps()}
              className={`p-6 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all text-center
                ${isColorActive ? 'border-brand-500 bg-brand-950/20' : 'border-white/10 hover:border-white/20 hover:bg-white/4'}`}
            >
              <input {...getColorInputProps()} />
              <Upload size={20} className="text-white/30 mb-2" />
              <span className="text-xs text-white/45">
                Kéo thả file màu hoặc click để chọn
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── LargeDropZone (Helper) ─────────────────────────────────────────
function LargeDropZone({ image, onAdd, onRemove, label, subtitle }) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/jpeg': [], 'image/png': [], 'image/webp': [] },
    maxSize: 100 * 1024 * 1024,
    maxFiles: 1,
    onDropAccepted: onAdd,
  })

  if (image) {
    return (
      <div className="relative aspect-[3/2] w-full rounded-2xl overflow-hidden border border-white/10 group bg-black/40">
        <img
          src={image.preview}
          alt="Upload preview"
          className="w-full h-full object-contain"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
          <button
            type="button"
            onClick={onRemove}
            className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors shadow-md"
          >
            Xóa ảnh
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      {...getRootProps()}
      className={`relative aspect-[3/2] w-full rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all duration-300 p-6 select-none text-center bg-white/2
        ${isDragActive ? 'border-brand-500 bg-brand-950/20' : 'border-white/10 hover:border-white/20 hover:bg-white/4'}`}
    >
      <input {...getInputProps()} />
      <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-3">
        <Upload size={22} className="text-white/40" />
      </div>
      <h3 className="text-xs font-semibold text-white/80">{label}</h3>
      <p className="text-[10px] text-white/45 mt-1 max-w-xs">{subtitle}</p>
    </div>
  )
}
