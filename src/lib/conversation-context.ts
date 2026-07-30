// Conversation context resolver — expands pronouns and references in user messages
// using recent chat history. e.g., "compare it with X" → "compare <last product> with X"

import { llmJson } from "@/lib/llm";
import { db } from "@/lib/db";

interface ChatHistoryItem {
  role: string;
  content: string;
  metadata?: string | null;
}

/**
 * Resolves conversational references in the user's message using recent chat history.
 * e.g., "compare it with Dell" → "Compare Lenovo IdeaPad Gaming 3 with Dell"
 */
export async function resolveConversationContext(
  userId: string,
  message: string
): Promise<{ resolved: string; wasResolved: boolean; referencedProduct?: string }> {
  // Only resolve if the message contains pronouns or vague references
  const lowerMsg = message.toLowerCase();
  const needsResolution = /\b(it|this|that|the same|the previous|the last|compare it|track it|add it)\b/.test(lowerMsg);

  if (!needsResolution) {
    return { resolved: message, wasResolved: false };
  }

  // Fetch last 6 chat messages for context
  const recentMessages = await db.chatMessage.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 6,
  });

  // Reverse to chronological order
  const history = recentMessages.reverse();

  if (history.length === 0) {
    return { resolved: message, wasResolved: false };
  }

  // Extract product names from assistant messages with recommendations
  const mentionedProducts: string[] = [];
  for (const msg of history) {
    if (msg.role === "assistant" && msg.metadata) {
      try {
        const meta = JSON.parse(msg.metadata);
        if (meta.recommendations && Array.isArray(meta.recommendations)) {
          for (const rec of meta.recommendations.slice(0, 3)) {
            if (rec.name) mentionedProducts.push(rec.name);
          }
        }
      } catch {}
    }
    // Also extract product names from user messages
    if (msg.role === "user") {
      // Look for product-like patterns (capitalized words)
      const productMatch = msg.content.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z0-9]+)+)\b/g);
      if (productMatch) mentionedProducts.push(...productMatch.slice(0, 2));
    }
  }

  if (mentionedProducts.length === 0) {
    return { resolved: message, wasResolved: false };
  }

  // Use LLM to resolve the reference
  const system = `You are a conversation context resolver. The user's message contains a pronoun or reference that needs to be resolved using the conversation history.

Recent conversation history (chronological):
${history.map((m) => `${m.role}: ${m.content.slice(0, 200)}`).join("\n")}

Recently mentioned products: ${mentionedProducts.join(", ")}

User's current message: "${message}"

If the message contains a pronoun (it, this, that) or reference (the same, the previous) that refers to a product from the conversation, replace it with the actual product name.

Return STRICT JSON:
{
  "resolved": "<the message with references resolved, or the original if no resolution needed>",
  "wasResolved": <true if you changed the message, false otherwise>,
  "referencedProduct": "<the product name that was referenced, or null>"
}

Rules:
- Only resolve if you're confident about the reference
- Keep the original meaning intact
- If ambiguous, return the original message unchanged
Return ONLY the JSON.`;

  const result = await llmJson<{ resolved: string; wasResolved: boolean; referencedProduct?: string }>(
    system,
    "Resolve reference",
    { temperature: 0.2 }
  );

  if (!result || !result.resolved) {
    return { resolved: message, wasResolved: false };
  }

  return {
    resolved: result.resolved,
    wasResolved: result.wasResolved,
    referencedProduct: result.referencedProduct,
  };
}
