"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CaretRight } from "@phosphor-icons/react";
import { setActiveArtist, setArtistStatus } from "@/app/coach/actions";

type Status = "awaiting_match" | "active" | "graduated" | "paused" | "departed";

const TIER_LABEL: Record<string, string> = {
  free: "Free",
  self_serve: "Self-serve",
  diy: "DIY",
  dwy: "DWY",
};
const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "graduated", label: "Graduated" },
  { value: "departed", label: "Departed" },
  { value: "awaiting_match", label: "Awaiting match" },
];

export function ArtistCard({
  id,
  name,
  tier,
  status,
}: {
  id: string;
  name: string;
  tier: string;
  status: Status;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="rounded-2xl bg-surface-secondary p-5 ring-1 ring-ink/5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-serif text-xl text-ink">{name}</p>
          <span className="mt-1 inline-block rounded-full bg-accent-gold/25 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-ink">
            {TIER_LABEL[tier] ?? tier}
          </span>
        </div>
        <form action={setActiveArtist.bind(null, id)}>
          <button
            type="submit"
            className="inline-flex items-center gap-1 rounded-xl bg-ink px-3 py-2 text-sm font-medium text-surface-primary transition-opacity hover:opacity-90"
          >
            Enter <CaretRight size={15} />
          </button>
        </form>
      </div>

      <label className="mt-4 block">
        <span className="text-[10px] uppercase tracking-wide text-ink-soft">
          Status
        </span>
        <select
          value={status}
          disabled={pending}
          onChange={(e) =>
            startTransition(async () => {
              await setArtistStatus(id, e.target.value as Status);
              router.refresh();
            })
          }
          className="mt-1 w-full rounded-lg border border-line bg-surface-primary px-3 py-2 text-sm text-ink outline-none focus:border-ink"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
