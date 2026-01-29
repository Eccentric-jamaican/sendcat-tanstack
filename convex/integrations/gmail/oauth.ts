import { v } from "convex/values";
import { internalMutation, internalQuery } from "../../_generated/server";
import { encrypt } from "../crypto";

export const storeGmailConnection = internalMutation({
  args: {
    userId: v.string(),
    email: v.string(),
    encryptedRefreshToken: v.string(),
    accessToken: v.string(),
    accessTokenExpiresAt: v.number(),
    historyId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const encryptedAccessToken = await encrypt(args.accessToken);
    const existing = await ctx.db
      .query("integrationsGmail")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        email: args.email,
        encryptedRefreshToken: args.encryptedRefreshToken,
        accessToken: encryptedAccessToken,
        accessTokenExpiresAt: args.accessTokenExpiresAt,
        historyId: args.historyId,
        status: "active" as const,
        lastSyncAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("integrationsGmail", {
      userId: args.userId,
      email: args.email,
      encryptedRefreshToken: args.encryptedRefreshToken,
      accessToken: encryptedAccessToken,
      accessTokenExpiresAt: args.accessTokenExpiresAt,
      historyId: args.historyId,
      status: "active",
      connectedAt: Date.now(),
    });
  },
});

export const getGmailConnection = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("integrationsGmail")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();
  },
});

export const getConnectionByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("integrationsGmail")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
  },
});

export const listActiveConnections = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("integrationsGmail")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();
  },
});

export const updateAccessToken = internalMutation({
  args: {
    connectionId: v.id("integrationsGmail"),
    accessToken: v.string(),
    accessTokenExpiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const encryptedAccessToken = await encrypt(args.accessToken);
    await ctx.db.patch(args.connectionId, {
      accessToken: encryptedAccessToken,
      accessTokenExpiresAt: args.accessTokenExpiresAt,
    });
  },
});

export const updateHistoryId = internalMutation({
  args: {
    connectionId: v.id("integrationsGmail"),
    historyId: v.string(),
    lastSyncAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.connectionId, {
      historyId: args.historyId,
      lastSyncAt: args.lastSyncAt,
    });
  },
});

export const updateWatchExpiration = internalMutation({
  args: {
    connectionId: v.id("integrationsGmail"),
    watchExpiration: v.number(),
    historyId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.connectionId, {
      watchExpiration: args.watchExpiration,
      historyId: args.historyId,
    });
  },
});

export const markDisconnected = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const connection = await ctx.db
      .query("integrationsGmail")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();
    if (connection) {
      await ctx.db.patch(connection._id, { status: "disconnected" as const });
    }
  },
});
