"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

type ArtistStatus = Database["public"]["Enums"]["artist_status"];
type ArtistTier = Database["public"]["Enums"]["artist_tier"];

// Readable code, no ambiguous characters.
function randomCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 8; i++)
    s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}

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

// ---------- Invite codes (Section 5.3) ----------

export async function generateInviteCode(
  tier: ArtistTier,
  billingBypass: boolean,
): Promise<{ ok: boolean; code?: string; error?: string }> {
  const { supabase, coachId } = await coachContext();
  if (!coachId) return { ok: false, error: "Not a coach." };
  const code = randomCode();
  const { error } = await supabase.from("invite_codes").insert({
    coach_id: coachId,
    code,
    tier,
    billing_bypass: billingBypass,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/");
  return { ok: true, code };
}

export async function deleteInviteCode(id: string) {
  const { supabase, coachId } = await coachContext();
  if (!coachId) return;
  await supabase.from("invite_codes").delete().eq("id", id);
  revalidatePath("/");
}

// Redeem a code on the signed-in artist's account: assign to the coach + set
// tier/comp + mark used. Admin client (the artist can't read others' codes).
export async function redeemInviteCode(
  code: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const uid = claims?.claims?.sub as string | undefined;
  if (!uid) return { ok: false, error: "Not signed in." };
  const clean = code.trim().toUpperCase();
  if (!clean) return { ok: false, error: "Enter a code." };

  const admin = createAdminClient();
  const { data: ic } = await admin
    .from("invite_codes")
    .select("id, coach_id, tier, billing_bypass, used_by, expires_at")
    .eq("code", clean)
    .maybeSingle();
  if (!ic) return { ok: false, error: "Invalid invite code." };
  if (ic.used_by) return { ok: false, error: "This code has already been used." };
  if (new Date(ic.expires_at) < new Date())
    return { ok: false, error: "This code has expired." };

  const { data: artist } = await admin
    .from("artists")
    .select("id")
    .eq("user_id", uid)
    .maybeSingle();
  if (!artist) return { ok: false, error: "Only artist accounts can use a code." };

  await admin
    .from("artists")
    .update({
      coach_id: ic.coach_id,
      tier: ic.tier,
      status: "active",
      subscription_status: ic.billing_bypass ? "comp" : "standard",
    })
    .eq("id", artist.id);
  await admin
    .from("invite_codes")
    .update({ used_by: uid, used_at: new Date().toISOString() })
    .eq("id", ic.id);
  return { ok: true };
}
