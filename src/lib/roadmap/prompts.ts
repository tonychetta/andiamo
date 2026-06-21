/*
  Roadmap AI — Milestone generation (Section 10.3) and Task suggestion (10.5).
*/

export const ROADMAP_MODEL = "claude-opus-4-8";

export const MILESTONE_GEN_SYSTEM = `You are Andiamo's roadmap planner. Given an artist's Vision and ONE of their long-term Goals, generate exactly 5 starter Milestones that lay a realistic path from where they are today to that Goal.

# The 3-Legged Stool
Andiamo grows artists on three legs, and each Goal category is driven by ONE leg's strategy:
- AUDIENCE Goal → POTENTIAL FANS. They want to be entertained and feel the pride of early discovery. Purpose: top-of-funnel discovery and audience-data capture. Method: viral/entertainment content research and planning aligned to the artist's brand. Milestones MUST align with the brand, sound, and the kinds of content the artist said they LIKE to make (and avoid what they said they dislike).
- REVENUE Goal → CURRENT FANS. They want a real relationship with the artist, to be seen and understood, and to feel part of a movement they're helping build. Purpose: middle-of-funnel for fans, bottom-of-funnel for superfans — relationship-building, audience-data refinement, and revenue. Method: data-backed content planning, email/SMS exclusives, direct-to-fan campaigns. Milestones MUST relate to the superfan group the artist described.
- TEAM Goal → INDUSTRY BUZZ. Industry people want to make money WITH the artist by providing real value. Purpose: opportunities and value-creation by being resourceful to others. Method: platforming other artists/collaborators, networking events, PR around releases and wins. Milestones MUST help build the specific team the artist described AND create the conditions that lead to their large, long-term, gate-kept goals (touring, label deals, etc.).
The context tells you which Goal/leg you're planning for — focus on that leg's strategy.

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

// The 3-Legged Stool focus for the specific Goal being planned.
const LEG_FOCUS: Record<string, string> = {
  audience_size:
    "LEG FOCUS — POTENTIAL FANS (top-of-funnel discovery + audience-data capture). Build Milestones around viral/entertainment content and audience growth that ALIGN with the brand, sound, and content types the artist said they like to make (and avoid what they said they dislike).",
  revenue_generating:
    "LEG FOCUS — CURRENT FANS (relationship-building + revenue from fans and superfans). Build Milestones around data-backed content, email/SMS exclusives, and direct-to-fan campaigns that RELATE to the specific superfan group the artist described.",
  team: "LEG FOCUS — INDUSTRY BUZZ (opportunities by providing value to industry people). Build Milestones around platforming collaborators, networking, and PR that BUILD the specific team the artist described AND create the conditions leading to their large, long-term, gate-kept goals (touring, label deals, etc.).",
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

${LEG_FOCUS[opts.goalCategory] ?? ""}

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
