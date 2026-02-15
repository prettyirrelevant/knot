import { queryGeneric as query } from "convex/server";
import { v } from "convex/values";

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
