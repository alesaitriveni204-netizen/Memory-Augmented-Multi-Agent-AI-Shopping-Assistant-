'use client'

import * as React from 'react'
import {
  MessageSquare,
  Compass,
  Heart,
  Users,
  BarChart3,
  Settings,
  GraduationCap,
  CalendarDays,
  GitCompare,
  MoreHorizontal,
  House,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore, type ViewKey } from '@/lib/store'
import { ShopDittoMark, OrbisLogo } from './orbis-logo'

const PRIMARY_ITEMS: {
  key: ViewKey
  label: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
  { key: 'home', label: 'Home', icon: House },
  { key: 'chat', label: 'Chat', icon: MessageSquare },
  { key: 'discover', label: 'Discover', icon: Compass },
  { key: 'wishlist', label: 'Wishlist', icon: Heart },
  { key: 'twin', label: 'Digital Twin', icon: Users },
]

const SECONDARY_ITEMS: {
  key: ViewKey
  label: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
  { key: 'coach', label: 'Coach', icon: GraduationCap },
  { key: 'sales', label: 'Sales', icon: CalendarDays },
  { key: 'insights', label: 'Insights', icon: BarChart3 },
]

export function Sidebar() {
  const activeView = useAppStore((s) => s.activeView)
  const setActiveView = useAppStore((s) => s.setActiveView)
  const compareOpen = useAppStore((s) => s.compareOpen)
  const setCompareOpen = useAppStore((s) => s.setCompareOpen)
  const [collapsed, setCollapsed] = React.useState(false)

  function renderItem(item: (typeof PRIMARY_ITEMS)[number]) {
    const Icon = item.icon
    const active = activeView === item.key
    return (
      <button
        key={item.key}
        onClick={() => setActiveView(item.key)}
        aria-current={active ? 'page' : undefined}
        title={collapsed ? item.label : undefined}
        className={cn(
          'group relative flex min-h-10 w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
          collapsed && 'justify-center px-2',
          active
            ? 'bg-sidebar-accent font-semibold text-foreground'
            : 'text-muted-foreground hover:bg-sidebar-accent/70 hover:text-foreground',
        )}
      >
        {active && <span className="cs-ribbon-edge" aria-hidden="true" />}
        <Icon className={cn('h-[18px] w-[18px] shrink-0', active && 'text-cs-primary-solid')} />
        {!collapsed && <span className="truncate">{item.label}</span>}
        {active && !collapsed && <ShopDittoMark className="ml-auto h-4 w-4" />}
      </button>
    )
  }

  return (
    <nav
      aria-label="Primary"
      className={cn(
        'my-3 ml-3 hidden shrink-0 flex-col gap-1 overflow-y-auto scrollbar-thin rounded-3xl border border-sidebar-border bg-sidebar/75 p-3 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.9)] backdrop-blur-xl transition-[width] duration-200 lg:flex',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      <div className={cn('shopditto-brand-panel relative mb-4 rounded-xl px-2 pb-2 pt-2', collapsed ? 'flex min-h-12 items-center justify-center' : 'min-h-[6.25rem]')}>
        {!collapsed && (
          <div className="flex min-w-0 items-start justify-between gap-2">
            <div className="min-w-0">
              <OrbisLogo />
              <p className="mt-1 pl-11 text-[10px] leading-4 text-muted-foreground">Shopping intelligence, remembered</p>
            </div>
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </div>
        )}
        {collapsed && <ShopDittoMark className="h-8 w-8" />}
        {collapsed && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="absolute grid h-9 w-9 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
            aria-label="Expand sidebar"
            title="Expand sidebar"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        )}
      </div>
      {!collapsed && <div className="px-2 pb-2 pt-1 text-[10px] font-semibold uppercase text-muted-foreground">Shop</div>}
      {PRIMARY_ITEMS.slice(0, 3).map(renderItem)}
      <button
        onClick={() => setCompareOpen(true)}
        aria-current={compareOpen ? 'page' : undefined}
        title={collapsed ? 'Compare' : undefined}
        className={cn('group relative flex min-h-10 w-full items-center gap-3 rounded-md px-3 py-2 text-sm', collapsed && 'justify-center px-2', compareOpen ? 'bg-sidebar-accent font-semibold text-foreground' : 'text-muted-foreground hover:bg-sidebar-accent/70 hover:text-foreground')}
      >
        {compareOpen && <span className="cs-ribbon-edge" aria-hidden="true" />}
        <GitCompare className={cn('h-[18px] w-[18px] shrink-0', compareOpen && 'text-cs-primary-solid')} />
        {!collapsed && <span>Compare</span>}
      </button>
      {PRIMARY_ITEMS.slice(3).map(renderItem)}
      {!collapsed && <div className="mt-4 px-2 pb-2 pt-1 text-[10px] font-semibold uppercase text-muted-foreground">Intelligence</div>}
      {SECONDARY_ITEMS.map(renderItem)}
      <div className={cn('mt-auto border-t border-border/60 pt-3', collapsed && 'flex flex-col items-center')}>
        {renderItem({ key: 'settings', label: 'Settings', icon: Settings })}
      </div>
      {!collapsed && <div className="mx-1 mt-3 rounded-md border border-border/60 bg-card p-3">
        <div className="flex items-center gap-2 text-xs font-semibold">
          <ShopDittoMark className="h-6 w-6 shrink-0" />
          <span>Your shopDitto Twin</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>Learning continuously</span>
          <span className="text-cs-success">Live</span>
        </div>
      </div>}
    </nav>
  )
}

export function BottomNav() {
  const activeView = useAppStore((s) => s.activeView)
  const setActiveView = useAppStore((s) => s.setActiveView)
  const compareOpen = useAppStore((s) => s.compareOpen)
  const setCompareOpen = useAppStore((s) => s.setCompareOpen)
  const [moreOpen, setMoreOpen] = React.useState(false)

  return (
    <>
      <nav
        aria-label="Primary mobile"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="mx-auto flex max-w-xl items-stretch">
          {PRIMARY_ITEMS.slice(0, 3).map((item) => {
            const Icon = item.icon
            const active = activeView === item.key
            return <button key={item.key} onClick={() => setActiveView(item.key)} aria-current={active ? 'page' : undefined} className={cn('relative flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 text-[10px]', active ? 'text-foreground' : 'text-muted-foreground')}><Icon className="h-5 w-5" /><span>{item.label}</span>{active && <ShopDittoMark className="absolute bottom-1 h-2.5 w-2.5" />}</button>
          })}
          <button onClick={() => setCompareOpen(true)} aria-current={compareOpen ? 'page' : undefined} className={cn('relative flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 text-[10px]', compareOpen ? 'text-foreground' : 'text-muted-foreground')}><GitCompare className="h-5 w-5" /><span>Compare</span>{compareOpen && <ShopDittoMark className="absolute bottom-1 h-2.5 w-2.5" />}</button>
          {PRIMARY_ITEMS.slice(3, 4).map((item) => {
            const Icon = item.icon
            const active = activeView === item.key
            return <button key={item.key} onClick={() => setActiveView(item.key)} aria-current={active ? 'page' : undefined} className={cn('relative flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 text-[10px]', active ? 'text-foreground' : 'text-muted-foreground')}><Icon className="h-5 w-5" /><span>{item.label}</span>{active && <ShopDittoMark className="absolute bottom-1 h-2.5 w-2.5" />}</button>
          })}
          <button onClick={() => setMoreOpen(true)} aria-expanded={moreOpen} className="flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 text-[10px] text-muted-foreground"><MoreHorizontal className="h-5 w-5" /><span>More</span></button>
        </div>
      </nav>
      {moreOpen && <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="More navigation">
        <button className="absolute inset-0 bg-black/50" aria-label="Close navigation" onClick={() => setMoreOpen(false)} />
        <div className="absolute inset-x-0 bottom-0 rounded-t-2xl border border-border bg-card p-5 pb-[max(env(safe-area-inset-bottom),1.25rem)] shadow-2xl">
          <div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">More</h2><button className="grid h-10 w-10 place-items-center rounded-md hover:bg-muted" aria-label="Close navigation" onClick={() => setMoreOpen(false)}><X className="h-5 w-5" /></button></div>
          <div className="grid grid-cols-2 gap-2">
            {[...PRIMARY_ITEMS.slice(4), ...SECONDARY_ITEMS, { key: 'settings' as ViewKey, label: 'Settings', icon: Settings }].map((item) => {
              const Icon = item.icon
              return <button key={item.key} onClick={() => { setActiveView(item.key); setMoreOpen(false) }} className="flex min-h-12 items-center gap-3 rounded-md border border-border/70 px-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"><Icon className="h-4 w-4" />{item.label}</button>
            })}
          </div>
        </div>
      </div>}
    </>
  )
}
