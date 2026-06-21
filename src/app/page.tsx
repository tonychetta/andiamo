import { redirect } from "next/navigation";
import { SignOut } from "@phosphor-icons/react/dist/ssr";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/Logo";
import { ArtistCard } from "@/components/coach/ArtistCard";
import { AssignArtist } from "@/components/coach/AssignArtist";
import { signOut } from "./actions";

export default async function Home() {
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, account_type")
    .eq("id", userId)
    .single();

  // Artists live in the bottom-nav app shell; only coaches see this portal.
  if (profile?.account_type !== "coach") redirect("/vision");

  // Roster: RLS returns only the artists assigned to this coach.
  const { data: roster } = await supabase
    .from("artists")
    .select("id, artist_name, tier, status")
    .order("artist_name", { ascending: true });

  const name = profile?.name?.trim() || "there";
  const initial = (profile?.name?.trim()?.[0] || "A").toUpperCase();

  return (
    <div className="min-h-dvh">
      <header className="flex items-center justify-between px-6 py-5 md:px-10">
        <div className="flex items-center gap-3">
          <Logo variant="icon" width={40} height={40} />
          <span className="font-serif text-2xl text-ink">Andiamo</span>
        </div>
        <div className="flex items-center gap-3">
          <form action={signOut}>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-ink-soft transition-colors hover:text-ink"
            >
              <SignOut size={18} />
              Log out
            </button>
          </form>
          <div
            aria-label="Profile"
            className="grid h-11 w-11 place-items-center rounded-full bg-surface-accent font-serif text-lg text-ink"
          >
            {initial}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-24 md:px-10">
        <section className="pt-10 md:pt-16">
          <p className="text-sm uppercase tracking-[0.2em] text-ink-soft">
            Coach Portal
          </p>
          <h1 className="mt-4 font-serif text-4xl leading-tight text-ink md:text-5xl">
            Welcome, {name}.
          </h1>
        </section>

        <section className="mt-10">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-serif text-2xl text-ink">Your roster</h2>
            <AssignArtist />
          </div>

          {roster && roster.length > 0 ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {roster.map((a) => (
                <ArtistCard
                  key={a.id}
                  id={a.id}
                  name={a.artist_name || "Unnamed artist"}
                  tier={a.tier}
                  status={a.status}
                />
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-line p-8 text-center">
              <p className="text-ink">No artists yet.</p>
              <p className="mt-1 text-sm text-ink-soft">
                Use “Add an artist” to link one by their account email.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
