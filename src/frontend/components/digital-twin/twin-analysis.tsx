'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Brain, Sparkles, TrendingUp, Target, Lightbulb, Zap, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface Analysis {
  personalityType: string
  summary: string
  strengths: string[]
  growthAreas: string[]
  shoppingStyle: string
  topRecommendation: string
  funFact: string
}

export function TwinAnalysis() {
  const { data, isLoading } = useQuery<Analysis>({
    queryKey: ['twin-analysis'],
    queryFn: async () => {
      const res = await fetch('/api/digital-twin/analysis')
      return res.json()
    },
    staleTime: 5 * 60 * 1000,
  })

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border/60 bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 text-white">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          </div>
          <div>
            <div className="text-sm font-semibold">AI Personality Analysis</div>
            <div className="text-[10px] text-muted-foreground">Analyzing your twin…</div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-3 w-3/4 rounded asos-shimmer" />
          <div className="h-3 w-1/2 rounded asos-shimmer" />
          <div className="h-3 w-2/3 rounded asos-shimmer" />
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-purple-500/20 bg-gradient-to-br from-purple-500/5 via-pink-500/5 to-transparent p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 text-white shadow-md">
          <Brain className="h-3.5 w-3.5" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold flex items-center gap-1.5">
            AI Personality Analysis
            <Badge variant="outline" className="text-[9px] py-0 px-1 border-purple-500/30 text-purple-600 dark:text-purple-400">
              <Sparkles className="h-2 w-2 mr-0.5" /> AI
            </Badge>
          </div>
          <div className="text-[10px] text-muted-foreground">Generated from your Digital Twin</div>
        </div>
      </div>

      {/* Personality type */}
      <div className="mb-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400 mb-1">
          Your Type
        </div>
        <div className="text-lg font-bold asos-gradient-text">{data.personalityType}</div>
      </div>

      {/* Summary */}
      <p className="text-xs leading-relaxed text-foreground/90 mb-3">{data.summary}</p>

      {/* Strengths + Growth areas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        {data.strengths?.length > 0 && (
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1.5 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> Strengths
            </div>
            <div className="space-y-1">
              {data.strengths.map((s, i) => (
                <div key={i} className="text-[11px] flex items-start gap-1.5">
                  <span className="text-emerald-500 shrink-0">✓</span>
                  <span>{s}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {data.growthAreas?.length > 0 && (
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1.5 flex items-center gap-1">
              <Target className="h-3 w-3" /> Growth Areas
            </div>
            <div className="space-y-1">
              {data.growthAreas.map((g, i) => (
                <div key={i} className="text-[11px] flex items-start gap-1.5">
                  <span className="text-amber-500 shrink-0">→</span>
                  <span>{g}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Shopping style */}
      <div className="rounded-lg bg-background/60 p-2.5 mb-2">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
          <Zap className="h-3 w-3" /> Shopping Style
        </div>
        <p className="text-xs">{data.shoppingStyle}</p>
      </div>

      {/* Top recommendation */}
      <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-2.5 mb-2">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1 flex items-center gap-1">
          <Lightbulb className="h-3 w-3" /> Explore Next
        </div>
        <p className="text-xs">{data.topRecommendation}</p>
      </div>

      {/* Fun fact */}
      <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground italic">
        <span className="text-amber-500">💡</span>
        <span>{data.funFact}</span>
      </div>
    </motion.div>
  )
}
