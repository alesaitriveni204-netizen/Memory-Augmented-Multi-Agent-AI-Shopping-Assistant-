'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Send, ArrowDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RecommendationCard } from '@/components/chat/recommendation-card'
import { AgentActivityPanel } from '@/components/chat/agent-activity-panel'
import { useAppStore, type ChatMessage } from '@/lib/store'
import { toast } from 'sonner'

const QUICK_SUGGESTIONS = [
  'Recommend a gaming laptop under ₹70,000',
  'Compare iPhone 15 Pro and Galaxy S24 Ultra',
  "Track price of Sony WF-1000XM5",
  "What's the best phone under ₹30,000?",
]

function MessageBubble({
  msg,
  onAskAi,
}: {
  msg: ChatMessage
  onAskAi: (q: string) => void
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
        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
          <Sparkles className="h-3.5 w-3.5" />
        </div>
      )}
      <div className={`min-w-0 max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words ${
            isUser
              ? 'bg-emerald-600 text-white rounded-br-md'
              : 'bg-muted text-foreground rounded-bl-md'
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
            </div>
          )}
      </div>
    </motion.div>
  )
}

export function ChatView() {
  const messages = useAppStore((s) => s.chatMessages)
  const addMessage = useAppStore((s) => s.addChatMessage)
  const loading = useAppStore((s) => s.chatLoading)
  const setLoading = useAppStore((s) => s.setChatLoading)
  const pendingInput = useAppStore((s) => s.pendingChatInput)
  const setPendingInput = useAppStore((s) => s.setPendingInput)

  const [input, setInput] = React.useState('')
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const [showScrollBtn, setShowScrollBtn] = React.useState(false)

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
        body: JSON.stringify({ message: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data?.error === 'not_onboarded') {
          toast.error('Please complete onboarding first')
        } else {
          toast.error(data?.error || 'Chat failed')
        }
      } else {
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

  const lastAssistant = [...messages]
    .reverse()
    .find((m) => m.role === 'assistant' && m.metadata)

  return (
    <div className="grid h-full grid-cols-1 gap-4 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_360px]">
      <div className="flex min-h-0 flex-col">
        {/* Messages */}
        <div
          className="relative flex-1 min-h-0"
        >
          <div
            ref={scrollRef}
            onScroll={onScroll}
            className="absolute inset-0 overflow-y-auto scrollbar-thin pr-1"
          >
            {messages.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center h-full text-center px-4 py-10">
                <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white mb-4 shadow-lg">
                  <Sparkles className="h-8 w-8" />
                </div>
                <h2 className="text-lg font-semibold">
                  Your AI Shopping Copilot
                </h2>
                <p className="mt-1 text-sm text-muted-foreground max-w-md">
                  Ask me anything about products, prices, or comparisons across
                  Amazon, Flipkart, Myntra, Croma and more. Your Digital Persona
                  Twin remembers what matters to you.
                </p>
                <div className="mt-5 flex flex-wrap gap-2 justify-center">
                  {QUICK_SUGGESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => send(q)}
                      className="rounded-full border border-border/60 bg-card/60 px-3 py-1.5 text-xs hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4 pb-4">
              <AnimatePresence initial={false}>
                {messages.map((m) => (
                  <MessageBubble key={m.id} msg={m} onAskAi={onAskAi} />
                ))}
              </AnimatePresence>

              {loading && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-2"
                >
                  <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>
                  <div className="rounded-2xl rounded-bl-md bg-muted px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="asos-dot h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="asos-dot h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="asos-dot h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="ml-2 text-[11px] text-muted-foreground">
                        Agents thinking…
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
        <div className="mt-3 flex items-end gap-2 rounded-2xl border border-border/60 bg-card/60 p-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send(input)
              }
            }}
            placeholder="Ask me to find, compare, or track any product…"
            rows={1}
            className="flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground max-h-32"
          />
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
      <div className="hidden lg:block">
        <div className="sticky top-0">
          <AgentActivityPanel
            intent={lastAssistant?.metadata?.intent}
            complexity={lastAssistant?.metadata?.complexity}
            ahde={lastAssistant?.metadata?.ahdePlan}
            agentsUsed={lastAssistant?.metadata?.agentsUsed}
            latencyMs={lastAssistant?.metadata?.latencyMs}
          />
        </div>
      </div>
    </div>
  )
}
