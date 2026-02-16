"use client";

import { type ReactNode, useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import {
  attachGuestSession,
  fetchSession,
  type SessionPlayer,
} from "@/lib/auth/client";
import { readIdentityCache, writeIdentityCache } from "@/lib/auth/identity-cache";
import { useIdentityStore } from "@/stores/use-identity-store";

const CREATE_GUEST = api.players.createGuestPlayer;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("timed out")), ms),
    ),
  ]);
}

export function IdentityProvider({ children }: { children: ReactNode }) {
  const initializedRef = useRef(false);
  const createGuestPlayer = useMutation(CREATE_GUEST);

  const setBooting = useIdentityStore((state) => state.setBooting);
  const setIdentity = useIdentityStore((state) => state.setIdentity);
  const setError = useIdentityStore((state) => state.setError);

  useEffect(() => {
    if (initializedRef.current) {
      return;
    }

    initializedRef.current = true;
    let cancelled = false;

    async function bootstrapIdentity() {
      setBooting();
      const cached = readIdentityCache();

      const settle = (player: SessionPlayer, guestSecret?: string | null) => {
        if (cancelled) {
          return;
        }
        setIdentity(player, guestSecret ?? null);
      };

      const existingSession = await fetchSession();
      if (existingSession.authenticated && existingSession.player) {
        const syncedGuestSecret =
          existingSession.player.identityTier === "secured" ? null : cached?.guestSecret ?? null;
        settle(existingSession.player, syncedGuestSecret);
        writeIdentityCache({
          playerId: existingSession.player.id,
          guestSecret: syncedGuestSecret,
        });
        return;
      }

      if (cached?.playerId && cached.guestSecret) {
        try {
          const attached = await attachGuestSession(cached.playerId, cached.guestSecret);
          if (attached.ok && attached.player) {
            settle(attached.player, cached.guestSecret);
            return;
          }
        } catch {
          // Fall through to creating a fresh guest.
        }
      }

      const created = await createGuestPlayer({});
      const player: SessionPlayer = {
        id: String(created.playerId),
        displayName: String(created.displayName),
        identityTier: created.identityTier ?? "guest",
      };

      const guestSecret = created.guestSecret ?? null;
      writeIdentityCache({
        playerId: player.id,
        guestSecret,
      });

      if (guestSecret) {
        try {
          const attached = await attachGuestSession(player.id, guestSecret);
          if (attached.ok && attached.player) {
            settle(attached.player, guestSecret);
            return;
          }
        } catch {
          // Continue with local identity if cookie attach fails.
        }
      }

      settle(player, guestSecret);
    }

    void withTimeout(bootstrapIdentity(), 8000).catch(() => {
      if (!cancelled) {
        setError();
        toast.error("Unable to initialize identity.");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [createGuestPlayer, setBooting, setError, setIdentity]);

  return <>{children}</>;
}
