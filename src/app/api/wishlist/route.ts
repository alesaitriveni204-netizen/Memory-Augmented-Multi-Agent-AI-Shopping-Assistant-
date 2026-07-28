// /api/wishlist — GET (list with product + prices) + POST (upsert + notifications)
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateDemoUser } from "@/lib/session";
import { generateNotificationsForUser } from "@/lib/agents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getOrCreateDemoUser();
    const items = await db.wishlistItem.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        product: { include: { platformPrices: true } },
      },
    });
    return NextResponse.json({ items });
  } catch (err: any) {
    console.error("[api/wishlist GET] error:", err);
    return NextResponse.json(
      { error: "Failed to fetch wishlist", detail: err?.message ?? String(err) },
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
    const productId = body?.productId;
    if (!productId) {
      return NextResponse.json({ error: "Missing 'productId'" }, { status: 400 });
    }
    const product = await db.product.findUnique({ where: { id: productId } });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const targetPrice = body.targetPrice !== undefined ? Number(body.targetPrice) : null;
    const notes = body.notes ?? null;

    const item = await db.wishlistItem.upsert({
      where: { userId_productId: { userId: user.id, productId } },
      update: {
        ...(targetPrice !== null ? { targetPrice } : {}),
        ...(notes !== null ? { notes } : {}),
      },
      create: {
        userId: user.id,
        productId,
        targetPrice: targetPrice ?? null,
        notes: notes ?? null,
      },
      include: {
        product: { include: { platformPrices: true } },
      },
    });

    await db.timelineEvent.create({
      data: {
        userId: user.id,
        type: "wishlist",
        title: "Added to wishlist",
        productId,
        description: product.name,
        metadata: JSON.stringify({ targetPrice }),
      },
    });

    // Check for immediate price drops
    try {
      await generateNotificationsForUser(user.id);
    } catch (e) {
      console.error("[api/wishlist POST] notification check failed:", e);
    }

    return NextResponse.json({ item });
  } catch (err: any) {
    console.error("[api/wishlist POST] error:", err);
    return NextResponse.json(
      { error: "Failed to add to wishlist", detail: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
