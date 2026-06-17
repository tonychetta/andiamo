// Server-side client for the MGMT app integration. Pulls a song's production
// status over the shared-secret API. Import only from server code (it reads
// MGMT_SHARED_SECRET). Section 11 / MGMT integration Part A.

const PROCESS_KEYS = ["PROD", "EDT", "MIX", "MST"] as const;
export type ProcessKey = (typeof PROCESS_KEYS)[number];
export type ProductionState = Record<ProcessKey, boolean>;

export const EMPTY_PRODUCTION: ProductionState = {
  PROD: false,
  EDT: false,
  MIX: false,
  MST: false,
};

type MgmtProcess = { key?: string; complete?: boolean };
type MgmtResponse = { id?: string; title?: string; processes?: MgmtProcess[] };

// Accepts a full song-card link (…/api/andiamo/song/<id>) or a bare id.
export function songIdFromLink(link: string | null | undefined): string | null {
  if (!link) return null;
  const trimmed = link.trim();
  if (!trimmed) return null;
  const afterSong = trimmed.split("/song/")[1];
  const raw = afterSong ?? trimmed;
  return raw.split(/[/?#]/)[0] || null;
}

// Fetch live production status for one song. Returns null on any failure (no
// link, MGMT down, bad secret) so the UI just shows empty bubbles.
export async function fetchProductionStatus(
  songId: string,
): Promise<ProductionState | null> {
  const base = process.env.MGMT_API_URL;
  const secret = process.env.MGMT_SHARED_SECRET;
  if (!base || !secret) return null;
  try {
    const res = await fetch(
      `${base}/api/andiamo/song/${encodeURIComponent(songId)}`,
      {
        headers: { Authorization: `Bearer ${secret}` },
        cache: "no-store",
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as MgmtResponse;
    const state: ProductionState = { ...EMPTY_PRODUCTION };
    for (const p of data.processes ?? []) {
      const key = p.key?.toUpperCase();
      if (key && key in state) state[key as ProcessKey] = !!p.complete;
    }
    return state;
  } catch {
    return null;
  }
}
