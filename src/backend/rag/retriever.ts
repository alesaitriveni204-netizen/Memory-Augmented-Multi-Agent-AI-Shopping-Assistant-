import { db } from "@/lib/db";
import { createEmbeddingProvider, createInMemoryVectorStore } from "@/lib/rag";
import { buildRagDocuments, chunkText } from "@/lib/rag";
import type { RagQuery, RagSearchHit } from "./types";

export async function retrieveProductKnowledge(query: RagQuery): Promise<RagSearchHit[]> {
  const products = await db.product.findMany({
    where: query.category ? { category: query.category } : undefined,
    include: { platformPrices: true },
    orderBy: { rating: "desc" },
    take: 20,
  });

  const docs = buildRagDocuments(products as any[]);
  const chunks: any[] = [];
  for (const doc of docs) {
    const generated = chunkText(doc.content, {
      chunkSize: 700,
      overlap: 100,
      sourceType: doc.sourceType,
      documentType: doc.documentType,
      metadata: { ...doc.metadata, productId: doc.productId, userId: doc.userId },
    });
    chunks.push(...generated);
  }

  if (chunks.length === 0) return [];

  const provider = createEmbeddingProvider();
  const vectorStore = createInMemoryVectorStore();
  const embeddings = await provider.embedTexts(chunks.map((chunk) => chunk.content));
  await vectorStore.upsert(chunks.map((chunk, index) => ({ ...chunk, vector: embeddings[index] })));

  const queryEmbedding = await provider.embedText(query.query);
  const results = await vectorStore.search(queryEmbedding, {
    limit: query.topK ?? 5,
    sourceType: "product",
  });

  return results.filter((result) => (query.brand ? (result.metadata.brand ?? "").toLowerCase().includes(query.brand.toLowerCase()) : true));
}

export async function retrieveUserMemory(query: RagQuery): Promise<RagSearchHit[]> {
  const memories = await db.memory.findMany({
    where: { userId: query.userId },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  const docs = memories.map((memory) => ({
    id: `memory-${memory.id}`,
    content: `User memory: type=${memory.type}; category=${memory.category}; key=${memory.key}; value=${memory.value}; confidence=${memory.confidence}; source=${memory.source};`,
    sourceType: "memory" as const,
    documentType: "memory" as const,
    userId: memory.userId,
    productId: undefined,
    metadata: { category: memory.category, key: memory.key, type: memory.type },
  }));

  if (docs.length === 0) return [];

  const provider = createEmbeddingProvider();
  const vectorStore = createInMemoryVectorStore();
  const embeddings = await provider.embedTexts(docs.map((doc) => doc.content));
  await vectorStore.upsert(docs.map((doc, index) => ({
    id: doc.id,
    chunkId: doc.id,
    chunkIndex: index,
    content: doc.content,
    sourceType: doc.sourceType,
    documentType: doc.documentType,
    userId: doc.userId,
    productId: doc.productId,
    metadata: doc.metadata,
    vector: embeddings[index],
  })));

  const queryEmbedding = await provider.embedText(query.query);
  return vectorStore.search(queryEmbedding, {
    limit: query.topK ?? 5,
    userId: query.userId,
    sourceType: "memory",
  });
}
