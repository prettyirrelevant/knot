"use client";

import Select, { components, type OptionProps, type SingleValueProps, type StylesConfig } from "react-select";

import { baseSelectStyles } from "@/lib/select-styles";
import { SYMBOL_SKINS } from "@/lib/symbol-skins";
import type { SymbolSkin } from "@/lib/types/game";

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
  ...baseSelectStyles<SkinOption>(),
};

export function SkinSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (skinId: string) => void;
}) {
  return (
    <Select<SkinOption, false>
      options={SKIN_OPTIONS}
      value={SKIN_OPTIONS.find((o) => o.value === value)}
      onChange={(option) => option && onChange(option.value)}
      components={{
        Option: SkinOptionComponent,
        SingleValue: SkinSingleValue,
        DropdownIndicator: SkinDropdownIndicator,
      }}
      styles={skinSelectStyles}
      isSearchable={false}
      menuPlacement="auto"
    />
  );
}
