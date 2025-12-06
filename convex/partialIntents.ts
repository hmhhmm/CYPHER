import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create a partial intent for clarification
export const create = mutation({
  args: {
    sessionId: v.string(),
    userId: v.optional(v.string()),
    company: v.optional(v.string()),
    ticker: v.optional(v.string()),
    year: v.optional(v.number()),
    request: v.optional(v.string()),
    suggestions: v.optional(v.array(v.object({
      ticker: v.string(),
      company: v.string(),
    }))),
    initialMessage: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const expiresAt = now + (30 * 60 * 1000); // 30 minutes expiry
    
    const intentId = await ctx.db.insert("partialIntents", {
      sessionId: args.sessionId,
      userId: args.userId,
      company: args.company,
      ticker: args.ticker,
      year: args.year,
      request: args.request,
      status: "awaiting_clarification",
      suggestions: args.suggestions,
      messageHistory: [{
        role: "user",
        content: args.initialMessage,
        timestamp: now,
      }],
      createdAt: now,
      updatedAt: now,
      expiresAt,
    });
    
    return intentId;
  },
});

// Update partial intent with user's clarification
export const addClarification = mutation({
  args: {
    sessionId: v.string(),
    message: v.string(),
    role: v.union(v.literal("user"), v.literal("assistant")),
  },
  handler: async (ctx, args) => {
    const intent = await ctx.db
      .query("partialIntents")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();
    
    if (!intent) {
      throw new Error("Partial intent not found");
    }
    
    const updatedHistory = [
      ...intent.messageHistory,
      {
        role: args.role,
        content: args.message,
        timestamp: Date.now(),
      },
    ];
    
    await ctx.db.patch(intent._id, {
      messageHistory: updatedHistory,
      updatedAt: Date.now(),
    });
  },
});

// Resolve partial intent with final values
export const resolve = mutation({
  args: {
    sessionId: v.string(),
    company: v.string(),
    ticker: v.string(),
    year: v.number(),
    request: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const intent = await ctx.db
      .query("partialIntents")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();
    
    if (!intent) {
      throw new Error("Partial intent not found");
    }
    
    await ctx.db.patch(intent._id, {
      company: args.company,
      ticker: args.ticker,
      year: args.year,
      request: args.request,
      status: "resolved",
      updatedAt: Date.now(),
    });
    
    return {
      company: args.company,
      ticker: args.ticker,
      year: args.year,
      request: args.request,
    };
  },
});

// Get partial intent by session
export const getBySession = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("partialIntents")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();
  },
});

// Mark expired intents
export const expireOld = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    
    const expiredIntents = await ctx.db
      .query("partialIntents")
      .withIndex("by_status", (q) => q.eq("status", "awaiting_clarification"))
      .filter((q) => q.lt(q.field("expiresAt"), now))
      .collect();
    
    for (const intent of expiredIntents) {
      await ctx.db.patch(intent._id, {
        status: "expired",
        updatedAt: now,
      });
    }
    
    return expiredIntents.length;
  },
});


