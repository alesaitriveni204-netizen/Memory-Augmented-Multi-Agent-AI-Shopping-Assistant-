'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { CalendarDays, Clock, Flame, Zap, Bell, TrendingDown, ShoppingBag, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/lib/store'

interface SaleEvent {
  name: string
  date: string
  platform: string
  emoji: string
  color: string
  description: string
  category: string
}

const SALE_EVENTS: SaleEvent[] = [
  { name: "Republic Day Sale", date: "2026-01-26", platform: "Amazon, Flipkart", emoji: "🇮🇳", color: "#ff9933", description: "Big discounts on electronics, appliances, and home goods", category: "Electronics" },
  { name: "Valentine's Sale", date: "2026-02-14", platform: "Myntra, Nykaa", emoji: "💝", color: "#e91e63", description: "Fashion, beauty, and gifting deals", category: "Fashion" },
  { name: "Holi Sale", date: "2026-03-06", platform: "Myntra, Ajio", emoji: "🎨", color: "#9c27b0", description: "Fashion & beauty deals with festive colors", category: "Fashion" },
  { name: "Summer Sale", date: "2026-04-15", platform: "All platforms", emoji: "☀️", color: "#ff9800", description: "ACs, coolers, refrigerators, summer essentials", category: "Appliances" },
  { name: "Mother's Day Sale", date: "2026-05-10", platform: "Myntra, Nykaa", emoji: "🌸", color: "#ec4899", description: "Beauty, fashion, and gifting deals", category: "Beauty" },
  { name: "Prime Day", date: "2026-07-20", platform: "Amazon", emoji: "📦", color: "#ff9900", description: "Amazon exclusive 48-hour deals across all categories", category: "All" },
  { name: "Independence Day Sale", date: "2026-08-15", platform: "Amazon, Flipkart", emoji: "🇮🇳", color: "#138808", description: "Freedom sale across electronics, fashion, and home", category: "All" },
  { name: "Onam Sale", date: "2026-09-10", platform: "Flipkart, Amazon", emoji: "🏏", color: "#c41e3a", description: "Festive deals with regional focus", category: "All" },
  { name: "Big Billion Days", date: "2026-09-25", platform: "Flipkart", emoji: "🛍️", color: "#2874f0", description: "Flipkart's biggest sale of the year — electronics, fashion, everything", category: "All" },
  { name: "Great Indian Festival", date: "2026-10-10", platform: "Amazon", emoji: "🎉", color: "#ff9900", description: "Amazon's Diwali mega sale — biggest discounts of the year", category: "All" },
  { name: "Diwali Sale", date: "2026-10-28", platform: "All platforms", emoji: "🪔", color: "#ff5722", description: "Biggest shopping festival — electronics, gold, home, fashion", category: "All" },
  { name: "Black Friday", date: "2026-11-27", platform: "Croma, Tata CLiQ", emoji: "🖤", color: "#212121", description: "Premium tech & gadget deals, international brands", category: "Electronics" },
  { name: "Christmas Sale", date: "2026-12-25", platform: "All platforms", emoji: "🎄", color: "#d32f2f", description: "Year-end clearance deals across all categories", category: "All" },
]

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function SalesView() {
  const now = new Date()
  const setPendingChatInput = useAppStore((s) => s.setPendingChatInput)
  const setActiveView = useAppStore((s) => s.setActiveView)

  const events = SALE_EVENTS.map((e) => {
    const date = new Date(e.date)
    const diffMs = date.getTime() - now.getTime()
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    return { ...e, dateObj: date, daysUntil: diffDays, isPast: diffDays < 0, isSoon: diffDays >= 0 && diffDays <= 30, isNext: false }
  }).sort((a, b) => a.daysUntil - b.daysUntil)

  const upcoming = events.filter((e) => !e.isPast)
  const nextSale = upcoming[0]
  if (nextSale) nextSale.isNext = true

  // Group by month
  const byMonth: Array<[string, typeof events]> = []
  {
    const groups: Record<string, typeof events> = {}
    upcoming.forEach((e) => {
      const key = `${e.dateObj.getFullYear()}-${e.dateObj.getMonth()}`
      if (!groups[key]) groups[key] = []
      groups[key].push(e)
    })
    byMonth.push(...Object.entries(groups))
  }

  function askAboutSale(sale: SaleEvent) {
    setPendingChatInput(`What are the best deals during the ${sale.name} on ${sale.platform}?`)
    setActiveView('chat')
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-amber-500" /> Sale Calendar
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Track upcoming shopping festivals across 9 platforms. Plan your purchases for maximum savings.
        </p>
      </div>

      {/* Next sale hero banner */}
      {nextSale && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border-2 p-5"
          style={{ borderColor: `${nextSale.color}40`, background: `linear-gradient(135deg, ${nextSale.color}15, ${nextSale.color}05, transparent)` }}
        >
          {/* Decorative emoji */}
          <div className="absolute -top-4 -right-4 text-8xl opacity-10 select-none">{nextSale.emoji}</div>

          <div className="relative flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px]">
                  <Flame className="h-2.5 w-2.5 mr-0.5" /> Next Sale
                </Badge>
                <span className="text-3xl">{nextSale.emoji}</span>
              </div>
              <h2 className="text-2xl font-bold mb-1">{nextSale.name}</h2>
              <p className="text-sm text-muted-foreground mb-3">{nextSale.description}</p>
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {nextSale.dateObj.toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}
                </span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <ShoppingBag className="h-3.5 w-3.5" />
                  {nextSale.platform}
                </span>
                <Badge variant="outline" className="text-[10px] capitalize">{nextSale.category}</Badge>
              </div>
            </div>

            {/* Countdown */}
            <div className="text-center shrink-0">
              <div className="text-4xl font-bold asos-gradient-text">{nextSale.daysUntil}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">days left</div>
              <Button
                size="sm"
                className="mt-2 h-7 text-xs bg-amber-500 hover:bg-amber-600 text-white"
                onClick={() => askAboutSale(nextSale)}
              >
                <Zap className="h-3 w-3 mr-1" /> Get deals
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border/60 bg-card p-3 text-center">
          <div className="text-2xl font-bold text-emerald-500">{upcoming.length}</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Upcoming Sales</div>
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-3 text-center">
          <div className="text-2xl font-bold text-amber-500">{upcoming.filter((e) => e.isSoon).length}</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Within 30 days</div>
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-3 text-center">
          <div className="text-2xl font-bold text-purple-500">{new Set(upcoming.map((e) => e.platform.split(',')[0].trim())).size}</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Platforms</div>
        </div>
      </div>

      {/* Sales by month */}
      <div className="space-y-4">
        {byMonth.map(([monthKey, monthEvents]) => {
          const [year, monthIdx] = monthKey.split('-').map(Number)
          return (
            <div key={monthKey}>
              {/* Month header */}
              <div className="flex items-center gap-2 mb-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white text-xs font-bold shadow-sm">
                  {MONTH_NAMES[monthIdx].slice(0, 3)}
                </div>
                <div>
                  <div className="text-sm font-semibold">{MONTH_NAMES[monthIdx]} {year}</div>
                  <div className="text-[10px] text-muted-foreground">{monthEvents.length} sale{monthEvents.length !== 1 ? 's' : ''}</div>
                </div>
              </div>

              {/* Sale cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {monthEvents.map((e, i) => (
                  <motion.div
                    key={e.name}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`group relative rounded-xl border bg-card p-3 transition-all hover:shadow-md cursor-pointer ${e.isNext ? 'border-amber-500/40' : 'border-border/60 hover:border-emerald-500/30'}`}
                    onClick={() => askAboutSale(e)}
                  >
                    <div className="flex items-start gap-3">
                      {/* Emoji icon */}
                      <div
                        className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-2xl shadow-sm"
                        style={{ background: `linear-gradient(135deg, ${e.color}20, ${e.color}05)` }}
                      >
                        {e.emoji}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-semibold truncate">{e.name}</span>
                          {e.isSoon && (
                            <Badge className="text-[9px] py-0 px-1 h-4 bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20 shrink-0">
                              <Zap className="h-2 w-2 mr-0.5" /> Soon
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-2 mb-1.5">{e.description}</p>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-0.5">
                            <Clock className="h-2.5 w-2.5" />
                            {e.daysUntil}d
                          </span>
                          <span>·</span>
                          <span className="truncate">{e.platform}</span>
                        </div>
                      </div>

                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Pro tips */}
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
        <div className="flex items-center gap-2 mb-2">
          <TrendingDown className="h-4 w-4 text-emerald-500" />
          <span className="text-sm font-semibold">Smart Shopping Tips</span>
        </div>
        <ul className="space-y-1.5">
          <li className="text-xs text-muted-foreground flex items-start gap-2">
            <span className="text-emerald-500 shrink-0">✓</span>
            Add items to your <strong className="text-foreground">wishlist</strong> before the sale — you'll get instant price-drop notifications
          </li>
          <li className="text-xs text-muted-foreground flex items-start gap-2">
            <span className="text-emerald-500 shrink-0">✓</span>
            Compare prices across platforms during sales — same product can vary 5-15%
          </li>
          <li className="text-xs text-muted-foreground flex items-start gap-2">
            <span className="text-emerald-500 shrink-0">✓</span>
            Stack bank offers + platform discounts for extra 5-10% off
          </li>
          <li className="text-xs text-muted-foreground flex items-start gap-2">
            <span className="text-emerald-500 shrink-0">✓</span>
            Use the <strong className="text-foreground">Buy/Wait AI</strong> to check if the sale price is actually a good deal
          </li>
        </ul>
      </div>
    </div>
  )
}
