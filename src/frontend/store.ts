'use client'

import { create } from 'zustand'

// ----- Local types (mirror of backend types) -----
export type ViewKey =
  | 'home'
  | 'chat'
  | 'discover'
  | 'wishlist'
  | 'memory'
  | 'twin'
  | 'coach'
  | 'timeline'
  | 'sales'
  | 'insights'
  | 'settings'

export interface UserState {
  id: string
  name: string
  email: string
  personaCluster: string | null
  twinConfidence: number
  memoryEnabled: boolean
  personalizationEnabled: boolean
  hasOnboarded: boolean
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  metadata?: ChatMetadata
  createdAt: string
}

export interface ChatSession {
  id: string
  title: string
  searchText?: string
  messageCount: number
  updatedAt: string
  createdAt: string
}

export interface ChatMetadata {
  intent?: string
  complexity?: 'simple' | 'moderate' | 'complex'
  agentsUsed?: string[]
  ahdePlan?: AhdePlan
  recommendations?: RecommendationResult[]
  traceId?: string
  latencyMs?: number
}

export interface AhdePlan {
  requiredAgents: string[]
  skippedAgents: string[]
  dataSources: { cached: string[]; live: string[] }
  parallel: boolean
  modelTier: 'fast' | 'standard' | 'deep'
  reason: string
}

export interface RecommendationResult {
  productId: string
  name: string
  brand: string
  category: string
  imageColor: string
  shoppingScore: number
  bestPlatform: string
  bestPrice: number
  mrp: number
  discount: number
  rating: number
  reviewCount: number
  deliveryDays: number
  scoreBreakdown: {
    preference: number
    price: number
    review: number
    spec: number
    twinCompat: number
    memory: number
    context: number
    availability: number
  }
  explanation: string
  pros: string[]
  cons: string[]
  specs: Record<string, string | number | boolean>
  priceAdvice?: {
    trend: string
    advice: string
    avgPrice: number
    lowest: number
    highest: number
  }
}

export interface NotificationItem {
  id: string
  type: string
  title: string
  message: string
  productId?: string
  read: boolean
  createdAt: string
}

interface AppState {
  // Boot
  booted: boolean
  bootError: string | null
  setBooted: (booted: boolean) => void
  setBootError: (err: string | null) => void

  // User
  user: UserState | null
  setUser: (u: UserState | null) => void
  clearSessionState: () => void
  updateUser: (patch: Partial<UserState>) => void

  // Navigation
  activeView: ViewKey
  setActiveView: (v: ViewKey) => void

  // Chat
  chatMessages: ChatMessage[]
  activeChatSessionId: string | null
  chatSessions: ChatSession[]
  chatLoading: boolean
  setChatMessages: (m: ChatMessage[]) => void
  setActiveChatSessionId: (id: string | null) => void
  setChatSessions: (sessions: ChatSession[]) => void
  addChatMessage: (m: ChatMessage) => void
  setChatLoading: (b: boolean) => void
  pendingChatInput: string | null
  setPendingChatInput: (s: string | null) => void

  // Notifications
  notifications: NotificationItem[]
  setNotifications: (n: NotificationItem[]) => void
  unreadCount: number
  setUnreadCount: (n: number) => void

  // Mobile sidebar
  mobileNavOpen: boolean
  setMobileNavOpen: (b: boolean) => void

  // Notification dropdown
  notifOpen: boolean
  setNotifOpen: (b: boolean) => void

  // Comparison tray — products added for side-by-side comparison
  compareItems: CompareItem[]
  compareOpen: boolean
  addToCompare: (item: CompareItem) => void
  removeFromCompare: (productId: string) => void
  clearCompare: () => void
  setCompareOpen: (b: boolean) => void

  // Product detail modal
  productDetailId: string | null
  productDetailOpen: boolean
  openProductDetail: (id: string) => void
  closeProductDetail: () => void
}

export interface CompareItem {
  productId: string
  name: string
  brand: string
  category: string
  imageColor: string
  bestPlatform: string
  bestPrice: number
  mrp: number
  discount: number
  rating: number
  reviewCount: number
  deliveryDays: number
  shoppingScore?: number
  specs?: Record<string, string | number>
  pros?: string[]
  cons?: string[]
  priceAdvice?: { trend: string; advice: string; avgPrice: number; lowest: number; highest: number }
}

export const useAppStore = create<AppState>((set) => ({
  booted: false,
  bootError: null,
  setBooted: (booted) => set({ booted }),
  setBootError: (bootError) => set({ bootError }),

  user: null,
  setUser: (user) => set({ user }),
  clearSessionState: () => set({
    user: null,
    booted: false,
    bootError: null,
    activeView: 'home',
    chatMessages: [],
    activeChatSessionId: null,
    chatSessions: [],
    chatLoading: false,
    pendingChatInput: null,
    notifications: [],
    unreadCount: 0,
    mobileNavOpen: false,
    notifOpen: false,
    compareItems: [],
    compareOpen: false,
    productDetailId: null,
    productDetailOpen: false,
  }),
  updateUser: (patch) =>
    set((s) => (s.user ? { user: { ...s.user, ...patch } } : {})),

  activeView: 'home',
  setActiveView: (activeView) => set({ activeView }),

  chatMessages: [],
  activeChatSessionId: null,
  chatSessions: [],
  chatLoading: false,
  setChatMessages: (chatMessages) => set({ chatMessages }),
  setActiveChatSessionId: (activeChatSessionId) => set({ activeChatSessionId }),
  setChatSessions: (chatSessions) => set({ chatSessions }),
  addChatMessage: (m) =>
    set((s) => ({ chatMessages: [...s.chatMessages, m] })),
  setChatLoading: (chatLoading) => set({ chatLoading }),
  pendingChatInput: null,
  setPendingChatInput: (pendingChatInput) => set({ pendingChatInput }),

  notifications: [],
  setNotifications: (notifications) => set({ notifications }),
  unreadCount: 0,
  setUnreadCount: (unreadCount) => set({ unreadCount }),

  mobileNavOpen: false,
  setMobileNavOpen: (mobileNavOpen) => set({ mobileNavOpen }),

  notifOpen: false,
  setNotifOpen: (notifOpen) => set({ notifOpen }),

  compareItems: [],
  compareOpen: false,
  addToCompare: (item) =>
    set((s) => {
      // max 4 items, no duplicates
      if (s.compareItems.some((x) => x.productId === item.productId)) return s
      if (s.compareItems.length >= 4) return s
      return { compareItems: [...s.compareItems, item] }
    }),
  removeFromCompare: (productId) =>
    set((s) => ({ compareItems: s.compareItems.filter((x) => x.productId !== productId) })),
  clearCompare: () => set({ compareItems: [] }),
  setCompareOpen: (compareOpen) => set({ compareOpen }),

  productDetailId: null,
  productDetailOpen: false,
  openProductDetail: (id) => set({ productDetailId: id, productDetailOpen: true }),
  closeProductDetail: () => set({ productDetailOpen: false, productDetailId: null }),
}))
