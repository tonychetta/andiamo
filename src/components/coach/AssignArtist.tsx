"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "@phosphor-icons/react";
import { assignArtistByEmail } from "@/app/coach/actions";

export function AssignArtist() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  function submit() {
    setMsg(null);
    startTransition(async () => {
      const r = await assignArtistByEmail(email);
      if (r.ok) {
        setEmail("");
        setOpen(false);
        router.refresh();
      } else {
        setMsg(r.error ?? "Couldn't add that artist.");
      }
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-xl border border-line px-4 py-2 text-sm text-ink transition-colors hover:bg-surface-secondary"
      >
        <Plus size={16} /> Add an artist
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-surface-secondary p-4">
      <p className="text-sm text-ink">Link an artist by their account email.</p>
      <div className="mt-2 flex gap-2">
        <input
          autoFocus
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="artist@email.com"
          className="min-w-0 flex-1 rounded-lg border border-line bg-surface-primary px-3 py-2 text-sm text-ink outline-none focus:border-ink"
        />
        <button
          onClick={submit}
          disabled={pending}
          className="shrink-0 rounded-lg bg-ink px-4 py-2 text-sm text-surface-primary disabled:opacity-50"
        >
          Add
        </button>
        <button
          onClick={() => {
            setOpen(false);
            setMsg(null);
          }}
          className="shrink-0 rounded-lg px-2 py-2 text-sm text-ink-soft"
        >
          Cancel
        </button>
      </div>
      {msg && <p className="mt-2 text-sm text-red-700">{msg}</p>}
    </div>
  );
}
