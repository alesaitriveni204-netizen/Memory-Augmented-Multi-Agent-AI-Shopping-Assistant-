// POST /api/products/refresh-prices — refresh prices for existing products from the web
// Body: { productId?: string } — if omitted, refreshes all products (batch, limited to 10)
// Returns: { updated: number, results: [{ productId, name, oldPrice, newPrice, platform }] }

import { NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import { db } from "@/lib/db";
import { llmJson } from "@/lib/llm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let zaiInstance: ZAI | null = null;
async function getZai() {
  if (!zaiInstance) zaiInstance = await ZAI.create();
  return zaiInstance;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const productId = body?.productId;

    // Get products to refresh
    const products = productId
      ? await db.product.findMany({ where: { id: productId }, include: { platformPrices: true }, take: 1 })
      : await db.product.findMany({
          // Refresh products that haven't been updated in last 6 hours
          include: { platformPrices: true },
          take: 10,
          orderBy: { updatedAt: "asc" },
        });

    if (products.length === 0) {
      return NextResponse.json({ updated: 0, results: [], message: "No products to refresh." });
    }

    const zai = await getZai();
    const results: any[] = [];

    for (const product of products) {
      try {
        // Search for current price
        const searchQuery = `${product.name} ${product.brand} price India 2025`;
        let searchResults: any[] = [];

        try {
          const searchRes = await (zai as any).functions.invoke("web_search", { query: searchQuery, num: 3 });
          if (Array.isArray(searchRes)) searchResults = searchRes;
          else if (searchRes && Array.isArray(searchRes.results)) searchResults = searchRes.results;
        } catch {
          continue; // Rate limited or failed — skip this product
        }

        if (searchResults.length === 0) continue;

        // Use LLM to extract price from search snippets
        const snippets = searchResults.map((r, i) =>
          `Result ${i + 1}: ${r.name ?? r.title ?? ""}\nSnippet: ${r.snippet ?? r.description ?? ""}\nURL: ${r.url ?? ""}`
        ).join("\n\n");

        const system = `Extract the current price of "${product.name} (${product.brand})" from these search results.

Return STRICT JSON:
{
  "prices": [
    {
      "platform": "<amazon|flipkart|croma|reliance|myntra|nykaa|ajio|tatacliq|meesho>",
      "price": <price in INR as number>,
      "mrp": <MRP if mentioned, or same as price>,
      "inStock": true,
      "url": "<source URL>"
    }
  ]
}

Rules:
- Only include prices you can confidently extract from the snippets.
- Remove ₹ symbol and commas. Convert "74,999" to 74999.
- If no price found, return empty array.
Return ONLY the JSON.`;

        const priceData = await llmJson<{ prices: Array<{ platform: string; price: number; mrp: number; inStock: boolean; url: string }> }>(
          system,
          snippets,
          { temperature: 0.2 }
        );

        if (!priceData?.prices || priceData.prices.length === 0) continue;

        // Update platform prices in DB
        let oldPrice = product.basePrice;
        let newPrice = product.basePrice;

        for (const pp of priceData.prices) {
          if (pp.price <= 0) continue;

          // Detect platform from URL if not provided
          const platform = pp.platform || detectPlatform(pp.url);

          await db.platformPrice.upsert({
            where: { productId_platform: { productId: product.id, platform } },
            update: {
              price: pp.price,
              mrp: pp.mrp || pp.price,
              discount: pp.mrp > pp.price ? Math.round(((pp.mrp - pp.price) / pp.mrp) * 100) : 0,
              inStock: pp.inStock,
              url: pp.url,
              updatedAt: new Date(),
            },
            create: {
              productId: product.id,
              platform,
              price: pp.price,
              mrp: pp.mrp || pp.price,
              discount: pp.mrp > pp.price ? Math.round(((pp.mrp - pp.price) / pp.mrp) * 100) : 0,
              inStock: pp.inStock,
              seller: "Live data",
              url: pp.url,
            },
          });

          // Add to price history
          await db.priceHistory.create({
            data: {
              productId: product.id,
              platform,
              price: pp.price,
            },
          });

          // Track the lowest price found
          if (newPrice === product.basePrice || pp.price < newPrice) {
            oldPrice = newPrice;
            newPrice = pp.price;
          }
        }

        // Update product's updatedAt timestamp
        await db.product.update({
          where: { id: product.id },
          data: { updatedAt: new Date() },
        });

        results.push({
          productId: product.id,
          name: product.name,
          oldPrice,
          newPrice,
          changed: oldPrice !== newPrice,
          platforms: priceData.prices.length,
        });
      } catch (err) {
        // Skip individual product errors
        console.error(`[refresh-prices] error for ${product.name}:`, err);
      }
    }

    return NextResponse.json({
      updated: results.length,
      results,
    });
  } catch (err: any) {
    console.error("[api/products/refresh-prices] error:", err);
    return NextResponse.json({
      updated: 0,
      results: [],
      error: err?.message ?? String(err),
    });
  }
}

function detectPlatform(url: string): string {
  const lower = (url || "").toLowerCase();
  if (lower.includes("amazon")) return "amazon";
  if (lower.includes("flipkart")) return "flipkart";
  if (lower.includes("croma")) return "croma";
  if (lower.includes("reliance")) return "reliance";
  if (lower.includes("myntra")) return "myntra";
  if (lower.includes("nykaa")) return "nykaa";
  if (lower.includes("ajio")) return "ajio";
  return "amazon";
}
