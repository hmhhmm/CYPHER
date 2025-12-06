import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX,
  Radio,
  Mic,
  Activity
} from 'lucide-react'

const API_BASE = 'http://localhost:3001'

// Cache for audio blobs to avoid re-generating
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

// Fallback: Browser's built-in speech synthesis
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
      // Male voice for Bull
      const maleVoice = voices.find(v => 
        v.name.includes('Google UK English Male') ||
        v.name.includes('Daniel') ||
        v.name.includes('David') ||
        v.name.includes('James') ||
        v.name.includes('Male')
      ) || voices.find(v => v.lang.startsWith('en'))
      
      if (maleVoice) utterance.voice = maleVoice
      utterance.pitch = 0.9
      utterance.rate = 1.0
    } else {
      // Female voice for Bear
      const femaleVoice = voices.find(v => 
        v.name.includes('Google UK English Female') ||
        v.name.includes('Samantha') ||
        v.name.includes('Victoria') ||
        v.name.includes('Karen') ||
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

export default function PodcastPlayer({ ticker, transcript }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [volume, setVolume] = useState(0.8)
  const [isMuted, setIsMuted] = useState(false)
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [voicesLoaded, setVoicesLoaded] = useState(false)
  
  const transcriptRef = useRef(null)
  const progressRef = useRef(null)
  const playbackRef = useRef({ shouldStop: false })
  const timeIntervalRef = useRef(null)
  const audioRef = useRef(null)

  // Total duration from transcript
  const totalDuration = transcript.length > 0 
    ? transcript[transcript.length - 1].end 
    : 60

  // Load voices on mount
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis?.getVoices()
      if (voices && voices.length > 0) {
        setVoicesLoaded(true)
      }
    }
    
    loadVoices()
    window.speechSynthesis?.addEventListener('voiceschanged', loadVoices)
    
    return () => {
      window.speechSynthesis?.removeEventListener('voiceschanged', loadVoices)
      window.speechSynthesis?.cancel()
    }
  }, [])

  // Play through the transcript
  const playTranscript = useCallback(async (startIndex = 0) => {
    playbackRef.current.shouldStop = false
    setIsSpeaking(true)

    for (let i = startIndex; i < transcript.length; i++) {
      if (playbackRef.current.shouldStop) break
      
      const segment = transcript[i]
      setCurrentSegmentIndex(i)
      setCurrentTime(segment.start)

      // Start time progression for this segment
      const startTime = Date.now()
      
      timeIntervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000
        setCurrentTime(segment.start + elapsed)
      }, 100)

      try {
        // Try ElevenLabs first for high-quality AI voices
        const audioUrl = await generateSpeech(segment.text, segment.speaker)
        
        if (playbackRef.current.shouldStop) break
        
        // Play the audio
        await new Promise((resolve, reject) => {
          const audio = new Audio(audioUrl)
          audioRef.current = audio
          audio.volume = isMuted ? 0 : volume
          
          audio.onended = () => resolve()
          audio.onerror = () => reject(new Error('Audio playback failed'))
          
          audio.play().catch(reject)
        })
        
      } catch (err) {
        console.warn('ElevenLabs failed, using browser speech:', err.message)
        
        if (playbackRef.current.shouldStop) break
        
        // Fallback to browser speech synthesis
        try {
          await speakWithBrowser(segment.text, segment.speaker, { volume, muted: isMuted })
        } catch (browserErr) {
          console.warn('Browser speech also failed:', browserErr)
          // Wait estimated duration if all fails
          await new Promise(resolve => setTimeout(resolve, (segment.end - segment.start) * 1000))
        }
      }

      clearInterval(timeIntervalRef.current)
      
      // Small pause between speakers
      if (i < transcript.length - 1 && !playbackRef.current.shouldStop) {
        await new Promise(resolve => setTimeout(resolve, 400))
      }
    }

    // Finished
    if (!playbackRef.current.shouldStop) {
      setCurrentTime(0)
      setCurrentSegmentIndex(0)
      setIsPlaying(false)
    }
    setIsSpeaking(false)
  }, [transcript, volume, isMuted])

  // Stop playback
  const stopPlayback = useCallback(() => {
    playbackRef.current.shouldStop = true
    window.speechSynthesis?.cancel()
    clearInterval(timeIntervalRef.current)
    
    // Stop any playing audio
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      audioRef.current = null
    }
    
    setIsSpeaking(false)
  }, [])

  // Auto-scroll transcript
  useEffect(() => {
    if (transcriptRef.current) {
      const activeElement = transcriptRef.current.querySelector('.active-segment')
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [currentSegmentIndex])

  // Handle play/pause toggle
  const togglePlay = useCallback(() => {
    if (isPlaying) {
      stopPlayback()
      setIsPlaying(false)
    } else {
      setIsPlaying(true)
      playTranscript(currentSegmentIndex)
    }
  }, [isPlaying, currentSegmentIndex, playTranscript, stopPlayback])
  
  const toggleMute = () => {
    setIsMuted(!isMuted)
    // If currently speaking, this will affect the next utterance
  }

  const handleProgressClick = (e) => {
    if (progressRef.current && transcript.length > 0) {
      const rect = progressRef.current.getBoundingClientRect()
      const clickX = e.clientX - rect.left
      const percentage = clickX / rect.width
      const targetTime = percentage * totalDuration
      
      // Find the segment at this time
      const segmentIndex = transcript.findIndex((seg, idx) => {
        const nextSeg = transcript[idx + 1]
        return targetTime >= seg.start && (nextSeg ? targetTime < nextSeg.start : true)
      })
      
      if (segmentIndex !== -1) {
        // Stop current playback and start from new segment
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
    
    if (isPlaying) {
      setTimeout(() => playTranscript(prevIndex), 100)
    }
  }

  const skipForward = () => {
    const nextIndex = Math.min(transcript.length - 1, currentSegmentIndex + 1)
    stopPlayback()
    setCurrentSegmentIndex(nextIndex)
    setCurrentTime(transcript[nextIndex]?.start || 0)
    
    if (isPlaying) {
      setTimeout(() => playTranscript(nextIndex), 100)
    }
  }

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopPlayback()
    }
  }, [stopPlayback])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const currentSpeaker = transcript[currentSegmentIndex]?.speaker || 'bull'
  const isActivelySpeaking = isPlaying && isSpeaking

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Radio size={18} className="text-purple-400" />
          <h2 className="font-semibold text-white">Live Debate</h2>
        </div>
        <motion.div 
          className={`flex items-center gap-2 px-2 py-1 border rounded-full ${
            isActivelySpeaking 
              ? 'bg-green-500/10 border-green-500/20' 
              : isPlaying 
                ? 'bg-yellow-500/10 border-yellow-500/20'
                : 'bg-purple-500/10 border-purple-500/20'
          }`}
          animate={isActivelySpeaking ? { opacity: [0.7, 1, 0.7] } : {}}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <Activity size={12} className={isActivelySpeaking ? 'text-green-400' : isPlaying ? 'text-yellow-400' : 'text-gray-500'} />
          <span className={`text-xs ${isActivelySpeaking ? 'text-green-400' : isPlaying ? 'text-yellow-400' : 'text-purple-400'}`}>
            {isActivelySpeaking ? 'SPEAKING' : isPlaying ? 'LOADING' : 'READY'}
          </span>
        </motion.div>
      </div>

      {/* Avatars Section */}
      <div className="px-6 py-8 border-b border-white/10 bg-gradient-to-b from-white/[0.02] to-transparent">
        <div className="flex justify-center items-center gap-8 md:gap-16">
          {/* Bull Avatar */}
          <div className="text-center">
            <motion.div 
              className={`relative w-20 h-20 md:w-28 md:h-28 rounded-full flex items-center justify-center text-4xl md:text-5xl transition-all duration-300
                ${currentSpeaker === 'bull' && isActivelySpeaking
                  ? 'bg-gradient-to-br from-green-500/40 to-green-600/20 border-2 border-green-400' 
                  : 'bg-white/5 border border-white/10'
                }`}
              animate={currentSpeaker === 'bull' && isActivelySpeaking ? {
                boxShadow: [
                  '0 0 0 0 rgba(34, 197, 94, 0.4)',
                  '0 0 30px 10px rgba(34, 197, 94, 0.3)',
                  '0 0 0 0 rgba(34, 197, 94, 0.4)'
                ]
              } : { boxShadow: '0 0 0 0 rgba(0, 0, 0, 0)' }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              🐂
              {/* Pulse rings */}
              {currentSpeaker === 'bull' && isActivelySpeaking && (
                <>
                  <motion.div 
                    className="absolute inset-0 rounded-full border-2 border-green-400"
                    animate={{ scale: [1, 1.4], opacity: [0.6, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                  <motion.div 
                    className="absolute inset-0 rounded-full border border-green-400"
                    animate={{ scale: [1, 1.6], opacity: [0.4, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
                  />
                </>
              )}
              {/* Speaking indicator */}
              {currentSpeaker === 'bull' && isActivelySpeaking && (
                <motion.div 
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  {[...Array(3)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="w-1 bg-green-400 rounded-full"
                      animate={{ height: ['4px', '12px', '4px'] }}
                      transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                    />
                  ))}
                </motion.div>
              )}
            </motion.div>
            <p className={`mt-3 font-semibold transition-colors ${currentSpeaker === 'bull' && isActivelySpeaking ? 'text-green-400' : 'text-gray-500'}`}>
              BULL
            </p>
            <p className="text-xs text-gray-600">Optimistic</p>
          </div>

          {/* VS Divider */}
          <div className="flex flex-col items-center">
            <motion.div 
              className="text-2xl font-black text-purple-500/50"
              animate={{ scale: isActivelySpeaking ? [1, 1.1, 1] : 1 }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              VS
            </motion.div>
            <div className="flex gap-1 mt-2">
              <Mic size={12} className={isActivelySpeaking ? (currentSpeaker === 'bull' ? 'text-green-400' : 'text-red-400') : 'text-gray-500'} />
            </div>
          </div>

          {/* Bear Avatar */}
          <div className="text-center">
            <motion.div 
              className={`relative w-20 h-20 md:w-28 md:h-28 rounded-full flex items-center justify-center text-4xl md:text-5xl transition-all duration-300
                ${currentSpeaker === 'bear' && isActivelySpeaking
                  ? 'bg-gradient-to-br from-red-500/40 to-red-600/20 border-2 border-red-400' 
                  : 'bg-white/5 border border-white/10'
                }`}
              animate={currentSpeaker === 'bear' && isActivelySpeaking ? {
                boxShadow: [
                  '0 0 0 0 rgba(239, 68, 68, 0.4)',
                  '0 0 30px 10px rgba(239, 68, 68, 0.3)',
                  '0 0 0 0 rgba(239, 68, 68, 0.4)'
                ]
              } : { boxShadow: '0 0 0 0 rgba(0, 0, 0, 0)' }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              🐻
              {/* Pulse rings */}
              {currentSpeaker === 'bear' && isActivelySpeaking && (
                <>
                  <motion.div 
                    className="absolute inset-0 rounded-full border-2 border-red-400"
                    animate={{ scale: [1, 1.4], opacity: [0.6, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                  <motion.div 
                    className="absolute inset-0 rounded-full border border-red-400"
                    animate={{ scale: [1, 1.6], opacity: [0.4, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
                  />
                </>
              )}
              {/* Speaking indicator */}
              {currentSpeaker === 'bear' && isActivelySpeaking && (
                <motion.div 
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  {[...Array(3)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="w-1 bg-red-400 rounded-full"
                      animate={{ height: ['4px', '12px', '4px'] }}
                      transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                    />
                  ))}
                </motion.div>
              )}
            </motion.div>
            <p className={`mt-3 font-semibold transition-colors ${currentSpeaker === 'bear' && isActivelySpeaking ? 'text-red-400' : 'text-gray-500'}`}>
              BEAR
            </p>
            <p className="text-xs text-gray-600">Skeptical</p>
          </div>
        </div>
      </div>

      {/* Transcript Section */}
      <div 
        ref={transcriptRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin"
      >
        {transcript.map((segment, index) => (
          <motion.div
            key={segment.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`p-4 rounded-xl transition-all duration-300 ${
              index === currentSegmentIndex 
                ? 'bg-purple-600/20 border border-purple-500/40 active-segment' 
                : 'bg-white/[0.02] border border-transparent hover:bg-white/[0.04]'
            }`}
            onClick={() => {
              stopPlayback()
              setCurrentSegmentIndex(index)
              setCurrentTime(segment.start)
              if (isPlaying) {
                setTimeout(() => playTranscript(index), 100)
              }
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                segment.speaker === 'bull' 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-red-500/20 text-red-400'
              }`}>
                {segment.speaker.toUpperCase()}
              </span>
              <span className="text-xs text-gray-500 font-mono">
                {formatTime(segment.start)}
              </span>
              {index === currentSegmentIndex && isPlaying && (
                <motion.span 
                  className="flex items-center gap-1 text-xs text-purple-400 ml-auto"
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  <Activity size={10} /> LIVE
                </motion.span>
              )}
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
        {/* Progress Bar */}
        <div 
          ref={progressRef}
          className="relative h-1.5 bg-white/10 rounded-full mb-4 cursor-pointer group"
          onClick={handleProgressClick}
        >
          <motion.div 
            className="absolute left-0 top-0 h-full bg-gradient-to-r from-purple-600 to-violet-500 rounded-full"
            style={{ width: `${(currentTime / totalDuration) * 100}%` }}
          />
          <motion.div 
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `calc(${(currentTime / totalDuration) * 100}% - 6px)` }}
          />
        </div>

        {/* Time Display */}
        <div className="flex justify-between text-xs text-gray-500 mb-4 font-mono">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(totalDuration)}</span>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-center gap-4">
          {/* Volume */}
          <button 
            onClick={toggleMute}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>

          {/* Skip Back */}
          <motion.button 
            onClick={skipBack}
            className="p-2 text-gray-400 hover:text-white transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <SkipBack size={20} />
          </motion.button>

          {/* Play/Pause */}
          <motion.button
            onClick={togglePlay}
            className="w-14 h-14 flex items-center justify-center bg-gradient-to-r from-purple-600 to-violet-600 rounded-full shadow-cypher"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isPlaying ? (
              <Pause size={24} className="text-white" />
            ) : (
              <Play size={24} className="text-white ml-1" />
            )}
          </motion.button>

          {/* Skip Forward */}
          <motion.button 
            onClick={skipForward}
            className="p-2 text-gray-400 hover:text-white transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <SkipForward size={20} />
          </motion.button>

          {/* Audio Visualizer */}
          <div className="flex items-end gap-0.5 h-5 ml-2">
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="w-1 bg-gradient-to-t from-purple-600 to-violet-400 rounded-full"
                animate={isSpeaking ? {
                  height: ['30%', `${Math.random() * 70 + 30}%`, '30%']
                } : { height: '20%' }}
                transition={{
                  duration: 0.3 + Math.random() * 0.2,
                  repeat: isSpeaking ? Infinity : 0,
                  delay: i * 0.05,
                }}
                style={{ height: '30%' }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

