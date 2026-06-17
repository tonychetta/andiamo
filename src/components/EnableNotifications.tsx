"use client";

import { useEffect, useState } from "react";
import { BellSimple, BellSlash } from "@phosphor-icons/react";
import {
  savePushSubscription,
  deletePushSubscription,
} from "@/app/profile/actions";

// VAPID public key (base64url) → Uint8Array, as the Push API expects.
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

type Status = "loading" | "on" | "off" | "denied" | "busy" | "unsupported";

export function EnableNotifications() {
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window)
    ) {
      setStatus("unsupported");
      return;
    }
    (async () => {
      if (Notification.permission === "denied") return setStatus("denied");
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      setStatus(sub ? "on" : "off");
    })();
  }, []);

  async function enable() {
    setStatus("busy");
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setStatus(perm === "denied" ? "denied" : "off");
        return;
      }
      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!key) {
        setStatus("off");
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });
      const json = sub.toJSON();
      await savePushSubscription({
        endpoint: sub.endpoint,
        p256dh: json.keys?.p256dh ?? "",
        auth: json.keys?.auth ?? "",
        userAgent: navigator.userAgent,
      });
      setStatus("on");
    } catch {
      setStatus("off");
    }
  }

  async function disable() {
    setStatus("busy");
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (sub) {
        await deletePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
    } finally {
      setStatus("off");
    }
  }

  if (status === "unsupported") {
    return (
      <p className="text-sm leading-relaxed text-ink-soft">
        Notifications aren&apos;t available in this browser. On iPhone, add
        Andiamo to your Home Screen first, then open it from there.
      </p>
    );
  }
  if (status === "denied") {
    return (
      <p className="text-sm leading-relaxed text-ink-soft">
        Notifications are blocked. Turn them on for Andiamo in your device
        settings, then reload.
      </p>
    );
  }

  const on = status === "on";
  return (
    <button
      onClick={on ? disable : enable}
      disabled={status === "busy" || status === "loading"}
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-line py-3 text-ink transition-colors hover:bg-surface-secondary disabled:opacity-60"
    >
      {on ? <BellSlash size={18} /> : <BellSimple size={18} />}
      {status === "busy"
        ? "Working…"
        : status === "loading"
          ? "Checking…"
          : on
            ? "Turn off notifications"
            : "Turn on notifications"}
    </button>
  );
}
