import type { createAdminClient } from "@/lib/supabase/admin";
import { fetchInsights } from "@/lib/social/instagram";

type Admin = ReturnType<typeof createAdminClient>;

/*
  Re-pull metrics for an artist's already-imported Instagram posts.
  Metrics only accrue over time, so this is what keeps the dashboard honest
  after import day. Capped per run so one artist with a huge back catalogue
  can't blow through rate limits (newest posts move most, so we do those first).
*/
export async function refreshInstagramMetrics(
  admin: Admin,
  artistId: string,
  token: string,
  limit = 60,
): Promise<{ updated: number; failed: number }> {
  const { data: links } = await admin
    .from("content_links")
    .select("id, external_post_id")
    .eq("artist_id", artistId)
    .eq("platform", "Instagram")
    .not("external_post_id", "is", null)
    .order("posted_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  let updated = 0;
  let failed = 0;
  for (const link of links ?? []) {
    if (!link.external_post_id) continue;
    const m = await fetchInsights(token, link.external_post_id);
    // fetchInsights never throws; all-null means the call didn't come back with
    // anything usable, so don't overwrite good numbers with blanks.
    if (
      m.views == null &&
      m.likes == null &&
      m.comments == null &&
      m.shares == null &&
      m.saves == null
    ) {
      failed++;
      continue;
    }
    const { error } = await admin
      .from("content_links")
      .update({
        views: m.views,
        likes: m.likes,
        comments: m.comments,
        shares: m.shares,
        saves: m.saves,
      })
      .eq("id", link.id);
    if (error) failed++;
    else updated++;
  }
  return { updated, failed };
}
