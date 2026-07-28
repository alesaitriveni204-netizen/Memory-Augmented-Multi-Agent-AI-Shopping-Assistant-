// /api/notifications — GET (refresh + list) + POST (mark read)
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateDemoUser } from "@/lib/session";
import { generateNotificationsForUser } from "@/lib/agents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getOrCreateDemoUser();
    // Refresh price-drop notifications
    try {
      await generateNotificationsForUser(user.id);
    } catch (e) {
      console.error("[api/notifications GET] refresh failed:", e);
    }
    const notifications = await db.notification.findMany({
      where: { userId: user.id },
      orderBy: [{ read: "asc" }, { createdAt: "desc" }],
    });
    const unread = notifications.filter((n) => !n.read).length;
    return NextResponse.json({ notifications, unread });
  } catch (err: any) {
    console.error("[api/notifications GET] error:", err);
    return NextResponse.json(
      { error: "Failed to fetch notifications", detail: err?.message ?? String(err) },
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

  try {
    const user = await getOrCreateDemoUser();
    if (body?.action !== "mark_read") {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
    if (body.id) {
      const existing = await db.notification.findFirst({
        where: { id: body.id, userId: user.id },
      });
      if (!existing) {
        return NextResponse.json({ error: "Notification not found" }, { status: 404 });
      }
      await db.notification.update({
        where: { id: existing.id },
        data: { read: true },
      });
      return NextResponse.json({ success: true, updated: 1 });
    }
    const result = await db.notification.updateMany({
      where: { userId: user.id, read: false },
      data: { read: true },
    });
    return NextResponse.json({ success: true, updated: result.count });
  } catch (err: any) {
    console.error("[api/notifications POST] error:", err);
    return NextResponse.json(
      { error: "Failed to update notifications", detail: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
