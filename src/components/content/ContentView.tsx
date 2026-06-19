"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CaretLeft, CaretRight, X, Plus, Trash } from "@phosphor-icons/react";
import {
  createContentType,
  addSong,
  saveContentPiece,
  deleteContentPiece,
  type LinkInput,
} from "@/app/(app)/content/actions";

type ContentType = { id: string; name: string; color: string };
type Song = { id: string; title: string; original_release_date?: string | null };
type LinkData = {
  id?: string;
  platform: string;
  url: string;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
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
type ReleaseDate = { id: string; title: string; date: string };

const SECTIONS = [
  "Intro", "Verse 1", "Pre 1", "Chorus 1", "Verse 2",
  "Pre 2", "Chorus 2", "Bridge", "Chorus 3", "Outro",
];
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY = 86_400_000;
const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

type Day = { date: string; day: number; month: number; year: number };

// Continuous Sun→Sat weeks across the whole range — no per-month grids.
function buildWeeks(
  startY: number,
  startM: number,
  endY: number,
  endM: number,
): Day[][] {
  const firstOfStart = Date.UTC(startY, startM, 1);
  let cur = firstOfStart - new Date(firstOfStart).getUTCDay() * DAY;
  const lastOfEnd = Date.UTC(endY, endM + 1, 0);
  const end = lastOfEnd + (6 - new Date(lastOfEnd).getUTCDay()) * DAY;
  const weeks: Day[][] = [];
  while (cur <= end) {
    const days: Day[] = [];
    for (let i = 0; i < 7; i++) {
      const dt = new Date(cur + i * DAY);
      days.push({
        date: ymd(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()),
        day: dt.getUTCDate(),
        month: dt.getUTCMonth(),
        year: dt.getUTCFullYear(),
      });
    }
    weeks.push(days);
    cur += 7 * DAY;
  }
  return weeks;
}

function fmtLong(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

const WEEKDAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function fmtShort(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
function dowOf(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function ContentView({
  today,
  releaseDates,
  songs: songsProp,
  contentTypes: typesProp,
  pieces,
  platforms,
}: {
  today: string;
  releaseDates: ReleaseDate[];
  songs: Song[];
  contentTypes: ContentType[];
  pieces: Piece[];
  platforms: string[];
}) {
  const [editing, setEditing] = useState<{ piece?: Piece; date: string } | null>(
    null,
  );
  const [view, setView] = useState<"monthly" | "weekly">("monthly");
  const scrollRef = useRef<HTMLDivElement>(null);

  const typeById = useMemo(
    () => new Map(typesProp.map((t) => [t.id, t])),
    [typesProp],
  );
  const piecesByDate = useMemo(() => {
    const m = new Map<string, Piece[]>();
    for (const p of pieces) {
      const list = m.get(p.scheduled_date) ?? [];
      list.push(p);
      m.set(p.scheduled_date, list);
    }
    return m;
  }, [pieces]);
  const releaseByDate = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of releaseDates) m.set(r.date, r.title);
    return m;
  }, [releaseDates]);

  const weeks = useMemo(() => {
    const all = [
      today,
      ...releaseDates.map((r) => r.date),
      ...pieces.map((p) => p.scheduled_date),
    ];
    const min = all.reduce((a, b) => (a < b ? a : b), today);
    const max = all.reduce((a, b) => (a > b ? a : b), today);
    const [minY, minM] = min.split("-").map(Number);
    const [maxY, maxM] = max.split("-").map(Number);
    const [ty, tm] = today.split("-").map(Number);
    const startIdx = minY * 12 + (minM - 1);
    const endIdx = Math.max(maxY * 12 + (maxM - 1), ty * 12 + (tm - 1) + 2);
    return buildWeeks(
      Math.floor(startIdx / 12),
      startIdx % 12,
      Math.floor(endIdx / 12),
      endIdx % 12,
    );
  }, [today, releaseDates, pieces]);

  function scrollToDate(date: string, smooth = true) {
    const el = document.getElementById(`day-${date}`);
    el?.scrollIntoView({
      behavior: smooth ? "smooth" : "auto",
      block: "center",
    });
  }

  // The date currently centered in the calendar viewport — jumps are relative
  // to what you're looking at, not to today.
  function centerDate(): string {
    const c = scrollRef.current;
    if (!c) return today;
    const rect = c.getBoundingClientRect();
    let el = document.elementFromPoint(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
    ) as HTMLElement | null;
    while (el && !(el.id && el.id.startsWith("day-"))) el = el.parentElement;
    return el?.id?.replace("day-", "") ?? today;
  }
  function jumpNext() {
    const ref = centerDate();
    const n = releaseDates
      .filter((r) => r.date > ref)
      .sort((a, b) => a.date.localeCompare(b.date))[0];
    if (n) scrollToDate(n.date);
  }
  function jumpPrev() {
    const ref = centerDate();
    const p = releaseDates
      .filter((r) => r.date < ref)
      .sort((a, b) => b.date.localeCompare(a.date))[0];
    if (p) scrollToDate(p.date);
  }
  const hasReleases = releaseDates.length > 0;

  // Land on the current week when the page opens.
  useEffect(() => {
    scrollToDate(today, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="flex h-[calc(100dvh-11rem)] flex-col">
      <h1 className="font-serif text-3xl leading-tight text-ink">Content</h1>

      {/* View toggle + view-relative jump bar — stay above the calendar */}
      <div className="mt-3 flex items-center gap-2">
        <div className="flex shrink-0 rounded-xl border border-line bg-surface-secondary p-0.5">
          {(["monthly", "weekly"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                view === v ? "bg-ink text-surface-primary" : "text-ink-soft"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
        <button
          onClick={jumpPrev}
          disabled={!hasReleases}
          className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-line bg-surface-secondary py-2 text-xs text-ink transition-opacity disabled:opacity-40"
        >
          <CaretLeft size={14} /> Prev
        </button>
        <button
          onClick={jumpNext}
          disabled={!hasReleases}
          className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-line bg-surface-secondary py-2 text-xs text-ink transition-opacity disabled:opacity-40"
        >
          Next <CaretRight size={14} />
        </button>
      </div>

      {view === "monthly" && (
        <div className="mt-2 grid grid-cols-7 text-center text-[11px] font-medium uppercase tracking-wide text-ink-soft">
          {WEEKDAYS.map((d, i) => (
            <div key={i}>{d}</div>
          ))}
        </div>
      )}

      {/* Scrolling calendar. overscroll-contain stops the scroll from leaking
          into the page / a lightbox behind it. */}
      <div
        ref={scrollRef}
        className="mt-1 flex-1 space-y-1 overflow-y-auto overscroll-contain pb-6"
      >
        {view === "monthly"
          ? weeks.map((week, wi) => {
              const firstOfMonth = week.find((d) => d.day === 1);
              return (
                <div key={wi}>
                  {firstOfMonth && (
                    <div className="px-1 pb-1 pt-2 font-serif text-base text-ink">
                      {MONTHS[firstOfMonth.month]} {firstOfMonth.year}
                    </div>
                  )}
                  <div className="grid grid-cols-7 gap-1">
                    {week.map((d) => {
                      const isToday = d.date === today;
                      const releaseTitle = releaseByDate.get(d.date);
                      const dayPieces = piecesByDate.get(d.date) ?? [];
                      return (
                        <button
                          key={d.date}
                          id={`day-${d.date}`}
                          onClick={() => setEditing({ date: d.date })}
                          className={`flex min-h-[96px] flex-col rounded-lg border p-1 text-left transition-colors ${
                            releaseTitle
                              ? "border-accent-gold bg-accent-gold/35"
                              : "border-line bg-surface-secondary hover:bg-surface-accent"
                          }`}
                        >
                          <span
                            className={`text-[11px] ${
                              isToday
                                ? "grid h-5 w-5 place-items-center rounded-full bg-ink font-semibold text-surface-primary"
                                : "text-ink-soft"
                            }`}
                          >
                            {d.day}
                          </span>
                          {releaseTitle && (
                            <span className="mt-0.5 line-clamp-2 text-[9px] font-semibold leading-tight text-[#8a6d29]">
                              ♪ {releaseTitle}
                            </span>
                          )}
                          <div className="mt-0.5 space-y-0.5">
                            {dayPieces.slice(0, 3).map((p) => {
                              const t = p.typeIds
                                .map((id) => typeById.get(id))
                                .filter(Boolean)[0] as ContentType | undefined;
                              const color = t?.color ?? "#9b8";
                              const posted = p.links.length > 0;
                              return (
                                <span
                                  key={p.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditing({
                                      piece: p,
                                      date: p.scheduled_date,
                                    });
                                  }}
                                  className="block line-clamp-2 rounded px-1 py-0.5 text-[10px] leading-tight text-ink"
                                  style={{
                                    backgroundColor: posted
                                      ? `${color}D9`
                                      : `${color}30`,
                                    border: posted
                                      ? "none"
                                      : `1px solid ${color}99`,
                                  }}
                                >
                                  {t?.name ?? p.song_title ?? "Content"}
                                </span>
                              );
                            })}
                            {dayPieces.length > 3 && (
                              <span className="block px-1 text-[9px] text-ink-soft">
                                +{dayPieces.length - 3} more
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          : weeks.map((week, wi) => (
              <div key={wi} className="mb-2">
                <div className="px-1 pb-1 pt-2 text-xs font-medium uppercase tracking-wide text-ink-soft">
                  {fmtShort(week[0].date)} – {fmtShort(week[6].date)}
                </div>
                <div className="space-y-1">
                  {week.map((d) => {
                    const isToday = d.date === today;
                    const releaseTitle = releaseByDate.get(d.date);
                    const dayPieces = piecesByDate.get(d.date) ?? [];
                    return (
                      <button
                        key={d.date}
                        id={`day-${d.date}`}
                        onClick={() => setEditing({ date: d.date })}
                        className={`flex w-full gap-3 rounded-lg border p-2 text-left transition-colors ${
                          releaseTitle
                            ? "border-accent-gold bg-accent-gold/25"
                            : "border-line bg-surface-secondary hover:bg-surface-accent"
                        }`}
                      >
                        <div className="w-11 shrink-0 text-center">
                          <div className="text-[10px] uppercase text-ink-soft">
                            {WEEKDAY_ABBR[dowOf(d.date)]}
                          </div>
                          <div
                            className={`mt-0.5 ${
                              isToday
                                ? "mx-auto grid h-7 w-7 place-items-center rounded-full bg-ink text-sm font-semibold text-surface-primary"
                                : "text-base text-ink"
                            }`}
                          >
                            {d.day}
                          </div>
                        </div>
                        <div className="min-w-0 flex-1 self-center">
                          {releaseTitle && (
                            <div className="mb-1 text-xs font-semibold text-[#8a6d29]">
                              ♪ {releaseTitle}
                            </div>
                          )}
                          {dayPieces.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {dayPieces.map((p) => {
                                const t = p.typeIds
                                  .map((id) => typeById.get(id))
                                  .filter(Boolean)[0] as ContentType | undefined;
                                const color = t?.color ?? "#9b8";
                                const posted = p.links.length > 0;
                                return (
                                  <span
                                    key={p.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditing({
                                        piece: p,
                                        date: p.scheduled_date,
                                      });
                                    }}
                                    className="rounded-md px-2 py-1 text-sm text-ink"
                                    style={{
                                      backgroundColor: posted
                                        ? `${color}D9`
                                        : `${color}30`,
                                      border: posted
                                        ? "none"
                                        : `1px solid ${color}99`,
                                    }}
                                  >
                                    {t?.name ?? p.song_title ?? "Content"}
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            !releaseTitle && (
                              <span className="text-xs text-ink-soft/50">
                                Tap to plan
                              </span>
                            )
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
      </div>

      {editing && (
        <ContentLightbox
          piece={editing.piece}
          date={editing.date}
          songs={songsProp}
          contentTypes={typesProp}
          platforms={platforms}
          onClose={() => setEditing(null)}
          onSaved={(date) => {
            setEditing(null);
            // Return to the day we were just planning.
            setTimeout(() => scrollToDate(date, false), 60);
          }}
        />
      )}
    </section>
  );
}

const EMPTY_LINK: LinkData = {
  platform: "",
  url: "",
  views: null,
  likes: null,
  comments: null,
  shares: null,
  saves: null,
};

function ContentLightbox({
  piece,
  date,
  songs: songsProp,
  contentTypes: typesProp,
  platforms,
  onClose,
  onSaved,
}: {
  piece?: Piece;
  date: string;
  songs: Song[];
  contentTypes: ContentType[];
  platforms: string[];
  onClose: () => void;
  onSaved: (date: string) => void;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const [scheduledDate, setScheduledDate] = useState(date);
  const [songs, setSongs] = useState<Song[]>(songsProp);
  const [types, setTypes] = useState<ContentType[]>(typesProp);
  const [songId, setSongId] = useState<string | null>(piece?.song_id ?? null);
  const [typeIds, setTypeIds] = useState<string[]>(piece?.typeIds ?? []);
  const [sections, setSections] = useState<string[]>(piece?.sections ?? []);
  const [notes, setNotes] = useState(piece?.notes ?? "");
  const [links, setLinks] = useState<LinkData[]>(piece?.links ?? []);

  const [newType, setNewType] = useState("");
  const [addingSong, setAddingSong] = useState(false);
  const [songTitle, setSongTitle] = useState("");

  const canSave = !!songId && typeIds.length > 0;

  // Lock background scroll while the lightbox is open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  function toggle<T>(arr: T[], v: T): T[] {
    return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
  }

  async function makeType() {
    const name = newType.trim();
    if (!name) return;
    setNewType("");
    const created = await createContentType(name);
    if (created) {
      setTypes((t) => [...t, created]);
      setTypeIds((ids) => [...ids, created.id]);
    }
  }

  async function makeSong() {
    const title = songTitle.trim();
    if (!title) return;
    setSongTitle("");
    setAddingSong(false);
    const created = await addSong(title);
    if (created) {
      setSongs((s) => [...s, created]);
      setSongId(created.id);
    }
  }

  function setLink(i: number, patch: Partial<LinkData>) {
    setLinks((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  }

  function save() {
    if (!canSave) return;
    setSaving(true);
    const payloadLinks: LinkInput[] = links.map((l) => ({
      platform: l.platform,
      url: l.url,
      views: l.views,
      likes: l.likes,
      comments: l.comments,
      shares: l.shares,
      saves: l.saves,
    }));
    Promise.resolve(
      saveContentPiece({
        id: piece?.id,
        scheduledDate,
        songId,
        typeTagIds: typeIds,
        sections,
        notes,
        links: payloadLinks,
      }),
    ).then(() => {
      router.refresh();
      onSaved(scheduledDate);
    });
  }

  function remove() {
    if (!piece) return;
    setSaving(true);
    Promise.resolve(deleteContentPiece(piece.id)).then(() => {
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
        className="flex max-h-[90dvh] w-full max-w-md flex-col rounded-t-3xl bg-surface-primary shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-center justify-between px-6 pt-6">
          <h2 className="font-serif text-2xl text-ink">
            {piece ? "Edit content" : "Plan content"}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-ink-soft transition-colors hover:text-ink"
          >
            <X size={22} />
          </button>
        </div>
        <p className="px-6 pt-1 text-sm text-ink-soft">{fmtLong(scheduledDate)}</p>

        <div className="mt-4 flex-1 space-y-5 overflow-y-auto overscroll-contain px-6 pb-4">
          {/* Date */}
          <div>
            <label className="text-xs uppercase tracking-wide text-ink-soft">
              Day
            </label>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-line bg-surface-secondary px-3 py-2.5 text-ink outline-none focus:border-ink"
            />
          </div>

          {/* Content Type tags */}
          <div>
            <label className="text-xs uppercase tracking-wide text-ink-soft">
              Content type
            </label>
            {types.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-2">
                {types.map((t) => {
                  const on = typeIds.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTypeIds((ids) => toggle(ids, t.id))}
                      className="rounded-full px-3 py-1.5 text-xs font-medium text-ink transition-all"
                      style={{
                        backgroundColor: on ? `${t.color}D9` : `${t.color}26`,
                        border: `1px solid ${t.color}`,
                        opacity: on ? 1 : 0.7,
                      }}
                    >
                      {t.name}
                    </button>
                  );
                })}
              </div>
            )}
            <div className="mt-2 flex gap-2">
              <input
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && makeType()}
                placeholder="New type (e.g. car lip-sync)"
                className="min-w-0 flex-1 rounded-lg border border-line bg-surface-secondary px-3 py-2 text-sm text-ink outline-none focus:border-ink"
              />
              <button
                onClick={makeType}
                className="shrink-0 rounded-lg border border-line px-4 py-2 text-sm text-ink"
              >
                Add
              </button>
            </div>
          </div>

          {/* Song */}
          <div>
            <label className="text-xs uppercase tracking-wide text-ink-soft">
              Song
            </label>
            {addingSong ? (
              <div className="mt-1.5 flex gap-2">
                <input
                  autoFocus
                  value={songTitle}
                  onChange={(e) => setSongTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && makeSong()}
                  placeholder="Song title"
                  className="min-w-0 flex-1 rounded-lg border border-line bg-surface-secondary px-3 py-2 text-sm text-ink outline-none focus:border-ink"
                />
                <button
                  onClick={makeSong}
                  className="shrink-0 rounded-lg bg-ink px-3 py-2 text-sm text-surface-primary"
                >
                  Add
                </button>
                <button
                  onClick={() => setAddingSong(false)}
                  className="shrink-0 rounded-lg px-2 py-2 text-sm text-ink-soft"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="mt-1.5 flex gap-2">
                <select
                  value={songId ?? ""}
                  onChange={(e) => setSongId(e.target.value || null)}
                  className="min-w-0 flex-1 rounded-xl border border-line bg-surface-secondary px-3 py-2.5 text-ink outline-none focus:border-ink"
                >
                  <option value="">Select a song…</option>
                  {songs.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setAddingSong(true)}
                  className="shrink-0 rounded-xl border border-line px-3 text-sm text-ink"
                >
                  + Song
                </button>
              </div>
            )}
          </div>

          {/* Song sections */}
          <div>
            <label className="text-xs uppercase tracking-wide text-ink-soft">
              Song sections (optional)
            </label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {SECTIONS.map((s) => {
                const on = sections.includes(s);
                return (
                  <button
                    key={s}
                    onClick={() => setSections((cur) => toggle(cur, s))}
                    className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                      on
                        ? "border-ink bg-ink text-surface-primary"
                        : "border-line bg-surface-secondary text-ink-soft"
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs uppercase tracking-wide text-ink-soft">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="mt-1.5 w-full resize-none rounded-xl border border-line bg-surface-secondary px-3 py-2.5 text-sm text-ink outline-none focus:border-ink"
            />
          </div>

          {/* Posted links + metrics */}
          <div>
            <label className="text-xs uppercase tracking-wide text-ink-soft">
              Posted links
            </label>
            <div className="mt-1.5 space-y-3">
              {links.map((l, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-line bg-surface-secondary p-3"
                >
                  <div className="flex items-center gap-2">
                    <input
                      list="platform-list"
                      value={l.platform}
                      onChange={(e) => setLink(i, { platform: e.target.value })}
                      placeholder="Platform"
                      className="min-w-0 flex-1 rounded-lg border border-line bg-surface-primary px-2.5 py-1.5 text-sm text-ink outline-none focus:border-ink"
                    />
                    <button
                      onClick={() =>
                        setLinks((ls) => ls.filter((_, j) => j !== i))
                      }
                      aria-label="Remove link"
                      className="shrink-0 text-ink-soft/60 transition-colors hover:text-red-700"
                    >
                      <Trash size={16} />
                    </button>
                  </div>
                  <input
                    value={l.url}
                    onChange={(e) => setLink(i, { url: e.target.value })}
                    placeholder="Link URL"
                    className="mt-2 w-full min-w-0 rounded-lg border border-line bg-surface-primary px-2.5 py-1.5 text-sm text-ink outline-none focus:border-ink"
                  />
                  <div className="mt-2 grid grid-cols-5 gap-1.5">
                    {(
                      ["views", "likes", "comments", "shares", "saves"] as const
                    ).map((metric) => (
                      <div key={metric} className="flex flex-col items-center">
                        <input
                          type="number"
                          inputMode="numeric"
                          value={l[metric] ?? ""}
                          onChange={(e) =>
                            setLink(i, {
                              [metric]:
                                e.target.value === ""
                                  ? null
                                  : Number(e.target.value),
                            })
                          }
                          className="w-full min-w-0 rounded-md border border-line bg-surface-primary px-1 py-1 text-center text-xs text-ink outline-none focus:border-ink"
                        />
                        <span className="mt-0.5 text-[9px] capitalize text-ink-soft">
                          {metric}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <datalist id="platform-list">
                {platforms.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
              <button
                onClick={() => setLinks((ls) => [...ls, { ...EMPTY_LINK }])}
                className="inline-flex items-center gap-1.5 text-sm text-ink-soft transition-colors hover:text-ink"
              >
                <Plus size={15} /> Add posted link
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 border-t border-line px-6 py-4">
          {piece ? (
            <button
              onClick={remove}
              disabled={saving}
              className="inline-flex items-center gap-1.5 text-sm text-red-700 transition-opacity hover:opacity-80 disabled:opacity-50"
            >
              <Trash size={15} /> Delete
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
              disabled={!canSave || saving}
              className="rounded-xl bg-ink px-4 py-2 text-sm font-medium text-surface-primary transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
