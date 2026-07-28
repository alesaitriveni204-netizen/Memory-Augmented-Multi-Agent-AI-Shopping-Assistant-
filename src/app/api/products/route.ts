// GET /api/products — list products with filters + relations
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const category = url.searchParams.get("category");
    const brand = url.searchParams.get("brand");
    const search = url.searchParams.get("search");
    const limitRaw = url.searchParams.get("limit");
    const limit = limitRaw ? Math.min(100, Math.max(1, parseInt(limitRaw, 10))) : 20;

    const where: any = {};
    if (category) where.category = category;
    if (brand) where.brand = { contains: brand };
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { brand: { contains: search } },
        { subcategory: { contains: search } },
      ];
    }

    const products = await db.product.findMany({
      where,
      include: {
        platformPrices: true,
        priceHistory: {
          orderBy: { recordedAt: "desc" },
          take: 8,
        },
      },
      orderBy: { rating: "desc" },
      take: limit,
    });

    return NextResponse.json({ products, count: products.length });
  } catch (err: any) {
    console.error("[api/products GET] error:", err);
    return NextResponse.json(
      { error: "Failed to fetch products", detail: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
