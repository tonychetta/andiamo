import { createClient } from "@/lib/supabase/server";
import { createText, toApiMessages, type ChatTurn } from "@/lib/anthropic";
import { VISION_MODEL, conversationSystemPrompt } from "@/lib/vision/prompts";

const READY_TOKEN = "<<READY>>";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const turns = (body?.messages ?? []) as ChatTurn[];
  const apiMessages = toApiMessages(turns);
  if (apiMessages.length === 0) {
    return Response.json({ error: "No message." }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", userId)
    .single();

  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  try {
    const raw = await createText({
      model: VISION_MODEL,
      max_tokens: 1024,
      system: conversationSystemPrompt(profile?.name?.trim() ?? "", today),
      messages: apiMessages,
    });

    const ready = raw.includes(READY_TOKEN);
    // Strip the readiness marker and any stray leading punctuation/whitespace.
    const message = raw
      .split(READY_TOKEN)
      .join("")
      .replace(/^[\s.]+/, "")
      .trim();

    if (!message) {
      return Response.json(
        { error: "We're having trouble right now. Try again in a moment." },
        { status: 500 },
      );
    }
    return Response.json({ message, ready });
  } catch (err) {
    console.error("vision/chat error", err);
    return Response.json(
      { error: "We're having trouble right now. Try again in a moment." },
      { status: 500 },
    );
  }
}
