import Anthropic from "@anthropic-ai/sdk";

// Reads ANTHROPIC_API_KEY from the environment. Server-only — never import
// this into a Client Component. maxRetries absorbs transient 429/529 overloads.
export const anthropic = new Anthropic({ maxRetries: 4 });

// Pull the JSON text out of a structured-output response and parse it.
export function parseStructured<T>(message: Anthropic.Message): T {
  const block = message.content.find((b) => b.type === "text");
  const text = block && block.type === "text" ? block.text : "";
  return JSON.parse(text) as T;
}

// Call the model and parse its structured JSON output, retrying once if the
// model produces a truncated/invalid response (occasional with generative JSON).
export async function createJSON<T>(
  params: Anthropic.MessageCreateParamsNonStreaming,
  attempts = 2,
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    const message = await anthropic.messages.create(params);
    try {
      return parseStructured<T>(message);
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}

// Call the model for a plain-text reply, retrying once if it comes back empty.
export async function createText(
  params: Anthropic.MessageCreateParamsNonStreaming,
  attempts = 2,
): Promise<string> {
  let text = "";
  for (let i = 0; i < attempts; i++) {
    const message = await anthropic.messages.create(params);
    const block = message.content.find((b) => b.type === "text");
    text = block && block.type === "text" ? block.text : "";
    if (text.trim()) return text;
  }
  return text;
}

// The conversation shape we pass around (artist/builder turns).
export type ChatTurn = { role: "user" | "assistant"; content: string };

// Anthropic requires the first message to be a user turn. The client keeps the
// locked opening message as a display-only assistant turn at index 0; strip any
// leading assistant turns before sending to the API.
export function toApiMessages(turns: ChatTurn[]): ChatTurn[] {
  let i = 0;
  while (i < turns.length && turns[i].role !== "user") i++;
  return turns.slice(i).map((t) => ({ role: t.role, content: t.content }));
}
