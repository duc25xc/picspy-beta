import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, Search } from 'lucide-react'

const NotFoundPage = () => (
  <div className="min-h-screen flex items-center justify-center p-6 text-center">
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      {/* Glowing number */}
      <div className="text-[120px] md:text-[180px] font-display font-bold leading-none select-none mb-4">
        <span className="gradient-text">4</span>
        <span className="text-white/10">0</span>
        <span className="gradient-text">4</span>
      </div>
      <h1 className="text-2xl font-display font-bold mb-3">Trang không tồn tại</h1>
      <p className="text-white/50 mb-8 max-w-sm mx-auto">
        Wallpaper bạn đang tìm đã bị ẩn, xóa hoặc chưa bao giờ tồn tại trên PICSPY.
      </p>
      <div className="flex gap-3 justify-center">
        <Link to="/" className="btn-primary">
          <Home size={16} /> Về trang chủ
        </Link>
        <Link to="/search" className="btn-secondary">
          <Search size={16} /> Khám phá
        </Link>
      </div>
    </motion.div>
  </div>
)

export default NotFoundPage
