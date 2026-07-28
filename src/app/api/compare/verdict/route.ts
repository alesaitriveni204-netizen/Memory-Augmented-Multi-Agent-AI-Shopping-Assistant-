// POST /api/compare/verdict — generate an LLM-powered verdict on compared products
// Body: { products: [{ name, brand, bestPrice, shoppingScore, rating, reviewCount, deliveryDays, bestPlatform, discount, specs }] }
// Returns: { verdict, winner, reasoning }

import { NextResponse } from "next/server";
import { llmJson } from "@/lib/llm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CompareProductInput {
  name: string;
  brand: string;
  bestPrice: number;
  shoppingScore?: number;
  rating: number;
  reviewCount: number;
  deliveryDays: number;
  bestPlatform: string;
  discount: number;
  specs?: Record<string, string | number>;
  pros?: string[];
  cons?: string[];
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const products: CompareProductInput[] = body?.products;
    if (!Array.isArray(products) || products.length < 2) {
      return NextResponse.json(
        { error: "Need at least 2 products to generate a verdict" },
        { status: 400 }
      );
    }

    const system = `You are the AI Verdict Agent of AI Shopping OS. You are given ${products.length} products being compared side-by-side. Analyze them and produce a verdict: which is the best overall pick, and why.

Return STRICT JSON:
{
  "winner": "<exact product name>",
  "verdict": "<2-3 sentence summary of the verdict, friendly and decisive>",
  "reasoning": ["<reason 1>", "<reason 2>", "<reason 3>"],
  "bestFor": "<who this product is best for, e.g. 'budget-conscious gamers', 'students who need ML performance'>",
  "runnerUp": "<exact product name of the second-best>"
}

Rules:
- Be decisive. Pick a clear winner.
- Reference concrete data (price, score, rating, specs) in your reasoning.
- Keep the verdict under 60 words.
- Reasoning items should be short (max 12 words each).
- If two products are very close, mention the trade-off.
Return ONLY the JSON.`;

    const productSummary = products.map((p, i) =>
      `Product ${i + 1}: ${p.name} (${p.brand})
- Shopping Score: ${p.shoppingScore ?? "N/A"}/100
- Best Price: ₹${p.bestPrice.toLocaleString("en-IN")} on ${p.bestPlatform} (${p.discount}% off)
- Rating: ${p.rating}★ (${p.reviewCount.toLocaleString("en-IN")} reviews)
- Delivery: ${p.deliveryDays} days
- Top specs: ${p.specs ? Object.entries(p.specs).slice(0, 5).map(([k, v]) => `${k}: ${v}`).join(", ") : "N/A"}
- Pros: ${(p.pros ?? []).slice(0, 3).join("; ") || "N/A"}
- Cons: ${(p.cons ?? []).slice(0, 2).join("; ") || "N/A"}`
    ).join("\n\n");

    const result = await llmJson<{
      winner: string;
      verdict: string;
      reasoning: string[];
      bestFor: string;
      runnerUp: string;
    }>(system, productSummary, { temperature: 0.5 });

    if (!result) {
      // Fallback: pick highest score
      const sorted = [...products].sort((a, b) => (b.shoppingScore ?? 0) - (a.shoppingScore ?? 0));
      return NextResponse.json({
        winner: sorted[0].name,
        verdict: `Based on the Shopping Score, the ${sorted[0].name} is the top pick at ${sorted[0].shoppingScore}/100. It offers the best balance of value, ratings, and fit for your preferences.`,
        reasoning: [
          `Score ${sorted[0].shoppingScore}/100 — highest`,
          `${sorted[0].rating}★ rating from ${sorted[0].reviewCount.toLocaleString("en-IN")} reviews`,
          `Best price ₹${sorted[0].bestPrice.toLocaleString("en-IN")} on ${sorted[0].bestPlatform}`,
        ],
        bestFor: "shoppers who value overall fit",
        runnerUp: sorted[1]?.name ?? "",
      });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[api/compare/verdict] error:", err);
    return NextResponse.json(
      { error: "Failed to generate verdict", detail: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
