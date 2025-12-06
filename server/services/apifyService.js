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

  // Search across multiple trusted sources for annual reports
  // Use OR operator to search SEC, WSJ, Bloomberg, Reuters, and FT
  const searchQuery = `${ticker} ${year} annual report ${reportType} (site:sec.gov OR site:wsj.com OR site:bloomberg.com OR site:reuters.com OR site:ft.com) filetype:pdf`;
  
  console.log(`[Apify] Searching across multiple sources: "${searchQuery}"`);

  try {
    // Step 1: Start the actor run using standard Apify API
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
          resultsPerPage: 10,
          mobileResults: false,
          languageCode: 'en',
          countryCode: 'us',
        }),
      }
    );

    if (!runResponse.ok) {
      const errorText = await runResponse.text();
      console.error('[Apify] ⚠️  Run creation FAILED - Falling back to SEC EDGAR:', {
        status: runResponse.status,
        statusText: runResponse.statusText,
        body: errorText.substring(0, 500),
        url: `${APIFY_API_URL}/acts/apify~google-search-scraper/runs`,
        hasToken: !!process.env.APIFY_API_TOKEN,
        tokenLength: process.env.APIFY_API_TOKEN?.length || 0,
      });
      console.warn('[Apify] ⚠️  Apify credits NOT being used - check API token and endpoint format');
      return fallbackSECSearch(ticker, year, reportType);
    }

    const runData = await runResponse.json();
    const runId = runData.data?.id;
    const datasetId = runData.data?.defaultDatasetId;

    if (!runId) {
      console.error('[Apify] No run ID in response:', runData);
      return fallbackSECSearch(ticker, year, reportType);
    }

    console.log(`[Apify] Started run ${runId}, waiting for completion...`);

    // Step 2: Wait for the run to complete (poll status)
    let runStatus = 'RUNNING';
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds max wait

    while (runStatus === 'RUNNING' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      
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
        console.log(`[Apify] Run status: ${runStatus} (attempt ${attempts + 1}/${maxAttempts})`);
      }
      
      attempts++;
    }

    if (runStatus !== 'SUCCEEDED') {
      console.error(`[Apify] Run did not succeed. Status: ${runStatus}`);
      return fallbackSECSearch(ticker, year, reportType);
    }

    // Step 3: Get the dataset ID if not already available
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
      console.error('[Apify] No dataset ID available');
      return fallbackSECSearch(ticker, year, reportType);
    }

    // Step 4: Get dataset items
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
      console.error('[Apify] Dataset fetch failed:', {
        status: datasetResponse.status,
        statusText: datasetResponse.statusText,
        body: errorText.substring(0, 500),
      });
      return fallbackSECSearch(ticker, year, reportType);
    }

    const results = await datasetResponse.json();
    console.log('[Apify] Raw response structure:', {
      isArray: Array.isArray(results),
      keys: results ? Object.keys(results) : 'null',
      firstItemKeys: Array.isArray(results) && results[0] ? Object.keys(results[0]) : 'N/A',
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
      // Try to extract from nested structure
      allResults = results;
    }
    
    // Filter for PDF results from trusted sources (SEC, WSJ, Bloomberg, Reuters, FT)
    const pdfResults = allResults
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
        // Accept PDFs or annual report pages from trusted sources
        const isPDF = url.endsWith('.pdf') || url.includes('.pdf') || url.includes('/Archives/edgar/');
        const isTrustedSource = (
          url.includes('sec.gov') ||
          url.includes('wsj.com') ||
          url.includes('ft.com') ||
          url.includes('bloomberg.com') ||
          url.includes('reuters.com') ||
          url.includes('investor') ||
          url.includes('annualreport')
        );
        return isPDF && isTrustedSource;
      })
      .map(result => {
        const url = result.url || result.link || '';
        // Determine source from URL for better attribution
        let source = 'apify';
        if (url.includes('sec.gov')) source = 'sec.gov';
        else if (url.includes('wsj.com')) source = 'wsj.com';
        else if (url.includes('bloomberg.com')) source = 'bloomberg.com';
        else if (url.includes('reuters.com')) source = 'reuters.com';
        else if (url.includes('ft.com')) source = 'ft.com';
        
        return {
          title: result.title || result.name || 'Annual Report',
          url: result.url || result.link || '',
          snippet: result.description || result.snippet || '',
          source: source,
        };
      });

    console.log(`[Apify] Found ${pdfResults.length} PDF results from ${allResults.length} total results`);

    return {
      ticker,
      year,
      reportType,
      query: searchQuery,
      results: pdfResults,
      pdfUrl: pdfResults[0]?.url || null,
    };

  } catch (error) {
    console.error('[Apify] Request failed:', {
      message: error.message,
      stack: error.stack,
    });
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
    'wsj.com',
    'ft.com',
    'bloomberg.com',
    'reuters.com',
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

