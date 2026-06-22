import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, SignOut } from "@phosphor-icons/react/dist/ssr";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions";
import { EnableNotifications } from "@/components/EnableNotifications";
import { ProfilePicture } from "@/components/ProfilePicture";

export default async function ProfilePage() {
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, email, account_type, profile_picture_url")
    .eq("id", userId)
    .single();

  const name = profile?.name?.trim() || "—";
  const role = profile?.account_type ?? "artist";
  const initial = (profile?.name?.trim()?.[0] || "A").toUpperCase();

  return (
    <div className="mx-auto min-h-dvh w-full max-w-md px-5 py-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-ink-soft transition-colors hover:text-ink"
      >
        <ArrowLeft size={18} />
        Back
      </Link>

      <h1 className="mt-6 font-serif text-4xl text-ink">Profile</h1>

      <div className="mt-8">
        <ProfilePicture
          currentUrl={profile?.profile_picture_url ?? null}
          initial={initial}
        />
      </div>

      <dl className="mt-8 divide-y divide-line rounded-2xl bg-surface-secondary px-5">
        <Row label="Name" value={name} />
        <Row label="Email" value={profile?.email ?? "—"} />
        <Row label="Account" value={role} valueClass="capitalize" />
      </dl>

      {role === "artist" && (
        <div className="mt-8">
          <p className="mb-2 text-xs uppercase tracking-[0.18em] text-ink-soft">
            Notifications
          </p>
          <EnableNotifications />
          <p className="mt-2 text-xs leading-relaxed text-ink-soft">
            Get a push when your producer starts work on a song. On iPhone, add
            Andiamo to your Home Screen first.
          </p>
        </div>
      )}

      <form action={signOut} className="mt-8">
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-line py-3 text-ink transition-colors hover:bg-surface-secondary"
        >
          <SignOut size={18} />
          Log out
        </button>
      </form>
    </div>
  );
}

function Row({
  label,
  value,
  valueClass = "",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between py-4">
      <dt className="text-sm text-ink-soft">{label}</dt>
      <dd className={`text-ink ${valueClass}`}>{value}</dd>
    </div>
  );
}
