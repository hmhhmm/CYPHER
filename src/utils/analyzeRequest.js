// Stock ticker mapping for common companies
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
 * @param {string} input - User's natural language query
 * @returns {Promise<{ticker: string, company: string}>}
 */
export async function analyzeRequest(input) {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 800))
  
  const lowerInput = input.toLowerCase()
  
  // First check for explicit ticker symbols (e.g., $TSLA, TSLA)
  const tickerMatch = input.match(/\$?([A-Z]{1,5})\b/i)
  if (tickerMatch) {
    const potentialTicker = tickerMatch[1].toLowerCase()
    if (tickerMap[potentialTicker]) {
      return tickerMap[potentialTicker]
    }
  }
  
  // Search for company names in the input
  for (const [key, value] of Object.entries(tickerMap)) {
    if (lowerInput.includes(key)) {
      return value
    }
  }
  
  // If no match found, throw error
  throw new Error('Could not identify stock ticker from input')
}

/**
 * Get mock source documents for a ticker
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
 * Get mock key insights for a ticker
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
 * Get mock transcript data for a ticker
 * @param {string} ticker
 * @returns {Array}
 */
export function getTranscript(ticker) {
  const transcripts = {
    TSLA: [
      { id: 1, speaker: 'bull', text: "Let's dive into Tesla's Q3 results. Revenue came in at $25.2 billion, up 8% year over year. That's a solid beat on expectations.", start: 0, end: 8 },
      { id: 2, speaker: 'bear', text: "Sure, revenue beat, but let's talk about what matters - margins. Gross margins dropped to 17.9%. That's the lowest we've seen in years.", start: 8, end: 16 },
      { id: 3, speaker: 'bull', text: "Margin compression is temporary. Tesla is strategically cutting prices to eliminate competition. Once they've consolidated market share, margins will recover.", start: 16, end: 26 },
      { id: 4, speaker: 'bear', text: "That's a big assumption. Meanwhile, BYD is eating their lunch in China. Market share is down to 6.5% from 10% last year.", start: 26, end: 35 },
      { id: 5, speaker: 'bull', text: "But look at the energy business! Megapack deployments grew 90% year over year. Energy storage is becoming a significant revenue driver.", start: 35, end: 45 },
      { id: 6, speaker: 'bear', text: "Energy is only 7% of revenue. The core auto business needs to perform. And let's not forget - Cybertruck is still losing money on every unit.", start: 45, end: 55 },
      { id: 7, speaker: 'bull', text: "Full Self-Driving version 12 is a game changer. The neural network approach is showing real progress. This is Tesla's path to becoming an AI company.", start: 55, end: 65 },
      { id: 8, speaker: 'bear', text: "We've heard 'robotaxis next year' for five years now. Until FSD actually works without supervision, it's just vaporware.", start: 65, end: 73 },
    ],
    AAPL: [
      { id: 1, speaker: 'bull', text: "Apple just delivered another record quarter. Services revenue hit $22.3 billion, up 14% year over year. The ecosystem is incredibly sticky.", start: 0, end: 10 },
      { id: 2, speaker: 'bear', text: "Services is great, but hardware is 80% of the business. iPhone revenue was essentially flat, and China is a real problem.", start: 10, end: 20 },
      { id: 3, speaker: 'bull', text: "iPhone 16 Pro demand is extremely strong. The titanium design and improved cameras are driving upgrades from the installed base.", start: 20, end: 30 },
      { id: 4, speaker: 'bear', text: "Huawei's comeback in China is stealing market share. Apple fell out of the top 5 smartphone vendors in China for the first time.", start: 30, end: 40 },
      { id: 5, speaker: 'bull', text: "Apple Intelligence is the real story here. AI features will drive the biggest upgrade cycle in iPhone history.", start: 40, end: 50 },
      { id: 6, speaker: 'bear', text: "Apple is late to AI. Google and Samsung have had AI features for over a year. Apple is playing catch-up.", start: 50, end: 60 },
    ],
    NVDA: [
      { id: 1, speaker: 'bull', text: "NVIDIA just reported the most incredible quarter in semiconductor history. Data center revenue up 112% to $14.5 billion.", start: 0, end: 10 },
      { id: 2, speaker: 'bear', text: "Everyone knows the AI story. The question is sustainability. Are we in an AI bubble like crypto mining in 2021?", start: 10, end: 20 },
      { id: 3, speaker: 'bull', text: "This is completely different. Every major tech company is building AI infrastructure. Microsoft, Google, Amazon, Meta - they're all buying H100s as fast as NVIDIA can make them.", start: 20, end: 32 },
      { id: 4, speaker: 'bear', text: "But competition is coming. AMD's MI300X is real. And let's not forget the custom chips - Google's TPUs, Amazon's Trainium.", start: 32, end: 42 },
      { id: 5, speaker: 'bull', text: "CUDA is the moat. Developers have been building on CUDA for 15 years. The switching costs are enormous.", start: 42, end: 52 },
      { id: 6, speaker: 'bear', text: "China export restrictions are a real headwind. That was a $5 billion market that's now severely limited.", start: 52, end: 62 },
    ],
  }
  
  return transcripts[ticker] || [
    { id: 1, speaker: 'bull', text: `Let's analyze ${ticker}. The company has shown solid fundamentals in recent quarters with improving metrics.`, start: 0, end: 10 },
    { id: 2, speaker: 'bear', text: "While there are positives, we need to consider the risks. Market conditions remain uncertain and competition is intense.", start: 10, end: 20 },
    { id: 3, speaker: 'bull', text: "The management team has a clear strategy and has been executing well. I'm optimistic about the long-term outlook.", start: 20, end: 30 },
    { id: 4, speaker: 'bear', text: "Valuation is stretched at current levels. I'd wait for a pullback before building a position.", start: 30, end: 40 },
  ]
}

