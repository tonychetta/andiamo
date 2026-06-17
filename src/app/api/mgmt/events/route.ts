import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToArtist } from "@/lib/push";

// MGMT → Andiamo webhook. MGMT calls this (server-to-server) on production
// events. A "timer_started" event pushes a notification to the artist who owns
// the song; completion events are acknowledged (the bubbles refresh on load).
// web-push needs Node APIs, so force the Node runtime.
export const runtime = "nodejs";

type MgmtEvent = {
  event?: string;
  songId?: string;
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
  if (!body?.event || !body.songId) {
    return Response.json({ error: "Bad request" }, { status: 400 });
  }

  if (body.event === "timer_started") {
    const admin = createAdminClient();
    // The release that links this MGMT song id tells us which artist to notify.
    const { data: release } = await admin
      .from("releases")
      .select("artist_id, title")
      .ilike("mgmt_link", `%${body.songId}%`)
      .limit(1)
      .maybeSingle();

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
