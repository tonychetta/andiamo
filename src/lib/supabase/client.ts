import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

/*
  Browser-side Supabase client — used in Client Components ("use client").
  createBrowserClient is a singleton under the hood, so calling this repeatedly
  is cheap and safe.
*/
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
