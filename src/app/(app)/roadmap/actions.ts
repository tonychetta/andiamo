"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// RLS guarantees every mutation here only touches the signed-in artist's rows.

async function artistId() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("current_artist_id");
  return { supabase, artistId: data as string | null };
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
  const supabase = await createClient();
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
  const update: {
    status: typeof status;
    is_completed: boolean;
    completed_at: string | null;
    is_recurring?: boolean;
  } = {
    status,
    is_completed: done,
    completed_at: done ? new Date().toISOString() : null,
  };
  if (status === "complete_and_push") update.is_recurring = true;
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
