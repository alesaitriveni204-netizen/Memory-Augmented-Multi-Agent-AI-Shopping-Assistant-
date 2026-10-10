export type RagVectorProvider = "memory" | "chroma";

export type RagConfig = {
  enabled: boolean;
  vectorProvider: RagVectorProvider;
  topK: number;
  minSimilarity: number;
  maxContextTokens: number;
  chunkSize: number;
  chunkOverlap: number;
};

export function getRagConfig(): RagConfig {
  const enabled = (process.env.RAG_ENABLED ?? "true").toLowerCase() !== "false";
  const vectorProvider = (process.env.RAG_VECTOR_PROVIDER ?? "memory").toLowerCase() as RagVectorProvider;

  return {
    enabled,
    vectorProvider: vectorProvider === "chroma" ? "chroma" : "memory",
    topK: Number(process.env.RAG_TOP_K ?? 8),
    minSimilarity: Number(process.env.RAG_MIN_SIMILARITY ?? 0.4),
    maxContextTokens: Number(process.env.RAG_MAX_CONTEXT_TOKENS ?? 4000),
    chunkSize: Number(process.env.RAG_CHUNK_SIZE ?? 700),
    chunkOverlap: Number(process.env.RAG_CHUNK_OVERLAP ?? 100),
  };
}
