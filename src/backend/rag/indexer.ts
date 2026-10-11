import crypto from "node:crypto";
import { db } from "../db.ts";
import { buildRagDocuments, chunkText } from "./document.ts";
import { createEmbeddingProvider } from "./embeddings.ts";
import { getPersistentVectorStore } from "./vector-store.ts";

export type IndexingStats = {
  totalProducts: number;
  totalMemories: number;
  documentsCreated: number;
  chunksProcessed: number;
  embeddingsGenerated: number;
  vectorsUpserted: number;
  skippedUnchanged: number;
};

export async function runRagIndexer(options: { forceReindex?: boolean } = {}): Promise<IndexingStats> {
  const [products, memories] = await Promise.all([
    db.product.findMany({
      include: { platformPrices: true, priceHistory: true },
      orderBy: { createdAt: "desc" },
    }),
    db.memory.findMany({
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const docs = buildRagDocuments(products as any[], memories as any[]);
  const store = getPersistentVectorStore();
  const existingChunks = store.getAllChunks();

  // Map existing chunkId -> contentHash
  const existingHashMap = new Map<string, string>();
  for (const item of existingChunks) {
    if (item.chunkId && (item as any).contentHash) {
      existingHashMap.set(item.chunkId, (item as any).contentHash);
    }
  }

  const chunksToUpsert: any[] = [];
  let skippedUnchanged = 0;

  for (const doc of docs) {
    const textChunks = chunkText(doc.content, {
      chunkSize: 700,
      overlap: 100,
      sourceType: doc.sourceType,
      documentType: doc.documentType,
      metadata: { ...doc.metadata, productId: doc.productId, userId: doc.userId },
    });

    for (const chunk of textChunks) {
      const hash = crypto.createHash("sha256").update(chunk.content).digest("hex");
      const prevHash = existingHashMap.get(chunk.chunkId);

      if (!options.forceReindex && prevHash === hash) {
        skippedUnchanged += 1;
        continue;
      }

      chunksToUpsert.push({
        ...chunk,
        productId: doc.productId,
        userId: doc.userId,
        contentHash: hash,
      });
    }
  }

  let embeddingsGenerated = 0;
  if (chunksToUpsert.length > 0) {
    const provider = createEmbeddingProvider();
    const vectors = await provider.embedTexts(chunksToUpsert.map((c) => c.content));
    embeddingsGenerated = vectors.length;

    await store.upsert(
      chunksToUpsert.map((chunk, idx) => ({
        ...chunk,
        vector: vectors[idx],
      }))
    );
  }

  return {
    totalProducts: products.length,
    totalMemories: memories.length,
    documentsCreated: docs.length,
    chunksProcessed: docs.length,
    embeddingsGenerated,
    vectorsUpserted: await store.count(),
    skippedUnchanged,
  };
}
