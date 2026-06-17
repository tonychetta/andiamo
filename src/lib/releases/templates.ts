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
  label: string;
  offsetDays: number;
  tasks: TemplateTask[];
};

const t = (description: string, assignee: ReleaseAssignee): TemplateTask => ({
  description,
  assignee,
});

// ---------- Single Release Strategy Template (12 weeks) ----------
export const SINGLE_TEMPLATE: TemplatePhase[] = [
  {
    label: "12 Weeks Out",
    offsetDays: -84,
    tasks: [
      t(
        "Define the song's marketing angle — the one sentence about this song that becomes the hook of every pitch, caption, and outreach",
        "both",
      ),
      t(
        "Build target press list of 30–50 names with personalized pitch angle",
        "both",
      ),
      t(
        "Build target playlist list — both editorial (Spotify/Apple) and independent curators",
        "both",
      ),
      t(
        "Identify potential sync opportunities; brief publisher if applicable",
        "producer",
      ),
      t("Submit PRO registration", "producer"),
    ],
  },
  {
    label: "10 Weeks Out",
    offsetDays: -70,
    tasks: [
      t("Finalize artwork direction; brief designer/photographer", "artist"),
      t(
        "Begin assembling content vault — behind-the-scenes footage, voice memos, live clips, anything cuttable into pre-release content",
        "artist",
      ),
    ],
  },
  {
    label: "8 Weeks Out",
    offsetDays: -56,
    tasks: [
      t("Finish PROD and EDT phases", "producer"),
      t("Final artwork approved", "artist"),
      t("Photo shoot for press assets if needed", "artist"),
      t("Begin soft teasing the song on socials", "artist"),
    ],
  },
  {
    label: "7 Weeks Out",
    offsetDays: -49,
    tasks: [t("Finish MIX and MST phases", "producer")],
  },
  {
    label: "6 Weeks Out",
    offsetDays: -42,
    tasks: [
      t("Upload to distribution", "producer"),
      t("Submit Spotify editorial pitch via S4A", "both"),
      t("Submit Apple Music editorial pitch via AM4A", "both"),
      t("Submit YouTube Music editorial pitch if applicable", "both"),
      t("Confirm pre-save link is live", "producer"),
    ],
  },
  {
    label: "5 Weeks Out",
    offsetDays: -35,
    tasks: [
      t(
        "Begin press outreach — first wave of personalized pitches to target press list",
        "both",
      ),
      t("Begin direct playlist pitching to independent curators", "both"),
      t("Begin sync pitching if applicable", "producer"),
      t("Plan the visual companion — music video, visualizer, or lyric video", "both"),
    ],
  },
  {
    label: "4 Weeks Out",
    offsetDays: -28,
    tasks: [
      t(
        "Run small SubmitHub or Groover diagnostic campaign ($40–60) to test save rate",
        "both",
      ),
      t("Schedule release-week content in the Content calendar", "both"),
      t(
        "First teaser content drops — short clips, snippet posts, lyric reveals",
        "artist",
      ),
      t(
        "Schedule any release-week press appearances (podcasts, radio, interviews, livestreams)",
        "both",
      ),
      t("Build the email/SMS list announcement", "artist"),
    ],
  },
  {
    label: "3 Weeks Out",
    offsetDays: -21,
    tasks: [
      t("Content cadence is active — see Content calendar", "artist"),
      t("Pre-save link goes wide across all channels", "artist"),
      t(
        "Coordinate with featured artists and collaborators — confirm they're pre-saving and promoting",
        "artist",
      ),
    ],
  },
  {
    label: "2 Weeks Out",
    offsetDays: -14,
    tasks: [
      t("Lyric submission to Genius and MusixMatch", "producer"),
      t("YouTube Content ID confirmed via distributor", "producer"),
      t(
        "Final content review — release-week and release-day content locked, shot, and queued",
        "both",
      ),
    ],
  },
  {
    label: "1 Week Out",
    offsetDays: -7,
    tasks: [
      t("Final pre-release content push — daily posting all week", "artist"),
      t("Email and SMS blast to owned list with pre-save link", "artist"),
      t(
        "Confirm all platforms show the song correctly — title spelling, credits, artwork, ISRC",
        "producer",
      ),
      t(
        "Personal outreach to top 50–100 fans, friends, and industry contacts asking them to save, share, and listen on release day",
        "artist",
      ),
      t("Plan release day — see Release Day Template", "both"),
    ],
  },
  {
    label: "Release Day",
    offsetDays: 0,
    tasks: [t("See Release Day Template", "both")],
  },
  {
    label: "Week 1 After Release",
    offsetDays: 7,
    tasks: [
      t("Engage every comment, repost, and DM — daily", "artist"),
      t("Pull first-week stream data across platforms", "producer"),
      t("Pull save rate — the most important early signal", "producer"),
      t("Pull playlist add data — which playlists added, which didn't", "producer"),
      t(
        "Note who supported and who didn't, for the next release's outreach list",
        "both",
      ),
      t(
        "Post-release content wave — reactions, behind-the-scenes, live versions, breakdowns",
        "artist",
      ),
    ],
  },
  {
    label: "Weeks 2–3 After Release",
    offsetDays: 14,
    tasks: [
      t("Refresh content cadence based on what's working", "artist"),
      t(
        "Second wave of press outreach with fresh angle (stream milestone, fan reactions)",
        "both",
      ),
    ],
  },
  {
    label: "Week 4 After Release",
    offsetDays: 28,
    tasks: [
      t(
        "Post-release retrospective — what worked, what didn't, catalog impact, did the song hit its goals?",
        "both",
      ),
      t(
        "Catalog playlist pitching — pitch the song to mood/vibe/genre playlists now that the editorial window has closed",
        "both",
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
  label: string;
  offsetDays: number;
  tasks: string[];
};

// The canonical default for a type, in editable form (drops assignee).
export function defaultEditableTemplate(
  type: "single" | "project",
): EditablePhase[] {
  return templateFor(type).map((phase) => ({
    label: phase.label,
    offsetDays: phase.offsetDays,
    tasks: phase.tasks.map((t) => t.description),
  }));
}

