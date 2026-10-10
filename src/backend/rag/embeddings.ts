import type { EmbeddingProvider } from "./types.ts";

const EMBEDDING_SIGNAL_TERMS = [
  "samsung",
  "phone",
  "camera",
  "battery",
  "laptop",
  "budget",
  "ram",
  "ssd",
  "mobile",
  "android",
  "smartphone",
  "best",
  "good",
  "fast",
  "tv",
  "watch",
  "earbuds",
  "discount",
  "review",
  "compare",
  "premium",
  "fashion",
  "beauty",
  "family",
  "student",
  "office",
  "gaming",
  "delivery",
  "stock",
  "price",
  "portable",
  "wireless",
  "screen",
  "battery",
  "sound",
  "performance",
  "design",
  "durable",
  "casual",
  "formal",
];

function tokenToDimension(token: string): number {
  const normalized = token.toLowerCase();
  const index = EMBEDDING_SIGNAL_TERMS.indexOf(normalized);
  if (index >= 0) return index;

  let hash = 0;
  for (let i = 0; i < normalized.length; i += 1) {
    hash = (hash * 31 + normalized.charCodeAt(i)) >>> 0;
  }
  return EMBEDDING_SIGNAL_TERMS.length + (hash % (256 - EMBEDDING_SIGNAL_TERMS.length));
}

export class MemoryEmbeddingProvider implements EmbeddingProvider {
  private readonly dimensions = 256;

  async embedText(text: string): Promise<number[]> {
    return this.buildVector(text);
  }

  async embedTexts(texts: string[]): Promise<number[][]> {
    return texts.map((text) => this.buildVector(text));
  }

  private buildVector(text: string): number[] {
    const cleaned = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
    const tokens = cleaned.split(/\s+/).filter(Boolean);
    const frequencies = new Map<string, number>();
    const boostedWords = new Set(EMBEDDING_SIGNAL_TERMS);

    for (const token of tokens) {
      frequencies.set(token, (frequencies.get(token) ?? 0) + 1);
    }

    const vector = new Array(this.dimensions).fill(0);
    const sorted = [...frequencies.entries()].sort((a, b) => a[0].localeCompare(b[0]));

    for (let i = 0; i < sorted.length; i += 1) {
      const [token, frequency] = sorted[i];
      const index = tokenToDimension(token);
      const boost = boostedWords.has(token) ? 9 : 1;
      vector[index] += frequency * boost;
    }

    const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
    return vector.map((value) => value / magnitude);
  }
}

export function createEmbeddingProvider(): EmbeddingProvider {
  const provider = (process.env.EMBEDDING_PROVIDER ?? "memory").toLowerCase();
  if (provider === "openai" || provider === "gemini") {
    throw new Error("Configured embedding provider is not available in this local MVP. Set EMBEDDING_PROVIDER=memory or disable RAG.");
  }
  return new MemoryEmbeddingProvider();
}
