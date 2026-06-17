"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  X,
  CaretDown,
  CaretUp,
  Trash,
  PencilSimple,
  Sparkle,
} from "@phosphor-icons/react";
import {
  addRelease,
  updateReleaseDetails,
  changeReleaseDate,
  deleteRelease,
  toggleReleaseTask,
  updateReleaseTask,
  addReleaseTask,
  addLaunchTasks,
  deleteReleaseTask,
} from "@/app/(app)/releases/actions";
import { TemplateEditor, type TemplatesProp } from "./TemplateEditor";

type ReleaseType = "single" | "project";
type Assignee = "artist" | "producer" | "both" | "unassigned";

type Task = {
  id: string;
  release_id: string;
  description: string;
  assigned_to: Assignee;
  phase_label: string;
  offset_days: number;
  due_date: string | null;
  is_completed: boolean;
  is_custom: boolean;
  display_order: number;
};

type Release = {
  id: string;
  title: string;
  release_type: ReleaseType;
  release_date: string;
  notes: string | null;
  mgmt_link: string | null;
  tasks: Task[];
};

// ---------- date helpers (UTC-anchored, date-only) ----------
function dayDiff(today: string, date: string): number {
  const [ay, am, ad] = today.split("-").map(Number);
  const [by, bm, bd] = date.split("-").map(Number);
  return Math.round(
    (Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000,
  );
}

function fmtDate(date: string | null): string {
  if (!date) return "";
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function countdown(diff: number): string {
  if (diff === 0) return "Releases today";
  if (diff === 1) return "Releases tomorrow";
  if (diff > 1 && diff < 14) return `Releases in ${diff} days`;
  if (diff >= 14) return `Releases in ${Math.round(diff / 7)} weeks`;
  if (diff === -1) return "Released yesterday";
  const ago = Math.abs(diff);
  if (ago < 14) return `Released ${ago} days ago`;
  return `Released ${Math.round(ago / 7)} weeks ago`;
}

const TYPE_LABEL: Record<ReleaseType, string> = {
  single: "Single",
  project: "Project",
};

export function ReleasesView({
  releases,
  today,
  production,
  templates,
}: {
  releases: Release[];
  today: string;
  production: Record<string, ProductionState>;
  templates: TemplatesProp;
}) {
  const [adding, setAdding] = useState(false);
  const [showPast, setShowPast] = useState(false);
  const [editingTemplates, setEditingTemplates] = useState(false);

  const upcoming = releases.filter((r) => dayDiff(today, r.release_date) >= 0);
  const past = releases
    .filter((r) => dayDiff(today, r.release_date) < 0)
    .reverse(); // most-recently-released first

  return (
    <section>
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="font-serif text-4xl leading-tight text-ink">Releases</h1>
        <button
          onClick={() => setEditingTemplates(true)}
          className="shrink-0 text-sm text-ink-soft transition-colors hover:text-ink"
        >
          Templates
        </button>
      </div>

      {releases.length === 0 ? (
        <div className="mt-2 rounded-2xl border border-dashed border-line p-10 text-center">
          <p className="text-ink">No releases scheduled yet.</p>
          <button
            onClick={() => setAdding(true)}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-ink px-5 py-3 font-medium text-surface-primary transition-opacity hover:opacity-90"
          >
            <Plus size={18} />
            Add a release
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {upcoming.map((r) => (
              <ReleaseCard
                key={r.id}
                release={r}
                today={today}
                production={production[r.id]}
              />
            ))}
            {upcoming.length === 0 && (
              <p className="text-sm text-ink-soft">
                Nothing upcoming. Add your next release to start the countdown.
              </p>
            )}
          </div>

          {past.length > 0 && (
            <div className="mt-10">
              <button
                onClick={() => setShowPast((s) => !s)}
                className="flex w-full items-center justify-between rounded-xl py-2 text-sm uppercase tracking-[0.18em] text-ink-soft"
              >
                <span>Past releases ({past.length})</span>
                {showPast ? <CaretUp size={16} /> : <CaretDown size={16} />}
              </button>
              {showPast && (
                <div className="mt-3 space-y-4">
                  {past.map((r) => (
                    <ReleaseCard
                      key={r.id}
                      release={r}
                      today={today}
                      production={production[r.id]}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Floating add button, bottom-right, above the nav. */}
      <button
        onClick={() => setAdding(true)}
        aria-label="Add a release"
        className="fixed bottom-24 right-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-ink text-surface-primary shadow-xl transition-opacity hover:opacity-90"
      >
        <Plus size={24} />
      </button>

      {adding && <AddReleaseModal today={today} onClose={() => setAdding(false)} />}
      {editingTemplates && (
        <TemplateEditor
          templates={templates}
          onClose={() => setEditingTemplates(false)}
        />
      )}
    </section>
  );
}

function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-ink/10">
      <div
        className="h-full rounded-full bg-accent-gold transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

const PROCESSES = ["PROD", "EDT", "MIX", "MST"] as const;
type ProcessKey = (typeof PROCESSES)[number];
type ProductionState = Record<ProcessKey, boolean>;

const EMPTY_PRODUCTION: ProductionState = {
  PROD: false,
  EDT: false,
  MIX: false,
  MST: false,
};

// The four production processes, each a thin bubble that fills cyan + glows
// once complete (status pulled from the MGMT app).
function ProductionBar({ state }: { state: ProductionState }) {
  return (
    <div className="mt-4 flex gap-2.5">
      {PROCESSES.map((p) => {
        const done = state[p];
        return (
          <div key={p} className="flex flex-1 flex-col items-center gap-1">
            <span
              className={`text-[10px] font-semibold uppercase tracking-wide ${
                done ? "text-ink" : "text-ink-soft"
              }`}
            >
              {p}
            </span>
            <span
              className={`h-2 w-full rounded-full transition-all ${
                done ? "bg-accent-cyan" : "border border-ink/15 bg-ink/[0.04]"
              }`}
              style={
                done
                  ? { boxShadow: "0 0 8px rgba(95,245,245,0.75)" }
                  : undefined
              }
            />
          </div>
        );
      })}
    </div>
  );
}

function ReleaseCard({
  release,
  today,
  production,
}: {
  release: Release;
  today: string;
  production?: ProductionState;
}) {
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const diff = dayDiff(today, release.release_date);

  const pre = release.tasks.filter((t) => t.offset_days < 0);
  const preDone = pre.filter((t) => t.is_completed).length;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-surface-secondary shadow-sm ring-1 ring-ink/5">
      <button
        onClick={() => setOpen((o) => !o)}
        className="block w-full px-5 py-4 pr-12 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-accent-gold/25 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-ink">
            {TYPE_LABEL[release.release_type]}
          </span>
          <span className="text-xs text-ink-soft">
            {fmtDate(release.release_date)}
          </span>
        </div>
        <p className="mt-2 font-serif text-2xl leading-snug text-ink">
          {release.title}
        </p>
        {/* Only singles track the 4 production processes; projects don't. */}
        {release.release_type === "single" && (
          <ProductionBar state={production ?? EMPTY_PRODUCTION} />
        )}
        <p className="mt-4 text-sm font-medium text-accent-gold">
          {countdown(diff)}
        </p>
        {pre.length > 0 && <ProgressBar done={preDone} total={pre.length} />}
        <span className="mt-3 flex items-center gap-1 text-xs text-ink-soft">
          {open ? "Hide schedule" : "View schedule"}
          {open ? <CaretUp size={13} /> : <CaretDown size={13} />}
        </span>
      </button>

      <button
        onClick={() => setConfirmDelete(true)}
        aria-label="Delete release"
        className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full text-ink-soft/50 transition-colors hover:bg-surface-accent hover:text-red-700"
      >
        <Trash size={16} />
      </button>

      {open && <ReleaseDetail release={release} />}
      {confirmDelete && (
        <DeleteReleaseModal
          release={release}
          onClose={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}

function DeleteReleaseModal({
  release,
  onClose,
}: {
  release: Release;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [understood, setUnderstood] = useState(false);

  function confirm() {
    if (!understood) return;
    startTransition(async () => {
      await deleteRelease(release.id);
      router.refresh();
      onClose();
    });
  }

  return (
    <div
      onClick={onClose}
      className="fade-in fixed inset-0 z-[80] flex items-center justify-center bg-ink/40 px-5"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-3xl bg-surface-primary p-6 shadow-2xl"
      >
        <h2 className="font-serif text-xl text-ink">
          Delete “{release.title}”?
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          This permanently removes the release and{" "}
          <strong className="text-ink">all of its task data</strong> — every
          completed task, custom task, and launch plan. This cannot be undone.
        </p>
        <label className="mt-4 flex cursor-pointer items-start gap-2.5">
          <input
            type="checkbox"
            checked={understood}
            onChange={() => setUnderstood((u) => !u)}
            className="mt-0.5"
          />
          <span className="text-sm text-ink">
            I understand this can&apos;t be undone.
          </span>
        </label>
        <div className="mt-5 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-line py-2.5 text-sm text-ink"
          >
            Cancel
          </button>
          <button
            onClick={confirm}
            disabled={!understood || pending}
            className="flex-1 rounded-xl bg-red-700 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {pending ? "Deleting…" : "Delete release"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReleaseDetail({ release }: { release: Release }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [addingPhase, setAddingPhase] = useState<number | null>(null);
  const [taskDraft, setTaskDraft] = useState("");
  const [editingDate, setEditingDate] = useState(false);
  const [dateDraft, setDateDraft] = useState(release.release_date);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(release.title);
  const [notesDraft, setNotesDraft] = useState(release.notes ?? "");
  const [mgmtDraft, setMgmtDraft] = useState(release.mgmt_link ?? "");

  function run(fn: () => Promise<void>) {
    startTransition(async () => {
      await fn();
      router.refresh();
    });
  }

  // Group tasks into their phases, preserving the template's chronological order.
  const phases: {
    label: string;
    date: string | null;
    offsetDays: number;
    tasks: Task[];
  }[] = [];
  for (const t of release.tasks) {
    const last = phases[phases.length - 1];
    if (last && last.label === t.phase_label) last.tasks.push(t);
    else
      phases.push({
        label: t.phase_label,
        date: t.due_date,
        offsetDays: t.offset_days,
        tasks: [t],
      });
  }

  function submitPhaseTask(label: string, offsetDays: number) {
    const text = taskDraft.trim();
    setTaskDraft("");
    setAddingPhase(null);
    if (text) run(() => addReleaseTask(release.id, text, label, offsetDays));
  }

  return (
    <div className="border-t border-line px-5 py-4">
      {/* Edit title + notes */}
      {editingTitle ? (
        <div className="mb-4 rounded-xl border border-line bg-surface-primary p-3">
          <input
            autoFocus
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            placeholder="Title"
            className="w-full rounded-lg border border-line bg-surface-secondary px-3 py-2 text-ink outline-none focus:border-ink"
          />
          <textarea
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            rows={2}
            placeholder="Notes (optional)"
            className="mt-2 w-full resize-none rounded-lg border border-line bg-surface-secondary px-3 py-2 text-sm text-ink outline-none focus:border-ink"
          />
          {release.release_type === "single" && (
            <>
              <input
                value={mgmtDraft}
                onChange={(e) => setMgmtDraft(e.target.value)}
                placeholder="MGMT song code or link"
                className="mt-2 w-full rounded-lg border border-line bg-surface-secondary px-3 py-2 text-sm text-ink outline-none focus:border-ink"
              />
              <p className="mt-1 text-xs text-ink-soft">
                Paste the song&apos;s code (tap Copy on its MGMT song card) — or
                its link — to light up the PROD/EDT/MIX/MST bubbles.
              </p>
            </>
          )}
          <div className="mt-2 flex justify-end gap-2">
            <button
              onClick={() => {
                setTitleDraft(release.title);
                setNotesDraft(release.notes ?? "");
                setMgmtDraft(release.mgmt_link ?? "");
                setEditingTitle(false);
              }}
              className="rounded-lg px-3 py-1.5 text-sm text-ink-soft"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setEditingTitle(false);
                run(() =>
                  updateReleaseDetails(release.id, {
                    title: titleDraft,
                    notes: notesDraft,
                    mgmtLink: mgmtDraft,
                  }),
                );
              }}
              className="rounded-lg bg-ink px-3 py-1.5 text-sm text-surface-primary"
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-4 flex items-start justify-between gap-3">
          <p className="text-sm leading-relaxed text-ink-soft">
            {release.notes || "No notes yet."}
          </p>
          <button
            onClick={() => setEditingTitle(true)}
            aria-label="Edit release details"
            className="shrink-0 text-ink-soft transition-colors hover:text-ink"
          >
            <PencilSimple size={17} />
          </button>
        </div>
      )}

      {/* Phase-by-phase schedule */}
      <div className="space-y-5">
        {phases.map((phase, i) => (
          <div key={`${phase.label}-${i}`}>
            <div className="flex items-baseline justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-ink">
                {phase.label}
              </h3>
              <span className="text-xs text-ink-soft">{fmtDate(phase.date)}</span>
            </div>
            <div className="mt-2 space-y-0.5">
              {phase.tasks.map((t) => (
                <ReleaseTaskRow key={t.id} task={t} onRun={run} />
              ))}
            </div>
            {addingPhase === i ? (
              <input
                autoFocus
                value={taskDraft}
                onChange={(e) => setTaskDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter")
                    submitPhaseTask(phase.label, phase.offsetDays);
                  if (e.key === "Escape") {
                    setTaskDraft("");
                    setAddingPhase(null);
                  }
                }}
                onBlur={() => submitPhaseTask(phase.label, phase.offsetDays)}
                placeholder={`Add a task to ${phase.label}…`}
                className="mt-2 w-full rounded-lg border border-line bg-surface-primary px-2.5 py-1.5 text-sm text-ink outline-none focus:border-ink"
              />
            ) : (
              <button
                onClick={() => {
                  setTaskDraft("");
                  setAddingPhase(i);
                }}
                className="mt-1.5 inline-flex items-center gap-1 text-xs text-ink-soft transition-colors hover:text-ink"
              >
                <Plus size={13} /> Add task
              </button>
            )}
          </div>
        ))}
      </div>

      <LaunchPlanner releaseId={release.id} onRun={run} />

      {/* Footer actions */}
      <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-4">
        {editingDate ? (
          <div className="flex w-full flex-col gap-2 rounded-xl border border-line bg-surface-primary p-3">
            <p className="text-sm text-ink">
              Move the release date — every task shifts to match.
            </p>
            <input
              type="date"
              value={dateDraft}
              onChange={(e) => setDateDraft(e.target.value)}
              className="rounded-lg border border-line bg-surface-secondary px-3 py-2 text-ink outline-none focus:border-ink"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setDateDraft(release.release_date);
                  setEditingDate(false);
                }}
                className="rounded-lg px-3 py-1.5 text-sm text-ink-soft"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setEditingDate(false);
                  if (dateDraft && dateDraft !== release.release_date)
                    run(() => changeReleaseDate(release.id, dateDraft));
                }}
                className="rounded-lg bg-ink px-3 py-1.5 text-sm text-surface-primary"
              >
                Shift dates
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setEditingDate(true)}
            className="text-sm text-ink-soft transition-colors hover:text-ink"
          >
            Change date
          </button>
        )}
      </div>
    </div>
  );
}

const ASSIGNEE_LABEL: Record<Assignee, string | null> = {
  artist: "Artist",
  producer: "Producer",
  both: null,
  unassigned: null,
};

function ReleaseTaskRow({
  task,
  onRun,
}: {
  task: Task;
  onRun: (fn: () => Promise<void>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.description);

  function saveEdit() {
    const text = draft.trim();
    setEditing(false);
    if (!text || text === task.description) {
      setDraft(task.description);
      return;
    }
    onRun(() => updateReleaseTask(task.id, text));
  }

  const tag = ASSIGNEE_LABEL[task.assigned_to];

  return (
    <div className="group flex items-start gap-2.5 py-1">
      <button
        onClick={() => onRun(() => toggleReleaseTask(task.id, !task.is_completed))}
        aria-label={task.is_completed ? "Mark incomplete" : "Mark complete"}
        className={`mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-md border transition-colors ${
          task.is_completed
            ? "border-accent-gold bg-accent-gold/30 text-ink"
            : "border-ink/30 text-transparent hover:border-ink"
        }`}
      >
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
          <path
            d="M2.5 6.2L5 8.5L9.5 3.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {editing ? (
        <textarea
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
          rows={2}
          className="flex-1 resize-none rounded-lg border border-line bg-surface-primary px-2 py-1 text-sm leading-relaxed text-ink outline-none focus:border-ink"
        />
      ) : (
        <p
          onClick={() => setEditing(true)}
          className={`flex-1 cursor-text text-sm leading-relaxed ${
            task.is_completed ? "text-ink-soft line-through" : "text-ink"
          }`}
        >
          {task.description}
          {tag && (
            <span className="ml-2 align-middle text-[10px] uppercase tracking-wide text-ink-soft">
              · {tag}
            </span>
          )}
        </p>
      )}

      <button
        onClick={() => onRun(() => deleteReleaseTask(task.id))}
        aria-label="Delete task"
        className="mt-0.5 shrink-0 text-ink-soft/50 transition-colors hover:text-red-700"
      >
        <X size={15} />
      </button>
    </div>
  );
}

type Idea = { description: string; reason: string; selected: boolean };

function LaunchPlanner({
  releaseId,
  onRun,
}: {
  releaseId: string;
  onRun: (fn: () => Promise<void>) => void;
}) {
  const [loading, setLoading] = useState<"day" | "week" | null>(null);
  const [panel, setPanel] = useState<{ kind: "day" | "week"; ideas: Idea[] } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  async function suggest(kind: "day" | "week") {
    setLoading(kind);
    setError(null);
    setPanel(null);
    try {
      const res = await fetch("/api/releases/launch-ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ releaseId, kind }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPanel({
        kind,
        ideas: (data.ideas as { description: string; reason: string }[]).map(
          (it) => ({ ...it, selected: true }),
        ),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't suggest ideas.");
    } finally {
      setLoading(null);
    }
  }

  function accept() {
    if (!panel) return;
    const picked = panel.ideas.filter((i) => i.selected).map((i) => i.description);
    const kind = panel.kind;
    setPanel(null);
    if (picked.length) onRun(() => addLaunchTasks(releaseId, kind, picked));
  }

  const KIND_LABEL = { day: "Release Day", week: "Release Week" } as const;

  return (
    <div className="mt-6 rounded-xl border border-line bg-surface-primary/60 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink">
        Plan the launch
      </p>
      <p className="mt-1 text-xs text-ink-soft">
        Blank by design. Let Andiamo suggest a release-day and release-week plan
        tailored to you — keep what fits.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {(["day", "week"] as const).map((kind) => (
          <button
            key={kind}
            onClick={() => suggest(kind)}
            disabled={loading !== null}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface-secondary px-3 py-2 text-sm text-ink transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            <Sparkle
              size={15}
              weight="fill"
              className={`text-accent-gold ${loading === kind ? "animate-twinkle" : ""}`}
            />
            {loading === kind ? "Thinking…" : `Plan ${KIND_LABEL[kind]}`}
          </button>
        ))}
      </div>

      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}

      {panel && (
        <div className="mt-4 rounded-xl border border-line bg-surface-primary p-4">
          <p className="text-sm font-medium text-ink">
            Suggested {KIND_LABEL[panel.kind]} plan
          </p>
          <div className="mt-3 space-y-2.5">
            {panel.ideas.map((it, i) => (
              <label key={i} className="flex cursor-pointer items-start gap-2.5">
                <input
                  type="checkbox"
                  checked={it.selected}
                  onChange={() =>
                    setPanel((p) =>
                      p
                        ? {
                            ...p,
                            ideas: p.ideas.map((x, j) =>
                              j === i ? { ...x, selected: !x.selected } : x,
                            ),
                          }
                        : p,
                    )
                  }
                  className="mt-1"
                />
                <span>
                  <span className="text-sm text-ink">{it.description}</span>
                  <span className="block text-xs text-ink-soft">{it.reason}</span>
                </span>
              </label>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={accept}
              className="rounded-lg bg-ink px-4 py-2 text-sm text-surface-primary"
            >
              Add selected
            </button>
            <button
              onClick={() => setPanel(null)}
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

function AddReleaseModal({
  today,
  onClose,
}: {
  today: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [type, setType] = useState<ReleaseType>("single");
  const [notes, setNotes] = useState("");

  const canSubmit = title.trim() && date;

  function submit() {
    if (!canSubmit) return;
    startTransition(async () => {
      await addRelease({
        title: title.trim(),
        releaseDate: date,
        releaseType: type,
        notes: notes.trim() || undefined,
      });
      router.refresh();
      onClose();
    });
  }

  return (
    <div
      onClick={onClose}
      className="fade-in fixed inset-0 z-[80] flex items-end justify-center bg-ink/40 sm:items-center"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl bg-surface-primary p-6 shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl text-ink">Add a release</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-ink-soft transition-colors hover:text-ink"
          >
            <X size={22} />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label className="text-xs uppercase tracking-wide text-ink-soft">
              Song or project title
            </label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Midnight Drive"
              className="mt-1.5 w-full rounded-xl border border-line bg-surface-secondary px-3 py-2.5 text-ink outline-none focus:border-ink"
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-wide text-ink-soft">
              Release date
            </label>
            <input
              type="date"
              value={date}
              min={today}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-line bg-surface-secondary px-3 py-2.5 text-ink outline-none focus:border-ink"
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-wide text-ink-soft">
              Type
            </label>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              {(["single", "project"] as ReleaseType[]).map((opt) => (
                <button
                  key={opt}
                  onClick={() => setType(opt)}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                    type === opt
                      ? "border-ink bg-ink text-surface-primary"
                      : "border-line bg-surface-secondary text-ink"
                  }`}
                >
                  {TYPE_LABEL[opt]}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-ink-soft">
              {type === "single"
                ? "Generates a 12-week single strategy schedule."
                : "Generates a 20-week project (EP/album) schedule."}
            </p>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wide text-ink-soft">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. lead single from EP, co-release with feature"
              className="mt-1.5 w-full resize-none rounded-xl border border-line bg-surface-secondary px-3 py-2.5 text-sm text-ink outline-none focus:border-ink"
            />
          </div>
        </div>

        <button
          onClick={submit}
          disabled={!canSubmit || pending}
          className="mt-6 w-full rounded-xl bg-ink py-3 font-medium text-surface-primary transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Building schedule…" : "Add release & build schedule"}
        </button>
      </div>
    </div>
  );
}
