'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Package, Loader2, Sparkles, TrendingDown, ArrowRight, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatINR, platformLabel } from '@/lib/ui-utils'
import { useAppStore } from '@/lib/store'

interface BundleProduct {
  id: string
  name: string
  brand: string
  category: string
  imageColor: string
  bestPlatform: string
  bestPrice: number
  mrp: number
  discount: number
  rating: number
  reviewCount: number
  deliveryDays: number
}

interface Bundle {
  title: string
  reason: string
  budget: string
  products: BundleProduct[]
  totalPrice: number
  totalMRP: number
  totalSaved: number
}

export function BundleCard({ productId, productName }: { productId: string; productName: string }) {
  const [bundles, setBundles] = React.useState<Bundle[]>([])
  const [loading, setLoading] = React.useState(true)
  const [expanded, setExpanded] = React.useState(true)
  const addToCompare = useAppStore((s) => s.addToCompare)
  const setCompareOpen = useAppStore((s) => s.setCompareOpen)

  React.useEffect(() => {
    let cancelled = false
    setLoading(true)
    ;(async () => {
      try {
        const res = await fetch('/api/bundles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId }),
        })
        const data = await res.json()
        if (!cancelled && res.ok && data.bundles) {
          setBundles(data.bundles)
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
  }, [productId])

  if (loading) {
    return (
      <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-2.5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-500" />
          Curating smart bundles…
        </div>
      </div>
    )
  }

  if (bundles.length === 0) return null

  return (
    <div className="rounded-lg border border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-transparent p-2.5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 text-left mb-2"
      >
        <div className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-purple-500/15 text-purple-500">
          <Package className="h-3.5 w-3.5" />
        </div>
        <div className="flex-1">
          <div className="text-xs font-semibold flex items-center gap-1.5">
            Complete Your Setup
            <Badge variant="outline" className="text-[9px] py-0 px-1 h-3.5 border-purple-500/30 text-purple-600 dark:text-purple-400">
              <Sparkles className="h-2 w-2 mr-0.5" /> AI bundles
            </Badge>
          </div>
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            {bundles.map((bundle, bi) => (
              <motion.div
                key={bi}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: bi * 0.1 }}
                className="rounded-md border border-border/40 bg-card/60 p-2"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold truncate">{bundle.title}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{bundle.reason}</div>
                  </div>
                  <Badge className="text-[9px] py-0 px-1 h-3.5 bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/20 capitalize shrink-0 ml-2">
                    {bundle.budget}
                  </Badge>
                </div>

                {/* Products in bundle */}
                <div className="space-y-1.5 mb-2">
                  {bundle.products.map((p, pi) => (
                    <div key={p.id} className="flex items-center gap-2">
                      {pi > 0 && <Plus className="h-2.5 w-2.5 text-muted-foreground shrink-0" />}
                      <div
                        className="h-7 w-7 shrink-0 rounded-md flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
                        style={{ background: `linear-gradient(135deg, ${p.imageColor}, ${p.imageColor}cc)` }}
                      >
                        {p.brand.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-medium truncate">{p.name}</div>
                        <div className="text-[9px] text-muted-foreground">
                          {p.brand} · {formatINR(p.bestPrice)}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          addToCompare({
                            productId: p.id,
                            name: p.name,
                            brand: p.brand,
                            category: p.category,
                            imageColor: p.imageColor,
                            bestPlatform: p.bestPlatform,
                            bestPrice: p.bestPrice,
                            mrp: p.mrp,
                            discount: p.discount,
                            rating: p.rating,
                            reviewCount: p.reviewCount,
                            deliveryDays: p.deliveryDays,
                          })
                        }}
                        className="text-[9px] text-purple-600 dark:text-purple-400 hover:underline shrink-0"
                      >
                        + Compare
                      </button>
                    </div>
                  ))}
                </div>

                {/* Bundle total */}
                <div className="flex items-center justify-between rounded bg-background/60 px-2 py-1.5">
                  <div>
                    <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Bundle total</div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatINR(bundle.totalPrice)}</span>
                      <span className="text-[10px] text-muted-foreground line-through">{formatINR(bundle.totalMRP)}</span>
                    </div>
                  </div>
                  {bundle.totalSaved > 0 && (
                    <div className="text-right">
                      <div className="flex items-center gap-0.5 text-[10px] font-semibold text-rose-500">
                        <TrendingDown className="h-2.5 w-2.5" />
                        Save {formatINR(bundle.totalSaved)}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-5 text-[9px] px-1.5 text-purple-600 hover:text-purple-700 -mr-1"
                        onClick={() => setCompareOpen(true)}
                      >
                        Compare all <ArrowRight className="h-2.5 w-2.5 ml-0.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
