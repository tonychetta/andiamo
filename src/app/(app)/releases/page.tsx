import { createClient } from "@/lib/supabase/server";
import { ReleasesView } from "@/components/releases/ReleasesView";
import {
  fetchProductionStatus,
  songIdFromLink,
  type ProductionState,
} from "@/lib/releases/mgmt";

export default async function ReleasesPage() {
  const supabase = await createClient();

  const [{ data: releases }, { data: tasks }] = await Promise.all([
    supabase
      .from("releases")
      .select("id, title, release_type, release_date, notes, mgmt_link")
      .order("release_date", { ascending: true }),
    supabase
      .from("release_tasks")
      .select(
        "id, release_id, description, assigned_to, phase_label, offset_days, due_date, is_completed, is_custom, display_order",
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

  // Pass the server's "today" so the countdown is deterministic (no hydration drift).
  const today = new Date().toISOString().slice(0, 10);

  return (
    <ReleasesView releases={releasesData} today={today} production={production} />
  );
}
