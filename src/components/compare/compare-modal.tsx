'use client'

import * as React from 'react'
import { useAppStore, type CompareItem } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { X, Trophy, TrendingDown, TrendingUp, Minus, Star, ShoppingCart, ExternalLink, Trash2, Check, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { platformLabel, formatINR, scoreColor } from '@/lib/ui-utils'

export function CompareModal() {
  const items = useAppStore((s) => s.compareItems)
  const open = useAppStore((s) => s.compareOpen)
  const setOpen = useAppStore((s) => s.setCompareOpen)
  const removeFromCompare = useAppStore((s) => s.removeFromCompare)
  const clearCompare = useAppStore((s) => s.clearCompare)

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

          {items.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-12">
              <div className="text-center space-y-3">
                <div className="grid h-16 w-16 mx-auto place-items-center rounded-2xl bg-muted/40 text-muted-foreground">
                  <Trophy className="h-8 w-8" />
                </div>
                <h3 className="font-semibold text-lg">No products to compare yet</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Click the <span className="font-medium text-emerald-500">Compare</span> button on any product recommendation to add it here. You can compare up to 4 products side-by-side.
                </p>
              </div>
            </div>
          ) : (
            <ScrollArea className="flex-1">
              <div className="p-4 md:p-6">
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
                      return (
                        <CompareCell key={item.productId}>
                          <div className="flex items-center gap-1.5">
                            {trend === 'falling' ? (
                              <><TrendingDown className="h-4 w-4 text-emerald-500" /><span className="text-xs text-emerald-500 font-medium">Falling</span></>
                            ) : trend === 'rising' ? (
                              <><TrendingUp className="h-4 w-4 text-rose-500" /><span className="text-xs text-rose-500 font-medium">Rising</span></>
                            ) : (
                              <><Minus className="h-4 w-4 text-muted-foreground" /><span className="text-xs text-muted-foreground">Stable</span></>
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
