// /api/accounts — GET (list), POST (connect), DELETE (disconnect)
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateDemoUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getOrCreateDemoUser();
    const accounts = await db.connectedAccount.findMany({
      where: { userId: user.id },
      orderBy: { connectedAt: "desc" },
    });
    return NextResponse.json({ accounts });
  } catch (err: any) {
    console.error("[api/accounts GET] error:", err);
    return NextResponse.json(
      { error: "Failed to fetch accounts", detail: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch (err: any) {
    return NextResponse.json(
      { error: "Invalid JSON body", detail: err?.message ?? String(err) },
      { status: 400 }
    );
  }
  const platform = body?.platform;
  if (!platform) {
    return NextResponse.json({ error: "Missing 'platform'" }, { status: 400 });
  }

  try {
    const user = await getOrCreateDemoUser();
    const account = await db.connectedAccount.upsert({
      where: { userId_platform: { userId: user.id, platform } },
      update: { connected: true, connectedAt: new Date() },
      create: { userId: user.id, platform, connected: true },
    });
    await db.timelineEvent.create({
      data: {
        userId: user.id,
        type: "memory_update",
        title: `Connected ${platform}`,
        description: `Account linked for price tracking.`,
        metadata: JSON.stringify({ platform }),
      },
    });
    return NextResponse.json({ account });
  } catch (err: any) {
    console.error("[api/accounts POST] error:", err);
    return NextResponse.json(
      { error: "Failed to connect account", detail: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    let platform: string | null = null;
    const url = new URL(req.url);
    platform = url.searchParams.get("platform");
    if (!platform) {
      // try body
      try {
        const body = await req.json();
        platform = body?.platform ?? null;
      } catch {
        platform = null;
      }
    }
    if (!platform) {
      return NextResponse.json({ error: "Missing 'platform'" }, { status: 400 });
    }
    const user = await getOrCreateDemoUser();
    const existing = await db.connectedAccount.findUnique({
      where: { userId_platform: { userId: user.id, platform } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }
    await db.connectedAccount.delete({ where: { id: existing.id } });
    await db.timelineEvent.create({
      data: {
        userId: user.id,
        type: "memory_update",
        title: `Disconnected ${platform}`,
        description: `Account unlinked.`,
        metadata: JSON.stringify({ platform }),
      },
    });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[api/accounts DELETE] error:", err);
    return NextResponse.json(
      { error: "Failed to disconnect account", detail: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
