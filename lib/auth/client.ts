import { startAuthentication, startRegistration } from "@simplewebauthn/browser";

type IdentityTier = "guest" | "secured";

export type SessionPlayer = {
  id: string;
  displayName: string;
  identityTier: IdentityTier;
};

type SessionPayload = {
  authenticated: boolean;
  player?: SessionPlayer;
};

type PasskeyOptions = {
  challenge?: string;
} & Record<string, unknown>;

type ApiResult<T> = {
  ok: boolean;
  reason?: string;
  player?: SessionPlayer;
  options?: T;
};

async function postJson<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = (await response.json().catch(() => ({}))) as T;
  if (!response.ok) {
    throw new Error((payload as { reason?: string }).reason ?? `Request failed (${response.status})`);
  }

  return payload;
}

export async function fetchSession() {
  const response = await fetch("/api/auth/session", {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    return {
      authenticated: false,
    } satisfies SessionPayload;
  }

  return (await response.json()) as SessionPayload;
}

export async function attachGuestSession(playerId: string, guestSecret: string) {
  return postJson<ApiResult<never>>("/api/auth/session/guest", {
    playerId,
    guestSecret,
  });
}

export async function registerCurrentAccountPasskey() {
  const optionsPayload = await postJson<ApiResult<PasskeyOptions>>(
    "/api/auth/passkey/register/options",
  );

  if (!optionsPayload.ok || !optionsPayload.options) {
    throw new Error(optionsPayload.reason ?? "Unable to begin passkey registration.");
  }

  const response = await (startRegistration as (options: unknown) => Promise<unknown>)(
    optionsPayload.options,
  );

  return postJson<ApiResult<never>>("/api/auth/passkey/register/verify", {
    challenge: optionsPayload.options.challenge,
    response,
  });
}

export async function restoreAccountWithPasskey() {
  const optionsPayload = await postJson<ApiResult<PasskeyOptions>>(
    "/api/auth/passkey/authenticate/options",
  );

  if (!optionsPayload.ok || !optionsPayload.options) {
    throw new Error(optionsPayload.reason ?? "Unable to begin passkey restore.");
  }

  const response = await (startAuthentication as (options: unknown) => Promise<unknown>)(
    optionsPayload.options,
  );

  return postJson<ApiResult<never>>("/api/auth/passkey/authenticate/verify", {
    challenge: optionsPayload.options.challenge,
    response,
  });
}

export async function logoutSession() {
  return postJson<{ ok: true }>("/api/auth/logout");
}
