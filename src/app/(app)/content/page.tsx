import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ContentView } from "@/components/content/ContentView";

export default async function ContentPage() {
  const supabase = await createClient();

  const [
    { data: releases },
    { data: songs },
    { data: contentTypes },
    { data: pieces },
  ] = await Promise.all([
    supabase
      .from("releases")
      .select("id, title, release_date")
      .order("release_date", { ascending: true }),
    supabase
      .from("songs")
      .select("id, title, original_release_date")
      .order("title", { ascending: true }),
    supabase
      .from("content_type_tags")
      .select("id, name, color")
      .order("created_at", { ascending: true }),
    supabase
      .from("content_pieces")
      .select(
        "id, scheduled_date, song_id, notes, song_sections, songs(title), content_piece_types(tag_id), content_links(id, platform, url, views, likes, comments, shares, saves, updated_at, external_post_id, thumbnail_url, caption, posted_at)",
      )
      .order("scheduled_date", { ascending: true }),
  ]);

  type PieceRow = NonNullable<typeof pieces>[number];
  const piecesData = (pieces ?? []).map((p: PieceRow) => ({
    id: p.id,
    scheduled_date: p.scheduled_date,
    song_id: p.song_id,
    song_title: (p.songs as { title: string } | null)?.title ?? null,
    notes: p.notes,
    sections: p.song_sections ?? [],
    typeIds: (p.content_piece_types ?? []).map((t) => t.tag_id),
    links: (p.content_links ?? []).map((l) => ({
      id: l.id,
      platform: l.platform,
      url: l.url,
      views: l.views,
      likes: l.likes,
      comments: l.comments,
      shares: l.shares,
      saves: l.saves,
      updated_at: l.updated_at,
      external_post_id: l.external_post_id,
      thumbnail_url: l.thumbnail_url,
      caption: l.caption,
      posted_at: l.posted_at,
    })),
  }));

  const today = new Date().toISOString().slice(0, 10);

  // Connected platforms. social_accounts is server-only (RLS on, no policies),
  // so we read it with the admin client and pass down ONLY safe fields — never
  // the access token.
  const { data: aid } = await supabase.rpc("current_artist_id");
  let connections: { platform: string; username: string | null }[] = [];
  if (aid) {
    const { data: accounts } = await createAdminClient()
      .from("social_accounts")
      .select("platform, username")
      .eq("artist_id", aid as string);
    connections = accounts ?? [];
  }

  return (
    <ContentView
      today={today}
      releaseDates={(releases ?? [])
        .filter((r) => r.release_date)
        .map((r) => ({
          id: r.id,
          title: r.title,
          date: r.release_date as string,
        }))}
      songs={songs ?? []}
      contentTypes={contentTypes ?? []}
      pieces={piecesData}
      connections={connections}
    />
  );
}
