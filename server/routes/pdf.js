import express from 'express';
import Anthropic from '@anthropic-ai/sdk';
import pdf from 'pdf-parse/lib/pdf-parse.js';
import { convex } from '../index.js';
import { api } from '../convex/_generated/api.js';

const router = express.Router();

// Initialize Anthropic client
const getAnthropicClient = () => {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
};

/**
 * POST /api/pdf/search
 * Search for SEC filings using Apify
 */
router.post('/search', async (req, res, next) => {
  try {
    const { ticker, year, reportType = '10-K' } = req.body;

    if (!ticker) {
      return res.status(400).json({
        error: 'Ticker is required',
        code: 'INVALID_INPUT'
      });
    }

    console.log(`[PDF] Searching for ${ticker} ${year} ${reportType}`);

    // For now, construct SEC EDGAR URL directly
    // In production, use Apify for more robust search
    const searchQuery = `${ticker} ${year || ''} ${reportType} site:sec.gov filetype:pdf`;
    
    // Fallback: Use SEC EDGAR direct search
    const secSearchUrl = `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${ticker}&type=${reportType}&dateb=&owner=include&count=10&search_text=`;
    
    // For demo purposes, return a known working SEC URL format
    // In production, this would use Apify Google Search Scraper
    const edgarUrl = `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${ticker}&type=${reportType}&dateb=&owner=include&count=1`;

    res.json({
      ticker,
      year: year || new Date().getFullYear(),
      reportType,
      searchQuery,
      edgarUrl,
      message: 'Use Apify integration for production PDF discovery',
      // Placeholder - would be populated by Apify results
      results: []
    });

  } catch (error) {
    console.error('[PDF] Search error:', error);
    next({
      status: 500,
      message: error.message,
      code: 'PDF_SEARCH_FAILED'
    });
  }
});

/**
 * POST /api/pdf/harvest
 * Download PDF and extract HarvestedData
 */
router.post('/harvest', async (req, res, next) => {
  try {
    const { pdfUrl, ticker, company, sessionId } = req.body;

    if (!pdfUrl || !ticker) {
      return res.status(400).json({
        error: 'pdfUrl and ticker are required',
        code: 'INVALID_INPUT'
      });
    }

    console.log(`[PDF] Harvesting from: ${pdfUrl}`);

    // Update status if sessionId provided
    if (sessionId && convex) {
      try {
        await convex.mutation(api.analyses.updateStatus, {
          sessionId,
          status: 'harvesting'
        });
      } catch (err) {
        console.warn('[PDF] Failed to update status:', err);
      }
    }

    // Check cache first
    if (sessionId && convex) {
      try {
        const cached = await convex.query(api.pdfCache.getByUrl, { url: pdfUrl });
        if (cached) {
          console.log(`[PDF] Using cached data for ${pdfUrl}`);
          
          // Still save to analysis
          await convex.mutation(api.analyses.storeHarvestedData, {
            sessionId,
            pdfUrl,
            harvestedData: cached.harvestedData
          });
          
          return res.json(cached.harvestedData);
        }
      } catch (err) {
        console.warn('[PDF] Cache check failed:', err);
      }
    }

    // Fetch PDF
    const response = await fetch(pdfUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log(`[PDF] Downloaded ${buffer.length} bytes`);

    // Parse PDF
    const pdfData = await pdf(buffer);
    const fullText = pdfData.text;

    console.log(`[PDF] Extracted ${fullText.length} characters from ${pdfData.numpages} pages`);

    // Use Claude to extract structured sections
    const client = getAnthropicClient();

    // Limit text to avoid token limits (first 50k chars should cover MD&A and Risk Factors)
    const textForAnalysis = fullText.substring(0, 50000);

    const extractionPrompt = `You are analyzing an SEC 10-K filing for ${company || ticker}. 
Extract the following sections from this document. Be thorough but concise.

Document text:
${textForAnalysis}

Extract and return a JSON object with:
1. "management_discussion": The key points from the Management's Discussion and Analysis (MD&A) section. Summarize the main business performance highlights, growth drivers, and management's outlook. (500-1000 words)

2. "risk_factors": The most significant risk factors disclosed. List the top 5-10 material risks with brief explanations. (500-800 words)

3. "key_financials": Extract key financial metrics mentioned:
   - Total Revenue and YoY change
   - Net Income and YoY change  
   - Gross Margin
   - Operating Margin
   - Cash and Cash Equivalents
   - Total Debt
   - Any notable segment breakdowns

Respond ONLY with valid JSON:`;

    const claudeResponse = await client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 4000,
      messages: [{ role: 'user', content: extractionPrompt }]
    });

    const responseText = claudeResponse.content[0].text.trim();
    
    // Parse extracted content
    let extractedContent;
    try {
      extractedContent = JSON.parse(responseText);
    } catch (parseError) {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedContent = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse extraction results');
      }
    }

    // Construct HarvestedData
    const harvestedData = {
      meta: {
        ticker: ticker.toUpperCase(),
        company: company || ticker,
        report_type: '10-K',
        period: new Date().getFullYear().toString(),
        source_url: pdfUrl
      },
      content: {
        management_discussion: extractedContent.management_discussion || '',
        risk_factors: extractedContent.risk_factors || '',
        key_financials: typeof extractedContent.key_financials === 'string' 
          ? extractedContent.key_financials 
          : JSON.stringify(extractedContent.key_financials, null, 2)
      }
    };

    console.log(`[PDF] Harvest complete for ${ticker}`);

    // Save to Convex if sessionId provided
    if (sessionId && convex) {
      try {
        // Save to analysis
        await convex.mutation(api.analyses.storeHarvestedData, {
          sessionId,
          pdfUrl,
          harvestedData
        });

        // Cache the PDF data
        await convex.mutation(api.pdfCache.store, {
          url: pdfUrl,
          ticker: ticker.toUpperCase(),
          year: parseInt(harvestedData.meta.period) || new Date().getFullYear(),
          harvestedData
        });

        console.log(`[PDF] Saved to Convex session: ${sessionId}`);
      } catch (convexError) {
        console.error('[PDF] Failed to save to Convex:', convexError);
        // Continue - don't fail the request
      }
    }

    res.json(harvestedData);

  } catch (error) {
    console.error('[PDF] Harvest error:', error);
    next({
      status: 500,
      message: error.message,
      code: 'HARVEST_FAILED'
    });
  }
});

/**
 * POST /api/pdf/parse
 * Parse PDF and return raw text (for debugging)
 */
router.post('/parse', async (req, res, next) => {
  try {
    const { pdfUrl } = req.body;

    if (!pdfUrl) {
      return res.status(400).json({
        error: 'pdfUrl is required',
        code: 'INVALID_INPUT'
      });
    }

    const response = await fetch(pdfUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const pdfData = await pdf(buffer);

    res.json({
      pages: pdfData.numpages,
      characters: pdfData.text.length,
      text: pdfData.text.substring(0, 10000), // First 10k chars
      metadata: pdfData.info
    });

  } catch (error) {
    console.error('[PDF] Parse error:', error);
    next({
      status: 500,
      message: error.message,
      code: 'PARSE_FAILED'
    });
  }
});

export default router;

