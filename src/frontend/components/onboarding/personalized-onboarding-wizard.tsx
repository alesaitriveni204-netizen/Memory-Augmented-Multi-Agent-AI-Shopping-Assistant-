'use client'

import * as React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowDown, ArrowUp, Check, ChevronLeft, ChevronRight, LoaderCircle, Sparkles } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { PERSONA_LABELS, type OnboardingData } from '@/lib/types'
import { cn } from '@/lib/utils'

const STEPS = ['Categories', 'Budget style', 'Brands', 'Priorities', 'Shopping habits', 'AI companion']
const CATEGORY_OPTIONS = [
  ['phone', '📱 Smartphones'], ['laptop', '💻 Laptops'], ['earbuds', '🎧 Audio / Earbuds'],
  ['fashion', '👕 Fashion'], ['shoes', '👟 Shoes'], ['home', '🏠 Home & Kitchen'],
  ['gaming', '🎮 Gaming'], ['electronics', '📷 Electronics'], ['beauty', '💄 Beauty'],
  ['books', '📚 Books'], ['travel', '🧳 Travel'], ['other', '＋ Other'],
]
const BUDGET_OPTIONS = [
  ['under-5000', 'Under ₹5,000'], ['5000-15000', '₹5,000 – ₹15,000'],
  ['15000-30000', '₹15,000 – ₹30,000'], ['30000-50000', '₹30,000 – ₹50,000'],
  ['50000-80000', '₹50,000 – ₹80,000'], ['80000-plus', '₹80,000+'],
]
const BRAND_OPTIONS = ['Apple', 'Samsung', 'OnePlus', 'Sony', 'Lenovo', 'HP', 'Dell', 'Nike', 'Adidas']
const PRIORITY_OPTIONS = [
  ['price', '💰 Price'], ['reviews', '⭐ Reviews'], ['performance', '⚡ Performance'],
  ['discount', '🏷️ Discount'], ['brand', '🏆 Brand'], ['battery', '🔋 Battery'],
  ['camera', '📷 Camera'], ['design', '🎨 Design'], ['delivery', '🚚 Delivery'],
  ['returns', '🔄 Return policy'], ['warranty', '🛡️ Warranty'], ['sustainability', '🌱 Sustainability'],
]
const SHOPPER_STYLES = [
  ['The Researcher', 'I compare everything before buying.'],
  ['The Quick Decider', 'I usually know what I want.'],
  ['The Deal Hunter', 'I wait for the best price.'],
  ['The Quality Seeker', 'I care more about quality than price.'],
  ['The Balanced Shopper', 'I look for the best overall value.'],
]
const AI_HELP_OPTIONS = [
  ['best-product', '🎯 Find the best product for me'], ['lowest-price', '💰 Find the lowest price'],
  ['compare', '📊 Compare products'], ['discounts', '🏷️ Find discounts'],
  ['price-drops', '📉 Track price drops'], ['remember', '🧠 Remember my preferences'],
  ['reviews', '⭐ Summarize reviews'], ['explain', '🤔 Explain why it suits me'],
  ['alternatives', '🔄 Suggest alternatives'], ['wait', '⏳ Tell me when to wait'],
]

type FormState = OnboardingData & {
  budgetRangeLabel: string
  brandTrial: string
  riskToleranceScore: number
  aiHelp: string[]
  personalizationConsent: 'full' | 'controlled' | 'minimal'
}

const INITIAL_FORM: FormState = {
  categories: [], budgetRange: '', budgetRangeLabel: '', brands: [], platforms: [],
  shoppingFrequency: 'monthly', discountImportance: 3, deliverySpeed: 3,
  techFamiliarity: 3, lifestyle: '', budgetStyle: '', brandImportance: 50,
  technologyAdoption: 50, tryNewBrands: 'sometimes', brandTrial: 'sometimes',
  purchasePriorities: ['price', 'reviews', 'performance', 'discount', 'brand'],
  shoppingStyle: 'The Balanced Shopper', comparisonFrequency: 'often',
  riskToleranceScore: 50, aiHelp: ['best-product', 'compare', 'explain'],
  personalizationConsent: 'controlled', onboardingNotes: '',
}

export function PersonalizedOnboardingWizard() {
  const user = useAppStore((state) => state.user)
  const setUser = useAppStore((state) => state.setUser)
  const setActiveView = useAppStore((state) => state.setActiveView)
  const progressKey = `shopditto-onboarding:${user?.id ?? 'account'}`
  const [step, setStep] = React.useState(0)
  const [form, setForm] = React.useState<FormState>(INITIAL_FORM)
  const [ready, setReady] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [result, setResult] = React.useState<{ personaCluster: string } | null>(null)
  const [draggedPriority, setDraggedPriority] = React.useState<number | null>(null)

  React.useEffect(() => {
    try {
      const saved = window.localStorage.getItem(progressKey)
      if (saved) {
        const parsed = JSON.parse(saved) as { step?: number; form?: Partial<FormState> }
        if (parsed.form) setForm({ ...INITIAL_FORM, ...parsed.form })
        if (typeof parsed.step === 'number') setStep(Math.max(0, Math.min(5, parsed.step)))
      } else {
        void fetch('/api/onboarding')
          .then((response) => response.json())
          .then((data) => {
            if (data.preferences) setForm({ ...INITIAL_FORM, ...data.preferences })
          })
      }
    } catch {
      window.localStorage.removeItem(progressKey)
    }
    setReady(true)
  }, [progressKey])

  React.useEffect(() => {
    if (!ready || result) return
    window.localStorage.setItem(progressKey, JSON.stringify({ step, form }))
  }, [form, progressKey, ready, result, step])

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function toggle(key: 'categories' | 'brands' | 'aiHelp', value: string) {
    setForm((current) => ({
      ...current,
      [key]: current[key].includes(value)
        ? current[key].filter((item) => item !== value)
        : [...current[key], value],
    }))
  }

  function togglePriority(value: string) {
    setForm((current) => {
      const priorities = current.purchasePriorities ?? []
      return {
        ...current,
        purchasePriorities: priorities.includes(value)
          ? priorities.filter((item) => item !== value)
          : [...priorities, value],
      }
    })
  }

  function reorderPriority(from: number, to: number) {
    setForm((current) => {
      const priorities = [...(current.purchasePriorities ?? [])]
      const [moved] = priorities.splice(from, 1)
      priorities.splice(to, 0, moved)
      return { ...current, purchasePriorities: priorities }
    })
  }

  function saveProgress() {
    window.localStorage.setItem(progressKey, JSON.stringify({ step, form }))
  }

  async function createPersona() {
    setSubmitting(true)
    const budgetTier = form.budgetRange === 'under-5000' || form.budgetRange === '5000-15000'
      ? 'low'
      : form.budgetRange === '15000-30000' || form.budgetRange === '30000-50000'
        ? 'mid'
        : form.budgetRange === '50000-80000' ? 'high' : 'premium'
    const payload = {
      ...form,
      budgetRange: form.budgetRange,
      budgetRangeLabel: form.budgetRange,
      platforms: [],
      shoppingFrequency: form.shoppingFrequency || 'monthly',
      discountImportance: form.budgetStyle === 'discounts' ? 5 : form.budgetStyle === 'premium' ? 1 : 3,
      deliverySpeed: 3,
      techFamiliarity: Math.round((form.technologyAdoption ?? 50) / 20),
      lifestyle: form.shoppingStyle ?? '',
    }
    try {
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not create your shopping persona.')
      setUser(data.user)
      window.localStorage.removeItem(progressKey)
      setResult({ personaCluster: data.personaCluster })
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Could not create your shopping persona.')
    } finally {
      setSubmitting(false)
    }
  }

  const canContinue = step !== 0 || form.categories.length > 0
  const budgetSelected = Boolean(form.budgetRange && form.budgetStyle)
  const canAdvance = step === 0 ? form.categories.length > 0 : step === 1 ? budgetSelected : true
  const progress = ((step + 1) / STEPS.length) * 100

  if (!ready) return <div className="mx-auto h-80 max-w-3xl animate-pulse rounded-2xl bg-muted/30" />

  if (submitting) return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center text-center">
      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-800/20"><Sparkles className="h-8 w-8 animate-pulse" /></div>
      <h1 className="mt-6 text-2xl font-bold">Creating your shopping personality...</h1>
      <p className="mt-2 text-sm text-muted-foreground">Connecting your preferences to a first useful Digital Persona Twin.</p>
      <div className="mt-6 h-1.5 w-56 overflow-hidden rounded-full bg-muted"><div className="h-full w-2/3 animate-pulse rounded-full bg-emerald-500" /></div>
    </div>
  )

  if (result) {
    const persona = PERSONA_LABELS[result.personaCluster]
    return (
      <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-2xl rounded-2xl border border-emerald-500/30 bg-card/80 p-8 text-center shadow-2xl shadow-emerald-950/10 backdrop-blur-xl">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white"><Sparkles className="h-8 w-8" /></div>
        <h1 className="mt-5 text-2xl font-bold">Your shopping personality is ready.</h1>
        {persona && <p className="mt-3 text-sm font-semibold" style={{ color: persona.color }}>{persona.emoji} {persona.label}</p>}
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">Your preferences are saved to your account and will guide recommendations from the start. You can change them any time in Settings.</p>
        <button onClick={() => setActiveView('chat')} className="mt-6 inline-flex h-11 items-center gap-2 rounded-lg bg-emerald-600 px-5 text-sm font-semibold text-white hover:bg-emerald-500">Meet your shopping companion <Sparkles className="h-4 w-4" /></button>
      </motion.section>
    )
  }

  return (
    <div className="mx-auto w-full max-w-3xl py-4">
      <header className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-600 dark:text-emerald-400">Personal shopping setup</p>
          <h1 className="mt-1 text-xl font-bold sm:text-2xl">Let’s get to know your shopping style.</h1>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground sm:text-sm">Answer a few questions so your AI shopping companion can make better recommendations from the beginning.</p>
        </div>
        <span className="shrink-0 text-xs font-medium text-muted-foreground">Step {step + 1} of 6</span>
      </header>

      <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-muted/70">
        <motion.div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400" animate={{ width: `${progress}%` }} transition={{ duration: 0.25 }} />
      </div>

      <AnimatePresence mode="wait">
        <motion.section key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.18 }} className="rounded-2xl border border-border/70 bg-card/75 p-5 shadow-xl shadow-emerald-950/5 backdrop-blur-xl sm:p-7">
          {step === 0 && <>
            <StepHeading title="What do you usually shop for?" detail="Pick the categories you want your companion to understand first." />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{CATEGORY_OPTIONS.map(([value, label]) => <Choice key={value} label={label} selected={form.categories.includes(value)} onClick={() => toggle('categories', value)} />)}</div>
          </>}

          {step === 1 && <>
            <StepHeading title="How do you usually decide your budget?" detail="Your budget approach matters as much as the number." />
            <div className="grid gap-2 sm:grid-cols-2">{[
              ['fixed', '💰 I always have a fixed budget'], ['value', '⚖️ I compare price and value'],
              ['discounts', '🏷️ I wait for discounts'], ['premium', '💎 I prefer premium products'],
              ['depends', '🤷 It depends on the product'],
            ].map(([value, label]) => <Choice key={value} label={label} selected={form.budgetStyle === value} onClick={() => update('budgetStyle', value)} />)}</div>
            <h3 className="mb-2 mt-5 text-sm font-semibold">What is your usual shopping budget range?</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{BUDGET_OPTIONS.map(([value, label]) => <Choice key={value} label={label} selected={form.budgetRange === value} onClick={() => { update('budgetRange', value); update('budgetRangeLabel', label) }} />)}</div>
          </>}

          {step === 2 && <>
            <StepHeading title="How important are brands to you?" detail="And are you open to trying something new? Both help us tune your twin." />
            <RangeInput label="Brand importance" left="Not important" right="Very important" value={form.brandImportance ?? 50} onChange={(value) => update('brandImportance', value)} />
            <h3 className="mb-2 mt-5 text-sm font-semibold">Brands you usually prefer <span className="font-normal text-muted-foreground">(optional)</span></h3>
            <div className="flex flex-wrap gap-2">{BRAND_OPTIONS.map((brand) => <Choice key={brand} label={brand} compact selected={form.brands.includes(brand)} onClick={() => toggle('brands', brand)} />)}</div>
            <button type="button" onClick={() => update('brands', [])} className="mt-2 text-[11px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">Skip brand selection</button>
            <h3 className="mb-2 mt-5 text-sm font-semibold">Do you usually try new brands?</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{['always', 'sometimes', 'rarely', 'never'].map((value) => <Choice key={value} label={value[0].toUpperCase() + value.slice(1)} selected={form.brandTrial === value} onClick={() => { update('brandTrial', value); update('tryNewBrands', value); update('technologyAdoption', ({ always: 95, sometimes: 65, rarely: 30, never: 10 } as Record<string, number>)[value]) }} />)}</div>
          </>}

          {step === 3 && <>
            <StepHeading title="When choosing a product, what matters most?" detail="Choose up to 8, then arrange your top priorities. Drag items or use the arrows to rank them." />
            <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">{PRIORITY_OPTIONS.map(([value, label]) => <Choice key={value} label={label} selected={(form.purchasePriorities ?? []).includes(value)} disabled={!(form.purchasePriorities ?? []).includes(value) && (form.purchasePriorities?.length ?? 0) >= 8} onClick={() => togglePriority(value)} />)}</div>
            <ol className="space-y-1.5" aria-label="Ranked shopping priorities">{(form.purchasePriorities ?? []).map((priority, index) => {
              const label = PRIORITY_OPTIONS.find(([value]) => value === priority)?.[1] ?? priority
              return <li key={priority} draggable onDragStart={() => setDraggedPriority(index)} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (draggedPriority !== null) reorderPriority(draggedPriority, index); setDraggedPriority(null) }} className="flex min-h-10 items-center gap-2 rounded-lg border border-border/60 bg-background/60 px-2.5 text-xs">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-500/10 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">{index + 1}</span><span className="min-w-0 flex-1 truncate">{label}</span>
                <button type="button" disabled={index === 0} aria-label={`Move ${label} up`} onClick={() => reorderPriority(index, index - 1)} className="grid h-7 w-7 place-items-center rounded text-muted-foreground hover:bg-muted disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button>
                <button type="button" disabled={index === (form.purchasePriorities?.length ?? 0) - 1} aria-label={`Move ${label} down`} onClick={() => reorderPriority(index, index + 1)} className="grid h-7 w-7 place-items-center rounded text-muted-foreground hover:bg-muted disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></button>
              </li>
            })}</ol>
          </>}

          {step === 4 && <>
            <StepHeading title="Which shopper are you?" detail="Choose the description that feels most like you." />
            <div className="grid gap-2 sm:grid-cols-2">{SHOPPER_STYLES.map(([style, description]) => <button key={style} onClick={() => update('shoppingStyle', style)} className={cn('min-h-16 rounded-xl border p-3 text-left transition-colors', form.shoppingStyle === style ? 'border-emerald-500 bg-emerald-500/10' : 'border-border/70 hover:border-emerald-500/50')}><span className="block text-sm font-semibold">{style}</span><span className="mt-0.5 block text-xs text-muted-foreground">{description}</span></button>)}</div>
            <h3 className="mb-2 mt-5 text-sm font-semibold">How often do you shop online?</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">{[['rarely', 'Rarely'], ['occasionally', 'Occasionally'], ['monthly', 'Monthly'], ['weekly', 'Weekly'], ['very-frequently', 'Very frequently']].map(([value, label]) => <Choice key={value} label={label} selected={form.shoppingFrequency === value} onClick={() => update('shoppingFrequency', value)} />)}</div>
            <h3 className="mb-2 mt-5 text-sm font-semibold">How often do you compare products across websites?</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{[['never', 'Never'], ['sometimes', 'Sometimes'], ['often', 'Often'], ['almost always', 'Almost always']].map(([value, label]) => <Choice key={value} label={label} selected={form.comparisonFrequency === value} onClick={() => update('comparisonFrequency', value)} />)}</div>
          </>}

          {step === 5 && <>
            <StepHeading title="How should your AI companion help?" detail="Choose the things you want it to focus on. You can change these later." />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{AI_HELP_OPTIONS.map(([value, label]) => <Choice key={value} label={label} selected={form.aiHelp.includes(value)} onClick={() => toggle('aiHelp', value)} />)}</div>
            <div className="mt-5"><RangeInput label="How adventurous are you with new products?" left="Conservative" right="Experimental" value={form.riskToleranceScore} onChange={(value) => update('riskToleranceScore', value)} /></div>
            <h3 className="mb-2 mt-5 text-sm font-semibold">Would you like your companion to remember your preferences?</h3>
            <div className="grid gap-2">{[
              ['full', 'Yes, personalize everything'], ['controlled', 'Yes, but let me control what is remembered'], ['minimal', 'No, keep personalization minimal'],
            ].map(([value, label]) => <Choice key={value} label={label} selected={form.personalizationConsent === value} onClick={() => update('personalizationConsent', value as FormState['personalizationConsent'])} />)}</div>
            <label className="mt-5 block text-sm font-semibold" htmlFor="onboarding-notes">Anything else about how you shop? <span className="font-normal text-muted-foreground">(optional)</span></label>
            <textarea id="onboarding-notes" rows={3} maxLength={1000} value={form.onboardingNotes ?? ''} onChange={(event) => update('onboardingNotes', event.target.value)} placeholder="I usually wait for sales and prefer reliable brands..." className="mt-2 w-full resize-y rounded-lg border border-border bg-background/70 p-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15" />
            <button type="button" onClick={() => update('onboardingNotes', '')} className="mt-2 text-[11px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">Skip this question</button>
          </>}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
            <button onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0} className="inline-flex h-9 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground hover:bg-muted disabled:opacity-40"><ChevronLeft className="h-4 w-4" />Back</button>
            <button onClick={saveProgress} className="text-[11px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">Save progress</button>
            {step < STEPS.length - 1
              ? <button disabled={!canAdvance || !canContinue} onClick={() => setStep((current) => Math.min(5, current + 1))} className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-45">Continue<ChevronRight className="h-4 w-4" /></button>
              : <button onClick={createPersona} className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-500"><Sparkles className="h-4 w-4" />Create my shopping twin</button>}
          </div>
          <p className="mt-3 text-center text-[10px] text-muted-foreground">Your choices stay on your account. Update or clear them any time in Settings.</p>
        </motion.section>
      </AnimatePresence>
    </div>
  )
}

function StepHeading({ title, detail }: { title: string; detail: string }) {
  return <div className="mb-5"><h2 className="text-lg font-bold sm:text-xl">{title}</h2><p className="mt-1 text-xs leading-5 text-muted-foreground sm:text-sm">{detail}</p></div>
}

function Choice({ label, selected, onClick, compact = false, disabled = false }: { label: string; selected: boolean; onClick: () => void; compact?: boolean; disabled?: boolean }) {
  return <button type="button" disabled={disabled} onClick={onClick} aria-pressed={selected} className={cn('flex min-h-10 items-center gap-2 rounded-lg border text-left text-xs transition-all disabled:cursor-not-allowed disabled:opacity-40', compact ? 'px-3 py-1.5' : 'px-3 py-2.5', selected ? 'border-emerald-500 bg-emerald-500/10 text-foreground shadow-sm shadow-emerald-900/5' : 'border-border/70 bg-background/40 text-muted-foreground hover:border-emerald-500/45 hover:text-foreground')}>
    <span className={cn('grid h-4 w-4 shrink-0 place-items-center rounded border', selected ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-muted-foreground/40')}>{selected && <Check className="h-3 w-3" />}</span><span>{label}</span>
  </button>
}

function RangeInput({ label, left, right, value, onChange }: { label: string; left: string; right: string; value: number; onChange: (value: number) => void }) {
  return <div>
    <div className="flex items-center justify-between gap-3"><label className="text-sm font-semibold">{label}</label><span className="text-xs font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">{value}%</span></div>
    <input aria-label={label} type="range" min={0} max={100} value={value} onChange={(event) => onChange(Number(event.target.value))} className="mt-3 w-full accent-emerald-600" />
    <div className="flex justify-between text-[10px] text-muted-foreground"><span>{left}</span><span>{right}</span></div>
  </div>
}