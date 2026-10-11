'use client'

import {
  ArrowUpRight,
  Compass,
  GitCompare,
  Heart,
  MessageSquare,
  Users,
} from 'lucide-react'
import { useAppStore, type ViewKey } from '@/lib/store'
import { OrbisLogo } from '@/components/shell/orbis-logo'

const features: {
  key: ViewKey | 'compare'
  title: string
  description: string
  icon: typeof MessageSquare
  accent: string
}[] = [
  {
    key: 'chat',
    title: 'Chat',
    description: 'Ask anything, instantly',
    icon: MessageSquare,
    accent: 'pink',
  },
  {
    key: 'discover',
    title: 'Discover',
    description: 'Explore products and find the best deals',
    icon: Compass,
    accent: 'green',
  },
  {
    key: 'compare',
    title: 'Compare',
    description: 'Find the best value across platforms',
    icon: GitCompare,
    accent: 'blue',
  },
  {
    key: 'wishlist',
    title: 'Wishlist',
    description: 'Keep the things you love close',
    icon: Heart,
    accent: 'violet',
  },
  {
    key: 'twin',
    title: 'Digital Twin',
    description: 'Shopping that gets more personal',
    icon: Users,
    accent: 'gold',
  },
]

const ribbons = [
  {
    id: 'pink',
    path: 'M-40 132 C130 132 195 112 340 124 S545 158 710 140 910 112 1080 128 1340 158 1640 132',
  },
  {
    id: 'gold',
    path: 'M-40 166 C145 184 220 194 390 168 S575 128 750 164 930 198 1100 170 1350 132 1640 166',
  },
  {
    id: 'green',
    path: 'M-40 200 C160 186 240 164 410 194 S600 232 780 200 960 164 1130 196 1370 232 1640 200',
  },
  {
    id: 'cyan',
    path: 'M-40 234 C145 256 235 274 410 238 S600 198 780 232 960 270 1130 238 1370 198 1640 234',
  },
  {
    id: 'violet',
    path: 'M-40 268 C155 248 245 228 420 264 S600 292 780 266 960 234 1130 270 1370 294 1640 268',
  },
]

function NeonRibbonBackground() {
  return (
    <svg
      aria-hidden="true"
      className="neon-ribbon-background"
      viewBox="0 0 1600 400"
      preserveAspectRatio="none"
      fill="none"
    >
      <defs>
        {ribbons.map(({ id }) => (
          <linearGradient
            key={id}
            id={`ribbon-${id}`}
            x1="0"
            y1="0"
            x2="1600"
            y2="0"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" className={`ribbon-stop-${id}-dim`} />
            <stop offset=".48" className={`ribbon-stop-${id}`} />
            <stop offset="1" className={`ribbon-stop-${id}-dim`} />
          </linearGradient>
        ))}
      </defs>
      {ribbons.map(({ id, path }) => (
        <g key={id} className={`neon-ribbon neon-ribbon-${id}`}>
          <path d={path} stroke="#050609" strokeWidth="21" opacity=".82" />
          <path d={path} stroke={`url(#ribbon-${id})`} strokeWidth="15" />
          <path
            d={path}
            className="neon-ribbon-highlight"
            stroke="rgb(255 255 255 / 0.56)"
            strokeWidth="2.5"
          />
        </g>
      ))}
    </svg>
  )
}

export function DashboardView() {
  const setActiveView = useAppStore((state) => state.setActiveView)
  const setCompareOpen = useAppStore((state) => state.setCompareOpen)

  function openFeature(key: ViewKey | 'compare') {
    if (key === 'compare') {
      setCompareOpen(true)
      return
    }
    setActiveView(key)
  }

  return (
    <section className="dashboard-view">
      <NeonRibbonBackground />
      <div className="dashboard-content">
        <div className="dashboard-hero">
          <OrbisLogo className="dashboard-brand" />
          <h1 className="dashboard-title">Your AI Shopping Assistant</h1>
          <p className="dashboard-tagline">
            <span>Compare</span><i /> <span>Discover</span><i /> <span>Track</span><i /> <span>Save</span>
          </p>
        </div>

        <nav aria-label="Shopping features" className="dashboard-features">
          {features.map(({ key, title, description, icon: Icon, accent }, index) => (
            <button
              key={key}
              type="button"
              className={`dashboard-feature-card feature-${accent}`}
              onClick={() => openFeature(key)}
              aria-label={`${title}: ${description}`}
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <span className="dashboard-feature-icon">
                <Icon aria-hidden="true" />
              </span>
              <span className="dashboard-feature-title">{title}</span>
              <span className="dashboard-feature-description">{description}</span>
              <span className="dashboard-feature-arrow">
                <ArrowUpRight aria-hidden="true" />
              </span>
            </button>
          ))}
        </nav>

        <p className="dashboard-footnote">
          A little more insight in every decision.
        </p>
      </div>
    </section>
  )
}
