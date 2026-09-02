# AI Shopping OS — Agent Datasets Requirements

## Overview
11 specialized agents + 1 Intent agent (upstream) coordinated by the Orchestrator and AHDE (Adaptive Hybrid Decision Engine). Each agent requires specific datasets to function.

---

## 1. Intent Detection Agent

**Purpose:** Parse user message → extract intent, category, budget, useCase, brands, complexity

**Datasets Required:**
- User message (text input)
- Historical user intent patterns (from ChatMessage metadata) — for fallback heuristic

**Data Sources:**
- **Input**: Raw user message
- **LLM System Prompt**: Intent detection rules
- **Fallback**: ChatMessage history (last 20 messages for pattern matching)

**Prisma Models Used:**
- `ChatMessage` (for pattern history)

---

## 2. Search Agent

**Purpose:** Retrieve candidate products from catalog based on intent (category, brand, useCase)

**Datasets Required:**
- Product Catalog (30 mock products)
- Product Specifications (RAM, processor, GPU, display, battery, etc.)
- Product Metadata (category, brand, tags)
- Cross-Platform Prices (Amazon, Flipkart, Myntra, Croma, Reliance, Nykaa, Ajio, Tata CLiQ, Meesho)

**Data Sources:**
- **Cached**: Product specs, brand, category, tags
- **Live**: Platform prices (for stock status and current price)

**Prisma Models Used:**
- `Product` (name, brand, category, specs, rating, reviewCount, pros, cons, sentimentScore, tags)
- `PlatformPrice` (price, platform, inStock, discount, deliveryDays, seller, warranty)

**Data Volume:**
- 30 products total
- 10 categories: laptop, phone, earbuds, tv, watch, camera, appliance, fashion, beauty, home
- 2–4 platform prices per product

---

## 3. Memory Agent

**Purpose:** Retrieve long-term, semantic, and episodic memories; infer and store new preferences from interactions

**Datasets Required:**
- User Memory Database (Long-term, Semantic, Episodic, Session, Short-term)
- Memory Categories (brand, budget, category, platform, payment, delivery, preference, event, habit)
- Interaction history (previous user messages)
- Memory confidence scores & weights

**Data Sources:**
- **Live**: User's memory records (confidence, weight, value)
- **LLM**: Memory extraction from current message (new preferences)

**Prisma Models Used:**
- `Memory` (all 6 types: short_term, long_term, episodic, semantic, session, working)
- `User` (memoryEnabled flag)
- `ChatMessage` (for interaction history)

**Data Volume per User:**
- 6 seed memories from onboarding
- Up to 100+ memories accumulated over time
- 5 new memories per interaction (capped)

---

## 4. Digital Twin Agent

**Purpose:** Load and evolve the user's Digital Twin of the Customer (DToC) — behavioral model with 9 traits

**Datasets Required:**
- Digital Twin JSON (9 behavioral traits)
- Digital Twin Evolution History (timeline of trait changes)
- Twin Confidence Score (0-100%, how accurate)
- Persona Cluster (6 predefined: Budget-Conscious, Premium, Student, Fashion, Family, Techie)
- Personalization Flags

**Data Sources:**
- **Live**: Current twin (stored in User.digitalTwin)
- **Historical**: TimelineEvent (type: "twin_update") for evolution history

**Prisma Models Used:**
- `User` (digitalTwin JSON, personaCluster, twinConfidence, personalizationEnabled)
- `TimelineEvent` (type: "twin_update", metadata with trigger: "purchase", "search", etc.)

**Data Structure (Digital Twin):**
```json
{
  "shoppingStyle": "balanced",
  "budgetFlexibility": 0.6,
  "brandLoyalty": 0.7,
  "priceSensitivity": 0.5,
  "purchaseConfidence": 0.4,
  "technologyAdoption": 0.8,
  "impulseBuyingScore": 0.3,
  "discountPreference": 0.65,
  "comparisonFrequency": 0.8,
  "preferredCategories": ["laptop", "phone"],
  "preferredBrands": ["Lenovo", "Dell"],
  "preferredPlatforms": ["amazon", "flipkart"],
  "lifestyle": "work-focused student"
}
```

---

## 5. Recommendation Agent (MARE)

**Purpose:** Rank products using 8-factor Shopping Score; generate recommendations with explanations

**Datasets Required:**
- Products + Specifications
- Platform Prices & Best Pricing
- User Memory (preferences, budget, brands)
- Digital Twin (behavioral traits, preferred categories/brands)
- User Intent (useCase, budget, category)
- Review Metadata (rating, reviewCount, pros, cons, sentimentScore)
- Price History (8-week trends)

**Data Sources:**
- **Cached**: Product specs, ratings, review summaries, tags
- **Live**: Current platform prices, stock status
- **User Data**: Memory, Twin, Intent

**Prisma Models Used:**
- `Product` (specs, rating, reviewCount, pros, cons, sentimentScore, tags)
- `PlatformPrice` (price, platform, discount, deliveryDays)
- `PriceHistory` (for historical trend analysis)
- `Memory` (budget, brand preferences, etc.)
- `User` (digitalTwin)

**Shopping Score Formula (8 factors):**
```
Score = 
  preference   × 0.18  (brand/category match)
+ price        × 0.20  (discount + budget fit)
+ review       × 0.20  (rating + sentiment + volume)
+ spec         × 0.18  (quality signals from tags)
+ twinCompat   × 0.12  (behavioral alignment)
+ memory       × 0.08  (explicit memory signals)
+ context      × 0.02  (intent use-case match)
+ availability × 0.02  (in-stock + delivery)
```

**Data Volume:**
- 12 products max per query (candidates → top 6)
- 8 score breakdown factors per product
- Price history: 8 weeks per product

---

## 6. Review Analysis Agent

**Purpose:** Generate natural language summary of pros/cons/sentiment for a product

**Datasets Required:**
- Product Pros (precomputed array)
- Product Cons (precomputed array)
- Product Sentiment Score (-1 to 1)
- Product Rating & Review Count

**Data Sources:**
- **Cached**: Stored pros, cons, sentiment (JSON in Product model)
- **LLM**: Natural language synthesis

**Prisma Models Used:**
- `Product` (pros, cons, sentimentScore, rating, reviewCount)

**Data Volume:**
- 2–4 pros per product
- 2–4 cons per product
- 1 sentiment score per product

---

## 7. Price Intelligence Agent

**Purpose:** Analyze 8-week price history; generate buy-timing advice and trend analysis

**Datasets Required:**
- Price History (weekly snapshots for 8 weeks)
- Current Price
- Historical Average Price
- Lowest & Highest Price (8-week window)
- Price Trend (rising/falling/stable)

**Data Sources:**
- **Live**: Current PlatformPrice per product
- **Historical**: Last 8 weeks of PriceHistory records

**Prisma Models Used:**
- `PriceHistory` (price, recordedAt, platform, productId)
- `PlatformPrice` (current price)

**Data Volume:**
- 8 weekly snapshots per product per platform
- Example: Lenovo IdeaPad Gaming 3 on Amazon: [₹58500, ₹59200, ₹57800, ₹58100, ₹56900, ₹57200, ₹56500, ₹57100]

**Buy-Timing Logic:**
- "Excellent": current ≤ lowest × 1.02
- "Good": current < average
- "Wait": current > average × 1.05
- "Fair": current ≈ average

---

## 8. Budget Agent

**Purpose:** Extract and validate budget constraints; filter recommendations

**Datasets Required:**
- Intent Budget (from user message)
- Budget Memory (from long-term memory: "budget_range" key)
- List of products with prices

**Data Sources:**
- **Intent**: intent.budget
- **Memory**: Memory where category="budget" and key="budget_range"
- **Products**: PlatformPrice.price for filtering

**Prisma Models Used:**
- `Memory` (budget category records)
- `Product` & `PlatformPrice` (for filtering)

**Data Volume:**
- 1 budget value per user (may update per interaction)

---

## 9. Digital Twin Agent (Evolution)

**Purpose:** Evolve twin traits from interaction signals (purchase, comparison, search, etc.)

**Datasets Required:**
- Current Digital Twin
- Interaction Signal (type: purchase, search, comparison, etc.)
- Signal Metadata (category, brand, budget, etc.)
- Twin Confidence Score

**Data Sources:**
- **Live**: User.digitalTwin, User.twinConfidence
- **Interaction**: Intent intent object (category, brands, budget, intent type)

**Prisma Models Used:**
- `User` (digitalTwin, twinConfidence)
- `TimelineEvent` (to record twin_update events)

**Evolution Deltas (per signal):**
- Purchase → purchaseConfidence +3, twinConfidence +3
- Comparison → comparisonFrequency +2
- Search → category/brand reinforcement
- Price-checking → priceSensitivity +1

---

## 10. Explainability Agent

**Purpose:** Generate natural-language explanation of recommendations and decisions

**Datasets Required:**
- Top Recommendation (shoppingScore, explanation, pros, cons)
- User Intent (category, useCase, budget)
- Digital Twin (persona, confidence)
- AHDE Plan (agents used, model tier, parallelization)
- Number of Products Compared
- Platforms Compared

**Data Sources:**
- **Recommendation Results**: Top N RecommendationResult objects with score breakdown
- **User Context**: Intent, Twin, AHDE plan
- **LLM**: Natural language generation

**Prisma Models Used:**
- `Recommendation` (shoppingScore, explanation, scoreBreakdown)
- `Product` (for context)
- `User` (digitalTwin for persona reference)

**Output Format:**
```
"Based on your interest in gaming laptops under ₹70,000, I found 6 options across 3 platforms. 
My top pick is the Lenovo IdeaPad Gaming 3 (Score: 86/100) — it offers excellent value with 
a 12th-gen Intel processor, RTX 3050 Ti GPU, and is currently ₹56,900 on Amazon, matching your budget. 
This aligns with your tech-savvy profile."
```

---

## 11. Cart Agent

**Purpose:** Facilitate cart operations; guide to platform checkout (never auto-purchases)

**Datasets Required:**
- Product ID & Name
- Platform URL
- Current Price
- User Message (product intent)

**Data Sources:**
- **Product**: PlatformPrice.url, price
- **Platform**: Which platform to route to

**Prisma Models Used:**
- `Product`
- `PlatformPrice` (url, platform)

---

## 12. Notification Agent

**Purpose:** Generate price-drop, sale, and restock notifications

**Datasets Required:**
- Wishlist Items (products user is tracking)
- Target Prices (user's desired price per wishlist item)
- Current Platform Prices
- Price Threshold (e.g., current ≤ target)
- 24-hour Notification History (avoid duplicates)

**Data Sources:**
- **Live**: Current PlatformPrice
- **User Data**: WishlistItem (target price), Notification history

**Prisma Models Used:**
- `WishlistItem` (productId, targetPrice, userId)
- `Product` (for product metadata)
- `PlatformPrice` (current price, inStock)
- `Notification` (createdAt for dedup check)

**Notification Types:**
- price_drop: current ≤ targetPrice
- restock: inStock=true after was false
- sale: discount increased

---

## AHDE — Adaptive Hybrid Decision Engine

**Purpose:** Decide which agents to activate based on intent, complexity, and user state

**Datasets Required:**
- Intent Result (intent, complexity, category, budget)
- Twin Confidence (0-100)
- Memory Enabled Flag
- Personalization Enabled Flag

**Data Sources:**
- **Intent**: IntentResult from intentAgent
- **User State**: User.twinConfidence, User.memoryEnabled, User.personalizationEnabled

**AHDE Routing Table:**

| Intent | Complexity | Agents Activated | Model Tier | Parallel |
|--------|-----------|-----------------|------------|----------|
| recommendation | complex | search, memory, digital_twin, recommendation, review, price, budget, explainability | deep | yes |
| recommendation | moderate | search, memory, digital_twin, recommendation, review, price, budget, explainability | standard | yes |
| comparison | — | search, review, price, recommendation, explainability | standard | yes |
| price_tracking | simple | search, price, memory | fast | yes |
| search | simple | search, recommendation | fast | yes |
| budget | — | budget, memory, digital_twin | fast | yes |
| greeting | — | memory | fast | yes |
| cart | — | cart, memory | fast | no |
| general | — | search, memory, recommendation, explainability | standard | yes |

---

## Orchestrator (Implicit)

**Purpose:** Coordinate agent execution based on AHDE plan

**Datasets Required:**
- AHDE Plan (required agents, data sources, parallelization flags)
- Agent Results (from all activated agents)
- Latency tracking

**Data Sources:**
- **Orchestration Logic**: In `/api/chat` route handler
- **Parallelization**: Execute independent agents simultaneously, sequence dependencies

**Data Flow:**
1. User message → intentAgent
2. Intent + userState → AHDE
3. AHDE plan → launch required agents (parallel if allowed)
4. Agent results → collect and order
5. Explainability agent → synthesize final response
6. Persist to ChatMessage, Recommendation, TimelineEvent, evolveTwin

---

## Summary Table: Datasets by Agent

| Agent | Input Datasets | Models Used | Volume | Refresh Rate |
|-------|----------------|------------|--------|--------------|
| Intent | ChatMessage | ChatMessage | 20 history | Per query |
| Search | Product catalog, Tags | Product, PlatformPrice | 30 products | Static (mock) |
| Memory | User memories | Memory, User | 6–100 per user | Per interaction |
| Digital Twin | Twin traits, signals | User, TimelineEvent | 1 per user | Per interaction |
| Recommendation (MARE) | Products, Prices, Memory, Twin, Intent | Product, PlatformPrice, Memory, User | 12 candidates → 6 recs | Per query |
| Review Analysis | Pros, Cons, Sentiment | Product | 2–4 each per product | Static (mock) |
| Price Intelligence | Price history, Current price | PriceHistory, PlatformPrice | 8 weeks per product | Weekly + live |
| Budget | Intent budget, Memory budget | Memory, Product, PlatformPrice | 1 budget per user | Per query |
| Twin Evolution | Twin, Signal, Intent | User, TimelineEvent | 1 per user | Per interaction |
| Explainability | Recommendations, Intent, Twin, AHDE Plan | Recommendation, User, Product | Top N results | Per query |
| Cart | Product, Platform, Price | Product, PlatformPrice | 1 product | Per query |
| Notification | Wishlist, Prices, History | WishlistItem, PlatformPrice, Notification | 10–50 wishlist items | Per refresh (hourly or on-demand) |

---

## Cross-Cutting Data Requirements

### User Profile Data
- `User.onboarding` (JSON): categories, budget, brands, platforms, lifestyle, techFamiliarity
- `User.personaCluster` (string): One of 6 clusters
- `User.twinConfidence` (0-100)
- `User.memoryEnabled` (boolean)
- `User.personalizationEnabled` (boolean)

### Event Tracking Data
- `TimelineEvent` (10 types): search, recommendation, wishlist, purchase, comparison, price_drop, memory_update, twin_update, onboarding, notification
- `ChatMessage` metadata (JSON): intent, agentsUsed, complexity, shoppingScore, latencyMs

### External API Data (simulated)
- Platform connectors (mock returns): Amazon, Flipkart, Myntra, Croma, Reliance, Nykaa, Ajio, Tata CLiQ, Meesho
- LLM service: z-ai-web-dev-sdk (for intent, memory extraction, review synthesis, explainability)

---

## Notes on Data Freshness

| Data Type | Freshness | Source |
|-----------|-----------|--------|
| Product Specs | Static | Seed data |
| Platform Prices | Live | Simulated connectors (weekly in real scenario) |
| Price History | Weekly | PriceHistory snapshots |
| User Memory | Dynamic | Interaction updates, LLM extraction |
| Digital Twin | Dynamic | Per-interaction evolution |
| Notifications | Real-time | Price drop detection on demand |
| Chat History | Real-time | User interactions |

---

## Data Volume Estimates

| Model | Records per User | Across All Users (100) | Typical Query Volume |
|-------|-----------------|----------------------|----------------------|
| Memory | 6–100 | 600–10,000 | 30 per query |
| ChatMessage | 10–500 | 1,000–50,000 | 50 per query |
| TimelineEvent | 20–1,000 | 2,000–100,000 | 100 per query |
| Recommendation | 10–500 | 1,000–50,000 | 6 per query |
| WishlistItem | 0–50 | 0–5,000 | 20 per user |
| Notification | 0–100 | 0–10,000 | 10 per user |
| Product | 30 global | 30 | 12 per query |
| PlatformPrice | 90–120 global (30 products × 3–4 platforms) | 90–120 | 12 per query |
| PriceHistory | 240–960 global (30 products × 8 weeks × 1–4 platforms) | 240–960 | 8 per product |

---

## Next Steps: Adding Datasets to Agent Definitions

1. **Update `AGENTS.md`** (or create `agents-config.md`):
   ```yaml
   agents:
     - name: Intent
       datasets: ["ChatMessage history"]
       models: [ChatMessage]
       
     - name: Search
       datasets: ["Product catalog", "Product specs", "Platform prices"]
       models: [Product, PlatformPrice]
       
     # ... (continue for all 12 agents)
   ```

2. **Create agent-specific YAML configs** under `agent-ctx/`:
   ```
   agent-ctx/
   ├── 1-intent-agent.md (datasets: ChatMessage)
   ├── 2-search-agent.md (datasets: Product, PlatformPrice)
   ├── 3-memory-agent.md (datasets: Memory, User)
   ├── 4-digital-twin-agent.md (datasets: User, TimelineEvent)
   ├── 5-recommendation-mare.md (datasets: Product, PlatformPrice, Memory, User)
   ├── 6-review-agent.md (datasets: Product.pros, Product.cons)
   ├── 7-price-agent.md (datasets: PriceHistory, PlatformPrice)
   ├── 8-budget-agent.md (datasets: Memory, Intent)
   ├── 9-explainability-agent.md (datasets: Recommendation, User, Intent)
   ├── 10-cart-agent.md (datasets: Product, PlatformPrice)
   └── 11-notification-agent.md (datasets: WishlistItem, PlatformPrice, Notification)
   ```

3. **Update agent function signatures** in `src/lib/agents.ts`:
   ```typescript
   /**
    * Search Agent
    * @requires datasets: Product catalog (30 items), Platform prices (2-4 per product)
    * @requires models: Product, PlatformPrice
    * @returns ProductLike[] (up to 12 products)
    */
   export async function searchAgent(intent: IntentResult, limit = 12): Promise<ProductLike[]>
   ```

---

## All 12 Agents + Datasets Summary

1. **Intent Agent**: ChatMessage (fallback)
2. **Search Agent**: Product, PlatformPrice
3. **Memory Agent**: Memory, User, ChatMessage
4. **Digital Twin Agent**: User, TimelineEvent
5. **Recommendation Agent (MARE)**: Product, PlatformPrice, Memory, User, PriceHistory
6. **Review Agent**: Product (pros, cons, sentiment)
7. **Price Intelligence Agent**: PriceHistory, PlatformPrice
8. **Budget Agent**: Memory, Intent, Product, PlatformPrice
9. **Twin Evolution**: User, TimelineEvent, Intent
10. **Explainability Agent**: Recommendation, User, Product, Intent
11. **Cart Agent**: Product, PlatformPrice
12. **Notification Agent**: WishlistItem, PlatformPrice, Notification

---

Generated: 2026-08-13 | AI Shopping OS v1.0
