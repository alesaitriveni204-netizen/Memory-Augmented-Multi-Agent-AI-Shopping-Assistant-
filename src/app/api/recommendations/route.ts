// GET /api/recommendations — last 30 recommendations with product + filter by status
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateDemoUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const user = await getOrCreateDemoUser();

    const where: any = { userId: user.id };
    if (status) where.status = status;

    const recommendations = await db.recommendation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        product: { include: { platformPrices: true } },
      },
    });

    // Parse scoreBreakdown JSON for convenience
    const parsed = recommendations.map((r) => {
      let breakdown: any = null;
      if (r.scoreBreakdown) {
        try {
          breakdown = JSON.parse(r.scoreBreakdown);
        } catch {}
      }
      return { ...r, scoreBreakdown: breakdown };
    });

    return NextResponse.json({ recommendations: parsed });
  } catch (err: any) {
    console.error("[api/recommendations GET] error:", err);
    return NextResponse.json(
      { error: "Failed to fetch recommendations", detail: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
