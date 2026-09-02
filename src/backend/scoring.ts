// MARE — Memory-Augmented Recommendation Engine
// Combines: Product Features + User Memory + Digital Twin + Context + Reviews + Price
// into a unified Shopping Score (0-100) with explainable breakdown.

import type { DigitalTwin, ScoreBreakdown } from "@/lib/types";

export interface ProductLike {
  id: string;
  name: string;
  brand: string;
  category: string;
  subcategory?: string | null;
  specs: string; // JSON
  basePrice: number;
  rating: number;
  reviewCount: number;
  sentimentScore: number;
  tags?: string | null;
  pros?: string | null;
  cons?: string | null;
  platformPrices: Array<{
    platform: string;
    price: number;
    mrp: number;
    discount: number;
    deliveryDays: number;
    inStock: boolean;
  }>;
}

export interface MemoryLike {
  type: string;
  category: string;
  key: string;
  value: string;
  confidence: number;
  weight: number;
}

export interface ScoreContext {
  twin: DigitalTwin | null;
  memories: MemoryLike[];
  budget?: number;
  preferredCategories?: string[];
  preferredBrands?: string[];
  intent?: string;
}

/**
 * MARE scoring — computes a Shopping Score for a product.
 * Each sub-score is 0-100, then weighted into a final 0-100 score.
 *
 * Weights vary by category (per PRD §12.7): price matters more for groceries,
 * specs matter more for electronics.
 */
export function scoreProduct(
  product: ProductLike,
  ctx: ScoreContext
): { score: number; breakdown: ScoreBreakdown; bestPlatform: any; bestPrice: number; mrp: number } {
  // ── 1. Find best platform price (lowest in-stock)
  const inStock = product.platformPrices.filter((p) => p.inStock);
  const candidates = inStock.length > 0 ? inStock : product.platformPrices;
  if (candidates.length === 0) {
    // No platform prices available — use base price as fallback
    const bestPlatform = { platform: "amazon", price: product.basePrice, mrp: product.basePrice, discount: 0, deliveryDays: 3, inStock: true };
    return {
      score: 50,
      breakdown: { preference: 50, price: 50, review: 50, spec: 50, twinCompat: 50, memory: 50, context: 50, availability: 30 },
      bestPlatform,
      bestPrice: product.basePrice,
      mrp: product.basePrice,
    };
  }
  const bestPlatform = candidates.reduce(
    (best, p) => (p.price < best.price ? p : best),
    candidates[0]
  );
  const bestPrice = bestPlatform.price;
  const mrp = bestPlatform.mrp;

  // ── 2. PRICE SCORE (0-100) — how good is current price vs MRP + budget fit
  const discountPct = bestPlatform.discount;
  let priceScore = Math.min(100, 40 + discountPct * 2);
  if (ctx.budget) {
    const budgetFit = bestPrice <= ctx.budget ? 100 : Math.max(0, 100 - ((bestPrice - ctx.budget) / ctx.budget) * 100);
    priceScore = priceScore * 0.5 + budgetFit * 0.5;
  }

  // ── 3. REVIEW SCORE (0-100) — rating + sentiment + review volume
  const ratingScore = (product.rating / 5) * 100;
  const sentimentScore = ((product.sentimentScore + 1) / 2) * 100; // map -1..1 to 0..100
  const volumeScore = Math.min(100, (product.reviewCount / 5000) * 100);
  const reviewScore = ratingScore * 0.5 + sentimentScore * 0.3 + volumeScore * 0.2;

  // ── 4. SPEC SCORE (0-100) — base on tags/review quality + recency proxy
  let specScore = 70; // baseline
  if (product.tags) {
    try {
      const tags = JSON.parse(product.tags) as string[];
      // bonus for premium tags
      if (tags.includes("premium")) specScore += 15;
      if (tags.includes("gaming") || tags.includes("ml")) specScore += 5;
      if (tags.includes("flagship")) specScore += 10;
      specScore = Math.min(100, specScore);
    } catch {}
  }

  // ── 5. PREFERENCE SCORE (0-100) — matches user's preferred brands/categories?
  let preferenceScore = 50;
  if (ctx.preferredBrands?.length) {
    if (ctx.preferredBrands.some((b) => b.toLowerCase() === product.brand.toLowerCase())) {
      preferenceScore = 90;
    }
  }
  if (ctx.preferredCategories?.length) {
    if (ctx.preferredCategories.some((c) => c.toLowerCase() === product.category.toLowerCase())) {
      preferenceScore = Math.min(100, preferenceScore + 15);
    }
  }
  // boost if memory has matching brand preference
  const brandMemories = ctx.memories.filter(
    (m) => m.category === "brand" && m.value.toLowerCase() === product.brand.toLowerCase()
  );
  if (brandMemories.length > 0) {
    const totalConf = brandMemories.reduce((s, m) => s + m.confidence * m.weight, 0);
    preferenceScore = Math.min(100, preferenceScore + Math.min(20, totalConf / 5));
  }

  // ── 6. TWIN COMPATIBILITY (0-100) — does product match user's behavioral profile?
  let twinCompat = 60;
  if (ctx.twin) {
    const t = ctx.twin;
    // Price sensitivity: high sensitivity → low price = better fit
    if (bestPrice < product.basePrice * 0.9 && t.priceSensitivity > 60) {
      twinCompat += 10;
    }
    if (bestPrice > product.basePrice * 1.1 && t.priceSensitivity > 60) {
      twinCompat -= 15;
    }
    // Tech adoption → spec-heavy products
    if (t.technologyAdoption > 70 && specScore > 75) {
      twinCompat += 10;
    }
    // Brand loyalty
    if (t.brandLoyalty > 60 && t.preferredBrands.includes(product.brand)) {
      twinCompat += 12;
    }
    // Discount preference
    if (t.discountPreference > 60 && discountPct > 10) {
      twinCompat += 8;
    }
    // Budget flexibility
    if (ctx.budget && bestPrice > ctx.budget) {
      if (t.budgetFlexibility > 60) twinCompat += 5;
      else twinCompat -= 10;
    }
    twinCompat = Math.max(0, Math.min(100, twinCompat));
  }

  // ── 7. MEMORY MATCH (0-100) — explicit memory signals about this product/brand
  let memoryScore = 50;
  const productMemories = ctx.memories.filter(
    (m) =>
      m.value.toLowerCase().includes(product.name.toLowerCase()) ||
      m.value.toLowerCase().includes(product.brand.toLowerCase()) ||
      m.key.toLowerCase().includes(product.brand.toLowerCase())
  );
  if (productMemories.length > 0) {
    const totalConf = productMemories.reduce((s, m) => s + m.confidence, 0);
    memoryScore = Math.min(100, 50 + totalConf / 2);
  }

  // ── 8. CONTEXT SCORE (0-100) — urgency, season, intent fit
  let contextScore = 60;
  if (ctx.intent) {
    const intent = ctx.intent.toLowerCase();
    if (intent.includes("gaming") && product.tags?.includes("gaming")) contextScore += 20;
    if (intent.includes("ml") && product.tags?.includes("ml")) contextScore += 20;
    if (intent.includes("camera") && product.category === "camera") contextScore += 25;
    if (intent.includes("office") && product.tags?.includes("office")) contextScore += 15;
    if (intent.includes("premium") && product.tags?.includes("premium")) contextScore += 15;
    if (intent.includes("student") && product.tags?.includes("student")) contextScore += 15;
    if (intent.includes("budget") && product.tags?.includes("budget")) contextScore += 20;
    contextScore = Math.min(100, contextScore);
  }

  // ── 9. AVAILABILITY SCORE
  const availabilityScore = bestPlatform.inStock ? 100 : 30;

  // ── 10. WEIGHTED FUSION (varies by category)
  const weights = getWeights(product.category);

  const breakdown: ScoreBreakdown = {
    preference: Math.round(preferenceScore),
    price: Math.round(priceScore),
    review: Math.round(reviewScore),
    spec: Math.round(specScore),
    twinCompat: Math.round(twinCompat),
    memory: Math.round(memoryScore),
    context: Math.round(contextScore),
    availability: Math.round(availabilityScore),
  };

  const score = Math.round(
    preferenceScore * weights.preference +
      priceScore * weights.price +
      reviewScore * weights.review +
      specScore * weights.spec +
      twinCompat * weights.twinCompat +
      memoryScore * weights.memory +
      contextScore * weights.context +
      availabilityScore * weights.availability
  );

  return { score: Math.min(100, score), breakdown, bestPlatform, bestPrice, mrp };
}

function getWeights(category: string): ScoreBreakdown {
  // Default weights sum to 1.0
  const defaults: ScoreBreakdown = {
    preference: 0.15,
    price: 0.18,
    review: 0.15,
    spec: 0.12,
    twinCompat: 0.13,
    memory: 0.1,
    context: 0.07,
    availability: 0.1,
  };

  // Electronics → specs matter more
  if (["laptop", "phone", "tv", "camera", "earbuds", "watch"].includes(category)) {
    return { ...defaults, spec: 0.18, price: 0.15, preference: 0.13 };
  }
  // Beauty/fashion → review & preference matter more
  if (["fashion", "beauty"].includes(category)) {
    return { ...defaults, review: 0.2, preference: 0.18, spec: 0.08 };
  }
  // Appliances → price matters more
  if (["appliance", "home"].includes(category)) {
    return { ...defaults, price: 0.22, review: 0.16, spec: 0.1 };
  }
  return defaults;
}

/**
 * Generate a human-readable explanation for a recommendation.
 * Used by the Explainability Agent.
 */
export function buildExplanation(
  product: ProductLike,
  score: number,
  breakdown: ScoreBreakdown,
  ctx: ScoreContext,
  bestPlatform: any
): string {
  const reasons: string[] = [];

  if (breakdown.price >= 80) {
    reasons.push(`Great value — currently ${bestPlatform.discount}% off MRP on ${bestPlatform.platform}`);
  } else if (ctx.budget && bestPlatform.price <= ctx.budget) {
    reasons.push(`Fits your ₹${ctx.budget.toLocaleString("en-IN")} budget`);
  }

  if (breakdown.review >= 85) {
    reasons.push(`Highly rated (${product.rating}★ from ${product.reviewCount.toLocaleString("en-IN")} reviews)`);
  }

  if (breakdown.preference >= 85) {
    reasons.push(`Matches your preferred brand (${product.brand})`);
  }

  if (breakdown.twinCompat >= 80 && ctx.twin) {
    if (ctx.twin.technologyAdoption > 70) {
      reasons.push(`Aligns with your tech-savvy profile`);
    }
    if (ctx.twin.priceSensitivity > 60 && bestPlatform.discount > 10) {
      reasons.push(`Strong discount appeals to your price-sensitive style`);
    }
  }

  if (breakdown.memory >= 70) {
    reasons.push(`You've shown interest in ${product.brand} before`);
  }

  if (breakdown.context >= 80 && ctx.intent) {
    reasons.push(`Tailored to your "${ctx.intent}" intent`);
  }

  if (breakdown.availability >= 100) {
    reasons.push(`In stock — delivery in ${bestPlatform.deliveryDays} days`);
  }

  if (reasons.length === 0) {
    reasons.push(`Solid all-round pick with a Shopping Score of ${score}/100`);
  }

  return reasons.join(" • ");
}
