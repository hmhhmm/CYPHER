import express from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { convex } from '../index.js';
import { api } from '../convex/_generated/api.js';
import { randomUUID } from 'crypto';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load ticker data
let tickerData = null;
const loadTickerData = () => {
  if (!tickerData) {
    try {
      const tickerPath = join(__dirname, '../data/tickers.json');
      tickerData = JSON.parse(readFileSync(tickerPath, 'utf-8'));
    } catch (error) {
      console.warn('[Intent] Could not load tickers.json, using fallback');
      tickerData = { tickers: {} };
    }
  }
  return tickerData;
};

// Initialize Anthropic client
const getAnthropicClient = () => {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
};

/**
 * POST /api/intent/extract
 * Extract structured intent from natural language query
 */
router.post('/extract', async (req, res, next) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        error: 'Text input is required',
        code: 'INVALID_INPUT'
      });
    }

    console.log(`[Intent] Extracting intent from: "${text}"`);

    const client = getAnthropicClient();

    const prompt = `You are a financial query parser. Extract structured information from the user's query about stocks/companies.

User Query: "${text}"

Extract and return a JSON object with these fields:
- company: The company name (or null if not mentioned)
- ticker: The stock ticker symbol in uppercase (or null if not mentioned)
- year: The year being asked about (or null, default to current year if asking about recent/latest)
- request: A brief description of what the user wants to know

Common mappings:
- Tesla, TSLA -> Tesla Inc.
- Apple, AAPL -> Apple Inc.
- Microsoft, MSFT -> Microsoft Corporation
- Google, Alphabet, GOOGL -> Alphabet Inc.
- Amazon, AMZN -> Amazon.com Inc.
- NVIDIA, NVDA -> NVIDIA Corporation
- Meta, Facebook, META -> Meta Platforms Inc.

Respond ONLY with valid JSON, no markdown or explanation:`;

    const response = await client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }]
    });

    const responseText = response.content[0].text.trim();
    
    // Parse JSON response
    let intent;
    try {
      intent = JSON.parse(responseText);
    } catch (parseError) {
      // Try to extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        intent = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse intent from response');
      }
    }

    // Validate and enhance the intent
    const { tickers } = loadTickerData();
    
    // If we have a ticker, validate it
    if (intent.ticker) {
      const tickerUpper = intent.ticker.toUpperCase();
      if (tickers[tickerUpper]) {
        intent.company = intent.company || tickers[tickerUpper].company;
        intent.ticker = tickerUpper;
        intent.confidence = 'high';
      } else {
        intent.confidence = 'medium';
        intent.suggestions = findSimilarTickers(tickerUpper, tickers);
      }
    } else if (intent.company) {
      // Try to find ticker from company name
      const match = findTickerByCompany(intent.company, tickers);
      if (match) {
        intent.ticker = match.ticker;
        intent.company = match.company;
        intent.confidence = 'high';
      } else {
        intent.confidence = 'low';
        intent.status = 'clarification_needed';
        intent.message = `Could not find ticker for "${intent.company}". Please specify the stock symbol.`;
      }
    } else {
      intent.confidence = 'low';
      intent.status = 'clarification_needed';
      intent.message = 'Could not identify a company or stock ticker. Please specify which stock you want to analyze.';
    }

    // Default year to current if not specified
    if (!intent.year) {
      intent.year = new Date().getFullYear();
    }

    console.log(`[Intent] Extracted:`, intent);

    // Create analysis session in Convex if available
    let sessionId = null;
    if (convex && intent.ticker && intent.confidence === 'high') {
      try {
        sessionId = randomUUID();
        
        await convex.mutation(api.analyses.create, {
          sessionId,
          originalQuery: text,
          ticker: intent.ticker,
          company: intent.company,
          year: intent.year,
        });
        
        console.log(`[Intent] Created analysis session: ${sessionId}`);
        intent.sessionId = sessionId;
      } catch (convexError) {
        console.error('[Intent] Failed to create Convex session:', convexError);
        // Continue without session - don't fail the request
      }
    }

    res.json(intent);

  } catch (error) {
    console.error('[Intent] Error:', error);
    next({
      status: 500,
      message: error.message,
      code: 'EXTRACTION_FAILED'
    });
  }
});

/**
 * POST /api/intent/validate
 * Validate a ticker symbol
 */
router.post('/validate', (req, res) => {
  const { ticker } = req.body;

  if (!ticker) {
    return res.status(400).json({
      error: 'Ticker is required',
      code: 'INVALID_INPUT'
    });
  }

  const { tickers } = loadTickerData();
  const tickerUpper = ticker.toUpperCase();

  if (tickers[tickerUpper]) {
    res.json({
      valid: true,
      ticker: tickerUpper,
      company: tickers[tickerUpper].company,
      exchange: tickers[tickerUpper].exchange
    });
  } else {
    const suggestions = findSimilarTickers(tickerUpper, tickers);
    res.json({
      valid: false,
      ticker: tickerUpper,
      suggestions
    });
  }
});

/**
 * GET /api/intent/tickers
 * Get list of supported tickers
 */
router.get('/tickers', (req, res) => {
  const { search } = req.query;
  const { tickers } = loadTickerData();

  if (search) {
    const searchLower = search.toLowerCase();
    const filtered = Object.entries(tickers)
      .filter(([ticker, data]) => 
        ticker.toLowerCase().includes(searchLower) ||
        data.company.toLowerCase().includes(searchLower)
      )
      .slice(0, 10)
      .map(([ticker, data]) => ({ ticker, ...data }));
    
    res.json({ results: filtered });
  } else {
    res.json({ 
      count: Object.keys(tickers).length,
      sample: Object.entries(tickers).slice(0, 20).map(([ticker, data]) => ({ ticker, ...data }))
    });
  }
});

// Helper: Find similar tickers
function findSimilarTickers(input, tickers) {
  const inputLower = input.toLowerCase();
  return Object.entries(tickers)
    .filter(([ticker, data]) => 
      ticker.toLowerCase().includes(inputLower) ||
      data.company.toLowerCase().includes(inputLower)
    )
    .slice(0, 5)
    .map(([ticker, data]) => ({ ticker, company: data.company }));
}

// Helper: Find ticker by company name
function findTickerByCompany(companyName, tickers) {
  const nameLower = companyName.toLowerCase();
  
  for (const [ticker, data] of Object.entries(tickers)) {
    if (data.company.toLowerCase().includes(nameLower) ||
        nameLower.includes(data.company.toLowerCase().split(' ')[0])) {
      return { ticker, company: data.company };
    }
  }
  
  return null;
}

export default router;

