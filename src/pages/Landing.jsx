import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { 
  Mic, 
  MicOff, 
  Send, 
  Bot,
  Signal,
  Wifi,
  Server,
  Cpu,
  ChevronDown
} from 'lucide-react'

export default function Landing() {
  const navigate = useNavigate()
  const [input, setInput] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const [messages, setMessages] = useState([])
  const [currentTime, setCurrentTime] = useState(new Date())
  const [latency, setLatency] = useState(12)
  
  const inputRef = useRef(null)
  const recognitionRef = useRef(null)
  const messagesEndRef = useRef(null)

  // Live clock and latency simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
      setLatency(Math.floor(Math.random() * 8) + 8)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Initialize Web Speech API
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = true
      recognitionRef.current.lang = 'en-US'

      recognitionRef.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('')
        setInput(transcript)
      }

      recognitionRef.current.onend = () => {
        setIsListening(false)
      }

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error)
        setIsListening(false)
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
    }
  }, [])

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when chat mode starts
  useEffect(() => {
    if (hasStarted && inputRef.current) {
      inputRef.current.focus()
    }
  }, [hasStarted])

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in your browser. Please use Chrome.')
      return
    }

    if (isListening) {
      try {
        recognitionRef.current.stop()
      } catch (error) {
        console.warn('Error stopping recognition:', error)
      }
      setIsListening(false)
    } else {
      try {
        setInput('')
        recognitionRef.current.start()
        setIsListening(true)
      } catch (error) {
        console.warn('Speech recognition error:', error.message)
        setIsListening(false)
      }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!input.trim()) return

    const userMessage = input.trim()
    setInput('')
    
    // Trigger chat mode on first message
    if (!hasStarted) {
      setHasStarted(true)
    }
    
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])

    try {
      // Step 1: intent classification
      let intent = { type: 'chat', response: 'I can chat or analyze stocks; mention a ticker for a deep dive.' }
      try {
        const intentResp = await fetch('/api/chat-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userMessage })
        })
        intent = intentResp.ok ? await intentResp.json() : intent
      } catch (intentError) {
        console.warn('Intent API error, falling back to chat mode', intentError)
      }

      // Step 2: branch
      if (intent.type === 'chat') {
        setMessages(prev => [...prev, { role: 'assistant', content: intent.response || "I'm here. Ask about a company when you're ready." }])
        return
      }

      if (intent.type === 'analyze') {
        const targetTicker = intent.ticker || 'TSLA'
        const targetCompany = intent.company || targetTicker

        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `⚡ Launching analysis for **${targetCompany}** (${targetTicker})...` 
        }])

        // Navigate to Terminal page with ticker and company
        setTimeout(() => {
          navigate(`/terminal?ticker=${targetTicker}&company=${encodeURIComponent(targetCompany)}`)
        }, 500)
        
        return
      }

      setMessages(prev => [...prev, { role: 'assistant', content: "I'm here to chat or analyze—mention a ticker if you want a deep dive." }])
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: "I'm here to chat. Mention a ticker (e.g., $TSLA, NVDA) for institutional analysis." }])
    }
  }

  const exampleQueries = [
    "Analyze $TSLA",
    "Search Alibaba",
    "Deep dive on Apple",
    "JP Morgan"
  ]

  const isMarketOpen = () => {
    const hour = currentTime.getHours()
    const day = currentTime.getDay()
    return day >= 1 && day <= 5 && hour >= 9 && hour < 16
  }

  return (
    <motion.div 
      className="min-h-screen flex flex-col relative overflow-hidden bg-[#0A0A0A]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Scanline overlay */}
      <div className="pointer-events-none fixed inset-0 z-50 opacity-[0.02]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)',
        }}
      />

      {/* Floating particles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(25)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-purple-500/20 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [-20, 20, -20],
              opacity: [0.1, 0.3, 0.1],
            }}
            transition={{
              duration: 4 + Math.random() * 3,
              repeat: Infinity,
              delay: Math.random() * 3,
            }}
          />
        ))}
      </div>

      {/* Top Status Bar */}
      <motion.div 
        className="fixed top-0 left-0 right-0 z-40 border-b border-white/5 bg-black/60 backdrop-blur-xl"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <AnimatePresence>
              {hasStarted && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2 mr-2"
                >
                  <span className="text-lg font-black bg-gradient-to-r from-white to-purple-400 bg-clip-text text-transparent">
                    CYPHER
                  </span>
                  <div className="w-px h-4 bg-white/10" />
                </motion.div>
              )}
            </AnimatePresence>
            
            <div className="flex items-center gap-2">
              <motion.div 
                className="w-2 h-2 rounded-full bg-green-500"
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
              <span className="text-xs font-mono text-green-400 hidden sm:inline">ONLINE</span>
            </div>
            <div className="h-3 w-px bg-white/10 hidden sm:block" />
            <div className="items-center gap-2 hidden sm:flex">
              <Signal size={12} className={isMarketOpen() ? 'text-green-400' : 'text-yellow-400'} />
              <span className="text-xs font-mono text-gray-400">
                {isMarketOpen() ? 'MKT OPEN' : 'MKT CLOSED'}
              </span>
            </div>
            <div className="h-3 w-px bg-white/10 hidden md:block" />
            <div className="items-center gap-2 hidden md:flex">
              <Wifi size={12} className="text-purple-400" />
              <span className="text-xs font-mono text-gray-400">{latency}ms</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-gray-500 hidden sm:inline">
              {currentTime.toLocaleTimeString('en-US', { hour12: false })}
            </span>
            <div className="flex items-center gap-1.5">
              <Server size={12} className="text-purple-400" />
              <span className="text-xs font-mono text-purple-400">v3.0</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col pt-12">
        
        {/* Chat Messages */}
        <AnimatePresence>
          {hasStarted && (
            <motion.div 
              className="flex-1 overflow-y-auto px-4 pt-6 pb-48"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="max-w-3xl mx-auto space-y-4">
                {messages.map((msg, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center mr-3 flex-shrink-0 shadow-lg shadow-purple-500/20">
                        <Bot size={16} className="text-white" />
                      </div>
                    )}
                    <div className={`max-w-[75%] px-4 py-3 rounded-2xl ${
                      msg.role === 'user' 
                        ? 'bg-purple-600/30 border border-purple-500/30 text-white' 
                        : 'bg-white/5 border border-white/10 text-gray-200'
                    }`}>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {msg.content.split('**').map((part, i) => 
                          i % 2 === 1 ? <strong key={i} className="text-purple-300">{part}</strong> : part
                        )}
                      </p>
                    </div>
                  </motion.div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hero/Input Container */}
        <motion.div 
          layout
          className={`w-full px-4 ${
            hasStarted 
              ? 'fixed bottom-0 left-0 right-0 pb-6 pt-4 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A] to-transparent' 
              : 'flex-1 flex flex-col items-center justify-center min-h-screen -mt-12'
          }`}
          transition={{ layout: { duration: 0.6, ease: [0.32, 0.72, 0, 1] } }}
        >
          <div className={`${hasStarted ? 'max-w-3xl' : 'max-w-2xl'} mx-auto w-full space-y-6`}>
            
            {/* Title & Subtitle */}
            <AnimatePresence mode="wait">
              {!hasStarted && (
                <motion.div 
                  className="text-center space-y-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -30, transition: { duration: 0.3 } }}
                  transition={{ duration: 0.6 }}
                >
                  <div className="absolute inset-0 -z-10 flex items-center justify-center pointer-events-none">
                    <motion.div
                      className="w-[600px] h-[600px] bg-purple-600/10 blur-[120px] rounded-full"
                      animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
                      transition={{ duration: 4, repeat: Infinity }}
                    />
                  </div>

                  <h1 className="text-5xl md:text-7xl font-black tracking-tight">
                    <span className="bg-gradient-to-b from-white via-purple-100 to-purple-400 bg-clip-text text-transparent">
                      CYPHER
                    </span>
                  </h1>
                  
                  <p className="text-lg md:text-xl text-gray-400 font-light tracking-wide">
                    Autonomous Institutional Analysis
                  </p>

                  <div className="inline-flex items-center gap-3 px-4 py-2 bg-black/40 backdrop-blur border border-white/10 rounded-full text-xs font-mono">
                    <div className="flex items-center gap-1.5">
                      <motion.div 
                        className="w-1.5 h-1.5 rounded-full bg-green-500"
                        animate={{ scale: [1, 1.3, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      />
                      <span className="text-green-400">LIVE</span>
                    </div>
                    <span className="text-gray-600">•</span>
                    <span className="text-gray-400">6 Data Feeds</span>
                    <span className="text-gray-600">•</span>
                    <div className="flex items-center gap-1">
                      <Cpu size={10} className="text-purple-400" />
                      <span className="text-purple-400">Claude</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input Box */}
            <motion.div 
              layout
              className="relative"
              transition={{ layout: { duration: 0.5, ease: [0.32, 0.72, 0, 1] } }}
            >
              <div className={`absolute -inset-1 bg-gradient-to-r from-purple-600/20 via-violet-600/30 to-purple-600/20 rounded-2xl blur-xl ${hasStarted ? 'opacity-50' : 'opacity-100'}`} />
              
              <form 
                onSubmit={handleSubmit} 
                className="relative bg-black/70 backdrop-blur-2xl border border-purple-500/20 rounded-2xl p-3 shadow-2xl"
              >
                <div className="flex items-center gap-2">
                  <motion.button
                    type="button"
                    onClick={toggleListening}
                    className={`relative p-2.5 rounded-xl transition-all flex-shrink-0 ${
                      isListening 
                        ? 'bg-red-500/20 text-red-400' 
                        : 'bg-white/5 text-gray-400 hover:text-purple-400 hover:bg-white/10'
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                    {isListening && (
                      <motion.div
                        className="absolute inset-0 bg-red-500/20 rounded-xl"
                        animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      />
                    )}
                  </motion.button>

                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={isListening ? "Listening..." : "Ask about any stock or company..."}
                    className="flex-1 bg-transparent border-none px-3 py-2 text-white placeholder-gray-500 outline-none font-mono text-sm"
                    disabled={isListening}
                  />

                  <motion.button
                    type="submit"
                    disabled={!input.trim()}
                    className="p-2.5 bg-gradient-to-r from-purple-600 to-violet-600 rounded-xl text-white disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Send size={18} />
                  </motion.button>
                </div>

                <AnimatePresence>
                  {!hasStarted && (
                    <motion.div 
                      className="flex flex-wrap gap-2 mt-3 px-1"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0, marginTop: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      {exampleQueries.map((query, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setInput(query)}
                          className="text-xs px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-gray-400 hover:text-purple-400 hover:border-purple-500/30 transition-all"
                        >
                          {query}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </form>
            </motion.div>

            {/* Scroll hint */}
            <AnimatePresence>
              {!hasStarted && (
                <motion.div 
                  className="flex flex-col items-center gap-2 pt-8"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <span className="text-xs font-mono text-gray-600 tracking-wider">SCROLL TO EXPLORE</span>
                  <motion.div
                    animate={{ y: [0, 6, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <ChevronDown size={20} className="text-gray-600" />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}