"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { Loader2 } from "lucide-react";
import Select, { components, type OptionProps, type SingleValueProps, type StylesConfig } from "react-select";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { GAME_PRESETS, validateGameConfig } from "@/lib/engine";
import { SYMBOL_SKINS } from "@/lib/symbol-skins";
import type { BoardSize, GameConfig, SymbolSkin } from "@/lib/types/game";
import { useIdentityStore } from "@/stores/use-identity-store";
import { useUiStore } from "@/stores/use-ui-store";

interface SkinOption {
  value: string;
  label: string;
  skin: SymbolSkin;
}

const SKIN_OPTIONS: SkinOption[] = SYMBOL_SKINS.map((skin) => ({
  value: skin.id,
  label: skin.name,
  skin,
}));

function SkinPreview({ skin, size = 14 }: { skin: SymbolSkin; size?: number }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
      <skin.X size={size} />
      <span style={{ color: "var(--ink-500)", fontSize: "0.75em" }}>vs</span>
      <skin.O size={size} />
      <span style={{ marginLeft: "0.25rem" }}>{skin.name}</span>
    </span>
  );
}

function SkinOptionComponent(props: OptionProps<SkinOption, false>) {
  const { data, innerRef, innerProps, isFocused, isSelected } = props;
  return (
    <div
      ref={innerRef}
      {...innerProps}
      style={{
        display: "flex",
        alignItems: "center",
        padding: "0.5rem 0.7rem",
        cursor: "pointer",
        background: isSelected
          ? "var(--accent-soft)"
          : isFocused
            ? "var(--surface-solid)"
            : "transparent",
        color: "var(--ink-900)",
      }}
    >
      <SkinPreview skin={data.skin} />
    </div>
  );
}

function SkinDropdownIndicator() {
  return (
    <div style={{ padding: "0 0.7rem 0 0", display: "flex", alignItems: "center" }}>
      <svg width="10" height="6" viewBox="0 0 10 6" fill="#666">
        <path d="M0 0l5 6 5-6z" />
      </svg>
    </div>
  );
}

function SkinSingleValue(props: SingleValueProps<SkinOption, false>) {
  return (
    <components.SingleValue {...props}>
      <SkinPreview skin={props.data.skin} />
    </components.SingleValue>
  );
}

const skinSelectStyles: StylesConfig<SkinOption, false> = {
  control: (base, state) => ({
    ...base,
    border: `1px solid ${state.isFocused ? "var(--accent)" : "var(--line)"}`,
    borderRadius: "12px",
    background: "var(--surface-solid)",
    boxShadow: state.isFocused ? "0 0 0 3px var(--accent-soft)" : "none",
    cursor: "pointer",
    minHeight: "unset",
    padding: "0.1rem 0",
    fontSize: "0.88rem",
    fontFamily: "inherit",
    "&:hover": { borderColor: "var(--border-strong)" },
  }),
  menu: (base) => ({
    ...base,
    borderRadius: "12px",
    border: "1px solid var(--line)",
    boxShadow: "var(--shadow-sm)",
    overflow: "hidden",
    background: "var(--paper-bright)",
    zIndex: 10,
  }),
  menuList: (base) => ({
    ...base,
    padding: 0,
  }),
  indicatorSeparator: () => ({ display: "none" }),
  valueContainer: (base) => ({
    ...base,
    padding: "0.3rem 0.7rem",
  }),
};

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
            <Select<SkinOption, false>
              options={SKIN_OPTIONS}
              value={SKIN_OPTIONS.find((o) => o.value === symbolSkinId)}
              onChange={(option) => option && setSymbolSkinId(option.value)}
              components={{ Option: SkinOptionComponent, SingleValue: SkinSingleValue, DropdownIndicator: SkinDropdownIndicator }}
              styles={skinSelectStyles}
              isSearchable={false}
              menuPlacement="auto"
            />
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
