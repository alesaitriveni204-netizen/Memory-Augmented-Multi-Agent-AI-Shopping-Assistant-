'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus, Loader2, Lightbulb, Clock, Target } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface BuyWaitAdviceProps {
  product: {
    name: string
    brand: string
    bestPrice: number
    mrp: number
    discount: number
    rating: number
  }
  priceAdvice?: {
    trend: string
    advice: string
    avgPrice: number
    lowest: number
    highest: number
  }
  priceHistory?: number[]
}

interface Prediction {
  recommendation: string
  confidence: number
  reasoning: string
  predictedDiscount: string
  bestTimeToBuy: string
  tip: string
}

export function BuyWaitAdvice({ product, priceAdvice, priceHistory }: BuyWaitAdviceProps) {
  const [prediction, setPrediction] = React.useState<Prediction | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    let cancelled = false
    setLoading(true)
    ;(async () => {
      try {
        const res = await fetch('/api/price-prediction', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product,
            priceHistory: priceHistory?.map((p, i) => ({ date: `w${i}`, price: p })) ?? [],
            trend: priceAdvice?.trend ?? 'stable',
            avgPrice: priceAdvice?.avgPrice ?? product.bestPrice,
            lowest: priceAdvice?.lowest ?? product.bestPrice,
            highest: priceAdvice?.highest ?? product.bestPrice,
          }),
        })
        const data = await res.json()
        if (!cancelled && res.ok) {
          setPrediction(data)
        }
      } catch {
        /* swallow */
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [product.name, product.bestPrice])

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-500" />
        Analyzing price trends…
      </div>
    )
  }

  if (!prediction) return null

  const rec = prediction.recommendation
  const isBuy = rec === 'buy'
  const isWait = rec === 'wait'
  const isNeutral = rec === 'neutral'

  const config = isBuy
    ? { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', icon: TrendingDown, iconColor: 'text-emerald-500', label: 'BUY NOW', labelColor: 'text-emerald-600 dark:text-emerald-400' }
    : isWait
      ? { bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: Clock, iconColor: 'text-amber-500', label: 'WAIT', labelColor: 'text-amber-600 dark:text-amber-400' }
      : { bg: 'bg-sky-500/10', border: 'border-sky-500/30', icon: Minus, iconColor: 'text-sky-500', label: 'NEUTRAL', labelColor: 'text-sky-600 dark:text-sky-400' }

  const Icon = config.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-lg border ${config.border} ${config.bg} p-3`}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <div className={`grid h-7 w-7 place-items-center rounded-md ${config.bg} ${config.iconColor}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold tracking-wider ${config.labelColor}`}>{config.label}</span>
            <Badge variant="outline" className="text-[9px] py-0 px-1 h-3.5">
              {prediction.confidence}% confidence
            </Badge>
          </div>
          <div className="text-[10px] text-muted-foreground">Should I buy now or wait?</div>
        </div>
      </div>
      <p className="text-[11px] leading-relaxed text-foreground/90">{prediction.reasoning}</p>
      <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
        <div className="flex items-center gap-1.5 rounded bg-background/60 px-2 py-1">
          <Target className="h-3 w-3 text-emerald-500 shrink-0" />
          <span className="text-muted-foreground">Best time:</span>
          <span className="font-medium truncate">{prediction.bestTimeToBuy}</span>
        </div>
        <div className="flex items-center gap-1.5 rounded bg-background/60 px-2 py-1">
          <TrendingUp className="h-3 w-3 text-amber-500 shrink-0" />
          <span className="text-muted-foreground">Predicted:</span>
          <span className="font-medium">{prediction.predictedDiscount} off</span>
        </div>
      </div>
      <div className="mt-1.5 flex items-start gap-1.5 text-[10px] text-muted-foreground">
        <Lightbulb className="h-3 w-3 text-amber-500 shrink-0 mt-0.5" />
        <span className="italic">{prediction.tip}</span>
      </div>
    </motion.div>
  )
}
