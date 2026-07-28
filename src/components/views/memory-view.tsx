'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Brain,
  Plus,
  Trash2,
  Download,
  RotateCcw,
  Pencil,
  Check,
  X,
  Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
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
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EmptyState, LoadingState } from '@/components/common/empty-state'
import {
  confidenceColor,
  downloadJson,
  relativeTime,
} from '@/lib/ui-utils'
import { useAppStore } from '@/lib/store'
import { toast } from 'sonner'

interface ApiMemoryItem {
  id: string
  type: string
  category: string
  key: string
  value: string
  confidence: number
  weight: number
  source: string
  createdAt: string
  updatedAt: string
}

interface ApiMemoryResponse {
  short_term: ApiMemoryItem[]
  long_term: ApiMemoryItem[]
  episodic: ApiMemoryItem[]
  semantic: ApiMemoryItem[]
  session: ApiMemoryItem[]
}

const TABS: { key: keyof ApiMemoryResponse; label: string }[] = [
  { key: 'long_term', label: 'Long-term' },
  { key: 'semantic', label: 'Semantic' },
  { key: 'episodic', label: 'Episodic' },
  { key: 'session', label: 'Session' },
  { key: 'short_term', label: 'Short-term' },
]

export function MemoryView() {
  const qc = useQueryClient()
  const user = useAppStore((s) => s.user)
  const updateUser = useAppStore((s) => s.updateUser)

  const [search, setSearch] = React.useState('')
  const [addOpen, setAddOpen] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editValue, setEditValue] = React.useState('')

  const { data, isLoading } = useQuery<ApiMemoryResponse>({
    queryKey: ['memory'],
    queryFn: async () => {
      const res = await fetch('/api/memory')
      return res.json()
    },
  })

  const patchMutation = useMutation({
    mutationFn: async ({
      id,
      value,
      confidence,
    }: {
      id: string
      value?: string
      confidence?: number
    }) => {
      const body: Record<string, unknown> = {}
      if (value !== undefined) body.value = value
      if (confidence !== undefined) body.confidence = confidence
      await fetch(`/api/memory/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['memory'] })
      toast.success('Memory updated')
    },
    onError: () => toast.error('Could not update'),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/memory/${id}`, { method: 'DELETE' })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['memory'] })
      toast.success('Memory deleted')
    },
    onError: () => toast.error('Could not delete'),
  })

  async function toggleMemoryEnabled(enabled: boolean) {
    if (!user) return
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
      toast.error('Could not toggle memory')
    }
  }

  function exportMemory() {
    if (!data) return
    downloadJson(`shopping-memory-${Date.now()}.json`, data)
    toast.success('Memory exported')
  }

  async function resetAll() {
    try {
      // Get all memory ids
      const all = Object.values(data || {}).flat()
      for (const m of all) {
        await fetch(`/api/memory/${m.id}`, { method: 'DELETE' })
      }
      qc.invalidateQueries({ queryKey: ['memory'] })
      toast.success('All memory cleared')
    } catch {
      toast.error('Could not reset memory')
    }
  }

  const total = data
    ? Object.values(data).reduce((sum, arr) => sum + arr.length, 0)
    : 0

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Brain className="h-5 w-5 text-emerald-500" /> Your Shopping Memory
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {total} memories across 5 types. Your twin uses these to personalize
            recommendations.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-md border border-border/60 bg-card px-3 py-1.5">
            <Switch
              checked={!!user?.memoryEnabled}
              onCheckedChange={toggleMemoryEnabled}
              id="mem-enabled"
            />
            <Label htmlFor="mem-enabled" className="text-xs">
              Memory {user?.memoryEnabled ? 'On' : 'Off'}
            </Label>
          </div>
          <Button size="sm" variant="outline" onClick={exportMemory}>
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
          <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Add Memory
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="outline" className="text-rose-500">
                <RotateCcw className="h-3.5 w-3.5" /> Reset All
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset all memory?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all {total} memories across all
                  types. Your digital twin will lose personalization context.
                  This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={resetAll}
                  className="bg-rose-500 hover:bg-rose-600"
                >
                  Reset all
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Filter memories by category or key…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <LoadingState label="Loading memory…" />
      ) : total === 0 ? (
        <EmptyState
          icon={Brain}
          title="No memories yet"
          description="Your Digital Persona Twin will start collecting memories as you chat and shop. Add one manually to get started."
          action={
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" /> Add a memory
            </Button>
          }
        />
      ) : (
        <Tabs defaultValue="long_term">
          <TabsList className="w-full justify-start overflow-x-auto scrollbar-thin">
            {TABS.map((t) => (
              <TabsTrigger key={t.key} value={t.key} className="text-xs">
                {t.label}{' '}
                <Badge variant="secondary" className="ml-1.5 text-[10px] py-0 px-1.5">
                  {data?.[t.key]?.length || 0}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          {TABS.map((t) => {
            const items = (data?.[t.key] || []).filter(
              (m) =>
                !search ||
                m.category?.toLowerCase().includes(search.toLowerCase()) ||
                m.key?.toLowerCase().includes(search.toLowerCase()),
            )
            return (
              <TabsContent key={t.key} value={t.key} className="mt-3">
                {items.length === 0 ? (
                  <EmptyState
                    title={`No ${t.label.toLowerCase()} memories`}
                    description="Memories of this type will appear here."
                  />
                ) : (
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    {items.map((m, i) => (
                      <MemoryCard
                        key={m.id}
                        m={m}
                        index={i}
                        editing={editingId === m.id}
                        editValue={editValue}
                        onEditStart={() => {
                          setEditingId(m.id)
                          setEditValue(m.value)
                        }}
                        onEditCancel={() => setEditingId(null)}
                        onEditSave={() => {
                          patchMutation.mutate({
                            id: m.id,
                            value: editValue,
                          })
                          setEditingId(null)
                        }}
                        onEditChange={setEditValue}
                        onConfidenceChange={(c) =>
                          patchMutation.mutate({ id: m.id, confidence: c })
                        }
                        onDelete={() => deleteMutation.mutate(m.id)}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            )
          })}
        </Tabs>
      )}

      <AddMemoryDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onAdded={() => qc.invalidateQueries({ queryKey: ['memory'] })}
      />
    </div>
  )
}

function MemoryCard({
  m,
  index,
  editing,
  editValue,
  onEditStart,
  onEditCancel,
  onEditSave,
  onEditChange,
  onConfidenceChange,
  onDelete,
}: {
  m: ApiMemoryItem
  index: number
  editing: boolean
  editValue: string
  onEditStart: () => void
  onEditCancel: () => void
  onEditSave: () => void
  onEditChange: (v: string) => void
  onConfidenceChange: (c: number) => void
  onDelete: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.02, 0.3) }}
      className="rounded-lg border border-border/60 bg-card p-3 space-y-2"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
              {m.category}
            </Badge>
            <span className="text-[10px] text-muted-foreground">
              weight {m.weight?.toFixed(1)}
            </span>
            <span className="text-[10px] text-muted-foreground">
              · {m.source}
            </span>
          </div>
          <div className="text-xs font-semibold mt-1 truncate">{m.key}</div>
        </div>
        <div className="flex shrink-0 gap-0.5">
          {editing ? (
            <>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-emerald-500"
                onClick={onEditSave}
              >
                <Check className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={onEditCancel}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </>
          ) : (
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={onEditStart}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-rose-500"
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {editing ? (
        <textarea
          value={editValue}
          onChange={(e) => onEditChange(e.target.value)}
          rows={2}
          className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs resize-none"
        />
      ) : (
        <div className="text-xs text-muted-foreground line-clamp-3">
          {m.value}
        </div>
      )}

      <div>
        <div className="flex items-center justify-between text-[10px] mb-1">
          <span className="text-muted-foreground">Confidence</span>
          <span
            className="font-semibold"
            style={{ color: confidenceColor(m.confidence) }}
          >
            {Math.round(m.confidence)}%
          </span>
        </div>
        <Slider
          value={[m.confidence]}
          min={0}
          max={100}
          step={1}
          onValueChange={(v) => onConfidenceChange(v[0])}
          className="[&>span:first-child]:h-1.5"
        />
      </div>

      <div className="text-[10px] text-muted-foreground">
        Updated {relativeTime(m.updatedAt || m.createdAt)}
      </div>
    </motion.div>
  )
}

function AddMemoryDialog({
  open,
  onOpenChange,
  onAdded,
}: {
  open: boolean
  onOpenChange: (b: boolean) => void
  onAdded: () => void
}) {
  const [type, setType] = React.useState('long_term')
  const [category, setCategory] = React.useState('preference')
  const [key, setKey] = React.useState('')
  const [value, setValue] = React.useState('')
  const [confidence, setConfidence] = React.useState(70)
  const [saving, setSaving] = React.useState(false)

  async function save() {
    if (!key.trim() || !value.trim()) {
      toast.error('Key and value are required')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          category,
          key,
          value,
          confidence,
          source: 'manual',
        }),
      })
      if (!res.ok) throw new Error()
      toast.success('Memory added')
      setKey('')
      setValue('')
      setConfidence(70)
      onOpenChange(false)
      onAdded()
    } catch {
      toast.error('Could not add memory')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Memory</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="long_term">Long-term</SelectItem>
                  <SelectItem value="semantic">Semantic</SelectItem>
                  <SelectItem value="episodic">Episodic</SelectItem>
                  <SelectItem value="session">Session</SelectItem>
                  <SelectItem value="short_term">Short-term</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Category</Label>
              <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Key</Label>
            <Input
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="e.g. preferred_laptop_brand"
              className="h-9 text-xs"
            />
          </div>
          <div>
            <Label className="text-xs">Value</Label>
            <textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              rows={3}
              placeholder="e.g. Prefers MacBook for creative work, Dell XPS for business"
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs resize-none"
            />
          </div>
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <Label>Confidence</Label>
              <span className="font-semibold">{confidence}%</span>
            </div>
            <Slider
              value={[confidence]}
              min={0}
              max={100}
              step={1}
              onValueChange={(v) => setConfidence(v[0])}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            size="sm"
          >
            Cancel
          </Button>
          <Button onClick={save} disabled={saving} size="sm">
            Save memory
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
