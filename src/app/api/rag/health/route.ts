import { NextResponse } from "next/server";
import { getRagConfig, getPersistentVectorStore } from "@/lib/rag";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const config = getRagConfig();
  const store = getPersistentVectorStore();
  const indexedChunks = await store.count();

  return NextResponse.json({
    enabled: config.enabled,
    vectorProvider: config.vectorProvider,
    collection: "ai-shopping-product-knowledge",
    indexedChunks,
    status: config.enabled ? "healthy" : "disabled",
  });
}
