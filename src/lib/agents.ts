// AI Shopping OS — Multi-Agent System
// Agents: Intent, Search, Memory, DigitalTwin, Recommendation, Review, Price,
//         Budget, Explainability, Cart, Notification
// AHDE: Adaptive Hybrid Decision Engine — decides which agents to run.
// Orchestrator: Coordinates execution.

import { db } from "@/lib/db";
import { llmJson, llmChat } from "@/lib/llm";
import { scoreProduct, buildExplanation } from "@/lib/scoring";
import { evolveTwin, buildInitialTwin } from "@/lib/persona";
import type {
  AgentName,
  AhdePlan,
  IntentResult,
  RecommendationResult,
  DigitalTwin,
  Platform,
} from "@/lib/types";
import type { ProductLike, MemoryLike } from "@/lib/scoring";

// ────────────────────────────────────────────────────────────────────────────
// 1. INTENT DETECTION AGENT
// ────────────────────────────────────────────────────────────────────────────

export async function intentAgent(message: string): Promise<IntentResult> {
  const system = `You are the Intent Detection Agent of AI Shopping OS.
Analyze the user's shopping message and return a STRICT JSON object with fields:
{
  "intent": "<recommendation | comparison | price_tracking | search | cart | budget | general | greeting>",
  "category": "<laptop | phone | earbuds | tv | watch | camera | appliance | fashion | beauty | home | null>",
  "budget": <number or null, in INR>,
  "useCase": "<short string describing use case, or null>",
  "brands": ["<brand names mentioned, lowercase>"],
  "missing": ["<what info is missing to make a good recommendation>"],
  "complexity": "<simple | moderate | complex>"
}
Rules:
- "simple" = single factual question (price, rating)
- "moderate" = comparison or simple search
- "complex" = recommendation with multiple constraints
Return ONLY the JSON. No prose.`;

  const result = await llmJson<IntentResult>(system, message, { temperature: 0.2 });
  if (!result) {
    // Fallback heuristic intent detection
    const lower = message.toLowerCase();
    let intent = "general";
    if (/hi|hello|hey/.test(lower)) intent = "greeting";
    else if (/price|cost|how much/.test(lower)) intent = "price_tracking";
    else if (/compare/.test(lower)) intent = "comparison";
    else if (/recommend|suggest|best/.test(lower)) intent = "recommendation";
    return {
      intent,
      complexity: "simple",
      missing: [],
    };
  }
  return result;
}

// ────────────────────────────────────────────────────────────────────────────
// 2. AHDE — ADAPTIVE HYBRID DECISION ENGINE
// ────────────────────────────────────────────────────────────────────────────

export function ahde(
  intent: IntentResult,
  twinConfidence: number,
  hasMemory: boolean
): AhdePlan {
  const required: AgentName[] = [];
  const skipped: AgentName[] = [];
  let modelTier: "fast" | "standard" | "deep" = "standard";
  let parallel = true;

  switch (intent.intent) {
    case "recommendation":
      required.push("search", "memory", "digital_twin", "recommendation", "review", "price", "budget", "explainability");
      modelTier = intent.complexity === "complex" ? "deep" : "standard";
      break;
    case "comparison":
      required.push("search", "review", "price", "recommendation", "explainability");
      skipped.push("budget");
      break;
    case "price_tracking":
      required.push("search", "price", "memory");
      modelTier = "fast";
      break;
    case "search":
      required.push("search", "recommendation");
      modelTier = "fast";
      break;
    case "cart":
      required.push("cart", "memory");
      modelTier = "fast";
      parallel = false;
      break;
    case "budget":
      required.push("budget", "memory", "digital_twin");
      modelTier = "fast";
      break;
    case "greeting":
      required.push("memory");
      modelTier = "fast";
      break;
    default:
      required.push("search", "memory", "recommendation", "explainability");
  }

  // Skip memory/digital_twin if user disabled them or new user
  if (!hasMemory && required.includes("memory")) {
    required.splice(required.indexOf("memory"), 1);
    skipped.push("memory");
  }
  if (twinConfidence < 10 && required.includes("digital_twin")) {
    // Still run digital_twin but mark as cold-start
  }

  // Default skipped = all - required
  const allAgents: AgentName[] = [
    "intent", "search", "memory", "digital_twin", "recommendation",
    "review", "price", "budget", "explainability", "cart", "notification",
  ];
  allAgents.forEach((a) => {
    if (a !== "intent" && !required.includes(a) && !skipped.includes(a)) {
      skipped.push(a);
    }
  });

  const dataSources = {
    cached: ["product_specs", "review_summaries", "rating"],
    live: intent.intent === "price_tracking" || intent.intent === "comparison"
      ? ["current_price", "stock_status"]
      : ["current_price"],
  };

  const reason = `Intent "${intent.intent}" (${intent.complexity}) → activated ${required.length} agents, skipped ${skipped.length}. Twin confidence ${twinConfidence}%. Model tier: ${modelTier}.`;

  return { requiredAgents: required, skippedAgents: skipped, dataSources, parallel, modelTier, reason };
}

// ────────────────────────────────────────────────────────────────────────────
// 3. SEARCH AGENT — queries the product catalog (mock platform connectors)
// ────────────────────────────────────────────────────────────────────────────

export async function searchAgent(
  intent: IntentResult,
  limit = 12
): Promise<ProductLike[]> {
  const where: any = {};

  if (intent.category) {
    where.category = intent.category;
  }

  let products: any[];

  // If no specific category, do a tag/brand/text search
  if (!intent.category) {
    const all = await db.product.findMany({
      include: { platformPrices: true },
    });
    const query = (intent.useCase || intent.brands?.join(" ") || "").toLowerCase();
    if (!query) {
      products = all.slice(0, limit);
    } else {
      products = all
        .filter((p) => {
          const tags = p.tags ? (JSON.parse(p.tags) as string[]) : [];
          const tagMatch = tags.some((t) => query.includes(t));
          const brandMatch = intent.brands?.some((b) => p.brand.toLowerCase() === b);
          const nameMatch = p.name.toLowerCase().includes(query);
          return tagMatch || brandMatch || nameMatch;
        })
        .slice(0, limit);
    }
  } else {
    products = await db.product.findMany({
      where,
      include: { platformPrices: true },
      take: limit,
    });
  }

  return products as unknown as ProductLike[];
}

// ────────────────────────────────────────────────────────────────────────────
// 4. MEMORY AGENT — retrieve & update long-term/semantic memory
// ────────────────────────────────────────────────────────────────────────────

export async function memoryAgent(userId: string, intent: IntentResult): Promise<MemoryLike[]> {
  const memories = await db.memory.findMany({
    where: { userId, type: { in: ["long_term", "semantic", "episodic"] } },
    orderBy: { confidence: "desc" },
    take: 30,
  });
  return memories as unknown as MemoryLike[];
}

export async function updateMemoryFromInteraction(
  userId: string,
  message: string,
  intent: IntentResult
) {
  // Extract preference signals from the message via LLM
  const system = `You are the Memory Agent of AI Shopping OS. From the user's shopping message, extract durable preferences worth remembering.
Return STRICT JSON array of memories, each:
{ "category": "<brand|budget|category|platform|preference|use_case|habit>", "key": "<snake_case_key>", "value": "<string>", "confidence": <0-100>, "type": "<long_term|semantic|session>" }
Only extract SIGNALS that improve future recommendations. Ignore greetings and small talk. If nothing useful, return [].
Return ONLY the JSON array.`;

  const extracted = await llmJson<any[]>(system, message, { temperature: 0.2 });
  if (!extracted || !Array.isArray(extracted)) return;

  for (const m of extracted.slice(0, 5)) {
    // Check if memory with same key exists → bump confidence
    const existing = await db.memory.findFirst({
      where: { userId, key: m.key, category: m.category },
    });
    if (existing) {
      await db.memory.update({
        where: { id: existing.id },
        data: {
          confidence: Math.min(100, existing.confidence + 15),
          value: m.value,
          weight: Math.min(1.5, existing.weight + 0.1),
          updatedAt: new Date(),
        },
      });
    } else {
      await db.memory.create({
        data: {
          userId,
          type: m.type || "long_term",
          category: m.category,
          key: m.key,
          value: m.value,
          confidence: m.confidence || 50,
          weight: 1.0,
          source: "inferred",
        },
      });
    }
  }

  // If intent has budget, store/update budget memory
  if (intent.budget) {
    const existing = await db.memory.findFirst({
      where: { userId, key: "budget_range" },
    });
    if (existing) {
      await db.memory.update({
        where: { id: existing.id },
        data: { value: String(intent.budget), confidence: 80, updatedAt: new Date() },
      });
    } else {
      await db.memory.create({
        data: {
          userId,
          type: "long_term",
          category: "budget",
          key: "budget_range",
          value: String(intent.budget),
          confidence: 70,
          source: "inferred",
        },
      });
    }
  }
}

// ────────────────────────────────────────────────────────────────────────────
// 5. DIGITAL TWIN AGENT — load + evolve behavioral model
// ────────────────────────────────────────────────────────────────────────────

export async function digitalTwinAgent(userId: string): Promise<DigitalTwin | null> {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || !user.digitalTwin) return null;
  try {
    return JSON.parse(user.digitalTwin) as DigitalTwin;
  } catch {
    return null;
  }
}

export async function evolveTwinFromInteraction(
  userId: string,
  intent: IntentResult,
  twin: DigitalTwin | null
) {
  if (!twin) return;
  const signal: any = { type: "search" };
  if (intent.intent === "recommendation") signal.type = "comparison";
  if (intent.category) signal.category = intent.category;
  if (intent.brands?.length) signal.brand = intent.brands[0];
  if (intent.budget) signal.budget = intent.budget;

  const evolved = evolveTwin(twin, signal);
  // Bump confidence slightly per interaction
  const user = await db.user.findUnique({ where: { id: userId } });
  const newConfidence = Math.min(100, (user?.twinConfidence || 0) + 1);
  await db.user.update({
    where: { id: userId },
    data: {
      digitalTwin: JSON.stringify(evolved),
      twinConfidence: newConfidence,
    },
  });
}

// ────────────────────────────────────────────────────────────────────────────
// 6. RECOMMENDATION AGENT (MARE) — rank products with Shopping Score
// ────────────────────────────────────────────────────────────────────────────

export async function recommendationAgent(
  products: ProductLike[],
  memories: MemoryLike[],
  twin: DigitalTwin | null,
  intent: IntentResult,
  limit = 6
): Promise<RecommendationResult[]> {
  const budget = memories.find((m) => m.key === "budget_range")?.value;
  const ctx = {
    twin,
    memories,
    budget: intent.budget || (budget ? parseInt(budget, 10) : undefined),
    preferredCategories: twin?.preferredCategories,
    preferredBrands: twin?.preferredBrands,
    intent: `${intent.intent}${intent.useCase ? ": " + intent.useCase : ""}`,
  };

  const scored = products.map((p) => {
    const { score, breakdown, bestPlatform, bestPrice, mrp } = scoreProduct(p, ctx);
    const explanation = buildExplanation(p, score, breakdown, ctx, bestPlatform);
    const pros = p.pros ? (JSON.parse(p.pros) as string[]) : [];
    const cons = p.cons ? (JSON.parse(p.cons) as string[]) : [];
    const specs = p.specs ? JSON.parse(p.specs) : {};
    return {
      productId: p.id,
      name: p.name,
      brand: p.brand,
      category: p.category,
      imageColor: (p as any).imageColor || "#10b981",
      shoppingScore: score,
      bestPlatform: bestPlatform.platform as Platform,
      bestPrice,
      mrp,
      discount: bestPlatform.discount,
      rating: p.rating,
      reviewCount: p.reviewCount,
      deliveryDays: bestPlatform.deliveryDays,
      scoreBreakdown: breakdown,
      explanation,
      pros,
      cons,
      specs,
    } as RecommendationResult;
  });

  // Sort by shopping score descending, take top N
  return scored.sort((a, b) => b.shoppingScore - a.shoppingScore).slice(0, limit);
}

// ────────────────────────────────────────────────────────────────────────────
// 7. REVIEW ANALYSIS AGENT — summarize pros/cons/sentiment
// ────────────────────────────────────────────────────────────────────────────

export async function reviewAgent(productName: string, storedPros: string[], storedCons: string[]): Promise<string> {
  const system = `You are the Review Analysis Agent of AI Shopping OS.
Generate a concise (2-3 sentence) review summary for the product "${productName}".
Known pros: ${storedPros.join(", ")}
Known cons: ${storedCons.join(", ")}
Be balanced and helpful. Do not invent specs. Output prose only, no markdown.`;
  return llmChat(system, `Summarize reviews for ${productName}.`, { temperature: 0.4 });
}

// ────────────────────────────────────────────────────────────────────────────
// 8. PRICE INTELLIGENCE AGENT — historical trend + buy timing advice
// ────────────────────────────────────────────────────────────────────────────

export async function priceAgent(productId: string, currentPrice: number) {
  const history = await db.priceHistory.findMany({
    where: { productId },
    orderBy: { recordedAt: "asc" },
  });
  if (history.length === 0) {
    return { trend: "stable" as const, advice: "Limited price history available.", avgPrice: currentPrice, lowest: currentPrice, highest: currentPrice };
  }
  const prices = history.map((h) => h.price);
  const avg = Math.round(prices.reduce((s, p) => s + p, 0) / prices.length);
  const lowest = Math.min(...prices);
  const highest = Math.max(...prices);

  let trend: "rising" | "falling" | "stable" = "stable";
  const recent = prices.slice(-3);
  if (recent[recent.length - 1] > recent[0] * 1.02) trend = "rising";
  else if (recent[recent.length - 1] < recent[0] * 0.98) trend = "falling";

  let advice = "";
  if (currentPrice <= lowest * 1.02) {
    advice = `Excellent time to buy — currently at or near its 8-week low of ₹${lowest.toLocaleString("en-IN")}.`;
  } else if (currentPrice < avg) {
    advice = `Good time to buy — current price is below the 8-week average of ₹${avg.toLocaleString("en-IN")}.`;
  } else if (currentPrice > avg * 1.05) {
    advice = `Consider waiting — current price is above the 8-week average of ₹${avg.toLocaleString("en-IN")}.`;
  } else {
    advice = `Price is around the 8-week average (₹${avg.toLocaleString("en-IN")}). Reasonable to buy if needed.`;
  }

  return { trend, advice, avgPrice: avg, lowest, highest };
}

// ────────────────────────────────────────────────────────────────────────────
// 9. BUDGET AGENT — checks budget constraints
// ────────────────────────────────────────────────────────────────────────────

export async function budgetAgent(intent: IntentResult, memories: MemoryLike[]): Promise<{ budget: number | null; advice: string }> {
  const memBudget = memories.find((m) => m.key === "budget_range");
  const budget = intent.budget || (memBudget ? parseInt(memBudget.value, 10) : null);
  if (!budget) {
    return { budget: null, advice: "No budget specified. Tell me your budget for tighter recommendations." };
  }
  return {
    budget,
    advice: `Filtering recommendations to your ₹${budget.toLocaleString("en-IN")} budget.`,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// 10. EXPLAINABILITY AGENT — natural language wrapper for the whole response
// ────────────────────────────────────────────────────────────────────────────

export async function explainabilityAgent(
  intent: IntentResult,
  recs: RecommendationResult[],
  plan: AhdePlan,
  twin: DigitalTwin | null
): Promise<string> {
  const system = `You are the Explainability Agent of AI Shopping OS — a Memory-Augmented Multi-Agent Shopping Intelligence Platform.
Generate a concise, friendly shopping-assistant response based on the recommendation results.
Rules:
- Start with a 1-2 sentence summary of what you understood from the user.
- Mention the Shopping Score of the top pick and a brief reason.
- Mention how many products were compared across how many platforms.
- Keep the response under 120 words. Use natural prose, no markdown headings, no emojis.
- Reference the user's Digital Twin if relevant (e.g., "matches your tech-savvy profile").
- Reference agents used implicitly (e.g., "compared prices, read reviews, and checked your memory").`;

  const top = recs[0];
  const userPayload = `User intent: ${JSON.stringify(intent)}
Twin confidence: ${twin ? "high" : "low"}
Agents used: ${plan.requiredAgents.join(", ")}
Top recommendation: ${top?.name} (${top?.brand}) — Shopping Score ${top?.shoppingScore}/100
Reason: ${top?.explanation}
Total products compared: ${recs.length}
Platforms compared: ${[...new Set(recs.map((r) => r.bestPlatform))].join(", ")}`;

  const reply = await llmChat(system, userPayload, { temperature: 0.6 });
  return reply || `Based on your request, I compared ${recs.length} products across multiple platforms. My top pick is the ${top?.name} with a Shopping Score of ${top?.shoppingScore}/100 — ${top?.explanation}.`;
}

// ────────────────────────────────────────────────────────────────────────────
// 11. CART AGENT — placeholder for cart operations (always requires user confirmation)
// ────────────────────────────────────────────────────────────────────────────

export async function cartAgent(message: string): Promise<string> {
  return `I can help add this to your cart, but per our principles I never complete purchases automatically. You can click "Add to Cart" on the product card and finish checkout on the original platform. Which platform would you like to use?`;
}

// ────────────────────────────────────────────────────────────────────────────
// 12. NOTIFICATION AGENT — generate price drop / sale notifications
// ────────────────────────────────────────────────────────────────────────────

export async function generateNotificationsForUser(userId: string) {
  // Check wishlist items for price drops vs targetPrice or current best
  const wishlist = await db.wishlistItem.findMany({
    where: { userId },
    include: { product: { include: { platformPrices: true } } },
  });
  const created: any[] = [];
  for (const item of wishlist) {
    const best = item.product.platformPrices
      .filter((p) => p.inStock)
      .reduce((min, p) => (p.price < min.price ? p : min), item.product.platformPrices[0]);
    if (item.targetPrice && best.price <= item.targetPrice) {
      // Check we haven't already notified recently
      const existing = await db.notification.findFirst({
        where: {
          userId,
          productId: item.productId,
          type: "price_drop",
          createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      });
      if (!existing) {
        const n = await db.notification.create({
          data: {
            userId,
            type: "price_drop",
            title: `Price drop: ${item.product.name}`,
            message: `Now ₹${best.price.toLocaleString("en-IN")} on ${best.platform} — hit your target of ₹${item.targetPrice.toLocaleString("en-IN")}!`,
            productId: item.productId,
          },
        });
        created.push(n);
      }
    }
  }
  return created;
}
