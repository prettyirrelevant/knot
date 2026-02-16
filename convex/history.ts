import { mutationGeneric as mutation, queryGeneric as query } from "convex/server";
import { v } from "convex/values";

type SymbolToken = "X" | "O";

export const getPlayerHistory = query({
  args: {
    playerId: v.id("players"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 50, 1), 100);

    const events = await ctx.db
      .query("ratingEvents")
      .withIndex("by_playerId", (q: any) => q.eq("playerId", args.playerId))
      .order("desc")
      .take(limit);

    const playerIdStr = String(args.playerId);
    const results: Array<{
      matchId: string;
      roomCode: string;
      boardSize: number;
      winLength: number;
      status: string;
      result: "win" | "loss" | "draw";
      opponentName: string;
      eloDelta: number;
      playedAt: number;
      roundNumber: number;
      archived: boolean;
    }> = [];

    for (const event of events) {
      const match = await ctx.db.get(event.matchId);
      if (!match) continue;

      const xStr = match.players?.X ? String(match.players.X) : null;
      const oStr = match.players?.O ? String(match.players.O) : null;

      const playerSymbol: SymbolToken | null =
        xStr === playerIdStr ? "X" : oStr === playerIdStr ? "O" : null;
      if (!playerSymbol) continue;

      const opponentId = playerSymbol === "X" ? match.players?.O : match.players?.X;
      const opponent = opponentId ? await ctx.db.get(opponentId) : null;

      const result: "win" | "loss" | "draw" = event.result
        ? (event.result as "win" | "loss" | "draw")
        : event.delta > 0 ? "win" : event.delta < 0 ? "loss" : "draw";

      results.push({
        matchId: String(event.matchId),
        roomCode: match.roomCode,
        boardSize: match.config?.size ?? 3,
        winLength: match.config?.winLength ?? 3,
        status: match.status,
        result,
        opponentName: opponent?.displayName ?? "Unknown",
        eloDelta: Number(event.delta),
        playedAt: event.createdAt,
        roundNumber: event.roundNumber ?? 1,
        archived: Boolean(match.deletedAt),
      });
    }

    return results;
  },
});

export const archiveMatch = mutation({
  args: {
    matchId: v.id("matches"),
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) throw new Error("Match not found.");

    const playerIdStr = String(args.playerId);
    const xStr = match.players?.X ? String(match.players.X) : null;
    const oStr = match.players?.O ? String(match.players.O) : null;

    if (xStr !== playerIdStr && oStr !== playerIdStr) {
      throw new Error("You are not a participant in this match.");
    }

    await ctx.db.patch(args.matchId, { deletedAt: Date.now() });
    return { ok: true };
  },
});

export const unarchiveMatch = mutation({
  args: {
    matchId: v.id("matches"),
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) throw new Error("Match not found.");

    const playerIdStr = String(args.playerId);
    const xStr = match.players?.X ? String(match.players.X) : null;
    const oStr = match.players?.O ? String(match.players.O) : null;

    if (xStr !== playerIdStr && oStr !== playerIdStr) {
      throw new Error("You are not a participant in this match.");
    }

    await ctx.db.patch(args.matchId, { deletedAt: undefined });
    return { ok: true };
  },
});
