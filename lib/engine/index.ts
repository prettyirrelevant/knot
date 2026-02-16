import type { BoardSize, GameConfig, MatchState, SymbolToken } from "../types/game";

export type MoveFailureReason =
  | "MATCH_NOT_ACTIVE"
  | "TURN_EXPIRED"
  | "INVALID_SYMBOL"
  | "OUT_OF_BOUNDS"
  | "CELL_OCCUPIED"
  | "NOT_YOUR_TURN";

export type MoveApplyResult =
  | {
      ok: true;
      event: "moved" | "won" | "draw";
      state: MatchState;
    }
  | {
      ok: false;
      reason: MoveFailureReason;
      state: MatchState;
    };

export type NewMatchStateInput = {
  id: string;
  config: GameConfig;
  createdAtMs?: number;
  players?: MatchState["players"];
  firstPlayer?: SymbolToken;
};

export type ConfigValidationResult =
  | { ok: true }
  | {
      ok: false;
      code:
        | "INVALID_SIZE"
        | "INVALID_WIN_LENGTH"
        | "INVALID_TURN_TIME"
        | "INVALID_INTEGER_VALUE";
      message: string;
    };

export type GamePreset = {
  id: string;
  label: string;
  description: string;
  config: GameConfig;
};

export const GAME_PRESETS: readonly GamePreset[] = [
  {
    id: "classic-3",
    label: "Classic",
    description: "Quick and sharp. No room to hide.",
    config: { size: 3, winLength: 3, turnTimeSec: 30, presetId: "classic-3" },
  },
  {
    id: "arena-5",
    label: "Arena",
    description: "More space. More schemes.",
    config: { size: 5, winLength: 4, turnTimeSec: 30, presetId: "arena-5" },
  },
  {
    id: "marathon-10",
    label: "Marathon",
    description: "Settle in. This one's a war.",
    config: { size: 10, winLength: 5, turnTimeSec: 45, presetId: "marathon-10" },
  },
] as const;

export function validateGameConfig(config: GameConfig): ConfigValidationResult {
  const { size, winLength, turnTimeSec } = config;

  if (!Number.isInteger(size) || !Number.isInteger(winLength) || !Number.isInteger(turnTimeSec)) {
    return {
      ok: false,
      code: "INVALID_INTEGER_VALUE",
      message: "size, winLength, and turnTimeSec must be integers.",
    };
  }

  if (size < 3 || size > 10) {
    return {
      ok: false,
      code: "INVALID_SIZE",
      message: "Board size must be between 3 and 10.",
    };
  }

  if (winLength < 3 || winLength > size) {
    return {
      ok: false,
      code: "INVALID_WIN_LENGTH",
      message: "Win length must be between 3 and board size.",
    };
  }

  if (turnTimeSec < 5 || turnTimeSec > 180) {
    return {
      ok: false,
      code: "INVALID_TURN_TIME",
      message: "Turn timer must be between 5 and 180 seconds.",
    };
  }

  return { ok: true };
}

export function createEmptyBoard(size: BoardSize): Array<SymbolToken | null> {
  return Array.from({ length: size * size }, () => null);
}

export function createNewMatchState(input: NewMatchStateInput): MatchState {
  const validated = validateGameConfig(input.config);
  if (!validated.ok) {
    throw new Error(validated.message);
  }

  const createdAtMs = input.createdAtMs ?? Date.now();
  const firstPlayer = input.firstPlayer ?? "X";

  return {
    id: input.id,
    config: input.config,
    board: createEmptyBoard(input.config.size),
    nextPlayer: firstPlayer,
    status: "active",
    turnNumber: 1,
    turnDeadlineAt: createdAtMs + input.config.turnTimeSec * 1000,
    players: input.players ?? {},
  };
}

export function isTurnExpired(state: MatchState, nowMs: number): boolean {
  return state.status === "active" && nowMs > state.turnDeadlineAt;
}

export function applyMove(
  state: MatchState,
  move: { cellIndex: number; symbol: SymbolToken; nowMs: number },
): MoveApplyResult {
  if (state.status !== "active") {
    return { ok: false, reason: "MATCH_NOT_ACTIVE", state };
  }

  if (isTurnExpired(state, move.nowMs)) {
    return { ok: false, reason: "TURN_EXPIRED", state: resolveTimeout(state, move.nowMs) };
  }

  if (move.symbol !== "X" && move.symbol !== "O") {
    return { ok: false, reason: "INVALID_SYMBOL", state };
  }

  if (move.symbol !== state.nextPlayer) {
    return { ok: false, reason: "NOT_YOUR_TURN", state };
  }

  if (move.cellIndex < 0 || move.cellIndex >= state.board.length) {
    return { ok: false, reason: "OUT_OF_BOUNDS", state };
  }

  if (state.board[move.cellIndex] !== null) {
    return { ok: false, reason: "CELL_OCCUPIED", state };
  }

  const board = [...state.board];
  board[move.cellIndex] = move.symbol;

  const winningLine = detectWinningLine(board, state.config.size, state.config.winLength, move.cellIndex);

  if (winningLine.length > 0) {
    return {
      ok: true,
      event: "won",
      state: {
        ...state,
        board,
        status: "won",
        winner: move.symbol,
        winningLine,
      },
    };
  }

  if (board.every((cell) => cell !== null)) {
    return {
      ok: true,
      event: "draw",
      state: {
        ...state,
        board,
        status: "draw",
        winner: undefined,
        winningLine: undefined,
      },
    };
  }

  return {
    ok: true,
    event: "moved",
    state: {
      ...state,
      board,
      nextPlayer: state.nextPlayer === "X" ? "O" : "X",
      turnNumber: state.turnNumber + 1,
      turnDeadlineAt: move.nowMs + state.config.turnTimeSec * 1000,
    },
  };
}

export function resolveTimeout(state: MatchState, nowMs: number): MatchState {
  if (state.status !== "active") {
    return state;
  }

  const winner: SymbolToken = state.nextPlayer === "X" ? "O" : "X";

  return {
    ...state,
    status: "timeout",
    winner,
    turnDeadlineAt: nowMs,
  };
}

export function detectWinningLine(
  board: Array<SymbolToken | null>,
  size: number,
  winLength: number,
  index: number,
): number[] {
  const symbol = board[index];
  if (!symbol) {
    return [];
  }

  const row = Math.floor(index / size);
  const col = index % size;
  const directions: ReadonlyArray<readonly [number, number]> = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];

  for (const [dr, dc] of directions) {
    const line = [index];

    let r = row - dr;
    let c = col - dc;
    while (isInside(size, r, c) && board[r * size + c] === symbol) {
      line.unshift(r * size + c);
      r -= dr;
      c -= dc;
    }

    r = row + dr;
    c = col + dc;
    while (isInside(size, r, c) && board[r * size + c] === symbol) {
      line.push(r * size + c);
      r += dr;
      c += dc;
    }

    if (line.length >= winLength) {
      return line;
    }
  }

  return [];
}

function isInside(size: number, row: number, col: number): boolean {
  return row >= 0 && row < size && col >= 0 && col < size;
}
