/**
 * API client for CYPHER backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Generic fetch wrapper with error handling
 */
async function fetchAPI(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
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
  
  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
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
  return fetchAPI('/api/intent/extract', {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
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
 * @returns {Promise<{pdfUrl: string, results: array}>}
 */
export async function searchPDF(ticker, year, reportType = '10-K') {
  return fetchAPI('/api/pdf/search', {
    method: 'POST',
    body: JSON.stringify({ ticker, year, reportType }),
  });
}

/**
 * Harvest data from a PDF
 * @param {string} pdfUrl - URL of the PDF to harvest
 * @param {string} ticker - Stock symbol
 * @param {string} company - Company name
 * @param {string} sessionId - Session ID for Convex tracking
 * @returns {Promise<HarvestedData>}
 */
export async function harvestPDF(pdfUrl, ticker, company, sessionId) {
  return fetchAPI('/api/pdf/harvest', {
    method: 'POST',
    body: JSON.stringify({ pdfUrl, ticker, company, sessionId }),
  });
}

/**
 * Generate debate script from harvested data
 * @param {HarvestedData} harvestedData - The harvested financial data
 * @param {string} sessionId - Session ID for Convex tracking
 * @returns {Promise<{meta: object, script: array}>}
 */
export async function generateDebate(harvestedData, sessionId) {
  return fetchAPI('/api/debate/generate', {
    method: 'POST',
    body: JSON.stringify({ harvestedData, sessionId }),
  });
}

/**
 * Synthesize audio from debate script
 * @param {array} debateScript - Array of debate lines
 * @param {string} sessionId - Session ID for Convex tracking
 * @returns {Promise<{audioUrl: string, duration: number}>}
 */
export async function synthesizeAudio(debateScript, sessionId) {
  return fetchAPI('/api/audio/synthesize', {
    method: 'POST',
    body: JSON.stringify({ debateScript, sessionId }),
  });
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
  // Step 1: Extract intent
  onStatusChange('extracting_intent', 'Analyzing your request...');
  const intent = await extractIntent(query);
  
  if (intent.status === 'clarification_needed') {
    return { 
      needsClarification: true, 
      intent,
      message: intent.message,
      suggestions: intent.suggestions,
    };
  }

  // Get sessionId from intent (backend creates it)
  const sessionId = intent.sessionId;
  
  // Step 2: Search for PDF
  onStatusChange('searching_pdf', `Searching for ${intent.ticker} SEC filings...`);
  const pdfResults = await searchPDF(intent.ticker, intent.year);
  
  // For demo, we'll use sample data if no PDF found
  let harvestedData;
  
  if (pdfResults.results && pdfResults.results.length > 0) {
    // Step 3: Harvest PDF
    onStatusChange('harvesting', 'Extracting financial data from filing...');
    harvestedData = await harvestPDF(
      pdfResults.results[0].url,
      intent.ticker,
      intent.company,
      sessionId
    );
  } else {
    // Use sample data for demo
    onStatusChange('harvesting', 'Loading financial data...');
    harvestedData = await getSampleData(intent.ticker);
  }
  
  // Step 4: Generate debate
  onStatusChange('generating_debate', 'Generating Bull vs Bear debate...');
  const debateResult = await generateDebate(harvestedData, sessionId);
  
  // Step 5: Synthesize audio (optional - skip if no API key)
  onStatusChange('synthesizing_audio', 'Creating audio podcast...');
  let audioResult = null;
  try {
    audioResult = await synthesizeAudio(debateResult.script, sessionId);
  } catch (error) {
    console.warn('Audio synthesis skipped:', error.message);
  }
  
  onStatusChange('complete', 'Analysis complete!');
  
  return {
    sessionId,
    intent,
    harvestedData,
    debateScript: debateResult.script,
    audioUrl: audioResult?.audioUrl,
    meta: debateResult.meta,
  };
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
  synthesizeAudio,
  synthesizeLine,
  getVoices,
  healthCheck,
  runAnalysisPipeline,
};

