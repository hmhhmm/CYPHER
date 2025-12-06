import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Activity, Cpu, Database, FileSearch, Wifi, Zap, AlertCircle } from 'lucide-react'
import { generateDebate, harvestPDF, searchPDF } from '../utils/api'

// Pipeline steps configuration
const PIPELINE_STEPS = [
  { id: 'init', text: '> Initializing Cypher Protocol...', highlight: null },
  { id: 'connect', text: '> Establishing secure connection...', highlight: null },
  { id: 'target', text: '> Target Acquired: ${ticker} (${company})', highlight: 'cyan' },
  { id: 'search', text: '> Searching SEC.gov for 10-K filings...', highlight: null },
  { id: 'search_done', text: '> [SUCCESS] Found SEC filing', highlight: 'green' },
  { id: 'download', text: '> Downloading and parsing PDF...', highlight: null },
  { id: 'extract', text: '> Extracting financial metrics with AI...', highlight: null },
  { id: 'harvest_done', text: '> [SUCCESS] Harvested MD&A, Risk Factors, Financials', highlight: 'green' },
  { id: 'debate', text: '> Generating Bull thesis...', highlight: null },
  { id: 'debate2', text: '> Generating Bear thesis...', highlight: null },
  { id: 'debate_done', text: '> [SUCCESS] AI debate script ready', highlight: 'green' },
  { id: 'complete', text: '> [COMPLETE] All systems ready', highlight: 'green' },
  { id: 'launch', text: '> LAUNCHING DASHBOARD...', highlight: 'purple' },
]

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
  const [pipelineData, setPipelineData] = useState({
    harvestedData: null,
    debateScript: null,
    pdfUrl: null,
  })
  
  const terminalRef = useRef(null)
  const pipelineStarted = useRef(false)

  // Add a line to the terminal with typewriter effect
  const addLine = useCallback((text, highlight = null) => {
    // Replace placeholders
    const processedText = text
      .replace('${ticker}', `$${ticker}`)
      .replace('${company}', company)
    
    setDisplayedLines(prev => [...prev, { text: processedText, highlight }])
  }, [ticker, company])

  // Run the real pipeline
  const runPipeline = useCallback(async () => {
    if (pipelineStarted.current) return
    pipelineStarted.current = true

    try {
      // Step 1: Initialize
      addLine(PIPELINE_STEPS[0].text)
      await delay(500)
      
      // Step 2: Connect
      addLine(PIPELINE_STEPS[1].text)
      await delay(400)
      
      // Step 3: Target acquired
      addLine(PIPELINE_STEPS[2].text, 'cyan')
      await delay(300)
      setCurrentStep(3)

      // Step 4: Search for PDF
      addLine(PIPELINE_STEPS[3].text)
      let pdfUrl = null
      
      try {
        const searchResult = await searchPDF(ticker, year)
        if (searchResult.results && searchResult.results.length > 0) {
          pdfUrl = searchResult.results[0].url
          addLine(`> [SUCCESS] Found: ${ticker.toLowerCase()}-10k-${year}.pdf`, 'green')
        } else {
          // Use sample data fallback
          addLine(`> [INFO] Using sample data for ${ticker}`, 'yellow')
        }
      } catch (err) {
        addLine(`> [INFO] Using sample data for ${ticker}`, 'yellow')
      }
      setCurrentStep(5)
      await delay(300)

      // Step 5-6: Harvest PDF data
      addLine(PIPELINE_STEPS[5].text)
      await delay(400)
      addLine(PIPELINE_STEPS[6].text)
      
      let harvestedData = null
      try {
        if (pdfUrl) {
          harvestedData = await harvestPDF(pdfUrl, ticker, company)
        } else {
          // Use sample data
          harvestedData = await getSampleHarvestedData(ticker, company)
        }
        addLine(PIPELINE_STEPS[7].text, 'green')
        setPipelineData(prev => ({ ...prev, harvestedData, pdfUrl }))
      } catch (err) {
        console.error('Harvest error:', err)
        harvestedData = await getSampleHarvestedData(ticker, company)
        addLine(`> [FALLBACK] Using cached financial data`, 'yellow')
        setPipelineData(prev => ({ ...prev, harvestedData }))
      }
      setCurrentStep(8)
      await delay(300)

      // Step 7-8: Generate debate
      addLine(PIPELINE_STEPS[8].text)
      await delay(500)
      addLine(PIPELINE_STEPS[9].text)
      await delay(500)
      
      let debateResult = null
      try {
        debateResult = await generateDebate(harvestedData)
        addLine(PIPELINE_STEPS[10].text, 'green')
        setPipelineData(prev => ({ ...prev, debateScript: debateResult.script }))
      } catch (err) {
        console.error('Debate generation error:', err)
        // Use fallback transcript
        debateResult = { script: getFallbackDebateScript(ticker) }
        addLine(`> [FALLBACK] Using pre-generated debate`, 'yellow')
        setPipelineData(prev => ({ ...prev, debateScript: debateResult.script }))
      }
      setCurrentStep(11)
      await delay(300)

      // Step 9: Complete
      addLine(PIPELINE_STEPS[11].text, 'green')
      await delay(500)
      addLine(PIPELINE_STEPS[12].text, 'purple')
      setCurrentStep(13)
      setIsComplete(true)

      // Store data in sessionStorage for Dashboard
      sessionStorage.setItem('cypher_analysis', JSON.stringify({
        ticker,
        company,
        year,
        harvestedData,
        debateScript: debateResult.script,
        pdfUrl,
        timestamp: Date.now(),
      }))

      // Navigate to dashboard
      await delay(800)
      navigate(`/dashboard?ticker=${ticker}&company=${encodeURIComponent(company)}`)

    } catch (err) {
      console.error('Pipeline error:', err)
      setError(err.message)
      addLine(`> [ERROR] ${err.message}`, 'red')
      addLine(`> Retrying with fallback data...`, 'yellow')
      
      // Try to continue with fallback
      setTimeout(() => {
        sessionStorage.setItem('cypher_analysis', JSON.stringify({
          ticker,
          company,
          year,
          harvestedData: null,
          debateScript: null,
          pdfUrl: null,
          timestamp: Date.now(),
          useFallback: true,
        }))
        navigate(`/dashboard?ticker=${ticker}&company=${encodeURIComponent(company)}`)
      }, 2000)
    }
  }, [ticker, company, year, addLine, navigate])

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

  const progress = (currentStep / PIPELINE_STEPS.length) * 100

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
                    {isComplete ? 'COMPLETE' : 'PROCESSING'}
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
  / ____/ / / / / / __ \\  / / / / / __/ / __ \\
 / /     / /_/ / / /_/ / / /_/ / / _/  / /_/ /
/_/      \\__, / / .___/ / __  / /___/ / _  _/ 
        /____/ /_/     /_/ /_/ /____/ /_/ |_|  v2.1`}
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
                    <span className="text-purple-400 font-semibold">Launching Dashboard...</span>
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
                    <span className="text-red-400 font-semibold">Error occurred, using fallback...</span>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Progress section */}
            <div className="px-6 pb-4 space-y-3">
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-gradient-to-r from-purple-600 via-violet-500 to-purple-600 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-2 text-gray-500">
                    <FileSearch size={12} />
                    <span>Sources: {pipelineData.harvestedData ? '1' : '0'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500">
                    <Database size={12} />
                    <span>Debate Lines: {pipelineData.debateScript?.length || 0}</span>
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
                <span className="text-xs text-gray-500">Model: Claude 3.5</span>
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
          {isComplete ? 'Analysis complete! Redirecting...' : 'Synthesizing institutional analysis and generating insights...'}
        </motion.p>
      </motion.div>
    </motion.div>
  )
}

// Helper function for delays
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Sample data fallback
async function getSampleHarvestedData(ticker, company) {
  return {
    meta: {
      ticker: ticker.toUpperCase(),
      company: company,
      report_type: '10-K',
      period: new Date().getFullYear().toString(),
      source_url: 'https://www.sec.gov',
    },
    content: {
      management_discussion: `${company} delivered strong performance this fiscal year with revenue growth driven by core business segments. Management remains optimistic about future growth prospects and continues to invest in innovation, market expansion, and operational efficiency. Key highlights include improved margins, successful product launches, and strategic partnerships that position the company well for long-term growth.`,
      risk_factors: `Key risks include: 1) Intense competition in core markets that could pressure margins. 2) Regulatory and compliance challenges across different jurisdictions. 3) Macroeconomic conditions including inflation and interest rates. 4) Supply chain dependencies and potential disruptions. 5) Technology changes that could disrupt current business models. 6) Key personnel retention and talent acquisition challenges.`,
      key_financials: `Revenue: Growing year-over-year with strong momentum. Operating Margins: Stable with improvement initiatives underway. Cash Position: Strong balance sheet with adequate liquidity. Debt Levels: Manageable with favorable terms. Free Cash Flow: Positive and supporting shareholder returns.`,
    },
  }
}

// Fallback debate script
function getFallbackDebateScript(ticker) {
  return [
    { id: 1, speaker: 'bull', text: `So ${ticker} right? Been looking at the numbers. Actually pretty solid if you ask me.`, start: 0, end: 7, duration_estimate: 7 },
    { id: 2, speaker: 'bear', text: `I don't know. Competition's getting crazy and the economy's... you know. It's rough out there.`, start: 7, end: 15, duration_estimate: 8 },
    { id: 3, speaker: 'bull', text: `Yeah but the team running this? They know what they're doing. You can tell. They're actually executing.`, start: 15, end: 23, duration_estimate: 8 },
    { id: 4, speaker: 'bear', text: `Maybe. But the price though? Seems expensive to me. How much higher can it really go?`, start: 23, end: 31, duration_estimate: 8 },
    { id: 5, speaker: 'bull', text: `Think long term. Five years out? This price is gonna look cheap. Trust me on this one.`, start: 31, end: 39, duration_estimate: 8 },
    { id: 6, speaker: 'bear', text: `We'll see. I'm waiting for a dip. No rush. Better safe than sorry, right?`, start: 39, end: 46, duration_estimate: 7 },
  ]
}
