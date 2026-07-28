'use client'

import { cn } from '@/lib/utils'
import { scoreColor } from '@/lib/ui-utils'

interface ScoreRingProps {
  value: number
  max?: number
  size?: number
  strokeWidth?: number
  label?: string
  sublabel?: string
  className?: string
}

export function ScoreRing({
  value,
  max = 100,
  size = 64,
  strokeWidth = 6,
  label,
  sublabel,
  className,
}: ScoreRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const pct = Math.max(0, Math.min(1, value / max))
  const dash = circumference * pct
  const color = scoreColor(value)

  return (
    <div
      className={cn('relative grid place-items-center', className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/40"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${dash} ${circumference - dash}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div
            className="font-bold leading-none"
            style={{ color, fontSize: size * 0.28 }}
          >
            {Math.round(value)}
          </div>
          {sublabel && (
            <div className="text-[9px] text-muted-foreground leading-tight mt-0.5">
              {sublabel}
            </div>
          )}
        </div>
      </div>
      {label && (
        <span className="sr-only">{label}</span>
      )}
    </div>
  )
}
