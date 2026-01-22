import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const create = mutation({
  args: { 
    title: v.optional(v.string()), 
    modelId: v.string(), 
    sessionId: v.string() 
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("threads", {
      ...args,
      lastMessageAt: Date.now(),
    });
  },
});

export const list = query({
  args: { sessionId: v.string(), search: v.optional(v.string()) },
  handler: async (ctx, args) => {
    let threads = await ctx.db
      .query("threads")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
    
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      threads = threads.filter(t => 
        t.title?.toLowerCase().includes(searchLower)
      );
    }
    
    // Sort: Pinned first, then by lastMessageAt desc
    return threads.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return (b.lastMessageAt ?? 0) - (a.lastMessageAt ?? 0);
    });
  },
});

export const remove = mutation({
  args: { id: v.id("threads") },
  handler: async (ctx, args) => {
    // Delete messages first
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_thread", (q) => q.eq("threadId", args.id))
      .collect();
    
    for (const msg of messages) {
      await ctx.db.delete(msg._id);
    }
    
    await ctx.db.delete(args.id);
  },
});

export const togglePinned = mutation({
  args: { id: v.id("threads") },
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.id);
    if (!thread) return;
    await ctx.db.patch(args.id, { isPinned: !thread.isPinned });
  },
});

export const rename = mutation({
  args: { id: v.id("threads"), title: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { title: args.title });
  },
});
