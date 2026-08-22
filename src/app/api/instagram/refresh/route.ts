import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSocialAccount } from "@/lib/social/accounts";
import { refreshInstagramMetrics } from "@/lib/social/refresh";

export const runtime = "nodejs";

// On-demand "refresh my numbers now", from the Sync panel.
export async function POST() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }
  const { data: aid } = await supabase.rpc("current_artist_id");
  if (!aid) return Response.json({ error: "No artist." }, { status: 400 });

  const account = await getSocialAccount(aid as string, "instagram");
  if (!account) {
    return Response.json({ error: "Instagram isn't connected." }, { status: 400 });
  }

  const admin = createAdminClient();
  const result = await refreshInstagramMetrics(
    admin,
    aid as string,
    account.accessToken,
  );
  await admin
    .from("social_accounts")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("id", account.id);

  return Response.json({ ok: true, ...result });
}
