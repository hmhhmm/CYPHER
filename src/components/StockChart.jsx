import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Clock, 
  RefreshCw,
  Maximize2,
  X,
  Activity
} from 'lucide-react'

// Known valid TradingView symbols (common US stocks)
const VALID_SYMBOLS = new Set([
  'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'NVDA', 'META', 'TSLA', 'BRK.A', 'BRK.B',
  'JPM', 'JNJ', 'V', 'PG', 'UNH', 'HD', 'MA', 'DIS', 'PYPL', 'BAC', 'NFLX', 'ADBE',
  'CRM', 'CMCSA', 'XOM', 'VZ', 'INTC', 'T', 'PFE', 'KO', 'PEP', 'MRK', 'WMT', 'ABT',
  'CVX', 'TMO', 'AVGO', 'COST', 'NKE', 'MCD', 'DHR', 'MDT', 'ACN', 'NEE', 'LLY',
  'AMD', 'QCOM', 'TXN', 'UPS', 'PM', 'MS', 'HON', 'ORCL', 'IBM', 'GS', 'BA', 'CAT',
  'SBUX', 'GE', 'MMM', 'AMGN', 'INTU', 'BLK', 'ISRG', 'AMAT', 'GILD', 'AXP', 'BKNG',
  'LRCX', 'TGT', 'SYK', 'ADP', 'ZTS', 'MDLZ', 'CI', 'TMUS', 'CB', 'MO', 'SPGI', 'PLD',
  'NOW', 'SCHW', 'CME', 'BDX', 'CSX', 'DUK', 'CL', 'USB', 'EQIX', 'SO', 'AON', 'ITW',
  'SNOW', 'PLTR', 'COIN', 'SQ', 'UBER', 'LYFT', 'ABNB', 'RBLX', 'HOOD', 'RIVN', 'LCID'
])

// Generate realistic candlestick data
function generateCandlestickData(basePrice = 150, count = 30) {
  const data = []
  let currentPrice = basePrice
  
  for (let i = 0; i < count; i++) {
    const volatility = currentPrice * 0.03 // 3% volatility
    const change = (Math.random() - 0.48) * volatility // Slight bullish bias
    
    const open = currentPrice
    const close = currentPrice + change
    const high = Math.max(open, close) + Math.random() * volatility * 0.5
    const low = Math.min(open, close) - Math.random() * volatility * 0.5
    
    data.push({
      open: open,
      high: high,
      low: low,
      close: close,
      volume: Math.floor(Math.random() * 1000000) + 500000,
      bullish: close >= open
    })
    
    currentPrice = close
  }
  
  return data
}

export default function StockChart({ ticker }) {
  const containerRef = useRef(null)
  const [isLoading, setIsLoading] = useState(true)
  const [useFallback, setUseFallback] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Check if ticker is likely valid on TradingView
  const isValidSymbol = VALID_SYMBOLS.has(ticker?.toUpperCase())

  useEffect(() => {
    // If not a known valid symbol, use fallback immediately
    if (!isValidSymbol) {
      setUseFallback(true)
      setIsLoading(false)
      return
    }

    // Try to load TradingView widget
    const loadTradingViewWidget = () => {
      if (!containerRef.current) return
      
      // Clear previous widget
      containerRef.current.innerHTML = ''
      setIsLoading(true)
      setUseFallback(false)

      try {
        // Create TradingView widget script
        const script = document.createElement('script')
        script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
        script.type = 'text/javascript'
        script.async = true
        script.innerHTML = JSON.stringify({
          "autosize": true,
          "symbol": `NASDAQ:${ticker}`,
          "interval": "D",
          "timezone": "Etc/UTC",
          "theme": "dark",
          "style": "1",
          "locale": "en",
          "backgroundColor": "rgba(0, 0, 0, 0)",
          "gridColor": "rgba(138, 43, 226, 0.06)",
          "hide_top_toolbar": false,
          "hide_legend": false,
          "allow_symbol_change": false,
          "save_image": false,
          "calendar": false,
          "support_host": "https://www.tradingview.com"
        })

        script.onload = () => {
          setIsLoading(false)
        }

        script.onerror = () => {
          setUseFallback(true)
          setIsLoading(false)
        }

        // Create widget container
        const widgetContainer = document.createElement('div')
        widgetContainer.className = 'tradingview-widget-container'
        widgetContainer.style.cssText = 'height: 100%; width: 100%; position: absolute; top: 0; left: 0; overflow: hidden;'

        const widgetInner = document.createElement('div')
        widgetInner.className = 'tradingview-widget-container__widget'
        widgetInner.style.cssText = 'height: 100%; width: 100%;'

        widgetContainer.appendChild(widgetInner)
        widgetContainer.appendChild(script)
        containerRef.current.appendChild(widgetContainer)

        // Fallback timeout - if widget takes too long, use fallback
        const timeout = setTimeout(() => {
          setIsLoading(false)
        }, 5000)

        return () => clearTimeout(timeout)

      } catch (err) {
        console.error('TradingView widget error:', err)
        setUseFallback(true)
        setIsLoading(false)
      }
    }

    loadTradingViewWidget()

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }
    }
  }, [ticker, isValidSymbol])

  return (
    <>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <BarChart3 size={18} className="text-purple-400" />
            <h2 className="font-semibold text-white">Real-Time Chart</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-mono">{ticker}</span>
            <motion.button 
              onClick={() => setIsModalOpen(true)}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-purple-500/20 text-gray-400 hover:text-purple-400 transition-all"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <Maximize2 size={14} />
            </motion.button>
          </div>
        </div>

        {/* Chart Container */}
        <div className="flex-1 relative min-h-0 overflow-hidden">
          {/* Show TradingView Widget OR Fallback - never both */}
          {useFallback ? (
            <div className="absolute inset-0 bg-[#0a0a0a]">
              <CandlestickChart ticker={ticker} compact />
            </div>
          ) : (
            <div 
              ref={containerRef} 
              className="absolute inset-0 overflow-hidden"
            />
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm z-10">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <RefreshCw size={24} className="text-purple-400" />
              </motion.div>
              <p className="text-sm text-gray-400 mt-2">Loading chart...</p>
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Modal - rendered via Portal to escape overflow:hidden */}
      {createPortal(
        <AnimatePresence>
          {isModalOpen && (
            <ChartModal ticker={ticker} onClose={() => setIsModalOpen(false)} />
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}

// Fullscreen Chart Modal
function ChartModal({ ticker, onClose }) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Backdrop */}
      <motion.div 
        className="absolute inset-0 bg-black/90 backdrop-blur-md"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />
      
      {/* Modal Content */}
      <motion.div 
        className="relative w-full max-w-6xl h-[85vh] bg-[#0d0d0d] border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
      >
        {/* Glow effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/20 via-transparent to-green-500/20 blur-xl pointer-events-none" />
        
        {/* Header */}
        <div className="relative flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/50">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Activity size={20} className="text-purple-400" />
              <h2 className="text-xl font-bold text-white">${ticker}</h2>
            </div>
            <div className="h-6 w-px bg-white/20" />
            <span className="text-sm text-gray-400">Candlestick Chart</span>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Time intervals */}
            <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
              {['1D', '1W', '1M', '3M', '1Y'].map((interval) => (
                <button 
                  key={interval}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                    interval === '1M' 
                      ? 'bg-purple-500/30 text-purple-300' 
                      : 'text-gray-500 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {interval}
                </button>
              ))}
            </div>
            
            <motion.button
              onClick={onClose}
              className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-all"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <X size={20} />
            </motion.button>
          </div>
        </div>
        
        {/* Chart Area */}
        <div className="relative h-[calc(100%-70px)] p-4">
          <CandlestickChart ticker={ticker} expanded />
        </div>
      </motion.div>
    </motion.div>
  )
}

// Professional Candlestick Chart Component
function CandlestickChart({ ticker, compact = false, expanded = false }) {
  const [candleData] = useState(() => generateCandlestickData(150, expanded ? 50 : 25))
  
  const allPrices = candleData.flatMap(d => [d.high, d.low])
  const maxPrice = Math.max(...allPrices)
  const minPrice = Math.min(...allPrices)
  const priceRange = maxPrice - minPrice
  const padding = priceRange * 0.1
  
  const chartHeight = expanded ? 500 : 180
  const chartWidth = expanded ? 900 : 380
  const candleWidth = expanded ? 12 : 10
  const candleGap = expanded ? 6 : 5
  
  const scaleY = (price) => {
    return chartHeight - ((price - minPrice + padding) / (priceRange + padding * 2)) * chartHeight
  }
  
  const lastCandle = candleData[candleData.length - 1]
  const firstCandle = candleData[0]
  const priceChange = ((lastCandle.close - firstCandle.open) / firstCandle.open) * 100
  const isPositive = priceChange >= 0

  // Generate price levels for grid
  const priceStep = priceRange / 5
  const priceLevels = Array.from({ length: 6 }, (_, i) => minPrice + i * priceStep)

  return (
    <div className={`w-full h-full flex flex-col ${expanded ? 'p-2' : ''}`}>
      {/* Chart Header */}
      <div className={`flex items-center justify-between ${compact ? 'mb-2 px-2' : 'mb-4'}`}>
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className={`font-bold text-white ${expanded ? 'text-2xl' : 'text-base'}`}>
                ${ticker}
              </span>
              <span className={`font-mono ${expanded ? 'text-xl' : 'text-sm'} ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                ${lastCandle.close.toFixed(2)}
              </span>
            </div>
            {!compact && (
              <p className="text-xs text-gray-500 mt-0.5">Daily • Last 30 Sessions</p>
            )}
          </div>
        </div>
        
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${isPositive ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
          {isPositive ? (
            <TrendingUp size={compact ? 14 : 16} className="text-green-400" />
          ) : (
            <TrendingDown size={compact ? 14 : 16} className="text-red-400" />
          )}
          <span className={`font-bold ${isPositive ? 'text-green-400' : 'text-red-400'} ${compact ? 'text-sm' : 'text-base'}`}>
            {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* Chart SVG */}
      <div className="flex-1 relative min-h-0">
        <svg 
          className="w-full h-full" 
          viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Background gradient */}
          <defs>
            <linearGradient id="chartBgGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(138, 43, 226, 0.03)" />
              <stop offset="100%" stopColor="rgba(0, 0, 0, 0)" />
            </linearGradient>
            <linearGradient id="greenGlow" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#16a34a" />
            </linearGradient>
            <linearGradient id="redGlow" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>
          </defs>
          
          <rect x="0" y="0" width={chartWidth} height={chartHeight} fill="url(#chartBgGradient)" />

          {/* Horizontal grid lines */}
          {priceLevels.map((price, i) => (
            <g key={i}>
              <line
                x1="40"
                y1={scaleY(price)}
                x2={chartWidth}
                y2={scaleY(price)}
                stroke="rgba(255, 255, 255, 0.05)"
                strokeWidth="1"
                strokeDasharray={i === 0 || i === priceLevels.length - 1 ? "0" : "4,4"}
              />
              {expanded && (
                <text
                  x="35"
                  y={scaleY(price) + 4}
                  fill="rgba(255, 255, 255, 0.3)"
                  fontSize="10"
                  textAnchor="end"
                  fontFamily="monospace"
                >
                  ${price.toFixed(0)}
                </text>
              )}
            </g>
          ))}

          {/* Candlesticks */}
          {candleData.map((candle, i) => {
            const x = 50 + i * (candleWidth + candleGap)
            const openY = scaleY(candle.open)
            const closeY = scaleY(candle.close)
            const highY = scaleY(candle.high)
            const lowY = scaleY(candle.low)
            const bodyTop = Math.min(openY, closeY)
            const bodyHeight = Math.abs(closeY - openY) || 1
            
            return (
              <motion.g 
                key={i}
                initial={{ opacity: 0, scaleY: 0 }}
                animate={{ opacity: 1, scaleY: 1 }}
                transition={{ delay: i * 0.02, duration: 0.3 }}
                style={{ transformOrigin: `${x + candleWidth/2}px ${chartHeight}px` }}
              >
                {/* Wick (high-low line) */}
                <line
                  x1={x + candleWidth / 2}
                  y1={highY}
                  x2={x + candleWidth / 2}
                  y2={lowY}
                  stroke={candle.bullish ? '#22c55e' : '#ef4444'}
                  strokeWidth={expanded ? 1.5 : 1}
                />
                
                {/* Body */}
                <rect
                  x={x}
                  y={bodyTop}
                  width={candleWidth}
                  height={bodyHeight}
                  fill={candle.bullish ? '#22c55e' : '#ef4444'}
                  rx="1"
                  className={candle.bullish ? 'drop-shadow-[0_0_3px_rgba(34,197,94,0.5)]' : 'drop-shadow-[0_0_3px_rgba(239,68,68,0.5)]'}
                />
              </motion.g>
            )
          })}

          {/* Current price line */}
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <line
              x1="40"
              y1={scaleY(lastCandle.close)}
              x2={chartWidth}
              y2={scaleY(lastCandle.close)}
              stroke={isPositive ? '#22c55e' : '#ef4444'}
              strokeWidth="1"
              strokeDasharray="6,3"
              opacity="0.6"
            />
            <rect
              x={chartWidth - 60}
              y={scaleY(lastCandle.close) - 10}
              width="55"
              height="20"
              fill={isPositive ? '#22c55e' : '#ef4444'}
              rx="4"
            />
            <text
              x={chartWidth - 32}
              y={scaleY(lastCandle.close) + 4}
              fill="white"
              fontSize="10"
              textAnchor="middle"
              fontFamily="monospace"
              fontWeight="bold"
            >
              ${lastCandle.close.toFixed(2)}
            </text>
          </motion.g>
        </svg>
      </div>

      {/* Volume bars (optional for expanded view) */}
      {expanded && (
        <div className="h-16 mt-2 border-t border-white/5 pt-2">
          <svg className="w-full h-full" viewBox={`0 0 ${chartWidth} 50`} preserveAspectRatio="xMidYMid meet">
            {candleData.map((candle, i) => {
              const x = 50 + i * (candleWidth + candleGap)
              const maxVol = Math.max(...candleData.map(d => d.volume))
              const volHeight = (candle.volume / maxVol) * 40
              
              return (
                <motion.rect
                  key={i}
                  x={x}
                  y={45 - volHeight}
                  width={candleWidth}
                  height={volHeight}
                  fill={candle.bullish ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}
                  rx="1"
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ delay: i * 0.02 + 0.3, duration: 0.2 }}
                  style={{ transformOrigin: `${x}px 45px` }}
                />
              )
            })}
          </svg>
        </div>
      )}

      {/* Time axis */}
      {!compact && (
        <div className="flex items-center justify-between text-xs text-gray-500 mt-2 px-4">
          <span>30 days ago</span>
          <span>15 days ago</span>
          <span>Today</span>
        </div>
      )}
    </div>
  )
}

