'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  GraduationCap,
  TrendingUp,
  TrendingDown,
  Lightbulb,
  Target,
  PiggyBank,
  Clock,
  Award,
  Sparkles,
  ArrowRight,
  Brain,
  Zap,
  Star,
  Loader2,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useAppStore } from '@/lib/store'
import { PERSONA_LABELS } from '@/lib/types'
import { toast } from 'sonner'

// Map LLM-returned icon names to Lucide components
const ICON_MAP = {
  lightbulb: Lightbulb,
  'trending-down': TrendingDown,
  'trending-up': TrendingUp,
  target: Target,
  'piggy-bank': PiggyBank,
  clock: Clock,
  award: Award,
  sparkles: Sparkles,
  zap: Zap,
  brain: Brain,
  star: Star,
}

// Map LLM-returned categories to color classes
const COLOR_MAP = {
  spending: 'bg-rose-500/15 text-rose-500',
  saving: 'bg-emerald-500/15 text-emerald-500',
  habits: 'bg-amber-500/15 text-amber-500',
  discovery: 'bg-teal-500/15 text-teal-500',
  quality: 'bg-purple-500/15 text-purple-500',
}

interface TwinResponse {
  twin: DigitalTwinData | null
  confidence: number
  personaCluster: string
  personalizationEnabled: boolean
  history: any[]
}

interface DigitalTwinData {
  shoppingStyle: string
  budgetFlexibility: number
  brandLoyalty: number
  priceSensitivity: number
  purchaseConfidence: number
  technologyAdoption: number
  impulseBuyingScore: number
  discountPreference: number
  comparisonFrequency: number
  shoppingConsistency: number
  preferredCategories: string[]
  preferredBrands: string[]
  preferredPlatforms: string[]
  riskTolerance: string
  lifestyle: string
}

export function CoachView() {
  const user = useAppStore((s) => s.user)
  const setActiveView = useAppStore((s) => s.setActiveView)
  const setPendingChatInput = useAppStore((s) => s.setPendingChatInput)

  const { data, isLoading } = useQuery<TwinResponse>({
    queryKey: ['coach-twin'],
    queryFn: async () => {
      const res = await fetch('/api/digital-twin')
      return res.json()
    },
  })

  const twin = data?.twin
  const persona = data?.personaCluster ? PERSONA_LABELS[data.personaCluster] : null
  const confidence = data?.confidence ?? 0

  // Fetch LLM-powered coaching tips
  const { data: llmTipsData, isLoading: tipsLoading } = useQuery<{
    tips: Array<{ title: string; body: string; icon: string; category: string; action?: string; actionQuery?: string }>;
    summary: string;
  }>({
    queryKey: ['coach-tips', confidence],
    queryFn: async () => {
      const res = await fetch('/api/coach/tips', { method: 'POST' })
      return res.json()
    },
    enabled: !!twin,
    staleTime: 60 * 1000, // 1 min
  })

  // Use LLM tips if available, otherwise fall back to rule-based
  const tips = React.useMemo(() => {
    if (llmTipsData?.tips && llmTipsData.tips.length > 0) {
      return llmTipsData.tips.map((t) => ({
        title: t.title,
        body: t.body,
        icon: ICON_MAP[t.icon as keyof typeof ICON_MAP] ?? Lightbulb,
        color: COLOR_MAP[t.category as keyof typeof COLOR_MAP] ?? 'bg-amber-500/15 text-amber-500',
        action: t.action,
        actionQuery: t.actionQuery,
      }))
    }
    return generateTips(twin, user?.name)
  }, [llmTipsData, twin, user?.name])

  // Generate smart goals
  const goals = React.useMemo(() => generateGoals(twin), [twin])

  // Generate savings opportunities
  const savings = React.useMemo(() => generateSavingsOpportunities(twin), [twin])

  if (isLoading || !twin) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-3">
          <div className="animate-pulse grid h-14 w-14 mx-auto place-items-center rounded-2xl bg-emerald-500/15 text-emerald-500">
            <GraduationCap className="h-7 w-7" />
          </div>
          <p className="text-sm text-muted-foreground">Loading your personalized coaching…</p>
        </div>
      </div>
    )
  }

  function askCoach(query: string) {
    setPendingChatInput(query)
    setActiveView('chat')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">Your Shopping Coach</h1>
            <p className="text-sm text-muted-foreground">
              AI-powered advice tailored to your Digital Twin
            </p>
          </div>
        </div>
      </motion.div>

      {/* Persona summary card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <Card className="overflow-hidden border-emerald-500/20">
          <div className="relative p-5 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent">
            <div className="absolute top-0 right-0 h-32 w-32 bg-emerald-500/10 rounded-full blur-3xl" />
            <div className="relative flex flex-wrap items-center gap-4">
              <div
                className="grid h-16 w-16 place-items-center rounded-2xl text-3xl shadow-md"
                style={{ background: `${persona?.color ?? '#10b981'}25`, border: `1px solid ${persona?.color ?? '#10b981'}40` }}
              >
                {persona?.emoji ?? '🎯'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Persona</div>
                <div className="text-lg font-bold">{persona?.label ?? 'Shopper'}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{twin.shoppingStyle} · {twin.riskTolerance} risk</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Twin Confidence</div>
                <div className="text-2xl font-bold text-emerald-500">{confidence}%</div>
                <div className="text-[10px] text-muted-foreground">{confidence < 40 ? 'Learning you' : confidence < 70 ? 'Getting accurate' : 'Highly accurate'}</div>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Coaching Tips */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-3"
      >
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          <h2 className="text-sm font-semibold uppercase tracking-wider">Personalized Tips</h2>
          {tipsLoading && (
            <span className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> AI generating…
            </span>
          )}
          {llmTipsData?.summary && !tipsLoading && (
            <span className="ml-auto text-[10px] text-muted-foreground italic truncate max-w-[200px] hidden sm:block" title={llmTipsData.summary}>
              {llmTipsData.summary}
            </span>
          )}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {tips.map((tip, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
            >
              <Card className="p-4 hover:border-emerald-500/40 transition-colors group h-full">
                <div className="flex items-start gap-3">
                  <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${tip.color}`}>
                    <tip.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{tip.title}</div>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{tip.body}</p>
                    {tip.action && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="mt-2 h-7 text-xs px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 -ml-2"
                        onClick={() => askCoach(tip.actionQuery!)}
                      >
                        {tip.action}
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Smart Goals */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="space-y-3"
      >
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-rose-500" />
          <h2 className="text-sm font-semibold uppercase tracking-wider">Smart Goals</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {goals.map((goal, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.05 }}
            >
              <Card className="p-4 hover:border-emerald-500/40 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <goal.icon className="h-5 w-5 text-emerald-500" />
                  <Badge variant="outline" className="text-[10px]">{goal.progress}%</Badge>
                </div>
                <div className="font-semibold text-sm">{goal.title}</div>
                <p className="text-xs text-muted-foreground mt-1">{goal.description}</p>
                <Progress value={goal.progress} className="h-1.5 mt-3" />
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Savings Opportunities */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-3"
      >
        <div className="flex items-center gap-2">
          <PiggyBank className="h-4 w-4 text-emerald-500" />
          <h2 className="text-sm font-semibold uppercase tracking-wider">Savings Opportunities</h2>
        </div>
        <Card className="p-4 bg-gradient-to-br from-emerald-500/5 to-transparent">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {savings.map((s, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${s.bg}`}>
                  <s.icon className={`h-4 w-4 ${s.fg}`} />
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-sm">{s.title}</div>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* Ask the Coach CTA */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <Card className="p-5 border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-teal-500/5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <div className="font-semibold">Want more personalized advice?</div>
                <p className="text-xs text-muted-foreground">Ask the AI coach anything about your shopping habits</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => askCoach('What should I buy during the next sale based on my preferences?')}>
                Sale strategy
              </Button>
              <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => askCoach('Analyze my shopping habits and suggest where I can save money')}>
                Save money
              </Button>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-xs h-8" onClick={() => askCoach('What products would suit my lifestyle best right now?')}>
                <Zap className="h-3.5 w-3.5 mr-1" /> Recommend for me
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  )
}

// ── Coaching logic ────────────────────────────────────────────────────────────

interface Tip {
  title: string
  body: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  action?: string
  actionQuery?: string
}

function generateTips(twin: DigitalTwinData | null, userName?: string): Tip[] {
  if (!twin) return []
  const tips: Tip[] = []
  const name = userName ? `, ${userName.split(' ')[0]}` : ''

  // Price sensitivity tip
  if (twin.priceSensitivity > 70) {
    tips.push({
      title: 'You love a great deal',
      body: `Your price sensitivity is ${twin.priceSensitivity}/100${name}. You comparison-shop like a pro. Consider setting up price-drop alerts on your wishlist — you'll catch the best deals automatically.`,
      icon: TrendingDown,
      color: 'bg-emerald-500/15 text-emerald-500',
      action: 'Track my wishlist prices',
      actionQuery: 'Set up price drop alerts for all my wishlist items',
    })
  } else if (twin.priceSensitivity < 30) {
    tips.push({
      title: 'You value quality over price',
      body: `With low price sensitivity (${twin.priceSensitivity}/100), you prioritize quality. Make sure you're still checking cross-platform prices — even premium products vary 5-15% between Amazon and Flipkart.`,
      icon: TrendingUp,
      color: 'bg-amber-500/15 text-amber-500',
      action: 'Compare premium options',
      actionQuery: 'Show me the best premium laptops across all platforms',
    })
  }

  // Tech adoption tip
  if (twin.technologyAdoption > 75) {
    tips.push({
      title: 'Early adopter energy',
      body: `Your tech adoption is ${twin.technologyAdoption}/100. You gravitate to cutting-edge products. Watch for new launches on Croma and Reliance Digital — they often get stock before Amazon.`,
      icon: Zap,
      color: 'bg-purple-500/15 text-purple-500',
      action: 'See latest tech',
      actionQuery: 'What are the newest tech products available across platforms?',
    })
  }

  // Impulse buying tip
  if (twin.impulseBuyingScore > 60) {
    tips.push({
      title: 'Tame impulse purchases',
      body: `Your impulse buying score is ${twin.impulseBuyingScore}/100. Try the 24-hour rule: add items to your wishlist, then revisit tomorrow. The AI will re-rank based on your true preferences.`,
      icon: Clock,
      color: 'bg-rose-500/15 text-rose-500',
      action: 'Review my wishlist',
      actionQuery: 'Show me my wishlist and help me decide what to actually buy',
    })
  } else if (twin.impulseBuyingScore < 30) {
    tips.push({
      title: 'Thoughtful shopper',
      body: `With a low impulse score (${twin.impulseBuyingScore}/100), you buy deliberately. This saves money long-term. Use the Compare tool to make even better decisions on big purchases.`,
      icon: Award,
      color: 'bg-cyan-500/15 text-cyan-500',
      action: 'Compare products',
      actionQuery: 'Compare the top-rated laptops side by side',
    })
  }

  // Brand loyalty tip
  if (twin.brandLoyalty > 65) {
    tips.push({
      title: 'Loyal to your brands',
      body: `Brand loyalty ${twin.brandLoyalty}/100. You stick with what works. But exploring alternatives in the same tier could reveal better value — let me show you comparable options from other brands.`,
      icon: Brain,
      color: 'bg-indigo-500/15 text-indigo-500',
      action: 'Find alternatives',
      actionQuery: 'Find alternatives to my preferred brands with similar quality',
    })
  } else if (twin.brandLoyalty < 40) {
    tips.push({
      title: 'Brand explorer',
      body: `You're open to new brands (loyalty ${twin.brandLoyalty}/100). Great for discovery! Focus on review sentiment and Shopping Score to separate hidden gems from duds.`,
      icon: Sparkles,
      color: 'bg-teal-500/15 text-teal-500',
      action: 'Discover top-rated',
      actionQuery: 'Show me the highest-rated products across all categories',
    })
  }

  // Discount preference tip
  if (twin.discountPreference > 70) {
    tips.push({
      title: 'Festival sale ready',
      body: `Discount preference ${twin.discountPreference}/100. You wait for sales. Build your wishlist now — when prices drop, you'll get instant notifications and be first to buy.`,
      icon: PiggyBank,
      color: 'bg-green-500/15 text-green-500',
      action: 'Prepare my wishlist',
      actionQuery: 'Add the best products in my preferred categories to my wishlist for sale tracking',
    })
  }

  // Ensure at least 3 tips
  while (tips.length < 3) {
    tips.push({
      title: 'Keep chatting to unlock insights',
      body: 'Every interaction helps your Digital Twin learn. Ask for recommendations, compare products, or save items — the Coach will surface deeper insights as your twin matures.',
      icon: Lightbulb,
      color: 'bg-amber-500/15 text-amber-500',
    })
  }

  return tips.slice(0, 5)
}

interface Goal {
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  progress: number
}

function generateGoals(twin: DigitalTwinData | null): Goal[] {
  if (!twin) return []
  return [
    {
      title: 'Reduce impulse buys',
      description: 'Lower impulse score to under 50',
      icon: Target,
      progress: Math.max(0, 100 - twin.impulseBuyingScore * 1.5),
    },
    {
      title: 'Improve comparison habit',
      description: 'Compare before every purchase',
      icon: Brain,
      progress: Math.min(100, twin.comparisonFrequency),
    },
    {
      title: 'Build brand awareness',
      description: 'Explore beyond preferred brands',
      icon: Sparkles,
      progress: Math.min(100, 100 - twin.brandLoyalty + 30),
    },
  ]
}

interface Saving {
  title: string
  body: string
  icon: React.ComponentType<{ className?: string }>
  bg: string
  fg: string
}

function generateSavingsOpportunities(twin: DigitalTwinData | null): Saving[] {
  if (!twin) return []
  const savings: Saving[] = []

  savings.push({
    title: 'Cross-platform price gaps',
    body: 'Same product, up to 15% cheaper on alternate platforms. Always compare.',
    icon: TrendingDown,
    bg: 'bg-emerald-500/15',
    fg: 'text-emerald-500',
  })

  if (twin.discountPreference > 60) {
    savings.push({
      title: 'Festival sale calendar',
      body: 'Biggest discounts: Diwali (Oct), Republic Day (Jan), Independence Day (Aug).',
      icon: PiggyBank,
      bg: 'bg-amber-500/15',
      fg: 'text-amber-500',
    })
  }

  savings.push({
    title: 'Bank offer stacking',
    body: 'Combine credit card cashback with platform discounts for extra 5-10% off.',
    icon: Award,
    bg: 'bg-purple-500/15',
    fg: 'text-purple-500',
  })

  if (twin.comparisonFrequency > 60) {
    savings.push({
      title: 'Your comparison habit pays off',
      body: `With ${twin.comparisonFrequency}/100 comparison frequency, you save ~₹2,400 per major purchase on average.`,
      icon: TrendingUp,
      bg: 'bg-cyan-500/15',
      fg: 'text-cyan-500',
    })
  }

  savings.push({
    title: 'Price tracking alerts',
    body: 'Set target prices on wishlist items — get notified the moment they drop.',
    icon: Clock,
    bg: 'bg-rose-500/15',
    fg: 'text-rose-500',
  })

  if (twin.technologyAdoption > 70) {
    savings.push({
      title: 'Refurbished premium tech',
      body: 'Consider certified refurbished for 20-30% off with warranty. Great for tech enthusiasts.',
      icon: Zap,
      bg: 'bg-teal-500/15',
      fg: 'text-teal-500',
    })
  }

  return savings.slice(0, 6)
}
