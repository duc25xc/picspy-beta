import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  TrendingUp, Download, Heart, Eye, Users, Coins,
  BarChart3, Hash, Sparkles, Wallet, Film, Zap,
  ChevronDown,
} from 'lucide-react'
import api from '../api/api'
import useAuthStore from '../store/auth.store'
import toast from 'react-hot-toast'
import { getOptimizedWebpUrl } from '../utils/imageUrl'

// ─── SVG Bar Chart ─────────────────────────────────────────────────────────
const BarChart = ({ labels = [], data = [], color = '#8b5cf6' }) => {
  const [hovered, setHovered] = useState(null)
  if (!labels.length) {
    return (
      <div className="h-40 flex items-center justify-center text-white/20 text-xs tracking-wide">
        CHƯA CÓ DỮ LIỆU
      </div>
    )
  }
  const max = Math.max(...data, 1)
  const H = 140
  const W = 100
  const step = labels.length > 45 ? 14 : labels.length > 20 ? 7 : labels.length > 10 ? 3 : 1

  return (
    <div className="relative w-full" style={{ height: H + 32 }}>
      <AnimatePresence>
        {hovered !== null && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute top-0 left-1/2 -translate-x-1/2 z-10 bg-[#1a1a2e] border border-white/10 rounded-lg px-3 py-1.5 text-xs font-bold text-white shadow-xl pointer-events-none whitespace-nowrap"
          >
            {labels[hovered]} — {data[hovered].toLocaleString()}
          </motion.div>
        )}
      </AnimatePresence>

      <svg
        width="100%"
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="absolute left-0 top-2 right-0"
      >
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line
            key={f}
            x1={0} y1={H - f * H * 0.85}
            x2={W} y2={H - f * H * 0.85}
            stroke="rgba(255,255,255,0.04)"
            strokeDasharray="0.8 1.6"
          />
        ))}

        {data.map((v, i) => {
          const barW = W / data.length
          const bh = Math.max(1, (v / max) * (H * 0.85))
          const x = i * barW + barW * 0.15
          const w = barW * 0.7
          const y = H - bh
          return (
            <g key={i}>
              <rect x={x} y={y} width={w} height={bh} rx={1.5}
                fill={v === 0 ? 'rgba(255,255,255,0.06)' : color}
                opacity={hovered === i ? 1 : v === 0 ? 0.5 : 0.75}
              />
              <rect
                x={i * barW} y={0} width={barW} height={H}
                fill="transparent"
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: 'crosshair' }}
              />
            </g>
          )
        })}
      </svg>

      {/* HTML X-axis labels to prevent text distortion */}
      <div className="absolute left-0 right-0 bottom-0 h-5 pointer-events-none select-none">
        {labels.map((l, i) => {
          if (i % step !== 0) return null
          const leftPct = ((i + 0.5) / labels.length) * 100
          return (
            <div
              key={i}
              className="absolute text-[10px] font-semibold text-white/30 whitespace-nowrap transform -translate-x-1/2"
              style={{ left: `${leftPct}%` }}
            >
              {l.slice(5)}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Custom Select ──────────────────────────────────────────────────────────
const CustomSelect = ({ value, onChange, options }) => {
  const [open, setOpen] = useState(false)
  const current = options.find(o => o.value === value)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(p => !p)}
        className="flex items-center gap-2 bg-white/5 hover:bg-white/8 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-semibold text-white/80 transition-colors cursor-pointer"
      >
        {current?.label}
        <ChevronDown size={12} className={`text-white/40 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.97 }}
              transition={{ duration: 0.12 }}
              className="absolute right-0 top-full mt-1.5 z-20 min-w-[160px] bg-[#1a1a2e] border border-white/10 rounded-xl shadow-2xl overflow-hidden py-1"
            >
              {options.map(o => (
                <button
                  key={o.value}
                  onClick={() => { onChange(o.value); setOpen(false) }}
                  className={`w-full text-left px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
                    o.value === value
                      ? 'text-white bg-brand-600/40'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Thumbnail with fallback ────────────────────────────────────────────────
const PostThumb = ({ post }) => {
  const [err, setErr] = useState(false)
  const rawUrl = post.images?.[0]?.thumbnailUrl
    || post.images?.[0]?.previewUrl
    || post.images?.[0]?.url
    || post.generatedImages?.[0]?.thumbnailUrl
    || post.generatedImages?.[0]?.previewUrl
    || post.generatedImages?.[0]?.url

  const url = rawUrl ? getOptimizedWebpUrl(rawUrl, 150) : ''

  if (!url || err) {
    const letter = (post.caption || post.tags?.[0] || '?')[0]?.toUpperCase() || '?'
    return (
      <div className="w-10 h-10 rounded-lg bg-brand-500/20 flex items-center justify-center flex-shrink-0">
        <span className="text-xs font-black text-brand-300">{letter}</span>
      </div>
    )
  }

  return (
    <img
      src={url}
      alt=""
      className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
      onError={() => setErr(true)}
    />
  )
}

// ─── Post Row ───────────────────────────────────────────────────────────────
const PostRow = ({ post, rank }) => (
  <Link
    to={`/posts/${post._id}`}
    className="grid grid-cols-[20px_44px_1fr_80px_80px_80px] items-center gap-3 py-2.5 border-b border-white/[0.05] last:border-0 hover:bg-white/[0.02] -mx-3 px-3 rounded-lg transition-colors block cursor-pointer"
  >
    <span className="text-[11px] font-bold text-white/20 tabular-nums text-right">{rank}</span>
    <PostThumb post={post} />
    <div className="min-w-0">
      <p className="text-xs text-white/70 truncate font-medium leading-tight">
        {post.caption || post.tags?.slice(0, 3).join(', ') || 'Không có caption'}
      </p>
      <p className="text-[10px] text-white/30 mt-0.5 font-mono">{post.aiTool || post.category || 'other'}</p>
    </div>
    <div className="text-right">
      <p className="text-xs font-semibold text-white/70 tabular-nums">{(post.stats?.viewsCount || 0).toLocaleString()}</p>
      <p className="text-[9px] text-white/30 font-medium">views</p>
    </div>
    <div className="text-right">
      <p className="text-xs font-semibold text-white/70 tabular-nums">{(post.stats?.downloadsCount || 0).toLocaleString()}</p>
      <p className="text-[9px] text-white/30 font-medium">tải xuống</p>
    </div>
    <div className="text-right">
      <p className="text-xs font-semibold text-emerald-400 tabular-nums">{(post.totalTokensEarned || 0).toLocaleString()}</p>
      <p className="text-[9px] text-white/30 font-medium">tokens</p>
    </div>
  </Link>
)

// ─── Chip button ────────────────────────────────────────────────────────────
const Chip = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
      active ? 'bg-brand-600 text-white' : 'text-white/40 hover:text-white/70 hover:bg-white/5'
    }`}
  >
    {children}
  </button>
)

// ─── Main Component ─────────────────────────────────────────────────────────
const StudioPage = () => {
  const { user } = useAuthStore()

  const [overview, setOverview] = useState(null)
  const [chartData, setChartData] = useState(null)
  const [posts, setPosts] = useState([])
  const [earnings, setEarnings] = useState(null)
  const [hashtags, setHashtags] = useState(null)
  const [categories, setCategories] = useState(null)
  const [loading, setLoading] = useState(true)

  const [activeTab, setActiveTab] = useState('overview')
  const [chartMetric, setChartMetric] = useState('views')
  const [chartPeriod, setChartPeriod] = useState('30d')
  const [postSort, setPostSort] = useState('views')

  // VNĐ Payout & Topup states
  const [topupAmount, setTopupAmount] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountHolder, setAccountHolder] = useState('')
  const [submittingTopup, setSubmittingTopup] = useState(false)
  const [submittingWithdraw, setSubmittingWithdraw] = useState(false)
  const [submittingBank, setSubmittingBank] = useState(false)

  useEffect(() => {
    if (earnings?.bankAccount) {
      setBankName(earnings.bankAccount.bankName || '')
      setAccountNumber(earnings.bankAccount.accountNumber || '')
      setAccountHolder(earnings.bankAccount.accountHolder || '')
    }
  }, [earnings])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [ov, ch] = await Promise.all([
          api.get('/studio/overview'),
          api.get('/studio/chart?metric=views&period=30d'),
        ])
        setOverview(ov.data)
        setChartData(ch.data)
      } catch {
        toast.error('Không tải được dữ liệu studio')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    if (loading) return
    api.get(`/studio/chart?metric=${chartMetric}&period=${chartPeriod}`)
      .then(({ data }) => setChartData(data))
      .catch(() => {})
  }, [chartMetric, chartPeriod]) // eslint-disable-line

  useEffect(() => {
    if (activeTab === 'posts' && posts.length === 0) {
      api.get(`/studio/posts?sort=${postSort}&limit=20`)
        .then(({ data }) => setPosts(data.posts || []))
        .catch(() => {})
    }
    if (activeTab === 'earnings' && !earnings) {
      api.get('/studio/earnings?limit=20')
        .then(({ data }) => setEarnings(data))
        .catch(() => {})
    }
    if (activeTab === 'hashtags' && !hashtags) {
      api.get('/studio/hashtags')
        .then(({ data }) => setHashtags(data))
        .catch(() => {})
    }
    if (activeTab === 'categories' && !categories) {
      api.get('/studio/categories')
        .then(({ data }) => setCategories(data.categories || []))
        .catch(() => {})
    }
  }, [activeTab]) // eslint-disable-line

  const handleSortChange = (sort) => {
    setPostSort(sort)
    api.get(`/studio/posts?sort=${sort}&limit=20`)
      .then(({ data }) => setPosts(data.posts || []))
      .catch(() => {})
  }

  const handleSaveBank = async (e) => {
    e.preventDefault()
    if (!bankName || !accountNumber || !accountHolder) {
      return toast.error('Vui lòng điền đủ thông tin tài khoản')
    }
    setSubmittingBank(true)
    try {
      const { data } = await api.post('/users/me/bank', {
        bankName,
        accountNumber,
        accountHolder,
      })
      toast.success(data.message || 'Đã lưu tài khoản ngân hàng')
      const res = await api.get('/studio/earnings?limit=20')
      setEarnings(res.data)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra')
    } finally {
      setSubmittingBank(false)
    }
  }

  const handleTopup = async (e) => {
    e.preventDefault()
    const amount = parseInt(topupAmount)
    if (!amount || amount < 10000) {
      return toast.error('Số tiền nạp tối thiểu là 10.000đ')
    }
    setSubmittingTopup(true)
    try {
      const { data } = await api.post('/users/me/topup', { amount })
      toast.success(data.message || 'Đã nạp tiền thành công')
      setTopupAmount('')
      const res = await api.get('/studio/earnings?limit=20')
      setEarnings(res.data)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Nạp tiền thất bại')
    } finally {
      setSubmittingTopup(false)
    }
  }

  const handleWithdraw = async (e) => {
    e.preventDefault()
    const amount = parseInt(withdrawAmount)
    if (!amount || amount < 50000) {
      return toast.error('Số tiền rút tối thiểu là 50.000 VNĐ')
    }
    setSubmittingWithdraw(true)
    try {
      const { data } = await api.post('/users/me/withdraw', { amount })
      toast.success(data.message || 'Gửi yêu cầu rút tiền thành công')
      setWithdrawAmount('')
      const res = await api.get('/studio/earnings?limit=20')
      setEarnings(res.data)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Rút tiền thất bại')
    } finally {
      setSubmittingWithdraw(false)
    }
  }

  const fmt = (n = 0) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K`
    : String(n || 0)

  const CHART_COLORS = { views: '#8b5cf6', downloads: '#06b6d4', earnings: '#f59e0b', likes: '#ec4899' }
  const METRIC_LABELS = { views: 'Lượt xem', downloads: 'Lượt tải xuống', earnings: 'Token', likes: 'Thích' }

  const SORT_OPTIONS = [
    { value: 'views',     label: 'Nhiều view nhất' },
    { value: 'downloads', label: 'Nhiều tải xuống nhất' },
    { value: 'likes',     label: 'Nhiều like nhất' },
    { value: 'earnings',  label: 'Thu nhập cao nhất' },
    { value: 'recent',   label: 'Mới nhất' },
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 rounded-full border-2 border-brand-500/30 border-t-brand-500 animate-spin mx-auto" />
          <p className="text-white/30 text-[10px] tracking-widest uppercase">Đang tải</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-24 px-4 max-w-5xl mx-auto">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="pt-8 pb-6 border-b border-white/[0.06] mb-6"
      >
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] font-bold text-brand-400 tracking-widest uppercase mb-1 flex items-center gap-1.5">
              <Film size={11} /> Creator Studio
            </p>
            <h1 className="text-xl font-bold text-white">
              {user?.displayName || user?.username}
            </h1>
            <p className="text-sm text-white/35 mt-0.5">
              {overview?.totalPosts || 0} bài đăng &middot; {fmt(overview?.followers)} followers
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl px-5 py-2 shadow-lg shadow-emerald-950/10">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 text-emerald-400">
                <Wallet size={16} />
              </div>
              <div>
                <p className="text-base font-black text-emerald-400 tabular-nums leading-none">
                  {(overview?.earnings?.currentBalance || 0).toLocaleString()}
                </p>
                <p className="text-[9px] text-emerald-500/60 font-bold uppercase tracking-wider mt-0.5">tokens</p>
              </div>
            </div>
            <Link to="/upload" className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-colors">
              <Sparkles size={13} /> Upload
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { icon: Eye,      label: 'Tổng lượt xem',  value: fmt(overview?.stats?.views),     sub: 'mọi thời gian',          accent: 'text-violet-400' },
          { icon: Download, label: 'Lượt tải xuống', value: fmt(overview?.stats?.downloads), sub: 'premium + free',          accent: 'text-cyan-400' },
          { icon: Heart,    label: 'Lượt thích',      value: fmt(overview?.stats?.likes),     sub: 'tất cả bài đăng',        accent: 'text-pink-400' },
          { icon: Coins,    label: 'Thu nhập 30 ngày', value: `+${fmt(overview?.earnings?.last30Days)}`, sub: `tổng: ${fmt(overview?.earnings?.totalEarned)}`, accent: 'text-amber-400' },
        ].map(({ icon: Icon, label, value, sub, accent }, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="bg-white/[0.025] border border-white/[0.07] rounded-2xl p-4 hover:border-white/12 transition-colors"
          >
            <Icon size={14} className={`${accent} mb-3 opacity-80`} />
            <p className={`text-xl font-bold tabular-nums ${accent}`}>{value}</p>
            <p className="text-[11px] text-white/55 font-medium mt-0.5 leading-tight">{label}</p>
            <p className="text-[10px] text-white/25 mt-0.5">{sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0.5 mb-6 p-1 bg-white/[0.025] border border-white/[0.07] rounded-xl w-fit">
        {[
          { id: 'overview',   label: 'Tổng quan' },
          { id: 'posts',      label: 'Bài đăng' },
          { id: 'categories', label: 'Danh mục' },
          { id: 'earnings',   label: 'Thu nhập' },
          { id: 'hashtags',   label: 'Hashtag' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === t.id ? 'bg-brand-600 text-white shadow-sm' : 'text-white/40 hover:text-white/65'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">

        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="bg-white/[0.02] border border-white/[0.07] rounded-2xl p-5 mb-5">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">
                    {chartData?.data?.reduce((a, b) => a + b, 0)?.toLocaleString() || 0}
                    <span className="text-white/35 font-normal ml-1.5 text-xs">{METRIC_LABELS[chartMetric]} trong {chartPeriod}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center p-0.5 bg-white/[0.03] border border-white/[0.07] rounded-lg gap-0.5">
                    {Object.entries(METRIC_LABELS).map(([k, v]) => (
                      <Chip key={k} active={chartMetric === k} onClick={() => setChartMetric(k)}>{v}</Chip>
                    ))}
                  </div>
                  <div className="flex items-center p-0.5 bg-white/[0.03] border border-white/[0.07] rounded-lg gap-0.5">
                    {['7d', '30d', '90d'].map(p => (
                      <Chip key={p} active={chartPeriod === p} onClick={() => setChartPeriod(p)}>{p}</Chip>
                    ))}
                  </div>
                </div>
              </div>
              <BarChart labels={chartData?.labels || []} data={chartData?.data || []} color={CHART_COLORS[chartMetric]} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { icon: Users,    label: 'Cộng đồng',  primary: fmt(overview?.followers), unit: 'followers', secondary: `Đang theo dõi: ${fmt(overview?.following)}` },
                { icon: Coins,    label: 'Thu nhập',   primary: `+${fmt(overview?.earnings?.last30Days)}`, unit: 'tokens / 30 ngày', secondary: `Tích lũy: ${fmt(overview?.earnings?.totalEarned)}` },
                { icon: BarChart3,label: 'Tương tác',  primary: fmt(overview?.stats?.comments), unit: 'bình luận', secondary: `Bookmarks: ${fmt(overview?.stats?.bookmarks)}` },
              ].map(({ icon: Icon, label, primary, unit, secondary }, i) => (
                <div key={i} className="bg-white/[0.02] border border-white/[0.07] rounded-2xl p-4">
                  <p className="text-[10px] font-bold text-white/30 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Icon size={10} /> {label}
                  </p>
                  <p className="text-2xl font-bold text-white tabular-nums">{primary}</p>
                  <p className="text-xs text-white/35 mt-0.5">{unit}</p>
                  <div className="mt-2 pt-2 border-t border-white/[0.05]">
                    <p className="text-[10px] text-white/25">{secondary}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* POSTS */}
        {activeTab === 'posts' && (
          <motion.div key="posts" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-white">Hiệu suất bài đăng</p>
              <CustomSelect value={postSort} onChange={handleSortChange} options={SORT_OPTIONS} />
            </div>

            <div className="bg-white/[0.02] border border-white/[0.07] rounded-2xl p-3">
              <div className="grid grid-cols-[20px_44px_1fr_80px_80px_80px] items-center gap-3 pb-2 mb-1 border-b border-white/[0.05]">
                <span className="text-[9px] font-bold text-white/20 uppercase text-right">#</span>
                <span />
                <span className="text-[9px] font-bold text-white/20 uppercase">Bài đăng</span>
                <span className="text-[9px] font-bold text-white/20 uppercase text-right">View</span>
                <span className="text-[9px] font-bold text-white/20 uppercase text-right">Tải xuống</span>
                <span className="text-[9px] font-bold text-white/20 uppercase text-right">Token</span>
              </div>

              {posts.length === 0 ? (
                <div className="py-14 text-center">
                  <p className="text-white/20 text-[10px] tracking-widest uppercase">Chưa có bài đăng</p>
                </div>
              ) : (
                posts.map((p, i) => <PostRow key={p._id} post={p} rank={i + 1} />)
              )}
            </div>
          </motion.div>
        )}

        {/* EARNINGS */}
        {activeTab === 'earnings' && (
          <motion.div key="earnings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Tổng thu nhập', value: earnings?.summary?.totalEarned, accent: 'text-amber-400' },
                { label: 'Đã rút tiền mặt', value: earnings?.summary?.totalWithdrawn, accent: 'text-rose-400' },
                { label: 'Số dư khả dụng', value: earnings?.summary?.currentBalance, accent: 'text-emerald-400' },
              ].map((s, i) => (
                <div key={i} className="bg-white/[0.02] border border-white/[0.07] rounded-2xl p-4">
                  <p className="text-[10px] font-bold text-white/30 uppercase tracking-wider mb-2">{s.label}</p>
                  <p className={`text-2xl font-black tabular-nums ${s.accent}`}>
                    {(s.value || 0).toLocaleString('vi-VN')}đ
                  </p>
                  <p className="text-[9px] text-white/20 mt-1 uppercase tracking-wide">Tiền mặt VNĐ</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left column: Topup and Cashout */}
              <div className="lg:col-span-5 space-y-6">
                {/* Simulated topup */}
                <div className="bg-white/[0.01] border border-white/[0.06] rounded-3xl p-6 relative overflow-hidden">
                  <h3 className="text-sm font-black text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                    <span>💵</span> Nạp tiền (Mô phỏng)
                  </h3>
                  <p className="text-[11px] text-white/40 mb-4">
                    Nạp thêm số dư VNĐ vào tài khoản để test mua ảnh Premium của các Creator khác.
                  </p>
                  <form onSubmit={handleTopup} className="space-y-4">
                    <div className="flex gap-2">
                      {[50000, 100000, 200000].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setTopupAmount(String(amt))}
                          className="flex-1 py-2 text-xs font-bold text-white/70 border border-white/10 hover:border-white/25 rounded-xl transition-all"
                        >
                          +{amt.toLocaleString('vi-VN')}
                        </button>
                      ))}
                    </div>
                    <div>
                      <input
                        type="number"
                        placeholder="Nhập số tiền VNĐ khác..."
                        value={topupAmount}
                        onChange={(e) => setTopupAmount(e.target.value)}
                        className="w-full bg-white/[0.03] border border-white/10 focus:border-emerald-500 rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={submittingTopup}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/40 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg"
                    >
                      {submittingTopup ? 'Đang nạp...' : 'Xác nhận nạp tiền'}
                    </button>
                  </form>
                </div>

                {/* Cashout withdrawal request */}
                <div className="bg-white/[0.01] border border-white/[0.06] rounded-3xl p-6 relative overflow-hidden">
                  <h3 className="text-sm font-black text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                    <span>🏦</span> Yêu cầu rút tiền
                  </h3>
                  <p className="text-[11px] text-white/40 mb-4">
                    Rút số dư khả dụng về tài khoản ngân hàng. Yêu cầu sẽ được xử lý trong vòng 24h.
                  </p>
                  <form onSubmit={handleWithdraw} className="space-y-4">
                    <div>
                      <label className="block text-[9px] font-bold text-white/35 uppercase tracking-wide mb-1">Số tiền muốn rút</label>
                      <input
                        type="number"
                        placeholder="Rút tối thiểu 50.000đ"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        className="w-full bg-white/[0.03] border border-white/10 focus:border-brand-500 rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
                      />
                    </div>
                    
                    {/* Fee calculation box */}
                    {withdrawAmount && Number(withdrawAmount) >= 50000 && (
                      <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4 text-xs space-y-2">
                        <div className="flex justify-between text-white/40">
                          <span>Phí giao dịch rút ví (2%):</span>
                          <span>{(Math.floor(Number(withdrawAmount) * 0.02)).toLocaleString()}đ</span>
                        </div>
                        <div className="flex justify-between text-white/40">
                          <span>Phí liên ngân hàng cố định:</span>
                          <span>10.000đ</span>
                        </div>
                        <div className="flex justify-between font-bold text-white pt-1 border-t border-white/[0.05]">
                          <span>Thực nhận tài khoản:</span>
                          <span className="text-emerald-400">{(Number(withdrawAmount) - 10000 - Math.floor(Number(withdrawAmount) * 0.02)).toLocaleString()}đ</span>
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={submittingWithdraw}
                      className="w-full py-3 bg-brand-600 hover:bg-brand-500 disabled:bg-brand-600/40 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg"
                    >
                      {submittingWithdraw ? 'Đang gửi...' : 'Gửi yêu cầu rút'}
                    </button>
                  </form>
                </div>
              </div>

              {/* Right column: Bank Account Details and Ledger */}
              <div className="lg:col-span-7 space-y-6">
                {/* Bank Account setup */}
                <div className="bg-white/[0.01] border border-white/[0.06] rounded-3xl p-6 relative overflow-hidden">
                  <h3 className="text-sm font-black text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                    <span>💳</span> Liên kết ngân hàng nhận tiền
                  </h3>
                  <form onSubmit={handleSaveBank} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] font-bold text-white/35 uppercase tracking-wide mb-1">Tên ngân hàng</label>
                      <input
                        type="text"
                        placeholder="Ví dụ: Techcombank, VCB..."
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        className="w-full bg-white/[0.03] border border-white/10 focus:border-brand-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-white/35 uppercase tracking-wide mb-1">Số tài khoản</label>
                      <input
                        type="text"
                        placeholder="Nhập số tài khoản ngân hàng..."
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        className="w-full bg-white/[0.03] border border-white/10 focus:border-brand-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[9px] font-bold text-white/35 uppercase tracking-wide mb-1">Tên chủ tài khoản (Không dấu)</label>
                      <input
                        type="text"
                        placeholder="Ví dụ: NGUYEN VAN A"
                        value={accountHolder}
                        onChange={(e) => setAccountHolder(e.target.value)}
                        className="w-full bg-white/[0.03] border border-white/10 focus:border-brand-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                      />
                    </div>
                    <div className="md:col-span-2 pt-2">
                      <button
                        type="submit"
                        disabled={submittingBank}
                        className="w-full py-2.5 bg-white/10 hover:bg-white/15 disabled:bg-white/5 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all border border-white/5"
                      >
                        {submittingBank ? 'Đang lưu...' : 'Lưu tài khoản ngân hàng'}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Transactions Ledger */}
                <div className="bg-white/[0.01] border border-white/[0.06] rounded-3xl p-6 relative overflow-hidden">
                  <p className="text-sm font-black text-white uppercase tracking-wider mb-4">Lịch sử giao dịch</p>
                  {!earnings || earnings.transactions?.length === 0 ? (
                    <div className="py-12 text-center">
                      <p className="text-white/20 text-[10px] tracking-widest uppercase">Chưa có giao dịch phát sinh</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                      {earnings.transactions?.map((t) => {
                        const styleInfo = (() => {
                          switch (t.type) {
                            case 'topup':
                              return { emoji: '💵', color: 'bg-emerald-500/10 text-emerald-400', txt: 'Nạp tiền ví' }
                            case 'purchase_post':
                              return { emoji: '📥', color: 'bg-red-500/10 text-red-400', txt: 'Tải ảnh Premium' }
                            case 'earn_purchase':
                              return { emoji: '🎨', color: 'bg-teal-500/10 text-teal-400', txt: 'Bán ảnh Premium' }
                            case 'earn_views':
                              return { emoji: '👁️', color: 'bg-indigo-500/10 text-indigo-400', txt: 'Quyết toán views' }
                            case 'withdraw_request':
                              return { emoji: '⏳', color: 'bg-amber-500/10 text-amber-400', txt: 'Yêu cầu rút tiền' }
                            default:
                              return { emoji: '💸', color: 'bg-white/10 text-white/60', txt: 'Giao dịch' }
                          }
                        })()

                        const isPositive = t.amount > 0

                        return (
                          <div key={t._id} className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/[0.04] rounded-2xl hover:bg-white/[0.03] transition-colors">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm ${styleInfo.color}`}>
                              {styleInfo.emoji}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start">
                                <p className="text-xs font-bold text-white/80 truncate leading-tight">{t.description || styleInfo.txt}</p>
                                <p className={`text-xs font-black tabular-nums ${isPositive ? 'text-emerald-400' : 'text-red-400'} ml-2 flex-shrink-0`}>
                                  {isPositive ? '+' : ''}{t.amount.toLocaleString()}đ
                                </p>
                              </div>
                              <p className="text-[9px] text-white/30 mt-1">{new Date(t.createdAt).toLocaleDateString('vi-VN')} {new Date(t.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* HASHTAGS */}
        {activeTab === 'hashtags' && (
          <motion.div key="hashtags" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div>
                <p className="text-[10px] font-bold text-white/35 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Hash size={10} /> Hashtag của bạn
                </p>
                <div className="bg-white/[0.02] border border-white/[0.07] rounded-2xl p-4 space-y-3">
                  {!hashtags?.userTags?.length ? (
                    <p className="text-white/20 text-[10px] tracking-wider uppercase py-8 text-center">Chưa có hashtag</p>
                  ) : (
                    hashtags.userTags.map((t, i) => {
                      const maxViews = hashtags.userTags[0]?.views || 1
                      const pct = Math.round((t.views / maxViews) * 100)
                      const isTrending = hashtags.trendingTags?.some(tt => tt.tag === t.tag)
                      return (
                        <div key={t.tag}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] text-white/20 w-4 tabular-nums text-right">{i + 1}</span>
                            <span className="text-xs font-semibold text-white/70">#{t.tag}</span>
                            {isTrending && (
                              <span className="text-[9px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/15 px-1.5 py-0.5 rounded-md">trending</span>
                            )}
                            <span className="ml-auto text-[10px] text-white/30 tabular-nums">{t.views.toLocaleString()}</span>
                          </div>
                          <div className="ml-6 h-1 bg-white/[0.05] rounded-full overflow-hidden">
                            <div className="h-full bg-brand-500/50 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold text-white/35 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <TrendingUp size={10} /> Trending hệ thống
                  <span className="text-[9px] text-white/20 font-normal normal-case tracking-normal">30 ngày</span>
                </p>
                <div className="bg-white/[0.02] border border-white/[0.07] rounded-2xl p-4 space-y-3">
                  {!hashtags?.trendingTags?.length ? (
                    <p className="text-white/20 text-[10px] tracking-wider uppercase py-8 text-center">Chưa có dữ liệu</p>
                  ) : (
                    hashtags.trendingTags.map((t, i) => {
                      const maxViews = hashtags.trendingTags[0]?.views || 1
                      const pct = Math.round((t.views / maxViews) * 100)
                      const youUse = hashtags.userTags?.some(mt => mt.tag === t.tag)
                      return (
                        <div key={t.tag}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] text-white/20 w-4 tabular-nums text-right">{i + 1}</span>
                            <span className="text-xs font-semibold text-white/70">#{t.tag}</span>
                            {youUse && (
                              <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/15 px-1.5 py-0.5 rounded-md">bạn dùng</span>
                            )}
                            <span className="ml-auto text-[10px] text-white/30 tabular-nums">{t.views.toLocaleString()}</span>
                          </div>
                          <div className="ml-6 h-1 bg-white/[0.05] rounded-full overflow-hidden">
                            <div className="h-full bg-rose-500/40 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>

                {hashtags?.trendingTags?.length > 0 && (
                  <div className="mt-3 bg-brand-500/[0.05] border border-brand-500/15 rounded-xl p-3">
                    <p className="text-[10px] font-bold text-brand-300/60 mb-2 flex items-center gap-1">
                      <Zap size={9} /> Gợi ý hashtag chưa dùng
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {hashtags.trendingTags
                        .filter(tt => !hashtags.userTags?.some(mt => mt.tag === tt.tag))
                        .slice(0, 8)
                        .map(tt => (
                          <span key={tt.tag} className="text-[10px] bg-white/[0.04] border border-white/8 rounded-full px-2 py-0.5 text-white/40">
                            #{tt.tag}
                          </span>
                        ))
                      }
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* CATEGORIES */}
        {activeTab === 'categories' && (
          <motion.div key="categories" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="bg-white/[0.02] border border-white/[0.07] rounded-2xl p-5 mb-5">
              <p className="text-xs font-bold text-white/50 uppercase tracking-wider mb-4">
                Hiệu suất theo Danh mục
              </p>

              {!categories || categories.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-white/20 text-[10px] tracking-widest uppercase">Chưa có danh mục nào</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {categories.map((c, i) => {
                    const maxViews = categories[0]?.views || 1
                    const pct = Math.round((c.views / maxViews) * 100)
                    return (
                      <div key={c.category} className="group">
                        <div className="flex items-center justify-between gap-4 mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-white/20 w-4 tabular-nums text-right">{i + 1}</span>
                            <span className="text-xs font-bold text-white/80 capitalize">{c.category === 'other' ? 'Khác' : c.category}</span>
                            <span className="text-[10px] text-white/25">({c.posts} bài đăng)</span>
                          </div>
                          <div className="flex items-center gap-4 text-right">
                            <div>
                              <span className="text-xs font-semibold text-white/70 tabular-nums">{c.views.toLocaleString()}</span>
                              <span className="text-[9px] text-white/30 ml-1">views</span>
                            </div>
                            <div className="w-16">
                              <span className="text-xs font-semibold text-white/70 tabular-nums">{c.downloads.toLocaleString()}</span>
                              <span className="text-[9px] text-white/30 ml-1">tải xuống</span>
                            </div>
                          </div>
                        </div>
                        <div className="ml-6 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}

export default StudioPage
