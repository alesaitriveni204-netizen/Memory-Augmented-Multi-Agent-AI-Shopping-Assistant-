'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Globe, ExternalLink, Loader2, Search, Sparkles, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface WebResult {
  url: string
  name: string
  snippet: string
  host_name: string
  rank: number
  date: string
  favicon: string
}

interface WebSearchPanelProps {
  query: string | null
}

/**
 * WebSearchPanel — fetches real-time web results for the current chat query.
 * Shows latest news, reviews, and product info from the web.
 */
export function WebSearchPanel({ query }: WebSearchPanelProps) {
  const [results, setResults] = React.useState<WebResult[]>([])
  const [loading, setLoading] = React.useState(false)
  const [expanded, setExpanded] = React.useState(true)

  React.useEffect(() => {
    if (!query || query.length < 5) {
      setResults([])
      return
    }
    let cancelled = false
    setLoading(true)
    setResults([])
    ;(async () => {
      try {
        const res = await fetch('/api/web-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: `${query} review price 2025`, num: 4, recency_days: 90 }),
        })
        const data = await res.json()
        if (!cancelled && res.ok && data.results) {
          setResults(data.results)
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
  }, [query])

  if (!query || query.length < 5) return null

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <div className="rounded-xl border border-sky-500/20 bg-gradient-to-br from-sky-500/5 to-transparent p-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center gap-2 text-left"
        >
          <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-sky-500/15 text-sky-500">
            <Globe className="h-3.5 w-3.5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold flex items-center gap-1.5">
              Web Intelligence
              {loading && <Loader2 className="h-3 w-3 animate-spin text-sky-500" />}
              {!loading && results.length > 0 && (
                <Badge variant="outline" className="text-[9px] py-0 px-1 h-3.5 border-sky-500/30 text-sky-600 dark:text-sky-400">
                  {results.length} live
                </Badge>
              )}
            </div>
            <div className="text-[10px] text-muted-foreground truncate">
              Real-time results from the web
            </div>
          </div>
        </button>

        <AnimatePresence>
          {expanded && !loading && results.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2.5 space-y-1.5"
            >
              {results.map((r, i) => (
                <motion.a
                  key={i}
                  href={r.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="block rounded-lg border border-border/40 bg-card/60 p-2 hover:border-sky-500/40 hover:bg-sky-500/5 transition-all group"
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {r.favicon && (
                          <img src={r.favicon} alt="" className="h-3 w-3 rounded-sm shrink-0" />
                        )}
                        <span className="text-[10px] text-sky-600 dark:text-sky-400 font-medium truncate">{r.host_name}</span>
                        {r.date && (
                          <span className="text-[9px] text-muted-foreground shrink-0">· {r.date}</span>
                        )}
                      </div>
                      <div className="text-xs font-medium mt-0.5 line-clamp-1 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                        {r.name}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                        {r.snippet}
                      </div>
                    </div>
                    <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </motion.a>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
