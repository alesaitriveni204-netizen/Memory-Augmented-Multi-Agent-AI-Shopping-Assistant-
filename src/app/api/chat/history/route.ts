// GET /api/chat/history — returns last 50 chat messages
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateDemoUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getOrCreateDemoUser();
    const messages = await db.chatMessage.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
      take: 50,
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
