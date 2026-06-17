import { createClient } from "@/lib/supabase/server";
import { createJSON } from "@/lib/anthropic";
import {
  ROADMAP_MODEL,
  MILESTONE_GEN_SYSTEM,
  MILESTONE_SCHEMA,
  milestoneContext,
} from "@/lib/roadmap/prompts";

type Turn = { role: "user" | "assistant"; content: string };
type Generated = { milestones: { description: string }[] };

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }

  const { goalId } = (await req.json().catch(() => ({}))) as { goalId?: string };
  if (!goalId) return Response.json({ error: "Missing goal." }, { status: 400 });

  const { data: artistId } = await supabase.rpc("current_artist_id");
  if (!artistId) {
    return Response.json({ error: "Artist not found." }, { status: 400 });
  }

  const { data: goal } = await supabase
    .from("goals")
    .select("id, category, description, vision_id")
    .eq("id", goalId)
    .single();
  if (!goal) return Response.json({ error: "Goal not found." }, { status: 404 });

  // Don't regenerate over an existing plan.
  const { count } = await supabase
    .from("milestones")
    .select("id", { count: "exact", head: true })
    .eq("goal_id", goalId);
  if ((count ?? 0) > 0) {
    return Response.json(
      { error: "This Goal already has Milestones." },
      { status: 409 },
    );
  }

  const { data: vision } = await supabase
    .from("visions")
    .select("statement_text")
    .eq("id", goal.vision_id)
    .single();

  const { data: transcriptRow } = await supabase
    .from("vision_builder_transcripts")
    .select("messages")
    .eq("vision_id", goal.vision_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const transcript = Array.isArray(transcriptRow?.messages)
    ? (transcriptRow.messages as unknown as Turn[])
    : [];

  let milestones: { description: string }[];
  try {
    const out = await createJSON<Generated>({
      model: ROADMAP_MODEL,
      max_tokens: 2048,
      thinking: { type: "adaptive" },
      system: MILESTONE_GEN_SYSTEM,
      messages: [
        {
          role: "user",
          content: milestoneContext({
            statement: vision?.statement_text ?? "",
            goalCategory: goal.category,
            goalDescription: goal.description,
            transcript,
            today: new Date().toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            }),
          }),
        },
      ],
      output_config: {
        format: { type: "json_schema", schema: MILESTONE_SCHEMA },
      },
    });
    milestones = (out.milestones ?? []).slice(0, 5);
  } catch (err) {
    console.error("roadmap/milestones error", err);
    return Response.json(
      { error: "We couldn't build your Milestones. Please try again." },
      { status: 500 },
    );
  }

  if (milestones.length === 0) {
    return Response.json({ error: "No Milestones generated." }, { status: 500 });
  }

  const now = new Date().toISOString();
  const { error } = await supabase.from("milestones").insert(
    milestones.map((m, i) => ({
      artist_id: artistId,
      goal_id: goalId,
      description: m.description.trim(),
      display_order: i + 1,
      is_next_milestone: i === 0,
      started_at: i === 0 ? now : null,
    })),
  );
  if (error) {
    console.error("milestones insert error", error);
    return Response.json({ error: "Could not save Milestones." }, { status: 500 });
  }

  return Response.json({ ok: true });
}
