# Agent Datasets - Quick Reference

## 12 Core Agents + Their Required Datasets

### 1. **Intent Detection Agent**
- **Purpose**: Parse user message → intent, category, budget, complexity
- **Datasets**: ChatMessage history (fallback)
- **Models**: ChatMessage
- **Data Volume**: 20 historical messages for pattern matching

### 2. **Search Agent**
- **Purpose**: Retrieve candidate products from catalog
- **Datasets**: Product catalog (30 products), Product specs, Platform prices (2-4 per product)
- **Models**: Product, PlatformPrice
- **Data Volume**: 12 candidates per query

### 3. **Memory Agent**
- **Purpose**: Retrieve & update long-term, semantic, episodic memories
- **Datasets**: 6 memory types (short_term, long_term, episodic, semantic, session, working)
- **Models**: Memory, User, ChatMessage
- **Data Volume**: 6-100 memories per user (30 per query)

### 4. **Digital Twin Agent**
- **Purpose**: Load & display evolving behavioral model (9 traits)
- **Datasets**: Digital Twin JSON, Twin Confidence (0-100), Persona Cluster, Evolution History
- **Models**: User, TimelineEvent
- **Data Volume**: 1 twin per user

### 5. **Recommendation Agent (MARE)**
- **Purpose**: Rank products using 8-factor Shopping Score
- **Datasets**: Products + specs, Platform prices, User memory, Digital Twin, Price history (8 weeks), Reviews
- **Models**: Product, PlatformPrice, PriceHistory, Memory, User
- **Data Volume**: 12 candidates → top 6 recommendations per query

### 6. **Review Analysis Agent**
- **Purpose**: Generate natural language summary of pros/cons/sentiment
- **Datasets**: Product pros (2-4), cons (2-4), sentiment score (-1 to 1), rating
- **Models**: Product
- **Data Volume**: 1 summary per product

### 7. **Price Intelligence Agent**
- **Purpose**: Analyze 8-week price history; generate buy-timing advice
- **Datasets**: Weekly price snapshots (8 weeks), Current price, Historical avg/min/max, Trend
- **Models**: PriceHistory, PlatformPrice
- **Data Volume**: 8 weekly records per product per platform

### 8. **Budget Agent**
- **Purpose**: Extract & validate budget constraints
- **Datasets**: Intent budget, Memory budget (from long_term memory), Product prices
- **Models**: Memory, Intent, Product, PlatformPrice
- **Data Volume**: 1 budget value per user

### 9. **Twin Evolution Agent**
- **Purpose**: Evolve digital twin traits from interaction signals
- **Datasets**: Current twin, Interaction signal (purchase/search/comparison), Signal metadata, Twin confidence
- **Models**: User, TimelineEvent
- **Data Volume**: 1 evolution per interaction

### 10. **Explainability Agent**
- **Purpose**: Generate natural language explanation of recommendations
- **Datasets**: Top recommendations, User intent, Digital Twin, AHDE plan, Platforms compared
- **Models**: Recommendation, User, Product
- **Data Volume**: Top N results (typically 6)

### 11. **Cart Agent**
- **Purpose**: Guide users to platform checkout (never auto-purchases)
- **Datasets**: Product ID, Platform URL, Current price
- **Models**: Product, PlatformPrice
- **Data Volume**: 1 product per query

### 12. **Notification Agent**
- **Purpose**: Generate price-drop, sale, restock notifications
- **Datasets**: Wishlist items, Target prices, Current platform prices, 24-hour notification history
- **Models**: WishlistItem, PlatformPrice, Notification
- **Data Volume**: 10-50 wishlist items per user

---

## AHDE - Adaptive Hybrid Decision Engine

**Purpose**: Decide which agents to activate (reduces unnecessary computation)

**Input Datasets**: Intent result, Twin confidence, Memory enabled flag, Personalization flag

**Agent Activation Rules**:
| Intent | Agents Activated | Model Tier |
|--------|-----------------|-----------|
| recommendation | 8 (search, memory, digital_twin, recommendation, review, price, budget, explainability) | deep/standard |
| comparison | 5 (search, review, price, recommendation, explainability) | standard |
| price_tracking | 3 (search, price, memory) | fast |
| search | 2 (search, recommendation) | fast |
| budget | 3 (budget, memory, digital_twin) | fast |
| greeting | 1 (memory) | fast |
| cart | 2 (cart, memory) | fast |

---

## Prisma Models Used Across All Agents

### Core Models
- **User** - Profile, persona cluster, digital twin, twin confidence, flags
- **Memory** - 6 types across 8 categories, confidence scores, decay weights
- **Product** - Specs, brand, category, rating, pros/cons, sentiment, tags
- **PlatformPrice** - Per-product prices on 9 platforms (Amazon, Flipkart, Myntra, Croma, etc.)
- **PriceHistory** - Weekly snapshots for 8 weeks

### Feature Models
- **ChatMessage** - Conversation history with metadata (intent, agents used, etc.)
- **Recommendation** - Shopping score breakdown, explanation, status
- **WishlistItem** - Tracked products with target prices
- **TimelineEvent** - 10 event types (search, recommendation, purchase, twin_update, etc.)
- **Notification** - Price drops, restocks, sales
- **ConnectedAccount** - Platform connection status (9 platforms)

---

## Key Dataset Volumes

| Dimension | Volume |
|-----------|--------|
| Total Products (Mock Catalog) | 30 |
| Categories | 10 (laptop, phone, earbuds, tv, watch, camera, appliance, fashion, beauty, home) |
| Platforms | 9 (Amazon, Flipkart, Myntra, Croma, Reliance, Nykaa, Ajio, Tata CLiQ, Meesho) |
| Platform Prices per Product | 2-4 |
| Price History Records per Product | 8 weeks × 1-4 platforms |
| Memory Types | 6 (short_term, long_term, episodic, semantic, session, working) |
| Memory Categories | 8 (brand, budget, category, platform, payment, delivery, preference, habit) |
| Digital Twin Traits | 9 (shoppingStyle, budgetFlexibility, brandLoyalty, priceSensitivity, purchaseConfidence, technologyAdoption, impulseBuyingScore, discountPreference, comparisonFrequency) |
| Persona Clusters | 6 (Budget-Conscious, Premium, Student, Fashion, Family, Techie) |
| Seed Memories per User | 6 (from onboarding) |
| Recommendation Factors (Shopping Score) | 8 (preference, price, review, spec, twinCompat, memory, context, availability) |
| Timeline Event Types | 10 (search, recommendation, wishlist, purchase, comparison, price_drop, memory_update, twin_update, onboarding, notification) |
| Review Signals per Product | Rating + count + sentiment + pros (2-4) + cons (2-4) |

---

## Data Freshness Strategy

| Dataset | Refresh Rate | Why |
|---------|--------------|-----|
| Product Catalog | Static (mock) | Simulates static seed data; in production, updated via platform connectors |
| Product Specs | Static | Pre-computed, stable attributes |
| Platform Prices | Live per query | Critical for accuracy; must reflect current offer |
| Price History | Weekly snapshot | Trend analysis requires 8-week window |
| Review Data | Static (mock) | Pre-computed sentiment/pros/cons |
| User Memory | Dynamic per interaction | Updated via LLM extraction after each message |
| Digital Twin | Dynamic per interaction | Evolved via signals after each chat/purchase/comparison |
| Notifications | On-demand or hourly | Triggered when wishlist price drops or stock changes |
| Chat History | Real-time | Persisted immediately after each user message |

---

## Implementation Checklist

- [ ] Add `@requires datasets: [...]` JSDoc to each agent function in `src/lib/agents.ts`
- [ ] Create individual agent config files in `agent-ctx/` (12 files, one per agent)
- [ ] Document dataset schema for each agent (sample data structure)
- [ ] Add data validation/types for each dataset
- [ ] Create data freshness SLAs (e.g., "prices must be ≤5min stale")
- [ ] Implement caching strategy per agent
- [ ] Add monitoring/logging for missing datasets
- [ ] Build integration tests for agent ↔ dataset bindings

---

**Reference**: See `AGENT_DATASETS.md` for comprehensive documentation

Generated: 2026-08-13
