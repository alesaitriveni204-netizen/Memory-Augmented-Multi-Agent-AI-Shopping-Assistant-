'use client'

import { cn } from '@/lib/utils'
import { scoreColor } from '@/lib/ui-utils'
import type { ScoreBreakdown } from '@/lib/types'

const LABELS: { key: keyof ScoreBreakdown; label: string }[] = [
  { key: 'preference', label: 'Pref' },
  { key: 'price', label: 'Price' },
  { key: 'review', label: 'Review' },
  { key: 'spec', label: 'Spec' },
  { key: 'twinCompat', label: 'Twin' },
  { key: 'memory', label: 'Mem' },
  { key: 'context', label: 'Ctx' },
  { key: 'availability', label: 'Avail' },
]

export function ScoreBars({
  breakdown,
  className,
}: {
  breakdown: ScoreBreakdown
  className?: string
}) {
  return (
    <div className={cn('flex items-end gap-1', className)}>
      {LABELS.map((item) => {
        const v = Math.max(0, Math.min(100, breakdown[item.key] || 0))
        return (
          <div
            key={item.key}
            className="flex flex-1 flex-col items-center gap-1"
          >
            <div className="relative h-16 w-full overflow-hidden rounded bg-muted/40">
              <div
                className="absolute bottom-0 left-0 right-0 rounded-t"
                style={{
                  height: `${v}%`,
                  backgroundColor: scoreColor(v),
                  transition: 'height 0.5s ease',
                }}
              />
            </div>
            <div className="text-[9px] text-muted-foreground leading-tight">
              {item.label}
            </div>
            <div className="text-[9px] font-semibold leading-tight">
              {Math.round(v)}
            </div>
          </div>
        )
      })}
    </div>
  )
}
