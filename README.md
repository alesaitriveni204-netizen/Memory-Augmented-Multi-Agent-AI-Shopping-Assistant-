# AI Shopping OS

AI Shopping OS is a memory-augmented, multi-agent shopping intelligence platform built on Next.js and Prisma. It is designed to help users discover products, compare options across shopping platforms, understand recommendations, track prices, save wishlist items, and make better purchase decisions based on their preferences, behavior, and budget.

This project is not an ecommerce storefront and does not take payment. Instead, it sits above existing shopping platforms and provides a personal shopping intelligence layer. It learns from user memory, digital twin evolution, conversation context, and structured product data to generate explainable recommendations in a human-friendly way.

The implementation in this repository reflects the product vision described in the PRD and technical design docs and includes: MARE (Memory-Augmented Recommendation Engine), AHDE (Adaptive Hybrid Decision Engine), digital twin evolution, multi-agent orchestration, memory-driven personalization, shopping score explanations, and cross-platform catalog intelligence.

---

## 1. Project Purpose and Problem It Solves

Typical shopping apps fail in several ways:

- they forget preferences between sessions
- they recommend based on popularity rather than personal fit
- they cannot explain why a recommendation was shown
- they force users to compare products manually across multiple marketplaces
- they treat every query as the same type of workload, even when a user only wants a price check

AI Shopping OS solves this by developing a stateful, explainable, and adaptive shopping assistant. It treats shopping as a personal process that includes:

- memory of brand and budget preferences
- product comparison across platforms
- product ranking by personal fit, not just one score
- understandable recommendation explanations
- price trend analysis and buy-timing guidance
- digital twin behavior modeling
- in-app notifications and wishlist tracking

The system is built around four central ideas:

1. MARE: Memory-Augmented Recommendation Engine
2. AHDE: Adaptive Hybrid Decision Engine
3. DPT → DToC: Digital Persona Twin becoming a Digital Twin of the Customer
4. Multi-agent orchestration: specialized agents coordinated by an orchestrator and planner

---

## 2. Core Product Concepts

### 2.1 MARE (Memory-Augmented Recommendation Engine)
MARE ranks products using an eight-factor shopping score that blends user memory, digital twin compatibility, product specs, price fit, review quality, and platform availability.

### 2.2 AHDE (Adaptive Hybrid Decision Engine)
AHDE decides which agents to run, what model tier to use, and whether to parallelize operations. It prevents unnecessary computation for simple queries like "what is the price of this product?" while allowing deeper multi-agent reasoning for complex shopping decisions.

### 2.3 DPT → DToC
The digital twin begins as a cold-start persona built from onboarding answers and evolves as the user interacts with the system. It becomes a digital twin of the customer: a behavioral representation of shopping style, price sensitivity, brand loyalty, technology adoption, and purchase confidence.

### 2.4 Multi-Agent Shopping OS
The system orchestrates specialized agents including:

- Intent agent
- Search agent
- Memory agent
- Digital twin agent
- Recommendation (MARE) agent
- Review analysis agent
- Price intelligence agent
- Budget agent
- Explainability agent
- Cart guidance agent
- Notification agent

---

## 3. High-Level Architecture

The architecture follows a clear separation of concerns:

```text
Presentation Layer      -> Next.js client UI
       |                  (single route /, multiple views)
       v
Application Layer       -> Next.js App Router handlers in src/app/api/*
       |                  (all AI calls stay server-side)
       v
AI Layer                -> Multi-agent orchestration via src/backend/agents.ts
       |                  and route handlers in src/app/api/chat/route.ts
       v
Business Logic          -> scoring, persona, conversation-context, memory logic
       |                  src/backend/scoring.ts
       |                  src/backend/persona.ts
       |                  src/backend/conversation-context.ts
       v
Data Layer              -> Prisma + SQLite
       v
External Services       -> z-ai-web-dev-sdk and mock platform data
```

A core design principle is that the browser never calls the LLM directly. All AI requests are handled in server-side route handlers.

### 3.1 Working architecture aligned to the product design

The project now follows a layered architecture that matches the working product design while staying efficient and preserving the current implementation:

```text
User / Shopper
  -> Frontend (Next.js + React + Tailwind)
  -> Gateway & Security Layer
     - API proxy / route enforcement
     - JWT/cookie-based auth
  -> FastAPI-style backend orchestration layer
     - agent pipeline
     - intent detection
     - memory and digital twin
     - search and ranking
     - recommendations and explainability
  -> Marketplace Provider Registry
     - RapidAPI / live scrapers / catalog / SerpAPI / mock fallback
  -> LLM Synthesis Layer
     - context assembly
     - token streaming
     - heuristic fallback
  -> ML inference models
     - intent classifier
     - persona clustering
     - recommender ranker
     - ABSA sentiment
     - price deal score
     - item similarity
  -> Database / persistence
     - Prisma + SQLite (current runtime)
     - user profiles, memory, wishlist, timeline, logs
```

This is intentionally implemented in a way that does not rewrite the application from scratch. The live project already has the correct conceptual structure, and the architecture is documented and preserved in the working codebase using the frontend/backend/shared separation already present in `src/`.

---

## 4. Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| App framework | Next.js 16 (App Router) | Full-stack web app |
| Language | TypeScript 5 | Type-safe codebase |
| UI | React 19, Tailwind CSS 4, shadcn/ui, Radix UI, Lucide | Interface and design system |
| State | Zustand | Client-side UI/app state |
| Server data | TanStack React Query | Fetching and caching remote data |
| Styling | Tailwind CSS + custom theme | Visual design and layout |
| Database | Prisma 6 + SQLite | Data persistence |
| AI SDK | z-ai-web-dev-sdk | LLM operations |
| Forms | react-hook-form + zod | Onboarding and validation |
| Charts | Recharts | Twin radar charts, KPI charts, trends |
| Animation | Framer Motion | UI transitions and polish |
| Notifications | Sonner | Toast-based notification system |
| Dates | date-fns | Relative timestamps |
| Theming | next-themes | Light/dark mode |

### 4.1 Software included in the project

The repository includes both application code and supporting tooling for a complete product workflow:

- Next.js 16 application with App Router
- React 19 frontend and TypeScript typing
- Tailwind CSS + shadcn/ui design system
- Prisma ORM with SQLite database
- AI orchestration and LLM integration using z-ai-web-dev-sdk
- recommendation, memory, and digital twin logic in the backend layer
- Python automation scripts for packaging and deployment under `.zscripts/`
- mini-services support for auxiliary runtime components
- RAG indexing and retrieval utilities for semantic product search
- DB migration, seeding, and validation scripts
- API routes for chat, recommendations, compare, exports, wishlist, memory, digital twin, insights, and notifications
- local testing and runtime validation under `tests/`

### 4.2 System architecture overview

The project follows a layered architecture designed for explainable shopping intelligence:

```text
Browser / UI
  -> Next.js frontend (React + Tailwind)
  -> Zustand state and route-based screen switching

Application API Layer
  -> src/app/api/*
  -> chat, memory, recommendations, compare, timeline, wishlist, settings

Business Intelligence Layer
  -> src/backend/agents.ts
  -> src/backend/scoring.ts
  -> src/backend/persona.ts
  -> src/backend/conversation-context.ts

Data Layer
  -> Prisma ORM
  -> SQLite database
  -> product catalog, user memory, recommendations, timeline, notifications

AI and retrieval layer
  -> z-ai-web-dev-sdk LLM calls
  -> RAG vector store and document ingestion
  -> semantic product retrieval and explainability generation

Operational layer
  -> .zscripts Python automation
  -> build, dev, start, runtime packaging, database bootstrap
```

A key architectural principle is that the browser never directly calls the LLM. All AI orchestration stays on the backend server routes.

### Core app scripts

From package.json:

- `dev` → `next dev -p 3000`
- `build` → Next.js production build plus copying static files
- `start` → production Next.js server via Bun
- `lint` → ESLint validation
- `db:push` → Prisma db push
- `db:generate` → Prisma generate
- `db:migrate` → Prisma migrate dev
- `db:reset` → Prisma migrate reset
- `db:seed` → Prisma seed
- `seed` → `npm run db:seed`
- `rag:ingest` → run the RAG ingestion CLI
- `rag:reindex` → reindex the RAG pipeline
- `test` → Node test runner

---

## 5. Repository Structure

```text
.
├── .github/
├── .next/
├── .zscripts/
├── agent-ctx/
├── db/
├── docs/
├── download/
├── examples/
├── mini-services/
├── prisma/
├── public/
├── src/
├── tests/
├── AGENTS.md
├── AGENT_DATASET_MATRIX.md
├── AGENT_DATASETS.md
├── AGENT_DATASETS_QUICK_REF.md
├── CLAUDE.md
├── Caddyfile
├── DOCUMENTATION.md
├── PROJECT.md
├── README.md
├── components.json
├── eslint.config.mjs
├── next-env.d.ts
├── next.config.ts
├── package.json
├── package-lock.json
├── postcss.config.mjs
├── tailwind.config.ts
├── tsconfig.json
├── worklog.md
└── ...
```

### Important directories

- `src/app/` — App Router pages and API routes
- `src/backend/` — business logic and LLM orchestration
- `src/frontend/` — React client-side app logic and UI views
- `src/shared/` — shared utils and types
- `prisma/` — Prisma schema and seed logic
- `mini-services/` — optional auxiliary services
- `docs/` — design documentation and additional project docs
- `.zscripts/` — Python-based automation scripts for build/start tasks
- `tests/` — runtime/build verification scripts

---

## 6. Product and Market Model

This project models a shopping assistant for Indian online shopping contexts, with support for major retail platforms such as:

- Amazon
- Flipkart
- Myntra
- Croma
- Reliance Digital
- Nykaa
- Ajio
- Tata CLiQ
- Meesho

The platform is not tied to a single retailer; it tries to unify cross-platform data for the same products and compare their offers.

---

## 7. Product Catalog and Data Model

### 7.1 Catalog scope
The seeded product catalog includes a realistic mock catalog used for demo and research purposes. It simulates the kind of data the search and recommendation engine would receive from real platform connectors without requiring scraping.

The project contains:

- 58 product entries in the catalog
- 10 categories
- 2–4 platform price entries per product
- 8 weeks of price history per relevant product
- review metadata
- sentiment summaries
- specifications in JSON form

### 7.2 Categories

- laptop
- phone
- earbuds
- tv
- watch
- camera
- appliance
- fashion
- beauty
- home

### 7.3 Example product themes
The catalog includes products from brands such as:

- Lenovo
- ASUS
- Apple
- Dell
- HP
- Acer
- Samsung
- OnePlus
- Xiaomi
- Google
- Sony
- boAt
- LG
- Philips
- Dyson
- Levi's
- Nike
- Allen Solly
- Maybelline
- The Ordinary

### 7.4 Data model summary
The Prisma schema defines 11 main models:

| Model | Purpose |
|---|---|
| User | user profile, personalization, onboarding, digital twin |
| Memory | long-term, semantic, episodic, short-term, working memory |
| Product | product metadata, specs, ratings, review summaries |
| PlatformPrice | per-platform price, stock, delivery, seller, warranty |
| PriceHistory | historical price snapshots |
| ChatMessage | conversation history and metadata |
| Recommendation | recommendation results and score breakdown |
| WishlistItem | saved products and target prices |
| TimelineEvent | activity log and event history |
| Notification | in-app alerts |
| ConnectedAccount | connected marketplace accounts |

The Prisma schema is in `prisma/schema.prisma` and sets up a SQLite database with environment-driven connection values.

---

## 8. Memory Architecture

The memory system stores and retrieves user behavior across different memory types:

| Memory type | Use |
|---|---|
| `long_term` | durable preferences, budget, favorite brands |
| `semantic` | general facts, patterns, product preferences |
| `episodic` | past experiences and purchase history |
| `session` | current chat context |
| `short_term` | recent transient signals |
| `working` | temporary planning state |

Each memory includes:

- category
- key
- value
- confidence
- weight
- source
- timestamps

Memory sources include:

- `explicit`
- `inferred`
- `onboarding`
- `purchase`
- `search`
- `feedback`

The memory agent updates both explicit and inferred signals from user interactions and conversation content.

---

## 9. Digital Twin System

The platform builds a digital twin of the user, evolving from a cold-start persona to a more refined customer profile.

### 9.1 Persona clusters
The initial twin uses cluster-based persona assignment against six centroids:

- Budget-Conscious Shopper
- Premium Buyer
- Student Shopper
- Fashion Enthusiast
- Family Shopper
- Tech Enthusiast

### 9.2 Twin traits
The digital twin tracks behavioral factors including:

- shoppingStyle
- budgetFlexibility
- brandLoyalty
- priceSensitivity
- purchaseConfidence
- technologyAdoption
- impulseBuyingScore
- discountPreference
- comparisonFrequency
- shoppingConsistency
- preferredCategories
- preferredBrands
- preferredPlatforms
- lifestyle
- riskTolerance

### 9.3 Twin confidence
Twin confidence starts low and increases as the system receives stronger signals from user actions such as purchase behavior, comparisons, searches, and repeated preferences.

---

## 10. Multi-Agent System Details

The orchestrated agent framework is central to the project.

### 10.1 Agent list and responsibilities

| Agent | Role |
|---|---|
| Intent | parse user query into intent, category, budget, use case, brands, complexity |
| AHDE | decide which agents to activate and which models to use |
| Orchestrator | coordinate execution sequence and persist state |
| Search | retrieve matching products |
| Memory | fetch/update memories |
| Digital Twin | load and evolve user persona |
| Recommendation (MARE) | rank product candidates |
| Review | summarize pros/cons and sentiment |
| Price | analyze product price history and timing |
| Budget | enforce budget logic |
| Explainability | produce human-readable reasons |
| Cart | guide user toward purchase confirmation, never auto-buy |
| Notification | identify alert opportunities |

### 10.2 Agent pipeline in practice

The actual system runs in a staged orchestration flow:

1. Detect shopping intent from the incoming message.
2. Resolve short references such as "it", "this" or prior conversation references.
3. Load user memory and digital twin state.
4. Run adaptive AHDE planning to decide what to execute.
5. Query the catalog for matching products.
6. Score products with the MARE engine.
7. Attach price, budget, and review context.
8. Generate explanation text.
9. Save recommendations, chat messages, notifications, and timeline events.
10. Trigger background memory/twin evolution without blocking the response.

This design keeps the flow stateful, interpretable, and efficient.

### 10.3 AHDE routing summary

| Query type | Typical agents | Tier |
|---|---|---|
| recommendation (complex) | search, memory, twin, recommendation, review, price, budget, explain | deep |
| comparison | search, review, price, recommendation, explain | standard |
| price tracking | search, price, memory | fast |
| search | search, recommendation | fast |
| greeting | memory | fast |
| cart | cart, memory | fast |
| budget | budget, memory, twin | fast |

The design is explicitly optimized to avoid running the full agent stack for trivial requests.

---

## 11. MARE Recommendation Score

The shopping score is computed using weighted factors. The project uses category-specific weights and an eight-factor score breakdown.

The score is based on:

- preference
- price
- review
- spec
- twinCompat
- memory
- context
- availability

Formula conceptually:

```text
Shopping Score =
  preference   × W1
+ price        × W2
+ review       × W3
+ spec         × W4
+ twinCompat   × W5
+ memory       × W6
+ context      × W7
+ availability × W8
```

The app can vary these weights by category. For example:

- electronics: higher weight on specs
- fashion/beauty: higher weight on reviews
- appliances/home: higher weight on price

Each recommendation includes a score breakdown and explanation such as discount fit, preferred brand, product match, budget fit, stock, rating, and prior memory signals.

---

## 12. User Experience Overview

The app primarily runs on a single page at `/` but uses a state-driven switch between views.

### 12.0 Feature inventory

The app includes the following core product features:

- AI shopping chat with contextual follow-up
- product search and recommendation ranking
- budget-aware filtering and matched recommendations
- memory-based personalization
- digital twin profiling and evolution
- wishlist management with target-price tracking
- price history and trend analysis
- product comparison across platforms
- timeline-based event history
- insights dashboard and KPI summaries
- notification panel for alerts and price drops
- onboarding flow with persona initialization
- settings and personalization controls
- mobile and desktop responsive layouts
- multi-view dashboard experience with a single app entry point

### 12.1 Onboarding flow
The onboarding flow includes six steps:

1. Welcome
2. Categories
3. Budget
4. Brands and platforms
5. Lifestyle and shopping behavior
6. Create twin and finish setup

Optional skip is supported so users can start immediately.

### 12.2 Main views
The UI contains views such as:

- onboarding
- chat
- recommendations
- memory dashboard
- digital twin dashboard
- compare/tray
- insights
- timeline
- wishlist
- discover
- settings
- notifications

### 12.3 Mobile and desktop experience
- desktop: sidebar layout
- mobile: bottom navigation and compact layout
- responsive design with reusable components

---

## 13. Features Implemented in the UI

### 13.1 Chat experience
- AI assistant chat with product recommendations
- intent detection and contextual follow-up
- explanation rendering for product choices
- suggestions and history
- agent activity panel for debug visibility

### 13.2 Product cards
Each product card can include:

- shopping score ring
- price and discount summary
- best platform and seller information
- rating and review count
- stock and delivery information
- explanation and score breakdown
- pros and cons chips
- product specs
- actions such as wishlist, compare, and platform view

### 13.3 Memory dashboard
Features:

- memory type tabs
- confidence editing
- weighting controls
- add/edit/delete memory entries
- export and reset support
- memory enable/disable control

### 13.4 Digital twin dashboard
Features:

- persona cluster summary
- confidence indicator
- trait radar chart
- trait bars
- preferred categories/brands/platforms
- lifestyle and behavior summary
- evolution timeline
- reset twin actions

### 13.5 Timeline
Features:

- search events
- recommendation events
- wishlist events
- purchase events
- price-drop events
- memory updates
- twin updates
- onboarding activity
- notifications

### 13.6 Insights
Features:

- KPI cards
- category trends
- brand trends
- platform distribution
- price trends
- recent activity

### 13.7 Wishlist
Features:

- save/remove products
- target price tracking
- price-drop alerts
- product card actions

### 13.8 Notification system
Features:

- unread count badge
- dropdown alert panel
- category-based alert types
- mark-as-read actions

---

## 14. Database and Runtime Environment

The project uses SQLite by default for local development and deployment. The Prisma schema is intentionally lightweight and supports a demo-friendly environment without requiring external infrastructure.

The build scripts in `.zscripts/` package the app with runtime support for Python modules and database generation in deployment artifacts, which helps create self-contained packaged builds.

### Database conventions

- main DB path: `prisma/db/custom.db`
- runtime database injection uses `DATABASE_URL=file:/...`
- deployment scripts also initialize a packaged database when a preview database is absent

---

## 15. Python and Deployment Scripts

The project includes Python-based deployment and runtime build scripts under `.zscripts/`:

- `build.py` — packages app and mini-services build artifacts
- `start.py` — starts Next.js, mini-services, and Caddy
- `dev.py` — local dev startup
- `python-runtime-build.py` — packages Python dependencies and source files
- `database-runtime-build.py` — ensures database exists and syncs schema
- `mini-services-install.py` — install mini-service dependencies
- `mini-services-build.py` — build bundled mini-services
- `mini-services-start.py` — run mini-services

These scripts are intended to make deployment more robust by packaging the Python runtime and database artifact appropriately for environment hosting.

### 15.1 Runtime and software tools bundled into the project

The software included in this project can be grouped as follows:

- application runtime: Node.js, Next.js, React, TypeScript
- database runtime: Prisma, SQLite
- AI runtime: z-ai-web-dev-sdk and server-side model orchestration
- UI library: Tailwind CSS, shadcn/ui, Radix primitives, Lucide icons
- data visualization: Recharts, Framer Motion
- form and validation: react-hook-form, zod
- automation: Python scripts under `.zscripts/`
- packaging and build support: Next standalone build, bundling, static asset copy
- testing: Node.js test runner with runtime checks for RAG behavior

---

## 16. Testing and Validation

The repo includes Python-based validation scripts under `tests/`:

- `python-runtime-build.py`
- `database-runtime-build.py`
- `python-runtime-container.py`

These validate:

- Python source packaging behavior
- database initialization rules
- runtime artifact integrity
- fallback behavior for missing Python deps

The environment also includes placeholder or generated data under `tool-results/`, `upload/`, and `download/`, which are auxiliary and not core app logic.

---

## 17. Setup and Local Development

### Prerequisites

- Node.js / npm or Bun
- SQLite-compatible environment
- Python (for runtime packaging if used)
- optional `uv` for Python dependency packaging

### Install dependencies

```bash
npm install
# or
bun install
```

### Initialize database

```bash
npx prisma db push
```

Optional seed if needed:

```bash
npx prisma db seed
```

### Run the app

```bash
npm run dev
```

Then open:

- http://localhost:3000

### Production build

```bash
npm run build
npm run start
```

---

## 18. Design Principles and Constraints

This project follows several important design constraints:

- the frontend does not directly call the model
- model requests are server-side only
- live scraping of marketplaces is not used in the demo environment
- data is mocked to simulate realistic cross-platform catalog operations
- shopping recommendations are explainable and tied to user memory and twin state
- no direct purchase automation is performed without confirmation
- pricing, product, and recommendation data are normalized to the same domain model

---

## 19. Integration With the PRD and Research Goals

The project is aligned with a multi-chapter product requirements document targeting an intelligent shopping assistant. The research arguments are:

- personalization driven by memory
- behavior-aware digital twin modeling
- explainable recommendation ranking
- hybrid decision engine to avoid unnecessary model work
- cross-platform comparison intelligence
- product-level price reasoning and timing guidance
- stateful, human-like shopping assistance

The repo contains several supporting documents and planning files, including `PROJECT.md`, `DOCUMENTATION.md`, `AGENTS.md`, `AGENT_DATASETS.md`, and the related quick-reference docs. These provide operational and research context for the product design and AI agent architecture.

---

## 20. Notes on Repository Health and Cleanup

This workspace contains a mixture of source code, generated files, documentation, and deployment artifacts. The project’s core implementation lives in:

- `src/`
- `prisma/`
- `.zscripts/`
- `public/`
- `mini-services/`

Generated runtime folders like `.next/`, `node_modules/`, and other workspace artifacts can be regenerated and are not meant to be edited manually. They are not part of the conceptual product architecture.

---

## 21. Summary

AI Shopping OS is a shopping intelligence platform that combines:

- product discovery
- cross-platform price comparison
- product ranking based on personal fit
- memory-aware personalization
- digital twin evolution
- explainable recommendations
- notifications and wishlist tracking
- modern Next.js app architecture
- a multi-agent AI orchestration layer

It is designed as a strong demo and research platform for a future production-ready intelligent shopping assistant.

---

## 22. Quick Start

```bash
# install dependencies
npm install

# initialize the SQLite database
npx prisma db push

# optional seed
npx prisma db seed

# run the app
npm run dev
```

Open http://localhost:3000 to use the app.

---

## 23. Key Files

- `package.json` — scripts and dependencies
- `next.config.ts` — Next.js config
- `prisma/schema.prisma` — data model
- `src/app/api/*` — backend API routes
- `src/backend/*` — logic and AI orchestration
- `src/frontend/*` — UI and client experience
- `.zscripts/*.py` — Python deployment and runtime scripts
- `tests/*.py` — validation checks

This README is intentionally comprehensive so the repository has a single, central, authoritative project overview.
