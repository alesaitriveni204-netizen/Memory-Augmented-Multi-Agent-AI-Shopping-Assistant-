// /api/memory — GET (list grouped), POST (create), PATCH (update), DELETE (?id=)
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateDemoUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GROUPS = ["short_term", "long_term", "episodic", "semantic", "session"] as const;

export async function GET() {
  try {
    const user = await getOrCreateDemoUser();
    const memories = await db.memory.findMany({
      where: { userId: user.id },
      orderBy: [{ type: "asc" }, { updatedAt: "desc" }],
    });

    const grouped: Record<string, any[]> = {
      short_term: [],
      long_term: [],
      episodic: [],
      semantic: [],
      session: [],
      working: [],
    };
    for (const m of memories) {
      const bucket = grouped[m.type] ?? (grouped[m.type] = []);
      bucket.push(m);
    }

    return NextResponse.json({ memories: grouped, total: memories.length });
  } catch (err: any) {
    console.error("[api/memory GET] error:", err);
    return NextResponse.json(
      { error: "Failed to fetch memories", detail: err?.message ?? String(err) },
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
    if (!body?.type || !body?.key) {
      return NextResponse.json(
        { error: "Missing required fields: type, key" },
        { status: 400 }
      );
    }
    const created = await db.memory.create({
      data: {
        userId: user.id,
        type: body.type,
        category: body.category ?? "preference",
        key: body.key,
        value: String(body.value ?? ""),
        confidence: body.confidence ?? 50,
        weight: 1.0,
        source: body.source ?? "explicit",
      },
    });
    return NextResponse.json({ memory: created });
  } catch (err: any) {
    console.error("[api/memory POST] error:", err);
    return NextResponse.json(
      { error: "Failed to create memory", detail: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
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
    if (!body?.id) {
      return NextResponse.json({ error: "Missing memory 'id'" }, { status: 400 });
    }
    const existing = await db.memory.findFirst({
      where: { id: body.id, userId: user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Memory not found" }, { status: 404 });
    }
    const updated = await db.memory.update({
      where: { id: existing.id },
      data: {
        ...(body.value !== undefined ? { value: String(body.value) } : {}),
        ...(body.confidence !== undefined ? { confidence: Number(body.confidence) } : {}),
        updatedAt: new Date(),
      },
    });
    return NextResponse.json({ memory: updated });
  } catch (err: any) {
    console.error("[api/memory PATCH] error:", err);
    return NextResponse.json(
      { error: "Failed to update memory", detail: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing 'id' query param" }, { status: 400 });
    }
    const user = await getOrCreateDemoUser();
    const existing = await db.memory.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Memory not found" }, { status: 404 });
    }
    await db.memory.delete({ where: { id: existing.id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[api/memory DELETE] error:", err);
    return NextResponse.json(
      { error: "Failed to delete memory", detail: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
