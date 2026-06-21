import Link from "next/link";
import { redirect } from "next/navigation";
import { CaretLeft } from "@phosphor-icons/react/dist/ssr";
import { createClient } from "@/lib/supabase/server";
import { BottomNav } from "@/components/BottomNav";
import { clearActiveArtist } from "@/app/coach/actions";

/*
  Shared shell for the artist's five pages. A coach reaches these pages by
  "entering" an assigned artist from the Coach Portal — they get a breadcrumb to
  exit. A coach with no active artist is sent back to the portal.
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

  let coachViewing: string | null = null;
  if (profile?.account_type === "coach") {
    const { data: caa } = await supabase
      .from("coach_active_artist")
      .select("artist_id")
      .eq("coach_user_id", userId)
      .maybeSingle();
    if (!caa) redirect("/");
    const { data: a } = await supabase
      .from("artists")
      .select("artist_name")
      .eq("id", caa.artist_id)
      .maybeSingle();
    coachViewing = a?.artist_name || "Artist";
  }

  const initial = (profile?.name?.trim()?.[0] || "A").toUpperCase();

  return (
    <div className="min-h-dvh">
      {/* Persistent floating profile chip (Section 6.7) */}
      <Link
        href="/profile"
        aria-label="Profile and settings"
        className="fixed right-4 top-4 z-50 grid h-11 w-11 place-items-center rounded-full bg-surface-accent font-serif text-base text-ink transition-opacity hover:opacity-80"
        style={{
          WebkitMaskImage:
            "radial-gradient(circle, #000 66%, rgba(0,0,0,0) 100%)",
          maskImage: "radial-gradient(circle, #000 66%, rgba(0,0,0,0) 100%)",
        }}
      >
        {initial}
      </Link>

      <main className="mx-auto w-full max-w-md px-5 pb-28 pt-16">
        {coachViewing && (
          <form action={clearActiveArtist} className="mb-4">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-xs font-medium text-surface-primary transition-opacity hover:opacity-90"
            >
              <CaretLeft size={14} /> Coach Portal · {coachViewing}
            </button>
          </form>
        )}
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
