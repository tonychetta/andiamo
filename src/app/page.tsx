import Link from "next/link";
import { redirect } from "next/navigation";
import { SignOut } from "@phosphor-icons/react/dist/ssr";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/Logo";
import { ArtistCard } from "@/components/coach/ArtistCard";
import { InviteCodes } from "@/components/coach/InviteCodes";
import { signOut } from "./actions";

export default async function Home() {
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, account_type, profile_picture_url")
    .eq("id", userId)
    .single();

  // Artists live in the bottom-nav app shell; only coaches see this portal.
  if (profile?.account_type !== "coach") redirect("/vision");

  // Roster: RLS returns only the artists assigned to this coach.
  const { data: roster } = await supabase
    .from("artists")
    .select("id, artist_name, tier, status, profiles(profile_picture_url)")
    .order("artist_name", { ascending: true });

  const { data: codes } = await supabase
    .from("invite_codes")
    .select("id, code, tier, billing_bypass, used_by, used_at, expires_at")
    .order("created_at", { ascending: false });

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
          <Link
            href="/profile"
            aria-label="Profile and settings"
            className="grid h-11 w-11 place-items-center overflow-hidden rounded-full bg-surface-accent font-serif text-lg text-ink transition-opacity hover:opacity-80"
          >
            {profile?.profile_picture_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.profile_picture_url}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              initial
            )}
          </Link>
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
          <h2 className="font-serif text-2xl text-ink">Your roster</h2>

          {roster && roster.length > 0 ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {roster.map((a) => (
                <ArtistCard
                  key={a.id}
                  id={a.id}
                  name={a.artist_name || "Unnamed artist"}
                  tier={a.tier}
                  status={a.status}
                  pictureUrl={
                    (a.profiles as { profile_picture_url: string | null } | null)
                      ?.profile_picture_url ?? null
                  }
                />
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-line p-8 text-center">
              <p className="text-ink">No artists yet.</p>
              <p className="mt-1 text-sm text-ink-soft">
                Generate an invite code below and have your artist enter it to
                link with you.
              </p>
            </div>
          )}
        </section>

        <section className="mt-10">
          <InviteCodes codes={codes ?? []} />
        </section>
      </main>
    </div>
  );
}
