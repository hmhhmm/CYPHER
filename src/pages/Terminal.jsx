import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Activity, Cpu, Database, FileSearch, Wifi, Zap } from 'lucide-react'

// Terminal log lines for typewriter effect
const getTerminalLines = (ticker, company) => [
  { text: "> Initializing Cypher Protocol...", delay: 0 },
  { text: "> Establishing secure connection...", delay: 0 },
  { text: `> Target Acquired: $${ticker} (${company})`, delay: 0, highlight: 'cyan' },
  { text: "> Searching SEC.gov for 10-K filings...", delay: 0 },
  { text: `> [SUCCESS] Found: ${ticker.toLowerCase()}-10k-2024.pdf`, delay: 0, highlight: 'green' },
  { text: "> Parsing 142 pages...", delay: 0 },
  { text: "> Extracting financial metrics...", delay: 0 },
  { text: "> Identifying key entities: 'Revenue', 'Margins', 'Growth'", delay: 0 },
  { text: "> [CROSS-CHECK] Scanning live news feeds...", delay: 0, highlight: 'yellow' },
  { text: "> [SUCCESS] Found 24 relevant articles", delay: 0, highlight: 'green' },
  { text: "> Generating Bull thesis...", delay: 0 },
  { text: "> Generating Bear thesis...", delay: 0 },
  { text: "> Synthesizing AI debate script...", delay: 0 },
  { text: "> Compiling market analysis...", delay: 0 },
  { text: "> [COMPLETE] All systems ready", delay: 0, highlight: 'green' },
  { text: "> LAUNCHING DASHBOARD...", delay: 0, highlight: 'purple' },
]

export default function Terminal() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  
  const ticker = searchParams.get('ticker') || 'TSLA'
  const company = searchParams.get('company') || 'Tesla Inc.'
  
  const terminalLines = getTerminalLines(ticker, company)
  
  const [displayedLines, setDisplayedLines] = useState([])
  const [currentLineIndex, setCurrentLineIndex] = useState(0)
  const [currentCharIndex, setCurrentCharIndex] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const terminalRef = useRef(null)

  // Typewriter effect
  useEffect(() => {
    if (currentLineIndex >= terminalLines.length) {
      setIsComplete(true)
      // Wait and transition to dashboard
      const timeout = setTimeout(() => {
        navigate(`/dashboard?ticker=${ticker}&company=${encodeURIComponent(company)}`)
      }, 800)
      return () => clearTimeout(timeout)
    }

    const currentLine = terminalLines[currentLineIndex].text
    
    if (currentCharIndex < currentLine.length) {
      const timeout = setTimeout(() => {
        setDisplayedLines(prev => {
          const newLines = [...prev]
          if (newLines[currentLineIndex] === undefined) {
            newLines[currentLineIndex] = { text: '', highlight: terminalLines[currentLineIndex].highlight }
          }
          newLines[currentLineIndex] = {
            text: currentLine.substring(0, currentCharIndex + 1),
            highlight: terminalLines[currentLineIndex].highlight
          }
          return newLines
        })
        setCurrentCharIndex(prev => prev + 1)
      }, 15 + Math.random() * 25) // Fast typing speed
      return () => clearTimeout(timeout)
    } else {
      // Move to next line
      const timeout = setTimeout(() => {
        setCurrentLineIndex(prev => prev + 1)
        setCurrentCharIndex(0)
      }, 100)
      return () => clearTimeout(timeout)
    }
  }, [currentLineIndex, currentCharIndex, navigate, ticker, company, terminalLines])

  // Auto-scroll to bottom
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [displayedLines])

  const getLineColor = (highlight) => {
    switch (highlight) {
      case 'green': return 'text-green-400'
      case 'yellow': return 'text-yellow-400'
      case 'cyan': return 'text-cyan-400'
      case 'purple': return 'text-purple-400 font-bold'
      default: return 'text-gray-300'
    }
  }

  const progress = (currentLineIndex / terminalLines.length) * 100

  return (
    <motion.div 
      className="min-h-screen flex items-center justify-center px-4 py-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.02 }}
      transition={{ duration: 0.4 }}
    >
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Floating data particles */}
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-purple-500/20 font-mono text-xs"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [-10, 10, -10],
              opacity: [0.1, 0.3, 0.1],
            }}
            transition={{
              duration: 2 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          >
            {Math.random() > 0.5 ? '1' : '0'}
          </motion.div>
        ))}
      </div>

      <motion.div 
        className="w-full max-w-4xl"
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.5, type: "spring" }}
      >
        {/* Header */}
        <motion.div 
          className="flex items-center justify-center gap-3 mb-6"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Cpu size={24} className="text-purple-400" />
          </motion.div>
          <h2 className="text-xl font-bold text-white tracking-wider">CYPHER PROTOCOL</h2>
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            <Zap size={20} className="text-yellow-400" />
          </motion.div>
        </motion.div>

        {/* Terminal window */}
        <div className="relative">
          {/* Outer glow */}
          <motion.div 
            className="absolute -inset-3 bg-purple-500/20 blur-2xl rounded-3xl"
            animate={{ opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          
          {/* Terminal container */}
          <div className="relative bg-black/90 border border-purple-500/30 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl">
            {/* Terminal header */}
            <div className="flex items-center gap-2 px-4 py-3 bg-white/5 border-b border-white/10">
              <div className="flex gap-2">
                <motion.div 
                  className="w-3 h-3 rounded-full bg-red-500"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <motion.div 
                  className="w-3 h-3 rounded-full bg-yellow-500"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
                />
                <motion.div 
                  className="w-3 h-3 rounded-full bg-green-500"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.6 }}
                />
              </div>
              <span className="ml-4 text-sm text-gray-500 font-mono">cypher@analysis ~ ${ticker}</span>
              <div className="ml-auto flex items-center gap-3">
                <motion.div 
                  className="flex items-center gap-2"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  <Wifi size={14} className="text-green-400" />
                  <span className="text-xs text-green-400">CONNECTED</span>
                </motion.div>
                <div className="flex items-center gap-2">
                  <Activity size={14} className="text-purple-400 animate-pulse" />
                  <span className="text-xs text-purple-400">PROCESSING</span>
                </div>
              </div>
            </div>

            {/* Terminal content */}
            <div 
              ref={terminalRef}
              className="p-6 h-80 md:h-96 overflow-y-auto font-mono text-sm space-y-1.5 scrollbar-thin"
            >
              {/* ASCII Art Header */}
              <pre className="text-purple-500/60 text-xs mb-4 hidden md:block">
{`   ______  __  __  ____    __  __  ____  ____ 
  / ____/ / / / / / __ \\  / / / / / __/ / __ \\
 / /     / /_/ / / /_/ / / /_/ / / _/  / /_/ /
/_/      \\__, / / .___/ / __  / /___/ / _  _/ 
        /____/ /_/     /_/ /_/ /____/ /_/ |_|  v2.0`}
              </pre>
              
              {displayedLines.map((line, index) => (
                <motion.div 
                  key={index}
                  className={`${getLineColor(line.highlight)} flex items-start gap-2`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.1 }}
                >
                  {line.highlight === 'green' && (
                    <span className="text-green-400">✓</span>
                  )}
                  {line.highlight === 'yellow' && (
                    <span className="text-yellow-400">⚡</span>
                  )}
                  <span>{line.text}</span>
                </motion.div>
              ))}
              
              {/* Blinking cursor */}
              {!isComplete && (
                <div className="flex items-center">
                  <motion.span
                    className="inline-block w-2.5 h-5 bg-purple-400"
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                  />
                </div>
              )}

              {/* Completion message */}
              {isComplete && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-4 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <Database size={20} className="text-purple-400" />
                    </motion.div>
                    <span className="text-purple-400 font-semibold">Launching Dashboard...</span>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Progress section */}
            <div className="px-6 pb-4 space-y-3">
              {/* Progress bar */}
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-gradient-to-r from-purple-600 via-violet-500 to-purple-600 rounded-full"
                  style={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              
              {/* Status row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-2 text-gray-500">
                    <FileSearch size={12} />
                    <span>Sources: 5</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500">
                    <Database size={12} />
                    <span>Data Points: 1,247</span>
                  </div>
                </div>
                <div className="text-xs text-gray-400 font-mono">
                  {Math.round(progress)}% Complete
                </div>
              </div>
            </div>

            {/* Bottom status bar */}
            <div className="px-6 py-3 bg-white/[0.02] border-t border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <motion.div 
                  className="flex items-center gap-2"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                >
                  <div className="w-2 h-2 bg-green-400 rounded-full" />
                  <span className="text-xs text-gray-400">AI Engine Active</span>
                </motion.div>
                <span className="text-xs text-gray-600">|</span>
                <span className="text-xs text-gray-500">Model: GPT-4 Turbo</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-purple-400 font-mono">${ticker}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom hint */}
        <motion.p 
          className="text-center text-xs text-gray-600 mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          Analyzing financial data and generating insights...
        </motion.p>
      </motion.div>
    </motion.div>
  )
}

