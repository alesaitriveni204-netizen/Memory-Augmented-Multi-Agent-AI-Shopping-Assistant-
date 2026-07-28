'use client'

import { cn } from '@/lib/utils'

interface ProductVisualProps {
  name: string
  brand: string
  imageColor: string
  size?: number
  className?: string
}

export function ProductVisual({
  name,
  brand,
  imageColor,
  size = 80,
  className,
}: ProductVisualProps) {
  const initial = (name || brand || '?').charAt(0).toUpperCase()
  return (
    <div
      className={cn(
        'relative grid shrink-0 place-items-center overflow-hidden rounded-xl font-bold text-white shadow-sm',
        className,
      )}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${imageColor || '#10b981'} 0%, ${imageColor || '#10b981'}cc 100%)`,
      }}
      aria-hidden
    >
      <span
        className="absolute right-1 top-1 h-2 w-2 rounded-full bg-white/40"
        style={{ filter: 'blur(2px)' }}
      />
      <span style={{ fontSize: size * 0.4 }} className="leading-none">
        {initial}
      </span>
      <span className="absolute bottom-1 left-1 right-1 truncate text-[8px] uppercase tracking-wider opacity-70 text-center">
        {brand}
      </span>
    </div>
  )
}
