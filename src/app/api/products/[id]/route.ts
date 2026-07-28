// GET /api/products/[id] — single product with full price history + parsed pros/cons
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const product = await db.product.findUnique({
      where: { id },
      include: {
        platformPrices: { orderBy: { price: "asc" } },
        priceHistory: { orderBy: { recordedAt: "asc" } },
      },
    });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    let pros: string[] = [];
    if (product.pros) {
      try {
        pros = JSON.parse(product.pros);
      } catch {}
    }
    let cons: string[] = [];
    if (product.cons) {
      try {
        cons = JSON.parse(product.cons);
      } catch {}
    }
    let specs: any = {};
    if (product.specs) {
      try {
        specs = JSON.parse(product.specs);
      } catch {}
    }
    let tags: string[] = [];
    if (product.tags) {
      try {
        tags = JSON.parse(product.tags);
      } catch {}
    }

    return NextResponse.json({
      product: {
        ...product,
        pros,
        cons,
        specs,
        tags,
      },
    });
  } catch (err: any) {
    console.error("[api/products/[id] GET] error:", err);
    return NextResponse.json(
      { error: "Failed to fetch product", detail: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
