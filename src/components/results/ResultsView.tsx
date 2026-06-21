"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "@phosphor-icons/react";
import {
  saveResultEntry,
  deleteResultEntry,
} from "@/app/(app)/results/actions";

type Entry = {
  id: string;
  metric_key: string;
  song_id: string | null;
  entry_date: string;
  value: number;
  updated_at: string;
};
type Song = { id: string; title: string };

const SOCIAL = [
  { key: "instagram_followers", label: "Instagram", color: "#F77737" },
  { key: "tiktok_followers", label: "TikTok", color: "#111111" },
  { key: "youtube_followers", label: "YouTube", color: "#FF0000" },
  { key: "facebook_followers", label: "Facebook", color: "#1877F2" },
];
const DSP = [
  { key: "spotify_followers", label: "Spotify · Followers", color: "#1DB954" },
  { key: "spotify_monthly_listeners", label: "Spotify · Monthly Listeners", color: "#1DB954" },
  { key: "apple_followers", label: "Apple Music · Followers", color: "#FC3C44" },
  { key: "apple_monthly_listeners", label: "Apple Music · Monthly Listeners", color: "#FC3C44" },
];

const RANGES = [
  { key: "4w", label: "4 wks", days: 28 },
  { key: "12w", label: "12 wks", days: 84 },
  { key: "6m", label: "6 mo", days: 183 },
  { key: "1y", label: "1 yr", days: 365 },
  { key: "all", label: "All", days: null as number | null },
];

const pad = (n: number) => String(n).padStart(2, "0");
function cutoff(today: string, days: number): string {
  const [y, m, d] = today.split("-").map(Number);
  const t = Date.UTC(y, m - 1, d) - days * 86_400_000;
  const dt = new Date(t);
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}
function fmtDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
function fmtUpdated(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
function dayMs(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function LineChart({
  points,
  color,
}: {
  points: Entry[];
  color: string;
}) {
  const W = 300;
  const H = 110;
  const P = 8;
  if (points.length === 0) {
    return (
      <div className="grid h-[110px] place-items-center rounded-lg bg-surface-primary text-xs text-ink-soft">
        No data yet
      </div>
    );
  }
  const maxV = Math.max(1, ...points.map((p) => p.value));
  const ts = points.map((p) => dayMs(p.entry_date));
  const minT = Math.min(...ts);
  const maxT = Math.max(...ts);
  const x = (t: number) =>
    maxT === minT ? W / 2 : P + ((t - minT) / (maxT - minT)) * (W - 2 * P);
  const y = (v: number) => H - P - (v / maxV) * (H - 2 * P);
  const coords = points.map((p) => ({
    cx: x(dayMs(p.entry_date)),
    cy: y(p.value),
  }));
  const path = coords.map((c) => `${c.cx},${c.cy}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img">
      <polyline
        points={path}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {coords.map((c, i) => (
        <circle key={i} cx={c.cx} cy={c.cy} r={2.5} fill={color} />
      ))}
    </svg>
  );
}

function MetricCard({
  label,
  color,
  metricKey,
  songId,
  entries,
  today,
}: {
  label: string;
  color: string;
  metricKey: string;
  songId?: string | null;
  entries: Entry[]; // already filtered to this metric/song + time range, sorted
  today: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(today);
  const [value, setValue] = useState("");

  const latest = entries[entries.length - 1];
  const lastUpdated = entries.reduce<string | null>(
    (a, e) => (a && a > e.updated_at ? a : e.updated_at),
    null,
  );

  function run(fn: () => Promise<void>) {
    fn().then(() => router.refresh());
  }

  function add() {
    const v = Number(value);
    if (!date || value === "" || Number.isNaN(v)) return;
    setValue("");
    run(() => saveResultEntry({ metricKey, songId, date, value: v }));
  }

  return (
    <div className="rounded-2xl border border-line bg-surface-secondary p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-ink">{label}</p>
          <p className="mt-0.5 font-serif text-2xl text-ink">
            {latest ? latest.value.toLocaleString() : "—"}
          </p>
        </div>
        <div className="text-right">
          {lastUpdated && (
            <span className="text-[10px] text-ink-soft">
              Updated {fmtUpdated(lastUpdated)}
            </span>
          )}
          <button
            onClick={() => setEditing((o) => !o)}
            className="mt-1 block text-xs text-ink-soft transition-colors hover:text-ink"
          >
            {editing ? "Done" : "Edit data"}
          </button>
        </div>
      </div>

      <div className="mt-3">
        <LineChart points={entries} color={color} />
      </div>

      {editing && (
        <div className="mt-3 space-y-2 rounded-xl bg-surface-primary p-3">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="text-[10px] uppercase tracking-wide text-ink-soft">
                Week
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-0.5 w-full rounded-lg border border-line bg-surface-secondary px-2 py-1.5 text-sm text-ink outline-none focus:border-ink"
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] uppercase tracking-wide text-ink-soft">
                Value
              </label>
              <input
                type="number"
                inputMode="numeric"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="e.g. 12500"
                className="mt-0.5 w-full rounded-lg border border-line bg-surface-secondary px-2 py-1.5 text-sm text-ink outline-none focus:border-ink"
              />
            </div>
            <button
              onClick={add}
              className="rounded-lg bg-ink px-3 py-1.5 text-sm text-surface-primary"
            >
              Save
            </button>
          </div>

          {entries.length > 0 && (
            <div className="max-h-32 space-y-1 overflow-y-auto pt-1">
              {[...entries].reverse().map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between text-xs text-ink"
                >
                  <span className="text-ink-soft">{fmtDate(e.entry_date)}</span>
                  <span className="flex items-center gap-2">
                    {e.value.toLocaleString()}
                    <button
                      onClick={() =>
                        run(() => deleteResultEntry(e.id))
                      }
                      aria-label="Delete"
                      className="text-ink-soft/60 transition-colors hover:text-red-700"
                    >
                      <X size={13} />
                    </button>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ResultsView({
  entries,
  songs,
  today,
}: {
  entries: Entry[];
  songs: Song[];
  today: string;
}) {
  const router = useRouter();
  const [range, setRange] = useState("12w");
  const [addingSong, setAddingSong] = useState(false);
  const [newSongId, setNewSongId] = useState("");
  const [newSongDate, setNewSongDate] = useState(today);
  const [newSongValue, setNewSongValue] = useState("");

  const minDate = useMemo(() => {
    const r = RANGES.find((x) => x.key === range);
    return r?.days ? cutoff(today, r.days) : null;
  }, [range, today]);

  // entries for a metric (+ song), within the time range, sorted by date.
  function seriesFor(metricKey: string, songId: string | null): Entry[] {
    return entries
      .filter(
        (e) =>
          e.metric_key === metricKey &&
          (songId === null ? e.song_id === null : e.song_id === songId) &&
          (!minDate || e.entry_date >= minDate),
      )
      .sort((a, b) => a.entry_date.localeCompare(b.entry_date));
  }

  const trackedSongIds = useMemo(() => {
    const s = new Set<string>();
    for (const e of entries)
      if (e.metric_key === "song_streams" && e.song_id) s.add(e.song_id);
    return s;
  }, [entries]);
  const trackedSongs = songs.filter((s) => trackedSongIds.has(s.id));
  const untrackedSongs = songs.filter((s) => !trackedSongIds.has(s.id));

  function addSongStream() {
    const v = Number(newSongValue);
    if (!newSongId || !newSongDate || newSongValue === "" || Number.isNaN(v))
      return;
    const songId = newSongId;
    setNewSongId("");
    setNewSongValue("");
    setAddingSong(false);
    saveResultEntry({
      metricKey: "song_streams",
      songId,
      date: newSongDate,
      value: v,
    }).then(() => router.refresh());
  }

  return (
    <section className="pb-4">
      <h1 className="font-serif text-4xl leading-tight text-ink">Results</h1>

      {/* Global time range */}
      <div className="mt-4 flex gap-1">
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

      {/* Section 1 — Social Follower Growth */}
      <h2 className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-ink-soft">
        Social follower growth
      </h2>
      <div className="mt-3 space-y-4">
        {SOCIAL.map((m) => (
          <MetricCard
            key={m.key}
            label={m.label}
            color={m.color}
            metricKey={m.key}
            entries={seriesFor(m.key, null)}
            today={today}
          />
        ))}
      </div>

      {/* Section 2 — DSP Audience Growth */}
      <h2 className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-ink-soft">
        DSP audience growth
      </h2>
      <div className="mt-3 space-y-4">
        {DSP.map((m) => (
          <MetricCard
            key={m.key}
            label={m.label}
            color={m.color}
            metricKey={m.key}
            entries={seriesFor(m.key, null)}
            today={today}
          />
        ))}
      </div>

      {/* Section 3 — Cross-Platform Streams (per song) */}
      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-soft">
          Cross-platform streams
        </h2>
        {untrackedSongs.length > 0 && (
          <button
            onClick={() => setAddingSong((o) => !o)}
            className="inline-flex items-center gap-1 text-xs text-ink-soft transition-colors hover:text-ink"
          >
            <Plus size={13} /> Track a song
          </button>
        )}
      </div>

      {addingSong && untrackedSongs.length > 0 && (
        <div className="mt-3 space-y-2 rounded-2xl border border-line bg-surface-secondary p-4">
          <select
            value={newSongId}
            onChange={(e) => setNewSongId(e.target.value)}
            className="w-full rounded-lg border border-line bg-surface-primary px-3 py-2 text-sm text-ink outline-none focus:border-ink"
          >
            <option value="">Select a song…</option>
            {untrackedSongs.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="text-[10px] uppercase tracking-wide text-ink-soft">
                Week
              </label>
              <input
                type="date"
                value={newSongDate}
                onChange={(e) => setNewSongDate(e.target.value)}
                className="mt-0.5 w-full rounded-lg border border-line bg-surface-primary px-2 py-1.5 text-sm text-ink outline-none focus:border-ink"
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] uppercase tracking-wide text-ink-soft">
                Streams
              </label>
              <input
                type="number"
                inputMode="numeric"
                value={newSongValue}
                onChange={(e) => setNewSongValue(e.target.value)}
                className="mt-0.5 w-full rounded-lg border border-line bg-surface-primary px-2 py-1.5 text-sm text-ink outline-none focus:border-ink"
              />
            </div>
            <button
              onClick={addSongStream}
              className="rounded-lg bg-ink px-3 py-1.5 text-sm text-surface-primary"
            >
              Track
            </button>
          </div>
        </div>
      )}

      <div className="mt-3 space-y-4">
        {trackedSongs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-ink-soft">
            No songs tracked yet. Add a song to start tracking its streams.
          </div>
        ) : (
          trackedSongs.map((s) => (
            <MetricCard
              key={s.id}
              label={s.title}
              color="#5ff5f5"
              metricKey="song_streams"
              songId={s.id}
              entries={seriesFor("song_streams", s.id)}
              today={today}
            />
          ))
        )}
      </div>
    </section>
  );
}
