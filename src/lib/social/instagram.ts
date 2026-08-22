/*
  Instagram integration — "Instagram API with Instagram Login" (Business Login).
  SERVER-ONLY: reads INSTAGRAM_APP_SECRET. Never import into a Client Component.

  The artist's Instagram must be a Professional (Business or Creator) account.
  No linked Facebook Page is required on this login path.

  Flow: authorizeUrl() -> Meta redirects back with ?code -> exchangeCode() gives a
  short-lived token -> toLongLivedToken() gives a ~60-day token we store and
  refresh nightly with refreshLongLivedToken().
*/

const AUTHORIZE_URL = "https://www.instagram.com/oauth/authorize";
const TOKEN_URL = "https://api.instagram.com/oauth/access_token";
const GRAPH = "https://graph.instagram.com";

// instagram_business_basic  -> profile + media list (thumbnails, captions, permalinks)
// instagram_business_manage_insights -> per-post metrics (likes/comments/shares/saved/views)
export const INSTAGRAM_SCOPES = [
  "instagram_business_basic",
  "instagram_business_manage_insights",
].join(",");

export function instagramConfigured(): boolean {
  return !!(process.env.INSTAGRAM_APP_ID && process.env.INSTAGRAM_APP_SECRET);
}

// The redirect URI must match EXACTLY between the authorize call, the token
// exchange, and the value registered in the Meta app.
export function redirectUri(requestUrl: string): string {
  const origin = process.env.APP_URL || new URL(requestUrl).origin;
  return `${origin}/api/instagram/callback`;
}

export function authorizeUrl(redirect: string, state: string): string {
  const p = new URLSearchParams({
    client_id: process.env.INSTAGRAM_APP_ID ?? "",
    redirect_uri: redirect,
    response_type: "code",
    scope: INSTAGRAM_SCOPES,
    state,
  });
  return `${AUTHORIZE_URL}?${p.toString()}`;
}

export type ShortLivedToken = { accessToken: string; userId: string; permissions?: string };

// Trade the one-time ?code for a short-lived (1 hour) token.
export async function exchangeCode(
  code: string,
  redirect: string,
): Promise<ShortLivedToken | null> {
  const body = new URLSearchParams({
    client_id: process.env.INSTAGRAM_APP_ID ?? "",
    client_secret: process.env.INSTAGRAM_APP_SECRET ?? "",
    grant_type: "authorization_code",
    redirect_uri: redirect,
    code,
  });
  try {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    });
    const data = await res.json();
    if (!res.ok || !data?.access_token) {
      console.error("instagram exchangeCode failed", res.status, data);
      return null;
    }
    return {
      accessToken: data.access_token as string,
      userId: String(data.user_id ?? ""),
      permissions: data.permissions as string | undefined,
    };
  } catch (err) {
    console.error("instagram exchangeCode error", err);
    return null;
  }
}

export type LongLivedToken = { accessToken: string; expiresAt: string };

// Upgrade a short-lived token to a ~60-day one.
export async function toLongLivedToken(
  shortToken: string,
): Promise<LongLivedToken | null> {
  const p = new URLSearchParams({
    grant_type: "ig_exchange_token",
    client_secret: process.env.INSTAGRAM_APP_SECRET ?? "",
    access_token: shortToken,
  });
  return getToken(`${GRAPH}/access_token?${p.toString()}`, "toLongLivedToken");
}

// Refresh a long-lived token (valid to call after 24h; extends another ~60 days).
export async function refreshLongLivedToken(
  token: string,
): Promise<LongLivedToken | null> {
  const p = new URLSearchParams({
    grant_type: "ig_refresh_token",
    access_token: token,
  });
  return getToken(`${GRAPH}/refresh_access_token?${p.toString()}`, "refresh");
}

async function getToken(url: string, label: string): Promise<LongLivedToken | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok || !data?.access_token) {
      console.error(`instagram ${label} failed`, res.status, data);
      return null;
    }
    const seconds = Number(data.expires_in ?? 0);
    return {
      accessToken: data.access_token as string,
      expiresAt: new Date(Date.now() + seconds * 1000).toISOString(),
    };
  } catch (err) {
    console.error(`instagram ${label} error`, err);
    return null;
  }
}

export type IgProfile = { userId: string; username: string };

export async function fetchProfile(token: string): Promise<IgProfile | null> {
  try {
    const res = await fetch(
      `${GRAPH}/me?fields=user_id,username&access_token=${encodeURIComponent(token)}`,
      { cache: "no-store" },
    );
    const data = await res.json();
    if (!res.ok) {
      console.error("instagram fetchProfile failed", res.status, data);
      return null;
    }
    return {
      userId: String(data.user_id ?? data.id ?? ""),
      username: (data.username as string) ?? "",
    };
  } catch (err) {
    console.error("instagram fetchProfile error", err);
    return null;
  }
}

// ---------- Phase 2: media grid + per-post metrics ----------

export type IgMedia = {
  id: string;
  caption: string;
  mediaType: string; // IMAGE | VIDEO | CAROUSEL_ALBUM
  thumbnailUrl: string;
  permalink: string;
  timestamp: string;
};

// The artist's own recent posts, newest first — the grid they tap to import.
export async function fetchMedia(
  token: string,
  limit = 24,
  after?: string,
): Promise<{ media: IgMedia[]; nextCursor?: string } | null> {
  const p = new URLSearchParams({
    fields:
      "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp",
    limit: String(limit),
    access_token: token,
  });
  if (after) p.set("after", after);
  try {
    const res = await fetch(`${GRAPH}/me/media?${p.toString()}`, {
      cache: "no-store",
    });
    const data = await res.json();
    if (!res.ok) {
      console.error("instagram fetchMedia failed", res.status, data);
      return null;
    }
    type Row = {
      id: string;
      caption?: string;
      media_type?: string;
      media_url?: string;
      thumbnail_url?: string;
      permalink?: string;
      timestamp?: string;
    };
    const media: IgMedia[] = (data.data ?? []).map((m: Row) => ({
      id: m.id,
      caption: m.caption ?? "",
      mediaType: m.media_type ?? "",
      // Videos expose a still at thumbnail_url; images use media_url.
      thumbnailUrl: m.thumbnail_url || m.media_url || "",
      permalink: m.permalink ?? "",
      timestamp: m.timestamp ?? "",
    }));
    return { media, nextCursor: data.paging?.cursors?.after };
  } catch (err) {
    console.error("instagram fetchMedia error", err);
    return null;
  }
}

// A single post by id — re-fetched server-side rather than trusting whatever
// the browser sends us at import time.
export async function fetchMediaById(
  token: string,
  mediaId: string,
): Promise<IgMedia | null> {
  const p = new URLSearchParams({
    fields: "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp",
    access_token: token,
  });
  try {
    const res = await fetch(
      `${GRAPH}/${encodeURIComponent(mediaId)}?${p.toString()}`,
      { cache: "no-store" },
    );
    const m = await res.json();
    if (!res.ok) {
      console.error("instagram fetchMediaById failed", res.status, m);
      return null;
    }
    return {
      id: m.id,
      caption: m.caption ?? "",
      mediaType: m.media_type ?? "",
      thumbnailUrl: m.thumbnail_url || m.media_url || "",
      permalink: m.permalink ?? "",
      timestamp: m.timestamp ?? "",
    };
  } catch (err) {
    console.error("instagram fetchMediaById error", err);
    return null;
  }
}

export type IgMetrics = {
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
};

// Per-post insights. Some metrics are follower-gated or unsupported per media
// type, so anything missing comes back null rather than failing the whole call.
export async function fetchInsights(
  token: string,
  mediaId: string,
): Promise<IgMetrics> {
  const empty: IgMetrics = {
    views: null,
    likes: null,
    comments: null,
    shares: null,
    saves: null,
  };
  const p = new URLSearchParams({
    metric: "views,likes,comments,shares,saved",
    access_token: token,
  });
  try {
    const res = await fetch(
      `${GRAPH}/${encodeURIComponent(mediaId)}/insights?${p.toString()}`,
      { cache: "no-store" },
    );
    const data = await res.json();
    if (!res.ok) {
      console.error("instagram fetchInsights failed", res.status, data);
      return empty;
    }
    const byName = new Map<string, number>();
    type Row = { name?: string; values?: { value?: number }[] };
    for (const row of (data.data ?? []) as Row[]) {
      const v = row.values?.[0]?.value;
      if (row.name && typeof v === "number") byName.set(row.name, v);
    }
    return {
      views: byName.get("views") ?? null,
      likes: byName.get("likes") ?? null,
      comments: byName.get("comments") ?? null,
      shares: byName.get("shares") ?? null,
      saves: byName.get("saved") ?? null,
    };
  } catch (err) {
    console.error("instagram fetchInsights error", err);
    return empty;
  }
}
