import { createAdminClient } from "@/lib/supabase/admin";

/*
  SERVER-ONLY. social_accounts is locked down (RLS on, no policies), so every
  read goes through the admin client. Callers must already have resolved the
  artist id from the session — never take it from the request body.
*/
export type SocialAccount = {
  id: string;
  accessToken: string;
  username: string | null;
  externalUserId: string;
};

export async function getSocialAccount(
  artistId: string,
  platform: string,
): Promise<SocialAccount | null> {
  const { data } = await createAdminClient()
    .from("social_accounts")
    .select("id, access_token, username, external_user_id")
    .eq("artist_id", artistId)
    .eq("platform", platform)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    accessToken: data.access_token,
    username: data.username,
    externalUserId: data.external_user_id,
  };
}
