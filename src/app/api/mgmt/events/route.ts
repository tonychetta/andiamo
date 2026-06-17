import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToArtist } from "@/lib/push";

// MGMT → Andiamo webhook. MGMT calls this (server-to-server) on production
// events. A "timer_started" event pushes a notification to the artist who owns
// the song; completion events are acknowledged (the bubbles refresh on load).
// web-push needs Node APIs, so force the Node runtime.
export const runtime = "nodejs";

type MgmtEvent = {
  event?: string;
  code?: string; // the short Andiamo pairing code (preferred identifier)
  songId?: string; // raw MGMT song id (still accepted, e.g. from a pasted URL)
  songTitle?: string;
  process?: string;
  taskName?: string;
  producerName?: string;
};

export async function POST(req: Request) {
  const secret = process.env.MGMT_SHARED_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as MgmtEvent | null;
  if (!body?.event || (!body.code && !body.songId)) {
    return Response.json({ error: "Bad request" }, { status: 400 });
  }

  if (body.event === "timer_started") {
    const admin = createAdminClient();
    // Find the release whose stored code/link matches. The artist may have
    // pasted a short code (mobile) or a full song URL (desktop), so match on
    // either identifier MGMT sends. Sanitize to keep the .or() filter safe.
    const ids = [body.code, body.songId]
      .filter((v): v is string => !!v)
      .map((v) => v.replace(/[^a-zA-Z0-9_-]/g, ""))
      .filter(Boolean);
    const orExpr = ids.map((v) => `mgmt_link.ilike.%${v}%`).join(",");
    const { data: release } = orExpr
      ? await admin
          .from("releases")
          .select("artist_id, title")
          .or(orExpr)
          .limit(1)
          .maybeSingle()
      : { data: null };

    if (release?.artist_id) {
      const who = body.producerName?.trim() || "Your producer";
      const task = body.taskName?.trim() || "a production task";
      const song = body.songTitle?.trim() || release.title || "your song";
      try {
        await sendPushToArtist(release.artist_id, {
          title: "Production update",
          body: `${who} has started ${task} for ${song}.`,
          url: "/releases",
        });
      } catch (err) {
        console.error("push send failed", err);
      }
    }
  }

  // completion events (task_completed / process_completed) just 200 for now.
  return Response.json({ ok: true });
}
