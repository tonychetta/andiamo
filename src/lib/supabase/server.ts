import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";

/*
  Server-side Supabase client — used in Server Components, Server Actions, and
  Route Handlers. A new client is created per request because it needs that
  request's cookies. In Next.js 16, cookies() is async and must be awaited.
*/
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component, which can't write cookies.
            // Safe to ignore — the proxy refreshes sessions on every request.
          }
        },
      },
    },
  );
}
