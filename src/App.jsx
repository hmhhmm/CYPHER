import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Search, 
  Play, 
  Pause, 
  FileText, 
  TrendingUp,
  Zap,
  Radio,
  ChevronRight,
  Activity,
  Newspaper,
  BarChart3
} from 'lucide-react'

// Mock data for the debate script
const scriptData = [
  { speaker: "Bull", text: "Tesla's revenue is up 20% year over year.", sentiment: "positive", ref: "chart" },
  { speaker: "Bear", text: "But look at the margins! They are shrinking due to price cuts.", sentiment: "negative", ref: "news" },
  { speaker: "Bull", text: "That is a strategic play to kill competition.", sentiment: "positive", ref: "pdf" }
]

// Terminal log lines for typewriter effect
const terminalLines = [
  "> Initializing Cypher Protocol...",
  "> Target Acquired: $TSLA",
  "> Searching SEC.gov for 10-K filings...",
  "> [SUCCESS] Found: tesla-10k-2024.pdf",
  "> Parsing 140 pages...",
  "> Identifying Entities: 'Panasonic', 'CATL'",
  "> [CROSS-CHECK] Live News: 'CATL supply shortage'",
  "> Synthesizing Audio Debate...",
  "> READY."
]

// ==================== LANDING VIEW ====================
function LandingView({ onAnalyze }) {
  const [ticker, setTicker] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef(null)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (ticker.trim()) {
      onAnalyze(ticker)
    }
  }

  return (
    <motion.div 
      className="min-h-screen flex flex-col items-center justify-center px-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.5 }}
    >
      {/* Floating particles effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-purple-500/30 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [-20, 20, -20],
              opacity: [0.2, 0.5, 0.2],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Logo and Title */}
      <motion.div 
        className="text-center mb-12"
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.6 }}
      >
        <div className="relative inline-block mb-6">
          <motion.div
            className="absolute inset-0 bg-purple-500/20 blur-3xl rounded-full"
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
          <h1 className="relative text-7xl md:text-9xl font-black tracking-tighter bg-gradient-to-r from-white via-purple-200 to-purple-400 bg-clip-text text-transparent">
            CYPHER
          </h1>
        </div>
        <motion.p 
          className="text-xl md:text-2xl text-gray-400 font-light tracking-widest uppercase"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          The Autonomous Analyst
        </motion.p>
        <motion.div 
          className="flex items-center justify-center gap-2 mt-4 text-purple-400/60"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          <Zap size={14} />
          <span className="text-xs tracking-[0.3em] uppercase">AI-Powered Financial Intelligence</span>
          <Zap size={14} />
        </motion.div>
      </motion.div>

      {/* Search Input */}
      <motion.form 
        onSubmit={handleSubmit}
        className="w-full max-w-2xl"
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.6 }}
      >
        <div className="relative group">
          {/* Glow effect container */}
          <motion.div 
            className={`absolute -inset-1 rounded-2xl transition-all duration-500 ${
              isFocused 
                ? 'bg-gradient-to-r from-purple-600 via-violet-600 to-purple-600 opacity-75 blur-lg' 
                : 'bg-purple-500/0'
            }`}
            animate={isFocused ? { 
              boxShadow: ['0 0 30px rgba(138,43,226,0.5)', '0 0 50px rgba(138,43,226,0.8)', '0 0 30px rgba(138,43,226,0.5)']
            } : {}}
            transition={{ duration: 2, repeat: Infinity }}
          />
          
          {/* Input container */}
          <div className={`relative flex items-center gap-4 bg-white/5 backdrop-blur-xl border rounded-2xl px-6 py-5 transition-all duration-300 ${
            isFocused ? 'border-purple-500/50 bg-white/10' : 'border-white/10 hover:border-white/20'
          }`}>
            <Search className={`transition-colors duration-300 ${isFocused ? 'text-purple-400' : 'text-gray-500'}`} size={28} />
            <input
              ref={inputRef}
              type="text"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Enter Ticker (e.g., $TSLA)"
              className="flex-1 bg-transparent text-xl md:text-2xl text-white placeholder-gray-500 outline-none font-medium tracking-wide"
            />
            <motion.button
              type="submit"
              disabled={!ticker.trim()}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-violet-600 rounded-xl text-white font-semibold text-lg tracking-wide disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:shadow-cypher-lg"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Analyze
            </motion.button>
          </div>
        </div>

        {/* Quick suggestions */}
        <motion.div 
          className="flex items-center justify-center gap-3 mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <span className="text-gray-500 text-sm">Popular:</span>
          {['$TSLA', '$AAPL', '$NVDA', '$MSFT'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTicker(t.replace('$', ''))}
              className="px-3 py-1 text-sm bg-white/5 border border-white/10 rounded-lg text-gray-400 hover:text-purple-400 hover:border-purple-500/30 transition-all"
            >
              {t}
            </button>
          ))}
        </motion.div>
      </motion.form>

      {/* Bottom decoration */}
      <motion.div 
        className="absolute bottom-8 flex items-center gap-2 text-gray-600"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        <Radio size={12} className="animate-pulse" />
        <span className="text-xs tracking-wider">SYSTEM ONLINE</span>
      </motion.div>
    </motion.div>
  )
}

// ==================== TERMINAL VIEW ====================
function TerminalView({ ticker, onComplete }) {
  const [displayedLines, setDisplayedLines] = useState([])
  const [currentLineIndex, setCurrentLineIndex] = useState(0)
  const [currentCharIndex, setCurrentCharIndex] = useState(0)
  const terminalRef = useRef(null)

  // Typewriter effect
  useEffect(() => {
    if (currentLineIndex >= terminalLines.length) {
      // All lines complete, wait and transition
      const timeout = setTimeout(() => {
        onComplete()
      }, 1000)
      return () => clearTimeout(timeout)
    }

    const currentLine = terminalLines[currentLineIndex].replace('$TSLA', `$${ticker}`)
    
    if (currentCharIndex < currentLine.length) {
      const timeout = setTimeout(() => {
        setDisplayedLines(prev => {
          const newLines = [...prev]
          if (newLines[currentLineIndex] === undefined) {
            newLines[currentLineIndex] = ''
          }
          newLines[currentLineIndex] = currentLine.substring(0, currentCharIndex + 1)
          return newLines
        })
        setCurrentCharIndex(prev => prev + 1)
      }, 20 + Math.random() * 30) // Variable speed for realism
      return () => clearTimeout(timeout)
    } else {
      // Move to next line
      const timeout = setTimeout(() => {
        setCurrentLineIndex(prev => prev + 1)
        setCurrentCharIndex(0)
      }, 200)
      return () => clearTimeout(timeout)
    }
  }, [currentLineIndex, currentCharIndex, ticker, onComplete])

  // Auto-scroll to bottom
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [displayedLines])

  const getLineColor = (line) => {
    if (line.includes('[SUCCESS]')) return 'text-green-400'
    if (line.includes('[CROSS-CHECK]')) return 'text-yellow-400'
    if (line.includes('READY')) return 'text-purple-400 font-bold'
    if (line.includes('Target')) return 'text-cyan-400'
    return 'text-gray-300'
  }

  return (
    <motion.div 
      className="min-h-screen flex items-center justify-center px-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div 
        className="w-full max-w-4xl"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, type: "spring" }}
      >
        {/* Terminal window */}
        <div className="relative">
          {/* Glow effect */}
          <div className="absolute -inset-2 bg-purple-500/20 blur-2xl rounded-3xl" />
          
          {/* Terminal container */}
          <div className="relative bg-black/90 border border-purple-500/30 rounded-2xl overflow-hidden shadow-2xl">
            {/* Terminal header */}
            <div className="flex items-center gap-2 px-4 py-3 bg-white/5 border-b border-white/10">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <span className="ml-4 text-sm text-gray-500 font-mono">cypher-protocol — analyzing ${ticker}</span>
              <div className="ml-auto flex items-center gap-2">
                <Activity size={14} className="text-purple-400 animate-pulse" />
                <span className="text-xs text-purple-400">ACTIVE</span>
              </div>
            </div>

            {/* Terminal content */}
            <div 
              ref={terminalRef}
              className="p-6 h-96 overflow-y-auto font-mono text-sm md:text-base space-y-2 scrollbar-thin"
            >
              {displayedLines.map((line, index) => (
                <motion.div 
                  key={index}
                  className={`${getLineColor(line)}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  {line}
                </motion.div>
              ))}
              
              {/* Blinking cursor */}
              {currentLineIndex < terminalLines.length && (
                <motion.span
                  className="inline-block w-3 h-5 bg-purple-400 ml-1"
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                />
              )}
            </div>

            {/* Progress bar */}
            <div className="px-6 pb-4">
              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-gradient-to-r from-purple-600 to-violet-500"
                  initial={{ width: '0%' }}
                  animate={{ width: `${(currentLineIndex / terminalLines.length) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                <span>Processing...</span>
                <span>{Math.round((currentLineIndex / terminalLines.length) * 100)}%</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ==================== DASHBOARD VIEW ====================
function DashboardView({ ticker }) {
  const [isPlaying, setIsPlaying] = useState(true)
  const [currentScriptIndex, setCurrentScriptIndex] = useState(0)
  const transcriptRef = useRef(null)

  // Auto-advance through script when playing
  useEffect(() => {
    if (!isPlaying) return
    
    const interval = setInterval(() => {
      setCurrentScriptIndex(prev => {
        if (prev >= scriptData.length - 1) {
          return 0 // Loop back
        }
        return prev + 1
      })
    }, 4000)

    return () => clearInterval(interval)
  }, [isPlaying])

  // Scroll to active transcript item
  useEffect(() => {
    if (transcriptRef.current) {
      const activeElement = transcriptRef.current.querySelector('.active-transcript')
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [currentScriptIndex])

  const currentScript = scriptData[currentScriptIndex]

  return (
    <motion.div 
      className="min-h-screen p-4 md:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      {/* Top Bar */}
      <motion.div 
        className="flex items-center justify-between mb-6 px-4 py-3 bg-white/5 backdrop-blur border border-white/10 rounded-xl"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-white tracking-wide">CYPHER</h2>
          <div className="h-6 w-px bg-white/20" />
          <span className="text-purple-400 font-mono font-semibold">${ticker}</span>
          <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">LIVE</span>
        </div>

        <div className="flex items-center gap-4">
          {/* Play/Pause Button */}
          <motion.button
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-12 h-12 flex items-center justify-center bg-gradient-to-r from-purple-600 to-violet-600 rounded-full shadow-cypher"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            {isPlaying ? <Pause size={20} className="text-white" /> : <Play size={20} className="text-white ml-0.5" />}
          </motion.button>

          {/* Audio Visualizer */}
          <div className="flex items-end gap-1 h-8">
            {[...Array(16)].map((_, i) => (
              <motion.div
                key={i}
                className="w-1 bg-gradient-to-t from-purple-600 to-violet-400 rounded-full"
                animate={isPlaying ? {
                  height: ['30%', `${Math.random() * 70 + 30}%`, '30%']
                } : { height: '20%' }}
                transition={{
                  duration: 0.3 + Math.random() * 0.2,
                  repeat: isPlaying ? Infinity : 0,
                  delay: i * 0.05,
                }}
                style={{ height: '30%' }}
              />
            ))}
          </div>
        </div>
      </motion.div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-140px)]">
        
        {/* Left Card - The Debate */}
        <motion.div 
          className="bento-card p-6"
          initial={{ x: -30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-2 mb-6">
            <Radio size={16} className="text-purple-400" />
            <h3 className="text-sm font-semibold text-gray-400 tracking-wider uppercase">Live Debate</h3>
          </div>

          <div className="flex justify-center gap-8 md:gap-12">
            {/* Bull Avatar */}
            <div className="text-center">
              <motion.div 
                className={`relative w-24 h-24 md:w-32 md:h-32 rounded-full flex items-center justify-center text-4xl md:text-5xl
                  ${currentScript.speaker === 'Bull' 
                    ? 'bg-gradient-to-br from-green-500/30 to-green-600/20 border-2 border-green-400' 
                    : 'bg-white/5 border border-white/10'
                  }`}
                animate={currentScript.speaker === 'Bull' ? {
                  boxShadow: ['0 0 0 0 rgba(34, 197, 94, 0.4)', '0 0 0 20px rgba(34, 197, 94, 0)', '0 0 0 0 rgba(34, 197, 94, 0.4)']
                } : {}}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                🐂
                {currentScript.speaker === 'Bull' && (
                  <motion.div 
                    className="absolute inset-0 rounded-full border-2 border-green-400"
                    animate={{ scale: [1, 1.2, 1], opacity: [1, 0, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                )}
              </motion.div>
              <p className="mt-3 font-semibold text-green-400">BULL</p>
              <p className="text-xs text-gray-500">Optimistic</p>
            </div>

            {/* VS Divider */}
            <div className="flex flex-col items-center justify-center">
              <motion.div 
                className="text-2xl font-black text-purple-500/50"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                VS
              </motion.div>
            </div>

            {/* Bear Avatar */}
            <div className="text-center">
              <motion.div 
                className={`relative w-24 h-24 md:w-32 md:h-32 rounded-full flex items-center justify-center text-4xl md:text-5xl
                  ${currentScript.speaker === 'Bear' 
                    ? 'bg-gradient-to-br from-red-500/30 to-red-600/20 border-2 border-red-400' 
                    : 'bg-white/5 border border-white/10'
                  }`}
                animate={currentScript.speaker === 'Bear' ? {
                  boxShadow: ['0 0 0 0 rgba(239, 68, 68, 0.4)', '0 0 0 20px rgba(239, 68, 68, 0)', '0 0 0 0 rgba(239, 68, 68, 0.4)']
                } : {}}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                🐻
                {currentScript.speaker === 'Bear' && (
                  <motion.div 
                    className="absolute inset-0 rounded-full border-2 border-red-400"
                    animate={{ scale: [1, 1.2, 1], opacity: [1, 0, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                )}
              </motion.div>
              <p className="mt-3 font-semibold text-red-400">BEAR</p>
              <p className="text-xs text-gray-500">Skeptical</p>
            </div>
          </div>

          {/* Current speaker indicator */}
          <motion.div 
            className="mt-8 text-center"
            key={currentScript.speaker}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-sm text-gray-500">Speaking now</p>
            <p className={`text-lg font-bold ${currentScript.speaker === 'Bull' ? 'text-green-400' : 'text-red-400'}`}>
              {currentScript.speaker.toUpperCase()}
            </p>
          </motion.div>
        </motion.div>

        {/* Middle Card - Transcript */}
        <motion.div 
          className="bento-card p-6 flex flex-col"
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <FileText size={16} className="text-purple-400" />
            <h3 className="text-sm font-semibold text-gray-400 tracking-wider uppercase">Transcript</h3>
          </div>

          <div ref={transcriptRef} className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
            {scriptData.map((item, index) => (
              <motion.div
                key={index}
                className={`p-4 rounded-xl transition-all duration-300 ${
                  index === currentScriptIndex 
                    ? 'bg-purple-600/30 border border-purple-500/50 active-transcript' 
                    : 'bg-white/5 border border-transparent'
                }`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                    item.speaker === 'Bull' 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {item.speaker}
                  </span>
                  {index === currentScriptIndex && (
                    <motion.span 
                      className="flex items-center gap-1 text-xs text-purple-400"
                      animate={{ opacity: [1, 0.5, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    >
                      <Activity size={10} /> LIVE
                    </motion.span>
                  )}
                </div>
                <p className={`text-sm leading-relaxed ${
                  index === currentScriptIndex ? 'text-white' : 'text-gray-400'
                }`}>
                  {item.text}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    item.sentiment === 'positive' 
                      ? 'bg-green-500/10 text-green-400' 
                      : 'bg-red-500/10 text-red-400'
                  }`}>
                    {item.sentiment}
                  </span>
                  <ChevronRight size={12} className="text-gray-600" />
                  <span className="text-xs text-gray-500">{item.ref}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Right Card - Dynamic Context (Heat Code) */}
        <motion.div 
          className="bento-card p-6"
          initial={{ x: 30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Zap size={16} className="text-purple-400" />
            <h3 className="text-sm font-semibold text-gray-400 tracking-wider uppercase">Heat Code</h3>
            <span className="ml-auto text-xs text-purple-400 bg-purple-500/20 px-2 py-0.5 rounded-full">
              {currentScript.ref.toUpperCase()}
            </span>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentScript.ref}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="h-[calc(100%-3rem)]"
            >
              {currentScript.ref === 'chart' && <ChartContext />}
              {currentScript.ref === 'news' && <NewsContext />}
              {currentScript.ref === 'pdf' && <PDFContext />}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
    </motion.div>
  )
}

// Context Components for Heat Code
function ChartContext() {
  const chartData = [30, 45, 35, 55, 40, 65, 55, 75, 70, 85, 80, 95]
  const maxValue = Math.max(...chartData)

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp size={20} className="text-green-400" />
        <span className="text-green-400 font-semibold">Revenue Growth</span>
      </div>
      
      {/* SVG Chart */}
      <div className="flex-1 relative bg-white/5 rounded-xl p-4 border border-white/10">
        <div className="absolute top-4 right-4 text-right">
          <p className="text-2xl font-bold text-green-400">+20%</p>
          <p className="text-xs text-gray-500">Year over Year</p>
        </div>
        
        <svg className="w-full h-full" viewBox="0 0 400 200" preserveAspectRatio="none">
          {/* Grid lines */}
          {[0, 1, 2, 3, 4].map((i) => (
            <line
              key={i}
              x1="0"
              y1={i * 50}
              x2="400"
              y2={i * 50}
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="1"
            />
          ))}
          
          {/* Area fill */}
          <motion.path
            d={`M 0 200 ${chartData.map((val, i) => `L ${(i * 400) / (chartData.length - 1)} ${200 - (val / maxValue) * 180}`).join(' ')} L 400 200 Z`}
            fill="url(#greenGradient)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
          />
          
          {/* Line */}
          <motion.path
            d={`M ${chartData.map((val, i) => `${(i * 400) / (chartData.length - 1)} ${200 - (val / maxValue) * 180}`).join(' L ')}`}
            fill="none"
            stroke="#22c55e"
            strokeWidth="3"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
          />
          
          {/* Gradient definition */}
          <defs>
            <linearGradient id="greenGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(34, 197, 94, 0.3)" />
              <stop offset="100%" stopColor="rgba(34, 197, 94, 0)" />
            </linearGradient>
          </defs>
        </svg>
        
        {/* X-axis labels */}
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>Jan</span>
          <span>Apr</span>
          <span>Jul</span>
          <span>Oct</span>
          <span>Dec</span>
        </div>
      </div>
      
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="bg-white/5 rounded-lg p-2">
          <p className="text-lg font-bold text-white">$96.8B</p>
          <p className="text-xs text-gray-500">Revenue</p>
        </div>
        <div className="bg-white/5 rounded-lg p-2">
          <p className="text-lg font-bold text-green-400">+20%</p>
          <p className="text-xs text-gray-500">Growth</p>
        </div>
        <div className="bg-white/5 rounded-lg p-2">
          <p className="text-lg font-bold text-white">Q4</p>
          <p className="text-xs text-gray-500">Period</p>
        </div>
      </div>
    </div>
  )
}

function NewsContext() {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <Newspaper size={20} className="text-yellow-400" />
        <span className="text-yellow-400 font-semibold">Breaking News</span>
      </div>
      
      <motion.div 
        className="flex-1 bg-gradient-to-br from-red-500/10 to-orange-500/5 border border-red-500/30 rounded-xl p-5"
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring" }}
      >
        <div className="flex items-center gap-2 mb-3">
          <motion.div 
            className="w-2 h-2 bg-red-500 rounded-full"
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
          <span className="text-xs text-red-400 font-semibold tracking-wider">BREAKING</span>
        </div>
        
        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-2">FINANCIAL TIMES</p>
          <h4 className="text-xl font-bold text-white leading-tight mb-3">
            Tesla Margins Squeeze Amid Price War Strategy
          </h4>
          <p className="text-sm text-gray-400 leading-relaxed">
            Analysts express concern over shrinking profit margins as Tesla continues aggressive price cuts across global markets to combat rising competition.
          </p>
        </div>
        
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>2 hours ago</span>
          <span>•</span>
          <span className="text-red-400">High Impact</span>
        </div>
        
        <div className="mt-4 pt-4 border-t border-white/10">
          <p className="text-xs text-gray-500 mb-2">Related</p>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <ChevronRight size={12} />
              <span>EV price wars intensify in China</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <ChevronRight size={12} />
              <span>CATL reports supply constraints</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

function PDFContext() {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <FileText size={20} className="text-purple-400" />
        <span className="text-purple-400 font-semibold">Document Reference</span>
      </div>
      
      <div className="flex-1 bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        {/* Document header */}
        <div className="bg-white/5 px-4 py-2 border-b border-white/10 flex items-center gap-2">
          <FileText size={14} className="text-gray-500" />
          <span className="text-xs text-gray-400 font-mono">tesla-10k-2024.pdf</span>
          <span className="ml-auto text-xs text-gray-500">Page 47 of 140</span>
        </div>
        
        {/* Document content */}
        <div className="p-4 font-mono text-xs leading-relaxed space-y-3">
          <p className="text-gray-500">
            ...market positioning in the electric vehicle sector. The Company continues to pursue an aggressive pricing strategy to...
          </p>
          
          <motion.div 
            className="bg-purple-500/20 border-l-2 border-purple-500 px-3 py-2 rounded-r"
            animate={{ backgroundColor: ['rgba(139, 92, 246, 0.2)', 'rgba(139, 92, 246, 0.3)', 'rgba(139, 92, 246, 0.2)'] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <p className="text-white">
              <span className="text-purple-400 font-bold">Strategic Initiative:</span> Price reductions are designed to{' '}
              <span className="bg-yellow-400/30 text-yellow-200">eliminate competition</span> and expand market share in key growth regions including China and Europe.
            </p>
          </motion.div>
          
          <p className="text-gray-500">
            ...cost structure improvements through vertical integration with battery manufacturing partners including{' '}
            <span className="text-cyan-400">Panasonic</span> and <span className="text-cyan-400">CATL</span>...
          </p>
          
          <div className="flex items-center gap-2 pt-2 border-t border-white/10 mt-4">
            <BarChart3 size={12} className="text-gray-500" />
            <span className="text-gray-500">Relevance Score:</span>
            <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-gradient-to-r from-purple-500 to-violet-500"
                initial={{ width: 0 }}
                animate={{ width: '92%' }}
                transition={{ duration: 1, delay: 0.3 }}
              />
            </div>
            <span className="text-purple-400 font-semibold">92%</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ==================== MAIN APP ====================
export default function App() {
  const [view, setView] = useState('landing') // 'landing' | 'terminal' | 'dashboard'
  const [ticker, setTicker] = useState('TSLA')

  const handleAnalyze = (inputTicker) => {
    setTicker(inputTicker)
    setView('terminal')
  }

  const handleTerminalComplete = () => {
    setView('dashboard')
  }

  return (
    <div className="app-wrapper min-h-screen bg-cypher-bg text-white font-sans antialiased overflow-x-hidden">
      {/* Grid texture background */}
      <div className="grid-background" />
      
      {/* Vignette overlay */}
      <div className="vignette" />
      
      {/* Main content */}
      <div className="relative z-10">
        <AnimatePresence mode="wait">
          {view === 'landing' && (
            <LandingView key="landing" onAnalyze={handleAnalyze} />
          )}
          {view === 'terminal' && (
            <TerminalView key="terminal" ticker={ticker} onComplete={handleTerminalComplete} />
          )}
          {view === 'dashboard' && (
            <DashboardView key="dashboard" ticker={ticker} />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

