"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Star,
  DotsThree,
  CaretDown,
  CaretUp,
  ArrowsClockwise,
} from "@phosphor-icons/react";
import {
  setTaskStatus,
  setTaskOnWtf,
  setTaskPriority,
  setTaskAssignee,
  setTaskPushReason,
} from "@/app/(app)/roadmap/actions";
import { toggleReleaseTask } from "@/app/(app)/releases/actions";
import { generateWtf, deleteWtf } from "@/app/(app)/wtf/actions";

type Milestone = {
  id: string;
  description: string;
  status: string;
  priority: boolean;
  goalLabel: string;
  assignedCoachId: string | null;
  pushReason: string | null;
};
type Coach = { id: string; name: string };

const PUSH_REASONS = [
  "Task wasn't broken down enough",
  "Capacity was overestimated",
  "Wasn't sure how to do it",
  "Blocked by external dependency",
  "Lost focus / motivation",
  "Other",
];
type Release = {
  id: string;
  description: string;
  completed: boolean;
  dueDate: string | null;
  releaseTitle: string;
};
type Content = {
  id: string;
  date: string;
  typeName: string;
  typeColor: string;
  songTitle: string;
  sections: string[];
};

const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function weekDates(start: string): string[] {
  const [y, m, d] = start.split("-").map(Number);
  const base = Date.UTC(y, m - 1, d);
  return Array.from({ length: 7 }, (_, i) =>
    new Date(base + i * 86_400_000).toISOString().slice(0, 10),
  );
}
type Compiled = {
  weekStart: string;
  weekEnd: string;
  milestones: Milestone[];
  releases: Release[];
  content: Content[];
};
type HistoryRow = {
  id: string;
  week_start: string;
  generated_at: string;
  payload: unknown;
};

function isDone(status: string) {
  return status === "completed" || status === "complete_and_push";
}
function fmtDay(s: string): string {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function WTFView({
  label,
  compiled,
  history,
  isCoach = false,
  tier = "diy",
  artistName = "Artist",
  coaches = [],
}: {
  label: string;
  compiled: Compiled;
  history: HistoryRow[];
  isCoach?: boolean;
  tier?: string;
  artistName?: string;
  coaches?: Coach[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<null | "ok" | "no-email">(null);
  const [showHistory, setShowHistory] = useState(false);

  function run(fn: () => Promise<unknown>) {
    startTransition(async () => {
      await fn();
      router.refresh();
    });
  }

  function generate() {
    setSending(true);
    setSent(null);
    generateWtf().then((r) => {
      setSending(false);
      setSent(r.emailed ? "ok" : "no-email");
      router.refresh();
    });
  }

  const milestones = [...compiled.milestones].sort(
    (a, b) => Number(b.priority) - Number(a.priority),
  );
  const empty =
    milestones.length === 0 &&
    compiled.releases.length === 0 &&
    compiled.content.length === 0;

  return (
    <section className="pb-4">
      <Link
        href="/roadmap"
        className="inline-flex items-center gap-1.5 text-sm text-ink-soft transition-colors hover:text-ink"
      >
        <ArrowLeft size={18} /> Roadmap
      </Link>

      <p className="mt-4 text-xs uppercase tracking-[0.2em] text-ink-soft">
        Weekly Task Form
      </p>
      <h1 className="mt-1 font-serif text-3xl leading-tight text-ink">
        Week of {label}
      </h1>

      {empty ? (
        <div className="mt-8 rounded-2xl border border-dashed border-line p-8 text-center text-sm text-ink-soft">
          Nothing on this week&apos;s WTF yet. Swipe Milestone Tasks right on the
          Roadmap, and Release/Content tasks for this week show up here
          automatically.
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {milestones.length > 0 &&
            (tier === "dwy" && coaches.length > 0 ? (
              <>
                {milestones.filter((m) => !m.assignedCoachId).length > 0 && (
                  <Section title={`${artistName} (Artist)`}>
                    {milestones
                      .filter((m) => !m.assignedCoachId)
                      .map((m) => (
                        <MilestoneRow
                          key={m.id}
                          m={m}
                          onRun={run}
                          showAssign
                          isCoach={isCoach}
                          coaches={coaches}
                          artistName={artistName}
                        />
                      ))}
                  </Section>
                )}
                {coaches.map((c) => {
                  const cm = milestones.filter((m) => m.assignedCoachId === c.id);
                  if (cm.length === 0) return null;
                  return (
                    <Section key={c.id} title={`${c.name} (Coach)`}>
                      {cm.map((m) => (
                        <MilestoneRow
                          key={m.id}
                          m={m}
                          onRun={run}
                          showAssign
                          isCoach={isCoach}
                          coaches={coaches}
                          artistName={artistName}
                        />
                      ))}
                    </Section>
                  );
                })}
              </>
            ) : (
              <Section title="Milestone Tasks">
                {milestones.map((m) => (
                  <MilestoneRow
                    key={m.id}
                    m={m}
                    onRun={run}
                    showAssign={false}
                    isCoach={isCoach}
                    coaches={coaches}
                    artistName={artistName}
                  />
                ))}
              </Section>
            ))}

          {compiled.releases.length > 0 && (
            <Section title="Release Tasks">
              {compiled.releases.map((r) => (
                <label
                  key={r.id}
                  className="flex cursor-pointer items-start gap-2.5 py-1.5"
                >
                  <input
                    type="checkbox"
                    checked={r.completed}
                    onChange={() =>
                      run(() => toggleReleaseTask(r.id, !r.completed))
                    }
                    className="mt-1"
                  />
                  <span>
                    <span
                      className={`text-sm ${r.completed ? "text-ink-soft line-through" : "text-ink"}`}
                    >
                      {r.description}
                    </span>
                    <span className="block text-xs text-ink-soft">
                      {r.releaseTitle}
                      {r.dueDate ? ` · ${fmtDay(r.dueDate)}` : ""}
                    </span>
                  </span>
                </label>
              ))}
            </Section>
          )}

          {compiled.content.length > 0 && (
            <div>
              <h2 className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft">
                Content
              </h2>
              <div className="grid grid-cols-7 gap-1">
                {weekDates(compiled.weekStart).map((d) => {
                  const [yy, mm, dd] = d.split("-").map(Number);
                  const dow = new Date(Date.UTC(yy, mm - 1, dd)).getUTCDay();
                  const items = compiled.content.filter((c) => c.date === d);
                  return (
                    <div
                      key={d}
                      className="min-h-[72px] rounded-lg bg-surface-secondary p-1"
                    >
                      <div className="text-[9px] uppercase text-ink-soft">
                        {WD[dow]}
                      </div>
                      <div className="text-[11px] text-ink">{dd}</div>
                      <div className="mt-0.5 space-y-0.5">
                        {items.map((c) => (
                          <div
                            key={c.id}
                            className="rounded px-1 py-0.5 text-[9px] leading-tight text-ink"
                            style={{ backgroundColor: `${c.typeColor}40` }}
                          >
                            {c.typeName}
                            <span className="block text-ink-soft">
                              {c.songTitle}
                              {c.sections.length
                                ? ` · ${c.sections.join(", ")}`
                                : ""}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Generate */}
      <div className="mt-8">
        <button
          onClick={generate}
          disabled={sending || empty}
          className="w-full rounded-xl bg-accent-cyan py-3 font-medium text-ink transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {sending
            ? "Sending…"
            : sent === "ok"
              ? "WTF Sent ✓"
              : sent === "no-email"
                ? "WTF Sent · email failed"
                : "Send WTF"}
        </button>
        {sent === "no-email" && (
          <p className="mt-2 text-center text-xs text-ink-soft">
            Saved, but the email didn&apos;t send. Check the recipient&apos;s
            email address.
          </p>
        )}
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="mt-8">
          <button
            onClick={() => setShowHistory((s) => !s)}
            className="flex w-full items-center justify-between py-2 text-sm uppercase tracking-[0.18em] text-ink-soft"
          >
            <span>Past WTFs ({history.length})</span>
            {showHistory ? <CaretUp size={16} /> : <CaretDown size={16} />}
          </button>
          {showHistory && (
            <div className="mt-2 space-y-2">
              {history.map((h) => (
                <HistoryItem key={h.id} row={h} onDelete={() => run(() => deleteWtf(h.id))} />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft">
        {title}
      </h2>
      <div className="rounded-2xl bg-surface-secondary px-4 py-1.5">
        {children}
      </div>
    </div>
  );
}

function MilestoneRow({
  m,
  onRun,
  showAssign,
  isCoach,
  coaches,
  artistName,
}: {
  m: Milestone;
  onRun: (fn: () => Promise<unknown>) => void;
  showAssign: boolean;
  isCoach: boolean;
  coaches: Coach[];
  artistName: string;
}) {
  const [menu, setMenu] = useState(false);
  const done = isDone(m.status);

  function act(fn: () => Promise<unknown>) {
    setMenu(false);
    onRun(fn);
  }

  return (
    <div className="border-b border-line py-2 last:border-0">
    <div className="relative flex items-start gap-2">
      <button
        onClick={() => onRun(() => setTaskPriority(m.id))}
        aria-label="Make priority"
        className="mt-0.5 shrink-0"
      >
        <Star
          size={18}
          weight={m.priority ? "fill" : "regular"}
          className={m.priority ? "text-accent-gold" : "text-ink-soft/50"}
          style={
            m.priority ? { filter: "drop-shadow(0 0 4px rgba(199,163,92,0.7))" } : undefined
          }
        />
      </button>

      <span className="flex-1">
        <span
          className={`text-sm leading-snug ${done ? "text-ink-soft line-through" : "text-ink"}`}
        >
          {m.description}
        </span>
        {m.status === "pushed" && (
          <span className="ml-2 align-middle text-xs uppercase tracking-wide text-ink-soft">
            · pushed
          </span>
        )}
        {m.status === "complete_and_push" && (
          <ArrowsClockwise size={13} className="ml-1.5 inline align-middle text-ink-soft" />
        )}
        {m.goalLabel && (
          <span className="block text-xs text-ink-soft">{m.goalLabel}</span>
        )}
      </span>

      <button
        onClick={() => setMenu((o) => !o)}
        aria-label="Task options"
        className="mt-0.5 shrink-0 text-ink-soft transition-colors hover:text-ink"
      >
        <DotsThree size={20} weight="bold" />
      </button>

      {menu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenu(false)} />
          <div className="absolute right-0 top-7 z-50 w-56 overflow-hidden rounded-xl border border-line bg-surface-primary py-1 shadow-lg">
            <Item onClick={() => act(() => setTaskStatus(m.id, "completed"))}>
              Complete
            </Item>
            <Item onClick={() => act(() => setTaskStatus(m.id, "pushed"))}>
              Push to Next Week
            </Item>
            <Item onClick={() => act(() => setTaskStatus(m.id, "complete_and_push"))}>
              Complete and Push
            </Item>
            {showAssign && (
              <>
                <div className="my-1 border-t border-line" />
                <Item onClick={() => act(() => setTaskAssignee(m.id, null))}>
                  Assign to {artistName}
                </Item>
                {coaches.map((c) => (
                  <Item
                    key={c.id}
                    onClick={() => act(() => setTaskAssignee(m.id, c.id))}
                  >
                    Assign to {c.name}
                  </Item>
                ))}
              </>
            )}
            <div className="my-1 border-t border-line" />
            <Item onClick={() => act(() => setTaskOnWtf(m.id, false))}>
              Remove from WTF
            </Item>
          </div>
        </>
      )}
      </div>

      {/* Coach-only "why was this pushed?" diagnostic (never shown to artist) */}
      {isCoach && m.status === "pushed" && (
        <select
          value={m.pushReason ?? ""}
          onChange={(e) => onRun(() => setTaskPushReason(m.id, e.target.value))}
          className="mt-1.5 w-full rounded-lg border border-line bg-surface-primary px-2 py-1 text-xs text-ink-soft outline-none focus:border-ink"
        >
          <option value="">Why pushed? (coach note)</option>
          {PUSH_REASONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

function Item({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="block w-full px-4 py-2.5 text-left text-sm text-ink transition-colors hover:bg-surface-secondary"
    >
      {children}
    </button>
  );
}

function HistoryItem({
  row,
  onDelete,
}: {
  row: HistoryRow;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const p = row.payload as Compiled | null;
  const total =
    (p?.milestones?.length ?? 0) +
    (p?.releases?.length ?? 0) +
    (p?.content?.length ?? 0);
  return (
    <div className="rounded-xl border border-line bg-surface-secondary p-3">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="text-sm text-ink">
          Week of{" "}
          {new Date(row.generated_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </span>
        <span className="text-xs text-ink-soft">{total} tasks</span>
      </button>
      {open && p && (
        <div className="mt-2 space-y-1 border-t border-line pt-2">
          {[...(p.milestones ?? []), ...[]].map((m) => (
            <p key={m.id} className="text-xs text-ink">
              {m.priority ? "★ " : "• "}
              {m.description}
            </p>
          ))}
          {(p.releases ?? []).map((r) => (
            <p key={r.id} className="text-xs text-ink-soft">
              • {r.description}
            </p>
          ))}
          {(p.content ?? []).map((c) => (
            <p key={c.id} className="text-xs text-ink-soft">
              • {c.typeName} — {c.songTitle}
            </p>
          ))}
          <button
            onClick={onDelete}
            className="mt-1 text-xs text-red-700 transition-opacity hover:opacity-80"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
