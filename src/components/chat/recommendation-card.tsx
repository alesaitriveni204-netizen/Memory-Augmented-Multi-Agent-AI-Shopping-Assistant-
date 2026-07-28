'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import {
  Heart,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp,
  Star,
  Truck,
  Check,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { ProductVisual } from '@/components/common/product-visual'
import { ScoreRing } from '@/components/common/score-ring'
import { ScoreBars } from '@/components/common/score-bars'
import { Sparkline } from '@/components/common/sparkline'
import { BuyWaitAdvice } from '@/components/chat/buy-wait-advice'
import { usePriceHistory } from '@/hooks/use-price-history'
import {
  formatINR,
  platformColor,
  platformLabel,
  scoreColor,
} from '@/lib/ui-utils'
import { toast } from 'sonner'
import { useAppStore } from '@/lib/store'
import type { RecommendationResult } from '@/lib/store'

export function RecommendationCard({
  rec,
  onAskAi,
}: {
  rec: RecommendationResult
  onAskAi?: (q: string) => void
}) {
  const [open, setOpen] = React.useState(false)
  const [adding, setAdding] = React.useState(false)
  const [added, setAdded] = React.useState(false)
  const addToCompare = useAppStore((s) => s.addToCompare)
  const compareItems = useAppStore((s) => s.compareItems)
  const setCompareOpen = useAppStore((s) => s.setCompareOpen)
  const inCompare = compareItems.some((x) => x.productId === rec.productId)

  // Fetch price history when card is expanded
  const priceSeries = usePriceHistory(rec.productId, open)

  async function addToWishlist() {
    setAdding(true)
    try {
      const res = await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: rec.productId }),
      })
      if (!res.ok) throw new Error('Failed')
      setAdded(true)
      toast.success('Added to wishlist', {
        description: `${rec.name} is now in your wishlist`,
      })
    } catch {
      toast.error('Could not add to wishlist')
    } finally {
      setAdding(false)
    }
  }

  const trend = rec.priceAdvice?.trend?.toLowerCase() || ''
  const trendUp = trend.includes('rising') || trend.includes('up')
  const trendDown = trend.includes('falling') || trend.includes('down')

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden asos-card-lift hover:border-emerald-500/40"
    >
      <div className="p-4">
        <div className="flex gap-3">
          <ProductVisual
            name={rec.name}
            brand={rec.brand}
            imageColor={rec.imageColor}
            size={80}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-semibold text-sm leading-tight line-clamp-2">
                  {rec.name}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                    {rec.brand}
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="text-[10px] py-0 px-1.5 capitalize"
                  >
                    {rec.category}
                  </Badge>
                </div>
              </div>
              <ScoreRing
                value={rec.shoppingScore}
                size={56}
                sublabel="/ 100"
              />
            </div>

            <div className="mt-2 flex items-end justify-between gap-2">
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    {formatINR(rec.bestPrice)}
                  </span>
                  {rec.mrp > rec.bestPrice && (
                    <span className="text-xs text-muted-foreground line-through">
                      {formatINR(rec.mrp)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold text-white"
                    style={{ backgroundColor: platformColor(rec.bestPlatform) }}
                  >
                    {platformLabel(rec.bestPlatform)}
                  </span>
                  {rec.discount > 0 && (
                    <Badge
                      variant="secondary"
                      className="text-[10px] py-0 px-1.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    >
                      -{Math.round(rec.discount)}%
                    </Badge>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-0.5 justify-end">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  <span className="text-xs font-semibold">{rec.rating?.toFixed(1)}</span>
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {rec.reviewCount?.toLocaleString()} reviews
                </div>
                <div className="flex items-center gap-1 justify-end mt-0.5 text-[10px] text-muted-foreground">
                  <Truck className="h-3 w-3" />
                  {rec.deliveryDays}d delivery
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Button
            size="sm"
            variant={added ? 'secondary' : 'default'}
            onClick={addToWishlist}
            disabled={adding || added}
            className="h-8 text-xs"
          >
            {added ? (
              <>
                <Check className="h-3.5 w-3.5" /> Saved
              </>
            ) : (
              <>
                <Heart className="h-3.5 w-3.5" /> Add to Wishlist
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant={inCompare ? 'default' : 'outline'}
            className={`h-8 text-xs ${inCompare ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
            onClick={() => {
              if (inCompare) {
                setCompareOpen(true)
              } else {
                addToCompare({
                  productId: rec.productId,
                  name: rec.name,
                  brand: rec.brand,
                  category: rec.category,
                  imageColor: rec.imageColor,
                  bestPlatform: rec.bestPlatform,
                  bestPrice: rec.bestPrice,
                  mrp: rec.mrp,
                  discount: rec.discount,
                  rating: rec.rating,
                  reviewCount: rec.reviewCount,
                  deliveryDays: rec.deliveryDays,
                  shoppingScore: rec.shoppingScore,
                  specs: rec.specs,
                  pros: rec.pros,
                  cons: rec.cons,
                  priceAdvice: (rec as any).priceAdvice,
                })
                toast.success(`Added "${rec.name}" to comparison`)
              }
            }}
          >
            {inCompare ? 'In Compare' : 'Compare'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            asChild
          >
            <a
              href={`https://${rec.bestPlatform}.com`}
              target="_blank"
              rel="noreferrer noopener"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View on {platformLabel(rec.bestPlatform)}
            </a>
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={() => toast.info('Price tracking enabled', {
              description: `We'll notify you when ${rec.name} drops in price`,
            })}
          >
            Track Price
          </Button>
        </div>

        {/* Why this? */}
        <Collapsible open={open} onOpenChange={setOpen} className="mt-3">
          <CollapsibleTrigger asChild>
            <button className="flex w-full items-center justify-between rounded-md bg-muted/40 px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors">
              <span>Why this? · 8-factor breakdown</span>
              {open ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-3 space-y-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                {rec.explanation}
              </p>
              <ScoreBars breakdown={rec.scoreBreakdown} />

              {(rec.pros?.length > 0 || rec.cons?.length > 0) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {rec.pros?.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-[10px] font-semibold uppercase text-emerald-600 dark:text-emerald-400">
                        Pros
                      </div>
                      {rec.pros.map((p, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-1 text-[11px]"
                        >
                          <Check className="mt-0.5 h-3 w-3 text-emerald-500 shrink-0" />
                          <span>{p}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {rec.cons?.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-[10px] font-semibold uppercase text-rose-500">
                        Cons
                      </div>
                      {rec.cons.map((c, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-1 text-[11px]"
                        >
                          <X className="mt-0.5 h-3 w-3 text-rose-500 shrink-0" />
                          <span>{c}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {rec.specs && Object.keys(rec.specs).length > 0 && (
                <>
                  <Separator />
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                    {Object.entries(rec.specs)
                      .slice(0, 8)
                      .map(([k, v]) => (
                        <div
                          key={k}
                          className="flex items-center justify-between gap-2 text-[11px]"
                        >
                          <span className="text-muted-foreground capitalize">
                            {k.replace(/_/g, ' ')}
                          </span>
                          <span className="font-medium text-right truncate">
                            {String(v)}
                          </span>
                        </div>
                      ))}
                  </div>
                </>
              )}

              {rec.priceAdvice && (
                <>
                  <Separator />
                  <div className="rounded-md bg-muted/40 p-2.5">
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] font-semibold uppercase text-muted-foreground">
                        Price Intelligence
                      </div>
                      <div
                        className="flex items-center gap-1 text-[11px] font-semibold"
                        style={{
                          color: trendUp
                            ? '#ef4444'
                            : trendDown
                              ? '#10b981'
                              : '#f59e0b',
                        }}
                      >
                        {trendUp ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : trendDown ? (
                          <TrendingDown className="h-3 w-3" />
                        ) : (
                          <Minus className="h-3 w-3" />
                        )}
                        {rec.priceAdvice.trend}
                      </div>
                    </div>
                    <p className="text-[11px] mt-1 text-muted-foreground leading-relaxed">
                      {rec.priceAdvice.advice}
                    </p>
                    <div className="mt-2 grid grid-cols-3 gap-1.5 text-center">
                      <div className="rounded bg-background/60 py-1">
                        <div className="text-[9px] text-muted-foreground">
                          8-wk Low
                        </div>
                        <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatINR(rec.priceAdvice.lowest)}
                        </div>
                      </div>
                      <div className="rounded bg-background/60 py-1">
                        <div className="text-[9px] text-muted-foreground">
                          Avg
                        </div>
                        <div className="text-[11px] font-semibold">
                          {formatINR(rec.priceAdvice.avgPrice)}
                        </div>
                      </div>
                      <div className="rounded bg-background/60 py-1">
                        <div className="text-[9px] text-muted-foreground">
                          8-wk High
                        </div>
                        <div className="text-[11px] font-semibold text-rose-500">
                          {formatINR(rec.priceAdvice.highest)}
                        </div>
                      </div>
                    </div>
                    {priceSeries.length >= 2 && (
                      <div className="mt-2 flex items-center gap-2 rounded bg-background/60 px-2 py-1.5">
                        <div className="text-[9px] text-muted-foreground shrink-0">8-wk trend</div>
                        <div className="flex-1 text-emerald-500/80">
                          <Sparkline data={priceSeries} width={200} height={24} />
                        </div>
                      </div>
                    )}
                    {/* AI Buy/Wait Advice */}
                    <div className="mt-2">
                      <BuyWaitAdvice
                        product={{
                          name: rec.name,
                          brand: rec.brand,
                          bestPrice: rec.bestPrice,
                          mrp: rec.mrp,
                          discount: rec.discount,
                          rating: rec.rating,
                        }}
                        priceAdvice={rec.priceAdvice as any}
                        priceHistory={priceSeries}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </motion.div>
  )
}

export { scoreColor }
