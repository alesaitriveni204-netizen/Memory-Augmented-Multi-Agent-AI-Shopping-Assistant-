import { pathToFileURL } from "node:url";
import { runRagIndexer } from "./indexer.ts";

async function main() {
  const args = process.argv.slice(2);
  const forceReindex = args.includes("--reindex") || args.includes("--full");

  console.log(`[RAG CLI] Starting indexing job (forceReindex: ${forceReindex})...`);
  const stats = await runRagIndexer({ forceReindex });

  console.log(`[RAG CLI] Products discovered: ${stats.totalProducts}`);
  console.log(`[RAG CLI] User memories discovered: ${stats.totalMemories}`);
  console.log(`[RAG CLI] Documents created: ${stats.documentsCreated}`);
  console.log(`[RAG CLI] Chunks skipped (unchanged): ${stats.skippedUnchanged}`);
  console.log(`[RAG CLI] Embeddings generated: ${stats.embeddingsGenerated}`);
  console.log(`[RAG CLI] Total persistent index vectors: ${stats.vectorsUpserted}`);
  console.log("[RAG CLI] Indexing completed successfully.");
}

const isRunDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isRunDirectly) {
  main().catch((error) => {
    console.error("[RAG CLI] Indexing failed:", error);
    process.exitCode = 1;
  });
}
