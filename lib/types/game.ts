export type SymbolToken = "X" | "O";

export type BoardSize = 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface GameConfig {
  size: BoardSize;
  winLength: number;
  turnTimeSec: number;
  presetId?: string;
  symbolSkinId?: string;
}

export interface SymbolSkin {
  id: string;
  name: string;
  X: React.ComponentType<{ size?: number }>;
  O: React.ComponentType<{ size?: number }>;
}

export interface MatchState {
  id: string;
  config: GameConfig;
  board: Array<SymbolToken | null>;
  nextPlayer: SymbolToken;
  status: "waiting" | "active" | "won" | "draw" | "timeout" | "resigned";
  winner?: SymbolToken;
  winningLine?: number[];
  turnNumber: number;
  turnDeadlineAt: number;
  players: {
    X?: string;
    O?: string;
  };
}
