"use client";

import { create } from "zustand";

export type MotionPreference = "full" | "reduced";

interface UiState {
  symbolSkinId: string;
  motion: MotionPreference;
  soundEnabled: boolean;
  setSymbolSkinId: (symbolSkinId: string) => void;
  setMotion: (motion: MotionPreference) => void;
  toggleSound: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  symbolSkinId: "classic-xo",
  motion: "full",
  soundEnabled: true,
  setSymbolSkinId: (symbolSkinId) => set({ symbolSkinId }),
  setMotion: (motion) => set({ motion }),
  toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
}));
