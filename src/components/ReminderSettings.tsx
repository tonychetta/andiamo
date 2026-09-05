"use client";

import { useState, useTransition } from "react";
import { saveReminderPrefs } from "@/app/profile/actions";

export type ReminderPrefsProps = {
  dailyEnabled: boolean;
  weeklyEnabled: boolean;
  reminderHour: number;
};

// 12-hour labels for a 0–23 hour value.
function hourLabel(h: number) {
  const suffix = h < 12 ? "am" : "pm";
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}:00${suffix}`;
}

export function ReminderSettings({ initial }: { initial: ReminderPrefsProps }) {
  const [daily, setDaily] = useState(initial.dailyEnabled);
  const [weekly, setWeekly] = useState(initial.weeklyEnabled);
  const [hour, setHour] = useState(initial.reminderHour);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function save(next: Partial<ReminderPrefsProps>) {
    const merged = {
      dailyEnabled: next.dailyEnabled ?? daily,
      weeklyEnabled: next.weeklyEnabled ?? weekly,
      reminderHour: next.reminderHour ?? hour,
      // Captured here so reminders land at the right local time.
      timezone:
        Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    };
    setSaved(false);
    startTransition(async () => {
      await saveReminderPrefs(merged);
      setSaved(true);
    });
  }

  return (
    <div className="rounded-2xl bg-surface-secondary p-4">
      <Toggle
        label="Daily nudge"
        hint="Your Priority task each morning, only if something's still open."
        checked={daily}
        onChange={(v) => {
          setDaily(v);
          save({ dailyEnabled: v });
        }}
      />
      <div className="my-3 border-t border-line" />
      <Toggle
        label="Weekly WTF reminder"
        hint="Sunday, only if you haven't built the week yet."
        checked={weekly}
        onChange={(v) => {
          setWeekly(v);
          save({ weeklyEnabled: v });
        }}
      />

      <div className="mt-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-ink">Send at</p>
          <p className="text-xs text-ink-soft">
            Your local time — sent at or just after.
          </p>
        </div>
        <select
          value={hour}
          onChange={(e) => {
            const v = Number(e.target.value);
            setHour(v);
            save({ reminderHour: v });
          }}
          className="rounded-lg border border-line bg-surface-primary px-3 py-2 text-sm text-ink outline-none focus:border-ink"
        >
          {Array.from({ length: 24 }, (_, h) => (
            <option key={h} value={h}>
              {hourLabel(h)}
            </option>
          ))}
        </select>
      </div>

      {(pending || saved) && (
        <p className="mt-3 text-xs text-ink-soft">
          {pending ? "Saving…" : "Saved."}
        </p>
      )}
    </div>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3">
      <span className="min-w-0">
        <span className="block text-sm text-ink">{label}</span>
        <span className="block text-xs text-ink-soft">{hint}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-5 w-5 shrink-0 accent-[color:var(--accent-cyan)]"
      />
    </label>
  );
}
