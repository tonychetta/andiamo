import { createClient } from "@/lib/supabase/server";
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
        "id, release_id, description, assigned_to, phase_group, phase_label, week_title, offset_days, due_date, is_completed, is_custom, display_order",
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

  return (
    <ReleasesView
      releases={releasesData}
      today={today}
      production={production}
      templates={templates}
    />
  );
}
