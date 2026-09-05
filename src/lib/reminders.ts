import type { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToArtist } from "@/lib/push";
import { weekBounds } from "@/lib/wtf/compile";

type Admin = ReturnType<typeof createAdminClient>;

/*
  Reminder engine. Decides, per artist, whether they're due a reminder.

  Everything keys off the artist's OWN timezone. The last-sent dates are stored
  as the artist's LOCAL date, so the job is idempotent — it can run any number of
  times a day and still send once.

  Timing note: Vercel's Hobby plan allows only ONE cron run per day, so we can't
  fire exactly on each artist's chosen hour. Instead the daily run sends to
  anyone whose chosen hour has already passed locally — i.e. "at or after" their
  time. Moving to an hourly schedule makes it exact and needs no code change
  here beyond the comparison below.
*/

// The artist's local date, hour and weekday, from an IANA timezone.
export function localNow(tz: string): {
  date: string;
  hour: number;
  weekday: number;
} {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hour12: false,
      weekday: "short",
    }).formatToParts(new Date());
  } catch {
    // Unknown timezone string — fall back to UTC rather than skipping them.
    return localNow("UTC");
  }
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  // "24" shows up at midnight in some environments; normalise it to 0.
  const hour = Number(get("hour")) % 24;
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    hour,
    weekday: Math.max(0, days.indexOf(get("weekday"))),
  };
}

type Prefs = {
  artist_id: string;
  daily_enabled: boolean;
  weekly_enabled: boolean;
  reminder_hour: number;
  timezone: string;
  last_daily_on: string | null;
  last_weekly_on: string | null;
};

// What's actually on this week's WTF, for the message body.
async function weekSnapshot(admin: Admin, artistId: string, localDate: string) {
  const { start } = weekBounds(localDate);
  const { data: tasks } = await admin
    .from("tasks")
    .select("description, status, wtf_priority")
    .eq("artist_id", artistId)
    .eq("on_wtf", true)
    .eq("wtf_week", start);
  const all = tasks ?? [];
  const open = all.filter(
    (t) => t.status !== "completed" && t.status !== "complete_and_push",
  );
  const priority = open.find((t) => t.wtf_priority) ?? null;
  return { total: all.length, open: open.length, priority };
}

export async function runReminders(
  admin: Admin,
): Promise<{ daily: number; weekly: number; skipped: number }> {
  // Only artists who actually have a device registered can be reminded.
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("artist_id");
  const subscribed = new Set((subs ?? []).map((s) => s.artist_id));
  if (subscribed.size === 0) return { daily: 0, weekly: 0, skipped: 0 };

  const { data: prefsRows } = await admin
    .from("notification_prefs")
    .select(
      "artist_id, daily_enabled, weekly_enabled, reminder_hour, timezone, last_daily_on, last_weekly_on",
    )
    .in("artist_id", [...subscribed]);

  let daily = 0;
  let weekly = 0;
  let skipped = 0;

  for (const p of (prefsRows ?? []) as Prefs[]) {
    const now = localNow(p.timezone);
    // "At or after" their chosen hour (see timing note above). On an hourly
    // schedule this becomes `!==` for exact delivery.
    if (now.hour < p.reminder_hour) {
      skipped++;
      continue;
    }

    const snap = await weekSnapshot(admin, p.artist_id, now.date);

    // Weekly, on Sunday: only worth sending if the week is still empty.
    if (
      p.weekly_enabled &&
      now.weekday === 0 &&
      p.last_weekly_on !== now.date &&
      snap.total === 0
    ) {
      const { sent } = await sendPushToArtist(p.artist_id, {
        title: "New week, empty WTF",
        body: "Swipe this week's tasks onto your Weekly Task Form from the Roadmap.",
        url: "/roadmap",
      });
      if (sent > 0) weekly++;
      await admin
        .from("notification_prefs")
        .update({ last_weekly_on: now.date })
        .eq("artist_id", p.artist_id);
      continue; // one push per artist per hour, never two at once
    }

    // Daily: only if there's actually something open to nudge about.
    if (p.daily_enabled && p.last_daily_on !== now.date && snap.open > 0) {
      const body = snap.priority
        ? `Priority: ${snap.priority.description}`
        : `${snap.open} task${snap.open === 1 ? "" : "s"} left this week.`;
      const { sent } = await sendPushToArtist(p.artist_id, {
        title: snap.priority ? "Start here today" : "Your week so far",
        body,
        url: "/wtf",
      });
      if (sent > 0) daily++;
      await admin
        .from("notification_prefs")
        .update({ last_daily_on: now.date })
        .eq("artist_id", p.artist_id);
    }
  }

  return { daily, weekly, skipped };
}
