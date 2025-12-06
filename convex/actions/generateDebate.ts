"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";
import { api } from "../_generated/api";
import Anthropic from "@anthropic-ai/sdk";

// Initialize Anthropic client
const getAnthropicClient = () => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY environment variable is not set");
  }
  return new Anthropic({ apiKey });
};

// Model to use for all Anthropic calls
const ANTHROPIC_MODEL = "claude-sonnet-4-20250514";

// Types for debate script
interface DebateEntry {
  speaker: "Bull" | "Bear";
  text: string;
}

interface HarvestedData {
  meta: {
    ticker: string;
    company: string;
    report_type: string;
    period: string;
    source_url: string;
  };
  content: {
    management_discussion: string;
    risk_factors: string;
    key_financials: string;
  };
}

interface NewsArticle {
  title: string;
  url: string;
  snippet: string;
  source: string;
  publishedDate: string;
}

interface CompanyData {
  annualReport: string | null;
  news: NewsArticle[] | null;
  riskAnalysis: string | null;
  keyFinancials: string | null;
}

/**
 * Main action: Generate a debate script with video search term
 * 
 * Pipeline:
 * 1. Extract search term from user query using Anthropic
 * 2. Fetch company data from Convex (analyses, news, pdfCache)
 * 3. Generate debate script using Anthropic with fetched data
 */
export const generateDebateScript = action({
  args: {
    userQuery: v.string(),
    companyName: v.string(),
  },
  handler: async (ctx, args): Promise<{ searchTerm: string; debateScript: DebateEntry[] }> => {
    const { userQuery, companyName } = args;
    
    console.log(`[generateDebateScript] Starting for company: ${companyName}`);
    console.log(`[generateDebateScript] User query: ${userQuery}`);
    
    const anthropic = getAnthropicClient();
    
    // ==========================================
    // STEP 1: Extract Search Term (Anthropic)
    // ==========================================
    console.log("[Step 1] Extracting search term from user query...");
    
    let searchTerm: string;
    try {
      const searchTermResponse = await anthropic.messages.create({
        model: ANTHROPIC_MODEL,
        max_tokens: 100,
        system: `You are a search term extractor for stock videos. Given a user query about a company, extract a short, high-quality "Stock Video Search Term" that would find relevant B-roll footage for a financial video.

Rules:
- Return ONLY the search term, nothing else
- Keep it to 2-4 words maximum
- Focus on visual elements (office, technology, products, stores, etc.)
- Make it generic enough to find good stock footage
- Do not include the company ticker symbol

Examples:
- "Apple risks" → "Apple Store technology"
- "Tesla Q3 earnings" → "electric car factory"
- "Microsoft cloud growth" → "cloud computing data center"
- "Amazon logistics concerns" → "warehouse logistics delivery"`,
        messages: [
          {
            role: "user",
            content: `Company: ${companyName}\nUser Query: ${userQuery}\n\nExtract a stock video search term:`,
          },
        ],
      });
      
      const responseContent = searchTermResponse.content[0];
      if (responseContent.type !== "text") {
        throw new Error("Unexpected response type from Anthropic");
      }
      searchTerm = responseContent.text.trim();
      console.log(`[Step 1] Extracted search term: "${searchTerm}"`);
    } catch (error) {
      console.error("[Step 1] Error extracting search term:", error);
      // Fallback to company name + generic term
      searchTerm = `${companyName} business`;
      console.log(`[Step 1] Using fallback search term: "${searchTerm}"`);
    }
    
    // ==========================================
    // STEP 2: Fetch Convex Data
    // ==========================================
    console.log("[Step 2] Fetching company data from Convex...");
    
    const companyData: CompanyData = {
      annualReport: null,
      news: null,
      riskAnalysis: null,
      keyFinancials: null,
    };
    
    // Try to find the company by searching analyses
    // First, try to find by ticker (if company name looks like a ticker)
    const upperCompanyName = companyName.toUpperCase();
    
    // Fetch analysis data (contains harvestedData with annualReport, riskAnalysis, keyFinancials)
    try {
      // Try fetching by ticker first
      const analysisData = await ctx.runQuery(api.analyses.getByTicker, {
        ticker: upperCompanyName,
      });
      
      if (analysisData?.harvestedData) {
        const harvested = analysisData.harvestedData as HarvestedData;
        companyData.annualReport = harvested.content.management_discussion;
        companyData.riskAnalysis = harvested.content.risk_factors;
        companyData.keyFinancials = harvested.content.key_financials;
        console.log(`[Step 2] Found analysis data for ${analysisData.ticker}`);
      } else {
        console.log("[Step 2] No analysis data found for ticker, searching recent analyses...");
        
        // Search recent analyses for matching company name
        const recentAnalyses = await ctx.runQuery(api.analyses.getRecent, {
          limit: 50,
        });
        
        const matchingAnalysis = recentAnalyses?.find((a: any) => 
          a.company?.toLowerCase().includes(companyName.toLowerCase()) ||
          companyName.toLowerCase().includes(a.company?.toLowerCase() || "") ||
          a.ticker?.toLowerCase() === companyName.toLowerCase()
        );
        
        if (matchingAnalysis?.harvestedData) {
          const harvested = matchingAnalysis.harvestedData as HarvestedData;
          companyData.annualReport = harvested.content.management_discussion;
          companyData.riskAnalysis = harvested.content.risk_factors;
          companyData.keyFinancials = harvested.content.key_financials;
          console.log(`[Step 2] Found matching analysis for ${matchingAnalysis.company}`);
        }
      }
    } catch (error) {
      console.error("[Step 2] Error fetching analysis data:", error);
    }
    
    // Fetch news data
    try {
      const newsData = await ctx.runQuery(api.news.getByTicker, {
        ticker: upperCompanyName,
      });
      
      if (newsData?.articles) {
        companyData.news = newsData.articles;
        console.log(`[Step 2] Found ${newsData.articles.length} news articles`);
      } else {
        // Try getting recent news and filter
        const recentNews = await ctx.runQuery(api.news.getRecent, {
          limit: 20,
        });
        
        const matchingNews = recentNews?.find((n: any) =>
          n.company?.toLowerCase().includes(companyName.toLowerCase()) ||
          n.ticker?.toLowerCase() === companyName.toLowerCase()
        );
        
        if (matchingNews?.articles) {
          companyData.news = matchingNews.articles;
          console.log(`[Step 2] Found news for ${matchingNews.company}`);
        }
      }
    } catch (error) {
      console.error("[Step 2] Error fetching news data:", error);
    }
    
    // Also check pdfCache for additional data
    try {
      const cachedPdfs = await ctx.runQuery(api.pdfCache.getByTicker, {
        ticker: upperCompanyName,
      });
      
      if (cachedPdfs && cachedPdfs.length > 0) {
        // Use the most recent cached PDF if we don't have data yet
        const latestCache = cachedPdfs[0];
        if (!companyData.annualReport && latestCache.harvestedData) {
          const harvested = latestCache.harvestedData as HarvestedData;
          companyData.annualReport = harvested.content.management_discussion;
          companyData.riskAnalysis = harvested.content.risk_factors;
          companyData.keyFinancials = harvested.content.key_financials;
          console.log(`[Step 2] Found cached PDF data for ${latestCache.ticker}`);
        }
      }
    } catch (error) {
      console.error("[Step 2] Error fetching cached PDF data:", error);
    }
    
    console.log("[Step 2] Data fetch complete:", {
      hasAnnualReport: !!companyData.annualReport,
      hasNews: !!(companyData.news && companyData.news.length > 0),
      hasRiskAnalysis: !!companyData.riskAnalysis,
      hasKeyFinancials: !!companyData.keyFinancials,
    });
    
    // ==========================================
    // STEP 3: Generate Debate Script (Anthropic)
    // ==========================================
    console.log("[Step 3] Generating debate script with Anthropic...");
    
    // Build context from fetched data
    const contextParts: string[] = [];
    
    if (companyData.annualReport) {
      contextParts.push(`## Annual Report Summary (Management Discussion)\n${companyData.annualReport}`);
    }
    
    if (companyData.keyFinancials) {
      contextParts.push(`## Key Financial Metrics\n${companyData.keyFinancials}`);
    }
    
    if (companyData.riskAnalysis) {
      contextParts.push(`## Risk Factors\n${companyData.riskAnalysis}`);
    }
    
    if (companyData.news && companyData.news.length > 0) {
      const newsText = companyData.news
        .slice(0, 5) // Use top 5 news articles
        .map((article) => `- **${article.title}** (${article.source}): ${article.snippet}`)
        .join("\n");
      contextParts.push(`## Recent News\n${newsText}`);
    }
    
    const contextString = contextParts.length > 0
      ? contextParts.join("\n\n")
      : `No specific data found for ${companyName}. Generate a general analysis based on public knowledge about the company.`;
    
    let debateScript: DebateEntry[];
    try {
      const debateResponse = await anthropic.messages.create({
        model: ANTHROPIC_MODEL,
        max_tokens: 4000,
        system: `You are an expert financial debate scriptwriter creating compelling Bull vs Bear debates about public companies.

Your debates are:
- Data-driven: Always cite specific numbers and facts when available
- Balanced: Present both bullish and bearish perspectives fairly  
- Professional: Use appropriate financial terminology
- Engaging: Write in a conversational style suitable for video/podcast content
- Time-constrained: The entire script should be about 2 minutes when read aloud (roughly 300-400 words total)

IMPORTANT: You must respond with ONLY valid JSON, no markdown formatting or explanation.`,
        messages: [
          {
            role: "user",
            content: `Create a debate script about ${companyName} based on the following data:

${contextString}

User's specific interest: ${userQuery}

Generate a "Debate Script" between two characters:
- **Bull**: Optimistic analyst who focuses on growth, revenue opportunities, competitive advantages, and positive catalysts found in the data.
- **Bear**: Skeptical analyst who focuses on risk factors, negative news, margin pressures, and potential downsides.

Requirements:
1. Generate 6-10 exchanges (alternating speakers)
2. Each line should be 1-3 sentences (15-40 words) - suitable for audio narration
3. Start with Bull making an opening statement
4. End with a balanced conclusion from either speaker
5. Use specific data points from the provided context when available
6. Make it engaging and conversational, like a financial podcast

Output Format - Return ONLY this JSON structure:
[
  { "speaker": "Bull", "text": "Opening statement about strengths..." },
  { "speaker": "Bear", "text": "Counter-argument about risks..." },
  { "speaker": "Bull", "text": "Response with data points..." },
  ...
]`,
          },
        ],
      });
      
      const debateContent = debateResponse.content[0];
      if (debateContent.type !== "text") {
        throw new Error("Unexpected response type from Anthropic");
      }
      
      // Parse the JSON response
      const responseText = debateContent.text.trim();
      
      // Try to extract JSON from the response (handle potential markdown wrapping)
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error("No JSON array found in response");
      }
      
      const parsedScript = JSON.parse(jsonMatch[0]) as Array<{ speaker: string; text: string }>;
      
      // Validate and normalize the script
      debateScript = parsedScript.map((entry) => ({
        speaker: entry.speaker === "Bull" || entry.speaker === "BULL" ? "Bull" : "Bear",
        text: entry.text,
      }));
      
      console.log(`[Step 3] Generated debate script with ${debateScript.length} exchanges`);
    } catch (error) {
      console.error("[Step 3] Error generating debate script:", error);
      
      // Fallback debate script
      debateScript = [
        {
          speaker: "Bull",
          text: `${companyName} presents a compelling investment opportunity with strong fundamentals and growth potential in their core markets.`,
        },
        {
          speaker: "Bear",
          text: `However, investors should carefully consider the risk factors, including competitive pressures and macroeconomic headwinds that could impact performance.`,
        },
        {
          speaker: "Bull",
          text: `The management team has demonstrated solid execution and the company continues to innovate in key growth areas.`,
        },
        {
          speaker: "Bear",
          text: `Valuation remains a concern, and we've seen margin compression in recent quarters that warrants attention.`,
        },
        {
          speaker: "Bull",
          text: `Long-term investors should focus on the company's strategic positioning and market opportunity.`,
        },
        {
          speaker: "Bear",
          text: `A balanced approach is prudent here - the opportunity is real, but so are the risks that need monitoring.`,
        },
      ];
      console.log("[Step 3] Using fallback debate script");
    }
    
    // ==========================================
    // RETURN RESULTS
    // ==========================================
    console.log("[generateDebateScript] Pipeline complete!");
    
    return {
      searchTerm,
      debateScript,
    };
  },
});

export default generateDebateScript;

