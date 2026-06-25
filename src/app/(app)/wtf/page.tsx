import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { compileWtf, weekBounds, weekLabel } from "@/lib/wtf/compile";
import { WTFView } from "@/components/wtf/WTFView";

export default async function WtfPage() {
  const supabase = await createClient();

  const today = new Date().toISOString().slice(0, 10);
  const { start, end } = weekBounds(today);

  const compiled = await compileWtf(supabase, start, end);

  const { data: history } = await supabase
    .from("wtfs")
    .select("id, week_start, generated_at, payload")
    .order("generated_at", { ascending: false })
    .limit(12);

  // Coach vs artist viewer, and the artist's tier (DIY vs DWY split).
  const { data: claims } = await supabase.auth.getClaims();
  const { data: profile } = claims?.claims?.sub
    ? await supabase
        .from("profiles")
        .select("account_type")
        .eq("id", claims.claims.sub)
        .maybeSingle()
    : { data: null };
  const isCoach = profile?.account_type === "coach";
  const { data: aid } = await supabase.rpc("current_artist_id");
  const { data: artistRow } = aid
    ? await supabase
        .from("artists")
        .select("tier, artist_name")
        .eq("id", aid)
        .maybeSingle()
    : { data: null };
  const tier = artistRow?.tier ?? "diy";
  const artistName = artistRow?.artist_name?.trim() || "Artist";

  // The artist's coaches (id + name) for the WTF assignment + per-coach sections.
  // Looked up via admin so it works whether a coach or the artist is viewing.
  let coaches: { id: string; name: string }[] = [];
  if (aid) {
    const admin = createAdminClient();
    const { data: links } = await admin
      .from("artist_coaches")
      .select("coaches(id, user_id)")
      .eq("artist_id", aid);
    const rows = (links ?? [])
      .map((l) => l.coaches as { id: string; user_id: string } | null)
      .filter(Boolean) as { id: string; user_id: string }[];
    if (rows.length) {
      const { data: profs } = await admin
        .from("profiles")
        .select("id, name")
        .in(
          "id",
          rows.map((r) => r.user_id),
        );
      const nameByUser = new Map(
        (profs ?? []).map((p) => [p.id, p.name?.trim() || "Coach"]),
      );
      coaches = rows.map((r) => ({
        id: r.id,
        name: nameByUser.get(r.user_id) ?? "Coach",
      }));
    }
  }

  return (
    <WTFView
      label={weekLabel(start, end)}
      compiled={compiled}
      history={history ?? []}
      isCoach={isCoach}
      tier={tier}
      artistName={artistName}
      coaches={coaches}
    />
  );
}
