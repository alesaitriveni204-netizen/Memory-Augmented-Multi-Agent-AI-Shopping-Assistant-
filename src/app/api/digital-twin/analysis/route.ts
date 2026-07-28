// GET /api/digital-twin/analysis — LLM-generated personality analysis of the Digital Twin
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateDemoUser } from "@/lib/session";
import { llmJson } from "@/lib/llm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getOrCreateDemoUser();

    let twin: any = null;
    if (user.digitalTwin) {
      try {
        twin = JSON.parse(user.digitalTwin);
      } catch {}
    }

    if (!twin) {
      return NextResponse.json({ error: "No twin found" }, { status: 404 });
    }

    // Fetch recent interactions for context
    const recentEvents = await db.timelineEvent.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 15,
    });

    const recentActivity = recentEvents
      .map((e) => `${e.type}: ${e.title}`)
      .join("; ");

    const system = `You are a behavioral analyst AI for AI Shopping OS. Analyze the user's Digital Twin and generate a personality analysis.

User's Digital Twin:
${JSON.stringify(twin, null, 2)}

Twin confidence: ${user.twinConfidence}%
Persona cluster: ${user.personaCluster}
Recent activity: ${recentActivity || "none"}

Return STRICT JSON:
{
  "personalityType": "<a catchy 2-3 word label, e.g. 'Strategic Tech Hunter', 'Value-Conscious Explorer'>",
  "summary": "<3-4 sentence personality summary referencing specific trait values>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "growthAreas": ["<area 1>", "<area 2>"],
  "shoppingStyle": "<1 sentence describing their shopping decision-making style>",
  "topRecommendation": "<1 sentence — what product type/category they should explore next>",
  "funFact": "<1 fun observation about their shopping personality>"
}

Rules:
- Be specific — reference actual trait values (e.g., "with 90/100 price sensitivity...")
- Be encouraging and insightful, not generic
- Keep strengths/growthAreas under 10 words each
- Make the personality type memorable
Return ONLY the JSON.`;

    const result = await llmJson<{
      personalityType: string;
      summary: string;
      strengths: string[];
      growthAreas: string[];
      shoppingStyle: string;
      topRecommendation: string;
      funFact: string;
    }>(system, "Generate personality analysis", { temperature: 0.7 });

    if (!result) {
      return NextResponse.json({
        personalityType: "Shopping Enthusiast",
        summary: `With a twin confidence of ${user.twinConfidence}%, your shopping personality is still developing. Keep interacting to unlock deeper insights.`,
        strengths: ["Exploring new products", "Comparing options"],
        growthAreas: ["Setting clear preferences", "Building shopping habits"],
        shoppingStyle: "You're discovering your shopping style.",
        topRecommendation: "Try asking for recommendations in different categories.",
        funFact: "Every interaction helps your twin learn!",
      });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[api/digital-twin/analysis] error:", err);
    return NextResponse.json(
      { error: "Failed to generate analysis", detail: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
