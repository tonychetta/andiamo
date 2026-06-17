"use client";

import { useState, useTransition } from "react";
import { PencilSimple, ChatCircle } from "@phosphor-icons/react";
import {
  updateVisionStatement,
  updateGoalDescription,
} from "@/app/(app)/vision/actions";
import { VisionBuilder } from "./VisionBuilder";

type Turn = { role: "user" | "assistant"; content: string };
type Goal = { id: string; category: string; description: string };
type Vision = { id: string; statement_text: string };

const CATEGORY_LABEL: Record<string, string> = {
  revenue_generating: "Revenue",
  audience_size: "Audience",
  team: "Team",
  catalog: "Catalog",
  recognition_awards: "Recognition",
};

export function VisionView({
  vision,
  goals,
  transcript,
}: {
  vision: Vision;
  goals: Goal[];
  transcript: Turn[];
}) {
  const [mode, setMode] = useState<"vision" | "builder">("vision");

  // Refine: reopen the Builder with the previous conversation visible, so the
  // artist can add to it or ask for adjustments — not start over.
  if (mode === "builder") {
    return (
      <VisionBuilder
        initialMessages={transcript}
        isRefine
        onViewVision={() => setMode("vision")}
      />
    );
  }

  return (
    <div>
      {/* Always-visible toggle to flip into the conversation */}
      <button
        onClick={() => setMode("builder")}
        className="fixed left-4 top-4 z-50 inline-flex items-center gap-1.5 rounded-full bg-surface-secondary px-3 py-2 text-sm text-ink shadow-sm transition-colors hover:bg-surface-accent"
      >
        <ChatCircle size={16} />
        Refine
      </button>

      <p className="text-sm uppercase tracking-[0.2em] text-ink-soft">
        Your Vision
      </p>

      {/* Vision Statement */}
      <EditableBlock
        value={vision.statement_text}
        onSave={(text) => updateVisionStatement(vision.id, text)}
        render={(text) => (
          <p className="mt-4 font-serif text-2xl leading-snug text-ink">
            {text}
          </p>
        )}
      />

      {/* 3 Goals */}
      <h2 className="mt-12 font-serif text-xl text-ink">Your 3 Goals</h2>
      <div className="mt-4 space-y-4">
        {goals.map((goal) => (
          <div key={goal.id} className="rounded-2xl bg-surface-secondary p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-ink-soft">
              {CATEGORY_LABEL[goal.category] ?? goal.category}
            </p>
            <EditableBlock
              value={goal.description}
              onSave={(text) => updateGoalDescription(goal.id, text)}
              render={(text) => (
                <p className="mt-2 leading-relaxed text-ink">{text}</p>
              )}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function EditableBlock({
  value,
  onSave,
  render,
}: {
  value: string;
  onSave: (text: string) => Promise<void>;
  render: (text: string) => React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      await onSave(draft);
      setEditing(false);
    });
  }

  if (editing) {
    return (
      <div className="mt-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={4}
          className="w-full resize-none rounded-xl border border-line bg-surface-primary px-4 py-3 text-ink outline-none focus:border-ink"
        />
        <div className="mt-2 flex gap-2">
          <button
            onClick={save}
            disabled={pending}
            className="rounded-lg bg-ink px-4 py-2 text-sm text-surface-primary transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save"}
          </button>
          <button
            onClick={() => {
              setDraft(value);
              setEditing(false);
            }}
            className="rounded-lg px-4 py-2 text-sm text-ink-soft transition-colors hover:text-ink"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative">
      {render(value)}
      <button
        onClick={() => {
          setDraft(value);
          setEditing(true);
        }}
        aria-label="Edit"
        className="mt-2 inline-flex items-center gap-1.5 text-sm text-ink-soft transition-colors hover:text-ink"
      >
        <PencilSimple size={15} />
        Edit
      </button>
    </div>
  );
}
