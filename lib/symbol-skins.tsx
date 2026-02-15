import {
  Cherry,
  Circle,
  Crown,
  Diamond,
  Flame,
  Hexagon,
  Moon,
  Snowflake,
  Sparkles,
  Star,
  Sun,
  Swords,
  Triangle,
  X,
  Zap,
} from "lucide-react";

import type { SymbolSkin } from "@/lib/types/game";

export const SYMBOL_SKINS: readonly SymbolSkin[] = [
  {
    id: "classic-xo",
    name: "Classic",
    X,
    O: Circle,
  },
  {
    id: "celestial",
    name: "Celestial",
    X: Sun,
    O: Moon,
  },
  {
    id: "royale",
    name: "Royale",
    X: Crown,
    O: Swords,
  },
  {
    id: "spark",
    name: "Spark",
    X: Zap,
    O: Flame,
  },
  {
    id: "gem",
    name: "Gem",
    X: Diamond,
    O: Hexagon,
  },
  {
    id: "frost",
    name: "Frost",
    X: Snowflake,
    O: Sparkles,
  },
  {
    id: "nature",
    name: "Nature",
    X: Cherry,
    O: Star,
  },
  {
    id: "shapes",
    name: "Shapes",
    X: Triangle,
    O: Diamond,
  },
];

export function getSymbolSkin(symbolSkinId: string): SymbolSkin {
  return SYMBOL_SKINS.find((skin) => skin.id === symbolSkinId) ?? SYMBOL_SKINS[0];
}
