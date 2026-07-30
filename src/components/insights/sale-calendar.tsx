'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { Calendar, Clock, Flame, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface SaleEvent {
  name: string
  date: string
  platform: string
  emoji: string
  color: string
  description: string
}

// Major Indian shopping festivals/sales
const SALE_EVENTS: SaleEvent[] = [
  { name: "Republic Day Sale", date: "2026-01-26", platform: "Amazon, Flipkart", emoji: "🇮🇳", color: "#ff9933", description: "Big discounts on electronics, appliances" },
  { name: "Holi Sale", date: "2026-03-06", platform: "Myntra, Ajio", emoji: "🎨", color: "#e91e63", description: "Fashion & beauty deals" },
  { name: "Summer Sale", date: "2026-04-15", platform: "All platforms", emoji: "☀️", color: "#ff9800", description: "ACs, coolers, summer essentials" },
  { name: "Prime Day", date: "2026-07-20", platform: "Amazon", emoji: "📦", color: "#ff9900", description: "Amazon exclusive 48-hour deals" },
  { name: "Independence Day Sale", date: "2026-08-15", platform: "Amazon, Flipkart", emoji: "🇮🇳", color: "#138808", description: "Freedom sale across categories" },
  { name: "Big Billion Days", date: "2026-09-25", platform: "Flipkart", emoji: "🛍️", color: "#2874f0", description: "Flipkart's biggest sale of the year" },
  { name: "Great Indian Festival", date: "2026-10-10", platform: "Amazon", emoji: "🎉", color: "#ff9900", description: "Amazon's Diwali mega sale" },
  { name: "Diwali Sale", date: "2026-10-28", platform: "All platforms", emoji: "🪔", color: "#ff5722", description: "Biggest shopping festival of the year" },
  { name: "Black Friday", date: "2026-11-27", platform: "Croma, Tata CLiQ", emoji: "🖤", color: "#212121", description: "Premium tech & gadget deals" },
  { name: "Christmas Sale", date: "2026-12-25", platform: "All platforms", emoji: "🎄", color: "#d32f2f", description: "Year-end clearance deals" },
]

export function SaleCalendar() {
  const now = new Date()

  const events = React.useMemo(() => {
    return SALE_EVENTS.map((e) => {
      const date = new Date(e.date)
      const diffMs = date.getTime() - now.getTime()
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
      return { ...e, dateObj: date, daysUntil: diffDays, isPast: diffDays < 0, isSoon: diffDays >= 0 && diffDays <= 30 }
    }).sort((a, b) => a.daysUntil - b.daysUntil)
  }, [])

  const upcoming = events.filter((e) => !e.isPast)
  const nextSale = upcoming[0]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border/60 bg-card p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md">
            <Calendar className="h-3.5 w-3.5" />
          </div>
          <div>
            <div className="text-sm font-semibold">Sale Calendar</div>
            <div className="text-[10px] text-muted-foreground">Upcoming shopping festivals</div>
          </div>
        </div>
        {nextSale && (
          <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px]">
            <Flame className="h-2.5 w-2.5 mr-0.5" /> Next in {nextSale.daysUntil}d
          </Badge>
        )}
      </div>

      {/* Next sale highlight */}
      {nextSale && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-lg p-3 mb-3 relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${nextSale.color}15, ${nextSale.color}05)` }}
        >
          <div className="absolute top-0 right-0 text-4xl opacity-20">{nextSale.emoji}</div>
          <div className="relative">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{nextSale.emoji}</span>
              <span className="text-sm font-bold">{nextSale.name}</span>
              <Badge variant="outline" className="text-[9px] py-0 px-1.5">
                <Clock className="h-2 w-2 mr-0.5" /> {nextSale.daysUntil} days
              </Badge>
            </div>
            <div className="text-[11px] text-muted-foreground mb-1.5">{nextSale.description}</div>
            <div className="text-[10px] text-muted-foreground">
              <span className="font-medium">📅</span> {nextSale.dateObj.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}
              <span className="mx-1">·</span>
              <span className="font-medium">🛒</span> {nextSale.platform}
            </div>
          </div>
        </motion.div>
      )}

      {/* Upcoming sales list */}
      <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-thin pr-1">
        {upcoming.slice(1, 6).map((e, i) => (
          <motion.div
            key={e.name}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            className="flex items-center gap-2 rounded-md border border-border/40 p-2 hover:bg-muted/30 transition-colors"
          >
            <span className="text-base shrink-0">{e.emoji}</span>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium truncate">{e.name}</div>
              <div className="text-[10px] text-muted-foreground truncate">{e.platform}</div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[10px] text-muted-foreground">
                {e.dateObj.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
              </div>
              {e.isSoon ? (
                <Badge className="text-[9px] py-0 px-1 h-3.5 bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20">
                  <Zap className="h-2 w-2 mr-0.5" /> {e.daysUntil}d
                </Badge>
              ) : (
                <span className="text-[10px] text-muted-foreground">{e.daysUntil}d</span>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
