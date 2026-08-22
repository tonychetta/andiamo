import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  exchangeCode,
  fetchProfile,
  redirectUri,
  toLongLivedToken,
} from "@/lib/social/instagram";

export const runtime = "nodejs";

/*
  Step 2 of Business Login: Meta redirects here with ?code (or ?error).
  We verify the CSRF state, trade the code for a ~60-day token, and store it.
  The token is written with the admin client because social_accounts is locked
  to server-only access (RLS on, no policies) — it must never reach the browser.
*/
export async function GET(request: NextRequest) {
  const { origin, searchParams } = new URL(request.url);
  const done = (params: string) =>
    NextResponse.redirect(`${origin}/content?${params}`);
  const fail = (msg: string) =>
    done(`ig=error&reason=${encodeURIComponent(msg)}`);

  // The artist declined, or Meta returned an error.
  const oauthError = searchParams.get("error_description") ?? searchParams.get("error");
  if (oauthError) return fail(oauthError);

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const expected = request.cookies.get("ig_oauth_state")?.value;
  if (!code) return fail("Instagram didn't return an authorization code.");
  if (!state || !expected || state !== expected)
    return fail("That connection request expired. Please try again.");

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const uid = claims?.claims?.sub;
  if (!uid) return NextResponse.redirect(`${origin}/login`);

  const { data: own } = await supabase
    .from("artists")
    .select("id")
    .eq("user_id", uid)
    .maybeSingle();
  if (!own) return fail("Only the artist can connect Instagram.");

  const redirect = redirectUri(request.url);
  const short = await exchangeCode(code, redirect);
  if (!short) return fail("Couldn't complete the Instagram connection.");

  const long = await toLongLivedToken(short.accessToken);
  if (!long) return fail("Couldn't finalize the Instagram connection.");

  const profile = await fetchProfile(long.accessToken);

  const admin = createAdminClient();
  const { error } = await admin.from("social_accounts").upsert(
    {
      artist_id: own.id,
      platform: "instagram",
      external_user_id: profile?.userId || short.userId,
      username: profile?.username ?? null,
      access_token: long.accessToken,
      token_expires_at: long.expiresAt,
      scopes: short.permissions ?? null,
      connected_at: new Date().toISOString(),
    },
    { onConflict: "artist_id,platform" },
  );
  if (error) {
    console.error("instagram connect save error", error);
    return fail("Connected, but we couldn't save it. Please try again.");
  }

  const res = done(
    `ig=connected${profile?.username ? `&as=${encodeURIComponent(profile.username)}` : ""}`,
  );
  res.cookies.delete("ig_oauth_state");
  return res;
}
