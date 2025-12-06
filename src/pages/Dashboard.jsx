import { useParams, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Zap, TrendingUp, TrendingDown, Sparkles, AlertCircle } from 'lucide-react'
import SourceDocuments from '../components/SourceDocuments'
import PodcastPlayer from '../components/PodcastPlayer'
import KeyInsights from '../components/KeyInsights'
import StockChart from '../components/StockChart'
import { getSourceDocuments, getKeyInsights, getTranscript } from '../utils/analyzeRequest'
import { useAnalysisData } from '../hooks/useAnalysis'

export default function Dashboard() {
  const { ticker: paramTicker } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  
  // Get ticker and company from multiple sources (priority: URL params > search params > state > default)
  const ticker = paramTicker || searchParams.get('ticker') || location.state?.ticker || 'TSLA'
  const company = searchParams.get('company') || location.state?.company || 'Tesla Inc.'
  
  // Load analysis data from Convex
  const { data: analysisData, loading } = useAnalysisData(ticker)
  
  // Determine if we have real data
  const isRealData = !!(analysisData?.harvestedData && analysisData?.harvestedData !== null)
  
  // Prepare data - use real data if available, otherwise fall back to mock
  const documents = analysisData?.harvestedData 
    ? generateDocumentsFromHarvested(analysisData.harvestedData, ticker)
    : getSourceDocuments(ticker)
  
  const insights = analysisData?.harvestedData 
    ? generateInsightsFromHarvested(analysisData.harvestedData)
    : getKeyInsights(ticker)
  
  const transcript = analysisData?.debateScript 
    ? normalizeDebateScript(analysisData.debateScript)
    : getTranscript(ticker)

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
          <SourceDocuments documents={documents} ticker={ticker} />
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
 * Generate document list from harvested data
 */
function generateDocumentsFromHarvested(harvestedData, ticker) {
  const { meta } = harvestedData
  return [
    { 
      id: 1, 
      name: `${ticker} ${meta.period} ${meta.report_type}.pdf`, 
      type: 'SEC Filing', 
      pages: 142, 
      date: new Date().toISOString().split('T')[0],
      url: meta.source_url
    },
  ]
}

/**
 * Generate insights from harvested data using AI-extracted content
 */
function generateInsightsFromHarvested(harvestedData) {
  const { content } = harvestedData
  const insights = []
  
  // Parse management discussion for bullish points
  if (content.management_discussion) {
    const mda = content.management_discussion.toLowerCase()
    
    if (mda.includes('growth') || mda.includes('increase') || mda.includes('strong')) {
      insights.push({
        type: 'bullish',
        title: 'Growth Momentum',
        text: extractSentence(content.management_discussion, ['growth', 'increase', 'strong', 'record'])
      })
    }
    
    if (mda.includes('revenue') || mda.includes('profit')) {
      insights.push({
        type: 'bullish',
        title: 'Financial Performance',
        text: extractSentence(content.management_discussion, ['revenue', 'profit', 'margin'])
      })
    }
  }
  
  // Parse risk factors for bearish points
  if (content.risk_factors) {
    const risks = content.risk_factors.toLowerCase()
    
    if (risks.includes('competition') || risks.includes('competitive')) {
      insights.push({
        type: 'bearish',
        title: 'Competitive Pressure',
        text: extractSentence(content.risk_factors, ['competition', 'competitive', 'competitors'])
      })
    }
    
    if (risks.includes('regulation') || risks.includes('regulatory') || risks.includes('compliance')) {
      insights.push({
        type: 'bearish',
        title: 'Regulatory Risks',
        text: extractSentence(content.risk_factors, ['regulation', 'regulatory', 'compliance'])
      })
    }
  }
  
  // Parse financials for neutral/mixed insights
  if (content.key_financials) {
    insights.push({
      type: 'neutral',
      title: 'Key Metrics',
      text: content.key_financials.split('\n')[0] || 'Financial metrics available in the report.'
    })
  }
  
  // Ensure we have at least 3 insights
  if (insights.length < 3) {
    insights.push({
      type: 'neutral',
      title: 'Analyst View',
      text: 'Review the full SEC filing for comprehensive analysis.'
    })
  }
  
  return insights.slice(0, 4)
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
