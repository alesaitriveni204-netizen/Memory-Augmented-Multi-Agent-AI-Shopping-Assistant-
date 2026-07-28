// GET /api/insights — aggregated analytics dashboard
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateDemoUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getOrCreateDemoUser();

    // Recommendations with product info for grouping
    const recs = await db.recommendation.findMany({
      where: { userId: user.id },
      include: { product: { include: { platformPrices: true } } },
      orderBy: { createdAt: "desc" },
    });

    const totalProductsCompared = recs.length;
    const avgShoppingScore =
      recs.length > 0
        ? Math.round(recs.reduce((s, r) => s + r.shoppingScore, 0) / recs.length)
        : 0;

    // totalSaved: sum (mrp - bestPrice) for purchased/saved recs
    let totalSaved = 0;
    for (const r of recs) {
      if (r.status !== "purchased" && r.status !== "saved") continue;
      const prices = r.product.platformPrices;
      if (!prices || prices.length === 0) continue;
      const inStock = prices.filter((p) => p.inStock);
      const candidates = inStock.length > 0 ? inStock : prices;
      const best = candidates.reduce((min, p) => (p.price < min.price ? p : min), candidates[0]);
      if (best.mrp > best.price) totalSaved += best.mrp - best.price;
    }

    // Top categories (by rec count)
    const catMap = new Map<string, number>();
    const brandMap = new Map<string, number>();
    const platformMap = new Map<string, number>();
    for (const r of recs) {
      catMap.set(r.product.category, (catMap.get(r.product.category) ?? 0) + 1);
      brandMap.set(r.product.brand, (brandMap.get(r.product.brand) ?? 0) + 1);
      const prices = r.product.platformPrices;
      if (prices && prices.length > 0) {
        const inStock = prices.filter((p) => p.inStock);
        const candidates = inStock.length > 0 ? inStock : prices;
        const best = candidates.reduce((min, p) => (p.price < min.price ? p : min), candidates[0]);
        platformMap.set(best.platform, (platformMap.get(best.platform) ?? 0) + 1);
      }
    }

    const topCategories = [...catMap.entries()]
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
    const topBrands = [...brandMap.entries()]
      .map(([brand, count]) => ({ brand, count }))
      .sort((a, b) => b.count - a.count);
    const platformUsage = [...platformMap.entries()]
      .map(([platform, count]) => ({ platform, count }))
      .sort((a, b) => b.count - a.count);

    const memoryCount = await db.memory.count({ where: { userId: user.id } });

    // Price history trend — average price by week across all products
    const allHistory = await db.priceHistory.findMany({
      orderBy: { recordedAt: "asc" },
    });
    const weekBuckets = new Map<string, { sum: number; count: number }>();
    for (const h of allHistory) {
      const d = new Date(h.recordedAt);
      // ISO week key
      const year = d.getFullYear();
      const onejan = new Date(year, 0, 1);
      const week = Math.ceil(((d.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7);
      const key = `${year}-W${String(week).padStart(2, "0")}`;
      const bucket = weekBuckets.get(key) ?? { sum: 0, count: 0 };
      bucket.sum += h.price;
      bucket.count += 1;
      weekBuckets.set(key, bucket);
    }
    const priceHistoryTrend = [...weekBuckets.entries()]
      .map(([week, { sum, count }]) => ({ week, avgPrice: Math.round(sum / count) }))
      .sort((a, b) => a.week.localeCompare(b.week));

    const recentActivity = await db.timelineEvent.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 7,
    });

    return NextResponse.json({
      totalProductsCompared,
      totalSaved,
      avgShoppingScore,
      topCategories,
      topBrands,
      platformUsage,
      memoryCount,
      twinConfidence: user.twinConfidence,
      priceHistoryTrend,
      recentActivity,
    });
  } catch (err: any) {
    console.error("[api/insights GET] error:", err);
    return NextResponse.json(
      { error: "Failed to compute insights", detail: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
