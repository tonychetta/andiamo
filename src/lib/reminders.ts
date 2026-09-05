import type { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToArtist } from "@/lib/push";
import { weekBounds } from "@/lib/wtf/compile";

type Admin = ReturnType<typeof createAdminClient>;

/*
  Task Notifications — Mon / Wed / Fri, once each of those days.

  Wording rotates so three a week doesn't read like the same alert repeating:
  the task count, the Priority task, and a general "before your next meeting"
  nudge. Which one you get is derived from the date, so it varies across the
  week without needing to store a counter.

  Timing note: Vercel's Hobby plan allows one cron run per day, so the job fires
  at a single UTC hour rather than 9am in each artist's own timezone. The
  weekday and the once-per-day guard are still evaluated in the artist's local
  time, so nobody gets two, and nobody gets one on the wrong day.
*/

// The artist's local date and weekday, from an IANA timezone.
export function localNow(tz: string): { date: string; weekday: number } {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
    }).formatToParts(new Date());
  } catch {
    return localNow("UTC"); // unknown tz — don't drop the artist
  }
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    weekday: Math.max(0, days.indexOf(get("weekday"))),
  };
}

const SEND_DAYS = new Set([1, 3, 5]); // Mon, Wed, Fri

// What's live on this week's WTF, for the message body.
async function weekSnapshot(admin: Admin, artistId: string, localDate: string) {
  const { start } = weekBounds(localDate);
  const { data: tasks } = await admin
    .from("tasks")
    .select("description, status, wtf_priority")
    .eq("artist_id", artistId)
    .eq("on_wtf", true)
    .eq("wtf_week", start);
  const open = (tasks ?? []).filter(
    (t) => t.status !== "completed" && t.status !== "complete_and_push",
  );
  return {
    open: open.length,
    priority: open.find((t) => t.wtf_priority) ?? null,
  };
}

type Msg = { title: string; body: string };

// Rotate by date so Mon / Wed / Fri each land differently.
function composeMessage(
  localDate: string,
  open: number,
  priority: string | null,
): Msg {
  const dayIndex = Math.floor(Date.parse(`${localDate}T00:00:00Z`) / 86_400_000);
  const plural = open === 1 ? "task" : "tasks";
  const variants: Msg[] = [
    {
      title: "This week's board",
      body: `${open} ${plural} still open on your WTF.`,
    },
    priority
      ? { title: "Start with your Priority", body: priority }
      : { title: "Pick your Priority", body: `${open} ${plural} open — star the one that matters most.` },
    {
      title: "Before your next meeting",
      body: `Work through the ${open} ${plural} left on this week's form.`,
    },
  ];
  return variants[dayIndex % variants.length];
}

export async function runReminders(
  admin: Admin,
): Promise<{ sent: number; skipped: number }> {
  // Only artists with a registered device can be notified at all.
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("artist_id");
  const subscribed = [...new Set((subs ?? []).map((s) => s.artist_id))];
  if (subscribed.length === 0) return { sent: 0, skipped: 0 };

  const { data: prefsRows } = await admin
    .from("notification_prefs")
    .select("artist_id, tasks_enabled, timezone, last_sent_on")
    .in("artist_id", subscribed);
  const prefsById = new Map((prefsRows ?? []).map((p) => [p.artist_id, p]));

  let sent = 0;
  let skipped = 0;

  for (const artistId of subscribed) {
    // No row yet means never touched the setting — notifications are ON by
    // default, so absence must not mean "off".
    const prefs = prefsById.get(artistId);
    if (prefs && !prefs.tasks_enabled) {
      skipped++;
      continue;
    }
    const tz = prefs?.timezone || "UTC";
    const now = localNow(tz);

    if (!SEND_DAYS.has(now.weekday) || prefs?.last_sent_on === now.date) {
      skipped++;
      continue;
    }

    // Nothing open means nothing to nudge about — an empty WTF is the coach's
    // to fill after the meeting, not the artist's to be pestered over.
    const snap = await weekSnapshot(admin, artistId, now.date);
    if (snap.open === 0) {
      skipped++;
      continue;
    }

    const msg = composeMessage(
      now.date,
      snap.open,
      snap.priority?.description ?? null,
    );
    const res = await sendPushToArtist(artistId, { ...msg, url: "/wtf" });
    if (res.sent > 0) sent++;

    await admin.from("notification_prefs").upsert(
      { artist_id: artistId, timezone: tz, last_sent_on: now.date },
      { onConflict: "artist_id" },
    );
  }

  return { sent, skipped };
}
