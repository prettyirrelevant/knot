import { create } from "zustand";

import type { SessionPlayer } from "@/lib/auth/client";

type IdentityStatus = "booting" | "ready" | "error";

type IdentityState = {
  status: IdentityStatus;
  playerId: string | null;
  displayName: string | null;
  identityTier: "guest" | "secured";
  guestSecret: string | null;
  setBooting: () => void;
  setIdentity: (player: SessionPlayer, guestSecret?: string | null) => void;
  setError: () => void;
};

export const useIdentityStore = create<IdentityState>((set) => ({
  status: "booting",
  playerId: null,
  displayName: null,
  identityTier: "guest",
  guestSecret: null,
  setBooting: () =>
    set(() => ({
      status: "booting",
    })),
  setIdentity: (player, guestSecret) =>
    set((state) => ({
      status: "ready",
      playerId: player.id,
      displayName: player.displayName,
      identityTier: player.identityTier,
      guestSecret: guestSecret === undefined ? state.guestSecret : guestSecret,
    })),
  setError: () =>
    set(() => ({
      status: "error",
    })),
}));
