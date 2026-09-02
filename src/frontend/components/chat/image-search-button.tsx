'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Image as ImageIcon, X, Loader2, Sparkles, Upload, Camera, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAppStore } from '@/lib/store'
import { formatINR, platformLabel } from '@/lib/ui-utils'

interface AnalysisResult {
  category: string
  brand: string
  type: string
  color: string
  features: string[]
  description: string
}

interface MatchedProduct {
  id: string
  name: string
  brand: string
  category: string
  imageColor: string
  rating: number
  reviewCount: number
  bestPlatform: string
  bestPrice: number
  mrp: number
  discount: number
  deliveryDays: number
  matchReason: string
}

interface ImageSearchState {
  open: boolean
  preview: string | null
  analysis: AnalysisResult | null
  products: MatchedProduct[]
  loading: boolean
  error: string | null
}

export function ImageSearchButton() {
  const [state, setState] = React.useState<ImageSearchState>({
    open: false,
    preview: null,
    analysis: null,
    products: [],
    loading: false,
    error: null,
  })
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const setActiveView = useAppStore((s) => s.setActiveView)
  const setPendingChatInput = useAppStore((s) => s.setPendingChatInput)

  function handleFileSelect(file: File) {
    if (!file.type.startsWith('image/')) {
      setState((s) => ({ ...s, error: 'Please select an image file' }))
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      setState({ open: true, preview: dataUrl, analysis: null, products: [], loading: true, error: null })
      // Send to API
      ;(async () => {
        try {
          const res = await fetch('/api/image-search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: dataUrl }),
          })
          const data = await res.json()
          if (res.ok) {
            setState((s) => ({
              ...s,
              analysis: data.analysis,
              products: data.products ?? [],
              loading: false,
              error: data.noMatches ? 'No matching products were found in the catalog.' : null,
            }))
          } else {
            setState((s) => ({ ...s, error: data.error || 'Analysis failed', loading: false }))
          }
        } catch (e: any) {
          setState((s) => ({ ...s, error: e.message || 'Network error', loading: false }))
        }
      })()
    }
    reader.readAsDataURL(file)
  }

  function close() {
    setState({ open: false, preview: null, analysis: null, products: [], loading: false, error: null })
  }

  function askAboutProduct(product: MatchedProduct) {
    setPendingChatInput(`Tell me more about ${product.name} (${product.brand})`)
    setActiveView('chat')
    close()
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFileSelect(file)
          e.target.value = ''
        }}
      />
      <Button
        size="icon"
        variant="ghost"
        onClick={() => fileInputRef.current?.click()}
        className="h-9 w-9 shrink-0 text-muted-foreground hover:text-purple-500 hover:bg-purple-500/10"
        aria-label="Image search"
        title="Search by image"
      >
        <ImageIcon className="h-4 w-4" />
      </Button>

      <AnimatePresence>
        {state.open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={close}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-card border border-border/60 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border/60 bg-gradient-to-r from-purple-500/5 to-transparent">
                <div className="flex items-center gap-2">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 text-white shadow-md">
                    <Camera className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold">Visual Product Search</h2>
                    <p className="text-[10px] text-muted-foreground">AI-powered image analysis</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={close} className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-4">
                {/* Image preview */}
                {state.preview && (
                  <div className="flex gap-3">
                    <div className="relative h-32 w-32 shrink-0 rounded-xl overflow-hidden border border-border/60 shadow-md">
                      <img src={state.preview} alt="Uploaded product" className="h-full w-full object-cover" />
                      {state.loading && (
                        <div className="absolute inset-0 bg-black/50 grid place-items-center">
                          <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
                        </div>
                      )}
                    </div>

                    {/* Analysis */}
                    {state.analysis && (
                      <motion.div
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex-1 min-w-0 space-y-2"
                      >
                        <div className="flex items-center gap-1.5">
                          <Sparkles className="h-3 w-3 text-purple-500" />
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400">AI Analysis</span>
                        </div>
                        <p className="text-xs text-foreground leading-relaxed">{state.analysis.description}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {state.analysis.category && state.analysis.category !== "unknown" && (
                            <Badge variant="outline" className="text-[10px] capitalize border-purple-500/30 text-purple-600 dark:text-purple-400">
                              {state.analysis.category}
                            </Badge>
                          )}
                          {state.analysis.brand && state.analysis.brand !== "unknown" && (
                            <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                              {state.analysis.brand}
                            </Badge>
                          )}
                          {state.analysis.color && (
                            <Badge variant="outline" className="text-[10px] capitalize">{state.analysis.color}</Badge>
                          )}
                          {state.analysis.type && (
                            <Badge variant="outline" className="text-[10px]">{state.analysis.type}</Badge>
                          )}
                        </div>
                        {state.analysis.features?.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {state.analysis.features.slice(0, 4).map((f, i) => (
                              <span key={i} className="text-[10px] rounded bg-muted/50 px-1.5 py-0.5 text-muted-foreground">
                                {f}
                              </span>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    )}

                    {state.loading && !state.analysis && (
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-3/4 rounded asos-shimmer" />
                        <div className="h-3 w-1/2 rounded asos-shimmer" />
                        <div className="h-3 w-2/3 rounded asos-shimmer" />
                      </div>
                    )}

                    {state.error && (
                      <div className="flex-1 text-xs text-rose-500">{state.error}</div>
                    )}
                  </div>
                )}

                {/* Matched products */}
                {state.products.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-2"
                  >
                    <div className="flex items-center gap-1.5">
                      <Zap className="h-3 w-3 text-emerald-500" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Similar Products ({state.products.length})
                      </span>
                    </div>
                    <div className="grid gap-2">
                      {state.products.map((p, i) => (
                        <motion.div
                          key={p.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/60 p-2.5 hover:border-purple-500/40 hover:bg-purple-500/5 transition-all group cursor-pointer"
                          onClick={() => askAboutProduct(p)}
                        >
                          <div
                            className="h-12 w-12 shrink-0 rounded-lg flex items-center justify-center text-sm font-bold text-white shadow-sm"
                            style={{ background: `linear-gradient(135deg, ${p.imageColor}, ${p.imageColor}cc)` }}
                          >
                            {p.brand.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{p.name}</div>
                            <div className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                              {p.brand} · {p.rating}★ · {p.reviewCount.toLocaleString('en-IN')} reviews
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatINR(p.bestPrice)}</div>
                            <Badge variant="outline" className="text-[9px] py-0 px-1">{p.matchReason}</Badge>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
                {!state.loading && state.analysis && state.products.length === 0 && !state.error && (
                  <p className="rounded-lg border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
                    No matching products were found in the catalog.
                  </p>
                )}
              </div>

              {/* Footer */}
              <div className="p-3 border-t border-border/60 bg-muted/20">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-3.5 w-3.5 mr-1" /> Upload another image
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
