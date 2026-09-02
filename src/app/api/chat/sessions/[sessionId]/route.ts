// GET /api/chat/sessions/:sessionId - load one complete persisted conversation
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateDemoUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const user = await getOrCreateDemoUser();
    const { sessionId } = await params;
    const messages = await db.chatMessage.findMany({
      where: {
        userId: user.id,
        ...(sessionId === "legacy" ? { sessionId: null } : { sessionId }),
      },
      orderBy: { createdAt: "asc" },
    });

    const parsed = messages.map((message) => {
      let metadata: any = null;
      if (message.metadata) {
        try {
          metadata = JSON.parse(message.metadata);
        } catch {
          metadata = null;
        }
      }
      return {
        id: message.id,
        role: message.role,
        content: message.content,
        metadata,
        createdAt: message.createdAt,
      };
    });

    return NextResponse.json({ sessionId, messages: parsed });
  } catch (err: any) {
    console.error("[api/chat/sessions/:sessionId] error:", err);
    return NextResponse.json({ error: "Failed to load chat session" }, { status: 500 });
  }
}
