"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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

  // The WTF goes to the artist AND every coach assigned to them. We gather
  // recipients with the admin client so it works no matter who clicked Generate
  // (the artist themselves, or a coach impersonating them) and isn't limited by
  // who each role can read under RLS.
  const admin = createAdminClient();
  const recipients = new Set<string>();
  let artistName = "";

  const { data: artistRow } = await admin
    .from("artists")
    .select("artist_name, user_id")
    .eq("id", aid as string)
    .maybeSingle();
  artistName = artistRow?.artist_name ?? "";
  if (artistRow?.user_id) {
    const { data: ap } = await admin
      .from("profiles")
      .select("email")
      .eq("id", artistRow.user_id)
      .maybeSingle();
    if (ap?.email) recipients.add(ap.email);
  }

  const { data: links } = await admin
    .from("artist_coaches")
    .select("coaches(user_id)")
    .eq("artist_id", aid as string);
  const coachUserIds = (links ?? [])
    .map((l) => (l.coaches as { user_id: string } | null)?.user_id)
    .filter(Boolean) as string[];
  if (coachUserIds.length) {
    const { data: coachProfiles } = await admin
      .from("profiles")
      .select("email")
      .in("id", coachUserIds);
    for (const c of coachProfiles ?? []) if (c.email) recipients.add(c.email);
  }

  const subject = `WTF // Week of ${weekLabel(start, end)}`;
  const html = buildWtfHtml(compiled, artistName);
  let emailed = false;
  for (const to of recipients) {
    const r = await sendEmail({ to, subject, html });
    emailed = emailed || r.ok;
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
