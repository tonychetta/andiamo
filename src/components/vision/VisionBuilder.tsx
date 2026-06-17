"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, Sparkle, Eye } from "@phosphor-icons/react";
import { OPENING_MESSAGE, VISION_LOADING_MESSAGE } from "@/lib/vision/prompts";

type Turn = { role: "user" | "assistant"; content: string };
type GenState = "idle" | "loading" | "done";

export function VisionBuilder({
  initialMessages,
  isRefine = false,
  onViewVision,
}: {
  initialMessages?: Turn[];
  isRefine?: boolean;
  onViewVision?: () => void;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<Turn[]>(
    initialMessages && initialMessages.length > 0
      ? initialMessages
      : [{ role: "assistant", content: OPENING_MESSAGE }],
  );
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [ready, setReady] = useState(false);
  const [gen, setGen] = useState<GenState>("idle");
  const [error, setError] = useState<string | null>(null);

  const endRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, thinking]);

  // Grow the text box as the artist types, and keep the last message visible
  // (so the composer never hides what they're responding to).
  useEffect(() => {
    const el = taRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
    }
    endRef.current?.scrollIntoView({ block: "end" });
  }, [input]);

  async function requestReply(history: Turn[]) {
    setThinking(true);
    setError(null);
    try {
      const res = await fetch("/api/vision/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessages((m) => [...m, { role: "assistant", content: data.message }]);
      if (data.ready) setReady(true);
    } catch (e) {
      // The artist's message stays in the conversation; Retry re-sends it.
      setError(
        e instanceof Error ? e.message : "That didn't go through. Tap retry.",
      );
    } finally {
      setThinking(false);
    }
  }

  function send() {
    const text = input.trim();
    if (!text || thinking) return;
    const next: Turn[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    requestReply(next);
  }

  function retry() {
    if (thinking) return;
    requestReply(messages);
  }

  async function createVision() {
    setGen("loading");
    setError(null);
    try {
      const res = await fetch("/api/vision/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setGen("done");
    } catch (e) {
      setGen("idle");
      setError(
        e instanceof Error ? e.message : "We couldn't build your Vision.",
      );
    }
  }

  // Generation moment (Section 9.6) — warm reveal, loading message verbatim.
  if (gen !== "idle") {
    return (
      <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-surface-accent px-8 text-center">
        <div className="max-w-md fade-in-slow">
          <p className="whitespace-pre-line font-serif text-lg leading-relaxed text-ink">
            {VISION_LOADING_MESSAGE}
          </p>
          {gen === "loading" ? (
            <p className="mt-8 text-sm uppercase tracking-[0.2em] text-ink-soft">
              Building your Vision…
            </p>
          ) : (
            <button
              onClick={() => {
                onViewVision?.();
                router.refresh();
              }}
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-ink px-6 py-3 font-medium text-surface-primary transition-opacity hover:opacity-90"
            >
              View Your Vision
            </button>
          )}
        </div>
      </div>
    );
  }

  const showCreate = ready || isRefine;

  // The conversation — a quiet, full-screen night space.
  return (
    <div className="fixed inset-0 z-20 flex flex-col bg-surface-night">
      {/* Toggle back to the Vision (only when one already exists) */}
      {onViewVision && (
        <button
          onClick={onViewVision}
          className="fixed left-4 top-4 z-50 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 text-sm text-surface-primary transition-colors hover:bg-white/20"
        >
          <Eye size={16} />
          Your Vision
        </button>
      )}

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col overflow-y-auto px-5 pt-20 pb-4">
        <div className="flex flex-1 flex-col justify-end gap-5">
          {messages.map((m, i) => (
            <div
              key={i}
              className={m.role === "assistant" ? "" : "flex justify-end"}
            >
              {m.role === "assistant" ? (
                <p
                  className={`max-w-[92%] whitespace-pre-wrap text-[15px] leading-relaxed text-surface-primary/90 ${
                    i === 0 ? "fade-in-slow" : "fade-in-up"
                  }`}
                >
                  {m.content}
                </p>
              ) : (
                <div className="fade-in-up max-w-[85%] whitespace-pre-wrap rounded-2xl bg-white/10 px-4 py-3 text-[15px] leading-relaxed text-surface-primary">
                  {m.content}
                </div>
              )}
            </div>
          ))}
          {thinking && (
            <span className="inline-flex gap-1.5">
              <Dot /> <Dot /> <Dot />
            </span>
          )}
          <div ref={endRef} />
        </div>
      </div>

      {/* Composer */}
      <div className="mx-auto w-full max-w-md px-5 pb-24 pt-2">
        {error && (
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm text-red-400">{error}</p>
            {messages[messages.length - 1]?.role === "user" && (
              <button
                onClick={retry}
                className="shrink-0 rounded-lg border border-white/20 px-3 py-1.5 text-sm text-surface-primary transition-colors hover:bg-white/10"
              >
                Retry
              </button>
            )}
          </div>
        )}

        {showCreate && (
          <button
            onClick={createVision}
            className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl bg-accent-cyan py-3.5 font-medium text-ink transition-opacity hover:opacity-90"
          >
            <Sparkle size={18} weight="fill" />
            {isRefine ? "Update my Vision" : "Create my Vision"}
          </button>
        )}

        <div className="flex items-end gap-2">
          <textarea
            ref={taRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            placeholder="Type your answer…"
            className="max-h-[200px] min-h-[48px] flex-1 resize-none rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-surface-primary outline-none transition-colors placeholder:text-surface-primary/40 focus:border-white/40"
          />
          <button
            onClick={send}
            disabled={!input.trim() || thinking}
            aria-label="Send"
            className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/10 text-surface-primary transition-colors hover:bg-white/20 disabled:opacity-40"
          >
            <ArrowUp size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

function Dot() {
  return (
    <span className="inline-block h-1.5 w-1.5 rounded-full bg-surface-primary/50" />
  );
}
