// POST /api/onboarding — completes onboarding, builds persona + twin + initial memories
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateDemoUser } from "@/lib/session";
import { clusterPersona, buildInitialTwin } from "@/lib/persona";
import type { OnboardingData } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUDGET_MAP: Record<string, number> = {
  low: 30000,
  mid: 60000,
  high: 120000,
  premium: 250000,
};

export async function POST(req: Request) {
  let data: OnboardingData;
  try {
    data = (await req.json()) as OnboardingData;
  } catch (err: any) {
    return NextResponse.json(
      { error: "Invalid JSON body", detail: err?.message ?? String(err) },
      { status: 400 }
    );
  }

  try {
    const user = await getOrCreateDemoUser();

    // Basic shape validation
    if (!data || !Array.isArray(data.categories) || !data.budgetRange || !Array.isArray(data.brands)) {
      return NextResponse.json(
        { error: "Missing required onboarding fields (categories, budgetRange, brands)" },
        { status: 400 }
      );
    }

    const cluster = clusterPersona(data);
    const twin = buildInitialTwin(cluster, data);
    const budgetValue = BUDGET_MAP[data.budgetRange] ?? 60000;

    const updated = await db.user.update({
      where: { id: user.id },
      data: {
        personaCluster: cluster,
        digitalTwin: JSON.stringify(twin),
        twinConfidence: 20,
        onboarding: JSON.stringify(data),
        personalizationEnabled: true,
        memoryEnabled: true,
      },
    });

    // Connect selected platforms (upsert)
    const platforms = Array.isArray(data.platforms) ? data.platforms : [];
    for (const platform of platforms) {
      await db.connectedAccount.upsert({
        where: { userId_platform: { userId: user.id, platform } },
        update: { connected: true, connectedAt: new Date() },
        create: { userId: user.id, platform, connected: true },
      });
    }

    // Seed initial long_term memories (overwrite if exists)
    const initialMemories = [
      {
        type: "long_term",
        category: "brand",
        key: "preferred_brands",
        value: JSON.stringify(data.brands),
        confidence: 85,
        source: "onboarding",
      },
      {
        type: "long_term",
        category: "category",
        key: "preferred_categories",
        value: JSON.stringify(data.categories),
        confidence: 85,
        source: "onboarding",
      },
      {
        type: "long_term",
        category: "platform",
        key: "preferred_platforms",
        value: JSON.stringify(platforms),
        confidence: 80,
        source: "onboarding",
      },
      {
        type: "long_term",
        category: "budget",
        key: "budget_range",
        value: String(budgetValue),
        confidence: 80,
        source: "onboarding",
      },
      {
        type: "long_term",
        category: "habit",
        key: "shopping_frequency",
        value: data.shoppingFrequency ?? "monthly",
        confidence: 70,
        source: "onboarding",
      },
      {
        type: "long_term",
        category: "preference",
        key: "discount_preference",
        value: String(data.discountImportance ?? 3),
        confidence: 75,
        source: "onboarding",
      },
    ];

    for (const mem of initialMemories) {
      const existing = await db.memory.findFirst({
        where: { userId: user.id, key: mem.key, category: mem.category },
      });
      if (existing) {
        await db.memory.update({
          where: { id: existing.id },
          data: { value: mem.value, confidence: mem.confidence, source: mem.source, updatedAt: new Date() },
        });
      } else {
        await db.memory.create({
          data: {
            userId: user.id,
            type: mem.type,
            category: mem.category,
            key: mem.key,
            value: mem.value,
            confidence: mem.confidence,
            source: mem.source,
          },
        });
      }
    }

    await db.timelineEvent.create({
      data: {
        userId: user.id,
        type: "memory_update",
        title: "Onboarding completed",
        description: "Digital Persona Twin created",
        metadata: JSON.stringify({ personaCluster: cluster, twinConfidence: 20 }),
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        personaCluster: updated.personaCluster,
        twinConfidence: updated.twinConfidence,
        memoryEnabled: updated.memoryEnabled,
        personalizationEnabled: updated.personalizationEnabled,
        hasOnboarded: !!(updated.onboarding && updated.personaCluster),
      },
      personaCluster: cluster,
      twin,
    });
  } catch (err: any) {
    console.error("[api/onboarding] error:", err);
    return NextResponse.json(
      { error: "Failed to complete onboarding", detail: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
