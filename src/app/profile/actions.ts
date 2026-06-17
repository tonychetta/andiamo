"use server";

import { createClient } from "@/lib/supabase/server";

// Store (or refresh) the current artist's push subscription for this device.
export async function savePushSubscription(sub: {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
}) {
  const supabase = await createClient();
  const { data: aid } = await supabase.rpc("current_artist_id");
  if (!aid) return { ok: false };
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      artist_id: aid as string,
      endpoint: sub.endpoint,
      p256dh: sub.p256dh,
      auth: sub.auth,
      user_agent: sub.userAgent ?? null,
    },
    { onConflict: "endpoint" },
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deletePushSubscription(endpoint: string) {
  const supabase = await createClient();
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  return { ok: true };
}
