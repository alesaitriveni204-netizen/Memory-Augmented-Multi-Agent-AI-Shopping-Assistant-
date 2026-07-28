// /api/digital-twin — GET (load twin + history) + POST (actions: reset/disable/enable/update)
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateDemoUser } from "@/lib/session";
import type { DigitalTwin } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getOrCreateDemoUser();
    let twin: DigitalTwin | null = null;
    if (user.digitalTwin) {
      try {
        twin = JSON.parse(user.digitalTwin) as DigitalTwin;
      } catch {
        twin = null;
      }
    }
    const history = await db.timelineEvent.findMany({
      where: { userId: user.id, type: "twin_update" },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
    return NextResponse.json({
      twin,
      confidence: user.twinConfidence,
      personaCluster: user.personaCluster,
      personalizationEnabled: user.personalizationEnabled,
      history,
    });
  } catch (err: any) {
    console.error("[api/digital-twin GET] error:", err);
    return NextResponse.json(
      { error: "Failed to load digital twin", detail: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch (err: any) {
    return NextResponse.json(
      { error: "Invalid JSON body", detail: err?.message ?? String(err) },
      { status: 400 }
    );
  }

  const action = body?.action as "reset" | "disable" | "enable" | "update" | undefined;
  if (!action) {
    return NextResponse.json({ error: "Missing 'action' field" }, { status: 400 });
  }

  try {
    const user = await getOrCreateDemoUser();

    if (action === "reset") {
      await db.user.update({
        where: { id: user.id },
        data: {
          digitalTwin: null,
          twinConfidence: 0,
        },
      });
      // Wipe semantic + long_term memories
      await db.memory.deleteMany({
        where: { userId: user.id, type: { in: ["semantic", "long_term"] } },
      });
      await db.timelineEvent.create({
        data: {
          userId: user.id,
          type: "twin_update",
          title: "Digital Twin reset",
          description: "All semantic and long-term memories cleared. Twin confidence set to 0.",
        },
      });
      return NextResponse.json({
        success: true,
        twin: null,
        confidence: 0,
        message: "Digital Twin has been reset.",
      });
    }

    if (action === "disable") {
      const updated = await db.user.update({
        where: { id: user.id },
        data: { personalizationEnabled: false },
      });
      await db.timelineEvent.create({
        data: {
          userId: user.id,
          type: "twin_update",
          title: "Personalization disabled",
          description: "Digital Twin will no longer evolve automatically.",
        },
      });
      return NextResponse.json({
        success: true,
        personalizationEnabled: false,
      });
    }

    if (action === "enable") {
      const updated = await db.user.update({
        where: { id: user.id },
        data: { personalizationEnabled: true },
      });
      await db.timelineEvent.create({
        data: {
          userId: user.id,
          type: "twin_update",
          title: "Personalization enabled",
          description: "Digital Twin will continue evolving based on interactions.",
        },
      });
      return NextResponse.json({
        success: true,
        personalizationEnabled: true,
      });
    }

    if (action === "update") {
      const patch: Partial<DigitalTwin> | undefined = body.twin;
      if (!patch) {
        return NextResponse.json({ error: "Missing 'twin' patch object" }, { status: 400 });
      }
      let current: DigitalTwin | null = null;
      if (user.digitalTwin) {
        try {
          current = JSON.parse(user.digitalTwin) as DigitalTwin;
        } catch {
          current = null;
        }
      }
      const merged: DigitalTwin = {
        shoppingStyle: "Balanced",
        budgetFlexibility: 50,
        brandLoyalty: 50,
        priceSensitivity: 50,
        purchaseConfidence: 50,
        technologyAdoption: 50,
        impulseBuyingScore: 30,
        discountPreference: 50,
        comparisonFrequency: 50,
        shoppingConsistency: 60,
        preferredCategories: [],
        preferredBrands: [],
        preferredPlatforms: [],
        riskTolerance: "medium",
        lifestyle: "",
        ...(current ?? {}),
        ...patch,
      } as DigitalTwin;

      const newConfidence = Math.min(100, (user.twinConfidence ?? 0) + 5);
      await db.user.update({
        where: { id: user.id },
        data: {
          digitalTwin: JSON.stringify(merged),
          twinConfidence: newConfidence,
        },
      });
      await db.timelineEvent.create({
        data: {
          userId: user.id,
          type: "twin_update",
          title: "Digital Twin manually updated",
          description: "Twin profile merged with user-provided patch.",
          metadata: JSON.stringify({ patch }),
        },
      });
      return NextResponse.json({
        success: true,
        twin: merged,
        confidence: newConfidence,
      });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: any) {
    console.error("[api/digital-twin POST] error:", err);
    return NextResponse.json(
      { error: "Failed to update digital twin", detail: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
