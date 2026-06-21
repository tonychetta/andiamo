"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import {
  compileWtf,
  weekBounds,
  weekLabel,
  buildWtfHtml,
} from "@/lib/wtf/compile";
import type { Json } from "@/lib/supabase/database.types";

// Generate this week's WTF: snapshot it to history, email it, and clear the
// week's swipes so next week starts fresh.
export async function generateWtf(): Promise<{ ok: boolean; emailed: boolean }> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return { ok: false, emailed: false };
  const { data: aid } = await supabase.rpc("current_artist_id");
  if (!aid) return { ok: false, emailed: false };

  const today = new Date().toISOString().slice(0, 10);
  const { start, end } = weekBounds(today);
  const compiled = await compileWtf(supabase, start, end);

  // One snapshot per week — re-generating replaces it.
  await supabase
    .from("wtfs")
    .delete()
    .eq("artist_id", aid as string)
    .eq("week_start", start);
  await supabase.from("wtfs").insert({
    artist_id: aid as string,
    week_start: start,
    status: "generated",
    payload: compiled as unknown as Json,
  });

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, name")
    .eq("id", userId)
    .maybeSingle();

  let emailed = false;
  if (profile?.email) {
    const r = await sendEmail({
      to: profile.email,
      subject: `WTF // Week of ${weekLabel(start, end)}`,
      html: buildWtfHtml(compiled, profile.name ?? ""),
    });
    emailed = r.ok;
  }

  revalidatePath("/wtf");
  revalidatePath("/roadmap");
  return { ok: true, emailed };
}

export async function deleteWtf(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("wtfs").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/wtf");
}
