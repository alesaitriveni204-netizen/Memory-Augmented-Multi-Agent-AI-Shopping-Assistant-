import { NextResponse } from "next/server";
import { getRagConfig } from "@/lib/rag";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const config = getRagConfig();

  return NextResponse.json({
    enabled: config.enabled,
    vectorProvider: config.vectorProvider,
    collection: "ai-shopping-product-knowledge",
    indexedChunks: 0,
    status: config.enabled ? "healthy" : "disabled",
  });
}
