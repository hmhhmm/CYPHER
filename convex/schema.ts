import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Analysis sessions - main table tracking the analysis pipeline
  analyses: defineTable({
    sessionId: v.string(),
    userId: v.optional(v.string()),
    
    // Query information
    originalQuery: v.string(),
    ticker: v.string(),
    company: v.string(),
    year: v.number(),
    
    // Pipeline status
    status: v.union(
      v.literal("pending"),
      v.literal("extracting_intent"),
      v.literal("searching_pdf"),
      v.literal("harvesting"),
      v.literal("generating_debate"),
      v.literal("synthesizing_audio"),
      v.literal("complete"),
      v.literal("error")
    ),
    errorMessage: v.optional(v.string()),
    
    // Harvested data from PDF
    harvestedData: v.optional(v.object({
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
    })),
    
    // PDF information
    pdfUrl: v.optional(v.string()),
    pdfHash: v.optional(v.string()),
    
    // Source documents from Apify search (all PDFs found)
    sourceDocuments: v.optional(v.array(v.object({
      title: v.string(),
      url: v.string(),
      snippet: v.string(),
      source: v.string(),
    }))),
    
    // Debate script
    debateScript: v.optional(v.array(v.object({
      id: v.number(),
      speaker: v.string(),
      text: v.string(),
      duration_estimate: v.number(),
      start: v.number(),
      end: v.number(),
      visual_evidence: v.optional(v.string()),
    }))),
    
    // Audio output
    audioUrl: v.optional(v.string()),
    audioDuration: v.optional(v.number()),
    
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_session", ["sessionId"])
    .index("by_ticker", ["ticker"])
    .index("by_status", ["status"])
    .index("by_user", ["userId"]),

  // Partial intents for multi-turn clarification
  partialIntents: defineTable({
    sessionId: v.string(),
    userId: v.optional(v.string()),
    
    // Extracted intent (may be incomplete)
    company: v.optional(v.string()),
    ticker: v.optional(v.string()),
    year: v.optional(v.number()),
    request: v.optional(v.string()),
    
    // Clarification status
    status: v.union(
      v.literal("awaiting_clarification"),
      v.literal("resolved"),
      v.literal("expired")
    ),
    suggestions: v.optional(v.array(v.object({
      ticker: v.string(),
      company: v.string(),
    }))),
    
    // Message history for context
    messageHistory: v.array(v.object({
      role: v.union(v.literal("user"), v.literal("assistant")),
      content: v.string(),
      timestamp: v.number(),
    })),
    
    createdAt: v.number(),
    updatedAt: v.number(),
    expiresAt: v.number(),
  })
    .index("by_session", ["sessionId"])
    .index("by_status", ["status"]),

  // Cached PDF data to avoid re-processing
  pdfCache: defineTable({
    pdfUrl: v.string(),
    pdfHash: v.string(),
    ticker: v.string(),
    
    // Cached content
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
    
    createdAt: v.number(),
    expiresAt: v.number(),
  })
    .index("by_url", ["pdfUrl"])
    .index("by_hash", ["pdfHash"])
    .index("by_ticker", ["ticker"]),

  // News articles cache
  news: defineTable({
    ticker: v.string(),
    company: v.string(),
    articles: v.array(v.object({
      title: v.string(),
      url: v.string(),
      snippet: v.string(),
      source: v.string(),
      publishedDate: v.string(),
    })),
    fetchedAt: v.number(),
  }).index("by_ticker", ["ticker"]),
});


