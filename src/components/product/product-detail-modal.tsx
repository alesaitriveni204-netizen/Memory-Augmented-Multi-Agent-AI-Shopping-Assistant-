'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Star, Check, AlertCircle, ShoppingCart,
  ExternalLink, Heart, GitCompare, Truck, Shield, Package, Loader2, BarChart3,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useAppStore } from '@/lib/store'
import { formatINR, platformLabel, platformColor } from '@/lib/ui-utils'
import { Sparkline } from '@/components/common/sparkline'
import { toast } from 'sonner'

interface ProductDetail {
  id: string
  name: string
  brand: string
  category: string
  subcategory?: string | null
  specs: string
  basePrice: number
  rating: number
  reviewCount: number
  imageColor: string
  pros: string[]
  cons: string[]
  sentimentScore: number
  tags: string[]
  platformPrices: Array<{
    id: string
    platform: string
    price: number
    mrp: number
    discount: number
    deliveryDays: number
    inStock: boolean
    seller: string
    warranty?: string | null
  }>
  priceHistory: Array<{
    platform: string
    price: number
    recordedAt: string
  }>
}

export function ProductDetailModal() {
  const productId = useAppStore((s) => s.productDetailId)
  const open = useAppStore((s) => s.productDetailOpen)
  const close = useAppStore((s) => s.closeProductDetail)
  const addToCompare = useAppStore((s) => s.addToCompare)

  const [product, setProduct] = React.useState<ProductDetail | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [addingWishlist, setAddingWishlist] = React.useState(false)
  const [added, setAdded] = React.useState(false)

  React.useEffect(() => {
    if (!open || !productId) return
    let cancelled = false
    setLoading(true)
    setProduct(null)
    setAdded(false)
    ;(async () => {
      try {
        const res = await fetch(`/api/products/${productId}`)
        const data = await res.json()
        if (!cancelled && res.ok && data.product) {
          setProduct(data.product)
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
  }, [open, productId])

  if (!open) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 md:p-6"
        onClick={close}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-card border border-border/60 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 md:p-5 border-b border-border/60 bg-gradient-to-r from-emerald-500/5 to-teal-500/5">
            <div className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md">
                <Package className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold">Product Details</h2>
                <p className="text-[10px] text-muted-foreground">Full specs, prices & reviews</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={close} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center p-12">
              <div className="text-center space-y-3">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-500 mx-auto" />
                <p className="text-sm text-muted-foreground">Loading product details…</p>
              </div>
            </div>
          ) : !product ? (
            <div className="flex-1 flex items-center justify-center p-12">
              <p className="text-sm text-muted-foreground">Product not found</p>
            </div>
          ) : (
            <ScrollArea className="flex-1">
              <div className="p-4 md:p-5 space-y-5">
                {/* Product header */}
                <div className="flex gap-4">
                  <div
                    className="h-24 w-24 shrink-0 rounded-2xl flex items-center justify-center text-3xl font-bold text-white shadow-lg relative overflow-hidden"
                    style={{ background: `linear-gradient(135deg, ${product.imageColor}, ${product.imageColor}cc 60%, ${product.imageColor}99)` }}
                  >
                    <span className="absolute -top-1/2 -left-1/2 h-full w-full opacity-30" style={{ background: 'linear-gradient(45deg, transparent 40%, rgba(255,255,255,0.4) 50%, transparent 60%)' }} />
                    <span className="relative z-10 drop-shadow-sm">{product.brand.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-[10px]">{product.brand}</Badge>
                      <Badge variant="secondary" className="text-[10px] capitalize">{product.category}</Badge>
                      {product.subcategory && (
                        <Badge variant="secondary" className="text-[10px] capitalize">{product.subcategory}</Badge>
                      )}
                    </div>
                    <h1 className="text-lg font-bold leading-tight">{product.name}</h1>
                    <div className="flex items-center gap-3 mt-2 text-xs">
                      <div className="flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        <span className="font-bold">{product.rating}</span>
                        <span className="text-muted-foreground">({product.reviewCount.toLocaleString('en-IN')} reviews)</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <BarChart3 className="h-3 w-3" />
                        Sentiment: {Math.round(product.sentimentScore * 100)}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* Best price + actions */}
                {product.platformPrices.length > 0 && (() => {
                  const inStock = product.platformPrices.filter((p) => p.inStock)
                  const candidates = inStock.length > 0 ? inStock : product.platformPrices
                  const best = candidates.reduce((min, p) => (p.price < min.price ? p : min), candidates[0])
                  return (
                    <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-transparent p-4">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div>
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Best Price</div>
                          <div className="flex items-baseline gap-2 mt-0.5">
                            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatINR(best.price)}</span>
                            <span className="text-sm text-muted-foreground line-through">{formatINR(best.mrp)}</span>
                            <Badge className="bg-rose-500/15 text-rose-500 border-rose-500/20 text-[10px]">-{best.discount}%</Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-1.5 text-[11px] text-muted-foreground">
                            <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-white font-medium" style={{ backgroundColor: platformColor(best.platform) }}>
                              {platformLabel(best.platform)}
                            </span>
                            <Truck className="h-3 w-3" /> {best.deliveryDays} days delivery
                            {best.warranty && <><Shield className="h-3 w-3" /> {best.warranty}</>}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              setAddingWishlist(true)
                              try {
                                const res = await fetch('/api/wishlist', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ productId: product.id }),
                                })
                                if (res.ok) {
                                  setAdded(true)
                                  toast.success('Added to wishlist')
                                }
                              } catch {
                                toast.error('Failed to add')
                              } finally {
                                setAddingWishlist(false)
                              }
                            }}
                            disabled={addingWishlist || added}
                            className="h-8"
                          >
                            {addingWishlist ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : added ? <Check className="h-3.5 w-3.5" /> : <Heart className="h-3.5 w-3.5" />}
                            {added ? 'Saved' : 'Wishlist'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              addToCompare({
                                productId: product.id,
                                name: product.name,
                                brand: product.brand,
                                category: product.category,
                                imageColor: product.imageColor,
                                bestPlatform: best.platform,
                                bestPrice: best.price,
                                mrp: best.mrp,
                                discount: best.discount,
                                rating: product.rating,
                                reviewCount: product.reviewCount,
                                deliveryDays: best.deliveryDays,
                              })
                              toast.success('Added to comparison')
                            }}
                            className="h-8"
                          >
                            <GitCompare className="h-3.5 w-3.5" /> Compare
                          </Button>
                          <Button asChild size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700">
                            <a href={`https://${best.platform}.com`} target="_blank" rel="noreferrer noopener">
                              <ExternalLink className="h-3.5 w-3.5" /> Buy
                            </a>
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })()}

                {/* All platform prices */}
                <div>
                  <div className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                    <ShoppingCart className="h-3.5 w-3.5 text-emerald-500" /> Prices Across Platforms
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {product.platformPrices.map((pp) => (
                      <div
                        key={pp.id}
                        className={`rounded-lg border p-2.5 ${pp.inStock ? 'border-border/60 bg-card' : 'border-border/30 bg-muted/20 opacity-60'}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-white" style={{ backgroundColor: platformColor(pp.platform) }}>
                            {platformLabel(pp.platform)}
                          </span>
                          {!pp.inStock && <Badge variant="outline" className="text-[9px] py-0 px-1 text-rose-500">Out of stock</Badge>}
                        </div>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-sm font-bold">{formatINR(pp.price)}</span>
                          <span className="text-[10px] text-muted-foreground line-through">{formatINR(pp.mrp)}</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {pp.deliveryDays}d delivery · {pp.seller}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Price history chart */}
                {product.priceHistory.length > 0 && (() => {
                  const byPlatform: Record<string, Array<{ date: string; price: number }>> = {}
                  for (const h of product.priceHistory) {
                    if (!byPlatform[h.platform]) byPlatform[h.platform] = []
                    byPlatform[h.platform].push({ date: new Date(h.recordedAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }), price: h.price })
                  }
                  const cheapestPlatform = Object.entries(byPlatform).sort(([, a], [, b]) => a[a.length - 1].price - b[b.length - 1].price)[0]?.[0]
                  const chartData = byPlatform[cheapestPlatform] ?? []
                  const sparkData = chartData.map((d) => d.price)
                  return (
                    <div>
                      <div className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                        <BarChart3 className="h-3.5 w-3.5 text-purple-500" /> Price History (8 weeks)
                      </div>
                      <div className="rounded-lg border border-border/60 bg-card p-3">
                        <div className="h-32">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                              <XAxis dataKey="date" tick={{ fill: 'var(--muted-foreground)', fontSize: 9 }} interval="preserveStartEnd" />
                              <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 9 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                              <Tooltip
                                contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }}
                                formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, 'Price']}
                              />
                              <Line type="monotone" dataKey="price" stroke="#a855f7" strokeWidth={2} dot={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
                          <span>Cheapest on {platformLabel(cheapestPlatform as never)}</span>
                          <span>·</span>
                          <span className="text-emerald-500">
                            <Sparkline data={sparkData} width={60} height={16} showArea={false} strokeWidth={1.5} />
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })()}

                {/* Specs */}
                {(() => {
                  let specs: Record<string, string | number> = {}
                  try { specs = JSON.parse(product.specs) } catch {}
                  const entries = Object.entries(specs)
                  if (entries.length === 0) return null
                  return (
                    <div>
                      <div className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                        <Package className="h-3.5 w-3.5 text-cyan-500" /> Specifications
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {entries.map(([k, v]) => (
                          <div key={k} className="rounded-lg border border-border/40 bg-card/60 p-2">
                            <div className="text-[9px] text-muted-foreground uppercase tracking-wider">{k}</div>
                            <div className="text-xs font-medium mt-0.5 truncate">{String(v)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()}

                {/* Pros & Cons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {product.pros.length > 0 && (
                    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                      <div className="text-xs font-semibold mb-2 flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                        <Check className="h-3.5 w-3.5" /> Pros
                      </div>
                      <ul className="space-y-1">
                        {product.pros.map((p, i) => (
                          <li key={i} className="text-[11px] flex items-start gap-1.5 text-foreground/90">
                            <Check className="h-2.5 w-2.5 mt-0.5 shrink-0 text-emerald-500" /> {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {product.cons.length > 0 && (
                    <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-3">
                      <div className="text-xs font-semibold mb-2 flex items-center gap-1.5 text-rose-500">
                        <AlertCircle className="h-3.5 w-3.5" /> Cons
                      </div>
                      <ul className="space-y-1">
                        {product.cons.map((c, i) => (
                          <li key={i} className="text-[11px] flex items-start gap-1.5 text-foreground/90">
                            <AlertCircle className="h-2.5 w-2.5 mt-0.5 shrink-0 text-rose-500" /> {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Tags */}
                {product.tags.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold mb-2">Tags</div>
                    <div className="flex flex-wrap gap-1.5">
                      {product.tags.map((t, i) => (
                        <Badge key={i} variant="outline" className="text-[10px] capitalize">{t}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
