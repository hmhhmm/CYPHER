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

  const searchQuery = `${company} ${ticker} stock news`;
  console.log(`[News] Searching: "${searchQuery}"`);

  try {
    const response = await fetch(
      `${APIFY_API_URL}/acts/apify~google-search-scraper/run-sync-get-dataset-items?token=${process.env.APIFY_API_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queries: searchQuery,
          maxPagesPerQuery: 1,
          resultsPerPage: limit,
          mobileResults: false,
          languageCode: 'en',
          countryCode: 'us',
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[News] Apify error:', errorText);
      return { articles: [] };
    }

    const results = await response.json();
    
    const articles = results
      .flatMap(r => r.organicResults || [])
      .filter(result => {
        const url = result.url || '';
        return (
          url.includes('news') ||
          url.includes('bloomberg') ||
          url.includes('reuters') ||
          url.includes('cnbc') ||
          url.includes('wsj') ||
          url.includes('ft.com') ||
          url.includes('marketwatch')
        );
      })
      .map(result => ({
        title: result.title,
        url: result.url,
        snippet: result.description || '',
        source: extractSource(result.url),
        publishedDate: result.date || new Date().toISOString(),
      }));

    console.log(`[News] Found ${articles.length} articles`);
    
    return { articles };
  } catch (error) {
    console.error('[News] Search failed:', error);
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
