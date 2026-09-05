"use client";

import { useState, useTransition } from "react";
import { saveTaskNotifications } from "@/app/profile/actions";

// One switch, no explanation. Sends Mon/Wed/Fri; on by default.
export function ReminderSettings({ enabled }: { enabled: boolean }) {
  const [on, setOn] = useState(enabled);
  const [, startTransition] = useTransition();

  function toggle(next: boolean) {
    setOn(next);
    startTransition(async () => {
      await saveTaskNotifications(
        next,
        Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      );
    });
  }

  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl bg-surface-secondary px-4 py-3">
      <span className="text-sm text-ink">Task Push Notifications</span>
      <input
        type="checkbox"
        checked={on}
        onChange={(e) => toggle(e.target.checked)}
        className="h-5 w-5 shrink-0 accent-[color:var(--accent-cyan)]"
      />
    </label>
  );
}
