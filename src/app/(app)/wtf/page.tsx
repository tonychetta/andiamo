import { createClient } from "@/lib/supabase/server";
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
    ? await supabase.from("artists").select("tier").eq("id", aid).maybeSingle()
    : { data: null };
  const tier = artistRow?.tier ?? "diy";

  return (
    <WTFView
      label={weekLabel(start, end)}
      compiled={compiled}
      history={history ?? []}
      isCoach={isCoach}
      tier={tier}
    />
  );
}
