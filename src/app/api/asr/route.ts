// POST /api/asr — transcribe audio via z-ai-web-dev-sdk ASR
// Body: { audio: "<base64-encoded audio data>" }
// Returns: { text: "<transcription>" }
import { NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let zaiInstance: ZAI | null = null;
async function getZai() {
  if (!zaiInstance) zaiInstance = await ZAI.create();
  return zaiInstance;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const audioBase64 = body?.audio;
    if (!audioBase64 || typeof audioBase64 !== "string") {
      return NextResponse.json(
        { error: "Missing 'audio' field (base64-encoded audio data)" },
        { status: 400 }
      );
    }

    const zai = await getZai();
    let response: any;
    try {
      response = await (zai as any).audio.asr.create({
        file_base64: audioBase64,
      });
    } catch (asrErr: any) {
      const msg = asrErr?.message ?? String(asrErr);
      const isRateLimit = msg.includes("429") || msg.includes("Too many requests");
      console.error("[api/asr] error:", msg);
      // Return empty text instead of 500
      return NextResponse.json({
        text: "",
        error: isRateLimit ? "Rate limited — please try again." : "Transcription failed.",
      });
    }

    const text = response?.text ?? "";
    return NextResponse.json({ text });
  } catch (err: any) {
    console.error("[api/asr] error:", err);
    return NextResponse.json({ text: "", error: err?.message ?? String(err) });
  }
}
