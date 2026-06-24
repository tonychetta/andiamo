"use client";

import { useState, useTransition } from "react";
import { Trash } from "@phosphor-icons/react";
import { deleteAccount } from "@/app/profile/actions";

export function DeleteAccount() {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (confirming) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4">
        <p className="text-sm leading-relaxed text-red-800">
          Delete your account permanently? This erases your profile and all your
          data — Vision, Roadmap, Releases, Content, and Results. This cannot be
          undone.
        </p>
        <div className="mt-3 flex justify-end gap-2">
          <button
            onClick={() => setConfirming(false)}
            className="rounded-lg px-3 py-1.5 text-sm text-ink-soft"
          >
            Cancel
          </button>
          <button
            onClick={() => startTransition(() => deleteAccount())}
            disabled={pending}
            className="rounded-lg bg-red-700 px-3 py-1.5 text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Deleting…" : "Delete account"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="inline-flex items-center gap-1.5 text-sm text-red-700 transition-opacity hover:opacity-80"
    >
      <Trash size={15} /> Delete account
    </button>
  );
}
