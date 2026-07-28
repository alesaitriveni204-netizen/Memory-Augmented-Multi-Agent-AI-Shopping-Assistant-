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

    // ── Spending tracker: monthly spending from purchased recommendations ──
    const purchasedRecs = recs.filter((r) => r.status === "purchased");
    const monthlySpending: Record<string, { spent: number; saved: number; count: number }> = {};
    const categorySpending: Record<string, { spent: number; count: number }> = {};
    let totalSpent = 0;

    for (const r of purchasedRecs) {
      const prices = r.product.platformPrices;
      if (!prices || prices.length === 0) continue;
      const inStock = prices.filter((p) => p.inStock);
      const candidates = inStock.length > 0 ? inStock : prices;
      const best = candidates.reduce((min, p) => (p.price < min.price ? p : min), candidates[0]);
      const monthKey = new Date(r.createdAt).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
      if (!monthlySpending[monthKey]) monthlySpending[monthKey] = { spent: 0, saved: 0, count: 0 };
      monthlySpending[monthKey].spent += best.price;
      monthlySpending[monthKey].saved += (best.mrp - best.price);
      monthlySpending[monthKey].count += 1;
      totalSpent += best.price;

      const cat = r.product.category;
      if (!categorySpending[cat]) categorySpending[cat] = { spent: 0, count: 0 };
      categorySpending[cat].spent += best.price;
      categorySpending[cat].count += 1;
    }

    const spendingByMonth = Object.entries(monthlySpending)
      .map(([month, data]) => ({ month, ...data }))
      .slice(-6); // last 6 months

    const spendingByCategory = Object.entries(categorySpending)
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.spent - a.spent);

    // Simulate spending history if no purchases yet (for demo)
    if (purchasedRecs.length === 0) {
      const now = new Date();
      const simulated = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const month = d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
        simulated.push({
          month,
          spent: Math.round(15000 + Math.random() * 35000),
          saved: Math.round(2000 + Math.random() * 8000),
          count: Math.round(1 + Math.random() * 4),
        });
      }
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
        spending: {
          totalSpent: simulated.reduce((s, m) => s + m.spent, 0),
          totalSavedThisYear: simulated.reduce((s, m) => s + m.saved, 0),
          purchaseCount: 0,
          byMonth: simulated,
          byCategory: [
            { category: "laptop", spent: 68990, count: 1 },
            { category: "earbuds", spent: 5499, count: 1 },
            { category: "fashion", spent: 2999, count: 2 },
          ],
          simulated: true,
        },
      });
    }

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
      spending: {
        totalSpent,
        totalSavedThisYear: Object.values(monthlySpending).reduce((s, m) => s + m.saved, 0),
        purchaseCount: purchasedRecs.length,
        byMonth: spendingByMonth,
        byCategory: spendingByCategory,
        simulated: false,
      },
    });
  } catch (err: any) {
    console.error("[api/insights GET] error:", err);
    return NextResponse.json(
      { error: "Failed to compute insights", detail: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
