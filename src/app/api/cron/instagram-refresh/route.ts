import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { refreshLongLivedToken } from "@/lib/social/instagram";
import { refreshInstagramMetrics } from "@/lib/social/refresh";

export const runtime = "nodejs";

/*
  Nightly job, two parts:
   1. Keep tokens alive. Long-lived tokens last ~60 days and can be refreshed
      after their first 24 hours, so we top up anything expiring within 20 days.
      Without this a connection silently dies and the artist must reconnect.
   2. Re-pull metrics for imported posts, so the dashboard reflects how content
      actually performed rather than its numbers on import day.

  Protected by CRON_SECRET (Vercel sends it as a Bearer token on scheduled runs).
*/
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Cron not configured." }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: accounts, error } = await admin
    .from("social_accounts")
    .select("id, artist_id, access_token, token_expires_at")
    .eq("platform", "instagram");
  if (error) {
    console.error("instagram refresh query error", error);
    return NextResponse.json({ error: "Query failed." }, { status: 500 });
  }

  const cutoff = Date.now() + 20 * 86_400_000;
  let tokensRefreshed = 0;
  let tokenFailures = 0;
  let metricsUpdated = 0;
  let metricFailures = 0;

  for (const acct of accounts ?? []) {
    let token = acct.access_token;

    // Top up the token first, so the metrics pull below uses a fresh one.
    const expiring =
      !acct.token_expires_at || Date.parse(acct.token_expires_at) <= cutoff;
    if (expiring) {
      const next = await refreshLongLivedToken(token);
      if (next) {
        const { error: upErr } = await admin
          .from("social_accounts")
          .update({
            access_token: next.accessToken,
            token_expires_at: next.expiresAt,
          })
          .eq("id", acct.id);
        if (upErr) {
          tokenFailures++;
        } else {
          token = next.accessToken;
          tokensRefreshed++;
        }
      } else {
        // Usually means the artist revoked access — leave the row so the UI can
        // still show it as connected-but-broken and prompt a reconnect.
        tokenFailures++;
        continue;
      }
    }

    const r = await refreshInstagramMetrics(admin, acct.artist_id, token);
    metricsUpdated += r.updated;
    metricFailures += r.failed;
    await admin
      .from("social_accounts")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("id", acct.id);
  }

  return NextResponse.json({
    ok: true,
    tokensRefreshed,
    tokenFailures,
    metricsUpdated,
    metricFailures,
  });
}
