import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { RoadmapView } from "@/components/roadmap/RoadmapView";

export default async function RoadmapPage() {
  const supabase = await createClient();

  const { data: vision } = await supabase
    .from("visions")
    .select("id, statement_text")
    .eq("is_current", true)
    .maybeSingle();

  // The Roadmap is built on the Goals, which come from the Vision.
  if (!vision) {
    return (
      <div className="pt-6">
        <p className="text-sm uppercase tracking-[0.2em] text-ink-soft">
          The path
        </p>
        <h1 className="mt-3 font-serif text-4xl text-ink">Roadmap</h1>
        <div className="mt-8 rounded-2xl border border-dashed border-line p-8 text-center">
          <p className="text-ink">Your Roadmap starts with your Vision.</p>
          <Link
            href="/vision"
            className="mt-4 inline-block rounded-xl bg-ink px-5 py-2.5 text-sm font-medium text-surface-primary transition-opacity hover:opacity-90"
          >
            Build your Vision first
          </Link>
        </div>
      </div>
    );
  }

  const [{ data: goals }, { data: milestones }, { data: tasks }] =
    await Promise.all([
      supabase
        .from("goals")
        .select("id, category, description, display_order")
        .eq("vision_id", vision.id)
        .order("display_order", { ascending: true }),
      supabase
        .from("milestones")
        .select(
          "id, goal_id, description, display_order, is_next_milestone, is_completed",
        )
        .order("display_order", { ascending: true }),
      supabase
        .from("tasks")
        .select(
          "id, milestone_id, description, display_order, is_completed, status, parent_task_id, on_wtf, wtf_priority",
        )
        .order("display_order", { ascending: true }),
    ]);

  type TaskRow = NonNullable<typeof tasks>[number];
  type MsRow = NonNullable<typeof milestones>[number];

  const tasksByMilestone = new Map<string, TaskRow[]>();
  for (const t of tasks ?? []) {
    if (!t.milestone_id) continue;
    const list = tasksByMilestone.get(t.milestone_id) ?? [];
    list.push(t);
    tasksByMilestone.set(t.milestone_id, list);
  }

  const milestonesByGoal = new Map<string, MsRow[]>();
  for (const m of milestones ?? []) {
    const list = milestonesByGoal.get(m.goal_id) ?? [];
    list.push(m);
    milestonesByGoal.set(m.goal_id, list);
  }

  const goalsData = (goals ?? []).map((g) => ({
    id: g.id,
    category: g.category,
    description: g.description,
    milestones: (milestonesByGoal.get(g.id) ?? []).map((m) => ({
      id: m.id,
      description: m.description,
      display_order: m.display_order,
      is_next_milestone: m.is_next_milestone,
      is_completed: m.is_completed,
      tasks: (tasksByMilestone.get(m.id) ?? []).map((t) => ({
        id: t.id,
        description: t.description,
        is_completed: t.is_completed,
        status: t.status,
        parent_task_id: t.parent_task_id,
        on_wtf: t.on_wtf,
        wtf_priority: t.wtf_priority,
      })),
    })),
  }));

  return (
    <RoadmapView visionStatement={vision.statement_text} goals={goalsData} />
  );
}
