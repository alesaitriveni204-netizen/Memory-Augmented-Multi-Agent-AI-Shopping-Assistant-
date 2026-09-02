'use client'

import { cn } from '@/lib/utils'

export function OrbisLogo({
  compact = false,
  className,
}: {
  compact?: boolean
  className?: string
}) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <span
        aria-hidden="true"
        className={cn(
          'orbis-mark relative grid shrink-0 place-items-center rounded-full',
          compact ? 'h-8 w-8' : 'h-9 w-9',
        )}
      >
        <span className="absolute inset-[8px] rounded-full bg-background" />
        <span className="absolute right-[5px] top-[4px] h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_8px_white]" />
      </span>
      {!compact && <span className="text-sm font-bold tracking-tight">Orbis</span>}
    </div>
  )
}
