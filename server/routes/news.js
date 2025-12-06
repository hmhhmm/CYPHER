import express from 'express';
import { searchCompanyNews } from '../services/newsService.js';
import { convex } from '../index.js';
import { api } from '../../convex/_generated/api.js';

const router = express.Router();

/**
 * POST /api/news/search
 * Search for company news and save to Convex
 */
router.post('/search', async (req, res, next) => {
  try {
    const { ticker, company, sessionId, limit = 10 } = req.body;

    if (!ticker || !company) {
      return res.status(400).json({
        error: 'ticker and company are required',
        code: 'INVALID_INPUT'
      });
    }

    console.log(`[News] Searching news for ${ticker}`);

    const newsResults = await searchCompanyNews(ticker, company, limit);
    
    // Save to Convex if available
    if (convex && newsResults.articles.length > 0) {
      try {
        await convex.mutation(api.news.storeNews, {
          ticker: ticker.toUpperCase(),
          company,
          articles: newsResults.articles
        });
        console.log(`[News] Saved ${newsResults.articles.length} articles to Convex`);
      } catch (convexError) {
        console.error('[News] Failed to save to Convex:', convexError);
      }
    }
    
    res.json({
      ticker: ticker.toUpperCase(),
      company,
      ...newsResults
    });
  } catch (error) {
    console.error('[News] Error:', error);
    next({ 
      status: 500, 
      message: error.message, 
      code: 'NEWS_SEARCH_FAILED' 
    });
  }
});

export default router;
