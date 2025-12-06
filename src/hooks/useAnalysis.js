import { useState, useCallback, useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { runAnalysisPipeline, healthCheck } from '../utils/api.js';
import { 
  getSourceDocuments, 
  getKeyInsights, 
  getTranscript 
} from '../utils/analyzeRequest.js';

/**
 * Custom hook for managing analysis pipeline
 */
export function useAnalysis() {
  const [status, setStatus] = useState('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [backendAvailable, setBackendAvailable] = useState(null);

  // Check backend availability on mount
  useEffect(() => {
    async function checkBackend() {
      try {
        await healthCheck();
        setBackendAvailable(true);
        console.log('Backend API is available');
      } catch (err) {
        setBackendAvailable(false);
        console.log('Backend API not available, running in demo mode');
      }
    }
    checkBackend();
  }, []);

  const runAnalysis = useCallback(async (query) => {
    setStatus('processing');
    setError(null);
    setResult(null);

    try {
      const analysisResult = await runAnalysisPipeline(
        query,
        (newStatus, message) => {
          setStatus(newStatus);
          setStatusMessage(message);
        }
      );

      if (analysisResult.needsClarification) {
        setStatus('clarification_needed');
        setResult(analysisResult);
        return analysisResult;
      }

      setStatus('complete');
      setResult(analysisResult);
      return analysisResult;

    } catch (err) {
      setStatus('error');
      setError(err.message);
      throw err;
    }
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setStatusMessage('');
    setError(null);
    setResult(null);
  }, []);

  return {
    status,
    statusMessage,
    error,
    result,
    backendAvailable,
    runAnalysis,
    reset,
    isProcessing: status === 'processing',
    isComplete: status === 'complete',
    needsClarification: status === 'clarification_needed',
  };
}

/**
 * Custom hook for loading analysis data (for Dashboard)
 * This hook loads the latest analysis from Convex for a given ticker
 */
export function useAnalysisData(ticker) {
  const [loading, setLoading] = useState(true);

  // Query the latest analysis for this ticker from Convex
  const convexAnalysis = useQuery(
    api.analyses.getByTicker,
    ticker ? { ticker: ticker.toUpperCase() } : 'skip'
  );

  useEffect(() => {
    // Loading is complete when Convex query returns (even if null)
    if (convexAnalysis !== undefined) {
      setLoading(false);
    }
  }, [convexAnalysis]);

  // If we have real data from Convex, use it
  if (convexAnalysis && convexAnalysis.status === 'complete') {
    return {
      data: {
        // Map Convex data to frontend format
        // Use sourceDocuments from Apify if available (includes both PDFs and news), limit to 5-6 documents
        documents: convexAnalysis.sourceDocuments && convexAnalysis.sourceDocuments.length > 0
          ? (() => {
              // First, deduplicate by URL (keep first occurrence)
              const uniqueDocs = convexAnalysis.sourceDocuments.filter((doc, index, self) =>
                index === self.findIndex(d => d.url === doc.url && d.url !== '')
              );
              
              // Check if harvestedData.meta.source_url is already in sourceDocuments
              const harvestedUrl = convexAnalysis.harvestedData?.meta?.source_url;
              const hasHarvestedUrl = harvestedUrl && uniqueDocs.some(doc => doc.url === harvestedUrl);
              
              return uniqueDocs
                .slice(0, 6) // Limit to 6 documents (mix of PDFs and news)
                .map((doc, index) => {
                  // Determine document type based on source and URL
                  let docType = 'SEC Filing';
                  if (doc.source === 'news' || doc.source?.includes('news') || 
                      doc.url?.includes('wsj.com') || doc.url?.includes('bloomberg.com') || 
                      doc.url?.includes('reuters.com') || doc.url?.includes('ft.com')) {
                    // Check if it's actually a news article (not a PDF from these sources)
                    if (!doc.url?.endsWith('.pdf') && !doc.url?.includes('.pdf')) {
                      docType = 'News Article';
                    } else if (doc.url?.includes('sec.gov')) {
                      docType = 'SEC Filing';
                    } else {
                      docType = 'Annual Report';
                    }
                  } else if (doc.url?.includes('sec.gov') || doc.url?.includes('/Archives/edgar/')) {
                    docType = 'SEC Filing';
                  } else if (doc.url?.endsWith('.pdf') || doc.url?.includes('.pdf')) {
                    docType = 'Annual Report';
                  }
                  
                  return {
                    id: `doc-${index}`,
                    name: doc.title || (docType === 'News Article' ? 'News Article' : 'SEC Filing'),
                    type: docType,
                    url: doc.url,
                    source: doc.url,
                    snippet: doc.snippet || '',
                    date: new Date(convexAnalysis.createdAt).toLocaleDateString(),
                    relevance: 95
                  };
                });
            })()
          : convexAnalysis.harvestedData?.meta 
            ? [{
                id: 'doc-0',
                name: `${convexAnalysis.harvestedData.meta.report_type} Filing`,
                type: convexAnalysis.harvestedData.meta.report_type,
                url: convexAnalysis.harvestedData.meta.source_url,
                source: convexAnalysis.harvestedData.meta.source_url,
                date: new Date(convexAnalysis.createdAt).toLocaleDateString(),
                relevance: 95
              }]
            : getSourceDocuments(ticker),
        
        insights: convexAnalysis.harvestedData?.content
          ? [
              {
                title: "Management Discussion",
                description: convexAnalysis.harvestedData.content.management_discussion.substring(0, 200) + '...',
                impact: "high"
              },
              {
                title: "Risk Factors",
                description: convexAnalysis.harvestedData.content.risk_factors.substring(0, 200) + '...',
                impact: "high"
              },
              {
                title: "Key Financials",
                description: convexAnalysis.harvestedData.content.key_financials.substring(0, 200) + '...',
                impact: "medium"
              }
            ]
          : getKeyInsights(ticker),
        
        transcript: convexAnalysis.debateScript || getTranscript(ticker),
        harvestedData: convexAnalysis.harvestedData,
        debateScript: convexAnalysis.debateScript,
        audioUrl: convexAnalysis.audioUrl,
        sessionId: convexAnalysis.sessionId,
        ticker: convexAnalysis.ticker,
        company: convexAnalysis.company,
      },
      loading: false,
    };
  }

  // Fallback to mock data while loading or if no Convex data exists
  if (!loading && !convexAnalysis) {
    return {
      data: {
        documents: getSourceDocuments(ticker),
        insights: getKeyInsights(ticker),
        transcript: getTranscript(ticker),
        harvestedData: null,
        debateScript: null,
        audioUrl: null,
      },
      loading: false,
    };
  }

  // Still loading
  return { data: null, loading: true };
}

/**
 * Status steps for the terminal animation
 */
export const PIPELINE_STEPS = [
  { key: 'extracting_intent', label: 'Analyzing request...', icon: 'search' },
  { key: 'searching_pdf', label: 'Searching SEC filings...', icon: 'file' },
  { key: 'harvesting', label: 'Extracting financial data...', icon: 'database' },
  { key: 'generating_debate', label: 'Generating debate script...', icon: 'message' },
  { key: 'synthesizing_audio', label: 'Creating audio podcast...', icon: 'audio' },
  { key: 'complete', label: 'Analysis complete!', icon: 'check' },
];

export function getStepIndex(status) {
  return PIPELINE_STEPS.findIndex(step => step.key === status);
}

export default {
  useAnalysis,
  useAnalysisData,
  PIPELINE_STEPS,
  getStepIndex,
};


