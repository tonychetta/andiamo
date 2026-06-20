import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

/*
  Browser-side Supabase client — used in Client Components ("use client").
  createBrowserClient is a singleton under the hood, so calling this repeatedly
  is cheap and safe.
*/
// ~400 days — keep the artist signed in across app closes (the auth cookie was
// getting no long-lived expiry, so iOS treated it as temporary and cleared it).
const SESSION_MAX_AGE = 60 * 60 * 24 * 400;

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookieOptions: { maxAge: SESSION_MAX_AGE } },
  );
}
