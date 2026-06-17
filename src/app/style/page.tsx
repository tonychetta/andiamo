"use client";

/*
  TEMPORARY foundation preview page.
  Its only job right now is to show the Andiamo design system working:
  logo, colors, type, icons, and the Priority Task treatment.
  This gets replaced by real login + routing in the next build step.
*/

import {
  Eye,
  Path,
  VinylRecord,
  CalendarBlank,
  ChartLineUp,
  UserCircle,
} from "@phosphor-icons/react";
import { Logo } from "@/components/Logo";

const PAGES = [
  { name: "Vision", descriptor: "the why", Icon: Eye },
  { name: "Roadmap", descriptor: "the path", Icon: Path },
  { name: "Releases", descriptor: "what's coming", Icon: VinylRecord },
  { name: "Content", descriptor: "how the work gets seen", Icon: CalendarBlank },
  { name: "Results", descriptor: "the proof", Icon: ChartLineUp },
];

const SWATCHES = [
  { name: "surface-primary", value: "var(--surface-primary)", hex: "#f7f3ec" },
  { name: "surface-secondary", value: "var(--surface-secondary)", hex: "#efe9de" },
  { name: "surface-accent", value: "var(--surface-accent)", hex: "#e7ddcb" },
  { name: "text-primary", value: "var(--text-primary)", hex: "#2c2522" },
  { name: "text-secondary", value: "var(--text-secondary)", hex: "#847b70" },
  { name: "accent-cyan", value: "var(--accent-cyan)", hex: "#5ff5f5" },
  { name: "accent-gold", value: "var(--accent-gold)", hex: "#c7a35c" },
];

export default function Home() {
  return (
    <div className="min-h-full">
      {/* Header — logo left, persistent profile chip right (previewed) */}
      <header className="flex items-center justify-between px-6 py-5 md:px-10">
        <div className="flex items-center gap-3">
          <Logo variant="icon" width={40} height={40} />
          <span className="font-serif text-2xl text-ink">Andiamo</span>
        </div>
        <button
          aria-label="Profile"
          className="grid h-11 w-11 place-items-center rounded-full bg-surface-secondary text-ink transition-colors hover:bg-surface-accent"
        >
          <UserCircle size={26} />
        </button>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-24 md:px-10">
        {/* Hero */}
        <section className="pt-10 md:pt-16">
          <p className="text-sm uppercase tracking-[0.2em] text-ink-soft">
            Foundation preview
          </p>
          <h1 className="mt-4 font-serif text-5xl leading-[1.05] text-ink md:text-6xl">
            The bridge between potential and momentum.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
            Andiamo helps independent musicians build the structure that turns a
            dream into daily work. Two words hold it up:{" "}
            <span className="text-ink">Clarity and Accountability.</span>
          </p>
        </section>

        {/* The five pages */}
        <section className="mt-16">
          <h2 className="font-serif text-2xl text-ink">The five pages</h2>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {PAGES.map(({ name, descriptor, Icon }) => (
              <div
                key={name}
                className="flex flex-col gap-3 rounded-2xl bg-surface-secondary p-5"
              >
                <Icon size={30} weight="thin" className="text-ink" />
                <div>
                  <p className="font-serif text-lg text-ink">{name}</p>
                  <p className="text-sm text-ink-soft">{descriptor}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Priority Task treatment */}
        <section className="mt-16">
          <h2 className="font-serif text-2xl text-ink">This week&apos;s tasks</h2>
          <p className="mt-1 text-sm text-ink-soft">
            The Priority Task sits at the top with a gold halo — the one task
            that defines the week.
          </p>
          <div className="mt-6 rounded-2xl bg-surface-secondary p-6">
            <ul className="space-y-1">
              <li className="flex items-center gap-3 pb-4">
                <span className="priority-bullet" />
                <span className="text-ink">
                  Submit Spotify editorial pitch for &ldquo;Caroline&rdquo;
                </span>
              </li>
              {[
                "Pitch 10 independent playlist curators",
                "Film the in-studio reel for Tuesday",
                "Confirm the pre-save link is live",
              ].map((task) => (
                <li key={task} className="flex items-center gap-3 py-1.5">
                  <span className="h-[7px] w-[7px] rounded-full bg-ink" />
                  <span className="text-ink">{task}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Typography */}
        <section className="mt-16">
          <h2 className="font-serif text-2xl text-ink">Typography</h2>
          <div className="mt-6 space-y-6 rounded-2xl bg-surface-secondary p-6">
            <div>
              <p className="text-xs uppercase tracking-widest text-ink-soft">
                Display — Fraunces (placeholder for Kepler Std)
              </p>
              <p className="mt-2 font-serif text-3xl text-ink">
                I am headlining 4,000-cap theaters by 32.
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-ink-soft">
                Body — Inter
              </p>
              <p className="mt-2 leading-relaxed text-ink">
                The opposite of quitting is not trying hard. The opposite of
                quitting is daily commitment to a specific Vision.
              </p>
            </div>
          </div>
        </section>

        {/* Color palette */}
        <section className="mt-16">
          <h2 className="font-serif text-2xl text-ink">Color palette</h2>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {SWATCHES.map(({ name, value, hex }) => (
              <div
                key={name}
                className="overflow-hidden rounded-2xl border border-line bg-surface-secondary"
              >
                <div className="h-20 w-full" style={{ background: value }} />
                <div className="px-3 py-3">
                  <p className="text-sm text-ink">{name}</p>
                  <p className="text-xs uppercase text-ink-soft">{hex}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <footer className="mt-20 border-t border-line pt-6 text-sm text-ink-soft">
          Foundation preview — design system only. Login, the five pages, and the
          Coach Portal come next.
        </footer>
      </main>
    </div>
  );
}
