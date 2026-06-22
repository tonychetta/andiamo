"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Surfaces that show the avatar, refreshed after a change.
function revalidateAvatarSurfaces() {
  revalidatePath("/profile");
  revalidatePath("/"); // coach portal roster + chip
  revalidatePath("/vision");
  revalidatePath("/roadmap");
}

// Upload a profile picture and save its public URL. Server-side via the admin
// client so we don't need per-user storage policies; works for any account type.
export async function uploadProfilePicture(
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const uid = claims?.claims?.sub as string | undefined;
  if (!uid) return { ok: false, error: "Not signed in." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0)
    return { ok: false, error: "No image selected." };
  if (file.size > 5 * 1024 * 1024)
    return { ok: false, error: "Image too large (max 5MB)." };

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${uid}/${Date.now()}.${ext}`;
  const admin = createAdminClient();
  const { error: upErr } = await admin.storage
    .from("avatars")
    .upload(path, file, {
      contentType: file.type || "image/jpeg",
      upsert: true,
    });
  if (upErr) return { ok: false, error: upErr.message };

  const { data: pub } = admin.storage.from("avatars").getPublicUrl(path);
  const { error } = await supabase
    .from("profiles")
    .update({ profile_picture_url: pub.publicUrl })
    .eq("id", uid);
  if (error) return { ok: false, error: error.message };

  revalidateAvatarSurfaces();
  return { ok: true };
}

export async function removeProfilePicture() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const uid = claims?.claims?.sub as string | undefined;
  if (!uid) return;
  await supabase
    .from("profiles")
    .update({ profile_picture_url: null })
    .eq("id", uid);
  revalidateAvatarSurfaces();
}

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
