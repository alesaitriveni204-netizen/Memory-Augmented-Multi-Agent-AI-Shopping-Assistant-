// GET /api/chat/sessions - list persisted chat sessions for the current user
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
      select: { sessionId: true, role: true, content: true, createdAt: true },
    });
    const groups = new Map<string, { title: string; messageCount: number; createdAt: Date; updatedAt: Date }>();

    for (const message of messages) {
      const id = message.sessionId || "legacy";
      const existing = groups.get(id);
      if (existing) {
        existing.messageCount += 1;
        existing.updatedAt = message.createdAt;
      } else {
        groups.set(id, {
          title: message.role === "user" ? message.content : "Previous conversation",
          messageCount: 1,
          createdAt: message.createdAt,
          updatedAt: message.createdAt,
        });
      }
    }

    const sessions = [...groups.entries()]
      .map(([id, session]) => ({ id, ...session }))
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .map((session) => ({ ...session, createdAt: session.createdAt.toISOString(), updatedAt: session.updatedAt.toISOString() }));

    return NextResponse.json({ sessions });
  } catch (err: any) {
    console.error("[api/chat/sessions] error:", err);
    return NextResponse.json({ error: "Failed to fetch chat sessions" }, { status: 500 });
  }
}
