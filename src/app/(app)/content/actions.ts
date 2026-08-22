"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// RLS guarantees every mutation here only touches the signed-in artist's rows.

async function artistId() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("current_artist_id");
  return { supabase, artistId: data as string | null };
}

// Disconnect a linked social account. Only the artist themselves may do this
// (same rule as connecting). social_accounts is server-only, so we use admin.
export async function disconnectSocialAccount(platform: string) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const uid = claims?.claims?.sub;
  if (!uid) return;
  const { data: own } = await supabase
    .from("artists")
    .select("id")
    .eq("user_id", uid)
    .maybeSingle();
  if (!own) return;
  await createAdminClient()
    .from("social_accounts")
    .delete()
    .eq("artist_id", own.id)
    .eq("platform", platform);
  revalidatePath("/content");
}

// Auto-color palette for Content Type tags (distinct, readable on cream).
const TAG_PALETTE = [
  "#5ff5f5",
  "#c7a35c",
  "#e07a5f",
  "#81b29a",
  "#6d83f2",
  "#d4789f",
  "#e9c46a",
  "#8d6e63",
];

export async function createContentType(name: string) {
  const text = name.trim();
  if (!text) return null;
  const { supabase, artistId: aid } = await artistId();
  if (!aid) return null;
  const { count } = await supabase
    .from("content_type_tags")
    .select("id", { count: "exact", head: true })
    .eq("artist_id", aid);
  const color = TAG_PALETTE[(count ?? 0) % TAG_PALETTE.length];
  const { data, error } = await supabase
    .from("content_type_tags")
    .insert({ artist_id: aid, name: text, color })
    .select("id, name, color")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/content");
  return data;
}

export async function addSong(title: string, originalReleaseDate?: string) {
  const text = title.trim();
  if (!text) return null;
  const { supabase, artistId: aid } = await artistId();
  if (!aid) return null;
  const { data, error } = await supabase
    .from("songs")
    .insert({
      artist_id: aid,
      title: text,
      original_release_date: originalReleaseDate || null,
    })
    .select("id, title")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/content");
  return data;
}

export type LinkInput = {
  platform: string;
  url: string;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  // Source metadata for links pulled in from a platform. Carried through the
  // replace-all save below so re-saving a piece doesn't strip the import.
  externalPostId?: string | null;
  thumbnailUrl?: string | null;
  caption?: string | null;
  postedAt?: string | null;
};

export async function saveContentPiece(input: {
  id?: string;
  scheduledDate: string;
  songId: string | null;
  typeTagIds: string[];
  sections: string[];
  notes?: string;
  links: LinkInput[];
}) {
  const { supabase, artistId: aid } = await artistId();
  if (!aid || !input.scheduledDate) return;

  let pieceId = input.id;
  const fields = {
    scheduled_date: input.scheduledDate,
    song_id: input.songId,
    notes: input.notes?.trim() || null,
    song_sections: input.sections,
  };
  if (pieceId) {
    const { error } = await supabase
      .from("content_pieces")
      .update(fields)
      .eq("id", pieceId);
    if (error) throw new Error(error.message);
  } else {
    const { data, error } = await supabase
      .from("content_pieces")
      .insert({ artist_id: aid, ...fields })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    pieceId = data.id;
  }

  // Replace the content-type tags.
  await supabase
    .from("content_piece_types")
    .delete()
    .eq("content_piece_id", pieceId);
  if (input.typeTagIds.length) {
    await supabase.from("content_piece_types").insert(
      input.typeTagIds.map((tag_id) => ({
        content_piece_id: pieceId as string,
        tag_id,
        artist_id: aid,
      })),
    );
  }

  // Replace the links (a link counts if it has a platform, url, or any metric).
  await supabase.from("content_links").delete().eq("content_piece_id", pieceId);
  const valid = input.links.filter(
    (l) =>
      l.platform.trim() ||
      l.url.trim() ||
      l.views != null ||
      l.likes != null ||
      l.comments != null ||
      l.shares != null ||
      l.saves != null,
  );
  if (valid.length) {
    await supabase.from("content_links").insert(
      valid.map((l) => ({
        artist_id: aid,
        content_piece_id: pieceId as string,
        platform: l.platform.trim(),
        url: l.url.trim(),
        views: l.views,
        likes: l.likes,
        comments: l.comments,
        shares: l.shares,
        saves: l.saves,
        external_post_id: l.externalPostId ?? null,
        thumbnail_url: l.thumbnailUrl ?? null,
        caption: l.caption ?? null,
        posted_at: l.postedAt ?? null,
      })),
    );
  }

  revalidatePath("/content");
}

export async function deleteContentPiece(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("content_pieces").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/content");
}

// Move a pill to another day (drag, or edit).
export async function moveContentPiece(id: string, date: string) {
  if (!date) return;
  const supabase = await createClient();
  const { error } = await supabase
    .from("content_pieces")
    .update({ scheduled_date: date })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/content");
}
