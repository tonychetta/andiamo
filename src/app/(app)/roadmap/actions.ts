"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { weekBounds } from "@/lib/wtf/compile";

// RLS guarantees every mutation here only touches the signed-in artist's rows.

async function artistId() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("current_artist_id");
  return { supabase, artistId: data as string | null };
}

// The Sunday-anchored start of the current week (WTF weeks are week-scoped).
function thisWeekStart(): string {
  return weekBounds(new Date().toISOString().slice(0, 10)).start;
}
function addDaysStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) + days * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

// ---------- Tasks ----------

export async function addTask(milestoneId: string, description: string) {
  const text = description.trim();
  if (!text) return;
  const { supabase, artistId: aid } = await artistId();
  if (!aid) return;
  const { count } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("milestone_id", milestoneId);
  const { error } = await supabase.from("tasks").insert({
    artist_id: aid,
    milestone_id: milestoneId,
    description: text,
    display_order: (count ?? 0) + 1,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/roadmap");
}

export async function addSuggestedTasks(
  milestoneId: string,
  descriptions: string[],
) {
  const clean = descriptions.map((d) => d.trim()).filter(Boolean);
  if (clean.length === 0) return;
  const { supabase, artistId: aid } = await artistId();
  if (!aid) return;
  const { count } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("milestone_id", milestoneId);
  const base = count ?? 0;
  const { error } = await supabase.from("tasks").insert(
    clean.map((d, i) => ({
      artist_id: aid,
      milestone_id: milestoneId,
      description: d,
      display_order: base + i + 1,
    })),
  );
  if (error) throw new Error(error.message);
  revalidatePath("/roadmap");
}

export async function updateTask(taskId: string, description: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({ description: description.trim() })
    .eq("id", taskId);
  if (error) throw new Error(error.message);
  revalidatePath("/roadmap");
}

export async function toggleTask(taskId: string, completed: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({
      is_completed: completed,
      completed_at: completed ? new Date().toISOString() : null,
    })
    .eq("id", taskId);
  if (error) throw new Error(error.message);
  revalidatePath("/roadmap");
}

export async function deleteTask(taskId: string) {
  const { supabase, artistId: aid } = await artistId();
  if (!aid) return;
  // Log milestone tasks before deleting so the Recap can show what "wasn't
  // useful" for that milestone. (Orphan tasks with no milestone aren't logged.)
  const { data: task } = await supabase
    .from("tasks")
    .select("milestone_id, description")
    .eq("id", taskId)
    .single();
  if (task?.milestone_id) {
    await supabase.from("deleted_tasks").insert({
      artist_id: aid,
      milestone_id: task.milestone_id,
      description: task.description,
    });
  }
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) throw new Error(error.message);
  revalidatePath("/roadmap");
}

export async function setTaskStatus(
  taskId: string,
  status: "completed" | "pushed" | "complete_and_push",
) {
  const supabase = await createClient();
  const done = status === "completed" || status === "complete_and_push";
  // Read current history counters so we can bump them (drives the Recap buckets).
  const { data: cur } = await supabase
    .from("tasks")
    .select("push_count, cp_count")
    .eq("id", taskId)
    .single();
  const update: {
    status: typeof status;
    is_completed: boolean;
    completed_at: string | null;
    is_recurring?: boolean;
    push_count?: number;
    cp_count?: number;
    on_wtf?: boolean;
    wtf_week?: string;
  } = {
    status,
    is_completed: done,
    completed_at: done ? new Date().toISOString() : null,
  };
  // Pushed and recurring tasks carry into next week's WTF; everything else
  // stays on the week it was worked (completed tasks just drop off next week).
  const nextWeek = addDaysStr(thisWeekStart(), 7);
  if (status === "pushed") {
    update.push_count = (cur?.push_count ?? 0) + 1;
    update.on_wtf = true;
    update.wtf_week = nextWeek;
  }
  if (status === "complete_and_push") {
    update.is_recurring = true;
    update.cp_count = (cur?.cp_count ?? 0) + 1;
    update.on_wtf = true;
    update.wtf_week = nextWeek;
  }
  const { error } = await supabase.from("tasks").update(update).eq("id", taskId);
  if (error) throw new Error(error.message);
  revalidatePath("/roadmap");
}

// Promote a Task into the new Next Milestone (when it's bigger than expected and
// needs to be tackled first), then remove it from the current Milestone's list.
export async function promoteTaskToMilestone(taskId: string) {
  const { supabase, artistId: aid } = await artistId();
  if (!aid) return;

  const { data: task } = await supabase
    .from("tasks")
    .select("description, milestone_id")
    .eq("id", taskId)
    .single();
  if (!task?.milestone_id) return;

  const { data: ms } = await supabase
    .from("milestones")
    .select("goal_id")
    .eq("id", task.milestone_id)
    .single();
  if (!ms) return;

  const { data: first } = await supabase
    .from("milestones")
    .select("display_order")
    .eq("goal_id", ms.goal_id)
    .order("display_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  await supabase
    .from("milestones")
    .update({ is_next_milestone: false })
    .eq("goal_id", ms.goal_id);
  await supabase.from("milestones").insert({
    artist_id: aid,
    goal_id: ms.goal_id,
    description: task.description,
    display_order: (first?.display_order ?? 1) - 1,
    is_next_milestone: true,
    started_at: new Date().toISOString(),
  });
  await supabase.from("tasks").delete().eq("id", taskId);
  revalidatePath("/roadmap");
}

// ---------- Milestones ----------

// A manually added Milestone becomes the new NEXT Milestone — the idea is that
// the current Next isn't broken down enough, so you insert a nearer step.
export async function addMilestone(goalId: string, description: string) {
  const text = description.trim();
  if (!text) return;
  const { supabase, artistId: aid } = await artistId();
  if (!aid) return;
  const { data: first } = await supabase
    .from("milestones")
    .select("display_order")
    .eq("goal_id", goalId)
    .order("display_order", { ascending: true })
    .limit(1)
    .maybeSingle();
  // Clear the previous "next" flag, then insert this one ahead of everything.
  await supabase
    .from("milestones")
    .update({ is_next_milestone: false })
    .eq("goal_id", goalId);
  const { error } = await supabase.from("milestones").insert({
    artist_id: aid,
    goal_id: goalId,
    description: text,
    display_order: (first?.display_order ?? 1) - 1,
    is_next_milestone: true,
    started_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/roadmap");
}

export async function updateMilestone(milestoneId: string, description: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("milestones")
    .update({ description: description.trim() })
    .eq("id", milestoneId);
  if (error) throw new Error(error.message);
  revalidatePath("/roadmap");
}

// ---------- Milestone Recap ----------

export type RecapConsistency = { description: string; count: number };
export type MilestoneRecap = {
  milestoneId: string;
  title: string;
  startedAt: string | null;
  completedAt: string;
  days: number | null;
  taskCount: number;
  easyWins: string[]; // completed first try (no pushes)
  notUseful: string[]; // deleted
  difficulties: string[]; // pushed at least once, then completed
  consistency: RecapConsistency[]; // completed-and-pushed (recurring cadence)
  next: { id: string; description: string } | null;
};

// Mark a milestone achieved, sort its task history into the Recap buckets, and
// hand the "Next" flag to the nearest remaining milestone in the goal.
export async function completeMilestone(
  milestoneId: string,
): Promise<MilestoneRecap | null> {
  const { supabase, artistId: aid } = await artistId();
  if (!aid) return null;

  const { data: m } = await supabase
    .from("milestones")
    .select("id, description, goal_id, started_at")
    .eq("id", milestoneId)
    .single();
  if (!m) return null;

  const [{ data: tasks }, { data: deleted }] = await Promise.all([
    supabase
      .from("tasks")
      .select("description, is_completed, push_count, cp_count")
      .eq("milestone_id", milestoneId),
    supabase
      .from("deleted_tasks")
      .select("description")
      .eq("milestone_id", milestoneId)
      .order("deleted_at", { ascending: true }),
  ]);

  const easyWins: string[] = [];
  const difficulties: string[] = [];
  const consistency: RecapConsistency[] = [];
  for (const t of tasks ?? []) {
    if ((t.cp_count ?? 0) >= 1) {
      consistency.push({ description: t.description, count: t.cp_count ?? 0 });
    } else if (t.is_completed && (t.push_count ?? 0) === 0) {
      easyWins.push(t.description);
    } else if (t.is_completed && (t.push_count ?? 0) >= 1) {
      difficulties.push(t.description);
    }
    // Untouched / still-open tasks have no journey to recap — omitted.
  }
  const notUseful = (deleted ?? []).map((d) => d.description);

  const completedAt = new Date().toISOString();
  const days = m.started_at
    ? Math.max(
        0,
        Math.round(
          (Date.parse(completedAt) - Date.parse(m.started_at)) / 86_400_000,
        ),
      )
    : null;
  const taskCount = (tasks ?? []).length + notUseful.length;

  await supabase
    .from("milestones")
    .update({
      is_completed: true,
      completed_at: completedAt,
      is_next_milestone: false,
    })
    .eq("id", milestoneId);

  // Promote the nearest remaining milestone in this goal to Next.
  const { data: nxt } = await supabase
    .from("milestones")
    .select("id, description, started_at")
    .eq("goal_id", m.goal_id)
    .eq("is_completed", false)
    .order("display_order", { ascending: true })
    .limit(1)
    .maybeSingle();
  let next: MilestoneRecap["next"] = null;
  if (nxt) {
    await supabase
      .from("milestones")
      .update({
        is_next_milestone: true,
        started_at: nxt.started_at ?? completedAt,
      })
      .eq("id", nxt.id);
    next = { id: nxt.id, description: nxt.description };
  }

  revalidatePath("/roadmap");
  return {
    milestoneId,
    title: m.description,
    startedAt: m.started_at,
    completedAt,
    days,
    taskCount,
    easyWins,
    notUseful,
    difficulties,
    consistency,
    next,
  };
}

export async function deleteMilestone(milestoneId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("milestones")
    .delete()
    .eq("id", milestoneId);
  if (error) throw new Error(error.message);
  revalidatePath("/roadmap");
}

// Persist a new Milestone order. orderedIds is nearest-first: index 0 is the
// new Next Milestone (number 1), increasing as you go back in the stack.
export async function reorderMilestones(
  _goalId: string,
  orderedIds: string[],
) {
  const supabase = await createClient();
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from("milestones")
      .update({ display_order: i, is_next_milestone: i === 0 })
      .eq("id", orderedIds[i]);
    if (error) throw new Error(error.message);
  }
  revalidatePath("/roadmap");
}

// ---------- Weekly Task Form (WTF) ----------

// Swipe a Milestone Task onto (or off of) the current week's WTF.
export async function setTaskOnWtf(taskId: string, on: boolean) {
  const supabase = await createClient();
  // Adding a task stamps it for the CURRENT week; removing clears the stamp.
  const patch = on
    ? { on_wtf: true, wtf_week: thisWeekStart() }
    : { on_wtf: false, wtf_priority: false, wtf_week: null };
  const { error } = await supabase.from("tasks").update(patch).eq("id", taskId);
  if (error) throw new Error(error.message);
  revalidatePath("/roadmap");
  revalidatePath("/wtf");
}

// Name a task the week's Priority — one per artist (clears any other); it must
// also be on the WTF.
export async function setTaskPriority(taskId: string) {
  const { supabase, artistId: aid } = await artistId();
  if (!aid) return;
  await supabase
    .from("tasks")
    .update({ wtf_priority: false })
    .eq("artist_id", aid)
    .eq("wtf_priority", true);
  const { error } = await supabase
    .from("tasks")
    .update({ wtf_priority: true, on_wtf: true, wtf_week: thisWeekStart() })
    .eq("id", taskId);
  if (error) throw new Error(error.message);
  revalidatePath("/roadmap");
  revalidatePath("/wtf");
}

// DWY: assign a WTF task to a specific coach, or back to the artist (null).
export async function setTaskAssignee(taskId: string, coachId: string | null) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({ assigned_coach_id: coachId })
    .eq("id", taskId);
  if (error) throw new Error(error.message);
  revalidatePath("/wtf");
  revalidatePath("/roadmap");
}

// Coach-only diagnostic: note why a task was pushed (Section 14.5).
export async function setTaskPushReason(taskId: string, reason: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({ push_reason: reason || null })
    .eq("id", taskId);
  if (error) throw new Error(error.message);
  revalidatePath("/wtf");
}

// Make a task depend on another (parent) task, or clear it (parentId null).
export async function setTaskDependency(
  taskId: string,
  parentId: string | null,
) {
  if (parentId === taskId) return;
  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({ parent_task_id: parentId })
    .eq("id", taskId);
  if (error) throw new Error(error.message);
  revalidatePath("/roadmap");
}
