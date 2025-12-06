import { useSearchParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Zap } from 'lucide-react'
import SourceDocuments from '../components/SourceDocuments'
import PodcastPlayer from '../components/PodcastPlayer'
import KeyInsights from '../components/KeyInsights'
import StockChart from '../components/StockChart'
import { getSourceDocuments, getKeyInsights, getTranscript } from '../utils/analyzeRequest'

export default function Dashboard() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  
  const ticker = searchParams.get('ticker') || 'TSLA'
  const company = searchParams.get('company') || 'Tesla Inc.'
  
  // Get mock data based on ticker
  const documents = getSourceDocuments(ticker)
  const insights = getKeyInsights(ticker)
  const transcript = getTranscript(ticker)

  return (
    <div className="min-h-screen p-4 md:p-6">
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
            <span className="text-xs">AI Analysis Complete</span>
          </div>
        </div>
      </motion.header>

      {/* 3-Column Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-120px)]">
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
    </div>
  )
}

