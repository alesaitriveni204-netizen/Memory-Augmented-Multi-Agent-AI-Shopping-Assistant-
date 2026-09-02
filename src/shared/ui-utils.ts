'use client'

import {
  PLATFORM_COLORS,
  PLATFORM_LABELS,
  type Platform,
} from '@/lib/types'

export const ALL_PLATFORMS: Platform[] = [
  'amazon',
  'flipkart',
  'myntra',
  'croma',
  'reliance',
  'nykaa',
  'ajio',
  'tatacliq',
  'meesho',
]

export const ALL_CATEGORIES = [
  'laptop',
  'phone',
  'earbuds',
  'tv',
  'watch',
  'camera',
  'appliance',
  'fashion',
  'beauty',
  'home',
]

export const ALL_BRANDS = [
  'Apple',
  'Samsung',
  'Lenovo',
  'Dell',
  'HP',
  'Sony',
  'Bose',
  'Nike',
  "Levi's",
  'OnePlus',
  'Xiaomi',
  'Google',
  'LG',
  'Dyson',
  'boAt',
]

export function platformColor(p: string): string {
  return (
    PLATFORM_COLORS[p as Platform] ?? '#4338ca'
  )
}

export function platformLabel(p: string): string {
  return PLATFORM_LABELS[p as Platform] ?? p
}

export function formatINR(amount: number): string {
  if (typeof amount !== 'number' || Number.isNaN(amount)) return '—'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function scoreColor(score: number): string {
  if (score >= 85) return '#4338ca' // Orbis indigo
  if (score >= 70) return '#f59e0b' // amber
  return '#ef4444' // red
}

export function confidenceColor(c: number): string {
  if (c >= 70) return '#4338ca'
  if (c >= 40) return '#f59e0b'
  return '#ef4444'
}

export function relativeTime(iso: string): string {
  try {
    // Use date-fns dynamically to avoid SSR mismatch, but synchronous for simplicity
    const d = new Date(iso)
    const diff = Date.now() - d.getTime()
    const sec = Math.floor(diff / 1000)
    if (sec < 60) return 'just now'
    const min = Math.floor(sec / 60)
    if (min < 60) return `${min}m ago`
    const hr = Math.floor(min / 60)
    if (hr < 24) return `${hr}h ago`
    const day = Math.floor(hr / 24)
    if (day < 7) return `${day}d ago`
    const wk = Math.floor(day / 7)
    if (wk < 4) return `${wk}w ago`
    const mo = Math.floor(day / 30)
    if (mo < 12) return `${mo}mo ago`
    return `${Math.floor(day / 365)}y ago`
  } catch {
    return ''
  }
}

export function parseSpecs(
  specs: unknown,
): Record<string, string | number | boolean> {
  if (!specs) return {}
  if (typeof specs === 'object' && !Array.isArray(specs)) {
    return specs as Record<string, string | number | boolean>
  }
  if (typeof specs === 'string') {
    try {
      return JSON.parse(specs)
    } catch {
      return {}
    }
  }
  return {}
}

export function parseJsonArray<T>(input: unknown): T[] {
  if (Array.isArray(input)) return input as T[]
  if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input)
      return Array.isArray(parsed) ? (parsed as T[]) : []
    } catch {
      return []
    }
  }
  return []
}

export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
