# AI Shopping OS

**Memory-Augmented Multi-Agent Cross-Platform Shopping Intelligence Platform**

A detailed technical document of the implementation in this repository. It reflects the codebase as of August 2026 (Tasks 1–20 plus later polish), not only the original 17-route / 8-view snapshot in `DOCUMENTATION.md`.

---

## 1. What this project is

AI Shopping OS is a **shopping intelligence layer**. It does not operate a storefront or take payment. It sits *above* existing Indian e-commerce platforms and helps a person:

- discover products
- compare them across platforms
- understand *why* a product fits them
- save and track prices
- buy at a better time

The product is built around four research ideas from a 20-chapter PRD:

| Idea | Meaning in this repo |
|------|----------------------|
| **MARE** | Memory-Augmented Recommendation Engine — 8-factor Shopping Score |
| **AHDE** | Adaptive Hybrid Decision Engine — which agents and model tier to run |
| **DPT → DToC** | Digital Persona Twin (cold-start cluster) that evolves into a Digital Twin of the Customer |
| **Multi-agent OS** | Specialized agents (intent, search, memory, twin, ranking, reviews, price, budget, explainability, cart, notifications) coordinated by `/api/chat` |

**Design principle:** the browser never talks to the LLM. All model calls go through Next.js route handlers (`src/lib/llm.ts` + `z-ai-web-dev-sdk`).

---

## 2. Problem the PRD is solving

Typical shopping apps:

- forget preferences between sessions
- rank by ads or generic popularity
- cannot explain a recommendation
- force the user to open Amazon, Flipkart, Croma, etc. separately
- treat every query the same computationally (full pipeline even for “what’s the price?”)

This system treats shopping as a **personal, stateful, explainable process**: memories, a behavioral twin, cross-platform prices, and a human-readable “why”.

---

## 3. Technology stack

| Layer | Choice | Why |
|-------|--------|-----|
| App | Next.js 16 (App Router) | Full-stack; AI stays on the server |
| Language | TypeScript 5 | Shared types in `src/lib/types.ts` |
| UI | React 19, Tailwind CSS 4, shadcn/ui (New York), Radix, Lucide | Accessible SPA |
| Client state | Zustand (`src/lib/store.ts`) | Active view, user, chat, compare tray |
| Server state | TanStack React Query | Catalog, memory, twin, insights, etc. |
| Animation / charts | Framer Motion, Recharts | Views, radar, KPIs, evolution |
| Database | Prisma 6 + SQLite (`prisma/db/custom.db`) | Demo without an external DB |
| LLM | `z-ai-web-dev-sdk` | Intent, memory extract, explainability, coach, VLM, ASR, web search |
| Forms | react-hook-form + zod | Onboarding |
| Theme | next-themes | Dark default, emerald/teal accent (not indigo) |

**Run locally**

```bash
# from repo root
npm install          # or bun install
npx prisma db push
npx prisma db seed   # optional; init also seeds if empty
npm run dev          # Next.js on port 3000
```

First visit creates a demo user. Complete (or skip) onboarding, then use Chat.

---

## 4. System architecture

```
Presentation     Next.js client (single route `/`, 10 views)
       ↓ HTTP
Application      Route handlers under src/app/api/*
       ↓
AI layer         src/lib/agents.ts  +  /api/chat orchestrator
                 Intent → AHDE → Search / Memory / Twin / MARE / …
       ↓
Business logic   src/lib/scoring.ts (MARE)
                 src/lib/persona.ts (cluster + evolveTwin)
                 src/lib/conversation-context.ts (pronouns)
       ↓
Data             Prisma models (SQLite)
       ↓
External         z-ai-web-dev-sdk (LLM / VLM / ASR / web_search)
                 Mock “connectors” = PlatformPrice rows (not live scrape)
```

**Important demo constraint:** live scraping of Amazon/Flipkart is not used. Search Agent queries a seeded catalog of **58 products** with **2–4 platform prices** each and **8 weeks of price history**. Schema is intended to ingest real connector data later without redesign.

---

## 5. Multi-agent system

Implemented in `src/lib/agents.ts`. Intent always runs first. AHDE then chooses the rest.

### 5.1 Agents

| Agent | Role | Implementation |
|-------|------|----------------|
| **Intent** | Parse message → intent, category, budget, useCase, brands, complexity | LLM JSON + heuristic fallback |
| **AHDE** | Select agents, model tier (`fast` / `standard` / `deep`), parallel vs serial | Pure function `ahde()` |
| **Orchestrator** | Run the plan, persist chat/recs/timeline, fire async evolution | `src/app/api/chat/route.ts` |
| **Search** | Candidate products (simulates 9 platform connectors) | Prisma filter by category/brand/tags |
| **Memory** | Load long-term / semantic / episodic; extract new memories | Prisma + LLM extract |
| **Digital Twin** | Load twin JSON; evolve traits from signals | `User.digitalTwin` + `evolveTwin()` |
| **Recommendation (MARE)** | Rank with 8-factor Shopping Score | `scoreProduct()` |
| **Review** | Pros/cons/sentiment into language | LLM on product fields |
| **Price** | 8-week trend + buy-timing string | Computation on `PriceHistory` |
| **Budget** | Validate vs intent + budget memory | Prisma memories |
| **Explainability** | Final assistant narrative | LLM + `buildExplanation()` |
| **Cart** | Never auto-purchase; confirmation copy | Template / guidance |
| **Notification** | Price-drop / target-hit vs wishlist | Prisma scan |

### 5.2 Chat turn (actual `/api/chat` pipeline)

1. Reject if user has not onboarded.
2. **Conversation context** — resolve “it”, “this”, “compare it with …”.
3. **Intent agent** on the resolved text.
4. Load **Digital Twin**.
5. **AHDE** plan from intent + twin confidence + `memoryEnabled`.
6. Run **memory**, **search**, **budget**, **MARE** as required.
7. Attach **price advice** to the top 3 recs if price agent is on.
8. **Explainability** (or a template fallback).
9. Persist user/assistant `ChatMessage`, `Recommendation` rows, `TimelineEvent`.
10. **Do not await** memory extract + twin evolution (async side effects).

Response includes `response`, `recommendations`, `intent`, `ahdePlan`, `latencyMs`, `agentsUsed`, and context-resolution fields.

### 5.3 AHDE routing (summary)

| Intent | Typical agents | Model tier |
|--------|----------------|------------|
| recommendation (complex) | search, memory, twin, rec, review, price, budget, explain | deep |
| comparison | search, review, price, rec, explain | standard |
| price_tracking | search, price, memory | fast |
| search | search, rec | fast |
| greeting | memory | fast |
| cart | cart, memory (serial) | fast |
| budget | budget, memory, twin | fast |

A simple “what’s the price?” query is meant to activate a **small** subset, not all 11 agents.

---

## 6. MARE — Shopping Score

`src/lib/scoring.ts`. Each factor is 0–100; weights sum to 1.0 and **change by category**.

```
Shopping Score =
  preference   × W1   brand/category vs memory + twin
+ price        × W2   discount + budget fit
+ review       × W3   rating + sentiment + volume
+ spec         × W4   tags (premium, flagship, gaming, ml, …)
+ twinCompat   × W5   behavioral alignment
+ memory       × W6   explicit memory about brand/product
+ context      × W7   use-case / intent tags
+ availability × W8   in-stock + delivery
```

**Default weights:** preference 0.15, price 0.18, review 0.15, spec 0.12, twinCompat 0.13, memory 0.10, context 0.07, availability 0.10.

**Electronics** (laptop, phone, TV, camera, earbuds, watch): specs **0.18**, price 0.15.  
**Fashion / beauty:** reviews **0.20**, preference 0.18.  
**Appliances / home:** price **0.22**.

The UI shows a score ring, eight bars, and a sentence from `buildExplanation()` (discount, rating, preferred brand, twin, prior interest, intent, stock).

---

## 7. Memory architecture

Prisma `Memory` model. Six types:

| Type | Typical use |
|------|-------------|
| `long_term` | Durable prefs (budget, brands) from onboarding and repeats |
| `semantic` | Generalized facts (“prefers OLED”) |
| `episodic` | Events (purchases, comparisons) |
| `session` | Current conversation |
| `short_term` | Transient signals |
| `working` | Scratch / in-progress |

Fields: `category`, `key`, `value`, `confidence` (0–100), `weight` (decay), `source` (`explicit` | `inferred` | `onboarding` | `purchase` | `search` | `feedback`).

Onboarding seeds about **six** long-term memories. Chat may add more (capped per turn). Memory Dashboard supports CRUD, confidence sliders, export, and reset. `User.memoryEnabled` can turn retrieval/evolution off.

---

## 8. Digital Twin (DPT → DToC)

### Cold start (DPT)

`clusterPersona()` in `src/lib/persona.ts` scores onboarding answers against **six centroids**:

- Budget-Conscious Shopper  
- Premium Buyer  
- Student Shopper  
- Fashion Enthusiast  
- Family Shopper  
- Tech Enthusiast  

Signals: budget band, categories, discount importance, tech familiarity, shopping frequency, lifestyle text.

`buildInitialTwin()` copies cluster defaults and overlays preferred categories, brands, platforms, and lifestyle. **Twin confidence starts at 20%.**

### Evolution (DToC)

`evolveTwin()` applies small deltas from interaction signals (search, comparison, purchase, …). Confidence typically **+1 per interaction**, cap 100. Purchase via recommendation status can bump `purchaseConfidence`, `shoppingConsistency`, and preferred brand/category.

Traits (0–100 unless noted): shoppingStyle, budgetFlexibility, brandLoyalty, priceSensitivity, purchaseConfidence, technologyAdoption, impulseBuyingScore, discountPreference, comparisonFrequency, shoppingConsistency, preferred lists, riskTolerance, lifestyle.

UI: radar chart, trait bars, evolution area chart (`/api/digital-twin/evolution`), LLM personality analysis (`/api/digital-twin/analysis`). Users can reset twin or disable personalization.

**Skip onboarding** creates a generic “balanced” persona so chat can start immediately.

---

## 9. Data model (Prisma)

Eleven models in `prisma/schema.prisma`:

| Model | Purpose |
|-------|---------|
| **User** | Profile, onboarding JSON, persona, twin JSON, confidence, privacy flags |
| **Memory** | Typed memories with confidence/weight |
| **Product** | Catalog: specs JSON, rating, pros/cons, sentiment, tags |
| **PlatformPrice** | Per-platform price, MRP, discount, delivery, stock, seller, warranty, URL |
| **PriceHistory** | Weekly snapshots for trends / buy-wait |
| **ChatMessage** | Role, content, metadata JSON (intent, AHDE, recs, latency) |
| **Recommendation** | Score, breakdown JSON, explanation, status (`shown` / `saved` / `purchased` / `ignored`) |
| **WishlistItem** | Product + optional target price (unique per user+product) |
| **TimelineEvent** | Activity log (search, rec, wishlist, purchase, twin_update, …) |
| **Notification** | In-app alerts (price drop, sale, restock, …) |
| **ConnectedAccount** | Mock “connected” marketplaces |

**Platforms:** amazon, flipkart, myntra, croma, reliance, nykaa, ajio, tatacliq, meesho.

**Catalog categories:** laptop, phone, earbuds, tv, watch, camera, appliance, fashion, beauty, home — **58 SKUs** in `src/lib/seed.ts` (expanded from the original 30).

---

## 10. Product experience (SPA)

Only **`/`** is a user-facing page. Zustand `ViewKey` switches the main pane. Desktop: sidebar. Mobile: bottom nav.

### 10.1 Onboarding (6 steps)

Welcome → Categories → Budget → Brands & Platforms → Lifestyle → Create Twin. Optional **Skip**. Persona reveal with seed memories.

### 10.2 Views

| View | What the user gets |
|------|-------------------|
| **Chat** | Primary UX. Bubbles, rec cards, agent activity panel, web-search panel, voice mic, image search, chat history search, clickable product names |
| **Discover** | Catalog grid, search, category chips, price/rating/brand filters, sort (price, rating, discount, name), Ask AI, Compare |
| **Wishlist** | Target prices, “target hit”, sort including closest-to-target, bulk select → compare or delete |
| **Memory** | Tabs by type, edit confidence, add/delete, export, reset, memory-enabled switch |
| **Digital Twin** | Cluster badge, confidence ring, 9-axis radar, LLM analysis, evolution chart, reset |
| **Coach** | LLM tips from twin + activity; goals; savings ideas; handoff to chat |
| **Timeline** | Filterable events with relative times |
| **Sales** | Festival calendar (Republic Day, Prime Day, Big Billion Days, Diwali, …) with countdown; chat handoff |
| **Insights** | KPIs, category/brand/platform charts, price trend, spending tracker, monthly spending goal, JSON export |
| **Settings** | Connect/disconnect 9 platforms, privacy toggles, export / delete my data |

### 10.3 Cross-cutting UI

- Recommendation cards: score ring, best platform price, “Why this?”, pros/cons, specs, sparkline, buy/wait advice, bundles (“Add all” to wishlist)
- Compare tray (max 4) + modal: table, AI verdict, sparklines, comparison history (localStorage)
- Product detail modal: all platforms, 8-week chart, similar products, wishlist/compare/buy
- Header: persona + twin %, theme, notifications
- Light/dark, emerald/teal, Framer Motion, Sonner toasts

---

## 11. HTTP API (current)

All handlers use `runtime = "nodejs"` and `dynamic = "force-dynamic"` where specified. Session is **`getOrCreateDemoUser()`** (single demo user).

### Core (PRD)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/init` | Bootstrap demo user, `hasOnboarded` |
| POST | `/api/onboarding` | Cluster, twin, seed memories, accounts, timeline |
| POST | `/api/chat` | Orchestrator |
| GET | `/api/chat/history` | Last ~50 messages |
| GET/POST/PATCH/DELETE | `/api/memory` | Memory CRUD grouped by type |
| DELETE/PATCH | `/api/memory/[id]` | Single memory |
| GET/POST | `/api/digital-twin` | Load / reset / disable / enable / update |
| GET/POST | `/api/wishlist` | List + upsert |
| DELETE/PATCH | `/api/wishlist/[id]` | Remove / target price |
| GET | `/api/timeline` | Events, optional `?type=` |
| GET/POST | `/api/notifications` | List, refresh, mark read |
| GET | `/api/products` | Catalog + prices + history |
| GET | `/api/products/[id]` | Detail |
| GET | `/api/insights` | Analytics + spending |
| GET/POST/DELETE | `/api/accounts` | Platform connect |
| GET | `/api/recommendations` | Recent recs, `?status=` |
| PATCH | `/api/recommendations/[id]` | saved → wishlist; purchased → episodic memory + twin |

### Extensions (cron / polish)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/asr` | Speech-to-text |
| POST | `/api/image-search` | VLM image → similar catalog items |
| POST | `/api/web-search` | Live web snippets (graceful empty on 429) |
| GET | `/api/products/discover` | Discover helper |
| POST | `/api/products/refresh-prices` | Mock price refresh |
| POST | `/api/compare/verdict` | LLM winner + reasoning |
| POST | `/api/compare/prices` | Multi-product price history |
| POST | `/api/price-prediction` | Buy / wait / neutral |
| POST | `/api/bundles` | Complementary bundles |
| GET | `/api/coach/tips` | Personalized coach tips |
| GET | `/api/digital-twin/evolution` | Confidence + memory over time |
| GET | `/api/digital-twin/analysis` | LLM personality profile |
| GET | `/api/export` | Downloadable JSON report |

LLM-backed routes generally **return HTTP 200 with fallbacks** on SDK/rate-limit errors so the UI does not crash.

---

## 12. Repository map

```
src/app/page.tsx              App shell + view router
src/app/layout.tsx            Providers, metadata
src/app/api/                  Route handlers (see §11)
src/lib/agents.ts             11 agents + AHDE
src/lib/scoring.ts            MARE
src/lib/persona.ts            Clusters + twin evolution
src/lib/conversation-context.ts
src/lib/llm.ts                SDK wrapper
src/lib/seed.ts               58-product catalog
src/lib/session.ts            Demo user
src/lib/store.ts              Zustand
src/lib/types.ts              Domain types
src/components/views/         10 dashboards
src/components/chat/          Rec cards, agents, bundles, web, image, buy/wait
src/components/compare/       Modal + tray
src/components/digital-twin/
src/components/insights/
src/components/onboarding/
src/components/product/
src/components/shell/         Header, sidebar, bottom nav
prisma/schema.prisma
agent-ctx/                    Original Task 3 API notes
AGENT_DATASETS*.md            Per-agent data requirements
DOCUMENTATION.md              Earlier snapshot (17 APIs / 8 views / 30 products)
worklog.md                    Implementation diary Tasks 1–20
examples/websocket/           Sample WS code (not used by the SPA)
.zscripts/                    Dev/build helpers
```

---

## 13. Privacy and safety (as implemented)

- Memory dashboard: inspect, edit, delete, export, reset  
- Twin reset and personalization off  
- Settings: export JSON / delete user-scoped data  
- Cart agent does **not** place orders without user confirmation  
- Platform “connect” is a **flag**, not OAuth  
- No live marketplace credentials  

This is a **research/demo** stack (SQLite, one demo user), not a production multi-tenant security design.

---

## 14. Known gaps and next work

Documented in `worklog.md` and still true in code:

- Catalog and prices are **mocked**, not live connectors  
- **One demo user** — no real auth or profile switching  
- Price alerts are **in-app DB notifications**, not push/email  
- Export is **JSON**, not PDF  
- Comparison history and spending goal live in **localStorage**  
- Discover filters a finite catalog (no infinite scroll / real search index)  
- Sale calendar dates are **hardcoded** for the demo year  
- `examples/websocket` is unused by the product  
- `DOCUMENTATION.md` / some dataset markdown still mention 30 products and 17 routes  

---

## 15. PRD coverage (implementation view)

| Theme | Status |
|-------|--------|
| Intelligence layer above platforms | Implemented (mock connectors) |
| Layered architecture | Implemented |
| Multi-agent + orchestrator | Implemented |
| Six memory types | Implemented |
| DPT clustering + DToC evolution | Implemented |
| Personalized ranking | MARE |
| LLM agents | Intent, explain, memory, review, plus later coach/verdict/VLM |
| Data pipeline | Seed + Prisma (not a live ETL) |
| AHDE | Implemented |
| Explainability | Score bars + narrative |
| Privacy controls | Dashboard + toggles + export |
| Evaluation | Insights KPIs (not a full academic eval harness) |

---

## 16. How to talk about this project (one paragraph)

AI Shopping OS is a Next.js shopping-intelligence application that coordinates specialized AI agents around a user’s memories and an evolving Digital Twin. Recommendations are scored with an eight-factor Memory-Augmented engine and routed by an Adaptive Hybrid Decision Engine so cheap queries stay cheap. Cross-platform prices, eight-week history, and natural-language explanations are demonstrated on a seeded 58-product catalog that stands in for Amazon, Flipkart, and related marketplaces.

---

*Canonical current write-up for this repo. For the original shorter spec see `DOCUMENTATION.md`. For the build diary see `worklog.md`. For agent–table mapping see `AGENT_DATASET_MATRIX.md`.*
