export type RagSourceType = "product" | "memory" | "shopping_context";
export type RagDocumentType =
  | "product_overview"
  | "product_specs"
  | "product_reviews"
  | "product_pros_cons"
  | "memory"
  | "shopping_context";

export type RagDocument = {
  id: string;
  content: string;
  sourceType: RagSourceType;
  documentType: RagDocumentType;
  userId?: string;
  productId?: string;
  metadata: Record<string, any>;
};

export type RagChunk = RagDocument & {
  chunkId: string;
  chunkIndex: number;
  vector?: number[];
};

export type RagQuery = {
  userId: string;
  query: string;
  category?: string;
  brand?: string;
  limit?: number;
  topK?: number;
};

export type RagSearchHit = {
  id: string;
  content: string;
  score: number;
  sourceType: RagSourceType;
  documentType: RagDocumentType;
  userId?: string;
  productId?: string;
  metadata: Record<string, any>;
};

export interface EmbeddingProvider {
  embedText(text: string): Promise<number[]>;
  embedTexts(texts: string[]): Promise<number[][]>;
}

export interface VectorStore {
  upsert(documents: RagChunk[]): Promise<void>;
  search(embedding: number[], options?: { limit?: number; userId?: string; sourceType?: RagSourceType }): Promise<RagSearchHit[]>;
  delete(ids: string[]): Promise<void>;
  count(): Promise<number>;
}

export type ProductRecordLike = {
  id: string;
  name: string;
  brand: string;
  category: string;
  subcategory?: string | null;
  specs?: string | null;
  basePrice: number;
  rating?: number | null;
  reviewCount?: number | null;
  imageColor?: string | null;
  pros?: string | null;
  cons?: string | null;
  sentimentScore?: number | null;
  tags?: string | null;
  platformPrices?: Array<{
    platform: string;
    price: number;
    mrp: number;
    discount: number;
    deliveryDays: number;
    inStock: boolean;
  }>;
  priceHistory?: Array<{ price: number; recordedAt?: string | Date; platform?: string }>;
};
