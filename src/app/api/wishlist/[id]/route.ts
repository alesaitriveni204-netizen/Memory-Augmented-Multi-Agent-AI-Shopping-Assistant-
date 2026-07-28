// /api/wishlist/[id] — DELETE + PATCH for a single wishlist item
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
    const existing = await db.wishlistItem.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Wishlist item not found" }, { status: 404 });
    }
    await db.wishlistItem.delete({ where: { id: existing.id } });
    await db.timelineEvent.create({
      data: {
        userId: user.id,
        type: "wishlist",
        title: "Removed from wishlist",
        productId: existing.productId,
      },
    });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[api/wishlist/[id] DELETE] error:", err);
    return NextResponse.json(
      { error: "Failed to remove wishlist item", detail: err?.message ?? String(err) },
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
    const existing = await db.wishlistItem.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Wishlist item not found" }, { status: 404 });
    }
    const updated = await db.wishlistItem.update({
      where: { id: existing.id },
      data: {
        ...(body.targetPrice !== undefined
          ? { targetPrice: body.targetPrice === null ? null : Number(body.targetPrice) }
          : {}),
        ...(body.notes !== undefined ? { notes: body.notes } : {}),
      },
      include: { product: { include: { platformPrices: true } } },
    });
    return NextResponse.json({ item: updated });
  } catch (err: any) {
    console.error("[api/wishlist/[id] PATCH] error:", err);
    return NextResponse.json(
      { error: "Failed to update wishlist item", detail: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
