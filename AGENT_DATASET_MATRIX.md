# Agent × Dataset Matrix

## 12×11 Dependency Map

| Agent | Product | PlatformPrice | PriceHistory | Memory | User | TimelineEvent | ChatMessage | Recommendation | WishlistItem | Notification | Intent |
|-------|---------|---------------|--------------|--------|------|---------------|-----------|-----------------| -------------|-------------|--------|
| 1. Intent | - | - | - | - | - | - | ✓ (fallback) | - | - | - | ✓ |
| 2. Search | ✓ | ✓ | - | - | - | - | - | - | - | - | ✓ |
| 3. Memory | - | - | - | ✓ | ✓ | - | ✓ | - | - | - | ✓ |
| 4. Digital Twin | - | - | - | - | ✓ | ✓ | - | - | - | - | ✓ |
| 5. Recommendation (MARE) | ✓ | ✓ | ✓ | ✓ | ✓ | - | - | - | - | - | ✓ |
| 6. Review Analysis | ✓ | - | - | - | - | - | - | - | - | - | - |
| 7. Price Intelligence | - | ✓ | ✓ | - | - | - | - | - | - | - | - |
| 8. Budget | - | ✓ | - | ✓ | - | - | - | - | - | - | ✓ |
| 9. Twin Evolution | - | - | - | ✓ | ✓ | ✓ | - | - | - | - | ✓ |
| 10. Explainability | ✓ | - | - | - | ✓ | - | - | ✓ | - | - | ✓ |
| 11. Cart | ✓ | ✓ | - | - | - | - | - | - | - | - | - |
| 12. Notification | - | ✓ | - | - | - | - | - | - | ✓ | ✓ | - |
| **AHDE** | - | - | - | - | ✓ | - | - | - | - | - | ✓ |

**Legend:**
- ✓ = Dataset is required by this agent
- — = Dataset not used
- (fallback) = Used only if LLM call fails

**Column Totals (Dataset Usage Count):**
- Product: 5 agents (Search, MARE, Review, Explainability, Cart)
- PlatformPrice: 7 agents (Search, MARE, Price, Budget, Cart, Notification + AHDE)
- PriceHistory: 2 agents (MARE, Price)
- Memory: 5 agents (Memory, MARE, Budget, Twin Evolution, Intent/fallback)
- User: 5 agents (Memory, Digital Twin, MARE, Twin Evolution, Explainability, AHDE)
- TimelineEvent: 2 agents (Digital Twin, Twin Evolution)
- ChatMessage: 2 agents (Intent/fallback, Memory)
- Recommendation: 1 agent (Explainability)
- WishlistItem: 1 agent (Notification)
- Notification: 1 agent (Notification)
- Intent: 8 agents (all except Review Analysis, AHDE)

---

## Data Volume per Agent per Query

| Agent | Input Volume | Output Volume | Cache Hit Rate |
|-------|-------------|---------------|-----------------|
| 1. Intent | 1 message | 1 IntentResult (5 fields) | N/A (stateless) |
| 2. Search | 1 intent | 12 Product objects | High (catalog static) |
| 3. Memory | 1 userId | 30 Memory objects | Medium (recent memories hot) |
| 4. Digital Twin | 1 userId | 1 DigitalTwin JSON | High (1 per user) |
| 5. MARE | 12 products + memories + twin | 6 RecommendationResult objects | Low (ranking dynamic) |
| 6. Review | 1 product | 1 summary string | Very high (pre-computed) |
| 7. Price | 1 productId | 1 PriceAdvice object | Medium (weekly snapshots) |
| 8. Budget | 1 intent + memories | 1 BudgetAdvice object | High (budget stable) |
| 9. Twin Evolution | 1 signal (intent) | 1 evolved twin JSON + timeline event | Low (per interaction) |
| 10. Explainability | 6 recommendations + context | 1 narrative string | Low (LLM-generated) |
| 11. Cart | 1 product + intent | 1 guidance string | High (static template) |
| 12. Notification | 50 wishlist items + prices | 0–5 Notification objects | Low (triggered sporadically) |

---

## Data Dependencies (Execution Order)

```
User Message
    ↓
[1] Intent Detection Agent
    ↓
    ├─→ [AHDE] — Adaptive Hybrid Decision Engine
    │   (decides which agents to run)
    │
    └─→ Parallel or Sequential:
        ├─→ [2] Search Agent (needs: Intent)
        │       ↓ Products
        │       
        ├─→ [3] Memory Agent (needs: User)
        │       ↓ Memories
        │
        ├─→ [4] Digital Twin Agent (needs: User)
        │       ↓ Twin
        │
        ├─→ [5] Recommendation Agent (needs: Products, Memories, Twin, Intent)
        │       ├─ [6] Review Analysis (for selected products)
        │       ├─ [7] Price Intelligence (for selected products)
        │       └─ [8] Budget Agent (for filtering)
        │       ↓ Top 6 Recommendations
        │
        ├─→ [9] Twin Evolution Agent (updates Twin from Intent signal)
        │       ↓ Evolved Twin + Timeline Event
        │
        └─→ [10] Explainability Agent (needs: Recommendations, Intent, Twin)
            ↓ Natural Language Response

Persist:
  - ChatMessage
  - Recommendations
  - TimelineEvents
  - Update Memories
  - Update Twin
```

---

## Data Freshness SLA

| Dataset | Requirement | Current | Gap |
|---------|-------------|---------|-----|
| Product Specs | Hours | Static (mock) | ✓ OK |
| Platform Prices | Minutes (live) | Live per query | ✓ OK |
| Price History | Weekly snapshot | Manually seeded (8 weeks) | ⚠ Needs auto-capture |
| User Memory | Real-time | LLM extraction per message | ✓ OK |
| Digital Twin | Per-interaction | Evolved after each signal | ✓ OK |
| Reviews/Sentiment | Hours | Pre-computed (mock) | ✓ OK |
| Notifications | Hours | On-demand trigger | ✓ OK |

---

## Dataset Schema Summary

### Lightweight Schemas (< 1KB per record)
- **Intent**: `{ intent, category?, budget?, useCase?, brands?, complexity }`
- **Memory**: `{ type, category, key, value, confidence, weight, source, updatedAt }`
- **BudgetAdvice**: `{ budget?, advice }`
- **PriceAdvice**: `{ trend, advice, avgPrice, lowest, highest }`

### Medium Schemas (1–10KB per record)
- **Product**: `{ name, brand, category, specs JSON, rating, reviewCount, pros[], cons[], tags, sentimentScore }`
- **PlatformPrice**: `{ price, mrp, discount, deliveryDays, inStock, seller, warranty, platform }`
- **DigitalTwin**: `{ 9 traits, preferredCategories[], preferredBrands[], preferredPlatforms[] }`
- **Recommendation**: `{ shoppingScore, scoreBreakdown JSON, explanation, pros[], cons[], specs }`

### Heavy Schemas (10–100KB per record)
- **TimelineEvent**: `{ type, metadata JSON, user details, product details, twin state }`
- **ChatMessage**: `{ content, metadata JSON with intent/agents/latency }`

---

## Caching Strategy by Agent

| Agent | Cache Type | TTL | Size |
|-------|-----------|-----|------|
| Intent | None (stateless) | N/A | N/A |
| Search | Product catalog (Redis/memory) | 24h | 2 MB |
| Memory | User memory (in-process) | 1h | 100 KB |
| Digital Twin | User twin (in-process) | Per-session | 10 KB |
| MARE | Recommendation scores | None (computed) | 50 KB |
| Review | Product reviews (memory) | 24h | 50 KB |
| Price | PriceHistory (DB query cache) | 1h | 100 KB |
| Budget | Budget memory (in-process) | Session | 1 KB |
| Twin Evolution | None (write-through) | N/A | N/A |
| Explainability | LLM output (optional) | 15 min | 10 KB |
| Cart | None (stateless) | N/A | N/A |
| Notification | Notification dedup (24h cache) | 24h | 50 KB |

---

## Dataset Availability Checklist

### For Each Agent Implementation:
- [ ] Document required input datasets
- [ ] List required Prisma models
- [ ] Specify data volume / batch size
- [ ] Define cache strategy
- [ ] Add error handling for missing data
- [ ] Implement fallback behavior
- [ ] Add logging for data freshness
- [ ] Create data validation function
- [ ] Add integration test with mock data
- [ ] Document external API dependencies (e.g., LLM)

### For Each Dataset:
- [ ] Define schema (types)
- [ ] Specify refresh/update frequency
- [ ] Create mock seed data (for dev)
- [ ] Add query indexes (Prisma)
- [ ] Document size estimates
- [ ] Plan archival strategy (for old records)
- [ ] Add observability/metrics
- [ ] Create backup strategy

---

## All 11 Prisma Models & Usage

| Model | Agents Using | Read/Write | Volume |
|-------|-------------|-----------|--------|
| User | 7 agents | R/W (profile, twin, flags) | 1 per session |
| Memory | 5 agents | R/W (extract, update, decay) | 6–100 per user |
| Product | 5 agents | R (mostly static, seed data) | 30 global |
| PlatformPrice | 7 agents | R (live prices) | 90–120 global |
| PriceHistory | 2 agents | R/W (weekly snapshots) | 240–960 global |
| ChatMessage | 2 agents | R/W (persist interactions) | 10–500 per user |
| Recommendation | 1 agent | R/W (store results, track status) | 10–500 per user |
| WishlistItem | 1 agent | R/W (manage wishlist) | 0–50 per user |
| TimelineEvent | 2 agents | R/W (audit trail) | 20–1,000 per user |
| Notification | 1 agent | R/W (alerts) | 0–100 per user |
| ConnectedAccount | - | R/W (platform access) | 0–9 per user |

---

**Generated**: 2026-08-13  
**Last Updated**: 2026-08-13
