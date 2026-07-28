// POST /api/coach/tips — generate LLM-powered personalized shopping coaching tips
// Body: { twin: DigitalTwin, confidence, personaCluster, recentActivity }
// Returns: { tips: [{ title, body, icon, category, action, actionQuery }], summary }

import { NextResponse } from "next/server";
import { llmJson } from "@/lib/llm";
import { db } from "@/lib/db";
import { getOrCreateDemoUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Tip {
  title: string
  body: string
  icon: string // emoji or lucide name
  category: string
  action?: string
  actionQuery?: string
}

export async function POST() {
  try {
    const user = await getOrCreateDemoUser();
    let twin: any = null;
    if (user.digitalTwin) {
      try {
        twin = JSON.parse(user.digitalTwin);
      } catch {
        twin = null;
      }
    }

    // Fetch recent activity for context
    const recentEvents = await db.timelineEvent.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    const recentActivity = recentEvents
      .map((e) => `${e.type}: ${e.title}`)
      .join("; ");

    const system = `You are the Shopping Coach Agent of AI Shopping OS. Generate 4 personalized shopping coaching tips based on the user's Digital Twin and recent activity.

User's Digital Twin (behavioral model):
${JSON.stringify(twin ?? {}, null, 2)}

Twin confidence: ${user.twinConfidence}%
Persona cluster: ${user.personaCluster ?? "unknown"}
Recent activity: ${recentActivity || "none"}

Return STRICT JSON:
{
  "tips": [
    {
      "title": "<short punchy title, max 6 words>",
      "body": "<2-3 sentences of specific, actionable advice referencing the user's actual twin traits and numbers>",
      "icon": "<one of: lightbulb, trending-down, trending-up, target, piggy-bank, clock, award, sparkles, zap, brain, star>",
      "category": "<one of: spending, saving, habits, discovery, quality>",
      "action": "<short CTA button text, max 3 words>",
      "actionQuery": "<a chat query the user can send to act on this tip>"
    }
  ],
  "summary": "<one sentence summary of the user's shopping personality based on their twin>"
}

Rules:
- Be specific. Reference actual numbers from the twin (e.g., "your price sensitivity is 86/100").
- Each tip should target a DIFFERENT aspect (don't repeat themes).
- Be encouraging, not preachy.
- Keep titles under 6 words, bodies under 40 words.
- Return 4 tips.
Return ONLY the JSON.`;

    const result = await llmJson<{ tips: Tip[]; summary: string }>(system, "Generate coaching tips", {
      temperature: 0.6,
    });

    if (!result || !Array.isArray(result.tips)) {
      return NextResponse.json({
        tips: [],
        summary: "Keep chatting to unlock personalized coaching insights.",
      });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[api/coach/tips] error:", err);
    return NextResponse.json(
      { error: "Failed to generate tips", detail: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
