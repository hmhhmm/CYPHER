/**
 * PDF Service for downloading and parsing SEC filings
 */

import pdf from 'pdf-parse/lib/pdf-parse.js';
import crypto from 'crypto';

/**
 * Download PDF from URL
 * @param {string} pdfUrl - URL of the PDF
 * @returns {Promise<Buffer>}
 */
export async function downloadPDF(pdfUrl) {
  console.log(`[PDF] Downloading: ${pdfUrl}`);
  
  const response = await fetch(pdfUrl, {
    headers: {
      'User-Agent': 'CYPHER Financial Analyzer (educational use)',
      'Accept': 'application/pdf',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download PDF: HTTP ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  console.log(`[PDF] Downloaded ${buffer.length} bytes`);
  
  return buffer;
}

/**
 * Parse PDF buffer to text
 * @param {Buffer} buffer - PDF file buffer
 * @returns {Promise<{text: string, pages: number, info: object}>}
 */
export async function parsePDF(buffer) {
  const data = await pdf(buffer);
  
  return {
    text: data.text,
    pages: data.numpages,
    info: data.info,
  };
}

/**
 * Calculate hash of PDF for caching
 * @param {Buffer} buffer - PDF file buffer
 * @returns {string}
 */
export function calculateHash(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Extract specific sections from 10-K text
 * Attempts to find MD&A, Risk Factors, and Financial Data sections
 * @param {string} text - Full PDF text
 * @returns {object}
 */
export function extractSections(text) {
  const sections = {
    managementDiscussion: '',
    riskFactors: '',
    financialStatements: '',
  };

  // Common section headers in 10-K filings
  const mdaPatterns = [
    /MANAGEMENT['']?S DISCUSSION AND ANALYSIS/i,
    /ITEM 7[\.\s]+MANAGEMENT/i,
    /MD&A/i,
  ];

  const riskPatterns = [
    /RISK FACTORS/i,
    /ITEM 1A[\.\s]+RISK/i,
  ];

  const financialPatterns = [
    /CONSOLIDATED STATEMENTS OF OPERATIONS/i,
    /CONSOLIDATED BALANCE SHEET/i,
    /FINANCIAL STATEMENTS/i,
    /ITEM 8[\.\s]+FINANCIAL/i,
  ];

  // Simple section extraction (basic implementation)
  // In production, use more sophisticated NLP or Claude for extraction
  
  // Find MD&A section
  for (const pattern of mdaPatterns) {
    const match = text.match(pattern);
    if (match) {
      const startIndex = match.index;
      const endIndex = Math.min(startIndex + 20000, text.length);
      sections.managementDiscussion = text.substring(startIndex, endIndex);
      break;
    }
  }

  // Find Risk Factors section
  for (const pattern of riskPatterns) {
    const match = text.match(pattern);
    if (match) {
      const startIndex = match.index;
      const endIndex = Math.min(startIndex + 15000, text.length);
      sections.riskFactors = text.substring(startIndex, endIndex);
      break;
    }
  }

  // Find Financial Statements section
  for (const pattern of financialPatterns) {
    const match = text.match(pattern);
    if (match) {
      const startIndex = match.index;
      const endIndex = Math.min(startIndex + 10000, text.length);
      sections.financialStatements = text.substring(startIndex, endIndex);
      break;
    }
  }

  return sections;
}

/**
 * Validate PDF is from a trusted source
 * @param {string} url - PDF URL
 * @returns {boolean}
 */
export function validateSource(url) {
  const trustedDomains = [
    'sec.gov',
    '.gov',
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
    return trustedDomains.some(domain => urlObj.hostname.endsWith(domain));
  } catch {
    return false;
  }
}

/**
 * Full pipeline: download, parse, extract sections
 * @param {string} pdfUrl - URL of the PDF
 * @returns {Promise<{text: string, pages: number, hash: string, sections: object}>}
 */
export async function processPDF(pdfUrl) {
  const buffer = await downloadPDF(pdfUrl);
  const hash = calculateHash(buffer);
  const { text, pages, info } = await parsePDF(buffer);
  const sections = extractSections(text);

  return {
    text,
    pages,
    hash,
    info,
    sections,
    textLength: text.length,
  };
}

export default {
  downloadPDF,
  parsePDF,
  calculateHash,
  extractSections,
  validateSource,
  processPDF,
};


