'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Activity, Filter } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { EmptyState, LoadingState } from '@/components/common/empty-state'
import { relativeTime } from '@/lib/ui-utils'
import { cn } from '@/lib/utils'

interface TimelineEvent {
  id: string
  type: string
  title: string
  description?: string
  productId?: string
  metadata?: unknown
  createdAt: string
}

const TYPE_META: Record<
  string,
  { icon: string; color: string; label: string }
> = {
  search: { icon: '🔍', color: '#4338ca', label: 'Search' },
  recommendation: { icon: '✨', color: '#a855f7', label: 'Recommendation' },
  wishlist: { icon: '❤️', color: '#ec4899', label: 'Wishlist' },
  purchase: { icon: '🛒', color: '#06b6d4', label: 'Purchase' },
  comparison: { icon: '⚖️', color: '#f59e0b', label: 'Comparison' },
  price_drop: { icon: '📉', color: '#ef4444', label: 'Price Drop' },
  memory_update: { icon: '🧠', color: '#8b5cf6', label: 'Memory' },
  twin_update: { icon: '🔄', color: '#14b8a6', label: 'Twin Update' },
  onboarding: { icon: '🚀', color: '#4338ca', label: 'Onboarding' },
  notification: { icon: '🔔', color: '#f97316', label: 'Notification' },
}

function meta(meta: unknown): Record<string, string | number> {
  if (!meta) return {}
  if (typeof meta === 'string') {
    try {
      return JSON.parse(meta)
    } catch {
      return {}
    }
  }
  return meta as Record<string, string | number>
}

export function TimelineView() {
  const [filter, setFilter] = React.useState<string>('')

  const { data, isLoading } = useQuery<{ events: TimelineEvent[] }>({
    queryKey: ['timeline', filter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filter) params.set('type', filter)
      const res = await fetch(`/api/timeline?${params}`)
      return res.json()
    },
  })

  const events = data?.events || []
  const types = Object.keys(TYPE_META)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Activity className="h-5 w-5 text-emerald-500" /> Activity Timeline
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Every search, recommendation, and shopping interaction, captured.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Filter className="h-3 w-3" /> Filter:
        </span>
        <button
          onClick={() => setFilter('')}
          className={cn(
            'rounded-full border px-2.5 py-0.5 text-[11px] transition-colors',
            !filter
              ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
              : 'border-border/60 hover:bg-muted',
          )}
        >
          All
        </button>
        {types.map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t === filter ? '' : t)}
            className={cn(
              'rounded-full border px-2.5 py-0.5 text-[11px] transition-colors',
              filter === t
                ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                : 'border-border/60 hover:bg-muted',
            )}
          >
            {TYPE_META[t].icon} {TYPE_META[t].label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <LoadingState label="Loading timeline…" />
      ) : events.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="No activity yet"
          description="Your shopping activity will appear here as you chat, browse, and save products."
        />
      ) : (
        <div className="relative">
          {/* vertical line */}
          <div className="absolute left-[14px] top-0 bottom-0 w-px bg-border" />
          <div className="space-y-3">
            {events.map((e, i) => {
              const tm = TYPE_META[e.type] || {
                icon: '📌',
                color: '#6b7280',
                label: e.type,
              }
              const m = meta(e.metadata)
              return (
                <motion.div
                  key={e.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: Math.min(i * 0.02, 0.3) }}
                  className="relative pl-9"
                >
                  <div
                    className="absolute left-0 top-1 grid h-7 w-7 place-items-center rounded-full text-sm shadow-sm"
                    style={{
                      backgroundColor: `${tm.color}20`,
                      border: `1.5px solid ${tm.color}`,
                    }}
                  >
                    {tm.icon}
                  </div>
                  <div className="rounded-lg border border-border/60 bg-card p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium">{e.title}</div>
                        {e.description && (
                          <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                            {e.description}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-1 mt-1.5 items-center">
                          <Badge
                            variant="secondary"
                            className="text-[10px] py-0 px-1.5"
                            style={{
                              backgroundColor: `${tm.color}15`,
                              color: tm.color,
                            }}
                          >
                            {tm.label}
                          </Badge>
                          {Object.entries(m).slice(0, 4).map(([k, v]) => (
                            <Badge
                              key={k}
                              variant="outline"
                              className="text-[10px] py-0 px-1.5 font-normal"
                            >
                              {k}:{' '}
                              <span className="font-medium">
                                {typeof v === 'string' && v.length > 30
                                  ? v.slice(0, 30) + '…'
                                  : String(v)}
                              </span>
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="text-[10px] text-muted-foreground shrink-0">
                        {relativeTime(e.createdAt)}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
