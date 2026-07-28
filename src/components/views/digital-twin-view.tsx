'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import {
  Users,
  RotateCcw,
  Info,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { ScoreRing } from '@/components/common/score-ring'
import { EmptyState, LoadingState } from '@/components/common/empty-state'
import {
  platformColor,
  platformLabel,
  relativeTime,
} from '@/lib/ui-utils'
import { useAppStore } from '@/lib/store'
import { PERSONA_LABELS } from '@/lib/types'
import { toast } from 'sonner'

interface DigitalTwin {
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

interface TimelineEvent {
  id: string
  type: string
  title: string
  description?: string
  productId?: string
  metadata?: unknown
  createdAt: string
}

interface DigitalTwinResponse {
  twin: DigitalTwin
  confidence: number
  personaCluster: string
  history: TimelineEvent[]
}

const TRAIT_LABELS: { key: keyof DigitalTwin; label: string }[] = [
  { key: 'budgetFlexibility', label: 'Budget Flexibility' },
  { key: 'brandLoyalty', label: 'Brand Loyalty' },
  { key: 'priceSensitivity', label: 'Price Sensitivity' },
  { key: 'purchaseConfidence', label: 'Purchase Confidence' },
  { key: 'technologyAdoption', label: 'Technology Adoption' },
  { key: 'impulseBuyingScore', label: 'Impulse Buying' },
  { key: 'discountPreference', label: 'Discount Preference' },
  { key: 'comparisonFrequency', label: 'Comparison Frequency' },
  { key: 'shoppingConsistency', label: 'Shopping Consistency' },
]

export function DigitalTwinView() {
  const qc = useQueryClient()
  const user = useAppStore((s) => s.user)
  const updateUser = useAppStore((s) => s.updateUser)

  const { data, isLoading } = useQuery<DigitalTwinResponse>({
    queryKey: ['digital-twin'],
    queryFn: async () => {
      const res = await fetch('/api/digital-twin')
      return res.json()
    },
  })

  const resetMutation = useMutation({
    mutationFn: async () => {
      await fetch('/api/digital-twin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' }),
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['digital-twin'] })
      toast.success('Digital Twin reset to baseline')
    },
    onError: () => toast.error('Could not reset'),
  })

  const togglePersonalization = useMutation({
    mutationFn: async (enabled: boolean) => {
      await fetch('/api/digital-twin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: enabled ? 'enable' : 'disable',
        }),
      })
    },
    onSuccess: (_, enabled) => {
      updateUser({ personalizationEnabled: enabled })
      toast.success(
        enabled ? 'Personalization enabled' : 'Personalization disabled',
      )
    },
    onError: () => toast.error('Could not toggle'),
  })

  if (isLoading) return <LoadingState label="Loading Digital Twin…" />

  if (!data?.twin) {
    return (
      <EmptyState
        icon={Users}
        title="No Digital Twin yet"
        description="Complete onboarding to create your Digital Persona Twin."
      />
    )
  }

  const twin = data.twin
  const persona = PERSONA_LABELS[data.personaCluster] || PERSONA_LABELS['budget-conscious']
  const radarData = TRAIT_LABELS.map((t) => ({
    trait: t.label,
    value: Math.round((twin[t.key] as number) || 0),
  }))

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-500" /> Digital Persona Twin
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Your behavioral model — evolves with every shopping interaction.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-md border border-border/60 bg-card px-3 py-1.5">
            <Switch
              checked={!!user?.personalizationEnabled}
              onCheckedChange={(v) => togglePersonalization.mutate(v)}
              id="perso-enabled"
            />
            <span className="text-xs">Personalization</span>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="outline" className="text-rose-500">
                <RotateCcw className="h-3.5 w-3.5" /> Reset Twin
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset your Digital Twin?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will erase all learned behavioral traits and revert to
                  the baseline persona from your onboarding. Your memories will
                  not be affected.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => resetMutation.mutate()}
                  className="bg-rose-500 hover:bg-rose-600"
                >
                  Reset Twin
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Persona + Confidence Header */}
      <div className="rounded-xl border border-border/60 bg-card p-4 flex flex-col sm:flex-row gap-4 items-center">
        <div
          className="flex items-center gap-3 rounded-lg px-4 py-3"
          style={{
            backgroundColor: `${persona.color}15`,
            border: `1px solid ${persona.color}33`,
          }}
        >
          <span className="text-3xl">{persona.emoji}</span>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase">
              Persona Cluster
            </div>
            <div
              className="text-sm font-bold"
              style={{ color: persona.color }}
            >
              {persona.label}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ScoreRing
            value={data.confidence}
            size={84}
            strokeWidth={7}
            sublabel="Confidence"
          />
          <div>
            <div className="text-[10px] text-muted-foreground uppercase">
              Twin Confidence
            </div>
            <div className="text-sm font-semibold">
              {Math.round(data.confidence)}% certainty
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              Shopping style: <span className="font-medium">{twin.shoppingStyle}</span>
            </div>
            <div className="text-[11px] text-muted-foreground">
              Risk tolerance:{' '}
              <span className="font-medium capitalize">{twin.riskTolerance}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Radar Chart */}
        <div className="rounded-xl border border-border/60 bg-card p-4">
          <div className="text-sm font-semibold mb-3 flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-emerald-500" /> Behavioral Traits
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="75%">
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis
                  dataKey="trait"
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 9 }}
                />
                <Radar
                  dataKey="value"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.4}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Trait Bars */}
        <div className="rounded-xl border border-border/60 bg-card p-4">
          <div className="text-sm font-semibold mb-3">Trait Breakdown</div>
          <div className="space-y-2.5 max-h-72 overflow-y-auto scrollbar-thin pr-1">
            {TRAIT_LABELS.map((t) => {
              const v = Math.round((twin[t.key] as number) || 0)
              const color =
                v >= 70 ? '#10b981' : v >= 40 ? '#f59e0b' : '#ef4444'
              return (
                <div key={t.key}>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-muted-foreground">{t.label}</span>
                    <span className="font-semibold" style={{ color }}>
                      {v}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${v}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Preferences */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border/60 bg-card p-4">
          <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">
            Preferred Categories
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(twin.preferredCategories || []).map((c) => (
              <Badge
                key={c}
                variant="secondary"
                className="capitalize bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              >
                {c}
              </Badge>
            ))}
            {twin.preferredCategories?.length === 0 && (
              <span className="text-xs text-muted-foreground">None yet</span>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-4">
          <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">
            Preferred Brands
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(twin.preferredBrands || []).map((b) => (
              <Badge key={b} variant="secondary">
                {b}
              </Badge>
            ))}
            {twin.preferredBrands?.length === 0 && (
              <span className="text-xs text-muted-foreground">None yet</span>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-4">
          <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">
            Preferred Platforms
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(twin.preferredPlatforms || []).map((p) => (
              <span
                key={p}
                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold text-white"
                style={{ backgroundColor: platformColor(p) }}
              >
                {platformLabel(p)}
              </span>
            ))}
            {twin.preferredPlatforms?.length === 0 && (
              <span className="text-xs text-muted-foreground">None yet</span>
            )}
          </div>
        </div>
      </div>

      {/* Lifestyle */}
      {twin.lifestyle && (
        <div className="rounded-xl border border-border/60 bg-card p-4">
          <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">
            Lifestyle
          </div>
          <p className="text-sm">{twin.lifestyle}</p>
        </div>
      )}

      {/* Explainability callout */}
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
        <div className="flex items-start gap-2">
          <Info className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed">
            <div className="font-semibold text-emerald-700 dark:text-emerald-300 mb-1">
              Why does my Twin look like this?
            </div>
            Your Digital Persona Twin is built from two sources:{' '}
            <strong>onboarding data</strong> (your budget, brand preferences,
            platforms, lifestyle) and <strong>ongoing shopping interactions</strong>{' '}
            (what you search, save, compare, and buy). As you use the app, the
            twin evolves — for example, each purchase raises your{' '}
            <em>purchase confidence</em>, while consistent brand choices
            increase <em>brand loyalty</em>. The radar chart shows your current
            behavioral signature. Memories provide the why behind each trait.
          </div>
        </div>
      </div>

      {/* Evolution History */}
      <div className="rounded-xl border border-border/60 bg-card p-4">
        <div className="text-sm font-semibold mb-3">Evolution History</div>
        {data.history?.length === 0 ? (
          <div className="text-xs text-muted-foreground py-4 text-center">
            No twin updates yet. Interact with the app to evolve your twin.
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin pr-1">
            {data.history.slice(0, 20).map((h) => (
              <div
                key={h.id}
                className="flex items-start gap-2 rounded-md border border-border/40 p-2 text-xs"
              >
                <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  🔄
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{h.title}</div>
                  {h.description && (
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {h.description}
                    </div>
                  )}
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {relativeTime(h.createdAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
