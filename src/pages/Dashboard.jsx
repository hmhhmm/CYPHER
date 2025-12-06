import { useParams, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Zap, TrendingUp, TrendingDown, Sparkles, AlertCircle, RefreshCw } from 'lucide-react'
import SourceDocuments from '../components/SourceDocuments'
import PodcastPlayer from '../components/PodcastPlayer'
import KeyInsights from '../components/KeyInsights'
import StockChart from '../components/StockChart'

export default function Dashboard() {
  const { ticker: paramTicker } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  
  // Get ticker and company from multiple sources (priority: URL params > search params > state > default)
  const ticker = paramTicker || searchParams.get('ticker') || location.state?.ticker || 'TSLA'
  const company = searchParams.get('company') || location.state?.company || 'Tesla Inc.'
  
  // Get analysis data from navigation state (passed from Landing page's streamlined pipeline)
  const stateData = location.state?.analysisData
  
  // State for data
  const [loading, setLoading] = useState(!stateData)
  const [analysisData, setAnalysisData] = useState(stateData || null)
  
  // Log what we received
  useEffect(() => {
    console.log('[Dashboard] Received state data:', {
      hasStateData: !!stateData,
      ticker: stateData?.ticker,
      company: stateData?.company,
      hasDebate: !!stateData?.debate,
      debateLineCount: stateData?.debate?.script?.length,
      hasSources: !!stateData?.sources,
      hasAnalysis: !!stateData?.analysis,
    })
    
    if (stateData) {
      setAnalysisData(stateData)
      setLoading(false)
    }
  }, [stateData])
  
  // Determine if we have real data
  const hasData = !loading && (analysisData !== null && (analysisData?.debate?.script?.length > 0 || analysisData?.analysis))
  const isRealData = !!(analysisData?.debate?.script?.length > 0)
  
  // Extract data from the NEW streamlined pipeline format
  // Format: { ticker, company, sources: {pdfs, news}, analysis: {summary, riskFactors, keyFinancials}, debate: {script, totalDuration} }
  
  // Documents from sources
  const documents = analysisData?.sources?.pdfs?.map((pdf, i) => ({
    id: i + 1,
    name: pdf.title || `${ticker} Annual Report`,
    type: 'SEC Filing',
    url: pdf.url,
    source: pdf.source,
  })) || []
  
  // Add news as documents too
  const newsDocuments = analysisData?.sources?.news?.map((news, i) => ({
    id: documents.length + i + 1,
    name: news.title || 'News Article',
    type: 'News',
    url: news.url,
    snippet: news.snippet,
    source: news.source,
  })) || []
  
  const allDocuments = [...documents, ...newsDocuments]
  
  // Generate insights from analysis data
  const insights = analysisData?.analysis 
    ? generateInsightsFromAnalysis(analysisData.analysis)
    : []
  
  // Debate transcript from the new format
  const rawDebateScript = analysisData?.debate?.script
  const transcript = rawDebateScript 
    ? normalizeDebateScript(rawDebateScript)
    : []
  
  // Debug log transcript
  useEffect(() => {
    console.log('[Dashboard] Debug analysis data:', {
      hasAnalysisData: !!analysisData,
      analysisDataKeys: analysisData ? Object.keys(analysisData) : [],
      hasDebate: !!analysisData?.debate,
      debateKeys: analysisData?.debate ? Object.keys(analysisData.debate) : [],
      rawScriptLength: rawDebateScript?.length || 0,
      rawScriptSample: rawDebateScript?.[0],
      normalizedTranscriptLength: transcript.length,
      normalizedSample: transcript[0],
    })
  }, [analysisData, rawDebateScript, transcript])

  // Format price with currency (if available from analysis data)
  const currentPrice = analysisData?.currentPrice || null

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
          {isRealData ? (
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
              <span className="text-xs text-yellow-400 font-medium">Sample Data</span>
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
        </div>
      </motion.header>

      {/* No Data State */}
      {!loading && !hasData && (
        <motion.div 
          className="mb-4 p-6 bg-yellow-500/5 border border-yellow-500/20 rounded-xl"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-500/10 rounded-lg">
              <AlertCircle size={24} className="text-yellow-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-yellow-400 font-semibold mb-1">No Analysis Data Available</h3>
              <p className="text-sm text-gray-400">
                No previous analysis found for {ticker}. Run a new analysis from the home page to generate insights.
              </p>
            </div>
            <motion.button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-lg text-purple-400 text-sm font-medium transition-all"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <RefreshCw size={16} />
              New Analysis
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Loading State */}
      {loading && (
        <motion.div 
          className="mb-4 p-6 bg-purple-500/5 border border-purple-500/20 rounded-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="flex items-center gap-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <RefreshCw size={24} className="text-purple-400" />
            </motion.div>
            <div>
              <h3 className="text-purple-400 font-semibold">Loading Analysis...</h3>
              <p className="text-sm text-gray-400">Fetching data for {ticker}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Summary Banner (if API data available) */}
      {analysisData?.summary && (
        <motion.div 
          className="mb-4 p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <p className="text-sm text-gray-300 leading-relaxed">{analysisData.summary}</p>
        </motion.div>
      )}

      {/* Bull/Bear Quick View (if API data available) */}
      {analysisData?.bullCase && analysisData?.bearCase && (
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          {/* Bull Case */}
          <div className="p-4 bg-white/[0.02] border border-white/[0.06] border-l-2 border-l-green-500 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
              <span className="text-sm font-semibold text-green-400">Bull Case</span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">{analysisData.bullCase.argument}</p>
          </div>
          
          {/* Bear Case */}
          <div className="p-4 bg-white/[0.02] border border-white/[0.06] border-l-2 border-l-red-500 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
              <span className="text-sm font-semibold text-red-400">Bear Case</span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">{analysisData.bearCase.argument}</p>
          </div>
        </motion.div>
      )}

      {/* 3-Column Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-200px)]">
        {/* Column 1: The Vault (Source Documents) - 3 cols */}
        <motion.div 
          className="lg:col-span-3 bento-card flex flex-col overflow-hidden"
          initial={{ x: -30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <SourceDocuments documents={allDocuments} ticker={ticker} />
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
 * Generate insights from NEW streamlined analysis format
 * Format: { summary, riskFactors, keyFinancials, fullData }
 */
function generateInsightsFromAnalysis(analysis) {
  const insights = []
  
  // Extract summary as bullish point
  if (analysis.summary) {
    insights.push({
      type: 'bullish',
      title: 'Executive Summary',
      text: analysis.summary.substring(0, 200) + (analysis.summary.length > 200 ? '...' : '')
    })
  }
  
  // Extract risk factors as bearish points
  if (analysis.riskFactors) {
    const risks = analysis.riskFactors.toLowerCase()
    
    if (risks.includes('competition') || risks.includes('competitive')) {
      insights.push({
        type: 'bearish',
        title: 'Competitive Risks',
        text: extractSentence(analysis.riskFactors, ['competition', 'competitive', 'competitors', 'market share'])
      })
    } else {
      insights.push({
        type: 'bearish',
        title: 'Key Risks',
        text: analysis.riskFactors.substring(0, 150) + '...'
      })
    }
  }
  
  // Extract key financials
  if (analysis.keyFinancials) {
    insights.push({
      type: 'neutral',
      title: 'Financial Metrics',
      text: analysis.keyFinancials.substring(0, 150) + (analysis.keyFinancials.length > 150 ? '...' : '')
    })
  }
  
  // Add from full harvested data if available
  if (analysis.fullData?.content?.management_discussion) {
    const mda = analysis.fullData.content.management_discussion
    if (mda.includes('growth') || mda.includes('increase')) {
      insights.push({
        type: 'bullish',
        title: 'Growth Outlook',
        text: extractSentence(mda, ['growth', 'increase', 'strong', 'momentum'])
      })
    }
  }
  
  return insights.slice(0, 5)
}

/**
 * Extract a relevant sentence containing keywords
 */
function extractSentence(text, keywords) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10)
  
  for (const sentence of sentences) {
    const lower = sentence.toLowerCase()
    if (keywords.some(kw => lower.includes(kw))) {
      const cleaned = sentence.trim()
      return cleaned.length > 150 ? cleaned.substring(0, 147) + '...' : cleaned
    }
  }
  
  // Fallback to first sentence
  return sentences[0]?.trim().substring(0, 150) || 'See full report for details.'
}

/**
 * Normalize debate script to expected transcript format
 */
function normalizeDebateScript(debateScript) {
  if (!debateScript || !Array.isArray(debateScript)) {
    return []
  }
  
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
