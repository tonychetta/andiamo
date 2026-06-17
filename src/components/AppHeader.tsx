import Link from "next/link";
import { Logo } from "./Logo";

/*
  Slim, sticky top header for the artist's five pages.
  Logo left, persistent circular profile chip top-right (Section 6.7) linking to
  the profile/settings screen.
*/
export function AppHeader({ initial }: { initial: string }) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-surface-primary/90 px-5 py-3.5 backdrop-blur">
      <div className="flex items-center gap-2.5">
        <Logo variant="icon" width={32} height={32} />
        <span className="font-serif text-xl text-ink">Andiamo</span>
      </div>
      <Link
        href="/profile"
        aria-label="Profile and settings"
        className="grid h-10 w-10 place-items-center rounded-full bg-surface-accent font-serif text-base text-ink transition-opacity hover:opacity-80"
      >
        {initial}
      </Link>
    </header>
  );
}
