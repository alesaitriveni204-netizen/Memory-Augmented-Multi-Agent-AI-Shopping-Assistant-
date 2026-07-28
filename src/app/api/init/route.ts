// GET /api/init — bootstrap the demo session
import { NextResponse } from "next/server";
import { getOrCreateDemoUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getOrCreateDemoUser();
    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        personaCluster: user.personaCluster,
        twinConfidence: user.twinConfidence,
        memoryEnabled: user.memoryEnabled,
        personalizationEnabled: user.personalizationEnabled,
        hasOnboarded: !!(user.onboarding && user.personaCluster),
      },
    });
  } catch (err: any) {
    console.error("[api/init] error:", err);
    return NextResponse.json(
      { error: "Failed to initialize session", detail: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
