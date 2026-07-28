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
        'relative grid shrink-0 place-items-center overflow-hidden rounded-xl font-bold text-white shadow-sm transition-transform group-hover:scale-105',
        className,
      )}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${imageColor || '#10b981'} 0%, ${imageColor || '#10b981'}cc 60%, ${imageColor || '#10b981'}99 100%)`,
      }}
      aria-hidden
    >
      {/* Shine effect */}
      <span
        className="absolute -top-1/2 -left-1/2 h-full w-full opacity-30"
        style={{
          background: 'linear-gradient(45deg, transparent 40%, rgba(255,255,255,0.4) 50%, transparent 60%)',
        }}
      />
      {/* Top-right highlight */}
      <span
        className="absolute right-1 top-1 h-3 w-3 rounded-full bg-white/50"
        style={{ filter: 'blur(3px)' }}
      />
      <span style={{ fontSize: size * 0.4 }} className="leading-none relative z-10 drop-shadow-sm">
        {initial}
      </span>
      <span className="absolute bottom-1 left-1 right-1 truncate text-[8px] uppercase tracking-wider opacity-80 text-center z-10">
        {brand}
      </span>
    </div>
  )
}
