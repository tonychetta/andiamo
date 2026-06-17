import { createClient } from "@/lib/supabase/server";
import { createJSON } from "@/lib/anthropic";
import {
  RELEASE_MODEL,
  DAY_SUGGEST_SYSTEM,
  WEEK_SUGGEST_SYSTEM,
  LAUNCH_SCHEMA,
  dayContext,
  weekContext,
} from "@/lib/releases/prompts";

type Ideas = { ideas: { description: string; reason: string }[] };

// Suggests Release Day or Release Week ideas and RETURNS them — the artist
// picks which to keep, so nothing is inserted here.
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }

  const { releaseId, kind } = (await req.json().catch(() => ({}))) as {
    releaseId?: string;
    kind?: "day" | "week";
  };
  if (!releaseId || (kind !== "day" && kind !== "week")) {
    return Response.json({ error: "Bad request." }, { status: 400 });
  }

  const { data: release } = await supabase
    .from("releases")
    .select("title, release_type, notes")
    .eq("id", releaseId)
    .single();
  if (!release) {
    return Response.json({ error: "Release not found." }, { status: 404 });
  }

  const { data: vision } = await supabase
    .from("visions")
    .select("id, statement_text")
    .eq("is_current", true)
    .maybeSingle();

  const { data: goals } = await supabase
    .from("goals")
    .select("category, description")
    .eq("vision_id", vision?.id ?? "");

  const build = kind === "day" ? dayContext : weekContext;
  const content = build({
    statement: vision?.statement_text ?? "",
    goals: goals ?? [],
    title: release.title,
    type: release.release_type,
    notes: release.notes,
  });

  try {
    const out = await createJSON<Ideas>({
      model: RELEASE_MODEL,
      max_tokens: 1536,
      system: kind === "day" ? DAY_SUGGEST_SYSTEM : WEEK_SUGGEST_SYSTEM,
      messages: [{ role: "user", content }],
      output_config: { format: { type: "json_schema", schema: LAUNCH_SCHEMA } },
    });
    const ideas = (out.ideas ?? []).slice(0, kind === "week" ? 7 : 7);
    return Response.json({ ideas });
  } catch (err) {
    console.error("releases/launch-ideas error", err);
    return Response.json(
      { error: "We couldn't suggest ideas right now. Try again." },
      { status: 500 },
    );
  }
}
