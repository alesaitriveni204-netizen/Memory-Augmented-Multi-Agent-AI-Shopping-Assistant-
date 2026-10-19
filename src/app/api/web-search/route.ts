// POST /api/web-search — search the web for real-time product info, reviews, news
// Body: { query: string, num?: number, recency_days?: number }
// Returns: { results: [{ url, name, snippet, host_name, rank, date, favicon }] }

import { NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let zaiInstance: ZAI | null = null;
async function getZai() {
  if (!zaiInstance) zaiInstance = await ZAI.create();
  return zaiInstance;
}

/** Safely extract hostname from a URL string without throwing */
function safeHostname(url: string): string {
  try {
    return url ? new URL(url).hostname : "";
  } catch {
    return "";
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const query = body?.query;
    const num = body?.num ?? 5;
    const recency_days = body?.recency_days;

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Missing 'query' field" }, { status: 400 });
    }

    const zai = await getZai();
    const args: any = { query, num };
    if (recency_days) args.recency_days = recency_days;

    let results: any;
    try {
      results = await (zai as any).functions.invoke("web_search", args);
    } catch (invokeErr: any) {
      // Handle rate limits (429) and other SDK errors gracefully — return empty results
      const msg = invokeErr?.message ?? String(invokeErr);
      const isRateLimit = msg.includes("429") || msg.includes("Too many requests");
      if (isRateLimit) {
        console.warn("[api/web-search] rate limited, returning empty results");
        return NextResponse.json({ results: [], query, rateLimited: true });
      }
      // For other errors, also return empty instead of 500
      console.log("[api/web-search] invoke error:", msg);
      return NextResponse.json({ results: [], query, error: msg });
    }

    // Normalize results to a clean array
    let arr: any[] = [];
    if (Array.isArray(results)) arr = results;
    else if (results && Array.isArray(results.results)) arr = results.results;
    else if (results && Array.isArray((results as any).data)) arr = (results as any).data;

    const clean = arr.slice(0, num).map((r: any, i: number) => ({
      url: r.url ?? r.link ?? "",
      name: r.name ?? r.title ?? "Untitled",
      snippet: r.snippet ?? r.description ?? "",
      host_name: r.host_name ?? safeHostname(r.url ?? r.link ?? ""),
      rank: r.rank ?? i + 1,
      date: r.date ?? "",
      favicon: r.favicon ?? "",
    }));

    return NextResponse.json({ results: clean, query });
  } catch (err: any) {
    console.log(
      "[api/web-search] error:",
      err instanceof Error ? err.message : String(err)
    );
    // Return empty results instead of 500 to prevent frontend crashes
    return NextResponse.json({ results: [], error: err?.message ?? String(err) });
  }
}
