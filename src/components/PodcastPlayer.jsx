import { useState, useRef, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX,
  Radio,
  Mic,
  Activity,
  Users,
  FileText,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Loader2
} from 'lucide-react'

const API_BASE = 'http://localhost:3001'

// Cache for audio blobs
const audioCache = new Map()

// Generate speech using ElevenLabs via backend
const generateSpeech = async (text, speaker) => {
  const cacheKey = `${speaker}:${text.substring(0, 50)}`
  
  if (audioCache.has(cacheKey)) {
    return audioCache.get(cacheKey)
  }

  try {
    const response = await fetch(`${API_BASE}/api/audio/synthesize-line`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, speaker })
    })

    if (!response.ok) {
      throw new Error('Failed to generate audio')
    }

    const audioBlob = await response.blob()
    const audioUrl = URL.createObjectURL(audioBlob)
    audioCache.set(cacheKey, audioUrl)
    return audioUrl
  } catch (error) {
    console.error('ElevenLabs error:', error)
    throw error
  }
}

// Browser speech synthesis fallback
const speakWithBrowser = (text, speaker, options = {}) => {
  return new Promise((resolve, reject) => {
    if (!window.speechSynthesis) {
      reject(new Error('Speech synthesis not supported'))
      return
    }

    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    const voices = window.speechSynthesis.getVoices()
    
    if (speaker === 'bull') {
      const maleVoice = voices.find(v => 
        v.name.includes('Google UK English Male') ||
        v.name.includes('Daniel') ||
        v.name.includes('Male')
      ) || voices.find(v => v.lang.startsWith('en'))
      if (maleVoice) utterance.voice = maleVoice
      utterance.pitch = 0.9
      utterance.rate = 1.0
    } else {
      const femaleVoice = voices.find(v => 
        v.name.includes('Google UK English Female') ||
        v.name.includes('Samantha') ||
        v.name.includes('Female')
      ) || voices.find(v => v.lang.startsWith('en'))
      if (femaleVoice) utterance.voice = femaleVoice
      utterance.pitch = 1.2
      utterance.rate = 0.95
    }

    utterance.volume = options.muted ? 0 : (options.volume || 0.8)
    utterance.onend = () => resolve()
    utterance.onerror = (e) => reject(e)
    window.speechSynthesis.speak(utterance)
  })
}

export default function PodcastPlayer({ ticker, transcript, analysisReport, keyInsights = [], broadcastAudioUrl }) {
  const [activeCard, setActiveCard] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [volume, setVolume] = useState(0.8)
  const [isMuted, setIsMuted] = useState(false)
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0)
  const [isSpeaking, setIsSpeaking] = useState(false)
  
  // Broadcast audio state
  const [broadcastPlaying, setBroadcastPlaying] = useState(false)
  const [broadcastTime, setBroadcastTime] = useState(0)
  const [broadcastDuration, setBroadcastDuration] = useState(0)
  const broadcastAudioRef = useRef(null)
  
  const transcriptRef = useRef(null)
  const progressRef = useRef(null)
  const playbackRef = useRef({ shouldStop: false })
  const timeIntervalRef = useRef(null)
  const audioRef = useRef(null)

  const totalDuration = transcript.length > 0 
    ? transcript[transcript.length - 1].end 
    : 60

  // Load voices on mount
  useEffect(() => {
    const loadVoices = () => {
      window.speechSynthesis?.getVoices()
    }
    loadVoices()
    window.speechSynthesis?.addEventListener('voiceschanged', loadVoices)
    return () => {
      window.speechSynthesis?.removeEventListener('voiceschanged', loadVoices)
      window.speechSynthesis?.cancel()
    }
  }, [])

  // Initialize broadcast audio
  useEffect(() => {
    if (broadcastAudioUrl && !broadcastAudioRef.current) {
      const audio = new Audio(broadcastAudioUrl)
      broadcastAudioRef.current = audio
      
      audio.onloadedmetadata = () => setBroadcastDuration(audio.duration)
      audio.ontimeupdate = () => setBroadcastTime(audio.currentTime)
      audio.onended = () => {
        setBroadcastPlaying(false)
        setBroadcastTime(0)
      }
    }
    
    return () => {
      if (broadcastAudioRef.current) {
        broadcastAudioRef.current.pause()
        broadcastAudioRef.current = null
      }
    }
  }, [broadcastAudioUrl])

  // Debate playback
  const playTranscript = useCallback(async (startIndex = 0) => {
    playbackRef.current.shouldStop = false
    setIsSpeaking(true)

    for (let i = startIndex; i < transcript.length; i++) {
      if (playbackRef.current.shouldStop) break
      
      const segment = transcript[i]
      setCurrentSegmentIndex(i)
      setCurrentTime(segment.start)

      const startTime = Date.now()
      timeIntervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000
        setCurrentTime(segment.start + elapsed)
      }, 100)

      try {
        const audioUrl = await generateSpeech(segment.text, segment.speaker)
        if (playbackRef.current.shouldStop) break
        
        await new Promise((resolve, reject) => {
          const audio = new Audio(audioUrl)
          audioRef.current = audio
          audio.volume = isMuted ? 0 : volume
          audio.onended = () => resolve()
          audio.onerror = () => reject(new Error('Audio playback failed'))
          audio.play().catch(reject)
        })
      } catch (err) {
        if (playbackRef.current.shouldStop) break
        try {
          await speakWithBrowser(segment.text, segment.speaker, { volume, muted: isMuted })
        } catch {
          await new Promise(resolve => setTimeout(resolve, (segment.end - segment.start) * 1000))
        }
      }

      clearInterval(timeIntervalRef.current)
      if (i < transcript.length - 1 && !playbackRef.current.shouldStop) {
        await new Promise(resolve => setTimeout(resolve, 400))
      }
    }

    if (!playbackRef.current.shouldStop) {
      setCurrentTime(0)
      setCurrentSegmentIndex(0)
      setIsPlaying(false)
    }
    setIsSpeaking(false)
  }, [transcript, volume, isMuted])

  const stopPlayback = useCallback(() => {
    playbackRef.current.shouldStop = true
    window.speechSynthesis?.cancel()
    clearInterval(timeIntervalRef.current)
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setIsSpeaking(false)
  }, [])

  useEffect(() => {
    if (transcriptRef.current) {
      const activeElement = transcriptRef.current.querySelector('.active-segment')
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [currentSegmentIndex])

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      stopPlayback()
      setIsPlaying(false)
    } else {
      setIsPlaying(true)
      playTranscript(currentSegmentIndex)
    }
  }, [isPlaying, currentSegmentIndex, playTranscript, stopPlayback])

  const toggleBroadcastPlay = () => {
    if (!broadcastAudioRef.current) return
    if (broadcastPlaying) {
      broadcastAudioRef.current.pause()
    } else {
      broadcastAudioRef.current.play()
    }
    setBroadcastPlaying(!broadcastPlaying)
  }

  const handleBroadcastSeek = (e) => {
    if (!broadcastAudioRef.current || !broadcastDuration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = x / rect.width
    const seekTime = percentage * broadcastDuration
    broadcastAudioRef.current.currentTime = seekTime
    setBroadcastTime(seekTime)
  }

  const handleProgressClick = (e) => {
    if (progressRef.current && transcript.length > 0) {
      const rect = progressRef.current.getBoundingClientRect()
      const clickX = e.clientX - rect.left
      const percentage = clickX / rect.width
      const targetTime = percentage * totalDuration
      
      const segmentIndex = transcript.findIndex((seg, idx) => {
        const nextSeg = transcript[idx + 1]
        return targetTime >= seg.start && (nextSeg ? targetTime < nextSeg.start : true)
      })
      
      if (segmentIndex !== -1) {
        stopPlayback()
        setCurrentSegmentIndex(segmentIndex)
        setCurrentTime(targetTime)
        if (isPlaying) {
          setTimeout(() => playTranscript(segmentIndex), 100)
        }
      }
    }
  }

  const skipBack = () => {
    const prevIndex = Math.max(0, currentSegmentIndex - 1)
    stopPlayback()
    setCurrentSegmentIndex(prevIndex)
    setCurrentTime(transcript[prevIndex]?.start || 0)
    if (isPlaying) setTimeout(() => playTranscript(prevIndex), 100)
  }

  const skipForward = () => {
    const nextIndex = Math.min(transcript.length - 1, currentSegmentIndex + 1)
    stopPlayback()
    setCurrentSegmentIndex(nextIndex)
    setCurrentTime(transcript[nextIndex]?.start || 0)
    if (isPlaying) setTimeout(() => playTranscript(nextIndex), 100)
  }

  useEffect(() => {
    return () => stopPlayback()
  }, [stopPlayback])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const currentSpeaker = transcript[currentSegmentIndex]?.speaker || 'bull'
  const isActivelySpeaking = isPlaying && isSpeaking
  const hasTranscript = transcript && transcript.length > 0
  const hasBroadcast = !!broadcastAudioUrl

  // Card selection view
  if (!activeCard) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Radio size={18} className="text-purple-400" />
            <h2 className="font-semibold text-white">Audio Hub</h2>
          </div>
          <span className="text-xs text-gray-500">{ticker}</span>
        </div>

        <div className="flex-1 p-4 grid grid-cols-1 gap-3 auto-rows-fr overflow-y-auto">
          {/* Card 1: Daily Broadcast */}
          <motion.div
            onClick={() => setActiveCard('broadcast')}
            className="relative overflow-hidden rounded-xl cursor-pointer group border border-white/10 hover:border-purple-500/30 transition-all bg-white/[0.02]"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <div className="relative p-4 h-full flex flex-col min-h-[140px]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20">
                    <FileText size={14} className="text-purple-400" />
                  </div>
                  <span className="text-xs font-medium text-gray-400">Analysis Brief</span>
                </div>
                {hasBroadcast && (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/10">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                    <span className="text-xs text-green-400">Ready</span>
                  </div>
                )}
              </div>
              
              <h3 className="text-sm font-semibold text-white mb-2">The Daily Broadcast</h3>
              
              {/* Preview content */}
              <p className="text-xs text-gray-500 line-clamp-2 flex-1">
                {analysisReport?.report?.summary 
                  ? analysisReport.report.summary.substring(0, 120) + '...'
                  : 'AI-narrated summary of the investment analysis with key insights and recommendations.'}
              </p>
              
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  {hasBroadcast ? (
                    <span>~3 min audio</span>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <Loader2 size={10} className="animate-spin" />
                      <span>Generating audio...</span>
                    </div>
                  )}
                </div>
                <ChevronRight size={14} className="text-gray-500 group-hover:text-purple-400 transition-colors" />
              </div>
            </div>
          </motion.div>

          {/* Card 2: Bull vs Bear Debate */}
          <motion.div
            onClick={() => setActiveCard('debate')}
            className="relative overflow-hidden rounded-xl cursor-pointer group border border-white/10 hover:border-purple-500/30 transition-all bg-white/[0.02]"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <div className="relative p-4 h-full flex flex-col min-h-[140px]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20">
                    <Users size={14} className="text-purple-400" />
                  </div>
                  <span className="text-xs font-medium text-gray-400">Investment Debate</span>
                </div>
                {hasTranscript && (
                  <span className="text-xs text-gray-500">{formatTime(totalDuration)}</span>
                )}
              </div>
              
              <h3 className="text-sm font-semibold text-white mb-2">Bull vs Bear</h3>
              
              {/* Preview content */}
              <div className="flex-1 space-y-1.5">
                {hasTranscript ? (
                  <>
                    <div className="flex items-start gap-2 text-xs">
                      <TrendingUp size={10} className="text-green-400/70 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-500 line-clamp-1">
                        {transcript.find(t => t.speaker === 'bull')?.text?.substring(0, 60) || 'Bullish perspective on growth...'}...
                      </span>
                    </div>
                    <div className="flex items-start gap-2 text-xs">
                      <TrendingDown size={10} className="text-red-400/70 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-500 line-clamp-1">
                        {transcript.find(t => t.speaker === 'bear')?.text?.substring(0, 60) || 'Risk considerations and concerns...'}...
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-gray-500">
                    AI-powered debate between bullish and bearish perspectives on the investment.
                  </p>
                )}
              </div>
              
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <TrendingUp size={10} className="text-green-400/60" />
                    <span>Bull</span>
                  </div>
                  <span className="text-gray-600">vs</span>
                  <div className="flex items-center gap-1">
                    <TrendingDown size={10} className="text-red-400/60" />
                    <span>Bear</span>
                  </div>
                </div>
                <ChevronRight size={14} className="text-gray-500 group-hover:text-purple-400 transition-colors" />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    )
  }

  // Broadcast view
  if (activeCard === 'broadcast') {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <motion.button
              onClick={() => setActiveCard(null)}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ChevronRight size={16} className="rotate-180" />
            </motion.button>
            <h2 className="font-semibold text-white">The Daily Broadcast</h2>
          </div>
        </div>

        {/* Report Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {analysisReport?.report ? (
            <>
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                <h3 className="text-xs font-medium text-purple-400 mb-2">Executive Summary</h3>
                <p className="text-sm text-gray-300 leading-relaxed">
                  {analysisReport.report.summary || 'No summary available.'}
                </p>
              </div>

              {analysisReport.report.keyStrengths?.length > 0 && (
                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                  <h3 className="text-xs font-medium text-green-400/80 mb-2">Key Strengths</h3>
                  <ul className="space-y-1.5">
                    {analysisReport.report.keyStrengths.slice(0, 3).map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-400">
                        <TrendingUp size={12} className="text-green-400/60 mt-1 flex-shrink-0" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {analysisReport.report.keyRisks?.length > 0 && (
                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                  <h3 className="text-xs font-medium text-red-400/80 mb-2">Key Risks</h3>
                  <ul className="space-y-1.5">
                    {analysisReport.report.keyRisks.slice(0, 3).map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-400">
                        <TrendingDown size={12} className="text-red-400/60 mt-1 flex-shrink-0" />
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {analysisReport.report.recommendation && (
                <div className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/10">
                  <h3 className="text-xs font-medium text-purple-400 mb-2">Recommendation</h3>
                  <p className="text-sm text-gray-300 leading-relaxed">
                    {analysisReport.report.recommendation}
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <FileText size={24} className="text-gray-600 mb-3" />
              <p className="text-gray-500 text-sm">No report available</p>
            </div>
          )}
        </div>

        {/* Audio Player at Bottom */}
        {hasBroadcast && (
          <div className="px-4 py-4 border-t border-white/10 bg-white/[0.02]">
            <div 
              className="relative h-1 bg-white/10 rounded-full mb-3 cursor-pointer"
              onClick={handleBroadcastSeek}
            >
              <div 
                className="absolute left-0 top-0 h-full bg-purple-500 rounded-full"
                style={{ width: `${broadcastDuration ? (broadcastTime / broadcastDuration) * 100 : 0}%` }}
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 font-mono w-16">
                {formatTime(broadcastTime)}
              </span>
              
              <motion.button
                onClick={toggleBroadcastPlay}
                className="w-10 h-10 flex items-center justify-center bg-purple-600 hover:bg-purple-500 rounded-full transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {broadcastPlaying ? (
                  <Pause size={18} className="text-white" />
                ) : (
                  <Play size={18} className="text-white ml-0.5" />
                )}
              </motion.button>

              <span className="text-xs text-gray-500 font-mono w-16 text-right">
                {formatTime(broadcastDuration)}
              </span>
            </div>
          </div>
        )}

        {!hasBroadcast && (
          <div className="px-4 py-4 border-t border-white/10 bg-white/[0.02]">
            <div className="flex items-center justify-center gap-2 text-gray-500">
              <Loader2 size={14} className="animate-spin" />
              <span className="text-sm">Generating audio...</span>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Debate view
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <motion.button
            onClick={() => {
              stopPlayback()
              setActiveCard(null)
            }}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <ChevronRight size={16} className="rotate-180" />
          </motion.button>
          <h2 className="font-semibold text-white">Bull vs Bear Debate</h2>
        </div>
        <div className={`flex items-center gap-2 px-2 py-1 rounded-full text-xs ${
          isActivelySpeaking ? 'bg-green-500/10 text-green-400' : 'bg-white/5 text-gray-400'
        }`}>
          <Activity size={10} />
          {isActivelySpeaking ? 'Speaking' : 'Ready'}
        </div>
      </div>

      {/* Speaker Indicators */}
      <div className="px-6 py-4 border-b border-white/10 bg-white/[0.01]">
        <div className="flex justify-center items-center gap-8">
          <div className="text-center">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all ${
              currentSpeaker === 'bull' && isActivelySpeaking
                ? 'bg-green-500/20 border-green-500/50'
                : 'bg-white/5 border-white/10'
            }`}>
              <TrendingUp size={20} className={currentSpeaker === 'bull' && isActivelySpeaking ? 'text-green-400' : 'text-gray-500'} />
            </div>
            <p className={`mt-1.5 text-xs font-medium ${currentSpeaker === 'bull' && isActivelySpeaking ? 'text-green-400' : 'text-gray-500'}`}>
              Bull
            </p>
          </div>

          <span className="text-lg font-bold text-gray-600">vs</span>

          <div className="text-center">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all ${
              currentSpeaker === 'bear' && isActivelySpeaking
                ? 'bg-red-500/20 border-red-500/50'
                : 'bg-white/5 border-white/10'
            }`}>
              <TrendingDown size={20} className={currentSpeaker === 'bear' && isActivelySpeaking ? 'text-red-400' : 'text-gray-500'} />
            </div>
            <p className={`mt-1.5 text-xs font-medium ${currentSpeaker === 'bear' && isActivelySpeaking ? 'text-red-400' : 'text-gray-500'}`}>
              Bear
            </p>
          </div>
        </div>
      </div>

      {/* Transcript */}
      <div ref={transcriptRef} className="flex-1 overflow-y-auto p-3 space-y-2">
        {!hasTranscript && (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <Mic size={24} className="text-gray-600 mb-3" />
            <p className="text-gray-500 text-sm">No debate available</p>
          </div>
        )}
        
        {transcript.map((segment, index) => (
          <motion.div
            key={segment.id}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.02 }}
            className={`p-3 rounded-lg transition-all cursor-pointer ${
              index === currentSegmentIndex 
                ? 'bg-purple-500/10 border border-purple-500/30 active-segment' 
                : 'bg-white/[0.02] border border-transparent hover:bg-white/[0.04]'
            }`}
            onClick={() => {
              stopPlayback()
              setCurrentSegmentIndex(index)
              setCurrentTime(segment.start)
              if (isPlaying) setTimeout(() => playTranscript(index), 100)
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-medium ${
                segment.speaker === 'bull' ? 'text-green-400/80' : 'text-red-400/80'
              }`}>
                {segment.speaker === 'bull' ? 'Bull' : 'Bear'}
              </span>
              <span className="text-xs text-gray-600 font-mono">
                {formatTime(segment.start)}
              </span>
            </div>
            <p className={`text-sm leading-relaxed ${
              index === currentSegmentIndex ? 'text-white' : 'text-gray-400'
            }`}>
              {segment.text}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Audio Controls */}
      <div className="px-4 py-4 border-t border-white/10 bg-white/[0.02]">
        <div 
          ref={progressRef}
          className="relative h-1 bg-white/10 rounded-full mb-3 cursor-pointer"
          onClick={handleProgressClick}
        >
          <div 
            className="absolute left-0 top-0 h-full bg-purple-500 rounded-full"
            style={{ width: `${(currentTime / totalDuration) * 100}%` }}
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 font-mono w-12">
            {formatTime(currentTime)}
          </span>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsMuted(!isMuted)}
              className="p-2 text-gray-500 hover:text-white transition-colors"
            >
              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>

            <motion.button 
              onClick={skipBack}
              className="p-2 text-gray-500 hover:text-white transition-colors"
              whileTap={{ scale: 0.9 }}
            >
              <SkipBack size={16} />
            </motion.button>

            <motion.button
              onClick={togglePlay}
              disabled={!hasTranscript}
              className="w-10 h-10 flex items-center justify-center bg-purple-600 hover:bg-purple-500 rounded-full transition-colors disabled:opacity-50"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isPlaying ? (
                <Pause size={18} className="text-white" />
              ) : (
                <Play size={18} className="text-white ml-0.5" />
              )}
            </motion.button>

            <motion.button 
              onClick={skipForward}
              className="p-2 text-gray-500 hover:text-white transition-colors"
              whileTap={{ scale: 0.9 }}
            >
              <SkipForward size={16} />
            </motion.button>
          </div>

          <span className="text-xs text-gray-500 font-mono w-12 text-right">
            {formatTime(totalDuration)}
          </span>
        </div>
      </div>
    </div>
  )
}
