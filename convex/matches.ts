import { mutationGeneric as mutation, queryGeneric as query } from "convex/server";
import { v } from "convex/values";

import { applyMove, createEmptyBoard, resolveTimeout, validateGameConfig } from "../lib/engine";
import type { GameConfig, MatchState, SymbolToken } from "../lib/types/game";

const BASE_ELO = 1200;
const BASE_K = 24;
const PROVISIONAL_K = 32;
const PROVISIONAL_GAMES = 12;

const configValidator = v.object({
  size: v.number(),
  winLength: v.number(),
  turnTimeSec: v.number(),
  presetId: v.optional(v.string()),
  symbolSkinId: v.optional(v.string()),
});

function createRoomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function normalizeRoomCode(roomCode?: string) {
  if (!roomCode) {
    return null;
  }

  const normalized = roomCode.trim().toUpperCase();
  if (!/^[A-Z0-9-]{3,20}$/.test(normalized)) {
    throw new Error("Room code must be 3-20 chars using A-Z, 0-9, or -.");
  }

  return normalized;
}

function resolvePlayerSymbol(players: { X?: string; O?: string }, playerId: string): SymbolToken | null {
  if (players.X && String(players.X) === playerId) {
    return "X";
  }

  if (players.O && String(players.O) === playerId) {
    return "O";
  }

  return null;
}

function expectedScore(playerElo: number, opponentElo: number) {
  return 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
}

function computeScorePair(status: string, winner?: SymbolToken) {
  if (status === "draw") {
    return { xScore: 0.5, oScore: 0.5 };
  }

  if (winner === "X") {
    return { xScore: 1, oScore: 0 };
  }

  if (winner === "O") {
    return { xScore: 0, oScore: 1 };
  }

  return null;
}

function computeKFactor(gamesPlayed: number) {
  return gamesPlayed < PROVISIONAL_GAMES ? PROVISIONAL_K : BASE_K;
}

function isTerminal(status: string) {
  return status === "won" || status === "draw" || status === "timeout" || status === "resigned";
}

function getRoundNumber(match: { roundNumber?: number }) {
  return Number(match.roundNumber ?? 1);
}

async function getOrCreateRating(ctx: any, playerId: any, now: number) {
  const existing = await ctx.db
    .query("ratings")
    .withIndex("by_playerId", (q: any) => q.eq("playerId", playerId))
    .first();

  if (existing) {
    return existing;
  }

  const createdId = await ctx.db.insert("ratings", {
    playerId,
    elo: BASE_ELO,
    gamesPlayed: 0,
    provisionalUntil: PROVISIONAL_GAMES,
    updatedAt: now,
  });

  return {
    _id: createdId,
    playerId,
    elo: BASE_ELO,
    gamesPlayed: 0,
    provisionalUntil: PROVISIONAL_GAMES,
    updatedAt: now,
  };
}

async function upsertHeadToHead(ctx: any, match: any, winner: SymbolToken | undefined, now: number) {
  const xId = match.players?.X;
  const oId = match.players?.O;
  if (!xId || !oId) {
    return;
  }

  const xKey = String(xId);
  const oKey = String(oId);
  const xIsLow = xKey < oKey;
  const lowId = xIsLow ? xId : oId;
  const highId = xIsLow ? oId : xId;

  const existing = await ctx.db
    .query("h2hStats")
    .withIndex("by_pair", (q: any) => q.eq("playerLowId", lowId))
    .filter((q: any) => q.eq(q.field("playerHighId"), highId))
    .first();

  let lowWins = existing?.lowWins ?? 0;
  let highWins = existing?.highWins ?? 0;
  let draws = existing?.draws ?? 0;

  if (!winner) {
    draws += 1;
  } else if (winner === "X") {
    if (xIsLow) {
      lowWins += 1;
    } else {
      highWins += 1;
    }
  } else {
    if (xIsLow) {
      highWins += 1;
    } else {
      lowWins += 1;
    }
  }

  if (existing) {
    await ctx.db.patch(existing._id, {
      lowWins,
      highWins,
      draws,
      lastPlayedAt: now,
    });
  } else {
    await ctx.db.insert("h2hStats", {
      playerLowId: lowId,
      playerHighId: highId,
      lowWins,
      highWins,
      draws,
      lastPlayedAt: now,
    });
  }
}

async function finalizeCompetitiveResult(
  ctx: any,
  match: any,
  outcome: { status: string; winner?: SymbolToken },
) {
  if (!isTerminal(outcome.status)) {
    return;
  }

  const xId = match.players?.X;
  const oId = match.players?.O;
  if (!xId || !oId) {
    return;
  }

  const roundNumber = getRoundNumber(match);

  const existingRoundEvents = await ctx.db
    .query("ratingEvents")
    .withIndex("by_matchId", (q: any) => q.eq("matchId", match._id))
    .filter((q: any) => q.eq(q.field("roundNumber"), roundNumber))
    .take(1);

  if (existingRoundEvents.length > 0) {
    return;
  }

  const scorePair = computeScorePair(outcome.status, outcome.winner);
  if (!scorePair) {
    return;
  }

  const now = Date.now();
  const xRating = await getOrCreateRating(ctx, xId, now);
  const oRating = await getOrCreateRating(ctx, oId, now);

  const expectedX = expectedScore(Number(xRating.elo), Number(oRating.elo));
  const expectedO = expectedScore(Number(oRating.elo), Number(xRating.elo));

  const kX = computeKFactor(Number(xRating.gamesPlayed));
  const kO = computeKFactor(Number(oRating.gamesPlayed));

  const deltaX = Math.round(kX * (scorePair.xScore - expectedX));
  const deltaO = Math.round(kO * (scorePair.oScore - expectedO));

  const nextXElo = Number(xRating.elo) + deltaX;
  const nextOElo = Number(oRating.elo) + deltaO;
  const nextXGames = Number(xRating.gamesPlayed) + 1;
  const nextOGames = Number(oRating.gamesPlayed) + 1;

  await ctx.db.patch(xRating._id, {
    elo: nextXElo,
    gamesPlayed: nextXGames,
    provisionalUntil: Math.max(0, PROVISIONAL_GAMES - nextXGames),
    updatedAt: now,
  });

  await ctx.db.patch(oRating._id, {
    elo: nextOElo,
    gamesPlayed: nextOGames,
    provisionalUntil: Math.max(0, PROVISIONAL_GAMES - nextOGames),
    updatedAt: now,
  });

  await ctx.db.insert("ratingEvents", {
    matchId: match._id,
    roundNumber,
    playerId: xId,
    beforeElo: Number(xRating.elo),
    afterElo: nextXElo,
    delta: deltaX,
    createdAt: now,
  });

  await ctx.db.insert("ratingEvents", {
    matchId: match._id,
    roundNumber,
    playerId: oId,
    beforeElo: Number(oRating.elo),
    afterElo: nextOElo,
    delta: deltaO,
    createdAt: now,
  });

  await upsertHeadToHead(ctx, match, outcome.status === "draw" ? undefined : outcome.winner, now);
}

function toEngineState(match: any): MatchState {
  return {
    id: String(match._id),
    config: match.config as GameConfig,
    board: match.board as Array<SymbolToken | null>,
    nextPlayer: match.nextPlayer as SymbolToken,
    status: match.status as MatchState["status"],
    winner: match.winner as SymbolToken | undefined,
    winningLine: match.winningLine,
    turnNumber: match.turnNumber,
    turnDeadlineAt: match.turnDeadlineAt,
    players: {
      X: match.players.X ? String(match.players.X) : undefined,
      O: match.players.O ? String(match.players.O) : undefined,
    },
  };
}

export const createRoom = mutation({
  args: {
    hostPlayerId: v.id("players"),
    config: configValidator,
    roomCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const parsedConfig = args.config as GameConfig;
    const valid = validateGameConfig(parsedConfig);

    if (!valid.ok) {
      throw new Error(valid.message);
    }

    const now = Date.now();
    const requested = normalizeRoomCode(args.roomCode);
    let roomCode = requested ?? createRoomCode();

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const existing = await ctx.db
        .query("matches")
        .withIndex("by_roomCode", (q: any) => q.eq("roomCode", roomCode))
        .first();

      if (!existing) {
        break;
      }

      if (requested) {
        throw new Error("Room code already exists.");
      }

      roomCode = createRoomCode();
    }

    const matchId = await ctx.db.insert("matches", {
      roomCode,
      config: parsedConfig,
      status: "waiting",
      board: createEmptyBoard(parsedConfig.size),
      players: {
        X: args.hostPlayerId,
      },
      nextPlayer: "X",
      roundNumber: 1,
      turnNumber: 1,
      turnDeadlineAt: now + parsedConfig.turnTimeSec * 1000,
      rematchRequestedBy: undefined,
      createdAt: now,
      updatedAt: now,
    });

    return { matchId, roomCode };
  },
});

export const joinRoom = mutation({
  args: {
    roomCode: v.string(),
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const roomCode = normalizeRoomCode(args.roomCode);
    if (!roomCode) {
      throw new Error("Invalid room code.");
    }

    const match = await ctx.db
      .query("matches")
      .withIndex("by_roomCode", (q: any) => q.eq("roomCode", roomCode))
      .first();

    if (!match) {
      throw new Error("Room not found.");
    }

    if (match.players.X === args.playerId || match.players.O === args.playerId) {
      return {
        matchId: match._id,
        joinedAs: resolvePlayerSymbol(match.players, String(args.playerId)),
      };
    }

    if (match.players.O) {
      throw new Error("Room is already full.");
    }

    const now = Date.now();
    await ctx.db.patch(match._id, {
      players: {
        ...match.players,
        O: args.playerId,
      },
      status: "active",
      turnDeadlineAt: now + match.config.turnTimeSec * 1000,
      rematchRequestedBy: undefined,
      updatedAt: now,
    });

    return { matchId: match._id, joinedAs: "O" as const };
  },
});

export const getMatchByRoomCode = query({
  args: {
    roomCode: v.string(),
  },
  handler: async (ctx, args) => {
    const roomCode = normalizeRoomCode(args.roomCode);
    if (!roomCode) {
      return null;
    }

    const match = await ctx.db
      .query("matches")
      .withIndex("by_roomCode", (q: any) => q.eq("roomCode", roomCode))
      .first();

    if (!match) {
      return null;
    }

    const [playerX, playerO] = await Promise.all([
      match.players.X ? ctx.db.get(match.players.X) : null,
      match.players.O ? ctx.db.get(match.players.O) : null,
    ]);

    return {
      ...match,
      playerNames: {
        X: playerX?.displayName ?? null,
        O: playerO?.displayName ?? null,
      },
    };
  },
});

export const makeMove = mutation({
  args: {
    matchId: v.id("matches"),
    cellIndex: v.number(),
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error("Match not found.");
    }

    const playerSymbol = resolvePlayerSymbol(
      match.players as { X?: string; O?: string },
      String(args.playerId),
    );

    if (!playerSymbol) {
      return {
        ok: false as const,
        reason: "PLAYER_NOT_JOINED",
      };
    }

    const now = Date.now();
    const state = toEngineState(match);

    const result = applyMove(state, {
      cellIndex: args.cellIndex,
      symbol: playerSymbol,
      nowMs: now,
    });

    if (!result.ok) {
      if (result.reason === "TURN_EXPIRED") {
        await ctx.db.patch(match._id, {
          status: result.state.status,
          winner: result.state.winner,
          turnDeadlineAt: result.state.turnDeadlineAt,
          rematchRequestedBy: undefined,
          updatedAt: now,
        });

        await finalizeCompetitiveResult(ctx, match, {
          status: result.state.status,
          winner: result.state.winner,
        });
      }

      return {
        ok: false as const,
        reason: result.reason,
      };
    }

    await ctx.db.insert("moves", {
      matchId: match._id,
      roundNumber: getRoundNumber(match),
      turn: match.turnNumber,
      playerId: args.playerId,
      symbol: playerSymbol,
      cellIndex: args.cellIndex,
      playedAt: now,
      deadlineAt: match.turnDeadlineAt,
    });

    await ctx.db.patch(match._id, {
      board: result.state.board,
      nextPlayer: result.state.nextPlayer,
      status: result.state.status,
      winner: result.state.winner,
      winningLine: result.state.winningLine,
      lastMoveIndex: args.cellIndex,
      turnNumber: result.state.turnNumber,
      turnDeadlineAt: result.state.turnDeadlineAt,
      rematchRequestedBy: isTerminal(result.state.status) ? undefined : match.rematchRequestedBy,
      updatedAt: now,
    });

    if (isTerminal(result.state.status)) {
      await finalizeCompetitiveResult(ctx, match, {
        status: result.state.status,
        winner: result.state.winner,
      });
    }

    return {
      ok: true as const,
      event: result.event,
      status: result.state.status,
    };
  },
});

export const tickTimeout = mutation({
  args: {
    matchId: v.id("matches"),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error("Match not found.");
    }

    if (match.status !== "active") {
      return {
        ok: false as const,
        reason: "MATCH_NOT_ACTIVE",
      };
    }

    const now = Date.now();
    if (now <= match.turnDeadlineAt) {
      return {
        ok: false as const,
        reason: "TURN_STILL_ACTIVE",
        remainingMs: Math.max(0, match.turnDeadlineAt - now),
      };
    }

    const timedOut = resolveTimeout(toEngineState(match), now);

    await ctx.db.patch(match._id, {
      status: timedOut.status,
      winner: timedOut.winner,
      turnDeadlineAt: timedOut.turnDeadlineAt,
      rematchRequestedBy: undefined,
      updatedAt: now,
    });

    await finalizeCompetitiveResult(ctx, match, {
      status: timedOut.status,
      winner: timedOut.winner,
    });

    return {
      ok: true as const,
      status: timedOut.status,
      winner: timedOut.winner,
    };
  },
});

export const requestRematch = mutation({
  args: {
    matchId: v.id("matches"),
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error("Match not found.");
    }

    if (!isTerminal(match.status)) {
      return {
        ok: false as const,
        reason: "MATCH_NOT_TERMINAL",
      };
    }

    if (!match.players.X || !match.players.O) {
      return {
        ok: false as const,
        reason: "MISSING_OPPONENT",
      };
    }

    const playerSymbol = resolvePlayerSymbol(
      match.players as { X?: string; O?: string },
      String(args.playerId),
    );

    if (!playerSymbol) {
      return {
        ok: false as const,
        reason: "PLAYER_NOT_JOINED",
      };
    }

    if (match.rematchRequestedBy) {
      return {
        ok: false as const,
        reason: "REMATCH_ALREADY_REQUESTED",
        requestedBy: match.rematchRequestedBy,
      };
    }

    await ctx.db.patch(match._id, {
      rematchRequestedBy: playerSymbol,
      updatedAt: Date.now(),
    });

    return {
      ok: true as const,
      requestedBy: playerSymbol,
    };
  },
});

export const acceptRematch = mutation({
  args: {
    matchId: v.id("matches"),
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error("Match not found.");
    }

    if (!isTerminal(match.status)) {
      return {
        ok: false as const,
        reason: "MATCH_NOT_TERMINAL",
      };
    }

    if (!match.players.X || !match.players.O) {
      return {
        ok: false as const,
        reason: "MISSING_OPPONENT",
      };
    }

    if (!match.rematchRequestedBy) {
      return {
        ok: false as const,
        reason: "REMATCH_NOT_REQUESTED",
      };
    }

    const playerSymbol = resolvePlayerSymbol(
      match.players as { X?: string; O?: string },
      String(args.playerId),
    );

    if (!playerSymbol) {
      return {
        ok: false as const,
        reason: "PLAYER_NOT_JOINED",
      };
    }

    if (match.rematchRequestedBy === playerSymbol) {
      return {
        ok: false as const,
        reason: "CANNOT_ACCEPT_OWN_REQUEST",
      };
    }

    const now = Date.now();
    const nextRound = getRoundNumber(match) + 1;

    await ctx.db.patch(match._id, {
      board: createEmptyBoard(match.config.size),
      nextPlayer: "X",
      status: "active",
      winner: undefined,
      winningLine: undefined,
      lastMoveIndex: undefined,
      turnNumber: 1,
      roundNumber: nextRound,
      turnDeadlineAt: now + Number(match.config.turnTimeSec) * 1000,
      rematchRequestedBy: undefined,
      updatedAt: now,
    });

    return {
      ok: true as const,
      roundNumber: nextRound,
    };
  },
});

export const resign = mutation({
  args: {
    matchId: v.id("matches"),
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error("Match not found.");
    }

    if (match.status !== "active") {
      return { ok: false as const, reason: "MATCH_NOT_ACTIVE" };
    }

    const playerSymbol = resolvePlayerSymbol(
      match.players as { X?: string; O?: string },
      String(args.playerId),
    );

    if (!playerSymbol) {
      return {
        ok: false as const,
        reason: "PLAYER_NOT_JOINED",
      };
    }

    const winner: SymbolToken = playerSymbol === "X" ? "O" : "X";
    const now = Date.now();

    await ctx.db.patch(match._id, {
      status: "resigned",
      winner,
      rematchRequestedBy: undefined,
      updatedAt: now,
    });

    await finalizeCompetitiveResult(ctx, match, {
      status: "resigned",
      winner,
    });

    return {
      ok: true as const,
      winner,
    };
  },
});
