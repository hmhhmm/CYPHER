import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create a new analysis session
export const create = mutation({
  args: {
    sessionId: v.string(),
    userId: v.optional(v.string()),
    originalQuery: v.string(),
    ticker: v.string(),
    company: v.string(),
    year: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    const analysisId = await ctx.db.insert("analyses", {
      sessionId: args.sessionId,
      userId: args.userId,
      originalQuery: args.originalQuery,
      ticker: args.ticker.toUpperCase(),
      company: args.company,
      year: args.year,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });
    
    return analysisId;
  },
});

// Update analysis status
export const updateStatus = mutation({
  args: {
    sessionId: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("extracting_intent"),
      v.literal("searching_pdf"),
      v.literal("harvesting"),
      v.literal("generating_debate"),
      v.literal("generating_report"),
      v.literal("synthesizing_audio"),
      v.literal("complete"),
      v.literal("error")
    ),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const analysis = await ctx.db
      .query("analyses")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();
    
    if (!analysis) {
      throw new Error("Analysis not found");
    }
    
    await ctx.db.patch(analysis._id, {
      status: args.status,
      errorMessage: args.errorMessage,
      updatedAt: Date.now(),
    });
  },
});

// Store source documents from Apify search
export const storeSourceDocuments = mutation({
  args: {
    sessionId: v.string(),
    sourceDocuments: v.array(v.object({
      title: v.string(),
      url: v.string(),
      snippet: v.string(),
      source: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    const analysis = await ctx.db
      .query("analyses")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();
    
    if (!analysis) {
      throw new Error("Analysis not found");
    }
    
    await ctx.db.patch(analysis._id, {
      sourceDocuments: args.sourceDocuments,
      status: "harvesting",
      updatedAt: Date.now(),
    });
  },
});

// Add a single source document to existing list
export const addSourceDocument = mutation({
  args: {
    sessionId: v.string(),
    document: v.object({
      title: v.string(),
      url: v.string(),
      snippet: v.string(),
      source: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    const analysis = await ctx.db
      .query("analyses")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();
    
    if (!analysis) {
      throw new Error("Analysis not found");
    }
    
    const existingDocs = analysis.sourceDocuments || [];
    const updatedDocs = [...existingDocs, args.document];
    
    await ctx.db.patch(analysis._id, {
      sourceDocuments: updatedDocs,
      updatedAt: Date.now(),
    });
  },
});

// Store harvested PDF data
export const storeHarvestedData = mutation({
  args: {
    sessionId: v.string(),
    pdfUrl: v.string(),
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
    const analysis = await ctx.db
      .query("analyses")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();
    
    if (!analysis) {
      throw new Error("Analysis not found");
    }
    
    await ctx.db.patch(analysis._id, {
      pdfUrl: args.pdfUrl,
      harvestedData: args.harvestedData,
      status: "generating_debate",
      updatedAt: Date.now(),
    });
  },
});

// Store debate script
export const storeDebateScript = mutation({
  args: {
    sessionId: v.string(),
    debateScript: v.array(v.object({
      id: v.number(),
      speaker: v.string(),
      text: v.string(),
      duration_estimate: v.number(),
      start: v.number(),
      end: v.number(),
      visual_evidence: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const analysis = await ctx.db
      .query("analyses")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();
    
    if (!analysis) {
      throw new Error("Analysis not found");
    }
    
    await ctx.db.patch(analysis._id, {
      debateScript: args.debateScript,
      status: "synthesizing_audio",
      updatedAt: Date.now(),
    });
  },
});

// Store analysis report
export const storeAnalysisReport = mutation({
  args: {
    sessionId: v.string(),
    analysisReport: v.object({
      summary: v.string(),
      financialAnalysis: v.string(),
      keyStrengths: v.array(v.string()),
      keyRisks: v.array(v.string()),
      marketOutlook: v.string(),
      recommendation: v.optional(v.string()),
      generatedAt: v.number(),
      company: v.string(),
      ticker: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    const analysis = await ctx.db
      .query("analyses")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();
    
    if (!analysis) {
      throw new Error("Analysis not found");
    }
    
    await ctx.db.patch(analysis._id, {
      analysisReport: args.analysisReport,
      status: "synthesizing_audio",
      updatedAt: Date.now(),
    });
  },
});

// Store audio URL and mark complete
export const storeAudio = mutation({
  args: {
    sessionId: v.string(),
    audioUrl: v.string(),
    audioDuration: v.number(),
  },
  handler: async (ctx, args) => {
    const analysis = await ctx.db
      .query("analyses")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();
    
    if (!analysis) {
      throw new Error("Analysis not found");
    }
    
    await ctx.db.patch(analysis._id, {
      audioUrl: args.audioUrl,
      audioDuration: args.audioDuration,
      status: "complete",
      updatedAt: Date.now(),
    });
  },
});

// Get analysis by session ID
export const getBySession = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("analyses")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();
  },
});

// Get analysis by ticker
export const getByTicker = query({
  args: { ticker: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("analyses")
      .withIndex("by_ticker", (q) => q.eq("ticker", args.ticker.toUpperCase()))
      .order("desc")
      .first();
  },
});

// Get recent analyses for a user
export const getRecent = query({
  args: { 
    userId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("analyses").order("desc");
    
    if (args.userId) {
      query = ctx.db
        .query("analyses")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .order("desc");
    }
    
    return await query.take(args.limit || 10);
  },
});

// Check if we have a cached analysis for this ticker/year
export const getCached = query({
  args: { 
    ticker: v.string(),
    year: v.number(),
  },
  handler: async (ctx, args) => {
    const cached = await ctx.db
      .query("analyses")
      .withIndex("by_ticker", (q) => q.eq("ticker", args.ticker.toUpperCase()))
      .filter((q) => 
        q.and(
          q.eq(q.field("year"), args.year),
          q.eq(q.field("status"), "complete")
        )
      )
      .first();
    
    return cached;
  },
});


