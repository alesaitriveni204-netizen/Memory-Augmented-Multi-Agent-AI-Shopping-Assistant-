'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Heart,
  Trash2,
  Target,
  Bell,
  TrendingDown,
  ExternalLink,
  Compass,
  CheckSquare,
  GitCompare,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ProductVisual } from '@/components/common/product-visual'
import { EmptyState, LoadingState } from '@/components/common/empty-state'
import {
  formatINR,
  platformColor,
  platformLabel,
  parseJsonArray,
} from '@/lib/ui-utils'
import { useAppStore } from '@/lib/store'
import { toast } from 'sonner'

interface ApiWishlistItem {
  id: string
  productId: string
  targetPrice: number | null
  notes: string | null
  createdAt: string
  product: {
    id: string
    name: string
    brand: string
    category: string
    imageColor: string
    basePrice: number
    rating: number
    reviewCount: number
    pros?: string[] | string
    cons?: string[] | string
    specs?: unknown
    platformPrices?: Array<{
      platform: string
      price: number
      inStock: boolean
      deliveryDays: number
    }>
  }
}

// Helper: get best price for a wishlist item
function getWishlistBestPrice(item: ApiWishlistItem): number {
  const prices = item.product.platformPrices
  if (!prices || prices.length === 0) return item.product.basePrice
  const inStock = prices.filter((p) => p.inStock)
  const candidates = inStock.length > 0 ? inStock : prices
  return Math.min(...candidates.map((p) => p.price))
}

export function WishlistView() {
  const qc = useQueryClient()
  const [selectMode, setSelectMode] = React.useState(false)
  const [selectedIds, setSelectedIds] = React.useState<string[]>([])
  const addToCompare = useAppStore((s) => s.addToCompare)
  const setCompareOpen = useAppStore((s) => s.setCompareOpen)
  const { data, isLoading } = useQuery<{ items: ApiWishlistItem[] }>({
    queryKey: ['wishlist'],
    queryFn: async () => {
      const res = await fetch('/api/wishlist')
      return res.json()
    },
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/wishlist/${id}`, { method: 'DELETE' })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wishlist'] })
      toast.success('Removed from wishlist')
    },
    onError: () => toast.error('Could not remove'),
  })

  const update = useMutation({
    mutationFn: async ({
      id,
      targetPrice,
    }: {
      id: string
      targetPrice: number | null
    }) => {
      await fetch(`/api/wishlist/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetPrice }),
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wishlist'] })
      toast.success('Price target updated')
    },
    onError: () => toast.error('Could not update'),
  })

  const items = data?.items || []

  // Sort state
  const [sortBy, setSortBy] = React.useState<'date' | 'price-low' | 'price-high' | 'target-diff' | 'name'>('date')

  // Apply sorting
  const sortedItems = React.useMemo(() => {
    const sorted = [...items]
    switch (sortBy) {
      case 'price-low':
        sorted.sort((a, b) => getWishlistBestPrice(a) - getWishlistBestPrice(b))
        break
      case 'price-high':
        sorted.sort((a, b) => getWishlistBestPrice(b) - getWishlistBestPrice(a))
        break
      case 'target-diff':
        // Sort by how close current price is to target (closest first)
        sorted.sort((a, b) => {
          const aDiff = a.targetPrice ? Math.abs(getWishlistBestPrice(a) - a.targetPrice) : Infinity
          const bDiff = b.targetPrice ? Math.abs(getWishlistBestPrice(b) - b.targetPrice) : Infinity
          return aDiff - bDiff
        })
        break
      case 'name':
        sorted.sort((a, b) => a.product.name.localeCompare(b.product.name))
        break
      case 'date':
      default:
        sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        break
    }
    return sorted
  }, [items, sortBy])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Heart className="h-5 w-5 text-rose-500 fill-rose-500" /> Your Wishlist
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Track products and get notified when prices drop to your target.
          </p>
        </div>
        {items.length > 0 && (
          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="rounded-lg border border-border/60 bg-card/60 px-2 py-1 text-xs outline-none cursor-pointer hover:border-emerald-500/40 transition-colors focus:border-emerald-500/50"
            >
              <option value="date">Recently Added</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="target-diff">Closest to Target</option>
              <option value="name">Name (A-Z)</option>
            </select>
            <button
              onClick={() => { setSelectMode(!selectMode); setSelectedIds([]) }}
              className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs transition-colors ${selectMode ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'border-border/60 text-muted-foreground hover:bg-muted'}`}
            >
              <CheckSquare className="h-3 w-3" /> {selectMode ? 'Cancel' : 'Select'}
            </button>
          </div>
        )}
      </div>

      {/* Bulk action bar */}
      {selectMode && items.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-2.5"
        >
          <span className="text-xs font-medium">
            {selectedIds.length} selected
          </span>
          <button
            onClick={() => setSelectedIds(sortedItems.map((i) => i.id))}
            className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            Select all
          </button>
          <button
            onClick={() => setSelectedIds([])}
            className="text-[11px] text-muted-foreground hover:underline"
          >
            Clear
          </button>
          <div className="ml-auto flex gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              disabled={selectedIds.length < 2}
              onClick={() => {
                selectedIds.forEach((id) => {
                  const item = sortedItems.find((i) => i.id === id)
                  if (item) {
                    addToCompare({
                      productId: item.productId,
                      name: item.product.name,
                      brand: item.product.brand,
                      category: item.product.category,
                      imageColor: item.product.imageColor,
                      bestPlatform: item.product.platformPrices?.[0]?.platform ?? 'amazon',
                      bestPrice: getWishlistBestPrice(item),
                      mrp: item.product.platformPrices?.[0]?.mrp ?? item.product.basePrice,
                      discount: item.product.platformPrices?.[0]?.discount ?? 0,
                      rating: item.product.rating,
                      reviewCount: item.product.reviewCount,
                      deliveryDays: item.product.platformPrices?.[0]?.deliveryDays ?? 3,
                    })
                  }
                })
                setSelectMode(false)
                setSelectedIds([])
                setCompareOpen(true)
              }}
            >
              <GitCompare className="h-3 w-3 mr-1" /> Compare ({selectedIds.length})
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs text-rose-500 hover:bg-rose-500/10"
              disabled={selectedIds.length === 0}
              onClick={async () => {
                await Promise.all(selectedIds.map((id) => fetch(`/api/wishlist/${id}`, { method: 'DELETE' })))
                qc.invalidateQueries({ queryKey: ['wishlist'] })
                toast.success(`Deleted ${selectedIds.length} items`)
                setSelectMode(false)
                setSelectedIds([])
              }}
            >
              <Trash2 className="h-3 w-3 mr-1" /> Delete
            </Button>
          </div>
        </motion.div>
      )}

      {isLoading ? (
        <LoadingState label="Loading wishlist…" />
      ) : items.length === 0 ? (
        <EmptyState
          emoji="🛍️"
          title="Your wishlist is empty"
          description="Save products from chat or discover to track their prices and get notified of deals."
          action={
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => useAppStore.getState().setActiveView('discover')}>
              <Compass className="h-3.5 w-3.5 mr-1" /> Browse products
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {sortedItems.map((item, i) => {
            const prices = item.product.platformPrices
            const best = prices && prices.length > 0
              ? prices.reduce(
                  (min, pp) => (pp.price < min.price ? pp : min),
                  prices[0],
                )
              : null
            const target = item.targetPrice
            const hitTarget = target != null && best && best.price <= target
            const pros = parseJsonArray<string>(item.product.pros)
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: Math.min(i * 0.03, 0.3) }}
                className={`rounded-xl border bg-card p-3 transition-colors ${selectMode && selectedIds.includes(item.id) ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-border/60'}`}
                onClick={() => {
                  if (selectMode) {
                    setSelectedIds((prev) =>
                      prev.includes(item.id) ? prev.filter((x) => x !== item.id) : [...prev, item.id],
                    )
                  }
                }}
              >
                <div className="flex gap-3">
                  {selectMode && (
                    <div className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 mt-1 transition-colors ${selectedIds.includes(item.id) ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-border/60'}`}>
                      {selectedIds.includes(item.id) && <CheckSquare className="h-3 w-3" />}
                    </div>
                  )}
                  <ProductVisual
                    name={item.product.name}
                    brand={item.product.brand}
                    imageColor={item.product.imageColor}
                    size={72}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold line-clamp-2">
                          {item.product.name}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                            {item.product.brand}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px] py-0 px-1.5 capitalize">
                            {item.product.category}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-rose-500 shrink-0"
                        onClick={() => remove.mutate(item.id)}
                        aria-label="Remove"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="mt-2 flex flex-wrap items-end gap-3">
                      <div>
                        <div className="text-[10px] text-muted-foreground uppercase">
                          Best Price Now
                        </div>
                        <div
                          className={`text-lg font-bold ${
                            hitTarget
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : ''
                          }`}
                        >
                          {best ? formatINR(best.price) : formatINR(item.product.basePrice)}
                        </div>
                        {best && (
                          <span
                            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold text-white"
                            style={{ backgroundColor: platformColor(best.platform) }}
                          >
                            {platformLabel(best.platform)}
                          </span>
                        )}
                      </div>

                      <div>
                        <div className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
                          <Target className="h-3 w-3" /> Target Price
                        </div>
                        <Input
                          type="number"
                          defaultValue={target ?? ''}
                          placeholder="₹"
                          className="h-8 w-28 text-xs"
                          onBlur={(e) => {
                            const v = e.target.value
                              ? Number(e.target.value)
                              : null
                            const cur = target ?? 0
                            if ((v ?? 0) !== cur) {
                              update.mutate({ id: item.id, targetPrice: v })
                            }
                          }}
                        />
                      </div>

                      {hitTarget && (
                        <Badge
                          variant="secondary"
                          className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 gap-1"
                        >
                          <TrendingDown className="h-3 w-3" /> Target hit!
                        </Badge>
                      )}
                    </div>

                    {pros.length > 0 && (
                      <div className="mt-2 text-[11px] text-muted-foreground">
                        <span className="font-medium">Pros:</span>{' '}
                        {pros.slice(0, 3).join(' · ')}
                      </div>
                    )}

                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() =>
                          toast.info('Price alert set', {
                            description: `We'll notify you when ${item.product.name} drops further`,
                          })
                        }
                      >
                        <Bell className="h-3 w-3" /> Set alert
                      </Button>
                      {best && (
                        <Button size="sm" variant="ghost" className="h-7 text-xs" asChild>
                          <a
                            href={`https://${best.platform}.com`}
                            target="_blank"
                            rel="noreferrer noopener"
                          >
                            <ExternalLink className="h-3 w-3" /> View on{' '}
                            {platformLabel(best.platform)}
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
