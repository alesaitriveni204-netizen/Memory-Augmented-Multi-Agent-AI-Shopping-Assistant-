'use client'

import * as React from 'react'

export interface SavedComparison {
  id: string
  createdAt: string
  items: Array<{
    productId: string
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
    shoppingScore?: number
  }>
  verdict?: {
    winner: string
    verdict: string
  }
}

const STORAGE_KEY = 'asos-comparison-history'
const MAX_HISTORY = 10

export function useComparisonHistory() {
  const [history, setHistory] = React.useState<SavedComparison[]>([])

  // Load from localStorage on mount
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        setHistory(JSON.parse(stored))
      }
    } catch {}
  }, [])

  const saveComparison = React.useCallback((items: SavedComparison['items'], verdict?: SavedComparison['verdict']) => {
    if (items.length < 2) return
    const entry: SavedComparison = {
      id: `comp-${Date.now()}`,
      createdAt: new Date().toISOString(),
      items,
      verdict,
    }
    setHistory((prev) => {
      const next = [entry, ...prev].slice(0, MAX_HISTORY)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {}
      return next
    })
  }, [])

  const deleteComparison = React.useCallback((id: string) => {
    setHistory((prev) => {
      const next = prev.filter((c) => c.id !== id)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {}
      return next
    })
  }, [])

  const clearHistory = React.useCallback(() => {
    setHistory([])
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {}
  }, [])

  return { history, saveComparison, deleteComparison, clearHistory }
}
