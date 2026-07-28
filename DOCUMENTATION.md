# AI Shopping OS — Technical Documentation

## Project Summary

**AI Shopping OS** is a Memory-Augmented Multi-Agent Cross-Platform Shopping Intelligence Platform. Rather than selling products, it sits *above* existing shopping platforms (Amazon, Flipkart, Myntra, Croma, Reliance Digital, Nykaa, Ajio, Tata CLiQ, Meesho) and helps users discover, compare, evaluate, save, and purchase products through explainable AI that continuously learns their preferences.

This implementation is based on the 20-chapter PRD (`PRD.docx`) and covers the platform's core research contributions:

1. **MARE** — Memory-Augmented Recommendation Engine
2. **AHDE** — Adaptive Hybrid Decision Engine
3. **DPT → DToC evolution** — Digital Persona Twin → Digital Twin of the Customer
4. **Multi-Agent collaboration** — 11 specialized AI agents coordinated by an Orchestrator
5. **Explainable Shopping Intelligence** — every recommendation includes a human-readable "why"
6. **Cross-Platform Shopping Architecture** — unified connectors to 9 platforms

---

## 1. Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Framework** | Next.js 16 (App Router) | Full-stack React framework with server route handlers |
| **Language** | TypeScript 5 | Type-safe end-to-end |
| **Styling** | Tailwind CSS 4 | Utility-first styling with emerald/teal design system |
| **UI Components** | shadcn/ui (New York) + Radix UI + Lucide icons | Accessible, composable component library |
| **Database** | Prisma ORM + SQLite | Persistent storage for users, memories, products, twins |
| **AI/LLM** | z-ai-web-dev-sdk | Backend LLM for intent detection, explanations, memory extraction |
| **State Management** | Zustand | Client state (active view, user, chat messages, notifications) |
| **Server State** | TanStack React Query | Data fetching, caching, mutations for all API views |
| **Charts** | Recharts | Radar chart (twin traits), bar/pie/line charts (insights) |
| **Animations** | Framer Motion | View transitions, card entrance, onboarding steps |
| **Forms** | react-hook-form + zod | Onboarding validation |
| **Notifications** | Sonner | Toast feedback |
| **Theming** | next-themes | Light/dark mode |
| **Date Utils** | date-fns | Relative timestamps in timeline |

### Why this stack?
- **Next.js 16 App Router** matches the PRD's "frontend never directly communicates with AI models" principle — all AI calls go through backend route handlers.
- **Prisma + SQLite** provides a typed, migration-friendly data layer without external DB dependencies (ideal for the sandboxed demo).
- **z-ai-web-dev-sdk** powers the LLM-driven agents (intent, memory extraction, explainability) entirely on the backend, keeping the frontend model-agnostic.
- **Zustand + React Query** cleanly separate ephemeral UI state from server state.

---

## 2. Datasets

### 2.1 Mock Product Catalog (Simulated Cross-Platform Data)
Since live scraping of Amazon/Flipkart/etc. is not permitted in this environment, we built a **realistic mock catalog** that simulates what the Search Agent's platform connectors would return.

- **30 products** across **10 categories**: laptop, phone, earbuds, tv, watch, camera, appliance, fashion, beauty, home
- Each product has:
  - Normalized specs (RAM, processor, GPU, display, battery, etc. — varies by category)
  - **2–4 platform prices** (e.g., Lenovo IdeaPad Gaming 3 is priced differently on Amazon, Flipkart, Croma, Reliance) — simulates the cross-platform connector layer
  - Per-platform: price, MRP, discount %, delivery days, in-stock flag, seller, warranty
  - **8 weeks of price history** per platform (weekly snapshots with realistic variance) — powers the Price Intelligence Agent's trend analysis
  - Review metadata: rating, review count, sentiment score (-1 to 1), pros[], cons[], tags[]
- Categories represented: Lenovo, ASUS, Apple, HP, Dell, Acer (laptops); Samsung, Apple, OnePlus, Google, Xiaomi (phones); Sony, Apple, boAt, OnePlus (earbuds); Samsung, LG (TVs); Apple, Samsung, Fire-Boltt (watches); Sony (cameras); LG, IFB (appliances); Levi's, Nike, Allen Solly (fashion); Maybelline, The Ordinary (beauty); Philips, Dyson (home)

### 2.2 User Data (Generated at Runtime)
- **Onboarding questionnaire** → 6 seed memories + persona cluster + initial Digital Twin
- **Chat interactions** → intent detection, memory extraction (LLM), twin evolution signals
- **Wishlist, recommendations, timeline events, notifications** → all persisted in SQLite

### 2.3 Persona Clusters (DPT Centroids)
6 predefined behavioral clusters, each with 9 trait defaults:
- 🎯 Budget-Conscious Shopper
- 💎 Premium Buyer
- 📚 Student Shopper
- 👗 Fashion Enthusiast
- 🏠 Family Shopper
- ⚙️ Tech Enthusiast

Traits per cluster: shoppingStyle, budgetFlexibility, brandLoyalty, priceSensitivity, purchaseConfidence, technologyAdoption, impulseBuyingScore, discountPreference, comparisonFrequency, shoppingConsistency, riskTolerance.

### 2.4 Mapping to PRD Evaluation Datasets (§18.4)
The PRD references public datasets (Amazon Product Reviews, Flipkart Product Dataset, Kaggle E-commerce). Our mock catalog is structured to be **drop-in compatible** with these — the `Product`, `PlatformPrice`, and `PriceHistory` Prisma models can ingest real data without schema changes.

---

## 3. Architecture

### 3.1 System Layers (per PRD §5.5)

```
Presentation Layer   →  Next.js client components (chat, dashboards)
       ↓
Application Layer    →  Next.js Route Handlers (/api/*)
       ↓
AI Layer             →  Multi-Agent System (src/lib/agents.ts)
                          ├─ Intent Agent
                          ├─ AHDE (Adaptive Hybrid Decision Engine)
                          ├─ Orchestrator (coordinate)
                          ├─ Search Agent
                          ├─ Memory Agent
                          ├─ Digital Twin Agent
                          ├─ Recommendation Agent (MARE)
                          ├─ Review Agent
                          ├─ Price Agent
                          ├─ Budget Agent
                          ├─ Explainability Agent
                          └─ Cart / Notification Agents
       ↓
Business Logic       →  MARE scoring engine (src/lib/scoring.ts)
                          Persona clustering (src/lib/persona.ts)
       ↓
Data Layer           →  Prisma + SQLite (11 models)
       ↓
External Services    →  z-ai-web-dev-sdk (LLM), mock platform connectors
```

### 3.2 Multi-Agent System (PRD Chapter 6)

| Agent | Responsibility | Implementation |
|-------|---------------|----------------|
| **Intent Detection** | Parses user message → intent, category, budget, useCase, brands, complexity | LLM call (`llmJson`) with fallback heuristic |
| **AHDE** | Decides which agents/models/data-sources to activate based on intent + complexity + twin confidence | Pure function (`ahde()`) — no LLM, deterministic routing |
| **Orchestrator** | Coordinates parallel/sequential agent execution | Implicit in `/api/chat` route handler |
| **Search** | Retrieves candidate products from catalog (simulates platform connectors) | Prisma query with category/tag/brand filtering |
| **Memory** | Retrieves long-term/semantic/episodic memories; extracts new memories from interactions | Prisma + LLM extraction |
| **Digital Twin** | Loads evolving behavioral model; evolves it from interaction signals | JSON in User table + `evolveTwin()` |
| **Recommendation (MARE)** | Ranks products via 8-factor Shopping Score with category-weighted fusion | `scoreProduct()` in scoring.ts |
| **Review Analysis** | Summarizes pros/cons/sentiment into natural language | LLM call |
| **Price Intelligence** | Analyzes 8-week price history → trend + buy-timing advice | Pure computation over PriceHistory |
| **Budget** | Filters/validates against user's budget memory | Prisma memory lookup |
| **Explainability** | Generates the final natural-language response with reasoning | LLM call with structured payload |
| **Cart** | Placeholder — always requires user confirmation (per PRD §6.18) | Returns guidance text |
| **Notification** | Generates price-drop / sale / restock notifications | Prisma scan of wishlist vs current prices |

### 3.3 MARE — Memory-Augmented Recommendation Engine (PRD Chapter 12)

The Shopping Score is an 8-factor weighted fusion:

```
Shopping Score = 
  preference   × W₁  (brand/category match from memory + twin)
+ price        × W₂  (discount + budget fit)
+ review       × W₃  (rating + sentiment + volume)
+ spec         × W₄  (tag-based quality signals)
+ twinCompat   × W₅  (digital twin behavioral alignment)
+ memory       × W₆  (explicit memory signals about product/brand)
+ context      × W₇  (intent use-case match)
+ availability × W₈  (in-stock + delivery)
```

**Weights vary by category** (per PRD §12.7):
- Electronics (laptop, phone, TV, camera): specs weighted higher (0.18)
- Fashion/Beauty: reviews weighted higher (0.20)
- Appliances/Home: price weighted higher (0.22)

Each recommendation includes a **score breakdown** (8 bars, 0–100 each) and a **natural-language explanation** generated by `buildExplanation()`.

### 3.4 AHDE — Adaptive Hybrid Decision Engine (PRD Chapter 13)

AHDE sits *before* the Orchestrator and decides what to execute:

| Intent | Complexity | Agents Activated | Model Tier | Parallel |
|--------|-----------|-----------------|------------|----------|
| recommendation | complex | 8 (search, memory, twin, rec, review, price, budget, explain) | deep | yes |
| recommendation | moderate | 8 | standard | yes |
| comparison | — | 5 (search, review, price, rec, explain) | standard | yes |
| price_tracking | simple | 3 (search, price, memory) | fast | yes |
| search | simple | 2 (search, rec) | fast | yes |
| greeting | simple | 1 (memory) | fast | yes |
| cart | — | 2 (cart, memory) | fast | no |

This reduces unnecessary computation — a simple "what's the price?" query activates 2 agents instead of 11.

### 3.5 DPT → DToC Evolution (PRD Chapter 8)

1. **Onboarding** → `clusterPersona(data)` assigns one of 6 clusters (K-means-like centroid scoring)
2. **Initial Twin** → `buildInitialTwin(cluster, data)` seeds 9 behavioral traits from cluster defaults + onboarding preferences
3. **Twin Confidence** starts at 20% (cold start)
4. **Each interaction** → `evolveTwin(twin, signal)` nudges traits by small deltas (purchase → +purchaseConfidence, comparison → +comparisonFrequency, etc.)
5. **Confidence grows** +1 per interaction, capping at 100%
6. **Memory Evolution** → repeated signals increase confidence + weight; old memories decay

---

## 4. Features Implemented

### 4.1 Onboarding (6-step wizard)
Welcome → Categories → Budget → Brands & Platforms → Lifestyle → Create Twin
- Multi-select chips, radio cards, sliders, textarea
- Persona reveal with emoji + label + 6 seed memories

### 4.2 Chat Interface (primary view)
- Conversational UI with user/assistant bubbles
- **Agent Activity Panel** (desktop, right side): live AHDE plan, agent grid (✓/skip), data sources, model tier, latency
- Quick-suggestion chips for common queries
- Loading state with animated dots during LLM calls

### 4.3 Product Recommendation Cards
- Shopping Score ring (color-coded: green ≥85, amber ≥70, red <70)
- Best platform + price + MRP strikethrough + discount badge
- Rating, review count, delivery days
- Expandable "Why this?" with 8-factor breakdown bars + explanation text
- Pros (green) / Cons (red) chips
- Specs grid
- Price Intelligence (trend arrow + 8-week low/avg/high + buy-timing advice)
- Actions: Add to Wishlist, Compare, View on {platform}, Track Price

### 4.4 Memory Dashboard
- 5 tabs (Long-term, Semantic, Episodic, Session, Short-term) with counts
- Per-memory: category badge, key, value, confidence slider (inline edit), weight, source
- Add / Edit / Delete operations
- Memory Enabled toggle, Export JSON, Reset All (with confirmation)
- Search/filter by category or key

### 4.5 Digital Twin Dashboard
- Persona cluster badge (emoji + label + color)
- Twin Confidence gauge (circular progress)
- **9-axis Radar Chart** (Recharts) of behavioral traits
- Trait breakdown bars (emerald/teal palette)
- Preferred categories / brands / platforms chips
- Lifestyle text, risk tolerance, shopping style
- Explainability callout ("Why does my Twin look like this?")
- Evolution History timeline
- Reset Twin / Disable Personalization controls

### 4.6 Timeline View
- Vertical timeline with 10 event types (🔍 search, ✨ recommendation, ❤️ wishlist, 🛒 purchase, ⚖️ comparison, 📉 price_drop, 🧠 memory_update, 🔄 twin_update, 🚀 onboarding, 🔔 notification)
- Relative timestamps (date-fns `formatDistanceToNow`)
- Metadata chips per event
- Filter by type

### 4.7 Insights Dashboard
- 4 KPI cards: Products Compared, Total Saved (₹), Avg Shopping Score, Memory Count
- Top Categories bar chart
- Top Brands bar chart
- Platform Usage pie/donut chart (platform-colored)
- Price Trend line chart (weekly average across all tracked products)
- Recent Activity list

### 4.8 Wishlist View
- Product cards with current best price vs target price
- "Target hit!" badge when current ≤ target
- Inline target price editor + Set Alert
- Remove, View on Platform

### 4.9 Discover View
- Search bar + category filter chips
- Product grid with best platform price, rating, "Ask AI" handoff to chat

### 4.10 Settings View
- 9 platform connect/disconnect toggles
- Personalization switches (memoryEnabled, personalizationEnabled)
- Export My Data (JSON), Delete All My Data (with confirmation)
- About section

### 4.11 Notification System
- Header bell with unread count badge
- Dropdown list, mark-as-read on click
- Auto-generated price-drop notifications when wishlist target hit

### 4.12 Cross-Cutting
- **Light/dark mode** (next-themes, emerald accent in both)
- **Responsive**: sidebar on desktop, bottom nav on mobile
- **Sticky footer** (per design rules)
- **Custom scrollbar** styling
- **Accessibility**: semantic HTML, ARIA labels, keyboard nav
- **Framer Motion** animations (onboarding steps, card entrance)

---

## 5. API Endpoints (17 routes)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/init` | GET | Bootstrap demo user, return onboarding status |
| `/api/onboarding` | POST | Persona clustering + twin creation + seed memories + connected accounts |
| `/api/chat` | POST | **Main orchestrator**: intent → AHDE → agents → explainability → persist |
| `/api/chat/history` | GET | Last 50 chat messages with parsed metadata |
| `/api/memory` | GET/POST/PATCH/DELETE | Memory CRUD grouped by type |
| `/api/memory/[id]` | DELETE/PATCH | Single memory operations |
| `/api/digital-twin` | GET/POST | Load twin + history; reset/disable/enable/update actions |
| `/api/wishlist` | GET/POST | List + upsert wishlist items |
| `/api/wishlist/[id]` | DELETE/PATCH | Remove / update target price |
| `/api/timeline` | GET | Last 100 events with type filter |
| `/api/notifications` | GET/POST | List + refresh + mark read |
| `/api/products` | GET | Filtered catalog with platform prices + price history |
| `/api/products/[id]` | GET | Single product detail |
| `/api/insights` | GET | 10 aggregated analytics (KPIs, charts data) |
| `/api/accounts` | GET/POST/DELETE | Connect/disconnect platforms |
| `/api/recommendations` | GET | Last 30 with status filter |
| `/api/recommendations/[id]` | PATCH | Update status (saved/purchased/ignored) with side effects |

---

## 6. Data Model (Prisma)

11 models in `prisma/schema.prisma`:

- **User** — profile, onboarding JSON, personaCluster, twinConfidence, digitalTwin JSON, memoryEnabled, personalizationEnabled
- **Memory** — type (6 types), category, key, value, confidence (0-100), weight (decay multiplier), source
- **Product** — name, brand, category, specs JSON, basePrice, rating, reviewCount, pros/cons JSON, sentimentScore, tags
- **PlatformPrice** — per-platform price/mrp/discount/delivery/stock/seller/warranty (the cross-platform connector data)
- **PriceHistory** — weekly price snapshots for trend analysis
- **ChatMessage** — role, content, metadata JSON (intent, agentsUsed, ahdePlan, recommendations, latencyMs)
- **Recommendation** — shoppingScore, scoreBreakdown JSON, explanation, intent, status
- **WishlistItem** — productId, targetPrice (for drop alerts), notes
- **TimelineEvent** — type, title, description, metadata JSON
- **Notification** — type, title, message, read flag
- **ConnectedAccount** — platform, connected flag

---

## 7. Verification Results

End-to-end testing performed via **agent-browser** (headless Chrome automation) and **VLM** (vision model screenshot analysis):

### Functional Tests (all passed)
- ✅ Onboarding: 6-step wizard → persona assigned "Student Shopper" 📚 (correctly clustered from "college student" lifestyle)
- ✅ Chat: "Recommend a gaming laptop under 70000 for ML" → 8 agents activated (deep model), Lenovo IdeaPad Gaming 3 ranked #1 with Shopping Score 86/100
- ✅ AHDE routing: simple "what's the price?" query → only 2 agents activated (fast model) — demonstrates adaptive efficiency
- ✅ Explainability: "Great value — 13% off MRP • Highly rated (4.3★) • Matches your preferred brand (Lenovo) • Tailored to your gaming/ML intent"
- ✅ Cross-platform comparison: prices compared across Flipkart, Croma, Amazon
- ✅ Wishlist: Add to Wishlist from recommendation card → appears in Wishlist view with target price alert
- ✅ Memory Dashboard: 6 onboarding memories displayed with confidence sliders, edit/delete working
- ✅ Digital Twin: radar chart + trait bars + persona + evolution history all render
- ✅ Insights: KPI cards + bar/pie/line charts render with correct data
- ✅ Timeline: events with icons, metadata chips, relative timestamps
- ✅ Settings: 9 platform toggles, personalization switches, data export

### VLM Visual Assessment
- Chat view: **"Production-Quality (9/10) — clean three-column layout, emerald accent on dark mode, professional typography, sophisticated UI, no critical bugs"**
- Digital Twin view: radar chart, trait bars, persona card all render correctly
- Insights view: KPI cards + charts render correctly

### Quality Gates
- ✅ `bun run lint` — zero errors, zero warnings
- ✅ No runtime errors in dev.log
- ✅ Dev server stable on port 3000

---

## 8. PRD Coverage Map

| PRD Chapter | Feature | Status |
|-------------|---------|--------|
| Ch 1-4: Vision & Solution | Shopping intelligence layer above platforms | ✅ |
| Ch 5: System Architecture | 6-layer modular architecture | ✅ |
| Ch 6: Multi-Agent System | 11 agents + Orchestrator | ✅ |
| Ch 7: Memory Architecture | 6 memory types, confidence, decay, evolution | ✅ |
| Ch 8: Digital Twin (DPT + DToC) | Onboarding clustering → evolving twin | ✅ |
| Ch 9: Recommendation System | Multi-stage pipeline, personalized ranking | ✅ |
| Ch 10: AI Models | LLM-driven agents (intent, explainability, memory, review) | ✅ |
| Ch 11: Data Pipeline | Knowledge pipeline: collection → cleaning → features → store | ✅ (mock) |
| Ch 12: MARE | 8-factor feature fusion + Shopping Score | ✅ |
| Ch 13: AHDE | Adaptive agent/model/data-source selection | ✅ |
| Ch 14: Cross-Platform Connectors | 9 platforms with normalized interface | ✅ (mock) |
| Ch 15: Security & Privacy | Memory dashboard, twin reset, data export, consent toggles | ✅ |
| Ch 16: Tech Stack | Next.js + Prisma + LLM SDK | ✅ (adapted from FastAPI+MongoDB) |
| Ch 17: End-to-End Workflow | Full chat → agents → recommendation → memory update flow | ✅ |
| Ch 18: Evaluation Methodology | Insights dashboard with metrics (Precision/Recall proxies) | ✅ (partial) |
| Ch 19: Future Scope | Architecture supports adding new agents/models | ✅ (extensible) |
| Ch 20: Conclusion | All 8 major contributions implemented | ✅ |

---

## 9. How to Run

```bash
cd /home/z/my-project
bun run dev          # Starts Next.js on port 3000
bun run db:push      # Push Prisma schema (already done)
bun run lint         # ESLint check
```

The app auto-creates a demo user on first visit. Complete the 6-step onboarding to create your Digital Persona Twin, then chat with the multi-agent system.

---

## 10. File Structure

```
prisma/
  schema.prisma          # 11 models
src/
  app/
    api/                 # 17 route handlers
      init, onboarding, chat, memory, digital-twin,
      wishlist, timeline, notifications, products,
      insights, accounts, recommendations
    layout.tsx           # Theme + Query providers
    page.tsx             # App shell + view router
    globals.css          # Emerald/teal theme tokens
  components/
    shell/               # header, sidebar, bottom-nav
    onboarding/          # 6-step wizard
    views/               # 8 dashboard views
    chat/                # recommendation-card, agent-activity-panel
    common/              # product-visual, score-ring, score-bars, empty-state
    ui/                  # shadcn/ui components
  lib/
    db.ts                # Prisma client
    llm.ts               # z-ai-web-dev-sdk wrapper (llmChat, llmJson)
    agents.ts            # 11 agents + AHDE
    persona.ts           # DPT clustering + twin evolution
    scoring.ts           # MARE 8-factor Shopping Score
    seed.ts              # 30-product mock catalog
    session.ts           # demo user
    store.ts             # Zustand store
    types.ts             # shared domain types
    ui-utils.ts          # formatINR, platformColor, scoreColor
public/
  logo.png               # AI-generated brand logo
```

---

*Documentation generated for AI Shopping OS. Based on PRD.docx (20 chapters). Built with Next.js 16, TypeScript, Prisma, and z-ai-web-dev-sdk.*
