import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Activity, Cpu, Database, FileSearch, Wifi, Zap, AlertCircle } from 'lucide-react'
import { runAnalysisPipeline } from '../utils/api'

export default function Terminal() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  
  const ticker = searchParams.get('ticker') || 'TSLA'
  const company = searchParams.get('company') || 'Tesla Inc.'
  const year = parseInt(searchParams.get('year')) || new Date().getFullYear()
  
  const [displayedLines, setDisplayedLines] = useState([])
  const [currentStep, setCurrentStep] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const [error, setError] = useState(null)
  const [progress, setProgress] = useState(0)
  const [pipelineData, setPipelineData] = useState({
    harvestedData: null,
    debateScript: null,
    pdfUrl: null,
  })
  const [stats, setStats] = useState({
    sources: 0,
    debateLines: 0,
    documents: 0
  })
  
  const terminalRef = useRef(null)
  const pipelineStarted = useRef(false)

  // Add a line to the terminal with typewriter effect
  const addLine = useCallback((text, highlight = null) => {
    const processedText = text
      .replace('${ticker}', `$${ticker}`)
      .replace('${company}', company)
    
    setDisplayedLines(prev => [...prev, { text: processedText, highlight }])
  }, [ticker, company])

  // Run the real pipeline with dynamic updates
  const runPipeline = useCallback(async () => {
    if (pipelineStarted.current) return
    pipelineStarted.current = true

    try {
      // Step 1: Initialize
      addLine('> Initializing Cypher Protocol...')
      setProgress(5)
      await delay(500)
      
      // Step 2: Connect
      addLine('> Establishing secure connection...')
      setProgress(10)
      await delay(400)
      
      // Step 3: Target acquired
      addLine(`> Target Acquired: $${ticker} (${company})`, 'cyan')
      setProgress(15)
      await delay(300)
      setCurrentStep(3)

      // Use the real pipeline with progress callbacks
      addLine(`> Launching AI analysis pipeline for ${ticker}...`)
      setProgress(20)
      await delay(300)

      const result = await runAnalysisPipeline(
        `Analyze ${ticker}`,
        (status, message) => {
          // Map pipeline status to terminal messages
          switch(status) {
            case 'extracting_intent':
              addLine(`> Analyzing request intent...`)
              setProgress(25)
              break
            case 'searching_pdf':
              addLine(`> Searching for ${ticker} filings across multiple sources...`)
              setStats(prev => ({ ...prev, documents: 1 }))
              setProgress(35)
              setCurrentStep(5)
              break
            case 'harvesting':
              addLine(`> Downloading ${ticker} financial documents...`)
              setProgress(45)
              addLine(`> Extracting financial metrics for ${ticker}...`)
              setProgress(50)
              addLine(`> Analyzing Management Discussion for ${company}...`)
              setProgress(55)
              addLine(`> Identifying risk factors in ${ticker} filing...`)
              setProgress(60)
              setCurrentStep(8)
              break
            case 'generating_debate':
              addLine(`> [SUCCESS] Harvested MD&A, Risk Factors, Financials`, 'green')
              setProgress(65)
              addLine(`> Generating Bull thesis for ${ticker}...`)
              setProgress(70)
              addLine(`> Generating Bear thesis for ${ticker}...`)
              setProgress(75)
              addLine(`> Synthesizing ${company} debate arguments...`)
              setProgress(80)
              setCurrentStep(11)
              break
            case 'generating_report':
              addLine(`> [SUCCESS] AI debate script ready`, 'green')
              addLine(`> Creating comprehensive analysis report...`)
              setProgress(85)
              break
            case 'synthesizing_audio':
              addLine(`> Synthesizing audio podcast...`)
              setProgress(90)
              break
            case 'complete':
              addLine(`> [COMPLETE] ${ticker} analysis ready`, 'green')
              setProgress(95)
              addLine(`> LAUNCHING ${ticker} DASHBOARD...`, 'purple')
              setProgress(100)
              setCurrentStep(13)
              setIsComplete(true)
              break
          }
          
          // Update stats from message if available
          if (message && message.includes('documents')) {
            const match = message.match(/(\d+)\s+documents?/)
            if (match) {
              setStats(prev => ({ ...prev, documents: parseInt(match[1]) }))
            }
          }
          if (message && message.includes('debate')) {
            const match = message.match(/(\d+)\s+debate/)
            if (match) {
              setStats(prev => ({ ...prev, debateLines: parseInt(match[1]) }))
            }
          }
        }
      )

      // Navigate to dashboard with result
      await delay(800)
      if (result && result.sessionId) {
        navigate(`/dashboard/${ticker}?company=${encodeURIComponent(company)}&sessionId=${result.sessionId}`)
      } else {
        navigate(`/dashboard/${ticker}?company=${encodeURIComponent(company)}`)
      }

    } catch (err) {
      console.error('Pipeline error:', err)
      setError(err.message)
      addLine(`> [ERROR] ${err.message}`, 'red')
      addLine(`> Retrying with fallback data for ${ticker}...`, 'yellow')
      setProgress(100)
      
      // Navigate to dashboard anyway (it will use fallback data)
      setTimeout(() => {
        navigate(`/dashboard/${ticker}?company=${encodeURIComponent(company)}`)
      }, 2000)
    }
  }, [ticker, company, addLine, navigate])

  // Start pipeline on mount
  useEffect(() => {
    runPipeline()
  }, [runPipeline])

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
      case 'red': return 'text-red-400'
      default: return 'text-gray-300'
    }
  }

  return (
    <motion.div 
      className="min-h-screen flex items-center justify-center px-4 py-8 bg-[#0A0A0A]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.02 }}
      transition={{ duration: 0.4 }}
    >
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
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
            <Zap size={20} className="text-purple-400" />
          </motion.div>
        </motion.div>

        {/* Terminal window */}
        <div className="relative">
          <motion.div 
            className="absolute -inset-3 bg-purple-500/20 blur-2xl rounded-3xl"
            animate={{ opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          
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
                  <span className="text-xs text-purple-400">
                    {isComplete ? 'COMPLETE' : error ? 'ERROR' : 'PROCESSING'}
                  </span>
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
  / ______/ / / / / __ \\  / / / / / __/ / __ \\
 / /       /_/ / / /_/ / / /_/ / / _/  / /_/ /
/_/____    \__, / / .___/ / __  / /___/ / _  _/ 
\ ______\/____/ /_/     /_/ /_/ /____/ /_/ |_|  v3.0`}
              </pre>
              
              {displayedLines.map((line, index) => (
                <motion.div 
                  key={index}
                  className={`${getLineColor(line.highlight)} flex items-start gap-2`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.1 }}
                >
                  {line.highlight === 'green' && <span className="text-green-400">✓</span>}
                  {line.highlight === 'yellow' && <span className="text-yellow-400">⚡</span>}
                  {line.highlight === 'red' && <span className="text-red-400">✗</span>}
                  <span>{line.text}</span>
                </motion.div>
              ))}
              
              {/* Blinking cursor */}
              {!isComplete && !error && (
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
                    <span className="text-purple-400 font-semibold">Launching {ticker} Dashboard...</span>
                  </div>
                </motion.div>
              )}

              {/* Error message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <AlertCircle size={20} className="text-red-400" />
                    <div>
                      <span className="text-red-400 font-semibold">Analysis Error</span>
                      <p className="text-red-400/70 text-xs mt-1">{error}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Progress section */}
            <div className="px-6 pb-4 space-y-3">
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <motion.div 
                  className={`h-full rounded-full ${error ? 'bg-red-500' : 'bg-gradient-to-r from-purple-600 via-violet-500 to-purple-600'}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-2 text-gray-500">
                    <FileSearch size={12} />
                    <span>Documents: {stats.documents}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500">
                    <Database size={12} />
                    <span>Debate Lines: {stats.debateLines}</span>
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
                  <div className={`w-2 h-2 rounded-full ${error ? 'bg-red-400' : 'bg-green-400'}`} />
                  <span className="text-xs text-gray-400">AI Engine Active</span>
                </motion.div>
                <span className="text-xs text-gray-600">|</span>
                <span className="text-xs text-gray-500">Model: Claude Sonnet 4</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-purple-400 font-mono">${ticker}</span>
              </div>
            </div>
          </div>
        </div>

        <motion.p 
          className="text-center text-xs text-gray-600 mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          {isComplete 
            ? `${ticker} analysis complete! Redirecting...` 
            : `Synthesizing institutional analysis for ${company}...`
          }
        </motion.p>
      </motion.div>
    </motion.div>
  )
}

// Helper function for delays
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}