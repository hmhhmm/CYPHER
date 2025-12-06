/**
 * Apify Service for PDF Search
 * Uses Apify Google Search Scraper to find SEC filings
 */

const APIFY_API_URL = 'https://api.apify.com/v2';

/**
 * Search for SEC filings using Apify Google Search Scraper
 * @param {string} ticker - Stock ticker symbol
 * @param {number} year - Filing year
 * @param {string} reportType - Report type (10-K, 10-Q, etc.)
 * @returns {Promise<{pdfUrl: string, results: array}>}
 */
export async function searchSECFilings(ticker, year, reportType = '10-K') {
  if (!process.env.APIFY_API_TOKEN) {
    console.warn('[Apify] API token not configured, using fallback');
    return fallbackSECSearch(ticker, year, reportType);
  }

  const searchQuery = `${ticker} ${year} annual report ${reportType} site:sec.gov filetype:pdf`;
  
  console.log(`[Apify] Searching: "${searchQuery}"`);

  try {
    // Use Apify Google Search Scraper actor
    const response = await fetch(
      `${APIFY_API_URL}/acts/apify~google-search-scraper/run-sync-get-dataset-items?token=${process.env.APIFY_API_TOKEN}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          queries: searchQuery,
          maxPagesPerQuery: 1,
          resultsPerPage: 10,
          mobileResults: false,
          languageCode: 'en',
          countryCode: 'us',
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Apify] Error:', errorText);
      return fallbackSECSearch(ticker, year, reportType);
    }

    const results = await response.json();
    
    // Filter for PDF results from SEC.gov
    const pdfResults = results
      .flatMap(r => r.organicResults || [])
      .filter(result => {
        const url = result.url || '';
        return (
          url.endsWith('.pdf') ||
          url.includes('.pdf') ||
          url.includes('/Archives/edgar/')
        ) && (
          url.includes('sec.gov') ||
          url.includes('investor') ||
          url.includes('annualreport')
        );
      })
      .map(result => ({
        title: result.title,
        url: result.url,
        snippet: result.description,
        source: 'apify',
      }));

    console.log(`[Apify] Found ${pdfResults.length} PDF results`);

    return {
      ticker,
      year,
      reportType,
      query: searchQuery,
      results: pdfResults,
      pdfUrl: pdfResults[0]?.url || null,
    };

  } catch (error) {
    console.error('[Apify] Request failed:', error);
    return fallbackSECSearch(ticker, year, reportType);
  }
}

/**
 * Fallback SEC EDGAR direct search
 * Uses SEC's own search when Apify is unavailable
 */
async function fallbackSECSearch(ticker, year, reportType) {
  console.log('[Apify] Using SEC EDGAR fallback');
  
  // SEC EDGAR Full-Text Search API
  const edgarSearchUrl = `https://efts.sec.gov/LATEST/search-index?q="${ticker}"&dateRange=custom&startdt=${year}-01-01&enddt=${year}-12-31&forms=${reportType}`;
  
  try {
    const response = await fetch(edgarSearchUrl, {
      headers: {
        'User-Agent': 'CYPHER Financial Analyzer (educational use)',
        'Accept': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      const hits = data.hits?.hits || [];
      
      const results = hits.slice(0, 5).map(hit => ({
        title: hit._source?.display_names?.[0] || `${ticker} ${reportType}`,
        url: `https://www.sec.gov/Archives/edgar/data/${hit._source?.ciks?.[0]}/${hit._source?.adsh?.replace(/-/g, '')}/${hit._source?.adsh}.htm`,
        snippet: hit._source?.file_description || '',
        source: 'sec-edgar',
      }));

      return {
        ticker,
        year,
        reportType,
        query: `SEC EDGAR: ${ticker} ${reportType} ${year}`,
        results,
        pdfUrl: results[0]?.url || null,
      };
    }
  } catch (error) {
    console.error('[SEC EDGAR] Fallback search failed:', error);
  }

  // Ultimate fallback - construct likely URL patterns
  return {
    ticker,
    year,
    reportType,
    query: `${ticker} ${reportType} ${year}`,
    results: [],
    pdfUrl: null,
    message: 'No results found. Please provide a PDF URL manually.',
  };
}

/**
 * Validate that a URL is from a trusted source
 * @param {string} url - URL to validate
 * @returns {boolean}
 */
export function isTrustedSource(url) {
  const trustedDomains = [
    'sec.gov',
    'investor.', // investor relations pages
    'annualreports.com',
    'bamsec.com',
  ];
  
  try {
    const urlObj = new URL(url);
    return trustedDomains.some(domain => urlObj.hostname.includes(domain));
  } catch {
    return false;
  }
}

export default {
  searchSECFilings,
  isTrustedSource,
};

