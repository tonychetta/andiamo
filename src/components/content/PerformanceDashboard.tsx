"use client";

import { useMemo, useState } from "react";

type LinkData = {
  id?: string;
  platform: string;
  url: string;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  updated_at?: string;
};
type Piece = {
  id: string;
  scheduled_date: string;
  song_id: string | null;
  song_title: string | null;
  notes: string | null;
  sections: string[];
  typeIds: string[];
  links: LinkData[];
};
type ContentType = { id: string; name: string; color: string };
type Song = { id: string; title: string };

const METRICS = ["views", "likes", "comments", "shares", "saves"] as const;
type Metric = (typeof METRICS)[number];
const METRIC_LABEL: Record<Metric, string> = {
  views: "Views",
  likes: "Likes",
  comments: "Comments",
  shares: "Shares",
  saves: "Saves",
};

// Fixed platforms + brand colors, matched against the free-text platform field.
const PLATFORMS = [
  { label: "Instagram", color: "#F77737", test: (p: string) => /insta|ig\b/i.test(p) },
  { label: "Facebook", color: "#1877F2", test: (p: string) => /face|fb\b/i.test(p) },
  { label: "TikTok", color: "#111111", test: (p: string) => /tik/i.test(p) },
  { label: "YouTube Shorts", color: "#FF0000", test: (p: string) => /you|short|yt\b/i.test(p) },
];

const SECTIONS = [
  "Intro", "Verse 1", "Pre 1", "Chorus 1", "Verse 2",
  "Pre 2", "Chorus 2", "Bridge", "Chorus 3", "Outro",
];

const RANGES = [
  { key: "4w", label: "4 wks", days: 28 },
  { key: "12w", label: "12 wks", days: 84 },
  { key: "6m", label: "6 mo", days: 183 },
  { key: "all", label: "All", days: null as number | null },
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function cutoff(today: string, days: number): string {
  const [y, m, d] = today.split("-").map(Number);
  const t = Date.UTC(y, m - 1, d) - days * 86_400_000;
  const dt = new Date(t);
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}
function fmtUpdated(iso: string): string {
  const dt = new Date(iso);
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// metric × platform sums for a set of pieces.
function aggregate(pcs: Piece[]): number[][] {
  const grid = METRICS.map(() => PLATFORMS.map(() => 0));
  for (const p of pcs) {
    for (const l of p.links) {
      const pi = PLATFORMS.findIndex((pl) => pl.test(l.platform));
      if (pi < 0) continue;
      METRICS.forEach((m, mi) => {
        const v = l[m];
        if (typeof v === "number") grid[mi][pi] += v;
      });
    }
  }
  return grid;
}

// Per-piece total views (across the 4 platforms) — for ordering + rising signal.
function pieceViews(p: Piece): number {
  let sum = 0;
  for (const l of p.links)
    if (PLATFORMS.some((pl) => pl.test(l.platform)) && typeof l.views === "number")
      sum += l.views;
  return sum;
}

function lastUpdated(pcs: Piece[]): string | null {
  let latest: string | null = null;
  for (const p of pcs)
    for (const l of p.links)
      if (l.updated_at && (!latest || l.updated_at > latest)) latest = l.updated_at;
  return latest;
}

function MetricGraph({ grid }: { grid: number[][] }) {
  const max = Math.max(1, ...grid.flat());
  return (
    <div className="mt-3 flex items-end justify-between gap-1">
      {METRICS.map((m, mi) => (
        <div key={m} className="flex flex-1 flex-col items-center">
          <div className="flex h-[110px] items-end gap-[3px]">
            {PLATFORMS.map((pl, pi) => {
              const v = grid[mi][pi];
              return (
                <div
                  key={pl.label}
                  title={`${pl.label} · ${METRIC_LABEL[m]}: ${v.toLocaleString()}`}
                  className="w-2 rounded-t-sm"
                  style={{
                    height: `${(v / max) * 110}px`,
                    minHeight: v > 0 ? 2 : 0,
                    backgroundColor: pl.color,
                  }}
                />
              );
            })}
          </div>
          <span className="mt-1 text-[9px] text-ink-soft">{METRIC_LABEL[m]}</span>
        </div>
      ))}
    </div>
  );
}

export function PerformanceDashboard({
  today,
  pieces,
  contentTypes,
  songs,
  onOpenPiece,
}: {
  today: string;
  pieces: Piece[];
  contentTypes: ContentType[];
  songs: Song[];
  onOpenPiece: (p: Piece) => void;
}) {
  const [songId, setSongId] = useState<string>("all");
  const [range, setRange] = useState<string>("12w");
  const [section, setSection] = useState<string>("Chorus 1");
  const [openDot, setOpenDot] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const r = RANGES.find((x) => x.key === range);
    const min = r?.days ? cutoff(today, r.days) : null;
    return pieces.filter(
      (p) =>
        (songId === "all" || p.song_id === songId) &&
        (!min || p.scheduled_date >= min),
    );
  }, [pieces, songId, range, today]);

  // One graph per content type that has pieces in the filtered set.
  const typeGraphs = useMemo(() => {
    const out = contentTypes
      .map((t) => {
        const pcs = filtered.filter((p) => p.typeIds.includes(t.id));
        if (pcs.length === 0) return null;
        const recent = [...pcs].sort((a, b) =>
          b.scheduled_date.localeCompare(a.scheduled_date),
        );
        const recentAvg =
          recent.slice(0, 3).reduce((s, p) => s + pieceViews(p), 0) /
          Math.min(3, recent.length);
        const prev = recent.slice(3, 6);
        const prevAvg = prev.length
          ? prev.reduce((s, p) => s + pieceViews(p), 0) / prev.length
          : 0;
        return {
          type: t,
          pcs,
          recent3: recent.slice(0, 3),
          recentAvg,
          rising: recent.length >= 3 && recentAvg > prevAvg,
          grid: aggregate(pcs),
          updated: lastUpdated(pcs),
        };
      })
      .filter(Boolean) as {
      type: ContentType;
      pcs: Piece[];
      recent3: Piece[];
      recentAvg: number;
      rising: boolean;
      grid: number[][];
      updated: string | null;
    }[];
    out.sort((a, b) => b.recentAvg - a.recentAvg);
    return out;
  }, [filtered, contentTypes]);

  // Only the top (leading) graph shows the rising dot, if it's actually rising.
  const leaderId = typeGraphs[0]?.rising ? typeGraphs[0].type.id : null;

  const sectionPcs = filtered.filter((p) => p.sections.includes(section));
  const sectionGrid = aggregate(sectionPcs);

  return (
    <div className="flex-1 overflow-y-auto overscroll-contain pb-6">
      {/* Filters */}
      <div className="space-y-2">
        <select
          value={songId}
          onChange={(e) => setSongId(e.target.value)}
          className="w-full rounded-xl border border-line bg-surface-secondary px-3 py-2.5 text-sm text-ink outline-none focus:border-ink"
        >
          <option value="all">All songs</option>
          {songs.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`flex-1 rounded-lg border py-1.5 text-xs transition-colors ${
                range === r.key
                  ? "border-ink bg-ink text-surface-primary"
                  : "border-line bg-surface-secondary text-ink-soft"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Platform legend */}
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
        {PLATFORMS.map((pl) => (
          <span key={pl.label} className="flex items-center gap-1 text-[10px] text-ink-soft">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: pl.color }}
            />
            {pl.label}
          </span>
        ))}
      </div>

      {typeGraphs.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-line p-8 text-center text-sm text-ink-soft">
          No content data yet. Add posted links with metrics on the calendar to
          see what&apos;s working.
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {typeGraphs.map((g) => (
            <div
              key={g.type.id}
              className="rounded-2xl border border-line bg-surface-secondary p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-3 w-3 rounded-full"
                    style={{ backgroundColor: g.type.color }}
                  />
                  <span className="font-medium text-ink">{g.type.name}</span>
                  {g.type.id === leaderId && (
                    <button
                      onClick={() =>
                        setOpenDot(openDot === g.type.id ? null : g.type.id)
                      }
                      aria-label="Rising — recent pieces"
                      className="grid h-4 w-4 place-items-center"
                    >
                      <span className="h-2.5 w-2.5 rounded-full bg-red-600 shadow-[0_0_6px_rgba(220,38,38,0.7)]" />
                    </button>
                  )}
                </div>
                {g.updated && (
                  <span className="text-[10px] text-ink-soft">
                    Updated {fmtUpdated(g.updated)}
                  </span>
                )}
              </div>

              {g.type.id === leaderId && openDot === g.type.id && (
                <div className="mt-2 rounded-xl bg-surface-primary p-2">
                  <p className="mb-1 text-[11px] text-ink-soft">
                    Rising — 3 most recent:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {g.recent3.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => onOpenPiece(p)}
                        className="rounded-md px-2 py-1 text-xs text-ink"
                        style={{ backgroundColor: `${g.type.color}33` }}
                      >
                        {p.song_title ?? "Content"} ·{" "}
                        {p.scheduled_date.slice(5)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <MetricGraph grid={g.grid} />
            </div>
          ))}

          {/* Song Section graph */}
          <div className="rounded-2xl border border-line bg-surface-secondary p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-ink">Song section</span>
              <select
                value={section}
                onChange={(e) => setSection(e.target.value)}
                className="rounded-lg border border-line bg-surface-primary px-2 py-1 text-xs text-ink outline-none focus:border-ink"
              >
                {SECTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            {sectionPcs.length === 0 ? (
              <p className="mt-3 text-xs text-ink-soft">
                No content tagged with {section} in this range.
              </p>
            ) : (
              <MetricGraph grid={sectionGrid} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
