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

const PRESET_DIMENSIONS: Record<string, string> = {
  "classic-3": "3\u00d73",
  "arena-5": "5\u00d75",
  "marathon-10": "10\u00d710",
};

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
      setError("Hang on, we're still getting things ready.");
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
      setError(err instanceof Error ? err.message : "Something went wrong. Give it another shot.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <dialog ref={dialogRef} className="create-modal" onClick={handleBackdropClick}>
      <div className="create-modal-inner">
        <div className="create-modal-header">
          <h2 className="display">New game</h2>
          <button className="button create-modal-close" type="button" onClick={onClose} aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M1 1l12 12M13 1L1 13" />
            </svg>
          </button>
        </div>

        <div>
          <p className="kicker">Pick a vibe</p>
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
                <span className="preset-card-dims">{PRESET_DIMENSIONS[preset.id]}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="kicker">Symbols</p>
          <div className="create-modal-symbols">
            <SkinSelect value={symbolSkinId} onChange={setSymbolSkinId} />
          </div>
        </div>

        <details className="fine-tune-toggle">
          <summary className="fine-tune-summary">Tweak the rules</summary>
          <div className="fine-tune-options">
            <label>
              Board size
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
              Win condition
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
              Turn timer
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
          </div>
        </details>

        <div className="create-modal-footer">
          <button
            className="button primary create-modal-submit"
            type="button"
            onClick={() => void handleCreate()}
            disabled={creating}
          >
            {creating ? <><Loader2 size={16} className="spinner" /> Setting up...</> : "Create game"}
          </button>
          {error ? <p className="create-modal-error">{error}</p> : null}
        </div>
      </div>
    </dialog>
  );
}
