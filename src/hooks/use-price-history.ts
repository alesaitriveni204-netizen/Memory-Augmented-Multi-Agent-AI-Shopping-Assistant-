'use client'

import * as React from 'react'

/**
 * usePriceHistory — fetches price history for a product and returns
 * the best-platform price series (for sparkline rendering).
 */
export function usePriceHistory(productId: string | undefined, enabled: boolean) {
  const [series, setSeries] = React.useState<number[]>([])

  React.useEffect(() => {
    if (!productId || !enabled) {
      setSeries([])
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/compare/prices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productIds: [productId] }),
        })
        const data = await res.json()
        if (!cancelled && res.ok && data.histories?.[productId]) {
          // Use the first platform series (or longest one)
          const all = data.histories[productId] as Array<{ platform: string; series: Array<{ date: string; price: number }> }>
          const longest = all.reduce((best, cur) => cur.series.length > best.series.length ? cur : best, all[0])
          setSeries(longest?.series.map((p) => p.price) ?? [])
        }
      } catch {
        /* swallow */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [productId, enabled])

  return series
}
