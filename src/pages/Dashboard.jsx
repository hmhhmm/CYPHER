import { useParams, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Zap, Sparkles, AlertCircle, Download, RefreshCw } from 'lucide-react'
import SourceDocuments from '../components/SourceDocuments'
import PodcastPlayer from '../components/PodcastPlayer'
import KeyInsights from '../components/KeyInsights'
import StockChart from '../components/StockChart'
import AnalysisReportViewer from '../components/AnalysisReportViewer'

export default function Dashboard() {
  const { ticker: paramTicker } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  
  // Get data from location.state (passed from Terminal/Landing after pipeline)
  const stateData = location.state?.analysisData
  
  // Get ticker and company from multiple sources
  const ticker = paramTicker || stateData?.ticker || searchParams.get('ticker') || 'TSLA'
  const company = stateData?.company || searchParams.get('company') || location.state?.company || 'Company'
  
  // Check if we have real data from the pipeline
  const hasRealData = !!(stateData && (stateData.harvestedData || stateData.debateScript))
  
  console.log('[Dashboard] State data:', {
    hasStateData: !!stateData,
    ticker,
    company,
    hasHarvestedData: !!stateData?.harvestedData,
    hasDebateScript: !!stateData?.debateScript,
    debateScriptLength: stateData?.debateScript?.length,
    hasAnalysisReport: !!stateData?.analysisReport,
  })
  
  // Build documents from harvestedData
  const documents = buildDocuments(stateData, ticker)
  
  // Build insights from harvestedData
  const insights = buildInsights(stateData)
  
  // Build transcript from debateScript
  const transcript = normalizeDebateScript(stateData?.debateScript)
  
  // Format price with currency (if available)
  const currentPrice = stateData?.meta?.currentPrice || null

  return (
    <motion.div 
      className="min-h-screen p-4 md:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Top Navigation Bar */}
      <motion.header 
        className="flex items-center justify-between mb-6 px-4 py-3 bg-white/5 backdrop-blur border border-white/10 rounded-xl"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-4">
          <motion.button
            onClick={() => navigate('/')}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <ArrowLeft size={20} />
          </motion.button>
          
          <div className="h-6 w-px bg-white/20" />
          
          <h1 className="text-xl font-bold text-white tracking-wide">CYPHER</h1>
          
          <div className="h-6 w-px bg-white/20" />
          
          <div className="flex items-center gap-2">
            <span className="text-purple-400 font-mono font-semibold text-lg">${ticker}</span>
            <span className="text-gray-500">•</span>
            <span className="text-gray-400 text-sm">{company}</span>
            {currentPrice && (
              <>
                <span className="text-gray-500">•</span>
                <span className="text-white font-mono">${currentPrice.toFixed(2)}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Data source indicator */}
          {hasRealData ? (
            <motion.div 
              className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
            >
              <Sparkles size={12} className="text-green-400" />
              <span className="text-xs text-green-400 font-medium">AI Generated</span>
            </motion.div>
          ) : (
            <motion.div 
              className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-full"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
            >
              <AlertCircle size={12} className="text-yellow-400" />
              <span className="text-xs text-yellow-400 font-medium">No Data</span>
            </motion.div>
          )}
          
          <motion.div 
            className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full"
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-xs text-green-400 font-medium">LIVE</span>
          </motion.div>
          
          <div className="flex items-center gap-2 text-gray-400">
            <Zap size={14} className="text-purple-400" />
            <span className="text-xs">Analysis Complete</span>
          </div>
          
          {/* Download Analysis Report Button */}
          {stateData?.analysisReport && (
            <motion.button
              onClick={() => {
                // If we have a direct PDF data URL, use it
                if (stateData.analysisReport.pdfDataUrl) {
                  const link = document.createElement('a')
                  link.href = stateData.analysisReport.pdfDataUrl
                  link.download = `${ticker}_Analysis_Report.pdf`
                  link.click()
                }
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded-full transition-all"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Download size={14} className="text-purple-400" />
              <span className="text-xs text-purple-400 font-medium">Download Report</span>
            </motion.button>
          )}
        </div>
      </motion.header>

      {/* No Data Warning */}
      {!hasRealData && (
        <motion.div 
          className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3">
            <AlertCircle size={20} className="text-yellow-400" />
            <div className="flex-1">
              <p className="text-yellow-400 text-sm font-medium">No analysis data available</p>
              <p className="text-gray-400 text-xs mt-1">Run a new analysis from the home page to see real data.</p>
            </div>
            <motion.button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-lg text-purple-400 text-sm"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <RefreshCw size={14} />
              New Analysis
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* 3-Column Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-200px)]">
        {/* Column 1: The Vault (Source Documents) + Analysis Report - 3 cols */}
        <motion.div 
          className="lg:col-span-3 flex flex-col gap-4 overflow-hidden"
          initial={{ x: -30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          {/* Source Documents - Takes 60% height */}
          <div className="bento-card flex-[3] min-h-0 overflow-hidden">
            <SourceDocuments documents={documents} ticker={ticker} />
          </div>
          
          {/* Analysis Report - Takes 40% height */}
          <div className="bento-card flex-[2] min-h-0 overflow-hidden">
            <AnalysisReportViewer analysisData={stateData} ticker={ticker} />
          </div>
        </motion.div>

        {/* Column 2: The Broadcast (Live Debate) - 5 cols */}
        <motion.div 
          className="lg:col-span-5 bento-card flex flex-col overflow-hidden"
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <PodcastPlayer 
            ticker={ticker}
            transcript={transcript}
            analysisReport={stateData?.analysisReport}
            keyInsights={insights}
            broadcastAudioUrl={stateData?.broadcastAudioUrl}
          />
        </motion.div>

        {/* Column 3: The Terminal (Market Analysis) - 4 cols */}
        <motion.div 
          className="lg:col-span-4 flex flex-col gap-4 overflow-hidden"
          initial={{ x: 30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          {/* Top: Key Insights */}
          <div className="bento-card flex-1 min-h-0 overflow-hidden">
            <KeyInsights insights={insights} ticker={ticker} />
          </div>
          
          {/* Bottom: Stock Chart */}
          <div className="bento-card flex-1 min-h-0 overflow-hidden">
            <StockChart ticker={ticker} />
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}

/**
 * Build documents from pipeline result
 */
function buildDocuments(stateData, ticker) {
  if (!stateData) return []
  
  const docs = []
  
  // Add source PDF from harvestedData
  if (stateData.harvestedData?.meta) {
    const { meta } = stateData.harvestedData
    docs.push({
      id: 1,
      name: `${ticker} ${meta.report_type || '10-K'} Filing`,
      type: 'SEC Filing',
      url: meta.source_url,
      source: 'SEC EDGAR',
    })
  }
  
  // Add any additional source documents passed from pipeline
  if (stateData.sourceDocuments && Array.isArray(stateData.sourceDocuments)) {
    stateData.sourceDocuments.forEach((doc, i) => {
      if (!docs.some(d => d.url === doc.url)) {
        docs.push({
          id: docs.length + 1,
          name: doc.title || doc.name || `Source ${i + 1}`,
          type: doc.type || 'Document',
          url: doc.url,
          source: doc.source || 'Web',
        })
      }
    })
  }
  
  // Add analysis report as a document if available
  if (stateData.analysisReport) {
    docs.push({
      id: docs.length + 1,
      name: `${ticker} AI Analysis Report`,
      type: 'CYPHER Report',
      url: stateData.analysisReport.pdfDataUrl || '#',
      source: 'CYPHER AI',
    })
  }
  
  return docs
}

/**
 * Build insights from harvestedData content
 */
function buildInsights(stateData) {
  if (!stateData?.harvestedData?.content) return []
  
  const { content } = stateData.harvestedData
  const insights = []
  
  // Parse management discussion for bullish points
  if (content.management_discussion) {
    const mda = content.management_discussion.toLowerCase()
    
    if (mda.includes('growth') || mda.includes('increase') || mda.includes('strong') || mda.includes('revenue')) {
      insights.push({
        type: 'bullish',
        title: 'Growth Momentum',
        text: extractSentence(content.management_discussion, ['growth', 'increase', 'strong', 'record', 'revenue'])
      })
    }
  }
  
  // Parse risk factors for bearish points
  if (content.risk_factors) {
    const risks = content.risk_factors.toLowerCase()
    
    if (risks.includes('competition') || risks.includes('risk') || risks.includes('uncertainty')) {
      insights.push({
        type: 'bearish',
        title: 'Key Risks',
        text: extractSentence(content.risk_factors, ['competition', 'risk', 'uncertainty', 'challenge'])
      })
    }
  }
  
  // Parse financials for metrics
  if (content.key_financials) {
    insights.push({
      type: 'neutral',
      title: 'Financial Metrics',
      text: content.key_financials.split('\n')[0]?.trim() || 'See report for detailed financials.'
    })
  }
  
  // Add insights from analysisReport if available
  if (stateData.analysisReport?.report) {
    const report = stateData.analysisReport.report
    
    if (report.keyStrengths?.length > 0) {
      insights.push({
        type: 'bullish',
        title: 'Key Strength',
        text: report.keyStrengths[0]
      })
    }
    
    if (report.keyRisks?.length > 0) {
      insights.push({
        type: 'bearish',
        title: 'Risk Factor',
        text: report.keyRisks[0]
      })
    }
  }
  
  return insights.slice(0, 4)
}

/**
 * Extract a relevant sentence containing keywords
 */
function extractSentence(text, keywords) {
  if (!text) return 'See full report for details.'
  
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10)
  
  for (const sentence of sentences) {
    const lower = sentence.toLowerCase()
    if (keywords.some(kw => lower.includes(kw))) {
      const cleaned = sentence.trim()
      return cleaned.length > 150 ? cleaned.substring(0, 147) + '...' : cleaned
    }
  }
  
  return sentences[0]?.trim().substring(0, 150) || 'See full report for details.'
}

/**
 * Normalize debate script to expected transcript format
 */
function normalizeDebateScript(debateScript) {
  if (!debateScript || !Array.isArray(debateScript)) {
    console.log('[Dashboard] No debate script to normalize')
    return []
  }
  
  console.log('[Dashboard] Normalizing debate script:', debateScript.length, 'lines')
  
  let currentTime = 0
  return debateScript.map((line, index) => {
    const duration = line.duration_estimate || line.end - line.start || 8
    const start = line.start !== undefined ? line.start : currentTime
    const end = line.end !== undefined ? line.end : start + duration
    currentTime = end
    
    return {
      id: line.id || index + 1,
      speaker: (line.speaker || 'bull').toLowerCase(),
      text: line.text,
      start,
      end,
    }
  })
}
