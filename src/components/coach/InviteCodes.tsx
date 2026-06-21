"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash, Copy } from "@phosphor-icons/react";
import {
  generateInviteCode,
  deleteInviteCode,
} from "@/app/coach/actions";

type Tier = "free" | "self_serve" | "diy" | "dwy";
type Code = {
  id: string;
  code: string;
  tier: string;
  billing_bypass: boolean;
  used_by: string | null;
  used_at: string | null;
  expires_at: string;
};

const TIERS: { value: Tier; label: string }[] = [
  { value: "diy", label: "DIY" },
  { value: "dwy", label: "DWY" },
  { value: "self_serve", label: "Self-serve" },
  { value: "free", label: "Free" },
];

export function InviteCodes({ codes }: { codes: Code[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tier, setTier] = useState<Tier>("dwy");
  const [bypass, setBypass] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  function generate() {
    startTransition(async () => {
      await generateInviteCode(tier, bypass);
      router.refresh();
    });
  }

  function status(c: Code): string {
    if (c.used_by) return "Used";
    if (new Date(c.expires_at) < new Date()) return "Expired";
    return `Active · expires ${new Date(c.expires_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  }

  return (
    <div className="rounded-2xl bg-surface-secondary p-5 ring-1 ring-ink/5">
      <p className="font-serif text-xl text-ink">Invite codes</p>
      <p className="mt-1 text-sm text-ink-soft">
        Generate a single-use code to onboard an artist straight to you.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select
          value={tier}
          onChange={(e) => setTier(e.target.value as Tier)}
          className="rounded-lg border border-line bg-surface-primary px-3 py-2 text-sm text-ink outline-none focus:border-ink"
        >
          {TIERS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-sm text-ink">
          <input
            type="checkbox"
            checked={bypass}
            onChange={() => setBypass((b) => !b)}
          />
          Comp (skip billing)
        </label>
        <button
          onClick={generate}
          disabled={pending}
          className="rounded-lg bg-ink px-4 py-2 text-sm text-surface-primary disabled:opacity-50"
        >
          Generate
        </button>
      </div>

      {codes.length > 0 && (
        <div className="mt-4 space-y-2">
          {codes.map((c) => {
            const inactive = !!c.used_by || new Date(c.expires_at) < new Date();
            return (
              <div
                key={c.id}
                className="flex items-center justify-between gap-2 rounded-lg bg-surface-primary px-3 py-2"
              >
                <div className={inactive ? "opacity-50" : ""}>
                  <span className="font-mono text-sm tracking-wider text-ink">
                    {c.code}
                  </span>
                  <span className="ml-2 text-[11px] uppercase tracking-wide text-ink-soft">
                    {(TIERS.find((t) => t.value === c.tier)?.label ?? c.tier)}
                    {c.billing_bypass ? " · comp" : ""}
                  </span>
                  <span className="block text-[11px] text-ink-soft">
                    {status(c)}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {!inactive && (
                    <button
                      onClick={() => {
                        navigator.clipboard?.writeText(c.code);
                        setCopied(c.id);
                        setTimeout(() => setCopied(null), 1500);
                      }}
                      aria-label="Copy code"
                      className="grid h-8 w-8 place-items-center rounded-full text-ink-soft transition-colors hover:bg-surface-accent hover:text-ink"
                    >
                      <Copy size={15} />
                    </button>
                  )}
                  <button
                    onClick={() =>
                      startTransition(async () => {
                        await deleteInviteCode(c.id);
                        router.refresh();
                      })
                    }
                    aria-label="Delete code"
                    className="grid h-8 w-8 place-items-center rounded-full text-ink-soft/60 transition-colors hover:text-red-700"
                  >
                    <Trash size={15} />
                  </button>
                  {copied === c.id && (
                    <span className="text-[11px] text-ink-soft">Copied</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
