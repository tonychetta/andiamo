import { createClient } from "@/lib/supabase/server";
import { createJSON, toApiMessages, type ChatTurn } from "@/lib/anthropic";
import {
  VISION_MODEL,
  GENERATION_SYSTEM_PROMPT,
  GENERATION_SCHEMA,
} from "@/lib/vision/prompts";
import type { Database } from "@/lib/supabase/database.types";

type GoalCategory = Database["public"]["Enums"]["goal_category"];
type GeneratedVision = {
  statement: string;
  goals: { category: GoalCategory; description: string }[];
};

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const turns = (body?.messages ?? []) as ChatTurn[];

  const { data: artist } = await supabase
    .from("artists")
    .select("id")
    .eq("user_id", userId)
    .single();
  if (!artist) {
    return Response.json({ error: "Artist profile not found." }, { status: 400 });
  }

  let generated: GeneratedVision;
  try {
    generated = await createJSON<GeneratedVision>({
      model: VISION_MODEL,
      max_tokens: 2048,
      thinking: { type: "adaptive" },
      system: GENERATION_SYSTEM_PROMPT,
      messages: [
        ...toApiMessages(turns),
        {
          role: "user",
          content:
            "Generate my Vision Statement and 3 Goals now, based on everything I've shared.",
        },
      ],
      output_config: {
        format: { type: "json_schema", schema: GENERATION_SCHEMA },
      },
    });
  } catch (err) {
    console.error("vision/create generation error", err);
    return Response.json(
      { error: "We couldn't build your Vision just now. Please try again." },
      { status: 500 },
    );
  }

  const goals = (generated.goals ?? []).slice(0, 3);
  if (!generated.statement || goals.length === 0) {
    return Response.json(
      { error: "The Vision came back incomplete. Please try again." },
      { status: 500 },
    );
  }

  // Versioning: retire the previous current Vision, bump the version number.
  const { data: latest } = await supabase
    .from("visions")
    .select("version")
    .eq("artist_id", artist.id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextVersion = (latest?.version ?? 0) + 1;

  await supabase
    .from("visions")
    .update({ is_current: false })
    .eq("artist_id", artist.id)
    .eq("is_current", true);

  const { data: vision, error: visionErr } = await supabase
    .from("visions")
    .insert({
      artist_id: artist.id,
      version: nextVersion,
      is_current: true,
      statement_text: generated.statement.trim(),
    })
    .select("id")
    .single();

  if (visionErr || !vision) {
    console.error("vision insert error", visionErr);
    return Response.json({ error: "Could not save your Vision." }, { status: 500 });
  }

  const { error: goalsErr } = await supabase.from("goals").insert(
    goals.map((g, i) => ({
      artist_id: artist.id,
      vision_id: vision.id,
      category: g.category,
      description: g.description.trim(),
      display_order: i + 1,
    })),
  );
  if (goalsErr) {
    console.error("goals insert error", goalsErr);
  }

  await supabase.from("vision_builder_transcripts").insert({
    artist_id: artist.id,
    vision_id: vision.id,
    messages: turns as unknown as Database["public"]["Tables"]["vision_builder_transcripts"]["Insert"]["messages"],
  });

  return Response.json({ ok: true });
}
