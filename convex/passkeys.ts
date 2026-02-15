import { mutationGeneric as mutation, queryGeneric as query } from "convex/server";
import { v } from "convex/values";

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

export const createChallenge = mutation({
  args: {
    challenge: v.string(),
    flow: v.union(v.literal("register"), v.literal("authenticate")),
    playerId: v.optional(v.id("players")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const expiresAt = now + CHALLENGE_TTL_MS;
    await ctx.db.insert("webauthnChallenges", {
      challenge: args.challenge,
      flow: args.flow,
      playerId: args.playerId,
      expiresAt,
      createdAt: now,
    });

    return { expiresAt };
  },
});

export const consumeChallenge = mutation({
  args: {
    challenge: v.string(),
    flow: v.union(v.literal("register"), v.literal("authenticate")),
    playerId: v.optional(v.id("players")),
  },
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query("webauthnChallenges")
      .withIndex("by_challenge", (q) => q.eq("challenge", args.challenge))
      .first();

    if (!record || record.flow !== args.flow) {
      return { ok: false as const, reason: "CHALLENGE_NOT_FOUND" };
    }

    if (record.usedAt) {
      return { ok: false as const, reason: "CHALLENGE_ALREADY_USED" };
    }

    if (Date.now() > Number(record.expiresAt)) {
      return { ok: false as const, reason: "CHALLENGE_EXPIRED" };
    }

    if (args.playerId && String(record.playerId) !== String(args.playerId)) {
      return { ok: false as const, reason: "CHALLENGE_PLAYER_MISMATCH" };
    }

    await ctx.db.patch(record._id, {
      usedAt: Date.now(),
    });

    return {
      ok: true as const,
      playerId: record.playerId,
    };
  },
});

export const listCredentialsForPlayer = query({
  args: {
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const credentials = await ctx.db
      .query("webauthnCredentials")
      .withIndex("by_playerId", (q) => q.eq("playerId", args.playerId))
      .collect();

    return credentials.map((credential) => ({
      id: credential.credentialID,
      transports: credential.transports ?? [],
    }));
  },
});

export const getCredentialByCredentialId = query({
  args: {
    credentialID: v.string(),
  },
  handler: async (ctx, args) => {
    return ctx.db
      .query("webauthnCredentials")
      .withIndex("by_credentialID", (q) => q.eq("credentialID", args.credentialID))
      .first();
  },
});

export const upsertCredential = mutation({
  args: {
    playerId: v.id("players"),
    credentialID: v.string(),
    publicKey: v.string(),
    counter: v.number(),
    deviceType: v.union(v.literal("singleDevice"), v.literal("multiDevice")),
    backedUp: v.boolean(),
    transports: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("webauthnCredentials")
      .withIndex("by_credentialID", (q) => q.eq("credentialID", args.credentialID))
      .first();

    const now = Date.now();
    if (existing && String(existing.playerId) !== String(args.playerId)) {
      return {
        ok: false as const,
        reason: "CREDENTIAL_ALREADY_BOUND",
      };
    }

    if (existing) {
      await ctx.db.patch(existing._id, {
        publicKey: args.publicKey,
        counter: args.counter,
        deviceType: args.deviceType,
        backedUp: args.backedUp,
        transports: args.transports,
      });
    } else {
      await ctx.db.insert("webauthnCredentials", {
        playerId: args.playerId,
        credentialID: args.credentialID,
        publicKey: args.publicKey,
        counter: args.counter,
        deviceType: args.deviceType,
        backedUp: args.backedUp,
        transports: args.transports,
        createdAt: now,
        lastUsedAt: now,
      });
    }

    await ctx.db.patch(args.playerId, {
      identityTier: "secured",
      lastSeenAt: now,
    });

    return {
      ok: true as const,
    };
  },
});

export const recordAuthentication = mutation({
  args: {
    credentialID: v.string(),
    newCounter: v.number(),
  },
  handler: async (ctx, args) => {
    const credential = await ctx.db
      .query("webauthnCredentials")
      .withIndex("by_credentialID", (q) => q.eq("credentialID", args.credentialID))
      .first();

    if (!credential) {
      return { ok: false as const, reason: "CREDENTIAL_NOT_FOUND" };
    }

    const now = Date.now();
    await ctx.db.patch(credential._id, {
      counter: args.newCounter,
      lastUsedAt: now,
    });

    const player = await ctx.db.get(credential.playerId);
    if (!player) {
      return { ok: false as const, reason: "PLAYER_NOT_FOUND" };
    }

    await ctx.db.patch(player._id, {
      identityTier: "secured",
      lastSeenAt: now,
    });

    return {
      ok: true as const,
      player,
    };
  },
});
