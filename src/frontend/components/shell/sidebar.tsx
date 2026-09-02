'use client'

import {
  MessageSquare,
  Compass,
  Heart,
  Brain,
  Users,
  Activity,
  BarChart3,
  Settings,
  GraduationCap,
  CalendarDays,
  Search,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore, type ViewKey } from '@/lib/store'
import { OrbisLogo } from './orbis-logo'

export const NAV_ITEMS: {
  key: ViewKey
  label: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
  { key: 'chat', label: 'Chat', icon: MessageSquare },
  { key: 'discover', label: 'Discover', icon: Compass },
  { key: 'wishlist', label: 'Wishlist', icon: Heart },
  { key: 'memory', label: 'Memory', icon: Brain },
  { key: 'twin', label: 'Digital Twin', icon: Users },
  { key: 'coach', label: 'Coach', icon: GraduationCap },
  { key: 'timeline', label: 'Timeline', icon: Activity },
  { key: 'sales', label: 'Sales', icon: CalendarDays },
  { key: 'insights', label: 'Insights', icon: BarChart3 },
  { key: 'settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const activeView = useAppStore((s) => s.activeView)
  const setActiveView = useAppStore((s) => s.setActiveView)

  return (
    <nav
      aria-label="Primary"
      className="hidden md:flex md:w-56 lg:w-60 shrink-0 flex-col gap-1 border-r border-border/60 bg-sidebar/25 p-3 backdrop-blur-xl"
    >
      <div className="mb-3 flex items-center justify-between border-b border-border/50 px-2 pb-4">
        <OrbisLogo compact />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          OS
        </span>
      </div>
      <div className="px-2 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Workspace
      </div>
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon
        const active = activeView === item.key
        return (
          <button
            key={item.key}
            onClick={() => setActiveView(item.key)}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all',
              active
                ? 'bg-gradient-to-r from-emerald-500/15 to-teal-500/5 text-emerald-700 dark:text-emerald-300 font-semibold shadow-sm'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
            )}
          >
            {active && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-gradient-to-b from-emerald-500 to-teal-500" />
            )}
            <Icon
              className={cn(
                'h-4 w-4 shrink-0 transition-transform',
                active
                  ? 'text-emerald-600 dark:text-emerald-400 scale-110'
                  : 'text-muted-foreground group-hover:text-foreground group-hover:scale-105',
              )}
            />
            <span className="truncate">{item.label}</span>
            {active && (
              <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </button>
        )
      })}
      <div className="mt-4 px-2 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Intelligence
      </div>
      <div className="mx-1 mt-auto rounded-xl border border-teal-500/20 bg-teal-500/5 p-3">
        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="orbis-mark orbis-signal h-6 w-6 rounded-full" />
          <span>Your Orbis Twin</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>Learning continuously</span>
          <span className="text-teal-500">Live</span>
        </div>
      </div>
    </nav>
  )
}

export function BottomNav() {
  const activeView = useAppStore((s) => s.activeView)
  const setActiveView = useAppStore((s) => s.setActiveView)

  return (
    <nav
      aria-label="Primary mobile"
      className="md:hidden sticky bottom-0 z-40 border-t border-border/60 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-stretch overflow-x-auto scrollbar-thin">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const active = activeView === item.key
          return (
            <button
              key={item.key}
              onClick={() => setActiveView(item.key)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex min-w-[64px] flex-1 flex-col items-center gap-1 px-2 py-2.5 text-[10px] font-medium transition-colors',
                active
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-muted-foreground',
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="truncate">{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
