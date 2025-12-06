/**
 * Prompt templates for Claude debate generation
 */

/**
 * Generate the main debate prompt
 * @param {Object} harvestedData - The harvested financial data
 * @returns {string} The prompt for Claude
 */
export function getDebatePrompt(harvestedData) {
  const { meta, content } = harvestedData;
  
  return `You are a financial debate scriptwriter creating a compelling Bull vs Bear debate about ${meta.company} (${meta.ticker}) based on their ${meta.report_type} filing for ${meta.period}.

COMPANY DATA:

**Management's Discussion & Analysis (Bullish perspective source):**
${content.management_discussion}

**Risk Factors (Bearish perspective source):**
${content.risk_factors}

**Key Financial Metrics:**
${content.key_financials}

INSTRUCTIONS:
Create an engaging debate script between two analysts:
- BULL: An optimistic investor who sees opportunity and growth
- BEAR: A skeptical analyst who questions risks and valuations

Guidelines:
1. Generate 8-12 exchanges total (alternating speakers)
2. Each speaker should make substantive, data-driven points
3. BULL focuses on: growth metrics, market opportunity, management execution, competitive advantages
4. BEAR focuses on: risks, margin compression, competitive threats, valuation concerns, regulatory challenges
5. Make it conversational but professional - like a financial podcast
6. Include specific numbers and facts from the filing
7. Each line should be 1-3 sentences, 20-50 words (good for audio narration)
8. Start with BULL making an opening statement about the company's strengths

OUTPUT FORMAT:
Return a JSON array with this structure:
[
  {
    "speaker": "BULL",
    "text": "The exact dialogue to be spoken",
    "duration_estimate": 5,
    "visual_evidence": "Revenue Chart Page 12"
  },
  {
    "speaker": "BEAR", 
    "text": "Counter-argument dialogue",
    "duration_estimate": 6,
    "visual_evidence": "Risk Factor #3"
  }
]

Important:
- Respond ONLY with the JSON array, no markdown formatting or explanation
- Ensure valid JSON syntax
- Keep duration_estimate realistic (typically 4-8 seconds per line)`;
}

/**
 * Get system prompt for consistent Claude behavior
 */
export function getSystemPrompt() {
  return `You are an expert financial analyst and scriptwriter. You create balanced, factual debates about public companies based on their SEC filings. Your debates are:
- Data-driven: Always cite specific numbers and facts
- Balanced: Present both bullish and bearish perspectives fairly
- Professional: Use appropriate financial terminology
- Engaging: Write in a conversational style suitable for audio content
- Compliant: Never provide investment advice, only analysis`;
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

export default {
  getDebatePrompt,
  getSystemPrompt,
  getExtractionPrompt,
  getIntentPrompt,
};


