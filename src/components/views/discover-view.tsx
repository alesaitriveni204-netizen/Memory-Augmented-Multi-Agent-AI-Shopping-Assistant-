'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Search, Star, Sparkles, GitCompare, SlidersHorizontal, Globe, RefreshCw, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ProductVisual } from '@/components/common/product-visual'
import { EmptyState, LoadingState, ProductCardSkeleton } from '@/components/common/empty-state'
import { useAppStore } from '@/lib/store'
import { toast } from 'sonner'
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

// Helper: get best (lowest in-stock) price for a product
function getBestPrice(p: ApiProduct): number {
  if (p.platformPrices?.length > 0) {
    const inStock = p.platformPrices.filter((pp) => pp.inStock)
    const candidates = inStock.length > 0 ? inStock : p.platformPrices
    return Math.min(...candidates.map((pp) => pp.price))
  }
  return p.basePrice
}

// Helper: get best discount % for a product
function getBestDiscount(p: ApiProduct): number {
  if (p.platformPrices?.length > 0) {
    const inStock = p.platformPrices.filter((pp) => pp.inStock)
    const candidates = inStock.length > 0 ? inStock : p.platformPrices
    return Math.max(...candidates.map((pp) => pp.discount || 0))
  }
  return 0
}

export function DiscoverView() {
  const [search, setSearch] = React.useState('')
  const [category, setCategory] = React.useState<string>('')
  const [debouncedSearch, setDebouncedSearch] = React.useState('')
  const [showFilters, setShowFilters] = React.useState(false)
  const [priceRange, setPriceRange] = React.useState<[number, number]>([0, 250000])
  const [minRating, setMinRating] = React.useState(0)
  const [selectedBrands, setSelectedBrands] = React.useState<string[]>([])
  const [sortBy, setSortBy] = React.useState<'relevance' | 'price-low' | 'price-high' | 'rating' | 'discount' | 'name'>('relevance')
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
      params.set('limit', '60')
      const res = await fetch(`/api/products?${params}`)
      return res.json()
    },
  })

  // Extract available brands from products
  const availableBrands = React.useMemo(() => {
    const brands = new Set<string>()
    ;(data?.products || []).forEach((p) => brands.add(p.brand))
    return Array.from(brands).sort()
  }, [data])

  // Apply client-side filters (price, rating, brand) + sorting
  const filteredProducts = React.useMemo(() => {
    let result = data?.products || []
    if (priceRange[0] > 0 || priceRange[1] < 250000) {
      result = result.filter((p) => {
        const best = getBestPrice(p)
        return best >= priceRange[0] && best <= priceRange[1]
      })
    }
    if (minRating > 0) {
      result = result.filter((p) => p.rating >= minRating)
    }
    if (selectedBrands.length > 0) {
      result = result.filter((p) => selectedBrands.includes(p.brand))
    }
    // Apply sorting
    const sorted = [...result]
    switch (sortBy) {
      case 'price-low':
        sorted.sort((a, b) => getBestPrice(a) - getBestPrice(b))
        break
      case 'price-high':
        sorted.sort((a, b) => getBestPrice(b) - getBestPrice(a))
        break
      case 'rating':
        sorted.sort((a, b) => b.rating - a.rating)
        break
      case 'discount':
        sorted.sort((a, b) => getBestDiscount(b) - getBestDiscount(a))
        break
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name))
        break
    }
    return sorted
  }, [data, priceRange, minRating, selectedBrands, sortBy])

  const activeFilterCount = (priceRange[0] > 0 || priceRange[1] < 250000 ? 1 : 0) + (minRating > 0 ? 1 : 0) + (selectedBrands.length > 0 ? 1 : 0)

  function clearFilters() {
    setPriceRange([0, 250000])
    setMinRating(0)
    setSelectedBrands([])
  }

  // Live discovery state
  const [liveMode, setLiveMode] = React.useState(false)
  const [liveLoading, setLiveLoading] = React.useState(false)
  const [liveProducts, setLiveProducts] = React.useState<any[]>([])
  const [refreshing, setRefreshing] = React.useState(false)

  async function searchLive() {
    if (!debouncedSearch.trim()) {
      setLiveProducts([])
      return
    }
    setLiveLoading(true)
    try {
      const res = await fetch('/api/products/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: debouncedSearch, category }),
      })
      const data = await res.json()
      if (res.ok && data.products) {
        setLiveProducts(data.products)
      }
    } catch {
      /* swallow */
    } finally {
      setLiveLoading(false)
    }
  }

  async function refreshPrices() {
    setRefreshing(true)
    try {
      const res = await fetch('/api/products/refresh-prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`Refreshed prices for ${data.updated} products`)
        // Refetch catalog
        window.location.reload()
      }
    } catch {
      toast.error('Failed to refresh prices')
    } finally {
      setRefreshing(false)
    }
  }

  // Auto-search in live mode
  React.useEffect(() => {
    if (liveMode && debouncedSearch) {
      searchLive()
    } else {
      setLiveProducts([])
    }
  }, [liveMode, debouncedSearch, category])

  function askAbout(p: ApiProduct) {
    setPendingChatInput(
      `Tell me about the ${p.name}. Is it worth buying right now?`,
    )
    setActiveView('chat')
  }

  const products = filteredProducts

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
            placeholder={liveMode ? "Search the LIVE web for real products…" : "Search products, brands, or categories…"}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Live mode toggle + refresh prices */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => { setLiveMode(!liveMode); setLiveProducts([]) }}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-colors ${liveMode ? 'border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-400' : 'border-border/60 text-muted-foreground hover:bg-muted'}`}
          >
            <Globe className="h-3 w-3" />
            {liveMode ? 'Live Web Search ON' : 'Live Web Search'}
          </button>
          <button
            onClick={refreshPrices}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing…' : 'Refresh Live Prices'}
          </button>
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

        {/* Advanced filters toggle + panel */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-colors',
              showFilters || activeFilterCount > 0
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                : 'border-border/60 hover:bg-muted text-muted-foreground',
            )}
          >
            <SlidersHorizontal className="h-3 w-3" />
            Filters
            {activeFilterCount > 0 && (
              <span className="grid h-4 min-w-4 place-items-center rounded-full bg-emerald-500 px-1 text-[9px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="text-[11px] text-muted-foreground hover:text-rose-500 transition-colors"
            >
              Clear all
            </button>
          )}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">
              {products.length} product{products.length !== 1 ? 's' : ''}
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="rounded-lg border border-border/60 bg-card/60 px-2 py-1 text-xs outline-none cursor-pointer hover:border-emerald-500/40 transition-colors focus:border-emerald-500/50"
            >
              <option value="relevance">Relevance</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
              <option value="discount">Biggest Discount</option>
              <option value="name">Name (A-Z)</option>
            </select>
          </div>
        </div>

        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-xl border border-border/60 bg-card/60 p-4 space-y-4 overflow-hidden"
          >
            {/* Price range */}
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Price Range
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={250000}
                  step={5000}
                  value={priceRange[0]}
                  onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
                  className="flex-1 accent-emerald-500"
                />
                <input
                  type="range"
                  min={0}
                  max={250000}
                  step={5000}
                  value={priceRange[1]}
                  onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                  className="flex-1 accent-emerald-500"
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1">
                <span>₹{priceRange[0].toLocaleString('en-IN')}</span>
                <span>₹{priceRange[1].toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Rating filter */}
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Minimum Rating
              </div>
              <div className="flex gap-1.5">
                {[0, 3, 3.5, 4, 4.5].map((r) => (
                  <button
                    key={r}
                    onClick={() => setMinRating(r)}
                    className={cn(
                      'rounded-md border px-2.5 py-1 text-xs transition-colors',
                      minRating === r
                        ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium'
                        : 'border-border/60 hover:bg-muted text-muted-foreground',
                    )}
                  >
                    {r === 0 ? 'Any' : `${r}★+`}
                  </button>
                ))}
              </div>
            </div>

            {/* Brand multi-select */}
            {availableBrands.length > 0 && (
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Brands ({selectedBrands.length > 0 ? `${selectedBrands.length} selected` : 'all'})
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto scrollbar-thin">
                  {availableBrands.map((b) => {
                    const active = selectedBrands.includes(b)
                    return (
                      <button
                        key={b}
                        onClick={() => {
                          setSelectedBrands((prev) =>
                            active ? prev.filter((x) => x !== b) : [...prev, b],
                          )
                        }}
                        className={cn(
                          'rounded-md border px-2 py-0.5 text-[11px] transition-colors',
                          active
                            ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-medium'
                            : 'border-border/60 hover:bg-muted text-muted-foreground',
                        )}
                      >
                        {b}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Live web search results */}
      {liveMode && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-sky-500" />
            <span className="text-sm font-semibold">Live Web Results</span>
            {liveLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-500" />}
            {liveProducts.length > 0 && !liveLoading && (
              <Badge variant="outline" className="text-[10px] border-sky-500/30 text-sky-600 dark:text-sky-400">
                {liveProducts.length} found
              </Badge>
            )}
            <span className="ml-auto text-[10px] text-muted-foreground">
              Real products from Amazon, Flipkart, Croma & more
            </span>
          </div>

          {liveLoading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)}
            </div>
          ) : liveProducts.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {liveProducts.map((p, i) => {
                const bestPrice = p.platformPrices?.[0]?.price || p.basePrice || 0
                const platform = p.platformPrices?.[0]?.platform || "web"
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-3 flex flex-col gap-2 asos-card-lift cursor-pointer"
                    onClick={() => {
                      if (p.source) {
                        window.open(p.source, '_blank')
                      }
                    }}
                  >
                    <div className="flex gap-3">
                      <div className="grid h-16 w-16 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-sky-500/20 to-teal-500/10 text-sky-500">
                        <Globe className="h-6 w-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium line-clamp-2 leading-tight">{p.name}</div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5">{p.brand}</Badge>
                          <Badge variant="secondary" className="text-[10px] py-0 px-1.5 capitalize">{p.category}</Badge>
                          {platform && (
                            <Badge className="text-[10px] py-0 px-1.5 capitalize bg-sky-500/15 text-sky-600 dark:text-sky-400">{platform}</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-end justify-between gap-2">
                      <div>
                        {bestPrice > 0 && (
                          <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                            ₹{bestPrice.toLocaleString('en-IN')}
                          </div>
                        )}
                        {p.rating > 0 && (
                          <div className="flex items-center gap-0.5 justify-end">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            <span className="text-xs font-semibold">{p.rating}</span>
                          </div>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={(e) => { e.stopPropagation(); setPendingChatInput(`Tell me about the ${p.name}. Is it worth buying?`); setActiveView('chat') }}
                      >
                        <Sparkles className="h-3 w-3 text-emerald-500" /> Ask AI
                      </Button>
                    </div>
                    {p.pros?.length > 0 && (
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400 truncate">
                        ✓ {p.pros.slice(0, 2).join(' · ')}
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </div>
          ) : debouncedSearch ? (
            <div className="text-center py-8 text-xs text-muted-foreground">
              {liveLoading ? 'Searching the web…' : 'No live results found. Try a different search term.'}
            </div>
          ) : (
            <div className="text-center py-8 text-xs text-muted-foreground">
              Type a search query above to find real products from the web.
            </div>
          )}
        </div>
      )}

      {/* Cached catalog */}
      {!liveMode && (
        <>
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
        </>
      )}
    </div>
  )
}
