import { useState, useEffect } from 'react'
import { Megaphone, X, ArrowRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSettings } from '../../context/SettingsContext'

export default function AnnouncementBanner() {
  const { announcement } = useSettings()
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    if (!announcement?.enabled || !announcement?.text) {
      setDismissed(true)
      return
    }

    const hash = announcement.text.trim()
    const isDismissed = localStorage.getItem(`picspy_announcement_dismissed_${hash}`)
    if (isDismissed) {
      setDismissed(true)
    } else {
      setDismissed(false)
    }
  }, [announcement])

  const handleDismiss = () => {
    if (announcement?.text) {
      localStorage.setItem(`picspy_announcement_dismissed_${announcement.text.trim()}`, 'true')
    }
    setDismissed(true)
  }

  if (dismissed || !announcement?.enabled || !announcement?.text) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="w-full bg-gradient-brand text-white overflow-hidden text-center relative z-40 text-xs py-2 px-8 flex items-center justify-center gap-2 border-b border-white/10"
      >
        <Megaphone size={13} className="flex-shrink-0" />
        
        {announcement.link ? (
          <a
            href={announcement.link}
            className="hover:underline font-semibold inline-flex items-center gap-1"
          >
            <span>{announcement.text}</span>
            <ArrowRight size={12} className="inline-block" />
          </a>
        ) : (
          <span className="font-semibold">{announcement.text}</span>
        )}

        <button
          onClick={handleDismiss}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-lg transition-colors cursor-pointer text-white/70 hover:text-white"
        >
          <X size={13} />
        </button>
      </motion.div>
    </AnimatePresence>
  )
}
