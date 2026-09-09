import React from 'react'
import { Icon } from '@iconify/react'

const FALLBACK_ICON = 'mdi:help-circle'

interface CategoryIconProps {
  name?: string
  size?: number
  width?: number
  height?: number
  className?: string
}

const CategoryIcon: React.FC<CategoryIconProps> = ({ name, size, width, height, className }) => {
  const iconSize = width || height || size || 16
  if (!name)
    return <Icon icon={FALLBACK_ICON} width={iconSize} height={iconSize} className={className} />
  return <Icon icon={name} width={iconSize} height={iconSize} className={className} />
}

export default CategoryIcon
