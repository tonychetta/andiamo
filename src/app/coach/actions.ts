"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

type ArtistStatus = Database["public"]["Enums"]["artist_status"];

async function coachContext() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = (claims?.claims?.sub as string | undefined) ?? null;
  if (!userId) return { supabase, userId: null, coachId: null };
  const { data: coach } = await supabase
    .from("coaches")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  return { supabase, userId, coachId: coach?.id ?? null };
}

// Enter an assigned artist's context, then drop into their app.
export async function setActiveArtist(artistId: string) {
  const { supabase, userId, coachId } = await coachContext();
  if (!userId || !coachId) return;
  // RLS only returns artists assigned to this coach, so this validates access.
  const { data: artist } = await supabase
    .from("artists")
    .select("id")
    .eq("id", artistId)
    .maybeSingle();
  if (!artist) return;
  await supabase
    .from("coach_active_artist")
    .upsert(
      { coach_user_id: userId, artist_id: artistId, updated_at: new Date().toISOString() },
      { onConflict: "coach_user_id" },
    );
  redirect("/roadmap");
}

export async function clearActiveArtist() {
  const { supabase, userId } = await coachContext();
  if (userId) {
    await supabase
      .from("coach_active_artist")
      .delete()
      .eq("coach_user_id", userId);
  }
  redirect("/");
}

export async function setArtistStatus(artistId: string, status: ArtistStatus) {
  const { supabase, coachId } = await coachContext();
  if (!coachId) return;
  await supabase.from("artists").update({ status }).eq("id", artistId);
  revalidatePath("/");
}

// Link an existing artist account to this coach by their login email. Uses the
// admin client because a coach can't otherwise see unassigned artists/profiles.
export async function assignArtistByEmail(
  email: string,
): Promise<{ ok: boolean; error?: string }> {
  const { userId, coachId } = await coachContext();
  if (!userId || !coachId) return { ok: false, error: "Not signed in as a coach." };
  const e = email.trim().toLowerCase();
  if (!e) return { ok: false, error: "Enter an email." };

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, account_type")
    .eq("email", e)
    .maybeSingle();
  if (!profile || profile.account_type !== "artist") {
    return { ok: false, error: "No artist account found with that email." };
  }
  const { data: artist } = await admin
    .from("artists")
    .select("id")
    .eq("user_id", profile.id)
    .maybeSingle();
  if (!artist) return { ok: false, error: "That account has no artist profile." };

  const { error } = await admin
    .from("artists")
    .update({ coach_id: coachId, status: "active" })
    .eq("id", artist.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/");
  return { ok: true };
}
