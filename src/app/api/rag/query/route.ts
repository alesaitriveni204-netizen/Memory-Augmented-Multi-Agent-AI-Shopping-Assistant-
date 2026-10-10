import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateDemoUser } from "@/lib/session";
import { createRagQuery, createEmbeddingProvider, createInMemoryVectorStore } from "@/lib/rag";
import { db } from "@/lib/db";
import { buildRagDocuments, chunkText } from "@/lib/rag";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QuerySchema = z.object({
  query: z.string().min(1),
  category: z.string().optional(),
  brand: z.string().optional(),
  limit: z.number().int().min(1).max(20).optional(),
  topK: z.number().int().min(1).max(20).optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = QuerySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body", details: parsed.error.flatten() }, { status: 400 });
    }

    const user = await getOrCreateDemoUser();
    const ragQuery = createRagQuery({
      userId: user.id,
      query: parsed.data.query,
      category: parsed.data.category,
      brand: parsed.data.brand,
      limit: parsed.data.limit ?? 5,
      topK: parsed.data.topK ?? 8,
    });

    const products = await db.product.findMany({
      where: ragQuery.category ? { category: ragQuery.category } : undefined,
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

    const provider = createEmbeddingProvider();
    const store = createInMemoryVectorStore();
    const embeddings = await provider.embedTexts(chunks.map((chunk) => chunk.content));
    await store.upsert(chunks.map((chunk, index) => ({ ...chunk, vector: embeddings[index] })));

    const queryEmbedding = await provider.embedText(ragQuery.query);
    const results = await store.search(queryEmbedding, { limit: ragQuery.topK ?? 5, sourceType: "product" });

    const answer = results.length > 0
      ? `I found ${results.length} relevant product references for "${ragQuery.query}". The strongest matches include ${results.slice(0, 3).map((hit) => hit.metadata.brand || "product").join(", ")}.`
      : "I couldn't find enough relevant product information to answer that confidently. Try a more specific product category, brand, or budget.";

    return NextResponse.json({
      answer,
      sources: results.map((item) => ({
        type: item.sourceType,
        productId: item.productId,
        documentType: item.documentType,
        relevance: Number(item.score.toFixed(3)),
      })),
      retrievedSnippets: results.map((item) => ({
        content: item.content,
        score: Number(item.score.toFixed(3)),
        sourceType: item.sourceType,
        documentType: item.documentType,
      })),
      metadata: {
        retrievedCount: results.length,
        usedContextCount: results.length,
        ragEnabled: true,
      },
      confidence: { level: results.length > 0 ? "medium" : "low", score: results.length > 0 ? 0.7 : 0.2 },
    });
  } catch (error: any) {
    if (error?.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    console.error("[api/rag/query] error:", error);
    return NextResponse.json(
      { error: "RAG query failed", detail: error?.message ?? String(error) },
      { status: 500 }
    );
  }
}
