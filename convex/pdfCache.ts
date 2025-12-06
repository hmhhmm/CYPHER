import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Cache harvested PDF data
export const cache = mutation({
  args: {
    pdfUrl: v.string(),
    pdfHash: v.string(),
    ticker: v.string(),
    harvestedData: v.object({
      meta: v.object({
        ticker: v.string(),
        company: v.string(),
        report_type: v.string(),
        period: v.string(),
        source_url: v.string(),
      }),
      content: v.object({
        management_discussion: v.string(),
        risk_factors: v.string(),
        key_financials: v.string(),
      }),
    }),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const expiresAt = now + (7 * 24 * 60 * 60 * 1000); // 7 days cache
    
    // Check if already cached
    const existing = await ctx.db
      .query("pdfCache")
      .withIndex("by_hash", (q) => q.eq("pdfHash", args.pdfHash))
      .first();
    
    if (existing) {
      // Update expiry
      await ctx.db.patch(existing._id, {
        expiresAt,
      });
      return existing._id;
    }
    
    // Create new cache entry
    const cacheId = await ctx.db.insert("pdfCache", {
      pdfUrl: args.pdfUrl,
      pdfHash: args.pdfHash,
      ticker: args.ticker.toUpperCase(),
      harvestedData: args.harvestedData,
      createdAt: now,
      expiresAt,
    });
    
    return cacheId;
  },
});

// Get cached PDF data by URL
export const getByUrl = query({
  args: { pdfUrl: v.string() },
  handler: async (ctx, args) => {
    const cached = await ctx.db
      .query("pdfCache")
      .withIndex("by_url", (q) => q.eq("pdfUrl", args.pdfUrl))
      .first();
    
    if (cached && cached.expiresAt > Date.now()) {
      return cached;
    }
    
    return null;
  },
});

// Get cached PDF data by hash
export const getByHash = query({
  args: { pdfHash: v.string() },
  handler: async (ctx, args) => {
    const cached = await ctx.db
      .query("pdfCache")
      .withIndex("by_hash", (q) => q.eq("pdfHash", args.pdfHash))
      .first();
    
    if (cached && cached.expiresAt > Date.now()) {
      return cached;
    }
    
    return null;
  },
});

// Get cached PDF data by ticker
export const getByTicker = query({
  args: { ticker: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("pdfCache")
      .withIndex("by_ticker", (q) => q.eq("ticker", args.ticker.toUpperCase()))
      .filter((q) => q.gt(q.field("expiresAt"), Date.now()))
      .collect();
  },
});

// Clean up expired cache entries
export const cleanExpired = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    
    const expired = await ctx.db
      .query("pdfCache")
      .filter((q) => q.lt(q.field("expiresAt"), now))
      .collect();
    
    for (const entry of expired) {
      await ctx.db.delete(entry._id);
    }
    
    return expired.length;
  },
});


