// POST /api/price-prediction — LLM-powered "should I buy now or wait?" advice
// Body: { product: { name, brand, bestPrice, mrp, discount, rating }, priceHistory: [{date, price}], trend, avgPrice, lowest, highest }
// Returns: { recommendation: "buy" | "wait" | "neutral", confidence, reasoning, predictedDiscount, bestTimeToBuy }

import { NextResponse } from "next/server";
import { llmJson } from "@/lib/llm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PricePoint {
  date: string;
  price: number;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const product = body?.product;
    const priceHistory: PricePoint[] = body?.priceHistory ?? [];
    const trend = body?.trend ?? "stable";
    const avgPrice = body?.avgPrice ?? product?.bestPrice ?? 0;
    const lowest = body?.lowest ?? product?.bestPrice ?? 0;
    const highest = body?.highest ?? product?.bestPrice ?? 0;

    if (!product?.name) {
      return NextResponse.json({ error: "Missing product info" }, { status: 400 });
    }

    // Build a concise price history summary
    const prices = priceHistory.map((p) => p.price);
    const recentPrices = prices.slice(-4);
    const recentAvg = recentPrices.length > 0 ? recentPrices.reduce((s, p) => s + p, 0) / recentPrices.length : avgPrice;
    const priceChangePct = prices.length >= 2 ? ((prices[prices.length - 1] - prices[0]) / prices[0]) * 100 : 0;

    const system = `You are the Price Prediction Agent of AI Shopping OS. Analyze the product's price history and give a decisive "buy now" or "wait" recommendation.

Product: ${product.name} (${product.brand})
Current best price: ₹${product.bestPrice.toLocaleString("en-IN")} (MRP ₹${product.mrp.toLocaleString("en-IN")}, ${product.discount}% off)
8-week price range: ₹${lowest.toLocaleString("en-IN")} – ₹${highest.toLocaleString("en-IN")} (avg ₹${avgPrice.toLocaleString("en-IN")})
Recent trend: ${trend}
Price change over 8 weeks: ${priceChangePct > 0 ? "+" : ""}${priceChangePct.toFixed(1)}%
Recent 4-week avg: ₹${recentAvg.toLocaleString("en-IN")}
Rating: ${product.rating}★

Return STRICT JSON:
{
  "recommendation": "<buy | wait | neutral>",
  "confidence": <0-100>,
  "reasoning": "<2-3 sentences explaining the recommendation with specific price data>",
  "predictedDiscount": "<expected discount % in next 2-4 weeks, e.g. '5-10%' or '0-3%'>",
  "bestTimeToBuy": "<when to buy, e.g. 'Buy now' or 'Wait 2-3 weeks for sale' or 'Wait for Diwali sale'>",
  "tip": "<one actionable tip, max 15 words>"
}

Rules:
- "buy" if current price is at/below the 8-week low or trend is falling
- "wait" if current price is above average and a sale is likely soon
- "neutral" if price is stable and near average
- Be specific with numbers from the data
- Keep reasoning under 40 words
Return ONLY the JSON.`;

    const result = await llmJson<{
      recommendation: string;
      confidence: number;
      reasoning: string;
      predictedDiscount: string;
      bestTimeToBuy: string;
      tip: string;
    }>(system, "Generate price prediction", { temperature: 0.4 });

    if (!result) {
      // Fallback: rule-based prediction
      const isLow = product.bestPrice <= lowest * 1.02;
      const isHigh = product.bestPrice > avgPrice * 1.05;
      return NextResponse.json({
        recommendation: isLow ? "buy" : isHigh ? "wait" : "neutral",
        confidence: isLow ? 85 : isHigh ? 70 : 50,
        reasoning: isLow
          ? `Current price ₹${product.bestPrice.toLocaleString("en-IN")} is at its 8-week low. Good time to buy.`
          : isHigh
            ? `Current price is above the 8-week average of ₹${avgPrice.toLocaleString("en-IN")}. Consider waiting for a better deal.`
            : `Price is around the 8-week average. Reasonable to buy if needed.`,
        predictedDiscount: isHigh ? "5-10%" : "0-3%",
        bestTimeToBuy: isLow ? "Buy now" : isHigh ? "Wait 2-3 weeks" : "Anytime",
        tip: isLow ? "Price is at its lowest — buy now." : "Set a price alert and wait.",
      });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[api/price-prediction] error:", err);
    return NextResponse.json(
      { error: "Failed to generate prediction", detail: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
