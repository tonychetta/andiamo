"use client";

import { useEffect, useMemo, useState } from "react";
import { X, ArrowRight, Export, Confetti } from "@phosphor-icons/react";
import type { MilestoneRecap as Recap } from "@/app/(app)/roadmap/actions";

// ---------- confetti (self-contained, CSS keyframes) ----------
const CONFETTI_CSS = `
@keyframes recap-fall {
  0% { transform: translateY(-12vh) rotate(0deg); opacity: 1; }
  100% { transform: translateY(112vh) rotate(720deg); opacity: 0.9; }
}`;
const CONFETTI_COLORS = ["#c7a35c", "#5ff5f5", "#f7f3ec", "#e8c987", "#9fe9e9"];

function ConfettiBurst() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.5,
        dur: 2.4 + Math.random() * 1.8,
        size: 6 + Math.random() * 7,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        round: i % 3 === 0,
      })),
    [],
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <style>{CONFETTI_CSS}</style>
      {pieces.map((p) => (
        <span
          key={p.id}
          style={{
            position: "absolute",
            top: 0,
            left: `${p.left}%`,
            width: p.size,
            height: p.size * (p.round ? 1 : 1.6),
            background: p.color,
            borderRadius: p.round ? "50%" : 2,
            animation: `recap-fall ${p.dur}s ${p.delay}s ease-in forwards`,
          }}
        />
      ))}
    </div>
  );
}

// ---------- shareable card (SVG → PNG) ----------
type Theme = { id: string; bg: string; ink: string; soft: string; accent: string };
const THEMES: Theme[] = [
  { id: "night", bg: "#16110f", ink: "#f7f3ec", soft: "#a99f92", accent: "#c7a35c" },
  { id: "cream", bg: "#f7f3ec", ink: "#2c2522", soft: "#7a716b", accent: "#c7a35c" },
  { id: "cyan", bg: "#0e2b2b", ink: "#f2fdfd", soft: "#8fcccc", accent: "#5ff5f5" },
];

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Break a title into lines no wider than maxChars (word-wrapped).
function wrapLines(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    if ((line + " " + w).trim().length > maxChars && line) {
      lines.push(line.trim());
      line = w;
    } else line = (line + " " + w).trim();
  }
  if (line) lines.push(line);
  return lines;
}

function cardSvg(t: Theme, title: string, days: number | null): string {
  // Size the title to the full text so it never overlaps the label or clips.
  const len = title.trim().length;
  const fontSize = len <= 40 ? 74 : len <= 70 ? 62 : len <= 110 ? 52 : 44;
  const maxChars = Math.max(10, Math.floor(880 / (fontSize * 0.52)));
  const lines = wrapLines(title.trim(), maxChars);
  const lineH = Math.round(fontSize * 1.18);
  const firstBaseline = 580; // sits well below the "MILESTONE ACHIEVED" label
  const titleTspans = lines
    .map(
      (ln, i) =>
        `<text x="540" y="${firstBaseline + i * lineH}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="${fontSize}" fill="${t.ink}">${esc(ln)}</text>`,
    )
    .join("");
  const dayY = firstBaseline + (lines.length - 1) * lineH + 96;
  const dayLine =
    days != null
      ? `<text x="540" y="${dayY}" text-anchor="middle" font-family="Georgia, serif" font-size="40" fill="${t.soft}">closed in ${days} day${days === 1 ? "" : "s"}</text>`
      : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
    <rect width="1080" height="1350" fill="${t.bg}"/>
    <text x="540" y="150" text-anchor="middle" font-family="-apple-system, Helvetica, Arial, sans-serif" font-size="30" letter-spacing="14" fill="${t.soft}">ANDIAMO</text>
    <circle cx="540" cy="315" r="58" fill="none" stroke="${t.accent}" stroke-width="5"/>
    <path d="M510 315 l20 22 l40 -46" fill="none" stroke="${t.accent}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="540" y="450" text-anchor="middle" font-family="-apple-system, Helvetica, Arial, sans-serif" font-size="34" letter-spacing="6" fill="${t.accent}">MILESTONE ACHIEVED</text>
    ${titleTspans}
    ${dayLine}
    <text x="540" y="1260" text-anchor="middle" font-family="-apple-system, Helvetica, Arial, sans-serif" font-size="26" letter-spacing="3" fill="${t.soft}">made with andiamodev.com</text>
  </svg>`;
}

// Rasterize the SVG card to a PNG blob (offscreen canvas, no dependencies).
async function svgToPngBlob(svg: string): Promise<Blob | null> {
  const url = URL.createObjectURL(
    new Blob([svg], { type: "image/svg+xml;charset=utf-8" }),
  );
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1350;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    return await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

// ---------- the sequence ----------
type Step =
  | { type: "headline" }
  | { type: "bucket"; title: string; blurb: string; items: string[]; tone: string }
  | { type: "ending" }
  | { type: "share" };

export function MilestoneRecap({
  recap,
  onClose,
}: {
  recap: Recap;
  onClose: () => void;
}) {
  const steps: Step[] = useMemo(() => {
    const s: Step[] = [{ type: "headline" }];
    if (recap.easyWins.length)
      s.push({
        type: "bucket",
        title: "Easy Wins",
        blurb: "Knocked out on the first try.",
        items: recap.easyWins,
        tone: "#5ff5f5",
      });
    if (recap.notUseful.length)
      s.push({
        type: "bucket",
        title: "What wasn't useful",
        blurb: "You cut these loose — they didn't serve this milestone.",
        items: recap.notUseful,
        tone: "#a99f92",
      });
    if (recap.difficulties.length)
      s.push({
        type: "bucket",
        title: "The difficulties",
        blurb: "These took some pushing. Worth watching on the next one.",
        items: recap.difficulties,
        tone: "#e0864f",
      });
    if (recap.consistency.length)
      s.push({
        type: "bucket",
        title: "Your consistency",
        blurb: "Week after week, you kept showing up.",
        items: recap.consistency.map((c) =>
          c.count > 1 ? `${c.description}  ·  ×${c.count}` : c.description,
        ),
        tone: "#c7a35c",
      });
    s.push({ type: "ending" });
    s.push({ type: "share" });
    return s;
  }, [recap]);

  const [i, setI] = useState(0);
  const step = steps[i];
  const atEnd = i >= steps.length - 1;
  const next = () => setI((v) => Math.min(steps.length - 1, v + 1));
  const prev = () => setI((v) => Math.max(0, v - 1));

  return (
    <div className="fixed inset-0 z-[95] flex flex-col bg-surface-night text-surface-primary">
      {/* progress segments */}
      <div className="flex gap-1.5 px-4 pt-4">
        {steps.map((_, idx) => (
          <div
            key={idx}
            className="h-1 flex-1 overflow-hidden rounded-full bg-white/15"
          >
            <div
              className="h-full rounded-full bg-white transition-all duration-300"
              style={{ width: idx < i ? "100%" : idx === i ? "100%" : "0%" }}
            />
          </div>
        ))}
      </div>

      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-8 z-10 text-white/70 transition-colors hover:text-white"
      >
        <X size={24} />
      </button>

      {/* Tap anywhere to advance (left third = back), Wrapped-style. The real
          buttons below stopPropagation so they aren't double-fired. Disabled on
          the share step, which needs normal interaction. */}
      <div
        onClick={(e) => {
          if (step.type === "share") return;
          if (e.clientX < window.innerWidth / 3) prev();
          else next();
        }}
        className="relative z-[1] flex flex-1 flex-col justify-center px-8 pb-10"
      >
        {step.type === "headline" && (
          <>
            <ConfettiBurst />
            <div className="fade-in-up">
              <p className="text-sm uppercase tracking-[0.28em] text-accent-gold">
                Milestone Achieved
              </p>
              <h1 className="mt-4 font-serif text-4xl leading-tight">
                {recap.title}
              </h1>
              <p className="mt-6 text-white/70">
                {fmt(recap.startedAt)} → {fmt(recap.completedAt)}
              </p>
              <p className="mt-8 font-serif text-2xl text-white">
                {recap.days ?? "—"} {recap.days === 1 ? "day" : "days"}.{" "}
                {recap.taskCount} {recap.taskCount === 1 ? "task" : "tasks"}.
              </p>
              <p className="mt-1 text-lg text-white/70">Let&apos;s break it down.</p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  next();
                }}
                className="mt-10 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-medium text-ink"
              >
                Start <ArrowRight size={18} />
              </button>
            </div>
          </>
        )}

        {step.type === "bucket" && (
          <div key={i} className="fade-in-up">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: step.tone }}
            />
            <h2 className="mt-4 font-serif text-4xl leading-tight">
              {step.title}
            </h2>
            <p className="mt-2 text-white/70">{step.blurb}</p>
            <ul className="mt-8 space-y-3">
              {step.items.map((it, k) => (
                <li
                  key={k}
                  className="border-b border-white/10 pb-3 text-lg leading-snug text-white"
                >
                  {it}
                </li>
              ))}
            </ul>
          </div>
        )}

        {step.type === "ending" && (
          <div className="fade-in-up">
            <h2 className="font-serif text-5xl leading-tight">That&apos;s one.</h2>
            <p className="mt-6 text-lg text-white/80">
              You closed this milestone in{" "}
              <span className="text-white">{recap.days ?? "—"}</span>{" "}
              {recap.days === 1 ? "day" : "days"}.
            </p>
            {recap.next ? (
              <>
                <p className="mt-2 text-lg text-white/80">
                  The next one is ready when you are.
                </p>
                <div className="mt-6 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                  <p className="text-xs uppercase tracking-[0.18em] text-accent-gold">
                    Next milestone
                  </p>
                  <p className="mt-1 font-serif text-xl text-white">
                    {recap.next.description}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                  }}
                  className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-medium text-ink"
                >
                  See my next milestone <ArrowRight size={18} />
                </button>
              </>
            ) : (
              <>
                <p className="mt-3 text-lg text-white/80">
                  That was the last milestone for this goal. 🎉
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                  }}
                  className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-medium text-ink"
                >
                  Back to Roadmap <ArrowRight size={18} />
                </button>
              </>
            )}
            <p className="mt-8 text-sm leading-relaxed text-white/50">
              Andiamo will use what worked here to suggest better tasks for what
              comes next.
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                next();
              }}
              className="mt-4 text-sm text-accent-gold underline underline-offset-4"
            >
              Share your win →
            </button>
          </div>
        )}

        {step.type === "share" && (
          <ShareStep recap={recap} onClose={onClose} />
        )}
      </div>
    </div>
  );
}

function ShareStep({ recap, onClose }: { recap: Recap; onClose: () => void }) {
  const [theme, setTheme] = useState(0);
  const [saving, setSaving] = useState(false);
  const svg = cardSvg(THEMES[theme], recap.title, recap.days);
  const filename = `andiamo-milestone-${recap.title.slice(0, 24).replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.png`;

  // Pre-render the PNG for the selected theme so the Save button can hand a
  // ready file straight to the share sheet (keeping the user gesture intact —
  // the share sheet is what lets iOS "Save Image" to Photos).
  const [file, setFile] = useState<File | null>(null);
  useEffect(() => {
    let alive = true;
    setFile(null);
    svgToPngBlob(svg).then((blob) => {
      if (alive && blob) setFile(new File([blob], filename, { type: "image/png" }));
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [svg]);

  async function save() {
    setSaving(true);
    try {
      const blob = file ?? (await svgToPngBlob(svg));
      if (!blob) return;
      const shareFile =
        blob instanceof File ? blob : new File([blob], filename, { type: "image/png" });
      const nav = navigator as Navigator & {
        canShare?: (d?: ShareData) => boolean;
      };
      // Prefer the native share sheet (offers "Save Image" → Photos on iOS).
      if (nav.canShare?.({ files: [shareFile] }) && nav.share) {
        try {
          await nav.share({ files: [shareFile] });
          return;
        } catch (err) {
          // User cancelled — don't also trigger a download.
          if (err instanceof DOMException && err.name === "AbortError") return;
        }
      }
      // Fallback: download (lands in Files on iOS).
      const url = URL.createObjectURL(shareFile);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fade-in-up flex flex-col">
      <div className="flex items-center gap-2">
        <Confetti size={20} className="text-accent-gold" weight="fill" />
        <h2 className="font-serif text-3xl">Share your win</h2>
      </div>
      <p className="mt-1 text-sm text-white/70">
        Pick a look, then save it to your photos to post.
      </p>

      {/* preview of the selected card — force the injected SVG to fit the box
          (it has an intrinsic 1080×1350 size that would otherwise overflow) */}
      <div className="mx-auto mt-5 w-56 overflow-hidden rounded-xl shadow-2xl ring-1 ring-white/10">
        <div
          className="aspect-[4/5] w-full [&>svg]:block [&>svg]:h-full [&>svg]:w-full"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>

      {/* theme picker */}
      <div className="mt-4 flex justify-center gap-2.5">
        {THEMES.map((t, idx) => (
          <button
            key={t.id}
            onClick={() => setTheme(idx)}
            aria-label={`Theme ${t.id}`}
            className={`h-9 w-9 rounded-full ring-2 transition-all ${
              theme === idx ? "ring-white" : "ring-white/20"
            }`}
            style={{ background: t.bg, borderColor: t.accent }}
          >
            <span
              className="mx-auto block h-2 w-2 rounded-full"
              style={{ background: t.accent }}
            />
          </button>
        ))}
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 font-medium text-ink disabled:opacity-60"
      >
        <Export size={18} />
        {saving ? "Opening…" : "Save to Photos"}
      </button>
      <button
        onClick={onClose}
        className="mt-3 text-sm text-white/60 transition-colors hover:text-white"
      >
        Done
      </button>
    </div>
  );
}

function fmt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
