// Digital Persona Twin (DPT) clustering — solves Cold Start
// Maps onboarding responses to one of 6 behavioral clusters.
import type { OnboardingData, PersonaCluster, DigitalTwin } from "@/lib/types";

const CLUSTERS: Record<PersonaCluster, Partial<DigitalTwin>> = {
  "budget-conscious": {
    shoppingStyle: "Value-focused",
    budgetFlexibility: 25,
    brandLoyalty: 30,
    priceSensitivity: 90,
    purchaseConfidence: 50,
    technologyAdoption: 45,
    impulseBuyingScore: 20,
    discountPreference: 95,
    comparisonFrequency: 85,
    shoppingConsistency: 60,
    riskTolerance: "low",
  },
  "premium-buyer": {
    shoppingStyle: "Quality-first",
    budgetFlexibility: 85,
    brandLoyalty: 75,
    priceSensitivity: 20,
    purchaseConfidence: 80,
    technologyAdoption: 80,
    impulseBuyingScore: 40,
    discountPreference: 25,
    comparisonFrequency: 40,
    shoppingConsistency: 75,
    riskTolerance: "high",
  },
  "student-shopper": {
    shoppingStyle: "Research-heavy",
    budgetFlexibility: 35,
    brandLoyalty: 40,
    priceSensitivity: 85,
    purchaseConfidence: 45,
    technologyAdoption: 85,
    impulseBuyingScore: 35,
    discountPreference: 90,
    comparisonFrequency: 95,
    shoppingConsistency: 50,
    riskTolerance: "medium",
  },
  "fashion-enthusiast": {
    shoppingStyle: "Trend-oriented",
    budgetFlexibility: 60,
    brandLoyalty: 70,
    priceSensitivity: 50,
    purchaseConfidence: 70,
    technologyAdoption: 65,
    impulseBuyingScore: 70,
    discountPreference: 55,
    comparisonFrequency: 60,
    shoppingConsistency: 80,
    riskTolerance: "medium",
  },
  "family-shopper": {
    shoppingStyle: "Practical",
    budgetFlexibility: 50,
    brandLoyalty: 55,
    priceSensitivity: 70,
    purchaseConfidence: 65,
    technologyAdoption: 50,
    impulseBuyingScore: 25,
    discountPreference: 75,
    comparisonFrequency: 70,
    shoppingConsistency: 90,
    riskTolerance: "low",
  },
  "tech-enthusiast": {
    shoppingStyle: "Specs-driven",
    budgetFlexibility: 70,
    brandLoyalty: 50,
    priceSensitivity: 40,
    purchaseConfidence: 80,
    technologyAdoption: 98,
    impulseBuyingScore: 55,
    discountPreference: 50,
    comparisonFrequency: 80,
    shoppingConsistency: 70,
    riskTolerance: "high",
  },
};

/**
 * Assigns a persona cluster based on onboarding responses.
 * This is the DPT creation algorithm (K-means-like scoring against centroids).
 */
export function clusterPersona(data: OnboardingData): PersonaCluster {
  const scores: Record<PersonaCluster, number> = {
    "budget-conscious": 0,
    "premium-buyer": 0,
    "student-shopper": 0,
    "fashion-enthusiast": 0,
    "family-shopper": 0,
    "tech-enthusiast": 0,
  };

  // Budget range
  if (data.budgetRange === "low") {
    scores["budget-conscious"] += 3;
    scores["student-shopper"] += 2;
    scores["family-shopper"] += 1;
  } else if (data.budgetRange === "mid") {
    scores["student-shopper"] += 2;
    scores["family-shopper"] += 2;
    scores["fashion-enthusiast"] += 2;
  } else if (data.budgetRange === "high") {
    scores["fashion-enthusiast"] += 2;
    scores["tech-enthusiast"] += 3;
    scores["premium-buyer"] += 2;
  } else if (data.budgetRange === "premium") {
    scores["premium-buyer"] += 4;
    scores["tech-enthusiast"] += 2;
  }

  // Categories
  const cats = data.categories.map((c) => c.toLowerCase());
  if (cats.some((c) => ["laptop", "phone", "tv", "camera"].includes(c))) {
    scores["tech-enthusiast"] += 2;
    scores["student-shopper"] += 1;
  }
  if (cats.some((c) => ["fashion", "beauty"].includes(c))) {
    scores["fashion-enthusiast"] += 3;
  }
  if (cats.some((c) => ["appliance", "home"].includes(c))) {
    scores["family-shopper"] += 3;
  }

  // Discount importance
  if (data.discountImportance >= 4) {
    scores["budget-conscious"] += 3;
    scores["student-shopper"] += 2;
  } else if (data.discountImportance <= 2) {
    scores["premium-buyer"] += 3;
  }

  // Tech familiarity
  if (data.techFamiliarity >= 4) {
    scores["tech-enthusiast"] += 3;
    scores["student-shopper"] += 1;
  } else if (data.techFamiliarity <= 2) {
    scores["family-shopper"] += 2;
    scores["fashion-enthusiast"] += 1;
  }

  // Shopping frequency
  if (data.shoppingFrequency === "daily" || data.shoppingFrequency === "weekly") {
    scores["fashion-enthusiast"] += 2;
    scores["family-shopper"] += 1;
  } else if (data.shoppingFrequency === "rarely") {
    scores["premium-buyer"] += 1;
  }

  // Lifestyle
  const life = data.lifestyle.toLowerCase();
  if (life.includes("student") || life.includes("college")) {
    scores["student-shopper"] += 3;
  }
  if (life.includes("professional") || life.includes("work")) {
    scores["tech-enthusiast"] += 1;
    scores["premium-buyer"] += 1;
  }
  if (life.includes("family") || life.includes("parent") || life.includes("home")) {
    scores["family-shopper"] += 3;
  }
  if (life.includes("fashion") || life.includes("style")) {
    scores["fashion-enthusiast"] += 3;
  }

  // Pick the highest scoring cluster
  let best: PersonaCluster = "tech-enthusiast";
  let bestScore = -1;
  (Object.keys(scores) as PersonaCluster[]).forEach((k) => {
    if (scores[k] > bestScore) {
      bestScore = scores[k];
      best = k;
    }
  });
  return best;
}

/**
 * Builds the initial Digital Twin from the persona cluster + onboarding data.
 * This is the seed for the evolving DToC.
 */
export function buildInitialTwin(
  cluster: PersonaCluster,
  data: OnboardingData
): DigitalTwin {
  const base = CLUSTERS[cluster];
  return {
    shoppingStyle: base.shoppingStyle ?? "Balanced",
    budgetFlexibility: base.budgetFlexibility ?? 50,
    brandLoyalty: base.brandLoyalty ?? 50,
    priceSensitivity: base.priceSensitivity ?? 50,
    purchaseConfidence: base.purchaseConfidence ?? 50,
    technologyAdoption: base.technologyAdoption ?? 50,
    impulseBuyingScore: base.impulseBuyingScore ?? 30,
    discountPreference: base.discountPreference ?? 50,
    comparisonFrequency: base.comparisonFrequency ?? 50,
    shoppingConsistency: base.shoppingConsistency ?? 60,
    preferredCategories: data.categories,
    preferredBrands: data.brands,
    preferredPlatforms: data.platforms,
    riskTolerance: base.riskTolerance ?? "medium",
    lifestyle: data.lifestyle,
  };
}

/**
 * Evolves the Digital Twin based on a new behavioral signal.
 * Implements Memory Evolution + Decay.
 */
export function evolveTwin(
  current: DigitalTwin,
  signal: {
    type: "search" | "wishlist" | "purchase" | "comparison" | "feedback";
    category?: string;
    brand?: string;
    platform?: string;
    price?: number;
    budget?: number;
    liked?: boolean;
  }
): DigitalTwin {
  const next = { ...current };
  // Each signal nudges the twin by a small amount (evolution, not jump)
  const nudge = (val: number, delta: number, min = 0, max = 100) =>
    Math.max(min, Math.min(max, val + delta));

  if (signal.type === "purchase") {
    next.purchaseConfidence = nudge(next.purchaseConfidence, 3);
    next.shoppingConsistency = nudge(next.shoppingConsistency, 2);
    if (signal.brand) {
      next.brandLoyalty = nudge(next.brandLoyalty, 4);
      if (!next.preferredBrands.includes(signal.brand)) {
        next.preferredBrands = [...next.preferredBrands, signal.brand];
      }
    }
    if (signal.category && !next.preferredCategories.includes(signal.category)) {
      next.preferredCategories = [...next.preferredCategories, signal.category];
    }
  } else if (signal.type === "wishlist") {
    next.impulseBuyingScore = nudge(next.impulseBuyingScore, 1);
    next.comparisonFrequency = nudge(next.comparisonFrequency, 2);
  } else if (signal.type === "comparison") {
    next.comparisonFrequency = nudge(next.comparisonFrequency, 3);
    next.priceSensitivity = nudge(next.priceSensitivity, 1);
  } else if (signal.type === "search") {
    next.comparisonFrequency = nudge(next.comparisonFrequency, 1);
  } else if (signal.type === "feedback") {
    if (signal.liked === false) {
      next.purchaseConfidence = nudge(next.purchaseConfidence, -2);
    } else {
      next.purchaseConfidence = nudge(next.purchaseConfidence, 1);
    }
  }

  return next;
}
