'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { Target, TrendingDown, AlertTriangle, Check, Edit2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatINR } from '@/lib/ui-utils'
import { useSpendingGoal } from '@/hooks/use-spending-goal'

export function SpendingGoal({ monthlySpent }: { monthlySpent: number }) {
  const goal = useSpendingGoal(monthlySpent)

  function saveBudget() {
    const val = parseInt(goal.inputValue.replace(/[^0-9]/g, ''), 10)
    if (val > 0) {
      goal.setBudget(val)
      goal.setEditing(false)
      goal.setInputValue('')
    }
  }

  const [loaded, setLoaded] = React.useState(false)
  React.useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 100)
    return () => clearTimeout(t)
  }, [])

  if (!loaded) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border/60 bg-gradient-to-br from-card to-muted/10 p-4 asos-card-lift"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-md">
            <Target className="h-3.5 w-3.5" />
          </div>
          <div>
            <div className="text-sm font-semibold">Monthly Spending Goal</div>
            <div className="text-[10px] text-muted-foreground">
              {goal.budget ? `Budget: ${formatINR(goal.budget)}` : 'Set a budget to track spending'}
            </div>
          </div>
        </div>
        {goal.budget && !goal.editing && (
          <button
            onClick={() => { goal.setEditing(true); goal.setInputValue(String(goal.budget)) }}
            className="text-muted-foreground hover:text-emerald-500 transition-colors p-1"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {goal.editing ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₹</span>
              <input
                type="text"
                value={goal.inputValue}
                onChange={(e) => goal.setInputValue(e.target.value)}
                placeholder="e.g. 50000"
                className="w-full rounded-lg border border-border/60 bg-card pl-7 pr-3 py-1.5 text-sm outline-none focus:border-emerald-500/50"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && saveBudget()}
              />
            </div>
            <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700" onClick={saveBudget}>
              <Check className="h-3.5 w-3.5" /> Set
            </Button>
            <Button size="sm" variant="ghost" className="h-8" onClick={() => { goal.setEditing(false); goal.setInputValue('') }}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[20000, 40000, 60000, 100000].map((preset) => (
              <button
                key={preset}
                onClick={() => goal.setBudget(preset)}
                className="text-[10px] rounded-md border border-border/60 px-2 py-0.5 hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-colors text-muted-foreground"
              >
                {formatINR(preset)}
              </button>
            ))}
          </div>
        </div>
      ) : goal.budget ? (
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-muted-foreground">
                Spent <span className={`font-bold ${goal.overBudget ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'}`}>{formatINR(goal.spent)}</span> of {formatINR(goal.budget)}
              </span>
              <span className={`font-bold ${goal.overBudget ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {goal.percentage}%
              </span>
            </div>
            <div className="h-3 rounded-full bg-muted/40 overflow-hidden relative">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, goal.percentage)}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className={`h-full rounded-full relative overflow-hidden ${goal.overBudget ? 'bg-gradient-to-r from-rose-500 to-red-600' : 'bg-gradient-to-r from-emerald-500 to-teal-500'}`}
              >
                <div className="absolute inset-0 bg-white/20" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)' }} />
              </motion.div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            {goal.overBudget ? (
              <div className="flex items-center gap-1.5 text-xs text-rose-500">
                <AlertTriangle className="h-3.5 w-3.5" />
                Over by {formatINR(goal.spent - (goal.budget ?? 0))}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                <TrendingDown className="h-3.5 w-3.5" />
                {formatINR(goal.remaining)} remaining
              </div>
            )}
            <button
              onClick={goal.clearBudget}
              className="text-[10px] text-muted-foreground hover:text-rose-500 transition-colors"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => { goal.setEditing(true) }}
          className="w-full rounded-lg border border-dashed border-border/60 hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all p-3 text-xs text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400"
        >
          <Target className="h-4 w-4 mx-auto mb-1 opacity-50" />
          Set a monthly spending goal
        </button>
      )}
    </motion.div>
  )
}
