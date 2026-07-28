'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  Check,
  ChevronRight,
  ChevronLeft,
  Loader2,
  PartyPopper,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Progress } from '@/components/ui/progress'
import { useAppStore } from '@/lib/store'
import { ALL_CATEGORIES, ALL_BRANDS, ALL_PLATFORMS } from '@/lib/ui-utils'
import { cn } from '@/lib/utils'
import { PERSONA_LABELS, type Platform } from '@/lib/types'
import { toast } from 'sonner'

const STEPS = [
  'Welcome',
  'Categories',
  'Budget',
  'Brands & Platforms',
  'Lifestyle',
  'Create',
]

const BUDGETS = [
  { value: 'low', label: 'Low', range: 'under ₹30k' },
  { value: 'mid', label: 'Mid', range: '₹30k–60k' },
  { value: 'high', label: 'High', range: '₹60k–120k' },
  { value: 'premium', label: 'Premium', range: 'above ₹120k' },
]

const FREQUENCIES = [
  { value: 'rarely', label: 'Rarely' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'daily', label: 'Daily' },
]

export function OnboardingWizard() {
  const [step, setStep] = React.useState(0)
  const [submitting, setSubmitting] = React.useState(false)
  const [result, setResult] = React.useState<{
    personaCluster: string
    twin: unknown
  } | null>(null)

  const setUser = useAppStore((s) => s.setUser)
  const setActiveView = useAppStore((s) => s.setActiveView)
  const setChatMessages = useAppStore((s) => s.setChatMessages)

  const [categories, setCategories] = React.useState<string[]>([])
  const [budgetRange, setBudgetRange] = React.useState('')
  const [brands, setBrands] = React.useState<string[]>([])
  const [platforms, setPlatforms] = React.useState<Platform[]>([])
  const [shoppingFrequency, setShoppingFrequency] = React.useState('monthly')
  const [discountImportance, setDiscountImportance] = React.useState(3)
  const [deliverySpeed, setDeliverySpeed] = React.useState(3)
  const [techFamiliarity, setTechFamiliarity] = React.useState(3)
  const [lifestyle, setLifestyle] = React.useState('')

  function toggle<T>(arr: T[], v: T, setter: (a: T[]) => void) {
    setter(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])
  }

  const canProceed = React.useMemo(() => {
    if (step === 0) return true
    if (step === 1) return categories.length > 0
    if (step === 2) return !!budgetRange
    if (step === 3) return brands.length > 0 && platforms.length > 0
    if (step === 4) return !!shoppingFrequency
    return true
  }, [step, categories, budgetRange, brands, platforms, shoppingFrequency])

  async function submit() {
    setSubmitting(true)
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categories,
          budgetRange,
          brands,
          platforms,
          shoppingFrequency,
          discountImportance,
          deliverySpeed,
          techFamiliarity,
          lifestyle,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data?.error || 'Onboarding failed')
        return
      }
      setUser(data.user)
      setResult({ personaCluster: data.personaCluster, twin: data.twin })
      // Pre-load chat history
      try {
        const histRes = await fetch('/api/chat/history')
        const hist = await histRes.json()
        if (hist.messages?.length > 0) {
          setChatMessages(hist.messages)
        }
      } catch {
        /* noop */
      }
    } catch {
      toast.error('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  function finish() {
    setActiveView('chat')
  }

  async function skipOnboarding() {
    setSubmitting(true)
    try {
      // Create a default "balanced" persona with sensible defaults
      const defaultData = {
        categories: ['laptop', 'phone', 'earbuds'],
        budgetRange: 'mid',
        brands: ['Apple', 'Samsung', 'Sony'],
        platforms: ['amazon', 'flipkart'],
        shoppingFrequency: 'monthly',
        discountImportance: 3,
        deliverySpeed: 3,
        techFamiliarity: 3,
        lifestyle: 'I prefer a balanced shopping approach.',
      }
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(defaultData),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data?.error || 'Skip failed')
        return
      }
      setUser(data.user)
      setResult({ personaCluster: data.personaCluster, twin: data.twin })
      toast.success('Skipped onboarding — default persona created')
    } catch {
      toast.error('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  const progress = ((step + 1) / STEPS.length) * 100

  return (
    <div className="mx-auto w-full max-w-2xl">
      {!result && (
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>
              Step {step + 1} of {STEPS.length}
            </span>
            <span>{STEPS[step]}</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>
      )}

      <AnimatePresence mode="wait">
        {!result ? (
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm"
          >
            {step === 0 && (
              <div className="text-center space-y-4">
                <div className="relative h-20 w-20 mx-auto overflow-hidden rounded-2xl shadow-lg ring-2 ring-emerald-500/20">
                  <img src="/logo.png" alt="AI Shopping OS" className="h-full w-full object-cover" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">
                    Welcome to{' '}
                    <span className="asos-text-shimmer">AI Shopping OS</span>
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
                    A memory-augmented, multi-agent shopping copilot that learns
                    your taste across Amazon, Flipkart, Myntra, Croma and more.
                    We'll build you a Digital Persona Twin in 60 seconds.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <div className="rounded-lg bg-muted/40 p-2.5">
                    <div className="font-semibold">🧠 Memory</div>
                    <div className="text-muted-foreground mt-0.5">
                      Learns what you love
                    </div>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-2.5">
                    <div className="font-semibold">⚡ 9 Agents</div>
                    <div className="text-muted-foreground mt-0.5">
                      Search, compare, score
                    </div>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-2.5">
                    <div className="font-semibold">🛍️ 9 Platforms</div>
                    <div className="text-muted-foreground mt-0.5">
                      One-stop shopping
                    </div>
                  </div>
                </div>

                {/* Skip option */}
                <div className="pt-2">
                  <button
                    onClick={skipOnboarding}
                    disabled={submitting}
                    className="text-[11px] text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors underline-offset-2 hover:underline"
                  >
                    Skip onboarding — I'll set up my preferences later
                  </button>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold">What do you shop for?</h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Pick all categories you're interested in.
                  </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ALL_CATEGORIES.map((c) => {
                    const active = categories.includes(c)
                    return (
                      <button
                        key={c}
                        onClick={() =>
                          toggle(categories, c, setCategories)
                        }
                        className={cn(
                          'flex items-center gap-2 rounded-lg border p-2.5 text-sm capitalize transition-all',
                          active
                            ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                            : 'border-border/60 hover:border-emerald-500/50 hover:bg-muted/40',
                        )}
                      >
                        <div
                          className={cn(
                            'grid h-5 w-5 place-items-center rounded-full border',
                            active
                              ? 'border-emerald-500 bg-emerald-500 text-white'
                              : 'border-muted-foreground/30',
                          )}
                        >
                          {active && <Check className="h-3 w-3" />}
                        </div>
                        {c}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold">Your budget range</h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    How much do you typically spend on a single product?
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {BUDGETS.map((b) => {
                    const active = budgetRange === b.value
                    return (
                      <button
                        key={b.value}
                        onClick={() => setBudgetRange(b.value)}
                        className={cn(
                          'rounded-xl border p-4 text-left transition-all',
                          active
                            ? 'border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500'
                            : 'border-border/60 hover:border-emerald-500/50',
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-semibold">{b.label}</div>
                          {active && (
                            <div className="grid h-5 w-5 place-items-center rounded-full bg-emerald-500 text-white">
                              <Check className="h-3 w-3" />
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {b.range}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold">
                    Brands & platforms you love
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Select your preferred brands and the platforms you shop on.
                  </p>
                </div>
                <div>
                  <Label className="text-xs font-semibold uppercase text-muted-foreground">
                    Brands ({brands.length})
                  </Label>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {ALL_BRANDS.map((b) => {
                      const active = brands.includes(b)
                      return (
                        <button
                          key={b}
                          onClick={() => toggle(brands, b, setBrands)}
                          className={cn(
                            'rounded-full border px-3 py-1 text-xs transition-all',
                            active
                              ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-medium'
                              : 'border-border/60 hover:bg-muted',
                          )}
                        >
                          {b}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-semibold uppercase text-muted-foreground">
                    Platforms ({platforms.length})
                  </Label>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {ALL_PLATFORMS.map((p) => {
                      const active = platforms.includes(p)
                      return (
                        <button
                          key={p}
                          onClick={() =>
                            toggle(platforms, p, setPlatforms)
                          }
                          className={cn(
                            'rounded-full border px-3 py-1 text-xs transition-all',
                            active
                              ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-medium'
                              : 'border-border/60 hover:bg-muted',
                          )}
                        >
                          {p}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold">
                    Lifestyle & shopping habits
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Help us understand how you shop.
                  </p>
                </div>

                <div>
                  <Label className="text-xs">Shopping frequency</Label>
                  <div className="mt-1.5 flex gap-1.5">
                    {FREQUENCIES.map((f) => (
                      <button
                        key={f.value}
                        onClick={() => setShoppingFrequency(f.value)}
                        className={cn(
                          'flex-1 rounded-lg border px-2 py-1.5 text-xs capitalize transition-all',
                          shoppingFrequency === f.value
                            ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-medium'
                            : 'border-border/60 hover:bg-muted',
                        )}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                <SliderRow
                  label="Discount importance"
                  value={discountImportance}
                  onChange={setDiscountImportance}
                  leftLabel="Whatever"
                  rightLabel="Must have deal"
                />
                <SliderRow
                  label="Delivery speed"
                  value={deliverySpeed}
                  onChange={setDeliverySpeed}
                  leftLabel="Patient"
                  rightLabel="Need it now"
                />
                <SliderRow
                  label="Tech familiarity"
                  value={techFamiliarity}
                  onChange={setTechFamiliarity}
                  leftLabel="Casual"
                  rightLabel="Expert"
                />

                <div>
                  <Label className="text-xs">
                    Tell us about your lifestyle (optional)
                  </Label>
                  <Textarea
                    rows={3}
                    value={lifestyle}
                    onChange={(e) => setLifestyle(e.target.value)}
                    placeholder="e.g. I'm a college student who games on weekends. I work from home and need a reliable laptop."
                    className="mt-1.5 text-xs resize-none"
                  />
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold">Ready to create your Twin</h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    We'll cluster your persona and initialize your Digital Twin
                    with the data you provided.
                  </p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3 space-y-1.5 text-xs">
                  <SummaryRow
                    label="Categories"
                    value={`${categories.length} selected`}
                  />
                  <SummaryRow
                    label="Budget"
                    value={
                      BUDGETS.find((b) => b.value === budgetRange)?.label ||
                      '—'
                    }
                  />
                  <SummaryRow
                    label="Brands"
                    value={`${brands.length} selected`}
                  />
                  <SummaryRow
                    label="Platforms"
                    value={`${platforms.length} connected`}
                  />
                  <SummaryRow
                    label="Frequency"
                    value={shoppingFrequency}
                  />
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="mt-6 flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                disabled={step === 0 || submitting}
                onClick={() => setStep((s) => Math.max(0, s - 1))}
              >
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>
              {step < STEPS.length - 1 ? (
                <Button
                  size="sm"
                  disabled={!canProceed}
                  onClick={() => setStep((s) => s + 1)}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  Continue <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  disabled={submitting}
                  onClick={submit}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Creating…
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" /> Create My Digital Persona
                      Twin
                    </>
                  )}
                </Button>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-8 text-center"
          >
            <div className="grid h-16 w-16 mx-auto place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg mb-4">
              <PartyPopper className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold">
              Your Digital Persona Twin is ready!
            </h2>
            {(() => {
              const persona = PERSONA_LABELS[result.personaCluster]
              return persona ? (
                <div className="mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2"
                  style={{
                    backgroundColor: `${persona.color}15`,
                    border: `1px solid ${persona.color}40`,
                  }}
                >
                  <span className="text-2xl">{persona.emoji}</span>
                  <div className="text-left">
                    <div className="text-[10px] text-muted-foreground uppercase">
                      Your persona cluster
                    </div>
                    <div
                      className="text-sm font-bold"
                      style={{ color: persona.color }}
                    >
                      {persona.label}
                    </div>
                  </div>
                </div>
              ) : null
            })()}
            <p className="mt-4 text-xs text-muted-foreground max-w-md mx-auto">
              Your twin has been initialized with 6 long-term memories. Ask the
              chat anything and watch the multi-agent system go to work.
            </p>
            <Button
              onClick={finish}
              className="mt-6 bg-emerald-600 hover:bg-emerald-700"
            >
              <Sparkles className="h-4 w-4" /> Start Chatting
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function SliderRow({
  label,
  value,
  onChange,
  leftLabel,
  rightLabel,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  leftLabel: string
  rightLabel: string
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <Label>{label}</Label>
        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
          {value}/5
        </span>
      </div>
      <Slider
        value={[value]}
        min={1}
        max={5}
        step={1}
        onValueChange={(v) => onChange(v[0])}
        className="mt-2"
      />
      <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground capitalize">{label}</span>
      <span className="font-medium capitalize">{value}</span>
    </div>
  )
}
