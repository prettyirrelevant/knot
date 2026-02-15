import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "knot_session";
const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 30;

type SessionPayload = {
  playerId: string;
  exp: number;
};

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function getSessionSecret() {
  const envSecret = process.env.KNOT_SESSION_SECRET;
  if (envSecret && envSecret.length >= 32) {
    return envSecret;
  }

  if (process.env.NODE_ENV !== "production") {
    return "knot-dev-only-secret-change-this-before-production";
  }

  throw new Error("KNOT_SESSION_SECRET must be set in production.");
}

function signPayload(payloadB64: string) {
  return createHmac("sha256", getSessionSecret()).update(payloadB64).digest("base64url");
}

export function createSessionToken(playerId: string) {
  const payload: SessionPayload = {
    playerId,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SEC,
  };
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const signature = signPayload(payloadB64);
  return `${payloadB64}.${signature}`;
}

export function parseSessionToken(token: string | undefined): SessionPayload | null {
  if (!token) {
    return null;
  }

  const [payloadB64, signature] = token.split(".");
  if (!payloadB64 || !signature) {
    return null;
  }

  const expectedSig = signPayload(payloadB64);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSig);

  if (signatureBuffer.length !== expectedBuffer.length) {
    return null;
  }

  if (!timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(payloadB64)) as SessionPayload;
    if (!payload?.playerId || typeof payload.exp !== "number") {
      return null;
    }

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp <= now) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function getSessionFromRequest(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  return parseSessionToken(token);
}

export function setSessionCookie(response: NextResponse, playerId: string) {
  response.cookies.set(SESSION_COOKIE_NAME, createSessionToken(playerId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SEC,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
