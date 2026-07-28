'use client'

import { cn } from '@/lib/utils'
import { Compass, Inbox } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-card/30 px-6 py-12 text-center',
        className,
      )}
    >
      <div className="grid h-12 w-12 place-items-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-3">
        <Icon className="h-6 w-6" />
      </div>
      <div className="text-sm font-semibold">{title}</div>
      {description && (
        <p className="mt-1 text-xs text-muted-foreground max-w-sm">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function LoadingState({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <Compass className="h-6 w-6 text-emerald-500 animate-spin" />
      <div className="text-xs text-muted-foreground">{label || 'Loading...'}</div>
    </div>
  )
}
