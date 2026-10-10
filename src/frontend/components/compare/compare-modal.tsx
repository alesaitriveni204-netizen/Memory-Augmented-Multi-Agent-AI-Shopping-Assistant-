'use client'

import * as React from 'react'
import { useAppStore, type CompareItem } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { X, Trophy, TrendingDown, TrendingUp, Minus, Star, ShoppingCart, ExternalLink, Trash2, Check, AlertCircle, Sparkles, Loader2, Crown, History, Clock, GitCompare } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { platformLabel, formatINR, scoreColor } from '@/lib/ui-utils'
import { Sparkline } from '@/components/common/sparkline'
import { useComparisonHistory } from '@/hooks/use-comparison-history'

interface Verdict {
  winner: string
  verdict: string
  reasoning: string[]
  bestFor: string
  runnerUp: string
}

export function CompareModal() {
  const items = useAppStore((s) => s.compareItems)
  const open = useAppStore((s) => s.compareOpen)
  const setOpen = useAppStore((s) => s.setCompareOpen)
  const removeFromCompare = useAppStore((s) => s.removeFromCompare)
  const clearCompare = useAppStore((s) => s.clearCompare)
  const setActiveView = useAppStore((s) => s.setActiveView)
  const { history, saveComparison, deleteComparison } = useComparisonHistory()
  const [showHistory, setShowHistory] = React.useState(false)

  const [verdict, setVerdict] = React.useState<Verdict | null>(null)
  const [verdictLoading, setVerdictLoading] = React.useState(false)
  const [priceHistories, setPriceHistories] = React.useState<Record<string, Array<{ platform: string; series: Array<{ date: string; price: number }> }>>>({})

  // Save comparison to history when verdict is received
  React.useEffect(() => {
    if (verdict && items.length >= 2 && !verdictLoading) {
      saveComparison(items, { winner: verdict.winner, verdict: verdict.verdict })
    }
  }, [verdict, verdictLoading, items, saveComparison])
  // Fetch price histories for sparklines
  React.useEffect(() => {
    if (!open || items.length === 0) {
      setPriceHistories({})
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/compare/prices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productIds: items.map((i) => i.productId) }),
        })
        const data = await res.json()
        if (!cancelled && res.ok && data.histories) {
          setPriceHistories(data.histories)
        }
      } catch {
        /* swallow */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, items])

  // Find the "winner" for each metric
  const lowestPrice = items.length > 0 ? Math.min(...items.map((i) => i.bestPrice)) : 0
  const highestScore = items.length > 0 ? Math.max(...items.map((i) => i.shoppingScore ?? 0)) : 0
  const bestRating = items.length > 0 ? Math.max(...items.map((i) => i.rating)) : 0
  const fastestDelivery = items.length > 0 ? Math.min(...items.map((i) => i.deliveryDays)) : 0
  const biggestDiscount = items.length > 0 ? Math.max(...items.map((i) => i.discount)) : 0

  // Collect all unique spec keys
  const allSpecKeys = React.useMemo(() => {
    const keys = new Set<string>()
    items.forEach((i) => i.specs && Object.keys(i.specs).forEach((k) => keys.add(k)))
    return Array.from(keys)
  }, [items])

  // Fetch AI Verdict when modal opens with 2+ items
  React.useEffect(() => {
    if (!open || items.length < 2) {
      setVerdict(null)
      return
    }
    let cancelled = false
    setVerdictLoading(true)
    setVerdict(null)
    ;(async () => {
      try {
        const res = await fetch('/api/compare/verdict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ products: items }),
        })
        const data = await res.json()
        if (!cancelled && res.ok) {
          setVerdict(data)
        }
      } catch {
        /* swallow */
      } finally {
        if (!cancelled) setVerdictLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, items])

  if (!open) return null

  const colTemplate = `minmax(140px, 180px) repeat(${items.length}, minmax(220px, 1fr))`

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 md:p-6"
        onClick={() => setOpen(false)}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-card border border-border/60 rounded-2xl shadow-2xl w-full max-w-7xl max-h-[92vh] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 md:p-6 border-b border-border/60 bg-gradient-to-r from-emerald-500/5 to-teal-500/5">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md">
                <Trophy className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg md:text-xl font-bold tracking-tight">Product Comparison</h2>
                <p className="text-xs text-muted-foreground">
                  {items.length} product{items.length !== 1 ? 's' : ''} · side-by-side analysis
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {history.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowHistory(!showHistory)}
                  className={showHistory ? 'text-emerald-600 bg-emerald-500/10' : 'text-muted-foreground hover:text-emerald-600'}
                >
                  <History className="h-4 w-4 mr-1" /> History ({history.length})
                </Button>
              )}
              {items.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearCompare} className="text-muted-foreground hover:text-rose-500">
                  <Trash2 className="h-4 w-4 mr-1" /> Clear
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Comparison History Panel */}
          <AnimatePresence>
            {showHistory && history.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="border-b border-border/60 bg-muted/20 overflow-hidden"
              >
                <div className="p-4 max-h-64 overflow-y-auto scrollbar-thin">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Clock className="h-3 w-3" /> Past Comparisons
                  </div>
                  <div className="space-y-2">
                    {history.map((comp) => (
                      <div key={comp.id} className="rounded-lg border border-border/40 bg-card/60 p-2.5 group">
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {comp.verdict && (
                              <Badge className="text-[9px] py-0 px-1 h-4 bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20 shrink-0">
                                <Crown className="h-2 w-2 mr-0.5" /> {comp.verdict.winner.split('(')[0].trim()}
                              </Badge>
                            )}
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              {new Date(comp.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <button
                            onClick={() => deleteComparison(comp.id)}
                            className="text-[10px] text-muted-foreground hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {comp.items.map((item) => (
                            <span
                              key={item.productId}
                              className="inline-flex items-center gap-1 text-[10px] rounded bg-muted/60 px-1.5 py-0.5"
                            >
                              <span
                                className="h-3 w-3 rounded-sm"
                                style={{ background: `linear-gradient(135deg, ${item.imageColor}, ${item.imageColor}cc)` }}
                              />
                              {item.name.length > 20 ? item.name.slice(0, 20) + '…' : item.name}
                            </span>
                          ))}
                        </div>
                        {comp.verdict && (
                          <p className="text-[10px] text-muted-foreground mt-1.5 line-clamp-2 italic">{comp.verdict.verdict}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {items.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-6 md:p-12">
              <div className="text-center space-y-3">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-muted/40">
                  <svg viewBox="0 0 40 40" className="h-12 w-12" aria-hidden="true">
                    <path d="M20 4 A16 16 0 0 1 35.2 15" fill="none" stroke="#FF9900" strokeWidth="3" strokeLinecap="round" />
                    <path d="M35.2 15 A16 16 0 0 1 29.4 33" fill="none" stroke="#2874F0" strokeWidth="3" strokeLinecap="round" />
                    <path d="M29.4 33 A16 16 0 0 1 10.6 33" fill="none" stroke="#95BF47" strokeWidth="3" strokeLinecap="round" />
                    <path d="M10.6 33 A16 16 0 0 1 4.8 15" fill="none" stroke="#E53238" strokeWidth="3" strokeLinecap="round" />
                    <path d="M4.8 15 A16 16 0 0 1 20 4" fill="none" stroke="#FF3F6C" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                </div>
                <h3 className="font-semibold text-lg">Add products to compare</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Compare prices, specs, delivery, and ratings across your shortlist. Add up to four products.
                </p>
                <Button onClick={() => { setOpen(false); setActiveView('discover') }}>
                  <GitCompare className="h-4 w-4" /> Discover products
                </Button>
              </div>
            </div>
          ) : (
            <ScrollArea className="flex-1">
              <div className="p-4 md:p-6">
                {/* AI Verdict Banner */}
                {(verdictLoading || verdict) && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent p-4 md:p-5"
                  >
                    <div className="absolute -top-6 -right-6 h-24 w-24 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
                    <div className="relative flex items-start gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-lg shadow-amber-500/30">
                        {verdictLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Crown className="h-5 w-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        {verdictLoading ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Sparkles className="h-3.5 w-3.5 text-emerald-500 animate-pulse" />
                              <span className="text-sm font-semibold">AI Verdict Agent is analyzing…</span>
                            </div>
                            <div className="h-3 w-3/4 rounded asos-shimmer" />
                            <div className="h-3 w-1/2 rounded asos-shimmer" />
                          </div>
                        ) : verdict ? (
                          <>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">AI Verdict</span>
                              <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px]">
                                <Crown className="h-2.5 w-2.5 mr-0.5" /> Winner: {verdict.winner}
                              </Badge>
                            </div>
                            <p className="mt-1.5 text-sm leading-relaxed">{verdict.verdict}</p>
                            {verdict.reasoning?.length > 0 && (
                              <div className="mt-2.5 flex flex-wrap gap-1.5">
                                {verdict.reasoning.map((r, i) => (
                                  <span key={i} className="inline-flex items-center gap-1 text-[11px] rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 border border-emerald-500/20">
                                    <Check className="h-2.5 w-2.5" /> {r}
                                  </span>
                                ))}
                              </div>
                            )}
                            {verdict.bestFor && (
                              <div className="mt-2 text-[11px] text-muted-foreground">
                                <span className="font-semibold">Best for:</span> {verdict.bestFor}
                                {verdict.runnerUp && <> · <span className="font-semibold">Runner-up:</span> {verdict.runnerUp}</>}
                              </div>
                            )}
                          </>
                        ) : null}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Product header cards row */}
                <div className="grid gap-3 mb-6" style={{ gridTemplateColumns: colTemplate }}>
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-end pb-2">
                    Product
                  </div>
                  {items.map((item) => (
                    <ProductHeaderCard key={item.productId} item={item} onRemove={() => removeFromCompare(item.productId)} isBestScore={item.shoppingScore === highestScore && highestScore > 0} />
                  ))}
                </div>

                {/* Comparison rows */}
                <div className="space-y-0 border border-border/60 rounded-xl overflow-hidden">
                  <CompareRow label="Shopping Score" icon={<Trophy className="h-3.5 w-3.5" />} colTemplate={colTemplate}>
                    {items.map((item) => {
                      const score = item.shoppingScore ?? 0
                      const isBest = score === highestScore && score > 0
                      const colorClass = score >= 85 ? 'text-emerald-500' : score >= 70 ? 'text-amber-500' : 'text-rose-500'
                      return (
                        <CompareCell key={item.productId} isBest={isBest}>
                          <div className="flex items-center gap-2">
                            <span className={`text-2xl font-bold ${colorClass}`}>{score}</span>
                            <span className="text-xs text-muted-foreground">/100</span>
                            {isBest && <Trophy className="h-4 w-4 text-amber-500" />}
                          </div>
                        </CompareCell>
                      )
                    })}
                  </CompareRow>

                  <CompareRow label="Best Price" icon={<span className="text-emerald-500 font-bold">₹</span>} colTemplate={colTemplate}>
                    {items.map((item) => {
                      const isBest = item.bestPrice === lowestPrice && items.length > 1
                      return (
                        <CompareCell key={item.productId} isBest={isBest}>
                          <div className="flex flex-col">
                            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{formatINR(item.bestPrice)}</span>
                            <span className="text-xs text-muted-foreground line-through">{formatINR(item.mrp)}</span>
                            {isBest && <Badge className="mt-1 w-fit bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">Lowest price</Badge>}
                          </div>
                        </CompareCell>
                      )
                    })}
                  </CompareRow>

                  <CompareRow label="Discount" icon={<TrendingDown className="h-3.5 w-3.5" />} colTemplate={colTemplate}>
                    {items.map((item) => {
                      const isBest = item.discount === biggestDiscount && biggestDiscount > 0
                      return (
                        <CompareCell key={item.productId} isBest={isBest}>
                          <span className="text-lg font-bold text-rose-500">-{item.discount}%</span>
                          {isBest && <Badge className="ml-2 bg-rose-500/15 text-rose-500 border-rose-500/20">Best deal</Badge>}
                        </CompareCell>
                      )
                    })}
                  </CompareRow>

                  <CompareRow label="Platform" icon={<ExternalLink className="h-3.5 w-3.5" />} colTemplate={colTemplate}>
                    {items.map((item) => (
                      <CompareCell key={item.productId}>
                        <Badge variant="outline" className="font-medium">{platformLabel(item.bestPlatform as never)}</Badge>
                      </CompareCell>
                    ))}
                  </CompareRow>

                  <CompareRow label="Rating" icon={<Star className="h-3.5 w-3.5" />} colTemplate={colTemplate}>
                    {items.map((item) => {
                      const isBest = item.rating === bestRating && items.length > 1
                      return (
                        <CompareCell key={item.productId} isBest={isBest}>
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                            <span className="font-bold">{item.rating}</span>
                            <span className="text-xs text-muted-foreground">({item.reviewCount.toLocaleString('en-IN')})</span>
                          </div>
                        </CompareCell>
                      )
                    })}
                  </CompareRow>

                  <CompareRow label="Delivery" icon={<ShoppingCart className="h-3.5 w-3.5" />} colTemplate={colTemplate}>
                    {items.map((item) => {
                      const isBest = item.deliveryDays === fastestDelivery && items.length > 1
                      return (
                        <CompareCell key={item.productId} isBest={isBest}>
                          <span className="font-medium">{item.deliveryDays} days</span>
                          {isBest && <Badge className="ml-2 bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/20">Fastest</Badge>}
                        </CompareCell>
                      )
                    })}
                  </CompareRow>

                  <CompareRow label="Price Trend" icon={<TrendingUp className="h-3.5 w-3.5" />} colTemplate={colTemplate}>
                    {items.map((item) => {
                      const trend = item.priceAdvice?.trend ?? 'stable'
                      const hist = priceHistories[item.productId]
                      // Use the best platform's price series for the sparkline
                      const bestSeries = hist?.find((h) => h.platform === item.bestPlatform)?.series
                      const sparkData = bestSeries?.map((p) => p.price) ?? []
                      return (
                        <CompareCell key={item.productId}>
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5">
                              {trend === 'falling' ? (
                                <span className="flex items-center gap-1.5"><TrendingDown className="h-4 w-4 text-emerald-500" /><span className="text-xs text-emerald-500 font-medium">Falling</span></span>
                              ) : trend === 'rising' ? (
                                <span className="flex items-center gap-1.5"><TrendingUp className="h-4 w-4 text-rose-500" /><span className="text-xs text-rose-500 font-medium">Rising</span></span>
                              ) : (
                                <span className="flex items-center gap-1.5"><Minus className="h-4 w-4 text-muted-foreground" /><span className="text-xs text-muted-foreground">Stable</span></span>
                              )}
                              {item.priceAdvice && (
                                <span className="text-[10px] text-muted-foreground ml-auto">
                                  8wk avg ₹{item.priceAdvice.avgPrice.toLocaleString('en-IN')}
                                </span>
                              )}
                            </div>
                            {sparkData.length >= 2 && (
                              <div className="text-emerald-500/80">
                                <Sparkline data={sparkData} width={140} height={28} />
                              </div>
                            )}
                          </div>
                        </CompareCell>
                      )
                    })}
                  </CompareRow>

                  {/* Specs rows */}
                  {allSpecKeys.map((specKey) => (
                    <CompareRow key={specKey} label={specKey.charAt(0).toUpperCase() + specKey.slice(1)} icon={<span className="text-muted-foreground text-xs">⚙</span>} colTemplate={colTemplate}>
                      {items.map((item) => {
                        const val = item.specs?.[specKey]
                        return (
                          <CompareCell key={item.productId}>
                            <span className="text-sm">{val ? String(val) : <span className="text-muted-foreground/50">—</span>}</span>
                          </CompareCell>
                        )
                      })}
                    </CompareRow>
                  ))}

                  {/* Pros row */}
                  <CompareRow label="Pros" icon={<Check className="h-3.5 w-3.5 text-emerald-500" />} colTemplate={colTemplate}>
                    {items.map((item) => (
                      <CompareCell key={item.productId}>
                        <ul className="space-y-1">
                          {(item.pros ?? []).slice(0, 4).map((p, i) => (
                            <li key={i} className="text-xs text-emerald-600 dark:text-emerald-400 flex items-start gap-1">
                              <Check className="h-3 w-3 mt-0.5 shrink-0" /> {p}
                            </li>
                          ))}
                          {(!item.pros || item.pros.length === 0) && <span className="text-xs text-muted-foreground/50">—</span>}
                        </ul>
                      </CompareCell>
                    ))}
                  </CompareRow>

                  {/* Cons row */}
                  <CompareRow label="Cons" icon={<AlertCircle className="h-3.5 w-3.5 text-rose-500" />} colTemplate={colTemplate}>
                    {items.map((item) => (
                      <CompareCell key={item.productId}>
                        <ul className="space-y-1">
                          {(item.cons ?? []).slice(0, 4).map((c, i) => (
                            <li key={i} className="text-xs text-rose-500 flex items-start gap-1">
                              <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" /> {c}
                            </li>
                          ))}
                          {(!item.cons || item.cons.length === 0) && <span className="text-xs text-muted-foreground/50">—</span>}
                        </ul>
                      </CompareCell>
                    ))}
                  </CompareRow>

                  {/* Action row */}
                  <CompareRow label="Buy" icon={<ShoppingCart className="h-3.5 w-3.5" />} colTemplate={colTemplate}>
                    {items.map((item) => (
                      <CompareCell key={item.productId}>
                        <Button asChild size="sm" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                          <a href={`https://${item.bestPlatform}.com`} target="_blank" rel="noreferrer noopener">
                            <ExternalLink className="h-3.5 w-3.5 mr-1" /> View on {platformLabel(item.bestPlatform as never)}
                          </a>
                        </Button>
                      </CompareCell>
                    ))}
                  </CompareRow>
                </div>

                {/* Legend */}
                <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <div className="h-3 w-3 rounded bg-emerald-500/20 border border-emerald-500/40" />
                    Best in category
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Trophy className="h-3.5 w-3.5 text-amber-500" /> Highest score
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

function ProductHeaderCard({ item, onRemove, isBestScore }: { item: CompareItem; onRemove: () => void; isBestScore: boolean }) {
  return (
    <div className="relative rounded-xl border border-border/60 bg-gradient-to-br from-card to-muted/20 p-3 group">
      <button
        onClick={onRemove}
        className="absolute top-2 right-2 h-6 w-6 grid place-items-center rounded-full bg-muted/60 hover:bg-rose-500/20 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
        aria-label="Remove from comparison"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <div
        className="h-20 w-full rounded-lg mb-2 flex items-center justify-center text-2xl font-bold text-white shadow-inner"
        style={{ background: `linear-gradient(135deg, ${item.imageColor}, ${item.imageColor}cc)` }}
      >
        {item.brand.charAt(0)}
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{item.brand}</span>
          {isBestScore && <Trophy className="h-3 w-3 text-amber-500" />}
        </div>
        <h3 className="font-semibold text-sm leading-tight line-clamp-2 min-h-[2.5rem]">{item.name}</h3>
        <Badge variant="secondary" className="text-[10px] capitalize">{item.category}</Badge>
      </div>
    </div>
  )
}

function CompareRow({ label, icon, children, colTemplate }: { label: string; icon: React.ReactNode; children: React.ReactNode; colTemplate: string }) {
  return (
    <div className="grid border-b border-border/40 last:border-b-0 hover:bg-muted/20 transition-colors" style={{ gridTemplateColumns: colTemplate }}>
      <div className="p-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 bg-muted/30 border-r border-border/40 sticky left-0 z-10">
        {icon} {label}
      </div>
      {children}
    </div>
  )
}

function CompareCell({ children, isBest }: { children: React.ReactNode; isBest?: boolean }) {
  return (
    <div className={`p-3 border-r border-border/40 last:border-r-0 ${isBest ? 'bg-emerald-500/5' : ''}`}>
      {children}
    </div>
  )
}
