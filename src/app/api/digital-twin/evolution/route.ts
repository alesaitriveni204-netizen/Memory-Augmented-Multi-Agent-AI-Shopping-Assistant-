// GET /api/digital-twin/evolution — returns twin evolution data over time
// Reconstructs twin confidence + trait snapshots from timeline events + memory updates
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateDemoUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getOrCreateDemoUser();

    // Fetch all timeline events + memory updates for the user, ordered by date
    const [timelineEvents, memories] = await Promise.all([
      db.timelineEvent.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "asc" },
        take: 200,
      }),
      db.memory.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    // Build evolution timeline: each event represents a point in time
    // We'll track: timestamp, eventType, confidence (estimated), memoryCount, traitChanges
    const evolution: Array<{
      timestamp: string;
      eventType: string;
      title: string;
      confidence: number;
      memoryCount: number;
      description?: string;
    }> = [];

    // Start with onboarding
    const onboardingEvent = timelineEvents.find((e) => e.type === "memory_update" && e.title?.includes("Onboarding"));
    if (onboardingEvent) {
      evolution.push({
        timestamp: onboardingEvent.createdAt.toISOString(),
        eventType: "onboarding",
        title: "Digital Persona Twin created",
        confidence: 20,
        memoryCount: 6,
        description: onboardingEvent.description ?? undefined,
      });
    }

    // Track cumulative confidence + memory count
    let currentConfidence = 20;
    let currentMemoryCount = 6;

    // Process events in chronological order
    for (const evt of timelineEvents) {
      if (evt.type === "memory_update" && evt.title?.includes("Onboarding")) continue;

      let confidenceDelta = 0;
      let memoryDelta = 0;
      let title = evt.title;

      if (evt.type === "recommendation") {
        confidenceDelta = 1;
      } else if (evt.type === "twin_update") {
        confidenceDelta = 1;
        title = evt.title || "Twin evolved";
      } else if (evt.type === "memory_update") {
        memoryDelta = 1;
      } else if (evt.type === "purchase") {
        confidenceDelta = 3;
      } else if (evt.type === "wishlist") {
        confidenceDelta = 1;
      }

      currentConfidence = Math.min(100, currentConfidence + confidenceDelta);
      currentMemoryCount += memoryDelta;

      evolution.push({
        timestamp: evt.createdAt.toISOString(),
        eventType: evt.type,
        title,
        confidence: currentConfidence,
        memoryCount: currentMemoryCount,
        description: evt.description ?? undefined,
      });
    }

    // Also add memory creation events as evolution points
    for (const mem of memories) {
      const existing = evolution.find((e) => Math.abs(new Date(e.timestamp).getTime() - mem.createdAt.getTime()) < 60000);
      if (!existing) {
        currentMemoryCount += 1;
        evolution.push({
          timestamp: mem.createdAt.toISOString(),
          eventType: "memory_created",
          title: `Memory: ${mem.key}`,
          confidence: currentConfidence,
          memoryCount: currentMemoryCount,
          description: `${mem.category}: ${mem.value.slice(0, 60)}`,
        });
      }
    }

    // Sort by timestamp and deduplicate
    evolution.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Cap confidence to actual user twinConfidence at the end
    if (evolution.length > 0) {
      evolution[evolution.length - 1].confidence = user.twinConfidence;
    }

    // Build chart data: confidence over time + memory count over time
    const confidenceChart = evolution.map((e) => ({
      time: new Date(e.timestamp).toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
      confidence: e.confidence,
      memories: e.memoryCount,
    }));

    // Event type distribution
    const typeCounts: Record<string, number> = {};
    for (const e of evolution) {
      typeCounts[e.eventType] = (typeCounts[e.eventType] ?? 0) + 1;
    }

    return NextResponse.json({
      evolution,
      confidenceChart,
      typeCounts,
      totalEvents: evolution.length,
      currentConfidence: user.twinConfidence,
      currentMemoryCount: memories.length,
    });
  } catch (err: any) {
    console.error("[api/digital-twin/evolution] error:", err);
    return NextResponse.json(
      { error: "Failed to fetch evolution data", detail: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
