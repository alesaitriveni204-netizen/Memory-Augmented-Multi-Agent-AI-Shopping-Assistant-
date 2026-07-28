// GET /api/export — generates a downloadable shopping intelligence report
// Returns a JSON file with all user data (memories, twin, wishlist, recommendations, insights)
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateDemoUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getOrCreateDemoUser();

    // Fetch all user data
    const [memories, twin, wishlist, recommendations, timeline, notifications, accounts] = await Promise.all([
      db.memory.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
      db.user.findUnique({ where: { id: user.id }, select: { digitalTwin: true, twinConfidence: true, personaCluster: true, onboarding: true } }),
      db.wishlistItem.findMany({
        where: { userId: user.id },
        include: { product: { include: { platformPrices: true } } },
        orderBy: { createdAt: "desc" },
      }),
      db.recommendation.findMany({
        where: { userId: user.id },
        include: { product: true },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      db.timelineEvent.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50 }),
      db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
      db.connectedAccount.findMany({ where: { userId: user.id } }),
    ]);

    // Compute summary stats
    const purchasedRecs = recommendations.filter((r) => r.status === "purchased");
    const totalSpent = purchasedRecs.reduce((sum, r) => {
      // Use the shoppingScore as a proxy if no price; in real app would use actual price
      return sum;
    }, 0);

    const report = {
      meta: {
        exportedAt: new Date().toISOString(),
        appVersion: "AI Shopping OS v1.0",
        user: {
          name: user.name,
          email: user.email,
          personaCluster: twin?.personaCluster,
          twinConfidence: twin?.twinConfidence,
        },
      },
      summary: {
        totalMemories: memories.length,
        totalRecommendations: recommendations.length,
        totalPurchases: purchasedRecs.length,
        totalWishlistItems: wishlist.length,
        totalTimelineEvents: timeline.length,
        totalNotifications: notifications.length,
        connectedAccounts: accounts.filter((a) => a.connected).map((a) => a.platform),
      },
      digitalTwin: twin?.digitalTwin ? JSON.parse(twin.digitalTwin) : null,
      onboarding: twin?.onboarding ? JSON.parse(twin.onboarding) : null,
      memories: memories.map((m) => ({
        type: m.type,
        category: m.category,
        key: m.key,
        value: m.value,
        confidence: m.confidence,
        source: m.source,
        createdAt: m.createdAt,
      })),
      wishlist: wishlist.map((w) => ({
        product: w.product.name,
        brand: w.product.brand,
        category: w.product.category,
        targetPrice: w.targetPrice,
        bestPrice: w.product.platformPrices?.length > 0
          ? Math.min(...w.product.platformPrices.filter((p) => p.inStock).map((p) => p.price))
          : w.product.basePrice,
        addedAt: w.createdAt,
      })),
      recommendations: recommendations.map((r) => ({
        product: r.product.name,
        brand: r.product.brand,
        shoppingScore: r.shoppingScore,
        status: r.status,
        intent: r.intent,
        explanation: r.explanation,
        createdAt: r.createdAt,
      })),
      timeline: timeline.map((t) => ({
        type: t.type,
        title: t.title,
        description: t.description,
        createdAt: t.createdAt,
      })),
    };

    // Return as downloadable JSON
    const jsonStr = JSON.stringify(report, null, 2);
    return new NextResponse(jsonStr, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="ai-shopping-os-report-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (err: any) {
    console.error("[api/export] error:", err);
    return NextResponse.json(
      { error: "Failed to export report", detail: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
