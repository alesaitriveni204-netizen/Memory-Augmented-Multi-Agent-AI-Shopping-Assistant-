// POST /api/chat — main orchestrator endpoint for AI Shopping OS
// Runs intent → AHDE → parallel agents → explainability → persistence
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateDemoUser } from "@/lib/session";
import { resolveConversationContext } from "@/lib/conversation-context";
import {
  intentAgent,
  ahde,
  searchAgent,
  memoryAgent,
  digitalTwinAgent,
  recommendationAgent,
  budgetAgent,
  priceAgent,
  explainabilityAgent,
  updateMemoryFromInteraction,
  evolveTwinFromInteraction,
} from "@/lib/agents";
import type { RecommendationResult, AhdePlan, IntentResult, DigitalTwin } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { message?: string; sessionId?: string };
  try {
    body = await req.json();
  } catch (err: any) {
    return NextResponse.json(
      { error: "Invalid JSON body", detail: err?.message ?? String(err) },
      { status: 400 }
    );
  }

  const message = body?.message?.trim();
  if (!message) {
    return NextResponse.json({ error: "Missing 'message' field" }, { status: 400 });
  }
  const sessionId = body.sessionId?.trim() || `chat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  try {
    const user = await getOrCreateDemoUser();

    // Gate: must have onboarding completed
    if (!user.onboarding || !user.personaCluster) {
      return NextResponse.json({ error: "not_onboarded" }, { status: 400 });
    }

    const start = Date.now();

    // 0. Resolve conversation context (pronouns/references)
    const { resolved: resolvedMessage, wasResolved: contextResolved, referencedProduct } =
      await resolveConversationContext(user.id, message);

    // 1. Intent detection (use resolved message)
    const intent = await intentAgent(resolvedMessage);

    // 2. Load Digital Twin
    const twin = await digitalTwinAgent(user.id);
    const twinConfidence = user.twinConfidence ?? 0;

    // 3. AHDE plan
    const plan = ahde(intent, twinConfidence, user.memoryEnabled);

    // 4. Run agents in parallel where possible
    const memories = plan.requiredAgents.includes("memory")
      ? await memoryAgent(user.id, intent)
      : [];

    let products: any[] = [];
    if (plan.requiredAgents.includes("search")) {
      products = await searchAgent(intent);
    }

    let budgetResult: { budget: number | null; advice: string } | null = null;
    if (plan.requiredAgents.includes("budget")) {
      budgetResult = await budgetAgent(intent, memories);
    }

    let recs: RecommendationResult[] = [];
    if (plan.requiredAgents.includes("recommendation") && products.length > 0) {
      recs = await recommendationAgent(products, memories, twin, intent);
    }

    // Price advice attached to top 3 recs
    if (plan.requiredAgents.includes("price") && recs.length > 0) {
      const top3 = recs.slice(0, Math.min(3, recs.length));
      await Promise.all(
        top3.map(async (rec) => {
          try {
            const advice = await priceAgent(rec.productId, rec.bestPrice);
            (rec as any).priceAdvice = advice;
          } catch (e) {
            console.log(
              "[chat] priceAgent failed for",
              rec.productId,
              e instanceof Error ? e.message : String(e)
            );
          }
        })
      );
    }

    // 5. Build final response text
    let response = "";
    if (plan.requiredAgents.includes("explainability")) {
      response = await explainabilityAgent(intent, recs, plan, twin);
    } else if (recs.length > 0) {
      const top = recs[0];
      response = `Based on your request, I compared ${recs.length} products across multiple platforms. My top pick is the ${top.name} (${top.brand}) with a Shopping Score of ${top.shoppingScore}/100 — ${top.explanation}.`;
    } else {
      response = `I understood your request as "${intent.intent}". Let me know a bit more about what you're looking for and I'll find the best match.`;
    }

    if (budgetResult && budgetResult.advice) {
      response += ` ${budgetResult.advice}`;
    }

    const latencyMs = Date.now() - start;

    // 6. Persist ChatMessages
    const userMsg = await db.chatMessage.create({
      data: { userId: user.id, sessionId, role: "user", content: message },
    });

    const metadata = {
      intent,
      complexity: intent.complexity,
      agentsUsed: plan.requiredAgents,
      ahdePlan: plan,
      recommendations: recs,
      latencyMs,
      budget: budgetResult?.budget ?? null,
    };

    const assistantMsg = await db.chatMessage.create({
      data: {
        userId: user.id,
        sessionId,
        role: "assistant",
        content: response,
        metadata: JSON.stringify(metadata),
      },
    });

    // 7. Save Recommendation records
    if (recs.length > 0) {
      await db.recommendation.createMany({
        data: recs.map((r) => ({
          userId: user.id,
          productId: r.productId,
          shoppingScore: r.shoppingScore,
          scoreBreakdown: JSON.stringify(r.scoreBreakdown),
          explanation: r.explanation,
          intent: intent.intent,
          status: "shown",
        })),
      });
    }

    // 8. Timeline event
    await db.timelineEvent.create({
      data: {
        userId: user.id,
        type: "recommendation",
        title: "Shopping query",
        description: message,
        metadata: JSON.stringify({
          intent: intent.intent,
          complexity: intent.complexity,
          agentCount: plan.requiredAgents.length,
          agentsUsed: plan.requiredAgents,
          latencyMs,
          recommendationCount: recs.length,
        }),
      },
    });

    // 9. Async memory + twin evolution (do NOT await)
    if (user.memoryEnabled) {
      updateMemoryFromInteraction(user.id, message, intent).catch((e) =>
        console.log(
          "[chat] updateMemoryFromInteraction error:",
          e instanceof Error ? e.message : String(e)
        )
      );
    }
    if (user.personalizationEnabled && twin) {
      evolveTwinFromInteraction(user.id, intent, twin).catch((e) =>
        console.log(
          "[chat] evolveTwinFromInteraction error:",
          e instanceof Error ? e.message : String(e)
        )
      );
    }

    return NextResponse.json({
      response,
      recommendations: recs,
      intent,
      ahdePlan: plan,
      latencyMs,
      agentsUsed: plan.requiredAgents,
      messageId: assistantMsg.id,
      userMessageId: userMsg.id,
      sessionId,
      contextResolved,
      referencedProduct,
      originalMessage: message,
      resolvedMessage,
    });
  } catch (err: any) {
    if (err?.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    console.log(
      "[api/chat] error:",
      err instanceof Error ? err.message : String(err)
    );
    return NextResponse.json(
      { error: "Failed to process chat", detail: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
