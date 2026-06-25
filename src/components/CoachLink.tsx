"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { redeemInviteCode } from "@/app/coach/actions";

export function CoachLink({ linked }: { linked: boolean }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function link() {
    if (!code.trim()) return;
    setBusy(true);
    setError(null);
    const r = await redeemInviteCode(code);
    setBusy(false);
    if (!r.ok) {
      setError(r.error ?? "Couldn't link.");
      return;
    }
    setCode("");
    router.refresh();
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && link()}
          placeholder="Invite code"
          className="flex-1 rounded-lg border border-line bg-surface-secondary px-3 py-2 text-sm uppercase text-ink outline-none focus:border-ink"
        />
        <button
          onClick={link}
          disabled={busy}
          className="rounded-lg bg-ink px-4 py-2 text-sm text-surface-primary disabled:opacity-50"
        >
          {busy ? "Linking…" : linked ? "Add" : "Link"}
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
    </div>
  );
}
