import { createClient } from "@/lib/supabase/server";
import { createJSON } from "@/lib/anthropic";
import {
  ROADMAP_MODEL,
  TASK_SUGGEST_SYSTEM,
  TASK_SCHEMA,
  taskContext,
} from "@/lib/roadmap/prompts";

type Turn = { role: "user" | "assistant"; content: string };
type Suggested = { tasks: { description: string; reason: string }[] };

// Suggests Tasks for a Milestone and RETURNS them — the artist picks which to
// add, so nothing is inserted here.
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }

  const { milestoneId } = (await req.json().catch(() => ({}))) as {
    milestoneId?: string;
  };
  if (!milestoneId) {
    return Response.json({ error: "Missing milestone." }, { status: 400 });
  }

  const { data: milestone } = await supabase
    .from("milestones")
    .select("id, description, goal_id")
    .eq("id", milestoneId)
    .single();
  if (!milestone) {
    return Response.json({ error: "Milestone not found." }, { status: 404 });
  }

  const { data: goal } = await supabase
    .from("goals")
    .select("description, vision_id")
    .eq("id", milestone.goal_id)
    .single();

  const { data: vision } = await supabase
    .from("visions")
    .select("statement_text")
    .eq("id", goal?.vision_id ?? "")
    .maybeSingle();

  const { data: transcriptRow } = await supabase
    .from("vision_builder_transcripts")
    .select("messages")
    .eq("vision_id", goal?.vision_id ?? "")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const transcript = Array.isArray(transcriptRow?.messages)
    ? (transcriptRow.messages as unknown as Turn[])
    : [];

  try {
    const out = await createJSON<Suggested>({
      model: ROADMAP_MODEL,
      max_tokens: 1536,
      system: TASK_SUGGEST_SYSTEM,
      messages: [
        {
          role: "user",
          content: taskContext({
            statement: vision?.statement_text ?? "",
            goalDescription: goal?.description ?? "",
            milestoneDescription: milestone.description,
            transcript,
            today: new Date().toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            }),
          }),
        },
      ],
      output_config: { format: { type: "json_schema", schema: TASK_SCHEMA } },
    });
    return Response.json({ tasks: (out.tasks ?? []).slice(0, 7) });
  } catch (err) {
    console.error("roadmap/tasks error", err);
    return Response.json(
      { error: "We couldn't suggest Tasks right now. Try again." },
      { status: 500 },
    );
  }
}
