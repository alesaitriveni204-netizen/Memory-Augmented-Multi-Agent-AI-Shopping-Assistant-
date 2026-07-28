'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Header } from '@/components/shell/header'
import { Sidebar, BottomNav } from '@/components/shell/sidebar'
import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard'
import { ChatView } from '@/components/views/chat-view'
import { DiscoverView } from '@/components/views/discover-view'
import { WishlistView } from '@/components/views/wishlist-view'
import { MemoryView } from '@/components/views/memory-view'
import { DigitalTwinView } from '@/components/views/digital-twin-view'
import { TimelineView } from '@/components/views/timeline-view'
import { InsightsView } from '@/components/views/insights-view'
import { SettingsView } from '@/components/views/settings-view'
import { useAppStore } from '@/lib/store'

export default function Home() {
  const booted = useAppStore((s) => s.booted)
  const setBooted = useAppStore((s) => s.setBooted)
  const bootError = useAppStore((s) => s.bootError)
  const setBootError = useAppStore((s) => s.setBootError)
  const user = useAppStore((s) => s.user)
  const setUser = useAppStore((s) => s.setUser)
  const activeView = useAppStore((s) => s.activeView)
  const setChatMessages = useAppStore((s) => s.setChatMessages)
  const setNotifications = useAppStore((s) => s.setNotifications)
  const setUnreadCount = useAppStore((s) => s.setUnreadCount)

  // Boot: fetch init + chat history + notifications in parallel
  const { refetch: bootRefetch } = useQuery({
    queryKey: ['boot'],
    queryFn: async () => {
      const [initRes, histRes, notifRes] = await Promise.all([
        fetch('/api/init'),
        fetch('/api/chat/history').catch(() => null),
        fetch('/api/notifications').catch(() => null),
      ])
      const initData = await initRes.json()
      setUser(initData.user)

      if (histRes?.ok) {
        const hist = await histRes.json()
        if (hist.messages) {
          setChatMessages(
            hist.messages.map((m: Record<string, unknown>) => ({
              id: String(m.id ?? Math.random()),
              role: m.role as 'user' | 'assistant',
              content: String(m.content ?? ''),
              metadata: m.metadata as never,
              createdAt: String(m.createdAt ?? new Date().toISOString()),
            })),
          )
        }
      }
      if (notifRes?.ok) {
        const notif = await notifRes.json()
        const items = (notif.notifications || []).map(
          (n: Record<string, unknown>) => ({
            id: String(n.id),
            type: String(n.type ?? ''),
            title: String(n.title ?? ''),
            message: String(n.message ?? ''),
            productId: n.productId ? String(n.productId) : undefined,
            read: Boolean(n.read),
            createdAt: String(n.createdAt ?? new Date().toISOString()),
          }),
        )
        setNotifications(items)
        setUnreadCount(items.filter((n: { read: boolean }) => !n.read).length)
      }
      setBooted(true)
      setBootError(null)
      return initData
    },
    enabled: !booted,
    retry: 1,
  })

  React.useEffect(() => {
    if (!booted) bootRefetch()
  }, [booted, bootRefetch])

  // If user has just onboarded, push welcome message via chat
  React.useEffect(() => {
    if (booted && user?.hasOnboarded) {
      // Auto-send a welcome message ONCE if chat is empty
      const alreadyWelcomed = localStorage.getItem('asos-welcomed')
      if (!alreadyWelcomed) {
        localStorage.setItem('asos-welcomed', '1')
        ;(async () => {
          try {
            const res = await fetch('/api/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                message:
                  "Hi! I've set up my Digital Persona Twin. Ask me to recommend something!",
              }),
            })
            if (res.ok) {
              const data = await res.json()
              const histRes = await fetch('/api/chat/history')
              if (histRes.ok) {
                const hist = await histRes.json()
                if (hist.messages) {
                  setChatMessages(
                    hist.messages.map((m: Record<string, unknown>) => ({
                      id: String(m.id ?? Math.random()),
                      role: m.role as 'user' | 'assistant',
                      content: String(m.content ?? ''),
                      metadata: m.metadata as never,
                      createdAt: String(
                        m.createdAt ?? new Date().toISOString(),
                      ),
                    })),
                  )
                }
              }
            }
          } catch {
            /* noop */
          }
        })()
      }
    }
  }, [booted, user?.hasOnboarded, setChatMessages])

  const showOnboarding = booted && user && !user.hasOnboarded

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <div className="flex flex-1 min-h-0">
        {!showOnboarding && <Sidebar />}

        <main className="flex-1 min-w-0 flex flex-col">
          {bootError ? (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center max-w-md">
                <div className="text-rose-500 font-semibold mb-2">
                  Boot failed
                </div>
                <p className="text-sm text-muted-foreground">{bootError}</p>
                <button
                  onClick={() => bootRefetch()}
                  className="mt-3 rounded-md bg-emerald-600 px-3 py-1.5 text-sm text-white"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : !booted ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white animate-pulse">
                  <SparklesIcon />
                </div>
                <div className="text-xs text-muted-foreground">
                  Initializing AI Shopping OS…
                </div>
              </div>
            </div>
          ) : showOnboarding ? (
            <div className="flex-1 overflow-y-auto scrollbar-thin p-4 md:p-8">
              <OnboardingWizard />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto scrollbar-thin p-4 md:p-6 pb-20 md:pb-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeView}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="min-h-[calc(100vh-12rem)] h-full"
                >
                  {activeView === 'chat' && <ChatView />}
                  {activeView === 'discover' && <DiscoverView />}
                  {activeView === 'wishlist' && <WishlistView />}
                  {activeView === 'memory' && <MemoryView />}
                  {activeView === 'twin' && <DigitalTwinView />}
                  {activeView === 'timeline' && <TimelineView />}
                  {activeView === 'insights' && <InsightsView />}
                  {activeView === 'settings' && <SettingsView />}
                </motion.div>
              </AnimatePresence>
            </div>
          )}
        </main>
      </div>

      {!showOnboarding && <BottomNav />}

      <footer
        className="mt-auto border-t border-border/60 bg-background/80 px-4 py-2 text-center text-[10px] text-muted-foreground"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 0.5rem)' }}
      >
        AI Shopping OS · Cross-Platform Shopping Intelligence ·{' '}
        {booted
          ? (user?.hasOnboarded ? 'Personalization Active' : 'Onboarding')
          : 'Booting…'}
      </footer>
    </div>
  )
}

function SparklesIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
    </svg>
  )
}
