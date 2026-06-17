import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BottomNav } from "@/components/BottomNav";

/*
  Shared shell for the artist's five pages. No top header — just a floating
  profile chip (top-right) and the persistent bottom nav, so the pages feel
  spacious. Phone-width content column, centered on larger screens (mobile-first).
  Coaches are redirected to their Coach Portal — these pages are the artist view.
*/
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, account_type")
    .eq("id", userId)
    .single();

  if (profile?.account_type === "coach") redirect("/");

  const initial = (profile?.name?.trim()?.[0] || "A").toUpperCase();

  return (
    <div className="min-h-dvh">
      {/* Persistent floating profile chip (Section 6.7) */}
      <Link
        href="/profile"
        aria-label="Profile and settings"
        className="fixed right-4 top-4 z-50 grid h-11 w-11 place-items-center rounded-full bg-surface-accent font-serif text-base text-ink transition-opacity hover:opacity-80"
        style={{
          // Soft-feather the edge so the chip melts into the page rather than
          // sitting as a hard circle (works on cream pages and the dark Builder).
          WebkitMaskImage:
            "radial-gradient(circle, #000 66%, rgba(0,0,0,0) 100%)",
          maskImage: "radial-gradient(circle, #000 66%, rgba(0,0,0,0) 100%)",
        }}
      >
        {initial}
      </Link>

      <main className="mx-auto w-full max-w-md px-5 pb-28 pt-16">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
