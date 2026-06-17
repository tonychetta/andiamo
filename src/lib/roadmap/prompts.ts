/*
  Roadmap AI — Milestone generation (Section 10.3) and Task suggestion (10.5).
*/

export const ROADMAP_MODEL = "claude-opus-4-8";

export const MILESTONE_GEN_SYSTEM = `You are Andiamo's roadmap planner. Given an artist's Vision and ONE of their long-term Goals, generate exactly 5 starter Milestones that lay a realistic path from where they are today to that Goal.

Rules:
- Each Milestone is specific enough to derive concrete Tasks from, and time-bound (include a rough timeframe or year). ALL timeframes must be in the FUTURE relative to the current date given in the context.
- Calibrate to the artist's CURRENT starting line from the conversation (their current shows, audience size, team, runway) — not generic advice. Milestone 1 should be a realistic near-term next step from where they are now.
- Mix artist-produced outcomes (releases, audience growth, content metrics) with relational/positional outcomes (signings, press, partnerships).
- Order chronologically: Milestone 1 is the NEAREST next step; Milestone 5 is the furthest toward the Goal.
- Control logic: if a Milestone depends on a gatekeeper or an outcome outside the artist's control (a label signing, a manager saying yes, a festival booking), it MUST be preceded by an in-their-control Milestone that creates the conditions for it (hit an audience number, release a strong project). Never make the path just "hope a gatekeeper says yes."
- EXTREMELY concise: each Milestone title is 5 to 10 words — short enough to scan at a glance — while still specific and time-bound. Example: "Book regional 150-cap shows outside Nashville by December 2026." No filler words, no full sentences.

Respond with JSON: { "milestones": [ { "description": <string> }, ... ] } — exactly 5, chronological (nearest first).`;

export const MILESTONE_SCHEMA = {
  type: "object",
  properties: {
    milestones: {
      type: "array",
      items: {
        type: "object",
        properties: { description: { type: "string" } },
        required: ["description"],
        additionalProperties: false,
      },
    },
  },
  required: ["milestones"],
  additionalProperties: false,
} as const;

export const TASK_SUGGEST_SYSTEM = `You are Andiamo's roadmap planner. Given ONE specific Milestone (with the artist's Vision and Goal for context), suggest 5 to 7 concrete, immediately actionable Tasks that move the artist toward completing that Milestone.

Rules:
- The Milestone description is your primary signal. Each Task must be specific and obvious enough to start right away.
- Calibrate to the artist's real situation from the conversation.
- For each Task, give a short "reason" (one phrase) for why it helps reach the Milestone — this builds the artist's trust in the suggestion.
- Keep each Task to one short sentence.

Respond with JSON: { "tasks": [ { "description": <string>, "reason": <string> }, ... ] } — 5 to 7 tasks.`;

export const TASK_SCHEMA = {
  type: "object",
  properties: {
    tasks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          description: { type: "string" },
          reason: { type: "string" },
        },
        required: ["description", "reason"],
        additionalProperties: false,
      },
    },
  },
  required: ["tasks"],
  additionalProperties: false,
} as const;

const CATEGORY_LABEL: Record<string, string> = {
  revenue_generating: "Revenue",
  audience_size: "Audience",
  team: "Team",
  catalog: "Catalog",
  recognition_awards: "Recognition",
};

type Turn = { role: string; content: string };

function flattenTranscript(messages: Turn[]): string {
  if (!messages.length) return "(no conversation on file)";
  return messages
    .map((m) => `${m.role === "user" ? "Artist" : "Builder"}: ${m.content}`)
    .join("\n");
}

export function milestoneContext(opts: {
  statement: string;
  goalCategory: string;
  goalDescription: string;
  transcript: Turn[];
  today: string;
}): string {
  return `Today's date is ${opts.today}. Every Milestone timeframe must be in the future from today.

VISION STATEMENT:
${opts.statement}

THE GOAL to plan Milestones for (${CATEGORY_LABEL[opts.goalCategory] ?? opts.goalCategory}):
${opts.goalDescription}

THE ARTIST'S CONVERSATION (use this for their current starting line and context):
${flattenTranscript(opts.transcript)}`;
}

export function taskContext(opts: {
  statement: string;
  goalDescription: string;
  milestoneDescription: string;
  transcript: Turn[];
  today: string;
}): string {
  return `Today's date is ${opts.today}.

VISION STATEMENT:
${opts.statement}

THE GOAL:
${opts.goalDescription}

THE MILESTONE to suggest Tasks for:
${opts.milestoneDescription}

THE ARTIST'S CONVERSATION (context for their real situation):
${flattenTranscript(opts.transcript)}`;
}
