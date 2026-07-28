'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Package,
  Wallet,
  Brain,
  Star,
  ShoppingBag,
  PiggyBank,
  Calendar,
  Download,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
  AreaChart,
  Area,
} from 'recharts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LoadingState } from '@/components/common/empty-state'
import { AnimatedNumber } from '@/components/common/animated-number'
import { SpendingGoal } from '@/components/insights/spending-goal'
import { SaleCalendar } from '@/components/insights/sale-calendar'
import {
  formatINR,
  platformColor,
  platformLabel,
  relativeTime,
} from '@/lib/ui-utils'

interface InsightsData {
  totalProductsCompared: number
  totalSaved: number
  avgShoppingScore: number
  topCategories: Array<{ category: string; count: number }>
  topBrands: Array<{ brand: string; count: number }>
  memoryCount: number
  twinConfidence: number
  platformUsage: Array<{ platform: string; count: number }>
  priceHistoryTrend: Array<{ week: string; avgPrice: number }>
  recentActivity: Array<{
    id: string
    type: string
    title: string
    createdAt: string
  }>
  spending?: {
    totalSpent: number
    totalSavedThisYear: number
    purchaseCount: number
    byMonth: Array<{ month: string; spent: number; saved: number; count: number }>
    byCategory: Array<{ category: string; spent: number; count: number }>
    simulated: boolean
  }
}

export function InsightsView() {
  const { data, isLoading } = useQuery<InsightsData>({
    queryKey: ['insights'],
    queryFn: async () => {
      const res = await fetch('/api/insights')
      return res.json()
    },
  })

  if (isLoading) return <LoadingState label="Crunching insights…" />
  if (!data) return null

  const kpis = [
    {
      label: 'Products Compared',
      rawValue: data.totalProductsCompared,
      value: data.totalProductsCompared.toString(),
      icon: Package,
      color: '#10b981',
      trend: data.totalProductsCompared > 0 ? '+12%' : '—',
      trendUp: true,
    },
    {
      label: 'Total Saved',
      rawValue: data.totalSaved,
      value: formatINR(data.totalSaved),
      icon: Wallet,
      color: '#14b8a6',
      trend: data.totalSaved > 0 ? '+₹1.2k' : '—',
      trendUp: true,
    },
    {
      label: 'Avg Shopping Score',
      rawValue: Math.round(data.avgShoppingScore),
      value: `${Math.round(data.avgShoppingScore)}/100`,
      icon: Star,
      color: '#f59e0b',
      trend: data.avgShoppingScore > 70 ? 'Strong' : '—',
      trendUp: data.avgShoppingScore >= 70,
    },
    {
      label: 'Memory Count',
      rawValue: data.memoryCount,
      value: data.memoryCount.toString(),
      icon: Brain,
      color: '#a855f7',
      trend: data.memoryCount > 0 ? `+${Math.min(data.memoryCount, 5)} wk` : '—',
      trendUp: true,
    },
  ]

  const pieData = (data.platformUsage || []).map((p) => ({
    name: platformLabel(p.platform),
    value: p.count,
    color: platformColor(p.platform),
  }))

  const lineData = (data.priceHistoryTrend || []).map((p) => ({
    week: p.week,
    avgPrice: Math.round(p.avgPrice),
  }))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-emerald-500" /> Insights Dashboard
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Your shopping intelligence at a glance.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          onClick={() => {
            window.open('/api/export', '_blank')
          }}
        >
          <Download className="h-3.5 w-3.5 mr-1" /> Export Report
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((kpi, i) => {
          const Icon = kpi.icon
          return (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: i * 0.05 }}
              className="rounded-xl border border-border/60 bg-gradient-to-br from-card to-muted/10 p-3 asos-card-lift hover:border-emerald-500/30"
            >
              <div className="flex items-center justify-between">
                <div
                  className="grid h-8 w-8 place-items-center rounded-lg"
                  style={{ backgroundColor: `${kpi.color}15`, color: kpi.color }}
                >
                  <Icon className="h-4 w-4" />
                </div>
                {kpi.trend !== '—' && (
                  <Badge
                    variant="secondary"
                    className={`text-[10px] py-0 px-1.5 gap-0.5 ${
                      kpi.trendUp
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                        : 'bg-rose-500/10 text-rose-600'
                    }`}
                  >
                    {kpi.trendUp ? (
                      <TrendingUp className="h-2.5 w-2.5" />
                    ) : (
                      <TrendingDown className="h-2.5 w-2.5" />
                    )}
                    {kpi.trend}
                  </Badge>
                )}
              </div>
              <div className="mt-2 text-xl font-bold">
                {kpi.label === 'Avg Shopping Score' ? (
                  <><AnimatedNumber value={kpi.rawValue} duration={1000} format={(n) => Math.round(n).toString()} />/100</>
                ) : kpi.label === 'Total Saved' ? (
                  <>₹<AnimatedNumber value={kpi.rawValue} duration={1000} format={(n) => Math.round(n).toLocaleString('en-IN')} /></>
                ) : (
                  <AnimatedNumber value={kpi.rawValue} duration={1000} format={(n) => Math.round(n).toLocaleString('en-IN')} />
                )}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {kpi.label}
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border/60 bg-card p-4">
          <div className="text-sm font-semibold mb-3">Top Categories</div>
          {data.topCategories?.length === 0 ? (
            <div className="text-xs text-muted-foreground py-8 text-center">
              No data yet
            </div>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.topCategories}
                  layout="vertical"
                  margin={{ left: 20, right: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} />
                  <YAxis
                    type="category"
                    dataKey="category"
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                    width={70}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-4">
          <div className="text-sm font-semibold mb-3">Top Brands</div>
          {data.topBrands?.length === 0 ? (
            <div className="text-xs text-muted-foreground py-8 text-center">
              No data yet
            </div>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.topBrands}
                  layout="vertical"
                  margin={{ left: 20, right: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} />
                  <YAxis
                    type="category"
                    dataKey="brand"
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
                    width={90}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="count" fill="#14b8a6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border/60 bg-card p-4">
          <div className="text-sm font-semibold mb-3">Platform Usage</div>
          {pieData.length === 0 ? (
            <div className="text-xs text-muted-foreground py-8 text-center">
              No platform activity yet
            </div>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={2}
                  >
                    {pieData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} stroke="var(--card)" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(value: number, name: string) => [`${value} recs`, name]}
                  />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{ fontSize: 11 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-4">
          <div className="text-sm font-semibold mb-3">Price Trend (8 weeks)</div>
          {lineData.length === 0 ? (
            <div className="text-xs text-muted-foreground py-8 text-center">
              No tracked products yet
            </div>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineData} margin={{ left: -10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="week"
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
                  />
                  <YAxis
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
                    tickFormatter={(v) => `₹${Math.round(v / 1000)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v: number) => formatINR(v)}
                  />
                  <Line
                    type="monotone"
                    dataKey="avgPrice"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#10b981' }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Spending Tracker */}
      {data.spending && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-border/60 bg-card p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                <ShoppingBag className="h-3.5 w-3.5" />
              </div>
              <div>
                <div className="text-sm font-semibold">Spending Tracker</div>
                <div className="text-[10px] text-muted-foreground">
                  {data.spending.simulated ? "Sample data — mark products as purchased to track real spending" : "Based on your purchases"}
                </div>
              </div>
            </div>
            {data.spending.simulated && (
              <Badge variant="outline" className="text-[9px] py-0 px-1.5 border-amber-500/30 text-amber-600 dark:text-amber-400">
                Sample
              </Badge>
            )}
          </div>

          {/* Spending summary cards */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="rounded-lg bg-muted/30 p-2.5">
              <div className="flex items-center gap-1 text-[9px] text-muted-foreground uppercase tracking-wider mb-1">
                <Wallet className="h-2.5 w-2.5" /> Total Spent
              </div>
              <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                ₹<AnimatedNumber value={data.spending.totalSpent} duration={1000} format={(n) => Math.round(n).toLocaleString('en-IN')} />
              </div>
            </div>
            <div className="rounded-lg bg-muted/30 p-2.5">
              <div className="flex items-center gap-1 text-[9px] text-muted-foreground uppercase tracking-wider mb-1">
                <PiggyBank className="h-2.5 w-2.5" /> Total Saved
              </div>
              <div className="text-base font-bold text-rose-500">
                ₹<AnimatedNumber value={data.spending.totalSavedThisYear} duration={1000} format={(n) => Math.round(n).toLocaleString('en-IN')} />
              </div>
            </div>
            <div className="rounded-lg bg-muted/30 p-2.5">
              <div className="flex items-center gap-1 text-[9px] text-muted-foreground uppercase tracking-wider mb-1">
                <Package className="h-2.5 w-2.5" /> Purchases
              </div>
              <div className="text-base font-bold">
                <AnimatedNumber value={data.spending.purchaseCount} duration={1000} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Monthly spending chart */}
            <div>
              <div className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                <Calendar className="h-3 w-3 text-emerald-500" /> Monthly Spending
              </div>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.spending.byMonth} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="spentGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="savedGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                    <XAxis dataKey="month" tick={{ fill: 'var(--muted-foreground)', fontSize: 9 }} />
                    <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 9 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }}
                      formatter={(value: number, name: string) => [`₹${value.toLocaleString('en-IN')}`, name === 'spent' ? 'Spent' : 'Saved']}
                    />
                    <Area type="monotone" dataKey="spent" stroke="#10b981" strokeWidth={2} fill="url(#spentGrad)" name="spent" />
                    <Area type="monotone" dataKey="saved" stroke="#f43f5e" strokeWidth={1.5} fill="url(#savedGrad)" name="saved" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Spending by category */}
            <div>
              <div className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                <BarChart3 className="h-3 w-3 text-purple-500" /> Spending by Category
              </div>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.spending.byCategory} layout="vertical" margin={{ left: 20, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                    <XAxis type="number" tick={{ fill: 'var(--muted-foreground)', fontSize: 9 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="category" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} width={70} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }}
                      formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, 'Spent']}
                    />
                    <Bar dataKey="spent" fill="#a855f7" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Spending Goal + Sale Calendar side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SpendingGoal monthlySpent={data.spending?.byMonth?.[data.spending.byMonth.length - 1]?.spent ?? 0} />
        <SaleCalendar />
      </div>

      {/* Recent Activity */}
      <div className="rounded-xl border border-border/60 bg-card p-4">
        <div className="text-sm font-semibold mb-3">Recent Activity</div>
        {data.recentActivity?.length === 0 ? (
          <div className="text-xs text-muted-foreground py-8 text-center">
            No recent activity
          </div>
        ) : (
          <div className="space-y-2">
            {data.recentActivity.slice(0, 7).map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between gap-2 rounded-md border border-border/40 p-2 text-xs"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{a.title}</div>
                  <div className="text-[10px] text-muted-foreground capitalize">
                    {a.type.replace(/_/g, ' ')}
                  </div>
                </div>
                <div className="text-[10px] text-muted-foreground shrink-0">
                  {relativeTime(a.createdAt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
