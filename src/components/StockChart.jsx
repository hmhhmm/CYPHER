import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  RefreshCw,
  Maximize2
} from 'lucide-react'

export default function StockChart({ ticker }) {
  const containerRef = useRef(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    // Try to load TradingView widget
    const loadTradingViewWidget = () => {
      if (!containerRef.current) return
      
      // Clear previous widget
      containerRef.current.innerHTML = ''
      setIsLoading(true)
      setError(false)

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
          "allow_symbol_change": true,
          "save_image": false,
          "calendar": false,
          "support_host": "https://www.tradingview.com"
        })

        script.onload = () => {
          setIsLoading(false)
        }

        script.onerror = () => {
          setError(true)
          setIsLoading(false)
        }

        // Create widget container
        const widgetContainer = document.createElement('div')
        widgetContainer.className = 'tradingview-widget-container'
        widgetContainer.style.height = '100%'
        widgetContainer.style.width = '100%'

        const widgetInner = document.createElement('div')
        widgetInner.className = 'tradingview-widget-container__widget'
        widgetInner.style.height = 'calc(100% - 32px)'
        widgetInner.style.width = '100%'

        widgetContainer.appendChild(widgetInner)
        widgetContainer.appendChild(script)
        containerRef.current.appendChild(widgetContainer)

        // Fallback timeout
        setTimeout(() => {
          if (isLoading) {
            setIsLoading(false)
            // If still loading, show fallback chart instead of widget errors
            setError(true)
          }
        }, 5000)

      } catch (err) {
        console.error('TradingView widget error:', err)
        setError(true)
        setIsLoading(false)
      }
    }

    loadTradingViewWidget()

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }
    }
  }, [ticker])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <BarChart3 size={18} className="text-purple-400" />
          <h2 className="font-semibold text-white">Real-Time Chart</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-mono">{ticker}</span>
          <button className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all">
            <Maximize2 size={14} />
          </button>
        </div>
      </div>

      {/* Chart Container */}
      <div className="flex-1 relative min-h-0">
        {/* TradingView Widget */}
        <div 
          ref={containerRef} 
          className="absolute inset-0"
          style={{ minHeight: '200px' }}
        />

        {/* Loading State */}
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm z-10">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              <RefreshCw size={24} className="text-purple-400" />
            </motion.div>
            <p className="text-sm text-gray-400 mt-2">Loading chart...</p>
          </div>
        )}

        {/* Error/Fallback State */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
            <FallbackChart ticker={ticker} />
          </div>
        )}
      </div>
    </div>
  )
}

// Fallback SVG Chart Component
function FallbackChart({ ticker }) {
  const chartData = [30, 35, 32, 40, 38, 45, 42, 55, 50, 58, 55, 62, 58, 65, 70, 68, 75, 72, 80, 78]
  const maxValue = Math.max(...chartData)
  const minValue = Math.min(...chartData)
  const range = maxValue - minValue

  return (
    <div className="w-full h-full p-4 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-white">${ticker}</h3>
          <p className="text-xs text-gray-500">Daily Chart (Demo)</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-green-400">+2.34%</p>
          <p className="text-xs text-gray-500">Today</p>
        </div>
      </div>

      <div className="flex-1 relative">
        <svg className="w-full h-full" viewBox="0 0 400 150" preserveAspectRatio="none">
          {/* Grid lines */}
          {[0, 1, 2, 3, 4].map((i) => (
            <line
              key={i}
              x1="0"
              y1={i * 37.5}
              x2="400"
              y2={i * 37.5}
              stroke="rgba(138, 43, 226, 0.1)"
              strokeWidth="1"
            />
          ))}

          {/* Area fill */}
          <motion.path
            d={`M 0 150 ${chartData.map((val, i) => {
              const x = (i / (chartData.length - 1)) * 400
              const y = 150 - ((val - minValue) / range) * 140
              return `L ${x} ${y}`
            }).join(' ')} L 400 150 Z`}
            fill="url(#purpleGradient)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
          />

          {/* Line */}
          <motion.path
            d={`M ${chartData.map((val, i) => {
              const x = (i / (chartData.length - 1)) * 400
              const y = 150 - ((val - minValue) / range) * 140
              return `${x} ${y}`
            }).join(' L ')}`}
            fill="none"
            stroke="#8A2BE2"
            strokeWidth="2"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
          />

          {/* Current price dot */}
          <motion.circle
            cx={400}
            cy={150 - ((chartData[chartData.length - 1] - minValue) / range) * 140}
            r="4"
            fill="#8A2BE2"
            initial={{ scale: 0 }}
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />

          {/* Gradient definition */}
          <defs>
            <linearGradient id="purpleGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(138, 43, 226, 0.3)" />
              <stop offset="100%" stopColor="rgba(138, 43, 226, 0)" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
        <span>9:30 AM</span>
        <span>12:00 PM</span>
        <span>4:00 PM</span>
      </div>
    </div>
  )
}

