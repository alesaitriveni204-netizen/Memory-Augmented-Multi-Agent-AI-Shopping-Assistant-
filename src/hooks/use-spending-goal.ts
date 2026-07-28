'use client'

import * as React from 'react'

const STORAGE_KEY = 'asos-monthly-budget'

export function useSpendingGoal(monthlySpent: number) {
  const [budget, setBudgetState] = React.useState<number | null>(null)
  const [editing, setEditing] = React.useState(false)
  const [inputValue, setInputValue] = React.useState('')

  // Load from localStorage
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const val = parseInt(stored, 10)
        if (!isNaN(val) && val > 0) setBudgetState(val)
      }
    } catch {}
  }, [])

  const setBudget = React.useCallback((value: number) => {
    setBudgetState(value)
    try {
      localStorage.setItem(STORAGE_KEY, String(value))
    } catch {}
  }, [])

  const clearBudget = React.useCallback(() => {
    setBudgetState(null)
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {}
  }, [])

  const spent = monthlySpent
  const percentage = budget ? Math.min(100, Math.round((spent / budget) * 100)) : 0
  const remaining = budget ? Math.max(0, budget - spent) : 0
  const overBudget = budget ? spent > budget : false

  return {
    budget,
    setBudget,
    clearBudget,
    editing,
    setEditing,
    inputValue,
    setInputValue,
    spent,
    percentage,
    remaining,
    overBudget,
  }
}
