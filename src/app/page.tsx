import { redirect } from "next/navigation";
import { SignOut } from "@phosphor-icons/react/dist/ssr";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/Logo";
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
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-soft">
            Your roster and the artists awaiting a match will live here. We build
            the Coach Portal next.
          </p>
        </section>

        <section className="mt-12 rounded-2xl border border-dashed border-line p-8 text-center">
          <p className="font-serif text-xl text-ink">Your roster</p>
          <p className="mt-2 text-sm text-ink-soft">
            Artist cards, the new-artist matching feed, and invite codes arrive
            with the Coach Portal build.
          </p>
        </section>
      </main>
    </div>
  );
}
