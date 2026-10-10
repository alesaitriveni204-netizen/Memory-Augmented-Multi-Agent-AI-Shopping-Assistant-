'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Send, ArrowDown, Mic, Square, Loader2, Search, X, History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RecommendationCard } from '@/components/chat/recommendation-card'
import { WebSearchPanel } from '@/components/chat/web-search-panel'
import { ImageSearchButton } from '@/components/chat/image-search-button'
import { AgentActivityPanel } from '@/components/chat/agent-activity-panel'
import { useAppStore, type ChatMessage } from '@/lib/store'
import { cn } from '@/lib/utils'
import { useVoiceInput } from '@/hooks/use-voice-input'
import { toast } from 'sonner'
import { ShopDittoMark } from '@/components/shell/orbis-logo'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const QUICK_SUGGESTIONS = [
  'Compare phones under ₹30k',
  'Track iPhone price',
  'Gift ideas for mom',
  'Recommend a gaming laptop under ₹70,000',
]

function MessageBubble({
  msg,
  onAskAi,
  userQuery,
}: {
  msg: ChatMessage
  onAskAi: (q: string) => void
  userQuery?: string
}) {
  const isUser = msg.role === 'user'
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} gap-2`}
    >
      {!isUser && (
        <ShopDittoMark className="h-7 w-7 shrink-0" />
      )}
      <div className={`min-w-0 max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words shadow-sm ${
            isUser
              ? 'bg-gradient-to-br from-indigo-600 to-teal-600 text-white rounded-br-md'
              : 'orbis-glass text-foreground rounded-bl-md'
          }`}
        >
          {msg.content}
        </div>

        {msg.metadata?.recommendations &&
          msg.metadata.recommendations.length > 0 && (
            <div className="mt-3 space-y-3">
              {msg.metadata.recommendations.map((r, i) => (
                <RecommendationCard key={`${r.productId}-${i}`} rec={r} onAskAi={onAskAi} />
              ))}
              {/* Web Intelligence panel — shows real-time web results for the user's query */}
              {userQuery && userQuery.length >= 5 && (
                <div className="mt-2">
                  <WebSearchPanel query={userQuery} />
                </div>
              )}
            </div>
          )}
      </div>
    </motion.div>
  )
}

export function ChatView() {
  const messages = useAppStore((s) => s.chatMessages)
  const activeChatSessionId = useAppStore((s) => s.activeChatSessionId)
  const chatSessions = useAppStore((s) => s.chatSessions)
  const addMessage = useAppStore((s) => s.addChatMessage)
  const setChatMessages = useAppStore((s) => s.setChatMessages)
  const setActiveChatSessionId = useAppStore((s) => s.setActiveChatSessionId)
  const setChatSessions = useAppStore((s) => s.setChatSessions)
  const loading = useAppStore((s) => s.chatLoading)
  const setLoading = useAppStore((s) => s.setChatLoading)
  const pendingInput = useAppStore((s) => s.pendingChatInput)
  const setPendingInput = useAppStore((s) => s.setPendingChatInput)

  const [input, setInput] = React.useState('')
  const [searchQuery, setSearchQuery] = React.useState('')
  const [showSearch, setShowSearch] = React.useState(false)
  const [historyOpen, setHistoryOpen] = React.useState(false)
  const [historySearch, setHistorySearch] = React.useState('')
  const [selectedHistoryId, setSelectedHistoryId] = React.useState<string | null>(null)
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const [showScrollBtn, setShowScrollBtn] = React.useState(false)

  // Filter messages by search query
  const filteredMessages = React.useMemo(() => {
    if (!searchQuery.trim()) return messages
    const q = searchQuery.toLowerCase()
    return messages.filter(
      (m) =>
        m.content.toLowerCase().includes(q) ||
        m.metadata?.recommendations?.some(
          (r) => r.name.toLowerCase().includes(q) || r.brand.toLowerCase().includes(q),
        ),
    )
  }, [messages, searchQuery])

  const voice = useVoiceInput((text) => {
    setInput((prev) => (prev ? prev + ' ' + text : text))
    toast.success('Voice transcribed')
  })
  React.useEffect(() => {
    if (voice.error) toast.error(`Voice error: ${voice.error}`)
  }, [voice.error])

  React.useEffect(() => {
    if (pendingInput) {
      setInput(pendingInput)
      setPendingInput(null)
    }
  }, [pendingInput, setPendingInput])

  // Auto-scroll to bottom
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading])

  function onScroll() {
    const el = scrollRef.current
    if (!el) return
    const atBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < 80
    setShowScrollBtn(!atBottom)
  }

  async function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: trimmed,
      createdAt: new Date().toISOString(),
    }
    addMessage(userMsg)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, sessionId: activeChatSessionId }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data?.error === 'not_onboarded') {
          toast.error('Please complete onboarding first')
        } else {
          toast.error(data?.error || 'Chat failed')
        }
      } else {
        if (data.sessionId && data.sessionId !== activeChatSessionId) {
          setActiveChatSessionId(data.sessionId)
        }
        // Normalize intent shape: data.intent may be an IntentResult
        // object { intent: string, complexity, category, ... } OR a string.
        const intentRaw = data.intent
        const intentStr =
          typeof intentRaw === 'string'
            ? intentRaw
            : (intentRaw?.intent ?? 'unknown')
        const complexity =
          typeof intentRaw === 'object'
            ? intentRaw?.complexity
            : undefined
        const assistantMsg: ChatMessage = {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: data.response,
          metadata: {
            intent: intentStr,
            complexity,
            agentsUsed: data.agentsUsed,
            ahdePlan: data.ahdePlan,
            recommendations: data.recommendations,
            latencyMs: data.latencyMs,
            traceId: data.messageId,
          },
          createdAt: new Date().toISOString(),
        }
        addMessage(assistantMsg)
        const sessionsRes = await fetch('/api/chat/sessions')
        if (sessionsRes.ok) {
          const sessionData = await sessionsRes.json()
          setChatSessions(sessionData.sessions || [])
        }
      }
    } catch (e) {
      toast.error('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  function onAskAi(q: string) {
    setInput(q)
    send(q)
  }

  function newChat() {
    const sessionId = `chat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    setActiveChatSessionId(sessionId)
    setChatMessages([])
    setSelectedHistoryId(null)
    setHistoryOpen(false)
    setInput('')
  }

  async function openHistorySession(sessionId: string) {
    const response = await fetch(`/api/chat/sessions/${encodeURIComponent(sessionId)}`)
    if (!response.ok) {
      toast.error('Could not load that conversation')
      return
    }
    const data = await response.json()
    setActiveChatSessionId(sessionId)
    setChatMessages(data.messages || [])
    setSelectedHistoryId(sessionId)
    setHistoryOpen(false)
  }

  const lastAssistant = [...messages]
    .reverse()
    .find((m) => m.role === 'assistant' && m.metadata)

  const filteredHistory = React.useMemo(() => {
    const query = historySearch.trim().toLowerCase()
    if (!query) return chatSessions
    return chatSessions.filter((session) =>
      `${session.title} ${session.searchText ?? ''}`.toLowerCase().includes(query),
    )
  }, [chatSessions, historySearch])

  return (
    <div className="grid h-full grid-cols-1 gap-4 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_360px]">
      <div className="flex min-h-0 flex-col">
        {/* Chat search bar */}
        {(
          <div className="flex items-center gap-2 pb-2">
            <button
              onClick={() => setHistoryOpen(true)}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border/60 px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Open chat history"
            >
              <History className="h-3 w-3" /> History
            </button>
            <button
              onClick={newChat}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border/60 px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Start a new chat"
            >
              <Sparkles className="h-3 w-3" /> New Chat
            </button>
            <button
              onClick={() => { setShowSearch(!showSearch); if (showSearch) setSearchQuery('') }}
              className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs transition-colors ${showSearch ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'border-border/60 text-muted-foreground hover:bg-muted'}`}
            >
              <Search className="h-3 w-3" /> Search
            </button>
            {showSearch && (
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search messages, products, brands…"
                  className="w-full rounded-lg border border-border/60 bg-card/60 pl-7 pr-3 py-1 text-xs outline-none focus:border-emerald-500/50"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            )}
            {searchQuery && (
              <span className="text-[10px] text-muted-foreground shrink-0">
                {filteredMessages.length} / {messages.length}
              </span>
            )}
          </div>
        )}

        {/* Messages */}
        <div
          className="relative flex-1 min-h-0"
        >
          <div
            ref={scrollRef}
            onScroll={onScroll}
            className="absolute inset-0 overflow-y-auto scrollbar-thin pr-1 pb-5"
          >
            {messages.length === 0 && !loading && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex min-h-full flex-col items-center justify-center text-center px-4 py-8"
              >
                {/* Hero with animated gradient */}
                    <div className="relative mb-5">
                      <div className="absolute inset-0 rounded-full bg-cs-primary-solid/10 blur-2xl" aria-hidden="true" />
                      <ShopDittoMark className="relative h-20 w-20" />
                </div>
                    <h2 className="text-xl font-bold tracking-tight">
                      Your AI shopping assistant
                </h2>
                <p className="mt-2 text-sm text-muted-foreground max-w-md leading-relaxed">
                  Find products, compare prices, or track a deal. shopDitto remembers what matters to you.
                </p>

                {/* Agent badges */}
                <div className="mt-4 flex flex-wrap gap-1.5 justify-center">
                  {['Search', 'Memory', 'Personalization', 'Price comparison'].map((agent) => (
                    <span key={agent} className="inline-flex items-center gap-1 rounded-md border border-border/70 bg-card px-2 py-1 text-[10px] font-medium text-muted-foreground">
                      <span className="h-1 w-1 rounded-full bg-cs-success" />
                      {agent}
                    </span>
                  ))}
                </div>

                {/* Quick suggestions */}
                <div className="mt-6 w-full max-w-lg">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Try asking
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {QUICK_SUGGESTIONS.map((q, i) => (
                      <motion.button
                        key={q}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + i * 0.05 }}
                        onClick={() => send(q)}
                        className="group min-h-12 rounded-md border border-border/70 bg-card p-3 text-left text-xs transition-all hover:-translate-y-0.5 hover:border-cs-primary-solid/50 hover:shadow-md"
                      >
                        <div className="flex items-start gap-2">
                          <div className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground transition-colors group-hover:text-cs-primary-solid">
                            <Sparkles className="h-3 w-3" />
                          </div>
                          <span className="leading-snug">{q}</span>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            <div className="space-y-4 pb-4">
              <AnimatePresence initial={false}>
                {filteredMessages.map((m) => {
                  // Find the most recent user message before this assistant message
                  let userQuery: string | undefined
                  if (m.role === 'assistant' && m.metadata?.recommendations?.length) {
                    const messageIndex = messages.findIndex((message) => message.id === m.id)
                    for (let j = messageIndex - 1; j >= 0; j--) {
                      if (messages[j].role === 'user') {
                        userQuery = messages[j].content
                        break
                      }
                    }
                  }
                  return (
                    <MessageBubble key={m.id} msg={m} onAskAi={onAskAi} userQuery={userQuery} />
                  )
                })}
              </AnimatePresence>

              {loading && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-2"
                >
                  <ShopDittoMark className="shopditto-thinking h-7 w-7 shrink-0" />
                  <div className="rounded-2xl rounded-bl-md bg-muted px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground" aria-live="polite">
                        shopDitto is thinking…
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          {showScrollBtn && (
            <button
              onClick={() => {
                if (scrollRef.current) {
                  scrollRef.current.scrollTo({
                    top: scrollRef.current.scrollHeight,
                    behavior: 'smooth',
                  })
                }
              }}
              className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 grid h-8 w-8 place-items-center rounded-full bg-background border border-border shadow-md hover:bg-muted"
              aria-label="Scroll to latest"
            >
              <ArrowDown className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Input */}
        <div className="cs-composer mt-3 flex items-end gap-2 rounded-xl border border-border/70 bg-card p-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send(input)
              }
            }}
            placeholder={voice.recording ? '🎤 Listening… speak now' : voice.transcribing ? 'Transcribing…' : 'Ask me to find, compare, or track any product…'}
            rows={1}
            className="flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground max-h-32"
          />
          <ImageSearchButton />
          <Button
            size="icon"
            variant="ghost"
            onClick={voice.toggle}
            disabled={voice.transcribing || loading}
            className={`h-9 w-9 shrink-0 transition-all ${voice.recording ? 'bg-rose-500/15 text-rose-500 animate-pulse' : 'text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10'}`}
            aria-label={voice.recording ? 'Stop recording' : 'Voice input'}
            title={voice.recording ? 'Stop recording' : 'Voice input'}
          >
            {voice.transcribing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : voice.recording ? (
              <Square className="h-4 w-4 fill-current" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </Button>
          <Button
            size="icon"
            onClick={() => send(input)}
            disabled={!input.trim() || loading}
            className="h-9 w-9 shrink-0 bg-emerald-600 hover:bg-emerald-700"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Agent Activity Panel — desktop */}
      <div className="hidden min-h-0 lg:flex lg:flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin pr-1">
          <AgentActivityPanel
            intent={lastAssistant?.metadata?.intent}
            complexity={lastAssistant?.metadata?.complexity}
            ahde={lastAssistant?.metadata?.ahdePlan}
            agentsUsed={lastAssistant?.metadata?.agentsUsed}
            latencyMs={lastAssistant?.metadata?.latencyMs}
          />
        </div>
      </div>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent
          className="inset-y-0 right-0 left-auto top-0 h-[100dvh] w-[min(100%,24rem)] max-w-none translate-x-0 translate-y-0 gap-0 rounded-none border-y-0 border-r-0 p-0 sm:max-w-none"
        >
          <DialogHeader className="border-b px-4 py-4 pr-12 text-left">
            <DialogTitle>Chat History</DialogTitle>
            <DialogDescription>Recent conversations from the last 15 days.</DialogDescription>
          </DialogHeader>
          <div className="flex min-h-0 flex-1 flex-col p-4">
            <div className="relative shrink-0">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={historySearch}
                onChange={(event) => setHistorySearch(event.target.value)}
                placeholder="Search chats"
                className="w-full rounded-lg border border-border/60 bg-card/60 py-2 pl-8 pr-3 text-xs outline-none focus:border-emerald-500/50"
                autoFocus
              />
            </div>
            <div className="mt-4 min-h-0 flex-1 space-y-1 overflow-y-auto scrollbar-thin pr-1">
              {filteredHistory.length === 0 ? (
                <p className="py-8 text-center text-xs text-muted-foreground">
                  No chats found in the last 15 days.
                </p>
              ) : (
                filteredHistory.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => openHistorySession(session.id)}
                    className={cn(
                      'w-full rounded-lg border px-3 py-2.5 text-left transition-colors',
                      selectedHistoryId === session.id
                        ? 'border-emerald-500/40 bg-emerald-500/10'
                        : 'border-transparent hover:border-border/60 hover:bg-muted/60',
                    )}
                  >
                    <span className="block break-words text-xs font-medium">{session.title}</span>
                    <span className="mt-1 block text-[10px] text-muted-foreground">
                      {new Date(session.updatedAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
