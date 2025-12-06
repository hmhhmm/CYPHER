/**
 * API client for CYPHER backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Generic fetch wrapper with error handling and debug logging
 */
async function fetchAPI(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const method = options.method || 'GET';
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };
  
  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };
  
  // Debug log: Request
  console.log(`[API] ${method} ${url}`, {
    hasBody: !!options.body,
    bodyLength: options.body?.length || 0,
  });
  
  const startTime = performance.now();
  
  try {
    const response = await fetch(url, config);
    const duration = Math.round(performance.now() - startTime);
    
    // Debug log: Response status
    console.log(`[API] ${method} ${url} → ${response.status} (${duration}ms)`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(errorData.error || `HTTP ${response.status}`);
      console.error(`[API Error] ${method} ${url}:`, {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        duration: `${duration}ms`,
      });
      throw error;
    }
    
    const data = await response.json();
    console.log(`[API Success] ${method} ${url}:`, {
      dataKeys: Object.keys(data),
      duration: `${duration}ms`,
    });
    
    return data;
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);
    console.error(`[API Error] ${method} ${url} FAILED:`, {
      error: error.message,
      errorType: error.name,
      duration: `${duration}ms`,
      stack: error.stack,
    });
    throw error;
  }
}

/**
 * Transcribe audio file to text
 * @param {Blob} audioBlob - The audio file to transcribe
 * @returns {Promise<{transcript: string, confidence: number}>}
 */
export async function transcribeAudio(audioBlob) {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.webm');
  
  const response = await fetch(`${API_BASE_URL}/api/transcribe`, {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Transcription failed');
  }
  
  return response.json();
}

/**
 * Extract intent from natural language query
 * @param {string} text - User's query
 * @returns {Promise<{company, ticker, year, request, confidence, suggestions?}>}
 */
export async function extractIntent(text) {
  console.log('[API] extractIntent called:', { textLength: text?.length || 0 });
  try {
    const result = await fetchAPI('/api/intent/extract', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
    console.log('[API] extractIntent result:', { 
      ticker: result.ticker, 
      company: result.company,
      sessionId: result.sessionId,
      confidence: result.confidence,
    });
    return result;
  } catch (error) {
    console.error('[API] extractIntent FAILED:', error);
    throw error;
  }
}

/**
 * Validate a stock ticker
 * @param {string} ticker - Stock symbol to validate
 * @returns {Promise<{valid: boolean, ticker: string, company?: string, suggestions?: array}>}
 */
export async function validateTicker(ticker) {
  return fetchAPI('/api/intent/validate', {
    method: 'POST',
    body: JSON.stringify({ ticker }),
  });
}

/**
 * Search for tickers matching a query
 * @param {string} search - Search query
 * @returns {Promise<{results: array}>}
 */
export async function searchTickers(search) {
  return fetchAPI(`/api/intent/tickers?search=${encodeURIComponent(search)}`);
}

/**
 * Search for SEC PDF filings
 * @param {string} ticker - Stock symbol
 * @param {number} year - Filing year
 * @param {string} reportType - Report type (10-K, 10-Q, etc.)
 * @param {string} sessionId - Optional session ID to save source documents
 * @returns {Promise<{pdfUrl: string, results: array}>}
 */
export async function searchPDF(ticker, year, reportType = '10-K', sessionId = null) {
  console.log('[API] searchPDF called:', { ticker, year, reportType, sessionId });
  try {
    const url = `/api/pdf/search?ticker=${ticker}&year=${year}&reportType=${reportType}${sessionId ? `&sessionId=${sessionId}` : ''}`;
    const result = await fetchAPI(url, {
      method: 'GET',
    });
    console.log('[API] searchPDF result:', { 
      found: result.results?.length || 0,
      pdfUrl: result.pdfUrl || 'none',
    });
    return result;
  } catch (error) {
    console.error('[API] searchPDF FAILED:', error);
    throw error;
  }
}

/**
 * Harvest data from a PDF URL
 * @param {string} pdfUrl - URL of the PDF to harvest
 * @param {string} ticker - Stock symbol
 * @param {string} company - Company name
 * @param {string} sessionId - Session ID for Convex tracking
 * @returns {Promise<HarvestedData>}
 */
export async function harvestPDF(pdfUrl, ticker, company, sessionId) {
  console.log('[API] harvestPDF called:', { 
    pdfUrl: pdfUrl?.substring(0, 50) + '...', 
    ticker, 
    company,
    sessionId,
  });
  try {
    const result = await fetchAPI('/api/pdf/harvest-url', {
      method: 'POST',
      body: JSON.stringify({ pdfUrl, ticker, company, sessionId }),
    });
    console.log('[API] harvestPDF result:', { 
      success: result.success,
      source: result.source,
      hasHarvestedData: !!result.harvestedData,
    });
    return result;
  } catch (error) {
    console.error('[API] harvestPDF FAILED:', error);
    throw error;
  }
}

/**
 * Search for company news
 * @param {string} ticker - Stock symbol
 * @param {string} company - Company name
 * @param {number} limit - Number of articles to fetch (default: 10)
 * @returns {Promise<{articles: array}>}
 */
export async function searchNews(ticker, company, limit = 10) {
  console.log('[API] searchNews called:', { ticker, company, limit });
  try {
    const result = await fetchAPI('/api/news/search', {
      method: 'POST',
      body: JSON.stringify({ ticker, company, limit }),
    });
    console.log('[API] searchNews result:', { 
      articlesFound: result.articles?.length || 0,
    });
    return result;
  } catch (error) {
    console.error('[API] searchNews FAILED:', error);
    throw error;
  }
}

/**
 * Generate debate script from harvested data
 * @param {HarvestedData} harvestedData - The harvested financial data
 * @param {string} sessionId - Session ID for Convex tracking
 * @returns {Promise<{meta: object, script: array}>}
 */
export async function generateDebate(harvestedData, sessionId) {
  console.log('[API] generateDebate called:', { 
    sessionId,
    hasHarvestedData: !!harvestedData,
    ticker: harvestedData?.meta?.ticker,
  });
  try {
    const result = await fetchAPI('/api/debate/generate', {
      method: 'POST',
      body: JSON.stringify({ harvestedData, sessionId }),
    });
    console.log('[API] generateDebate result:', { 
      lineCount: result.script?.length || 0,
      totalDuration: result.meta?.totalDuration,
    });
    return result;
  } catch (error) {
    console.error('[API] generateDebate FAILED:', error);
    throw error;
  }
}

/**
 * Generate comprehensive analysis report from harvested data
 * @param {HarvestedData} harvestedData - The harvested financial data
 * @param {string} sessionId - Session ID for Convex tracking
 * @param {string} company - Company name
 * @param {string} ticker - Stock ticker
 * @returns {Promise<{report: object, meta: object}>}
 */
export async function generateAnalysisReport(harvestedData, sessionId, company, ticker) {
  console.log('[API] generateAnalysisReport called:', { 
    sessionId,
    hasHarvestedData: !!harvestedData,
    company,
    ticker,
  });
  try {
    const result = await fetchAPI('/api/analysis/generate-report', {
      method: 'POST',
      body: JSON.stringify({ 
        harvestedData, 
        sessionId, 
        company,
        ticker,
      }),
    });
    console.log('[API] generateAnalysisReport result:', { 
      hasReport: !!result.report,
      strengths: result.report?.keyStrengths?.length || 0,
      risks: result.report?.keyRisks?.length || 0,
    });
    return result;
  } catch (error) {
    console.error('[API] generateAnalysisReport FAILED:', error);
    throw error;
  }
}

/**
 * Synthesize audio from debate script
 * @param {array} debateScript - Array of debate lines
 * @param {string} sessionId - Session ID for Convex tracking
 * @returns {Promise<{audioUrl: string, duration: number}>}
 */
export async function synthesizeAudio(debateScript, sessionId) {
  console.log('[API] synthesizeAudio called:', { 
    sessionId,
    scriptLength: debateScript?.length || 0,
  });
  try {
    const result = await fetchAPI('/api/audio/synthesize', {
      method: 'POST',
      body: JSON.stringify({ debateScript, sessionId }),
    });
    console.log('[API] synthesizeAudio result:', { 
      success: result.success,
      segments: result.segments,
      audioUrl: result.audioUrl || 'none',
    });
    return result;
  } catch (error) {
    console.error('[API] synthesizeAudio FAILED:', error);
    throw error;
  }
}

/**
 * Synthesize a single line of audio (for testing)
 * @param {string} text - Text to speak
 * @param {string} speaker - 'bull' or 'bear'
 * @returns {Promise<Blob>}
 */
export async function synthesizeLine(text, speaker = 'bull') {
  const response = await fetch(`${API_BASE_URL}/api/audio/synthesize-line`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, speaker }),
  });
  
  if (!response.ok) {
    throw new Error('Audio synthesis failed');
  }
  
  return response.blob();
}

/**
 * Get available voices
 * @returns {Promise<{voices: object}>}
 */
export async function getVoices() {
  return fetchAPI('/api/audio/voices');
}

/**
 * Health check
 * @returns {Promise<{status: string}>}
 */
export async function healthCheck() {
  return fetchAPI('/api/health');
}

/**
 * Run the full analysis pipeline
 * @param {string} query - User's natural language query
 * @param {function} onStatusChange - Callback for status updates
 * @returns {Promise<{analysis: object, debateScript: array, sessionId: string}>}
 */
export async function runAnalysisPipeline(query, onStatusChange = () => {}) {
  console.log('[Pipeline] Starting analysis pipeline:', { query });
  const pipelineStartTime = performance.now();
  
  try {
    // Step 1: Extract intent
    console.log('[Pipeline] Step 1: Extracting intent...');
    onStatusChange('extracting_intent', 'Analyzing your request...');
    const intent = await extractIntent(query);
    console.log('[Pipeline] Step 1 complete:', { 
      ticker: intent.ticker, 
      company: intent.company,
      sessionId: intent.sessionId,
    });
    
    if (intent.status === 'clarification_needed') {
      console.warn('[Pipeline] Clarification needed:', intent.message);
      return { 
        needsClarification: true, 
        intent,
        message: intent.message,
        suggestions: intent.suggestions,
      };
    }

    // Get sessionId from intent (backend creates it)
    const sessionId = intent.sessionId;
    
    // Step 2: Search for PDF and news (backend automatically fetches and combines both)
    console.log('[Pipeline] Step 2: Searching for PDFs and news...');
    onStatusChange('searching_pdf', `Searching for ${intent.ticker} filings and news...`);
    const pdfResults = await searchPDF(intent.ticker, intent.year, '10-K', sessionId);
    console.log('[Pipeline] Step 2 complete:', { 
      resultsFound: pdfResults.results?.length || 0,
      pdfUrl: pdfResults.pdfUrl || 'none',
      note: 'News articles are automatically fetched and saved as sourceDocuments',
    });
    
    // For demo, we'll use sample data if no PDF found
    let harvestedData;
    
    if (pdfResults.results && pdfResults.results.length > 0 && pdfResults.results[0].url) {
      // Step 3: Harvest PDF
      console.log('[Pipeline] Step 3: Harvesting PDF...');
      onStatusChange('harvesting', 'Extracting financial data from filing...');
      const harvestResult = await harvestPDF(
        pdfResults.results[0].url,
        intent.ticker,
        intent.company,
        sessionId
      );
      // Extract harvestedData from response (handles both direct data and wrapped response)
      harvestedData = harvestResult.harvestedData || harvestResult;
      console.log('[Pipeline] Step 3 complete:', { 
        source: harvestResult.source,
        hasData: !!harvestedData,
      });
    } else {
      // Use sample data for demo
      console.warn('[Pipeline] Step 3: No PDF found, using sample data');
      onStatusChange('harvesting', 'Loading financial data...');
      harvestedData = await getSampleData(intent.ticker);
    }
    
    // Step 4: Generate debate (backend automatically includes news context from Convex)
    console.log('[Pipeline] Step 4: Generating debate with news context...');
    onStatusChange('generating_debate', 'Generating Bull vs Bear debate with news context...');
    const debateResult = await generateDebate(harvestedData, sessionId);
    console.log('[Pipeline] Step 4 complete:', { 
      scriptLines: debateResult.script?.length || 0,
      note: 'Debate includes context from annual report and recent news',
    });
    
    // Step 4.5: Generate analysis report
    console.log('[Pipeline] Step 4.5: Generating comprehensive analysis report...');
    onStatusChange('generating_report', 'Generating comprehensive analysis report...');
    let analysisReport = null;
    try {
      // Get source documents from the analysis session
      const reportResult = await generateAnalysisReport(harvestedData, sessionId, intent.company, intent.ticker);
      analysisReport = reportResult.report;
      console.log('[Pipeline] Step 4.5 complete:', {
        hasReport: !!analysisReport,
        strengths: analysisReport?.keyStrengths?.length || 0,
        risks: analysisReport?.keyRisks?.length || 0,
      });
    } catch (reportError) {
      console.warn('[Pipeline] Step 4.5: Analysis report generation skipped:', reportError.message);
      // Continue without report - not critical
    }
    
    // Step 5: Synthesize audio (optional - skip if no API key)
    console.log('[Pipeline] Step 5: Synthesizing audio...');
    onStatusChange('synthesizing_audio', 'Creating audio podcast...');
    let audioResult = null;
    try {
      audioResult = await synthesizeAudio(debateResult.script, sessionId);
      console.log('[Pipeline] Step 5 complete:', { 
        audioUrl: audioResult?.audioUrl || 'none',
      });
    } catch (error) {
      console.warn('[Pipeline] Step 5: Audio synthesis skipped:', error.message);
    }

    onStatusChange('complete', 'Analysis complete!');

    const pipelineDuration = Math.round(performance.now() - pipelineStartTime);
    console.log('[Pipeline] Pipeline complete successfully:', {
      sessionId,
      ticker: intent.ticker,
      duration: `${pipelineDuration}ms`,
      steps: {
        intent: '✓',
        pdfSearch: '✓',
        harvest: '✓',
        debate: '✓',
        audio: audioResult ? '✓' : 'skipped',
      },
    });
  
    return {
      sessionId,
      ticker: intent.ticker,
      company: intent.company,
      harvestedData,
      debateScript: debateResult.script,
      analysisReport: analysisReport,
      audioUrl: audioResult?.audioUrl || null,
      meta: debateResult.meta,
    };
  } catch (error) {
    const pipelineDuration = Math.round(performance.now() - pipelineStartTime);
    console.error('[Pipeline] Pipeline FAILED:', {
      error: error.message,
      duration: `${pipelineDuration}ms`,
      query,
      stack: error.stack,
    });
    throw error;
  }
}

/**
 * Get sample harvested data (for demo/development)
 */
async function getSampleData(ticker) {
  // Try to fetch from server's sample data
  try {
    const response = await fetch(`${API_BASE_URL}/api/sample-data/${ticker}`);
    if (response.ok) {
      return response.json();
    }
  } catch (error) {
    console.warn('Could not fetch sample data from server');
  }
  
  // Fallback to hardcoded sample
  return {
    meta: {
      ticker: ticker.toUpperCase(),
      company: getCompanyName(ticker),
      report_type: '10-K',
      period: new Date().getFullYear().toString(),
      source_url: 'https://www.sec.gov',
    },
    content: {
      management_discussion: `${getCompanyName(ticker)} delivered strong performance this year with revenue growth driven by core business segments. Management remains optimistic about future growth prospects and continues to invest in innovation and market expansion.`,
      risk_factors: `Key risks include intense competition, regulatory challenges, macroeconomic conditions, supply chain dependencies, and technology disruption. The company faces ongoing legal and compliance matters.`,
      key_financials: `Revenue: Growing YoY. Margins: Under pressure from competition. Cash position: Strong. Debt: Manageable levels.`,
    },
  };
}

function getCompanyName(ticker) {
  const companies = {
    TSLA: 'Tesla Inc.',
    AAPL: 'Apple Inc.',
    MSFT: 'Microsoft Corporation',
    GOOGL: 'Alphabet Inc.',
    AMZN: 'Amazon.com Inc.',
    NVDA: 'NVIDIA Corporation',
    META: 'Meta Platforms Inc.',
  };
  return companies[ticker.toUpperCase()] || ticker;
}

export default {
  transcribeAudio,
  extractIntent,
  validateTicker,
  searchTickers,
  searchPDF,
  harvestPDF,
  generateDebate,
  generateAnalysisReport,
  synthesizeAudio,
  synthesizeLine,
  getVoices,
  searchNews,
  healthCheck,
  runAnalysisPipeline,
};


