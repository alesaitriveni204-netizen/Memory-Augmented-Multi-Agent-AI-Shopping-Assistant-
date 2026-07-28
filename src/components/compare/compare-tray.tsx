'use client'

import * as React from 'react'
import { useAppStore } from '@/lib/store'
import { motion, AnimatePresence } from 'framer-motion'
import { GitCompare, X, Trash2 } from 'lucide-react'

export function CompareTray() {
  const items = useAppStore((s) => s.compareItems)
  const setOpen = useAppStore((s) => s.setCompareOpen)
  const removeFromCompare = useAppStore((s) => s.removeFromCompare)
  const clearCompare = useAppStore((s) => s.clearCompare)

  return (
    <AnimatePresence>
      {items.length > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 22, stiffness: 280 }}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 max-w-[calc(100vw-2rem)]"
        >
          <div className="flex items-center gap-2 bg-card/95 backdrop-blur-md border border-emerald-500/30 rounded-2xl shadow-2xl shadow-emerald-500/10 p-2 pl-4">
            <div className="flex items-center gap-2 mr-1">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                <GitCompare className="h-4 w-4" />
              </div>
              <span className="text-sm font-semibold hidden sm:block">
                Compare <span className="text-emerald-500">{items.length}/4</span>
              </span>
            </div>

            {/* Item thumbnails */}
            <div className="flex items-center gap-1.5 max-w-[200px] sm:max-w-[280px] overflow-x-auto scrollbar-thin">
              {items.map((item) => (
                <div
                  key={item.productId}
                  className="relative shrink-0 group"
                >
                  <div
                    className="h-9 w-9 rounded-lg flex items-center justify-center text-xs font-bold text-white shadow-sm ring-1 ring-border/40"
                    style={{ background: `linear-gradient(135deg, ${item.imageColor}, ${item.imageColor}cc)` }}
                    title={item.name}
                  >
                    {item.brand.charAt(0)}
                  </div>
                  <button
                    onClick={() => removeFromCompare(item.productId)}
                    className="absolute -top-1.5 -right-1.5 h-4 w-4 grid place-items-center rounded-full bg-rose-500 text-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Remove"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={clearCompare}
              className="h-8 w-8 grid place-items-center rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
              aria-label="Clear all"
              title="Clear all"
            >
              <Trash2 className="h-4 w-4" />
            </button>

            <button
              onClick={() => setOpen(true)}
              className="h-9 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-sm font-semibold shadow-md transition-all hover:shadow-lg hover:shadow-emerald-500/30 active:scale-95"
            >
              Compare Now
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
