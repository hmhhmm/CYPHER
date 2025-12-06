import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Store news articles
export const storeNews = mutation({
  args: {
    ticker: v.string(),
    company: v.string(),
    articles: v.array(v.object({
      title: v.string(),
      url: v.string(),
      snippet: v.string(),
      source: v.string(),
      publishedDate: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    // Check if news exists for this ticker (last 24 hours)
    const existing = await ctx.db
      .query("news")
      .withIndex("by_ticker", (q) => q.eq("ticker", args.ticker))
      .order("desc")
      .first();

    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    
    if (existing && existing.fetchedAt > dayAgo) {
      // Update existing
      await ctx.db.patch(existing._id, {
        articles: args.articles,
        fetchedAt: Date.now(),
      });
      return existing._id;
    }

    // Create new
    return await ctx.db.insert("news", {
      ticker: args.ticker.toUpperCase(),
      company: args.company,
      articles: args.articles,
      fetchedAt: Date.now(),
    });
  },
});

// Get news by ticker
export const getByTicker = query({
  args: { ticker: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("news")
      .withIndex("by_ticker", (q) => q.eq("ticker", args.ticker.toUpperCase()))
      .order("desc")
      .first();
  },
});

// Get recent news (all tickers)
export const getRecent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("news")
      .order("desc")
      .take(args.limit || 10);
  },
});
