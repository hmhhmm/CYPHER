/**
 * Apify Service for PDF Search
 * Uses Apify Google Search Scraper to find SEC filings
 */

const APIFY_API_URL = 'https://api.apify.com/v2';

/**
 * Detect if ticker is non-US and adjust search sources
 * @param {string} ticker - Stock ticker symbol
 * @param {string} company - Company name (optional)
 * @returns {Object} Search configuration for the company's country
 */
function getSearchSources(ticker, company) {
  const lowerCompany = company?.toLowerCase() || '';
  const upperTicker = ticker?.toUpperCase() || '';
  
  // Japanese companies (Sony, Toyota, Nintendo, etc.)
  if (ticker.endsWith('.T') || lowerCompany.includes('japan') || 
      ['SONY', 'TM', 'NTDOY', 'HMC', '7203.T', '6758.T'].includes(upperTicker)) {
    return {
      sites: 'site:irwebcasting.com OR site:kabu.com OR site:nikkei.com OR site:kabutan.jp',
      reportType: 'annual report OR earnings report OR financial results OR 有価証券報告書',
      language: 'en',
      country: 'jp',
      countryName: 'Japanese'
    };
  }
  
  // UK companies (BP, HSBC, Vodafone, etc.)
  if (ticker.endsWith('.L') || ticker.endsWith('.LON') || 
      ['BP', 'HSBA', 'VOD', 'GSK', 'AZN', 'SHEL'].includes(upperTicker) ||
      lowerCompany.includes('london') || lowerCompany.includes('british')) {
    return {
      sites: 'site:londonstockexchange.com OR site:investegate.co.uk OR site:morningstar.co.uk',
      reportType: 'annual report OR earnings',
      language: 'en',
      country: 'uk',
      countryName: 'UK'
    };
  }
  
  // German companies (SAP, Volkswagen, BMW, etc.)
  if (ticker.endsWith('.DE') || ticker.endsWith('.F') || 
      ['SAP', 'VOW', 'BASFY', 'BMW', 'DAI'].includes(upperTicker) ||
      lowerCompany.includes('german') || lowerCompany.includes('deutschland')) {
    return {
      sites: 'site:boerse-frankfurt.de OR site:finanzen.net OR site:4-traders.com',
      reportType: 'annual report OR geschäftsbericht OR earnings',
      language: 'en',
      country: 'de',
      countryName: 'German'
    };
  }
  
  // Chinese/Hong Kong companies (Alibaba, Tencent, etc.)
  if (ticker.endsWith('.HK') || ticker.endsWith('.SS') || ticker.endsWith('.SZ') ||
      ['BABA', 'TCEHY', 'JD', 'BIDU', '0700.HK', '9988.HK'].includes(upperTicker) ||
      lowerCompany.includes('hong kong') || lowerCompany.includes('china')) {
    return {
      sites: 'site:hkexnews.hk OR site:aastocks.com OR site:etnet.com.hk',
      reportType: 'annual report OR earnings OR interim report',
      language: 'en',
      country: 'hk',
      countryName: 'Hong Kong/Chinese'
    };
  }
  
  // Canadian companies (Shopify, Royal Bank, etc.)
  if (ticker.endsWith('.TO') || ticker.endsWith('.V') ||
      ['SHOP', 'RY', 'TD', 'CNQ', 'ENB'].includes(upperTicker) ||
      lowerCompany.includes('canada') || lowerCompany.includes('canadian')) {
    return {
      sites: 'site:sedar.com OR site:tmx.com OR site:tsx.com',
      reportType: 'annual report OR earnings OR AIF',
      language: 'en',
      country: 'ca',
      countryName: 'Canadian'
    };
  }
  
  // Australian companies
  if (ticker.endsWith('.AX') || ticker.endsWith('.AU') ||
      ['BHP', 'CBA', 'NAB', 'WBC'].includes(upperTicker) ||
      lowerCompany.includes('australia') || lowerCompany.includes('australian')) {
    return {
      sites: 'site:asx.com.au OR site:afr.com OR site:commsec.com.au',
      reportType: 'annual report OR earnings',
      language: 'en',
      country: 'au',
      countryName: 'Australian'
    };
  }
  
  // French companies (LVMH, Total, etc.)
  if (ticker.endsWith('.PA') || 
      ['MC', 'OR', 'SAN', 'AIR'].includes(upperTicker) ||
      lowerCompany.includes('france') || lowerCompany.includes('french')) {
    return {
      sites: 'site:euronext.com OR site:boursorama.com OR site:boursier.com',
      reportType: 'annual report OR rapport annuel OR earnings',
      language: 'en',
      country: 'fr',
      countryName: 'French'
    };
  }
  
  // Default: US companies
  return {
    sites: 'site:sec.gov OR site:wsj.com OR site:bloomberg.com OR site:reuters.com OR site:ft.com',
    reportType: 'annual report OR 10-K',
    language: 'en',
    country: 'us',
    countryName: 'US'
  };
}

/**
 * Search for SEC filings using Apify Google Search Scraper
 * @param {string} ticker - Stock ticker symbol
 * @param {number} year - Filing year
 * @param {string} reportType - Report type (10-K, 10-Q, etc.)
 * @param {string} company - Company name (optional, for better matching)
 * @returns {Promise<{pdfUrl: string, results: array}>}
 */
export async function searchSECFilings(ticker, year, reportType = '10-K', company = null) {
  if (!process.env.APIFY_API_TOKEN) {
    console.warn('[Apify] API token not configured, using fallback');
    return fallbackSECSearch(ticker, year, reportType, company);
  }

  // Detect country and adjust search sources
  const sources = getSearchSources(ticker, company);
  
  // Search across multiple trusted sources for annual reports
  // Include company name in query for better matching: use quotes for exact phrase matching
  const companyPart = company ? `"${company}" OR ` : '';
  const searchQuery = `${companyPart}"${ticker}" ${year} ${sources.reportType} (${sources.sites}) filetype:pdf`;
  
  console.log(`[Apify] Searching for ${sources.countryName} company: "${searchQuery}"`);

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
          languageCode: sources.language,
          countryCode: sources.country,
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

    // Step 2: Validate results match the company/ticker
    const validatedResults = validateResults(pdfResults, ticker, company);
    console.log(`[Apify] Validation summary:`, {
      totalResults: pdfResults.length,
      validatedResults: validatedResults.length,
      filtered: pdfResults.length - validatedResults.length,
      company: company || 'N/A',
      ticker: ticker,
    });

    // Step 3: Use Claude to validate top results for relevance
    let finalResults = validatedResults;
    if (validatedResults.length > 0 && company) {
      try {
        console.log(`[Apify] Starting Claude validation for ${validatedResults.length} results...`);
        finalResults = await validateWithClaude(validatedResults.slice(0, 10), ticker, company);
        console.log(`[Apify] Claude validation complete:`, {
          inputCount: validatedResults.length,
          outputCount: finalResults.length,
          filtered: validatedResults.length - finalResults.length,
          company: company,
          ticker: ticker,
        });
      } catch (claudeError) {
        console.warn('[Apify] Claude validation failed, using basic validation results:', {
          error: claudeError.message,
          fallbackCount: validatedResults.length,
        });
        // Continue with basic validation results
      }
    } else if (!company) {
      console.log(`[Apify] Skipping Claude validation: company name not provided`);
    }

    return {
      ticker,
      year,
      reportType,
      query: searchQuery,
      results: finalResults,
      pdfUrl: finalResults[0]?.url || null,
    };

  } catch (error) {
    console.error('[Apify] Request failed:', {
      message: error.message,
      stack: error.stack,
    });
    return fallbackSECSearch(ticker, year, reportType, company);
  }
}

/**
 * Validate search results match the company/ticker
 * @param {Array} results - Search results
 * @param {string} ticker - Stock ticker symbol
 * @param {string} company - Company name (optional)
 * @returns {Array} Filtered results that match
 */
function validateResults(results, ticker, company) {
  const tickerUpper = ticker.toUpperCase();
  const tickerLower = ticker.toLowerCase();
  
  return results.filter(result => {
    const title = (result.title || '').toLowerCase();
    const snippet = (result.snippet || '').toLowerCase();
    const combinedText = `${title} ${snippet}`;
    
    // Must contain ticker (exact match, case-insensitive)
    const hasTicker = combinedText.includes(tickerLower) || combinedText.includes(tickerUpper);
    
    if (!hasTicker) {
      return false;
    }
    
    // If company name provided, check for company name match (partial)
    if (company) {
      const companyLower = company.toLowerCase();
      const companyWords = companyLower.split(/\s+/).filter(w => w.length > 2); // Filter out short words like "Inc", "Corp"
      const mainCompanyName = companyWords[0] || companyLower; // Use first significant word
      
      // Check if title/snippet contains company name
      const hasCompany = combinedText.includes(mainCompanyName);
      
      // Also check for common variations (remove "Inc.", "Corp.", etc.)
      const companyVariations = [
        companyLower,
        companyLower.replace(/\s+(inc|corp|corporation|llc|ltd)\.?$/i, ''),
        mainCompanyName,
      ];
      
      const hasCompanyVariation = companyVariations.some(variation => 
        variation && combinedText.includes(variation)
      );
      
      return hasCompanyVariation || hasCompany;
    }
    
    return true;
  });
}

/**
 * Use Claude to validate search results for relevance
 * @param {Array} results - Search results to validate
 * @param {string} ticker - Stock ticker symbol
 * @param {string} company - Company name
 * @returns {Promise<Array>} Filtered results with relevance >= 0.7
 */
async function validateWithClaude(results, ticker, company) {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('[Apify] ANTHROPIC_API_KEY not configured, skipping Claude validation');
    return results;
  }

  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const resultsText = results.map((r, idx) => 
      `${idx + 1}. Title: "${r.title}"\n   Snippet: "${r.snippet}"\n   URL: ${r.url}`
    ).join('\n\n');

    const prompt = `You are a financial data validator. Determine if these search results are relevant to ${company} (${ticker}).

Search Results:
${resultsText}

For each result, determine if it's actually about ${company} (${ticker}) and not a different company with a similar name or ticker.

Return a JSON array with this structure:
[
  {
    "index": 0,
    "relevance": 0.0-1.0,
    "reason": "brief explanation"
  }
]

Relevance scores:
- 0.9-1.0: Definitely about ${company} (${ticker})
- 0.7-0.89: Likely about ${company} (${ticker})
- 0.5-0.69: Possibly related but unclear
- 0.0-0.49: Not about ${company} (${ticker}) or wrong company

Return ONLY the JSON array, no markdown or explanation:`;

    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    });

    const responseText = response.content[0].text.trim();
    
    // Parse JSON response
    let validations;
    try {
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        validations = JSON.parse(jsonMatch[0]);
      } else {
        validations = JSON.parse(responseText);
      }
    } catch (parseError) {
      console.warn('[Apify] Failed to parse Claude validation response:', parseError);
      return results; // Return all if parsing fails
    }

    // Filter results with relevance >= 0.7
    const validated = results.filter((result, idx) => {
      const validation = validations.find(v => v.index === idx);
      if (!validation) return true; // Keep if no validation (safer)
      
      const relevance = validation.relevance || 0;
      if (relevance >= 0.7) {
        console.log(`[Apify] Result ${idx + 1} validated: relevance=${relevance.toFixed(2)}, reason="${validation.reason}"`);
        return true;
      } else {
        console.log(`[Apify] Result ${idx + 1} filtered: relevance=${relevance.toFixed(2)}, reason="${validation.reason}"`);
        return false;
      }
    });

    return validated;

  } catch (error) {
    console.error('[Apify] Claude validation error:', error);
    return results; // Return all if validation fails
  }
}

/**
 * Fallback SEC EDGAR direct search
 * Uses SEC's own search when Apify is unavailable
 */
async function fallbackSECSearch(ticker, year, reportType, company = null) {
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

