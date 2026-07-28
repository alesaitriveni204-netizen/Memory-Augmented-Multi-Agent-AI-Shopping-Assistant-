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
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore, type ViewKey } from '@/lib/store'

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
  { key: 'timeline', label: 'Timeline', icon: Activity },
  { key: 'insights', label: 'Insights', icon: BarChart3 },
  { key: 'settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const activeView = useAppStore((s) => s.activeView)
  const setActiveView = useAppStore((s) => s.setActiveView)

  return (
    <nav
      aria-label="Primary"
      className="hidden md:flex md:w-56 lg:w-60 shrink-0 flex-col gap-1 border-r border-border/60 bg-sidebar/40 p-3"
    >
      <div className="px-2 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Navigation
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
              'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
              active
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <Icon
              className={cn(
                'h-4 w-4 shrink-0',
                active
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-muted-foreground group-hover:text-foreground',
              )}
            />
            <span className="truncate">{item.label}</span>
            {active && (
              <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-500" />
            )}
          </button>
        )
      })}
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
