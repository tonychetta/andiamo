// Prompts for the AI-suggested Release Day & Release Week plans (Section 11.5 /
// 11.6). Both templates default to BLANK; the artist taps a button and the model
// surfaces 5–7 ideas tailored to their scale and style. Suggestions are starting
// points — the artist picks which to keep.

export const RELEASE_MODEL = "claude-opus-4-8";

const VOICE = `You are Andiamo, an artist-development strategist. Write like a sharp, grounded manager — concrete and specific, never hypey. Tailor everything to THIS artist's scale and style as revealed by their Vision; a bedroom artist with 800 listeners and an arena-bound act should get different ideas. Each idea is ONE actionable task (a thing the artist can actually do), not a category. Keep descriptions tight (one line). Reasons are one short clause on why it matters. No exclamation marks.`;

export const DAY_SUGGEST_SYSTEM = `${VOICE}

Generate 5–7 release-DAY actions for the song/project releasing today. Draw from across these areas (don't force all of them — pick what fits the artist):
- Celebration & visibility (midnight launch post, story takeover, going live, reaction video, personal thank-you DMs)
- Engagement & fan connection (listening party, surprise fan calls, VIP drop for email/SMS subscribers, public Q&A)
- Promotion & momentum (curator follow-ups, paid boost, cross-promo with collaborators, shoutouts to pre-savers, Spotify Canvas)
- Local activations (release-day local show, listening event)
- Physical/merch (signed copies, limited variant, fan gift packages — only if realistic for their scale)

Return JSON only.`;

export const WEEK_SUGGEST_SYSTEM = `${VOICE}

Generate a 7-day content + engagement cadence for release WEEK — exactly 7 ideas, one per day, in order. Begin each description with "Day N: " (Day 1 is release day). Use this arc as a guide but tailor it: Day 1 launch announcement, Day 2 reaction content, Day 3 behind-the-scenes, Day 4 performance content, Day 5 lyric breakdown or storytelling, Day 6 cross-promotion, Day 7 one-week recap and fan thank-you. Weave in engagement and press follow-through where natural.

Return JSON only.`;

export const LAUNCH_SCHEMA = {
  type: "object",
  properties: {
    ideas: {
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
  required: ["ideas"],
  additionalProperties: false,
} as const;

function context({
  kind,
  statement,
  goals,
  title,
  type,
  notes,
}: {
  kind: "day" | "week";
  statement: string;
  goals: { category: string; description: string }[];
  title: string;
  type: "single" | "project";
  notes: string | null;
}) {
  const goalLines = goals.length
    ? goals.map((g) => `- ${g.description}`).join("\n")
    : "(none recorded)";
  return `THE ARTIST'S VISION
${statement || "(not set)"}

THEIR GOALS
${goalLines}

THE RELEASE
- Title: ${title}
- Type: ${type === "project" ? "Project (EP/album)" : "Single"}
${notes ? `- Notes: ${notes}` : ""}

Suggest ${kind === "day" ? "release-day actions" : "the 7-day release-week cadence"} for this release, tailored to where this artist actually is.`;
}

export const dayContext = (a: Omit<Parameters<typeof context>[0], "kind">) =>
  context({ ...a, kind: "day" });
export const weekContext = (a: Omit<Parameters<typeof context>[0], "kind">) =>
  context({ ...a, kind: "week" });
