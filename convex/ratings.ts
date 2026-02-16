import { queryGeneric as query } from "convex/server";
import { v } from "convex/values";

type SymbolToken = "X" | "O";

export const getLeaderboard = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 25, 1), 100);
    const ratings = await ctx.db.query("ratings").withIndex("by_elo").order("desc").take(limit);
    return Promise.all(
      ratings.map(async (entry) => {
        const player = await ctx.db.get(entry.playerId);
        return {
          ...entry,
          playerDisplayName: player?.displayName ?? String(entry.playerId),
          playerIdentityTier: player?.identityTier ?? "guest",
        };
      }),
    );
  },
});

export const getPlayerRating = query({
  args: { playerId: v.id("players") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("ratings")
      .withIndex("by_playerId", (q) => q.eq("playerId", args.playerId))
      .first();
  },
});

export const getHeadToHead = query({
  args: {
    playerAId: v.id("players"),
    playerBId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const [low, high] = [args.playerAId, args.playerBId].sort();
    return ctx.db
      .query("h2hStats")
      .withIndex("by_pair", (q) => q.eq("playerLowId", low))
      .filter((q) => q.eq(q.field("playerHighId"), high))
      .first();
  },
});

export const getHeadToHeadDetails = query({
  args: {
    playerAId: v.id("players"),
    playerBId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("ratingEvents")
      .withIndex("by_playerId", (q: any) => q.eq("playerId", args.playerAId))
      .collect();

    const seenMatchIds = new Set<string>();
    const uniqueMatchIds: string[] = [];
    for (const event of events) {
      const key = String(event.matchId);
      if (!seenMatchIds.has(key)) {
        seenMatchIds.add(key);
        uniqueMatchIds.push(key);
      }
    }

    const terminalStatuses = new Set(["won", "draw", "timeout", "resigned"]);
    const playerBStr = String(args.playerBId);

    const bySize: Record<number, { wins: number; losses: number; draws: number }> = {};
    let totalMatches = 0;
    let currentStreak = 0;
    let bestStreak = 0;
    let lastPlayedAt: number | null = null;
    const results: Array<{ won: boolean; drew: boolean; timestamp: number }> = [];

    for (const matchIdStr of uniqueMatchIds) {
      const match = await ctx.db.get(matchIdStr as any);
      if (!match) continue;
      if (!terminalStatuses.has(match.status)) continue;

      const xStr = match.players?.X ? String(match.players.X) : null;
      const oStr = match.players?.O ? String(match.players.O) : null;
      if (xStr !== playerBStr && oStr !== playerBStr) continue;

      totalMatches++;
      const size = match.config?.size ?? 3;
      if (!bySize[size]) bySize[size] = { wins: 0, losses: 0, draws: 0 };

      const playerASymbol: SymbolToken | null =
        xStr === String(args.playerAId) ? "X" : oStr === String(args.playerAId) ? "O" : null;
      if (!playerASymbol) continue;

      const isDraw = match.status === "draw";
      const playerAWon = !isDraw && match.winner === playerASymbol;
      const playerALost = !isDraw && !playerAWon;

      if (isDraw) bySize[size].draws++;
      else if (playerAWon) bySize[size].wins++;
      else if (playerALost) bySize[size].losses++;

      const timestamp = match.updatedAt ?? match.createdAt ?? 0;
      if (lastPlayedAt === null || timestamp > lastPlayedAt) lastPlayedAt = timestamp;

      results.push({ won: playerAWon, drew: isDraw, timestamp });
    }

    results.sort((a, b) => b.timestamp - a.timestamp);
    for (const r of results) {
      if (r.won) currentStreak++;
      else break;
    }

    let streak = 0;
    for (const r of results) {
      if (r.won) { streak++; bestStreak = Math.max(bestStreak, streak); }
      else streak = 0;
    }

    return {
      totalMatches,
      bySize: Object.entries(bySize)
        .map(([size, stats]) => ({ size: Number(size), ...stats }))
        .sort((a, b) => a.size - b.size),
      currentStreak,
      bestStreak,
      lastPlayedAt,
    };
  },
});

export const getRoundRatingEvents = query({
  args: {
    matchId: v.id("matches"),
    roundNumber: v.number(),
    playerId: v.optional(v.id("players")),
  },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("ratingEvents")
      .withIndex("by_matchId", (q) => q.eq("matchId", args.matchId))
      .filter((q) => q.eq(q.field("roundNumber"), args.roundNumber))
      .collect();

    const normalized = events
      .sort((a, b) => Number(a.createdAt) - Number(b.createdAt))
      .map((event) => ({
        playerId: event.playerId,
        delta: Number(event.delta),
        beforeElo: Number(event.beforeElo),
        afterElo: Number(event.afterElo),
      }));

    const myEvent = args.playerId
      ? normalized.find((event) => String(event.playerId) === String(args.playerId))
      : undefined;

    return {
      roundNumber: args.roundNumber,
      events: normalized,
      myDelta: myEvent?.delta,
    };
  },
});
