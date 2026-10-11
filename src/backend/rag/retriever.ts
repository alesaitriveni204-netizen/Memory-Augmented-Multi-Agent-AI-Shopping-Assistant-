import { createEmbeddingProvider } from "./embeddings.ts";
import { getPersistentVectorStore } from "./vector-store.ts";
import { runRagIndexer } from "./indexer.ts";
import type { RagQuery, RagSearchHit } from "./types.ts";

export async function ensureRagIndexed() {
  const store = getPersistentVectorStore();
  if ((await store.count()) === 0) {
    console.log("[RAG Retriever] Persistent index empty. Triggering initial background indexer...");
    await runRagIndexer();
  }
}

export async function retrieveProductKnowledge(query: RagQuery): Promise<RagSearchHit[]> {
  await ensureRagIndexed();

  const provider = createEmbeddingProvider();
  const vectorStore = getPersistentVectorStore();
  const queryEmbedding = await provider.embedText(query.query);

  const rawHits = await vectorStore.search(queryEmbedding, {
    limit: (query.topK ?? 8) * 2,
    sourceType: "product",
  });

  const filtered = rawHits.filter((hit) => {
    if (query.category && hit.metadata?.category) {
      if (hit.metadata.category.toLowerCase() !== query.category.toLowerCase()) return false;
    }
    if (query.brand && hit.metadata?.brand) {
      if (!hit.metadata.brand.toLowerCase().includes(query.brand.toLowerCase())) return false;
    }
    return true;
  });

  return filtered.slice(0, query.topK ?? 5);
}

export async function retrieveUserMemory(query: RagQuery): Promise<RagSearchHit[]> {
  await ensureRagIndexed();

  const provider = createEmbeddingProvider();
  const vectorStore = getPersistentVectorStore();
  const queryEmbedding = await provider.embedText(query.query);

  return vectorStore.search(queryEmbedding, {
    limit: query.topK ?? 5,
    userId: query.userId,
    sourceType: "memory",
  });
}
