// Release Strategy Templates (Section 11.4). Each phase carries an offset in
// days relative to release day (negative = before, 0 = release day, positive =
// after). On release creation we expand the right template into dated tasks; on
// a date change we recompute each task's date from its offset. These are the
// canonical defaults — per-artist template editing is a later layer.

export type ReleaseAssignee = "artist" | "producer" | "both";

export type TemplateTask = {
  description: string;
  assignee: ReleaseAssignee;
};

export type TemplatePhase = {
  // The named Phase this week belongs to (a visual separator across weeks).
  group?: string;
  // The week's timing, e.g. "12 Weeks Out".
  label: string;
  // The week's title (the "A." heading), e.g. "Brand Definition & Resource Gathering".
  title?: string;
  offsetDays: number;
  tasks: TemplateTask[];
};

// Assignment is a separate manual/DWY step, so assignee defaults to "both".
const t = (description: string, assignee: ReleaseAssignee = "both"): TemplateTask => ({
  description,
  assignee,
});

// Phase names — reused across the weeks that belong to each phase.
const P1 = "PHASE 1 → Branding & Resources";
const P2 = "PHASE 2 → Production, Pitching, & Planning";
const P3 = "PHASE 3 → Whisper, Tease, Shout";
const P4 = "PHASE 4 → Bombard & Learn";

// ---------- Single Release Strategy Template (12 weeks) ----------
export const SINGLE_TEMPLATE: TemplatePhase[] = [
  {
    group: P1,
    label: "12 Weeks Out",
    title: "Brand Definition & Resource Gathering",
    offsetDays: -84,
    tasks: [
      t(
        "Define the song's marketing angle — the one sentence about this song that becomes the hook of every pitch, caption, and outreach",
      ),
      t("Build target press list of 30–50 names with personalized pitch angle"),
      t(
        "Build target playlist list — both editorial (Spotify/Apple) and independent curators",
      ),
      t("Identify potential sync opportunities; brief publisher if applicable"),
      t("Submit PRO registration"),
    ],
  },
  {
    group: P1,
    label: "10 Weeks Out",
    title: "Content Vault",
    offsetDays: -70,
    tasks: [
      t("Finalize artwork direction; brief designer/photographer"),
      t(
        "Begin assembling content vault — behind-the-scenes footage, voice memos, live clips, anything cuttable into pre-release content",
      ),
      t("Assemble the visual world"),
    ],
  },
  {
    group: P2,
    label: "8 Weeks Out",
    title: "Production Halfway Done and Photos",
    offsetDays: -56,
    tasks: [
      t("Finish PROD and EDT phases"),
      t("Final artwork approved"),
      t("Photo shoot for press assets and/or your own posts"),
    ],
  },
  {
    group: P2,
    label: "7 Weeks Out",
    title: "Finish Entire Song",
    offsetDays: -49,
    tasks: [t("Finish MIX and MST phases")],
  },
  {
    group: P2,
    label: "6 Weeks Out",
    title: "Set the Release in Motion",
    offsetDays: -42,
    tasks: [
      t("Upload to distribution"),
      t("Submit Spotify editorial pitch via S4A"),
      t("Submit Apple Music editorial pitch via AM4A"),
      t("Submit YouTube Music editorial pitch if applicable"),
      t("Confirm pre-save link is live"),
    ],
  },
  {
    group: P2,
    label: "5 Weeks Out",
    title: "Pitching and Release Week Visualizer Planning",
    offsetDays: -35,
    tasks: [
      t(
        "Begin press outreach — first wave of personalized pitches to target press list",
      ),
      t("Begin direct playlist pitching to independent curators"),
      t("Begin sync pitching if applicable"),
      t("Plan the visual companion — music video, visualizer, or lyric video"),
    ],
  },
  {
    group: P3,
    label: "4 Weeks Out",
    title: "Content Cadence Begins / Marketing Planning",
    offsetDays: -28,
    tasks: [
      t("Schedule release-week content in the Content calendar"),
      t(
        "First Whisper content drops — short clips, snippet posts, lyric reveals",
      ),
      t(
        "Schedule any release-week press appearances (podcasts, radio, interviews, livestreams)",
      ),
      t("Build the email/SMS list announcement"),
    ],
  },
  {
    group: P3,
    label: "3 Weeks Out",
    title: "Whisper",
    offsetDays: -21,
    tasks: [
      t("Continue Whisper content"),
      t("Drop pre-save link on all channels"),
    ],
  },
  {
    group: P3,
    label: "2 Weeks Out",
    title: "Tease",
    offsetDays: -14,
    tasks: [
      t("Lyric submission to Genius and MusixMatch"),
      t("YouTube Content ID confirmed via distributor"),
      t(
        "New content → new song sections, new content types. Test and measure.",
      ),
    ],
  },
  {
    group: P3,
    label: "1 Week Out",
    title: "Shout",
    offsetDays: -7,
    tasks: [
      t("Daily posting all week on all channels"),
      t("Email and SMS blast to owned list with pre-save link"),
      t(
        "Confirm all platforms show the song correctly — title spelling, credits, artwork, ISRC",
      ),
      t(
        "Personal outreach to top 50–100 fans, friends, and industry contacts asking them to save, share, and listen on release day",
      ),
      t("Plan release day — see Release Day Template"),
    ],
  },
  {
    group: P4,
    label: "Week Of Release",
    title: "Bombard",
    offsetDays: 0,
    tasks: [
      t("Days 1–3, heavy meta ads on successful content"),
      t("Days 4–7, lighter meta ads"),
      t("Engage every comment, repost, and DM — daily"),
      t("Pull first-week stream data across platforms"),
      t("Pull save rate — the most important early signal"),
      t("Pull playlist add data — which playlists added, which didn't"),
      t(
        "Note press who supported and who didn't, for the next release's outreach list",
      ),
      t(
        "Post-release content wave — reactions, behind-the-scenes, live versions, breakdowns",
      ),
      t("Release the visual companion"),
    ],
  },
  {
    group: P4,
    label: "2–3 Weeks Post-Release",
    title: "Reiterate",
    offsetDays: 14,
    tasks: [
      t("Refresh content cadence based on what's working"),
      t(
        "Second wave of press outreach with fresh angle (stream milestone, fan reactions)",
      ),
    ],
  },
  {
    group: P4,
    label: "4 Weeks Post-Release",
    title: "Reflect",
    offsetDays: 28,
    tasks: [
      t(
        "Post-release retrospective — what worked, what didn't, catalog impact, did the song hit its goals?",
      ),
      t(
        "Catalog playlist pitching — pitch the song to mood/vibe/genre playlists now that the editorial window has closed",
      ),
    ],
  },
];

// ---------- Project Release Strategy Template (20 weeks) ----------
export const PROJECT_TEMPLATE: TemplatePhase[] = [
  {
    label: "20 Weeks Out",
    offsetDays: -140,
    tasks: [
      t("Decide if vinyl/physical pressing — if yes, lock vinyl order now", "both"),
      t(
        "Decide release format and scope — EP vs. album, track count, deluxe edition plans",
        "both",
      ),
    ],
  },
  {
    label: "18 Weeks Out",
    offsetDays: -126,
    tasks: [
      t(
        "Define the project's marketing angle — the one sentence that captures what this body of work is about",
        "both",
      ),
      t(
        "Define the project's narrative — what's the story, the through-line, the arc the listener is walking through",
        "both",
      ),
      t("Decide lead single (releases ~6 weeks before project)", "both"),
      t(
        "Set lead single date and add as linked Release in Andiamo — Single Release Template auto-populates",
        "producer",
      ),
      t("Submit PRO registration for all songs", "producer"),
    ],
  },
  {
    label: "15 Weeks Out",
    offsetDays: -105,
    tasks: [
      t(
        "Decide second single, if doing one (releases ~3 weeks before project)",
        "both",
      ),
      t(
        "Set second single date and add as linked Release in Andiamo — Single Release Template auto-populates",
        "producer",
      ),
    ],
  },
  {
    label: "14 Weeks Out",
    offsetDays: -98,
    tasks: [
      t(
        "Build target press list — 30–50 names, focused on project-level pitch angle",
        "both",
      ),
      t(
        "Build target playlist list — both editorial and independent curators, organized by which songs fit which playlists",
        "both",
      ),
      t(
        "Identify potential sync opportunities across the project; brief publisher if applicable",
        "producer",
      ),
    ],
  },
  {
    label: "12 Weeks Out",
    offsetDays: -84,
    tasks: [
      t("Finish PROD and EDT phases for all songs", "producer"),
      t("Finalize project title", "artist"),
      t("Finalize tracklist and sequencing", "both"),
      t("Finalize artwork direction; brief designer/photographer", "artist"),
      t(
        "Begin assembling content vault — behind-the-scenes from project sessions, voice memos, studio footage",
        "artist",
      ),
      t("Plan music video for lead single — concept, director, shoot date", "both"),
      t("Coordinate lead single press angle with broader project narrative", "both"),
    ],
  },
  {
    label: "10 Weeks Out",
    offsetDays: -70,
    tasks: [
      t("Finish MIX and MST phases for all songs", "producer"),
      t("Lead single music video shoot", "artist"),
      t("Final project artwork approved", "artist"),
      t("Photo shoot for press assets", "artist"),
      t("Compile liner notes and full credits", "producer"),
      t("Begin soft teasing the project on socials — vague mood, hints of theme", "artist"),
    ],
  },
  {
    label: "9 Weeks Out",
    offsetDays: -63,
    tasks: [
      t("Lead single music video editing complete", "artist"),
      t("Coordinate second single press angle with project narrative", "both"),
    ],
  },
  {
    label: "8 Weeks Out",
    offsetDays: -56,
    tasks: [
      t("Upload full project to distribution with project release date", "producer"),
      t("Submit project-level Spotify editorial pitch via S4A", "both"),
      t("Submit project-level Apple Music editorial pitch via AM4A", "both"),
      t("Submit YouTube Music editorial pitch if applicable", "both"),
      t("Confirm project pre-save / pre-order link is live", "producer"),
      t("Plan listening party / album premiere event", "both"),
      t(
        "Cross-reference playlist targets across lead single, second single, and project — avoid pitching the same playlist three times in two months",
        "both",
      ),
    ],
  },
  {
    label: "6 Weeks Out",
    offsetDays: -42,
    tasks: [
      t("Lead single release (runs its own Single Release Template)", "both"),
      t("Content focus shifts to lead single — see Content calendar", "artist"),
      t("Begin project-level press outreach with first wave of personalized pitches", "both"),
      t("Begin sync pitching for project as a whole if applicable", "producer"),
    ],
  },
  {
    label: "4 Weeks Out",
    offsetDays: -28,
    tasks: [
      t("Confirm vinyl/physical product on track for release date", "producer"),
      t("Confirm listening party logistics — venue, guest list, content plan", "both"),
    ],
  },
  {
    label: "3 Weeks Out",
    offsetDays: -21,
    tasks: [
      t("Second single release if applicable (runs its own Single Release Template)", "both"),
      t("Content focus shifts to second single — see Content calendar", "artist"),
      t("Coordinate with featured artists and collaborators across all project tracks", "artist"),
    ],
  },
  {
    label: "2 Weeks Out",
    offsetDays: -14,
    tasks: [
      t(
        "Content focus shifts to full project — tracklist reveals, theme breakdowns, narrative content",
        "artist",
      ),
      t("Lyric submission to Genius and MusixMatch for all tracks", "producer"),
      t("YouTube Content ID confirmed for all tracks via distributor", "producer"),
      t("Final content review — release-week and release-day content locked across all tracks", "both"),
    ],
  },
  {
    label: "1 Week Out",
    offsetDays: -7,
    tasks: [
      t("Final pre-release content push — daily posting all week", "artist"),
      t("Email and SMS blast to owned list with project pre-save/pre-order link", "artist"),
      t(
        "Confirm all platforms show the full project correctly — title, tracklist, credits, artwork, ISRCs",
        "producer",
      ),
      t(
        "Personal outreach to top 50–100 fans, friends, and industry contacts asking them to save the project and listen front-to-back",
        "artist",
      ),
      t("Plan project release day — see Release Day Template", "both"),
    ],
  },
  {
    label: "Project Release Day",
    offsetDays: 0,
    tasks: [
      t("See Release Day Template", "both"),
      t("Listening party / album premiere event executes", "both"),
    ],
  },
  {
    label: "Week 1 After Release",
    offsetDays: 7,
    tasks: [
      t("Engage every comment, repost, and DM — daily", "artist"),
      t("Pull first-week stream data for project and per track", "producer"),
      t(
        "Pull save rate for project and per track — identify which songs are responding strongest",
        "producer",
      ),
      t("Pull playlist add data", "producer"),
      t("Note who supported and who didn't, for the next release's outreach list", "both"),
      t(
        "Post-release content wave — track-by-track breakdowns, reactions, behind-the-scenes",
        "artist",
      ),
    ],
  },
  {
    label: "Weeks 2–4 After Release",
    offsetDays: 14,
    tasks: [
      t("Refresh content cadence based on which tracks are performing strongest", "artist"),
      t(
        "Second wave of press outreach with fresh angle (stream milestone, track-specific reactions, fan stories)",
        "both",
      ),
      t("Identify the “sleeper hit” — the non-single track that's outperforming expectations", "both"),
    ],
  },
  {
    label: "Weeks 5–8 After Release",
    offsetDays: 35,
    tasks: [
      t("Pitch top-performing non-single tracks to playlists as standalone moments", "both"),
      t("Music video or visualizer for the sleeper hit if data justifies", "both"),
      t("Post-release retrospective — what worked, what didn't, project-level impact", "both"),
    ],
  },
  {
    label: "Weeks 8–16 After Release",
    offsetDays: 56,
    tasks: [
      t("Catalog playlist pitching — pitch individual tracks to mood/vibe/genre playlists", "both"),
      t("Plan deluxe edition or anniversary content if applicable", "both"),
      t("Begin live cycle planning — tour rollout, show dates, livestream concepts", "both"),
    ],
  },
];

export function templateFor(type: "single" | "project"): TemplatePhase[] {
  return type === "project" ? PROJECT_TEMPLATE : SINGLE_TEMPLATE;
}

// ---------- Editable templates (Section 11.7) ----------
// The shape we edit + persist per artist. Tasks are plain strings (assignment is
// a separate manual/DWY step, not part of the template).
export type EditablePhase = {
  group?: string;
  label: string;
  title?: string;
  offsetDays: number;
  tasks: string[];
};

// The canonical default for a type, in editable form (drops assignee).
export function defaultEditableTemplate(
  type: "single" | "project",
): EditablePhase[] {
  return templateFor(type).map((phase) => ({
    group: phase.group,
    label: phase.label,
    title: phase.title,
    offsetDays: phase.offsetDays,
    tasks: phase.tasks.map((t) => t.description),
  }));
}

