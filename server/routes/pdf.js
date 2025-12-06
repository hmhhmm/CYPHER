/**
 * PDF Route Handler
 * Handles PDF search, harvesting, and complete analysis pipeline
 */
import express from 'express';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import { convex } from '../index.js';
import { api } from '../../convex/_generated/api.js';
import { searchSECFilings } from '../services/apifyService.js';
import { searchCompanyNews } from '../services/newsService.js';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

/**
 * Search for SEC filings using Apify
 * GET /api/pdf/search?ticker=AAPL&year=2023&reportType=10-K
 */
router.get('/search', async (req, res) => {
  try {
    const { ticker, year, reportType = '10-K' } = req.query;

    if (!ticker || !year) {
      return res.status(400).json({
        error: 'Missing required parameters',
        required: ['ticker', 'year'],
      });
    }

    console.log(`[PDF Search] ${ticker} ${year} ${reportType}`);

    const searchResults = await searchSECFilings(ticker, year, reportType);

    res.json({
      success: true,
      ...searchResults,
    });

  } catch (error) {
    console.error('[PDF Search] Error:', error);
    res.status(500).json({
      error: 'PDF search failed',
      message: error.message,
    });
  }
});

/**
 * Upload and harvest data from PDF
 * POST /api/pdf/harvest
 */
router.post('/harvest', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    const { ticker, company, reportType, period, sourceUrl, sessionId } = req.body;

    if (!ticker || !company) {
      return res.status(400).json({
        error: 'Missing required metadata',
        required: ['ticker', 'company'],
      });
    }

    console.log(`[PDF Harvest] Processing ${ticker} ${reportType || '10-K'} for session ${sessionId}`);

    // Extract text from PDF
    const pdfData = await pdfParse(req.file.buffer);
    const fullText = pdfData.text;

    // Check if already processed (cache check)
    if (!convex) {
      return res.status(500).json({
        error: 'Convex not configured',
        message: 'CONVEX_URL environment variable is required'
      });
    }
    
    const cacheKey = `${ticker}_${reportType || '10-K'}_${period || 'unknown'}`;
    const cached = await convex.query(api.pdfCache.getByUrl, { pdfUrl: sourceUrl || cacheKey });

    if (cached) {
      console.log(`[PDF Harvest] Using cached data for ${cacheKey}`);
      return res.json({
        success: true,
        source: 'cache',
        harvestedData: cached.harvestedData.content,
      });
    }

    // Harvest structured data using AI
    const harvestedData = await harvestPDFContent(fullText, ticker, company, reportType);

    // Calculate hash for caching
    const crypto = await import('crypto');
    const pdfHash = crypto.createHash('sha256').update(req.file.buffer).digest('hex');
    
    // Save to Convex cache
    await convex.mutation(api.pdfCache.cache, {
      pdfUrl: sourceUrl || 'uploaded',
      pdfHash,
      ticker,
      harvestedData: {
        meta: {
          ticker,
          company,
          report_type: reportType || '10-K',
          period: period || new Date().getFullYear().toString(),
          source_url: sourceUrl || 'uploaded',
        },
        content: harvestedData,
      },
    });

    // Update analysis session if provided
    if (sessionId) {
      await convex.mutation(api.analyses.storeHarvestedData, {
        sessionId,
        harvestedData: {
          meta: {
            ticker,
            company,
            report_type: reportType || '10-K',
            period: period || new Date().getFullYear().toString(),
            source_url: sourceUrl || 'uploaded',
          },
          content: harvestedData,
        },
      });
    }

    res.json({
      success: true,
      source: 'harvested',
      harvestedData,
    });

  } catch (error) {
    console.error('[PDF Harvest] Error:', error);
    res.status(500).json({
      error: 'PDF harvest failed',
      message: error.message,
    });
  }
});

/**
 * Download PDF from URL and harvest
 * POST /api/pdf/harvest-url
 */
router.post('/harvest-url', async (req, res) => {
  try {
    const { pdfUrl, ticker, company, reportType, period, sessionId } = req.body;

    if (!pdfUrl || !ticker || !company) {
      return res.status(400).json({
        error: 'Missing required parameters',
        required: ['pdfUrl', 'ticker', 'company'],
      });
    }

    console.log(`[PDF Harvest URL] Downloading ${pdfUrl}`);

    if (!convex) {
      return res.status(500).json({
        error: 'Convex not configured',
        message: 'CONVEX_URL environment variable is required'
      });
    }
    
    // Check cache first by URL
    const cached = await convex.query(api.pdfCache.getByUrl, { pdfUrl });

    if (cached) {
      console.log(`[PDF Harvest URL] Using cached data for ${cacheKey}`);
      
      if (sessionId) {
        await convex.mutation(api.analyses.storeHarvestedData, {
          sessionId,
          harvestedData: cached.harvestedData,
        });
      }

      return res.json({
        success: true,
        source: 'cache',
        harvestedData: cached.harvestedData.content,
      });
    }

    // Download PDF
    const response = await fetch(pdfUrl);
    if (!response.ok) {
      throw new Error(`Failed to download PDF: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract text
    const pdfData = await pdfParse(buffer);
    const fullText = pdfData.text;

    // Harvest structured data
    const harvestedData = await harvestPDFContent(fullText, ticker, company, reportType);

    // Calculate hash for caching
    const crypto = await import('crypto');
    const pdfHash = crypto.createHash('sha256').update(buffer).digest('hex');
    
    // Save to Convex cache
    await convex.mutation(api.pdfCache.cache, {
      pdfUrl,
      pdfHash,
      ticker,
      harvestedData: {
        meta: {
          ticker,
          company,
          report_type: reportType || '10-K',
          period: period || new Date().getFullYear().toString(),
          source_url: pdfUrl,
        },
        content: harvestedData,
      },
    });

    // Update analysis session
    if (sessionId) {
      await convex.mutation(api.analyses.storeHarvestedData, {
        sessionId,
        harvestedData: {
          meta: {
            ticker,
            company,
            report_type: reportType || '10-K',
            period: period || new Date().getFullYear().toString(),
            source_url: pdfUrl,
          },
          content: harvestedData,
        },
      });
    }

    res.json({
      success: true,
      source: 'downloaded',
      harvestedData,
    });

  } catch (error) {
    console.error('[PDF Harvest URL] Error:', error);
    res.status(500).json({
      error: 'PDF download/harvest failed',
      message: error.message,
    });
  }
});

/**
 * Complete analysis pipeline: Search → Download → Harvest → News → Save
 * POST /api/pdf/analyze-complete
 * Body: { ticker, company, year, reportType, sessionId }
 */
router.post('/analyze-complete', async (req, res) => {
  try {
    const { ticker, company, year, reportType = '10-K', sessionId } = req.body;

    if (!ticker || !company || !year || !sessionId) {
      return res.status(400).json({
        error: 'Missing required parameters',
        required: ['ticker', 'company', 'year', 'sessionId'],
      });
    }

    console.log(`[Complete Analysis] Starting pipeline for ${ticker} ${year}`);

    // Step 1: Search for SEC filing
    console.log(`[Complete Analysis] Step 1: Searching SEC filings...`);
    const searchResults = await searchSECFilings(ticker, year, reportType);

    if (!searchResults.pdfUrl) {
      return res.status(404).json({
        error: 'No PDF found',
        message: 'Could not find SEC filing PDF for specified parameters',
        searchResults,
      });
    }

    // Step 2: Download and harvest PDF
    console.log(`[Complete Analysis] Step 2: Harvesting PDF from ${searchResults.pdfUrl}`);
    
    if (!convex) {
      return res.status(500).json({
        error: 'Convex not configured',
        message: 'CONVEX_URL environment variable is required'
      });
    }
    
    let harvestedData;
    
    // Check cache by URL
    const cached = await convex.query(api.pdfCache.getByUrl, { pdfUrl: searchResults.pdfUrl });
    
    if (cached) {
      console.log(`[Complete Analysis] Using cached harvested data`);
      harvestedData = cached.harvestedData.content;
    } else {
      // Download and parse PDF
      const pdfResponse = await fetch(searchResults.pdfUrl);
      if (!pdfResponse.ok) {
        throw new Error(`Failed to download PDF: ${pdfResponse.statusText}`);
      }

      const arrayBuffer = await pdfResponse.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const pdfData = await pdfParse(buffer);

      // Harvest content
      harvestedData = await harvestPDFContent(pdfData.text, ticker, company, reportType);

      // Calculate hash for caching
      const crypto = await import('crypto');
      const pdfHash = crypto.createHash('sha256').update(buffer).digest('hex');
      
      // Cache it
      await convex.mutation(api.pdfCache.cache, {
        pdfUrl: searchResults.pdfUrl,
        pdfHash,
        ticker,
        harvestedData: {
          meta: {
            ticker,
            company,
            report_type: reportType,
            period: year.toString(),
            source_url: searchResults.pdfUrl,
          },
          content: harvestedData,
        },
      });
    }

    // Step 3: Update analysis session with harvested data
    console.log(`[Complete Analysis] Step 3: Updating session ${sessionId}`);
    await convex.mutation(api.analyses.storeHarvestedData, {
      sessionId,
      harvestedData: {
        meta: {
          ticker,
          company,
          report_type: reportType,
          period: year.toString(),
          source_url: searchResults.pdfUrl,
        },
        content: harvestedData,
      },
    });

    // Step 4: Fetch related news
    console.log(`[Complete Analysis] Step 4: Fetching news...`);
    let newsArticles = [];
    
    try {
      const newsResults = await searchCompanyNews(ticker, company, 10);
      newsArticles = newsResults.articles || [];

      // Save news to Convex
      if (newsArticles.length > 0) {
        await convex.mutation(api.news.storeNews, {
          ticker,
          articles: newsArticles,
        });
      }
    } catch (newsError) {
      console.error('[Complete Analysis] News fetch failed:', newsError);
      // Continue even if news fails
    }

    // Step 5: Return complete data package
    console.log(`[Complete Analysis] Pipeline complete ✓`);

    res.json({
      success: true,
      sessionId,
        data: {
        meta: {
          ticker,
          company,
          report_type: reportType,
          period: year.toString(),
          source_url: searchResults.pdfUrl,
        },
        content: {
          management_discussion: harvestedData.management_discussion,
          risk_factors: harvestedData.risk_factors,
          key_financials: harvestedData.key_financials,
        },
        news: newsArticles,
        searchResults: searchResults.results,
      },
    });

  } catch (error) {
    console.error('[Complete Analysis] Pipeline error:', error);
    res.status(500).json({
      error: 'Complete analysis pipeline failed',
      message: error.message,
    });
  }
});

/**
 * Harvest structured content from PDF text using AI
 */
async function harvestPDFContent(fullText, ticker, company, reportType) {
  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  // Truncate if needed (Claude has token limits)
  const maxChars = 100000;
  const textToAnalyze = fullText.length > maxChars 
    ? fullText.substring(0, maxChars) + '\n\n[Document truncated due to length...]'
    : fullText;

  const prompt = `You are a financial analyst extracting key information from a ${reportType} filing for ${company} (${ticker}).

Extract and structure the following information from the document:

1. **Management Discussion & Analysis (MD&A)**: Key points about business performance, strategy, and outlook
2. **Risk Factors**: Major risks and uncertainties facing the company
3. **Key Financials**: Revenue, net income, EPS, cash flow, assets, liabilities (with specific numbers)

Return your response as a JSON object with this structure:
{
  "management_discussion": "Detailed summary of MD&A section...",
  "risk_factors": "Comprehensive list of key risks...",
  "key_financials": "Revenue: $X billion, Net Income: $Y billion, etc..."
}

Document text:
${textToAnalyze}`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: prompt,
      }],
    });

    const responseText = message.content[0].text;
    
    // Try to parse as JSON
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = responseText.match(/```json\n?([\s\S]*?)\n?```/) || 
                       responseText.match(/```\n?([\s\S]*?)\n?```/);
      
      const jsonText = jsonMatch ? jsonMatch[1] : responseText;
      const parsed = JSON.parse(jsonText);

      return {
        management_discussion: parsed.management_discussion || '',
        risk_factors: parsed.risk_factors || '',
        key_financials: parsed.key_financials || '',
      };

    } catch (parseError) {
      console.warn('[PDF Harvest] JSON parse failed, using raw response');
      
      // Fallback: structure the raw response
      return {
        management_discussion: responseText.substring(0, 2000),
        risk_factors: 'See management discussion for details',
        key_financials: 'Financial data extraction pending',
      };
    }

  } catch (error) {
    console.error('[PDF Harvest] AI extraction failed:', error);
    
    // Ultimate fallback
    return {
      management_discussion: `Document contains ${fullText.length} characters. AI extraction temporarily unavailable.`,
      risk_factors: 'Extraction pending',
      key_financials: 'Extraction pending',
    };
  }
}

export default router;


