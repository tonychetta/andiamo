import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";

/*
  Refreshes the user's auth session on every request and gates protected routes.
  Runs from src/proxy.ts (Next.js 16 renamed "middleware" to "proxy").

  Critical: do not insert code between createServerClient and getClaims(), and
  always return supabaseResponse unmodified — otherwise sessions can desync and
  users get logged out at random.
*/
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, {
              ...options,
              // Persist across app closes if no long expiry was provided.
              maxAge: options?.maxAge ?? 60 * 60 * 24 * 400,
            }),
          );
          // These no-cache headers stop a CDN from leaking one user's session
          // cookie to another user.
          Object.entries(headers).forEach(([key, value]) =>
            supabaseResponse.headers.set(key, value),
          );
        },
      },
    },
  );

  // IMPORTANT: keep this call here; it refreshes the token.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  const path = request.nextUrl.pathname;
  const isPublic = path.startsWith("/login") || path.startsWith("/auth");
  // API routes enforce their own auth (session cookie or a shared secret, e.g.
  // the MGMT webhook) and must return JSON — never redirect them to the HTML
  // login page. The session is still refreshed above for browser-called APIs.
  const isApi = path.startsWith("/api");

  if (!user && !isPublic && !isApi) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
