"use client";

import {
  Fragment,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  motion,
  Reorder,
  useDragControls,
  type PanInfo,
} from "framer-motion";
import {
  Plus,
  Sparkle,
  DotsThree,
  ArrowsClockwise,
  LockSimple,
  CaretDown,
  CaretUp,
  CalendarCheck,
} from "@phosphor-icons/react";
import {
  addTask,
  deleteTask,
  updateTask,
  setTaskStatus,
  setTaskDependency,
  promoteTaskToMilestone,
  addMilestone,
  updateMilestone,
  deleteMilestone,
  reorderMilestones,
  addSuggestedTasks,
  setTaskOnWtf,
} from "@/app/(app)/roadmap/actions";

type TaskStatus = "pending" | "completed" | "pushed" | "complete_and_push";
type Task = {
  id: string;
  description: string;
  is_completed: boolean;
  status: TaskStatus;
  parent_task_id: string | null;
  on_wtf: boolean;
  wtf_priority: boolean;
};
type Milestone = {
  id: string;
  description: string;
  display_order: number;
  is_next_milestone: boolean;
  is_completed: boolean;
  tasks: Task[];
};
type Goal = {
  id: string;
  category: string;
  description: string;
  milestones: Milestone[];
};

const CATEGORY_LABEL: Record<string, string> = {
  revenue_generating: "Revenue",
  audience_size: "Audience",
  team: "Team",
  catalog: "Catalog",
  recognition_awards: "Recognition",
};

// Depth-spread dials.
const COLLAPSED_MB = -46;
const EXPANDED_MB = 14;
const PAN_DISTANCE = 320;
const COLLAPSED_NARROW = 0.06;

function taskIsDone(t: Task) {
  return t.status === "completed" || t.status === "complete_and_push";
}

// Pure derivation of the visible stack from a Goal's milestones.
// sorted = nearest-first (index 0 is the Next, number 1). futuresFurthestFirst
// is the future milestones top-to-bottom (furthest at the top, Next sits below).
function deriveStack(goal: Goal) {
  const sorted = [...goal.milestones]
    .filter((m) => !m.is_completed)
    .sort((a, b) => a.display_order - b.display_order);
  const next = sorted.find((m) => m.is_next_milestone) ?? sorted[0];
  const futures = sorted.filter((m) => next && m.id !== next.id);
  return { sorted, next, futures, futuresFurthestFirst: [...futures].reverse() };
}

export function RoadmapView({
  visionStatement,
  goals,
}: {
  visionStatement: string;
  goals: Goal[];
}) {
  const [active, setActive] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  function onScroll() {
    const el = trackRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    if (idx !== active) setActive(idx);
  }

  const activeGoal = goals[active];

  return (
    <div>
      <VisionHeaderBar statement={visionStatement} />

      <div className="mb-4 flex justify-center">
        <Link
          href="/wtf"
          className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm font-medium text-surface-primary transition-opacity hover:opacity-90"
        >
          <CalendarCheck size={16} /> This Week
        </Link>
      </div>

      <div
        ref={trackRef}
        onScroll={onScroll}
        className="-mx-5 flex snap-x snap-mandatory overflow-x-auto scroll-smooth px-5"
        style={{ scrollbarWidth: "none" }}
      >
        {goals.map((g) => (
          <div key={g.id} className="w-full shrink-0 snap-center pr-3">
            <GoalCard goal={g} />
          </div>
        ))}
      </div>

      {goals.length > 1 && (
        <div className="mt-3 flex justify-center gap-1.5">
          {goals.map((g, i) => (
            <span
              key={g.id}
              className={`h-1.5 rounded-full transition-all ${
                i === active ? "w-5 bg-ink" : "w-1.5 bg-line"
              }`}
            />
          ))}
        </div>
      )}

      {activeGoal && <MilestoneStack key={activeGoal.id} goal={activeGoal} />}
    </div>
  );
}

function VisionHeaderBar({ statement }: { statement: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="fixed inset-x-0 top-0 z-40 bg-surface-night">
        <button
          onClick={() => setOpen(true)}
          className="block w-full px-5 py-4 text-left"
        >
          <span className="inline-flex items-center gap-2 font-serif text-lg text-surface-primary">
            Your Vision
            <CaretDown size={15} className="text-surface-primary/60" />
          </span>
        </button>
      </div>

      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fade-in fixed inset-0 z-[70] overflow-y-auto bg-surface-night"
        >
          <div className="mx-auto min-h-full w-full max-w-md px-6 py-20">
            <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-surface-primary/50">
              Your Vision
              <CaretUp size={14} />
            </span>
            <p className="mt-6 font-serif text-xl leading-relaxed text-surface-primary">
              {statement}
            </p>
            <p className="mt-10 text-sm text-surface-primary/40">
              Tap anywhere to close
            </p>
          </div>
        </div>
      )}
    </>
  );
}

function GoalCard({ goal }: { goal: Goal }) {
  return (
    <div className="rounded-2xl bg-surface-accent p-5">
      <span className="inline-block rounded-full bg-accent-gold/25 px-3 py-1 text-xs font-medium uppercase tracking-wide text-ink">
        {CATEGORY_LABEL[goal.category] ?? goal.category}
      </span>
      <p className="mt-3 font-serif text-2xl leading-snug text-ink">
        {goal.description}
      </p>
    </div>
  );
}

function MilestoneStack({ goal }: { goal: Goal }) {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [spread, setSpread] = useState(0.35);
  const [dragging, setDragging] = useState(false);
  const [reordering, setReordering] = useState(false);
  // `order` is the working list of FUTURE milestones, furthest-first
  // (top-to-bottom). The Next milestone is always #1 and lives below them.
  const [order, setOrder] = useState<Milestone[]>(
    () => deriveStack(goal).futuresFurthestFirst,
  );
  const [, startTransition] = useTransition();

  const { sorted, next, futures, futuresFurthestFirst } = deriveStack(goal);
  const futuresKey = futuresFurthestFirst.map((m) => m.id).join(",");

  // Keep the working order in sync with the server whenever it changes — but
  // never yank it out from under an in-progress drag.
  useEffect(() => {
    if (!reordering) setOrder(deriveStack(goal).futuresFurthestFirst);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [futuresKey, reordering]);

  // NOTE: these stay attached even during reorder. Removing the handler mid-touch
  // orphans framer's pan listeners (the scroll-during-drag blocker never cleans
  // up → frozen page). So we keep them mounted and just no-op while reordering.
  function onPan(_e: PointerEvent, info: PanInfo) {
    if (reordering) return;
    if (!dragging) setDragging(true);
    setSpread((s) => Math.min(1, Math.max(0, s + info.delta.y / PAN_DISTANCE)));
  }
  function onPanEnd(_e: PointerEvent, info: PanInfo) {
    if (reordering) return;
    setDragging(false);
    setSpread((s) =>
      Math.min(1, Math.max(0, s + (info.velocity.y / PAN_DISTANCE) * 0.18)),
    );
  }

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/roadmap/milestones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goalId: goal.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't build Milestones.");
      setGenerating(false);
    }
  }

  // Drop after a long-press drag: persist the new order (skip if unchanged).
  function dropReorder() {
    setReordering(false);
    const now = order.map((m) => m.id).join(",");
    if (now === futuresKey) return;
    const nearestFirst = [next.id, ...[...order].reverse().map((m) => m.id)];
    startTransition(async () => {
      await reorderMilestones(goal.id, nearestFirst);
      router.refresh();
    });
  }

  // Promote a future milestone straight to Next (number 1).
  function makeNext(m: Milestone) {
    const nearestFirst = [
      m.id,
      ...sorted.filter((x) => x.id !== m.id).map((x) => x.id),
    ];
    startTransition(async () => {
      await reorderMilestones(goal.id, nearestFirst);
      router.refresh();
    });
  }

  if (goal.milestones.length === 0) {
    return (
      <div className="mt-8 rounded-2xl border border-dashed border-line p-8 text-center">
        <p className="text-ink">No Milestones yet for this Goal.</p>
        <p className="mt-1 text-sm text-ink-soft">
          Andiamo will map 5 stepping-stones from where you are now to this Goal.
        </p>
        <button
          onClick={generate}
          disabled={generating}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-ink px-5 py-3 font-medium text-surface-primary transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          <Sparkle
            size={18}
            weight="fill"
            className={`text-accent-gold ${generating ? "animate-twinkle" : ""}`}
          />
          {generating ? "Mapping your path…" : "Generate Milestones"}
        </button>
        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      </div>
    );
  }

  const hasFutures = futures.length > 0;
  const total = order.length + 1; // futures + the Next

  return (
    <div className="mt-8">
      {hasFutures && (
        <motion.div onPan={onPan} onPanEnd={onPanEnd} style={{ touchAction: "none" }}>
          <Reorder.Group axis="y" values={order} onReorder={setOrder}>
            {order.map((m, idx) => (
              <FutureCard
                key={m.id}
                milestone={m}
                number={total - idx} // furthest at top = highest number
                depth={order.length - idx}
                spread={spread}
                dragging={dragging}
                reordering={reordering}
                expanded={expandedId === m.id}
                onToggle={() =>
                  setExpandedId((cur) => (cur === m.id ? null : m.id))
                }
                onStartReorder={() => {
                  setExpandedId(null);
                  setReordering(true);
                }}
                onDropReorder={dropReorder}
                onMakeNext={() => makeNext(m)}
              />
            ))}
          </Reorder.Group>
        </motion.div>
      )}

      <div
        className="relative rounded-2xl bg-surface-secondary p-5 shadow-[0_-2px_28px_rgba(0,0,0,0.12)] ring-1 ring-ink/10"
        style={{
          zIndex: 30,
          marginTop: reordering ? 8 : hasFutures ? -12 : 0,
          transition: "margin-top 0.5s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <NextCardContent milestone={next} />
      </div>

      <AddNextMilestone
        onAdd={(text) =>
          startTransition(async () => {
            await addMilestone(goal.id, text);
            router.refresh();
          })
        }
      />
      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
    </div>
  );
}

function NumberBadge({ n, tone }: { n: number; tone?: "gold" }) {
  return (
    <span
      className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-medium text-ink ${
        tone === "gold" ? "bg-accent-gold/30" : "bg-ink/10"
      }`}
    >
      {n}
    </span>
  );
}

function FutureCard({
  milestone,
  number,
  depth,
  spread,
  dragging,
  reordering,
  expanded,
  onToggle,
  onStartReorder,
  onDropReorder,
  onMakeNext,
}: {
  milestone: Milestone;
  number: number;
  depth: number;
  spread: number;
  dragging: boolean;
  reordering: boolean;
  expanded: boolean;
  onToggle: () => void;
  onStartReorder: () => void;
  onDropReorder: () => void;
  onMakeNext: () => void;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(milestone.description);

  // Long-press → begin a drag on THIS card with the same finger (no lift).
  const controls = useDragControls();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPt = useRef<{ x: number; y: number } | null>(null);
  const savedEvt = useRef<React.PointerEvent | null>(null);
  const firedRef = useRef(false);
  const clearTimer = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };
  const onPointerDown = (e: React.PointerEvent) => {
    if (editing) return;
    firedRef.current = false;
    startPt.current = { x: e.clientX, y: e.clientY };
    savedEvt.current = e;
    timer.current = setTimeout(() => {
      firedRef.current = true;
      onStartReorder();
      if (savedEvt.current) controls.start(savedEvt.current);
    }, 380);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!startPt.current) return;
    if (
      Math.abs(e.clientX - startPt.current.x) > 8 ||
      Math.abs(e.clientY - startPt.current.y) > 8
    )
      clearTimer();
  };

  // While reordering, the whole stack opens flat (spread = 1) so the card you're
  // holding can be dragged cleanly; afterward it collapses back into the stack.
  const es = reordering ? 1 : spread;
  const d = Math.min(depth, 6);
  const marginBottom = COLLAPSED_MB + (EXPANDED_MB - COLLAPSED_MB) * es;
  const scale = 1 - d * COLLAPSED_NARROW * (1 - es);
  const blur = expanded || reordering ? 0 : Math.min(d * 0.8, 4.5) * (1 - es);
  const brightness =
    expanded || reordering ? 1 : 1 - Math.min(d * 0.06, 0.35) * (1 - es);
  const showFull = expanded || reordering || spread > 0.85;
  const glide = "cubic-bezier(0.22, 1, 0.36, 1)";
  const still = dragging || reordering; // suppress the slow glide during gestures

  function saveEdit() {
    const text = draft.trim();
    setEditing(false);
    if (!text || text === milestone.description) {
      setDraft(milestone.description);
      return;
    }
    startTransition(async () => {
      await updateMilestone(milestone.id, text);
      router.refresh();
    });
  }

  return (
    <Reorder.Item
      value={milestone}
      dragListener={false}
      dragControls={controls}
      onDragEnd={onDropReorder}
      whileDrag={{
        scale: 1.05,
        boxShadow: "0 16px 36px rgba(0,0,0,0.22)",
        zIndex: 50,
      }}
      style={{
        position: "relative",
        marginBottom,
        zIndex: expanded ? 25 : 10 - d,
        transition: still ? "none" : `margin-bottom 0.8s ${glide}`,
      }}
    >
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={clearTimer}
        onPointerLeave={clearTimer}
        onPointerCancel={clearTimer}
        onClick={() => {
          if (firedRef.current) {
            firedRef.current = false;
            return;
          }
          if (!editing && !reordering) onToggle();
        }}
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "bottom center",
          filter: `blur(${blur}px) brightness(${brightness})`,
          transition: still
            ? "box-shadow 0.25s ease"
            : `transform 0.8s ${glide}, filter 0.8s ${glide}, box-shadow 0.25s ease`,
        }}
        className={`cursor-pointer select-none rounded-2xl bg-surface-secondary px-4 py-3.5 ${
          expanded
            ? "shadow-[0_8px_28px_rgba(0,0,0,0.14)] ring-1 ring-ink/15"
            : "border border-line shadow-sm"
        }`}
      >
        {editing ? (
          <div onClick={(e) => e.stopPropagation()}>
            <textarea
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={2}
              className="w-full resize-none rounded-lg border border-line bg-surface-primary px-2 py-1 text-[15px] leading-snug text-ink outline-none focus:border-ink"
            />
            <div className="mt-2 flex gap-2">
              <button
                onClick={saveEdit}
                className="rounded-lg bg-ink px-3 py-1.5 text-sm text-surface-primary"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setDraft(milestone.description);
                  setEditing(false);
                }}
                className="rounded-lg px-3 py-1.5 text-sm text-ink-soft"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5">
              <NumberBadge n={number} />
            </span>
            <p
              className={`flex-1 text-[15px] leading-snug text-ink ${
                showFull ? "" : "truncate"
              }`}
            >
              {milestone.description}
            </p>
            {expanded && (
              <MilestoneMenu
                onEdit={() => setEditing(true)}
                onMakeNext={onMakeNext}
                onDelete={() =>
                  startTransition(async () => {
                    await deleteMilestone(milestone.id);
                    router.refresh();
                  })
                }
              />
            )}
          </div>
        )}
      </div>
    </Reorder.Item>
  );
}

function NextCardContent({ milestone }: { milestone: Milestone }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(milestone.description);
  const [addingTask, setAddingTask] = useState(false);
  const [newTask, setNewTask] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<
    { description: string; reason: string; selected: boolean }[] | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  async function suggest() {
    setSuggesting(true);
    setError(null);
    try {
      const res = await fetch("/api/roadmap/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ milestoneId: milestone.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuggestions(
        (data.tasks as { description: string; reason: string }[]).map((t) => ({
          ...t,
          selected: true,
        })),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't suggest Tasks.");
    } finally {
      setSuggesting(false);
    }
  }

  function addSelected() {
    const picked = (suggestions ?? [])
      .filter((s) => s.selected)
      .map((s) => s.description);
    setSuggestions(null);
    if (picked.length === 0) return;
    startTransition(async () => {
      await addSuggestedTasks(milestone.id, picked);
      router.refresh();
    });
  }

  function submitNewTask() {
    const text = newTask.trim();
    if (!text) return;
    setNewTask("");
    setAddingTask(false);
    startTransition(async () => {
      await addTask(milestone.id, text);
      router.refresh();
    });
  }

  const tasks = milestone.tasks;
  const topLevel = tasks.filter((t) => !t.parent_task_id);
  const childrenOf = (id: string) =>
    tasks.filter((t) => t.parent_task_id === id);

  return (
    <div>
      <div className="flex items-center gap-2">
        <NumberBadge n={1} tone="gold" />
        <span className="text-xs font-medium uppercase tracking-[0.18em] text-accent-gold">
          Next Milestone
        </span>
      </div>

      {editing ? (
        <div className="mt-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            className="w-full resize-none rounded-xl border border-line bg-surface-primary px-3 py-2 text-ink outline-none focus:border-ink"
          />
          <div className="mt-2 flex gap-2">
            <button
              onClick={() =>
                startTransition(async () => {
                  await updateMilestone(milestone.id, draft);
                  setEditing(false);
                  router.refresh();
                })
              }
              className="rounded-lg bg-ink px-3 py-1.5 text-sm text-surface-primary"
            >
              Save
            </button>
            <button
              onClick={() => {
                setDraft(milestone.description);
                setEditing(false);
              }}
              className="rounded-lg px-3 py-1.5 text-sm text-ink-soft"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-1 flex items-start justify-between gap-3">
          <p className="font-serif text-xl leading-snug text-ink">
            {milestone.description}
          </p>
          <div className="mt-1">
            <MilestoneMenu
              onEdit={() => setEditing(true)}
              onDelete={() =>
                startTransition(async () => {
                  await deleteMilestone(milestone.id);
                  router.refresh();
                })
              }
            />
          </div>
        </div>
      )}

      <div className="mt-5 flex items-center justify-between">
        <span className="text-xs uppercase tracking-[0.18em] text-ink-soft">
          Tasks
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setAddingTask((a) => !a)}
            aria-label="Add task"
            className="grid h-8 w-8 place-items-center rounded-full text-ink-soft transition-colors hover:bg-surface-accent hover:text-ink"
          >
            <Plus size={17} />
          </button>
          <button
            onClick={suggest}
            disabled={suggesting}
            aria-label="Suggest tasks"
            className="grid h-8 w-8 place-items-center rounded-full transition-colors hover:bg-surface-accent"
          >
            <Sparkle
              size={17}
              weight="fill"
              className={`text-accent-gold ${suggesting ? "animate-twinkle" : ""}`}
            />
          </button>
        </div>
      </div>

      <div className="mt-2 space-y-1">
        {topLevel.map((t) => (
          <Fragment key={t.id}>
            <TaskRow task={t} allTasks={tasks} indented={false} locked={false} />
            {childrenOf(t.id).map((c) => (
              <TaskRow
                key={c.id}
                task={c}
                allTasks={tasks}
                indented
                locked={!taskIsDone(t)}
              />
            ))}
          </Fragment>
        ))}
        {tasks.length === 0 && !addingTask && (
          <p className="text-sm text-ink-soft">
            No tasks yet. Tap the stars for suggestions, or + to add your own.
          </p>
        )}
      </div>

      {addingTask && (
        <input
          autoFocus
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submitNewTask();
            if (e.key === "Escape") {
              setNewTask("");
              setAddingTask(false);
            }
          }}
          onBlur={submitNewTask}
          placeholder="Add a task…"
          className="mt-2 w-full rounded-xl border border-line bg-surface-primary px-3 py-2 text-sm text-ink outline-none focus:border-ink"
        />
      )}

      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}

      {suggestions && (
        <div className="mt-4 rounded-xl border border-line bg-surface-primary p-4">
          <p className="text-sm font-medium text-ink">Suggested tasks</p>
          <div className="mt-3 space-y-2.5">
            {suggestions.map((s, i) => (
              <label key={i} className="flex cursor-pointer items-start gap-2.5">
                <input
                  type="checkbox"
                  checked={s.selected}
                  onChange={() =>
                    setSuggestions((prev) =>
                      (prev ?? []).map((p, j) =>
                        j === i ? { ...p, selected: !p.selected } : p,
                      ),
                    )
                  }
                  className="mt-1"
                />
                <span>
                  <span className="text-sm text-ink">{s.description}</span>
                  <span className="block text-xs text-ink-soft">{s.reason}</span>
                </span>
              </label>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={addSelected}
              className="rounded-lg bg-ink px-4 py-2 text-sm text-surface-primary"
            >
              Add selected
            </button>
            <button
              onClick={() => setSuggestions(null)}
              className="rounded-lg px-4 py-2 text-sm text-ink-soft"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TaskRow({
  task,
  allTasks,
  indented,
  locked,
}: {
  task: Task;
  allTasks: Task[];
  indented: boolean;
  locked: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.description);
  const [menuOpen, setMenuOpen] = useState(false);
  const [depMode, setDepMode] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!editing) return;
    const el = taRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [editing, draft]);

  function saveEdit() {
    const text = draft.trim();
    setEditing(false);
    if (!text || text === task.description) {
      setDraft(task.description);
      return;
    }
    startTransition(async () => {
      await updateTask(task.id, text);
      router.refresh();
    });
  }

  function run(fn: () => Promise<void>) {
    setMenuOpen(false);
    setDepMode(false);
    startTransition(async () => {
      await fn();
      router.refresh();
    });
  }

  const done = taskIsDone(task);
  const hasChildren = allTasks.some((t) => t.parent_task_id === task.id);
  // Eligible parents: other top-level tasks (one level of nesting only).
  const candidates = allTasks.filter(
    (c) => c.id !== task.id && !c.parent_task_id,
  );

  return (
    <div
      className={`relative ${indented ? "ml-7" : ""} ${locked ? "opacity-50" : ""}`}
    >
      {/* Swipe-to-WTF hints, revealed as the row slides. */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-between px-1 text-[11px] font-medium uppercase tracking-wide">
        <span className="text-accent-cyan">→ This Week</span>
        <span className="text-ink-soft">Remove ←</span>
      </div>
      <motion.div
        drag={editing ? false : "x"}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.6}
        onDragEnd={(_e, info) => {
          if (info.offset.x > 70 && !task.on_wtf)
            run(() => setTaskOnWtf(task.id, true));
          else if (info.offset.x < -70 && task.on_wtf)
            run(() => setTaskOnWtf(task.id, false));
        }}
        className="relative flex items-start gap-2 bg-surface-secondary py-1.5"
      >
      {editing ? (
        <textarea
          ref={taRef}
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              saveEdit();
            }
            if (e.key === "Escape") {
              setDraft(task.description);
              setEditing(false);
            }
          }}
          onBlur={saveEdit}
          rows={1}
          className="flex-1 resize-none overflow-hidden rounded-lg border border-line bg-surface-primary px-2 py-1 text-[15px] leading-relaxed text-ink outline-none focus:border-ink"
        />
      ) : (
        <span
          onClick={() => setEditing(true)}
          className={`flex-1 cursor-text text-[15px] leading-relaxed ${
            done ? "text-ink-soft line-through" : "text-ink"
          }`}
        >
          {locked && (
            <LockSimple
              size={13}
              className="mr-1.5 inline align-middle text-ink-soft"
            />
          )}
          {task.description}
          {task.status === "pushed" && (
            <span className="ml-2 align-middle text-xs uppercase tracking-wide text-ink-soft">
              · pushed
            </span>
          )}
          {task.status === "complete_and_push" && (
            <ArrowsClockwise
              size={13}
              className="ml-1.5 inline align-middle text-ink-soft"
            />
          )}
        </span>
      )}

      {task.on_wtf && (
        <span className="mt-0.5 shrink-0 rounded bg-accent-cyan/25 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink">
          {task.wtf_priority ? "★ WTF" : "WTF"}
        </span>
      )}

      <button
        onClick={() => {
          setDepMode(false);
          setMenuOpen((o) => !o);
        }}
        aria-label="Task options"
        className="mt-0.5 shrink-0 text-ink-soft transition-colors hover:text-ink"
      >
        <DotsThree size={20} weight="bold" />
      </button>

      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => {
              setMenuOpen(false);
              setDepMode(false);
            }}
          />
          <div className="absolute right-0 top-7 z-50 max-h-72 w-60 overflow-y-auto rounded-xl border border-line bg-surface-primary py-1 shadow-lg">
            {depMode ? (
              <>
                <p className="px-4 py-2 text-xs uppercase tracking-wide text-ink-soft">
                  Depends on…
                </p>
                {candidates.length === 0 ? (
                  <p className="px-4 py-2 text-sm text-ink-soft">
                    No other tasks to depend on.
                  </p>
                ) : (
                  candidates.map((c) => (
                    <MenuItem
                      key={c.id}
                      onClick={() => run(() => setTaskDependency(task.id, c.id))}
                    >
                      {c.description}
                    </MenuItem>
                  ))
                )}
                <div className="my-1 border-t border-line" />
                <MenuItem onClick={() => setDepMode(false)}>Back</MenuItem>
              </>
            ) : (
              <>
                <MenuItem
                  onClick={() => run(() => setTaskStatus(task.id, "completed"))}
                >
                  Complete
                </MenuItem>
                <MenuItem
                  onClick={() => run(() => setTaskStatus(task.id, "pushed"))}
                >
                  Push to Next Week
                </MenuItem>
                <MenuItem
                  onClick={() =>
                    run(() => setTaskStatus(task.id, "complete_and_push"))
                  }
                >
                  Complete and Push
                </MenuItem>
                <div className="my-1 border-t border-line" />
                {!task.parent_task_id && !hasChildren && candidates.length > 0 && (
                  <MenuItem onClick={() => setDepMode(true)}>
                    Make Dependent On…
                  </MenuItem>
                )}
                {task.parent_task_id && (
                  <MenuItem
                    onClick={() => run(() => setTaskDependency(task.id, null))}
                  >
                    Remove Dependency
                  </MenuItem>
                )}
                <MenuItem
                  onClick={() => run(() => promoteTaskToMilestone(task.id))}
                >
                  Make Next Milestone
                </MenuItem>
                <div className="my-1 border-t border-line" />
                <MenuItem danger onClick={() => run(() => deleteTask(task.id))}>
                  Delete
                </MenuItem>
              </>
            )}
          </div>
        </>
      )}
      </motion.div>
    </div>
  );
}

function MenuItem({
  children,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`block w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-surface-secondary ${
        danger ? "text-red-700" : "text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function MilestoneMenu({
  onEdit,
  onMakeNext,
  onDelete,
}: {
  onEdit: () => void;
  onMakeNext?: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Milestone options"
        className="text-ink-soft transition-colors hover:text-ink"
      >
        <DotsThree size={20} weight="bold" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-7 z-50 w-48 overflow-hidden rounded-xl border border-line bg-surface-primary py-1 shadow-lg">
            <MenuItem
              onClick={() => {
                setOpen(false);
                onEdit();
              }}
            >
              Edit
            </MenuItem>
            {onMakeNext && (
              <MenuItem
                onClick={() => {
                  setOpen(false);
                  onMakeNext();
                }}
              >
                Make Next Milestone
              </MenuItem>
            )}
            <MenuItem
              danger
              onClick={() => {
                setOpen(false);
                onDelete();
              }}
            >
              Delete
            </MenuItem>
          </div>
        </>
      )}
    </div>
  );
}

function AddNextMilestone({ onAdd }: { onAdd: (text: string) => void }) {
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");

  if (adding) {
    return (
      <div className="mt-5 rounded-2xl border border-line bg-surface-secondary p-3">
        <textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          placeholder="A nearer step to break the Next Milestone down…"
          className="w-full resize-none rounded-xl border border-line bg-surface-primary px-3 py-2 text-ink outline-none focus:border-ink"
        />
        <div className="mt-2 flex justify-end gap-2">
          <button
            onClick={() => {
              setText("");
              setAdding(false);
            }}
            className="rounded-lg px-3 py-1.5 text-sm text-ink-soft"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (text.trim()) onAdd(text.trim());
              setText("");
              setAdding(false);
            }}
            className="rounded-lg bg-ink px-3 py-1.5 text-sm text-surface-primary"
          >
            Add as Next
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-5 flex justify-end">
      <button
        onClick={() => setAdding(true)}
        aria-label="Add a nearer Next Milestone"
        className="grid h-12 w-12 place-items-center rounded-full bg-ink text-surface-primary shadow-lg transition-opacity hover:opacity-90"
      >
        <Plus size={22} />
      </button>
    </div>
  );
}
