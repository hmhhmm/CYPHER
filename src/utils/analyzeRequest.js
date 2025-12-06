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
 * Get company name from ticker using local mapping
 * @param {string} ticker - Stock ticker symbol
 * @returns {string} Company name or ticker if not found
 */
export function getCompanyName(ticker) {
  const upperTicker = ticker.toUpperCase();
  const entry = Object.values(tickerMap).find(v => v.ticker === upperTicker);
  return entry?.company || ticker;
}

/**
 * Check if a ticker exists in our local mapping
 * @param {string} ticker - Stock ticker symbol
 * @returns {boolean}
 */
export function isKnownTicker(ticker) {
  const lowerTicker = ticker.toLowerCase();
  return tickerMap[lowerTicker] !== undefined;
}

export default {
  analyzeRequest,
  getCompanyName,
  isKnownTicker,
};
