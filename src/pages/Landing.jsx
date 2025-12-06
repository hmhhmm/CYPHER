import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Mic, 
  MicOff, 
  Send, 
  Sparkles, 
  FileSearch,
  Radio,
  Podcast,
  Zap,
  Github,
  Info,
  ChevronRight,
  Bot,
  MessageSquare
} from 'lucide-react'
import { analyzeRequest } from '../utils/analyzeRequest'

export default function Landing() {
  const navigate = useNavigate()
  const [input, setInput] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [messages, setMessages] = useState([
    { 
      role: 'assistant', 
      content: "Hello! I'm your AI Analyst. Ask me about any stock or company, and I'll harvest data, analyze it, and create an audio debate for you." 
    }
  ])
  const inputRef = useRef(null)
  const recognitionRef = useRef(null)
  const messagesEndRef = useRef(null)

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
        // Handle "already started" error gracefully
        console.warn('Speech recognition error:', error.message)
        setIsListening(false)
      }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!input.trim() || isProcessing) return

    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setIsProcessing(true)

    // Add thinking message
    setMessages(prev => [...prev, { role: 'assistant', content: '🔍 Analyzing your request...', isThinking: true }])

    try {
      // Extract ticker from natural language
      const result = await analyzeRequest(userMessage)
      
      // Remove thinking message and add response
      setMessages(prev => {
        const filtered = prev.filter(m => !m.isThinking)
        return [...filtered, { 
          role: 'assistant', 
          content: `Great! I found **${result.company}** (${result.ticker}). Initializing the analysis protocol...` 
        }]
      })

      // Navigate to terminal (loading animation) after a brief delay
      setTimeout(() => {
        navigate(`/terminal?ticker=${result.ticker}&company=${encodeURIComponent(result.company)}`)
      }, 1500)
    } catch (error) {
      setMessages(prev => {
        const filtered = prev.filter(m => !m.isThinking)
        return [...filtered, { 
          role: 'assistant', 
          content: "I couldn't identify a stock ticker from your message. Try something like 'Tell me about Tesla stock' or 'Analyze Apple'." 
        }]
      })
      setIsProcessing(false)
    }
  }

  const exampleQueries = [
    "I wanna know more about Tesla stock",
    "Analyze Apple's latest earnings",
    "What's happening with NVIDIA?",
    "Tell me about Microsoft"
  ]

  return (
    <motion.div 
      className="min-h-screen flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        {/* Floating particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(15)].map((_, i) => (
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

        {/* Logo */}
        <motion.div 
          className="text-center mb-8"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          <div className="relative inline-block">
            <motion.div
              className="absolute inset-0 bg-purple-500/20 blur-3xl rounded-full"
              animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 3, repeat: Infinity }}
            />
            <h1 className="relative text-5xl md:text-7xl font-black tracking-tighter bg-gradient-to-r from-white via-purple-200 to-purple-400 bg-clip-text text-transparent">
              CYPHER
            </h1>
          </div>
          <p className="text-lg text-gray-400 font-light tracking-widest uppercase mt-2">
            The Autonomous Analyst
          </p>
        </motion.div>

        {/* Chat Interface */}
        <motion.div 
          className="w-full max-w-3xl"
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          {/* Chat Container */}
          <div className="relative">
            {/* Glow effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600/20 via-violet-600/30 to-purple-600/20 rounded-3xl blur-xl" />
            
            <div className="relative bg-black/60 backdrop-blur-xl border border-purple-500/20 rounded-3xl overflow-hidden">
              {/* Chat Header */}
              <div className="flex items-center gap-3 px-6 py-4 border-b border-white/10 bg-white/5">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
                    <Bot size={20} className="text-white" />
                  </div>
                  <motion.div 
                    className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-black"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </div>
                <div>
                  <h2 className="font-semibold text-white">AI Analyst</h2>
                  <p className="text-xs text-gray-400">Always online • Ready to analyze</p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <Sparkles size={16} className="text-purple-400" />
                  <span className="text-xs text-purple-400">GPT-4 Powered</span>
                </div>
              </div>

              {/* Messages Area */}
              <div className="h-64 overflow-y-auto p-6 space-y-4 scrollbar-thin">
                <AnimatePresence>
                  {messages.map((msg, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                        msg.role === 'user' 
                          ? 'bg-purple-600/30 border border-purple-500/30 text-white' 
                          : 'bg-white/5 border border-white/10 text-gray-200'
                      } ${msg.isThinking ? 'animate-pulse' : ''}`}>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {msg.content.split('**').map((part, i) => 
                            i % 2 === 1 ? <strong key={i} className="text-purple-300">{part}</strong> : part
                          )}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <form onSubmit={handleSubmit} className="p-4 border-t border-white/10 bg-white/5">
                <div className="relative flex items-center gap-3">
                  {/* Mic Button */}
                  <motion.button
                    type="button"
                    onClick={toggleListening}
                    className={`relative p-3 rounded-xl transition-all ${
                      isListening 
                        ? 'bg-red-500/20 text-red-400' 
                        : 'bg-white/5 text-gray-400 hover:text-purple-400 hover:bg-white/10'
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    disabled={isProcessing}
                  >
                    {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                    {/* Pulsing red glow when recording */}
                    {isListening && (
                      <>
                        <motion.div
                          className="absolute inset-0 bg-red-500/30 rounded-xl"
                          animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                          transition={{ duration: 1, repeat: Infinity }}
                        />
                        <motion.div
                          className="absolute inset-0 bg-red-500/20 rounded-xl"
                          animate={{ scale: [1, 2, 1], opacity: [0.3, 0, 0.3] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        />
                      </>
                    )}
                  </motion.button>

                  {/* Text Input */}
                  <div className="flex-1 relative">
                    <input
                      ref={inputRef}
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={isListening ? "Listening..." : "Ask about any stock or company..."}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all"
                      disabled={isProcessing || isListening}
                    />
                    {isListening && (
                      <motion.div 
                        className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1"
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      >
                        {[...Array(3)].map((_, i) => (
                          <motion.div
                            key={i}
                            className="w-1 h-4 bg-red-400 rounded-full"
                            animate={{ scaleY: [0.5, 1, 0.5] }}
                            transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                          />
                        ))}
                      </motion.div>
                    )}
                  </div>

                  {/* Send Button */}
                  <motion.button
                    type="submit"
                    disabled={!input.trim() || isProcessing}
                    className="p-3 bg-gradient-to-r from-purple-600 to-violet-600 rounded-xl text-white disabled:opacity-30 disabled:cursor-not-allowed"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Send size={20} />
                  </motion.button>
                </div>

                {/* Quick Examples */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {exampleQueries.map((query, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setInput(query)}
                      className="text-xs px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-gray-400 hover:text-purple-400 hover:border-purple-500/30 transition-all"
                      disabled={isProcessing}
                    >
                      {query}
                    </button>
                  ))}
                </div>
              </form>
            </div>
          </div>
        </motion.div>

        {/* How it Works Section */}
        <motion.section 
          className="w-full max-w-4xl mt-16 px-4"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          <h3 className="text-center text-sm font-semibold text-gray-500 tracking-widest uppercase mb-8">
            How it Works
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Step 1: Harvest */}
            <motion.div 
              className="bento-card p-6 text-center"
              whileHover={{ y: -5, borderColor: 'rgba(138, 43, 226, 0.3)' }}
            >
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/10 border border-green-500/20 flex items-center justify-center">
                <FileSearch size={24} className="text-green-400" />
              </div>
              <h4 className="text-lg font-semibold text-white mb-2">1. Harvest</h4>
              <p className="text-sm text-gray-400 leading-relaxed">
                AI agents crawl SEC filings, news articles, and financial reports to gather comprehensive data.
              </p>
            </motion.div>

            {/* Step 2: Analyze */}
            <motion.div 
              className="bento-card p-6 text-center"
              whileHover={{ y: -5, borderColor: 'rgba(138, 43, 226, 0.3)' }}
            >
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-500/20 to-violet-500/10 border border-purple-500/20 flex items-center justify-center">
                <Zap size={24} className="text-purple-400" />
              </div>
              <h4 className="text-lg font-semibold text-white mb-2">2. Analyze</h4>
              <p className="text-sm text-gray-400 leading-relaxed">
                GPT-4 processes the data, extracts key insights, and generates bull & bear perspectives.
              </p>
            </motion.div>

            {/* Step 3: Broadcast */}
            <motion.div 
              className="bento-card p-6 text-center"
              whileHover={{ y: -5, borderColor: 'rgba(138, 43, 226, 0.3)' }}
            >
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/10 border border-orange-500/20 flex items-center justify-center">
                <Podcast size={24} className="text-orange-400" />
              </div>
              <h4 className="text-lg font-semibold text-white mb-2">3. Broadcast</h4>
              <p className="text-sm text-gray-400 leading-relaxed">
                Listen to an AI-generated podcast debate while viewing real-time charts and analysis.
              </p>
            </motion.div>
          </div>
        </motion.section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-6 px-4">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-gray-500">
            <Radio size={14} className="animate-pulse text-purple-400" />
            <span className="text-xs tracking-wider">CYPHER v2.0</span>
          </div>
          
          <div className="flex items-center gap-6">
            <a 
              href="https://github.com/hmhhmm/CYPHER" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-purple-400 transition-colors"
            >
              <Github size={16} />
              Source Code
            </a>
            <button className="flex items-center gap-2 text-sm text-gray-400 hover:text-purple-400 transition-colors">
              <Info size={16} />
              About
            </button>
          </div>
          
          <p className="text-xs text-gray-600">
            Built with AI • Not Financial Advice
          </p>
        </div>
      </footer>
    </motion.div>
  )
}

