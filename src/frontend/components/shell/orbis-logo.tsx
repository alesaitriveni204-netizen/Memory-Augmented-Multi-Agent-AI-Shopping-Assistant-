'use client'

import { cn } from '@/lib/utils'

const strands = [
  { color: 'shopditto-orange', particle: '5,6', path: 'M 0 6 C 5 1 11 34 20 20 S 34 3 40 10' },
  { color: 'shopditto-blue', particle: '35,7', path: 'M 40 5 C 34 10 29 34 20 20 S 7 2 0 25' },
  { color: 'shopditto-green', particle: '9,5', path: 'M 10 0 C 4 6 35 10 20 20 S 9 34 23 40' },
  { color: 'shopditto-red', particle: '31,35', path: 'M 30 0 C 36 6 5 10 20 20 S 31 34 17 40' },
  { color: 'shopditto-pink', particle: '35,30', path: 'M 40 31 C 34 38 4 5 20 20 S 35 19 0 8' },
]

export function ShopDittoMark({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={cn('shopditto-mark', className)}
      viewBox="0 0 40 40"
      fill="none"
    >
      <g className="shopditto-flow">
        {strands.map(({ color, particle, path }) => {
          const [cx, cy] = particle.split(',')
          return (
            <g key={color}>
              <path className={cn('shopditto-ribbon', color)} pathLength="1" d={path} />
              <path className="shopditto-sheen" d={path} />
              <circle className={cn('shopditto-particle', color)} cx={cx} cy={cy} r="0.8" />
            </g>
          )
        })}
      </g>

      <g className="shopditto-knot">
        {strands.map(({ color }, index) => (
          <path
            key={color}
            className={cn('shopditto-ribbon', color)}
            transform={`rotate(${index * 36} 20 20)`}
            d="M 2 20 C 2 5 17 6 20 20 C 23 34 38 35 38 20 C 38 5 23 6 20 20 C 17 34 2 35 2 20"
          />
        ))}
      </g>

      <g className="shopditto-ring">
        <path className="shopditto-ribbon shopditto-orange" d="M 20 5 A 15 15 0 0 1 34.27 15.36" />
        <path className="shopditto-ribbon shopditto-blue" d="M 34.27 15.36 A 15 15 0 0 1 28.82 32.14" />
        <path className="shopditto-ribbon shopditto-green" d="M 28.82 32.14 A 15 15 0 0 1 11.18 32.14" />
        <path className="shopditto-ribbon shopditto-red" d="M 11.18 32.14 A 15 15 0 0 1 5.73 15.36" />
        <path className="shopditto-ribbon shopditto-pink" d="M 5.73 15.36 A 15 15 0 0 1 20 5" />
      </g>
    </svg>
  )
}

export function OrbisLogo({
  compact = false,
  animated = false,
  className,
}: {
  compact?: boolean
  animated?: boolean
  className?: string
}) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <ShopDittoMark className={cn(compact ? 'h-8 w-8' : 'h-9 w-9', animated && !compact && 'shopditto-intro-target')} />
      {!compact && <span className="text-sm font-bold tracking-tight">shopDitto</span>}
    </div>
  )
}
