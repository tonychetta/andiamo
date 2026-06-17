import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

// Web Push sender. Server-only. Configures VAPID lazily so importing this in a
// build step without env vars doesn't throw.

let configured = false;
function ensureConfigured() {
  if (configured) return;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:hello@andiamo.app";
  if (!pub || !priv) throw new Error("VAPID keys are not configured.");
  webpush.setVapidDetails(subject, pub, priv);
  configured = true;
}

export type PushPayload = { title: string; body: string; url?: string };

// Send a push to every device the artist has registered. Prunes subscriptions
// the push service reports as gone (404/410).
export async function sendPushToArtist(
  artistId: string,
  payload: PushPayload,
): Promise<{ sent: number }> {
  ensureConfigured();
  const admin = createAdminClient();
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("artist_id", artistId);
  if (!subs?.length) return { sent: 0 };

  let sent = 0;
  const dead: string[] = [];
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
        );
        sent++;
      } catch (err: unknown) {
        const code = (err as { statusCode?: number })?.statusCode;
        if (code === 404 || code === 410) dead.push(s.id);
      }
    }),
  );
  if (dead.length) {
    await admin.from("push_subscriptions").delete().in("id", dead);
  }
  return { sent };
}
