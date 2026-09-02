'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Activity, TrendingUp, Brain, Zap, Heart, ShoppingCart, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface EvolutionPoint {
  timestamp: string
  eventType: string
  title: string
  confidence: number
  memoryCount: number
  description?: string
}

interface EvolutionData {
  evolution: EvolutionPoint[]
  confidenceChart: Array<{ time: string; confidence: number; memories: number }>
  typeCounts: Record<string, number>
  totalEvents: number
  currentConfidence: number
  currentMemoryCount: number
}

const EVENT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  onboarding: Sparkles,
  recommendation: Activity,
  twin_update: TrendingUp,
  memory_update: Brain,
  memory_created: Brain,
  purchase: ShoppingCart,
  wishlist: Heart,
  search: Zap,
}

const EVENT_COLORS: Record<string, string> = {
  onboarding: '#4338ca',
  recommendation: '#14b8a6',
  twin_update: '#06b6d4',
  memory_update: '#a855f7',
  memory_created: '#8b5cf6',
  purchase: '#f59e0b',
  wishlist: '#ec4899',
  search: '#0ea5e9',
}

export function TwinEvolutionChart() {
  const { data, isLoading } = useQuery<EvolutionData>({
    queryKey: ['twin-evolution'],
    queryFn: async () => {
      const res = await fetch('/api/digital-twin/evolution')
      return res.json()
    },
  })

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border/60 bg-card p-4">
        <div className="text-sm font-semibold mb-3">Twin Evolution Timeline</div>
        <div className="h-48 asos-shimmer rounded-lg" />
      </div>
    )
  }

  if (!data || data.evolution.length === 0) {
    return (
      <div className="rounded-xl border border-border/60 bg-card p-4">
        <div className="text-sm font-semibold mb-3">Twin Evolution Timeline</div>
        <div className="text-xs text-muted-foreground py-8 text-center">
          No evolution data yet. Interact with the app to grow your twin.
        </div>
      </div>
    )
  }

  const chartData = data.confidenceChart.slice(-30)
  const recentEvents = data.evolution.slice(-8).reverse()

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border/60 bg-card p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
            <TrendingUp className="h-3.5 w-3.5" />
          </div>
          <div>
            <div className="text-sm font-semibold">Twin Evolution Timeline</div>
            <div className="text-[10px] text-muted-foreground">
              {data.totalEvents} interactions · {data.currentMemoryCount} memories
            </div>
          </div>
        </div>
        <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
          {data.currentConfidence}% confidence
        </Badge>
      </div>

      {/* Confidence + Memory growth chart */}
      <div className="h-40 mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="confGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4338ca" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#4338ca" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a855f7" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#a855f7" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
            <XAxis dataKey="time" tick={{ fill: 'var(--muted-foreground)', fontSize: 9 }} interval="preserveStartEnd" />
            <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 9 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                fontSize: 11,
              }}
            />
            <Area
              type="monotone"
              dataKey="confidence"
              stroke="#4338ca"
              strokeWidth={2}
              fill="url(#confGrad)"
              name="Confidence %"
            />
            <Area
              type="monotone"
              dataKey="memories"
              stroke="#a855f7"
              strokeWidth={1.5}
              fill="url(#memGrad)"
              name="Memories"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-3 text-[10px]">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-muted-foreground">Twin Confidence</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-purple-500" />
          <span className="text-muted-foreground">Memory Count</span>
        </div>
      </div>

      {/* Event type distribution */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {Object.entries(data.typeCounts).map(([type, count]) => {
          const Icon = EVENT_ICONS[type] ?? Activity
          const color = EVENT_COLORS[type] ?? '#64748b'
          return (
            <span
              key={type}
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium"
              style={{ backgroundColor: `${color}15`, color }}
            >
              <Icon className="h-2.5 w-2.5" />
              {type.replace('_', ' ')} · {count}
            </span>
          )
        })}
      </div>

      {/* Recent events list */}
      <div className="space-y-1.5 max-h-40 overflow-y-auto scrollbar-thin pr-1">
        {recentEvents.map((evt, i) => {
          const Icon = EVENT_ICONS[evt.eventType] ?? Activity
          const color = EVENT_COLORS[evt.eventType] ?? '#64748b'
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-start gap-2 rounded-md border border-border/40 p-2 text-xs hover:bg-muted/30 transition-colors"
            >
              <div
                className="grid h-5 w-5 shrink-0 place-items-center rounded"
                style={{ backgroundColor: `${color}15`, color }}
              >
                <Icon className="h-3 w-3" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">{evt.title}</div>
                <div className="text-[10px] text-muted-foreground flex items-center gap-2 mt-0.5">
                  <span>{new Date(evt.timestamp).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}</span>
                  <span>·</span>
                  <span className="text-emerald-600 dark:text-emerald-400">{evt.confidence}% conf</span>
                  <span>·</span>
                  <span className="text-purple-500">{evt.memoryCount} mem</span>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}
