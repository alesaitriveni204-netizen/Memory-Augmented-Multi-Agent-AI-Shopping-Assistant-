// POST /api/bundles — generate smart bundle recommendations ("Complete your setup")
// Body: { productId: string }
// Returns: { bundles: [{ title, reason, products: [ProductWithPrice], totalSaved, totalMRP, totalPrice }] }

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateDemoUser } from "@/lib/session";
import { llmJson } from "@/lib/llm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Category complement map — what goes well with what
const COMPLEMENTS: Record<string, string[]> = {
  laptop: ["earbuds", "laptop", "watch", "camera"],
  phone: ["earbuds", "watch", "phone"],
  earbuds: ["phone", "laptop"],
  tv: ["earbuds", "home"],
  watch: ["phone", "earbuds"],
  camera: ["laptop", "earbuds"],
  appliance: ["appliance", "home"],
  fashion: ["fashion", "beauty"],
  beauty: ["beauty", "fashion"],
  home: ["home", "appliance"],
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const productId = body?.productId;
    if (!productId) {
      return NextResponse.json({ error: "Missing productId" }, { status: 400 });
    }

    const user = await getOrCreateDemoUser();
    const product = await db.product.findUnique({
      where: { id: productId },
      include: { platformPrices: true },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Find complementary products from the catalog
    const complementCats = COMPLEMENTS[product.category] ?? ["earbuds", "watch"];
    // Exclude the same product, pick top-rated complements
    const candidates = await db.product.findMany({
      where: {
        category: { in: complementCats },
        id: { not: productId },
      },
      include: { platformPrices: true },
      take: 12,
    });

    // Sort by rating descending
    const sorted = candidates.sort((a, b) => b.rating - a.rating);

    // Use LLM to curate 2 bundles of 2-3 products each
    const twin = user.digitalTwin ? JSON.parse(user.digitalTwin) : null;
    const productSummaries = sorted.slice(0, 8).map((p, i) => {
      const bestPrice = p.platformPrices.length > 0
        ? Math.min(...p.platformPrices.filter(pp => pp.inStock).map(pp => pp.price))
        : p.basePrice;
      return `${i + 1}. ${p.name} (${p.brand}, ${p.category}) — ₹${bestPrice.toLocaleString("en-IN")}, ${p.rating}★, ${p.reviewCount} reviews`;
    }).join("\n");

    const system = `You are the Bundle Recommendation Agent of AI Shopping OS. The user is viewing "${product.name}" (${product.brand}, ${product.category}).
Suggest 2 complementary product bundles that would complete their setup.

User's Digital Twin: shopping style = ${twin?.shoppingStyle ?? "balanced"}, price sensitivity = ${twin?.priceSensitivity ?? 50}/100, tech adoption = ${twin?.technologyAdoption ?? 50}/100.

Available complementary products:
${productSummaries}

Return STRICT JSON:
{
  "bundles": [
    {
      "title": "<bundle name, e.g. 'Complete Gaming Setup' or 'Student Essentials'>",
      "reason": "<1 sentence why this bundle makes sense>",
      "productIndexes": [<1-based indexes from the list above, 2-3 products>],
      "budget": "<'budget' | 'mid-range' | 'premium'>"
    }
  ]
}

Rules:
- Each bundle should have 2-3 products
- Make bundles thematic (e.g., "Gaming Setup", "Productivity Kit", "Travel Essentials")
- Consider the user's twin (price-sensitive → budget picks, tech-savvy → premium)
- Return 2 bundles
Return ONLY the JSON.`;

    const result = await llmJson<{ bundles: Array<{ title: string; reason: string; productIndexes: number[]; budget: string }> }>(
      system,
      "Generate bundles",
      { temperature: 0.6 }
    );

    if (!result?.bundles) {
      // Fallback: create 2 simple bundles from top candidates
      const fallbackBundles = [
        { title: "Complete Setup", reason: "Top-rated complements for your product", productIndexes: [1, 2], budget: "mid-range" },
        { title: "Budget Alternative", reason: "Affordable add-ons", productIndexes: [3, 4], budget: "budget" },
      ];
      return NextResponse.json({ bundles: buildBundles(fallbackBundles, sorted, product) });
    }

    return NextResponse.json({ bundles: buildBundles(result.bundles, sorted, product) });
  } catch (err: any) {
    console.error("[api/bundles] error:", err);
    return NextResponse.json(
      { error: "Failed to generate bundles", detail: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}

function buildBundles(
  llmBundles: Array<{ title: string; reason: string; productIndexes: number[]; budget: string }>,
  candidates: any[],
  mainProduct: any
) {
  return llmBundles.slice(0, 2).map((b) => {
    const products = b.productIndexes
      .filter((idx) => idx >= 1 && idx <= candidates.length)
      .map((idx) => {
        const p = candidates[idx - 1];
        const inStock = p.platformPrices.filter((pp: any) => pp.inStock);
        const prices = (inStock.length > 0 ? inStock : p.platformPrices);
        const best = prices.reduce((min: any, pp: any) => (pp.price < min.price ? pp : min), prices[0]);
        return {
          id: p.id,
          name: p.name,
          brand: p.brand,
          category: p.category,
          imageColor: p.imageColor,
          bestPlatform: best.platform,
          bestPrice: best.price,
          mrp: best.mrp,
          discount: best.discount,
          rating: p.rating,
          reviewCount: p.reviewCount,
          deliveryDays: best.deliveryDays,
        };
      });

    const totalPrice = products.reduce((s, p) => s + p.bestPrice, 0);
    const totalMRP = products.reduce((s, p) => s + p.mrp, 0);
    const totalSaved = totalMRP - totalPrice;

    return {
      title: b.title,
      reason: b.reason,
      budget: b.budget,
      products,
      totalPrice,
      totalMRP,
      totalSaved,
    };
  });
}
