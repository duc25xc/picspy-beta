import React from 'react'

/**
 * Component hiển thị chữ nước phát sáng PICSPY (load3)
 * @param {string} size - 'sm' | 'md' | 'lg'
 * @param {string} className - class bổ sung bên ngoài
 */
const ContentLoader = ({ size = 'md', className = '' }) => {
  return (
    <div className={`text-wave-loader size-${size} ${className}`} aria-label="PICSPY">
      <span>P I C S P Y</span>
      <span>P I C S P Y</span>
    </div>
  )
}

export default ContentLoader
