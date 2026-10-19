import { fileURLToPath, pathToFileURL } from "node:url";
import { db } from "../db.ts";
import { buildRagDocuments, chunkText, createEmbeddingProvider, createInMemoryVectorStore } from "./index.ts";

async function runReindex() {
  const [products, memories] = await Promise.all([
    db.product.findMany({
      include: { platformPrices: true, priceHistory: true },
      orderBy: { createdAt: "desc" },
    }),
    db.memory.findMany({ where: { userId: { not: undefined } }, orderBy: { createdAt: "desc" } }),
  ]);

  const docs = buildRagDocuments(products as any[], memories as any[]);
  const chunks: any[] = [];
  for (const doc of docs) {
    const textChunks = chunkText(doc.content, {
      chunkSize: 700,
      overlap: 100,
      sourceType: doc.sourceType,
      documentType: doc.documentType,
      metadata: { ...doc.metadata, productId: doc.productId, userId: doc.userId },
    });
    chunks.push(...textChunks.map((chunk) => ({ ...chunk, productId: doc.productId, userId: doc.userId })));
  }

  const provider = createEmbeddingProvider();
  const vectors = await provider.embedTexts(chunks.map((chunk) => chunk.content));
  const store = createInMemoryVectorStore();

  await store.upsert(
    chunks.map((chunk, index) => ({
      ...chunk,
      vector: vectors[index],
    }))
  );

  console.log(`[RAG] Products discovered: ${products.length}`);
  console.log(`[RAG] Documents created: ${docs.length}`);
  console.log(`[RAG] Chunks created: ${chunks.length}`);
  console.log(`[RAG] Embeddings generated: ${vectors.length}`);
  console.log(`[RAG] Vectors upserted: ${await store.count()}`);
  console.log("[RAG] Reindex completed successfully.");
}

const isRunDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isRunDirectly) {
  runReindex().catch((error) => {
    console.error("[RAG] Reindex failed:", error);
    process.exitCode = 1;
  });
}
