"use client";

import { useCallback, useEffect, useState } from "react";
import { X, CheckCircle, InstagramLogo, ArrowClockwise } from "@phosphor-icons/react";

type Media = {
  id: string;
  caption: string;
  mediaType: string;
  thumbnailUrl: string;
  permalink: string;
  timestamp: string;
  imported: boolean;
};

/*
  The artist's Instagram grid. Tapping a cover pulls that post into Andiamo with
  its metrics. Covers already pulled in are checked and dimmed.

  pieceId set  -> attach to that existing content piece ("+ Add Instagram")
  pieceId null -> create a new piece dated to when the post went out
*/
export function InstagramGrid({
  pieceId,
  onClose,
  onImported,
}: {
  pieceId?: string;
  onClose: () => void;
  onImported: (pieceId: string, date: string) => void;
}) {
  const [media, setMedia] = useState<Media[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (after?: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/instagram/media${after ? `?after=${encodeURIComponent(after)}` : ""}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsername(data.username);
      setMedia((prev) => (after ? [...prev, ...data.media] : data.media));
      setCursor(data.nextCursor);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load your posts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function pick(m: Media) {
    if (busyId) return;
    setBusyId(m.id);
    setError(null);
    try {
      const res = await fetch("/api/instagram/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaId: m.id, pieceId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMedia((prev) =>
        prev.map((x) => (x.id === m.id ? { ...x, imported: true } : x)),
      );
      onImported(data.pieceId, data.date);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't import that post.");
      setBusyId(null);
    }
  }

  return (
    <div
      onClick={onClose}
      className="fade-in fixed inset-0 z-[85] flex items-end justify-center bg-ink/50 sm:items-center"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[88vh] w-full max-w-md flex-col rounded-t-3xl bg-surface-primary shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-start justify-between px-6 pt-6">
          <div>
            <h2 className="flex items-center gap-2 font-serif text-2xl text-ink">
              <InstagramLogo size={22} weight="fill" style={{ color: "#E1306C" }} />
              Your posts
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              {username ? `@${username} · ` : ""}
              {pieceId
                ? "Pick the post to attach to this content."
                : "Tap a post to pull it in with its metrics."}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 text-ink-soft transition-colors hover:text-ink"
          >
            <X size={22} />
          </button>
        </div>

        {error && (
          <p className="mx-6 mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="mt-4 flex-1 overflow-y-auto px-6 pb-6">
          {media.length === 0 && loading && (
            <p className="py-10 text-center text-sm text-ink-soft">
              Loading your posts…
            </p>
          )}
          {media.length === 0 && !loading && !error && (
            <p className="py-10 text-center text-sm text-ink-soft">
              No posts found. Instagram only returns posts from a Professional
              (Business or Creator) account.
            </p>
          )}

          <div className="grid grid-cols-3 gap-1.5">
            {media.map((m) => (
              <button
                key={m.id}
                onClick={() => pick(m)}
                disabled={!!busyId}
                title={m.caption?.slice(0, 120) || "Instagram post"}
                className="group relative aspect-square overflow-hidden rounded-lg bg-surface-secondary disabled:opacity-60"
              >
                {m.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.thumbnailUrl}
                    alt={m.caption?.slice(0, 60) || "Instagram post"}
                    className={`h-full w-full object-cover transition-transform group-hover:scale-105 ${
                      m.imported ? "opacity-40" : ""
                    }`}
                  />
                ) : (
                  <span className="grid h-full w-full place-items-center text-[10px] text-ink-soft">
                    {m.mediaType}
                  </span>
                )}

                {m.imported && (
                  <span className="absolute inset-0 grid place-items-center">
                    <CheckCircle
                      size={26}
                      weight="fill"
                      className="text-accent-cyan drop-shadow"
                    />
                  </span>
                )}
                {busyId === m.id && (
                  <span className="absolute inset-0 grid place-items-center bg-surface-primary/70">
                    <ArrowClockwise size={20} className="animate-spin text-ink" />
                  </span>
                )}
              </button>
            ))}
          </div>

          {cursor && (
            <button
              onClick={() => load(cursor)}
              disabled={loading}
              className="mt-4 w-full rounded-xl border border-line py-2.5 text-sm text-ink-soft transition-colors hover:text-ink disabled:opacity-50"
            >
              {loading ? "Loading…" : "Load older posts"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
