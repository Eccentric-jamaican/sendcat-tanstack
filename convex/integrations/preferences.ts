import { v } from "convex/values";
import { query, mutation, internalQuery } from "../_generated/server";
import { getAuthUserId } from "../auth";

export const getByUserId = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();
  },
});

export const get = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
  },
});

export const update = mutation({
  args: {
    autoCreatePreAlerts: v.optional(v.boolean()),
    gmailSyncEnabled: v.optional(v.boolean()),
    whatsappSyncEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Authentication required");

    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (existing) {
      const patch: Record<string, boolean> = {};
      if (args.autoCreatePreAlerts !== undefined)
        patch.autoCreatePreAlerts = args.autoCreatePreAlerts;
      if (args.gmailSyncEnabled !== undefined)
        patch.gmailSyncEnabled = args.gmailSyncEnabled;
      if (args.whatsappSyncEnabled !== undefined)
        patch.whatsappSyncEnabled = args.whatsappSyncEnabled;
      await ctx.db.patch(existing._id, patch);
    } else {
      await ctx.db.insert("userPreferences", {
        userId,
        autoCreatePreAlerts: args.autoCreatePreAlerts ?? false,
        gmailSyncEnabled: args.gmailSyncEnabled ?? true,
        whatsappSyncEnabled: args.whatsappSyncEnabled ?? true,
      });
    }
  },
});
