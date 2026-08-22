"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  X,
  InstagramLogo,
  TiktokLogo,
  FacebookLogo,
  YoutubeLogo,
  CheckCircle,
  ArrowsClockwise,
} from "@phosphor-icons/react";
import { disconnectSocialAccount } from "@/app/(app)/content/actions";

export type Connection = { platform: string; username: string | null };

// Platform tiles. Only Instagram is wired up for now; the rest come later and
// are shown so the artist can see what's coming.
const PLATFORMS = [
  {
    id: "instagram",
    label: "Instagram",
    Icon: InstagramLogo,
    color: "#E1306C",
    live: true,
  },
  { id: "tiktok", label: "TikTok", Icon: TiktokLogo, color: "#111111", live: false },
  {
    id: "facebook",
    label: "Facebook",
    Icon: FacebookLogo,
    color: "#1877F2",
    live: false,
  },
  {
    id: "youtube",
    label: "YouTube",
    Icon: YoutubeLogo,
    color: "#FF0000",
    live: false,
  },
] as const;

export function SyncPanel({ connections }: { connections: Connection[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null,
  );
  const [pending, startTransition] = useTransition();

  const byPlatform = new Map(connections.map((c) => [c.platform, c]));

  // Surface the result of the OAuth round-trip (?ig=connected | ?ig=error).
  useEffect(() => {
    const ig = params.get("ig");
    if (!ig) return;
    if (ig === "connected") {
      const as = params.get("as");
      setNotice({
        kind: "ok",
        text: as ? `Instagram connected as @${as}.` : "Instagram connected.",
      });
      setOpen(true);
    } else if (ig === "error") {
      setNotice({
        kind: "err",
        text: params.get("reason") || "Couldn't connect Instagram.",
      });
      setOpen(true);
    }
    // Clear the query so the notice doesn't reappear on refresh.
    router.replace("/content");
  }, [params, router]);

  function disconnect(platform: string) {
    startTransition(async () => {
      await disconnectSocialAccount(platform);
      setNotice(null);
      router.refresh();
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-accent-cyan px-3 py-1.5 text-xs font-semibold text-ink transition-opacity hover:opacity-90"
      >
        <ArrowsClockwise size={14} weight="bold" />
        Sync
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fade-in fixed inset-0 z-[80] flex items-end justify-center bg-ink/40 sm:items-center"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-t-3xl bg-surface-primary p-6 shadow-2xl sm:rounded-3xl"
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-serif text-2xl text-ink">Sync content</h2>
                <p className="mt-1 text-sm text-ink-soft">
                  Connect a platform, then pull in posts and their metrics.
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="text-ink-soft transition-colors hover:text-ink"
              >
                <X size={22} />
              </button>
            </div>

            {notice && (
              <p
                className={`mt-4 rounded-xl px-3 py-2 text-sm ${
                  notice.kind === "ok"
                    ? "bg-accent-cyan/20 text-ink"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {notice.text}
              </p>
            )}

            <div className="mt-5 space-y-2">
              {PLATFORMS.map(({ id, label, Icon, color, live }) => {
                const conn = byPlatform.get(id);
                return (
                  <div
                    key={id}
                    className="flex items-center gap-3 rounded-2xl bg-surface-secondary px-4 py-3"
                  >
                    <Icon size={26} weight="fill" style={{ color }} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink">{label}</p>
                      {conn ? (
                        <p className="truncate text-xs text-ink-soft">
                          {conn.username ? `@${conn.username}` : "Connected"}
                        </p>
                      ) : (
                        <p className="text-xs text-ink-soft">
                          {live ? "Not connected" : "Coming soon"}
                        </p>
                      )}
                    </div>

                    {!live ? (
                      <span className="shrink-0 text-xs text-ink-soft/60">Soon</span>
                    ) : conn ? (
                      <div className="flex shrink-0 items-center gap-2">
                        <CheckCircle
                          size={20}
                          weight="fill"
                          className="text-accent-cyan"
                        />
                        <button
                          onClick={() => disconnect(id)}
                          disabled={pending}
                          className="text-xs text-ink-soft underline underline-offset-2 transition-colors hover:text-red-700 disabled:opacity-50"
                        >
                          Disconnect
                        </button>
                      </div>
                    ) : (
                      <a
                        href="/api/instagram/connect"
                        className="shrink-0 rounded-lg bg-ink px-3 py-1.5 text-xs font-medium text-surface-primary"
                      >
                        Connect
                      </a>
                    )}
                  </div>
                );
              })}
            </div>

            <p className="mt-4 text-xs leading-relaxed text-ink-soft">
              Your Instagram must be a Professional (Business or Creator)
              account — it&apos;s a free switch in Instagram&apos;s settings. We only
              read your posts and their insights.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
