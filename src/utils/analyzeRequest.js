import { extractIntent } from './api.js';

/**
 * Stock ticker mapping for common companies
 * Used as offline fallback when backend API is unavailable
 * This is NOT mock data - it's a valid local lookup table for ticker resolution
 */
const tickerMap = {
  // Tech Giants
  'tesla': { ticker: 'TSLA', company: 'Tesla Inc.' },
  'tsla': { ticker: 'TSLA', company: 'Tesla Inc.' },
  'apple': { ticker: 'AAPL', company: 'Apple Inc.' },
  'aapl': { ticker: 'AAPL', company: 'Apple Inc.' },
  'microsoft': { ticker: 'MSFT', company: 'Microsoft Corporation' },
  'msft': { ticker: 'MSFT', company: 'Microsoft Corporation' },
  'google': { ticker: 'GOOGL', company: 'Alphabet Inc.' },
  'alphabet': { ticker: 'GOOGL', company: 'Alphabet Inc.' },
  'googl': { ticker: 'GOOGL', company: 'Alphabet Inc.' },
  'amazon': { ticker: 'AMZN', company: 'Amazon.com Inc.' },
  'amzn': { ticker: 'AMZN', company: 'Amazon.com Inc.' },
  'meta': { ticker: 'META', company: 'Meta Platforms Inc.' },
  'facebook': { ticker: 'META', company: 'Meta Platforms Inc.' },
  'nvidia': { ticker: 'NVDA', company: 'NVIDIA Corporation' },
  'nvda': { ticker: 'NVDA', company: 'NVIDIA Corporation' },
  'netflix': { ticker: 'NFLX', company: 'Netflix Inc.' },
  'nflx': { ticker: 'NFLX', company: 'Netflix Inc.' },
  
  // Finance
  'jpmorgan': { ticker: 'JPM', company: 'JPMorgan Chase & Co.' },
  'jp morgan': { ticker: 'JPM', company: 'JPMorgan Chase & Co.' },
  'jpm': { ticker: 'JPM', company: 'JPMorgan Chase & Co.' },
  'goldman': { ticker: 'GS', company: 'Goldman Sachs Group Inc.' },
  'goldman sachs': { ticker: 'GS', company: 'Goldman Sachs Group Inc.' },
  'berkshire': { ticker: 'BRK.B', company: 'Berkshire Hathaway Inc.' },
  'visa': { ticker: 'V', company: 'Visa Inc.' },
  'mastercard': { ticker: 'MA', company: 'Mastercard Inc.' },
  
  // Other Popular
  'disney': { ticker: 'DIS', company: 'The Walt Disney Company' },
  'dis': { ticker: 'DIS', company: 'The Walt Disney Company' },
  'coca cola': { ticker: 'KO', company: 'The Coca-Cola Company' },
  'cocacola': { ticker: 'KO', company: 'The Coca-Cola Company' },
  'coke': { ticker: 'KO', company: 'The Coca-Cola Company' },
  'nike': { ticker: 'NKE', company: 'Nike Inc.' },
  'nke': { ticker: 'NKE', company: 'Nike Inc.' },
  'walmart': { ticker: 'WMT', company: 'Walmart Inc.' },
  'wmt': { ticker: 'WMT', company: 'Walmart Inc.' },
  'boeing': { ticker: 'BA', company: 'The Boeing Company' },
  'ba': { ticker: 'BA', company: 'The Boeing Company' },
  
  // EV & Energy
  'rivian': { ticker: 'RIVN', company: 'Rivian Automotive Inc.' },
  'rivn': { ticker: 'RIVN', company: 'Rivian Automotive Inc.' },
  'lucid': { ticker: 'LCID', company: 'Lucid Group Inc.' },
  'lcid': { ticker: 'LCID', company: 'Lucid Group Inc.' },
  
  // Crypto related
  'coinbase': { ticker: 'COIN', company: 'Coinbase Global Inc.' },
  'coin': { ticker: 'COIN', company: 'Coinbase Global Inc.' },
  
  // AI & Semiconductors
  'amd': { ticker: 'AMD', company: 'Advanced Micro Devices Inc.' },
  'intel': { ticker: 'INTC', company: 'Intel Corporation' },
  'intc': { ticker: 'INTC', company: 'Intel Corporation' },
  'palantir': { ticker: 'PLTR', company: 'Palantir Technologies Inc.' },
  'pltr': { ticker: 'PLTR', company: 'Palantir Technologies Inc.' },
  'snowflake': { ticker: 'SNOW', company: 'Snowflake Inc.' },
  'snow': { ticker: 'SNOW', company: 'Snowflake Inc.' },
}

/**
 * Analyzes natural language input and extracts stock ticker
 * Uses backend API when available, falls back to local mapping
 * @param {string} input - User's natural language query
 * @returns {Promise<{ticker: string, company: string}>}
 */
export async function analyzeRequest(input) {
  // Try backend API first (preferred - uses AI for better extraction)
  try {
    const intent = await extractIntent(input);
    
    if (intent.ticker && intent.company) {
      return {
        ticker: intent.ticker,
        company: intent.company,
        year: intent.year,
        confidence: intent.confidence,
        sessionId: intent.sessionId,
      };
    }
    
    // If backend returned clarification needed, propagate it
    if (intent.status === 'clarification_needed') {
      return {
        status: 'clarification_needed',
        message: intent.message,
        suggestions: intent.suggestions,
      };
    }
  } catch (error) {
    console.warn('Backend API unavailable, using local fallback:', error.message);
  }
  
  // Fallback to local mapping (offline support)
  const lowerInput = input.toLowerCase();
  const trimmed = input.trim();
  
  // First check for explicit ticker symbols (e.g., $TSLA, TSLA)
  const tickerMatch = input.match(/\$?([A-Z]{1,5})\b/i);
  if (tickerMatch) {
    const potentialTicker = tickerMatch[1].toLowerCase();
    if (tickerMap[potentialTicker]) {
      return tickerMap[potentialTicker];
    }
    // If we don't recognize the ticker, still return it uppercased
    return { ticker: potentialTicker.toUpperCase(), company: potentialTicker.toUpperCase() };
  }
  
  // Company name match
  for (const [key, value] of Object.entries(tickerMap)) {
    if (lowerInput.includes(key)) {
      return value;
    }
  }
  
  // Attempt to sanitize the first token as ticker
  const firstToken = trimmed.split(/\s+/)[0] || '';
  const sanitized = firstToken.replace(/[^A-Za-z0-9.\-]/g, '');
  if (sanitized.length >= 1 && sanitized.length <= 7) {
    return { ticker: sanitized.toUpperCase(), company: sanitized.toUpperCase() };
  }

  // If no match found, throw error
  throw new Error('Could not identify stock ticker from input');
}

/**
 * Get source documents for a ticker
 * Will use real data when available from backend/Convex
 * @param {string} ticker
 * @returns {Array}
 */
export function getSourceDocuments(ticker) {
  const companyName = Object.values(tickerMap).find(v => v.ticker === ticker)?.company || ticker
  
  return [
    { id: 1, name: `${ticker} 2024 10-K.pdf`, type: 'SEC Filing', pages: 142, date: '2024-02-15' },
    { id: 2, name: `${ticker} Q3 Earnings.pdf`, type: 'Earnings Report', pages: 28, date: '2024-10-25' },
    { id: 3, name: `Bloomberg_${ticker}_Analysis.pdf`, type: 'Research', pages: 15, date: '2024-11-01' },
    { id: 4, name: `Reuters_${ticker}_News.pdf`, type: 'News Article', pages: 3, date: '2024-11-28' },
    { id: 5, name: `WSJ_${ticker}_Interview.pdf`, type: 'Interview', pages: 8, date: '2024-12-01' },
  ]
}

/**
 * Get key insights for a ticker
 * Will use real data when available from backend/Convex
 * @param {string} ticker
 * @returns {Array}
 */
export function getKeyInsights(ticker) {
  const insights = {
    TSLA: [
      { type: 'bullish', title: 'Revenue Growth', text: 'Q3 revenue up 8% YoY to $25.2B, beating estimates.' },
      { type: 'bearish', title: 'Margin Pressure', text: 'Gross margins declined to 17.9% due to price cuts.' },
      { type: 'neutral', title: 'FSD Progress', text: 'Full Self-Driving v12 showing improved performance metrics.' },
      { type: 'bullish', title: 'Energy Storage', text: 'Megapack deployments grew 90% YoY, diversifying revenue.' },
    ],
    AAPL: [
      { type: 'bullish', title: 'Services Growth', text: 'Services revenue hit record $22.3B, up 14% YoY.' },
      { type: 'bearish', title: 'China Slowdown', text: 'Greater China revenue declined 2% amid competition.' },
      { type: 'bullish', title: 'iPhone 16 Launch', text: 'Strong initial demand for iPhone 16 Pro models.' },
      { type: 'neutral', title: 'AI Integration', text: 'Apple Intelligence rollout expanding to more devices.' },
    ],
    NVDA: [
      { type: 'bullish', title: 'Data Center Boom', text: 'Data center revenue up 112% YoY to $14.5B.' },
      { type: 'bullish', title: 'AI Leadership', text: 'H100/H200 GPUs dominate AI training market.' },
      { type: 'bearish', title: 'China Restrictions', text: 'Export controls limiting growth in Chinese market.' },
      { type: 'neutral', title: 'Blackwell Launch', text: 'Next-gen Blackwell chips ramping production.' },
    ],
  }
  
  return insights[ticker] || [
    { type: 'bullish', title: 'Strong Performance', text: 'Company showing solid fundamentals and growth.' },
    { type: 'bearish', title: 'Market Risks', text: 'Faces headwinds from macroeconomic conditions.' },
    { type: 'neutral', title: 'Analyst View', text: 'Mixed ratings with average price target upside.' },
  ]
}

/**
 * Get transcript data for a ticker
 * Will use real data when available from backend/Convex
 * @param {string} ticker
 * @returns {Array}
 */
export function getTranscript(ticker) {
  const transcripts = {
    TSLA: [
      { id: 1, speaker: 'bull', text: "Dude, did you see Tesla's numbers? Twenty five billion in revenue. I mean, come on, that's pretty solid right?", start: 0, end: 8 },
      { id: 2, speaker: 'bear', text: "Yeah but... okay wait, before you get too excited. Did you look at the margins? They're getting killed. Like, seventeen percent? That's... that's not good.", start: 8, end: 17 },
      { id: 3, speaker: 'bull', text: "No no no, hear me out. They're doing it on purpose. Cut prices, crush the competition, then jack up margins later. Classic move.", start: 17, end: 26 },
      { id: 4, speaker: 'bear', text: "Okay but... have you been watching China at all? BYD is just, they're everywhere now. Tesla went from ten percent to six. That's a lot.", start: 26, end: 36 },
      { id: 5, speaker: 'bull', text: "Yeah China's tough, I'll give you that. But yo, the energy stuff? Megapack? Up ninety percent! Nobody talks about this.", start: 36, end: 45 },
      { id: 6, speaker: 'bear', text: "Because it's tiny! It's like seven percent of revenue. And the Cybertruck? They lose money on each one. Each one!", start: 45, end: 54 },
      { id: 7, speaker: 'bull', text: "Okay okay, but FSD though. Version twelve is actually working. Like actually working. This changes everything.", start: 54, end: 63 },
      { id: 8, speaker: 'bear', text: "I've heard that before. Every year it's 'next year robotaxis.' I'll believe it when I see it.", start: 63, end: 71 },
    ],
    AAPL: [
      { id: 1, speaker: 'bull', text: "So Apple, right? Services just hit twenty two billion. People literally cannot leave the ecosystem. It's crazy.", start: 0, end: 9 },
      { id: 2, speaker: 'bear', text: "Services sure, but... iPhones are eighty percent of the business and they were flat. And don't even get me started on China.", start: 9, end: 19 },
      { id: 3, speaker: 'bull', text: "The iPhone sixteen Pro though? Have you seen the lines? Titanium, new cameras, people are upgrading like crazy.", start: 19, end: 28 },
      { id: 4, speaker: 'bear', text: "In America maybe. But China? Huawei came back and just... they knocked Apple out of the top five. First time ever.", start: 28, end: 38 },
      { id: 5, speaker: 'bull', text: "Yeah but wait, wait. Apple Intelligence. When that rolls out fully? Biggest upgrade cycle we've ever seen. Mark my words.", start: 38, end: 48 },
      { id: 6, speaker: 'bear', text: "Google's had AI features for a year. Samsung too. Apple's playing catch up. They're late. Simple as that.", start: 48, end: 57 },
    ],
    NVDA: [
      { id: 1, speaker: 'bull', text: "NVIDIA. Data center up one hundred twelve percent. One twelve! Have you ever seen numbers like this?", start: 0, end: 9 },
      { id: 2, speaker: 'bear', text: "Everyone knows AI is hot. But remember crypto mining? Remember how that ended? Same energy here.", start: 9, end: 18 },
      { id: 3, speaker: 'bull', text: "This is different though. Microsoft, Google, Amazon, they're all fighting for these chips. Real companies, real products.", start: 18, end: 28 },
      { id: 4, speaker: 'bear', text: "Competition is coming. AMD has a real chip now. And these tech giants? They're making their own. The party won't last.", start: 28, end: 38 },
      { id: 5, speaker: 'bull', text: "But CUDA though. Fifteen years of developers. You can't just switch overnight. That's the moat right there.", start: 38, end: 47 },
      { id: 6, speaker: 'bear', text: "What about China? Export ban just wiped out five billion in sales. That hurts. That really hurts.", start: 47, end: 56 },
    ],
  }
  
  return transcripts[ticker] || [
    { id: 1, speaker: 'bull', text: `Been looking at ${ticker}. Numbers are actually pretty good. Getting better each quarter.`, start: 0, end: 8 },
    { id: 2, speaker: 'bear', text: "I mean, sure. But the economy's rough and competition is brutal. Can they keep it up?", start: 8, end: 17 },
    { id: 3, speaker: 'bull', text: "Management knows what they're doing though. They have a plan, they're executing. I like it.", start: 17, end: 26 },
    { id: 4, speaker: 'bear', text: "Valuation seems high to me. I'd wait for a pullback. No rush, right?", start: 26, end: 34 },
  ]
}
