/**
 * News Service for Company News Search
 * Uses Apify Google Search Scraper to find recent news articles
 */

const APIFY_API_URL = 'https://api.apify.com/v2';

/**
 * Search for news articles about a company using Apify
 * @param {string} ticker - Stock ticker symbol
 * @param {string} company - Company name
 * @param {number} limit - Maximum number of articles to return
 * @returns {Promise<{articles: array}>}
 */
export async function searchCompanyNews(ticker, company, limit = 10) {
  if (!process.env.APIFY_API_TOKEN) {
    console.warn('[News] API token not configured, using fallback');
    return { articles: [] };
  }

  // Search specifically for news from premium financial sources
  // Target WSJ, Financial Times, Bloomberg, and Reuters
  // Use site: operator with OR to search multiple domains
  const searchQuery = `${company} ${ticker} stock news (site:wsj.com OR site:ft.com OR site:bloomberg.com OR site:reuters.com)`;
  console.log(`[News] Searching premium sources (WSJ, FT, Bloomberg, Reuters): "${searchQuery}"`);

  try {
    // Step 1: Start the actor run
    // Use Authorization header instead of query param (more secure)
    const runResponse = await fetch(
      `${APIFY_API_URL}/acts/apify~google-search-scraper/runs`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.APIFY_API_TOKEN}`,
        },
        body: JSON.stringify({
          queries: searchQuery, // Must be a string (not array)
          maxPagesPerQuery: 1,
          resultsPerPage: limit,
          mobileResults: false,
          languageCode: 'en',
          countryCode: 'us',
        }),
      }
    );

    if (!runResponse.ok) {
      const errorText = await runResponse.text();
      console.error('[News] ⚠️  Run creation FAILED - Returning empty results:', {
        status: runResponse.status,
        statusText: runResponse.statusText,
        body: errorText.substring(0, 500),
        url: `${APIFY_API_URL}/acts/apify~google-search-scraper/runs`,
        hasToken: !!process.env.APIFY_API_TOKEN,
        tokenLength: process.env.APIFY_API_TOKEN?.length || 0,
      });
      console.warn('[News] ⚠️  Apify credits NOT being used - check API token and endpoint format');
      return { articles: [] };
    }

    const runData = await runResponse.json();
    const runId = runData.data?.id;
    const datasetId = runData.data?.defaultDatasetId;

    if (!runId) {
      console.error('[News] No run ID in response:', runData);
      return { articles: [] };
    }

    console.log(`[News] Started run ${runId}, waiting for completion...`);

    // Step 2: Wait for completion
    let runStatus = 'RUNNING';
    let attempts = 0;
    const maxAttempts = 30;

    while (runStatus === 'RUNNING' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const statusResponse = await fetch(
        `${APIFY_API_URL}/actor-runs/${runId}`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.APIFY_API_TOKEN}`,
          },
        }
      );
      
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        runStatus = statusData.data?.status;
      }
      
      attempts++;
    }

    if (runStatus !== 'SUCCEEDED') {
      console.error(`[News] Run did not succeed. Status: ${runStatus}`);
      return { articles: [] };
    }

    // Step 3: Get dataset items
    const finalRunData = await fetch(
      `${APIFY_API_URL}/actor-runs/${runId}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.APIFY_API_TOKEN}`,
        },
      }
    ).then(r => r.json());
    
    const finalDatasetId = finalRunData.data?.defaultDatasetId || datasetId;

    if (!finalDatasetId) {
      console.error('[News] No dataset ID available');
      return { articles: [] };
    }

    const datasetResponse = await fetch(
      `${APIFY_API_URL}/datasets/${finalDatasetId}/items`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.APIFY_API_TOKEN}`,
        },
      }
    );

    if (!datasetResponse.ok) {
      const errorText = await datasetResponse.text();
      console.error('[News] Dataset fetch failed:', {
        status: datasetResponse.status,
        statusText: datasetResponse.statusText,
        body: errorText.substring(0, 500),
      });
      return { articles: [] };
    }

    const results = await datasetResponse.json();
    console.log('[News] Raw response structure:', {
      isArray: Array.isArray(results),
      keys: results ? Object.keys(results) : 'null',
    });
    
    // Handle different response formats
    let allResults = [];
    if (Array.isArray(results)) {
      allResults = results;
    } else if (results.data && Array.isArray(results.data)) {
      allResults = results.data;
    } else if (results.items && Array.isArray(results.items)) {
      allResults = results.items;
    } else if (results.organicResults) {
      allResults = Array.isArray(results.organicResults) ? results.organicResults : [results.organicResults];
    } else {
      allResults = results;
    }
    
    const articles = allResults
      .flatMap(r => {
        // Handle nested organicResults
        if (r.organicResults && Array.isArray(r.organicResults)) {
          return r.organicResults;
        }
        // Handle single result object
        if (r.url || r.link) {
          return [r];
        }
        return [];
      })
      .filter(result => {
        const url = result.url || result.link || '';
        // Prioritize premium financial sources: WSJ, Financial Times, Bloomberg, Reuters
        return (
          url.includes('wsj.com') ||
          url.includes('ft.com') ||
          url.includes('bloomberg.com') ||
          url.includes('reuters.com') ||
          // Also include other reputable sources
          url.includes('bloomberg') ||
          url.includes('reuters') ||
          url.includes('cnbc.com') ||
          url.includes('marketwatch.com')
        );
      })
      .map(result => ({
        title: result.title || result.name || 'News Article',
        url: result.url || result.link || '',
        snippet: result.description || result.snippet || '',
        source: extractSource(result.url || result.link || ''),
        publishedDate: result.date || new Date().toISOString(),
      }));

    console.log(`[News] Found ${articles.length} articles from ${allResults.length} total results`);
    
    return { articles };
  } catch (error) {
    console.error('[News] Search failed:', {
      message: error.message,
      stack: error.stack,
    });
    return { articles: [] };
  }
}

/**
 * Extract source domain from URL
 * @param {string} url - Article URL
 * @returns {string} Source domain
 */
function extractSource(url) {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace('www.', '');
  } catch {
    return 'Unknown';
  }
}

export default {
  searchCompanyNews,
};
