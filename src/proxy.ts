import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// Next.js 16 "Proxy" (formerly Middleware). Runs before each request to keep
// the Supabase session fresh and redirect signed-out users to /login.
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Run on everything except static assets and image files, so the session
     * stays fresh on real page navigations without wasting work on assets.
     */
    "/((?!_next/static|_next/image|favicon.ico|logo.svg|logo-icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
