"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/*
  In-place edits to the current Vision Statement and Goals.
  RLS guarantees a user can only update their own rows.
  (Full version history on edit is a later enhancement; the `version` column
  already exists to support it.)
*/

export async function updateVisionStatement(visionId: string, text: string) {
  const supabase = await createClient();
  // The Vision Statement is the artist's sacred space — a coach viewing the
  // artist can't edit it (Section 5.1). Only the artist (their own row) may.
  const { data: claims } = await supabase.auth.getClaims();
  const uid = claims?.claims?.sub;
  const { data: ownArtist } = uid
    ? await supabase.from("artists").select("id").eq("user_id", uid).maybeSingle()
    : { data: null };
  if (!ownArtist) return;
  const { error } = await supabase
    .from("visions")
    .update({ statement_text: text.trim() })
    .eq("id", visionId);
  if (error) throw new Error(error.message);
  revalidatePath("/vision");
}

export async function updateGoalDescription(goalId: string, text: string) {
  const supabase = await createClient();
  // Goals can be refined by the artist OR their coach (clarifying wording is a
  // coaching task). RLS still scopes this to the artist's own goals.
  const { error } = await supabase
    .from("goals")
    .update({ description: text.trim() })
    .eq("id", goalId);
  if (error) throw new Error(error.message);
  revalidatePath("/vision");
}
