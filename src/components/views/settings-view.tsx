'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Settings,
  Plug,
  Download,
  Trash2,
  Info,
  ShieldCheck,
  Database,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
import { useAppStore } from '@/lib/store'
import {
  ALL_PLATFORMS,
  downloadJson,
  platformColor,
  platformLabel,
} from '@/lib/ui-utils'
import { toast } from 'sonner'

interface ConnectedAccount {
  id: string
  platform: string
  connected: boolean
  connectedAt: string | null
}

export function SettingsView() {
  const qc = useQueryClient()
  const user = useAppStore((s) => s.user)
  const updateUser = useAppStore((s) => s.updateUser)

  const { data } = useQuery<{ accounts: ConnectedAccount[] }>({
    queryKey: ['accounts'],
    queryFn: async () => {
      const res = await fetch('/api/accounts')
      return res.json()
    },
  })

  const connectMut = useMutation({
    mutationFn: async (platform: string) => {
      await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform }),
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] })
      toast.success('Account connected')
    },
    onError: () => toast.error('Could not connect'),
  })

  const disconnectMut = useMutation({
    mutationFn: async (platform: string) => {
      await fetch(`/api/accounts?platform=${platform}`, {
        method: 'DELETE',
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] })
      toast.success('Account disconnected')
    },
    onError: () => toast.error('Could not disconnect'),
  })

  async function togglePersonalization(enabled: boolean) {
    updateUser({ personalizationEnabled: enabled })
    try {
      await fetch('/api/digital-twin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: enabled ? 'enable' : 'disable',
        }),
      })
      toast.success(
        enabled ? 'Personalization enabled' : 'Personalization disabled',
      )
    } catch {
      toast.error('Could not toggle')
    }
  }

  async function toggleMemory(enabled: boolean) {
    updateUser({ memoryEnabled: enabled })
    try {
      await fetch('/api/digital-twin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: enabled ? 'enable' : 'disable',
        }),
      })
      toast.success(enabled ? 'Memory enabled' : 'Memory disabled')
    } catch {
      toast.error('Could not toggle')
    }
  }

  async function exportAllData() {
    try {
      const [memRes, twinRes, wishRes, tlRes] = await Promise.all([
        fetch('/api/memory'),
        fetch('/api/digital-twin'),
        fetch('/api/wishlist'),
        fetch('/api/timeline'),
      ])
      const [memory, twin, wishlist, timeline] = await Promise.all([
        memRes.json(),
        twinRes.json(),
        wishRes.json(),
        tlRes.json(),
      ])
      downloadJson(`shopping-os-data-${Date.now()}.json`, {
        exportedAt: new Date().toISOString(),
        user,
        memory,
        digitalTwin: twin,
        wishlist,
        timeline,
      })
      toast.success('Data exported')
    } catch {
      toast.error('Could not export data')
    }
  }

  async function deleteAllData() {
    try {
      // Reset twin
      await fetch('/api/digital-twin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' }),
      })
      // Delete all memory
      const memRes = await fetch('/api/memory')
      const mem = await memRes.json()
      const allMem = Object.values(mem).flat() as Array<{ id: string }>
      for (const m of allMem) {
        await fetch(`/api/memory/${m.id}`, { method: 'DELETE' })
      }
      // Delete all wishlist
      const wishRes = await fetch('/api/wishlist')
      const wish = await wishRes.json()
      for (const w of wish.items || []) {
        await fetch(`/api/wishlist/${w.id}`, { method: 'DELETE' })
      }
      qc.invalidateQueries()
      toast.success('All data deleted')
    } catch {
      toast.error('Could not delete all data')
    }
  }

  const accounts = data?.accounts || []

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Settings className="h-5 w-5 text-emerald-500" /> Settings
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Manage connected accounts, personalization, and your data.
        </p>
      </div>

      {/* Connected Accounts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-1.5">
            <Plug className="h-4 w-4 text-emerald-500" /> Connected Accounts
          </CardTitle>
          <CardDescription className="text-xs">
            Connect your shopping accounts to enable cross-platform price
            tracking.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {ALL_PLATFORMS.map((p) => {
            const acc = accounts.find((a) => a.platform === p)
            const connected = !!acc?.connected
            return (
              <div
                key={p}
                className="flex items-center justify-between gap-2 rounded-lg border border-border/40 p-2.5"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="grid h-8 w-8 place-items-center rounded-md text-[10px] font-bold text-white shrink-0"
                    style={{ backgroundColor: platformColor(p) }}
                  >
                    {platformLabel(p).slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">
                      {platformLabel(p)}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {connected
                        ? `Connected`
                        : 'Not connected'}
                    </div>
                  </div>
                </div>
                <Switch
                  checked={connected}
                  onCheckedChange={(v) =>
                    v
                      ? connectMut.mutate(p)
                      : disconnectMut.mutate(p)
                  }
                  aria-label={`Toggle ${platformLabel(p)}`}
                />
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Personalization */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-500" /> Personalization
          </CardTitle>
          <CardDescription className="text-xs">
            Control how your Digital Twin and Memory influence recommendations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Memory Enabled</Label>
              <p className="text-[11px] text-muted-foreground">
                Allow the app to remember your preferences and interactions.
              </p>
            </div>
            <Switch
              checked={!!user?.memoryEnabled}
              onCheckedChange={toggleMemory}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Personalization Enabled</Label>
              <p className="text-[11px] text-muted-foreground">
                Use your Digital Twin to personalize recommendations.
              </p>
            </div>
            <Switch
              checked={!!user?.personalizationEnabled}
              onCheckedChange={togglePersonalization}
            />
          </div>
        </CardContent>
      </Card>

      {/* Data & Privacy */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-1.5">
            <Database className="h-4 w-4 text-emerald-500" /> Data & Privacy
          </CardTitle>
          <CardDescription className="text-xs">
            Your data is yours. Export or delete it anytime.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-sm font-medium">Export My Data</div>
              <p className="text-[11px] text-muted-foreground">
                Download all your data as JSON (memories, twin, wishlist,
                timeline).
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={exportAllData}>
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="w-full text-rose-500 border-rose-500/30 hover:bg-rose-500/5"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete All My Data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete all your data?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently reset your Digital Twin, delete all
                  memories, and clear your wishlist. Timeline events will
                  remain as audit logs. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={deleteAllData}
                  className="bg-rose-500 hover:bg-rose-600"
                >
                  Yes, delete everything
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-1.5">
            <Info className="h-4 w-4 text-emerald-500" /> About
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs text-muted-foreground">
          <p>
            <strong className="text-foreground">AI Shopping OS</strong> — a
            Memory-Augmented Multi-Agent Cross-Platform Shopping Intelligence
            Platform.
          </p>
          <p>
            Powered by 9 specialized agents (search, memory, digital-twin,
            recommendation, review, price, budget, explainability) coordinated
            by an AHDE decision layer and a MARE scoring engine that fuses 8
            factors into a single Shopping Score.
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Badge variant="secondary" className="text-[10px]">
              v0.1.0
            </Badge>
            <Badge variant="secondary" className="text-[10px]">
              Next.js 16 · TypeScript · Tailwind 4
            </Badge>
            <Badge variant="secondary" className="text-[10px]">
              Multi-Agent · AHDE · MARE
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
