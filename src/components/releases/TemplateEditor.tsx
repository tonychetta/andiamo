"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "@phosphor-icons/react";
import { saveTemplate, resetTemplate } from "@/app/(app)/releases/actions";

type Phase = { label: string; offsetDays: number; tasks: string[] };
type TemplateType = "single" | "project";

export type TemplatesProp = {
  single: Phase[];
  project: Phase[];
  singleCustom: boolean;
  projectCustom: boolean;
};

const clone = (phases: Phase[]): Phase[] =>
  phases.map((p) => ({ ...p, tasks: [...p.tasks] }));

export function TemplateEditor({
  templates,
  onClose,
}: {
  templates: TemplatesProp;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [type, setType] = useState<TemplateType>("single");
  const [draft, setDraft] = useState<Record<TemplateType, Phase[]>>({
    single: clone(templates.single),
    project: clone(templates.project),
  });

  const phases = draft[type];
  const isCustom =
    type === "single" ? templates.singleCustom : templates.projectCustom;

  function editPhase(pi: number, mutate: (tasks: string[]) => string[]) {
    setDraft((d) => {
      const next = { ...d, [type]: clone(d[type]) };
      next[type][pi].tasks = mutate(next[type][pi].tasks);
      return next;
    });
  }

  function save() {
    startTransition(async () => {
      await saveTemplate(type, draft[type]);
      router.refresh();
      onClose();
    });
  }

  function reset() {
    startTransition(async () => {
      await resetTemplate(type);
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
        className="flex max-h-[88vh] w-full max-w-md flex-col rounded-t-3xl bg-surface-primary shadow-2xl sm:rounded-3xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6">
          <h2 className="font-serif text-2xl text-ink">Task templates</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-ink-soft transition-colors hover:text-ink"
          >
            <X size={22} />
          </button>
        </div>
        <p className="px-6 pt-1 text-sm text-ink-soft">
          Edits apply to <strong className="text-ink">future</strong> releases.
          Releases already underway keep their own tasks.
        </p>

        {/* Type toggle */}
        <div className="px-6 pt-4">
          <div className="grid grid-cols-2 gap-2">
            {(["single", "project"] as TemplateType[]).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`rounded-xl border px-3 py-2 text-sm font-medium capitalize transition-colors ${
                  type === t
                    ? "border-ink bg-ink text-surface-primary"
                    : "border-line bg-surface-secondary text-ink"
                }`}
              >
                {t === "single" ? "Single (12 wk)" : "Project (20 wk)"}
              </button>
            ))}
          </div>
          {isCustom && (
            <p className="mt-2 text-xs text-accent-gold">
              Customized — using your edited version for new releases.
            </p>
          )}
        </div>

        {/* Scrollable phases */}
        <div className="mt-4 flex-1 space-y-5 overflow-y-auto px-6 pb-4">
          {phases.map((phase, pi) => (
            <div key={`${phase.label}-${pi}`}>
              <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-ink">
                {phase.label}
              </h3>
              <div className="mt-2 space-y-2">
                {phase.tasks.map((task, ti) => (
                  <div key={ti} className="flex items-start gap-2">
                    <textarea
                      value={task}
                      onChange={(e) =>
                        editPhase(pi, (tasks) =>
                          tasks.map((t, j) => (j === ti ? e.target.value : t)),
                        )
                      }
                      rows={2}
                      className="flex-1 resize-none rounded-lg border border-line bg-surface-secondary px-2.5 py-1.5 text-sm leading-snug text-ink outline-none focus:border-ink"
                    />
                    <button
                      onClick={() =>
                        editPhase(pi, (tasks) =>
                          tasks.filter((_, j) => j !== ti),
                        )
                      }
                      aria-label="Delete task"
                      className="mt-1 shrink-0 text-ink-soft/50 transition-colors hover:text-red-700"
                    >
                      <X size={15} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => editPhase(pi, (tasks) => [...tasks, ""])}
                  className="inline-flex items-center gap-1 text-xs text-ink-soft transition-colors hover:text-ink"
                >
                  <Plus size={13} /> Add task
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 border-t border-line px-6 py-4">
          {isCustom ? (
            <button
              onClick={reset}
              disabled={pending}
              className="text-sm text-ink-soft transition-colors hover:text-ink disabled:opacity-50"
            >
              Reset to default
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-xl border border-line px-4 py-2 text-sm text-ink"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={pending}
              className="rounded-xl bg-ink px-4 py-2 text-sm font-medium text-surface-primary transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save template"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
