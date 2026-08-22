import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  authorizeUrl,
  instagramConfigured,
  redirectUri,
} from "@/lib/social/instagram";

export const runtime = "nodejs";

/*
  Step 1 of Business Login: send the artist to Instagram's consent screen.
  A random `state` is stored in an httpOnly cookie and echoed back by Meta, so
  the callback can prove the response belongs to a request WE started (CSRF).
*/
export async function GET(request: NextRequest) {
  const { origin } = new URL(request.url);

  if (!instagramConfigured()) {
    return NextResponse.redirect(
      `${origin}/content?ig=error&reason=${encodeURIComponent("Instagram isn't configured yet.")}`,
    );
  }

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const uid = claims?.claims?.sub;
  if (!uid) return NextResponse.redirect(`${origin}/login`);

  // Only the artist themselves may connect — a coach must never attach their
  // own Instagram to an artist's account.
  const { data: own } = await supabase
    .from("artists")
    .select("id")
    .eq("user_id", uid)
    .maybeSingle();
  if (!own) {
    return NextResponse.redirect(
      `${origin}/content?ig=error&reason=${encodeURIComponent("Only the artist can connect Instagram.")}`,
    );
  }

  const state = crypto.randomUUID();
  const res = NextResponse.redirect(
    authorizeUrl(redirectUri(request.url), state),
  );
  res.cookies.set("ig_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 minutes to finish the consent flow
  });
  return res;
}
