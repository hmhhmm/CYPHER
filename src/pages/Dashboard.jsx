import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Zap, TrendingUp, TrendingDown } from 'lucide-react'
import SourceDocuments from '../components/SourceDocuments'
import PodcastPlayer from '../components/PodcastPlayer'
import KeyInsights from '../components/KeyInsights'
import StockChart from '../components/StockChart'
import { getSourceDocuments, getKeyInsights, getTranscript } from '../utils/analyzeRequest'

export default function Dashboard() {
  const { ticker: paramTicker } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  
  // Get data from navigation state or URL params
  const stateData = location.state || {}
  const ticker = paramTicker || stateData.ticker || 'TSLA'
  const company = stateData.company || 'Tesla Inc.'
  const analysisData = stateData.analysisData
  
  // Use API data if available, otherwise fall back to mock data
  const documents = analysisData?.sources 
    ? analysisData.sources.map((source, idx) => ({
        id: idx + 1,
        name: source,
        type: source.includes('10-K') || source.includes('10-Q') ? 'SEC Filing' : 
              source.includes('Earnings') ? 'Earnings' : 'Research',
        pages: Math.floor(Math.random() * 100) + 10,
        date: new Date().toISOString().split('T')[0]
      }))
    : getSourceDocuments(ticker)
    
  const insights = analysisData?.keyInsights 
    ? analysisData.keyInsights
    : getKeyInsights(ticker)
    
  const transcript = analysisData 
    ? generateTranscriptFromAnalysis(analysisData)
    : getTranscript(ticker)

  // Format price with currency
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

// Helper function to generate transcript from API analysis data
function generateTranscriptFromAnalysis(data) {
  if (!data.bullCase || !data.bearCase) return []
  
  return [
    { 
      id: 1, 
      speaker: 'bull', 
      text: data.bullCase.argument, 
      start: 0, 
      end: 30 
    },
    { 
      id: 2, 
      speaker: 'bear', 
      text: data.bearCase.argument, 
      start: 30, 
      end: 60 
    },
    ...(data.keyInsights || []).slice(0, 4).map((insight, idx) => ({
      id: idx + 3,
      speaker: insight.sentiment === 'positive' || insight.sentiment === 'bullish' ? 'bull' : 'bear',
      text: `${insight.title}: ${insight.detail || insight.text}`,
      start: 60 + (idx * 15),
      end: 75 + (idx * 15)
    }))
  ]
}
