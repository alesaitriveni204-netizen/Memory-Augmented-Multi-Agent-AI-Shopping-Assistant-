'use client'

import * as React from 'react'
import { Sparkles, Sun, Moon, Bell, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useTheme } from 'next-themes'
import { useAppStore, type NotificationItem } from '@/lib/store'
import { PERSONA_LABELS } from '@/lib/types'
import { relativeTime } from '@/lib/ui-utils'
import { OrbisLogo } from './orbis-logo'

export function Header() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  const user = useAppStore((s) => s.user)
  const notifications = useAppStore((s) => s.notifications)
  const unreadCount = useAppStore((s) => s.unreadCount)
  const setUnreadCount = useAppStore((s) => s.setUnreadCount)
  const setNotifications = useAppStore((s) => s.setNotifications)
  const notifOpen = useAppStore((s) => s.notifOpen)
  const setNotifOpen = useAppStore((s) => s.setNotifOpen)
  const setActiveView = useAppStore((s) => s.setActiveView)
  const setPendingChatInput = useAppStore((s) => s.setPendingChatInput)
  const [query, setQuery] = React.useState('')

  const persona = user?.personaCluster
    ? PERSONA_LABELS[user.personaCluster]
    : null

  async function markAllRead() {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_read' }),
      })
      setNotifications(
        notifications.map((n) => ({ ...n, read: true })),
      )
      setUnreadCount(0)
    } catch {
      /* noop */
    }
  }

  async function markOneRead(n: NotificationItem) {
    if (n.read) return
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_read', id: n.id }),
      })
      setNotifications(
        notifications.map((x) =>
          x.id === n.id ? { ...x, read: true } : x,
        ),
      )
      setUnreadCount(Math.max(0, unreadCount - 1))
    } catch {
      /* noop */
    }
  }

  function askOrbis() {
    const trimmed = query.trim()
    if (!trimmed) return
    setPendingChatInput(trimmed)
    setActiveView('chat')
    setQuery('')
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/75 backdrop-blur-xl supports-[backdrop-filter]:bg-background/55">
      {/* Subtle gradient accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
      <div className="flex h-16 items-center gap-3 px-3 md:px-6">
        <div className="flex items-center gap-2 min-w-0">
          <OrbisLogo />
          <div className="min-w-0 hidden sm:block">
            <div className="text-[10px] text-muted-foreground leading-tight truncate">
              Shopping intelligence, remembered
            </div>
          </div>
        </div>

        <form
          className="mx-auto hidden min-w-0 max-w-md flex-1 md:flex"
          onSubmit={(event) => {
            event.preventDefault()
            askOrbis()
          }}
        >
          <div className="orbis-glass flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-xs text-muted-foreground transition-colors focus-within:border-teal-400/60">
            <Search className="h-3.5 w-3.5 shrink-0 text-teal-500" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  askOrbis()
                }
              }}
              placeholder="Ask Orbis anything..."
              aria-label="Ask Orbis anything"
              className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
            />
            <button
              type="submit"
              aria-label="Send question to Orbis"
              className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-teal-500 transition-colors hover:bg-teal-500/10"
            >
              <Sparkles className="h-3.5 w-3.5" />
            </button>
          </div>
        </form>

        <div className="ml-auto flex items-center gap-2">
          {user?.hasOnboarded && persona && (
            <Badge
              variant="secondary"
              className="orbis-signal hidden md:inline-flex gap-1.5 px-2.5 py-1 text-xs"
              style={{
                backgroundColor: `${persona.color}1a`,
                color: persona.color,
                borderColor: `${persona.color}33`,
              }}
            >
              <span className="text-sm leading-none">{persona.emoji}</span>
              <span className="font-medium">{persona.label}</span>
              <span className="text-[10px] opacity-70">
                · {Math.round(user.twinConfidence || 0)}%
              </span>
            </Badge>
          )}

          <Popover open={notifOpen} onOpenChange={setNotifOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative h-9 w-9"
                aria-label="Notifications"
              >
                <Bell className={`h-5 w-5 ${unreadCount > 0 ? 'animate-pulse' : ''}`} />
                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 grid min-h-[18px] min-w-[18px] place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-background shadow-md">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0">
              <div className="flex items-center justify-between border-b px-3 py-2">
                <div className="text-sm font-semibold">Notifications</div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs text-emerald-600 hover:underline dark:text-emerald-400"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <ScrollArea className="max-h-96">
                <div className="flex flex-col">
                  {notifications.length === 0 && (
                    <div className="px-3 py-8 text-center text-xs text-muted-foreground">
                      No notifications yet
                    </div>
                  )}
                  {notifications.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => markOneRead(n)}
                      className="border-b px-3 py-2.5 text-left transition-colors hover:bg-muted/50 last:border-0"
                    >
                      <div className="flex items-start gap-2">
                        {!n.read && (
                          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-medium truncate">
                            {n.title}
                          </div>
                          <div className="text-[11px] text-muted-foreground line-clamp-2">
                            {n.message}
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            {relativeTime(n.createdAt)}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>

          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            aria-label="Toggle theme"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {mounted && theme === 'dark' ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </header>
  )
}
