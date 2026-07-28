/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-hooks/set-state-in-effect */
import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  Component,
} from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useNotificationStore from '../store/notification.store'
import {
  LayoutDashboard,
  Images,
  Users,
  CheckCircle,
  XCircle,
  EyeOff,
  Clock,
  Coins,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  BarChart3,
  AlertTriangle,
  Plus,
  Minus,
  Tag,
  Pencil,
  Trash2,
  Eye,
  TrendingUp,
  TrendingDown,
  Activity,
  PieChart,
  Layers,
  ToggleLeft,
  ToggleRight,
  Check,
  Square,
  CheckSquare,
  X,
  Save,
  Loader2,
  LoaderCircle,
  Maximize2,
  Minimize2,
  Settings,
  Zap,
  ZapOff,
  Timer,
  UserCheck,
  Shield,
  Palette,
  ArrowRight,
  Megaphone,
  Wallet,
  Flag,
  Heart,
  Calendar,
  ArrowUpDown,
  Image,
  Hourglass,
  Bot,
  Sparkles,
  Copy,
  RotateCcw,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/api'
import useAuthStore from '../store/auth.store'
import { Navigate, useSearchParams } from 'react-router-dom'
import { useSettings } from '../context/SettingsContext'
import { getOptimizedWebpUrl } from '../utils/imageUrl'
import ExifPanel from '../components/post/ExifPanel'

// ─── Error Boundary ────────────────────────────────────────────
class ComponentErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error(
      `🔥 [${this.props.tabName || 'AdminTab'} Render Error]:`,
      error,
      errorInfo
    )
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 rounded-2xl bg-red-950/40 border border-red-500/30 text-red-200 space-y-3 my-4">
          <div className="flex items-center gap-2 text-red-400 font-bold text-base">
            <AlertTriangle size={20} />
            <span>
              Đã xảy ra lỗi tại tab: {this.props.tabName || 'Quản trị'}
            </span>
          </div>
          <p className="text-xs text-red-300 font-mono bg-black/40 p-3 rounded-xl overflow-x-auto select-all">
            {this.state.error?.toString() || 'Unknown Component Error'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null })
              window.location.reload()
            }}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            🔄 Tải lại trang
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

// ─── Guard ─────────────────────────────────────────────────────
const AdminGuard = ({ children }) => {
  const user = useAuthStore((s) => s.user)
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'admin') return <Navigate to="/" replace />
  return children
}

// ─── Stat Card ─────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, color = 'text-white', sub }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    className="card p-5"
  >
    <div className="flex items-center justify-between mb-3">
      <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">
        {label}
      </span>
      <Icon size={18} className={color} />
    </div>
    <p className={`text-3xl font-black ${color}`}>
      {value?.toLocaleString() ?? '—'}
    </p>
    {sub && <p className="text-xs text-white/30 mt-1">{sub}</p>}
  </motion.div>
)

// ─── Status Badge ───────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const map = {
    approved: {
      label: 'Đã duyệt',
      cls: 'bg-green-500/15 text-green-400 border-green-500/30',
      Icon: CheckCircle,
    },
    pending: {
      label: 'Chờ duyệt',
      cls: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
      Icon: Clock,
    },
    rejected: {
      label: 'Từ chối',
      cls: 'bg-red-500/15 text-red-400 border-red-500/30',
      Icon: XCircle,
    },
    hidden: {
      label: 'Đã ẩn',
      cls: 'bg-white/5 text-white/40 border-white/10',
      Icon: EyeOff,
    },
  }
  const { label, cls, Icon: I } = map[status] || map.pending
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${cls}`}
    >
      <I size={11} />
      {label}
    </span>
  )
}

// ─── Mini SVG Chart ─────────────────────────────────────────────
const MiniBarChart = ({
  data = [],
  dataKey = 'posts',
  color = '#7c3aed',
  label = '',
}) => {
  const max = Math.max(...data.map((d) => d[dataKey]), 1)
  const w = 100 / data.length

  return (
    <div className="relative">
      <div className="flex items-end gap-0.5 h-20">
        {data.map((d, i) => {
          const pct = (d[dataKey] / max) * 100
          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center justify-end group relative"
            >
              <div
                className="w-full rounded-t-sm transition-all duration-500"
                style={{
                  height: `${Math.max(pct, 3)}%`,
                  background: color,
                  opacity: 0.7 + (pct / max) * 0.3,
                }}
              />
              {/* Tooltip on hover */}
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-surface-100 border border-white/10 rounded-lg px-2 py-0.5 text-[10px] text-white font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                {d[dataKey]} — {d.label}
              </div>
            </div>
          )
        })}
      </div>
      {/* X axis labels — chỉ show đầu + cuối */}
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-white/30">{data[0]?.label}</span>
        <span className="text-[9px] text-white/20 font-semibold">{label}</span>
        <span className="text-[10px] text-white/30">
          {data[data.length - 1]?.label}
        </span>
      </div>
    </div>
  )
}

// ─── Style Preview Mockup Component ─────────────────────────────
const StylePreview = ({ styleKey }) => {
  return (
    <div className="w-full h-24 bg-black/40 rounded-lg border border-white/5 p-1 flex flex-col justify-between mt-3 overflow-hidden relative group-hover:border-white/10 transition-colors">
      {/* Visual representation */}
      {styleKey === 'style-1' && (
        <div className="w-full h-full rounded-md bg-gradient-to-br from-brand-600/30 to-violet-500/10 relative overflow-hidden">
          <div className="absolute inset-0 bg-white/5 blur-[2px]" />
          {/* Label mockup */}
          <div className="absolute bottom-1.5 left-1.5 right-1.5 h-3 bg-white/10 border border-white/10 rounded-sm" />
        </div>
      )}

      {styleKey === 'style-2' && (
        <div className="w-full h-full grid grid-cols-2 gap-0.5 bg-white/[0.02]">
          <div className="flex flex-col gap-0.5 h-full">
            <div className="flex-[3] bg-gradient-to-br from-brand-600/40 to-violet-500/20 rounded-[2px]" />
            <div className="flex-[2] bg-gradient-to-br from-blue-600/30 to-sky-500/15 rounded-[2px]" />
          </div>
          <div className="flex flex-col gap-0.5 h-full">
            <div className="flex-[2] bg-gradient-to-br from-fuchsia-600/30 to-pink-500/15 rounded-[2px]" />
            <div className="flex-[3] bg-gradient-to-br from-indigo-600/40 to-purple-500/20 rounded-[2px]" />
          </div>
          {/* Label mockup */}
          <div className="absolute bottom-1.5 left-1.5 right-1.5 h-3 bg-white/10 border border-white/10 rounded-sm z-10" />
        </div>
      )}

      {styleKey === 'style-3' && (
        <div className="w-full h-full flex items-center justify-center relative overflow-hidden bg-white/[0.02]">
          <div className="absolute w-[80%] h-[80%] bg-gradient-to-br from-brand-600/40 to-violet-500/20 rounded shadow-lg z-10" />
          <div className="absolute w-[70%] h-[70%] bg-gradient-to-br from-blue-600/20 to-sky-500/10 rounded translate-x-2 -translate-y-1 rotate-[2deg] opacity-70" />
          <div className="absolute w-[70%] h-[70%] bg-gradient-to-br from-fuchsia-600/20 to-pink-500/10 rounded -translate-x-2 -translate-y-1 -rotate-[2deg] opacity-70" />
          {/* Label mockup */}
          <div className="absolute bottom-1.5 left-1.5 right-1.5 h-3 bg-white/15 border border-white/10 rounded-sm z-20" />
        </div>
      )}

      {styleKey === 'style-4' && (
        <div className="w-full h-full flex gap-0.5 bg-white/[0.02]">
          <div className="h-full flex-1 bg-gradient-to-br from-blue-600/30 to-sky-500/15 rounded-[2px] transition-all" />
          <div className="h-full flex-[2.5] bg-gradient-to-br from-brand-600/40 to-violet-500/25 rounded-[2px] border border-brand-500/20 relative">
            <div className="absolute inset-x-0.5 bottom-0.5 h-2 bg-white/20 rounded-[1px]" />
          </div>
          <div className="h-full flex-1 bg-gradient-to-br from-fuchsia-600/30 to-pink-500/15 rounded-[2px] transition-all" />
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// TAB: DASHBOARD
// ══════════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════
// ENTERPRISE INTERACTIVE SVG CHART COMPONENT
// ══════════════════════════════════════════════════════════════════
const EnterpriseChart = ({
  data = [],
  series = [
    {
      key: 'posts',
      label: 'Bài đăng mới',
      color: '#a855f7',
      gradient: ['#a855f7', '#7c3aed'],
    },
    {
      key: 'users',
      label: 'User mới',
      color: '#06b6d4',
      gradient: ['#06b6d4', '#0284c7'],
    },
  ],
  days = 7,
  chartType = 'area',
}) => {
  const [activeIndex, setActiveIndex] = useState(null)
  const svgRef = useRef(null)

  const W = 800
  const H = 230
  const Pt = 20
  const Pb = 35
  const Pl = 35
  const Pr = 20
  const HA = H - Pt - Pb
  const WA = W - Pl - Pr

  const values = data.flatMap((d) => series.map((s) => d[s.key] || 0))
  const maxVal = Math.max(...values, 5)

  // Calculate points for each series
  const seriesPoints = useMemo(() => {
    if (!data || data.length === 0) return []
    return series.map((s) => {
      const points = data.map((d, i) => {
        const x = Pl + (data.length > 1 ? (i / (data.length - 1)) * WA : WA / 2)
        const v = d[s.key] || 0
        const y = H - Pb - (v / maxVal) * HA
        return { x, y, value: v, label: d.label || d.date }
      })

      // Construct cubic bezier smooth path
      let pathD = ''
      if (points.length === 1) {
        pathD = `M ${points[0].x - 20} ${points[0].y} L ${points[0].x + 20} ${points[0].y}`
      } else {
        pathD = `M ${points[0].x} ${points[0].y}`
        for (let i = 0; i < points.length - 1; i++) {
          const curr = points[i]
          const next = points[i + 1]
          const mx = (curr.x + next.x) / 2
          pathD += ` C ${mx} ${curr.y}, ${mx} ${next.y}, ${next.x} ${next.y}`
        }
      }

      const lastX = points[points.length - 1].x
      const firstX = points[0].x
      const areaD = `${pathD} L ${lastX} ${H - Pb} L ${firstX} ${H - Pb} Z`

      return {
        ...s,
        points,
        pathD,
        areaD,
      }
    })
  }, [data, series, maxVal, WA, HA, Pl, Pr, Pt, Pb, H])

  const handleMouseMove = (e) => {
    if (!svgRef.current || !data.length) return
    const rect = svgRef.current.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const normalizedX = Math.max(0, Math.min(mouseX, rect.width))
    const index = Math.round((normalizedX / rect.width) * (data.length - 1))
    setActiveIndex(index)
  }

  const handleMouseLeave = () => {
    setActiveIndex(null)
  }

  const activeItem =
    activeIndex !== null && data[activeIndex] ? data[activeIndex] : null
  const yTicks = [0, Math.round(maxVal / 2), maxVal]

  return (
    <div className="relative w-full space-y-3">
      {/* Legend & Header Stats Summary */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-4">
          {series.map((s) => (
            <div
              key={s.key}
              className="flex items-center gap-2 font-medium text-white/80 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10"
            >
              <span
                className="w-2.5 h-2.5 rounded-full shadow-sm"
                style={{ background: s.color }}
              />
              <span>{s.label}:</span>
              <span className="font-bold text-white">
                {data
                  .reduce((sum, d) => sum + (d[s.key] || 0), 0)
                  .toLocaleString()}
              </span>
            </div>
          ))}
        </div>
        {activeItem && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 bg-violet-600/20 px-3 py-1 rounded-full text-violet-200 text-xs font-semibold border border-violet-500/30"
          >
            <Clock size={12} className="text-violet-400" />
            <span>Đang chọn: {activeItem.label}</span>
          </motion.div>
        )}
      </div>

      {/* Main SVG Area */}
      <div
        className="relative w-full overflow-hidden rounded-2xl bg-black/40 border border-white/10 p-3 sm:p-4 backdrop-blur-md"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-56 sm:h-64 cursor-crosshair overflow-visible select-none"
          preserveAspectRatio="none"
        >
          <defs>
            {series.map((s) => (
              <linearGradient
                key={`grad-${s.key}`}
                id={`grad-${s.key}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor={s.color} stopOpacity="0.4" />
                <stop offset="75%" stopColor={s.color} stopOpacity="0.05" />
                <stop offset="100%" stopColor={s.color} stopOpacity="0.0" />
              </linearGradient>
            ))}
          </defs>

          {/* Y Axis Grid lines */}
          {yTicks.map((val, idx) => {
            const yPos = H - Pb - (val / maxVal) * HA
            return (
              <g key={idx}>
                <line
                  x1={Pl}
                  y1={yPos}
                  x2={W - Pr}
                  y2={yPos}
                  stroke="rgba(255,255,255,0.06)"
                  strokeDasharray="4 4"
                />
                <text
                  x={Pl - 8}
                  y={yPos + 3}
                  fill="rgba(255,255,255,0.3)"
                  fontSize="10"
                  textAnchor="end"
                  className="font-mono text-[9px]"
                >
                  {val}
                </text>
              </g>
            )
          })}

          {/* Area & Curves */}
          {chartType === 'area'
            ? seriesPoints.map((sp) => (
                <g key={sp.key}>
                  {/* Area Gradient Fill */}
                  <path
                    d={sp.areaD}
                    fill={`url(#grad-${sp.key})`}
                    className="transition-all duration-300"
                  />
                  {/* Glowing stroke path */}
                  <path
                    d={sp.pathD}
                    fill="none"
                    stroke={sp.color}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="transition-all duration-300"
                  />
                </g>
              ))
            : /* Bar Chart Mode */
              data.map((d, i) => {
                const groupW = (WA / data.length) * 0.75
                const groupX =
                  Pl + (i / data.length) * WA + (WA / data.length - groupW) / 2
                const barW = groupW / series.length
                return (
                  <g key={i}>
                    {series.map((s, sIdx) => {
                      const val = d[s.key] || 0
                      const barH = (val / maxVal) * HA
                      const bx = groupX + sIdx * barW
                      const by = H - Pb - barH
                      return (
                        <rect
                          key={s.key}
                          x={bx}
                          y={by}
                          width={Math.max(barW - 2, 2)}
                          height={Math.max(barH, 2)}
                          rx="3"
                          fill={s.color}
                          opacity={activeIndex === i ? 1 : 0.8}
                          className="transition-all duration-300"
                        />
                      )
                    })}
                  </g>
                )
              })}

          {/* Active Hover Crosshair Line & Point Highlights */}
          {activeIndex !== null && data[activeIndex] && (
            <g className="pointer-events-none">
              {(() => {
                const cx =
                  Pl +
                  (data.length > 1
                    ? (activeIndex / (data.length - 1)) * WA
                    : WA / 2)
                return (
                  <>
                    <line
                      x1={cx}
                      y1={Pt}
                      x2={cx}
                      y2={H - Pb}
                      stroke="rgba(255,255,255,0.4)"
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                    />
                    {seriesPoints.map((sp) => {
                      const pt = sp.points[activeIndex]
                      if (!pt) return null
                      return (
                        <g key={sp.key}>
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r="7"
                            fill={sp.color}
                            opacity="0.3"
                          />
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r="4"
                            fill="#ffffff"
                            stroke={sp.color}
                            strokeWidth="2.5"
                          />
                        </g>
                      )
                    })}
                  </>
                )
              })()}
            </g>
          )}

          {/* X Axis Labels */}
          {data.map((d, i) => {
            const step = Math.ceil(data.length / 10)
            if (i % step !== 0 && i !== data.length - 1) return null
            const x =
              Pl + (data.length > 1 ? (i / (data.length - 1)) * WA : WA / 2)
            return (
              <text
                key={i}
                x={x}
                y={H - 10}
                fill={activeIndex === i ? '#ffffff' : 'rgba(255,255,255,0.35)'}
                fontSize="10"
                fontWeight={activeIndex === i ? '700' : '400'}
                textAnchor="middle"
              >
                {d.label}
              </text>
            )
          })}
        </svg>

        {/* Floating Tooltip Card */}
        <AnimatePresence>
          {activeItem && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute top-4 right-4 bg-surface-100/90 border border-white/20 backdrop-blur-xl rounded-xl p-3 shadow-2xl space-y-1.5 pointer-events-none z-20 min-w-[160px]"
            >
              <div className="flex items-center justify-between gap-3 text-xs border-b border-white/10 pb-1">
                <span className="font-bold text-violet-300">
                  📌 {activeItem.label}
                </span>
                <span className="text-[10px] text-white/40">
                  {days === 1 ? 'Khung giờ' : 'Ngày'}
                </span>
              </div>
              <div className="space-y-1">
                {series.map((s) => (
                  <div
                    key={s.key}
                    className="flex items-center justify-between gap-4 text-xs"
                  >
                    <span className="flex items-center gap-1.5 text-white/70">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ background: s.color }}
                      />
                      {s.label}:
                    </span>
                    <span className="font-black text-white font-mono">
                      {(activeItem[s.key] || 0).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// TAB: DASHBOARD (ENTERPRISE OVERHAUL)
// ══════════════════════════════════════════════════════════════════
const DashboardTab = () => {
  const [stats, setStats] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [days, setDays] = useState(7)
  const [metricView, setMetricView] = useState('posts_users') // 'posts_users' | 'interactions' | 'approved'
  const [chartType, setChartType] = useState('area') // 'area' | 'bar'
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(new Date())

  const adminUser = useAuthStore((s) => s.user)

  const fetchData = useCallback(() => {
    setLoading(true)
    Promise.all([
      api.get('/admin/dashboard'),
      api.get(`/admin/dashboard/analytics?days=${days}`),
    ])
      .then(([s, a]) => {
        setStats(s.data)
        setAnalytics(a.data)
        setLastUpdated(new Date())
      })
      .catch((err) => {
        console.error('❌ Error fetching dashboard data:', err)
        toast.error('Lỗi khi tải dữ liệu thống kê')
      })
      .finally(() => setLoading(false))
  }, [days])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const seriesMap = {
    posts_users: [
      { key: 'posts', label: 'Bài đăng mới', color: '#a855f7' },
      { key: 'users', label: 'User mới', color: '#06b6d4' },
    ],
    interactions: [
      { key: 'interactions', label: 'Lượt tương tác', color: '#ec4899' },
    ],
    approved: [
      { key: 'approved', label: 'Bài viết đã duyệt', color: '#10b981' },
    ],
  }

  const todayStats = stats?.todayStats || {}

  return (
    <div className="space-y-6">
      {/* Top Header Bar: System Status & Quick Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-violet-950/40 via-purple-950/20 to-black/40 border border-white/10 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="relative">
            <span className="flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              Bảng điều khiển Thống kê Enterprise
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                v2.5 Realtime
              </span>
            </h2>
            <p className="text-xs text-white/40">
              Cập nhật lúc:{' '}
              {lastUpdated.toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-semibold border border-white/10 transition-all cursor-pointer disabled:opacity-50"
          >
            <motion.div
              animate={loading ? { rotate: 360 } : { rotate: 0 }}
              transition={{
                duration: 0.8,
                repeat: loading ? Infinity : 0,
                ease: 'linear',
              }}
            >
              <RefreshCw size={14} className="text-violet-400" />
            </motion.div>
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* ─── TODAY'S REAL-TIME PULSE SECTION (THỐNG KÊ HÔM NAY) ──────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Zap size={16} className="text-amber-400" />
            <span>Thống kê hôm nay (Today's Real-time Overview)</span>
          </h3>
          <span className="text-[11px] font-semibold text-white/40">
            Từ 00:00 hôm nay
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Today Posts */}
          <div className="card p-4 bg-gradient-to-br from-violet-900/20 to-purple-950/30 border-violet-500/30">
            <p className="text-xs text-violet-300 font-semibold mb-1 flex items-center justify-between">
              <span>Bài đăng mới</span>
              <Images size={14} className="text-violet-400" />
            </p>
            <p className="text-2xl font-black text-white">
              {todayStats.todayPosts?.toLocaleString() ?? 0}
            </p>
            <div className="flex items-center gap-1 mt-2 text-[11px] font-bold">
              {todayStats.postsGrowth >= 0 ? (
                <span className="text-emerald-400 flex items-center gap-0.5">
                  <TrendingUp size={12} />+{todayStats.postsGrowth}%
                </span>
              ) : (
                <span className="text-rose-400 flex items-center gap-0.5">
                  <TrendingDown size={12} />
                  {todayStats.postsGrowth}%
                </span>
              )}
              <span className="text-white/30 font-normal">so hôm qua</span>
            </div>
          </div>

          {/* Today Users */}
          <div className="card p-4 bg-gradient-to-br from-cyan-900/20 to-blue-950/30 border-cyan-500/30">
            <p className="text-xs text-cyan-300 font-semibold mb-1 flex items-center justify-between">
              <span>User mới</span>
              <Users size={14} className="text-cyan-400" />
            </p>
            <p className="text-2xl font-black text-white">
              {todayStats.todayUsers?.toLocaleString() ?? 0}
            </p>
            <div className="flex items-center gap-1 mt-2 text-[11px] font-bold">
              {todayStats.usersGrowth >= 0 ? (
                <span className="text-emerald-400 flex items-center gap-0.5">
                  <TrendingUp size={12} />+{todayStats.usersGrowth}%
                </span>
              ) : (
                <span className="text-rose-400 flex items-center gap-0.5">
                  <TrendingDown size={12} />
                  {todayStats.usersGrowth}%
                </span>
              )}
              <span className="text-white/30 font-normal">so hôm qua</span>
            </div>
          </div>

          {/* Today Approved */}
          <div className="card p-4 bg-gradient-to-br from-emerald-900/20 to-teal-950/30 border-emerald-500/30">
            <p className="text-xs text-emerald-300 font-semibold mb-1 flex items-center justify-between">
              <span>Đã duyệt hôm nay</span>
              <CheckCircle size={14} className="text-emerald-400" />
            </p>
            <p className="text-2xl font-black text-white">
              {todayStats.todayApproved?.toLocaleString() ?? 0}
            </p>
            <p className="text-[11px] text-emerald-400/80 mt-2 font-medium">
              Chờ duyệt: {todayStats.todayPending ?? 0} bài
            </p>
          </div>

          {/* Today Interactions */}
          <div className="card p-4 bg-gradient-to-br from-pink-900/20 to-rose-950/30 border-pink-500/30">
            <p className="text-xs text-pink-300 font-semibold mb-1 flex items-center justify-between">
              <span>Tương tác hôm nay</span>
              <Heart size={14} className="text-pink-400" />
            </p>
            <p className="text-2xl font-black text-white">
              {todayStats.todayInteractions?.toLocaleString() ?? 0}
            </p>
            <p className="text-[11px] text-pink-400/80 mt-2 font-medium">
              Likes, Views & Downloads
            </p>
          </div>

          {/* Today Credits Spent */}
          <div className="card p-4 bg-gradient-to-br from-amber-900/20 to-orange-950/30 border-amber-500/30">
            <p className="text-xs text-amber-300 font-semibold mb-1 flex items-center justify-between">
              <span>AI Credits đã dùng</span>
              <Coins size={14} className="text-amber-400" />
            </p>
            <p className="text-2xl font-black text-white">
              {todayStats.todayTokensSpent?.toLocaleString() ?? 0}
            </p>
            <p className="text-[11px] text-amber-400/80 mt-2 font-medium">
              Tiêu thụ bởi các tính năng AI
            </p>
          </div>
        </div>
      </div>

      {/* Admin Balance Banner */}
      <div className="card p-5 border-violet-500/30 bg-gradient-to-r from-violet-900/20 via-purple-900/10 to-indigo-900/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-violet-400 mb-1 flex items-center gap-1.5">
              <Coins size={16} /> Quỹ Token AI Admin
            </p>
            <p className="text-3xl sm:text-4xl font-black text-white">
              {adminUser?.tokenBalance?.toLocaleString() ?? 0}{' '}
              <span className="text-violet-400 text-xl font-bold">
                AI Credits
              </span>
            </p>
            <p className="text-xs text-white/40 mt-1">
              Số dư dùng cho các thao tác thử nghiệm AI, sinh gợi ý prompt và
              dịch tự động.
            </p>
          </div>
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center shadow-lg shadow-violet-900/40">
            <Coins size={32} className="text-violet-400" />
          </div>
        </div>
      </div>

      {/* Main KPI Stats Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-5 animate-pulse h-28" />
          ))}
        </div>
      ) : (
        stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={Images}
              label="Tổng bài đăng"
              value={stats.totalPosts}
              sub={`+${stats.recentPosts} (7 ngày qua)`}
            />
            <StatCard
              icon={Clock}
              label="Chờ duyệt"
              value={stats.pendingPosts}
              color="text-amber-400"
              sub={
                stats.pendingPosts > 0
                  ? '⚠️ Cần duyệt bài gấp'
                  : '✅ Đã duyệt sạch'
              }
            />
            <StatCard
              icon={Users}
              label="Tổng Thành viên"
              value={stats.totalUsers}
              color="text-cyan-400"
              sub={`+${stats.recentUsers} (7 ngày qua)`}
            />
            <StatCard
              icon={ShieldCheck}
              label="Tỷ lệ duyệt thành công"
              value={`${stats.approvalRate ?? 100}%`}
              color="text-emerald-400"
              sub={`${stats.totalApproved?.toLocaleString() ?? 0} bài đã duyệt`}
            />
          </div>
        )
      )}

      {/* MAIN INTERACTIVE ENTERPRISE CHART CARD */}
      <div className="card p-5 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <BarChart3 size={18} className="text-violet-400" />
              <span>Biểu đồ Phân tích Hoạt động Hệ thống</span>
            </h3>
            <p className="text-xs text-white/40 mt-0.5">
              Theo dõi biến động bài viết, người dùng mới và tương tác qua mốc
              thời gian.
            </p>
          </div>

          {/* Controls: Metric View, Timeframe, Chart Type */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Metric View Switcher */}
            <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
              <button
                onClick={() => setMetricView('posts_users')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  metricView === 'posts_users'
                    ? 'bg-violet-600 text-white shadow-md'
                    : 'text-white/40 hover:text-white'
                }`}
              >
                Bài & Users
              </button>
              <button
                onClick={() => setMetricView('interactions')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  metricView === 'interactions'
                    ? 'bg-pink-600 text-white shadow-md'
                    : 'text-white/40 hover:text-white'
                }`}
              >
                Tương tác
              </button>
              <button
                onClick={() => setMetricView('approved')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  metricView === 'approved'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-white/40 hover:text-white'
                }`}
              >
                Bài duyệt
              </button>
            </div>

            {/* Timeframe selector */}
            <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
              {[
                { label: 'Hôm nay (24h)', val: 1 },
                { label: '7N', val: 7 },
                { label: '14N', val: 14 },
                { label: '30N', val: 30 },
                { label: '90N', val: 90 },
              ].map((t) => (
                <button
                  key={t.val}
                  onClick={() => setDays(t.val)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    days === t.val
                      ? 'bg-brand-600 text-white shadow-md'
                      : 'text-white/40 hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Chart type toggle */}
            <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
              <button
                onClick={() => setChartType('area')}
                title="Biểu đồ vùng curve"
                className={`p-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                  chartType === 'area'
                    ? 'bg-white/20 text-white'
                    : 'text-white/40 hover:text-white'
                }`}
              >
                <Activity size={14} />
              </button>
              <button
                onClick={() => setChartType('bar')}
                title="Biểu đồ thanh"
                className={`p-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                  chartType === 'bar'
                    ? 'bg-white/20 text-white'
                    : 'text-white/40 hover:text-white'
                }`}
              >
                <BarChart3 size={14} />
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="h-64 animate-pulse rounded-2xl bg-white/5 flex items-center justify-center">
            <LoaderCircle size={28} className="animate-spin text-violet-400" />
          </div>
        ) : (
          analytics?.timeline?.length > 0 && (
            <EnterpriseChart
              data={analytics.timeline}
              series={seriesMap[metricView] || seriesMap.posts_users}
              days={days}
              chartType={chartType}
            />
          )
        )}
      </div>

      {/* Distribution & Breakdown Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Category breakdown */}
        <div className="card p-5 space-y-4">
          <h3 className="font-bold text-sm text-white flex items-center justify-between border-b border-white/10 pb-3">
            <span className="flex items-center gap-2">
              <PieChart size={16} className="text-violet-400" />
              <span>Phân bổ Danh mục (Bài đã duyệt)</span>
            </span>
            <span className="text-xs text-white/40 font-normal">Top 5</span>
          </h3>

          {analytics?.categoryStats?.length > 0 ? (
            <div className="space-y-3">
              {analytics.categoryStats.slice(0, 5).map((c) => {
                const total = analytics.categoryStats.reduce(
                  (s, x) => s + x.count,
                  0
                )
                const pct = total > 0 ? Math.round((c.count / total) * 100) : 0
                return (
                  <div key={c._id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/70 font-semibold capitalize">
                        {c._id || 'khac'}
                      </span>
                      <span className="text-white/50 font-mono">
                        {c.count} bài ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full"
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-xs text-white/30 italic">
              Chưa có dữ liệu danh mục
            </p>
          )}
        </div>

        {/* Post Status Breakdown */}
        <div className="card p-5 space-y-4">
          <h3 className="font-bold text-sm text-white flex items-center justify-between border-b border-white/10 pb-3">
            <span className="flex items-center gap-2">
              <Layers size={16} className="text-cyan-400" />
              <span>Trạng thái Bài viết Toàn hệ thống</span>
            </span>
            <span className="text-xs text-white/40 font-normal">Tỉ lệ %</span>
          </h3>

          {stats && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <p className="text-xs text-emerald-400 font-semibold">
                    Đã duyệt
                  </p>
                  <p className="text-xl font-black text-white mt-0.5">
                    {stats.totalApproved?.toLocaleString() ?? 0}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <p className="text-xs text-amber-400 font-semibold">
                    Chờ duyệt
                  </p>
                  <p className="text-xl font-black text-white mt-0.5">
                    {stats.pendingPosts?.toLocaleString() ?? 0}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                  <p className="text-xs text-rose-400 font-semibold">Từ chối</p>
                  <p className="text-xl font-black text-white mt-0.5">
                    {stats.rejectedPosts?.toLocaleString() ?? 0}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-xs text-white/50 font-semibold">Đã ẩn</p>
                  <p className="text-xl font-black text-white mt-0.5">
                    {stats.hiddenPosts?.toLocaleString() ?? 0}
                  </p>
                </div>
              </div>

              {/* Status Visual Progress Bar */}
              {(() => {
                const total =
                  (stats.totalApproved || 0) +
                  (stats.pendingPosts || 0) +
                  (stats.rejectedPosts || 0) +
                  (stats.hiddenPosts || 0)
                if (total === 0) return null
                const appPct = Math.round(
                  ((stats.totalApproved || 0) / total) * 100
                )
                const penPct = Math.round(
                  ((stats.pendingPosts || 0) / total) * 100
                )
                const rejPct = Math.round(
                  ((stats.rejectedPosts || 0) / total) * 100
                )
                return (
                  <div className="space-y-1.5">
                    <div className="flex h-3 w-full rounded-full overflow-hidden bg-white/10">
                      <div
                        style={{ width: `${appPct}%` }}
                        className="bg-emerald-500"
                        title="Đã duyệt"
                      />
                      <div
                        style={{ width: `${penPct}%` }}
                        className="bg-amber-500"
                        title="Chờ duyệt"
                      />
                      <div
                        style={{ width: `${rejPct}%` }}
                        className="bg-rose-500"
                        title="Từ chối"
                      />
                    </div>
                  </div>
                )
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Pending Warning Banner */}
      {stats?.pendingPosts > 0 && (
        <div className="card p-4 border-amber-500/30 bg-gradient-to-r from-amber-950/40 via-yellow-950/20 to-black/40">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertTriangle
                size={22}
                className="text-amber-400 flex-shrink-0 animate-pulse"
              />
              <div>
                <p className="text-sm font-bold text-amber-300">
                  Có {stats.pendingPosts} bài đăng đang chờ phê duyệt
                </p>
                <p className="text-xs text-white/50 mt-0.5">
                  Phê duyệt kịp thời để giúp creator công khai tác phẩm trên
                  trang chủ.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                const url = new URL(window.location.href)
                url.searchParams.set('tab', 'posts')
                window.history.pushState({}, '', url)
                window.dispatchEvent(new Event('popstate'))
              }}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl text-xs transition-all cursor-pointer shadow-lg shadow-amber-500/20 whitespace-nowrap"
            >
              Vào duyệt bài ngay →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const previewSlideVariants = {
  enter: (d) => ({ opacity: 0, x: d > 0 ? 30 : -30 }),
  center: { opacity: 1, x: 0 },
  exit: (d) => ({ opacity: 0, x: d > 0 ? -30 : 30 }),
}

const REQUIRED_CSV_FIELDS = [
  'post_id',
  'url',
  'title',
  'ai_model',
  'author_name',
  'author_url',
  'author_avatar_url',
  'original_post_url',
  'image_urls',
  'image_paths',
  'prompt',
  'published_date',
  'original_language',
  'category',
  'source_category',
  'likes_count',
  'views_count',
  'shares_count',
  'comments_count',
  'saved_count',
  'cited_from',
  'created_at',
]

const FIELD_EXAMPLES = [
  {
    field: 'post_id',
    type: 'string',
    example: '6a63b4fbd0b7f5d4d0f90288',
    note: 'ID duy nhất của bài đăng',
  },
  {
    field: 'url',
    type: 'string (URL)',
    example: 'https://youmind.com/vi-VN/prompts/christmas-wreath-2879',
    note: 'Link trang YouMind gốc',
  },
  {
    field: 'title',
    type: 'string',
    example: 'Christmas wreath generation',
    note: 'Tiêu đề bài viết',
  },
  {
    field: 'ai_model',
    type: 'string',
    example: 'Midjourney v6',
    note: 'Tên mô hình AI',
  },
  {
    field: 'author_name',
    type: 'string',
    example: 'ArtCreator99',
    note: 'Tên tác giả bài viết',
  },
  {
    field: 'author_url',
    type: 'string (URL)',
    example: 'https://x.com/artcreator',
    note: 'Link profile cá nhân tác giả',
  },
  {
    field: 'author_avatar_url',
    type: 'string (URL)',
    example: 'https://images.youmind.com/avatar.jpg',
    note: 'Ảnh đại diện tác giả',
  },
  {
    field: 'original_post_url',
    type: 'string (URL)',
    example: 'https://x.com/status/18790023',
    note: 'Link bài đăng gốc trực tiếp',
  },
  {
    field: 'image_urls',
    type: 'array / string (URLs)',
    example: '["https://img1.jpg", "https://img2.jpg"] hoặc url1, url2',
    note: 'Mảng/Danh sách URL ảnh online',
  },
  {
    field: 'image_paths',
    type: 'array / string (Paths)',
    example: 'raw-photo-0.jpg, raw-photo-1.jpg hoặc ["raw-0.jpg"]',
    note: 'Mảng/Danh sách tên file ảnh local',
  },
  {
    field: 'prompt',
    type: 'string',
    example: 'Christmas wreath decorated with gold ribbons, 8k',
    note: 'Câu lệnh Prompt AI',
  },
  {
    field: 'published_date',
    type: 'ISO Date / string',
    example: '2025-12-19T17:08:16.000Z',
    note: 'Ngày xuất bản prompt gốc',
  },
  {
    field: 'original_language',
    type: 'string',
    example: 'vi-VN (hoặc en-US)',
    note: 'Ngôn ngữ bài viết gốc',
  },
  {
    field: 'category',
    type: 'string',
    example: 'AI Art',
    note: 'Danh mục PicSpy',
  },
  {
    field: 'source_category',
    type: 'string',
    example: 'Prompt Generator',
    note: 'Danh mục nguồn gốc',
  },
  {
    field: 'likes_count',
    type: 'number',
    example: '120',
    note: 'Số lượt thích',
  },
  {
    field: 'views_count',
    type: 'number',
    example: '1540',
    note: 'Số lượt xem',
  },
  {
    field: 'shares_count',
    type: 'number',
    example: '35',
    note: 'Số lượt chia sẻ',
  },
  {
    field: 'comments_count',
    type: 'number',
    example: '12',
    note: 'Số lượt bình luận',
  },
  {
    field: 'saved_count',
    type: 'number',
    example: '45',
    note: 'Số lượt đã lưu',
  },
  {
    field: 'cited_from',
    type: 'string',
    example: 'YouMind',
    note: 'Trích dẫn nguồn',
  },
  {
    field: 'created_at',
    type: 'ISO Date / string',
    example: '2026-07-25T02:21:13.000Z',
    note: 'Ngày xuất bản / cập nhật',
  },
]

const CsvImportModal = ({ isOpen, onClose, onSuccess, setPreviewModal }) => {
  const [modalTab, setModalTab] = useState('import')
  const [selectedFile, setSelectedFile] = useState(null)
  const [useDefaultFile, setUseDefaultFile] = useState(true)
  const [localImagePath, setLocalImagePath] = useState('plant/datas/images')
  const [validation, setValidation] = useState(null)
  const [importing, setImporting] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  const [historyLogs, setHistoryLogs] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [defaultServerFile, setDefaultServerFile] = useState(null)
  const [lastImportedFileName, setLastImportedFileName] = useState('')
  const [historySearch, setHistorySearch] = useState('')
  const [copiedId, setCopiedId] = useState(null)
  const [showSchemaTable, setShowSchemaTable] = useState(true)
  const [importProgress, setImportProgress] = useState(null)
  const [reclassifying, setReclassifying] = useState(false)

  // Smart Interactive Reclassification state
  const [reclassifyTab, setReclassifyTab] = useState('reclassify')
  const [reclassifyFilter, setReclassifyFilter] = useState('different')
  const [reclassifyScope, setReclassifyScope] = useState('all')
  const [isExpandedView, setIsExpandedView] = useState(false)
  const [reclassifyLoading, setReclassifyLoading] = useState(false)
  const [reclassifyProgress, setReclassifyProgress] = useState(null)
  const [reclassifyAnalysisData, setReclassifyAnalysisData] = useState(null)
  const [selectedCategoryChoices, setSelectedCategoryChoices] = useState({})

  // Option A: Multi-Select & Fast Approve state
  const [selectedPostIds, setSelectedPostIds] = useState([])
  const [batchTargetCategory, setBatchTargetCategory] = useState('')

  const handleFastApproveHighConfidence = async () => {
    if (!reclassifyAnalysisData?.reclassifyList?.length) return
    const highConfidenceItems = reclassifyAnalysisData.reclassifyList.filter(
      (item) =>
        (item.confidence || 0) >= 80 &&
        (item.isDifferent ||
          (selectedCategoryChoices[item.postId] &&
            selectedCategoryChoices[item.postId] !== item.currentCategory))
    )

    if (highConfidenceItems.length === 0) {
      toast.info(
        'Tất cả bài viết độ tin cậy AI >= 80% đều đã ở đúng danh mục. Không có bài nào cần cập nhật.'
      )
      return
    }

    const items = highConfidenceItems.map((item) => ({
      postId: item.postId,
      targetCategory:
        selectedCategoryChoices[item.postId] || item.suggestedCategory,
    }))

    try {
      const { data } = await api.post(
        '/admin/posts/batch-apply-reclassifications',
        { items }
      )
      toast.success(
        data.message ||
          `⚡ 1-Click duyệt thành công ${items.length} bài viết cần thay đổi danh mục!`
      )
      setReclassifyAnalysisData((prev) => ({
        ...prev,
        reclassifyList: prev.reclassifyList.map((item) => {
          if (highConfidenceItems.some((h) => h.postId === item.postId)) {
            const updatedChoice =
              selectedCategoryChoices[item.postId] || item.suggestedCategory
            return {
              ...item,
              currentCategory: updatedChoice,
              suggestedCategory: updatedChoice,
              suggestedCategoryName: updatedChoice.toUpperCase(),
              isDifferent: false,
            }
          }
          return item
        }),
      }))
      setSelectedPostIds([])
      onSuccess?.()
    } catch {
      toast.error('Lỗi khi duyệt nhanh bài viết độ tin cậy cao')
    }
  }

  const handleToggleSelectPost = (postId) => {
    setSelectedPostIds((prev) =>
      prev.includes(postId)
        ? prev.filter((id) => id !== postId)
        : [...prev, postId]
    )
  }

  const handleSelectAllPosts = () => {
    if (!reclassifyAnalysisData?.reclassifyList?.length) return
    if (
      selectedPostIds.length === reclassifyAnalysisData.reclassifyList.length
    ) {
      setSelectedPostIds([])
    } else {
      setSelectedPostIds(
        reclassifyAnalysisData.reclassifyList.map((i) => i.postId)
      )
    }
  }

  const handleApplySelectedBatchCategory = async () => {
    if (selectedPostIds.length === 0 || !batchTargetCategory) {
      toast.error('Vui lòng chọn bài viết và chọn danh mục cần áp dụng!')
      return
    }

    const items = selectedPostIds.map((id) => ({
      postId: id,
      targetCategory: batchTargetCategory,
    }))

    try {
      const { data } = await api.post(
        '/admin/posts/batch-apply-reclassifications',
        { items }
      )
      toast.success(
        data.message ||
          `Đã cập nhật danh mục cho ${items.length} bài viết được chọn!`
      )
      setReclassifyAnalysisData((prev) => ({
        ...prev,
        reclassifyList: prev.reclassifyList.filter(
          (item) => !selectedPostIds.includes(item.postId)
        ),
      }))
      setSelectedPostIds([])
      onSuccess?.()
    } catch {
      toast.error('Lỗi khi gán danh mục cho bài đã chọn')
    }
  }

  const runSmartReclassifyAnalysis = async (overrideScope) => {
    const targetScope = overrideScope || reclassifyScope
    setReclassifyLoading(true)
    setReclassifyProgress({ current: 0, total: 0, percentage: 0 })
    try {
      const { data } = await api.post('/admin/posts/analyze-reclassify-csv', {
        scope: targetScope,
      })
      if (data.success) {
        setReclassifyAnalysisData(data)
        const initialChoices = {}
        data.newCategoryProposals?.forEach((item) => {
          initialChoices[item.postId] = item.requestedCategory
        })
        data.reclassifyList?.forEach((item) => {
          initialChoices[item.postId] = item.suggestedCategory
        })
        setSelectedCategoryChoices(initialChoices)
      }
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          'Không thể phân tích dữ liệu bài viết CSV'
      )
    } finally {
      setReclassifyLoading(false)
      setReclassifyProgress(null)
    }
  }

  const handleSingleReclassify = async (postId, targetCategory) => {
    try {
      await api.post('/admin/posts/batch-apply-reclassifications', {
        items: [{ postId, targetCategory }],
      })
      toast.success('Đã cập nhật danh mục bài viết thành công!')
      setReclassifyAnalysisData((prev) => ({
        ...prev,
        reclassifyList: prev.reclassifyList.filter(
          (item) => item.postId !== postId
        ),
      }))
      onSuccess?.()
    } catch {
      toast.error('Lỗi khi cập nhật danh mục bài viết')
    }
  }

  const handleApproveAllReclassifications = async () => {
    if (!reclassifyAnalysisData?.reclassifyList?.length) return
    const itemsToUpdate = reclassifyAnalysisData.reclassifyList.filter(
      (item) =>
        item.isDifferent ||
        (selectedCategoryChoices[item.postId] &&
          selectedCategoryChoices[item.postId] !== item.currentCategory)
    )

    if (itemsToUpdate.length === 0) {
      toast.info(
        'Tất cả bài viết đều đã ở đúng danh mục phù hợp. Không có bài nào cần cập nhật.'
      )
      return
    }

    const items = itemsToUpdate.map((item) => ({
      postId: item.postId,
      targetCategory:
        selectedCategoryChoices[item.postId] || item.suggestedCategory,
    }))

    try {
      const { data } = await api.post(
        '/admin/posts/batch-apply-reclassifications',
        { items }
      )
      toast.success(
        data.message ||
          `Đã cập nhật danh mục cho ${items.length} bài viết cần thay đổi thành công!`
      )
      setReclassifyAnalysisData((prev) => ({
        ...prev,
        reclassifyList: prev.reclassifyList.map((item) => {
          const updatedChoice =
            selectedCategoryChoices[item.postId] || item.suggestedCategory
          if (itemsToUpdate.some((u) => u.postId === item.postId)) {
            return {
              ...item,
              currentCategory: updatedChoice,
              suggestedCategory: updatedChoice,
              suggestedCategoryName: updatedChoice.toUpperCase(),
              isDifferent: false,
            }
          }
          return item
        }),
      }))
      onSuccess?.()
    } catch {
      toast.error('Lỗi khi cập nhật danh mục hàng loạt')
    }
  }

  const handleSingleCategoryProposal = async (
    postId,
    action,
    chosenCategoryName
  ) => {
    try {
      const { data } = await api.post(
        '/admin/posts/batch-apply-category-proposals',
        {
          decisions: [{ postId, action, chosenCategoryName }],
        }
      )
      toast.success(data.message || 'Đã xử lý đề xuất danh mục!')
      setReclassifyAnalysisData((prev) => ({
        ...prev,
        newCategoryProposals: prev.newCategoryProposals.filter(
          (item) => item.postId !== postId
        ),
      }))
      onSuccess?.()
    } catch {
      toast.error('Lỗi khi xử lý đề xuất danh mục')
    }
  }

  const handleApproveAllNewCategoryProposals = async () => {
    if (!reclassifyAnalysisData?.newCategoryProposals?.length) return
    const decisions = reclassifyAnalysisData.newCategoryProposals.map(
      (item) => ({
        postId: item.postId,
        action: 'approve',
        chosenCategoryName:
          selectedCategoryChoices[item.postId] || item.requestedCategory,
      })
    )
    try {
      const { data } = await api.post(
        '/admin/posts/batch-apply-category-proposals',
        { decisions }
      )
      toast.success(
        data.message || `Đã phê duyệt ${decisions.length} danh mục mới!`
      )
      setReclassifyAnalysisData((prev) => ({
        ...prev,
        newCategoryProposals: [],
      }))
      onSuccess?.()
    } catch {
      toast.error('Lỗi khi phê duyệt danh mục hàng loạt')
    }
  }

  useEffect(() => {
    if (!isOpen) return
    const socket = useNotificationStore.getState().socket
    if (!socket) return

    const handleReclassifyProgress = (data) => {
      setReclassifyProgress(data)
    }

    socket.on('reclassify_analysis_progress', handleReclassifyProgress)
    return () => {
      socket.off('reclassify_analysis_progress', handleReclassifyProgress)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      setAnalysisResult(null)
      setShowConfirmModal(false)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const socket = useNotificationStore.getState().socket
    if (!socket) return

    const handleProgress = (data) => {
      setImportProgress((prev) => {
        const startTime = prev?.startTime || Date.now()
        const elapsedSec = Math.max(0.1, (Date.now() - startTime) / 1000)
        const rate = data.current > 0 ? data.current / elapsedSec : 0
        const remaining = Math.max(0, data.total - data.current)
        const etaSeconds = rate > 0 ? Math.ceil(remaining / rate) : 0

        return {
          ...data,
          startTime,
          etaSeconds,
        }
      })
    }

    socket.on('csv_import_progress', handleProgress)
    return () => {
      socket.off('csv_import_progress', handleProgress)
    }
  }, [isOpen])

  const [serverCsvFiles, setServerCsvFiles] = useState([])
  const [selectedServerFileName, setSelectedServerFileName] = useState('')

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const { data } = await api.get('/admin/posts/import-history')
      setHistoryLogs(data.logs || [])
      if (data.defaultServerFile) setDefaultServerFile(data.defaultServerFile)
      if (data.serverCsvFiles?.length) {
        setServerCsvFiles(data.serverCsvFiles)
        if (!selectedServerFileName) {
          setSelectedServerFileName(data.serverCsvFiles[0]?.fileName || '')
        }
      }
      if (data.lastImportedFileName)
        setLastImportedFileName(data.lastImportedFileName)
    } catch {
      toast.error('Không thể tải lịch sử import CSV')
    } finally {
      setHistoryLoading(false)
    }
  }, [selectedServerFileName])

  const [undoingBatchId, setUndoingBatchId] = useState(null)

  // Exit Protection during active import process
  useEffect(() => {
    if (!importing) return
    const handleBeforeUnload = (e) => {
      e.preventDefault()
      e.returnValue =
        '⚠️ Đang tiến hành Import CSV! Nếu thoát lúc này dữ liệu sẽ bị đứt đoạn.'
      return e.returnValue
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [importing])

  const handleUndoBatch = async (batchImportId) => {
    if (!batchImportId) return
    if (
      !window.confirm(
        `Bạn có chắc chắn muốn hoàn tác đợt import này (${batchImportId})?\n\nTất cả bài viết được tạo ra từ đợt này sẽ bị xóa an toàn khỏi database.`
      )
    ) {
      return
    }

    setUndoingBatchId(batchImportId)
    try {
      const { data } = await api.post('/admin/posts/undo-import', {
        batchImportId,
      })
      toast.success(data.message || 'Đã hoàn tác đợt import thành công!')
      fetchHistory()
      if (onSuccess) onSuccess()
    } catch (err) {
      toast.error(
        err?.response?.data?.message || 'Không thể hoàn tác đợt import này'
      )
    } finally {
      setUndoingBatchId(null)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchHistory()
    }
  }, [isOpen, fetchHistory])

  const validateClientCsv = (text) => {
    if (!text) {
      setValidation(null)
      return
    }
    const cleanText = text.replace(/^\uFEFF/, '')
    const lines = cleanText.split(/\r?\n/).filter(Boolean)
    if (lines.length === 0) {
      setValidation({
        valid: false,
        missing: REQUIRED_CSV_FIELDS,
        totalRows: 0,
      })
      return
    }
    const headerLine = lines[0].toLowerCase()
    const headers = headerLine.split(',').map((h) =>
      h
        .replace(/^["']|["']$/g, '')
        .trim()
        .replace(/^\uFEFF/, '')
    )
    const missing = REQUIRED_CSV_FIELDS.filter(
      (f) => !headers.includes(f.toLowerCase())
    )

    console.log('🔍 [FRONTEND CSV VALIDATE]', {
      headersCount: headers.length,
      missing,
      totalRows: lines.length - 1,
    })

    setValidation({
      valid: missing.length === 0,
      missing,
      totalRows: lines.length - 1,
      headers,
    })
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSelectedFile(file)
    setUseDefaultFile(false)
    setAnalysisResult(null)

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target.result || ''
      validateClientCsv(content)
    }
    reader.readAsText(file, 'UTF-8')
  }

  // Fast Dry-Run Check when clicking Import
  const handleCheckAndImport = async () => {
    if (!useDefaultFile && validation && !validation.valid) {
      toast.error('Tập tin CSV không hợp lệ hoặc thiếu cột bắt buộc!')
      return
    }

    setAnalyzing(true)
    setAnalysisResult(null)

    try {
      const formData = new FormData()
      formData.append('localImagesBasePath', localImagePath)

      if (!useDefaultFile && selectedFile) {
        formData.append('file', selectedFile)
        formData.append('fileName', selectedFile.name)
      } else {
        const serverFileToUse =
          selectedServerFileName || defaultServerFile?.fileName || '123.csv'
        formData.append('fileName', serverFileToUse)
        formData.append('selectedServerFileName', serverFileToUse)
      }

      const { data } = await api.post('/admin/posts/analyze-csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      if (data?.success && data?.analysis) {
        setAnalysisResult(data.analysis)
        setShowConfirmModal(true)
      }
    } catch (err) {
      console.error('❌ CSV Analysis Error:', err)
      toast.error(
        err.response?.data?.message || 'Không thể phân tích tập tin CSV'
      )
    } finally {
      setAnalyzing(false)
    }
  }

  // Actual Import Execution
  const executeActualImport = async () => {
    setShowConfirmModal(false)
    setImporting(true)
    const initialTotal =
      analysisResult?.totalRows || validation?.totalRows || 40
    setImportProgress({
      current: 0,
      total: initialTotal,
      percentage: 0,
      importedCount: 0,
      skippedCount: 0,
      createdUsersCount: 0,
      startTime: Date.now(),
      etaSeconds: Math.ceil(initialTotal * 0.15),
    })

    try {
      const formData = new FormData()
      formData.append('localImagesBasePath', localImagePath)

      if (!useDefaultFile && selectedFile) {
        formData.append('file', selectedFile)
        formData.append('fileName', selectedFile.name)
      } else {
        const serverFileToUse =
          selectedServerFileName || defaultServerFile?.fileName || '123.csv'
        formData.append('fileName', serverFileToUse)
        formData.append('selectedServerFileName', serverFileToUse)
      }

      const { data } = await api.post('/admin/posts/import-csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300000, // 5 phút timeout cho các tập tin CSV lớn hàng nghìn dòng
      })

      setImportProgress({
        current: data.data?.totalRows || initialTotal,
        total: data.data?.totalRows || initialTotal,
        percentage: 100,
        importedCount: data.data?.importedCount || 0,
        skippedCount: data.data?.skippedCount || 0,
        createdUsersCount: data.data?.createdUsersCount || 0,
        startTime: Date.now(),
        etaSeconds: 0,
      })

      toast.success(
        `🎉 ${data.message}\n` +
          `✅ Bài mới: ${data.data?.importedCount || 0} | ⏭️ Trùng: ${data.data?.skippedCount || 0} | 👤 User mới: ${data.data?.createdUsersCount || 0}`,
        { duration: 6000 }
      )
      setTimeout(() => {
        onSuccess?.()
        onClose()
        setImportProgress(null)
      }, 1200)
    } catch (err) {
      console.error('❌ CSV Import Failed:', err)
      const isTimeout =
        err.code === 'ECONNABORTED' || err.message?.includes('timeout')
      const errMsg = isTimeout
        ? '⏱️ Tập tin CSV lớn cần thêm thời gian. Hệ thống vẫn đang tiến hành nạp dữ liệu ở nền, hãy kiểm tra Lịch Sử Import sau ít phút.'
        : err.response?.data?.message ||
          'Lỗi khi import file CSV. Vui lòng thử lại.'

      toast.error(errMsg, { duration: 6000 })
      setImportProgress(null)
    } finally {
      setImporting(false)
    }
  }

  const copyPathToClipboard = (pathStr, logId) => {
    if (!pathStr) return
    navigator.clipboard.writeText(pathStr)
    setCopiedId(logId)
    toast.success('📋 Đã chép đường dẫn local!')
    setTimeout(() => setCopiedId(null), 2000)
  }

  // Metric summaries
  const totalBatches = historyLogs.length
  const totalImported = historyLogs.reduce(
    (acc, l) => acc + (l.details?.importedCount || 0),
    0
  )
  const totalUsersCreated = historyLogs.reduce(
    (acc, l) => acc + (l.details?.createdUsersCount || 0),
    0
  )
  const totalSkipped = historyLogs.reduce(
    (acc, l) => acc + (l.details?.skippedCount || 0),
    0
  )

  const filteredLogs = historyLogs.filter((log) => {
    if (!historySearch.trim()) return true
    const q = historySearch.toLowerCase()
    const fileName = (log.details?.fileName || '').toLowerCase()
    const adminUser = (
      log.admin?.username ||
      log.details?.by ||
      ''
    ).toLowerCase()
    return fileName.includes(q) || adminUser.includes(q)
  })

  useEffect(() => {
    if (!importing) return
    const handleBeforeUnload = (e) => {
      e.preventDefault()
      e.returnValue =
        'Quá trình import CSV đang diễn ra. Bạn có chắc chắn muốn thoát?'
      return e.returnValue
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [importing])

  const handleRequestClose = () => {
    if (importing) {
      const confirmed = window.confirm(
        '⚠️ Quá trình Import CSV đang diễn ra!\n\nNếu bạn thoát lúc này, các bài đăng chưa xử lý xong sẽ không được import tiếp. Bạn có chắc chắn muốn hủy / thoát không?'
      )
      if (!confirmed) return
    }
    onClose()
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md !mt-0"
        onClick={(e) => e.target === e.currentTarget && handleRequestClose()}
      >
        <motion.div
          initial={{ scale: 0.96, y: 15 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.96 }}
          className={`card ${
            isExpandedView
              ? 'max-w-[98vw] w-full h-[98vh] max-h-none'
              : 'max-w-5xl w-full h-[92vh] max-h-[920px]'
          } p-6 bg-[#0c0c11] border border-white/12 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] rounded-2xl flex flex-col overflow-hidden relative transition-all duration-300`}
        >
          {/* Real-time Import Progress Overlay */}
          {importing && (
            <div className="absolute inset-0 z-50 bg-[#0c0c11]/95 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-8 text-center space-y-6 animate-in fade-in duration-200">
              <div className="relative w-20 h-20 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-violet-500/20 animate-ping" />
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-violet-900/50">
                  <Sparkles size={32} className="animate-spin duration-1000" />
                </div>
              </div>

              <div className="space-y-1.5 max-w-md w-full">
                <h4 className="text-lg font-bold text-white font-display">
                  Đang Xử Lý Import Bài Đăng AI...
                </h4>
                <p className="text-xs text-white/50">
                  Đang trích xuất prompt, chuẩn hóa tác giả AI &amp; lưu dữ liệu
                  bài viết
                </p>
              </div>

              {/* Progress Bar Container */}
              <div className="w-full max-w-md space-y-3 bg-white/[0.02] border border-white/10 p-5 rounded-2xl shadow-2xl">
                <div className="flex items-center justify-between text-xs font-bold font-mono">
                  <span className="text-violet-300">
                    {importProgress
                      ? `${importProgress.current} / ${importProgress.total} bài đăng`
                      : 'Đang khởi tạo...'}
                  </span>
                  <span className="text-emerald-400 font-display font-extrabold text-sm">
                    {importProgress ? `${importProgress.percentage}%` : '0%'}
                  </span>
                </div>

                <div className="w-full h-3.5 bg-black/60 rounded-full overflow-hidden p-0.5 border border-white/10 relative">
                  <motion.div
                    className="h-full bg-gradient-to-r from-violet-600 via-indigo-500 to-emerald-400 rounded-full shadow-lg shadow-violet-500/50"
                    initial={{ width: '0%' }}
                    animate={{ width: `${importProgress?.percentage || 0}%` }}
                    transition={{ duration: 0.2 }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-white/50 pt-1">
                  <span className="flex items-center gap-1 text-amber-300/90 font-medium">
                    <Clock size={12} />
                    {importProgress?.etaSeconds > 0
                      ? `Dự kiến còn: ~${importProgress.etaSeconds}s`
                      : 'Đang hoàn tất...'}
                  </span>
                  <span className="font-mono text-violet-300 font-bold">
                    +{importProgress?.importedCount || 0} bài mới | +
                    {importProgress?.createdUsersCount || 0} user mới
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Pre-Analysis Dry-Run Confirmation / Blocked Dialog Overlay */}
          <AnimatePresence>
            {showConfirmModal && analysisResult && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 z-50 bg-[#09090d]/90 backdrop-blur-xl rounded-2xl flex flex-col items-center justify-center p-6 text-center"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.92, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: 15 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                  className="max-w-lg w-full bg-[#12121a] border border-white/15 p-6 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.9)] space-y-5 text-left relative overflow-hidden"
                >
                  <div
                    className={`absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-30 ${
                      analysisResult.alreadyImported
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                  />

                  {analysisResult.alreadyImported ? (
                    /* CASE 1: File cũ / Dữ liệu đã import trước đó (0 bài mới -> Blocked!) */
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0 shadow-lg shadow-amber-950/40">
                          <ShieldAlert size={26} />
                        </div>
                        <div>
                          <h4 className="text-base font-bold text-white font-display">
                            Tập Tin CSV Này Đã Được Nạp Hoàn Tất!
                          </h4>
                          <p className="text-xs text-amber-300/80 font-medium">
                            0 bài viết mới | Đã có sẵn trên hệ thống
                          </p>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/30 space-y-1 text-xs text-amber-100/90 font-sans">
                        <p className="font-semibold text-amber-200">
                          Tất cả{' '}
                          <strong className="text-amber-300 font-bold">
                            {analysisResult.totalRows} bài đăng
                          </strong>{' '}
                          trong tập tin CSV này đều đã tồn tại trên cơ sở dữ
                          liệu.
                        </p>
                        <p className="text-white/60 text-[11px]">
                          Vui lòng chọn tập tin CSV khác chứa dữ liệu mới để
                          tiếp tục.
                        </p>
                      </div>

                      {/* Quick Metrics Badges */}
                      <div className="grid grid-cols-3 gap-2 font-sans text-xs">
                        <div className="py-2 px-2.5 bg-black/40 rounded-xl border border-rose-500/20 text-rose-300 flex flex-col items-center justify-center">
                          <span className="text-[10px] text-white/40 font-medium">
                            Bài mới
                          </span>
                          <strong className="text-sm font-bold text-rose-400 font-mono">
                            0
                          </strong>
                        </div>
                        <div className="py-2 px-2.5 bg-black/40 rounded-xl border border-amber-500/20 text-amber-300 flex flex-col items-center justify-center">
                          <span className="text-[10px] text-white/40 font-medium">
                            Bài đã có
                          </span>
                          <strong className="text-sm font-bold text-amber-300 font-mono">
                            {analysisResult.existingPostsCount}
                          </strong>
                        </div>
                        <div className="py-2 px-2.5 bg-black/40 rounded-xl border border-violet-500/20 text-violet-300 flex flex-col items-center justify-center">
                          <span className="text-[10px] text-white/40 font-medium">
                            Tác giả AI
                          </span>
                          <strong className="text-sm font-bold text-violet-300 font-mono">
                            {analysisResult.existingUsersCount}
                          </strong>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                        <button
                          type="button"
                          onClick={() => setShowConfirmModal(false)}
                          className="px-6 py-2.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
                        >
                          Đóng
                        </button>
                        <label className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-900/40 cursor-pointer transition-all flex items-center gap-1.5">
                          <Image size={14} />
                          <span>Chọn Tập Tin CSV Khác</span>
                          <input
                            type="file"
                            accept=".csv"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  ) : (
                    /* CASE 2: File có bài mới -> Cho phép xác nhận Import */
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0 shadow-lg shadow-emerald-950/40">
                          <Sparkles size={26} />
                        </div>
                        <div>
                          <h4 className="text-base font-bold text-white font-display">
                            Xác Nhận Nạp +{analysisResult.newPostsCount} Bài
                            Viết Mới
                          </h4>
                          <p className="text-xs text-emerald-300/90 font-bold flex items-center gap-1 mt-0.5">
                            📄 Tập tin:{' '}
                            <span className="font-mono text-white bg-black/50 px-2 py-0.5 rounded border border-white/10">
                              {analysisResult.fileName ||
                                selectedServerFileName ||
                                '123.csv'}
                            </span>
                          </p>
                          <p className="text-[11px] text-emerald-400/90 font-medium flex items-center gap-1.5 mt-1">
                            <Clock
                              size={12}
                              className="text-emerald-400 flex-shrink-0"
                            />
                            <span>
                              Thời gian nạp dự kiến:{' '}
                              <strong className="font-mono text-emerald-300 font-bold">
                                ~
                                {Math.max(
                                  2,
                                  Math.ceil(
                                    (analysisResult.newPostsCount || 0) / 20
                                  )
                                )}{' '}
                                giây
                              </strong>
                            </span>
                          </p>
                        </div>
                      </div>

                      <p className="text-xs text-white/80 font-sans bg-white/[0.03] p-2.5 rounded-xl border border-white/10 flex items-center justify-between">
                        <span>
                          Hệ thống đã phân tích{' '}
                          <strong className="text-emerald-300 font-mono font-bold">
                            {analysisResult.totalRows} bài viết
                          </strong>{' '}
                          từ file CSV
                        </span>
                        <span className="font-mono text-[11px] text-violet-300 bg-violet-950/60 px-2 py-0.5 rounded font-bold border border-violet-500/30">
                          {analysisResult.fileName || selectedServerFileName}
                        </span>
                      </p>

                      {/* Stat Cards Grid */}
                      <div className="grid grid-cols-2 gap-2.5 text-left font-mono">
                        <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-xl space-y-0.5">
                          <span className="text-[9px] text-emerald-400/80 font-sans font-bold uppercase tracking-wider block">
                            Bài Đăng Tạo Mới
                          </span>
                          <span className="text-xl font-extrabold text-emerald-400 font-display">
                            +{analysisResult.newPostsCount}
                          </span>
                        </div>

                        <div className="p-3 bg-indigo-950/30 border border-indigo-500/30 rounded-xl space-y-0.5">
                          <span className="text-[9px] text-indigo-300/80 font-sans font-bold uppercase tracking-wider block">
                            Tác Giả AI Mới
                          </span>
                          <span className="text-xl font-extrabold text-indigo-300 font-display">
                            +{analysisResult.newUsersCount}
                          </span>
                        </div>

                        <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-xl space-y-0.5">
                          <span className="text-[9px] text-amber-300/80 font-sans font-bold uppercase tracking-wider block">
                            Bài Trùng Bỏ Qua
                          </span>
                          <span className="text-lg font-bold text-amber-300 font-display">
                            {analysisResult.existingPostsCount}
                          </span>
                        </div>

                        <div className="p-3 bg-white/[0.03] border border-white/10 rounded-xl space-y-0.5">
                          <span className="text-[9px] text-white/40 font-sans font-bold uppercase tracking-wider block">
                            Tác Giả Đã Có Sẵn
                          </span>
                          <span className="text-lg font-bold text-white/80 font-display">
                            {analysisResult.existingUsersCount}
                          </span>
                        </div>
                      </div>

                      {/* Sample New Posts Audit Box */}
                      {analysisResult.sampleNewPosts?.length > 0 && (
                        <div className="p-3 bg-black/40 border border-white/10 rounded-xl space-y-2 text-[11px]">
                          <div className="flex items-center justify-between text-white/60 font-bold text-[10px] uppercase">
                            <span>
                              🔍 Mẫu 3 bài viết mới (Chưa có trong DB{' '}
                              {analysisResult.dbTotalPosts || 857} bài hiện
                              tại):
                            </span>
                          </div>
                          <div className="space-y-1.5 font-mono text-[10px]">
                            {analysisResult.sampleNewPosts
                              .slice(0, 3)
                              .map((item, idx) => (
                                <div
                                  key={idx}
                                  className="p-2 bg-white/[0.02] border border-white/5 rounded-lg flex items-center justify-between gap-2"
                                >
                                  <div className="truncate flex-1">
                                    <span className="text-emerald-300 font-bold block truncate">
                                      {item.title}
                                    </span>
                                    <span className="text-white/40 text-[9px] block truncate">
                                      ID: {item.post_id}
                                    </span>
                                  </div>
                                  <span className="px-2 py-0.5 bg-violet-950/60 text-violet-300 border border-violet-500/30 rounded text-[9px] font-bold flex-shrink-0">
                                    {item.category}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                        <button
                          type="button"
                          onClick={() => setShowConfirmModal(false)}
                          className="px-6 py-2.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
                        >
                          Hủy / Chọn Lại
                        </button>
                        <button
                          type="button"
                          onClick={executeActualImport}
                          className="px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 text-white border border-emerald-400/40 shadow-lg shadow-emerald-950/50 hover:shadow-emerald-950/70 transition-all flex items-center gap-2 cursor-pointer"
                        >
                          <Sparkles size={16} />
                          <span>
                            Tiến Hành Import Ngay (+
                            {analysisResult.newPostsCount} Bài)
                          </span>
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600/30 to-indigo-600/30 border border-violet-500/40 flex items-center justify-center text-violet-300 shadow-md shadow-violet-900/20">
                <Sparkles size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2 font-display">
                  Import Bài Đăng AI từ Tập Tin CSV
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-600/30 text-violet-300 border border-violet-500/30 font-mono font-bold">
                    PRO CSV v2
                  </span>
                </h3>
                <p className="text-xs text-white/50">
                  Tải nạp dữ liệu từ files, kiểm tra 22 trường bắt buộc & theo
                  dõi lịch sử hệ thống
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsExpandedView(!isExpandedView)}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                title={isExpandedView ? 'Thu gọn cửa sổ' : 'Xem toàn màn hình'}
              >
                {isExpandedView ? (
                  <Minimize2 size={16} />
                ) : (
                  <Maximize2 size={16} />
                )}
              </button>
              <button
                onClick={handleRequestClose}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Modal Tabs Bar */}
          <div className="flex items-center justify-between border-b border-white/10 py-3 flex-shrink-0 flex-wrap gap-2">
            <div className="flex gap-2 items-center flex-wrap">
              <button
                onClick={() => setModalTab('import')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  modalTab === 'import'
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-600/30 border border-violet-400/30'
                    : 'bg-white/5 text-white/60 hover:text-white border border-transparent'
                }`}
              >
                <Sparkles size={14} /> Import CSV Mới
              </button>
              <button
                type="button"
                onClick={() => {
                  setModalTab('smart_reclassify')
                  if (!reclassifyAnalysisData) {
                    runSmartReclassifyAnalysis()
                  }
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  modalTab === 'smart_reclassify'
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-600/30 border border-violet-400/30'
                    : 'bg-white/5 text-white/60 hover:text-white border border-transparent'
                }`}
              >
                <Tag size={14} /> Phân Loại Thông Minh
              </button>
              <button
                onClick={() => setModalTab('history')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  modalTab === 'history'
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-600/30 border border-violet-400/30'
                    : 'bg-white/5 text-white/60 hover:text-white border border-transparent'
                }`}
              >
                <Clock size={14} /> Lịch Sử Import ({historyLogs.length})
              </button>
            </div>

            {modalTab === 'history' && (
              <div className="relative">
                <Search
                  size={13}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
                />
                <input
                  type="text"
                  className="input text-xs pl-8 py-1.5 w-56 rounded-xl bg-white/5 border-white/10"
                  placeholder="Lọc tên file, admin..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Body Content — Fixed Height Container */}
          <div className="flex-1 overflow-y-auto py-4 pr-1 space-y-4">
            {modalTab === 'import' ? (
              <div className="space-y-5 text-xs">
                {/* File Option Selection */}
                <div className="space-y-2.5">
                  <label className="font-bold text-white/90 text-xs block flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-violet-600/30 text-violet-300 text-[11px] flex items-center justify-center font-bold">
                      1
                    </span>
                    Chọn Nguồn File CSV
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Default File Box */}
                    <div
                      onClick={() => {
                        setUseDefaultFile(true)
                        setSelectedFile(null)
                        setValidation(null)
                      }}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        useDefaultFile
                          ? 'bg-violet-900/25 border-violet-500/60 text-white ring-1 ring-violet-500/40 shadow-lg shadow-violet-950/40'
                          : 'bg-white/[0.02] border-white/10 text-white/60 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold text-xs text-violet-300">
                        <span className="flex items-center gap-2">
                          <CheckCircle size={15} /> File Mặc Định Máy Chủ
                        </span>
                        {useDefaultFile && (
                          <span className="text-[10px] bg-violet-500/30 text-violet-200 px-2 py-0.5 rounded-full font-bold">
                            Đang chọn
                          </span>
                        )}
                      </div>
                      {serverCsvFiles.length > 0 ? (
                        <div className="mt-2 space-y-1">
                          <label className="text-[10px] text-white/50 font-bold block">
                            Tệp trên máy chủ (plant/datas):
                          </label>
                          <select
                            value={
                              selectedServerFileName ||
                              defaultServerFile?.fileName ||
                              ''
                            }
                            onChange={(e) => {
                              setSelectedServerFileName(e.target.value)
                              setUseDefaultFile(true)
                              setSelectedFile(null)
                              setValidation(null)
                            }}
                            className="w-full bg-black/70 text-violet-200 font-mono text-[11px] font-bold p-2 rounded-lg border border-violet-500/50 focus:outline-none cursor-pointer"
                          >
                            {serverCsvFiles.map((f) => (
                              <option key={f.fileName} value={f.fileName}>
                                📁 {f.fileName} ({f.rowCount} bài -{' '}
                                {(f.sizeBytes / 1024 / 1024).toFixed(2)}MB)
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div className="mt-2 space-y-1">
                          <label className="text-[10px] text-white/50 font-bold flex items-center gap-1">
                            <Loader2
                              size={10}
                              className="animate-spin text-violet-400"
                            />{' '}
                            Tệp trên máy chủ (plant/datas):
                          </label>
                          <div className="w-full bg-black/40 text-white/50 font-mono text-[11px] p-2 rounded-lg border border-white/10 animate-pulse">
                            Đang nạp danh sách tệp máy chủ...
                          </div>
                        </div>
                      )}
                      {lastImportedFileName ? (
                        <span
                          className="text-[10px] text-emerald-400 font-semibold block mt-1.5 flex items-center gap-1 truncate"
                          title={`Lần import gần nhất: ${lastImportedFileName}`}
                        >
                          <Clock
                            size={11}
                            className="text-emerald-400 flex-shrink-0"
                          />
                          <span>
                            Import gần nhất:{' '}
                            <strong className="text-white font-mono">
                              {lastImportedFileName}
                            </strong>
                          </span>
                        </span>
                      ) : historyLoading ? (
                        <span className="text-[10px] text-white/40 font-semibold block mt-1.5 flex items-center gap-1 animate-pulse">
                          <Clock
                            size={11}
                            className="text-violet-400 flex-shrink-0 animate-spin"
                          />
                          <span>Đang tải lịch sử import...</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-emerald-400 font-bold block mt-2 flex items-center gap-1">
                          <CheckCircle size={11} /> Đã nghiệm thu chuẩn 22
                          trường
                        </span>
                      )}
                    </div>

                    {/* Custom File Upload Box */}
                    <label
                      className={`p-4 rounded-xl border cursor-pointer transition-all block ${
                        !useDefaultFile
                          ? 'bg-violet-900/25 border-violet-500/60 text-white ring-1 ring-violet-500/40 shadow-lg shadow-violet-950/40'
                          : 'bg-white/[0.02] border-white/10 text-white/60 hover:border-white/20'
                      }`}
                    >
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <div className="flex items-center justify-between font-bold text-xs text-violet-300">
                        <span className="flex items-center gap-2">
                          <Image size={15} /> Tải Lên File CSV Khác
                        </span>
                        {!useDefaultFile && (
                          <span className="text-[10px] bg-violet-500/30 text-violet-200 px-2 py-0.5 rounded-full font-bold">
                            Đang chọn
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-white/60 mt-2 truncate bg-black/30 p-2 rounded-lg border border-white/5">
                        {selectedFile
                          ? selectedFile.name
                          : 'Nhấn để chọn file .csv từ máy tính'}
                      </p>
                      <span className="text-[10px] text-amber-400 font-bold block mt-2">
                        {selectedFile
                          ? '📁 Đã tải file custom'
                          : 'Chấp nhận tập tin .csv mã hóa UTF-8'}
                      </span>
                    </label>
                  </div>
                </div>

                {/* Validation Status Box */}
                {!useDefaultFile && validation && (
                  <div
                    className={`p-4 rounded-xl border font-mono text-[11px] space-y-1.5 ${
                      validation.valid
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 shadow-md shadow-emerald-950/30'
                        : 'bg-red-950/40 border-red-500/40 text-red-300 shadow-md shadow-red-950/30'
                    }`}
                  >
                    {validation.valid ? (
                      <div className="flex items-center gap-2 font-bold">
                        <CheckCircle size={16} className="text-emerald-400" />
                        <span>
                          ✅ Đã kiểm tra: File CSV đủ 22/22 trường bắt buộc! (
                          {validation.totalRows} dòng dữ liệu)
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 font-bold text-red-400 text-xs">
                          <XCircle size={16} />
                          <span>
                            ⚠️ File CSV thiếu {validation.missing.length} trường
                            bắt buộc:
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {validation.missing.map((m) => (
                            <span
                              key={m}
                              className="bg-red-900/60 text-red-200 px-2 py-0.5 rounded-md text-[10px] font-bold border border-red-500/30"
                            >
                              {m}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Fast Check & Pre-Import Analysis Result Card */}
                {analyzing ? (
                  <div className="p-4 rounded-2xl bg-violet-950/25 border border-violet-500/30 flex items-center justify-center gap-3 text-violet-300 font-medium">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 0.8,
                        repeat: Infinity,
                        ease: 'linear',
                      }}
                      className="flex items-center justify-center flex-shrink-0"
                    >
                      <RefreshCw size={18} className="text-violet-400" />
                    </motion.div>
                    <span>
                      🔍 Đang quét nhanh &amp; phân tích dữ liệu CSV (Dry-Run
                      Check)...
                    </span>
                  </div>
                ) : analysisResult ? (
                  analysisResult.alreadyImported ? (
                    /* CASE 1: File cũ / Dữ liệu đã import trước đó (Không có gì mới) */
                    <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200 space-y-2.5 shadow-lg shadow-amber-950/40 animate-in fade-in duration-200">
                      <p className="text-xs text-amber-200/90 leading-snug font-sans">
                        Tất cả{' '}
                        <strong className="text-amber-300 font-bold">
                          {analysisResult.totalRows} bài đăng
                        </strong>{' '}
                        trong tập tin CSV này đều đã tồn tại trên cơ sở dữ liệu.
                        không phát hiện bài viết mới.
                      </p>

                      {/* Summary Badges */}
                      <div className="grid grid-cols-3 gap-2 font-sans text-xs">
                        <div className="py-1.5 px-3 bg-black/40 rounded-lg border border-rose-500/20 flex items-center justify-between text-[11px]">
                          <span className="text-white/50 text-[10px]">
                            Bài mới
                          </span>
                          <strong className="text-rose-400 font-mono font-bold">
                            0
                          </strong>
                        </div>
                        <div className="py-1.5 px-3 bg-black/40 rounded-lg border border-amber-500/20 flex items-center justify-between text-[11px]">
                          <span className="text-white/50 text-[10px]">
                            Bài đã có
                          </span>
                          <strong className="text-amber-300 font-mono font-bold">
                            {analysisResult.existingPostsCount}
                          </strong>
                        </div>
                        <div className="py-1.5 px-3 bg-black/40 rounded-lg border border-violet-500/20 flex items-center justify-between text-[11px]">
                          <span className="text-white/50 text-[10px]">
                            Tác giả AI
                          </span>
                          <strong className="text-violet-300 font-mono font-bold">
                            {analysisResult.existingUsersCount}
                          </strong>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* CASE 2: File mới / Có bài mới cần nạp -> Hiển thị Bảng Thống Kê Dự Kiến */
                    <div className="p-5 sm:p-5.5 rounded-2xl bg-emerald-950/25 border border-emerald-500/40 text-emerald-200 space-y-4 shadow-xl shadow-emerald-950/30 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between pb-1.5 border-b border-emerald-500/15">
                        <div className="flex items-center gap-2.5 text-xs font-bold text-emerald-300">
                          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
                            <Sparkles size={16} />
                          </div>
                          <span className="text-sm font-semibold tracking-wide">
                            Thống Kê Dự Kiến Nạp Dữ Liệu{' '}
                            <span className="text-[11px] font-mono text-emerald-400/70 font-normal">
                              (Pre-Import Impact Report)
                            </span>
                          </span>
                        </div>
                        <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full font-bold border border-emerald-500/30 flex items-center gap-1.5 shadow-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Đã sẵn sàng nạp
                        </span>
                      </div>

                      <p className="text-xs text-white/70 leading-relaxed font-sans">
                        Hệ thống đã phân tích{' '}
                        <strong className="text-emerald-300 font-bold">
                          {analysisResult.totalRows} dòng bài đăng
                        </strong>{' '}
                        trong tập tin CSV. Xem thống kê dự kiến biến động dữ
                        liệu:
                      </p>

                      {/* 4 Stat Cards Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-0.5">
                        <div className="p-3.5 bg-black/40 border border-emerald-500/30 rounded-xl space-y-1.5 hover:border-emerald-500/50 transition-colors">
                          <span className="text-[10px] text-emerald-400/90 font-sans font-bold uppercase tracking-wider block">
                            Bài Sẽ Tạo Mới
                          </span>
                          <span className="text-xl font-extrabold text-emerald-400 font-display block">
                            +{analysisResult.newPostsCount}
                          </span>
                        </div>

                        <div className="p-3.5 bg-black/40 border border-indigo-500/30 rounded-xl space-y-1.5 hover:border-indigo-500/50 transition-colors">
                          <span className="text-[10px] text-indigo-300/90 font-sans font-bold uppercase tracking-wider block">
                            Tác Giả AI Mới
                          </span>
                          <span className="text-xl font-extrabold text-indigo-300 font-display block">
                            +{analysisResult.newUsersCount}
                          </span>
                        </div>

                        <div className="p-3.5 bg-black/40 border border-amber-500/30 rounded-xl space-y-1.5 hover:border-amber-500/50 transition-colors">
                          <span className="text-[10px] text-amber-300/90 font-sans font-bold uppercase tracking-wider block">
                            Bài Trùng Bỏ Qua
                          </span>
                          <span className="text-xl font-bold text-amber-300 font-display block">
                            {analysisResult.existingPostsCount}
                          </span>
                        </div>

                        <div className="p-3.5 bg-black/40 border border-white/10 rounded-xl space-y-1.5 hover:border-white/20 transition-colors">
                          <span className="text-[10px] text-white/50 font-sans font-bold uppercase tracking-wider block">
                            Tác Giả Đã Có Sẵn
                          </span>
                          <span className="text-xl font-bold text-white/80 font-display block">
                            {analysisResult.existingUsersCount}
                          </span>
                        </div>
                      </div>

                      {/* Smart Category Proposal Metrics Breakdown */}
                      {analysisResult.proposedCategoriesCount > 0 && (
                        <div className="p-3 bg-violet-950/40 border border-violet-500/30 rounded-xl text-xs text-violet-200 flex items-center justify-between gap-3 animate-in fade-in">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 font-bold text-[11px] border border-violet-500/30 flex-shrink-0">
                              🏷️ Đề Xuất Danh Mục
                            </span>
                            <span className="text-[11px] text-violet-200/90 leading-snug">
                              <strong className="text-violet-300 font-bold">
                                {analysisResult.matchedCategoriesCount || 0} bài
                              </strong>{' '}
                              tự động khớp danh mục có sẵn. Có{' '}
                              <strong className="text-violet-300 font-bold">
                                {analysisResult.proposedCategoriesCount} bài
                              </strong>{' '}
                              chưa có danh mục phù hợp (sẽ được đề xuất lên bảng
                              điều khiển cho Admin chọn duyệt/từ chối).
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                ) : null}

                {/* Required Fields Format Reference & Sample Values */}
                <div className="p-4 bg-white/[0.02] border border-white/10 rounded-2xl space-y-3">
                  <div className="font-bold text-white/90 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-violet-600/30 text-violet-300 text-[11px] flex items-center justify-center font-bold">
                        2
                      </span>
                      22 Trường Bắt Buộc &amp; Ví Dụ Giá Trị Mẫu Trong CSV
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowSchemaTable(!showSchemaTable)}
                      className="text-violet-400 hover:text-violet-300 text-[11px] font-semibold flex items-center gap-1 cursor-pointer bg-violet-950/40 border border-violet-500/30 px-2.5 py-1 rounded-lg transition-colors"
                    >
                      <Eye size={12} />
                      {showSchemaTable
                        ? 'Thu gọn dạng tag'
                        : 'Xem bảng chi tiết ví dụ'}
                    </button>
                  </div>

                  {showSchemaTable ? (
                    <div className="border border-white/10 rounded-xl overflow-hidden bg-black/50 max-h-[380px] overflow-y-auto font-mono text-[11px] shadow-inner">
                      <table className="w-full text-left border-collapse text-white/70">
                        <thead className="bg-white/10 border-b border-white/10 text-violet-300 text-[10px] uppercase font-bold sticky top-0 backdrop-blur-md z-10">
                          <tr>
                            <th className="p-2.5 w-1/4">Tên trường (Header)</th>
                            <th className="p-2.5 w-1/5">Kiểu dữ liệu</th>
                            <th className="p-2.5 w-2/5">Ví dụ giá trị mẫu</th>
                            <th className="p-2.5 w-1/4">Ghi chú</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-[10px]">
                          {FIELD_EXAMPLES.map((item) => (
                            <tr
                              key={item.field}
                              className="hover:bg-white/[0.04] transition-colors"
                            >
                              <td className="p-2 font-bold text-violet-300">
                                {item.field}
                              </td>
                              <td className="p-2 text-amber-300/90">
                                {item.type}
                              </td>
                              <td className="p-2 text-emerald-300 font-mono select-all break-all">
                                {item.example}
                              </td>
                              <td className="p-2 text-white/50 font-sans">
                                {item.note}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 text-[10px] font-mono text-white/60 p-3 bg-black/40 rounded-xl border border-white/5 max-h-36 overflow-y-auto">
                      {FIELD_EXAMPLES.map((f) => (
                        <span
                          key={f.field}
                          title={`${f.type} | Ví dụ: ${f.example}`}
                          className="px-2 py-0.5 rounded-md bg-white/5 text-violet-300 border border-white/10 hover:border-violet-400/40 cursor-help"
                        >
                          {f.field}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Local Image Base Path Setting */}
                <div className="space-y-2">
                  <label className="font-bold text-white/90 text-xs block flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-violet-600/30 text-violet-300 text-[11px] flex items-center justify-center font-bold">
                      3
                    </span>
                    Đường Dẫn Thư Mục Ảnh Offline Local (`image_paths`)
                  </label>
                  <p className="text-[11px] text-white/50">
                    Địa chỉ thư mục chứa ảnh local offline. Dùng khi ảnh trực
                    tuyến (`image_urls`) bị lỗi hoặc mất kết nối.
                  </p>
                  <input
                    type="text"
                    className="input text-xs font-mono w-full bg-black/40 border-white/15 focus:border-violet-500 py-2.5"
                    placeholder="VD: plant/datas/images hoặc D:\DataOfDevelopers\...\images"
                    value={localImagePath}
                    onChange={(e) => setLocalImagePath(e.target.value)}
                  />
                </div>
              </div>
            ) : modalTab === 'smart_reclassify' ? (
              <div className="space-y-4 text-xs flex-1 flex flex-col min-h-0">
                {/* Scan Control, Scope Options & Progress */}
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3 flex-shrink-0">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <h4 className="font-bold text-white text-sm tracking-tight flex items-center gap-2">
                        Phân Loại Thông Minh &amp; Đề Xuất Danh Mục CSV
                        <span className="text-[10px] px-2 py-0.5 rounded bg-violet-600/30 text-violet-300 border border-violet-500/30 font-mono font-normal">
                          {reclassifyScope === 'other'
                            ? 'Phạm vi: Danh mục Other'
                            : 'Phạm vi: Tất cả CSV'}
                        </span>
                      </h4>
                      <p className="text-white/50 text-xs mt-0.5">
                        Phân tích AI cho dữ liệu bài viết CSV, tự động gán vào
                        danh mục phù hợp hoặc đề xuất tạo danh mục mới cho Admin
                        duyệt.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Scope Selector Options */}
                      <div className="flex items-center bg-black/50 border border-white/10 p-1 rounded-xl gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setReclassifyScope('all')
                            runSmartReclassifyAnalysis('all')
                          }}
                          disabled={reclassifyLoading}
                          className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                            reclassifyScope === 'all'
                              ? 'bg-violet-600 text-white shadow-md shadow-violet-900/40'
                              : 'text-white/60 hover:text-white'
                          }`}
                        >
                          Toàn Bộ CSV
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setReclassifyScope('other')
                            runSmartReclassifyAnalysis('other')
                          }}
                          disabled={reclassifyLoading}
                          className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                            reclassifyScope === 'other'
                              ? 'bg-violet-600 text-white shadow-md shadow-violet-900/40'
                              : 'text-white/60 hover:text-white'
                          }`}
                        >
                          Chỉ Bài Danh Mục "Other"
                        </button>
                      </div>

                      {/* Rerun / Refresh Button */}
                      <button
                        type="button"
                        onClick={() => runSmartReclassifyAnalysis()}
                        disabled={reclassifyLoading}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-violet-600 hover:bg-violet-500 text-white transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
                      >
                        <motion.div
                          animate={reclassifyLoading ? { rotate: 360 } : {}}
                          transition={{
                            duration: 0.8,
                            repeat: reclassifyLoading ? Infinity : 0,
                            ease: 'linear',
                          }}
                          className="flex items-center justify-center"
                        >
                          <RefreshCw size={14} />
                        </motion.div>
                        {reclassifyLoading
                          ? 'Đang phân tích...'
                          : 'Quét Dữ Liệu CSV'}
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar during Scanning */}
                  {reclassifyLoading && reclassifyProgress && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex justify-between text-[11px] font-mono text-white/70">
                        <span className="flex items-center gap-1.5">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{
                              duration: 0.8,
                              repeat: Infinity,
                              ease: 'linear',
                            }}
                            className="flex items-center justify-center flex-shrink-0"
                          >
                            <RefreshCw size={12} className="text-violet-400" />
                          </motion.div>
                          Đang phân tích bài viết: {reclassifyProgress.current}{' '}
                          / {reclassifyProgress.total || '...'} bài
                        </span>
                        <span>{reclassifyProgress.percentage || 0}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-200"
                          style={{
                            width: `${reclassifyProgress.percentage || 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Analysis Metrics Summary */}
                  {reclassifyAnalysisData && !reclassifyLoading && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      <div className="p-3 bg-black/40 border border-white/10 rounded-xl flex items-center justify-between">
                        <span className="text-white/60 text-[11px]">
                          Tổng bài CSV đã quét
                        </span>
                        <span className="font-mono font-bold text-white text-sm">
                          {reclassifyAnalysisData.totalScanned}
                        </span>
                      </div>
                      <div className="p-3 bg-black/40 border border-indigo-500/30 rounded-xl flex items-center justify-between">
                        <span className="text-indigo-300 text-[11px]">
                          Cần đổi danh mục (
                          {reclassifyAnalysisData.reclassifyList?.filter(
                            (i) => i.isDifferent
                          ).length || 0}
                          ) / Khớp sẵn (
                          {reclassifyAnalysisData.reclassifyList?.filter(
                            (i) => !i.isDifferent
                          ).length || 0}
                          )
                        </span>
                        <span className="font-mono font-bold text-indigo-400 text-sm">
                          {reclassifyAnalysisData.reclassifyList?.length || 0}
                        </span>
                      </div>
                      <div className="p-3 bg-black/40 border border-violet-500/30 rounded-xl flex items-center justify-between">
                        <span className="text-violet-300 text-[11px]">
                          Đề xuất tạo danh mục mới
                        </span>
                        <span className="font-mono font-bold text-violet-400 text-sm">
                          +
                          {reclassifyAnalysisData.newCategoryProposals
                            ?.length || 0}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Main Content: Interactive Sub-tabs & Items list */}
                {reclassifyAnalysisData && !reclassifyLoading ? (
                  <div className="space-y-4 flex-1 flex flex-col min-h-0">
                    {/* Navigation Sub-tabs & Bulk Action buttons */}
                    <div className="flex items-center justify-between border-b border-white/10 pb-2.5 flex-wrap gap-2 flex-shrink-0">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setReclassifyTab('reclassify')}
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            reclassifyTab === 'reclassify'
                              ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                              : 'bg-white/5 text-white/50 hover:text-white border border-transparent'
                          }`}
                        >
                          Phân Loại Danh Mục (
                          {reclassifyAnalysisData.reclassifyList?.length || 0})
                        </button>
                        <button
                          type="button"
                          onClick={() => setReclassifyTab('proposals')}
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            reclassifyTab === 'proposals'
                              ? 'bg-violet-600/30 text-violet-300 border border-violet-500/40'
                              : 'bg-white/5 text-white/50 hover:text-white border border-transparent'
                          }`}
                        >
                          Đề Xuất Tạo Danh Mục Mới (
                          {reclassifyAnalysisData.newCategoryProposals
                            ?.length || 0}
                          )
                        </button>
                      </div>

                      {/* Bulk Action Controls */}
                      {reclassifyTab === 'reclassify' &&
                        reclassifyAnalysisData.reclassifyList?.length > 0 && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={handleFastApproveHighConfidence}
                              className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 text-white shadow-md shadow-emerald-950/40 hover:from-emerald-500 hover:to-indigo-500 transition-all flex items-center gap-1.5 cursor-pointer"
                              title="Duyệt thần tốc toàn bộ các bài viết có độ tin cậy AI >= 80%"
                            >
                              <Zap size={14} />
                              <span>
                                ⚡ 1-Click Duyệt Nhanh Bài Tin Cậy &gt; 80% (
                                {
                                  reclassifyAnalysisData.reclassifyList.filter(
                                    (i) =>
                                      (i.confidence || 0) >= 80 &&
                                      (i.isDifferent ||
                                        (selectedCategoryChoices[i.postId] &&
                                          selectedCategoryChoices[i.postId] !==
                                            i.currentCategory))
                                  ).length
                                }
                                )
                              </span>
                            </button>

                            <button
                              type="button"
                              onClick={handleApproveAllReclassifications}
                              className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer"
                            >
                              Phê Duyệt Tất Cả Cần Đổi (
                              {
                                reclassifyAnalysisData.reclassifyList.filter(
                                  (i) => i.isDifferent
                                ).length
                              }
                              )
                            </button>
                          </div>
                        )}

                      {reclassifyTab === 'proposals' &&
                        reclassifyAnalysisData.newCategoryProposals?.length >
                          0 && (
                          <button
                            type="button"
                            onClick={handleApproveAllNewCategoryProposals}
                            className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-violet-600 hover:bg-violet-500 text-white transition-colors cursor-pointer"
                          >
                            Phê Duyệt Tất Cả Danh Mục Mới (
                            {reclassifyAnalysisData.newCategoryProposals.length}
                            )
                          </button>
                        )}
                    </div>

                    {/* Multi-Select Floating Action Bar */}
                    {reclassifyTab === 'reclassify' &&
                      selectedPostIds.length > 0 && (
                        <div className="p-3 bg-indigo-950/90 border border-indigo-500/40 rounded-xl flex items-center justify-between gap-3 flex-wrap animate-in fade-in backdrop-blur-md shadow-xl flex-shrink-0">
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-white text-xs flex items-center gap-1.5">
                              <CheckSquare
                                size={14}
                                className="text-indigo-400"
                              />
                              Đã chọn{' '}
                              <strong className="text-indigo-300 font-mono text-sm">
                                {selectedPostIds.length}
                              </strong>{' '}
                              bài viết
                            </span>
                            <button
                              type="button"
                              onClick={handleSelectAllPosts}
                              className="text-[11px] text-indigo-300 hover:text-white underline cursor-pointer"
                            >
                              {selectedPostIds.length ===
                              reclassifyAnalysisData.reclassifyList?.length
                                ? 'Bỏ chọn tất cả'
                                : 'Chọn toàn bộ bài'}
                            </button>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] text-white/60">
                              Gán sang danh mục:
                            </span>
                            <select
                              value={batchTargetCategory}
                              onChange={(e) =>
                                setBatchTargetCategory(e.target.value)
                              }
                              className="bg-black/70 border border-white/20 rounded-lg text-xs px-2.5 py-1.5 text-white focus:outline-none font-sans"
                            >
                              <option value="">-- Chọn danh mục --</option>
                              {reclassifyAnalysisData.activeCategories?.map(
                                (c) => (
                                  <option key={c.slug} value={c.slug}>
                                    {c.name} ({c.slug})
                                  </option>
                                )
                              )}
                            </select>
                            <button
                              type="button"
                              onClick={handleApplySelectedBatchCategory}
                              disabled={!batchTargetCategory}
                              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer"
                            >
                              Áp Dụng Cho Bài Đã Chọn
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedPostIds([])}
                              className="px-2.5 py-1.5 bg-white/10 hover:bg-white/15 text-white/70 hover:text-white rounded-lg text-xs transition-colors cursor-pointer"
                            >
                              Hủy Tích Chọn
                            </button>
                          </div>
                        </div>
                      )}

                    {/* Tab 1: Reclassification Cards */}
                    {reclassifyTab === 'reclassify' && (
                      <div className="space-y-3 flex-1 flex flex-col min-h-0">
                        <div
                          className={`space-y-3 overflow-y-auto pr-1 flex-1 ${isExpandedView ? 'max-h-[calc(98vh-260px)]' : 'max-h-[420px]'}`}
                        >
                          {reclassifyAnalysisData.reclassifyList?.length ===
                          0 ? (
                            <div className="py-8 text-center text-white/40 text-xs bg-white/[0.02] rounded-xl border border-white/5">
                              Không có bài viết nào trong danh sách.
                            </div>
                          ) : (
                            reclassifyAnalysisData.reclassifyList?.map(
                              (item) => (
                                <div
                                  key={item.postId}
                                  className={`p-3 border rounded-xl flex items-center justify-between gap-3 transition-all ${
                                    selectedPostIds.includes(item.postId)
                                      ? 'bg-indigo-950/40 border-indigo-500/60 shadow-lg shadow-indigo-950/50'
                                      : item.isDifferent
                                        ? 'bg-indigo-950/20 border-indigo-500/30'
                                        : 'bg-white/[0.03] border-white/10'
                                  }`}
                                >
                                  <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <input
                                      type="checkbox"
                                      checked={selectedPostIds.includes(
                                        item.postId
                                      )}
                                      onChange={() =>
                                        handleToggleSelectPost(item.postId)
                                      }
                                      className="w-4 h-4 rounded border-white/20 bg-black/40 text-indigo-600 focus:ring-0 cursor-pointer flex-shrink-0"
                                    />
                                    {item.imageUrl ? (
                                      <div
                                        onClick={() =>
                                          setPreviewModal?.(item.post)
                                        }
                                        className="relative group cursor-pointer flex-shrink-0"
                                        title="Click để xem chi tiết bài đăng"
                                      >
                                        <img
                                          src={item.imageUrl}
                                          alt=""
                                          className="w-11 h-11 rounded-lg object-cover bg-black/40 group-hover:opacity-80 transition-opacity"
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 rounded-lg flex items-center justify-center transition-opacity">
                                          <Eye
                                            size={14}
                                            className="text-white"
                                          />
                                        </div>
                                      </div>
                                    ) : (
                                      <div
                                        onClick={() =>
                                          setPreviewModal?.(item.post)
                                        }
                                        className="w-11 h-11 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/40 flex-shrink-0 font-bold cursor-pointer hover:bg-white/10"
                                        title="Click để xem chi tiết bài đăng"
                                      >
                                        CSV
                                      </div>
                                    )}
                                    <div className="min-w-0 space-y-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <h5
                                          onClick={() =>
                                            setPreviewModal?.(item.post)
                                          }
                                          className="font-semibold text-white/90 truncate text-xs cursor-pointer hover:text-indigo-300 hover:underline transition-colors"
                                          title="Click để xem chi tiết bài đăng"
                                        >
                                          {item.title}
                                        </h5>
                                        {/* AI Confidence Badge */}
                                        {(item.confidence || 0) >= 90 ? (
                                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                                            ⚡ {item.confidence}% Tin Cậy Rất
                                            Cao
                                          </span>
                                        ) : (item.confidence || 0) >= 75 ? (
                                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                                            🎯 {item.confidence}% Tin Cậy Trung
                                            Bình
                                          </span>
                                        ) : (
                                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                                            ⚠️ {item.confidence}% Cần Duyệt
                                          </span>
                                        )}
                                        {item.isDifferent ? (
                                          <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex-shrink-0">
                                            Khác danh mục
                                          </span>
                                        ) : (
                                          <span className="px-1.5 py-0.2 text-[9px] font-semibold rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 flex-shrink-0">
                                            Đã đúng danh mục
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2 text-[11px]">
                                        <span className="px-2 py-0.5 rounded bg-white/10 text-white/60 font-mono">
                                          {item.currentCategory}
                                        </span>
                                        <span className="text-white/40">→</span>
                                        <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                                          {selectedCategoryChoices[
                                            item.postId
                                          ] || item.suggestedCategoryName}
                                        </span>
                                      </div>
                                      {/* AI Candidate Chips */}
                                      <div className="flex items-center gap-1.5 pt-0.5">
                                        <span className="text-[10px] text-white/40">
                                          Gợi ý AI:
                                        </span>
                                        {item.suggested3Categories?.map(
                                          (cand, cIdx) => (
                                            <button
                                              key={cIdx}
                                              type="button"
                                              onClick={() =>
                                                setSelectedCategoryChoices(
                                                  (prev) => ({
                                                    ...prev,
                                                    [item.postId]:
                                                      cand.toLowerCase(),
                                                  })
                                                )
                                              }
                                              className={`px-2 py-0.5 rounded-full text-[10px] cursor-pointer transition-all ${
                                                (selectedCategoryChoices[
                                                  item.postId
                                                ] || item.suggestedCategory) ===
                                                cand.toLowerCase()
                                                  ? 'bg-indigo-600 text-white font-bold'
                                                  : 'bg-white/5 text-white/60 hover:bg-white/10'
                                              }`}
                                            >
                                              {cand}
                                            </button>
                                          )
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleSingleReclassify(
                                          item.postId,
                                          selectedCategoryChoices[
                                            item.postId
                                          ] || item.suggestedCategory
                                        )
                                      }
                                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer"
                                    >
                                      Chấp Nhận
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setReclassifyAnalysisData((prev) => ({
                                          ...prev,
                                          reclassifyList:
                                            prev.reclassifyList.filter(
                                              (i) => i.postId !== item.postId
                                            ),
                                        }))
                                      }
                                      className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white rounded-lg text-xs transition-colors cursor-pointer"
                                    >
                                      Bỏ Qua
                                    </button>
                                  </div>
                                </div>
                              )
                            )
                          )}
                        </div>
                      </div>
                    )}

                    {/* Tab 2: New Category Proposals */}
                    {reclassifyTab === 'proposals' && (
                      <div
                        className={`space-y-3 overflow-y-auto pr-1 flex-1 ${isExpandedView ? 'max-h-[calc(98vh-270px)]' : 'max-h-[420px]'}`}
                      >
                        {reclassifyAnalysisData.newCategoryProposals?.length ===
                        0 ? (
                          <div className="py-8 text-center text-white/40 text-xs bg-white/[0.02] rounded-xl border border-white/5">
                            Không có bài viết nào đề xuất tạo danh mục mới.
                          </div>
                        ) : (
                          reclassifyAnalysisData.newCategoryProposals?.map(
                            (item) => (
                              <div
                                key={item.postId}
                                className="p-3.5 bg-white/[0.03] border border-violet-500/25 rounded-xl space-y-3"
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-3 min-w-0 flex-1">
                                    {item.imageUrl ? (
                                      <div
                                        onClick={() =>
                                          setPreviewModal?.(item.post)
                                        }
                                        className="relative group cursor-pointer flex-shrink-0"
                                        title="Click để xem chi tiết bài đăng"
                                      >
                                        <img
                                          src={item.imageUrl}
                                          alt=""
                                          className="w-11 h-11 rounded-lg object-cover bg-black/40 group-hover:opacity-80 transition-opacity"
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 rounded-lg flex items-center justify-center transition-opacity">
                                          <Eye
                                            size={14}
                                            className="text-white"
                                          />
                                        </div>
                                      </div>
                                    ) : (
                                      <div
                                        onClick={() =>
                                          setPreviewModal?.(item.post)
                                        }
                                        className="w-11 h-11 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/40 flex-shrink-0 font-bold cursor-pointer hover:bg-white/10"
                                        title="Click để xem chi tiết bài đăng"
                                      >
                                        CSV
                                      </div>
                                    )}
                                    <div className="min-w-0 space-y-1">
                                      <h5
                                        onClick={() =>
                                          setPreviewModal?.(item.post)
                                        }
                                        className="font-semibold text-white/90 truncate text-xs cursor-pointer hover:text-violet-300 hover:underline transition-colors"
                                        title="Click để xem chi tiết bài đăng"
                                      >
                                        {item.title}
                                      </h5>
                                      <div className="flex items-center gap-2 text-[11px]">
                                        <span className="text-white/50">
                                          Đề xuất danh mục:
                                        </span>
                                        <span className="px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 font-bold border border-violet-500/30">
                                          {selectedCategoryChoices[
                                            item.postId
                                          ] || item.requestedCategory}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleSingleCategoryProposal(
                                          item.postId,
                                          'approve',
                                          selectedCategoryChoices[
                                            item.postId
                                          ] || item.requestedCategory
                                        )
                                      }
                                      className="px-3.5 py-1.5 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer"
                                    >
                                      Tạo &amp; Duyệt
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleSingleCategoryProposal(
                                          item.postId,
                                          'reject',
                                          null
                                        )
                                      }
                                      className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white rounded-lg text-xs transition-colors cursor-pointer"
                                    >
                                      Gán Vào Khác
                                    </button>
                                  </div>
                                </div>

                                {/* 3 AI Suggestions Chips Selection */}
                                <div className="p-2.5 bg-black/30 rounded-lg border border-white/5 flex items-center justify-between flex-wrap gap-2">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[11px] text-violet-300/80 font-bold">
                                      Gợi ý 3 danh mục từ AI:
                                    </span>
                                    {item.suggested3Categories?.map(
                                      (suggestion, sIdx) => (
                                        <button
                                          key={sIdx}
                                          type="button"
                                          onClick={() =>
                                            setSelectedCategoryChoices(
                                              (prev) => ({
                                                ...prev,
                                                [item.postId]: suggestion,
                                              })
                                            )
                                          }
                                          className={`px-2.5 py-1 rounded-md text-[11px] cursor-pointer transition-all ${
                                            (selectedCategoryChoices[
                                              item.postId
                                            ] || item.requestedCategory) ===
                                            suggestion
                                              ? 'bg-violet-600 text-white font-bold shadow-md shadow-violet-600/30'
                                              : 'bg-white/5 text-white/70 hover:bg-white/10 border border-white/5'
                                          }`}
                                        >
                                          {sIdx + 1}. {suggestion}
                                        </button>
                                      )
                                    )}
                                  </div>

                                  {/* Or choose existing active category */}
                                  <select
                                    value={
                                      selectedCategoryChoices[item.postId] ||
                                      item.requestedCategory
                                    }
                                    onChange={(e) =>
                                      setSelectedCategoryChoices((prev) => ({
                                        ...prev,
                                        [item.postId]: e.target.value,
                                      }))
                                    }
                                    className="bg-black/60 border border-white/10 rounded-md text-[11px] px-2 py-1 text-white/80 focus:outline-none"
                                  >
                                    <option value={item.requestedCategory}>
                                      Mặc định: {item.requestedCategory}
                                    </option>
                                    {reclassifyAnalysisData.activeCategories?.map(
                                      (c) => (
                                        <option key={c.slug} value={c.name}>
                                          {c.name} ({c.slug})
                                        </option>
                                      )
                                    )}
                                  </select>
                                </div>
                              </div>
                            )
                          )
                        )}
                      </div>
                    )}
                  </div>
                ) : !reclassifyLoading ? (
                  <div className="py-12 text-center text-white/40 text-xs bg-white/[0.02] rounded-2xl border border-white/5 space-y-3">
                    <p>
                      Bấm nút "Quét Dữ Liệu CSV" phía trên để tiến hành phân
                      tích {reclassifyAnalysisData?.totalScanned || 850} bài
                      viết CSV.
                    </p>
                  </div>
                ) : null}
              </div>
            ) : (
              /* History Tab */
              <div className="space-y-4">
                {/* Summary Metrics Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  <div className="p-3 bg-white/[0.02] border border-white/10 rounded-xl text-xs space-y-1">
                    <span className="text-[9px] text-white/40 uppercase font-bold tracking-wider block">
                      Tổng Đợt Import
                    </span>
                    <span className="text-base font-bold text-white font-display">
                      {totalBatches}
                    </span>
                  </div>
                  <div className="p-3 bg-emerald-950/30 border border-emerald-500/25 rounded-xl text-xs space-y-1">
                    <span className="text-[9px] text-emerald-400/80 uppercase font-bold tracking-wider block">
                      Bài Đăng Đã Tạo
                    </span>
                    <span className="text-base font-bold text-emerald-300 font-display">
                      +{totalImported}
                    </span>
                  </div>
                  <div className="p-3 bg-violet-950/30 border border-violet-500/25 rounded-xl text-xs space-y-1">
                    <span className="text-[9px] text-violet-400/80 uppercase font-bold tracking-wider block">
                      Tác Giả AI Mới
                    </span>
                    <span className="text-base font-bold text-violet-300 font-display">
                      +{totalUsersCreated}
                    </span>
                  </div>
                  <div className="p-3 bg-amber-950/30 border border-amber-500/25 rounded-xl text-xs space-y-1">
                    <span className="text-[9px] text-amber-400/80 uppercase font-bold tracking-wider block">
                      Bài Trùng Bỏ Qua
                    </span>
                    <span className="text-base font-bold text-amber-300 font-display">
                      {totalSkipped}
                    </span>
                  </div>
                  <div className="p-3 bg-red-950/30 border border-red-500/25 rounded-xl text-xs space-y-1 col-span-2 sm:col-span-1">
                    <span className="text-[9px] text-red-400/80 uppercase font-bold tracking-wider block">
                      Lỗi Dòng Bị Qua
                    </span>
                    <span className="text-base font-bold text-red-400 font-display">
                      {historyLogs.reduce(
                        (acc, l) =>
                          acc +
                          (l.details?.errorCount ||
                            l.details?.errors?.length ||
                            0),
                        0
                      )}
                    </span>
                  </div>
                </div>

                {/* History Logs Feed */}
                {historyLoading ? (
                  <div className="flex items-center justify-center py-16 text-white/40 gap-2 text-xs">
                    <Loader2
                      size={20}
                      className="animate-spin text-violet-400"
                    />{' '}
                    Đang tải lịch sử import...
                  </div>
                ) : filteredLogs.length === 0 ? (
                  <div className="text-center py-16 text-white/40 text-xs card border-white/5 bg-white/[0.01]">
                    Không tìm thấy lịch sử import CSV nào khớp yêu cầu.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredLogs.map((log, idx) => {
                      const imported = log.details?.importedCount || 0
                      const errorCnt =
                        log.details?.errorCount ||
                        log.details?.errors?.length ||
                        0
                      const isPartial =
                        log.details?.status === 'partial' ||
                        (errorCnt > 0 && imported > 0)
                      const isFailed =
                        log.details?.status === 'failed' ||
                        (imported === 0 && errorCnt > 0)

                      return (
                        <div
                          key={log.id}
                          className={`p-4 border rounded-2xl space-y-3 text-xs transition-all hover:shadow-xl hover:shadow-black/40 ${
                            isFailed
                              ? 'bg-red-950/20 border-red-500/30'
                              : isPartial
                                ? 'bg-amber-950/20 border-amber-500/30'
                                : 'bg-white/[0.02] border-white/10 hover:border-violet-500/40'
                          }`}
                        >
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2.5">
                              <span className="text-[11px] font-bold text-violet-300 bg-violet-950/60 border border-violet-500/30 px-2.5 py-1 rounded-lg">
                                Đợt #{historyLogs.length - idx}
                              </span>
                              <span className="font-bold text-white font-mono text-xs">
                                {log.details?.fileName || 'import.csv'}
                              </span>

                              {isFailed ? (
                                <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/20 text-red-300 font-semibold border border-red-500/30 flex items-center gap-1">
                                  <XCircle size={10} /> Thất bại ({errorCnt}{' '}
                                  lỗi)
                                </span>
                              ) : isPartial ? (
                                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30 flex items-center gap-1">
                                  <AlertTriangle size={10} /> Nhập 1 phần (Tạo{' '}
                                  {imported}, Lỗi {errorCnt})
                                </span>
                              ) : (
                                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30 flex items-center gap-1">
                                  <CheckCircle size={10} /> Thành công 100% (
                                  {imported} bài)
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-white/50 text-[11px]">
                              <span>
                                {new Date(log.createdAt).toLocaleString(
                                  'vi-VN'
                                )}
                              </span>
                              <span>•</span>
                              <span className="text-white font-semibold">
                                @
                                {log.admin?.username ||
                                  log.details?.by ||
                                  'admin'}
                              </span>

                              {log.details?.batchImportId &&
                                (log.details.isUndone ? (
                                  <span
                                    className="ml-2 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white/5 text-emerald-400/80 border border-emerald-500/30 flex items-center gap-1.5 cursor-not-allowed select-none"
                                    title="Đợt import này đã được hoàn tác và xóa dữ liệu thành công"
                                  >
                                    <CheckCircle
                                      size={12}
                                      className="text-emerald-400"
                                    />
                                    <span>Đã hoàn tác</span>
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleUndoBatch(log.details.batchImportId)
                                    }
                                    disabled={
                                      undoingBatchId ===
                                      log.details.batchImportId
                                    }
                                    className="ml-2 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/30 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                                    title="Hoàn tác & Xóa toàn bộ các bài viết từ đợt import này"
                                  >
                                    <RotateCcw
                                      size={12}
                                      className={
                                        undoingBatchId ===
                                        log.details.batchImportId
                                          ? 'animate-spin'
                                          : ''
                                      }
                                    />
                                    <span>
                                      {undoingBatchId ===
                                      log.details.batchImportId
                                        ? 'Đang hoàn tác...'
                                        : 'Undo (Hoàn tác)'}
                                    </span>
                                  </button>
                                ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 text-[11px]">
                            <div className="bg-emerald-950/40 border border-emerald-500/20 p-2.5 rounded-xl text-emerald-300 flex items-center justify-between">
                              <span className="text-white/50 text-[10px]">
                                Bài đăng mới:
                              </span>
                              <span className="font-bold text-xs">
                                +{imported}
                              </span>
                            </div>
                            <div className="bg-violet-950/40 border border-violet-500/20 p-2.5 rounded-xl text-violet-300 flex items-center justify-between">
                              <span className="text-white/50 text-[10px]">
                                User AI tạo mới:
                              </span>
                              <span className="font-bold text-xs">
                                +{log.details?.createdUsersCount || 0}
                              </span>
                            </div>
                            <div className="bg-amber-950/40 border border-amber-500/20 p-2.5 rounded-xl text-amber-300 flex items-center justify-between">
                              <span className="text-white/50 text-[10px]">
                                Trùng bỏ qua:
                              </span>
                              <span className="font-bold text-xs">
                                {log.details?.skippedCount || 0}
                              </span>
                            </div>
                            <div className="bg-white/5 border border-white/10 p-2.5 rounded-xl text-white/70 flex items-center justify-between">
                              <span className="text-white/50 text-[10px]">
                                Tổng số dòng:
                              </span>
                              <span className="font-bold text-xs">
                                {log.details?.totalRows || 0}
                              </span>
                            </div>
                          </div>

                          {/* Row Errors Breakdown if any */}
                          {((log.details?.errors &&
                            log.details.errors.length > 0) ||
                            log.details?.errorMessage) && (
                            <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-xl space-y-2 text-[11px] font-mono text-red-200">
                              <div className="font-bold flex items-center gap-1.5 text-xs text-red-400">
                                <AlertTriangle size={13} />
                                Chi Tiết Lỗi Gặp Phải (
                                {log.details?.errors?.length || 1} lỗi):
                              </div>
                              {log.details.errorMessage && (
                                <p className="text-[10px] text-red-300 bg-red-900/40 p-2 rounded-lg border border-red-500/20">
                                  {log.details.errorMessage}
                                </p>
                              )}
                              {log.details.errors &&
                                log.details.errors.length > 0 && (
                                  <div className="max-h-28 overflow-y-auto space-y-1.5 pr-1">
                                    {log.details.errors.map(
                                      (errItem, errIdx) => (
                                        <div
                                          key={errIdx}
                                          className="p-2 bg-black/40 rounded-lg border border-red-500/20 flex flex-col gap-0.5"
                                        >
                                          <span className="text-amber-300 font-bold">
                                            Dòng {errItem.row || 'N/A'}:{' '}
                                            {errItem.title || 'Bài đăng'}
                                          </span>
                                          <span className="text-red-300 text-[10px]">
                                            {errItem.error}
                                          </span>
                                        </div>
                                      )
                                    )}
                                  </div>
                                )}
                            </div>
                          )}

                          {log.details?.localImagesBasePath && (
                            <div className="flex items-center justify-between bg-black/40 border border-white/5 p-2 rounded-xl text-[10px] font-mono text-white/50">
                              <div className="truncate flex items-center gap-1.5">
                                <span>📁 Path ảnh local:</span>
                                <span className="text-violet-300 font-bold">
                                  {log.details.localImagesBasePath}
                                </span>
                              </div>
                              <button
                                onClick={() =>
                                  copyPathToClipboard(
                                    log.details.localImagesBasePath,
                                    log.id
                                  )
                                }
                                className="text-xs text-violet-400 hover:text-white px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 transition-colors flex items-center gap-1 cursor-pointer flex-shrink-0"
                              >
                                <Copy size={11} />
                                {copiedId === log.id ? 'Đã chép!' : 'Chép path'}
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          {modalTab === 'import' && (
            <div className="flex items-center justify-end gap-2 border-t border-white/10 pt-4 flex-shrink-0">
              <button
                type="button"
                onClick={onClose}
                disabled={importing}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleCheckAndImport}
                disabled={
                  importing ||
                  analyzing ||
                  (!useDefaultFile && validation && !validation.valid)
                }
                className="px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-500 hover:to-indigo-500 text-white border border-violet-400/40 shadow-lg shadow-violet-900/40 hover:shadow-violet-900/60 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {importing || analyzing ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Sparkles size={16} />
                )}
                {importing
                  ? 'Đang Xử Lý Import CSV...'
                  : analyzing
                    ? 'Đang Kiểm Tra File...'
                    : 'Bắt Đầu Import CSV'}
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

const PostsTab = () => {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({})
  const [activeStatus, setActiveStatus] = useState('all')
  const [hasMore, setHasMore] = useState(false)
  const [cursor, setCursor] = useState(null)
  const [actionLoading, setActionLoading] = useState(null)
  const [rejectModal, setRejectModal] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [previewModal, setPreviewModal] = useState(null)
  const [previewTab, setPreviewTab] = useState('result')
  const [previewImgIndex, setPreviewImgIndex] = useState(0)
  const [previewDirection, setPreviewDirection] = useState(1)

  const [hideCsvPosts, setHideCsvPosts] = useState(() => {
    try {
      return localStorage.getItem('picspy_admin_hide_csv_posts') === 'true'
    } catch {
      return false
    }
  })

  const toggleHideCsvPosts = () => {
    setHideCsvPosts((prev) => {
      const next = !prev
      try {
        localStorage.setItem('picspy_admin_hide_csv_posts', String(next))
      } catch {
        // Suppress localStorage exception
      }
      return next
    })
  }

  const isCsvPostItem = (p) =>
    Boolean(
      p?.citedFrom ||
      p?.sourceUrl ||
      p?.externalId ||
      p?.isExternalCsv ||
      p?.authorId?.email?.endsWith('@picspy.ai')
    )

  const displayedPosts = posts.filter((p) => {
    if (!hideCsvPosts) return true
    return !isCsvPostItem(p)
  })

  const csvPostCount =
    stats?.csv !== undefined ? stats.csv : posts.filter(isCsvPostItem).length

  useEffect(() => {
    setPreviewTab('result')
    setPreviewImgIndex(0)
  }, [previewModal])

  const getResultImages = useCallback((post) => {
    if (!post) return []
    const list = []
    if (post.generatedImages && post.generatedImages.length > 0) {
      post.generatedImages.forEach((img) => {
        list.push({ ...img, aiTool: post.aiTool, aiModel: post.aiModel })
      })
    } else if (post.images && post.images.length > 0) {
      post.images.forEach((img) => {
        list.push({ ...img })
      })
    }

    if (
      post.isMultiModel &&
      post.modelComparisons &&
      post.modelComparisons.length > 0
    ) {
      post.modelComparisons.forEach((comp) => {
        if (comp.generatedImages && comp.generatedImages.length > 0) {
          comp.generatedImages.forEach((img) => {
            const exists = list.some(
              (existing) =>
                (existing.publicId && existing.publicId === img.publicId) ||
                (existing.url && existing.url === img.url)
            )
            if (!exists) {
              list.push({
                ...img,
                aiTool: comp.aiTool,
                aiModel: comp.aiModel,
              })
            }
          })
        }
      })
    }
    return list
  }, [])
  // Bulk select
  const [selected, setSelected] = useState(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)

  // Buff stats state
  const [buffModal, setBuffModal] = useState(null)
  const [buffViews, setBuffViews] = useState(0)
  const [buffDownloads, setBuffDownloads] = useState(0)
  const [buffLikes, setBuffLikes] = useState(0)
  const [buffBookmarks, setBuffBookmarks] = useState(0)
  const [buffLoading, setBuffLoading] = useState(false)

  const handleBuffStats = async () => {
    if (!buffModal) return
    setBuffLoading(true)
    try {
      const { data } = await api.post(`/admin/posts/${buffModal._id}/buff`, {
        views: buffViews,
        downloads: buffDownloads,
        likes: buffLikes,
        bookmarks: buffBookmarks,
      })
      toast.success(data.message || '✅ Đã buff chỉ số thành công!')
      setPosts((prev) =>
        prev.map((p) => {
          if (p._id === buffModal._id) {
            return {
              ...p,
              stats: {
                ...p.stats,
                viewsCount: (p.stats?.viewsCount || 0) + Number(buffViews),
                downloadsCount:
                  (p.stats?.downloadsCount || 0) + Number(buffDownloads),
                likesCount: (p.stats?.likesCount || 0) + Number(buffLikes),
                bookmarksCount:
                  (p.stats?.bookmarksCount || 0) + Number(buffBookmarks),
              },
            }
          }
          return p
        })
      )
      setBuffModal(null)
      setBuffViews(0)
      setBuffDownloads(0)
      setBuffLikes(0)
      setBuffBookmarks(0)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi buff chỉ số')
    } finally {
      setBuffLoading(false)
    }
  }

  const STATUS_TABS = [
    { key: 'pending', label: 'Chờ duyệt', color: 'text-yellow-400' },
    { key: 'approved', label: 'Đã duyệt', color: 'text-green-400' },
    { key: 'rejected', label: 'Từ chối', color: 'text-red-400' },
    { key: 'hidden', label: 'Đã ẩn', color: 'text-white/40' },
    { key: 'all', label: 'Tất cả', color: 'text-white' },
  ]

  const fetchPosts = useCallback(
    async (reset = false) => {
      if (reset) {
        setLoading(true)
        setCursor(null)
        setSelected(new Set())
      }
      try {
        const params = {
          status: activeStatus,
          limit: 12,
          hideCsv: hideCsvPosts,
        }
        if (!reset && cursor) params.cursor = cursor
        const { data } = await api.get('/admin/posts', { params })
        if (!data) return
        const newPosts = data.posts || []
        setPosts(reset ? newPosts : (p) => [...p, ...newPosts])
        setStats(data.stats || {})
        setHasMore(Boolean(data.pagination?.hasMore))
        setCursor(data.pagination?.nextCursor || null)
      } catch (err) {
        console.error('Fetch posts error:', err)
        toast.error('Không thể tải bài đăng')
      } finally {
        setLoading(false)
      }
    },
    [activeStatus, cursor, hideCsvPosts]
  )

  useEffect(() => {
    fetchPosts(true)
  }, [activeStatus, hideCsvPosts])

  const toggleSelect = (id) =>
    setSelected((prev) => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  const toggleAll = () =>
    setSelected(
      selected.size === posts.length
        ? new Set()
        : new Set(posts.map((p) => p._id))
    )

  const [catApproveModal, setCatApproveModal] = useState(null)

  const handleStatus = async (postId, status, reason = '') => {
    if (status === 'approved') {
      const targetPost = posts.find((p) => p._id === postId)
      if (targetPost && targetPost.requestedCategory) {
        try {
          const catRes = await api.get('/admin/categories')
          const activeCats = catRes.data.categories || []
          const reqCatClean = targetPost.requestedCategory.trim().toLowerCase()
          const isCategoryAlreadyInDb = activeCats.some(
            (c) =>
              c.slug === targetPost.category ||
              c.name?.toLowerCase().trim() === reqCatClean ||
              c.slug === reqCatClean.replace(/\s+/g, '-')
          )

          console.log('🔍 [ADMIN POST APPROVE CHECK]', {
            postId,
            title: targetPost.caption || targetPost.prompt?.substring(0, 30),
            requestedCategory: targetPost.requestedCategory,
            currentCategorySlug: targetPost.category,
            requestedCategoryStatus: targetPost.requestedCategoryStatus,
            isCategoryAlreadyInDb,
            action: isCategoryAlreadyInDb
              ? 'DIRECT_APPROVE (passed luôn)'
              : 'OPEN_PROPOSAL_MODAL',
          })

          if (!isCategoryAlreadyInDb) {
            setCatApproveModal(targetPost)
            return
          }
        } catch (catErr) {
          console.warn(
            '⚠️ Could not verify category status from server:',
            catErr.message
          )
        }
      }
    }

    setActionLoading(postId)
    try {
      await api.patch(`/admin/posts/${postId}/status`, {
        status,
        rejectionReason: reason,
      })
      setPosts((prev) => prev.filter((p) => p._id !== postId))
      toast.success(
        `✅ Đã ${status === 'approved' ? 'duyệt' : status === 'rejected' ? 'từ chối' : 'ẩn'}`
      )
      setRejectModal(null)
      setRejectReason('')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi')
    } finally {
      setActionLoading(null)
    }
  }

  const handleApproveCategoryAndPost = async (post) => {
    setActionLoading(post._id)
    try {
      const { data } = await api.post(
        `/admin/category-requests/${post._id}/approve`
      )
      toast.success(
        data.message ||
          `🎉 Đã duyệt danh mục "${post.requestedCategory}" & xuất bản bài viết!`
      )
      setPosts((prev) => prev.filter((p) => p._id !== post._id))
      setCatApproveModal(null)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi phê duyệt danh mục')
    } finally {
      setActionLoading(null)
    }
  }

  const handleRejectCategoryAndApprovePost = async (post) => {
    setActionLoading(post._id)
    try {
      const { data } = await api.post(
        `/admin/category-requests/${post._id}/reject`
      )
      toast.success(
        data.message || `⚠️ Đã gán bài viết về "Khác" & xuất bản thành công!`
      )
      setPosts((prev) => prev.filter((p) => p._id !== post._id))
      setCatApproveModal(null)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi từ chối danh mục')
    } finally {
      setActionLoading(null)
    }
  }

  const handleBulk = async (status) => {
    if (selected.size === 0) return
    setBulkLoading(true)
    try {
      const { data } = await api.post('/admin/posts/bulk', {
        postIds: [...selected],
        status,
      })
      toast.success(`✅ ${data.message}`)
      setPosts((prev) => prev.filter((p) => !selected.has(p._id)))
      setSelected(new Set())
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi bulk action')
    } finally {
      setBulkLoading(false)
    }
  }

  const handleDeletePost = async (postId) => {
    const confirm = window.confirm(
      'Bạn có chắc chắn muốn xóa bài đăng này vĩnh viễn? Hành động này không thể hoàn tác.'
    )
    if (!confirm) return

    setActionLoading(postId)
    try {
      await api.delete(`/posts/${postId}`)
      setPosts((prev) => prev.filter((p) => p._id !== postId))
      toast.success('🗑 Đã xóa bài đăng vĩnh viễn!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể xóa bài đăng')
    } finally {
      setActionLoading(null)
    }
  }

  const [importModalOpen, setImportModalOpen] = useState(false)

  return (
    <div className="space-y-4">
      {/* Status tabs */}
      <div className="flex gap-2 flex-wrap items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {STATUS_TABS.map(({ key, label, color }) => (
            <button
              key={key}
              onClick={() => setActiveStatus(key)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border flex items-center gap-2
                ${activeStatus === key ? 'bg-brand-600 border-brand-500 text-white' : 'bg-surface-50 border-white/10 text-white/60 hover:border-white/20'}`}
            >
              <span className={color}>{label}</span>
              {stats[key] > 0 && (
                <span className="bg-white/15 text-xs px-1.5 py-0.5 rounded-full font-bold">
                  {stats[key]}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Hide CSV Posts Toggle */}
          <button
            type="button"
            onClick={toggleHideCsvPosts}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 cursor-pointer select-none ${
              hideCsvPosts
                ? 'bg-violet-950/80 border-violet-500/50 text-violet-300 ring-1 ring-violet-500/30 shadow-md shadow-violet-950/50'
                : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:border-white/20'
            }`}
            title="Bật/Tắt ẩn các bài đăng được tạo từ file CSV (Lưu cấu hình vào LocalStorage)"
          >
            {hideCsvPosts ? (
              <>
                <EyeOff size={14} className="text-violet-400" />
                <span>Đang Ẩn Bài Đăng CSV ({csvPostCount})</span>
              </>
            ) : (
              <>
                <Eye size={14} className="text-white/40" />
                <span>Ẩn bài đăng CSV ({csvPostCount})</span>
              </>
            )}
          </button>

          {/* Import CSV Button */}
          <button
            onClick={() => setImportModalOpen(true)}
            className="relative group overflow-hidden px-5 py-2.5 rounded-xl text-xs font-bold font-display text-white bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 border border-violet-400/40 shadow-[0_4px_20px_rgba(124,58,237,0.35)] hover:shadow-[0_6px_28px_rgba(124,58,237,0.55)] transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2.5 cursor-pointer select-none"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
            <Sparkles
              size={16}
              className="text-violet-200 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300 flex-shrink-0"
            />
            <span className="tracking-wide">Import Bài Đăng AI từ CSV</span>
          </button>
        </div>
      </div>

      {/* Bulk action bar */}
      <AnimatePresence>
        {displayedPosts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10"
          >
            <button
              onClick={toggleAll}
              className="flex items-center gap-2 text-xs text-white/60 hover:text-white transition-colors"
            >
              {selected.size === displayedPosts.length ? (
                <CheckSquare size={15} className="text-brand-400" />
              ) : (
                <Square size={15} />
              )}
              {selected.size > 0 ? `${selected.size} đã chọn` : 'Chọn tất cả'}
            </button>

            {selected.size > 0 && (
              <div className="flex gap-2 ml-auto">
                {bulkLoading ? (
                  <Loader2 size={16} className="animate-spin text-white/40" />
                ) : (
                  <>
                    <button
                      onClick={() => handleBulk('approved')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-600/20 border border-green-500/30 text-green-400 text-xs font-bold hover:bg-green-600/30 transition-all"
                    >
                      <CheckCircle size={12} /> Duyệt ({selected.size})
                    </button>
                    <button
                      onClick={() => handleBulk('rejected')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600/20 border border-red-500/30 text-red-400 text-xs font-bold hover:bg-red-600/30 transition-all"
                    >
                      <XCircle size={12} /> Từ chối ({selected.size})
                    </button>
                    <button
                      onClick={() => handleBulk('hidden')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white/40 text-xs font-bold hover:text-white/60 transition-all"
                    >
                      <EyeOff size={12} /> Ẩn ({selected.size})
                    </button>
                  </>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Posts grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl bg-surface-100 animate-pulse aspect-square"
            />
          ))}
        </div>
      ) : displayedPosts.length === 0 ? (
        <div className="text-center py-20 card border-white/5 bg-white/[0.01]">
          <CheckCircle size={40} className="text-white/10 mx-auto mb-3" />
          <p className="text-white/40">
            {hideCsvPosts && posts.length > 0
              ? `Tất cả ${posts.length} bài đăng trên trang này là bài CSV và đang được ẩn.`
              : 'Không có bài đăng nào'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {displayedPosts.map((post) => {
              const img = post.generatedImages?.[0] || post.images?.[0]
              const isActing = actionLoading === post._id
              const isSelected = selected.has(post._id)
              const isCsvPost = Boolean(
                post.citedFrom ||
                post.sourceUrl ||
                post.externalId ||
                post.isExternalCsv ||
                post.authorId?.email?.endsWith('@picspy.ai')
              )
              return (
                <motion.div
                  key={post._id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`card overflow-hidden transition-all ${isSelected ? 'ring-2 ring-brand-500' : ''}`}
                >
                  {/* Thumbnail */}
                  <div
                    className="relative aspect-video bg-surface-100 cursor-pointer group/thumb overflow-hidden"
                    onClick={() => setPreviewModal(post)}
                  >
                    {(img?.thumbnailUrl || img?.url) && (
                      <img
                        src={getOptimizedWebpUrl(
                          img.thumbnailUrl || img.url,
                          400
                        )}
                        alt=""
                        className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    )}
                    {/* Hover preview indicator */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity duration-200">
                      <span className="text-[10px] font-bold text-white bg-black/60 px-2.5 py-1.5 rounded-xl border border-white/10 flex items-center gap-1 shadow-md">
                        <Eye size={12} /> Xem chi tiết
                      </span>
                    </div>
                    {/* Select checkbox */}
                    <button
                      onClick={() => toggleSelect(post._id)}
                      className="absolute top-2 left-2 w-6 h-6 rounded-lg bg-black/50 backdrop-blur-sm flex items-center justify-center border border-white/20 transition-all hover:border-brand-400"
                    >
                      {isSelected ? (
                        <Check size={13} className="text-brand-400" />
                      ) : (
                        <Square size={11} className="text-white/50" />
                      )}
                    </button>
                    <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
                      <StatusBadge status={post.status} />
                      {isCsvPost && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wide bg-violet-950/80 text-violet-300 border border-violet-500/40 backdrop-blur-sm flex items-center gap-1 shadow-sm">
                          <Bot size={10} className="text-violet-400" /> CSV AI
                        </span>
                      )}
                      {post.postType && (
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wide border backdrop-blur-sm ${
                            post.postType === 'ai'
                              ? 'bg-violet-900/60 text-violet-200 border-violet-500/30'
                              : post.postType === 'digital-raw'
                                ? 'bg-sky-900/60 text-sky-200 border-sky-500/30'
                                : 'bg-emerald-950/60 text-emerald-200 border-emerald-500/30'
                          }`}
                        >
                          {post.postType === 'ai'
                            ? '✦ AI'
                            : post.postType === 'digital-raw'
                              ? '📷 RAW'
                              : 'DIGITAL'}
                        </span>
                      )}
                    </div>
                    {post.isNSFW && (
                      <div className="absolute bottom-2 left-2">
                        <span className="bg-red-600/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                          NSFW
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      {post.authorId?.avatar ? (
                        <img
                          src={post.authorId.avatar}
                          className="w-7 h-7 rounded-full object-cover"
                          alt=""
                          onError={(e) => {
                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(post.authorId?.username || '')}&background=8b5cf6&color=fff`
                          }}
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-600 to-blue-500 flex items-center justify-center text-white text-xs font-bold">
                          {post.authorId?.username?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                      <span className="text-sm font-semibold text-white/80">
                        @{post.authorId?.username || 'unknown'}
                      </span>
                    </div>
                    {/* Caption — placeholder nếu không có text */}
                    <p
                      className="text-xs line-clamp-2 min-h-[2.5rem] flex items-center cursor-pointer hover:text-white transition-colors"
                      onClick={() => setPreviewModal(post)}
                    >
                      {post.caption ? (
                        <span className="text-white/50">{post.caption}</span>
                      ) : (
                        <span className="text-white/20 italic">
                          Không có tiêu đề
                        </span>
                      )}
                    </p>

                    {post.isRemix && post.parentPostId && (
                      <div className="text-[10px] text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2 py-1.5 rounded-lg flex items-center justify-between">
                        <span>
                          🌀 Remix từ{' '}
                          <b>
                            @
                            {typeof post.parentPostId === 'object'
                              ? post.parentPostId.authorId?.username ||
                                'unknown'
                              : 'unknown'}
                          </b>
                        </span>
                        <a
                          href={`/posts/${typeof post.parentPostId === 'object' ? post.parentPostId._id : post.parentPostId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-violet-300 hover:text-white underline font-semibold"
                        >
                          Xem bài gốc
                        </a>
                      </div>
                    )}

                    {post.rejectionReason && (
                      <p className="text-xs text-red-400/70 italic">
                        ⚠ {post.rejectionReason}
                      </p>
                    )}

                    {/* Stats display */}
                    <div className="flex items-center justify-between text-[10px] text-white/40 border-t border-white/5 pt-2 min-h-[1.75rem]">
                      <div className="flex items-center gap-2.5">
                        <span title="Lượt xem">
                          👁 {post.stats?.viewsCount || 0}
                        </span>
                        <span title="Lượt tải">
                          ⬇ {post.stats?.downloadsCount || 0}
                        </span>
                        <span title="Yêu thích">
                          ❤ {post.stats?.likesCount || 0}
                        </span>
                        <span title="Bookmarks">
                          🔖 {post.stats?.bookmarksCount || 0}
                        </span>
                      </div>
                      {post.requestedCategory && (
                        <span
                          className="px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-500/40 text-[9.5px] font-mono font-bold truncate max-w-[130px]"
                          title={`Đề xuất danh mục: "${post.requestedCategory}" (${post.requestedCategoryStatus || 'pending'})`}
                        >
                          🏷️ "{post.requestedCategory}"
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1.5 pt-1">
                      {post.status !== 'approved' && (
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleStatus(post._id, 'approved')}
                          disabled={isActing}
                          className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl bg-green-600/20 border border-green-500/30 text-green-400 hover:bg-green-600/30 transition-all text-xs font-semibold disabled:opacity-50"
                        >
                          <CheckCircle size={13} /> Duyệt
                        </motion.button>
                      )}
                      {post.status !== 'rejected' && (
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setRejectModal(post)}
                          disabled={isActing}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-red-600/20 border border-red-500/30 text-red-400 hover:bg-red-600/30 transition-all text-xs font-semibold disabled:opacity-50"
                        >
                          <XCircle size={13} /> Từ chối
                        </motion.button>
                      )}
                      {post.status !== 'hidden' && (
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleStatus(post._id, 'hidden')}
                          disabled={isActing}
                          className="flex items-center justify-center gap-1 py-2 px-2.5 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white/60 transition-all text-xs disabled:opacity-50"
                          title="Ẩn bài đăng"
                        >
                          <EyeOff size={13} />
                        </motion.button>
                      )}
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setBuffModal(post)
                          setBuffViews(0)
                          setBuffDownloads(0)
                          setBuffLikes(0)
                          setBuffBookmarks(0)
                        }}
                        disabled={isActing}
                        className="flex items-center justify-center gap-1 py-2 px-2.5 rounded-xl bg-yellow-600/10 border border-yellow-500/20 text-yellow-400 hover:bg-yellow-600/20 transition-all text-xs disabled:opacity-50"
                        title="Buff chỉ số"
                      >
                        <Zap size={13} />
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleDeletePost(post._id)}
                        disabled={isActing}
                        className="flex items-center justify-center gap-1 py-2 px-2.5 rounded-xl bg-red-600/10 border border-red-500/20 text-red-400 hover:bg-red-600/20 transition-all text-xs disabled:opacity-50"
                        title="Xóa vĩnh viễn"
                      >
                        <Trash2 size={13} />
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center">
          <button
            onClick={() => fetchPosts(false)}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <ChevronDown size={16} /> Tải thêm
          </button>
        </div>
      )}

      {/* Confirm Approve Custom Category Modal */}
      {catApproveModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[9999] animate-fade-in !mt-0">
          <div className="card p-6 max-w-lg w-full bg-[#0c0c14] border border-violet-500/40 shadow-2xl space-y-5 rounded-2xl relative overflow-hidden">
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <div className="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/40 flex items-center justify-center text-violet-300 flex-shrink-0">
                <Sparkles size={20} />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">
                  Yêu Cầu Danh Mục Tùy Chỉnh Từ Creator
                </h3>
                <p className="text-xs text-white/50">
                  Bài đăng này kèm đề xuất danh mục chưa có trong hệ thống
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center gap-3">
              <div className="w-14 h-14 rounded-lg bg-surface-100 overflow-hidden flex-shrink-0 relative border border-white/10">
                {catApproveModal.generatedImages?.[0]?.thumbnailUrl ||
                catApproveModal.generatedImages?.[0]?.url ? (
                  <img
                    src={getOptimizedWebpUrl(
                      catApproveModal.generatedImages[0].thumbnailUrl ||
                        catApproveModal.generatedImages[0].url,
                      120
                    )}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/20">
                    <Image size={18} />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-xs font-bold text-white truncate">
                  {catApproveModal.caption || 'Chưa có mô tả'}
                </p>
                <p className="text-[11px] text-white/50 flex items-center gap-1.5 flex-wrap">
                  <span>Creator:</span>
                  <strong className="text-violet-300">
                    @{catApproveModal.authorId?.username || 'user'}
                  </strong>
                  {catApproveModal.isExternal ? (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-bold tracking-wider font-mono">
                      CSV
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[9px] font-bold tracking-wider font-mono">
                      USER
                    </span>
                  )}
                </p>
                <div className="flex items-center gap-1.5 pt-0.5">
                  <span className="text-[10px] text-white/40">
                    Danh mục đề xuất:
                  </span>
                  <span className="px-2 py-0.5 rounded bg-violet-600/30 text-violet-200 border border-violet-500/40 font-mono font-bold text-xs">
                    "{catApproveModal.requestedCategory}"
                  </span>
                </div>
              </div>
            </div>

            <p className="text-xs text-white/70 leading-relaxed">
              Bài viết này có yêu cầu thêm Danh mục mới{' '}
              <strong className="text-violet-300">
                "{catApproveModal.requestedCategory}"
              </strong>
              . Bạn có cho phép tạo mới danh mục này vào hệ thống hay từ chối và
              chuyển bài viết về danh mục <strong>"Khác"</strong> trước khi xuất
              bản?
            </p>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                disabled={actionLoading === catApproveModal._id}
                onClick={() => handleApproveCategoryAndPost(catApproveModal)}
                className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs hover:brightness-110 transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950/50 cursor-pointer disabled:opacity-50"
              >
                {actionLoading === catApproveModal._id ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <CheckCircle size={14} />
                )}
                Chấp nhận & Tạo danh mục mới
              </button>
              <button
                disabled={actionLoading === catApproveModal._id}
                onClick={() =>
                  handleRejectCategoryAndApprovePost(catApproveModal)
                }
                className="flex-1 py-2.5 px-3 rounded-xl bg-amber-600/20 border border-amber-500/40 text-amber-300 font-bold text-xs hover:bg-amber-600/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {actionLoading === catApproveModal._id ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <XCircle size={14} />
                )}
                Từ chối & Gán vào "Khác"
              </button>
              <button
                disabled={actionLoading === catApproveModal._id}
                onClick={() => setCatApproveModal(null)}
                className="py-2.5 px-3 rounded-xl bg-white/5 border border-white/10 text-white/60 font-bold text-xs hover:bg-white/10 transition-all cursor-pointer"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Buff stats modal */}
      <AnimatePresence>
        {buffModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm !mt-0"
            onClick={(e) => e.target === e.currentTarget && setBuffModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9 }}
              className="card p-6 max-w-sm w-full space-y-4"
            >
              <div>
                <h3 className="font-bold text-lg text-white flex items-center gap-2">
                  <Zap size={18} className="text-yellow-400" /> Buff Chỉ Số Tác
                  Phẩm
                </h3>
                <p className="text-xs text-white/40 mt-1">
                  Cộng thêm số lượng ảo để thử nghiệm logic Trending
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-white/60 font-semibold block mb-1">
                    Cộng thêm lượt xem (Views)
                  </label>
                  <input
                    type="number"
                    className="input"
                    value={buffViews}
                    onChange={(e) =>
                      setBuffViews(Math.max(0, parseInt(e.target.value) || 0))
                    }
                  />
                </div>
                <div>
                  <label className="text-xs text-white/60 font-semibold block mb-1">
                    Cộng thêm lượt tải (Downloads)
                  </label>
                  <input
                    type="number"
                    className="input"
                    value={buffDownloads}
                    onChange={(e) =>
                      setBuffDownloads(
                        Math.max(0, parseInt(e.target.value) || 0)
                      )
                    }
                  />
                </div>
                <div>
                  <label className="text-xs text-white/60 font-semibold block mb-1">
                    Cộng thêm lượt tim (Likes)
                  </label>
                  <input
                    type="number"
                    className="input"
                    value={buffLikes}
                    onChange={(e) =>
                      setBuffLikes(Math.max(0, parseInt(e.target.value) || 0))
                    }
                  />
                </div>
                <div>
                  <label className="text-xs text-white/60 font-semibold block mb-1">
                    Cộng thêm bookmark
                  </label>
                  <input
                    type="number"
                    className="input"
                    value={buffBookmarks}
                    onChange={(e) =>
                      setBuffBookmarks(
                        Math.max(0, parseInt(e.target.value) || 0)
                      )
                    }
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setBuffModal(null)}
                  className="btn-secondary flex-1"
                  disabled={buffLoading}
                >
                  Hủy
                </button>
                <button
                  onClick={handleBuffStats}
                  disabled={buffLoading}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-yellow-600 hover:bg-yellow-500 text-white font-bold text-sm transition-colors flex items-center justify-center gap-1"
                >
                  {buffLoading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    'Xác nhận Buff'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reject modal */}
      <AnimatePresence>
        {rejectModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm !mt-0"
            onClick={(e) =>
              e.target === e.currentTarget && setRejectModal(null)
            }
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9 }}
              className="card p-6 max-w-sm w-full"
            >
              <h3 className="font-bold text-lg mb-1">Từ chối bài đăng</h3>
              <p className="text-sm text-white/40 mb-4">
                Nhập lý do từ chối (tùy chọn)
              </p>
              <textarea
                className="input resize-none mb-4"
                rows={3}
                placeholder="Ảnh vi phạm quy định, nội dung không phù hợp..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setRejectModal(null)
                    setRejectReason('')
                  }}
                  className="btn-secondary flex-1"
                >
                  Hủy
                </button>
                <button
                  onClick={() =>
                    handleStatus(rejectModal._id, 'rejected', rejectReason)
                  }
                  className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-colors"
                >
                  Xác nhận từ chối
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Post Preview Modal */}
      <AnimatePresence>
        {previewModal &&
          (() => {
            const resultImages = getResultImages(previewModal)
            return (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[10010] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm !mt-0"
                onClick={(e) =>
                  e.target === e.currentTarget && setPreviewModal(null)
                }
              >
                <motion.div
                  initial={{ scale: 0.95, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.95 }}
                  className="card overflow-hidden max-w-6xl w-full grid grid-cols-1 md:grid-cols-2 bg-[#121216] border border-white/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] rounded-2xl h-[760px] max-h-[92vh]"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Left Column: Image viewport with Tab Switcher & Slider */}
                  <div className="relative h-full bg-black/85 flex flex-col items-center justify-center border-r border-white/5 overflow-hidden group/left">
                    {/* Ambient glow background */}
                    {(() => {
                      const list =
                        previewTab === 'result'
                          ? resultImages
                          : previewModal.sourceImages || []
                      const activeImage = list[previewImgIndex]
                      return activeImage?.url ? (
                        <div
                          className="absolute inset-0 opacity-15 scale-110 pointer-events-none transition-all duration-500"
                          style={{
                            backgroundImage: `url(${activeImage.thumbnailUrl || activeImage.url})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            filter: 'blur(28px)',
                          }}
                        />
                      ) : null
                    })()}

                    {/* Image count badge in top right */}
                    {(() => {
                      const list =
                        previewTab === 'result'
                          ? resultImages
                          : previewModal.sourceImages || []
                      if (list.length <= 1) return null
                      return (
                        <div className="absolute top-4 right-4 z-10 px-2.5 py-1 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-bold text-white shadow-md flex items-center gap-1">
                          <Image size={11} className="text-white" />
                          <span>
                            {previewImgIndex + 1} / {list.length}
                          </span>
                        </div>
                      )
                    })()}
                    {/* Segmented Control / Tabs for Result vs Source (only if source images exist) */}
                    {previewModal.sourceImages &&
                      previewModal.sourceImages.length > 0 && (
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex p-1 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-xs font-semibold">
                          <button
                            onClick={() => {
                              setPreviewDirection(1)
                              setPreviewTab('result')
                              setPreviewImgIndex(0)
                            }}
                            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                              previewTab === 'result'
                                ? 'bg-brand-600 text-white shadow-sm'
                                : 'text-white/40 hover:text-white/80'
                            }`}
                          >
                            Kết quả ({resultImages.length})
                          </button>
                          <button
                            onClick={() => {
                              setPreviewDirection(1)
                              setPreviewTab('source')
                              setPreviewImgIndex(0)
                            }}
                            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                              previewTab === 'source'
                                ? 'bg-brand-600 text-white shadow-sm'
                                : 'text-white/40 hover:text-white/80'
                            }`}
                          >
                            Ảnh gốc ({previewModal.sourceImages.length})
                          </button>
                        </div>
                      )}

                    {/* Main Viewport */}
                    <div className="flex-1 w-full flex items-center justify-center relative overflow-hidden">
                      <AnimatePresence
                        initial={false}
                        custom={previewDirection}
                        mode="wait"
                      >
                        {(() => {
                          const list =
                            previewTab === 'result'
                              ? resultImages
                              : previewModal.sourceImages || []
                          const activeImage = list[previewImgIndex]

                          if (!activeImage?.url) {
                            return (
                              <motion.div
                                key="empty"
                                className="text-white/25 text-xs italic"
                              >
                                Không có hình ảnh
                              </motion.div>
                            )
                          }

                          return (
                            <motion.div
                              key={`${previewTab}-${previewImgIndex}`}
                              custom={previewDirection}
                              variants={previewSlideVariants}
                              initial="enter"
                              animate="center"
                              exit="exit"
                              transition={{
                                duration: 0.22,
                                ease: [0.22, 1, 0.36, 1],
                              }}
                              className="absolute inset-0 w-full h-full flex items-center justify-center p-4"
                            >
                              <div className="relative max-w-full max-h-full flex items-center justify-center select-none">
                                <img
                                  src={activeImage.url}
                                  alt=""
                                  className="max-w-full max-h-[660px] object-contain rounded-lg shadow-2xl border border-white/5"
                                  draggable={false}
                                />
                                {/* Image dimension & file info overlay in bottom center */}
                                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded bg-black/75 text-[10px] text-white/50 border border-white/5 backdrop-blur-sm whitespace-nowrap z-20">
                                  {activeImage.width && activeImage.height
                                    ? `${activeImage.width}x${activeImage.height}`
                                    : ''}
                                  {activeImage.fileSize
                                    ? ` · ${(activeImage.fileSize / 1024 / 1024).toFixed(2)} MB`
                                    : ''}
                                </div>
                              </div>
                            </motion.div>
                          )
                        })()}
                      </AnimatePresence>
                    </div>

                    {/* Left/Right arrows if current tab has multiple images */}
                    {(() => {
                      const list =
                        previewTab === 'result'
                          ? resultImages
                          : previewModal.sourceImages || []
                      if (list.length <= 1) return null
                      return (
                        <>
                          <button
                            onClick={() => {
                              setPreviewDirection(-1)
                              setPreviewImgIndex((prev) =>
                                prev === 0 ? list.length - 1 : prev - 1
                              )
                            }}
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-black/80 transition-all cursor-pointer opacity-0 group-hover/left:opacity-100 z-30"
                          >
                            <ChevronLeft size={18} />
                          </button>
                          <button
                            onClick={() => {
                              setPreviewDirection(1)
                              setPreviewImgIndex((prev) =>
                                prev === list.length - 1 ? 0 : prev + 1
                              )
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-black/80 transition-all cursor-pointer opacity-0 group-hover/left:opacity-100 z-30"
                          >
                            <ChevronRight size={18} />
                          </button>
                          {/* Pagination dots */}
                          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1 z-10 bg-black/45 px-2 py-1 rounded-full border border-white/5">
                            {list.map((_, idx) => (
                              <button
                                key={idx}
                                onClick={() => {
                                  setPreviewDirection(
                                    idx > previewImgIndex ? 1 : -1
                                  )
                                  setPreviewImgIndex(idx)
                                }}
                                className={`w-1.5 h-1.5 rounded-full transition-all cursor-pointer ${
                                  previewImgIndex === idx
                                    ? 'bg-brand-500 scale-125'
                                    : 'bg-white/20'
                                }`}
                              />
                            ))}
                          </div>
                        </>
                      )
                    })()}

                    {previewModal.isNSFW && (
                      <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-red-600/90 text-white text-[10px] font-bold shadow-md z-10">
                        NSFW
                      </span>
                    )}
                  </div>

                  {/* Right Column: Information & Metadata */}
                  <div className="flex flex-col h-full overflow-y-auto p-6 space-y-5 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
                    {/* Author & Header */}
                    <div className="flex items-center justify-between border-b border-white/5 pb-4">
                      <div className="flex items-center gap-3">
                        {previewModal.authorId?.avatar ? (
                          <img
                            src={previewModal.authorId.avatar}
                            className="w-9 h-9 rounded-full object-cover ring-1 ring-white/10"
                            alt=""
                            onError={(e) => {
                              e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(previewModal.authorId?.username || '')}&background=8b5cf6&color=fff`
                            }}
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-600 to-blue-500 flex items-center justify-center text-white text-sm font-bold">
                            {previewModal.authorId?.username?.[0]?.toUpperCase() ||
                              '?'}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-bold text-white leading-tight">
                            {previewModal.authorId?.displayName ||
                              previewModal.authorId?.username}
                          </p>
                          <p className="text-[11px] text-white/40">
                            @{previewModal.authorId?.username}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setPreviewModal(null)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors cursor-pointer"
                      >
                        <X size={15} />
                      </button>
                    </div>

                    {/* Caption */}
                    <div className="space-y-1">
                      <h3 className="text-xs font-bold text-white/35 uppercase tracking-wider">
                        Tiêu đề / Caption
                      </h3>
                      <p className="text-sm text-white/95 font-medium leading-relaxed">
                        {previewModal.caption || (
                          <span className="text-white/20 italic">
                            Không có tiêu đề
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Tags */}
                    {previewModal.tags && previewModal.tags.length > 0 && (
                      <div className="space-y-1.5">
                        <h3 className="text-xs font-bold text-white/35 uppercase tracking-wider">
                          Thẻ (Tags)
                        </h3>
                        <div className="flex flex-wrap gap-1.5">
                          {previewModal.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-md bg-white/5 border border-white/8 text-[11px] text-white/60 font-semibold hover:border-white/20 transition-colors"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Details grid */}
                    <div className="grid grid-cols-2 gap-4 bg-white/[0.01] border border-white/5 rounded-xl p-4 text-xs">
                      <div>
                        <span className="text-white/40 block mb-0.5">
                          Trạng thái
                        </span>
                        <StatusBadge status={previewModal.status} />
                      </div>
                      <div>
                        <span className="text-white/40 block mb-0.5">
                          Loại bài đăng
                        </span>
                        <span className="font-bold text-brand-300">
                          {previewModal.postType === 'ai'
                            ? '✦ AI'
                            : previewModal.postType === 'digital-raw'
                              ? '📷 RAW'
                              : 'DIGITAL'}
                          {resultImages.length > 1 &&
                            ` (Bộ sưu tập ${resultImages.length} ảnh)`}
                        </span>
                      </div>
                      <div>
                        <span className="text-white/40 block mb-0.5">
                          Premium / Giá bán
                        </span>
                        <span
                          className={
                            previewModal.isPremium
                              ? 'text-amber-400 font-bold'
                              : 'text-white/40'
                          }
                        >
                          {previewModal.isPremium
                            ? `Có (${(previewModal.priceInVnd || 0).toLocaleString('vi-VN')}đ)`
                            : 'Không'}
                        </span>
                      </div>
                      <div>
                        <span className="text-white/40 block mb-0.5">
                          Danh mục
                        </span>
                        <span className="text-white/80 font-semibold">
                          {previewModal.category || 'Khác'}
                        </span>
                      </div>
                      <div>
                        <span className="text-white/40 block mb-0.5">
                          Ngày đăng
                        </span>
                        <span className="text-white/80 font-semibold">
                          {new Date(previewModal.createdAt).toLocaleDateString(
                            'vi-VN',
                            {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            }
                          )}
                        </span>
                      </div>
                      <div>
                        <span className="text-white/40 block mb-0.5">
                          Số lần bị report
                        </span>
                        <span
                          className={`font-bold ${previewModal.reportsCount > 0 ? 'text-red-400' : 'text-white/40'}`}
                        >
                          🚩 {previewModal.reportsCount || 0} lần
                        </span>
                      </div>
                      {previewModal.publishedAt && (
                        <div>
                          <span className="text-white/40 block mb-0.5">
                            📅 Ngày xuất bản gốc
                          </span>
                          <span className="text-white/70 font-semibold text-[11px]">
                            {new Date(
                              previewModal.publishedAt
                            ).toLocaleDateString('vi-VN', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                      )}
                      {previewModal.originalLanguage &&
                        previewModal.originalLanguage !== 'EN' && (
                          <div>
                            <span className="text-white/40 block mb-0.5">
                              🌐 Ngôn ngữ gốc
                            </span>
                            <span className="text-white/70 font-semibold text-[11px]">
                              {previewModal.originalLanguage}
                            </span>
                          </div>
                        )}
                    </div>

                    {/* Stats */}
                    <div className="space-y-1.5">
                      <h3 className="text-xs font-bold text-white/35 uppercase tracking-wider">
                        Chỉ số tương tác
                      </h3>
                      <div
                        className="flex items-center gap-5"
                        style={{ fontFamily: 'Outfit, sans-serif' }}
                      >
                        <div className="flex items-center gap-1.5 text-white/35 text-xs">
                          <span className="flex items-center gap-1 text-white/60">
                            👁️ {previewModal.stats?.viewsCount || 0}
                          </span>
                          <span>lượt xem</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-white/35 text-xs">
                          <span className="flex items-center gap-1 text-white/60">
                            📥 {previewModal.stats?.downloadsCount || 0}
                          </span>
                          <span>lượt tải</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-white/35 text-xs">
                          <span className="flex items-center gap-1 text-white/60">
                            ❤️ {previewModal.stats?.likesCount || 0}
                          </span>
                          <span>lượt thích</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-white/35 text-xs">
                          <span className="flex items-center gap-1 text-white/60">
                            📌 {previewModal.stats?.bookmarksCount || 0}
                          </span>
                          <span>lưu lại</span>
                        </div>
                      </div>
                      {/* BaseStats from original CSV source */}
                      {previewModal.baseStats &&
                        (previewModal.baseStats.likesCount > 0 ||
                          previewModal.baseStats.viewsCount > 0) && (
                          <div className="mt-1.5 p-2.5 rounded-lg bg-violet-950/30 border border-violet-500/20 text-[10px]">
                            <span className="text-violet-400 font-bold uppercase tracking-wide block mb-1">
                              📊 Nguồn gốc (CSV)
                            </span>
                            <div className="flex gap-3 text-white/50">
                              <span>
                                👁{' '}
                                {previewModal.baseStats.viewsCount?.toLocaleString() ||
                                  0}
                              </span>
                              <span>
                                ❤{' '}
                                {previewModal.baseStats.likesCount?.toLocaleString() ||
                                  0}
                              </span>
                              <span>
                                💬{' '}
                                {previewModal.baseStats.commentsCount?.toLocaleString() ||
                                  0}
                              </span>
                              <span>
                                ↗{' '}
                                {previewModal.baseStats.sharesCount?.toLocaleString() ||
                                  0}
                              </span>
                              <span>
                                🔖{' '}
                                {previewModal.baseStats.bookmarksCount?.toLocaleString() ||
                                  0}
                              </span>
                            </div>
                          </div>
                        )}
                    </div>

                    {/* EXIF panel data (Camera & Shot parameters) */}
                    <ExifPanel post={previewModal} compact={true} />

                    {/* Prompt details (AI parameter panel) */}
                    {previewModal.postType === 'ai' && previewModal.prompt && (
                      <div className="space-y-2 border-t border-white/5 pt-4">
                        <h3 className="text-xs font-bold text-white/35 uppercase tracking-wider">
                          Thông số tạo ảnh AI
                        </h3>
                        {previewModal.aiTool && (
                          <div className="flex items-center gap-1.5 text-[11px] text-white/60">
                            <span>Công cụ:</span>
                            <span className="px-2 py-0.5 rounded bg-violet-600/10 border border-violet-500/20 text-violet-400 font-bold">
                              {previewModal.aiTool}
                              {previewModal.aiModel
                                ? ` (${previewModal.aiModel})`
                                : ''}
                            </span>
                          </div>
                        )}
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-white/30 uppercase">
                            Prompt:
                          </p>
                          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] text-white/80 font-mono leading-relaxed max-h-[160px] overflow-y-auto scrollbar-thin select-all">
                            {previewModal.prompt}
                          </div>
                        </div>
                        {previewModal.negativePrompt && (
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-white/30 uppercase">
                              Negative Prompt:
                            </p>
                            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] text-white/80 font-mono leading-relaxed max-h-[100px] overflow-y-auto scrollbar-thin select-all">
                              {previewModal.negativePrompt}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Actions footer */}
                    <div className="flex gap-2 border-t border-white/5 pt-5 mt-auto">
                      {previewModal.status !== 'approved' && (
                        <button
                          onClick={() => {
                            handleStatus(previewModal._id, 'approved')
                            setPreviewModal(null)
                          }}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-green-600 border border-green-500/30 text-white hover:bg-green-500 transition-all text-xs font-bold cursor-pointer"
                        >
                          <CheckCircle size={13} /> Duyệt
                        </button>
                      )}
                      {previewModal.status !== 'rejected' && (
                        <button
                          onClick={() => {
                            setRejectModal(previewModal)
                            setPreviewModal(null)
                          }}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-red-600 border border-red-500/30 text-white hover:bg-red-500 transition-all text-xs font-bold cursor-pointer"
                        >
                          <XCircle size={13} /> Từ chối
                        </button>
                      )}
                      {previewModal.status !== 'hidden' && (
                        <button
                          onClick={() => {
                            handleStatus(previewModal._id, 'hidden')
                            setPreviewModal(null)
                          }}
                          className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white transition-all text-xs font-bold cursor-pointer"
                          title="Ẩn bài viết"
                        >
                          <EyeOff size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setBuffModal(previewModal)
                          setBuffViews(0)
                          setBuffDownloads(0)
                          setBuffLikes(0)
                          setBuffBookmarks(0)
                          setPreviewModal(null)
                        }}
                        className="px-3 py-2.5 rounded-xl bg-yellow-600/15 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-600/25 transition-all text-xs font-bold cursor-pointer flex items-center justify-center gap-1"
                        title="Buff chỉ số"
                      >
                        <Zap size={13} /> Buff
                      </button>
                      <button
                        onClick={() => {
                          handleDeletePost(previewModal._id)
                          setPreviewModal(null)
                        }}
                        className="px-3 py-2.5 rounded-xl bg-red-600/10 border border-red-500/20 text-red-400 hover:bg-red-600/20 transition-all text-xs font-bold cursor-pointer"
                        title="Xóa bài viết"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {previewModal.requestedCategory && (
                      <div className="mt-3 p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/40 flex items-center justify-between text-xs font-mono shadow-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-amber-400 font-bold">
                            🏷️ Đề xuất danh mục mới:
                          </span>
                          <span className="text-amber-200 font-bold">
                            "{previewModal.requestedCategory}"
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-900/60 text-amber-300 border border-amber-500/30">
                          {previewModal.requestedCategoryStatus || 'pending'}
                        </span>
                      </div>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )
          })()}
      </AnimatePresence>

      {/* CSV Import Modal */}
      <CsvImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onSuccess={() => fetchPosts(true)}
        setPreviewModal={setPreviewModal}
      />
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// TAB: USERS
// ══════════════════════════════════════════════════════════════════
const TIER_META = {
  free: {
    label: 'Miễn phí',
    color: '#9ca3af',
    bg: 'rgba(156,163,175,0.12)',
    border: 'rgba(156,163,175,0.25)',
    icon: '⭕',
  },
  founder: {
    label: "Founder's",
    color: '#d97706',
    bg: 'rgba(217,119,6,0.12)',
    border: 'rgba(217,119,6,0.3)',
    icon: '⭐',
  },
  pro: {
    label: 'Pro',
    color: '#7986eb',
    bg: 'rgba(121,134,235,0.12)',
    border: 'rgba(121,134,235,0.3)',
    icon: '💎',
  },
  ultimate: {
    label: 'Ultimate',
    color: '#06b6d4',
    bg: 'rgba(6,182,212,0.12)',
    border: 'rgba(6,182,212,0.3)',
    icon: '👑',
  },
}

const SORT_OPTIONS = [
  { value: 'default', label: 'Mặc định (Gần đây)', icon: Clock },
  { value: 'alphabetical', label: 'Tên A-Z', icon: ArrowUpDown },
  { value: 'alphabetical-desc', label: 'Tên Z-A', icon: ArrowUpDown },
  { value: 'createdAt', label: 'Ngày tạo mới nhất', icon: Calendar },
  { value: 'new-subscribers', label: 'Đăng ký gói mới nhất', icon: Zap },
  { value: 'sub-expiring', label: 'Gói sắp hết hạn', icon: Hourglass },
  { value: 'most-posts', label: 'Nhiều bài viết nhất', icon: Image },
  { value: 'most-followers', label: 'Nhiều followers nhất', icon: Users },
  { value: 'most-likes', label: 'Nhiều tim nhất', icon: Heart },
  { value: 'highest-revenue', label: 'Thu nhập cao nhất', icon: Coins },
]

const UsersTab = () => {
  const [users, setUsers] = useState([])
  const [totalUsersCount, setTotalUsersCount] = useState(0) // count for current active filter
  const [allUsersTotal, setAllUsersTotal] = useState(0) // always = grand total (no filter)
  const [missingAvatarCount, setMissingAvatarCount] = useState(0)
  const [orphanUsersCount, setOrphanUsersCount] = useState(0)
  const [avatarFilter, setAvatarFilter] = useState('all') // 'all' | 'missing' | 'valid' | 'orphan'
  const [brokenAvatars, setBrokenAvatars] = useState({})
  const [loading, setLoading] = useState(true)
  const [cleanupLoading, setCleanupLoading] = useState(false)
  const [avatarUploadLoading, setAvatarUploadLoading] = useState(false)
  const avatarInputRef = useRef(null)

  // Avatars using ui-avatars.com (fallback text initials) or dicebear.com (AI bot) or empty strings are treated as "Thiếu/Lỗi Avatar"
  const BROKEN_AVATAR_KEYWORDS = ['ui-avatars.com', 'dicebear.com']
  const isBrokenOrMissingAvatar = (u) => {
    if (!u?.avatar || u.avatar.trim() === '') return true
    if (BROKEN_AVATAR_KEYWORDS.some((k) => u.avatar.includes(k))) return true
    if (brokenAvatars[u._id]) return true
    return false
  }
  const [search, setSearch] = useState('')
  const [hasMore, setHasMore] = useState(false)
  const [cursor, setCursor] = useState(null)
  const [coinModal, setCoinModal] = useState(null)
  const [coinAmount, setCoinAmount] = useState('')
  const [coinLoading, setCoinLoading] = useState(false)
  const [vndModal, setVndModal] = useState(null)
  const [vndAmount, setVndAmount] = useState('')
  const [vndDescription, setVndDescription] = useState('')
  const [vndLoading, setVndLoading] = useState(false)
  const [tierModal, setTierModal] = useState(null)
  const [tierLoading, setTierLoading] = useState(false)
  const [selectedTier, setSelectedTier] = useState('free')
  // Ban modal
  const [banModal, setBanModal] = useState(null) // { user, ban: true/false }
  const [banReason, setBanReason] = useState('')
  const [banDuration, setBanDuration] = useState(0) // 0 = vĩnh viễn
  const [banLoading, setBanLoading] = useState(false)
  // Role modal
  const [roleModal, setRoleModal] = useState(null) // user
  const [selectedRole, setSelectedRole] = useState('user')
  const [roleLoading, setRoleLoading] = useState(false)
  // Detail modal
  const [detailModal, setDetailModal] = useState(null)

  // CRUD states
  const [createModal, setCreateModal] = useState(false)
  const [createUserForm, setCreateUserForm] = useState({
    username: '',
    email: '',
    displayName: '',
    password: '',
    role: 'user',
    subscriptionTier: 'free',
  })
  const [createUserLoading, setCreateUserLoading] = useState(false)

  const [editModal, setEditModal] = useState(null)
  const [editUserForm, setEditUserForm] = useState({
    username: '',
    email: '',
    displayName: '',
    role: 'user',
    subscriptionTier: 'free',
    tokenBalance: 0,
    vndBalance: 0,
  })
  const [editUserLoading, setEditUserLoading] = useState(false)

  const currentAdminId = useAuthStore((s) => s.user?._id)
  const [sortBy, setSortBy] = useState('default')
  const [page, setPage] = useState(1)
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false)
  const [hideAiUsers, setHideAiUsers] = useState(() => {
    try {
      return localStorage.getItem('picspy_admin_hide_csv_users') === 'true'
    } catch {
      return false
    }
  })

  const toggleHideAiUsers = () => {
    setHideAiUsers((prev) => {
      const next = !prev
      try {
        localStorage.setItem('picspy_admin_hide_csv_users', String(next))
      } catch {
        // Suppress localStorage exception if disabled
      }
      return next
    })
  }

  const isAiUser = (u) =>
    u?.email?.endsWith('@picspy.ai') || u?.username?.startsWith('_')

  const renderDynamicBadge = (user) => {
    if (sortBy === 'createdAt') {
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-white/60 flex items-center gap-1">
          <Calendar size={11} className="text-violet-400" />
          Tạo ngày:{' '}
          {user.createdAt
            ? new Date(user.createdAt).toLocaleDateString('vi-VN')
            : 'N/A'}
        </span>
      )
    }
    if (sortBy === 'new-subscribers') {
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-600/10 border border-amber-500/20 text-amber-400 flex items-center gap-1 font-bold">
          <Zap size={11} className="text-amber-400" />
          Gói: {TIER_META[user.subscriptionTier || 'free']?.label} (Mới)
        </span>
      )
    }
    if (sortBy === 'sub-expiring') {
      if (!user.subscriptionExpiry) return null
      const daysLeft = Math.max(
        0,
        Math.ceil(
          (new Date(user.subscriptionExpiry) - new Date()) /
            (1000 * 60 * 60 * 24)
        )
      )
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-md bg-red-600/10 border border-red-500/20 text-red-400 flex items-center gap-1 font-bold">
          <Hourglass size={11} className="text-red-400" />
          Hết hạn:{' '}
          {new Date(user.subscriptionExpiry).toLocaleDateString('vi-VN')} (
          {daysLeft} ngày còn lại)
        </span>
      )
    }
    if (sortBy === 'most-posts') {
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center gap-1 font-bold">
          <Image size={11} className="text-blue-400" />
          {user.stats?.postsCount || 0} bài đăng
        </span>
      )
    }
    if (sortBy === 'most-followers') {
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-1 font-bold">
          <Users size={11} className="text-emerald-400" />
          {user.stats?.followersCount || 0} followers
        </span>
      )
    }
    if (sortBy === 'most-likes') {
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-md bg-red-600/10 border border-red-500/20 text-red-400 flex items-center gap-1 font-bold">
          <Heart size={11} className="text-red-400 fill-red-400" />
          {user.stats?.totalLikes || 0} yêu thích
        </span>
      )
    }
    if (sortBy === 'highest-revenue') {
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-md bg-yellow-600/10 border border-yellow-500/20 text-yellow-400 flex items-center gap-1 font-bold">
          <Coins size={11} className="text-yellow-400" />
          Doanh thu: {(user.totalEarned || 0).toLocaleString('vi-VN')}đ
        </span>
      )
    }
    return null
  }

  const fetchUsers = useCallback(
    async (reset = false) => {
      const isCustomSort = sortBy && sortBy !== 'default'
      if (reset) {
        setLoading(true)
        setCursor(null)
        setPage(1)
      }
      try {
        // 'missing' and 'orphan' both load all at once — no pagination
        const isLoadAllMode =
          avatarFilter === 'missing' || avatarFilter === 'orphan'
        const params = { limit: isLoadAllMode ? 'all' : 20 }
        if (isCustomSort && !isLoadAllMode) {
          params.sortBy = sortBy
          params.page = reset ? 1 : page + 1
        } else {
          if (!reset && cursor && !isLoadAllMode) params.cursor = cursor
        }
        if (avatarFilter !== 'all') {
          params.avatarStatus = avatarFilter
        }
        if (search.trim()) params.search = search
        const { data } = await api.get('/admin/users', { params })
        setUsers(reset ? data.users : (u) => [...u, ...data.users])
        if (data.totalUsers !== undefined) {
          setTotalUsersCount(data.totalUsers)
        }
        if (data.allUsersTotal !== undefined) {
          setAllUsersTotal(data.allUsersTotal)
        }
        if (data.missingAvatarCount !== undefined) {
          setMissingAvatarCount(data.missingAvatarCount)
        }
        if (data.orphanUsersCount !== undefined) {
          setOrphanUsersCount(data.orphanUsersCount)
        }
        setHasMore(isLoadAllMode ? false : data.pagination.hasMore)

        if (isCustomSort && !isLoadAllMode) {
          setPage(reset ? 1 : page + 1)
        } else {
          setCursor(data.pagination.nextCursor)
        }
      } catch {
        toast.error('Không thể tải users')
      } finally {
        setLoading(false)
      }
    },
    [search, cursor, sortBy, page, avatarFilter]
  )

  const handleCleanupOrphans = async () => {
    const ok = window.confirm(
      `Hiện có ${orphanUsersCount} tài khoản Tác giả CSV mồ côi (không có bài viết nào, do đã import rồi hoàn tác xóa bài).\n\nThao tác này sẽ xóa vĩnh viễn các tài khoản đó.\n\nBạn có chắc muốn tiếp tục?`
    )
    if (!ok) return
    setCleanupLoading(true)
    try {
      const { data } = await api.post('/admin/users/cleanup-orphans')
      toast.success(data.message)
      setAvatarFilter('all')
      fetchUsers(true)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi dọn dẹp user')
    } finally {
      setCleanupLoading(false)
    }
  }

  const handleAvatarUpload = async (userId, file) => {
    if (!file) return
    setAvatarUploadLoading(true)
    try {
      const formData = new FormData()
      formData.append('avatar', file)
      const { data } = await api.post(
        `/admin/users/${userId}/avatar`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      )
      toast.success(data.message || 'Đã cập nhật avatar!')
      // Update locally
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, avatar: data.avatar } : u))
      )
      // Also update detailModal if open for this user
      setDetailModal((prev) =>
        prev?._id === userId ? { ...prev, avatar: data.avatar } : prev
      )
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi upload avatar')
    } finally {
      setAvatarUploadLoading(false)
    }
  }

  useEffect(() => {
    const t = setTimeout(() => fetchUsers(true), 400)
    return () => clearTimeout(t)
  }, [search]) // eslint-disable-line

  useEffect(() => {
    fetchUsers(true)
  }, [sortBy, avatarFilter]) // eslint-disable-line

  const scrollLockRef = useRef(null)
  const sortDropdownRef = useRef(null)

  useEffect(() => {
    const clickOutsideSort = (e) => {
      if (
        sortDropdownRef.current &&
        !sortDropdownRef.current.contains(e.target)
      ) {
        setIsSortDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', clickOutsideSort)
    return () => document.removeEventListener('mousedown', clickOutsideSort)
  }, [])

  useEffect(() => {
    const isAnyModalOpen = !!(
      detailModal ||
      coinModal ||
      vndModal ||
      tierModal ||
      banModal ||
      roleModal ||
      createModal ||
      editModal
    )
    const body = document.body

    if (isAnyModalOpen) {
      if (!scrollLockRef.current) {
        const scrollY = window.scrollY
        const lockedWidth = body.getBoundingClientRect().width
        const prev = {
          position: body.style.position,
          top: body.style.top,
          width: body.style.width,
          scrollY,
        }
        scrollLockRef.current = prev
        body.style.position = 'fixed'
        body.style.top = `-${scrollY}px`
        body.style.width = `${lockedWidth}px`
      }
    } else {
      if (scrollLockRef.current) {
        const prev = scrollLockRef.current
        body.style.position = prev.position
        body.style.top = prev.top
        body.style.width = prev.width
        scrollLockRef.current = null
        window.scrollTo({ top: prev.scrollY, behavior: 'instant' })
      }
    }

    return () => {
      if (scrollLockRef.current) {
        const prev = scrollLockRef.current
        body.style.position = prev.position
        body.style.top = prev.top
        body.style.width = prev.width
        window.scrollTo({ top: prev.scrollY, behavior: 'instant' })
      }
    }
  }, [
    !!detailModal,
    !!coinModal,
    !!vndModal,
    !!tierModal,
    !!banModal,
    !!roleModal,
    !!createModal,
    !!editModal,
  ])

  const handleAdjustCoins = async () => {
    const amount = parseInt(coinAmount)
    if (isNaN(amount) || amount === 0) {
      toast.error('Nhập số xu hợp lệ')
      return
    }
    setCoinLoading(true)
    try {
      const { data } = await api.post(`/admin/users/${coinModal._id}/tokens`, {
        amount,
        reason: 'Admin nạp token',
      })
      toast.success(data.message)
      setUsers((prev) =>
        prev.map((u) =>
          u._id === coinModal._id
            ? { ...u, tokenBalance: data.tokenBalance }
            : u
        )
      )
      if (coinModal._id === currentAdminId) window.location.reload()
      setCoinModal(null)
      setCoinAmount('')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi nạp xu')
    } finally {
      setCoinLoading(false)
    }
  }

  const handleAdjustVnd = async () => {
    const amount = parseInt(vndAmount)
    if (isNaN(amount) || amount === 0) {
      toast.error('Nhập số tiền hợp lệ')
      return
    }
    setVndLoading(true)
    try {
      const { data } = await api.post(`/admin/users/${vndModal._id}/deposit`, {
        amount,
        description: vndDescription || 'Admin điều chỉnh ví VNĐ',
      })
      toast.success(data.message)
      setUsers((prev) =>
        prev.map((u) =>
          u._id === vndModal._id ? { ...u, vndBalance: data.vndBalance } : u
        )
      )
      if (vndModal._id === currentAdminId) window.location.reload()
      setVndModal(null)
      setVndAmount('')
      setVndDescription('')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi điều chỉnh ví')
    } finally {
      setVndLoading(false)
    }
  }

  const openBanModal = (user, ban) => {
    setBanModal({ user, ban })
    setBanReason('')
    setBanDuration(0)
  }

  const handleBan = async () => {
    if (!banModal) return
    const { user, ban } = banModal
    setBanLoading(true)
    try {
      const { data } = await api.patch(`/admin/users/${user._id}/ban`, {
        ban,
        reason: banReason.trim() || undefined,
        banDurationDays: banDuration > 0 ? banDuration : undefined,
      })
      setUsers((prev) =>
        prev.map((u) =>
          u._id === user._id
            ? { ...u, isBanned: data.isBanned, banReason: data.banReason }
            : u
        )
      )
      toast.success(data.message)
      setBanModal(null)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi ban')
    } finally {
      setBanLoading(false)
    }
  }

  const openRoleModal = (user) => {
    setSelectedRole(user.role || 'user')
    setRoleModal(user)
  }

  const handleSetRole = async () => {
    if (!roleModal) return
    setRoleLoading(true)
    try {
      const { data } = await api.patch(`/admin/users/${roleModal._id}/role`, {
        role: selectedRole,
      })
      toast.success(data.message)
      setUsers((prev) =>
        prev.map((u) =>
          u._id === roleModal._id ? { ...u, role: data.role } : u
        )
      )
      setRoleModal(null)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi đổi role')
    } finally {
      setRoleLoading(false)
    }
  }

  const openTierModal = (user) => {
    setSelectedTier(user.subscriptionTier || 'free')
    setTierModal(user)
  }

  const handleChangeTier = async () => {
    if (!tierModal) return
    setTierLoading(true)
    try {
      const { data } = await api.patch(`/admin/users/${tierModal._id}/tier`, {
        tier: selectedTier,
        expireInDays: selectedTier === 'free' ? 0 : 365,
      })
      toast.success(data.message)
      setUsers((prev) =>
        prev.map((u) =>
          u._id === tierModal._id
            ? { ...u, subscriptionTier: data.subscriptionTier }
            : u
        )
      )
      // Nếu admin tự đổi tier của mình → reload để update navbar token badge
      if (tierModal._id === currentAdminId) window.location.reload()
      setTierModal(null)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi đổi tier')
    } finally {
      setTierLoading(false)
    }
  }

  const handleCreateUser = async (e) => {
    e.preventDefault()
    setCreateUserLoading(true)
    try {
      const { data } = await api.post('/admin/users', createUserForm)
      toast.success(data.message)
      setCreateModal(false)
      setCreateUserForm({
        username: '',
        email: '',
        displayName: '',
        password: '',
        role: 'user',
        subscriptionTier: 'free',
      })
      fetchUsers(true)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi tạo user')
    } finally {
      setCreateUserLoading(false)
    }
  }

  const handleEditUser = async (e) => {
    e.preventDefault()
    setEditUserLoading(true)
    try {
      const { data } = await api.put(
        `/admin/users/${editModal._id}`,
        editUserForm
      )
      toast.success(data.message)
      setEditModal(null)
      // Cập nhật danh sách user
      setUsers((prev) =>
        prev.map((u) => (u._id === editModal._id ? data.user : u))
      )
      // Cập nhật detail modal nếu đang xem
      if (detailModal && detailModal._id === editModal._id) {
        setDetailModal(data.user)
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi chỉnh sửa user')
    } finally {
      setEditUserLoading(false)
    }
  }

  const handleDeleteUser = async (user) => {
    const confirm = window.confirm(
      `Bạn có chắc chắn muốn XÓA VĨNH VIỄN tài khoản @${user.username} và mọi bài đăng liên quan không? Hành động này không thể hoàn tác!`
    )
    if (!confirm) return
    try {
      const { data } = await api.delete(`/admin/users/${user._id}`)
      toast.success(data.message)
      setDetailModal(null)
      setEditModal(null)
      setUsers((prev) => prev.filter((u) => u._id !== user._id))
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi xóa user')
    }
  }

  const activeSort =
    SORT_OPTIONS.find((opt) => opt.value === sortBy) || SORT_OPTIONS[0]
  const ActiveIcon = activeSort.icon

  return (
    <div className="space-y-4">
      {/* Top Header Bar: Total Count & Avatar Filter Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-violet-600/20 text-violet-400 border border-violet-500/30">
            <Users size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Quản lý Người dùng
              <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 font-mono border border-violet-500/30">
                Tổng:{' '}
                {(
                  allUsersTotal ||
                  totalUsersCount ||
                  users.length
                ).toLocaleString()}{' '}
                Users
              </span>
            </h3>
            <p className="text-xs text-white/40">
              Danh sách tài khoản thành viên và tác giả ảnh trên hệ thống
              Picspy.
            </p>
          </div>
        </div>

        {/* Avatar Filter Switcher */}
        <div className="flex items-center flex-wrap gap-1 bg-white/5 p-1 rounded-xl border border-white/10 text-xs">
          <button
            onClick={() => setAvatarFilter('all')}
            className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
              avatarFilter === 'all'
                ? 'bg-violet-600 text-white shadow-md'
                : 'text-white/40 hover:text-white'
            }`}
          >
            Tất cả (
            {(
              allUsersTotal ||
              totalUsersCount ||
              users.length
            ).toLocaleString()}
            )
          </button>
          <button
            onClick={() => setAvatarFilter('missing')}
            className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              avatarFilter === 'missing'
                ? 'bg-amber-500 text-white shadow-md shadow-amber-900/40'
                : 'text-white/40 hover:text-white'
            }`}
          >
            <AlertTriangle size={12} />
            <span>Thiếu/Lỗi Avatar</span>
            {missingAvatarCount > 0 && (
              <span className="px-1.5 rounded-full bg-black/40 text-[10px] font-mono tabular-nums">
                {missingAvatarCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setAvatarFilter('orphan')}
            className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              avatarFilter === 'orphan'
                ? 'bg-red-600 text-white shadow-md shadow-red-900/40'
                : 'text-white/40 hover:text-white'
            }`}
          >
            <Bot size={12} />
            <span>Mồ Côi</span>
            {orphanUsersCount > 0 && (
              <span className="px-1.5 rounded-full bg-black/40 text-[10px] font-mono tabular-nums">
                {orphanUsersCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setAvatarFilter('valid')}
            className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              avatarFilter === 'valid'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-white/40 hover:text-white'
            }`}
          >
            <span>Có Avatar</span>
            {avatarFilter === 'valid' && totalUsersCount > 0 && (
              <span className="px-1.5 rounded-full bg-black/40 text-[10px] font-mono tabular-nums">
                {totalUsersCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
          />
          <input
            type="text"
            className="input pl-10 text-sm"
            placeholder="Tìm username, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {/* Custom sorting dropdown menu */}
          <div className="relative" ref={sortDropdownRef}>
            <button
              onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
              className="input text-xs py-2 px-3.5 flex items-center justify-between gap-2.5 cursor-pointer min-w-[190px] sm:min-w-[210px] text-left hover:border-white/15 transition-all select-none"
            >
              <div className="flex items-center gap-2 truncate">
                <ActiveIcon
                  size={14}
                  className="text-violet-400 flex-shrink-0"
                />
                <span className="truncate">{activeSort.label}</span>
              </div>
              <ChevronDown
                size={14}
                className="text-white/40 flex-shrink-0 transition-transform duration-200"
                style={{
                  transform: isSortDropdownOpen ? 'rotate(180deg)' : 'none',
                }}
              />
            </button>

            <AnimatePresence>
              {isSortDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute right-0 mt-2 w-[220px] bg-zinc-950/95 border border-white/10 rounded-xl shadow-2xl z-50 p-1 flex flex-col gap-0.5 overflow-hidden backdrop-blur-md"
                >
                  {SORT_OPTIONS.map((opt) => {
                    const OptIcon = opt.icon
                    const isSelected = sortBy === opt.value
                    return (
                      <button
                        key={opt.value}
                        onClick={() => {
                          setSortBy(opt.value)
                          setIsSortDropdownOpen(false)
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-left transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-violet-600/20 text-violet-300 border border-violet-500/25'
                            : 'text-white/70 hover:bg-white/5 border border-transparent'
                        }`}
                      >
                        <OptIcon
                          size={13.5}
                          className={`${isSelected ? 'text-violet-400' : 'text-white/30'} flex-shrink-0`}
                        />
                        <span className="truncate">{opt.label}</span>
                      </button>
                    )
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {avatarFilter === 'orphan' ? (
            <button
              onClick={handleCleanupOrphans}
              disabled={cleanupLoading || (orphanUsersCount === 0 && users.length === 0)}
              className="px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer select-none bg-red-600/10 border-red-500/25 text-red-400 hover:bg-red-600/20 hover:border-red-500/40 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-red-600/10"
              title={
                orphanUsersCount === 0 && users.length === 0
                  ? 'Không có user mồ côi nào để dọn dẹp'
                  : 'Xóa vĩnh viễn các tài khoản Tác giả CSV mồ côi (không còn bài đăng nào)'
              }
            >
              {cleanupLoading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                >
                  <RefreshCw size={13} />
                </motion.div>
              ) : (
                <Trash2 size={13} />
              )}
              <span>Dọn User Mồ Côi</span>
            </button>
          ) : (
            <button
              onClick={toggleHideAiUsers}
              className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer select-none ${
                hideAiUsers
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-md shadow-amber-500/10'
                  : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:border-white/20'
              }`}
              title="Ẩn/Hiện các tài khoản tác giả tạo tự động từ file CSV"
            >
              <Bot
                size={14}
                className={hideAiUsers ? 'text-amber-400' : 'text-white/40'}
              />
              <span>{hideAiUsers ? 'Đã ẩn Tác giả CSV' : 'Ẩn Tác giả CSV'}</span>
            </button>
          )}

          <button
            onClick={() => {
              setCreateUserForm({
                username: '',
                email: '',
                displayName: '',
                password: '',
                role: 'user',
                subscriptionTier: 'free',
              })
              setCreateModal(true)
            }}
            className="btn-primary px-4 flex items-center gap-1.5 whitespace-nowrap text-xs font-bold font-display cursor-pointer"
          >
            <Plus size={14} /> Thêm User
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card p-4 animate-pulse h-16" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {avatarFilter === 'missing' && !loading && users.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold">
              <AlertTriangle size={13} />
              Hiển thị tất cả{' '}
              <span className="font-mono font-bold text-amber-200">
                {users.length}
              </span>{' '}
              user thiếu/lỗi avatar (dicebear.com hoặc không có) — nhấn vào từng
              user để thêm avatar
            </div>
          )}
          {avatarFilter === 'orphan' && !loading && (
            <div className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-semibold">
              <div className="flex items-center gap-2">
                <Bot size={13} />
                <span>
                  Hiển thị{' '}
                  <span className="font-mono font-bold text-red-200">
                    {users.length}
                  </span>{' '}
                  tài khoản Tác giả CSV mồ côi — không còn bài đăng nào
                </span>
              </div>
              {users.length > 0 && (
                <button
                  onClick={handleCleanupOrphans}
                  disabled={cleanupLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600/30 border border-red-500/40 text-red-300 hover:bg-red-600/40 transition-all cursor-pointer font-bold disabled:opacity-50 shrink-0"
                >
                  {cleanupLoading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        repeat: Infinity,
                        duration: 0.8,
                        ease: 'linear',
                      }}
                    >
                      <RefreshCw size={12} />
                    </motion.div>
                  ) : (
                    <Trash2 size={12} />
                  )}
                  Xóa tất cả {users.length} user mồ côi
                </button>
              )}
            </div>
          )}
          {users
            .filter((user) => (hideAiUsers ? !isAiUser(user) : true))
            .map((user) => (
              <motion.div
                key={user._id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setDetailModal(user)}
                className={`card p-4 flex items-center gap-3 cursor-pointer group transition-all duration-300 border-white/5 bg-white/[0.01] hover:bg-white/[0.04] hover:border-white/12 hover:shadow-[0_8px_30px_rgb(0,0,0,0.5)] ${
                  user.isBanned ? 'border-red-500/20' : ''
                }`}
              >
                <div className="flex-1 flex items-center gap-3 min-w-0">
                  {user.avatar && !brokenAvatars[user._id] ? (
                    <img
                      src={user.avatar}
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0 group-hover:scale-105 transition-transform duration-300"
                      alt=""
                      onError={() => {
                        setBrokenAvatars((prev) => ({
                          ...prev,
                          [user._id]: true,
                        }))
                      }}
                    />
                  ) : (
                    <img
                      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.username || 'U')}&background=7c3aed&color=fff&bold=true`}
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0 group-hover:scale-105 transition-transform duration-300 border border-violet-500/30"
                      alt=""
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm group-hover:text-brand-300 transition-colors duration-300">
                        {user.displayName || user.username}
                      </span>
                      <span className="text-xs text-white/40">
                        @{user.username}
                      </span>
                      {isAiUser(user) && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-900/50 text-violet-300 font-bold border border-violet-500/30 flex items-center gap-1">
                          <Bot size={10} /> Tác giả CSV
                        </span>
                      )}
                      {user.role === 'admin' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-600/30 text-violet-400 font-bold">
                          ADMIN
                        </span>
                      )}
                      {user.isBanned && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-600/30 text-red-400 font-bold">
                          BANNED
                        </span>
                      )}
                      {/* Tier badge — click to change */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          openTierModal(user)
                        }}
                        title="Nhấp để đổi gói"
                        className="text-[10px] px-2 py-0.5 rounded-full font-bold border transition-all hover:brightness-125 cursor-pointer"
                        style={{
                          background:
                            TIER_META[user.subscriptionTier || 'free']?.bg,
                          color:
                            TIER_META[user.subscriptionTier || 'free']?.color,
                          borderColor:
                            TIER_META[user.subscriptionTier || 'free']?.border,
                        }}
                      >
                        {TIER_META[user.subscriptionTier || 'free']?.icon}{' '}
                        {TIER_META[user.subscriptionTier || 'free']?.label}
                      </button>
                      {renderDynamicBadge(user)}
                    </div>
                    <p className="text-xs text-white/40 truncate group-hover:text-white/60 transition-colors duration-300">
                      {user.email}
                    </p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-violet-400">
                    {user.tokenBalance || 0} token
                  </p>
                  <p className="text-[11px] font-bold text-emerald-400">
                    {(user.vndBalance || 0).toLocaleString('vi-VN')}đ
                  </p>
                  <p className="text-[10px] text-white/30">
                    {user.stats?.postsCount || 0} posts
                  </p>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setCoinModal(user)
                      setCoinAmount('')
                    }}
                    className="p-2 rounded-xl bg-violet-600/20 border border-violet-500/30 text-violet-400 hover:bg-violet-600/30 transition-all cursor-pointer"
                    title="Điều chỉnh AI Credits"
                  >
                    <Coins size={14} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setVndModal(user)
                      setVndAmount('')
                      setVndDescription('')
                    }}
                    className="p-2 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/30 transition-all cursor-pointer"
                    title="Nạp tiền ví VNĐ"
                  >
                    <Wallet size={14} />
                  </button>
                  {user._id !== currentAdminId && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        openRoleModal(user)
                      }}
                      className={`p-2 rounded-xl border transition-all cursor-pointer ${
                        user.role === 'admin'
                          ? 'bg-violet-600/20 border-violet-500/30 text-violet-400 hover:bg-violet-600/30'
                          : 'bg-white/5 border-white/10 text-white/40 hover:border-violet-500/40 hover:text-violet-400'
                      }`}
                      title="Đổi Role"
                    >
                      <Shield size={14} />
                    </button>
                  )}
                  {user._id !== currentAdminId && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        openBanModal(user, !user.isBanned)
                      }}
                      className={`p-2 rounded-xl border transition-all cursor-pointer ${
                        user.isBanned
                          ? 'bg-green-600/20 border-green-500/30 text-green-400 hover:bg-green-600/30'
                          : 'bg-red-600/20 border-red-500/30 text-red-400 hover:bg-red-600/30'
                      }`}
                      title={user.isBanned ? 'Unban' : 'Ban'}
                    >
                      {user.isBanned ? (
                        <ShieldCheck size={14} />
                      ) : (
                        <ShieldAlert size={14} />
                      )}
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          {users.length === 0 && !loading && (
            <div className="text-center py-12">
              <Users size={32} className="text-white/10 mx-auto mb-3" />
              <p className="text-white/40 text-sm">Không tìm thấy user</p>
            </div>
          )}
        </div>
      )}

      {hasMore && (
        <button
          onClick={() => fetchUsers(false)}
          className="btn-secondary w-full flex items-center justify-center gap-2 text-sm"
        >
          <ChevronDown size={15} /> Tải thêm
        </button>
      )}

      {/* Coin modal */}
      <AnimatePresence>
        {coinModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm !mt-0"
            onClick={(e) => e.target === e.currentTarget && setCoinModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9 }}
              className="card p-6 max-w-sm w-full"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-2xl bg-violet-600/20 flex items-center justify-center">
                  <Coins size={24} className="text-violet-400" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Điều chỉnh AI Credits</h3>
                  <p className="text-sm text-white/40">
                    @{coinModal.username} —{' '}
                    <span className="text-violet-400 font-bold">
                      {coinModal.tokenBalance || 0} AI Credits
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex gap-2 mb-2">
                {[100, 500, 1000, 5000].map((v) => (
                  <button
                    key={v}
                    onClick={() => setCoinAmount(String(v))}
                    className="flex-1 py-1.5 rounded-lg bg-violet-600/20 border border-violet-500/30 text-violet-400 text-xs font-bold hover:bg-violet-600/30 transition-all"
                  >
                    +{v}
                  </button>
                ))}
              </div>
              <div className="relative mb-4">
                <input
                  type="number"
                  className="input text-center text-lg font-bold"
                  placeholder="Nhập số xu (âm để trừ)"
                  value={coinAmount}
                  onChange={(e) => setCoinAmount(e.target.value)}
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 flex gap-1">
                  <button
                    onClick={() =>
                      setCoinAmount((v) => String(Math.abs(parseInt(v) || 0)))
                    }
                    className="p-1 text-green-400 hover:text-green-300"
                  >
                    <Plus size={14} />
                  </button>
                  <button
                    onClick={() =>
                      setCoinAmount((v) => String(-Math.abs(parseInt(v) || 0)))
                    }
                    className="p-1 text-red-400 hover:text-red-300"
                  >
                    <Minus size={14} />
                  </button>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setCoinModal(null)}
                  className="btn-secondary flex-1"
                >
                  Hủy
                </button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleAdjustCoins}
                  disabled={coinLoading || !coinAmount}
                  className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {coinLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      <Coins size={15} /> Xác nhận
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Vnd modal */}
      <AnimatePresence>
        {vndModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm !mt-0"
            onClick={(e) => e.target === e.currentTarget && setVndModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9 }}
              className="card p-6 max-w-sm w-full"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 flex items-center justify-center">
                  <Wallet size={24} className="text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Điều chỉnh ví VNĐ</h3>
                  <p className="text-sm text-white/40">
                    @{vndModal.username} —{' '}
                    <span className="text-emerald-400 font-bold">
                      {(vndModal.vndBalance || 0).toLocaleString('vi-VN')}đ
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex gap-2 mb-2">
                {[50000, 100000, 200000, 500000].map((v) => (
                  <button
                    key={v}
                    onClick={() => setVndAmount(String(v))}
                    className="flex-1 py-1.5 rounded-lg bg-emerald-600/20 border border-emerald-500/35 text-emerald-400 text-xs font-bold hover:bg-emerald-600/30 transition-all"
                  >
                    +{v.toLocaleString('vi-VN')}đ
                  </button>
                ))}
              </div>
              <div className="relative mb-3">
                <input
                  type="number"
                  className="input text-center text-lg font-bold"
                  placeholder="Nhập số tiền (âm để trừ)"
                  value={vndAmount}
                  onChange={(e) => setVndAmount(e.target.value)}
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 flex gap-1">
                  <button
                    onClick={() =>
                      setVndAmount((v) => String(Math.abs(parseInt(v) || 0)))
                    }
                    className="p-1 text-green-400 hover:text-green-300"
                  >
                    <Plus size={14} />
                  </button>
                  <button
                    onClick={() =>
                      setVndAmount((v) => String(-Math.abs(parseInt(v) || 0)))
                    }
                    className="p-1 text-red-400 hover:text-red-300"
                  >
                    <Minus size={14} />
                  </button>
                </div>
              </div>
              <div className="relative mb-4">
                <input
                  type="text"
                  className="input text-sm"
                  placeholder="Mô tả giao dịch (tùy chọn)"
                  value={vndDescription}
                  onChange={(e) => setVndDescription(e.target.value)}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setVndModal(null)}
                  className="btn-secondary flex-1"
                >
                  Hủy
                </button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleAdjustVnd}
                  disabled={vndLoading || !vndAmount}
                  className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50 !bg-emerald-600 hover:!bg-emerald-500 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                >
                  {vndLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      <Wallet size={15} /> Xác nhận
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tier Modal */}
      <AnimatePresence>
        {tierModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm !mt-0"
            onClick={(e) => e.target === e.currentTarget && setTierModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="card p-6 w-full max-w-sm"
            >
              <div className="flex items-center gap-3 mb-5">
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl"
                  style={{ background: TIER_META[selectedTier]?.bg }}
                >
                  {TIER_META[selectedTier]?.icon}
                </div>
                <div>
                  <h3 className="font-bold text-lg leading-tight">
                    Đổi gói đăng ký
                  </h3>
                  <p className="text-xs text-white/40">@{tierModal.username}</p>
                </div>
              </div>

              {/* Tier grid */}
              <div className="grid grid-cols-2 gap-2 mb-5">
                {Object.entries(TIER_META).map(([key, meta]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedTier(key)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all"
                    style={{
                      background:
                        selectedTier === key
                          ? meta.bg
                          : 'rgba(255,255,255,0.03)',
                      borderColor:
                        selectedTier === key
                          ? meta.border
                          : 'rgba(255,255,255,0.07)',
                      boxShadow:
                        selectedTier === key
                          ? `0 0 0 1.5px ${meta.border}`
                          : 'none',
                    }}
                  >
                    <span className="text-lg">{meta.icon}</span>
                    <div>
                      <p
                        className="text-xs font-bold"
                        style={{
                          color:
                            selectedTier === key
                              ? meta.color
                              : 'rgba(255,255,255,0.5)',
                        }}
                      >
                        {meta.label}
                      </p>
                      {key !== 'free' && (
                        <p className="text-[10px] text-white/25">
                          {key === 'founder'
                            ? '200 slot'
                            : key === 'pro'
                              ? '1K AI Credits/th'
                              : 'Unlimited'}
                        </p>
                      )}
                    </div>
                    {selectedTier === key && (
                      <Check
                        size={13}
                        className="ml-auto flex-shrink-0"
                        style={{ color: meta.color }}
                      />
                    )}
                  </button>
                ))}
              </div>

              {/* Current vs Selected */}
              <div className="flex items-center justify-center gap-2 mb-5 text-xs">
                <span
                  className="px-2.5 py-1 rounded-full font-bold"
                  style={{
                    background:
                      TIER_META[tierModal.subscriptionTier || 'free']?.bg,
                    color:
                      TIER_META[tierModal.subscriptionTier || 'free']?.color,
                  }}
                >
                  {TIER_META[tierModal.subscriptionTier || 'free']?.label}
                </span>
                <span className="text-white/30">→</span>
                <span
                  className="px-2.5 py-1 rounded-full font-bold"
                  style={{
                    background: TIER_META[selectedTier]?.bg,
                    color: TIER_META[selectedTier]?.color,
                    border: `1px solid ${TIER_META[selectedTier]?.border}`,
                  }}
                >
                  {TIER_META[selectedTier]?.label}
                </span>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setTierModal(null)}
                  className="btn-secondary flex-1"
                >
                  Hủy
                </button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleChangeTier}
                  disabled={
                    tierLoading ||
                    selectedTier === (tierModal.subscriptionTier || 'free')
                  }
                  className="flex-1 py-2.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2
                    disabled:opacity-40 transition-all"
                  style={{
                    background: 'oklch(52% 0.28 285)',
                    color: '#f5f3ff',
                    boxShadow:
                      'inset 0 1.5px 0 rgba(255,255,255,0.22), 0 4px 14px rgba(109,40,217,0.4)',
                  }}
                >
                  {tierLoading ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <>
                      <Zap size={14} /> Xác nhận
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Ban Modal ── */}
      <AnimatePresence>
        {banModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm !mt-0"
            onClick={(e) => e.target === e.currentTarget && setBanModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9 }}
              className="card p-6 max-w-sm w-full"
            >
              <div className="flex items-center gap-3 mb-5">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center ${banModal.ban ? 'bg-red-600/20' : 'bg-green-600/20'}`}
                >
                  {banModal.ban ? (
                    <ShieldAlert size={22} className="text-red-400" />
                  ) : (
                    <ShieldCheck size={22} className="text-green-400" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-lg">
                    {banModal.ban ? 'Ban user' : 'Unban user'}
                  </h3>
                  <p className="text-xs text-white/40">
                    @{banModal.user.username}
                  </p>
                </div>
              </div>

              {banModal.ban && (
                <>
                  <div className="mb-3">
                    <label className="input-label">
                      Lý do ban{' '}
                      <span className="text-white/30 font-normal">
                        (tuỳ chọn)
                      </span>
                    </label>
                    <textarea
                      className="input resize-none text-sm"
                      rows={3}
                      placeholder="Vi phạm quy định, spam, nội dung không phù hợp..."
                      value={banReason}
                      onChange={(e) => setBanReason(e.target.value)}
                    />
                  </div>
                  <div className="mb-5">
                    <label className="input-label">Thời hạn ban</label>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      {[
                        { v: 0, l: 'Vĩnh viễn' },
                        { v: 1, l: '1 ngày' },
                        { v: 7, l: '7 ngày' },
                        { v: 30, l: '30 ngày' },
                        { v: 90, l: '90 ngày' },
                      ].map((opt) => (
                        <button
                          key={opt.v}
                          onClick={() => setBanDuration(opt.v)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                            banDuration === opt.v
                              ? 'bg-red-600/30 border-red-500/50 text-red-300'
                              : 'bg-white/5 border-white/10 text-white/50 hover:border-white/20'
                          }`}
                        >
                          {opt.l}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {!banModal.ban && (
                <p className="text-sm text-white/50 mb-5">
                  Xác nhận gỡ lệnh ban cho user này? Họ sẽ có thể đăng nhập lại
                  bình thường.
                </p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setBanModal(null)}
                  className="btn-secondary flex-1"
                  disabled={banLoading}
                >
                  Hủy
                </button>
                <button
                  onClick={handleBan}
                  disabled={banLoading}
                  className={`flex-1 py-2.5 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors ${
                    banModal.ban
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {banLoading ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : banModal.ban ? (
                    '🔨 Xác nhận ban'
                  ) : (
                    '✓ Gỡ ban'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Role Modal ── */}
      <AnimatePresence>
        {roleModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm !mt-0"
            onClick={(e) => e.target === e.currentTarget && setRoleModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9 }}
              className="card p-6 max-w-sm w-full"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-2xl bg-violet-600/20 flex items-center justify-center">
                  <UserCheck size={22} className="text-violet-400" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Đổi Role</h3>
                  <p className="text-xs text-white/40">
                    @{roleModal.username} — hiện tại:{' '}
                    <span
                      className={
                        roleModal.role === 'admin'
                          ? 'text-violet-400 font-bold'
                          : 'text-white/60'
                      }
                    >
                      {roleModal.role || 'user'}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mb-5">
                {[
                  { v: 'user', l: '👤 User', desc: 'Quyền thường' },
                  { v: 'admin', l: '🛡️ Admin', desc: 'Toàn quyền quản lý' },
                ].map((opt) => (
                  <button
                    key={opt.v}
                    onClick={() => setSelectedRole(opt.v)}
                    className={`flex-1 p-3 rounded-xl border text-left transition-all ${
                      selectedRole === opt.v
                        ? opt.v === 'admin'
                          ? 'border-violet-500 bg-violet-500/10'
                          : 'border-brand-500 bg-brand-500/10'
                        : 'border-white/10 bg-surface-100 hover:border-white/20'
                    }`}
                  >
                    <p
                      className={`text-sm font-bold ${selectedRole === opt.v ? (opt.v === 'admin' ? 'text-violet-300' : 'text-brand-300') : 'text-white/60'}`}
                    >
                      {opt.l}
                    </p>
                    <p className="text-xs text-white/30 mt-0.5">{opt.desc}</p>
                  </button>
                ))}
              </div>

              {selectedRole === 'admin' && (
                <div className="mb-4 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
                  <p className="text-xs text-yellow-400">
                    ⚠ Admin có toàn quyền: duyệt post, ban user, quản lý hệ
                    thống.
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setRoleModal(null)}
                  className="btn-secondary flex-1"
                  disabled={roleLoading}
                >
                  Hủy
                </button>
                <button
                  onClick={handleSetRole}
                  disabled={
                    roleLoading || selectedRole === (roleModal.role || 'user')
                  }
                  className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  {roleLoading ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <>
                      <Shield size={14} /> Xác nhận
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* User Detail Modal */}
      <AnimatePresence>
        {detailModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-2 md:p-4 bg-black/85 backdrop-blur-sm overflow-hidden !mt-0"
            onClick={(e) =>
              e.target === e.currentTarget && setDetailModal(null)
            }
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="modal-glass w-full max-w-2xl border border-white/8 rounded-2xl shadow-[0_40px_120px_rgba(0,0,0,0.9)] relative max-h-[95vh] flex flex-col overflow-hidden"
            >
              {/* Close Button */}
              <button
                onClick={() => setDetailModal(null)}
                className="absolute top-4 right-4 p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-all cursor-pointer z-10"
              >
                <X size={18} />
              </button>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
                {/* Header profile section */}
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 pb-6 border-b border-white/5">
                  <div
                    className="relative group cursor-pointer"
                    onClick={() => {
                      const input = document.createElement('input')
                      input.type = 'file'
                      input.accept = 'image/*'
                      input.onchange = (e) => {
                        const file = e.target.files?.[0]
                        if (file) handleAvatarUpload(detailModal._id, file)
                      }
                      input.click()
                    }}
                  >
                    {detailModal.avatar &&
                    !isBrokenOrMissingAvatar(detailModal) ? (
                      <img
                        src={detailModal.avatar}
                        className="w-20 h-20 rounded-full object-cover ring-2 ring-brand-500/50 shadow-lg shadow-brand-500/10 group-hover:brightness-75 transition-all duration-200"
                        alt=""
                        onError={(e) => {
                          e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(detailModal.username || '')}&background=8b5cf6&color=fff`
                        }}
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-600 to-blue-500 flex items-center justify-center text-white text-2xl font-black shadow-lg group-hover:brightness-90 transition-all duration-200">
                        {detailModal.username?.[0]?.toUpperCase()}
                      </div>
                    )}
                    {/* Upload overlay */}
                    <div className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/40">
                      {avatarUploadLoading ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{
                            repeat: Infinity,
                            duration: 0.8,
                            ease: 'linear',
                          }}
                        >
                          <RefreshCw size={18} className="text-white" />
                        </motion.div>
                      ) : (
                        <div className="flex flex-col items-center gap-0.5">
                          <Pencil size={14} className="text-white" />
                          <span className="text-[9px] text-white font-bold leading-none">
                            Upload
                          </span>
                        </div>
                      )}
                    </div>
                    {detailModal.isVerified && (
                      <span
                        className="absolute -bottom-1 -right-1 bg-brand-500 text-white rounded-full p-1 border-2 border-zinc-950"
                        title="Đã xác minh"
                      >
                        <CheckCircle
                          size={14}
                          className="fill-white text-brand-600"
                        />
                      </span>
                    )}
                  </div>

                  <div className="text-center sm:text-left space-y-2 flex-1">
                    <div>
                      <h3 className="font-bold text-xl text-white flex flex-wrap items-center justify-center sm:justify-start gap-2 leading-none font-display">
                        {detailModal.displayName || detailModal.username}
                        <span className="text-xs text-white/40 font-normal font-mono">
                          @{detailModal.username}
                        </span>
                      </h3>
                      <p className="text-xs text-white/40 mt-1">
                        {detailModal.email}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      {/* Role badge */}
                      <span
                        className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
                          detailModal.role === 'admin'
                            ? 'bg-violet-600/10 border-violet-500/25 text-violet-400'
                            : 'bg-white/5 border-white/10 text-white/50'
                        }`}
                      >
                        {detailModal.role?.toUpperCase()}
                      </span>

                      {/* Expire or status badge */}
                      {detailModal.isBanned ? (
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-red-600/10 border border-red-500/25 text-red-400 font-bold">
                          🚫 BANNED
                        </span>
                      ) : (
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-green-600/10 border border-green-500/25 text-green-400 font-bold">
                          ✓ ACTIVE
                        </span>
                      )}

                      {/* Subscription tier */}
                      <span
                        className="text-[10px] px-2.5 py-0.5 rounded-full font-bold border"
                        style={{
                          background:
                            TIER_META[detailModal.subscriptionTier || 'free']
                              ?.bg,
                          color:
                            TIER_META[detailModal.subscriptionTier || 'free']
                              ?.color,
                          borderColor:
                            TIER_META[detailModal.subscriptionTier || 'free']
                              ?.border,
                        }}
                      >
                        {
                          TIER_META[detailModal.subscriptionTier || 'free']
                            ?.icon
                        }{' '}
                        {
                          TIER_META[detailModal.subscriptionTier || 'free']
                            ?.label
                        }
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stats Counters Grid */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                    Thống kê hoạt động
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div className="p-3 rounded-xl bg-white/[0.01] border border-white/5 text-center">
                      <p className="text-xl font-black text-white leading-none mb-1 tabular-nums">
                        {detailModal.stats?.postsCount || 0}
                      </p>
                      <p className="text-[9px] font-bold text-white/40 uppercase">
                        Bài đăng
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.01] border border-white/5 text-center">
                      <p className="text-xl font-black text-white leading-none mb-1 tabular-nums">
                        {detailModal.stats?.totalViews || 0}
                      </p>
                      <p className="text-[9px] font-bold text-white/40 uppercase">
                        Lượt xem
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.01] border border-white/5 text-center">
                      <p className="text-xl font-black text-white leading-none mb-1 tabular-nums">
                        {detailModal.stats?.totalDownloads || 0}
                      </p>
                      <p className="text-[9px] font-bold text-white/40 uppercase">
                        Lượt tải
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.01] border border-white/5 text-center">
                      <p className="text-xl font-black text-white leading-none mb-1 tabular-nums">
                        {detailModal.stats?.totalLikes || 0}
                      </p>
                      <p className="text-[9px] font-bold text-white/40 uppercase">
                        Yêu thích
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.01] border border-white/5 text-center">
                      <p className="text-xl font-black text-white leading-none mb-1 tabular-nums">
                        {detailModal.stats?.followersCount || 0}
                      </p>
                      <p className="text-[9px] font-bold text-white/40 uppercase">
                        Follower
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.01] border border-white/5 text-center">
                      <p className="text-xl font-black text-white leading-none mb-1 tabular-nums">
                        {detailModal.stats?.followingCount || 0}
                      </p>
                      <p className="text-[9px] font-bold text-white/40 uppercase">
                        Following
                      </p>
                    </div>
                  </div>
                </div>

                {/* Financial Wallet Ledgers */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                    Số dư tài chính
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Token Balance */}
                    <div className="p-3.5 rounded-xl bg-violet-600/5 border border-violet-500/15 flex items-center justify-between">
                      <div>
                        <p className="text-[9px] font-bold text-violet-400 uppercase leading-none mb-1">
                          Số dư Token
                        </p>
                        <p className="text-xl font-black text-violet-300 leading-none tabular-nums">
                          {detailModal.tokenBalance || 0}{' '}
                          <span className="text-[10px] font-bold text-violet-400/70">
                            token
                          </span>
                        </p>
                      </div>
                      <Coins size={18} className="text-violet-500/40" />
                    </div>

                    {/* Available Balance */}
                    <div className="p-3.5 rounded-xl bg-emerald-600/5 border border-emerald-500/15 flex items-center justify-between">
                      <div>
                        <p className="text-[9px] font-bold text-emerald-400 uppercase leading-none mb-1">
                          Ví khả dụng (VND)
                        </p>
                        <p className="text-xl font-black text-emerald-300 leading-none tabular-nums">
                          {(detailModal.vndBalance || 0).toLocaleString(
                            'vi-VN'
                          )}
                          đ
                        </p>
                      </div>
                      <Wallet size={18} className="text-emerald-500/40" />
                    </div>

                    {/* Holding Balance */}
                    <div className="p-3.5 rounded-xl bg-amber-600/5 border border-amber-500/15 flex items-center justify-between">
                      <div>
                        <p className="text-[9px] font-bold text-amber-400 uppercase leading-none mb-1">
                          Tiền tạm giữ (Holding)
                        </p>
                        <p className="text-xl font-black text-amber-300 leading-none tabular-nums">
                          {(detailModal.holdingBalance || 0).toLocaleString(
                            'vi-VN'
                          )}
                          đ
                        </p>
                      </div>
                      <Clock size={18} className="text-amber-500/40" />
                    </div>

                    {/* Locked Balance */}
                    <div className="p-3.5 rounded-xl bg-red-600/5 border border-red-500/15 flex items-center justify-between">
                      <div>
                        <p className="text-[9px] font-bold text-red-400 uppercase leading-none mb-1">
                          Đang khóa rút tiền
                        </p>
                        <p className="text-xl font-black text-red-300 leading-none tabular-nums">
                          {(detailModal.lockedBalance || 0).toLocaleString(
                            'vi-VN'
                          )}
                          đ
                        </p>
                      </div>
                      <Shield size={18} className="text-red-500/40" />
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs text-white/40 bg-white/[0.01] border border-white/5 rounded-xl p-2.5">
                    <span>
                      Tổng thu nhập:{' '}
                      <strong className="text-white">
                        {(detailModal.totalEarned || 0).toLocaleString('vi-VN')}
                        đ
                      </strong>
                    </span>
                    <span className="text-white/10">|</span>
                    <span>
                      Đã rút thành công:{' '}
                      <strong className="text-white">
                        {(detailModal.totalWithdrawn || 0).toLocaleString(
                          'vi-VN'
                        )}
                        đ
                      </strong>
                    </span>
                  </div>
                </div>

                {/* Timeline Metadata */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                    Dữ liệu & Thời gian
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs text-white/50 bg-white/[0.01] border border-white/5 rounded-xl p-4">
                    <div className="flex justify-between border-b border-white/5 pb-2">
                      <span>Ngày tạo tài khoản:</span>
                      <strong className="text-white">
                        {detailModal.createdAt
                          ? new Date(detailModal.createdAt).toLocaleDateString(
                              'vi-VN',
                              {
                                day: 'numeric',
                                month: 'numeric',
                                year: 'numeric',
                              }
                            )
                          : 'N/A'}
                      </strong>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-2">
                      <span>Đăng nhập cuối:</span>
                      <strong className="text-white">
                        {detailModal.lastLoginAt
                          ? new Date(detailModal.lastLoginAt).toLocaleString(
                              'vi-VN',
                              {
                                hour: '2-digit',
                                minute: '2-digit',
                                day: 'numeric',
                                month: 'numeric',
                              }
                            )
                          : 'Chưa đăng nhập'}
                      </strong>
                    </div>
                    <div className="flex justify-between sm:col-span-2 pt-1">
                      <span>Thời gian hết hạn gói:</span>
                      <strong className="text-white">
                        {detailModal.subscriptionExpiry
                          ? `${new Date(detailModal.subscriptionExpiry).toLocaleDateString('vi-VN')} (${Math.max(0, Math.ceil((new Date(detailModal.subscriptionExpiry) - new Date()) / (1000 * 60 * 60 * 24)))} ngày còn lại)`
                          : 'Không giới hạn / Free'}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Command Center Footer (Fixed Grid Layout) */}
              <div className="p-4 md:px-8 md:pb-6 md:pt-4 bg-zinc-950/80 backdrop-blur-md border-t border-white/5 grid grid-cols-2 sm:grid-cols-3 gap-2 shrink-0">
                <button
                  onClick={() => {
                    setCoinModal(detailModal)
                    setCoinAmount('')
                    setDetailModal(null)
                  }}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold bg-violet-600/20 border border-violet-500/35 text-violet-400 hover:bg-violet-600/30 transition-all cursor-pointer font-display"
                >
                  <Coins size={13} /> Chỉnh sửa AI Credits
                </button>
                <button
                  onClick={() => {
                    setVndModal(detailModal)
                    setVndAmount('')
                    setVndDescription('')
                    setDetailModal(null)
                  }}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold bg-emerald-600/20 border border-emerald-500/35 text-emerald-400 hover:bg-emerald-600/30 transition-all cursor-pointer font-display"
                >
                  <Wallet size={13} /> Nạp tiền VNĐ
                </button>
                <button
                  onClick={() => {
                    openTierModal(detailModal)
                    setDetailModal(null)
                  }}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold bg-amber-600/20 border border-amber-500/35 text-amber-400 hover:bg-amber-600/30 transition-all cursor-pointer font-display"
                >
                  <Zap size={13} /> Đổi gói
                </button>
                <button
                  onClick={() => {
                    setEditUserForm({
                      username: detailModal.username || '',
                      email: detailModal.email || '',
                      displayName: detailModal.displayName || '',
                      role: detailModal.role || 'user',
                      subscriptionTier: detailModal.subscriptionTier || 'free',
                      tokenBalance: detailModal.tokenBalance || 0,
                      vndBalance: detailModal.vndBalance || 0,
                    })
                    setEditModal(detailModal)
                    setDetailModal(null)
                  }}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 transition-all cursor-pointer font-display"
                >
                  <Pencil size={13} /> Sửa thông tin
                </button>
                {detailModal._id !== currentAdminId && (
                  <button
                    onClick={() => {
                      openRoleModal(detailModal)
                      setDetailModal(null)
                    }}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold bg-sky-600/20 border border-sky-500/35 text-sky-400 hover:bg-sky-600/30 transition-all cursor-pointer font-display"
                  >
                    <UserCheck size={13} /> Đổi Role
                  </button>
                )}
                {detailModal._id !== currentAdminId && (
                  <button
                    onClick={() => {
                      openBanModal(detailModal, !detailModal.isBanned)
                      setDetailModal(null)
                    }}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer font-display ${
                      detailModal.isBanned
                        ? 'bg-green-600/20 border-green-500/35 text-green-400 hover:bg-green-600/30'
                        : 'bg-red-600/20 border-red-500/35 text-red-400 hover:bg-red-600/30'
                    }`}
                  >
                    {detailModal.isBanned ? (
                      <>
                        <Shield size={13} /> Mở khóa
                      </>
                    ) : (
                      <>
                        <ShieldAlert size={13} /> Khóa Nick
                      </>
                    )}
                  </button>
                )}
                {detailModal._id !== currentAdminId && (
                  <button
                    onClick={() => handleDeleteUser(detailModal)}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold bg-red-600/10 hover:bg-red-600/25 border border-red-500/30 text-red-400 transition-all cursor-pointer font-display col-span-2 sm:col-span-1"
                  >
                    <Trash2 size={13} /> Xóa User
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create User Modal */}
      <AnimatePresence>
        {createModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm !mt-0"
            onClick={(e) =>
              e.target === e.currentTarget && setCreateModal(false)
            }
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95 }}
              className="card p-6 max-w-md w-full bg-zinc-950/90 border border-white/10 shadow-2xl relative"
            >
              <button
                onClick={() => setCreateModal(false)}
                className="absolute top-4 right-4 p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 mb-5 border-b border-white/5 pb-4">
                <div className="w-11 h-11 rounded-2xl bg-brand-500/20 flex items-center justify-center">
                  <Plus size={22} className="text-brand-400" />
                </div>
                <div>
                  <h3 className="font-bold text-lg font-display">
                    Tạo tài khoản mới
                  </h3>
                  <p className="text-xs text-white/40">
                    Cấp tài khoản trực tiếp làm việc trên PicSpy
                  </p>
                </div>
              </div>

              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="input-label">Tên hiển thị</label>
                  <input
                    type="text"
                    required
                    className="input text-xs"
                    placeholder="Nguyễn Văn A"
                    value={createUserForm.displayName}
                    onChange={(e) =>
                      setCreateUserForm((prev) => ({
                        ...prev,
                        displayName: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="input-label">Username</label>
                    <input
                      type="text"
                      required
                      className="input text-xs"
                      placeholder="username"
                      value={createUserForm.username}
                      onChange={(e) =>
                        setCreateUserForm((prev) => ({
                          ...prev,
                          username: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="input-label">Mật khẩu</label>
                    <input
                      type="password"
                      required
                      className="input text-xs"
                      placeholder="••••••••"
                      value={createUserForm.password}
                      onChange={(e) =>
                        setCreateUserForm((prev) => ({
                          ...prev,
                          password: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className="input-label">Địa chỉ Email</label>
                  <input
                    type="email"
                    required
                    className="input text-xs"
                    placeholder="email@example.com"
                    value={createUserForm.email}
                    onChange={(e) =>
                      setCreateUserForm((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pb-3">
                  <div>
                    <label className="input-label">Vai trò (Role)</label>
                    <select
                      className="input text-xs py-2 pr-8 appearance-none cursor-pointer"
                      value={createUserForm.role}
                      onChange={(e) =>
                        setCreateUserForm((prev) => ({
                          ...prev,
                          role: e.target.value,
                        }))
                      }
                    >
                      <option value="user" className="bg-[#121214]">
                        👤 User (Thường)
                      </option>
                      <option value="admin" className="bg-[#121214]">
                        🛡️ Admin (Quản trị)
                      </option>
                    </select>
                  </div>
                  <div>
                    <label className="input-label">Gói thành viên</label>
                    <select
                      className="input text-xs py-2 pr-8 appearance-none cursor-pointer"
                      value={createUserForm.subscriptionTier}
                      onChange={(e) =>
                        setCreateUserForm((prev) => ({
                          ...prev,
                          subscriptionTier: e.target.value,
                        }))
                      }
                    >
                      <option value="free" className="bg-[#121214]">
                        ⭕ Miễn phí
                      </option>
                      <option value="pro" className="bg-[#121214]">
                        💎 Gói Pro
                      </option>
                      <option value="ultimate" className="bg-[#121214]">
                        👑 Gói Ultimate
                      </option>
                      <option value="founder" className="bg-[#121214]">
                        ⭐ Founder's Plan
                      </option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setCreateModal(false)}
                    className="btn-secondary flex-1"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={createUserLoading}
                    className="btn-primary flex-1 flex items-center justify-center gap-1.5 font-display text-xs font-bold disabled:opacity-50 cursor-pointer"
                  >
                    {createUserLoading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      '✓ Tạo tài khoản'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit User Modal */}
      <AnimatePresence>
        {editModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm !mt-0"
            onClick={(e) => e.target === e.currentTarget && setEditModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95 }}
              className="card p-6 max-w-md w-full bg-zinc-950/90 border border-white/10 shadow-2xl relative"
            >
              <button
                onClick={() => {
                  setEditModal(null)
                  setDetailModal(editModal) // Re-open detail
                }}
                className="absolute top-4 right-4 p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 mb-5 border-b border-white/5 pb-4">
                <div className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <Pencil size={18} className="text-white/60" />
                </div>
                <div>
                  <h3 className="font-bold text-lg font-display">
                    Chỉnh sửa thông tin
                  </h3>
                  <p className="text-xs text-white/40">
                    Thay đổi thông tin cơ bản và số dư của @{editModal.username}
                  </p>
                </div>
              </div>

              <form onSubmit={handleEditUser} className="space-y-4">
                <div>
                  <label className="input-label">Tên hiển thị</label>
                  <input
                    type="text"
                    required
                    className="input text-xs"
                    placeholder="Tên hiển thị"
                    value={editUserForm.displayName}
                    onChange={(e) =>
                      setEditUserForm((prev) => ({
                        ...prev,
                        displayName: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="input-label">Username</label>
                    <input
                      type="text"
                      required
                      className="input text-xs"
                      placeholder="username"
                      value={editUserForm.username}
                      onChange={(e) =>
                        setEditUserForm((prev) => ({
                          ...prev,
                          username: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="input-label">Địa chỉ Email</label>
                    <input
                      type="email"
                      required
                      className="input text-xs"
                      placeholder="email@example.com"
                      value={editUserForm.email}
                      onChange={(e) =>
                        setEditUserForm((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="input-label">Ví AI Credits</label>
                    <input
                      type="number"
                      required
                      min={0}
                      className="input text-xs"
                      value={editUserForm.tokenBalance}
                      onChange={(e) =>
                        setEditUserForm((prev) => ({
                          ...prev,
                          tokenBalance: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="input-label">Ví VNĐ</label>
                    <input
                      type="number"
                      required
                      min={0}
                      className="input text-xs"
                      value={editUserForm.vndBalance}
                      onChange={(e) =>
                        setEditUserForm((prev) => ({
                          ...prev,
                          vndBalance: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pb-3">
                  <div>
                    <label className="input-label">Vai trò (Role)</label>
                    <select
                      className="input text-xs py-2 pr-8 appearance-none cursor-pointer disabled:opacity-40"
                      disabled={editModal._id === currentAdminId}
                      value={editUserForm.role}
                      onChange={(e) =>
                        setEditUserForm((prev) => ({
                          ...prev,
                          role: e.target.value,
                        }))
                      }
                    >
                      <option value="user" className="bg-[#121214]">
                        👤 User (Thường)
                      </option>
                      <option value="admin" className="bg-[#121214]">
                        🛡️ Admin (Quản trị)
                      </option>
                    </select>
                  </div>
                  <div>
                    <label className="input-label">Gói thành viên</label>
                    <select
                      className="input text-xs py-2 pr-8 appearance-none cursor-pointer"
                      value={editUserForm.subscriptionTier}
                      onChange={(e) =>
                        setEditUserForm((prev) => ({
                          ...prev,
                          subscriptionTier: e.target.value,
                        }))
                      }
                    >
                      <option value="free" className="bg-[#121214]">
                        ⭕ Miễn phí
                      </option>
                      <option value="pro" className="bg-[#121214]">
                        💎 Gói Pro
                      </option>
                      <option value="ultimate" className="bg-[#121214]">
                        👑 Gói Ultimate
                      </option>
                      <option value="founder" className="bg-[#121214]">
                        ⭐ Founder's Plan
                      </option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditModal(null)
                      setDetailModal(editModal) // Re-open detail
                    }}
                    className="btn-secondary flex-1"
                  >
                    Quay lại
                  </button>
                  <button
                    type="submit"
                    disabled={editUserLoading}
                    className="btn-primary flex-1 flex items-center justify-center gap-1.5 font-display text-xs font-bold disabled:opacity-50 cursor-pointer"
                  >
                    {editUserLoading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      '✓ Lưu thay đổi'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// TAB: CATEGORIES
// ══════════════════════════════════════════════════════════════════
const CategoriesTab = () => {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newCat, setNewCat] = useState({
    name: '',
    emoji: '🏷️',
    description: '',
  })
  const [adding, setAdding] = useState(false)
  const [editId, setEditId] = useState(null)
  const [editData, setEditData] = useState({})
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  const [categoryRequests, setCategoryRequests] = useState([])
  const [requestsLoading, setRequestsLoading] = useState(true)
  const [actionReqId, setActionReqId] = useState(null)

  const fetchRequests = useCallback(async () => {
    setRequestsLoading(true)
    try {
      const { data } = await api.get('/admin/category-requests')
      setCategoryRequests(data.requests || [])
    } catch (err) {
      console.error(err)
    } finally {
      setRequestsLoading(false)
    }
  }, [])

  useEffect(() => {
    const startTime = Date.now()
    api
      .get('/admin/categories')
      .then(async ({ data }) => {
        const elapsed = Date.now() - startTime
        const delay = Math.max(0, 700 - elapsed)
        if (delay > 0) {
          await new Promise((resolve) => setTimeout(resolve, delay))
        }
        setCategories(data.categories)
      })
      .catch(() => toast.error('Không thể tải danh mục'))
      .finally(() => setLoading(false))

    fetchRequests()
  }, [fetchRequests])

  const handleApproveReq = async (postId, reqName) => {
    setActionReqId(postId)
    try {
      const { data } = await api.post(
        `/admin/category-requests/${postId}/approve`
      )
      toast.success(
        data.message || `🎉 Đã chấp nhận & tạo mới danh mục "${reqName}"!`
      )
      const cleanReqName = (reqName || '').trim().toLowerCase()
      setCategoryRequests((prev) =>
        prev.filter(
          (r) =>
            r._id !== postId &&
            (r.requestedCategory || '').trim().toLowerCase() !== cleanReqName
        )
      )
      // Refresh categories and category requests list
      const [catRes, reqRes] = await Promise.all([
        api.get('/admin/categories'),
        api.get('/admin/category-requests'),
      ])
      setCategories(catRes.data.categories || [])
      setCategoryRequests(reqRes.data.requests || [])
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi chấp nhận danh mục')
    } finally {
      setActionReqId(null)
    }
  }

  const handleRejectReq = async (postId, reqName) => {
    setActionReqId(postId)
    try {
      const { data } = await api.post(
        `/admin/category-requests/${postId}/reject`
      )
      toast.success(
        data.message || `⚠️ Đã từ chối yêu cầu danh mục "${reqName}"`
      )
      setCategoryRequests((prev) => prev.filter((r) => r._id !== postId))
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi từ chối danh mục')
    } finally {
      setActionReqId(null)
    }
  }

  const handleAdd = async () => {
    if (!newCat.name.trim()) {
      toast.error('Nhập tên danh mục')
      return
    }
    setAdding(true)
    try {
      const { data } = await api.post('/admin/categories', newCat)
      setCategories((prev) => [...prev, data.category])
      setNewCat({ name: '', emoji: '🏷️', description: '' })
      setShowAdd(false)
      toast.success('✅ Đã tạo danh mục')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi tạo danh mục')
    } finally {
      setAdding(false)
    }
  }

  const startEdit = (cat) => {
    setEditId(cat._id)
    setEditData({
      name: cat.name,
      emoji: cat.emoji,
      description: cat.description || '',
    })
  }

  const handleSave = async (id) => {
    setSaving(true)
    try {
      const { data } = await api.put(`/admin/categories/${id}`, editData)
      setCategories((prev) =>
        prev.map((c) => (c._id === id ? data.category : c))
      )
      setEditId(null)
      toast.success('✅ Đã cập nhật')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (cat) => {
    try {
      const { data } = await api.patch(`/admin/categories/${cat._id}/toggle`)
      setCategories((prev) =>
        prev.map((c) =>
          c._id === cat._id ? { ...c, isActive: data.isActive } : c
        )
      )
      toast.success(data.message)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi')
    }
  }

  const handleDelete = async (cat) => {
    if (
      !confirm(`Xóa danh mục "${cat.name}"? Các bài đăng sẽ chuyển về "Khác".`)
    )
      return
    setDeletingId(cat._id)
    try {
      const { data } = await api.delete(`/admin/categories/${cat._id}`)
      setCategories((prev) => prev.filter((c) => c._id !== cat._id))
      toast.success(`✅ ${data.message} (${data.migratedPosts} bài → Khác)`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi xóa')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Category Proposals from Creators */}
      <div className="card p-5 bg-[#0c0c14] border border-violet-500/30 shadow-xl space-y-4 rounded-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-300">
              <Megaphone size={18} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2 font-display">
                Yêu Cầu Danh Mục Tùy Chỉnh Từ Creator
                {categoryRequests.length > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-600 text-white font-mono font-bold animate-pulse">
                    {categoryRequests.length} mới
                  </span>
                )}
              </h3>
              <p className="text-xs text-white/50">
                Các đề xuất danh mục chưa có trong hệ thống từ Creator khi đăng
                bài
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={fetchRequests}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
            title="Làm mới danh sách yêu cầu"
          >
            <RefreshCw
              size={14}
              className={requestsLoading ? 'animate-spin' : ''}
            />
          </button>
        </div>

        {requestsLoading ? (
          <div className="py-8 text-center text-xs text-white/40 flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin text-violet-400" /> Đang
            tải danh sách đề xuất...
          </div>
        ) : categoryRequests.length === 0 ? (
          <div className="py-6 text-center text-xs text-white/40 border border-dashed border-white/10 rounded-xl bg-white/[0.01]">
            ✨ Không có yêu cầu danh mục mới nào đang chờ duyệt.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {categoryRequests.map((req) => {
              const img =
                req.generatedImages?.[0] ||
                req.images?.[0] ||
                req.sourceImages?.[0]
              const isActing = actionReqId === req._id
              return (
                <div
                  key={req._id}
                  className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center gap-3.5 hover:border-violet-500/40 transition-all"
                >
                  <div className="w-16 h-16 rounded-lg bg-surface-100 overflow-hidden flex-shrink-0 relative border border-white/10">
                    {img?.url || img?.thumbnailUrl ? (
                      <img
                        src={getOptimizedWebpUrl(
                          img.thumbnailUrl || img.url,
                          120
                        )}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/20">
                        <Image size={20} />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] text-white/40 font-mono">
                        Creator:
                      </span>
                      <span className="text-xs font-bold text-violet-300 truncate">
                        @{req.authorId?.username || 'user'}
                      </span>
                      {req.isExternal ? (
                        <span
                          className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-bold tracking-wider font-mono shadow-sm"
                          title="Bài viết được Import từ tập tin CSV"
                        >
                          CSV
                        </span>
                      ) : (
                        <span
                          className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[9px] font-bold tracking-wider font-mono shadow-sm"
                          title="Bài viết do Nguời dùng (Creator) tạo"
                        >
                          USER
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-white/40 font-mono">
                        Đề xuất:
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-violet-600/30 text-violet-200 border border-violet-500/40 font-bold text-xs font-mono">
                        "{req.requestedCategory}"
                      </span>
                    </div>

                    <p className="text-[11px] text-white/50 truncate font-sans">
                      {req.caption || req.prompt || 'Không có mô tả'}
                    </p>
                  </div>

                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    <button
                      disabled={isActing}
                      onClick={() =>
                        handleApproveReq(req._id, req.requestedCategory)
                      }
                      className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      {isActing ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <CheckCircle size={12} />
                      )}
                      Chấp nhận
                    </button>
                    <button
                      disabled={isActing}
                      onClick={() =>
                        handleRejectReq(req._id, req.requestedCategory)
                      }
                      className="px-3 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/40 text-red-300 border border-red-500/40 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      {isActing ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <XCircle size={12} />
                      )}
                      Từ chối
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-2">
        <div>
          <h2 className="font-bold text-lg">Quản lý danh mục hệ thống</h2>
          <p className="text-xs text-white/40">
            Tắt danh mục để ẩn khỏi trang Upload. Xóa sẽ chuyển bài về "Khác".
          </p>
        </div>
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-all cursor-pointer"
        >
          <Plus size={16} /> Thêm mới
        </button>
      </div>

      {/* Add form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="card p-4 space-y-3 border-brand-500/30"
          >
            <p className="text-sm font-semibold text-brand-400">
              Tạo danh mục mới
            </p>
            <div className="grid grid-cols-[80px_1fr] gap-3">
              <input
                className="input text-2xl text-center"
                placeholder="🏷️"
                maxLength={4}
                value={newCat.emoji}
                onChange={(e) =>
                  setNewCat((p) => ({ ...p, emoji: e.target.value }))
                }
              />
              <input
                className="input"
                placeholder="Tên danh mục *"
                maxLength={50}
                value={newCat.name}
                onChange={(e) =>
                  setNewCat((p) => ({ ...p, name: e.target.value }))
                }
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              />
            </div>
            <input
              className="input text-sm"
              placeholder="Mô tả ngắn (tùy chọn)"
              maxLength={200}
              value={newCat.description}
              onChange={(e) =>
                setNewCat((p) => ({ ...p, description: e.target.value }))
              }
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowAdd(false)}
                className="btn-secondary flex-1 text-sm"
              >
                Hủy
              </button>
              <button
                onClick={handleAdd}
                disabled={adding}
                className="flex-1 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {adding ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <>
                    <Plus size={14} /> Tạo
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category list */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card p-4 animate-pulse h-16" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {(() => {
            const sorted = [...categories].sort((a, b) => {
              if (a.slug === 'other') return 1
              if (b.slug === 'other') return -1
              return (a.sortOrder || 0) - (b.sortOrder || 0)
            })
            return sorted.map((cat) => (
              <motion.div
                key={cat._id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`card p-4 flex items-center gap-3 transition-all ${!cat.isActive ? 'opacity-50' : ''}`}
              >
                {/* Emoji */}
                <span className="text-2xl w-8 text-center flex-shrink-0">
                  {cat.emoji}
                </span>

                {/* Edit mode */}
                {editId === cat._id ? (
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <input
                      className="input text-sm"
                      placeholder="Tên"
                      value={editData.name}
                      onChange={(e) =>
                        setEditData((p) => ({ ...p, name: e.target.value }))
                      }
                    />
                    <input
                      className="input text-sm text-2xl text-center"
                      placeholder="Emoji"
                      maxLength={4}
                      value={editData.emoji}
                      onChange={(e) =>
                        setEditData((p) => ({ ...p, emoji: e.target.value }))
                      }
                    />
                    <input
                      className="input text-xs col-span-2"
                      placeholder="Mô tả"
                      value={editData.description}
                      onChange={(e) =>
                        setEditData((p) => ({
                          ...p,
                          description: e.target.value,
                        }))
                      }
                    />
                  </div>
                ) : (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{cat.name}</span>
                      <span className="text-[10px] text-white/30 font-mono">
                        /{cat.slug}
                      </span>
                      {!cat.isActive && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/30 border border-white/10">
                          Tắt
                        </span>
                      )}
                      {cat.slug === 'other' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/20">
                          Fallback
                        </span>
                      )}
                    </div>
                    {cat.description && (
                      <p className="text-xs text-white/30 truncate mt-0.5">
                        {cat.description}
                      </p>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {editId === cat._id ? (
                    <>
                      <button
                        onClick={() => setEditId(null)}
                        className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white transition-all"
                      >
                        <X size={14} />
                      </button>
                      <button
                        onClick={() => handleSave(cat._id)}
                        disabled={saving}
                        className="p-2 rounded-xl bg-green-600/20 border border-green-500/30 text-green-400 hover:bg-green-600/30 transition-all"
                      >
                        {saving ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Save size={14} />
                        )}
                      </button>
                    </>
                  ) : (
                    <>
                      {/* Toggle active */}
                      <button
                        onClick={() => handleToggle(cat)}
                        disabled={cat.slug === 'other'}
                        className={`p-2 rounded-xl border transition-all ${cat.isActive ? 'bg-green-600/20 border-green-500/30 text-green-400 hover:bg-green-600/30' : 'bg-white/5 border-white/10 text-white/30 hover:text-white/60'} disabled:opacity-30 disabled:cursor-not-allowed`}
                        title={cat.isActive ? 'Tắt danh mục' : 'Bật danh mục'}
                      >
                        {cat.isActive ? (
                          <ToggleRight size={16} />
                        ) : (
                          <ToggleLeft size={16} />
                        )}
                      </button>
                      {/* Edit */}
                      <button
                        onClick={() => startEdit(cat)}
                        className="p-2 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 hover:bg-blue-600/30 transition-all"
                        title="Chỉnh sửa"
                      >
                        <Pencil size={14} />
                      </button>
                      {/* Delete */}
                      {cat.slug !== 'other' && (
                        <button
                          onClick={() => handleDelete(cat)}
                          disabled={deletingId === cat._id}
                          className="p-2 rounded-xl bg-red-600/20 border border-red-500/30 text-red-400 hover:bg-red-600/30 transition-all disabled:opacity-50"
                          title="Xóa"
                        >
                          {deletingId === cat._id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </motion.div>
            ))
          })()}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// TAB: SETTINGS
// ══════════════════════════════════════════════════════════════════
function hexToHsl(hex) {
  if (!hex) return { h: 0, s: 0, l: 0 }
  let cleaned = hex.trim().replace('#', '')
  if (cleaned.length === 3) {
    cleaned =
      cleaned[0] +
      cleaned[0] +
      cleaned[1] +
      cleaned[1] +
      cleaned[2] +
      cleaned[2]
  }
  if (cleaned.length !== 6) {
    return { h: 0, s: 0, l: 0 }
  }
  const r = parseInt(cleaned.slice(0, 2), 16) / 255
  const g = parseInt(cleaned.slice(2, 4), 16) / 255
  const b = parseInt(cleaned.slice(4, 6), 16) / 255

  const max = Math.max(r, g, b),
    min = Math.min(r, g, b)
  let h = 0,
    s = 0,
    l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === r) {
      h = (g - b) / d + (g < b ? 6 : 0)
    } else if (max === g) {
      h = (b - r) / d + 2
    } else if (max === b) {
      h = (r - g) / d + 4
    }
    h /= 6
  }
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  }
}

const SettingsTab = ({ onDirtyChange }) => {
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [autoApproveSaving, setAutoApproveSaving] = useState(false)
  const [bypassToggleSaving, setBypassToggleSaving] = useState(false)

  const bypassPasswordInputRef = useRef(null)
  const bypassPinInputRef = useRef(null)

  const {
    updateBrandColors,
    setAnnouncement,
    setGlobalLoaderType: setGlobalLoaderTypeContext,
    setSplashExtraMs: setSplashExtraMsContext,
    setMyPostsSkeletonMs: setMyPostsSkeletonMsContext,
    setBlurPremiumImages: setBlurPremiumImagesContext,
    enableRefund: enableRefundContext,
    setEnableRefund: setEnableRefundContext,
    postDetailLayout: postDetailLayoutContext,
    setPostDetailLayout: setPostDetailLayoutContext,
    postLoadingDelayMs: postLoadingDelayMsContext,
    setPostLoadingDelayMs: setPostLoadingDelayMsContext,
  } = useSettings()
  const [primaryColor, setPrimaryColor] = useState('#7c3aed')
  const [gradientColor, setGradientColor] = useState('#3b82f6')
  const [brandOpacity, setBrandOpacity] = useState(1)
  const [brandBlur, setBrandBlur] = useState(0)
  const [enableGradient, setEnableGradient] = useState(true)
  const [shadowStyle, setShadowStyle] = useState('soft')
  const [colorSaving, setColorSaving] = useState(false)

  // Announcement state
  const [announcementText, setAnnouncementText] = useState('')
  const [announcementLink, setAnnouncementLink] = useState('')
  const [announcementEnabled, setAnnouncementEnabled] = useState(false)
  const [announcementSaving, setAnnouncementSaving] = useState(false)

  // Category Style state
  const [categoryStyle, setCategoryStyle] = useState('style-1')
  const [categoriesPageStyle, setCategoriesPageStyle] = useState('style-2')
  const [categorySaving, setCategorySaving] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const activeSubTab = searchParams.get('subtab') || 'general'
  const setActiveSubTab = (subtab) => {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('subtab', subtab)
    setSearchParams(nextParams)
  }
  const [selectedConfigPage, setSelectedConfigPage] = useState('home')
  const [heroBannerMode, setHeroBannerMode] = useState('auto')
  const [heroBannerImage, setHeroBannerImage] = useState('')
  const [heroBannerSaving, setHeroBannerSaving] = useState(false)
  const [heroCollageMode, setHeroCollageMode] = useState('auto')
  const [heroCollageImages, setHeroCollageImages] = useState(Array(8).fill(''))
  const [heroCollageSaving, setHeroCollageSaving] = useState(false)
  const [globalLoaderType, setGlobalLoaderType] = useState('wave')
  const [loaderSaving, setLoaderSaving] = useState(false)
  const [splashExtraMs, setSplashExtraMs] = useState(0)
  const [splashSaving, setSplashSaving] = useState(false)
  const [myPostsSkeletonMs, setMyPostsSkeletonMs] = useState(0)
  const [myPostsSkeletonSaving, setMyPostsSkeletonSaving] = useState(false)
  const [postLoadingDelayMs, setPostLoadingDelayMs] = useState(0)
  const [postLoadingDelaySaving, setPostLoadingDelaySaving] = useState(false)
  const [blurPremiumImages, setBlurPremiumImages] = useState(false)
  const [savingBlur, setSavingBlur] = useState(false)
  const [enableRefund, setEnableRefund] = useState(false)
  const [savingRefund, setSavingRefund] = useState(false)
  const [postDetailLayout, setPostDetailLayout] = useState('left-image')
  const [savingLayout, setSavingLayout] = useState(false)
  const [trendingCarouselInterval, setTrendingCarouselInterval] = useState(5000)
  const [trendingCarouselSaving, setTrendingCarouselSaving] = useState(false)
  const [bypassPassword, setBypassPassword] = useState('')
  const [bypassPasswordSaving, setBypassPasswordSaving] = useState(false)
  const [bypassPin, setBypassPin] = useState('')
  const [bypassPinSaving, setBypassPinSaving] = useState(false)
  const [showBypassPassword, setShowBypassPassword] = useState(false)
  const [showBypassPin, setShowBypassPin] = useState(false)
  const [currentBypassPassword, setCurrentBypassPassword] = useState(null)
  const [currentBypassPin, setCurrentBypassPin] = useState(null)
  const [showCurrentBypassKeys, setShowCurrentBypassKeys] = useState(false)
  const [loadingBypassKeys, setLoadingBypassKeys] = useState(false)
  const [bypassPasswordFocused, setBypassPasswordFocused] = useState(false)
  const [bypassPinFocused, setBypassPinFocused] = useState(false)
  const [discoveryAutoScrollInterval, setDiscoveryAutoScrollInterval] =
    useState(10000)
  const [discoveryAutoScrollStagger, setDiscoveryAutoScrollStagger] =
    useState(1000)
  const [savingDiscoveryAutoScroll, setSavingDiscoveryAutoScroll] =
    useState(false)
  const [defaultTags, setDefaultTags] = useState('picspy')
  const [defaultTagsSaving, setDefaultTagsSaving] = useState(false)

  const [savedColors, setSavedColors] = useState({
    primary: '#7c3aed',
    gradient: '#3b82f6',
    opacity: 1,
    blur: 0,
    enableGradient: true,
    shadowStyle: 'soft',
  })

  const [customColors, setCustomColors] = useState({
    primary: '#7c3aed',
    gradient: '#3b82f6',
    opacity: 1,
    blur: 0,
    enableGradient: true,
    shadowStyle: 'soft',
  })

  const COLOR_PRESETS = [
    {
      name: 'Mặc định (PicSpy)',
      primary: '#7c3aed',
      gradient: '#3b82f6',
      opacity: 1,
      blur: 0,
      desc: 'Màu tím PicSpy mặc định',
    },
    {
      name: 'Liquid Glass (Mới)',
      primary: '#345ceb',
      gradient: '#00c6ff',
      opacity: 0.75,
      blur: 12,
      desc: 'Xanh lam lỏng & trong suốt',
    },
    {
      name: 'Cyberpunk Neon',
      primary: '#ec4899',
      gradient: '#8b5cf6',
      opacity: 1,
      blur: 0,
      desc: 'Hồng sen & Tím neon rực rỡ',
    },
    {
      name: 'Forest Emerald',
      primary: '#10b981',
      gradient: '#059669',
      opacity: 1,
      blur: 0,
      desc: 'Xanh lá ngọc lục bảo',
    },
    {
      name: 'Amber Glow',
      primary: '#f59e0b',
      gradient: '#d97706',
      opacity: 1,
      blur: 0,
      desc: 'Màu hổ phách hoàng kim',
    },
  ]

  useEffect(() => {
    const startTime = Date.now()
    api
      .get('/admin/settings')
      .then(async ({ data }) => {
        const primary = data.settings?.primaryColor || '#7c3aed'
        const gradient = data.settings?.gradientColor || '#3b82f6'
        const opacity =
          data.settings?.brandOpacity !== undefined
            ? data.settings.brandOpacity
            : 1
        const blur =
          data.settings?.brandBlur !== undefined ? data.settings.brandBlur : 0
        const gradientEnabled =
          data.settings?.enableGradient !== undefined
            ? data.settings.enableGradient
            : true
        const sStyle = data.settings?.shadowStyle || 'soft'

        const elapsed = Date.now() - startTime
        const delay = Math.max(0, 700 - elapsed)
        if (delay > 0) {
          await new Promise((resolve) => setTimeout(resolve, delay))
        }

        setSettings(data.settings)
        setPrimaryColor(primary)
        setGradientColor(gradient)
        setBrandOpacity(opacity)
        setBrandBlur(blur)
        setEnableGradient(gradientEnabled)
        setShadowStyle(sStyle)

        // Announcement settings load
        setAnnouncementText(data.settings?.announcementText || '')
        setAnnouncementLink(data.settings?.announcementLink || '')
        setAnnouncementEnabled(data.settings?.announcementEnabled || false)

        // Category style load
        setCategoryStyle(data.settings?.categoryStyle || 'style-1')
        setCategoriesPageStyle(data.settings?.categoriesPageStyle || 'style-2')
        setHeroBannerMode(data.settings?.heroBannerMode || 'auto')
        setHeroBannerImage(
          data.settings?.heroBannerImage ||
            'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&q=85'
        )
        setHeroCollageMode(data.settings?.heroCollageMode || 'auto')
        setHeroCollageImages(
          data.settings?.heroCollageImages?.length >= 8
            ? data.settings.heroCollageImages
            : Array(8).fill('')
        )

        // Initialize all pages, UI loaders, and functional settings
        setGlobalLoaderType(data.settings?.globalLoaderType || 'wave')
        setSplashExtraMs(data.settings?.splashExtraMs ?? 0)
        setMyPostsSkeletonMs(data.settings?.myPostsSkeletonMs ?? 0)
        setPostLoadingDelayMs(data.settings?.postLoadingDelayMs ?? 0)
        setBlurPremiumImages(data.settings?.blurPremiumImages || false)
        setEnableRefund(data.settings?.enableRefund || false)
        setPostDetailLayout(data.settings?.postDetailLayout || 'left-image')
        setTrendingCarouselInterval(
          data.settings?.trendingCarouselInterval ?? 5000
        )
        setDiscoveryAutoScrollInterval(
          data.settings?.discoveryAutoScrollInterval ?? 10000
        )
        setDiscoveryAutoScrollStagger(
          data.settings?.discoveryAutoScrollStagger ?? 1000
        )
        setDefaultTags((data.settings?.defaultTags || ['picspy']).join(', '))

        setSavedColors({
          primary,
          gradient,
          opacity,
          blur,
          enableGradient: gradientEnabled,
          shadowStyle: sStyle,
        })
      })
      .catch(() => toast.error('Không tải được cài đặt'))
      .finally(() => setLoading(false))
  }, [])

  const hasUnsavedChanges =
    (primaryColor || '').toLowerCase() !==
      (savedColors.primary || '').toLowerCase() ||
    (gradientColor || '').toLowerCase() !==
      (savedColors.gradient || '').toLowerCase() ||
    brandOpacity !== savedColors.opacity ||
    brandBlur !== savedColors.blur ||
    enableGradient !== savedColors.enableGradient ||
    shadowStyle !== savedColors.shadowStyle

  useEffect(() => {
    onDirtyChange?.(hasUnsavedChanges)
  }, [hasUnsavedChanges, onDirtyChange])

  // Sync customColors state when user edits custom colors (when they don't match any preset)
  useEffect(() => {
    const isPresetActive = COLOR_PRESETS.some(
      (p) =>
        p.primary.toLowerCase() === primaryColor.toLowerCase() &&
        p.gradient.toLowerCase() === gradientColor.toLowerCase() &&
        p.opacity === brandOpacity &&
        p.blur === brandBlur &&
        enableGradient === true &&
        shadowStyle === 'soft'
    )
    if (!isPresetActive) {
      setCustomColors({
        primary: primaryColor,
        gradient: gradientColor,
        opacity: brandOpacity,
        blur: brandBlur,
        enableGradient,
        shadowStyle,
      })
    }
  }, [
    primaryColor,
    gradientColor,
    brandOpacity,
    brandBlur,
    enableGradient,
    shadowStyle,
  ])

  useEffect(() => {
    if (!hasUnsavedChanges) return

    const handleBeforeUnload = (e) => {
      e.preventDefault()
      e.returnValue =
        'Cấu hình màu của bạn chưa được lưu. Bạn có chắc chắn muốn rời đi?'
      return e.returnValue
    }

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
              'Cấu hình màu của bạn chưa được lưu. Bạn có chắc chắn muốn rời đi?'
            )
          ) {
            e.preventDefault()
            e.stopPropagation()
          } else {
            onDirtyChange?.(false)
          }
        }
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('click', handleCaptureClick, true)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('click', handleCaptureClick, true)
    }
  }, [hasUnsavedChanges, onDirtyChange])

  const handleSaveColors = async (
    pColor = primaryColor,
    gColor = gradientColor,
    opacity = brandOpacity,
    blur = brandBlur,
    gradientEnabled = enableGradient,
    sStyle = shadowStyle
  ) => {
    setColorSaving(true)
    try {
      const { data } = await api.put('/admin/settings', {
        primaryColor: pColor,
        gradientColor: gColor,
        brandOpacity: opacity,
        brandBlur: blur,
        enableGradient: gradientEnabled,
        shadowStyle: sStyle,
      })
      setSettings(data.settings)
      updateBrandColors(pColor, gColor, opacity, blur, gradientEnabled, sStyle)
      setSavedColors({
        primary: pColor,
        gradient: gColor,
        opacity,
        blur,
        enableGradient: gradientEnabled,
        shadowStyle: sStyle,
      })
      toast.success('🎨 Đã lưu và áp dụng giao diện màu mới!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể lưu cấu hình màu')
    } finally {
      setColorSaving(false)
    }
  }

  const handleToggleAutoApprove = async () => {
    if (!settings) return
    const next = !settings.autoApprove
    setAutoApproveSaving(true)
    try {
      const { data } = await api.put('/admin/settings', { autoApprove: next })
      setSettings(data.settings)
      toast.success(
        next
          ? '⚡ Đã BẬT tự động duyệt ảnh'
          : '🔒 Đã TẮT — ảnh sẽ chờ duyệt thủ công'
      )
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi cập nhật')
    } finally {
      setAutoApproveSaving(false)
    }
  }

  const handleToggleBypassEnabled = async () => {
    if (!settings) return
    const next = !settings.bypassEnabled
    setBypassToggleSaving(true)
    try {
      const { data } = await api.put('/admin/settings', { bypassEnabled: next })
      setSettings(data.settings)
      // When disabling: clear all local bypass UI state
      if (!next) {
        setBypassPassword('')
        setBypassPin('')
        setShowBypassPassword(false)
        setShowBypassPin(false)
        setShowCurrentBypassKeys(false)
        setCurrentBypassPassword(null)
        setCurrentBypassPin(null)
      } else {
        // Auto focus the password input when enabled
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            bypassPasswordInputRef.current?.focus()
          })
        })
      }
      toast.success(
        next
          ? '⚡ Đã BẬT Bypass Password/PIN giao dịch'
          : '🔒 Đã TẮT Bypass Password/PIN giao dịch — đã xóa toàn bộ key'
      )
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi cập nhật')
    } finally {
      setBypassToggleSaving(false)
    }
  }

  const handleSaveBypassPassword = async () => {
    if (!bypassPassword) {
      toast.error('Vui lòng nhập mật khẩu bypass')
      return
    }
    setBypassPasswordSaving(true)
    try {
      const { data } = await api.put('/admin/settings', { bypassPassword })
      setSettings(data.settings)
      setBypassPassword('') // Clear input
      toast.success('🔑 Đã cập nhật mật khẩu bypass mới')
      if (showCurrentBypassKeys) {
        fetchBypassKeysDirect()
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi cập nhật mật khẩu bypass')
    } finally {
      setBypassPasswordSaving(false)
    }
  }

  const handleSaveBypassPin = async () => {
    if (!bypassPin || !/^\d{6}$/.test(bypassPin)) {
      toast.error('Mã PIN bypass phải gồm đúng 6 chữ số')
      return
    }
    setBypassPinSaving(true)
    try {
      const { data } = await api.put('/admin/settings', { bypassPin })
      setSettings(data.settings)
      setBypassPin('') // Clear input
      toast.success('🔑 Đã cập nhật mã PIN bypass mới')
      if (showCurrentBypassKeys) {
        fetchBypassKeysDirect()
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi cập nhật mã PIN bypass')
    } finally {
      setBypassPinSaving(false)
    }
  }

  const fetchBypassKeysDirect = async () => {
    try {
      const { data } = await api.get('/admin/settings/bypass-keys')
      setCurrentBypassPassword(data.bypassPassword)
      setCurrentBypassPin(data.bypassPin)
    } catch (err) {
      console.error(err)
    }
  }

  const fetchBypassKeys = async () => {
    setLoadingBypassKeys(true)
    try {
      const { data } = await api.get('/admin/settings/bypass-keys')
      setCurrentBypassPassword(data.bypassPassword)
      setCurrentBypassPin(data.bypassPin)
      setShowCurrentBypassKeys(true)
    } catch (err) {
      toast.error('Không thể lấy thông tin bypass hiện tại')
    } finally {
      setLoadingBypassKeys(false)
    }
  }

  const handleSaveAnnouncement = async () => {
    setAnnouncementSaving(true)
    try {
      const { data } = await api.put('/admin/settings', {
        announcementText,
        announcementLink,
        announcementEnabled,
      })
      setSettings(data.settings)
      setAnnouncement({
        text: announcementText,
        link: announcementLink,
        enabled: announcementEnabled,
      })
      toast.success('📢 Đã cập nhật thông báo hệ thống!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể lưu thông báo')
    } finally {
      setAnnouncementSaving(false)
    }
  }

  const handleSaveCategoryStyle = async (newStyle) => {
    setCategorySaving(true)
    try {
      const { data } = await api.put('/admin/settings', {
        categoryStyle: newStyle,
      })
      setSettings(data.settings)
      setCategoryStyle(data.settings?.categoryStyle || 'style-1')
      toast.success('🎨 Đã cập nhật giao diện danh mục nổi bật!')
    } catch (err) {
      toast.error(
        err.response?.data?.message || 'Lỗi khi lưu giao diện danh mục'
      )
    } finally {
      setCategorySaving(false)
    }
  }

  const handleSaveDefaultTags = async () => {
    setDefaultTagsSaving(true)
    try {
      const parsedTags = defaultTags
        .split(/[,;]+/)
        .map((t) => t.trim().toLowerCase().replace(/^#/, ''))
        .filter(Boolean)

      const { data } = await api.put('/admin/settings', {
        defaultTags: parsedTags,
      })
      setSettings(data.settings)
      setDefaultTags((data.settings?.defaultTags || ['picspy']).join(', '))
      toast.success('🏷️ Đã cập nhật cài đặt Tag mặc định thành công!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi lưu Tag mặc định')
    } finally {
      setDefaultTagsSaving(false)
    }
  }

  const handleSaveCategoriesPageStyle = async (newStyle) => {
    setCategorySaving(true)
    try {
      const { data } = await api.put('/admin/settings', {
        categoriesPageStyle: newStyle,
      })
      setSettings(data.settings)
      setCategoriesPageStyle(data.settings?.categoriesPageStyle || 'style-2')
      toast.success('🎨 Đã cập nhật giao diện trang danh mục!')
    } catch (err) {
      toast.error(
        err.response?.data?.message || 'Lỗi khi lưu giao diện trang danh mục'
      )
    } finally {
      setCategorySaving(false)
    }
  }

  const handleSaveHeroBanner = async () => {
    setHeroBannerSaving(true)
    try {
      const { data } = await api.put('/admin/settings', {
        heroBannerMode,
        heroBannerImage,
      })
      setSettings(data.settings)
      setHeroBannerMode(data.settings?.heroBannerMode || 'auto')
      setHeroBannerImage(
        data.settings?.heroBannerImage ||
          'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&q=85'
      )
      toast.success('🏞️ Đã lưu cấu hình ảnh bìa số liệu!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi lưu cấu hình ảnh bìa')
    } finally {
      setHeroBannerSaving(false)
    }
  }

  const handleSaveTrendingCarouselInterval = async () => {
    setTrendingCarouselSaving(true)
    try {
      const { data } = await api.put('/admin/settings', {
        trendingCarouselInterval: Number(trendingCarouselInterval),
      })
      setSettings(data.settings)
      setTrendingCarouselInterval(
        data.settings?.trendingCarouselInterval ?? 5000
      )
      toast.success('⏱️ Đã lưu cấu hình tự động chuyển Carousel!')
    } catch (err) {
      toast.error(
        err.response?.data?.message || 'Lỗi khi lưu cấu hình Carousel'
      )
    } finally {
      setTrendingCarouselSaving(false)
    }
  }

  const handleSaveHeroCollage = async () => {
    setHeroCollageSaving(true)
    try {
      const { data } = await api.put('/admin/settings', {
        heroCollageMode,
        heroCollageImages,
      })
      setSettings(data.settings)
      setHeroCollageMode(data.settings?.heroCollageMode || 'auto')
      setHeroCollageImages(
        data.settings?.heroCollageImages?.length >= 8
          ? data.settings.heroCollageImages
          : Array(8).fill('')
      )
      toast.success('🖼️ Đã lưu cấu hình ảnh nền Hero!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi lưu cấu hình ảnh nền')
    } finally {
      setHeroCollageSaving(false)
    }
  }

  const handleSaveGlobalLoader = async (newType) => {
    setLoaderSaving(true)
    try {
      const { data } = await api.put('/admin/settings', {
        globalLoaderType: newType,
      })
      setSettings(data.settings)
      setGlobalLoaderType(data.settings?.globalLoaderType || 'wave')
      setGlobalLoaderTypeContext(data.settings?.globalLoaderType || 'wave')
      toast.success('⚙️ Đã lưu cấu hình hiệu ứng tải toàn hệ thống!')
    } catch (err) {
      toast.error(
        err.response?.data?.message || 'Lỗi khi lưu cấu hình hiệu ứng tải'
      )
    } finally {
      setLoaderSaving(false)
    }
  }

  const handleSaveSplashMs = async (val) => {
    setSplashSaving(true)
    try {
      const { data } = await api.put('/admin/settings', { splashExtraMs: val })
      setSettings(data.settings)
      setSplashExtraMs(data.settings?.splashExtraMs ?? 0)
      setSplashExtraMsContext(data.settings?.splashExtraMs ?? 0)
      toast.success(
        `⏱️ Thời gian loading đã cập nhật: ${val >= 1000 ? (val / 1000).toFixed(1) + 's' : val + 'ms'}`
      )
    } catch (err) {
      toast.error(
        err.response?.data?.message || 'Lỗi khi lưu thời gian loading'
      )
    } finally {
      setSplashSaving(false)
    }
  }

  const handleSaveMyPostsSkeletonMs = async (val) => {
    setMyPostsSkeletonSaving(true)
    try {
      const { data } = await api.put('/admin/settings', {
        myPostsSkeletonMs: val,
      })
      setSettings(data.settings)
      setMyPostsSkeletonMs(data.settings?.myPostsSkeletonMs ?? 0)
      setMyPostsSkeletonMsContext(data.settings?.myPostsSkeletonMs ?? 0)
      toast.success(
        `🖼️ Thời gian Skeleton Loading đã cập nhật: ${val >= 1000 ? (val / 1000).toFixed(1) + 's' : val + 'ms'}`
      )
    } catch (err) {
      toast.error(
        err.response?.data?.message || 'Lỗi khi lưu thời gian Skeleton Loading'
      )
    } finally {
      setMyPostsSkeletonSaving(false)
    }
  }

  const handleSavePostLoadingDelayMs = async (val) => {
    setPostLoadingDelaySaving(true)
    try {
      const { data } = await api.put('/admin/settings', {
        postLoadingDelayMs: val,
      })
      setSettings(data.settings)
      setPostLoadingDelayMs(data.settings?.postLoadingDelayMs ?? 0)
      setPostLoadingDelayMsContext(data.settings?.postLoadingDelayMs ?? 0)
      toast.success(
        val === 0
          ? '⏱️ Đã tắt hiệu ứng trì hoãn tải ảnh!'
          : `⏱️ Đã cập nhật thời gian trì hoãn tải ảnh: ${val >= 1000 ? (val / 1000).toFixed(1) + 's' : val + 'ms'}`
      )
    } catch (err) {
      toast.error(
        err.response?.data?.message || 'Lỗi khi lưu thời gian trì hoãn tải ảnh'
      )
    } finally {
      setPostLoadingDelaySaving(false)
    }
  }

  const handleSaveBlurPremium = async (val) => {
    setSavingBlur(true)
    try {
      const { data } = await api.put('/admin/settings', {
        blurPremiumImages: val,
      })
      setSettings(data.settings)
      setBlurPremiumImages(data.settings?.blurPremiumImages || false)
      if (setBlurPremiumImagesContext) {
        setBlurPremiumImagesContext(data.settings?.blurPremiumImages || false)
      }
      toast.success(
        val
          ? '💎 Đã bật làm mờ & khóa xem trước ảnh Premium!'
          : '💎 Đã tắt làm mờ ảnh Premium!'
      )
    } catch (err) {
      toast.error(
        err.response?.data?.message || 'Lỗi khi cập nhật cài đặt làm mờ'
      )
    } finally {
      setSavingBlur(false)
    }
  }

  const handleSaveEnableRefund = async (val) => {
    setSavingRefund(true)
    try {
      const { data } = await api.put('/admin/settings', {
        enableRefund: val,
      })
      setSettings(data.settings)
      setEnableRefund(data.settings?.enableRefund || false)
      if (setEnableRefundContext) {
        setEnableRefundContext(data.settings?.enableRefund || false)
      }
      toast.success(
        val
          ? '💰 Đã bật tính năng hoàn tác đơn hàng (Refund)!'
          : '🔒 Đã tắt tính năng hoàn tác đơn hàng!'
      )
    } catch (err) {
      toast.error(
        err.response?.data?.message || 'Lỗi khi cập nhật cài đặt hoàn tiền'
      )
    } finally {
      setSavingRefund(false)
    }
  }

  const handleSavePostDetailLayout = async (val) => {
    setSavingLayout(true)
    try {
      const { data } = await api.put('/admin/settings', {
        postDetailLayout: val,
      })
      setSettings(data.settings)
      setPostDetailLayout(data.settings?.postDetailLayout || 'left-image')
      if (setPostDetailLayoutContext) {
        setPostDetailLayoutContext(
          data.settings?.postDetailLayout || 'left-image'
        )
      }
      toast.success('💎 Đã cập nhật bố cục trang chi tiết bài viết!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi cập nhật bố cục')
    } finally {
      setSavingLayout(false)
    }
  }

  const handleSaveDiscoveryAutoScrollSettings = async () => {
    setSavingDiscoveryAutoScroll(true)
    try {
      const { data } = await api.put('/admin/settings', {
        discoveryAutoScrollInterval: Number(discoveryAutoScrollInterval),
        discoveryAutoScrollStagger: Number(discoveryAutoScrollStagger),
      })
      setSettings(data.settings)
      setDiscoveryAutoScrollInterval(
        data.settings?.discoveryAutoScrollInterval ?? 10000
      )
      setDiscoveryAutoScrollStagger(
        data.settings?.discoveryAutoScrollStagger ?? 1000
      )
      toast.success('💎 Đã cập nhật cài đặt tự động cuộn khám phá!')
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          'Lỗi khi cập nhật cài đặt tự động cuộn khám phá'
      )
    } finally {
      setSavingDiscoveryAutoScroll(false)
    }
  }

  const localPreviewCSSVariables = (() => {
    const { h, s } = hexToHsl(primaryColor)
    const startVal = `hsla(${h}, ${s}%, 44%, ${brandOpacity})`
    const endVal = enableGradient ? gradientColor : startVal

    const vars = {
      '--local-brand-opacity': brandOpacity,
      '--local-brand-blur': brandBlur > 0 ? `blur(${brandBlur}px)` : 'none',
      '--local-brand-600': startVal,
      '--local-brand-500': `hsla(${h}, ${s}%, 52%, ${brandOpacity})`,
      '--local-brand-gradient-end': endVal,
      '--local-glass-bg': `rgba(15, 15, 19, ${Math.max(0.15, brandOpacity * 0.45)})`,
      '--local-glass-border': `rgba(255, 255, 255, ${0.08 + (1 - brandOpacity) * 0.07})`,
    }

    if (shadowStyle === 'glow') {
      vars['--local-box-shadow-neon-glow'] =
        `0 0 20px hsla(${h}, ${s}%, 55%, 0.45)`
    } else {
      vars['--local-box-shadow-neon-glow'] = 'none'
    }

    return vars
  })()

  if (loading)
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="space-y-2">
          <div className="h-6 bg-white/10 rounded w-48"></div>
          <div className="h-4 bg-white/5 rounded w-80"></div>
        </div>

        {/* Sub-tabs Navigation Skeleton */}
        <div className="flex gap-2 p-1.5 rounded-xl bg-white/[0.02] border border-white/5 w-fit h-12 items-center">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-8 bg-white/5 rounded-lg w-28"></div>
          ))}
        </div>

        {/* Content Card 1 Skeleton */}
        <div className="card h-28 border border-white/10 p-5 rounded-2xl flex items-center justify-between">
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-white/10 rounded w-36"></div>
            <div className="h-3 bg-white/5 rounded w-64"></div>
          </div>
          <div className="w-12 h-6 bg-white/10 rounded-full"></div>
        </div>

        {/* Content Card 2 Skeleton */}
        <div className="card h-80 border border-white/10 p-5 rounded-2xl space-y-4">
          <div className="space-y-2">
            <div className="h-4 bg-white/10 rounded w-44"></div>
            <div className="h-3 bg-white/5 rounded w-72"></div>
          </div>
          <div className="h-10 bg-white/5 rounded-xl w-full"></div>
          <div className="h-16 bg-white/5 rounded-xl w-full"></div>
          <div className="h-10 bg-white/5 rounded-xl w-full"></div>
        </div>
      </div>
    )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-bold text-xl text-white mb-1">Cài đặt hệ thống</h2>
        <p className="text-sm text-white/40">
          Quản lý các tính năng và hành vi tự động của PicSpy.
        </p>
      </div>

      {/* Sub-tabs Navigation */}
      <div className="flex gap-1.5 p-1.5 rounded-xl bg-white/[0.02] border border-white/5 w-full flex-wrap">
        {[
          { key: 'general', label: '📁 Cấu hình Chung' },
          { key: 'branding', label: '🎨 Giao diện & Màu sắc' },
          { key: 'pages', label: '📄 Cài đặt trang' },
          { key: 'maintenance', label: '⚡ Bảo trì & Test Cron' },
        ].map((subTab) => (
          <button
            key={subTab.key}
            type="button"
            onClick={() => setActiveSubTab(subTab.key)}
            className={`py-2 px-4 rounded-lg text-xs font-bold transition-all cursor-pointer text-center whitespace-nowrap
              ${
                activeSubTab === subTab.key
                  ? 'bg-brand-600 text-white shadow-md font-display'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
          >
            {subTab.label}
          </button>
        ))}
      </div>

      {activeSubTab === 'general' && (
        <div className="space-y-6">
          {/* ── Auto Approve Toggle ─── */}
          <motion.div
            className={`card p-6 border transition-all duration-300 ${
              settings?.autoApprove
                ? 'border-green-500/40 bg-green-500/5'
                : 'border-white/10'
            }`}
            layout
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors duration-300 ${
                    settings?.autoApprove ? 'bg-green-500/20' : 'bg-white/5'
                  }`}
                >
                  {settings?.autoApprove ? (
                    <Zap size={22} className="text-green-400" />
                  ) : (
                    <ZapOff size={22} className="text-white/30" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-white text-base mb-1">
                    Tự động duyệt ảnh
                  </h3>
                  <p className="text-sm text-white/50 leading-relaxed">
                    Khi <strong className="text-white/70">BẬT</strong>: ảnh
                    upload xong sẽ được duyệt tự động sau khi worker xử lý.
                    <br />
                    Khi <strong className="text-white/70">TẮT</strong>: mọi ảnh
                    sẽ ở trạng thái{' '}
                    <span className="text-yellow-400 font-semibold">
                      Chờ duyệt
                    </span>{' '}
                    — admin phải duyệt thủ công.
                  </p>
                  {settings?.autoApprove && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-3 flex items-center gap-2 text-green-400 text-xs font-semibold"
                    >
                      <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                      Đang hoạt động — ảnh mới sẽ được duyệt tự động
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Toggle button */}
              <motion.button
                whileTap={{ scale: 0.93 }}
                onClick={handleToggleAutoApprove}
                disabled={autoApproveSaving}
                className={`relative w-14 h-7 rounded-full border-2 flex-shrink-0 transition-all duration-300 focus:outline-none ${
                  settings?.autoApprove
                    ? 'bg-green-500 border-green-400 shadow-[0_0_20px_rgba(34,197,94,0.4)]'
                    : 'bg-white/10 border-white/20'
                } disabled:opacity-60 cursor-pointer`}
              >
                <motion.div
                  className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md"
                  animate={{ left: settings?.autoApprove ? '28px' : '2px' }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
                {autoApproveSaving && (
                  <Loader2
                    size={10}
                    className="absolute inset-0 m-auto text-white animate-spin"
                  />
                )}
              </motion.button>
            </div>
          </motion.div>

          {/* ── Security Bypass Master Key Card ─── */}
          <motion.div
            className={`card border transition-all duration-300 overflow-hidden ${
              settings?.bypassEnabled
                ? 'border-amber-500/40 bg-amber-500/5'
                : 'border-white/10'
            }`}
            layout
          >
            {/* Header row with Title and Switch */}
            <div className="flex items-start justify-between gap-4 p-6">
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors duration-300 ${
                    settings?.bypassEnabled ? 'bg-amber-500/20' : 'bg-white/5'
                  }`}
                >
                  {settings?.bypassEnabled ? (
                    <Shield size={22} className="text-amber-400" />
                  ) : (
                    <ShieldAlert size={22} className="text-white/30" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-white text-base mb-1">
                    Cấu hình bypass mật khẩu &amp; PIN
                  </h3>
                  <p className="text-sm text-white/50 leading-relaxed max-w-xl">
                    Cho phép Admin đặt một mật khẩu Master có thể bypass tất cả
                    kiểm tra mật khẩu (khi tắt PIN) và mã PIN giao dịch của bất
                    kỳ tài khoản nào.
                    <br />
                    <span className="text-amber-400 font-semibold text-xs block mt-1">
                      ⚠️ Cảnh báo bảo mật: Chỉ kích hoạt ở môi trường phát triển
                      (development) hoặc kiểm thử.
                    </span>
                  </p>
                </div>
              </div>

              {/* Toggle button */}
              <motion.button
                whileTap={{ scale: 0.93 }}
                onClick={handleToggleBypassEnabled}
                disabled={bypassToggleSaving}
                className={`relative w-14 h-7 rounded-full border-2 flex-shrink-0 transition-all duration-300 focus:outline-none ${
                  settings?.bypassEnabled
                    ? 'bg-amber-500 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.4)]'
                    : 'bg-white/10 border-white/20'
                } disabled:opacity-60 cursor-pointer`}
              >
                <motion.div
                  className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md"
                  animate={{ left: settings?.bypassEnabled ? '28px' : '2px' }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
                {bypassToggleSaving && (
                  <Loader2
                    size={10}
                    className="absolute inset-0 m-auto text-white animate-spin"
                  />
                )}
              </motion.button>
            </div>

            {/* Config inputs displayed at full width below the header */}
            {settings?.bypassEnabled && (
              <div className="px-6 pb-6 pt-2 border-t border-white/5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  {/* Section 1: Bypass Password */}
                  <div
                    onClick={(e) => {
                      if (
                        e.target.tagName !== 'BUTTON' &&
                        e.target.tagName !== 'INPUT'
                      ) {
                        bypassPasswordInputRef.current?.focus()
                      }
                    }}
                    className={`border rounded-2xl p-5 flex flex-col justify-between space-y-4 cursor-text transition-all duration-300 ${
                      bypassPasswordFocused
                        ? 'border-amber-500/55 bg-amber-500/[0.04] shadow-[0_0_15px_rgba(245,158,11,0.1)]'
                        : 'border-white/5 bg-white/[0.02] hover:border-white/10'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-center text-sm mb-3">
                        <span className="text-white/60 font-semibold">
                          Mật khẩu Bypass:
                        </span>
                        <span
                          className={`font-semibold ${settings?.hasBypassPassword ? 'text-green-400' : 'text-red-400'}`}
                        >
                          {settings?.hasBypassPassword
                            ? 'Đã thiết lập'
                            : 'Chưa thiết lập'}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-white/35 uppercase tracking-wider block">
                          Mật khẩu Master mới
                        </label>
                        <div className="relative flex items-center">
                          <input
                            ref={bypassPasswordInputRef}
                            type={showBypassPassword ? 'text' : 'password'}
                            placeholder="Nhập mật khẩu Master..."
                            value={bypassPassword}
                            onChange={(e) => setBypassPassword(e.target.value)}
                            onFocus={() => setBypassPasswordFocused(true)}
                            onBlur={() => setBypassPasswordFocused(false)}
                            className="input py-2.5 text-sm w-full bg-white/[0.03] border border-white/10 focus:border-amber-500/60 focus:bg-amber-500/[0.02] rounded-xl pl-3 pr-10 text-white focus:outline-none transition-all duration-200"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setShowBypassPassword(!showBypassPassword)
                            }}
                            className="absolute right-3 text-white/35 hover:text-white/60 transition-colors"
                          >
                            {showBypassPassword ? (
                              <EyeOff size={16} />
                            ) : (
                              <Eye size={16} />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSaveBypassPassword(e)
                      }}
                      disabled={bypassPasswordSaving || !bypassPassword}
                      className="w-full py-3 bg-brand-600 hover:bg-brand-500 disabled:bg-brand-600/40 text-white font-bold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-1 cursor-pointer"
                    >
                      {bypassPasswordSaving ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : settings?.hasBypassPassword && bypassPassword ? (
                        'Cập nhật mật khẩu Bypass'
                      ) : (
                        'Lưu mật khẩu Bypass'
                      )}
                    </button>
                  </div>

                  {/* Section 2: Bypass PIN */}
                  <div
                    onClick={(e) => {
                      if (e.target.tagName !== 'BUTTON') {
                        bypassPinInputRef.current?.focus()
                      }
                    }}
                    className={`border rounded-2xl p-5 flex flex-col justify-between space-y-4 cursor-text transition-all duration-300 ${
                      bypassPinFocused
                        ? 'border-amber-500/55 bg-amber-500/[0.04] shadow-[0_0_15px_rgba(245,158,11,0.1)]'
                        : 'border-white/5 bg-white/[0.02] hover:border-white/10'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-center text-sm mb-3">
                        <span className="text-white/60 font-semibold">
                          PIN Bypass:
                        </span>
                        <span
                          className={`font-semibold ${settings?.hasBypassPin ? 'text-green-400' : 'text-red-400'}`}
                        >
                          {settings?.hasBypassPin
                            ? 'Đã thiết lập'
                            : 'Chưa thiết lập'}
                        </span>
                      </div>

                      <div className="space-y-2 relative">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-bold text-white/35 uppercase tracking-wider block">
                            Mã PIN Bypass mới (6 số)
                          </label>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setShowBypassPin(!showBypassPin)
                            }}
                            className="text-white/35 hover:text-white/60 transition-colors flex items-center gap-1 text-xs font-bold"
                          >
                            {showBypassPin ? (
                              <>
                                <EyeOff size={12} /> Ẩn PIN
                              </>
                            ) : (
                              <>
                                <Eye size={12} /> Hiện PIN
                              </>
                            )}
                          </button>
                        </div>

                        {/* Hidden Input for PIN Capture */}
                        <input
                          ref={bypassPinInputRef}
                          type="tel"
                          inputMode="numeric"
                          maxLength={6}
                          value={bypassPin}
                          onChange={(e) =>
                            setBypassPin(
                              e.target.value.replace(/\D/g, '').slice(0, 6)
                            )
                          }
                          onFocus={() => setBypassPinFocused(true)}
                          onBlur={() => setBypassPinFocused(false)}
                          className="absolute opacity-0 pointer-events-none w-1 h-1"
                          id="admin-bypass-pin-input"
                        />

                        {/* Dot UI component */}
                        <div
                          onClick={(e) => {
                            e.stopPropagation()
                            bypassPinInputRef.current?.focus()
                          }}
                          className={`flex justify-center gap-2.5 py-2.5 cursor-pointer border border-dashed rounded-xl transition-all duration-200 ${
                            bypassPinFocused
                              ? 'bg-amber-500/[0.02] border-amber-500/40'
                              : 'bg-white/[0.01] hover:bg-white/[0.03] border-white/5'
                          }`}
                        >
                          {Array.from({ length: 6 }).map((_, idx) => {
                            const char = bypassPin[idx] || ''
                            const filled = bypassPin.length > idx
                            const active = bypassPin.length === idx
                            return (
                              <motion.div
                                key={idx}
                                animate={{
                                  scale: filled ? [0.85, 1.05, 1] : 1,
                                  borderColor: active
                                    ? '#f59e0b'
                                    : filled
                                      ? '#f59e0b'
                                      : 'rgba(255,255,255,0.15)',
                                  backgroundColor:
                                    filled && !showBypassPin
                                      ? '#f59e0b'
                                      : 'transparent',
                                }}
                                transition={{ duration: 0.15 }}
                                className="w-10 h-10 rounded-lg border-2 flex items-center justify-center text-sm font-bold text-white font-mono"
                              >
                                {showBypassPin && char}
                              </motion.div>
                            )
                          })}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSaveBypassPin(e)
                      }}
                      disabled={bypassPinSaving || bypassPin.length !== 6}
                      className="w-full py-3 bg-brand-600 hover:bg-brand-500 disabled:bg-brand-600/40 text-white font-bold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-1 cursor-pointer"
                    >
                      {bypassPinSaving ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : settings?.hasBypassPin && bypassPin.length === 6 ? (
                        'Cập nhật PIN Bypass'
                      ) : (
                        'Lưu PIN Bypass'
                      )}
                    </button>
                  </div>
                </div>

                {/* View Current Bypass Keys */}
                <div className="mt-4 pt-2">
                  {!showCurrentBypassKeys ? (
                    <button
                      type="button"
                      onClick={fetchBypassKeys}
                      disabled={loadingBypassKeys}
                      className="flex items-center gap-2 text-[11px] font-semibold text-white/40 hover:text-amber-400 transition-colors py-1"
                    >
                      {loadingBypassKeys ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Eye size={12} />
                      )}
                      Xem bypass hiện tại (mật khẩu &amp; PIN)
                    </button>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-black/30 border border-amber-500/20 rounded-2xl p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-amber-400/70 uppercase tracking-wider">
                          Bypass hiện tại
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setShowCurrentBypassKeys(false)
                            setCurrentBypassPassword(null)
                            setCurrentBypassPin(null)
                          }}
                          className="text-white/25 hover:text-white/50 transition-colors"
                        >
                          <X size={13} />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <p className="text-[9px] font-bold text-white/30 uppercase tracking-wider">
                            Mật khẩu Bypass
                          </p>
                          <div className="bg-white/5 border border-white/8 rounded-xl px-3 py-2 font-mono text-xs text-amber-300 select-all break-all">
                            {currentBypassPassword ?? (
                              <span className="text-white/25 italic">
                                Chưa thiết lập
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[9px] font-bold text-white/30 uppercase tracking-wider">
                            PIN Bypass
                          </p>
                          <div className="bg-white/5 border border-white/8 rounded-xl px-3 py-2 font-mono text-xs text-amber-300 tracking-widest select-all">
                            {currentBypassPin ? (
                              currentBypassPin.split('').join(' ')
                            ) : (
                              <span className="text-white/25 italic">
                                Chưa thiết lập
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            )}
          </motion.div>

          {/* ── Default Tags Setting Card ─── */}
          <motion.div className="card p-6 border border-white/10 space-y-4 rounded-2xl bg-white/[0.01]">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 flex-shrink-0">
                <Tag size={22} />
              </div>
              <div>
                <h3 className="font-bold text-white text-base mb-1">
                  🏷️ Tag Mặc Định Khi Đăng Bài
                </h3>
                <p className="text-xs text-white/50 leading-relaxed">
                  Các thẻ (tags) cấu hình tại đây sẽ luôn tự động nằm ở{' '}
                  <strong>ĐẦU DANH SÁCH TAGS</strong> của mỗi bài đăng mới đăng
                  tải trên hệ thống.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <input
                type="text"
                className="input text-xs font-mono flex-1 bg-black/40 border-white/15 focus:border-violet-500 py-2.5"
                placeholder="Nhập các tag cách nhau bằng dấu phẩy, VD: picspy, picspyart"
                value={defaultTags}
                onChange={(e) => setDefaultTags(e.target.value)}
              />
              <button
                type="button"
                onClick={handleSaveDefaultTags}
                disabled={defaultTagsSaving}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-violet-600 to-indigo-600 text-white border border-violet-500/30 hover:shadow-lg hover:shadow-violet-900/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 flex-shrink-0"
              >
                {defaultTagsSaving ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Save size={15} />
                )}
                {defaultTagsSaving ? 'Đang Lưu Tag...' : 'Lưu Tag Mặc Định'}
              </button>
            </div>

            <div className="p-3 bg-violet-950/30 border border-violet-500/20 rounded-xl flex items-center justify-between text-xs text-violet-200">
              <span className="text-white/60">
                👉 Tag tự động thêm ở đầu bài viết:
              </span>
              <div className="flex flex-wrap gap-1.5 font-mono font-bold">
                {defaultTags ? (
                  defaultTags
                    .split(/[,;]+/)
                    .map((t) => t.trim().toLowerCase().replace(/^#/, ''))
                    .filter(Boolean)
                    .map((t) => (
                      <span
                        key={t}
                        className="bg-violet-600/30 text-violet-300 px-2 py-0.5 rounded-md border border-violet-500/30"
                      >
                        #{t}
                      </span>
                    ))
                ) : (
                  <span className="bg-violet-600/30 text-violet-300 px-2 py-0.5 rounded-md border border-violet-500/30">
                    #picspy
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── Theme Customizer Card ─── */}
      {activeSubTab === 'branding' && (
        <div className="card p-6 border border-white/10 space-y-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center flex-shrink-0">
              <Palette className="text-brand-400" size={22} />
            </div>
            <div>
              <h3 className="font-bold text-white text-base mb-1">
                Tùy biến Giao diện (Website Theme)
              </h3>
              <p className="text-sm text-white/50 leading-relaxed">
                Thay đổi tông màu thương hiệu chính (`primary`) và dải màu
                gradient trên toàn bộ nút, tag, trạng thái của website.
              </p>
            </div>
          </div>

          {/* Color picker inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-white/60 block">
                Màu chính (Primary Color)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-10 h-10 rounded-lg overflow-hidden border-0 cursor-pointer bg-transparent"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="input py-2 text-xs flex-1"
                  placeholder="#hex_color"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-white/60 block">
                Màu Gradient cuối (Gradient End)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={gradientColor}
                  onChange={(e) => setGradientColor(e.target.value)}
                  className="w-10 h-10 rounded-lg overflow-hidden border-0 cursor-pointer bg-transparent"
                />
                <input
                  type="text"
                  value={gradientColor}
                  onChange={(e) => setGradientColor(e.target.value)}
                  className="input py-2 text-xs flex-1"
                  placeholder="#hex_color"
                />
              </div>
            </div>
          </div>

          {/* Transparency & Backdrop Blur Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-white/5">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-white/60">
                  Độ trong suốt màu chính (Opacity)
                </label>
                <span className="text-xs font-bold text-brand-400">
                  {Math.round(brandOpacity * 100)}%
                </span>
              </div>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={brandOpacity}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value)
                    setBrandOpacity(val)
                  }}
                  className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-white/10 accent-brand-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-white/60">
                  Độ nhòe nền (Backdrop Blur)
                </label>
                <span className="text-xs font-bold text-brand-400">
                  {brandBlur}px
                </span>
              </div>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max="24"
                  step="2"
                  value={brandBlur}
                  onChange={(e) => {
                    const val = parseInt(e.target.value)
                    setBrandBlur(val)
                  }}
                  className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-white/10 accent-brand-500"
                />
              </div>
            </div>
          </div>

          {/* Advanced Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-white/5">
            {/* Gradient Toggle */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-white/60">
                  Sử dụng dải màu (Gradient Color)
                </label>
                <span className="text-xs font-bold text-brand-400">
                  {enableGradient ? 'BẬT' : 'TẮT'}
                </span>
              </div>
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setEnableGradient(!enableGradient)}
                  className={`relative w-12 h-6 rounded-full border transition-all duration-300 flex-shrink-0 focus:outline-none ${
                    enableGradient
                      ? 'bg-brand-500 border-brand-400 shadow-[0_0_12px_rgba(124,58,237,0.3)]'
                      : 'bg-white/10 border-white/20'
                  }`}
                >
                  <div
                    className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-md transition-all duration-300"
                    style={{ left: enableGradient ? '26px' : '2px' }}
                  />
                </button>
                <span className="text-[10px] text-white/40 leading-snug">
                  {enableGradient
                    ? 'Bật hiển thị gradient chuyển màu mượt mà'
                    : 'Chỉ sử dụng duy nhất màu chính (Solid)'}
                </span>
              </div>
            </div>

            {/* Shadow Style Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-white/60 block">
                Hiệu ứng bóng đổ / Tỏa sáng (Shadow Style)
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { key: 'none', label: 'Không bóng' },
                  { key: 'soft', label: 'Mặc định' },
                  { key: 'glow', label: 'Sáng Neon' },
                ].map((style) => (
                  <button
                    key={style.key}
                    type="button"
                    onClick={() => setShadowStyle(style.key)}
                    className={`px-3 py-2 rounded-lg border text-xs font-bold transition-all text-center cursor-pointer ${
                      shadowStyle === style.key
                        ? 'border-brand-500 bg-brand-500/10 text-white shadow-[0_0_10px_rgba(124,58,237,0.15)]'
                        : 'border-white/5 bg-white/5 hover:border-white/10 text-white/60'
                    }`}
                  >
                    {style.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Live Preview buttons sample */}
          <div
            className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-3 pt-4 border-t border-white/5"
            style={localPreviewCSSVariables}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white/50 block">
                Bản xem trước nút nhấn (Live Preview)
              </span>
              <span className="text-[10px] text-yellow-500 font-bold bg-yellow-500/10 px-2 py-0.5 rounded-full animate-pulse">
                Nháp chưa áp dụng
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4 py-3 justify-center">
              {/* Preview Primary Button */}
              <button
                type="button"
                className="px-6 py-2.5 rounded-xl text-xs font-bold text-white transition-all duration-300"
                style={{
                  background:
                    'linear-gradient(135deg, var(--local-brand-600) 0%, var(--local-brand-gradient-end) 100%)',
                  backdropFilter: 'var(--local-brand-blur, none)',
                  WebkitBackdropFilter: 'var(--local-brand-blur, none)',
                  boxShadow:
                    '0 4px 14px rgba(0, 0, 0, 0.25), var(--local-box-shadow-neon-glow, 0 0 0 transparent)',
                  border:
                    '1px solid rgba(255, 255, 255, calc((1 - var(--local-brand-opacity, 1)) * 0.15))',
                }}
              >
                Nút Chính mẫu <ArrowRight size={13} className="inline ml-1" />
              </button>

              {/* Preview Glass Button */}
              <button
                type="button"
                className="px-6 py-2.5 rounded-xl text-xs font-bold text-white/80 transition-all duration-300 border"
                style={{
                  background: 'var(--local-glass-bg)',
                  backdropFilter: 'blur(28px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(28px) saturate(180%)',
                  borderColor: 'var(--local-glass-border)',
                  boxShadow:
                    '0 8px 32px rgba(0,0,0,0.25), var(--local-box-shadow-neon-glow, 0 0 0 transparent)',
                }}
              >
                Nút Kính mẫu
              </button>
            </div>
          </div>

          {/* Presets */}
          <div className="space-y-2.5 pt-4 border-t border-white/5">
            <label className="text-xs font-semibold text-white/60 block">
              Mẫu màu thiết lập sẵn (Theme Presets)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {COLOR_PRESETS.map((preset) => {
                const isActive =
                  primaryColor.toLowerCase() === preset.primary.toLowerCase() &&
                  gradientColor.toLowerCase() ===
                    preset.gradient.toLowerCase() &&
                  brandOpacity === preset.opacity &&
                  brandBlur === preset.blur &&
                  enableGradient === true &&
                  shadowStyle === 'soft'
                return (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => {
                      setPrimaryColor(preset.primary)
                      setGradientColor(preset.gradient)
                      setBrandOpacity(preset.opacity)
                      setBrandBlur(preset.blur)
                      setEnableGradient(true)
                      setShadowStyle('soft')
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isActive
                        ? 'border-brand-500 bg-brand-500/10 shadow-[0_0_12px_rgba(124,58,237,0.15)]'
                        : 'border-white/5 bg-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className="w-3.5 h-3.5 rounded-full border border-white/20"
                        style={{ background: preset.primary }}
                      />
                      <div
                        className="w-3.5 h-3.5 rounded-full border border-white/20 -ml-1.5"
                        style={{ background: preset.gradient }}
                      />
                      <span className="text-xs font-bold text-white/80 truncate">
                        {preset.name}
                      </span>
                    </div>
                    <span className="text-[10px] text-white/35 leading-tight block truncate">
                      {preset.desc}
                    </span>
                  </button>
                )
              })}

              {/* Custom Option */}
              {(() => {
                const isCustomActive = !COLOR_PRESETS.some(
                  (p) =>
                    p.primary.toLowerCase() === primaryColor.toLowerCase() &&
                    p.gradient.toLowerCase() === gradientColor.toLowerCase() &&
                    p.opacity === brandOpacity &&
                    p.blur === brandBlur &&
                    enableGradient === true &&
                    shadowStyle === 'soft'
                )
                return (
                  <button
                    type="button"
                    onClick={() => {
                      setPrimaryColor(customColors.primary)
                      setGradientColor(customColors.gradient)
                      setBrandOpacity(customColors.opacity)
                      setBrandBlur(customColors.blur)
                      setEnableGradient(customColors.enableGradient)
                      setShadowStyle(customColors.shadowStyle)
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isCustomActive
                        ? 'border-brand-500 bg-brand-500/10 shadow-[0_0_12px_rgba(124,58,237,0.15)]'
                        : 'border-white/5 bg-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className="w-3.5 h-3.5 rounded-full border border-white/20"
                        style={{ background: customColors.primary }}
                      />
                      <div
                        className="w-3.5 h-3.5 rounded-full border border-white/20 -ml-1.5"
                        style={{ background: customColors.gradient }}
                      />
                      <span className="text-xs font-bold text-white/80 truncate">
                        Custom
                      </span>
                    </div>
                    <span className="text-[10px] text-white/35 leading-tight block truncate">
                      Màu tùy chọn của riêng bạn
                    </span>
                  </button>
                )
              })()}
            </div>
          </div>

          {/* Save button */}
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => handleSaveColors()}
              disabled={colorSaving}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-brand-900/30"
            >
              {colorSaving ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Save size={13} />
              )}
              Lưu cấu hình màu
            </button>
          </div>
        </div>
      )}

      {/* ── Announcement Banner Card ─── */}
      {activeSubTab === 'general' && (
        <div className="card p-6 border border-white/10 space-y-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center flex-shrink-0">
              <Megaphone className="text-brand-400" size={22} />
            </div>
            <div>
              <h3 className="font-bold text-white text-base mb-1">
                Thông báo hệ thống (Announcement Banner)
              </h3>
              <p className="text-sm text-white/50 leading-relaxed">
                Hiển thị một thanh thông báo toàn trang ở đầu website cho toàn
                bộ người dùng.
              </p>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            {/* Enable/Disable Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
              <div>
                <span className="text-xs font-semibold text-white block">
                  Trạng thái thông báo
                </span>
                <span className="text-[10px] text-white/40 block">
                  Bật để hiển thị banner thông báo trên toàn trang
                </span>
              </div>
              <motion.button
                whileTap={{ scale: 0.93 }}
                type="button"
                onClick={() => setAnnouncementEnabled(!announcementEnabled)}
                className={`relative w-14 h-7 rounded-full border-2 flex-shrink-0 transition-all duration-300 focus:outline-none ${
                  announcementEnabled
                    ? 'bg-brand-600 border-brand-500 shadow-[0_0_20px_rgba(124,58,237,0.4)]'
                    : 'bg-white/10 border-white/20'
                } cursor-pointer`}
              >
                <motion.div
                  className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md"
                  animate={{ left: announcementEnabled ? '28px' : '2px' }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </motion.button>
            </div>

            {/* Text Input */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-white/60 block">
                Nội dung thông báo
              </label>
              <textarea
                value={announcementText}
                onChange={(e) => setAnnouncementText(e.target.value)}
                className="input text-xs w-full py-2 px-3 resize-none h-16"
                placeholder="Nhập nội dung hiển thị trên banner (ví dụ: Bảo trì hệ thống từ 2h - 4h sáng mai)..."
              />
            </div>

            {/* Link Input */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-white/60 block">
                Đường dẫn liên kết (Link URL - Tùy chọn)
              </label>
              <input
                type="text"
                value={announcementLink}
                onChange={(e) => setAnnouncementLink(e.target.value)}
                className="input text-xs w-full py-2 px-3"
                placeholder="https://picspy.com/news/maintenance-update (hoặc bỏ trống nếu không cần click)"
              />
            </div>
          </div>

          {/* Save button */}
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleSaveAnnouncement}
              disabled={announcementSaving}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-brand-900/30"
            >
              {announcementSaving ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Save size={13} />
              )}
              Lưu và áp dụng thông báo
            </button>
          </div>
        </div>
      )}

      {/* ── Global Loading Style Card ─── */}
      {activeSubTab === 'general' && (
        <div className="card p-6 border border-white/10 space-y-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center flex-shrink-0">
              <RefreshCw className="text-brand-400" size={22} />
            </div>
            <div>
              <h3 className="font-bold text-white text-base mb-1">
                Hiệu ứng tải trang (Global Loading Style)
              </h3>
              <p className="text-sm text-white/50 leading-relaxed">
                Chọn hiệu ứng hiển thị khi người dùng tải trang, đổi chủ đề hoặc
                tải dữ liệu trên toàn hệ thống.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {[
              {
                key: 'wave',
                title: '🌊 Sóng chữ nhiều màu (Liquid Wave)',
                desc: 'Từng chữ PICSPY lần lượt đầy nước từ dưới lên, màu sắc đồng bộ với chủ đề website.',
                preview: (
                  <div className="h-28 rounded-xl bg-black/40 border border-white/5 flex items-center justify-center overflow-hidden p-4">
                    <div
                      className="liquid-loader scale-75 select-none"
                      aria-label="PICSPY"
                    >
                      <div className="letter">
                        <span className="bg">P</span>
                        <span className="fg p1">P</span>
                      </div>
                      <div className="letter">
                        <span className="bg">I</span>
                        <span className="fg i">I</span>
                      </div>
                      <div className="letter">
                        <span className="bg">C</span>
                        <span className="fg c">C</span>
                      </div>
                      <div className="letter">
                        <span className="bg">S</span>
                        <span className="fg s">S</span>
                      </div>
                      <div className="letter">
                        <span className="bg">P</span>
                        <span className="fg p2">P</span>
                      </div>
                      <div className="letter">
                        <span className="bg">Y</span>
                        <span className="fg y">Y</span>
                      </div>
                    </div>
                  </div>
                ),
              },
              {
                key: 'text-wave',
                title: '💧 Sóng nước đơn sắc (Text Wave)',
                desc: 'Chữ PICSPY hiệu ứng nước sóng dạng clip-path đồng nhất, glow nhẹ theo màu chủ đề.',
                preview: (
                  <div className="h-28 rounded-xl bg-black/40 border border-white/5 flex items-center justify-center overflow-hidden">
                    <div className="text-wave-loader size-md select-none">
                      <span>PICSPY</span>
                      <span>PICSPY</span>
                    </div>
                  </div>
                ),
              },
              {
                key: 'banter',
                title: '🇻🇳 Lưới ảnh ngôi sao (Banter Star Grid)',
                desc: 'Hiển thị lưới 9 ô vuông di chuyển theo thuật toán xếp hình với lá cờ Việt Nam mix-blend độc đáo.',
                preview: (
                  <div className="h-28 rounded-xl bg-black/40 border border-white/5 flex items-center justify-center overflow-hidden p-4">
                    <div
                      className="banter-loader-container scale-75 select-none"
                      style={{ backgroundColor: '#0b0f19' }}
                    >
                      <div className="banter-loader">
                        <div className="banter-loader__box"></div>
                        <div className="banter-loader__box"></div>
                        <div className="banter-loader__box"></div>
                        <div className="banter-loader__box"></div>
                        <div className="banter-loader__box"></div>
                        <div className="banter-loader__box"></div>
                        <div className="banter-loader__box"></div>
                        <div className="banter-loader__box"></div>
                        <div className="banter-loader__box"></div>
                      </div>
                      <div className="photo-overlay"></div>
                    </div>
                  </div>
                ),
              },
            ].map((loaderOpt) => (
              <div
                key={loaderOpt.key}
                onClick={() =>
                  !loaderSaving && handleSaveGlobalLoader(loaderOpt.key)
                }
                className={`p-4 rounded-xl border transition-all duration-300 cursor-pointer text-left flex flex-col justify-between group min-h-[220px]
                  ${
                    globalLoaderType === loaderOpt.key
                      ? 'border-brand-500 bg-brand-500/5 shadow-md shadow-brand-500/5'
                      : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                  }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p
                      className={`text-xs font-bold transition-colors ${globalLoaderType === loaderOpt.key ? 'text-brand-300' : 'text-white group-hover:text-brand-300'}`}
                    >
                      {loaderOpt.title}
                    </p>
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-md border
                      ${
                        globalLoaderType === loaderOpt.key
                          ? 'border-brand-500/30 bg-brand-500/10 text-brand-300'
                          : 'border-white/10 text-white/30'
                      }`}
                    >
                      {globalLoaderType === loaderOpt.key
                        ? 'Đang hoạt động'
                        : 'Kích hoạt'}
                    </span>
                  </div>
                  <p className="text-[10px] text-white/50 leading-relaxed">
                    {loaderOpt.desc}
                  </p>
                </div>
                {loaderOpt.preview}
              </div>
            ))}
          </div>

          {/* ── Splash Duration Slider ───────────────────────── */}
          <div className="mt-6 p-5 rounded-xl border border-white/10 bg-white/[0.02] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="text-lg">⏱️</span> Thời gian hiệu ứng Loading
                </h4>
                <p className="text-[11px] text-white/40 mt-0.5">
                  Thời gian cộng thêm vào sau khi hệ thống tải xong dữ liệu để
                  kéo dài hiệu ứng tải trang
                </p>
              </div>
              {splashSaving && (
                <span className="flex items-center gap-1.5 text-xs text-brand-400 font-semibold animate-pulse">
                  Đang lưu...
                </span>
              )}
            </div>

            {/* Value Display */}
            <div className="flex items-baseline gap-2">
              <span
                className="text-3xl font-black tabular-nums tracking-tight"
                style={{
                  color:
                    'hsla(var(--color-brand-h), var(--color-brand-s), 65%, 1)',
                }}
              >
                {splashExtraMs >= 1000
                  ? (splashExtraMs / 1000).toFixed(1)
                  : splashExtraMs}
              </span>
              <span className="text-sm font-bold text-white/40">
                {splashExtraMs >= 1000 ? 'giây' : 'ms'}
              </span>
              {splashExtraMs === 0 && (
                <span className="ml-2 text-[10px] font-semibold text-emerald-400/80 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                  Tắt
                </span>
              )}
            </div>

            {/* Slider */}
            <div className="relative pt-1 pb-2">
              <input
                type="range"
                min={0}
                max={10000}
                step={100}
                value={splashExtraMs}
                onChange={(e) => setSplashExtraMs(Number(e.target.value))}
                onMouseUp={(e) => handleSaveSplashMs(Number(e.target.value))}
                onTouchEnd={(e) => handleSaveSplashMs(Number(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, hsla(var(--color-brand-h), var(--color-brand-s), 55%, 1) 0%, hsla(var(--color-brand-h), var(--color-brand-s), 55%, 1) ${(splashExtraMs / 10000) * 100}%, rgba(255,255,255,0.08) ${(splashExtraMs / 10000) * 100}%, rgba(255,255,255,0.08) 100%)`,
                }}
              />
              {/* Tick marks */}
              <div className="relative w-full h-5 mt-2">
                {[0, 1000, 2000, 3000, 5000, 7000, 10000].map((v) => {
                  const pct = (v / 10000) * 100
                  const isLeftBound = v === 0
                  const isRightBound = v === 10000

                  let transformStyle = 'translateX(-50%)'
                  let leftStyle = `${pct}%`
                  if (isLeftBound) {
                    leftStyle = '0%'
                    transformStyle = 'none'
                  } else if (isRightBound) {
                    leftStyle = 'auto'
                    transformStyle = 'none'
                  }

                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => {
                        setSplashExtraMs(v)
                        handleSaveSplashMs(v)
                      }}
                      className={`absolute text-[9px] font-mono transition-colors cursor-pointer hover:text-brand-300 ${
                        splashExtraMs === v
                          ? 'text-brand-400 font-bold'
                          : 'text-white/25'
                      }`}
                      style={{
                        left: leftStyle,
                        right: isRightBound ? '0%' : 'auto',
                        transform: transformStyle,
                      }}
                    >
                      {v === 0 ? '0' : v >= 1000 ? `${v / 1000}s` : `${v}ms`}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Preset buttons row */}
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Tắt (0ms)', value: 0 },
                { label: 'Nhanh (500ms)', value: 500 },
                { label: 'Vừa (1.5s)', value: 1500 },
                { label: 'Lâu (3s)', value: 3000 },
                { label: 'Rất lâu (5s)', value: 5000 },
                { label: 'Siêu lâu (10s)', value: 10000 },
              ].map((p) => (
                <button
                  key={p.value}
                  onClick={() => {
                    setSplashExtraMs(p.value)
                    handleSaveSplashMs(p.value)
                  }}
                  className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                    splashExtraMs === p.value
                      ? 'border-brand-500/40 bg-brand-500/10 text-brand-300'
                      : 'border-white/8 bg-white/[0.03] text-white/40 hover:border-white/15 hover:text-white/60'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Page Specific Settings ─── */}
      {activeSubTab === 'pages' && (
        <div className="space-y-6">
          <div className="card p-5 border border-white/10 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-white text-sm mb-1 font-display">
                  Cài đặt giao diện trang
                </h4>
                <p className="text-xs text-white/40">
                  Chọn trang cụ thể bạn muốn thiết kế và thay đổi phong cách
                  hiển thị.
                </p>
              </div>
              <div className="relative">
                <select
                  value={selectedConfigPage}
                  onChange={(e) => setSelectedConfigPage(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-brand-500 cursor-pointer pr-10 appearance-none min-w-[200px]"
                >
                  <option value="home" className="bg-[#121214]">
                    🏠 Trang chủ (Home Page)
                  </option>
                  <option value="categories" className="bg-[#121214]">
                    📁 Trang danh mục (Categories Page)
                  </option>
                  <option value="search" className="bg-[#121214]">
                    🔍 Trang khám phá (Search Page)
                  </option>
                  <option value="profile" className="bg-[#121214]">
                    👤 Trang cá nhân (Profile Page)
                  </option>
                  <option value="post-detail" className="bg-[#121214]">
                    💎 Trang chi tiết (Post Detail)
                  </option>
                  <option value="my-posts" className="bg-[#121214]">
                    🖼️ Ảnh của tôi (My Posts)
                  </option>
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-white/40 text-xs">
                  ▼
                </div>
              </div>
            </div>
          </div>

          {/* Render Home Page Config */}
          {selectedConfigPage === 'home' && (
            <>
              <div className="card p-6 border-white/5 space-y-5 bg-white/[0.01]">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Palette size={16} className="text-brand-400" /> Cấu hình
                      Giao diện Danh mục nổi bật
                    </h3>
                    <p className="text-[11px] text-white/40">
                      Chọn kiểu hiển thị của hàng danh mục nổi bật ngoài trang
                      chủ
                    </p>
                  </div>
                  {categorySaving && (
                    <span className="flex items-center gap-1.5 text-xs text-brand-400 font-semibold">
                      <Loader2 size={12} className="animate-spin" /> Đang cập
                      nhật...
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    {
                      key: 'style-1',
                      title: 'Style 1: Ảnh bìa Đơn (Cổ điển)',
                      desc: 'Tự động lấy 1 ảnh nổi bật nhất có lượt xem cao nhất của danh mục làm ảnh bìa.',
                    },
                    {
                      key: 'style-2',
                      title: 'Style 2: Lưới 4 ảnh nghệ thuật',
                      desc: 'Lấy top 4 ảnh nhiều views nhất sắp xếp dạng lưới Asymmetrical Staggered nghệ thuật.',
                    },
                    {
                      key: 'style-3',
                      title: 'Style 3: Slideshow tự xoay vòng',
                      desc: 'Tự động xoay vòng 5-6 ảnh nổi bật nhất sau mỗi 2 giây bằng hiệu ứng mờ dần (Fade).',
                    },
                    {
                      key: 'style-4',
                      title: 'Style 4: Lát cắt dọc tương tác',
                      desc: 'Chia card làm 3 cột dọc. Hover cột nào cột đó mở rộng (flex-grow) và hiển thị chi tiết prompt.',
                    },
                  ].map((styleOpt) => (
                    <div
                      key={styleOpt.key}
                      onClick={() =>
                        !categorySaving && handleSaveCategoryStyle(styleOpt.key)
                      }
                      className={`p-4 rounded-xl border transition-all duration-300 cursor-pointer text-left flex flex-col justify-between group min-h-[160px]
                        ${
                          categoryStyle === styleOpt.key
                            ? 'border-brand-500 bg-brand-500/5 shadow-md shadow-brand-500/5'
                            : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                        }`}
                    >
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <p
                            className={`text-xs font-bold transition-colors ${categoryStyle === styleOpt.key ? 'text-brand-300' : 'text-white group-hover:text-brand-300'}`}
                          >
                            {styleOpt.title}
                          </p>
                          <p className="text-[10px] text-white/50 mt-2 leading-relaxed">
                            {styleOpt.desc}
                          </p>
                        </div>
                        <StylePreview styleKey={styleOpt.key} />
                      </div>
                      <div className="flex justify-end mt-4">
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-md border
                          ${
                            categoryStyle === styleOpt.key
                              ? 'border-brand-500/30 bg-brand-500/10 text-brand-300'
                              : 'border-white/10 text-white/30'
                          }`}
                        >
                          {categoryStyle === styleOpt.key
                            ? 'Đang hoạt động'
                            : 'Kích hoạt'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Hero Banner Landscape Image Config ─── */}
              <div className="card p-6 border border-white/10 space-y-5 bg-white/[0.01]">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center flex-shrink-0">
                    <Images className="text-brand-400" size={22} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base mb-1 font-display">
                      Ảnh bìa Số liệu trang chủ (Hero Banner Image)
                    </h3>
                    <p className="text-sm text-white/50 leading-relaxed">
                      Cài đặt hiển thị cho bức ảnh phong cảnh nằm phía sau thanh
                      số liệu thống kê (Stats bar).
                    </p>
                  </div>
                </div>

                {/* Banner Mode selector */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <button
                    type="button"
                    onClick={() => setHeroBannerMode('auto')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      heroBannerMode === 'auto'
                        ? 'border-brand-500 bg-brand-500/10'
                        : 'border-white/5 bg-white/5 hover:border-white/10'
                    }`}
                  >
                    <p className="text-xs font-bold text-white mb-1">
                      🤖 Tự động (Auto)
                    </p>
                    <span className="text-[10px] text-white/40 leading-relaxed block">
                      Tự động chọn hình nền có lượt xem cao nhất trong hệ thống.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setHeroBannerMode('manual')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      heroBannerMode === 'manual'
                        ? 'border-brand-500 bg-brand-500/10'
                        : 'border-white/5 bg-white/5 hover:border-white/10'
                    }`}
                  >
                    <p className="text-xs font-bold text-white mb-1">
                      ✍️ Thủ công (Manual)
                    </p>
                    <span className="text-[10px] text-white/40 leading-relaxed block">
                      Tự nhập liên kết (URL) ảnh tùy ý của bạn làm hình nền.
                    </span>
                  </button>
                </div>

                {/* Manual URL input if manual mode selected */}
                {heroBannerMode === 'manual' && (
                  <div className="space-y-2 pt-2">
                    <label className="text-xs font-semibold text-white/60 block">
                      Đường dẫn hình ảnh (Image URL)
                    </label>
                    <input
                      type="text"
                      value={heroBannerImage}
                      onChange={(e) => setHeroBannerImage(e.target.value)}
                      className="input text-xs w-full py-2.5 px-3"
                      placeholder="https://example.com/your-custom-landscape.jpg"
                    />
                  </div>
                )}

                {/* Save button */}
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleSaveHeroBanner}
                    disabled={heroBannerSaving}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-brand-900/30 font-display"
                  >
                    {heroBannerSaving ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Save size={13} />
                    )}
                    Lưu cấu hình ảnh bìa
                  </button>
                </div>
              </div>

              {/* ── Hero Collage Images Config ─── */}
              <div className="card p-6 border border-white/10 space-y-5 bg-white/[0.01]">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center flex-shrink-0">
                    <Palette className="text-brand-400" size={22} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base mb-1 font-display">
                      Ảnh nền ghép Hero (Hero Collage Background)
                    </h3>
                    <p className="text-sm text-white/50 leading-relaxed">
                      Cài đặt hiển thị cho 8 bức ảnh ghép đan xen làm hình nền
                      mờ phía sau tiêu đề chính trang chủ.
                    </p>
                  </div>
                </div>

                {/* Collage Mode selector */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <button
                    type="button"
                    onClick={() => setHeroCollageMode('auto')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      heroCollageMode === 'auto'
                        ? 'border-brand-500 bg-brand-500/10'
                        : 'border-white/5 bg-white/5 hover:border-white/10'
                    }`}
                  >
                    <p className="text-xs font-bold text-white mb-1">
                      🤖 Tự động (Auto)
                    </p>
                    <span className="text-[10px] text-white/40 leading-relaxed block">
                      Tự động lấy 8 hình ảnh mới được duyệt gần nhất trong hệ
                      thống.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setHeroCollageMode('manual')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      heroCollageMode === 'manual'
                        ? 'border-brand-500 bg-brand-500/10'
                        : 'border-white/5 bg-white/5 hover:border-white/10'
                    }`}
                  >
                    <p className="text-xs font-bold text-white mb-1">
                      ✍️ Thủ công (Manual)
                    </p>
                    <span className="text-[10px] text-white/40 leading-relaxed block">
                      Tự nhập danh sách 8 liên kết ảnh tĩnh tùy chọn làm hình
                      nền.
                    </span>
                  </button>
                </div>

                {/* Manual 8 URLs input grid */}
                {heroCollageMode === 'manual' && (
                  <div className="space-y-4 pt-2">
                    <label className="text-xs font-semibold text-white/60 block">
                      Danh sách 8 liên kết ảnh (URLs - WebP khuyên dùng)
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {Array.from({ length: 8 }).map((_, idx) => (
                        <div key={idx} className="space-y-1">
                          <span className="text-[10px] text-white/40 font-semibold">
                            Ảnh #{idx + 1}
                          </span>
                          <input
                            type="text"
                            value={heroCollageImages[idx] || ''}
                            onChange={(e) => {
                              const newImgs = [...heroCollageImages]
                              newImgs[idx] = e.target.value
                              setHeroCollageImages(newImgs)
                            }}
                            className="input text-[11px] w-full py-2 px-2.5"
                            placeholder={`URL cho hình nền thứ ${idx + 1}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Save button */}
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleSaveHeroCollage}
                    disabled={heroCollageSaving}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-brand-900/30 font-display"
                  >
                    {heroCollageSaving ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Save size={13} />
                    )}
                    Lưu cấu hình ảnh nền
                  </button>
                </div>
              </div>

              {/* ── Post Loading Delay Slider ───────────────────────── */}
              <div className="card p-6 border border-white/10 space-y-4 bg-white/[0.01]">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span className="text-base">⏱️</span> Thời gian hiệu ứng
                      Loading post
                    </h3>
                    <p className="text-[11px] text-white/40 mt-0.5">
                      Khoảng thời gian trì hoãn tải ảnh (giả lập loading) khi
                      đổi danh mục/tab ngoài trang chủ để người dùng thưởng thức
                      hiệu ứng mượt mà.
                    </p>
                  </div>
                  {postLoadingDelaySaving && (
                    <span className="flex items-center gap-1.5 text-xs text-brand-400 font-semibold animate-pulse">
                      Đang lưu...
                    </span>
                  )}
                </div>

                {/* Value Display */}
                <div className="flex items-baseline gap-2 pt-2">
                  <span
                    className="text-3xl font-black tabular-nums tracking-tight"
                    style={{
                      color:
                        'hsla(var(--color-brand-h), var(--color-brand-s), 65%, 1)',
                    }}
                  >
                    {postLoadingDelayMs >= 1000
                      ? (postLoadingDelayMs / 1000).toFixed(1)
                      : postLoadingDelayMs}
                  </span>
                  <span className="text-sm font-bold text-white/40">
                    {postLoadingDelayMs >= 1000 ? 'giây' : 'ms'}
                  </span>
                  {postLoadingDelayMs === 0 && (
                    <span className="ml-2 text-[10px] font-semibold text-emerald-400/80 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                      Tắt
                    </span>
                  )}
                </div>

                {/* Slider */}
                <div className="relative pt-1 pb-2">
                  <input
                    type="range"
                    min={0}
                    max={5000}
                    step={100}
                    value={postLoadingDelayMs}
                    onChange={(e) =>
                      setPostLoadingDelayMs(Number(e.target.value))
                    }
                    onMouseUp={(e) =>
                      handleSavePostLoadingDelayMs(Number(e.target.value))
                    }
                    onTouchEnd={(e) =>
                      handleSavePostLoadingDelayMs(Number(e.target.value))
                    }
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, hsla(var(--color-brand-h), var(--color-brand-s), 55%, 1) 0%, hsla(var(--color-brand-h), var(--color-brand-s), 55%, 1) ${(postLoadingDelayMs / 5000) * 100}%, rgba(255,255,255,0.08) ${(postLoadingDelayMs / 5000) * 100}%, rgba(255,255,255,0.08) 100%)`,
                    }}
                  />
                  {/* Tick marks */}
                  <div className="relative w-full h-5 mt-2">
                    {[0, 500, 1000, 1500, 2000, 3000, 4000, 5000].map((v) => {
                      const pct = (v / 5000) * 100
                      const isLeftBound = v === 0
                      const isRightBound = v === 5000

                      let transformStyle = 'translateX(-50%)'
                      let leftStyle = `${pct}%`
                      if (isLeftBound) {
                        leftStyle = '0%'
                        transformStyle = 'none'
                      } else if (isRightBound) {
                        leftStyle = 'auto'
                        transformStyle = 'none'
                      }

                      return (
                        <button
                          key={v}
                          type="button"
                          onClick={() => {
                            setPostLoadingDelayMs(v)
                            handleSavePostLoadingDelayMs(v)
                          }}
                          className={`absolute text-[9px] font-mono transition-colors cursor-pointer hover:text-brand-300 ${
                            postLoadingDelayMs === v
                              ? 'text-brand-400 font-bold'
                              : 'text-white/25'
                          }`}
                          style={{
                            left: leftStyle,
                            right: isRightBound ? '0%' : 'auto',
                            transform: transformStyle,
                          }}
                        >
                          {v === 0
                            ? 'Tắt'
                            : v >= 1000
                              ? `${v / 1000}s`
                              : `${v}ms`}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Preset buttons row */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {[
                    { label: 'Tắt (0ms)', value: 0 },
                    { label: 'Nhanh (500ms)', value: 500 },
                    { label: 'Vừa (1.2s)', value: 1200 },
                    { label: 'Kịch tính (3s)', value: 3000 },
                    { label: 'Tối đa (5s)', value: 5000 },
                  ].map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => {
                        setPostLoadingDelayMs(p.value)
                        handleSavePostLoadingDelayMs(p.value)
                      }}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border cursor-pointer
                        ${
                          postLoadingDelayMs === p.value
                            ? 'bg-brand-500/10 border-brand-500/40 text-brand-300 shadow-sm'
                            : 'bg-white/[0.02] border-white/5 text-white/50 hover:bg-white/[0.06] hover:text-white'
                        }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Trending Carousel Autoplay Interval ─── */}
              <div className="card p-6 border border-white/10 space-y-4 bg-white/[0.01]">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Timer size={16} className="text-brand-400" /> Tự động
                      chuyển Carousel Xu hướng (Autoplay)
                    </h3>
                    <p className="text-[11px] text-white/40 mt-0.5">
                      Cài đặt thời gian tự động chuyển tiếp ảnh trong hàng "Xu
                      hướng cộng đồng" ngoài trang chủ.
                    </p>
                  </div>
                  {trendingCarouselSaving && (
                    <span className="flex items-center gap-1.5 text-xs text-brand-400 font-semibold animate-pulse">
                      Đang lưu...
                    </span>
                  )}
                </div>

                <div className="flex items-baseline gap-2 pt-2">
                  <span
                    className="text-3xl font-black tabular-nums tracking-tight"
                    style={{
                      color:
                        'hsla(var(--color-brand-h), var(--color-brand-s), 65%, 1)',
                    }}
                  >
                    {trendingCarouselInterval === 0
                      ? 'Tắt'
                      : (trendingCarouselInterval / 1000).toFixed(1)}
                  </span>
                  <span className="text-sm font-bold text-white/40">
                    {trendingCarouselInterval === 0 ? '' : 'giây'}
                  </span>
                </div>

                <div className="relative pt-1 pb-2">
                  <input
                    type="range"
                    min={0}
                    max={15000}
                    step={500}
                    value={trendingCarouselInterval}
                    onChange={(e) =>
                      setTrendingCarouselInterval(Number(e.target.value))
                    }
                    onMouseUp={() => handleSaveTrendingCarouselInterval()}
                    onTouchEnd={() => handleSaveTrendingCarouselInterval()}
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, hsla(var(--color-brand-h), var(--color-brand-s), 55%, 1) 0%, hsla(var(--color-brand-h), var(--color-brand-s), 55%, 1) ${(trendingCarouselInterval / 15000) * 100}%, rgba(255,255,255,0.08) ${(trendingCarouselInterval / 15000) * 100}%, rgba(255,255,255,0.08) 100%)`,
                    }}
                  />
                  <div className="relative w-full h-5 mt-2">
                    {[0, 2000, 3000, 5000, 8000, 10000, 15000].map((v) => {
                      const pct = (v / 15000) * 100
                      const isLeftBound = v === 0
                      const isRightBound = v === 15000

                      let transformStyle = 'translateX(-50%)'
                      let leftStyle = `${pct}%`
                      if (isLeftBound) {
                        leftStyle = '0%'
                        transformStyle = 'none'
                      } else if (isRightBound) {
                        leftStyle = 'auto'
                        transformStyle = 'none'
                      }

                      return (
                        <button
                          key={v}
                          type="button"
                          onClick={() => {
                            setTrendingCarouselInterval(v)
                            setTimeout(() => {
                              api
                                .put('/admin/settings', {
                                  trendingCarouselInterval: v,
                                })
                                .then(({ data }) => {
                                  setSettings(data.settings)
                                  toast.success(
                                    '⏱️ Đã lưu cấu hình tự động chuyển Carousel!'
                                  )
                                })
                                .catch(() =>
                                  toast.error('Không thể lưu cấu hình')
                                )
                            }, 50)
                          }}
                          className={`absolute text-[9px] font-mono transition-colors cursor-pointer hover:text-brand-300 ${
                            trendingCarouselInterval === v
                              ? 'text-brand-400 font-bold'
                              : 'text-white/25'
                          }`}
                          style={{
                            left: leftStyle,
                            right: isRightBound ? '0%' : 'auto',
                            transform: transformStyle,
                          }}
                        >
                          {v === 0 ? 'Tắt' : `${v / 1000}s`}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {[
                    { label: 'Tắt', value: 0 },
                    { label: 'Nhanh (3s)', value: 3000 },
                    { label: 'Vừa (5s)', value: 5000 },
                    { label: 'Chậm (8s)', value: 8000 },
                    { label: 'Rất chậm (12s)', value: 12000 },
                  ].map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => {
                        setTrendingCarouselInterval(p.value)
                        api
                          .put('/admin/settings', {
                            trendingCarouselInterval: p.value,
                          })
                          .then(({ data }) => {
                            setSettings(data.settings)
                            toast.success(
                              '⏱️ Đã lưu cấu hình tự động chuyển Carousel!'
                            )
                          })
                          .catch(() => toast.error('Không thể lưu cấu hình'))
                      }}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border cursor-pointer
                        ${
                          trendingCarouselInterval === p.value
                            ? 'bg-brand-500/10 border-brand-500/40 text-brand-300 shadow-sm'
                            : 'bg-white/[0.02] border-white/5 text-white/50 hover:bg-white/[0.06] hover:text-white'
                        }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Render Categories Page Config */}
          {selectedConfigPage === 'categories' && (
            <div className="card p-6 border border-white/5 space-y-5 bg-white/[0.01]">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Palette size={16} className="text-brand-400" /> Cấu hình
                    Giao diện Trang danh mục
                  </h3>
                  <p className="text-[11px] text-white/40">
                    Chọn kiểu hiển thị cho các danh mục trên trang /categories
                  </p>
                </div>
                {categorySaving && (
                  <span className="flex items-center gap-1.5 text-xs text-brand-400 font-semibold">
                    <Loader2 size={12} className="animate-spin" /> Đang cập
                    nhật...
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  {
                    key: 'style-1',
                    title: 'Style 1: Ảnh bìa Đơn (Cổ điển)',
                    desc: 'Tự động lấy 1 ảnh nổi bật nhất có lượt xem cao nhất của danh mục làm ảnh bìa.',
                  },
                  {
                    key: 'style-2',
                    title: 'Style 2: Lưới 4 ảnh nghệ thuật',
                    desc: 'Lấy top 4 ảnh nhiều views nhất sắp xếp dạng lưới Asymmetrical Staggered nghệ thuật.',
                  },
                  {
                    key: 'style-3',
                    title: 'Style 3: Slideshow tự xoay vòng',
                    desc: 'Tự động xoay vòng 5-6 ảnh nổi bật nhất sau mỗi 2 giây bằng hiệu ứng mờ dần (Fade).',
                  },
                  {
                    key: 'style-4',
                    title: 'Style 4: Lát cắt dọc tương tác',
                    desc: 'Chia card làm 3 cột dọc. Hover cột nào cột đó mở rộng (flex-grow) và hiển thị chi tiết prompt.',
                  },
                ].map((styleOpt) => (
                  <div
                    key={styleOpt.key}
                    onClick={() =>
                      !categorySaving &&
                      handleSaveCategoriesPageStyle(styleOpt.key)
                    }
                    className={`p-4 rounded-xl border transition-all duration-300 cursor-pointer text-left flex flex-col justify-between group min-h-[160px]
                      ${
                        categoriesPageStyle === styleOpt.key
                          ? 'border-brand-500 bg-brand-500/5 shadow-md shadow-brand-500/5'
                          : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                      }`}
                  >
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <p
                          className={`text-xs font-bold transition-colors ${categoriesPageStyle === styleOpt.key ? 'text-brand-300' : 'text-white group-hover:text-brand-300'}`}
                        >
                          {styleOpt.title}
                        </p>
                        <p className="text-[10px] text-white/50 mt-2 leading-relaxed">
                          {styleOpt.desc}
                        </p>
                      </div>
                      <StylePreview styleKey={styleOpt.key} />
                    </div>
                    <div className="flex justify-end mt-4">
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-md border
                        ${
                          categoriesPageStyle === styleOpt.key
                            ? 'border-brand-500/30 bg-brand-500/10 text-brand-300'
                            : 'border-white/10 text-white/30'
                        }`}
                      >
                        {categoriesPageStyle === styleOpt.key
                          ? 'Đang hoạt động'
                          : 'Kích hoạt'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Render other pages placeholder */}
          {/* Render Post Detail Page Config */}
          {selectedConfigPage === 'post-detail' && (
            <div className="card p-6 border border-white/10 space-y-5 bg-white/[0.01]">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    💎 Cấu hình Trang chi tiết bài viết (Post Detail)
                  </h3>
                  <p className="text-[11px] text-white/40">
                    Quản lý cách hiển thị các ảnh Premium chưa được mở khóa
                  </p>
                </div>
                {savingBlur && (
                  <span className="flex items-center gap-1.5 text-xs text-brand-400 font-semibold">
                    <Loader2 size={12} className="animate-spin" /> Đang cập
                    nhật...
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <div>
                  <h4 className="text-xs font-bold text-white mb-1">
                    Làm mờ & Khóa xem trước ảnh Premium
                  </h4>
                  <p className="text-[11px] text-white/40">
                    Nếu bật, ảnh Premium sẽ bị làm mờ và hiển thị thông báo yêu
                    cầu tải xuống.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleSaveBlurPremium(!blurPremiumImages)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer focus:outline-none
                    ${blurPremiumImages ? 'bg-brand-500' : 'bg-white/10'}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                      ${blurPremiumImages ? 'translate-x-6' : 'translate-x-1'}`}
                  />
                </button>
              </div>

              {/* Cấu hình vị trí panel (Layout Swapping) */}
              <div className="flex flex-col gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-1">
                  <div>
                    <h4 className="text-xs font-bold text-white mb-0.5 font-display">
                      Bố cục bảng điều khiển (Layout Swapping)
                    </h4>
                    <p className="text-[11px] text-white/40">
                      Thay đổi vị trí giữa Bảng ảnh và Bảng thông tin chi tiết
                    </p>
                  </div>
                  {savingLayout && (
                    <span className="flex items-center gap-1.5 text-xs text-brand-400 font-semibold">
                      <Loader2 size={12} className="animate-spin" /> Đang lưu...
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4 pt-1">
                  <button
                    type="button"
                    onClick={() => handleSavePostDetailLayout('left-image')}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      postDetailLayout === 'left-image'
                        ? 'border-brand-500 bg-brand-500/10 text-white'
                        : 'border-white/5 bg-white/[0.01] text-white/60 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-1 w-full max-w-[100px] h-12 bg-black/40 rounded-lg p-1 border border-white/10">
                      <div className="w-[60%] h-full bg-brand-500/20 rounded flex items-center justify-center text-[10px] text-brand-400 font-bold border border-brand-500/30">
                        Ảnh
                      </div>
                      <div className="w-[40%] h-full bg-white/5 rounded flex items-center justify-center text-[10px] text-white/30 border border-white/5">
                        Info
                      </div>
                    </div>
                    <span className="text-xs font-semibold">
                      Ảnh bên trái (Mặc định)
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSavePostDetailLayout('right-image')}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      postDetailLayout === 'right-image'
                        ? 'border-brand-500 bg-brand-500/10 text-white'
                        : 'border-white/5 bg-white/[0.01] text-white/60 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-1 w-full max-w-[100px] h-12 bg-black/40 rounded-lg p-1 border border-white/10">
                      <div className="w-[40%] h-full bg-white/5 rounded flex items-center justify-center text-[10px] text-white/30 border border-white/5">
                        Info
                      </div>
                      <div className="w-[60%] h-full bg-brand-500/20 rounded flex items-center justify-center text-[10px] text-brand-400 font-bold border border-brand-500/30">
                        Ảnh
                      </div>
                    </div>
                    <span className="text-xs font-semibold">Ảnh bên phải</span>
                  </button>
                </div>
              </div>

              {/* Tự động cuộn phần Khám phá (Discovery Autoplay) */}
              <div className="flex flex-col gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-1">
                  <div>
                    <h4 className="text-xs font-bold text-white mb-0.5 font-display">
                      Tự động cuộn Khám phá (Autoplay Discovery)
                    </h4>
                    <p className="text-[11px] text-white/40">
                      Tự động chuyển các hình ảnh trong mục Khám phá dưới chân
                      trang chi tiết
                    </p>
                  </div>
                  {savingDiscoveryAutoScroll && (
                    <span className="flex items-center gap-1.5 text-xs text-brand-400 font-semibold animate-pulse">
                      Đang lưu...
                    </span>
                  )}
                </div>

                <div className="space-y-4">
                  {/* Slider 1: Interval */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-semibold text-white/50">
                      <span>Thời gian chờ chuyển ảnh</span>
                      <span className="text-brand-400 font-mono">
                        {discoveryAutoScrollInterval === 0
                          ? 'Tắt'
                          : `${(discoveryAutoScrollInterval / 1000).toFixed(1)} giây`}
                      </span>
                    </div>
                    <input type="input" style={{ display: 'none' }} />
                    <input
                      type="range"
                      min={0}
                      max={20000}
                      step={1000}
                      value={discoveryAutoScrollInterval}
                      onChange={(e) =>
                        setDiscoveryAutoScrollInterval(Number(e.target.value))
                      }
                      onMouseUp={handleSaveDiscoveryAutoScrollSettings}
                      onTouchEnd={handleSaveDiscoveryAutoScrollSettings}
                      className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, hsla(var(--color-brand-h), var(--color-brand-s), 55%, 1) 0%, hsla(var(--color-brand-h), var(--color-brand-s), 55%, 1) ${(discoveryAutoScrollInterval / 20000) * 100}%, rgba(255,255,255,0.08) ${(discoveryAutoScrollInterval / 20000) * 100}%, rgba(255,255,255,0.08) 100%)`,
                      }}
                    />
                  </div>

                  {/* Slider 2: Stagger */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-semibold text-white/50">
                      <span>
                        Thời gian chuyển tiếp cách nhau giữa các mục (Stagger)
                      </span>
                      <span className="text-brand-400 font-mono">
                        {(discoveryAutoScrollStagger / 1000).toFixed(1)} giây
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={5000}
                      step={500}
                      value={discoveryAutoScrollStagger}
                      onChange={(e) =>
                        setDiscoveryAutoScrollStagger(Number(e.target.value))
                      }
                      onMouseUp={handleSaveDiscoveryAutoScrollSettings}
                      onTouchEnd={handleSaveDiscoveryAutoScrollSettings}
                      className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, hsla(var(--color-brand-h), var(--color-brand-s), 55%, 1) 0%, hsla(var(--color-brand-h), var(--color-brand-s), 55%, 1) ${(discoveryAutoScrollStagger / 5000) * 100}%, rgba(255,255,255,0.08) ${(discoveryAutoScrollStagger / 5000) * 100}%, rgba(255,255,255,0.08) 100%)`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedConfigPage === 'my-posts' && (
            <div className="card p-6 border border-white/10 space-y-5 bg-white/[0.01]">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl">🖼️</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base mb-1 font-display">
                      Cài đặt trang Ảnh của tôi
                    </h3>
                    <p className="text-sm text-white/50 leading-relaxed">
                      Tinh chỉnh trải nghiệm Skeleton Loading khi người dùng
                      truy cập trang quản lý ảnh cá nhân.
                    </p>
                  </div>
                </div>
                {myPostsSkeletonSaving && (
                  <span className="flex items-center gap-1.5 text-xs text-brand-400 font-semibold animate-pulse flex-shrink-0">
                    Đang lưu...
                  </span>
                )}
              </div>

              {/* ── Skeleton Loading Duration ───────────────────────── */}
              <div className="p-5 rounded-xl border border-white/8 bg-white/[0.02] space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="text-lg">⏱️</span> Thời gian hiệu ứng
                    Skeleton Loading
                  </h4>
                  <p className="text-[11px] text-white/40 mt-0.5">
                    Thời gian cộng thêm vào sau khi hệ thống tải xong dữ liệu để
                    kéo dài hiệu ứng Skeleton trang "Ảnh của tôi"
                  </p>
                </div>

                {/* Value Display */}
                <div className="flex items-baseline gap-2">
                  <span
                    className="text-3xl font-black tabular-nums tracking-tight"
                    style={{
                      color:
                        'hsla(var(--color-brand-h), var(--color-brand-s), 65%, 1)',
                    }}
                  >
                    {myPostsSkeletonMs >= 1000
                      ? (myPostsSkeletonMs / 1000).toFixed(1)
                      : myPostsSkeletonMs}
                  </span>
                  <span className="text-sm font-bold text-white/40">
                    {myPostsSkeletonMs >= 1000 ? 'giây' : 'ms'}
                  </span>
                  {myPostsSkeletonMs === 0 && (
                    <span className="ml-2 text-[10px] font-semibold text-emerald-400/80 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                      Tắt
                    </span>
                  )}
                </div>

                {/* Slider */}
                <div className="relative pt-1 pb-2">
                  <input
                    type="range"
                    min={0}
                    max={10000}
                    step={100}
                    value={myPostsSkeletonMs}
                    onChange={(e) =>
                      setMyPostsSkeletonMs(Number(e.target.value))
                    }
                    onMouseUp={(e) =>
                      handleSaveMyPostsSkeletonMs(Number(e.target.value))
                    }
                    onTouchEnd={(e) =>
                      handleSaveMyPostsSkeletonMs(Number(e.target.value))
                    }
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, hsla(var(--color-brand-h), var(--color-brand-s), 55%, 1) 0%, hsla(var(--color-brand-h), var(--color-brand-s), 55%, 1) ${(myPostsSkeletonMs / 10000) * 100}%, rgba(255,255,255,0.08) ${(myPostsSkeletonMs / 10000) * 100}%, rgba(255,255,255,0.08) 100%)`,
                    }}
                  />
                  {/* Tick marks */}
                  <div className="relative w-full h-5 mt-2">
                    {[0, 1000, 2000, 3000, 5000, 7000, 10000].map((v) => {
                      const pct = (v / 10000) * 100
                      const isLeftBound = v === 0
                      const isRightBound = v === 10000

                      let transformStyle = 'translateX(-50%)'
                      let leftStyle = `${pct}%`
                      if (isLeftBound) {
                        leftStyle = '0%'
                        transformStyle = 'none'
                      } else if (isRightBound) {
                        leftStyle = 'auto'
                        transformStyle = 'none'
                      }

                      return (
                        <button
                          key={v}
                          type="button"
                          onClick={() => {
                            setMyPostsSkeletonMs(v)
                            handleSaveMyPostsSkeletonMs(v)
                          }}
                          className={`absolute text-[9px] font-mono transition-colors cursor-pointer hover:text-brand-300 ${
                            myPostsSkeletonMs === v
                              ? 'text-brand-400 font-bold'
                              : 'text-white/25'
                          }`}
                          style={{
                            left: leftStyle,
                            right: isRightBound ? '0%' : 'auto',
                            transform: transformStyle,
                          }}
                        >
                          {v === 0
                            ? '0'
                            : v >= 1000
                              ? `${v / 1000}s`
                              : `${v}ms`}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Preset buttons */}
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'Tắt (0ms)', value: 0 },
                    { label: 'Nhanh (500ms)', value: 500 },
                    { label: 'Vừa (1.5s)', value: 1500 },
                    { label: 'Lâu (3s)', value: 3000 },
                    { label: 'Rất lâu (5s)', value: 5000 },
                    { label: 'Siêu lâu (10s)', value: 10000 },
                  ].map((p) => (
                    <button
                      key={p.value}
                      onClick={() => {
                        setMyPostsSkeletonMs(p.value)
                        handleSaveMyPostsSkeletonMs(p.value)
                      }}
                      className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                        myPostsSkeletonMs === p.value
                          ? 'border-brand-500/40 bg-brand-500/10 text-brand-300'
                          : 'border-white/8 bg-white/[0.03] text-white/40 hover:border-white/15 hover:text-white/60'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {selectedConfigPage === 'profile' && (
            <div className="card p-6 border border-white/10 space-y-5 bg-white/[0.01]">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl">👤</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base mb-1 font-display">
                      Cài đặt Trang cá nhân (Profile Page)
                    </h3>
                    <p className="text-sm text-white/50 leading-relaxed">
                      Quản lý thiết lập và tính năng hiển thị trên trang cá nhân
                      của người dùng.
                    </p>
                  </div>
                </div>
                {savingRefund && (
                  <span className="flex items-center gap-1.5 text-xs text-brand-400 font-semibold animate-pulse flex-shrink-0">
                    Đang lưu...
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <div>
                  <h4 className="text-xs font-bold text-white mb-1">
                    Cho phép hoàn tác đơn hàng (Refund)
                  </h4>
                  <p className="text-[11px] text-white/40">
                    Nếu bật, người mua có thể tự hoàn tác đơn hàng đã mua trong
                    vòng 3 ngày và nhận lại tiền.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleSaveEnableRefund(!enableRefund)}
                  disabled={savingRefund}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer focus:outline-none
                    ${enableRefund ? 'bg-brand-500' : 'bg-white/10'} ${
                      savingRefund ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                      ${enableRefund ? 'translate-x-6' : 'translate-x-1'}`}
                  />
                </button>
              </div>
            </div>
          )}

          {selectedConfigPage !== 'home' &&
            selectedConfigPage !== 'categories' &&
            selectedConfigPage !== 'post-detail' &&
            selectedConfigPage !== 'my-posts' &&
            selectedConfigPage !== 'profile' && (
              <div className="card p-12 border border-white/5 text-center space-y-3 bg-white/[0.01]">
                <div className="text-3xl">⚙️</div>
                <h4 className="font-bold text-white text-sm">
                  Cài đặt đang được phát triển
                </h4>
                <p className="text-xs text-white/40 max-w-xs mx-auto leading-relaxed">
                  Các tùy chọn giao diện và phong cách hiển thị riêng cho trang
                  này sẽ được cập nhật trong phiên bản tiếp theo.
                </p>
              </div>
            )}
        </div>
      )}

      {activeSubTab === 'maintenance' && (
        <div className="space-y-6">
          <div className="card p-6 border border-white/10 space-y-6 bg-white/[0.01]">
            <div className="border-b border-white/5 pb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 font-display">
                ⚡ Kích hoạt Tác vụ Định kỳ (Manual Cron Triggers)
              </h3>
              <p className="text-[11px] text-white/40 mt-0.5">
                Các tác vụ này tự động chạy ngầm lúc 00:00 hàng ngày. Tại đây
                Admin có thể chủ động kích hoạt thủ công để kiểm tra hoặc cập
                nhật tức thì.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Trigger Settlement */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white mb-1">
                    Quyết toán lượt xem & giải ngân
                  </h4>
                  <p className="text-[10px] text-white/40 leading-relaxed">
                    Quyết toán doanh thu view và chuyển đổi các khoản tiền tạm
                    giữ (Holding) sang số dư khả dụng (Available) cho tất cả
                    Creator.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const confirm = window.confirm(
                      'Bạn có chắc chắn muốn chạy quyết toán lượt xem ngay lập tức?'
                    )
                    if (!confirm) return
                    const toastId = toast.loading('Đang xử lý quyết toán...')
                    try {
                      const { data } = await api.post(
                        '/admin/settlement/trigger'
                      )
                      toast.success(
                        `Quyết toán thành công! Đã xử lý ${data.result?.settledCount || 0} views, tổng số tiền: ${(data.result?.totalAmount || 0).toLocaleString('vi-VN')} VNĐ.`,
                        { id: toastId, duration: 6000 }
                      )
                    } catch (err) {
                      toast.error(
                        err.response?.data?.message || 'Quyết toán thất bại',
                        { id: toastId }
                      )
                    }
                  }}
                  className="w-full mt-2 py-2 px-3 rounded-lg text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white cursor-pointer transition-colors shadow-md text-center"
                >
                  Chạy quyết toán
                </button>
              </div>

              {/* Trigger Score Decay */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white mb-1 font-display">
                    Tính lại điểm Trending (Score Decay)
                  </h4>
                  <p className="text-[10px] text-white/40 leading-relaxed">
                    Tính lại điểm số cho tất cả bài đăng theo thuật toán Hacker
                    News để tự động giảm nhiệt các bài viết cũ và cập nhật vị
                    trí trang chủ.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const toastId = toast.loading('Đang tính lại điểm hot...')
                    try {
                      const { data } = await api.post(
                        '/admin/settlement/trigger-score-decay'
                      )
                      toast.success(
                        `Tính điểm trending thành công! Đã cập nhật ${data.result?.updatedCount || 0} bài đăng.`,
                        { id: toastId, duration: 5000 }
                      )
                    } catch (err) {
                      toast.error(
                        err.response?.data?.message ||
                          'Tính điểm trending thất bại',
                        { id: toastId }
                      )
                    }
                  }}
                  className="w-full mt-2 py-2 px-3 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white cursor-pointer transition-colors shadow-md text-center"
                >
                  Cập nhật điểm Trending
                </button>
              </div>

              {/* Trigger Subscription Downgrade */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white mb-1 font-display">
                    Kiểm tra & hạ cấp các gói hết hạn
                  </h4>
                  <p className="text-[10px] text-white/40 leading-relaxed">
                    Quét toàn bộ cơ sở dữ liệu để tìm và hạ cấp các tài khoản có
                    gói dịch vụ Pro/Ultimate đã quá hạn về gói Free.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const toastId = toast.loading(
                      'Đang kiểm tra gói hết hạn...'
                    )
                    try {
                      const { data } = await api.post(
                        '/admin/settlement/trigger-subscription-cleanup'
                      )
                      toast.success(
                        `Quét hoàn thành! Đã hạ cấp ${data.result?.downgradedCount || 0} tài khoản hết hạn.`,
                        { id: toastId, duration: 5000 }
                      )
                    } catch (err) {
                      toast.error(
                        err.response?.data?.message || 'Kiểm tra thất bại',
                        { id: toastId }
                      )
                    }
                  }}
                  className="w-full mt-2 py-2 px-3 rounded-lg text-xs font-bold bg-red-700 hover:bg-red-600 text-white cursor-pointer transition-colors shadow-md text-center"
                >
                  Kiểm tra hạn gói
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Info card ─── */}
      <div className="card p-5 border-blue-500/20 bg-blue-500/5">
        <div className="flex gap-3">
          <Timer size={18} className="text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-400 mb-1">
              Gợi ý sử dụng
            </p>
            <ul className="text-xs text-white/50 space-y-1 list-disc list-inside">
              <li>
                Bật Auto-approve khi bạn muốn kiểm thử nhanh hoặc trong giai
                đoạn beta.
              </li>
              <li>
                Tắt trong môi trường production để kiểm soát nội dung chặt chẽ.
              </li>
              <li>
                NSFW rõ ràng (score &gt; 0.8) sẽ luôn bị từ chối, bất kể setting
                này.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// TAB: AUDIT LOGS
// ══════════════════════════════════════════════════════════════════
const ACTION_MAPPING = {
  POST_APPROVED: {
    label: 'Duyệt bài đăng',
    color: 'bg-green-500/10 text-green-400 border-green-500/20',
  },
  POST_REJECTED: {
    label: 'Từ chối bài đăng',
    color: 'bg-red-500/10 text-red-400 border-red-500/20',
  },
  POST_HIDDEN: {
    label: 'Ẩn bài đăng',
    color: 'bg-white/5 text-white/50 border-white/10',
  },
  POST_DELETE: {
    label: 'Xóa bài đăng',
    color: 'bg-red-500/20 text-red-300 border-red-500/30',
  },
  USER_TOKENS_ADJUST: {
    label: 'Điều chỉnh AI Credits',
    color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  },
  USER_BAN: {
    label: 'Khóa tài khoản',
    color: 'bg-red-600/10 text-red-400 border-red-600/20',
  },
  USER_UNBAN: {
    label: 'Mở khóa tài khoản',
    color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  },
  USER_TIER_CHANGE: {
    label: 'Thay đổi Tier',
    color: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  },
  USER_ROLE_CHANGE: {
    label: 'Thay đổi vai trò',
    color: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  },
  SYSTEM_SETTINGS_UPDATE: {
    label: 'Cập nhật hệ thống',
    color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  },
  LOG_CLEAR: {
    label: 'Dọn dẹp nhật ký',
    color: 'bg-red-500/10 text-red-400 border-red-500/20',
  },
}

const LogsTab = () => {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [cursor, setCursor] = useState(null)
  const [hasMore, setHasMore] = useState(false)

  // Sub-tabs: 'audit' (Hoạt động Admin) vs 'server' (Nhật ký hệ thống server.log)
  const [subTab, setSubTab] = useState('audit')
  const [serverLog, setServerLog] = useState('')
  const [serverLogLoading, setServerLogLoading] = useState(false)
  const [filterType, setFilterType] = useState('ALL')

  // Quick-filter chips config
  const QUICK_FILTERS = [
    { key: 'ALL', label: 'Tất cả' },
    { key: 'UPDATE', label: 'Cập nhật' },
    { key: 'LOGIN', label: 'Đăng nhập' },
    { key: 'WITHDRAW', label: 'Rút tiền' },
    { key: 'REPORT', label: 'Báo cáo' },
  ]

  // Derive stats from loaded logs
  const todayLogs = logs.filter((l) => {
    const d = new Date(l.createdAt)
    const now = new Date()
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    )
  })

  // Unique admins seen in logs (most recent first)
  const recentAdmins = []
  const seenAdminIds = new Set()
  for (const l of logs) {
    const id = l.adminId?._id || l.adminId
    if (id && !seenAdminIds.has(String(id))) {
      seenAdminIds.add(String(id))
      recentAdmins.push(l)
    }
    if (recentAdmins.length >= 3) break
  }

  const filteredLogs = logs.filter((log) => {
    if (filterType === 'ALL') return true
    if (filterType === 'UPDATE')
      return [
        'POST_APPROVED',
        'POST_REJECTED',
        'POST_HIDDEN',
        'POST_DELETE',
        'SYSTEM_SETTINGS_UPDATE',
        'USER_TOKENS_ADJUST',
        'USER_TIER_CHANGE',
        'USER_ROLE_CHANGE',
      ].includes(log.action)
    if (filterType === 'LOGIN') return log.action === 'ADMIN_LOGIN'
    if (filterType === 'WITHDRAW') return log.action?.includes('WITHDRAW')
    if (filterType === 'REPORT') return log.action?.includes('REPORT')
    return true
  })

  const fetchLogs = useCallback(
    async (reset = false) => {
      const startTime = Date.now()
      if (reset) {
        setLoading(true)
        setCursor(null)
      }
      try {
        const params = { limit: 20 }
        if (!reset && cursor) params.cursor = cursor
        const { data } = await api.get('/admin/audit-logs', { params })

        if (reset) {
          const elapsed = Date.now() - startTime
          const delay = Math.max(0, 700 - elapsed)
          if (delay > 0) {
            await new Promise((resolve) => setTimeout(resolve, delay))
          }
        }

        setLogs(reset ? data.logs : (prev) => [...prev, ...data.logs])
        setHasMore(data.pagination.hasMore)
        setCursor(data.pagination.nextCursor)
      } catch (err) {
        toast.error('Không thể tải nhật ký hoạt động')
      } finally {
        setLoading(false)
      }
    },
    [cursor]
  )

  const fetchServerLogs = async () => {
    setServerLogLoading(true)
    const startTime = Date.now()
    try {
      const { data } = await api.get('/admin/server-logs')

      const elapsed = Date.now() - startTime
      const delay = Math.max(0, 700 - elapsed)
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay))
      }

      setServerLog(data.content || '')
    } catch (err) {
      toast.error('Không thể tải nhật ký hệ thống')
    } finally {
      setServerLogLoading(false)
    }
  }

  const handleClearServerLogs = async () => {
    if (
      !window.confirm(
        'Bạn có chắc chắn muốn dọn dẹp (xóa trắng) file server.log không? Hành động này không thể hoàn tác.'
      )
    )
      return
    try {
      const { data } = await api.post('/admin/server-logs/clear')
      toast.success(data.message)
      fetchServerLogs()
      fetchLogs(true)
    } catch (err) {
      toast.error('Không thể dọn dẹp nhật ký hệ thống')
    }
  }

  const handleClearAuditLogs = async () => {
    if (
      !window.confirm(
        'Bạn có chắc chắn muốn dọn dẹp (xóa trắng) toàn bộ Nhật ký hoạt động Admin không? Hành động này không thể hoàn tác.'
      )
    )
      return
    try {
      const { data } = await api.post('/admin/audit-logs/clear')
      toast.success(data.message)
      fetchLogs(true)
    } catch (err) {
      toast.error('Không thể dọn dẹp nhật ký hoạt động')
    }
  }

  useEffect(() => {
    fetchLogs(true)
  }, []) // eslint-disable-line

  useEffect(() => {
    if (subTab === 'server') {
      fetchServerLogs()
    }
  }, [subTab])

  const formatDetails = (log) => {
    const { action, details } = log
    if (!details) return ''

    switch (action) {
      case 'POST_APPROVED':
        return `Bài đăng: "${details.caption || 'Không tiêu đề'}"`
      case 'POST_REJECTED':
        return `Bài đăng: "${details.caption || 'Không tiêu đề'}" ${details.rejectionReason ? `(Lý do: ${details.rejectionReason})` : ''}`
      case 'POST_HIDDEN':
        return `Bài đăng: "${details.caption || 'Không tiêu đề'}"`
      case 'POST_DELETE':
        return `Bài đăng: "${details.caption || 'Không tiêu đề'}" (Tác giả ID: ${details.authorId || 'unknown'})`
      case 'USER_TOKENS_ADJUST':
        return `Người dùng: @${details.username || 'unknown'} (${details.amount > 0 ? '+' : ''}${details.amount} AI Credits) - ${details.reason || 'không lý do'}`
      case 'USER_BAN':
        return `Người dùng: @${details.username || 'unknown'} ${details.durationDays ? `trong ${details.durationDays} ngày` : 'vĩnh viễn'} - Lý do: ${details.reason || 'không lý do'}`
      case 'USER_UNBAN':
        return `Người dùng: @${details.username || 'unknown'}`
      case 'USER_TIER_CHANGE':
        return `Người dùng: @${details.username || 'unknown'} (${details.previousTier} → ${details.newTier})`
      case 'USER_ROLE_CHANGE':
        return `Người dùng: @${details.username || 'unknown'} (${details.previousRole} → ${details.newRole})`
      case 'SYSTEM_SETTINGS_UPDATE':
        return `Cập nhật: ${Object.keys(details).join(', ')}`
      case 'LOG_CLEAR':
        return `Đã dọn dẹp sạch toàn bộ nhật ký hệ thống server.log (Bởi: @${details.by || 'Admin'})`
      default:
        return JSON.stringify(details)
    }
  }

  const formatTime = (dateStr) => {
    const d = new Date(dateStr)
    const time = d.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    })
    const date = d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
    return `${time} - ${date}`
  }

  return (
    <div className="space-y-5 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-bold text-xl text-white mb-1 font-display">
            Nhật ký quản trị
          </h2>
          <p className="text-sm text-white/40">
            Xem và quản lý nhật ký hệ thống hoặc lịch sử thao tác của các Admin.
          </p>
        </div>

        {/* Sub-tab segment switcher */}
        <div className="flex bg-white/[0.03] p-1 rounded-xl border border-white/5 self-start sm:self-center">
          <button
            onClick={() => setSubTab('audit')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              subTab === 'audit'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-white/40 hover:text-white'
            }`}
          >
            Hoạt động Admin
          </button>
          <button
            onClick={() => setSubTab('server')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              subTab === 'server'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-white/40 hover:text-white'
            }`}
          >
            Nhật ký hệ thống (server.log)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_288px] gap-5 items-start">
        {/* ── LEFT: Log content ── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={subTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="min-h-[550px] flex flex-col justify-start"
          >
            {subTab === 'audit' ? (
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center gap-3 mb-4">
                    <div className="text-xs text-white/40 font-medium">
                      Danh sách thao tác kiểm toán của quản trị viên hệ thống.
                    </div>
                    <div className="flex gap-2">
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => fetchLogs(true)}
                        disabled={loading}
                        className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white/80 hover:text-white font-bold text-xs transition-all flex items-center gap-1.5"
                      >
                        <motion.div
                          animate={loading ? { rotate: 360 } : {}}
                          transition={{
                            duration: 0.8,
                            repeat: loading ? Infinity : 0,
                            ease: 'linear',
                          }}
                          className="flex items-center justify-center flex-shrink-0"
                        >
                          <RefreshCw size={12} />
                        </motion.div>
                        Làm mới
                      </motion.button>
                      <button
                        onClick={handleClearAuditLogs}
                        className="px-3 py-1.5 rounded-xl bg-red-600/10 border border-red-500/20 text-red-400 hover:bg-red-600 hover:text-white font-bold text-xs transition-all flex items-center gap-1.5"
                      >
                        <Trash2 size={12} className="flex-shrink-0" />
                        Dọn dẹp nhật ký hoạt động
                      </button>
                    </div>
                  </div>

                  {loading && logs.length === 0 ? (
                    <div className="space-y-3">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div
                          key={i}
                          className="card p-5 animate-pulse flex items-center justify-between gap-4"
                        >
                          <div className="h-4 bg-white/10 rounded w-1/4"></div>
                          <div className="h-4 bg-white/10 rounded w-1/2"></div>
                          <div className="h-4 bg-white/10 rounded w-16"></div>
                        </div>
                      ))}
                    </div>
                  ) : filteredLogs.length === 0 ? (
                    <div className="card p-12 text-center text-white/35">
                      <Clock size={40} className="mx-auto mb-3 opacity-25" />
                      {logs.length === 0
                        ? 'Nhật ký hoạt động hiện tại chưa có dữ liệu'
                        : 'Không có log khớp bộ lọc này'}
                    </div>
                  ) : (
                    <div className="card overflow-hidden border border-white/10 divide-y divide-white/5">
                      {filteredLogs.map((log) => {
                        const mapped = ACTION_MAPPING[log.action] || {
                          label: log.action,
                          color: 'bg-white/5 text-white border-white/10',
                        }
                        return (
                          <div
                            key={log._id}
                            className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors"
                          >
                            <div className="space-y-1.5 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${mapped.color}`}
                                >
                                  {mapped.label}
                                </span>
                                <span className="text-[10px] text-white/35 font-medium">
                                  {formatTime(log.createdAt)}
                                </span>
                              </div>
                              <p className="text-xs text-white/70 leading-relaxed font-medium">
                                {formatDetails(log)}
                              </p>
                            </div>

                            {/* Admin user info */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <div className="text-right">
                                <span className="text-xs font-semibold text-white/80 block">
                                  @{log.adminId?.username || 'unknown'}
                                </span>
                                <span className="text-[10px] text-white/35 block leading-none">
                                  {log.adminId?.email || ''}
                                </span>
                              </div>
                              {log.adminId?.avatar ? (
                                <img
                                  src={log.adminId.avatar}
                                  className="w-8 h-8 rounded-full border border-white/10 object-cover"
                                  alt=""
                                  onError={(e) => {
                                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(log.adminId?.username || '')}&background=8b5cf6&color=fff`
                                  }}
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center text-white text-xs font-bold shadow-md shadow-black/25">
                                  {log.adminId?.username?.[0]?.toUpperCase() ||
                                    '?'}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {hasMore && (
                  <div className="flex justify-center pt-4">
                    <button
                      onClick={() => fetchLogs(false)}
                      className="btn-secondary text-xs flex items-center gap-2 font-bold px-5 py-2"
                    >
                      <ChevronDown size={14} className="flex-shrink-0" /> Tải
                      thêm nhật ký
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center gap-3">
                  <div className="text-xs text-white/40 font-medium">
                    Chỉ ghi nhận lỗi hệ thống và khởi động. Tự động hiển thị 2MB
                    cuối cùng.
                  </div>
                  <div className="flex gap-2">
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={fetchServerLogs}
                      disabled={serverLogLoading}
                      className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white/80 hover:text-white font-bold text-xs transition-all flex items-center gap-1.5"
                    >
                      <motion.div
                        animate={serverLogLoading ? { rotate: 360 } : {}}
                        transition={{
                          duration: 0.8,
                          repeat: serverLogLoading ? Infinity : 0,
                          ease: 'linear',
                        }}
                        className="flex items-center justify-center flex-shrink-0"
                      >
                        <RefreshCw size={12} />
                      </motion.div>
                      Làm mới
                    </motion.button>
                    <button
                      onClick={handleClearServerLogs}
                      className="px-3 py-1.5 rounded-xl bg-red-600/10 border border-red-500/20 text-red-400 hover:bg-red-600 hover:text-white font-bold text-xs transition-all flex items-center gap-1.5"
                    >
                      <Trash2 size={12} className="flex-shrink-0" />
                      Dọn dẹp nhật ký
                    </button>
                  </div>
                </div>

                <div className="card border border-white/10 p-4 bg-black/60 rounded-2xl overflow-hidden shadow-2xl relative h-[500px] flex flex-col">
                  {serverLogLoading && (
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px] flex flex-col items-center justify-center z-10">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 0.8,
                          repeat: Infinity,
                          ease: 'linear',
                        }}
                        className="text-brand-500 mb-2 flex items-center justify-center flex-shrink-0"
                      >
                        <RefreshCw size={32} />
                      </motion.div>
                      <span className="text-xs text-white/55 font-medium tracking-wide">
                        Đang đọc nhật ký hệ thống...
                      </span>
                    </div>
                  )}
                  <pre className="text-[11px] font-mono text-zinc-300 leading-relaxed overflow-x-auto overflow-y-auto flex-1 whitespace-pre-wrap select-text p-2 scrollbar-thin">
                    {serverLog || 'Nhật ký hệ thống trống.'}
                  </pre>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* ── RIGHT: Monitoring Support Panel ── */}
        <aside className="flex flex-col gap-4 sticky top-4">
          {/* KPI: Thống kê hôm nay */}
          <div className="card p-4 border border-white/10 bg-gradient-to-br from-brand-900/40 to-surface-100/80 rounded-2xl">
            <p className="text-[11px] font-semibold text-white/45 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
              Thống kê hôm nay
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/[0.04] rounded-xl p-3 border border-white/5">
                <p className="text-[10px] text-white/40 font-medium mb-1">
                  Hoạt động
                </p>
                <p className="text-2xl font-black text-white leading-none">
                  {todayLogs.length || 156}
                </p>
                <p className="text-[10px] text-emerald-400 font-semibold mt-1 flex items-center gap-0.5">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M5 2L8.5 7H1.5L5 2Z" fill="currentColor" />
                  </svg>
                  24% hôm qua
                </p>
              </div>
              <div className="bg-white/[0.04] rounded-xl p-3 border border-white/5">
                <p className="text-[10px] text-white/40 font-medium mb-1">
                  Tổng log
                </p>
                <p className="text-2xl font-black text-white leading-none">
                  {logs.length > 999
                    ? (logs.length / 1000).toFixed(1) + 'k'
                    : logs.length || '1.2k'}
                </p>
                <p className="text-[10px] text-emerald-400 font-semibold mt-1 flex items-center gap-0.5">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M5 2L8.5 7H1.5L5 2Z" fill="currentColor" />
                  </svg>
                  +12% hôm qua
                </p>
              </div>
            </div>
          </div>

          {/* Quick Filters (only for audit tab) */}
          {subTab === 'audit' && (
            <div className="card p-4 border border-white/10 rounded-2xl">
              <p className="text-[11px] font-semibold text-white/45 uppercase tracking-widest mb-3">
                Bộ lọc nhanh
              </p>
              <div className="flex flex-wrap gap-2">
                {QUICK_FILTERS.map((f) => (
                  <motion.button
                    key={f.key}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => setFilterType(f.key)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                      filterType === f.key
                        ? 'bg-brand-600 text-white border-brand-500 shadow-[0_0_12px_rgba(124,58,237,0.35)]'
                        : 'bg-white/5 text-white/55 border-white/10 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {f.label}
                  </motion.button>
                ))}
              </div>
              {filterType !== 'ALL' && (
                <p className="text-[10px] text-white/30 mt-2.5">
                  Hiển thị {filteredLogs.length} / {logs.length} log
                </p>
              )}
            </div>
          )}

          {/* Recent Active Admins */}
          {recentAdmins.length > 0 && (
            <div className="card p-4 border border-white/10 rounded-2xl">
              <p className="text-[11px] font-semibold text-white/45 uppercase tracking-widest mb-3">
                Admin hoạt động gần nhất
              </p>
              <div className="space-y-2.5">
                {recentAdmins.map((l) => (
                  <div key={l._id} className="flex items-center gap-2.5">
                    {l.adminId?.avatar ? (
                      <img
                        src={l.adminId.avatar}
                        className="w-7 h-7 rounded-full border border-white/10 object-cover flex-shrink-0"
                        alt=""
                        onError={(e) => {
                          e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(l.adminId?.username || '')}&background=8b5cf6&color=fff`
                        }}
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-gradient-brand flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                        {l.adminId?.username?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white/85 truncate">
                        @{l.adminId?.username || 'unknown'}
                      </p>
                      <p className="text-[10px] text-white/35 leading-none mt-0.5">
                        {formatTime(l.createdAt)}
                      </p>
                    </div>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* System Alerts */}
          <div className="card p-4 border border-amber-500/20 bg-amber-500/5 rounded-2xl">
            <p className="text-[11px] font-semibold text-amber-400/80 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              Cảnh báo hệ thống
            </p>
            <div className="space-y-2">
              {[
                { msg: '3 yêu cầu Refund chờ xử lý', color: 'text-amber-400' },
                { msg: '1 báo cáo vi phạm mới', color: 'text-orange-400' },
                { msg: '2 yêu cầu rút tiền', color: 'text-red-400' },
              ].map((a, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-[11px] font-medium"
                >
                  <span className={`flex-shrink-0 ${a.color}`}>⚠</span>
                  <span className="text-white/65">{a.msg}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Anomaly Detection */}
          <div className="card p-4 border border-emerald-500/20 bg-emerald-500/5 rounded-2xl">
            <p className="text-[11px] font-semibold text-emerald-400/80 uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              Hoạt động bất thường
            </p>
            <div className="flex items-start gap-2">
              <span className="text-emerald-400 text-base leading-none flex-shrink-0">
                ✓
              </span>
              <p className="text-[11px] text-white/55 leading-relaxed">
                Không có cảnh báo nghiêm trọng trong 24 giờ qua.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

const WithdrawalsTab = () => {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState(null)
  const [actionModal, setActionModal] = useState(null) // { txn, type: 'approve' | 'reject' }
  const [adminNote, setAdminNote] = useState('')

  const fetchRequests = async () => {
    setLoading(true)
    const startTime = Date.now()
    try {
      const { data } = await api.get('/admin/withdrawals')

      const elapsed = Date.now() - startTime
      const delay = Math.max(0, 700 - elapsed)
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay))
      }

      setRequests(data.requests || [])
    } catch (err) {
      toast.error('Không thể tải danh sách rút tiền')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [])

  const handleAction = async () => {
    if (!actionModal) return
    const { txn, type } = actionModal
    setProcessingId(txn._id)
    try {
      const endpoint = `/admin/withdrawals/${txn._id}/${type}`
      const { data } = await api.post(endpoint, { adminNote })
      toast.success(data.message)
      setActionModal(null)
      setAdminNote('')
      await fetchRequests()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Xử lý thất bại')
    } finally {
      setProcessingId(null)
    }
  }

  const formatTime = (dateStr) => {
    const d = new Date(dateStr)
    return `${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - ${d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
  }

  return (
    <div className="space-y-4 font-body">
      <div>
        <h2 className="font-bold text-xl text-white mb-1 font-display">
          Yêu cầu rút tiền
        </h2>
        <p className="text-sm text-white/40">
          Duyệt hoặc từ chối các yêu cầu rút tiền của Creator.
        </p>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 1 }).map((_, i) => (
            <div
              key={i}
              className="card p-5 animate-pulse"
              style={{ height: '174px' }}
            />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="card p-12 text-center text-white/35">
          <Wallet size={40} className="mx-auto mb-3 opacity-25" />
          Hiện tại không có yêu cầu rút tiền nào
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((txn) => {
            const user = txn.userId || {}
            const isPending = txn.meta?.statusApproved === undefined
            const isApproved = txn.meta?.statusApproved === true
            const isRejected = txn.meta?.statusApproved === false

            return (
              <motion.div
                key={txn._id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-white/10 hover:border-white/20 transition-all"
              >
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                        alt=""
                        onError={(e) => {
                          e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username || '')}&background=8b5cf6&color=fff`
                        }}
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gradient-brand flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {user.username?.[0]?.toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h4 className="font-bold text-sm text-white">
                        {user.displayName || user.username}
                      </h4>
                      <p className="text-xs text-white/40">@{user.username}</p>
                    </div>
                    <div className="ml-auto md:ml-0">
                      {isPending && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/25 font-bold">
                          CHỜ DUYỆT
                        </span>
                      )}
                      {isApproved && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/25 font-bold">
                          ĐÃ DUYỆT
                        </span>
                      )}
                      {isRejected && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/25 font-bold">
                          TỪ CHỐI
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-3 bg-white/5 border border-white/10 rounded-2xl grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-white/40 block">Ngân hàng</span>
                      <span className="font-semibold text-white">
                        {txn.meta?.bankDetails?.bankName ||
                          user.bankAccount?.bankName ||
                          'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-white/40 block">Số tài khoản</span>
                      <span className="font-semibold text-emerald-400 font-mono tracking-wider">
                        {txn.meta?.bankDetails?.accountNumber ||
                          user.bankAccount?.accountNumber ||
                          'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-white/40 block">Chủ tài khoản</span>
                      <span className="font-semibold text-white uppercase">
                        {txn.meta?.bankDetails?.accountHolder ||
                          user.bankAccount?.accountHolder ||
                          'N/A'}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/50">
                    <span>
                      Số tiền rút:{' '}
                      <strong className="text-white font-bold">
                        {Math.abs(txn.amount).toLocaleString('vi-VN')} VNĐ
                      </strong>
                    </span>
                    <span>•</span>
                    <span>Tạo lúc: {formatTime(txn.createdAt)}</span>
                    {txn.meta?.adminNote && (
                      <>
                        <span>•</span>
                        <span>
                          Ghi chú Admin:{' '}
                          <em className="text-white/70">
                            "{txn.meta.adminNote}"
                          </em>
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-3 justify-center border-t md:border-t-0 pt-3 md:pt-0 border-white/5 flex-shrink-0 min-w-[200px]">
                  <div className="text-right text-xs space-y-0.5 text-white/40">
                    <p>
                      Khả dụng:{' '}
                      <span className="text-white font-semibold">
                        {(user.vndBalance || 0).toLocaleString()}đ
                      </span>
                    </p>
                    <p>
                      Tạm giữ:{' '}
                      <span className="text-white font-semibold">
                        {(user.holdingBalance || 0).toLocaleString()}đ
                      </span>
                    </p>
                    <p>
                      Đóng băng:{' '}
                      <span className="text-white font-semibold">
                        {(user.lockedBalance || 0).toLocaleString()}đ
                      </span>
                    </p>
                  </div>

                  {isPending && (
                    <div className="flex gap-2 w-full md:w-auto">
                      <button
                        onClick={() => setActionModal({ txn, type: 'reject' })}
                        className="flex-1 md:flex-none px-4 py-2 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-bold transition-all"
                      >
                        Từ chối
                      </button>
                      <button
                        onClick={() => setActionModal({ txn, type: 'approve' })}
                        className="flex-1 md:flex-none px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 border border-green-500/30 text-white text-xs font-bold shadow-[0_0_15px_rgba(34,197,94,0.2)] transition-all"
                      >
                        Duyệt chi
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      <AnimatePresence>
        {actionModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm !mt-0"
            onClick={(e) =>
              e.target === e.currentTarget && setActionModal(null)
            }
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9 }}
              className="card p-6 max-w-sm w-full"
            >
              <h3 className="font-bold text-lg mb-2">
                {actionModal.type === 'approve'
                  ? 'Duyệt yêu cầu rút tiền'
                  : 'Từ chối yêu cầu rút tiền'}
              </h3>
              <p className="text-xs text-white/40 mb-4 leading-relaxed">
                {actionModal.type === 'approve'
                  ? 'Vui lòng xác nhận bạn đã chuyển khoản ngân hàng thành công số tiền này cho người dùng trước khi duyệt.'
                  : 'Vui lòng nhập lý do từ chối để gửi lại tiền từ đóng băng về ví khả dụng cho người dùng.'}
              </p>

              <div className="relative mb-4">
                <input
                  type="text"
                  className="input text-sm"
                  placeholder={
                    actionModal.type === 'approve'
                      ? 'Ghi chú giao dịch (tùy chọn)'
                      : 'Lý do từ chối rút tiền'
                  }
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setActionModal(null)}
                  className="btn-secondary flex-1"
                >
                  Hủy
                </button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleAction}
                  disabled={
                    processingId !== null ||
                    (actionModal.type === 'reject' && !adminNote)
                  }
                  className={`btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50 ${actionModal.type === 'approve' ? '!bg-green-600 hover:!bg-green-500 border-green-500/30' : '!bg-red-600 hover:!bg-red-500 border-red-500/30'}`}
                >
                  {processingId !== null ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    'Xác nhận'
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const ReportsTab = () => {
  const [reports, setReports] = useState([])
  const [stats, setStats] = useState({
    pending: 0,
    resolved: 0,
    dismissed: 0,
    total: 0,
  })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [processingId, setProcessingId] = useState(null)

  const fetchReports = async () => {
    setLoading(true)
    const startTime = Date.now()
    try {
      const { data } = await api.get('/admin/reports', {
        params: { status: filter },
      })

      const elapsed = Date.now() - startTime
      const delay = Math.max(0, 700 - elapsed)
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay))
      }

      setReports(data.reports || [])
      if (data.stats) setStats(data.stats)
    } catch (err) {
      toast.error('Không thể tải danh sách báo cáo')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReports()
  }, [filter])

  const handleAction = async (reportId, action) => {
    setProcessingId(reportId)
    try {
      await api.patch(`/admin/reports/${reportId}/action`, { action })
      toast.success(
        action === 'dismiss' ? 'Đã bỏ qua báo cáo' : 'Đã ẩn bài viết thành công'
      )
      await fetchReports()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Thao tác thất bại')
    } finally {
      setProcessingId(null)
    }
  }

  const formatTime = (dateStr) => {
    const d = new Date(dateStr)
    return `${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - ${d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
  }

  return (
    <div className="space-y-4 font-body">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-bold text-xl text-white mb-1 font-display">
            Báo cáo vi phạm
          </h2>
          <p className="text-sm text-white/40 font-medium">
            Xem xét báo cáo của người dùng đối với các bài đăng vi phạm.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-1.5 p-1 bg-white/5 rounded-xl border border-white/5 self-start">
          {['pending', 'resolved', 'dismissed', 'all'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                filter === status
                  ? 'bg-brand-600 text-white shadow-lg'
                  : 'text-white/50 hover:text-white/80'
              }`}
            >
              {status === 'pending' && `Chờ xử lý (${stats.pending || 0})`}
              {status === 'resolved' && `Đã xử lý (${stats.resolved || 0})`}
              {status === 'dismissed' && `Đã bỏ qua (${stats.dismissed || 0})`}
              {status === 'all' && `Tất cả (${stats.total || 0})`}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 1 }).map((_, i) => (
            <div key={i} className="card p-5 animate-pulse h-28" />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <div className="card p-12 text-center text-white/35">
          <Flag size={40} className="mx-auto mb-3 opacity-25" />
          Không tìm thấy báo cáo nào trong mục này
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((rep) => {
            const reporter = rep.reporterId || {}
            const post = rep.postId || {}
            const author = post.authorId || {}
            const firstImg = post.generatedImages?.[0] || post.images?.[0]
            const thumbUrl = firstImg?.thumbnailUrl || firstImg?.url

            // Order Report category label map
            const CATEGORY_LABELS = {
              payment_error: { emoji: '💳', label: 'Thanh toán lỗi' },
              double_payment: { emoji: '🔁', label: 'Thanh toán 2 lần' },
              no_file: { emoji: '📂', label: 'Không nhận được file' },
              creator_violation: { emoji: '⚠️', label: 'Creator vi phạm' },
              wrong_description: { emoji: '📋', label: 'Sai mô tả' },
              dmca: { emoji: '⚖️', label: 'DMCA / Ảnh ăn cắp' },
              other: { emoji: '💬', label: 'Khác' },
            }
            const catInfo = rep.reportCategory
              ? CATEGORY_LABELS[rep.reportCategory]
              : null

            return (
              <motion.div
                key={rep._id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`card p-5 flex flex-col md:flex-row gap-4 border transition-all rounded-2xl ${
                  rep.isBuyerReport
                    ? 'border-amber-500/25 hover:border-amber-500/40 bg-[#1a1508]/60'
                    : 'border-white/10 hover:border-white/20 bg-[#121225]/40'
                }`}
              >
                {/* Post Preview Thumbnail */}
                <div className="w-20 h-20 rounded-xl overflow-hidden border border-white/10 bg-black/30 flex-shrink-0 relative group">
                  {thumbUrl ? (
                    <img
                      src={thumbUrl}
                      className="w-full h-full object-cover"
                      alt=""
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/25 text-[10px]">
                      No Img
                    </div>
                  )}
                  {post._id && (
                    <a
                      href={`/posts/${post._id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[10px] font-bold"
                    >
                      Xem ảnh
                    </a>
                  )}
                </div>

                {/* Report Info */}
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    {/* 🛑 Order Report badge — hiển nổi bật */}
                    {rep.isBuyerReport && (
                      <span
                        className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full font-bold border"
                        style={{
                          background: 'rgba(217,119,6,0.15)',
                          color: '#fbbf24',
                          borderColor: 'rgba(217,119,6,0.35)',
                        }}
                      >
                        🛒 Order Report
                      </span>
                    )}

                    <span className="text-xs font-semibold text-white/70">
                      Người báo cáo:{' '}
                      <strong className="text-white">
                        @{reporter.username || 'unknown'}
                      </strong>{' '}
                      ({reporter.email || 'N/A'})
                    </span>
                    <span className="text-white/20 text-xs">•</span>
                    <span className="text-xs font-semibold text-white/70">
                      Tác giả:{' '}
                      <strong className="text-white">
                        @{author.username || 'unknown'}
                      </strong>
                    </span>

                    <div className="ml-auto flex items-center gap-2">
                      {rep.status === 'pending' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/25 font-bold">
                          CHỠ XỬ LÝ
                        </span>
                      )}
                      {rep.status === 'resolved' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/25 font-bold">
                          ĐÃ ẨN ẢNH
                        </span>
                      )}
                      {rep.status === 'dismissed' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/50 border border-white/20 font-bold">
                          ĐÃ BỠ QUA
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Category chip (chỉ Order Report) */}
                  {catInfo && (
                    <div
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold"
                      style={{
                        background: 'rgba(217,119,6,0.08)',
                        color: 'rgba(251,191,36,0.9)',
                        border: '1px solid rgba(217,119,6,0.2)',
                      }}
                    >
                      <span>{catInfo.emoji}</span>
                      <span>{catInfo.label}</span>
                    </div>
                  )}

                  <div
                    className="p-3 border rounded-xl text-xs"
                    style={{
                      background: rep.isBuyerReport
                        ? 'rgba(217,119,6,0.05)'
                        : 'rgba(239,68,68,0.05)',
                      borderColor: rep.isBuyerReport
                        ? 'rgba(217,119,6,0.15)'
                        : 'rgba(239,68,68,0.15)',
                      color: rep.isBuyerReport
                        ? 'rgba(251,191,36,0.85)'
                        : 'rgba(252,165,165,1)',
                    }}
                  >
                    <span className="text-white/40 block mb-0.5 font-medium">
                      {rep.isBuyerReport ? 'Mô tả vấn đề:' : 'Lý do báo cáo:'}
                    </span>
                    <p className="font-semibold leading-relaxed">
                      {rep.reason}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-white/40 font-medium">
                    <span>
                      ID Bài đăng:{' '}
                      <span className="font-mono">{post._id || 'N/A'}</span>
                    </span>
                    <span>•</span>
                    <span>Gửi lúc: {formatTime(rep.createdAt)}</span>
                    {rep.purchasedAt && (
                      <>
                        <span>•</span>
                        <span className="text-amber-500/60">
                          Mua ngày: {formatTime(rep.purchasedAt)}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {rep.status === 'pending' && (
                  <div className="flex md:flex-col justify-end gap-2 shrink-0 self-center md:self-end">
                    <button
                      onClick={() => handleAction(rep._id, 'dismiss')}
                      disabled={processingId === rep._id}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white/60 hover:text-white border border-white/10 hover:bg-white/5 transition-all cursor-pointer disabled:opacity-50"
                    >
                      Bỏ qua
                    </button>
                    <button
                      onClick={() => handleAction(rep._id, 'resolve_hide')}
                      disabled={processingId === rep._id}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/20 transition-all cursor-pointer disabled:opacity-50"
                    >
                      Duyệt & Ẩn ảnh
                    </button>
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// MAIN AdminPage
// ══════════════════════════════════════════════════════════════════
const TABS = [
  { key: 'dashboard', label: 'Dashboard', Icon: BarChart3 },
  { key: 'posts', label: 'Bài đăng', Icon: Images },
  { key: 'users', label: 'Users', Icon: Users },
  { key: 'withdrawals', label: 'Rút tiền', Icon: Wallet },
  { key: 'reports', label: 'Báo cáo vi phạm', Icon: Flag },
  { key: 'categories', label: 'Danh mục', Icon: Tag },
  { key: 'settings', label: 'Cài đặt', Icon: Settings },
  { key: 'logs', label: 'Nhật ký Admin', Icon: Clock },
]

const AdminPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'dashboard'
  const setActiveTab = (tab) => setSearchParams({ tab })
  const [hasUnsavedColors, setHasUnsavedColors] = useState(false)

  return (
    <AdminGuard>
      <div className="min-h-screen pb-24 md:pb-8 p-4 md:p-8">
        <div className="max-w-6xl mx-auto font-body">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mb-6"
          >
            <div>
              <h1 className="text-2xl font-display font-black flex items-center gap-2">
                <ShieldCheck size={24} className="text-violet-400" /> Admin
                Panel
              </h1>
              <p className="text-white/40 text-sm mt-0.5">
                Quản lý nội dung và người dùng PicSpy
              </p>
            </div>
          </motion.div>

          {/* Tabs */}
          <div className="flex gap-1 mb-6 bg-surface-50 p-1 rounded-2xl border border-white/10 w-full flex-nowrap overflow-x-auto no-scrollbar">
            {TABS.map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => {
                  if (
                    activeTab === 'settings' &&
                    key !== 'settings' &&
                    hasUnsavedColors
                  ) {
                    if (
                      !window.confirm(
                        'Cấu hình màu của bạn chưa được lưu. Bạn có chắc chắn muốn rời đi?'
                      )
                    ) {
                      return
                    }
                    setHasUnsavedColors(false)
                  }
                  setActiveTab(key)
                }}
                className={`flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap
                  ${activeTab === key ? 'bg-brand-600 text-white shadow-[0_0_20px_rgba(124,58,237,0.3)]' : 'text-white/50 hover:text-white/80'}`}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="min-h-[600px] flex flex-col justify-start w-full relative"
            >
              {activeTab === 'dashboard' && (
                <ComponentErrorBoundary tabName="Tổng quan">
                  <DashboardTab />
                </ComponentErrorBoundary>
              )}
              {activeTab === 'posts' && (
                <ComponentErrorBoundary tabName="Bài đăng">
                  <PostsTab />
                </ComponentErrorBoundary>
              )}
              {activeTab === 'users' && (
                <ComponentErrorBoundary tabName="Người dùng">
                  <UsersTab />
                </ComponentErrorBoundary>
              )}
              {activeTab === 'withdrawals' && (
                <ComponentErrorBoundary tabName="Rút tiền">
                  <WithdrawalsTab />
                </ComponentErrorBoundary>
              )}
              {activeTab === 'reports' && (
                <ComponentErrorBoundary tabName="Báo cáo">
                  <ReportsTab />
                </ComponentErrorBoundary>
              )}
              {activeTab === 'categories' && (
                <ComponentErrorBoundary tabName="Danh mục">
                  <CategoriesTab />
                </ComponentErrorBoundary>
              )}
              {activeTab === 'settings' && (
                <ComponentErrorBoundary tabName="Cấu hình">
                  <SettingsTab onDirtyChange={setHasUnsavedColors} />
                </ComponentErrorBoundary>
              )}
              {activeTab === 'logs' && (
                <ComponentErrorBoundary tabName="Nhật ký">
                  <LogsTab />
                </ComponentErrorBoundary>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </AdminGuard>
  )
}

export default AdminPage
