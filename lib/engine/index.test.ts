import test from "node:test";
import assert from "node:assert/strict";

import {
  applyMove,
  createNewMatchState,
  detectWinningLine,
  resolveTimeout,
  validateGameConfig,
} from "./index";

test("validateGameConfig accepts valid custom config", () => {
  const result = validateGameConfig({ size: 10, winLength: 5, turnTimeSec: 30 });
  assert.deepEqual(result, { ok: true });
});

test("validateGameConfig rejects invalid bounds", () => {
  const badSize = validateGameConfig({ size: 2 as 3, winLength: 3, turnTimeSec: 30 });
  assert.equal(badSize.ok, false);

  const badWin = validateGameConfig({ size: 4, winLength: 5, turnTimeSec: 30 });
  assert.equal(badWin.ok, false);

  const badTimer = validateGameConfig({ size: 4, winLength: 3, turnTimeSec: 1 });
  assert.equal(badTimer.ok, false);
});

test("applyMove wins on horizontal sequence for size 5 / win 4", () => {
  let state = createNewMatchState({
    id: "m1",
    config: { size: 5, winLength: 4, turnTimeSec: 30 },
    createdAtMs: 10_000,
  });

  const sequence: Array<[number, "X" | "O"]> = [
    [0, "X"],
    [5, "O"],
    [1, "X"],
    [6, "O"],
    [2, "X"],
    [7, "O"],
    [3, "X"],
  ];

  let nowMs = 10_100;
  for (const [cellIndex, symbol] of sequence) {
    const result = applyMove(state, { cellIndex, symbol, nowMs });
    assert.equal(result.ok, true);
    state = result.state;
    nowMs += 100;
  }

  assert.equal(state.status, "won");
  assert.equal(state.winner, "X");
  assert.deepEqual(state.winningLine, [0, 1, 2, 3]);
});

test("applyMove rejects playing on occupied cell", () => {
  const state = createNewMatchState({
    id: "m2",
    config: { size: 3, winLength: 3, turnTimeSec: 30 },
    createdAtMs: 20_000,
  });

  const first = applyMove(state, { cellIndex: 0, symbol: "X", nowMs: 20_100 });
  assert.equal(first.ok, true);

  const second = applyMove(first.state, { cellIndex: 0, symbol: "O", nowMs: 20_200 });
  assert.equal(second.ok, false);
  assert.equal(second.reason, "CELL_OCCUPIED");
});

test("applyMove returns timeout when move arrives after deadline", () => {
  const state = createNewMatchState({
    id: "m3",
    config: { size: 3, winLength: 3, turnTimeSec: 15 },
    createdAtMs: 1_000,
  });

  const result = applyMove(state, { cellIndex: 0, symbol: "X", nowMs: 17_000 });

  assert.equal(result.ok, false);
  assert.equal(result.reason, "TURN_EXPIRED");
  assert.equal(result.state.status, "timeout");
  assert.equal(result.state.winner, "O");
});

test("detectWinningLine finds anti-diagonal line", () => {
  const size = 6;
  const board = Array.from({ length: size * size }, () => null) as Array<"X" | "O" | null>;

  const line = [4, 9, 14, 19, 24];
  for (const index of line) {
    board[index] = "O";
  }

  const winning = detectWinningLine(board, size, 5, 24);
  assert.deepEqual(winning, line);
});

test("resolveTimeout is idempotent on non-active state", () => {
  const ended = {
    ...createNewMatchState({
      id: "m4",
      config: { size: 3, winLength: 3, turnTimeSec: 20 },
      createdAtMs: 2_000,
    }),
    status: "won" as const,
    winner: "X" as const,
  };

  const next = resolveTimeout(ended, 3_000);
  assert.deepEqual(next, ended);
});
