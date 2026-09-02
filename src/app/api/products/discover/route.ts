// POST /api/products/discover — discover REAL products from the web
// Uses web_search to find products, page_reader to extract details, LLM to parse
// Body: { query: string, category?: string }
// Returns: { products: [normalized product data], source: "live" }

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

interface DiscoveredProduct {
  name: string;
  brand: string;
  category: string;
  specs: Record<string, string>;
  basePrice: number;
  rating: number;
  reviewCount: number;
  pros: string[];
  cons: string[];
  platformPrices: Array<{
    platform: string;
    price: number;
    mrp: number;
    discount: number;
    url: string;
    inStock: boolean;
    deliveryDays: number;
  }>;
  source: string;
  imageUrl?: string;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const query = body?.query;
    const category = body?.category;

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Missing 'query' field" }, { status: 400 });
    }

    const zai = await getZai();

    // Step 1: Web search for products
    let searchResults: any[] = [];
    try {
      const searchArgs: any = { query: `${query} buy online India price site:amazon.in OR site:flipkart.com OR site:croma.com`, num: 8 };
      const results = await (zai as any).functions.invoke("web_search", searchArgs);
      if (Array.isArray(results)) searchResults = results;
      else if (results && Array.isArray(results.results)) searchResults = results.results;
      else if (results && Array.isArray((results as any).data)) searchResults = (results as any).data;
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      const isRateLimit = msg.includes("429") || msg.includes("Too many requests");
      if (isRateLimit) {
        return NextResponse.json({
          products: [],
          source: "live",
          rateLimited: true,
          message: "Web search rate limited. Try again later or use the cached catalog.",
        });
      }
      return NextResponse.json({ products: [], source: "live", error: msg });
    }

    if (searchResults.length === 0) {
      return NextResponse.json({ products: [], source: "live", message: "No products found on the web." });
    }

    // Step 2: Read top 3 product pages to extract details
    const productPages: Array<{ url: string; title: string; text: string; snippet: string }> = [];
    const topUrls = searchResults.slice(0, 4);

    for (const result of topUrls) {
      const url = result.url ?? result.link ?? "";
      if (!url) continue;

      try {
        const pageData = await (zai as any).functions.invoke("page_reader", { url });
        const pageText = pageData?.data?.text ?? pageData?.text ?? "";
        const pageTitle = pageData?.data?.title ?? result.name ?? result.title ?? "";

        if (pageText && pageText.length > 100) {
          productPages.push({
            url,
            title: pageTitle,
            text: pageText.slice(0, 3000), // Limit text for LLM context
            snippet: result.snippet ?? result.description ?? "",
          });
        }
      } catch {
        // Page reading may fail for some sites — continue with others
        productPages.push({
          url,
          title: result.name ?? result.title ?? "Unknown",
          text: result.snippet ?? result.description ?? "",
          snippet: result.snippet ?? result.description ?? "",
        });
      }
    }

    if (productPages.length === 0) {
      // Fallback: use search snippets only
      return NextResponse.json({
        products: searchResults.slice(0, 5).map((r) => ({
          name: r.name ?? r.title ?? "Unknown Product",
          brand: "Unknown",
          category: category ?? "unknown",
          specs: {},
          basePrice: 0,
          rating: 0,
          reviewCount: 0,
          pros: [],
          cons: [],
          platformPrices: [{
            platform: detectPlatform(r.url ?? ""),
            price: 0,
            mrp: 0,
            discount: 0,
            url: r.url ?? "",
            inStock: true,
            deliveryDays: 3,
          }],
          source: r.url ?? "web",
        })),
        source: "live",
        partial: true,
      });
    }

    // Step 3: Use LLM to parse page content into structured product data
    const system = `You are a product data extraction agent for AI Shopping OS. Extract structured product information from the following web page content.

For each product found, return STRICT JSON:
{
  "products": [
    {
      "name": "<full product name>",
      "brand": "<brand name>",
      "category": "<one of: laptop, phone, earbuds, tv, watch, camera, appliance, fashion, beauty, home>",
      "specs": { "<spec_key>": "<spec_value>", ... },
      "basePrice": <price in INR as number, or 0 if not found>,
      "rating": <rating 0-5 as number, or 0 if not found>,
      "reviewCount": <review count as number, or 0 if not found>,
      "pros": ["<pro 1>", ...],
      "cons": ["<con 1>", ...],
      "platformPrices": [
        {
          "platform": "<amazon|flipkart|croma|reliance|myntra|nykaa|ajio|tatacliq|meesho>",
          "price": <price in INR>,
          "mrp": <MRP in INR, or same as price if not found>,
          "discount": <discount percentage, 0 if none>,
          "url": "<product URL>",
          "inStock": true,
          "deliveryDays": <estimated delivery days, default 3>
        }
      ],
      "source": "<source URL>"
    }
  ]
}

Rules:
- Extract REAL prices in INR (₹). Remove commas. If price not found, use 0.
- Extract real ratings and review counts if visible.
- Identify the platform from the URL (amazon.in → amazon, flipkart.com → flipkart, etc.)
- Keep specs concise (key specs only: processor, RAM, storage, display, battery, etc.)
- Extract 2-4 pros and 2-3 cons if mentioned in the content.
- Return 1-5 products. Only include products you're confident about.
Return ONLY the JSON.`;

    const pageContent = productPages.map((p, i) =>
      `--- Product Page ${i + 1} ---
URL: ${p.url}
Title: ${p.title}
Content: ${p.text}`
    ).join("\n\n");

    const result = await llmJson<{ products: DiscoveredProduct[] }>(system, pageContent, { temperature: 0.3 });

    if (!result || !Array.isArray(result.products)) {
      return NextResponse.json({ products: [], source: "live", message: "Could not parse product data from web pages." });
    }

    // Step 4: Cache discovered products in the database
    const cachedProducts: any[] = [];
    for (const p of result.products) {
      if (!p.name || p.basePrice === 0) continue; // Skip incomplete products

      try {
        // Check if product already exists (by name + brand)
        const existing = await db.product.findFirst({
          where: {
            name: { contains: p.name, mode: "insensitive" },
            brand: { contains: p.brand, mode: "insensitive" },
          },
        });

        if (existing) {
          // Update platform prices for existing product
          for (const pp of p.platformPrices) {
            await db.platformPrice.upsert({
              where: { productId_platform: { productId: existing.id, platform: pp.platform } },
              update: {
                price: pp.price,
                mrp: pp.mrp,
                discount: pp.discount,
                inStock: pp.inStock,
                deliveryDays: pp.deliveryDays,
                url: pp.url,
                updatedAt: new Date(),
              },
              create: {
                productId: existing.id,
                platform: pp.platform,
                price: pp.price,
                mrp: pp.mrp,
                discount: pp.discount,
                inStock: pp.inStock,
                deliveryDays: pp.deliveryDays,
                seller: "Live data",
                url: pp.url,
              },
            });

            // Add to price history
            await db.priceHistory.create({
              data: {
                productId: existing.id,
                platform: pp.platform,
                price: pp.price,
              },
            });
          }
          cachedProducts.push(existing);
        } else {
          // Create new product
          const newProduct = await db.product.create({
            data: {
              name: p.name,
              brand: p.brand,
              category: p.category || category || "unknown",
              specs: JSON.stringify(p.specs || {}),
              basePrice: p.basePrice,
              rating: p.rating || 4.0,
              reviewCount: p.reviewCount || 0,
              imageColor: "#4338ca",
              pros: JSON.stringify(p.pros || []),
              cons: JSON.stringify(p.cons || []),
              sentimentScore: 0.7,
              tags: JSON.stringify(["live", "discovered"]),
              platformPrices: {
                create: p.platformPrices.map((pp) => ({
                  platform: pp.platform,
                  price: pp.price,
                  mrp: pp.mrp,
                  discount: pp.discount,
                  inStock: pp.inStock,
                  deliveryDays: pp.deliveryDays,
                  seller: "Live data",
                  url: pp.url,
                })),
              },
            },
          });

          // Add initial price history
          for (const pp of p.platformPrices) {
            await db.priceHistory.create({
              data: {
                productId: newProduct.id,
                platform: pp.platform,
                price: pp.price,
              },
            });
          }
          cachedProducts.push(newProduct);
        }
      } catch (dbErr) {
        // DB errors shouldn't fail the whole request — just skip this product
        console.error("[api/products/discover] DB cache error:", dbErr);
      }
    }

    return NextResponse.json({
      products: result.products,
      cachedCount: cachedProducts.length,
      source: "live",
      query,
    });
  } catch (err: any) {
    console.error("[api/products/discover] error:", err);
    return NextResponse.json({
      products: [],
      source: "live",
      error: err?.message ?? String(err),
    });
  }
}

/** Detect platform from URL */
function detectPlatform(url: string): string {
  const lower = url.toLowerCase();
  if (lower.includes("amazon")) return "amazon";
  if (lower.includes("flipkart")) return "flipkart";
  if (lower.includes("croma")) return "croma";
  if (lower.includes("reliance")) return "reliance";
  if (lower.includes("myntra")) return "myntra";
  if (lower.includes("nykaa")) return "nykaa";
  if (lower.includes("ajio")) return "ajio";
  if (lower.includes("tatacliq")) return "tatacliq";
  if (lower.includes("meesho")) return "meesho";
  return "amazon";
}
