'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Search, Star, Sparkles, GitCompare } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ProductVisual } from '@/components/common/product-visual'
import { EmptyState, LoadingState, ProductCardSkeleton } from '@/components/common/empty-state'
import { useAppStore } from '@/lib/store'
import {
  ALL_CATEGORIES,
  formatINR,
  platformColor,
  platformLabel,
} from '@/lib/ui-utils'
import { cn } from '@/lib/utils'

interface ApiProduct {
  id: string
  name: string
  brand: string
  category: string
  imageColor: string
  basePrice: number
  rating: number
  reviewCount: number
  platformPrices?: Array<{
    platform: string
    price: number
    inStock: boolean
    deliveryDays: number
  }>
}

export function DiscoverView() {
  const [search, setSearch] = React.useState('')
  const [category, setCategory] = React.useState<string>('')
  const [debouncedSearch, setDebouncedSearch] = React.useState('')
  const setActiveView = useAppStore((s) => s.setActiveView)
  const setPendingChatInput = useAppStore((s) => s.setPendingChatInput)
  const addToCompare = useAppStore((s) => s.addToCompare)
  const openProductDetail = useAppStore((s) => s.openProductDetail)

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350)
    return () => clearTimeout(t)
  }, [search])

  const { data, isLoading } = useQuery<{
    products: ApiProduct[]
  }>({
    queryKey: ['products', category, debouncedSearch],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (category) params.set('category', category)
      if (debouncedSearch) params.set('search', debouncedSearch)
      params.set('limit', '24')
      const res = await fetch(`/api/products?${params}`)
      return res.json()
    },
  })

  function askAbout(p: ApiProduct) {
    setPendingChatInput(
      `Tell me about the ${p.name}. Is it worth buying right now?`,
    )
    setActiveView('chat')
  }

  const products = data?.products || []

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Search className="h-5 w-5 text-emerald-500" /> Discover Products
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Browse the catalog across 9 platforms. Click Ask AI to get personalized
          recommendations.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products, brands, or categories…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setCategory('')}
            className={cn(
              'rounded-full border px-3 py-1 text-xs transition-colors',
              !category
                ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-medium'
                : 'border-border/60 hover:bg-muted',
            )}
          >
            All
          </button>
          {ALL_CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c === category ? '' : c)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs capitalize transition-colors',
                category === c
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-medium'
                  : 'border-border/60 hover:bg-muted',
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          title="No products found"
          description="Try a different search or category filter."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((p, i) => {
            const best =
              p.platformPrices?.length > 0
                ? p.platformPrices.reduce((min, pp) =>
                    pp.price < min.price ? pp : min,
                  )
                : null
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: Math.min(i * 0.02, 0.3) }}
                className="rounded-xl border border-border/60 bg-card p-3 flex flex-col gap-2 hover:border-emerald-500/40 transition-all hover:shadow-md hover:shadow-emerald-500/10 hover:-translate-y-0.5 asos-card-lift cursor-pointer"
                onClick={() => openProductDetail(p.id)}
              >
                <div className="flex gap-3">
                  <ProductVisual
                    name={p.name}
                    brand={p.brand}
                    imageColor={p.imageColor}
                    size={64}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium line-clamp-2 leading-tight">
                      {p.name}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                        {p.brand}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className="text-[10px] py-0 px-1.5 capitalize"
                      >
                        {p.category}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="flex items-end justify-between gap-2">
                  <div>
                    {best && (
                      <>
                        <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                          {formatINR(best.price)}
                        </div>
                        <span
                          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold text-white"
                          style={{
                            backgroundColor: platformColor(best.platform),
                          }}
                        >
                          {platformLabel(best.platform)}
                        </span>
                      </>
                    )}
                    {!best && (
                      <div className="text-base font-bold">
                        {formatINR(p.basePrice)}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-0.5 justify-end">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      <span className="text-xs font-semibold">
                        {p.rating?.toFixed(1)}
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {p.reviewCount?.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-auto">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-8 text-xs"
                    onClick={(e) => { e.stopPropagation(); askAbout(p) }}
                  >
                    <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                    Ask AI
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs px-2"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (best) {
                        addToCompare({
                          productId: p.id,
                          name: p.name,
                          brand: p.brand,
                          category: p.category,
                          imageColor: p.imageColor,
                          bestPlatform: best.platform,
                          bestPrice: best.price,
                          mrp: (p as any).basePrice ? Math.round((p as any).basePrice * 1.15) : best.price,
                          discount: Math.round((((p as any).basePrice ? Math.round((p as any).basePrice * 1.15) : best.price) - best.price) / ((p as any).basePrice ? Math.round((p as any).basePrice * 1.15) : best.price) * 100),
                          rating: p.rating,
                          reviewCount: p.reviewCount,
                          deliveryDays: best.deliveryDays,
                        })
                      }
                    }}
                    title="Add to comparison"
                  >
                    <GitCompare className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
