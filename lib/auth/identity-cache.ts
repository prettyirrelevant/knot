export type CachedIdentity = {
  playerId: string;
  guestSecret: string | null;
};

const STORAGE_KEY = "knot_identity_v1";

export function readIdentityCache(): CachedIdentity | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as CachedIdentity;
    if (!parsed?.playerId) {
      return null;
    }

    return {
      playerId: parsed.playerId,
      guestSecret: parsed.guestSecret ?? null,
    };
  } catch {
    return null;
  }
}

export function writeIdentityCache(identity: CachedIdentity) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
}
