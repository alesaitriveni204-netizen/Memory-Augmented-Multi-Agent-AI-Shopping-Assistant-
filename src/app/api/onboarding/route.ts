// POST /api/onboarding — completes onboarding, builds persona + twin + initial memories
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateDemoUser } from "@/lib/session";
import { clusterPersona, buildInitialTwin } from "@/lib/persona";
import { llmJson } from "@/lib/llm";
import type { OnboardingData } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUDGET_MAP: Record<string, number> = {
  low: 5000,
  mid: 15000,
  high: 50000,
  premium: 80000,
  "under-5000": 2500,
  "5000-15000": 10000,
  "15000-30000": 22500,
  "30000-50000": 40000,
  "50000-80000": 65000,
  "80000-plus": 100000,
};

async function extractNotePreferences(notes: string | undefined) {
  if (!notes?.trim()) return { categories: [] as string[], brands: [] as string[], habits: [] as string[] };
  const extracted = await llmJson<{ categories?: unknown; brands?: unknown; habits?: unknown }>(
    "Extract only explicit shopping preferences from the user's note. Return JSON with categories, brands, and habits arrays of short strings. Do not infer demographic traits or sensitive attributes.",
    notes.trim().slice(0, 1000),
    { temperature: 0 },
  );
  const clean = (value: unknown) => Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim().slice(0, 60)).filter(Boolean).slice(0, 8)
    : [];
  return {
    categories: clean(extracted?.categories),
    brands: clean(extracted?.brands),
    habits: clean(extracted?.habits),
  };
}

export async function GET() {
  try {
    const user = await getOrCreateDemoUser();
    let preferences: OnboardingData | null = null;
    if (user.onboarding) {
      try {
        preferences = JSON.parse(user.onboarding) as OnboardingData;
      } catch {
        preferences = null;
      }
    }
    return NextResponse.json({ preferences, hasOnboarded: user.onboardingCompleted });
  } catch {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
}

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

    const notePreferences = await extractNotePreferences(data.onboardingNotes);
    const normalizedData: OnboardingData = {
      ...data,
      categories: [...new Set([...data.categories, ...notePreferences.categories])],
      brands: [...new Set([...data.brands, ...notePreferences.brands])],
    };
    const cluster = clusterPersona(normalizedData);
    const twin = buildInitialTwin(cluster, normalizedData);
    const budgetValue = BUDGET_MAP[data.budgetRangeLabel ?? ""] ?? BUDGET_MAP[data.budgetRange] ?? 60000;
    const memoryEnabled = data.personalizationConsent !== "minimal";

    const updated = await db.user.update({
      where: { id: user.id },
      data: {
        personaCluster: cluster,
        digitalTwin: JSON.stringify(twin),
        twinConfidence: 20,
        onboarding: JSON.stringify({ ...normalizedData, notePreferences }),
        onboardingCompleted: true,
        onboardingCompletedAt: new Date(),
        personalizationEnabled: data.personalizationConsent !== "minimal",
        memoryEnabled,
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
        value: JSON.stringify(normalizedData.brands),
        confidence: 85,
        source: "onboarding",
      },
      {
        type: "long_term",
        category: "category",
        key: "preferred_categories",
        value: JSON.stringify(normalizedData.categories),
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
        value: String(twin.discountPreference),
        confidence: 75,
        source: "onboarding",
      },
      {
        type: "long_term",
        category: "preference",
        key: "purchase_priorities",
        value: JSON.stringify(data.purchasePriorities ?? []),
        confidence: 85,
        source: "onboarding",
      },
      {
        type: "long_term",
        category: "habit",
        key: "shopping_style",
        value: data.shoppingStyle ?? twin.shoppingStyle,
        confidence: 80,
        source: "onboarding",
      },
      {
        type: "long_term",
        category: "habit",
        key: "comparison_frequency",
        value: data.comparisonFrequency ?? "sometimes",
        confidence: 75,
        source: "onboarding",
      },
      ...(data.onboardingNotes?.trim() ? [{
        type: "long_term",
        category: "preference",
        key: "onboarding_notes",
        value: data.onboardingNotes.trim().slice(0, 1000),
        confidence: 60,
        source: "onboarding",
      }] : []),
      ...notePreferences.habits.map((habit) => ({
        type: "long_term",
        category: "habit",
        key: `onboarding_note_${habit.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 32)}`,
        value: habit,
        confidence: 60,
        source: "onboarding",
      })),
    ];

    for (const mem of memoryEnabled ? initialMemories : []) {
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
        hasOnboarded: updated.onboardingCompleted,
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
