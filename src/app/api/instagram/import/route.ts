import { createClient } from "@/lib/supabase/server";
import { getSocialAccount } from "@/lib/social/accounts";
import { fetchInsights, fetchMediaById } from "@/lib/social/instagram";

export const runtime = "nodejs";

/*
  Pull one Instagram post into Andiamo.
  - no pieceId -> create a new content piece dated to when it was actually posted
  - pieceId    -> attach this post to an existing piece (the "+ Add Instagram"
                  flow), so one creative can carry a link per platform.
  Post details and metrics are re-fetched server-side; we never trust numbers
  sent from the browser.
*/
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }
  const { data: aid } = await supabase.rpc("current_artist_id");
  if (!aid) return Response.json({ error: "No artist." }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const mediaId = String(body?.mediaId ?? "").trim();
  const pieceId = body?.pieceId ? String(body.pieceId) : null;
  if (!mediaId) return Response.json({ error: "Missing post." }, { status: 400 });

  const account = await getSocialAccount(aid as string, "instagram");
  if (!account) {
    return Response.json({ error: "Instagram isn't connected." }, { status: 400 });
  }

  const media = await fetchMediaById(account.accessToken, mediaId);
  if (!media) {
    return Response.json({ error: "Couldn't load that post." }, { status: 502 });
  }
  const metrics = await fetchInsights(account.accessToken, mediaId);

  // The date it actually went out drives where it lands on the calendar.
  const postedDate = (media.timestamp || "").slice(0, 10) ||
    new Date().toISOString().slice(0, 10);

  let targetPiece = pieceId;
  if (!targetPiece) {
    const { data: piece, error } = await supabase
      .from("content_pieces")
      .insert({ artist_id: aid as string, scheduled_date: postedDate })
      .select("id")
      .single();
    if (error || !piece) {
      console.error("instagram import piece error", error);
      return Response.json({ error: "Couldn't create the entry." }, { status: 500 });
    }
    targetPiece = piece.id;
  }

  const { error: linkErr } = await supabase.from("content_links").upsert(
    {
      artist_id: aid as string,
      content_piece_id: targetPiece,
      platform: "Instagram",
      url: media.permalink,
      external_post_id: media.id,
      thumbnail_url: media.thumbnailUrl,
      caption: media.caption,
      posted_at: media.timestamp || null,
      views: metrics.views,
      likes: metrics.likes,
      comments: metrics.comments,
      shares: metrics.shares,
      saves: metrics.saves,
    },
    { onConflict: "artist_id,platform,external_post_id" },
  );
  if (linkErr) {
    console.error("instagram import link error", linkErr);
    // Surface the underlying reason — a bare "couldn't save" leaves nothing to
    // act on, and these are the artist's own rows.
    return Response.json(
      { error: `Couldn't save the metrics: ${linkErr.message}` },
      { status: 500 },
    );
  }

  return Response.json({ ok: true, pieceId: targetPiece, date: postedDate });
}
