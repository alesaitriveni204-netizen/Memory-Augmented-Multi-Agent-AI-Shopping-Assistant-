import type { RagChunk, RagSearchHit, RagSourceType, VectorStore } from "./types.ts";

const SIGNAL_TERMS = [
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
  "sound",
  "performance",
  "design",
  "durable",
  "casual",
  "formal",
];

function tokenToDimension(token: string): number {
  const normalized = token.toLowerCase();
  const index = SIGNAL_TERMS.indexOf(normalized);
  if (index >= 0) return index;

  let hash = 0;
  for (let i = 0; i < normalized.length; i += 1) {
    hash = (hash * 31 + normalized.charCodeAt(i)) >>> 0;
  }
  return SIGNAL_TERMS.length + (hash % (256 - SIGNAL_TERMS.length));
}

import fs from "node:fs";
import path from "node:path";

export class PersistentVectorStore implements VectorStore {
  private chunks: (RagChunk & { vector: number[]; contentHash?: string })[] = [];
  private filePath: string;

  constructor(filePath?: string) {
    this.filePath = filePath || path.join(process.cwd(), "db", "vector_store.json");
    this.loadFromDisk();
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, "utf-8");
        this.chunks = JSON.parse(raw);
      }
    } catch (e) {
      console.warn("[RAG VectorStore] Warning: Could not read vector store file:", e);
      this.chunks = [];
    }
  }

  private saveToDisk() {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.filePath, JSON.stringify(this.chunks, null, 2), "utf-8");
    } catch (e) {
      console.error("[RAG VectorStore] Error saving vector store file:", e);
    }
  }

  async upsert(documents: (RagChunk & { contentHash?: string })[]): Promise<void> {
    for (const doc of documents) {
      const vector = doc.vector ?? simpleVectorFromText(doc.content);
      const existingIndex = this.chunks.findIndex((item) => {
        if (item.id && doc.id && item.id === doc.id) return true;
        if (item.chunkId && doc.chunkId && item.chunkId === doc.chunkId) return true;
        return false;
      });

      if (existingIndex >= 0) {
        this.chunks[existingIndex] = { ...doc, vector };
      } else {
        this.chunks.push({ ...doc, vector });
      }
    }
    this.saveToDisk();
  }

  async search(embedding: number[], options?: { limit?: number; userId?: string; sourceType?: RagSourceType }): Promise<RagSearchHit[]> {
    const limit = Math.max(1, options?.limit ?? 5);
    const results = this.chunks
      .filter((chunk) => {
        if (options?.userId && chunk.userId && chunk.userId !== options.userId) return false;
        if (options?.sourceType && chunk.sourceType !== options.sourceType) return false;
        return true;
      })
      .map((chunk) => {
        const semanticScore = cosineSimilarity(embedding, chunk.vector);
        const lexicalBonus = calculateLexicalBoost(chunk.content, chunk.metadata, embedding);
        const score = semanticScore + lexicalBonus;
        return {
          id: chunk.chunkId,
          content: chunk.content,
          score,
          sourceType: chunk.sourceType,
          documentType: chunk.documentType,
          userId: chunk.userId,
          productId: chunk.productId,
          metadata: chunk.metadata,
        } satisfies RagSearchHit;
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return results;
  }

  async delete(ids: string[]): Promise<void> {
    this.chunks = this.chunks.filter((chunk) => !ids.includes(chunk.id) && !ids.includes(chunk.chunkId));
    this.saveToDisk();
  }

  async count(): Promise<number> {
    return this.chunks.length;
  }

  getAllChunks() {
    return this.chunks;
  }
}

export class InMemoryVectorStore extends PersistentVectorStore {}

let globalVectorStore: PersistentVectorStore | null = null;

export function getPersistentVectorStore(): PersistentVectorStore {
  if (!globalVectorStore) {
    globalVectorStore = new PersistentVectorStore();
  }
  return globalVectorStore;
}

export function createInMemoryVectorStore(): VectorStore {
  return getPersistentVectorStore();
}

function cosineSimilarity(a: number[], b: number[]): number {
  const length = Math.min(a.length, b.length);
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (!normA || !normB) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function calculateLexicalBoost(content: string, metadata: Record<string, any>, embedding: number[]): number {
  const text = `${content} ${Object.values(metadata).join(' ')}`.toLowerCase();
  const tokens = text
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2);

  const queryTerms = extractLikelyQueryTerms(embedding);
  const matchedQueryTerms = new Set(queryTerms.filter((term) => tokens.includes(term)));
  let score = matchedQueryTerms.size * 8;

  const metadataBrand = typeof metadata.brand === 'string' ? metadata.brand.toLowerCase() : '';
  const metadataCategory = typeof metadata.category === 'string' ? metadata.category.toLowerCase() : '';

  if (metadataBrand && queryTerms.some((term) => term === metadataBrand)) score += 10;
  if (metadataCategory && queryTerms.some((term) => term === metadataCategory)) score += 12;

  const signalWeights: Record<string, number> = {
    samsung: 4,
    phone: 5,
    camera: 4,
    battery: 2.5,
    laptop: 4,
    budget: 2,
    ram: 1.5,
    ssd: 1.5,
    mobile: 3,
    android: 3,
    smartphone: 4,
    best: 1,
    good: 1,
    fast: 1,
    review: 1,
    discount: 1,
    premium: 1,
    gaming: 1,
  };

  for (const [term, weight] of Object.entries(signalWeights)) {
    if (tokens.includes(term)) score += weight;
  }

  if (tokens.includes('samsung') && tokens.includes('phone')) score += 5;
  if (tokens.includes('camera') && tokens.includes('phone')) score += 4;
  if (tokens.includes('budget') && tokens.includes('laptop')) score += 3;
  if (tokens.includes('ram') && tokens.includes('laptop')) score += 2;
  if (tokens.includes('ssd') && tokens.includes('laptop')) score += 2;

  return score;
}

function extractLikelyQueryTerms(embedding: number[]): string[] {
  const ranked = [...embedding.entries()]
    .filter(([, value]) => Math.abs(value) > 0.0001)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, 8)
    .map(([index]) => index);

  const terms = new Set<string>();
  for (const index of ranked) {
    if (index >= 0 && index < SIGNAL_TERMS.length) {
      terms.add(SIGNAL_TERMS[index]);
    }
  }

  return [...terms];
}

function simpleVectorFromText(text: string): number[] {
  const vector = new Array(256).fill(0);
  const tokens = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
  const frequency = new Map<string, number>();
  const boostedWords = new Set(SIGNAL_TERMS);

  for (const token of tokens) {
    frequency.set(token, (frequency.get(token) ?? 0) + 1);
  }

  for (const [token, count] of frequency.entries()) {
    const index = tokenToDimension(token);
    const boost = boostedWords.has(token) ? 9 : 1;
    vector[index] += count * boost;
  }

  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map((value) => value / magnitude);
}
