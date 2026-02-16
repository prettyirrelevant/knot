"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { Loader2 } from "lucide-react";

import { SkinSelect } from "@/components/skin-select";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { GAME_PRESETS, validateGameConfig } from "@/lib/engine";
import type { BoardSize, GameConfig } from "@/lib/types/game";
import { useIdentityStore } from "@/stores/use-identity-store";
import { useUiStore } from "@/stores/use-ui-store";

const BOARD_SIZES: readonly BoardSize[] = [3, 4, 5, 6, 7, 8, 9, 10];
const TIMER_OPTIONS = [15, 30, 45, 60];

function findMatchingPresetId(config: GameConfig): string | null {
  const match = GAME_PRESETS.find(
    (p) =>
      p.config.size === config.size &&
      p.config.winLength === config.winLength &&
      p.config.turnTimeSec === config.turnTimeSec,
  );
  return match?.id ?? null;
}

export function CreateRoomModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const createRoom = useMutation(api.matches.createRoom);

  const playerId = useIdentityStore((state) => state.playerId);
  const symbolSkinId = useUiStore((state) => state.symbolSkinId);
  const setSymbolSkinId = useUiStore((state) => state.setSymbolSkinId);

  const [draftConfig, setDraftConfig] = useState<GameConfig>(() => ({ ...GAME_PRESETS[0].config }));
  const [activePresetId, setActivePresetId] = useState<string | null>("classic-3");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    function handleClose() {
      onClose();
    }

    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [onClose]);

  function handleBackdropClick(event: React.MouseEvent<HTMLDialogElement>) {
    if (event.target === dialogRef.current) {
      onClose();
    }
  }

  function handlePresetClick(presetId: string) {
    const preset = GAME_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    setDraftConfig({ ...preset.config });
    setActivePresetId(presetId);
    setError(null);
  }

  function handleConfigChange(partial: Partial<GameConfig>) {
    setDraftConfig((current) => {
      const next = { ...current, ...partial };
      if ("size" in partial && partial.size !== undefined) {
        next.winLength = Math.min(Math.max(3, current.winLength), partial.size);
      }
      setActivePresetId(findMatchingPresetId(next));
      return next;
    });
    setError(null);
  }

  async function handleCreate() {
    if (!playerId) {
      setError("Still setting you up. Try again in a moment.");
      return;
    }

    const validated = validateGameConfig(draftConfig);
    if (!validated.ok) {
      setError(validated.message);
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const result = await createRoom({
        hostPlayerId: playerId as Id<"players">,
        config: { ...draftConfig, symbolSkinId },
      });
      onClose();
      router.push(`/g/${result.roomCode}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create room.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <dialog ref={dialogRef} className="create-modal" onClick={handleBackdropClick}>
      <div className="create-modal-inner">
        <div className="create-modal-header">
          <h2 className="display">New Game</h2>
          <button className="button create-modal-close" type="button" onClick={onClose} aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M1 1l12 12M13 1L1 13" />
            </svg>
          </button>
        </div>

        <p className="kicker">Popular configs</p>
        <div className="preset-grid">
          {GAME_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={`preset-card${activePresetId === preset.id ? " active" : ""}`}
              onClick={() => handlePresetClick(preset.id)}
            >
              <span className="preset-card-label">{preset.label}</span>
              <span className="preset-card-desc">{preset.description}</span>
            </button>
          ))}
        </div>

        <div className="create-modal-options">
          <label>
            Board
            <select
              value={draftConfig.size}
              onChange={(e) => handleConfigChange({ size: Number(e.target.value) as BoardSize })}
            >
              {BOARD_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size} x {size}
                </option>
              ))}
            </select>
          </label>
          <label>
            Win
            <select
              value={draftConfig.winLength}
              onChange={(e) => handleConfigChange({ winLength: Number(e.target.value) })}
            >
              {Array.from({ length: draftConfig.size - 2 }, (_, i) => i + 3).map((v) => (
                <option key={v} value={v}>
                  {v} in a row
                </option>
              ))}
            </select>
          </label>
          <label>
            Timer
            <select
              value={draftConfig.turnTimeSec}
              onChange={(e) => handleConfigChange({ turnTimeSec: Number(e.target.value) })}
            >
              {TIMER_OPTIONS.map((sec) => (
                <option key={sec} value={sec}>
                  {sec}s
                </option>
              ))}
            </select>
          </label>
          <label>
            Symbols
            <SkinSelect value={symbolSkinId} onChange={setSymbolSkinId} />
          </label>
        </div>

        <div className="create-modal-footer">
          <button
            className="button primary create-modal-submit"
            type="button"
            onClick={() => void handleCreate()}
            disabled={creating}
          >
            {creating ? <><Loader2 size={16} className="spinner" /> Creating...</> : "Create Room"}
          </button>
          {error ? <p className="create-modal-error">{error}</p> : null}
        </div>
      </div>
    </dialog>
  );
}
