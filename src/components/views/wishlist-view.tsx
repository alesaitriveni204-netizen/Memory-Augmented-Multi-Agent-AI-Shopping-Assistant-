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

export function WishlistView() {
  const qc = useQueryClient()
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

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Heart className="h-5 w-5 text-rose-500 fill-rose-500" /> Your Wishlist
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Track products and get notified when prices drop to your target.
        </p>
      </div>

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
          {items.map((item, i) => {
            const best = item.product.platformPrices?.reduce(
              (min, pp) => (pp.price < min.price ? pp : min),
              item.product.platformPrices[0],
            )
            const target = item.targetPrice
            const hitTarget = target != null && best && best.price <= target
            const pros = parseJsonArray<string>(item.product.pros)
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: Math.min(i * 0.03, 0.3) }}
                className="rounded-xl border border-border/60 bg-card p-3"
              >
                <div className="flex gap-3">
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
