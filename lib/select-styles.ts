import type { StylesConfig } from "react-select";

export function baseSelectStyles<T>(overrides?: {
  control?: Record<string, unknown>;
  menu?: Record<string, unknown>;
  valueContainer?: Record<string, unknown>;
}): StylesConfig<T, false> {
  return {
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
      ...overrides?.control,
    }),
    menu: (base) => ({
      ...base,
      borderRadius: "12px",
      border: "1px solid var(--line)",
      boxShadow: "var(--shadow-sm)",
      overflow: "hidden",
      background: "var(--paper-bright)",
      zIndex: 10,
      ...overrides?.menu,
    }),
    menuList: (base) => ({
      ...base,
      padding: 0,
    }),
    indicatorSeparator: () => ({ display: "none" }),
    valueContainer: (base) => ({
      ...base,
      padding: "0.3rem 0.7rem",
      ...overrides?.valueContainer,
    }),
  };
}
