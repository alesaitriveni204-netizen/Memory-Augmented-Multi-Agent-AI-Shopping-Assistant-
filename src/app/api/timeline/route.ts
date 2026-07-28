// GET /api/timeline — returns last 100 timeline events, optional ?type= filter
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateDemoUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const type = url.searchParams.get("type");
    const user = await getOrCreateDemoUser();

    const where: any = { userId: user.id };
    if (type) where.type = type;

    const events = await db.timelineEvent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const parsed = events.map((e) => {
      let metadata: any = null;
      if (e.metadata) {
        try {
          metadata = JSON.parse(e.metadata);
        } catch {
          metadata = null;
        }
      }
      return { ...e, metadata };
    });

    return NextResponse.json({ events: parsed });
  } catch (err: any) {
    console.error("[api/timeline GET] error:", err);
    return NextResponse.json(
      { error: "Failed to fetch timeline", detail: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
