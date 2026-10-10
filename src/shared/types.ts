// Shared domain types for AI Shopping OS

export type PersonaCluster =
  | "budget-conscious"
  | "premium-buyer"
  | "student-shopper"
  | "fashion-enthusiast"
  | "family-shopper"
  | "tech-enthusiast";

export type Platform =
  | "amazon"
  | "flipkart"
  | "myntra"
  | "croma"
  | "reliance"
  | "nykaa"
  | "ajio"
  | "tatacliq"
  | "meesho";

export type MemoryType =
  | "short_term"
  | "long_term"
  | "episodic"
  | "semantic"
  | "session"
  | "working";

export type AgentName =
  | "intent"
  | "search"
  | "memory"
  | "digital_twin"
  | "recommendation"
  | "review"
  | "price"
  | "budget"
  | "explainability"
  | "cart"
  | "notification";

export interface ProductSpecs {
  [key: string]: string | number | boolean;
}

export interface ScoreBreakdown {
  preference: number;
  price: number;
  review: number;
  spec: number;
  twinCompat: number;
  memory: number;
  context: number;
  availability: number;
}

export interface DigitalTwin {
  shoppingStyle: string;
  budgetFlexibility: number; // 0-100
  brandLoyalty: number; // 0-100
  priceSensitivity: number; // 0-100
  purchaseConfidence: number; // 0-100
  technologyAdoption: number; // 0-100
  impulseBuyingScore: number; // 0-100
  discountPreference: number; // 0-100
  comparisonFrequency: number; // 0-100
  shoppingConsistency: number; // 0-100
  preferredCategories: string[];
  preferredBrands: string[];
  preferredPlatforms: Platform[];
  riskTolerance: "low" | "medium" | "high";
  lifestyle: string;
  budgetRange?: string;
  purchasePriorities?: string[];
  comparisonFrequencyLabel?: string;
  shoppingFrequency?: string;
  dealSeekingBehavior?: string;
}

export interface OnboardingData {
  categories: string[];
  budgetRange: string; // "low" | "mid" | "high" | "premium"
  budgetRangeLabel?: string;
  brands: string[];
  platforms: Platform[];
  shoppingFrequency: string; // "rarely" | "monthly" | "weekly" | "daily"
  discountImportance: number; // 1-5
  deliverySpeed: number; // 1-5
  techFamiliarity: number; // 1-5
  lifestyle: string;
  budgetStyle?: string;
  brandImportance?: number;
  technologyAdoption?: number;
  tryNewBrands?: string;
  purchasePriorities?: string[];
  shoppingStyle?: string;
  comparisonFrequency?: string;
  aiHelp?: string[];
  riskToleranceScore?: number;
  personalizationConsent?: "full" | "controlled" | "minimal";
  onboardingNotes?: string;
}

export interface ChatTurn {
  id: string;
  role: "user" | "assistant";
  content: string;
  metadata?: ChatMetadata;
  createdAt: string;
}

export interface ChatMetadata {
  intent?: string;
  complexity?: "simple" | "moderate" | "complex";
  agentsUsed?: AgentName[];
  ahdePlan?: AhdePlan;
  recommendations?: RecommendationResult[];
  traceId?: string;
  latencyMs?: number;
}

export interface AhdePlan {
  requiredAgents: AgentName[];
  skippedAgents: AgentName[];
  dataSources: { cached: string[]; live: string[] };
  parallel: boolean;
  modelTier: "fast" | "standard" | "deep";
  reason: string;
}

export interface RecommendationResult {
  productId: string;
  name: string;
  brand: string;
  category: string;
  imageColor: string;
  shoppingScore: number;
  bestPlatform: Platform;
  bestPrice: number;
  mrp: number;
  discount: number;
  rating: number;
  reviewCount: number;
  deliveryDays: number;
  scoreBreakdown: ScoreBreakdown;
  explanation: string;
  pros: string[];
  cons: string[];
  specs: ProductSpecs;
}

export interface IntentResult {
  intent: string;
  category?: string;
  productType?: string;
  attributes?: {
    color?: string;
    occasion?: string;
    [key: string]: string | undefined;
  };
  budget?: number;
  useCase?: string;
  brands?: string[];
  missing: string[];
  complexity: "simple" | "moderate" | "complex";
}

export const PLATFORM_LABELS: Record<Platform, string> = {
  amazon: "Amazon",
  flipkart: "Flipkart",
  myntra: "Myntra",
  croma: "Croma",
  reliance: "Reliance Digital",
  nykaa: "Nykaa",
  ajio: "Ajio",
  tatacliq: "Tata CLiQ",
  meesho: "Meesho",
};

export const PLATFORM_COLORS: Record<Platform, string> = {
  amazon: "#ff9900",
  flipkart: "#2874f0",
  myntra: "#ff3f6c",
  croma: "#12664f",
  reliance: "#0072ce",
  nykaa: "#fc2779",
  ajio: "#2e2e2e",
  tatacliq: "#1a237e",
  meesho: "#f43397",
};

export const PERSONA_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  "budget-conscious": { label: "Budget-Conscious Shopper", emoji: "🎯", color: "#4338ca" },
  "premium-buyer": { label: "Premium Buyer", emoji: "💎", color: "#a855f7" },
  "student-shopper": { label: "Student Shopper", emoji: "📚", color: "#f59e0b" },
  "fashion-enthusiast": { label: "Fashion Enthusiast", emoji: "👗", color: "#ec4899" },
  "family-shopper": { label: "Family Shopper", emoji: "🏠", color: "#06b6d4" },
  "tech-enthusiast": { label: "Tech Enthusiast", emoji: "⚙️", color: "#6366f1" },
};
