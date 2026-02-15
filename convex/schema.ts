import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  players: defineTable({
    displayName: v.string(),
    guestId: v.optional(v.string()),
    guestSecret: v.optional(v.string()),
    identityTier: v.optional(v.union(v.literal("guest"), v.literal("secured"))),
    lastSeenAt: v.optional(v.number()),
    claimedUserId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_guestId", ["guestId"])
    .index("by_claimedUserId", ["claimedUserId"]),

  matches: defineTable({
    roomCode: v.string(),
    config: v.object({
      size: v.number(),
      winLength: v.number(),
      turnTimeSec: v.number(),
      presetId: v.optional(v.string()),
      symbolSkinId: v.optional(v.string()),
    }),
    status: v.union(
      v.literal("waiting"),
      v.literal("active"),
      v.literal("won"),
      v.literal("draw"),
      v.literal("timeout"),
      v.literal("resigned"),
    ),
    board: v.array(v.union(v.literal("X"), v.literal("O"), v.null())),
    players: v.object({
      X: v.optional(v.id("players")),
      O: v.optional(v.id("players")),
    }),
    nextPlayer: v.union(v.literal("X"), v.literal("O")),
    roundNumber: v.number(),
    turnNumber: v.number(),
    turnDeadlineAt: v.number(),
    rematchRequestedBy: v.optional(v.union(v.literal("X"), v.literal("O"))),
    winner: v.optional(v.union(v.literal("X"), v.literal("O"))),
    winningLine: v.optional(v.array(v.number())),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_roomCode", ["roomCode"])
    .index("by_status", ["status"]),

  moves: defineTable({
    matchId: v.id("matches"),
    roundNumber: v.number(),
    turn: v.number(),
    playerId: v.id("players"),
    symbol: v.union(v.literal("X"), v.literal("O")),
    cellIndex: v.number(),
    playedAt: v.number(),
    deadlineAt: v.number(),
  }).index("by_match_turn", ["matchId", "turn"]),

  ratings: defineTable({
    playerId: v.id("players"),
    elo: v.number(),
    gamesPlayed: v.number(),
    provisionalUntil: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index("by_playerId", ["playerId"])
    .index("by_elo", ["elo"]),

  h2hStats: defineTable({
    playerLowId: v.id("players"),
    playerHighId: v.id("players"),
    lowWins: v.number(),
    highWins: v.number(),
    draws: v.number(),
    lastPlayedAt: v.number(),
  }).index("by_pair", ["playerLowId", "playerHighId"]),

  ratingEvents: defineTable({
    matchId: v.id("matches"),
    roundNumber: v.number(),
    playerId: v.id("players"),
    beforeElo: v.number(),
    afterElo: v.number(),
    delta: v.number(),
    createdAt: v.number(),
  })
    .index("by_matchId", ["matchId"])
    .index("by_playerId", ["playerId"]),

  webauthnCredentials: defineTable({
    playerId: v.id("players"),
    credentialID: v.string(),
    publicKey: v.string(),
    counter: v.number(),
    deviceType: v.union(v.literal("singleDevice"), v.literal("multiDevice")),
    backedUp: v.boolean(),
    transports: v.optional(v.array(v.string())),
    createdAt: v.number(),
    lastUsedAt: v.optional(v.number()),
  })
    .index("by_playerId", ["playerId"])
    .index("by_credentialID", ["credentialID"]),

  webauthnChallenges: defineTable({
    challenge: v.string(),
    flow: v.union(v.literal("register"), v.literal("authenticate")),
    playerId: v.optional(v.id("players")),
    expiresAt: v.number(),
    usedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_challenge", ["challenge"])
    .index("by_expiresAt", ["expiresAt"]),
});
