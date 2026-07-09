import { motion, AnimatePresence } from 'framer-motion'
import { IoAlertCircle, IoWarning, IoInformationCircle } from 'react-icons/io5'

const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Xác nhận?',
  message = 'Bạn có chắc chắn muốn thực hiện hành động này?',
  confirmText = 'Xác nhận',
  cancelText = 'Bỏ qua',
  type = 'danger', // 'danger' | 'warning' | 'info'
  zIndex = 250,
}) => {
  if (!isOpen) return null

  const iconColors = {
    danger: 'bg-red-500/10 border-red-500/20 text-red-500',
    warning: 'bg-amber-500/10 border-amber-500/20 text-amber-500',
    info: 'bg-brand-500/10 border-brand-500/20 text-brand-500',
  }

  const iconGlyphs = {
    danger: <IoAlertCircle size={22} />,
    warning: <IoWarning size={20} />,
    info: <IoInformationCircle size={22} />,
  }

  const confirmBtnColors = {
    danger: 'bg-red-600 hover:bg-red-500 shadow-[0_4px_12px_rgba(220,38,38,0.3)]',
    warning: 'bg-amber-600 hover:bg-amber-500 shadow-[0_4px_12px_rgba(217,119,6,0.3)]',
    info: 'bg-brand-600 hover:bg-brand-500 shadow-[0_4px_12px_rgba(124,58,237,0.3)]',
  }

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
        style={{ zIndex }}
      >
        {/* Click outside overlay to close */}
        <div className="fixed inset-0 w-full h-full" onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative bg-[#121225]/95 border border-white/10 p-7 rounded-[2rem] w-full max-w-[340px] text-center shadow-2xl z-10 noise"
          style={{ backdropFilter: 'blur(32px)' }}
        >
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-lg border ${
              iconColors[type] || iconColors.danger
            }`}
          >
            {iconGlyphs[type] || iconGlyphs.danger}
          </div>
          <h4 className="text-[17px] font-black text-white mb-2.5 tracking-tight pj">{title}</h4>
          <p className="text-[13px] text-white/50 mb-6 leading-relaxed max-w-[260px] mx-auto pj">{message}</p>
          <div className="flex gap-3 mt-1">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-full border border-white/10 text-white/60 hover:text-white hover:bg-white/5 transition-all text-xs font-bold cursor-pointer"
            >
              {cancelText}
            </button>
            <button
              onClick={() => {
                onConfirm()
                onClose()
              }}
              className={`flex-1 py-2.5 rounded-full text-white transition-all text-xs font-bold cursor-pointer ${
                confirmBtnColors[type] || confirmBtnColors.danger
              }`}
            >
              {confirmText}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export default ConfirmModal
