import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSocialAccount } from "@/lib/social/accounts";
import { fetchMedia } from "@/lib/social/instagram";

export const runtime = "nodejs";

// The artist's recent Instagram posts for the picker grid, each flagged with
// whether it's already been pulled into Andiamo (so the cover can show a check).
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }
  const { data: aid } = await supabase.rpc("current_artist_id");
  if (!aid) return Response.json({ error: "No artist." }, { status: 400 });

  const account = await getSocialAccount(aid as string, "instagram");
  if (!account) {
    return Response.json(
      { error: "Instagram isn't connected yet." },
      { status: 400 },
    );
  }

  const after = new URL(request.url).searchParams.get("after") ?? undefined;
  const result = await fetchMedia(account.accessToken, 24, after);
  if (!result) {
    return Response.json(
      {
        error:
          "Couldn't reach Instagram. The connection may have expired — try disconnecting and reconnecting.",
      },
      { status: 502 },
    );
  }

  // Which of these are already imported? (admin: content_links is RLS-scoped but
  // we only need this artist's rows, which we've already resolved.)
  const ids = result.media.map((m) => m.id);
  const imported = new Set<string>();
  if (ids.length) {
    const { data: existing } = await createAdminClient()
      .from("content_links")
      .select("external_post_id")
      .eq("artist_id", aid as string)
      .eq("platform", "Instagram")
      .in("external_post_id", ids);
    for (const row of existing ?? []) {
      if (row.external_post_id) imported.add(row.external_post_id);
    }
  }

  return Response.json({
    username: account.username,
    media: result.media.map((m) => ({ ...m, imported: imported.has(m.id) })),
    nextCursor: result.nextCursor ?? null,
  });
}
