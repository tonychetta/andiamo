import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ReleasesView } from "@/components/releases/ReleasesView";
import {
  fetchProductionStatus,
  songIdFromLink,
  type ProductionState,
} from "@/lib/releases/mgmt";
import {
  defaultEditableTemplate,
  type EditablePhase,
} from "@/lib/releases/templates";

export default async function ReleasesPage() {
  const supabase = await createClient();

  const [{ data: releases }, { data: tasks }] = await Promise.all([
    supabase
      .from("releases")
      .select(
        "id, title, release_type, release_date, notes, mgmt_link, parent_release_id",
      )
      .order("release_date", { ascending: true }),
    supabase
      .from("release_tasks")
      .select(
        "id, release_id, description, assigned_to, assigned_coach_id, phase_group, phase_label, week_title, offset_days, due_date, is_completed, is_custom, display_order",
      )
      .order("offset_days", { ascending: true })
      .order("display_order", { ascending: true }),
  ]);

  type TaskRow = NonNullable<typeof tasks>[number];
  const byRelease = new Map<string, TaskRow[]>();
  for (const t of tasks ?? []) {
    const list = byRelease.get(t.release_id) ?? [];
    list.push(t);
    byRelease.set(t.release_id, list);
  }

  const releasesData = (releases ?? []).map((r) => ({
    ...r,
    tasks: byRelease.get(r.id) ?? [],
  }));

  // Live production status from the MGMT app, for singles that have a song link.
  const production: Record<string, ProductionState> = {};
  const linkedSingles = releasesData.filter(
    (r) => r.release_type === "single" && r.mgmt_link,
  );
  const statuses = await Promise.all(
    linkedSingles.map(async (r) => {
      const songId = songIdFromLink(r.mgmt_link);
      return [r.id, songId ? await fetchProductionStatus(songId) : null] as const;
    }),
  );
  for (const [id, state] of statuses) if (state) production[id] = state;

  // Editable templates: the artist's customized version if any, else the default.
  const { data: customTemplates } = await supabase
    .from("release_templates")
    .select("template_type, phases");
  const customByType = new Map(
    (customTemplates ?? []).map((t) => [t.template_type, t.phases]),
  );
  const asPhases = (
    type: "single" | "project",
  ): EditablePhase[] => {
    const c = customByType.get(type);
    return c && Array.isArray(c) && c.length
      ? (c as unknown as EditablePhase[])
      : defaultEditableTemplate(type);
  };
  const templates = {
    single: asPhases("single"),
    project: asPhases("project"),
    singleCustom: customByType.has("single"),
    projectCustom: customByType.has("project"),
  };

  // Pass the server's "today" so the countdown is deterministic (no hydration drift).
  const today = new Date().toISOString().slice(0, 10);

  // The artist + their coaches, for assigning release tasks (DWY). Looked up via
  // admin so it works whether the artist or a coach is viewing.
  const { data: aid } = await supabase.rpc("current_artist_id");
  let artistName = "Artist";
  let coaches: { id: string; name: string }[] = [];
  if (aid) {
    const admin = createAdminClient();
    const [{ data: artistRow }, { data: links }] = await Promise.all([
      admin.from("artists").select("artist_name").eq("id", aid).maybeSingle(),
      admin
        .from("artist_coaches")
        .select("coaches(id, user_id)")
        .eq("artist_id", aid),
    ]);
    artistName = artistRow?.artist_name?.trim() || "Artist";
    const rows = (links ?? [])
      .map((l) => l.coaches as { id: string; user_id: string } | null)
      .filter(Boolean) as { id: string; user_id: string }[];
    if (rows.length) {
      const { data: profs } = await admin
        .from("profiles")
        .select("id, name")
        .in(
          "id",
          rows.map((r) => r.user_id),
        );
      const nameByUser = new Map(
        (profs ?? []).map((p) => [p.id, p.name?.trim() || "Coach"]),
      );
      coaches = rows.map((r) => ({
        id: r.id,
        name: nameByUser.get(r.user_id) ?? "Coach",
      }));
    }
  }

  return (
    <ReleasesView
      releases={releasesData}
      today={today}
      production={production}
      templates={templates}
      coaches={coaches}
      artistName={artistName}
    />
  );
}
