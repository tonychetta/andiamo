"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera } from "@phosphor-icons/react";
import {
  uploadProfilePicture,
  removeProfilePicture,
} from "@/app/profile/actions";

export function ProfilePicture({
  currentUrl,
  initial,
}: {
  currentUrl: string | null;
  initial: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.append("file", file);
    const r = await uploadProfilePicture(fd);
    setBusy(false);
    if (e.target) e.target.value = "";
    if (!r.ok) {
      setError(r.error ?? "Upload failed.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col items-center">
      <button
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="relative grid h-24 w-24 place-items-center overflow-hidden rounded-full bg-surface-accent disabled:opacity-60"
        aria-label="Change profile picture"
      >
        {currentUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="font-serif text-3xl text-ink">{initial}</span>
        )}
        <span className="absolute bottom-0 left-0 right-0 grid place-items-center bg-ink/55 py-1">
          <Camera size={16} className="text-surface-primary" />
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={onPick}
        className="hidden"
      />

      <button
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="mt-2 text-sm text-ink-soft transition-colors hover:text-ink disabled:opacity-60"
      >
        {busy ? "Uploading…" : currentUrl ? "Change photo" : "Add a photo"}
      </button>
      {currentUrl && !busy && (
        <button
          onClick={() => {
            setBusy(true);
            removeProfilePicture().then(() => {
              setBusy(false);
              router.refresh();
            });
          }}
          className="mt-1 text-xs text-red-700 transition-opacity hover:opacity-80"
        >
          Remove
        </button>
      )}
      {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
    </div>
  );
}
