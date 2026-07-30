// POST /api/compare/prices — fetch price history for multiple products
// Body: { productIds: ["id1", "id2", ...] }
// Returns: { histories: { [productId]: [{ platform, price, recordedAt }] } }
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const productIds: string[] = body?.productIds;
    if (!Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json({ error: "Need productIds array" }, { status: 400 });
    }

    const histories: Record<string, any[]> = {};
    for (const productId of productIds) {
      const records = await db.priceHistory.findMany({
        where: { productId },
        orderBy: { recordedAt: "asc" },
      });
      // Group by platform — return per-platform series
      const byPlatform: Record<string, { date: string; price: number }[]> = {};
      for (const r of records) {
        if (!byPlatform[r.platform]) byPlatform[r.platform] = [];
        byPlatform[r.platform].push({
          date: r.recordedAt.toISOString().slice(0, 10),
          price: r.price,
        });
      }
      histories[productId] = Object.entries(byPlatform).map(([platform, series]) => ({
        platform,
        series,
      }));
    }

    return NextResponse.json({ histories });
  } catch (err: any) {
    console.error("[api/compare/prices] error:", err);
    return NextResponse.json(
      { error: "Failed to fetch price histories", detail: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
