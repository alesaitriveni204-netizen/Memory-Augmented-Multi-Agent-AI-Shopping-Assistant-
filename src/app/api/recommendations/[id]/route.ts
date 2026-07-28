// PATCH /api/recommendations/[id] — update status with side effects
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateDemoUser } from "@/lib/session";
import type { DigitalTwin } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  const status = body?.status as "saved" | "purchased" | "ignored" | undefined;
  if (!status || !["saved", "purchased", "ignored"].includes(status)) {
    return NextResponse.json(
      { error: "Invalid or missing 'status' (must be saved|purchased|ignored)" },
      { status: 400 }
    );
  }

  try {
    const { id } = await params;
    const user = await getOrCreateDemoUser();
    const rec = await db.recommendation.findFirst({
      where: { id, userId: user.id },
      include: { product: true },
    });
    if (!rec) {
      return NextResponse.json({ error: "Recommendation not found" }, { status: 404 });
    }

    const updated = await db.recommendation.update({
      where: { id: rec.id },
      data: { status },
      include: { product: { include: { platformPrices: true } } },
    });

    if (status === "saved") {
      // Create wishlist item if not exists
      await db.wishlistItem.upsert({
        where: { userId_productId: { userId: user.id, productId: rec.productId } },
        update: {},
        create: { userId: user.id, productId: rec.productId },
      });
      await db.timelineEvent.create({
        data: {
          userId: user.id,
          type: "wishlist",
          title: "Saved recommendation",
          productId: rec.productId,
          description: rec.product.name,
          metadata: JSON.stringify({ recommendationId: rec.id }),
        },
      });
    } else if (status === "purchased") {
      // Create episodic memory of the purchase
      const memKey = `purchase_${rec.productId}`;
      const existingMem = await db.memory.findFirst({
        where: { userId: user.id, key: memKey },
      });
      if (existingMem) {
        await db.memory.update({
          where: { id: existingMem.id },
          data: { value: rec.product.name, confidence: 95, updatedAt: new Date() },
        });
      } else {
        await db.memory.create({
          data: {
            userId: user.id,
            type: "episodic",
            category: "event",
            key: memKey,
            value: rec.product.name,
            confidence: 90,
            source: "purchase",
          },
        });
      }

      await db.timelineEvent.create({
        data: {
          userId: user.id,
          type: "purchase",
          title: `Purchased ${rec.product.name}`,
          productId: rec.productId,
          description: `Marked as purchased from recommendation.`,
          metadata: JSON.stringify({ recommendationId: rec.id, brand: rec.product.brand }),
        },
      });

      // Bump twin purchaseConfidence
      if (user.digitalTwin) {
        try {
          const twin = JSON.parse(user.digitalTwin) as DigitalTwin;
          twin.purchaseConfidence = Math.min(100, (twin.purchaseConfidence ?? 50) + 3);
          twin.shoppingConsistency = Math.min(100, (twin.shoppingConsistency ?? 60) + 2);
          if (!twin.preferredBrands.includes(rec.product.brand)) {
            twin.preferredBrands = [...twin.preferredBrands, rec.product.brand];
          }
          if (!twin.preferredCategories.includes(rec.product.category)) {
            twin.preferredCategories = [...twin.preferredCategories, rec.product.category];
          }
          const newConfidence = Math.min(100, (user.twinConfidence ?? 0) + 3);
          await db.user.update({
            where: { id: user.id },
            data: {
              digitalTwin: JSON.stringify(twin),
              twinConfidence: newConfidence,
            },
          });
          await db.timelineEvent.create({
            data: {
              userId: user.id,
              type: "twin_update",
              title: "Twin evolved from purchase",
              description: `purchaseConfidence +3, shoppingConsistency +2, brand "${rec.product.brand}" reinforced.`,
              metadata: JSON.stringify({
                twinConfidence: newConfidence,
                trigger: "purchase",
              }),
            },
          });
        } catch (e) {
          console.error("[api/recommendations/[id]] twin evolve failed:", e);
        }
      }
    } else if (status === "ignored") {
      await db.timelineEvent.create({
        data: {
          userId: user.id,
          type: "recommendation",
          title: "Ignored recommendation",
          productId: rec.productId,
          description: rec.product.name,
          metadata: JSON.stringify({ recommendationId: rec.id }),
        },
      });
    }

    // Parse scoreBreakdown for response
    let breakdown: any = null;
    if (updated.scoreBreakdown) {
      try {
        breakdown = JSON.parse(updated.scoreBreakdown);
      } catch {}
    }

    return NextResponse.json({
      recommendation: { ...updated, scoreBreakdown: breakdown },
    });
  } catch (err: any) {
    console.error("[api/recommendations/[id] PATCH] error:", err);
    return NextResponse.json(
      { error: "Failed to update recommendation", detail: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
