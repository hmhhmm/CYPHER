import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Maximize2,
  X,
  Activity,
  Target,
  Bell,
  Minus,
  Plus,
  LineChart,
  CandlestickChart as CandleIcon,
  AreaChart,
  Trash2
} from 'lucide-react'

// Time period configurations
const TIME_PERIODS = {
  '1D': { count: 24, label: '1 Day', interval: 'hourly' },
  '1W': { count: 7, label: '1 Week', interval: 'daily' },
  '1M': { count: 30, label: '1 Month', interval: 'daily' },
  '3M': { count: 90, label: '3 Months', interval: 'daily' },
  '6M': { count: 180, label: '6 Months', interval: 'daily' },
  '1Y': { count: 365, label: '1 Year', interval: 'daily' },
  'ALL': { count: 730, label: 'All Time', interval: 'weekly' },
}

// Generate realistic candlestick data with dates
function generateCandlestickData(basePrice = 150, count = 30, period = '1M') {
  const data = []
  let currentPrice = basePrice
  const now = new Date()
  
  // Adjust volatility based on period
  const volatilityMap = {
    '1D': 0.008, '1W': 0.015, '1M': 0.025, 
    '3M': 0.03, '6M': 0.035, '1Y': 0.04, 'ALL': 0.05
  }
  const baseVolatility = volatilityMap[period] || 0.03
  
  for (let i = count - 1; i >= 0; i--) {
    const volatility = currentPrice * baseVolatility
    const trend = Math.sin(i / 10) * 0.3 // Add wave pattern
    const change = (Math.random() - 0.45 + trend * 0.1) * volatility
    
    const open = currentPrice
    const close = currentPrice + change
    const high = Math.max(open, close) + Math.random() * volatility * 0.6
    const low = Math.min(open, close) - Math.random() * volatility * 0.6
    
    // Calculate date based on period
    const date = new Date(now)
    if (period === '1D') {
      date.setHours(date.getHours() - i)
    } else if (period === 'ALL') {
      date.setDate(date.getDate() - i * 7)
    } else {
      date.setDate(date.getDate() - i)
    }
    
    data.push({
      date,
      open,
      high,
      low,
      close,
      volume: Math.floor(Math.random() * 2000000) + 500000,
      bullish: close >= open
    })
    
    currentPrice = close
  }
  
  return data
}

// Format date based on period
function formatDate(date, period) {
  if (period === '1D') {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  } else if (period === '1W' || period === '1M') {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
  }
}

// Format number with K/M suffix
function formatVolume(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(0) + 'K'
  return num.toString()
}

export default function StockChart({ ticker }) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Always use the custom professional chart for all tickers

  return (
    <>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-3 py-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <BarChart3 size={16} className="text-purple-400" />
            <h2 className="font-semibold text-white text-sm">Chart</h2>
            <span className="text-xs text-gray-500 font-mono">{ticker}</span>
          </div>
          <motion.button 
            onClick={() => setIsModalOpen(true)}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-purple-500/20 text-gray-400 hover:text-purple-400 transition-all flex items-center gap-1"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Maximize2 size={12} />
            <span className="text-xs">Expand</span>
          </motion.button>
        </div>

        {/* Chart Container - Always use custom chart */}
        <div className="flex-1 relative min-h-0 overflow-hidden">
          <div className="absolute inset-0 bg-[#080808]">
            <CandlestickChart ticker={ticker} compact />
          </div>
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
        className="absolute inset-0 bg-black/95 backdrop-blur-md"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />
      
      {/* Modal Content */}
      <motion.div 
        className="relative w-full max-w-7xl h-[90vh] bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
      >
        {/* Glow effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/20 via-transparent to-green-500/20 blur-xl pointer-events-none" />
        
        {/* Header */}
        <div className="relative flex items-center justify-between px-6 py-3 border-b border-white/10 bg-black/50">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Activity size={20} className="text-purple-400" />
              <h2 className="text-xl font-bold text-white">${ticker}</h2>
            </div>
            <div className="h-6 w-px bg-white/20" />
            <span className="text-sm text-gray-400">Interactive Chart</span>
            <div className="flex items-center gap-2 px-2 py-1 bg-green-500/10 rounded text-xs text-green-400">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              LIVE
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="text-xs text-gray-500">
              Hover to see OHLC • Click periods to change timeframe
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
        <div className="relative h-[calc(100%-56px)]">
          <CandlestickChart ticker={ticker} expanded />
        </div>
      </motion.div>
    </motion.div>
  )
}

// Professional Trading Chart Component - Like Real Trading Platforms
function CandlestickChart({ ticker, compact = false, expanded = false }) {
  const [selectedPeriod, setSelectedPeriod] = useState('1M')
  const [chartType, setChartType] = useState('candle') // candle, line, area
  const [hoveredCandle, setHoveredCandle] = useState(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [showCrosshair, setShowCrosshair] = useState(false)
  const [priceLines, setPriceLines] = useState([]) // User-drawn lines
  const [orders, setOrders] = useState([]) // Limit orders
  const [alerts, setAlerts] = useState([]) // Price alerts
  const [drawMode, setDrawMode] = useState(null) // 'line', 'order', 'alert'
  const [showOrderPanel, setShowOrderPanel] = useState(false)
  const [orderType, setOrderType] = useState('limit') // 'limit', 'stop'
  const [orderSide, setOrderSide] = useState('buy') // 'buy', 'sell'
  const [zoomLevel, setZoomLevel] = useState(1)
  const chartRef = useRef(null)
  
  const periodConfig = TIME_PERIODS[selectedPeriod]
  const baseCount = compact ? 20 : expanded ? 60 : 35
  const displayCount = Math.min(periodConfig.count, Math.floor(baseCount * zoomLevel))
  
  const [candleData, setCandleData] = useState(() => 
    generateCandlestickData(150, displayCount, selectedPeriod)
  )
  
  // Regenerate data when period or zoom changes
  useEffect(() => {
    setCandleData(generateCandlestickData(150, displayCount, selectedPeriod))
  }, [selectedPeriod, displayCount])
  
  const allPrices = candleData.flatMap(d => [d.high, d.low])
  const maxPrice = Math.max(...allPrices)
  const minPrice = Math.min(...allPrices)
  const priceRange = maxPrice - minPrice
  const padding = priceRange * 0.12
  
  const chartHeight = expanded ? 480 : compact ? 140 : 180
  const chartWidth = expanded ? 1100 : compact ? 350 : 400
  const candleWidth = Math.max(4, (expanded ? 14 : compact ? 12 : 11) / zoomLevel)
  const candleGap = Math.max(1, (expanded ? 3 : compact ? 2 : 2) / zoomLevel)
  const leftPadding = expanded ? 45 : 30
  const rightPadding = expanded ? 55 : 45
  
  const scaleY = useCallback((price) => {
    return chartHeight - ((price - minPrice + padding) / (priceRange + padding * 2)) * chartHeight
  }, [chartHeight, minPrice, padding, priceRange])
  
  const scaleYInverse = useCallback((y) => {
    return minPrice + padding + (1 - y / chartHeight) * (priceRange + padding * 2)
  }, [chartHeight, minPrice, padding, priceRange])
  
  const scaleX = (index) => {
    return leftPadding + index * (candleWidth + candleGap)
  }
  
  const lastCandle = candleData[candleData.length - 1]
  const firstCandle = candleData[0]
  const priceChange = ((lastCandle.close - firstCandle.open) / firstCandle.open) * 100
  const isPositive = priceChange >= 0

  // Generate price levels for grid
  const priceStep = priceRange / 6
  const priceLevels = Array.from({ length: 7 }, (_, i) => minPrice + i * priceStep)
  
  // Handle mouse move for crosshair
  const handleMouseMove = (e) => {
    if (!chartRef.current) return
    
    const rect = chartRef.current.getBoundingClientRect()
    const svgX = ((e.clientX - rect.left) / rect.width) * chartWidth
    const svgY = ((e.clientY - rect.top) / rect.height) * chartHeight
    
    setMousePos({ x: svgX, y: svgY })
    
    const candleIndex = Math.floor((svgX - leftPadding) / (candleWidth + candleGap))
    if (candleIndex >= 0 && candleIndex < candleData.length) {
      setHoveredCandle(candleIndex)
    } else {
      setHoveredCandle(null)
    }
  }
  
  // Handle click for drawing tools
  const handleChartClick = (e) => {
    if (!chartRef.current || compact) return
    
    const rect = chartRef.current.getBoundingClientRect()
    const svgY = ((e.clientY - rect.top) / rect.height) * chartHeight
    const price = scaleYInverse(svgY)
    
    if (drawMode === 'line') {
      setPriceLines([...priceLines, { price, color: '#8b5cf6', id: Date.now() }])
      setDrawMode(null)
    } else if (drawMode === 'alert') {
      setAlerts([...alerts, { price, id: Date.now() }])
      setDrawMode(null)
    } else if (drawMode === 'order') {
      setOrders([...orders, { 
        price, 
        type: orderType, 
        side: orderSide, 
        id: Date.now(),
        quantity: 100
      }])
      setDrawMode(null)
    }
  }
  
  const removePriceLine = (id) => {
    setPriceLines(priceLines.filter(l => l.id !== id))
  }
  
  const removeOrder = (id) => {
    setOrders(orders.filter(o => o.id !== id))
  }
  
  const removeAlert = (id) => {
    setAlerts(alerts.filter(a => a.id !== id))
  }
  
  const hoveredData = hoveredCandle !== null ? candleData[hoveredCandle] : null
  const currentPrice = hoveredData?.close || lastCandle.close

  return (
    <div className={`w-full h-full flex flex-col bg-[#080808] ${expanded ? '' : ''}`}>
      {/* Top Toolbar */}
      {!compact && (
        <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 bg-[#0c0c0c]">
          {/* Left: Symbol & Price */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className={`font-bold text-white ${expanded ? 'text-xl' : 'text-base'}`}>
                {ticker}
              </span>
              <span className={`font-mono ${expanded ? 'text-lg' : 'text-sm'} ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                ${currentPrice.toFixed(2)}
              </span>
              <span className={`text-xs px-1.5 py-0.5 rounded ${isPositive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
              </span>
            </div>
            
            {/* OHLC Data */}
            {hoveredData && expanded && (
              <div className="flex items-center gap-3 text-xs border-l border-white/10 pl-4 ml-2">
                <span className="text-gray-500">O <span className="text-white">{hoveredData.open.toFixed(2)}</span></span>
                <span className="text-gray-500">H <span className="text-green-400">{hoveredData.high.toFixed(2)}</span></span>
                <span className="text-gray-500">L <span className="text-red-400">{hoveredData.low.toFixed(2)}</span></span>
                <span className="text-gray-500">C <span className={hoveredData.bullish ? 'text-green-400' : 'text-red-400'}>{hoveredData.close.toFixed(2)}</span></span>
                <span className="text-gray-500">V <span className="text-purple-400">{formatVolume(hoveredData.volume)}</span></span>
              </div>
            )}
          </div>
          
          {/* Right: Tools & Controls */}
          <div className="flex items-center gap-2">
            {/* Chart Type */}
            <div className="flex items-center bg-white/5 rounded-lg p-0.5">
              {[
                { type: 'candle', icon: CandleIcon, label: 'Candle' },
                { type: 'line', icon: LineChart, label: 'Line' },
                { type: 'area', icon: AreaChart, label: 'Area' }
              ].map(({ type, icon: Icon, label }) => (
                <button
                  key={type}
                  onClick={() => setChartType(type)}
                  className={`p-1.5 rounded transition-all ${chartType === type ? 'bg-purple-500/30 text-purple-300' : 'text-gray-500 hover:text-white'}`}
                  title={label}
                >
                  <Icon size={14} />
                </button>
              ))}
            </div>
            
            {/* Drawing Tools */}
            {expanded && (
              <div className="flex items-center bg-white/5 rounded-lg p-0.5">
                <button
                  onClick={() => setDrawMode(drawMode === 'line' ? null : 'line')}
                  className={`p-1.5 rounded transition-all ${drawMode === 'line' ? 'bg-purple-500/30 text-purple-300' : 'text-gray-500 hover:text-white'}`}
                  title="Draw Price Line"
                >
                  <Minus size={14} />
                </button>
                <button
                  onClick={() => setDrawMode(drawMode === 'alert' ? null : 'alert')}
                  className={`p-1.5 rounded transition-all ${drawMode === 'alert' ? 'bg-yellow-500/30 text-yellow-300' : 'text-gray-500 hover:text-white'}`}
                  title="Set Price Alert"
                >
                  <Bell size={14} />
                </button>
                <button
                  onClick={() => { setDrawMode(drawMode === 'order' ? null : 'order'); setShowOrderPanel(true) }}
                  className={`p-1.5 rounded transition-all ${drawMode === 'order' ? 'bg-blue-500/30 text-blue-300' : 'text-gray-500 hover:text-white'}`}
                  title="Place Order"
                >
                  <Target size={14} />
                </button>
                {(priceLines.length > 0 || orders.length > 0 || alerts.length > 0) && (
                  <button
                    onClick={() => { setPriceLines([]); setOrders([]); setAlerts([]) }}
                    className="p-1.5 rounded text-gray-500 hover:text-red-400 transition-all"
                    title="Clear All"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            )}
            
            {/* Zoom Controls */}
            <div className="flex items-center bg-white/5 rounded-lg p-0.5">
              <button
                onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.25))}
                className="p-1.5 rounded text-gray-500 hover:text-white transition-all"
              >
                <Minus size={14} />
              </button>
              <span className="text-xs text-gray-400 px-1 min-w-[40px] text-center">{Math.round(zoomLevel * 100)}%</span>
              <button
                onClick={() => setZoomLevel(Math.min(3, zoomLevel + 0.25))}
                className="p-1.5 rounded text-gray-500 hover:text-white transition-all"
              >
                <Plus size={14} />
              </button>
            </div>
            
            {/* Time Period */}
            <div className="flex items-center bg-white/5 rounded-lg p-0.5">
              {Object.keys(TIME_PERIODS).map((period) => (
                <button 
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`px-2 py-1 text-xs font-medium rounded transition-all ${
                    selectedPeriod === period 
                      ? 'bg-purple-500/40 text-purple-300' 
                      : 'text-gray-500 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Order Panel */}
      {showOrderPanel && drawMode === 'order' && expanded && (
        <motion.div 
          className="flex items-center gap-3 px-3 py-2 bg-[#0f0f0f] border-b border-white/5"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
        >
          <span className="text-xs text-gray-400">Order Type:</span>
          <div className="flex items-center bg-white/5 rounded p-0.5">
            <button
              onClick={() => setOrderSide('buy')}
              className={`px-3 py-1 text-xs rounded ${orderSide === 'buy' ? 'bg-green-500/30 text-green-400' : 'text-gray-500'}`}
            >
              BUY
            </button>
            <button
              onClick={() => setOrderSide('sell')}
              className={`px-3 py-1 text-xs rounded ${orderSide === 'sell' ? 'bg-red-500/30 text-red-400' : 'text-gray-500'}`}
            >
              SELL
            </button>
          </div>
          <div className="flex items-center bg-white/5 rounded p-0.5">
            <button
              onClick={() => setOrderType('limit')}
              className={`px-3 py-1 text-xs rounded ${orderType === 'limit' ? 'bg-blue-500/30 text-blue-400' : 'text-gray-500'}`}
            >
              LIMIT
            </button>
            <button
              onClick={() => setOrderType('stop')}
              className={`px-3 py-1 text-xs rounded ${orderType === 'stop' ? 'bg-orange-500/30 text-orange-400' : 'text-gray-500'}`}
            >
              STOP
            </button>
          </div>
          <span className="text-xs text-gray-500">Click on chart to place order</span>
          <button
            onClick={() => { setShowOrderPanel(false); setDrawMode(null) }}
            className="ml-auto text-xs text-gray-500 hover:text-white"
          >
            Cancel
          </button>
        </motion.div>
      )}
      
      {/* Draw Mode Indicator */}
      {drawMode && !showOrderPanel && (
        <div className="px-3 py-1.5 bg-purple-500/10 border-b border-purple-500/20">
          <span className="text-xs text-purple-400">
            {drawMode === 'line' && '📏 Click on chart to draw horizontal line'}
            {drawMode === 'alert' && '🔔 Click on chart to set price alert'}
          </span>
        </div>
      )}

      {/* Main Chart Area */}
      <div 
        className={`flex-1 relative min-h-0 ${drawMode ? 'cursor-crosshair' : 'cursor-crosshair'}`}
        onMouseEnter={() => setShowCrosshair(true)}
        onMouseLeave={() => { setShowCrosshair(false); setHoveredCandle(null) }}
        onMouseMove={handleMouseMove}
        onClick={handleChartClick}
        ref={chartRef}
      >
        <svg 
          className="w-full h-full" 
          viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={isPositive ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'} />
              <stop offset="100%" stopColor="rgba(0, 0, 0, 0)" />
            </linearGradient>
          </defs>
          
          {/* Background */}
          <rect x="0" y="0" width={chartWidth} height={chartHeight} fill="#080808" />

          {/* Grid lines */}
          {priceLevels.map((price, i) => (
            <g key={i}>
              <line
                x1={leftPadding}
                y1={scaleY(price)}
                x2={chartWidth - rightPadding + 5}
                y2={scaleY(price)}
                stroke="rgba(255, 255, 255, 0.03)"
                strokeWidth="1"
              />
              <text
                x={chartWidth - 3}
                y={scaleY(price) + 3}
                fill="rgba(255, 255, 255, 0.25)"
                fontSize={expanded ? "9" : "7"}
                fontFamily="monospace"
                textAnchor="end"
              >
                {price.toFixed(0)}
              </text>
            </g>
          ))}
          
          {/* Area Chart */}
          {chartType === 'area' && (
            <path
              d={`M ${scaleX(0)} ${scaleY(candleData[0].close)} ${candleData.map((c, i) => `L ${scaleX(i)} ${scaleY(c.close)}`).join(' ')} L ${scaleX(candleData.length - 1)} ${chartHeight} L ${scaleX(0)} ${chartHeight} Z`}
              fill="url(#areaGradient)"
            />
          )}
          
          {/* Line Chart */}
          {chartType === 'line' && (
            <path
              d={`M ${candleData.map((c, i) => `${scaleX(i)} ${scaleY(c.close)}`).join(' L ')}`}
              fill="none"
              stroke={isPositive ? '#22c55e' : '#ef4444'}
              strokeWidth="2"
            />
          )}

          {/* Candlesticks */}
          {chartType === 'candle' && candleData.map((candle, i) => {
            const x = scaleX(i)
            const openY = scaleY(candle.open)
            const closeY = scaleY(candle.close)
            const highY = scaleY(candle.high)
            const lowY = scaleY(candle.low)
            const bodyTop = Math.min(openY, closeY)
            const bodyHeight = Math.max(Math.abs(closeY - openY), 1)
            const isHovered = hoveredCandle === i
            
            return (
              <g key={i} opacity={hoveredCandle !== null && !isHovered ? 0.5 : 1}>
                <line
                  x1={x + candleWidth / 2}
                  y1={highY}
                  x2={x + candleWidth / 2}
                  y2={lowY}
                  stroke={candle.bullish ? '#22c55e' : '#ef4444'}
                  strokeWidth={1}
                />
                <rect
                  x={x}
                  y={bodyTop}
                  width={candleWidth}
                  height={bodyHeight}
                  fill={candle.bullish ? '#22c55e' : '#ef4444'}
                  stroke={isHovered ? '#fff' : 'none'}
                  strokeWidth={1}
                />
              </g>
            )
          })}
          
          {/* User Price Lines */}
          {priceLines.map(line => (
            <g key={line.id}>
              <line
                x1={leftPadding}
                y1={scaleY(line.price)}
                x2={chartWidth - 5}
                y2={scaleY(line.price)}
                stroke={line.color}
                strokeWidth="1"
                strokeDasharray="8,4"
              />
              <rect
                x={chartWidth - 52}
                y={scaleY(line.price) - 9}
                width="50"
                height="18"
                fill={line.color}
                rx="2"
                className="cursor-pointer"
                onClick={(e) => { e.stopPropagation(); removePriceLine(line.id) }}
              />
              <text x={chartWidth - 27} y={scaleY(line.price) + 4} fill="white" fontSize="9" textAnchor="middle" fontFamily="monospace">
                {line.price.toFixed(2)}
              </text>
            </g>
          ))}
          
          {/* Price Alerts */}
          {alerts.map(alert => (
            <g key={alert.id}>
              <line
                x1={leftPadding}
                y1={scaleY(alert.price)}
                x2={chartWidth - 5}
                y2={scaleY(alert.price)}
                stroke="#eab308"
                strokeWidth="1"
                strokeDasharray="4,4"
              />
              <g transform={`translate(${leftPadding + 10}, ${scaleY(alert.price)})`} className="cursor-pointer" onClick={(e) => { e.stopPropagation(); removeAlert(alert.id) }}>
                <circle r="8" fill="#eab308" />
                <text x="0" y="3" fill="#000" fontSize="8" textAnchor="middle">🔔</text>
              </g>
              <rect x={chartWidth - 52} y={scaleY(alert.price) - 9} width="50" height="18" fill="#eab308" rx="2" />
              <text x={chartWidth - 27} y={scaleY(alert.price) + 4} fill="black" fontSize="9" textAnchor="middle" fontFamily="monospace" fontWeight="bold">
                {alert.price.toFixed(2)}
              </text>
            </g>
          ))}
          
          {/* Orders */}
          {orders.map(order => (
            <g key={order.id}>
              <line
                x1={leftPadding}
                y1={scaleY(order.price)}
                x2={chartWidth - 5}
                y2={scaleY(order.price)}
                stroke={order.side === 'buy' ? '#22c55e' : '#ef4444'}
                strokeWidth="2"
              />
              <rect
                x={leftPadding}
                y={scaleY(order.price) - 10}
                width="65"
                height="20"
                fill={order.side === 'buy' ? '#22c55e' : '#ef4444'}
                rx="3"
                className="cursor-pointer"
                onClick={(e) => { e.stopPropagation(); removeOrder(order.id) }}
              />
              <text x={leftPadding + 32} y={scaleY(order.price) + 4} fill="white" fontSize="9" textAnchor="middle" fontFamily="monospace" fontWeight="bold">
                {order.side.toUpperCase()} {order.type.substring(0,3).toUpperCase()}
              </text>
              <rect x={chartWidth - 52} y={scaleY(order.price) - 9} width="50" height="18" fill={order.side === 'buy' ? '#22c55e' : '#ef4444'} rx="2" />
              <text x={chartWidth - 27} y={scaleY(order.price) + 4} fill="white" fontSize="9" textAnchor="middle" fontFamily="monospace" fontWeight="bold">
                {order.price.toFixed(2)}
              </text>
            </g>
          ))}

          {/* Crosshair */}
          {showCrosshair && mousePos.x > leftPadding && mousePos.x < chartWidth - 10 && (
            <>
              <line x1={mousePos.x} y1={0} x2={mousePos.x} y2={chartHeight} stroke="rgba(138, 43, 226, 0.5)" strokeWidth="1" strokeDasharray="3,3" />
              <line x1={leftPadding} y1={mousePos.y} x2={chartWidth - 5} y2={mousePos.y} stroke="rgba(138, 43, 226, 0.5)" strokeWidth="1" strokeDasharray="3,3" />
              <rect x={chartWidth - 52} y={mousePos.y - 9} width="50" height="18" fill="rgba(138, 43, 226, 0.95)" rx="2" />
              <text x={chartWidth - 27} y={mousePos.y + 4} fill="white" fontSize="9" textAnchor="middle" fontFamily="monospace">
                {scaleYInverse(mousePos.y).toFixed(2)}
              </text>
            </>
          )}

          {/* Current price line */}
          <line x1={leftPadding} y1={scaleY(lastCandle.close)} x2={chartWidth - 5} y2={scaleY(lastCandle.close)} stroke={isPositive ? '#22c55e' : '#ef4444'} strokeWidth="1" strokeDasharray="5,3" opacity="0.7" />
          <rect x={chartWidth - 52} y={scaleY(lastCandle.close) - 9} width="50" height="18" fill={isPositive ? '#22c55e' : '#ef4444'} rx="2" />
          <text x={chartWidth - 27} y={scaleY(lastCandle.close) + 4} fill="white" fontSize="9" textAnchor="middle" fontFamily="monospace" fontWeight="bold">
            {lastCandle.close.toFixed(2)}
          </text>
        </svg>
      </div>

      {/* Volume bars */}
      {!compact && (
        <div className={`${expanded ? 'h-14' : 'h-8'} border-t border-white/5`}>
          <svg className="w-full h-full" viewBox={`0 0 ${chartWidth} ${expanded ? 50 : 30}`} preserveAspectRatio="xMidYMid meet">
            <text x="3" y="10" fill="rgba(255,255,255,0.15)" fontSize="7">VOL</text>
            {candleData.map((candle, i) => {
              const x = scaleX(i)
              const maxVol = Math.max(...candleData.map(d => d.volume))
              const barHeight = expanded ? 42 : 24
              const volHeight = (candle.volume / maxVol) * barHeight
              const isHovered = hoveredCandle === i
              
              return (
                <rect
                  key={i}
                  x={x}
                  y={barHeight + 3 - volHeight}
                  width={candleWidth}
                  height={volHeight}
                  fill={candle.bullish ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)'}
                  opacity={hoveredCandle !== null && !isHovered ? 0.3 : 1}
                />
              )
            })}
          </svg>
        </div>
      )}

      {/* Bottom Status Bar */}
      {!compact && (
        <div className="flex items-center justify-between px-3 py-1.5 border-t border-white/5 bg-[#0c0c0c] text-xs">
          <div className="flex items-center gap-4 text-gray-500">
            <span>{formatDate(candleData[0]?.date, selectedPeriod)} - {formatDate(candleData[candleData.length-1]?.date, selectedPeriod)}</span>
            <span>•</span>
            <span>{candleData.length} candles</span>
          </div>
          <div className="flex items-center gap-3">
            {orders.length > 0 && (
              <span className="text-blue-400">{orders.length} order{orders.length > 1 ? 's' : ''}</span>
            )}
            {alerts.length > 0 && (
              <span className="text-yellow-400">{alerts.length} alert{alerts.length > 1 ? 's' : ''}</span>
            )}
            {priceLines.length > 0 && (
              <span className="text-purple-400">{priceLines.length} line{priceLines.length > 1 ? 's' : ''}</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

