import type { ProductRecordLike, RagChunk, RagDocument, RagDocumentType, RagSourceType } from "./types.ts";
import { getRagConfig } from "./config.ts";

const defaultChunkConfig = {
  chunkSize: 700,
  chunkOverlap: 100,
};

export function buildProductDocument(product: ProductRecordLike): RagDocument[] {
  const specs = product.specs ? parseJsonRecord(product.specs) : {};
  const tags = product.tags ? parseJsonStringArray(product.tags) : [];
  const pros = product.pros ? parseJsonStringArray(product.pros) : [];
  const cons = product.cons ? parseJsonStringArray(product.cons) : [];
  const platformSummary = (product.platformPrices ?? []).map((entry) => {
    return `${entry.platform}: ₹${entry.price} (MRP ₹${entry.mrp}, ${entry.discount}% off, ${entry.inStock ? 'in stock' : 'out of stock'}, ${entry.deliveryDays} days)`;
  }).join("; ");

  const overview = [
    `Product: ${product.name}`,
    `Brand: ${product.brand}`,
    `Category: ${product.category}`,
    product.subcategory ? `Subcategory: ${product.subcategory}` : undefined,
    `Price: ₹${product.basePrice.toLocaleString("en-IN")}`,
    `Rating: ${product.rating ?? 0} / 5 (${product.reviewCount ?? 0} reviews)`,
    `Sentiment: ${product.sentimentScore ?? 0.7}`,
    `Tags: ${tags.join(", ") || "none"}`,
    `Pros: ${pros.join(", ") || "none"}`,
    `Cons: ${cons.join(", ") || "none"}`,
    `Specifications: ${Object.entries(specs).map(([k, v]) => `${k}: ${v}`).join(", ") || "none"}`,
    `Platform prices: ${platformSummary || "not available"}`,
  ].filter(Boolean).join("\n");

  return [
    {
      id: `product-${product.id}-overview`,
      content: overview,
      sourceType: "product",
      documentType: "product_overview",
      productId: product.id,
      metadata: {
        category: product.category,
        subcategory: product.subcategory,
        brand: product.brand,
        price: product.basePrice,
        rating: product.rating,
        reviewCount: product.reviewCount,
        tags,
      },
    },
    {
      id: `product-${product.id}-specs`,
      content: `Specifications for ${product.name}: ${Object.entries(specs).map(([k, v]) => `${k}: ${v}`).join("; ") || "No structured specs available"}`,
      sourceType: "product",
      documentType: "product_specs",
      productId: product.id,
      metadata: {
        category: product.category,
        subcategory: product.subcategory,
        brand: product.brand,
      },
    },
    {
      id: `product-${product.id}-pros-cons`,
      content: `Pros: ${pros.join(", ") || "none"}. Cons: ${cons.join(", ") || "none"}.`,
      sourceType: "product",
      documentType: "product_pros_cons",
      productId: product.id,
      metadata: {
        category: product.category,
        brand: product.brand,
      },
    },
  ];
}

export function buildMemoryDocument(memory: any): RagDocument {
  const value = String(memory.value ?? "");
  return {
    id: `memory-${memory.id}`,
    content: `User memory: type=${memory.type}; category=${memory.category}; key=${memory.key}; value=${value}; confidence=${memory.confidence}; source=${memory.source}; weight=${memory.weight}.`,
    sourceType: "memory",
    documentType: "memory",
    userId: memory.userId,
    metadata: {
      type: memory.type,
      category: memory.category,
      key: memory.key,
      source: memory.source,
      confidence: memory.confidence,
      weight: memory.weight,
      createdAt: memory.createdAt,
      updatedAt: memory.updatedAt,
    },
  };
}

export function buildRagDocuments(products: ProductRecordLike[] = [], memories: any[] = []): RagDocument[] {
  const productDocs = products.flatMap((product) => buildProductDocument(product));
  const memoryDocs = memories.map((memory) => buildMemoryDocument(memory));
  return [...productDocs, ...memoryDocs];
}

export function chunkText(
  text: string,
  config: {
    chunkSize?: number;
    overlap?: number;
    sourceType?: RagSourceType;
    documentType?: RagDocumentType;
    metadata?: Record<string, any>;
  } = {}
): RagChunk[] {
  const ragConfig = getRagConfig();
  const chunkSize = Math.max(100, config.chunkSize ?? ragConfig.chunkSize ?? defaultChunkConfig.chunkSize);
  const overlap = Math.min(chunkSize - 20, Math.max(20, config.overlap ?? ragConfig.chunkOverlap ?? defaultChunkConfig.chunkOverlap));
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  const chunks: RagChunk[] = [];
  let start = 0;
  let index = 0;

  while (start < normalized.length) {
    let end = Math.min(start + chunkSize, normalized.length);
    if (end < normalized.length) {
      const lastSpace = normalized.lastIndexOf(" ", end);
      if (lastSpace > start + chunkSize * 0.45) {
        end = lastSpace;
      }
    }

    const content = normalized.slice(start, end).trim();
    if (!content) break;

    const chunkId = `chunk-${simpleHash(`${config.sourceType ?? "product"}:${config.documentType ?? "product_overview"}:${content}:${index}`)}`;
    chunks.push({
      id: chunkId,
      chunkId,
      chunkIndex: index,
      content,
      sourceType: config.sourceType ?? "product",
      documentType: config.documentType ?? "product_overview",
      metadata: { ...(config.metadata ?? {}) },
    });

    start = Math.max(start + chunkSize - overlap, end);
    index += 1;
  }

  return chunks;
}

function parseJsonRecord(input: string): Record<string, string | number | boolean> {
  try {
    const parsed = JSON.parse(input);
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

function parseJsonStringArray(input: string): string[] {
  try {
    const parsed = JSON.parse(input);
    return Array.isArray(parsed) ? parsed.filter(Boolean).map(String) : [];
  } catch {
    return String(input).split(",").map((value) => value.trim()).filter(Boolean);
  }
}

function simpleHash(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
}
