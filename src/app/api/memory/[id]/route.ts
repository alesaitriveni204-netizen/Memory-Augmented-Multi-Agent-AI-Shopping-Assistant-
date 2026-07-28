// /api/memory/[id] — DELETE + PATCH for a single memory
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateDemoUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
    console.error("[api/memory/[id] DELETE] error:", err);
    return NextResponse.json(
      { error: "Failed to delete memory", detail: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id } = await params;
    const user = await getOrCreateDemoUser();
    const existing = await db.memory.findFirst({
      where: { id, userId: user.id },
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
    console.error("[api/memory/[id] PATCH] error:", err);
    return NextResponse.json(
      { error: "Failed to update memory", detail: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
