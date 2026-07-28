// LLM helper using z-ai-web-dev-sdk (backend only)
import ZAI from "z-ai-web-dev-sdk";

let zaiInstance: ZAI | null = null;

export async function getLLM() {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create();
  }
  return zaiInstance;
}

export interface ChatMessageLLM {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Call the LLM with a system prompt and user message.
 * Returns the assistant's text response.
 */
export async function llmChat(
  systemPrompt: string,
  userMessage: string,
  options?: { temperature?: number; thinking?: boolean }
): Promise<string> {
  try {
    const zai = await getLLM();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      thinking: { type: options?.thinking ? "enabled" : "disabled" },
      temperature: options?.temperature,
    } as any);
    return completion.choices[0]?.message?.content ?? "";
  } catch (err) {
    console.error("[LLM] chat error:", err);
    return "";
  }
}

/**
 * Call the LLM and parse a JSON object from the response.
 * Strips ```json fences and finds the first {...} block.
 */
export async function llmJson<T = any>(
  systemPrompt: string,
  userMessage: string,
  options?: { temperature?: number; thinking?: boolean }
): Promise<T | null> {
  const raw = await llmChat(systemPrompt, userMessage, options);
  if (!raw) return null;
  // Strip code fences
  let cleaned = raw.replace(/```json\s*/g, "").replace(/```/g, "").trim();
  // Find first { and last }
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first === -1 || last === -1) {
    // try array
    const fa = cleaned.indexOf("[");
    const la = cleaned.lastIndexOf("]");
    if (fa !== -1 && la !== -1) {
      cleaned = cleaned.slice(fa, la + 1);
    }
  } else {
    cleaned = cleaned.slice(first, last + 1);
  }
  try {
    return JSON.parse(cleaned) as T;
  } catch (err) {
    console.error("[LLM] JSON parse error:", err, "\nRaw:", raw);
    return null;
  }
}
