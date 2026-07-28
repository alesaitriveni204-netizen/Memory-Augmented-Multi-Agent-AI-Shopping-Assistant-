# Task 3 — Backend API Routes for AI Shopping OS

## What was built

All 17 backend API route handlers under `src/app/api/`, all Next.js 16 App Router route handlers with `runtime = "nodejs"` and `dynamic = "force-dynamic"`.

## Files created

| # | File | Methods | Purpose |
|---|------|---------|---------|
| 1 | `src/app/api/init/route.ts` | GET | Bootstrap demo session, return hasOnboarded |
| 2 | `src/app/api/onboarding/route.ts` | POST | Persona clustering + initial twin + 6 seed memories + connected accounts + timeline |
| 3 | `src/app/api/chat/route.ts` | POST | **Main orchestrator**: intent → AHDE → parallel agents → explainability → persist chat/recs/timeline; async memory+Twin evolution |
| 4 | `src/app/api/chat/history/route.ts` | GET | Last 50 messages with parsed metadata |
| 5 | `src/app/api/memory/route.ts` | GET/POST/PATCH/DELETE | Memory CRUD, grouped by type |
| 6 | `src/app/api/memory/[id]/route.ts` | DELETE/PATCH | Single memory operations (Next.js 16 async params) |
| 7 | `src/app/api/digital-twin/route.ts` | GET/POST | Load twin + history; actions reset/disable/enable/update |
| 8 | `src/app/api/wishlist/route.ts` | GET/POST | Upsert wishlist item + timeline + notification refresh |
| 9 | `src/app/api/wishlist/[id]/route.ts` | DELETE/PATCH | Wishlist item ops |
| 10 | `src/app/api/timeline/route.ts` | GET | Last 100 events, optional ?type= filter |
| 11 | `src/app/api/notifications/route.ts` | GET/POST | Refresh + list; mark_read single or all |
| 12 | `src/app/api/products/route.ts` | GET | Filtered product list (category/brand/search/limit) with platformPrices + last 8 priceHistory |
| 13 | `src/app/api/products/[id]/route.ts` | GET | Full product detail with parsed pros/cons/specs/tags |
| 14 | `src/app/api/insights/route.ts` | GET | 10 aggregated analytics (counts, savings, groupBys, weekly price trend, recent activity) |
| 15 | `src/app/api/accounts/route.ts` | GET/POST/DELETE | Connect/disconnect platforms |
| 16 | `src/app/api/recommendations/route.ts` | GET | Last 30 recommendations with ?status= filter |
| 17 | `src/app/api/recommendations/[id]/route.ts` | PATCH | Status update with side effects (wishlist, episodic memory, twin evolution) |

## Verification

- `bun run lint` passes with zero errors/warnings
- Smoke tested every endpoint via curl against the live dev server on port 3000:
  - `/api/init` → returned demo user object
  - `/api/onboarding` → set persona to `student-shopper`, twinConfidence=20, twin built
  - `/api/chat` with "recommend a gaming laptop under 70000" → returned full response with 6 recommendations, top score 86 (Lenovo IdeaPad Gaming 3)
  - `/api/chat/history`, `/api/memory`, `/api/digital-twin`, `/api/insights`, `/api/wishlist`, `/api/notifications`, `/api/accounts`, `/api/recommendations`, `/api/products?category=laptop&limit=3` — all returned correct payloads
  - PATCH `/api/recommendations/[id]` with `status:saved` → wishlist item created
  - PATCH with `status:purchased` → episodic memory created, twin purchaseConfidence +3, twinConfidence +3, brand/category reinforced
  - POST/DELETE `/api/accounts` → connect/disconnect works
  - POST `/api/digital-twin` action=update → twin fields merged, confidence bumped
  - Memory POST/PATCH/DELETE all work with user ownership checks
  - Wishlist POST/PATCH works, generates notifications

## Notes for downstream agents

- Demo user was reset to clean (non-onboarded) state after testing so Tasks 4/5 can onboard fresh
- `getOrCreateDemoUser()` is the single source of truth for "current user" — every route uses it
- Recommendation PATCH side-effect on `purchased` writes a `twin_update` timeline event with `trigger: "purchase"` metadata — frontend can show "Twin evolved from purchase" toast
- `/api/chat` returns `recommendations[].priceAdvice` (trend, advice, avgPrice, lowest, highest) for the top 3 recs only (per AHDE 'price' agent inclusion)
- `/api/insights` `priceHistoryTrend` is an array of `{week, avgPrice}` ISO-week buckets across ALL products' price history (not just the user's recs)
- All `/api/products` returns include `platformPrices` (full array) and `priceHistory` (last 8 desc)
- The existing `src/app/api/route.ts` (Hello World) was left untouched

## Issues encountered
None. All routes built clean, lint passes, smoke tests all green.
