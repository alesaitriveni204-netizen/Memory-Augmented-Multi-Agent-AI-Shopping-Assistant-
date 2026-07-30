// POST /api/image-search — analyze uploaded product image via VLM, find similar products
// Body: { image: "<base64 data URL>" }
// Returns: { analysis: {category, brand, type, color, features}, products: [matched products] }

import { NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let zaiInstance: ZAI | null = null;
async function getZai() {
  if (!zaiInstance) zaiInstance = await ZAI.create();
  return zaiInstance;
}

interface AnalyzedProduct {
  category: string;
  brand: string;
  type: string;
  color: string;
  features: string[];
  description: string;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const imageDataUrl = body?.image;
    if (!imageDataUrl || typeof imageDataUrl !== "string") {
      return NextResponse.json({ error: "Missing 'image' field (base64 data URL)" }, { status: 400 });
    }

    const zai = await getZai();

    // Use VLM to analyze the product image
    const systemPrompt = `You are a product analysis agent for AI Shopping OS. Analyze this product image and extract shopping-relevant attributes.

Return STRICT JSON:
{
  "category": "<one of: laptop, phone, earbuds, tv, watch, camera, appliance, fashion, beauty, home>",
  "brand": "<detected brand name, or 'unknown'>",
  "type": "<specific product type, e.g. 'gaming laptop', 'wireless earbuds', 'running shoes'>",
  "color": "<primary color>",
  "features": ["<visible features, e.g. 'mechanical keyboard', 'USB-C port', 'leather strap'>"],
  "description": "<1-2 sentence description of what you see>"
}

Rules:
- Be specific about the category
- If uncertain, make your best guess
- Focus on shopping-relevant attributes
Return ONLY the JSON.`;

    let visionResponse: any;
    try {
      visionResponse = await (zai as any).chat.completions.createVision({
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: systemPrompt },
              { type: "image_url", image_url: { url: imageDataUrl } },
            ],
          },
        ],
        thinking: { type: "disabled" },
      });
    } catch (visionErr: any) {
      const msg = visionErr?.message ?? String(visionErr);
      const isRateLimit = msg.includes("429") || msg.includes("Too many requests");
      console.error("[api/image-search] vision error:", msg);
      // Return graceful fallback instead of 500
      return NextResponse.json({
        analysis: {
          category: "unknown",
          brand: "unknown",
          type: "product",
          color: "",
          features: [],
          description: isRateLimit ? "Rate limited — please try again in a moment." : "Could not analyze image.",
        },
        products: [],
        rateLimited: isRateLimit,
      });
    }

    const rawAnalysis = visionResponse?.choices?.[0]?.message?.content ?? "";

    // Parse the JSON from the response
    let analysis: AnalyzedProduct;
    try {
      let cleaned = rawAnalysis.replace(/```json\s*/g, "").replace(/```/g, "").trim();
      const first = cleaned.indexOf("{");
      const last = cleaned.lastIndexOf("}");
      if (first !== -1 && last !== -1) {
        cleaned = cleaned.slice(first, last + 1);
      }
      analysis = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({
        analysis: { category: "unknown", brand: "unknown", type: "product", color: "", features: [], description: rawAnalysis.slice(0, 200) },
        products: [],
      });
    }

    // Find matching products from catalog
    const matchedProducts: any[] = [];

    // 1. Try exact category match
    if (analysis.category && analysis.category !== "unknown") {
      const catProducts = await db.product.findMany({
        where: { category: analysis.category },
        include: { platformPrices: true },
        take: 6,
      });
      matchedProducts.push(...catProducts);
    }

    // 2. If brand detected, try to find brand matches
    if (analysis.brand && analysis.brand !== "unknown" && matchedProducts.length < 4) {
      const brandProducts = await db.product.findMany({
        where: {
          brand: { contains: analysis.brand, mode: "insensitive" },
          id: { notIn: matchedProducts.map((p) => p.id) },
        },
        include: { platformPrices: true },
        take: 4,
      });
      matchedProducts.push(...brandProducts);
    }

    // 3. If still not enough, get top-rated products across all categories
    if (matchedProducts.length < 3) {
      const extraProducts = await db.product.findMany({
        where: { id: { notIn: matchedProducts.map((p) => p.id) } },
        include: { platformPrices: true },
        orderBy: { rating: "desc" },
        take: 6 - matchedProducts.length,
      });
      matchedProducts.push(...extraProducts);
    }

    // Format products with best platform price
    const products = matchedProducts.slice(0, 6).map((p) => {
      const inStock = p.platformPrices.filter((pp: any) => pp.inStock);
      const candidates = inStock.length > 0 ? inStock : p.platformPrices;
      const best = candidates.length > 0
        ? candidates.reduce((min: any, pp: any) => (pp.price < min.price ? pp : min), candidates[0])
        : null;
      return {
        id: p.id,
        name: p.name,
        brand: p.brand,
        category: p.category,
        imageColor: p.imageColor,
        basePrice: p.basePrice,
        rating: p.rating,
        reviewCount: p.reviewCount,
        bestPlatform: best?.platform ?? null,
        bestPrice: best?.price ?? p.basePrice,
        mrp: best?.mrp ?? p.basePrice,
        discount: best?.discount ?? 0,
        deliveryDays: best?.deliveryDays ?? 3,
        matchReason: p.category === analysis.category ? "category match" : p.brand.toLowerCase().includes(analysis.brand?.toLowerCase() ?? "") ? "brand match" : "recommended",
      };
    });

    return NextResponse.json({ analysis, products });
  } catch (err: any) {
    console.error("[api/image-search] error:", err);
    // Return graceful fallback instead of 500
    return NextResponse.json({
      analysis: { category: "unknown", brand: "unknown", type: "product", color: "", features: [], description: "Analysis failed — please try again." },
      products: [],
      error: err?.message ?? String(err),
    });
  }
}
