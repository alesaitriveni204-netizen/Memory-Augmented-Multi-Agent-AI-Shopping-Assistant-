const { PrismaClient } = require('@prisma/client');

const db = new PrismaClient();

const products = [
  {
    name: 'Lenovo IdeaPad Gaming 3',
    brand: 'Lenovo',
    category: 'laptop',
    subcategory: 'gaming',
    specs: {
      processor: 'AMD Ryzen 5 7535HS',
      ram: '16GB DDR5',
      storage: '512GB SSD',
      gpu: 'RTX 3050 6GB',
      display: '15.6" FHD 120Hz',
      battery: '45Wh',
      os: 'Windows 11',
    },
    basePrice: 68990,
    rating: 4.3,
    reviewCount: 4218,
    imageColor: '#10b981',
    pros: ['Excellent value for RTX 3050', '120Hz smooth display', 'Good thermal management', 'Solid build quality'],
    cons: ['Average battery life', 'Fan gets loud under load', 'No Thunderbolt 4'],
    sentimentScore: 0.78,
    tags: ['gaming', 'value', 'budget'],
    platforms: [
      { platform: 'amazon', price: 68990, mrp: 79990, discount: 14, deliveryDays: 2, inStock: true, seller: 'Cloudtail India', warranty: '1 Year Warranty' },
      { platform: 'flipkart', price: 66990, mrp: 78990, discount: 15, deliveryDays: 3, inStock: true, seller: 'RetailNet', warranty: '1 Year Warranty' },
      { platform: 'croma', price: 70990, mrp: 81990, discount: 13, deliveryDays: 4, inStock: true, seller: 'Croma Retail', warranty: '1 Year Warranty' },
    ],
  },
  {
    name: 'iPhone 15 Pro',
    brand: 'Apple',
    category: 'phone',
    subcategory: 'flagship',
    specs: {
      display: '6.1" Super Retina XDR',
      processor: 'A17 Pro',
      ram: '8GB',
      storage: '128GB',
      camera: '48MP + 12MP + 12MP',
      battery: '3274mAh',
      os: 'iOS 17',
    },
    basePrice: 134900,
    rating: 4.7,
    reviewCount: 18234,
    imageColor: '#0ea5e9',
    pros: ['Industry-leading performance', 'Premium build quality', 'Excellent camera system', 'Long software support'],
    cons: ['Expensive', 'Limited ports', 'Small battery capacity'],
    sentimentScore: 0.9,
    tags: ['premium', 'apple', 'camera'],
    platforms: [
      { platform: 'amazon', price: 134900, mrp: 149900, discount: 10, deliveryDays: 2, inStock: true, seller: 'Apple Authorised Reseller', warranty: '1 Year Warranty' },
      { platform: 'flipkart', price: 133999, mrp: 149990, discount: 10, deliveryDays: 3, inStock: true, seller: 'Flipkart Wholesale', warranty: '1 Year Warranty' },
    ],
  },
  {
    name: 'Sony WF-1000XM5',
    brand: 'Sony',
    category: 'earbuds',
    subcategory: 'premium',
    specs: {
      type: 'True Wireless ANC',
      battery: '8h + 24h case',
      codec: 'LDAC, AAC',
      waterproof: 'IPX4',
    },
    basePrice: 24990,
    rating: 4.5,
    reviewCount: 3211,
    imageColor: '#000000',
    pros: ['Best ANC in class', 'Excellent sound detail', 'Comfortable fit', 'Long battery life'],
    cons: ['Expensive', 'Bulky case', 'No multipoint in some regions'],
    sentimentScore: 0.85,
    tags: ['audio', 'anc', 'premium'],
    platforms: [
      { platform: 'amazon', price: 24990, mrp: 27990, discount: 11, deliveryDays: 2, inStock: true, seller: 'Cloudtail India', warranty: '1 Year Warranty' },
      { platform: 'flipkart', price: 24890, mrp: 27999, discount: 11, deliveryDays: 2, inStock: true, seller: 'RetailNet', warranty: '1 Year Warranty' },
    ],
  },
  {
    name: 'Samsung 55" Crystal 4K UHD TV',
    brand: 'Samsung',
    category: 'tv',
    subcategory: '4k-led',
    specs: {
      size: '55 inch',
      resolution: '4K UHD',
      panel: 'Crystal LED',
      refreshRate: '60Hz',
      os: 'Tizen',
    },
    basePrice: 41990,
    rating: 4.3,
    reviewCount: 5432,
    imageColor: '#1e3a8a',
    pros: ['Vibrant colors', 'Thin bezel design', 'Smooth smart TV experience'],
    cons: ['60Hz only', 'Average onboard sound'],
    sentimentScore: 0.75,
    tags: ['tv', '4k', 'home'],
    platforms: [
      { platform: 'amazon', price: 41990, mrp: 48990, discount: 14, deliveryDays: 3, inStock: true, seller: 'RetailNet', warranty: '1 Year Warranty' },
      { platform: 'flipkart', price: 41500, mrp: 48999, discount: 15, deliveryDays: 4, inStock: true, seller: 'Flipkart Wholesale', warranty: '1 Year Warranty' },
    ],
  },
  {
    name: 'Apple Watch Series 9',
    brand: 'Apple',
    category: 'watch',
    subcategory: 'smartwatch',
    specs: {
      display: '45mm Always-On Retina',
      battery: '18h typical',
      waterResistance: '50m',
      os: 'watchOS 10',
    },
    basePrice: 41900,
    rating: 4.6,
    reviewCount: 7821,
    imageColor: '#9333ea',
    pros: ['Best for iPhone users', 'Accurate health sensors', 'Premium design'],
    cons: ['Battery lasts one day', 'Expensive'],
    sentimentScore: 0.87,
    tags: ['smartwatch', 'fitness', 'apple'],
    platforms: [
      { platform: 'amazon', price: 41900, mrp: 44900, discount: 7, deliveryDays: 2, inStock: true, seller: 'Apple Authorised Reseller', warranty: '1 Year Warranty' },
      { platform: 'flipkart', price: 41500, mrp: 44999, discount: 7, deliveryDays: 3, inStock: true, seller: 'RetailNet', warranty: '1 Year Warranty' },
    ],
  },
];

function buildPriceHistory(price, weeks = 8) {
  const now = Date.now();
  return Array.from({ length: weeks + 1 }, (_, idx) => {
    const week = weeks - idx;
    const date = new Date(now - week * 7 * 24 * 60 * 60 * 1000);
    const variance = (Math.sin(week * 0.7) + Math.random() * 0.4 - 0.2) * 0.06;
    return {
      recordedAt: date,
      price: Math.max(1, Math.round(price * (1 + variance))),
    };
  });
}

async function main() {
  const count = await db.product.count();
  if (count > 0) {
    console.log(`Database already has ${count} products, skipping seed.`);
    return;
  }

  for (const p of products) {
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

    for (const platform of p.platforms) {
      const historyRecords = buildPriceHistory(platform.price);
      for (const record of historyRecords) {
        await db.priceHistory.create({
          data: {
            productId: product.id,
            platform: platform.platform,
            price: record.price,
            recordedAt: record.recordedAt,
          },
        });
      }
    }
  }

  console.log(`Seeded ${products.length} products with platform prices and history.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
