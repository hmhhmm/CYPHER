/**
 * Prompt templates for Claude debate generation
 * Optimized for JSON output with timestamps and visual cues
 */

/**
 * System prompt that forces JSON-only output
 * Use this with all debate-related Claude calls
 */
export const DEBATE_SYSTEM_PROMPT = `You are a financial podcast producer and scriptwriter specializing in Bull vs Bear debates.

CRITICAL RULES:
1. Output ONLY valid JSON - no markdown, no explanation, no text before or after the JSON
2. Always cite specific numbers, percentages, and facts from the source material
3. Make dialogue natural and engaging - like Bloomberg or CNBC debates
4. Balance optimism with skepticism fairly - neither side should "win"
5. Duration estimates: approximately 1 second per 2.5 words of spoken text
6. Visual evidence should reference specific data sources (charts, tables, page numbers)`;

/**
 * Calculate estimated duration from text
 * Based on average speaking rate of ~150 words per minute (2.5 words/second)
 * @param {string} text - The dialogue text
 * @returns {number} Duration in seconds
 */
export function calculateDuration(text) {
  if (!text) return 3;
  const words = text.trim().split(/\s+/).length;
  return Math.max(3, Math.round(words / 2.5));
}

/**
 * Generate the main debate prompt
 * @param {Object} harvestedData - The harvested financial data
 * @param {Array} newsContext - Optional array of news articles
 * @returns {string} The prompt for Claude
 */
export function getDebatePrompt(harvestedData, newsContext = []) {
  const { meta, content } = harvestedData;
  
  const newsSection = newsContext.length > 0 
    ? `\n\nRECENT NEWS (incorporate relevant headlines):\n${newsContext.slice(0, 5).map((article, idx) => 
        `${idx + 1}. "${article.title}"\n   ${article.snippet || ''}\n   Source: ${article.source || 'Financial News'}`
      ).join('\n\n')}`
    : '';
  
  return `Create a 2-minute debate script between a BULL (Optimist) and BEAR (Skeptic) about ${meta.company} (${meta.ticker}).

REPORT CONTEXT:
Company: ${meta.company}
Ticker: ${meta.ticker}
Report Type: ${meta.report_type}
Period: ${meta.period}
Source: ${meta.source_url}

===== MANAGEMENT'S DISCUSSION (BULL should cite this) =====
${content.management_discussion}

===== RISK FACTORS (BEAR should cite this) =====
${content.risk_factors}

===== KEY FINANCIAL METRICS =====
${content.key_financials}${newsSection}

DEBATE REQUIREMENTS:
1. Generate 8-12 exchanges total, alternating speakers
2. BULL opens with a strong positive statement
3. BEAR responds with skepticism but stays professional
4. Each exchange: 1-3 sentences, conversational tone
5. Use SPECIFIC numbers from the data (e.g., "revenue up 15%", "margins at 22%")
6. Duration: ~1 second per 2.5 words
7. Total script should be ~2 minutes (90-120 seconds)

SPEAKER GUIDELINES:
BULL (The Optimist):
- Highlights growth metrics and positive trends
- Emphasizes management execution and strategy
- Points to market opportunity and competitive advantages
- References positive news if available

BEAR (The Skeptic):
- Questions sustainability of growth
- Highlights margin pressure and costs
- Points to competitive threats and risks
- References concerning news or market conditions

OUTPUT FORMAT - Return ONLY this JSON array:
[
  {
    "speaker": "BULL",
    "text": "Opening statement citing specific positive metric",
    "duration_estimate": 5,
    "visual_evidence": "Revenue Chart - Page X or Metric Name"
  },
  {
    "speaker": "BEAR",
    "text": "Counter-argument with specific risk or concern",
    "duration_estimate": 5,
    "visual_evidence": "Risk Factor #X or Cost Analysis"
  }
]`;
}

/**
 * Get system prompt for consistent Claude behavior
 */
export function getSystemPrompt() {
  return DEBATE_SYSTEM_PROMPT;
}

/**
 * Prompt for extracting HarvestedData from raw PDF text
 */
export function getExtractionPrompt(ticker, company, pdfText) {
  return `You are analyzing an SEC 10-K filing for ${company} (${ticker}). 
Extract the following sections from this document. Be thorough but concise.

Document text (first 50,000 characters):
${pdfText.substring(0, 50000)}

Extract and return a JSON object with exactly these three fields:

1. "management_discussion": Summarize the Management's Discussion and Analysis (MD&A) section:
   - Key business performance highlights
   - Revenue and profit drivers
   - Growth initiatives and investments
   - Management's outlook and guidance
   (Target: 500-1000 words)

2. "risk_factors": List the most significant risk factors disclosed:
   - Top 8-10 material risks
   - Brief explanation of each risk
   - Focus on company-specific risks, not generic boilerplate
   (Target: 500-800 words)

3. "key_financials": Extract key financial metrics:
   - Total Revenue (current year and YoY change)
   - Net Income (current year and YoY change)
   - Gross Margin percentage
   - Operating Margin percentage
   - Cash and Cash Equivalents
   - Total Debt
   - Free Cash Flow
   - Any notable segment breakdowns
   - Key operational metrics (units sold, subscribers, etc.)

Respond ONLY with valid JSON, no markdown formatting:`;
}

/**
 * Prompt for intent extraction from natural language
 */
export function getIntentPrompt(userQuery) {
  return `You are a financial query parser. Extract structured information from the user's query about stocks/companies.

User Query: "${userQuery}"

Extract and return a JSON object with these fields:
- company: The company name (or null if not mentioned)
- ticker: The stock ticker symbol in UPPERCASE (or null if not mentioned)
- year: The year being asked about (number or null, default to current year if asking about "recent" or "latest")
- request: A brief description of what the user wants to know

Common company/ticker mappings to help you:
- Tesla, TSLA -> Tesla Inc.
- Apple, AAPL -> Apple Inc.
- Microsoft, MSFT -> Microsoft Corporation
- Google, Alphabet, GOOGL -> Alphabet Inc.
- Amazon, AMZN -> Amazon.com Inc.
- NVIDIA, NVDA -> NVIDIA Corporation
- Meta, Facebook, META -> Meta Platforms Inc.
- Netflix, NFLX -> Netflix Inc.
- AMD -> Advanced Micro Devices Inc.
- Coinbase, COIN -> Coinbase Global Inc.

If the user mentions a company by name, also include the likely ticker.
If they use a ticker, also include the company name.

Respond ONLY with valid JSON, no explanation:`;
}

/**
 * Prompt for enhancing debate with news context
 */
export function getNewsEnhancementPrompt(existingScript, newsArticles) {
  return `You have an existing Bull vs Bear debate. Add 2-4 NEW exchanges that incorporate recent news.

EXISTING SCRIPT (for context, don't repeat):
${JSON.stringify(existingScript.slice(-4), null, 2)}

RECENT NEWS TO INCORPORATE:
${newsArticles.map((n, i) => `${i+1}. ${n.title}\n   ${n.snippet || ''}`).join('\n\n')}

Create 2-4 new exchanges where:
- BULL highlights any positive news developments
- BEAR points out concerning market signals
- Both reference specific headlines

Return ONLY a JSON array of NEW exchanges:
[
  { "speaker": "BULL", "text": "...", "duration_estimate": 5, "visual_evidence": "Recent News" },
  { "speaker": "BEAR", "text": "...", "duration_estimate": 5, "visual_evidence": "Market Update" }
]`;
}

/**
 * Prompt for generating a focused debate on specific topics
 */
export function getFocusedDebatePrompt(harvestedData, focusTopics, options = {}) {
  const { meta, content } = harvestedData;
  const { tone = 'balanced', targetDuration = 120 } = options;
  
  const toneGuidance = tone === 'bullish' 
    ? 'Lean slightly optimistic while maintaining credibility.'
    : tone === 'bearish'
    ? 'Lean slightly skeptical while acknowledging positives.'
    : 'Maintain perfect balance between bull and bear cases.';
  
  const exchangeCount = Math.round(targetDuration / 12);
  
  return `Create a focused debate about ${meta.company} (${meta.ticker}).

FOCUS AREAS (emphasize these):
${focusTopics.map(t => `• ${t}`).join('\n')}

SOURCE DATA:
${content.management_discussion}

${content.risk_factors}

${content.key_financials}

GUIDELINES:
- ${toneGuidance}
- Target: ~${targetDuration} seconds (${exchangeCount} exchanges)
- Focus specifically on the listed topics
- Use specific data points

Return ONLY a JSON array:
[{ "speaker": "BULL"|"BEAR", "text": "...", "duration_estimate": N, "visual_evidence": "..." }]`;
}

export default {
  DEBATE_SYSTEM_PROMPT,
  calculateDuration,
  getDebatePrompt,
  getSystemPrompt,
  getExtractionPrompt,
  getIntentPrompt,
  getNewsEnhancementPrompt,
  getFocusedDebatePrompt,
};
