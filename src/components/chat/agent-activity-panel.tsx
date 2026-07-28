'use client'

import { Check, X, Cpu, Clock, Database, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { AhdePlan } from '@/lib/store'

const ALL_AGENTS = [
  'intent',
  'search',
  'memory',
  'digital_twin',
  'recommendation',
  'review',
  'price',
  'budget',
  'explainability',
  'cart',
  'notification',
] as const

function tierColor(tier?: string) {
  if (tier === 'fast') return '#10b981'
  if (tier === 'deep') return '#a855f7'
  return '#f59e0b'
}

export function AgentActivityPanel({
  intent,
  complexity,
  ahde,
  agentsUsed,
  latencyMs,
}: {
  intent?: string | { intent?: string }
  complexity?: string
  ahde?: AhdePlan
  agentsUsed?: string[]
  latencyMs?: number
}) {
  if (!ahde) {
    return (
      <div className="rounded-xl border border-border/60 bg-card/50 p-4 text-xs text-muted-foreground text-center">
        No agent activity yet. Send a message to see the live AHDE plan.
      </div>
    )
  }

  const required = ahde.requiredAgents || agentsUsed || []
  const skipped = ahde.skippedAgents || []
  const intentStr =
    typeof intent === 'string' ? intent : intent?.intent || '—'

  return (
    <div className="rounded-xl border border-border/60 bg-card/60 overflow-hidden">
      <div className="border-b border-border/60 bg-muted/30 px-3 py-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          <Zap className="h-3.5 w-3.5 text-emerald-500" />
          Agent Activity
        </div>
      </div>

      <div className="p-3 space-y-3 text-xs">
        {/* Intent */}
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Intent</span>
          <div className="flex items-center gap-1.5">
            <Badge variant="secondary" className="text-[10px]">
              {intentStr}
            </Badge>
            {complexity && (
              <Badge
                variant="outline"
                className="text-[10px] capitalize"
                style={{
                  color:
                    complexity === 'complex'
                      ? '#a855f7'
                      : complexity === 'moderate'
                        ? '#f59e0b'
                        : '#10b981',
                }}
              >
                {complexity}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-muted-foreground flex items-center gap-1">
            <Cpu className="h-3 w-3" /> Model tier
          </span>
          <span
            className="text-[11px] font-semibold capitalize"
            style={{ color: tierColor(ahde.modelTier) }}
          >
            {ahde.modelTier}
          </span>
        </div>

        {/* AHDE reason */}
        <div className="rounded-md bg-muted/40 p-2 text-[11px] leading-relaxed text-muted-foreground">
          <div className="font-semibold text-foreground mb-0.5">
            AHDE Decision
          </div>
          {ahde.reason}
        </div>

        {/* Agents grid */}
        <div>
          <div className="text-[10px] font-semibold uppercase text-muted-foreground mb-1.5">
            Agents ({required.length} required · {skipped.length} skipped)
          </div>
          <div className="grid grid-cols-2 gap-1">
            {ALL_AGENTS.map((a) => {
              const isReq = required.includes(a)
              const isSkip = skipped.includes(a)
              return (
                <div
                  key={a}
                  className={`flex items-center gap-1.5 rounded px-1.5 py-1 text-[10px] ${
                    isReq
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                      : 'bg-muted/40 text-muted-foreground'
                  }`}
                >
                  {isReq ? (
                    <Check className="h-3 w-3 text-emerald-500 shrink-0" />
                  ) : (
                    <X className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                  )}
                  <span className="truncate">
                    {a.replace(/_/g, ' ')}
                  </span>
                  {isSkip && (
                    <span className="ml-auto text-[9px] opacity-60">skip</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Data sources */}
        <div>
          <div className="text-[10px] font-semibold uppercase text-muted-foreground mb-1.5 flex items-center gap-1">
            <Database className="h-3 w-3" /> Data Sources
          </div>
          <div className="space-y-1">
            <div className="flex items-start gap-1.5">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
              <div className="text-[10px]">
                <span className="text-muted-foreground">Cached:</span>{' '}
                <span className="font-medium">
                  {ahde.dataSources?.cached?.length
                    ? ahde.dataSources.cached.join(', ')
                    : '—'}
                </span>
              </div>
            </div>
            <div className="flex items-start gap-1.5">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
              <div className="text-[10px]">
                <span className="text-muted-foreground">Live:</span>{' '}
                <span className="font-medium">
                  {ahde.dataSources?.live?.length
                    ? ahde.dataSources.live.join(', ')
                    : '—'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Latency */}
        <div className="flex items-center justify-between border-t border-border/60 pt-2">
          <span className="text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" /> Latency
          </span>
          <span className="text-[11px] font-semibold">
            {latencyMs ? `${(latencyMs / 1000).toFixed(2)}s` : '—'}
          </span>
        </div>
      </div>
    </div>
  )
}
