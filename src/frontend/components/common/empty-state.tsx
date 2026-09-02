'use client'

import { cn } from '@/lib/utils'
import { Compass, Inbox, Loader2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
  emoji?: string
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
  emoji,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'relative flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-gradient-to-br from-card/50 to-muted/20 px-6 py-14 text-center overflow-hidden',
        className,
      )}
    >
      {/* Decorative gradient blob */}
      <div className="absolute -top-8 -right-8 h-32 w-32 bg-emerald-500/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-8 -left-8 h-24 w-24 bg-teal-500/8 rounded-full blur-3xl pointer-events-none" />

      <div className="relative grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500/15 to-teal-500/10 text-emerald-600 dark:text-emerald-400 mb-4 ring-1 ring-emerald-500/20">
        {emoji ? (
          <span className="text-2xl">{emoji}</span>
        ) : (
          <Icon className="h-7 w-7" />
        )}
      </div>
      <div className="relative text-sm font-semibold">{title}</div>
      {description && (
        <p className="relative mt-1.5 text-xs text-muted-foreground max-w-sm leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="relative mt-5">{action}</div>}
    </motion.div>
  )
}

export function LoadingState({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <Loader2 className="h-6 w-6 text-emerald-500 animate-spin" />
      <div className="text-xs text-muted-foreground">{label || 'Loading...'}</div>
    </div>
  )
}

/** Skeleton card for loading product grids */
export function ProductCardSkeleton() {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-3 space-y-2">
      <div className="flex gap-2">
        <div className="h-12 w-12 rounded-lg asos-shimmer" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 w-3/4 rounded asos-shimmer" />
          <div className="h-2 w-1/2 rounded asos-shimmer" />
        </div>
      </div>
      <div className="h-4 w-1/3 rounded asos-shimmer" />
      <div className="h-8 w-full rounded asos-shimmer" />
    </div>
  )
}
