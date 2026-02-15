import { mutationGeneric as mutation, queryGeneric as query } from "convex/server";
import { v } from "convex/values";
import { uniqueNamesGenerator, adjectives, animals } from "unique-names-generator";

function createGuestId() {
  const random = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `guest_${random}`;
}

function createGuestSecret() {
  return [
    Math.random().toString(36).slice(2, 10),
    Math.random().toString(36).slice(2, 10),
    Math.random().toString(36).slice(2, 10),
  ].join("");
}

function createDisplayName() {
  return uniqueNamesGenerator({
    dictionaries: [adjectives, animals],
    separator: "-",
    style: "lowerCase",
    length: 2,
  });
}

export const createGuestPlayer = mutation({
  args: {
    displayName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const guestId = createGuestId();
    const guestSecret = createGuestSecret();
    const now = Date.now();
    const displayName = args.displayName?.trim() || createDisplayName();

    const playerId = await ctx.db.insert("players", {
      displayName,
      guestId,
      guestSecret,
      identityTier: "guest",
      lastSeenAt: now,
      createdAt: now,
    });

    return {
      playerId,
      guestId,
      guestSecret,
      displayName,
      identityTier: "guest" as const,
    };
  },
});

export const getPlayerById = query({
  args: {
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    return ctx.db.get(args.playerId);
  },
});

export const listPlayers = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 20, 1), 100);
    return ctx.db.query("players").order("desc").take(limit);
  },
});

export const getPlayersByIds = query({
  args: {
    playerIds: v.array(v.id("players")),
  },
  handler: async (ctx, args) => {
    const uniqueIds = Array.from(new Set(args.playerIds));
    const docs = await Promise.all(uniqueIds.map((id) => ctx.db.get(id)));
    return docs.filter((doc): doc is NonNullable<typeof doc> => doc !== null);
  },
});

export const updateDisplayName = mutation({
  args: {
    playerId: v.id("players"),
    displayName: v.string(),
  },
  handler: async (ctx, args) => {
    const trimmed = args.displayName.trim();
    if (!trimmed || trimmed.length > 30) throw new Error("Name must be 1-30 characters");
    await ctx.db.patch(args.playerId, { displayName: trimmed });
    return { displayName: trimmed };
  },
});

export const validateGuestSession = mutation({
  args: {
    playerId: v.id("players"),
    guestSecret: v.string(),
  },
  handler: async (ctx, args) => {
    const player = await ctx.db.get(args.playerId);
    if (!player || !player.guestSecret || player.guestSecret !== args.guestSecret) {
      return {
        ok: false as const,
      };
    }

    await ctx.db.patch(player._id, {
      lastSeenAt: Date.now(),
    });

    return {
      ok: true as const,
      player: await ctx.db.get(player._id),
    };
  },
});
