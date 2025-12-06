import { useState, useRef, useEffect, memo } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  BarChart3, 
  Maximize2,
  X,
  RefreshCw,
  ExternalLink
} from 'lucide-react'

// Map common tickers to their exchange
function getSymbolWithExchange(ticker) {
  const symbol = (ticker || 'AAPL').toUpperCase()
  
  // Common US stocks - add exchange prefix
  const nasdaqStocks = ['AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'NVDA', 'META', 'TSLA', 'NFLX', 'ADBE', 
    'INTC', 'CSCO', 'CMCSA', 'PEP', 'COST', 'TMUS', 'AVGO', 'TXN', 'QCOM', 'AMD', 'PYPL', 'INTU', 
    'AMAT', 'BKNG', 'ISRG', 'GILD', 'MDLZ', 'ADP', 'REGN', 'VRTX', 'LRCX', 'MU', 'ABNB', 'MELI',
    'SNPS', 'CDNS', 'KLAC', 'MAR', 'PANW', 'ORLY', 'FTNT', 'CTAS', 'MRVL', 'DXCM', 'ODFL', 'KDP',
    'CPRT', 'PAYX', 'WDAY', 'KHC', 'MNST', 'EXC', 'XEL', 'BIIB', 'LULU', 'IDXX', 'ILMN', 'WBD',
    'SIRI', 'DLTR', 'EA', 'PCAR', 'FAST', 'VRSK', 'CTSH', 'ANSS', 'ALGN', 'ZM', 'ZS', 'DDOG', 
    'CRWD', 'OKTA', 'SPLK', 'DOCU', 'ROKU', 'COIN', 'HOOD', 'RBLX', 'PLTR', 'RIVN', 'LCID', 'NIO']
  
  const nyseStocks = ['JPM', 'V', 'JNJ', 'UNH', 'PG', 'HD', 'MA', 'BAC', 'DIS', 'XOM', 'CVX', 'VZ',
    'PFE', 'KO', 'MRK', 'WMT', 'ABT', 'CRM', 'TMO', 'NKE', 'MCD', 'DHR', 'MDT', 'ACN', 'NEE', 'LLY',
    'UPS', 'PM', 'MS', 'HON', 'ORCL', 'IBM', 'GS', 'BA', 'CAT', 'SBUX', 'GE', 'MMM', 'AMGN', 'BLK',
    'LOW', 'SPGI', 'CVS', 'AXP', 'SYK', 'TGT', 'DE', 'AMT', 'BKNG', 'CI', 'SCHW', 'USB', 'PLD',
    'BK', 'SO', 'DUK', 'CL', 'ITW', 'NOW', 'FIS', 'GM', 'F', 'WFC', 'C', 'T', 'UBER', 'LYFT', 'SQ',
    'BRK.A', 'BRK.B', 'RTX', 'LMT', 'NOC', 'GD', 'AAL', 'DAL', 'UAL', 'LUV', 'CCL', 'RCL', 'MAR']

  if (nasdaqStocks.includes(symbol)) {
    return `NASDAQ:${symbol}`
  } else if (nyseStocks.includes(symbol)) {
    return `NYSE:${symbol}`
  }
  
  return symbol
}

// Mini Chart Widget - Clean, minimal view
const MiniChartWidget = memo(function MiniChartWidget({ ticker }) {
  const containerRef = useRef(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.innerHTML = ''
    setIsLoading(true)

    const symbol = getSymbolWithExchange(ticker)

    // Create widget container
    const widgetDiv = document.createElement('div')
    widgetDiv.className = 'tradingview-widget-container'
    widgetDiv.style.height = '100%'
    widgetDiv.style.width = '100%'

    const innerDiv = document.createElement('div')
    innerDiv.className = 'tradingview-widget-container__widget'
    innerDiv.style.height = '100%'
    innerDiv.style.width = '100%'
    widgetDiv.appendChild(innerDiv)

    // Use mini chart widget for clean minimal view
    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js'
    script.type = 'text/javascript'
    script.async = true
    
    const config = {
      "symbol": symbol,
      "width": "100%",
      "height": "100%",
      "locale": "en",
      "dateRange": "12M",
      "colorTheme": "dark",
      "isTransparent": true,
      "autosize": true,
      "largeChartUrl": "",
      "chartOnly": true,
      "noTimeScale": false
    }
    
    script.innerHTML = JSON.stringify(config)

    script.onload = () => {
      setTimeout(() => setIsLoading(false), 800)
    }

    widgetDiv.appendChild(script)
    container.appendChild(widgetDiv)

    const timeout = setTimeout(() => setIsLoading(false), 2500)

    return () => {
      clearTimeout(timeout)
      if (container) container.innerHTML = ''
    }
  }, [ticker])

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
      
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a0f] z-10">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <RefreshCw size={20} className="text-purple-400" />
          </motion.div>
          <p className="text-xs text-gray-500 mt-2">Loading chart...</p>
        </div>
      )}
    </div>
  )
})

// Full Chart Widget - Complete TradingView experience
const FullChartWidget = memo(function FullChartWidget({ ticker }) {
  const containerRef = useRef(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.innerHTML = ''
    setIsLoading(true)

    const symbol = getSymbolWithExchange(ticker)

    const widgetDiv = document.createElement('div')
    widgetDiv.className = 'tradingview-widget-container'
    widgetDiv.style.height = '100%'
    widgetDiv.style.width = '100%'

    const innerDiv = document.createElement('div')
    innerDiv.className = 'tradingview-widget-container__widget'
    innerDiv.style.height = '100%'
    innerDiv.style.width = '100%'
    widgetDiv.appendChild(innerDiv)

    // Full advanced chart with all features
    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.type = 'text/javascript'
    script.async = true
    
    const config = {
      "autosize": true,
      "symbol": symbol,
      "interval": "D",
      "timezone": "Etc/UTC",
      "theme": "dark",
      "style": "1",
      "locale": "en",
      "enable_publishing": false,
      "backgroundColor": "rgba(10, 10, 15, 1)",
      "gridColor": "rgba(138, 43, 226, 0.08)",
      "hide_top_toolbar": false,
      "hide_legend": false,
      "allow_symbol_change": true,
      "save_image": false,
      "calendar": false,
      "hide_volume": false,
      "support_host": "https://www.tradingview.com",
      "withdateranges": true,
      "details": true,
      "hotlist": false,
      "studies": ["STD;RSI"]
    }
    
    script.innerHTML = JSON.stringify(config)

    script.onload = () => {
      setTimeout(() => setIsLoading(false), 1000)
    }

    widgetDiv.appendChild(script)
    container.appendChild(widgetDiv)

    const timeout = setTimeout(() => setIsLoading(false), 3000)

    return () => {
      clearTimeout(timeout)
      if (container) container.innerHTML = ''
    }
  }, [ticker])

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
      
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a0f] z-10">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <RefreshCw size={28} className="text-purple-400" />
          </motion.div>
          <p className="text-sm text-gray-400 mt-3">Loading {ticker} chart...</p>
          <p className="text-xs text-gray-600 mt-1">Powered by TradingView</p>
        </div>
      )}
    </div>
  )
})

// Fullscreen Chart Modal
function ChartModal({ ticker, onClose }) {
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleEsc)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleEsc)
    }
  }, [onClose])

  const symbol = getSymbolWithExchange(ticker)

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="absolute inset-4 bg-[#0a0a0f] rounded-2xl border border-purple-500/30 overflow-hidden shadow-2xl shadow-purple-500/20 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/50 flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <BarChart3 size={20} className="text-purple-400" />
              <h2 className="text-xl font-bold text-white">{ticker}</h2>
            </div>
            <span className="text-sm text-gray-400">Real-Time Market Data</span>
            <a 
              href={`https://www.tradingview.com/chart/?symbol=${symbol}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors"
            >
              <ExternalLink size={12} />
              Open in TradingView
            </a>
          </div>
          
          <motion.button
            onClick={onClose}
            className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-all"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <X size={20} />
          </motion.button>
        </div>

        {/* Full Chart */}
        <div className="flex-1 min-h-0">
          <FullChartWidget ticker={ticker} />
        </div>
      </motion.div>
    </motion.div>,
    document.body
  )
}

export default function StockChart({ ticker }) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const symbol = getSymbolWithExchange(ticker)

  return (
    <>
      <div className="flex flex-col h-full overflow-hidden bg-[#0a0a0f]">
        {/* Header - Minimal */}
        <div className="flex-shrink-0 flex items-center justify-between px-3 py-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <BarChart3 size={14} className="text-purple-400" />
            <span className="text-xs text-purple-400 font-semibold">{ticker}</span>
          </div>
          <div className="flex items-center gap-1">
            <a 
              href={`https://www.tradingview.com/chart/?symbol=${symbol}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 rounded bg-white/5 hover:bg-purple-500/20 text-gray-500 hover:text-purple-400 transition-all"
              title="Open in TradingView"
            >
              <ExternalLink size={10} />
            </a>
            <motion.button 
              onClick={() => setIsModalOpen(true)}
              className="p-1 rounded bg-white/5 hover:bg-purple-500/20 text-gray-500 hover:text-purple-400 transition-all flex items-center gap-1"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Expand chart"
            >
              <Maximize2 size={10} />
            </motion.button>
          </div>
        </div>

        {/* Mini Chart - Clean view */}
        <div className="flex-1 relative min-h-0">
          <MiniChartWidget ticker={ticker} />
        </div>
      </div>

      {/* Fullscreen Modal with Full Features */}
      <AnimatePresence>
        {isModalOpen && (
          <ChartModal 
            ticker={ticker} 
            onClose={() => setIsModalOpen(false)} 
          />
        )}
      </AnimatePresence>
    </>
  )
}
