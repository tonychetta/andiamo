"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  defaultEditableTemplate,
  type EditablePhase,
} from "@/lib/releases/templates";

// RLS guarantees every mutation here only touches the signed-in artist's rows.

async function artistId() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("current_artist_id");
  return { supabase, artistId: data as string | null };
}

// Date-only math, UTC-anchored so a task never drifts a day across timezones.
function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const base = Date.UTC(y, m - 1, d);
  const shifted = new Date(base + days * 86_400_000);
  return shifted.toISOString().slice(0, 10);
}

// ---------- Releases ----------

// Create a release and expand the matching strategy template into dated tasks.
export async function addRelease(input: {
  title: string;
  releaseDate: string; // YYYY-MM-DD
  releaseType: "single" | "project";
  notes?: string;
  mgmtLink?: string; // MGMT song code or link (optional)
  parentReleaseId?: string; // set when this single is linked to a project
}): Promise<string | undefined> {
  const title = input.title.trim();
  if (!title || !input.releaseDate) return;
  const { supabase, artistId: aid } = await artistId();
  if (!aid) return;

  const { data: release, error } = await supabase
    .from("releases")
    .insert({
      artist_id: aid,
      title,
      release_type: input.releaseType,
      release_date: input.releaseDate,
      notes: input.notes?.trim() || null,
      mgmt_link: input.mgmtLink?.trim() || null,
      parent_release_id: input.parentReleaseId ?? null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  // Expand the artist's template (their customized one if any, else the default)
  // into dated tasks. Tasks are created UNASSIGNED — assigning artist vs producer
  // is a manual, DWY-only step, never auto-applied here.
  const { data: custom } = await supabase
    .from("release_templates")
    .select("phases")
    .eq("artist_id", aid)
    .eq("template_type", input.releaseType)
    .maybeSingle();
  const phases =
    custom?.phases && Array.isArray(custom.phases) && custom.phases.length
      ? (custom.phases as unknown as EditablePhase[])
      : defaultEditableTemplate(input.releaseType);

  const rows: {
    artist_id: string;
    release_id: string;
    description: string;
    phase_label: string;
    offset_days: number;
    due_date: string;
    display_order: number;
  }[] = [];
  let order = 0;
  for (const phase of phases) {
    for (const description of phase.tasks) {
      if (!description?.trim()) continue;
      rows.push({
        artist_id: aid,
        release_id: release.id,
        description: description.trim(),
        phase_label: phase.label,
        offset_days: phase.offsetDays,
        due_date: addDays(input.releaseDate, phase.offsetDays),
        display_order: order++,
      });
    }
  }
  if (rows.length) {
    const { error: taskErr } = await supabase.from("release_tasks").insert(rows);
    if (taskErr) throw new Error(taskErr.message);
  }
  revalidatePath("/releases");
  return release.id;
}

export async function updateReleaseDetails(
  releaseId: string,
  input: { title?: string; notes?: string; mgmtLink?: string },
) {
  const supabase = await createClient();
  const patch: {
    title?: string;
    notes?: string | null;
    mgmt_link?: string | null;
  } = {};
  if (input.title !== undefined) patch.title = input.title.trim();
  if (input.notes !== undefined) patch.notes = input.notes.trim() || null;
  if (input.mgmtLink !== undefined)
    patch.mgmt_link = input.mgmtLink.trim() || null;
  const { error } = await supabase
    .from("releases")
    .update(patch)
    .eq("id", releaseId);
  if (error) throw new Error(error.message);
  revalidatePath("/releases");
}

// Move the release date: every task's date shifts by its stored offset.
// Completed tasks keep their status; custom text is untouched — only dates move.
export async function changeReleaseDate(releaseId: string, newDate: string) {
  if (!newDate) return;
  const supabase = await createClient();
  const { error: relErr } = await supabase
    .from("releases")
    .update({ release_date: newDate })
    .eq("id", releaseId);
  if (relErr) throw new Error(relErr.message);

  const { data: tasks } = await supabase
    .from("release_tasks")
    .select("id, offset_days")
    .eq("release_id", releaseId);
  for (const task of tasks ?? []) {
    const { error } = await supabase
      .from("release_tasks")
      .update({ due_date: addDays(newDate, task.offset_days) })
      .eq("id", task.id);
    if (error) throw new Error(error.message);
  }
  revalidatePath("/releases");
}

export async function deleteRelease(releaseId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("releases").delete().eq("id", releaseId);
  if (error) throw new Error(error.message);
  revalidatePath("/releases");
}

// ---------- Release tasks ----------

export async function toggleReleaseTask(taskId: string, completed: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("release_tasks")
    .update({
      is_completed: completed,
      completed_at: completed ? new Date().toISOString() : null,
    })
    .eq("id", taskId);
  if (error) throw new Error(error.message);
  revalidatePath("/releases");
}

export async function updateReleaseTask(taskId: string, description: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("release_tasks")
    .update({ description: description.trim() })
    .eq("id", taskId);
  if (error) throw new Error(error.message);
  revalidatePath("/releases");
}

// Add a custom task into a specific phase (so it lands in the right timeline
// section and shares that phase's date). offsetDays/phaseLabel come from the
// phase the artist tapped "+ Add task" under.
export async function addReleaseTask(
  releaseId: string,
  description: string,
  phaseLabel: string,
  offsetDays: number,
) {
  const text = description.trim();
  if (!text) return;
  const { supabase, artistId: aid } = await artistId();
  if (!aid) return;
  const { data: release } = await supabase
    .from("releases")
    .select("release_date")
    .eq("id", releaseId)
    .single();
  if (!release) return;
  const { error } = await supabase.from("release_tasks").insert({
    artist_id: aid,
    release_id: releaseId,
    description: text,
    phase_label: phaseLabel,
    offset_days: offsetDays,
    due_date: addDays(release.release_date, offsetDays),
    is_custom: true,
    // High order so a custom task appends to the END of its phase group.
    display_order: 100000,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/releases");
}

// Accept AI-suggested Release Day or Release Week ideas into the schedule.
// 'day' lands on release day; 'week' spreads one idea per day (Day 1 = release
// day) so the cadence reads down the timeline.
export async function addLaunchTasks(
  releaseId: string,
  kind: "day" | "week",
  descriptions: string[],
) {
  const clean = descriptions.map((d) => d.trim()).filter(Boolean);
  if (!clean.length) return;
  const { supabase, artistId: aid } = await artistId();
  if (!aid) return;
  const { data: release } = await supabase
    .from("releases")
    .select("release_date, release_type")
    .eq("id", releaseId)
    .single();
  if (!release) return;

  if (kind === "day") {
    const label =
      release.release_type === "project" ? "Project Release Day" : "Release Day";
    // Clear the "See Release Day Template" placeholder once real ideas land.
    await supabase
      .from("release_tasks")
      .delete()
      .eq("release_id", releaseId)
      .eq("offset_days", 0)
      .eq("description", "See Release Day Template");
    const rows = clean.map((d, i) => ({
      artist_id: aid,
      release_id: releaseId,
      description: d,
      phase_label: label,
      offset_days: 0,
      due_date: release.release_date,
      is_custom: true,
      display_order: 100000 + i,
    }));
    const { error } = await supabase.from("release_tasks").insert(rows);
    if (error) throw new Error(error.message);
  } else {
    const rows = clean.map((d, i) => ({
      artist_id: aid,
      release_id: releaseId,
      description: d,
      phase_label: "Release Week",
      offset_days: i, // Day 1 = release day, Day 2 = +1, …
      due_date: addDays(release.release_date, i),
      is_custom: true,
      display_order: 200000 + i,
    }));
    const { error } = await supabase.from("release_tasks").insert(rows);
    if (error) throw new Error(error.message);
  }
  revalidatePath("/releases");
}

export async function deleteReleaseTask(taskId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("release_tasks")
    .delete()
    .eq("id", taskId);
  if (error) throw new Error(error.message);
  revalidatePath("/releases");
}

// ---------- Master templates (Section 11.7) ----------

// Save the artist's customized template for a type. Only affects FUTURE releases
// — releases already created keep their materialized tasks.
export async function saveTemplate(
  templateType: "single" | "project",
  phases: EditablePhase[],
) {
  const { supabase, artistId: aid } = await artistId();
  if (!aid) return;
  const clean: EditablePhase[] = phases.map((p) => ({
    label: p.label,
    offsetDays: p.offsetDays,
    tasks: p.tasks.map((t) => t.trim()).filter(Boolean),
  }));
  const { error } = await supabase.from("release_templates").upsert(
    {
      artist_id: aid,
      template_type: templateType,
      phases: clean as unknown as never,
    },
    { onConflict: "artist_id,template_type" },
  );
  if (error) throw new Error(error.message);
  revalidatePath("/releases");
}

// Revert to the canonical default by removing the artist's customization.
export async function resetTemplate(templateType: "single" | "project") {
  const { supabase, artistId: aid } = await artistId();
  if (!aid) return;
  const { error } = await supabase
    .from("release_templates")
    .delete()
    .eq("artist_id", aid)
    .eq("template_type", templateType);
  if (error) throw new Error(error.message);
  revalidatePath("/releases");
}
