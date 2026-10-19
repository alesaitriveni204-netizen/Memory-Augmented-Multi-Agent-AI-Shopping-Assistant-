export * from "./types.ts";
export * from "./config.ts";
export * from "./document.ts";
export * from "./embeddings.ts";
export * from "./vector-store.ts";

import { MemoryEmbeddingProvider } from "./embeddings.ts";
import { InMemoryVectorStore } from "./vector-store.ts";

export function createMemoryEmbeddingProvider() {
  return new MemoryEmbeddingProvider();
}

export function createInMemoryVectorStore(provider?: any) {
  return new InMemoryVectorStore(provider);
}

export function createRagQuery(input: {
  userId: string;
  query: string;
  category?: string;
  brand?: string;
  limit?: number;
  topK?: number;
}) {
  return {
    userId: input.userId,
    query: input.query.trim(),
    category: input.category?.trim() || undefined,
    brand: input.brand?.trim() || undefined,
    limit: input.limit ?? 5,
    topK: input.topK ?? 8,
  };
}
