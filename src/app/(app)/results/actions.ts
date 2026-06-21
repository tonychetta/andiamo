"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// RLS guarantees every mutation here only touches the signed-in artist's rows.

async function artistId() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("current_artist_id");
  return { supabase, artistId: data as string | null };
}

// Add or update a data point for a metric on a given date (one value per
// metric/song/date — re-entering the same date overwrites it).
export async function saveResultEntry(input: {
  metricKey: string;
  songId?: string | null;
  date: string;
  value: number;
}) {
  if (!input.date || !input.metricKey) return;
  const { supabase, artistId: aid } = await artistId();
  if (!aid) return;
  const value = Math.max(0, Math.round(input.value || 0));
  const songId = input.songId ?? null;

  let query = supabase
    .from("results_entries")
    .select("id")
    .eq("artist_id", aid)
    .eq("metric_key", input.metricKey)
    .eq("entry_date", input.date);
  query = songId ? query.eq("song_id", songId) : query.is("song_id", null);
  const { data: existing } = await query.maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("results_entries")
      .update({ value })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("results_entries").insert({
      artist_id: aid,
      metric_key: input.metricKey,
      song_id: songId,
      entry_date: input.date,
      value,
    });
    if (error) throw new Error(error.message);
  }
  revalidatePath("/results");
}

export async function deleteResultEntry(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("results_entries")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/results");
}
