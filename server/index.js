import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import Anthropic from '@anthropic-ai/sdk';
import { ConvexHttpClient } from 'convex/browser';

// Route imports
import transcribeRoutes from './routes/transcribe.js';
import intentRoutes from './routes/intent.js';
import pdfRoutes from './routes/pdf.js';
import debateRoutes from './routes/debate.js';
import audioRoutes from './routes/audio.js';

// Load environment variables
dotenv.config();

// Initialize Convex client
const convexUrl = process.env.CONVEX_URL;
if (!convexUrl) {
  console.warn('⚠️  CONVEX_URL not configured - database features disabled');
}
export const convex = convexUrl ? new ConvexHttpClient(convexUrl) : null;

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Preferred model - use latest Sonnet for best analysis quality
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Configure multer for file uploads
const storage = multer.memoryStorage();
export const upload = multer({ 
  storage,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB limit
});

// Build a safe fallback payload so the frontend never breaks even if LLM fails
function buildFallbackAnalysis(ticker, company, query, note = 'LLM fallback') {
  const safeTicker = (ticker || 'TICKER').toUpperCase();
  const safeCompany = company || safeTicker;
  return {
    ticker: safeTicker,
    currentPrice: 0,
    summary: `Fallback analysis for ${safeCompany}.`,
    bullCase: { speaker: 'Bull', argument: 'Upside drivers: execution, product strength, and market share gains.' },
    bearCase: { speaker: 'Bear', argument: 'Risks: macro headwinds, competition, and margin pressure.' },
    keyInsights: [
      { title: 'Execution', sentiment: 'positive', detail: 'Management continues to ship on roadmap milestones.' },
      { title: 'Margins', sentiment: 'negative', detail: 'Gross margins face pressure; watch cost discipline.' },
      { title: 'Valuation', sentiment: 'neutral', detail: 'Market is pricing in growth; risk/reward depends on delivery.' },
    ],
    sources: ['10-K', 'Earnings Call', 'Analyst Notes'],
    _meta: { fallback: true, note, query: query || '' }
  };
}

// System prompt for institutional analyst
const SYSTEM_PROMPT = `You are a ruthless, institutional Wall Street analyst with decades of experience at top-tier firms like Goldman Sachs, Morgan Stanley, and Citadel. You provide balanced, data-driven debates between Bull and Bear cases.

Your analysis style:
- Be direct and incisive, no fluff
- Use specific metrics and data points
- Consider macro trends and competitive dynamics
- Identify key risks and catalysts
- Think like a portfolio manager allocating capital

CRITICAL: Return your analysis as valid JSON matching this exact schema:
{
  "ticker": "SYMBOL",
  "currentPrice": 0.00,
  "summary": "2-3 sentence executive summary of the investment thesis",
  "bullCase": {
    "speaker": "Bull",
    "argument": "Compelling 2-3 sentence bull case with specific catalysts and upside targets"
  },
  "bearCase": {
    "speaker": "Bear", 
    "argument": "Compelling 2-3 sentence bear case with specific risks and downside scenarios"
  },
  "keyInsights": [
    {
      "title": "Insight Title",
      "sentiment": "positive|negative|neutral",
      "detail": "Specific data-driven insight with numbers"
    }
  ],
  "sources": ["10-K", "Q3 Earnings Call", "Industry Report"]
}

Provide 4-6 key insights with a mix of positive, negative, and neutral sentiments.
For currentPrice, use your best estimate of the current market price or use 0 if unknown.
ONLY respond with valid JSON, no markdown formatting or explanation.`;

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    convex: convex ? 'connected' : 'not configured'
  });
});

// Intent classification route: decide chat vs analyze
app.post('/api/chat-intent', async (req, res) => {
  const { userMessage } = req.body || {};
  if (!userMessage || typeof userMessage !== 'string') {
    return res.status(400).json({ error: 'userMessage is required' });
  }

  // If API key is missing, return a graceful chat response
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(200).json({
      type: 'chat',
      response: "I'm here to chat. Provide a ticker (e.g., $TSLA, NVDA) for analysis."
    });
  }

  const systemPrompt = `You are CYPHER, an AI financial analyst. Determine the user's intent.
- If they want stock analysis (e.g., "Analyze Apple", "How is TSLA doing?"), return JSON:
  { "type": "analyze", "ticker": "AAPL", "company": "Apple Inc" }
- If they are just chatting (e.g., "Hi", "Who are you?"), return JSON:
  { "type": "chat", "response": "Your conversational response here..." }
Keep the persona professional but helpful. Respond ONLY with JSON.`;

  try {
    const message = await anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 512,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userMessage }
      ]
    });

    const responseText = message?.content?.[0]?.text || '';
    let intent;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        intent = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found');
      }
    } catch (err) {
      console.error('[INTENT] parse error, raw:', responseText);
      intent = { type: 'chat', response: 'Happy to help. Mention a ticker if you want analysis.' };
    }

    if (intent.type !== 'analyze' && intent.type !== 'chat') {
      intent = { type: 'chat', response: 'Happy to help. Mention a ticker if you want analysis.' };
    }

    res.json(intent);
  } catch (err) {
    console.error('[INTENT] error:', err);
    res.status(200).json({ type: 'chat', response: 'I am here to chat. Mention a ticker for deep-dive analysis.' });
  }
});

// Main analysis endpoint
app.post('/api/analyze', async (req, res) => {
  try {
    const { ticker, company, query } = req.body;

    if (!ticker) {
      return res.status(400).json({ error: 'Ticker symbol is required' });
    }

    console.log(`[ANALYZE] Starting analysis for ${ticker} (${company || 'Unknown'})`);

    // Call Claude API
    const message = await anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: `Provide a comprehensive institutional analysis for ${ticker}${company ? ` (${company})` : ''}.

User query (context): ${query || 'No additional context provided.'}

Consider:
- Recent earnings and revenue trends
- Competitive positioning
- Key growth drivers and risks
- Valuation relative to peers
- Macro factors affecting the stock

Return ONLY valid JSON matching the required schema.`
        }
      ],
      system: SYSTEM_PROMPT
    });

    // Extract the response text
    const responseText = message.content[0].text;

    // Parse JSON from response
    let analysisData;
    try {
      // Try to extract JSON from the response (handle potential markdown wrapping)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('[ANALYZE] JSON parse error, using fallback:', parseError);
      console.log('[ANALYZE] Raw response (truncated):', responseText.substring(0, 300));
      analysisData = buildFallbackAnalysis(ticker, company, query, 'JSON parse failed');
    }

    console.log(`[ANALYZE] Successfully analyzed ${ticker}`);
    
    res.json(analysisData);

  } catch (error) {
    console.error('[ANALYZE] Error:', error);
    
    // Handle specific Anthropic errors with fallback instead of 500
    if (error.status === 401) {
      return res.status(500).json({ error: 'Invalid API key' });
    }
    if (error.status === 429) {
      return res.status(429).json({ error: 'Rate limited, please try again' });
    }

    // Generic fallback to keep UI alive
    const { ticker, company, query } = req.body || {};
    const fallback = buildFallbackAnalysis(ticker, company, query, error.message || 'Unknown error');
    res.status(200).json(fallback);
  }
});

// API Routes (pipeline endpoints)
app.use('/api/transcribe', transcribeRoutes);
app.use('/api/intent', intentRoutes);
app.use('/api/pdf', pdfRoutes);
app.use('/api/debate', debateRoutes);
app.use('/api/audio', audioRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  // Multer errors
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      error: 'File upload error',
      code: 'UPLOAD_ERROR',
      details: err.message
    });
  }

  // Generic errors
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    code: err.code || 'INTERNAL_ERROR'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    code: 'NOT_FOUND'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════╗
║                                                   ║
║   🔮 CYPHER API Server                            ║
║   Running on http://localhost:${PORT}               ║
║                                                   ║
║   Endpoints:                                      ║
║   • GET  /api/health        - Health check        ║
║   • POST /api/chat-intent   - Intent classifier   ║
║   • POST /api/analyze       - Quick analysis      ║
║   • POST /api/intent/*      - Pipeline intent     ║
║   • POST /api/pdf/*         - PDF processing      ║
║   • POST /api/debate/*      - Debate generation   ║
║   • POST /api/audio/*       - Audio synthesis     ║
║                                                   ║
║   Convex:  ${convex ? '🟢 Connected' : '⚠️  Not configured'}              ║
║                                                   ║
╚═══════════════════════════════════════════════════╝
  `);
  
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('⚠️  Warning: ANTHROPIC_API_KEY not set in environment');
    console.warn('   Create a .env file with: ANTHROPIC_API_KEY=your_key_here');
  }
});

export default app;

