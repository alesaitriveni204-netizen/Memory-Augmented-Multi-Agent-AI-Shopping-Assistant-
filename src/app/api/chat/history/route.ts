// GET /api/chat/history — returns chat messages from the last 15 days
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateDemoUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getOrCreateDemoUser();
    const since = new Date();
    since.setDate(since.getDate() - 15);
    const messages = await db.chatMessage.findMany({
      where: { userId: user.id, createdAt: { gte: since } },
      orderBy: { createdAt: "asc" },
    });

    const parsed = messages.map((m) => {
      let metadata: any = null;
      if (m.metadata) {
        try {
          metadata = JSON.parse(m.metadata);
        } catch {
          metadata = null;
        }
      }
      return {
        id: m.id,
        role: m.role,
        content: m.content,
        metadata,
        createdAt: m.createdAt,
      };
    });

    return NextResponse.json({ messages: parsed });
  } catch (err: any) {
    console.error("[api/chat/history] error:", err);
    return NextResponse.json(
      { error: "Failed to fetch chat history", detail: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
