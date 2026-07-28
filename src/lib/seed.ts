// Mock product catalog simulating cross-platform shopping connectors.
// This data represents what the Search Agent would retrieve from Amazon,
// Flipkart, Myntra, Croma, Reliance Digital, Nykaa, Ajio, Tata CLiQ, Meesho.

import { db } from "@/lib/db";

type PlatformPrice = {
  platform: string;
  price: number;
  mrp: number;
  discount: number;
  deliveryDays: number;
  inStock: boolean;
  seller: string;
  warranty?: string;
};

type SeedProduct = {
  name: string;
  brand: string;
  category: string;
  subcategory?: string;
  specs: Record<string, string | number>;
  basePrice: number;
  rating: number;
  reviewCount: number;
  imageColor: string;
  pros: string[];
  cons: string[];
  sentimentScore: number;
  tags: string[];
  platforms: PlatformPrice[];
};

const CATEGORIES = {
  LAPTOP: "laptop",
  PHONE: "phone",
  EARBUDS: "earbuds",
  TV: "tv",
  WATCH: "watch",
  CAMERA: "camera",
  APPLIANCE: "appliance",
  FASHION: "fashion",
  BEAUTY: "beauty",
  HOME: "home",
};

// Helper to build platform prices with slight variation
function prices(base: number, configs: Array<[string, number, number, number]>): PlatformPrice[] {
  // [platform, priceDeltaPct, deliveryDays, inStock(1|0)]
  return configs.map(([platform, deltaPct, deliveryDays, stock]) => {
    const price = Math.round((base * (1 + deltaPct / 100)) / 100) * 100;
    const mrp = Math.round((price * 1.15) / 100) * 100;
    return {
      platform,
      price,
      mrp,
      discount: Math.round(((mrp - price) / mrp) * 100),
      deliveryDays,
      inStock: stock === 1,
      seller: platform === "amazon" ? "Cloudtail India" : platform === "flipkart" ? "RetailNet" : "Verified Seller",
      warranty: "1 Year Warranty",
    };
  });
}

const PRODUCTS: SeedProduct[] = [
  // ── LAPTOPS ───────────────────────────────────────────────────────────────
  {
    name: "Lenovo IdeaPad Gaming 3",
    brand: "Lenovo",
    category: CATEGORIES.LAPTOP,
    subcategory: "gaming",
    specs: { processor: "AMD Ryzen 5 7535HS", ram: "16GB DDR5", storage: "512GB SSD", gpu: "RTX 3050 6GB", display: "15.6\" FHD 120Hz", battery: "45Wh", weight: "2.1 kg", os: "Windows 11" },
    basePrice: 68990,
    rating: 4.3,
    reviewCount: 4218,
    imageColor: "#10b981",
    pros: ["Excellent value for RTX 3050", "120Hz smooth display", "Good thermal management", "Solid build quality"],
    cons: ["Average battery life", "Fan gets loud under load", "No Thunderbolt 4"],
    sentimentScore: 0.78,
    tags: ["gaming", "ml", "student", "budget", "rtx"],
    platforms: prices(68990, [["amazon", 0, 2, 1], ["flipkart", -3, 3, 1], ["croma", 2, 4, 1], ["reliance", 1, 3, 1]]),
  },
  {
    name: "ASUS Vivobook 16X",
    brand: "ASUS",
    category: CATEGORIES.LAPTOP,
    subcategory: "creator",
    specs: { processor: "Intel Core i5-12500H", ram: "16GB DDR4", storage: "512GB SSD", gpu: "RTX 3050 4GB", display: "16\" WUXGA 144Hz", battery: "63Wh", weight: "1.8 kg", os: "Windows 11" },
    basePrice: 72990,
    rating: 4.2,
    reviewCount: 2103,
    imageColor: "#06b6d4",
    pros: ["Lightweight for a 16-inch", "144Hz panel is great", "Decent creator performance", "Backlit keyboard"],
    cons: ["Webcam is mediocre", "Speakers lack bass", "4GB VRAM limits heavy gaming"],
    sentimentScore: 0.71,
    tags: ["creator", "ml", "office", "portable"],
    platforms: prices(72990, [["amazon", -2, 2, 1], ["flipkart", 0, 3, 1], ["croma", -1, 4, 1]]),
  },
  {
    name: "MacBook Air M3",
    brand: "Apple",
    category: CATEGORIES.LAPTOP,
    subcategory: "ultrabook",
    specs: { processor: "Apple M3 8-core", ram: "8GB Unified", storage: "256GB SSD", gpu: "10-core GPU", display: "13.6\" Liquid Retina", battery: "52.6Wh", weight: "1.24 kg", os: "macOS" },
    basePrice: 99900,
    rating: 4.7,
    reviewCount: 8912,
    imageColor: "#a855f7",
    pros: ["Best-in-class battery life (18h)", "Silent fanless design", "Stunning Retina display", "Premium build"],
    cons: ["Expensive for 8GB RAM", "Limited ports (2 USB-C)", "No upgradeability"],
    sentimentScore: 0.91,
    tags: ["premium", "ultrabook", "creator", "office", "apple"],
    platforms: prices(99900, [["amazon", 0, 2, 1], ["flipkart", 1, 3, 1], ["croma", -1, 2, 1], ["reliance", 0, 4, 1]]),
  },
  {
    name: "HP Pavilion 14",
    brand: "HP",
    category: CATEGORIES.LAPTOP,
    subcategory: "business",
    specs: { processor: "Intel Core i5-1335U", ram: "16GB DDR4", storage: "512GB SSD", gpu: "Intel Iris Xe", display: "14\" FHD IPS", battery: "43Wh", weight: "1.41 kg", os: "Windows 11" },
    basePrice: 58990,
    rating: 4.1,
    reviewCount: 1893,
    imageColor: "#f59e0b",
    pros: ["Lightweight and portable", "Good keyboard", "Decent everyday performance", "Fast charging"],
    cons: ["Not for gaming", "Display could be brighter", "Average speakers"],
    sentimentScore: 0.65,
    tags: ["office", "business", "student", "portable"],
    platforms: prices(58990, [["amazon", -2, 2, 1], ["flipkart", 0, 3, 1], ["croma", 1, 4, 1]]),
  },
  {
    name: "Dell XPS 13 Plus",
    brand: "Dell",
    category: CATEGORIES.LAPTOP,
    subcategory: "ultrabook",
    specs: { processor: "Intel Core i7-1360P", ram: "16GB LPDDR5", storage: "512GB SSD", gpu: "Intel Iris Xe", display: "13.4\" OLED 3.5K", battery: "55Wh", weight: "1.24 kg", os: "Windows 11" },
    basePrice: 124990,
    rating: 4.4,
    reviewCount: 1456,
    imageColor: "#ec4899",
    pros: ["Gorgeous OLED display", "Compact premium chassis", "Excellent keyboard", "Strong performance"],
    cons: ["Expensive", "Few ports", "Runs warm under load"],
    sentimentScore: 0.82,
    tags: ["premium", "ultrabook", "creator", "office"],
    platforms: prices(124990, [["amazon", 0, 3, 1], ["flipkart", -1, 4, 1], ["croma", 1, 3, 1]]),
  },
  {
    name: "Acer Aspire 7",
    brand: "Acer",
    category: CATEGORIES.LAPTOP,
    subcategory: "budget-gaming",
    specs: { processor: "AMD Ryzen 5 5500U", ram: "8GB DDR4", storage: "512GB SSD", gpu: "GTX 1650 4GB", display: "15.6\" FHD", battery: "48Wh", weight: "1.9 kg", os: "Windows 11" },
    basePrice: 52990,
    rating: 4.0,
    reviewCount: 3201,
    imageColor: "#14b8a6",
    pros: ["Affordable gaming laptop", "Decent GTX 1650", "Upgradeable RAM", "Quiet fans"],
    cons: ["Only 8GB RAM out of box", "TN panel viewing angles", "Average battery"],
    sentimentScore: 0.62,
    tags: ["budget", "gaming", "student"],
    platforms: prices(52990, [["amazon", -3, 2, 1], ["flipkart", 0, 3, 1], ["croma", 2, 4, 0]]),
  },

  // ── PHONES ────────────────────────────────────────────────────────────────
  {
    name: "Samsung Galaxy S24 Ultra",
    brand: "Samsung",
    category: CATEGORIES.PHONE,
    subcategory: "flagship",
    specs: { display: "6.8\" QHD+ AMOLED 120Hz", processor: "Snapdragon 8 Gen 3", ram: "12GB", storage: "256GB", camera: "200MP+50MP+12MP+10MP", battery: "5000mAh", charging: "45W", os: "Android 14, 7yr updates" },
    basePrice: 129999,
    rating: 4.6,
    reviewCount: 12453,
    imageColor: "#6366f1",
    pros: ["Best-in-class camera with S-Pen", "Gorgeous bright display", "Excellent battery life", "7 years of updates"],
    cons: ["Very expensive", "Heavy and large", "Slow charging vs rivals"],
    sentimentScore: 0.88,
    tags: ["premium", "flagship", "camera", "android", "samsung"],
    platforms: prices(129999, [["amazon", -2, 2, 1], ["flipkart", -3, 2, 1], ["croma", 0, 3, 1], ["reliance", -1, 3, 1]]),
  },
  {
    name: "iPhone 15 Pro",
    brand: "Apple",
    category: CATEGORIES.PHONE,
    subcategory: "flagship",
    specs: { display: "6.1\" Super Retina XDR 120Hz", processor: "A17 Pro", ram: "8GB", storage: "128GB", camera: "48MP+12MP+12MP", battery: "3274mAh", charging: "20W", os: "iOS 17" },
    basePrice: 134900,
    rating: 4.7,
    reviewCount: 18234,
    imageColor: "#0ea5e9",
    pros: ["Industry-leading A17 Pro chip", "Premium titanium build", "Excellent cameras", "Long software support"],
    cons: ["Expensive", "Lightning replaced but USB-C is USB 2.0 speeds", "Battery could be bigger"],
    sentimentScore: 0.9,
    tags: ["premium", "flagship", "apple", "camera"],
    platforms: prices(134900, [["amazon", 0, 2, 1], ["flipkart", -2, 2, 1], ["croma", -1, 3, 1], ["reliance", 0, 4, 1]]),
  },
  {
    name: "OnePlus 12R",
    brand: "OnePlus",
    category: CATEGORIES.PHONE,
    subcategory: "value-flagship",
    specs: { display: "6.78\" LTPO AMOLED 120Hz", processor: "Snapdragon 8 Gen 2", ram: "8GB", storage: "128GB", camera: "50MP+8MP+2MP", battery: "5500mAh", charging: "100W", os: "OxygenOS 14" },
    basePrice: 39999,
    rating: 4.4,
    reviewCount: 8762,
    imageColor: "#ef4444",
    pros: ["Incredible 100W charging", "Excellent display", "Great performance for price", "Big battery"],
    cons: ["Average cameras", "No wireless charging", "Bloatware out of box"],
    sentimentScore: 0.79,
    tags: ["value", "gaming", "fast-charging", "android"],
    platforms: prices(39999, [["amazon", -2, 2, 1], ["flipkart", 0, 2, 1], ["croma", 1, 3, 1]]),
  },
  {
    name: "Pixel 8A",
    brand: "Google",
    category: CATEGORIES.PHONE,
    subcategory: "mid-range",
    specs: { display: "6.1\" OLED 120Hz", processor: "Tensor G3", ram: "8GB", storage: "128GB", camera: "64MP+13MP", battery: "4492mAh", charging: "18W", os: "Android 14, 7yr updates" },
    basePrice: 52999,
    rating: 4.3,
    reviewCount: 4123,
    imageColor: "#8b5cf6",
    pros: ["Best camera in mid-range", "Clean Android experience", "7 years of updates", "Compact size"],
    cons: ["Slow charging", "Tensor G3 runs warm", "Battery life is average"],
    sentimentScore: 0.74,
    tags: ["camera", "android", "google", "mid-range"],
    platforms: prices(52999, [["amazon", -3, 2, 1], ["flipkart", 0, 3, 1], ["croma", -1, 4, 1]]),
  },
  {
    name: "Redmi Note 13 Pro",
    brand: "Xiaomi",
    category: CATEGORIES.PHONE,
    subcategory: "budget",
    specs: { display: "6.67\" AMOLED 120Hz", processor: "Snapdragon 7s Gen 2", ram: "8GB", storage: "256GB", camera: "200MP+8MP+2MP", battery: "5100mAh", charging: "67W", os: "HyperOS" },
    basePrice: 24999,
    rating: 4.2,
    reviewCount: 15632,
    imageColor: "#f97316",
    pros: ["200MP camera is fun", "Great AMOLED display", "67W fast charging", "Excellent value"],
    cons: ["MIUI bloatware", "Average low-light camera", "Plastic build"],
    sentimentScore: 0.7,
    tags: ["budget", "value", "camera", "xiaomi"],
    platforms: prices(24999, [["amazon", -2, 2, 1], ["flipkart", 0, 2, 1], ["meesho", -4, 5, 1]]),
  },

  // ── EARBUDS ───────────────────────────────────────────────────────────────
  {
    name: "Sony WF-1000XM5",
    brand: "Sony",
    category: CATEGORIES.EARBUDS,
    subcategory: "premium",
    specs: { type: "True Wireless ANC", driver: "8.4mm", battery: "8h + 24h case", anc: "Industry-leading ANC", codec: "LDAC, AAC", waterproof: "IPX4", weight: "5.9g each" },
    basePrice: 24990,
    rating: 4.5,
    reviewCount: 3211,
    imageColor: "#000000",
    pros: ["Best-in-class noise cancellation", "Excellent sound quality", "Comfortable for long use", "LDAC support"],
    cons: ["Expensive", "Case is bulky", "No multipoint in some regions"],
    sentimentScore: 0.85,
    tags: ["premium", "anc", "audio", "sony"],
    platforms: prices(24990, [["amazon", -3, 2, 1], ["flipkart", 0, 3, 1], ["croma", -1, 4, 1]]),
  },
  {
    name: "Apple AirPods Pro 2",
    brand: "Apple",
    category: CATEGORIES.EARBUDS,
    subcategory: "premium",
    specs: { type: "True Wireless ANC", driver: "Custom Apple", battery: "6h + 30h case", anc: "Adaptive ANC 2x", codec: "AAC", waterproof: "IPX4", weight: "5.3g each" },
    basePrice: 24900,
    rating: 4.6,
    reviewCount: 14523,
    imageColor: "#1f2937",
    pros: ["Seamless Apple ecosystem", "Excellent ANC and transparency", "Great call quality", "Spatial Audio"],
    cons: ["Limited Android support", "Expensive", "Only AAC codec"],
    sentimentScore: 0.89,
    tags: ["premium", "anc", "apple", "audio"],
    platforms: prices(24900, [["amazon", 0, 2, 1], ["flipkart", -1, 2, 1], ["croma", -2, 3, 1], ["reliance", 0, 4, 1]]),
  },
  {
    name: "boAt Airdopes 161",
    brand: "boAt",
    category: CATEGORIES.EARBUDS,
    subcategory: "budget",
    specs: { type: "True Wireless", driver: "11mm", battery: "5.5h + 40h case", anc: "No ANC", codec: "SBC", waterproof: "IPX4", weight: "4.5g each" },
    basePrice: 1299,
    rating: 4.1,
    reviewCount: 89234,
    imageColor: "#dc2626",
    pros: ["Insane value for money", "Long battery life", "Bold bassy sound", "IPX4 sweat resistance"],
    cons: ["No ANC", "Call quality is average", "Plasticky build"],
    sentimentScore: 0.68,
    tags: ["budget", "value", "audio", "boat"],
    platforms: prices(1299, [["amazon", -5, 2, 1], ["flipkart", 0, 2, 1], ["meesho", -8, 5, 1]]),
  },
  {
    name: "OnePlus Buds 3",
    brand: "OnePlus",
    category: CATEGORIES.EARBUDS,
    subcategory: "mid-range",
    specs: { type: "True Wireless ANC", driver: "10.4mm + 6mm dual", battery: "10h + 33h case", anc: "Active ANC up to 49dB", codec: "LHDC 5.0, AAC", waterproof: "IP55", weight: "4.7g each" },
    basePrice: 5499,
    rating: 4.3,
    reviewCount: 6721,
    imageColor: "#0d9488",
    pros: ["Strong ANC for the price", "Dual driver sound", "Long battery", "Spatial audio effect"],
    cons: ["Bass-heavy default tuning", "Case feels cheap", "LHDC needs supported phone"],
    sentimentScore: 0.76,
    tags: ["mid-range", "anc", "audio", "value"],
    platforms: prices(5499, [["amazon", -2, 2, 1], ["flipkart", 0, 3, 1], ["croma", 1, 4, 1]]),
  },

  // ── TVS ───────────────────────────────────────────────────────────────────
  {
    name: "Samsung 55\" Crystal 4K UHD",
    brand: "Samsung",
    category: CATEGORIES.TV,
    subcategory: "4k-led",
    specs: { size: "55 inch", resolution: "4K UHD", panel: "Crystal LED", refreshRate: "60Hz", hdr: "HDR10+", os: "Tizen", ports: "3 HDMI, 2 USB" },
    basePrice: 41990,
    rating: 4.3,
    reviewCount: 5432,
    imageColor: "#1e3a8a",
    pros: ["Vibrant colors", "Tizen OS is smooth", "Slim design", "Good built-in apps"],
    cons: ["Only 60Hz", "No Dolby Vision", "Average sound"],
    sentimentScore: 0.75,
    tags: ["4k", "tv", "samsung", "home"],
    platforms: prices(41990, [["amazon", -2, 3, 1], ["flipkart", 0, 3, 1], ["croma", -1, 2, 1], ["reliance", -3, 4, 1]]),
  },
  {
    name: "LG 65\" OLED evo C4",
    brand: "LG",
    category: CATEGORIES.TV,
    subcategory: "oled",
    specs: { size: "65 inch", resolution: "4K UHD", panel: "OLED evo", refreshRate: "144Hz", hdr: "Dolby Vision IQ", os: "webOS 24", ports: "4 HDMI 2.1" },
    basePrice: 189990,
    rating: 4.8,
    reviewCount: 1234,
    imageColor: "#7c3aed",
    pros: ["Infinite contrast OLED", "144Hz for gaming", "Dolby Vision IQ", "Premium webOS"],
    cons: ["Very expensive", "Risk of burn-in", "Heavy"],
    sentimentScore: 0.93,
    tags: ["premium", "oled", "tv", "gaming", "lg"],
    platforms: prices(189990, [["amazon", 0, 3, 1], ["flipkart", -1, 4, 1], ["croma", -2, 3, 1], ["reliance", 0, 5, 1]]),
  },

  // ── WATCHES ───────────────────────────────────────────────────────────────
  {
    name: "Apple Watch Series 9",
    brand: "Apple",
    category: CATEGORIES.WATCH,
    subcategory: "smartwatch",
    specs: { display: "45mm Always-On Retina", battery: "18h typical", waterResistance: "50m", gps: "Dual-band GPS", sensors: "ECG, SpO2, Temp", os: "watchOS 10" },
    basePrice: 41900,
    rating: 4.6,
    reviewCount: 7821,
    imageColor: "#9333ea",
    pros: ["Best smartwatch for iPhone", "Accurate health sensors", "Bright always-on display", "Smooth watchOS"],
    cons: ["Only works with iPhone", "Battery life is one day", "Expensive"],
    sentimentScore: 0.87,
    tags: ["premium", "smartwatch", "apple", "fitness"],
    platforms: prices(41900, [["amazon", -1, 2, 1], ["flipkart", -2, 3, 1], ["croma", 0, 2, 1], ["reliance", 0, 4, 1]]),
  },
  {
    name: "Samsung Galaxy Watch 6",
    brand: "Samsung",
    category: CATEGORIES.WATCH,
    subcategory: "smartwatch",
    specs: { display: "44mm Super AMOLED", battery: "40h typical", waterResistance: "50m", gps: "GPS", sensors: "ECG, BIA, SpO2", os: "Wear OS 4" },
    basePrice: 29999,
    rating: 4.3,
    reviewCount: 3401,
    imageColor: "#0891b2",
    pros: ["Stunning AMOLED display", "Good battery life", "BIA body composition", "Works with Android"],
    cons: ["ECG only works with Samsung phones", "Limited third-party apps", "No physical rotating bezel"],
    sentimentScore: 0.78,
    tags: ["android", "smartwatch", "fitness", "samsung"],
    platforms: prices(29999, [["amazon", -2, 2, 1], ["flipkart", 0, 3, 1], ["croma", -1, 3, 1]]),
  },
  {
    name: "Fire-Boltt Phoenix Pro",
    brand: "Fire-Boltt",
    category: CATEGORIES.WATCH,
    subcategory: "budget-smartwatch",
    specs: { display: "1.39\" HD", battery: "7 days typical", waterResistance: "IP67", gps: "No", sensors: "HR, SpO2", os: "Proprietary" },
    basePrice: 1799,
    rating: 3.9,
    reviewCount: 42189,
    imageColor: "#16a34a",
    pros: ["Very affordable", "7-day battery", "Multiple watch faces", "Built-in games"],
    cons: ["Inaccurate HR sensor", "No GPS", "Plasticky feel"],
    sentimentScore: 0.55,
    tags: ["budget", "smartwatch", "fitness"],
    platforms: prices(1799, [["amazon", -5, 2, 1], ["flipkart", 0, 2, 1], ["meesho", -10, 5, 1]]),
  },

  // ── CAMERAS ───────────────────────────────────────────────────────────────
  {
    name: "Sony Alpha A7 IV",
    brand: "Sony",
    category: CATEGORIES.CAMERA,
    subcategory: "mirrorless",
    specs: { sensor: "33MP Full-frame CMOS", video: "4K 60p", lens: "Body only", iso: "100-51200", afpoints: "759 phase-detect", weight: "658g" },
    basePrice: 249990,
    rating: 4.7,
    reviewCount: 891,
    imageColor: "#1f2937",
    pros: ["Excellent 33MP sensor", "Best-in-class autofocus", "Great 4K video", "Solid ergonomics"],
    cons: ["Expensive", "No 8K video", "Large file sizes"],
    sentimentScore: 0.9,
    tags: ["premium", "camera", "creator", "sony"],
    platforms: prices(249990, [["amazon", 0, 4, 1], ["flipkart", -1, 4, 1], ["croma", -2, 3, 1]]),
  },

  // ── APPLIANCES ────────────────────────────────────────────────────────────
  {
    name: "LG 1.5T 5-Star Inverter AC",
    brand: "LG",
    category: CATEGORIES.APPLIANCE,
    subcategory: "air-conditioner",
    specs: { capacity: "1.5 Ton", starRating: "5 Star", type: "Split Inverter", refrigerant: "R32", noise: "31 dB", warranty: "10 yr compressor" },
    basePrice: 41990,
    rating: 4.4,
    reviewCount: 9821,
    imageColor: "#0d9488",
    pros: ["Energy efficient 5-star", "Very quiet operation", "Fast cooling", "10-year compressor warranty"],
    cons: ["Installation cost extra", "Heavy", "App is buggy"],
    sentimentScore: 0.81,
    tags: ["appliance", "home", "summer", "lg"],
    platforms: prices(41990, [["amazon", -2, 3, 1], ["flipkart", 0, 3, 1], ["croma", -1, 2, 1], ["reliance", -3, 4, 1]]),
  },
  {
    name: "IFB 7Kg Front Load Washing Machine",
    brand: "IFB",
    category: CATEGORIES.APPLIANCE,
    subcategory: "washing-machine",
    specs: { capacity: "7 Kg", type: "Front Load", programs: "15", energyRating: "5 Star", rpm: "1200", warranty: "4 yr + 10 yr motor" },
    basePrice: 32990,
    rating: 4.2,
    reviewCount: 4521,
    imageColor: "#475569",
    pros: ["15 wash programs", "Aqua Energie for hard water", "1200 RPM fast drying", "Good build quality"],
    cons: ["Vibrates at high RPM", "Installation can be slow", "Manual water inlet only"],
    sentimentScore: 0.72,
    tags: ["appliance", "home", "ifb"],
    platforms: prices(32990, [["amazon", -1, 3, 1], ["flipkart", 0, 4, 1], ["croma", -2, 3, 1]]),
  },

  // ── FASHION ───────────────────────────────────────────────────────────────
  {
    name: "Levi's 511 Slim Fit Jeans",
    brand: "Levi's",
    category: CATEGORIES.FASHION,
    subcategory: "jeans",
    specs: { fit: "Slim", material: "98% Cotton, 2% Elastane", wash: "Dark Indigo", sizes: "28-38", care: "Machine wash cold" },
    basePrice: 2999,
    rating: 4.4,
    reviewCount: 23451,
    imageColor: "#1e40af",
    pros: ["Classic slim fit", "Durable denim", "Stretchy comfort", "Timeless style"],
    cons: ["Sizing runs small", "Color fades after many washes", "Pricey at MRP"],
    sentimentScore: 0.8,
    tags: ["fashion", "denim", "levis"],
    platforms: prices(2999, [["amazon", -10, 2, 1], ["flipkart", -15, 2, 1], ["myntra", -20, 3, 1], ["ajio", -25, 3, 1]]),
  },
  {
    name: "Nike Dri-FIT T-Shirt",
    brand: "Nike",
    category: CATEGORIES.FASHION,
    subcategory: "tshirt",
    specs: { material: "100% Polyester Dri-FIT", fit: "Regular", sizes: "S-XXL", colors: "8 options", care: "Machine wash" },
    basePrice: 1295,
    rating: 4.5,
    reviewCount: 18923,
    imageColor: "#000000",
    pros: ["Wicks sweat well", "Lightweight", "Holds up after many washes", "Classic Nike look"],
    cons: ["Runs slightly large", "Static in winter", "Pricey for a tee"],
    sentimentScore: 0.83,
    tags: ["fashion", "sports", "nike", "activewear"],
    platforms: prices(1295, [["amazon", -10, 2, 1], ["flipkart", -5, 2, 1], ["myntra", -15, 3, 1], ["ajio", -20, 3, 1]]),
  },
  {
    name: "Allen Solly Formal Shirt",
    brand: "Allen Solly",
    category: CATEGORIES.FASHION,
    subcategory: "shirt",
    specs: { material: "Cotton Blend", fit: "Slim", sleeve: "Full", pattern: "Solid", sizes: "38-44", care: "Machine wash" },
    basePrice: 1999,
    rating: 4.2,
    reviewCount: 8762,
    imageColor: "#0ea5e9",
    pros: ["Smart office look", "Soft fabric", "Good stitching", "True to size"],
    cons: ["Needs ironing", "Color options limited", "Collar could be stiffer"],
    sentimentScore: 0.74,
    tags: ["fashion", "office", "formal"],
    platforms: prices(1999, [["amazon", -10, 2, 1], ["flipkart", -5, 3, 1], ["myntra", -15, 3, 1], ["ajio", -20, 2, 1]]),
  },

  // ── BEAUTY ────────────────────────────────────────────────────────────────
  {
    name: "Maybelline Fit Me Foundation",
    brand: "Maybelline",
    category: CATEGORIES.BEAUTY,
    subcategory: "makeup",
    specs: { shade: "Available in 12 shades", type: "Liquid", coverage: "Medium", finish: "Natural", spf: "SPF 15", volume: "30ml" },
    basePrice: 549,
    rating: 4.3,
    reviewCount: 67234,
    imageColor: "#ec4899",
    pros: ["Natural finish", "Good shade range", "Affordable", "SPF 15 bonus"],
    cons: ["May oxidize", "Not for very oily skin", "Tube is small"],
    sentimentScore: 0.76,
    tags: ["beauty", "makeup", "affordable"],
    platforms: prices(549, [["amazon", -5, 2, 1], ["flipkart", 0, 3, 1], ["nykaa", -10, 2, 1], ["meesho", -15, 5, 1]]),
  },
  {
    name: "The Ordinary Niacinamide 10% Serum",
    brand: "The Ordinary",
    category: CATEGORIES.BEAUTY,
    subcategory: "skincare",
    specs: { active: "Niacinamide 10% + Zinc 1%", volume: "30ml", skinType: "All", use: "AM/PM", fragrance: "Fragrance-free" },
    basePrice: 590,
    rating: 4.5,
    reviewCount: 45123,
    imageColor: "#f59e0b",
    pros: ["Reduces blemishes", "Affordable", "Lightweight", "Visible results in weeks"],
    cons: ["Can be drying", "Tingles initially", "Small bottle"],
    sentimentScore: 0.84,
    tags: ["beauty", "skincare", "affordable"],
    platforms: prices(590, [["amazon", -5, 2, 1], ["nykaa", 0, 2, 1], ["myntra", -10, 3, 1]]),
  },

  // ── HOME ──────────────────────────────────────────────────────────────────
  {
    name: "Philips Hue Smart Bulb",
    brand: "Philips",
    category: CATEGORIES.HOME,
    subcategory: "smart-home",
    specs: { type: "E27 Smart LED", brightness: "800 lumens", colors: "16M", ecosystem: "Hue Bridge", voiceControl: "Alexa, Google, Siri", wattage: "9W" },
    basePrice: 2999,
    rating: 4.4,
    reviewCount: 5612,
    imageColor: "#fbbf24",
    pros: ["Vibrant colors", "Rock-solid app", "Works with all voice assistants", "Long lifespan"],
    cons: ["Needs Hue Bridge", "Expensive per bulb", "Setup is involved"],
    sentimentScore: 0.79,
    tags: ["home", "smart-home", "philips"],
    platforms: prices(2999, [["amazon", -5, 2, 1], ["flipkart", 0, 3, 1], ["croma", -10, 3, 1]]),
  },
  {
    name: "Dyson V12 Detect Slim",
    brand: "Dyson",
    category: CATEGORIES.HOME,
    subcategory: "vacuum",
    specs: { type: "Cordless Stick", suction: "150 AW", runtime: "60 min", weight: "2.2 kg", dustbin: "0.35 L", filtration: "HEPA" },
    basePrice: 52900,
    rating: 4.5,
    reviewCount: 2103,
    imageColor: "#dc2626",
    pros: ["Powerful suction", "Laser dust detection", "Lightweight", "HEPA filtration"],
    cons: ["Very expensive", "Small dustbin", "Battery degrades over time"],
    sentimentScore: 0.82,
    tags: ["home", "premium", "dyson"],
    platforms: prices(52900, [["amazon", 0, 3, 1], ["flipkart", -2, 4, 1], ["croma", -1, 3, 1]]),
  },
];

// ────────────────────────────────────────────────────────────────────────────
// SEED FUNCTION
// ────────────────────────────────────────────────────────────────────────────

export async function seedCatalog() {
  const count = await db.product.count();
  if (count > 0) {
    return { skipped: true, count };
  }

  for (const p of PRODUCTS) {
    const product = await db.product.create({
      data: {
        name: p.name,
        brand: p.brand,
        category: p.category,
        subcategory: p.subcategory,
        specs: JSON.stringify(p.specs),
        basePrice: p.basePrice,
        rating: p.rating,
        reviewCount: p.reviewCount,
        imageColor: p.imageColor,
        pros: JSON.stringify(p.pros),
        cons: JSON.stringify(p.cons),
        sentimentScore: p.sentimentScore,
        tags: JSON.stringify(p.tags),
        platformPrices: {
          create: p.platforms,
        },
      },
    });

    // Generate mock price history (last 8 weeks, weekly snapshots)
    const now = new Date();
    for (const pp of p.platforms) {
      for (let week = 8; week >= 0; week--) {
        const date = new Date(now.getTime() - week * 7 * 24 * 60 * 60 * 1000);
        // simulate small fluctuations
        const variance = (Math.sin(week * 0.7) + Math.random() * 0.5 - 0.25) * 0.08;
        const histPrice = Math.round(pp.price * (1 + variance));
        await db.priceHistory.create({
          data: {
            productId: product.id,
            platform: pp.platform,
            price: histPrice,
            recordedAt: date,
          },
        });
      }
    }
  }

  return { seeded: PRODUCTS.length };
}

export const PRODUCT_CATALOG_SIZE = PRODUCTS.length;
