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
  const { error } = await supabase
    .from("visions")
    .update({ statement_text: text.trim() })
    .eq("id", visionId);
  if (error) throw new Error(error.message);
  revalidatePath("/vision");
}

export async function updateGoalDescription(goalId: string, text: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("goals")
    .update({ description: text.trim() })
    .eq("id", goalId);
  if (error) throw new Error(error.message);
  revalidatePath("/vision");
}
