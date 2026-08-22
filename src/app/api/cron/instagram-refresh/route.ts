import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { refreshLongLivedToken } from "@/lib/social/instagram";

export const runtime = "nodejs";

/*
  Nightly job: keep Instagram tokens alive. Long-lived tokens last ~60 days and
  can be refreshed any time after their first 24 hours, so we top up anything
  expiring within 20 days. Without this, a connection silently dies after 60
  days and the artist would have to reconnect.

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
  const cutoff = new Date(Date.now() + 20 * 86_400_000).toISOString();
  const { data: accounts, error } = await admin
    .from("social_accounts")
    .select("id, access_token, token_expires_at")
    .eq("platform", "instagram")
    .or(`token_expires_at.is.null,token_expires_at.lte.${cutoff}`);
  if (error) {
    console.error("instagram refresh query error", error);
    return NextResponse.json({ error: "Query failed." }, { status: 500 });
  }

  let refreshed = 0;
  let failed = 0;
  for (const acct of accounts ?? []) {
    const next = await refreshLongLivedToken(acct.access_token);
    if (!next) {
      // Usually means the artist revoked access — leave the row so the UI can
      // still show it as connected-but-broken and prompt a reconnect.
      failed++;
      continue;
    }
    const { error: upErr } = await admin
      .from("social_accounts")
      .update({
        access_token: next.accessToken,
        token_expires_at: next.expiresAt,
      })
      .eq("id", acct.id);
    if (upErr) failed++;
    else refreshed++;
  }

  return NextResponse.json({ ok: true, refreshed, failed });
}
