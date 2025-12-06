import { useState, useRef, useEffect } from 'react'
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

export default function PodcastPlayer({ ticker, transcript }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.8)
  const [isMuted, setIsMuted] = useState(false)
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0)
  
  const audioRef = useRef(null)
  const transcriptRef = useRef(null)
  const progressRef = useRef(null)

  // Simulated audio duration (since we don't have real audio)
  const simulatedDuration = transcript.length > 0 
    ? transcript[transcript.length - 1].end 
    : 60

  // Find current segment based on time
  useEffect(() => {
    const segment = transcript.findIndex((seg, index) => {
      const nextSeg = transcript[index + 1]
      return currentTime >= seg.start && (nextSeg ? currentTime < nextSeg.start : true)
    })
    
    if (segment !== -1 && segment !== currentSegmentIndex) {
      setCurrentSegmentIndex(segment)
    }
  }, [currentTime, transcript, currentSegmentIndex])

  // Simulated playback (since we don't have real audio)
  useEffect(() => {
    let interval
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime(prev => {
          if (prev >= simulatedDuration) {
            setIsPlaying(false)
            return 0
          }
          return prev + 0.1
        })
      }, 100)
    }
    return () => clearInterval(interval)
  }, [isPlaying, simulatedDuration])

  // Auto-scroll transcript
  useEffect(() => {
    if (transcriptRef.current) {
      const activeElement = transcriptRef.current.querySelector('.active-segment')
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [currentSegmentIndex])

  const togglePlay = () => setIsPlaying(!isPlaying)
  
  const toggleMute = () => setIsMuted(!isMuted)

  const handleProgressClick = (e) => {
    if (progressRef.current) {
      const rect = progressRef.current.getBoundingClientRect()
      const clickX = e.clientX - rect.left
      const percentage = clickX / rect.width
      setCurrentTime(percentage * simulatedDuration)
    }
  }

  const skipBack = () => {
    setCurrentTime(Math.max(0, currentTime - 10))
  }

  const skipForward = () => {
    setCurrentTime(Math.min(simulatedDuration, currentTime + 10))
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const currentSpeaker = transcript[currentSegmentIndex]?.speaker || 'bull'

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Radio size={18} className="text-purple-400" />
          <h2 className="font-semibold text-white">Live Debate</h2>
        </div>
        <motion.div 
          className="flex items-center gap-2 px-2 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full"
          animate={isPlaying ? { opacity: [0.7, 1, 0.7] } : {}}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <Activity size={12} className={isPlaying ? 'text-purple-400' : 'text-gray-500'} />
          <span className="text-xs text-purple-400">{isPlaying ? 'PLAYING' : 'PAUSED'}</span>
        </motion.div>
      </div>

      {/* Avatars Section */}
      <div className="px-6 py-8 border-b border-white/10 bg-gradient-to-b from-white/[0.02] to-transparent">
        <div className="flex justify-center items-center gap-8 md:gap-16">
          {/* Bull Avatar */}
          <div className="text-center">
            <motion.div 
              className={`relative w-20 h-20 md:w-28 md:h-28 rounded-full flex items-center justify-center text-4xl md:text-5xl transition-all duration-300
                ${currentSpeaker === 'bull' && isPlaying
                  ? 'bg-gradient-to-br from-green-500/40 to-green-600/20 border-2 border-green-400' 
                  : 'bg-white/5 border border-white/10'
                }`}
              animate={currentSpeaker === 'bull' && isPlaying ? {
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
              {currentSpeaker === 'bull' && isPlaying && (
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
              {currentSpeaker === 'bull' && isPlaying && (
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
            <p className={`mt-3 font-semibold transition-colors ${currentSpeaker === 'bull' ? 'text-green-400' : 'text-gray-500'}`}>
              BULL
            </p>
            <p className="text-xs text-gray-600">Optimistic</p>
          </div>

          {/* VS Divider */}
          <div className="flex flex-col items-center">
            <motion.div 
              className="text-2xl font-black text-purple-500/50"
              animate={{ scale: isPlaying ? [1, 1.1, 1] : 1 }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              VS
            </motion.div>
            <div className="flex gap-1 mt-2">
              <Mic size={12} className={currentSpeaker === 'bull' ? 'text-green-400' : 'text-red-400'} />
            </div>
          </div>

          {/* Bear Avatar */}
          <div className="text-center">
            <motion.div 
              className={`relative w-20 h-20 md:w-28 md:h-28 rounded-full flex items-center justify-center text-4xl md:text-5xl transition-all duration-300
                ${currentSpeaker === 'bear' && isPlaying
                  ? 'bg-gradient-to-br from-red-500/40 to-red-600/20 border-2 border-red-400' 
                  : 'bg-white/5 border border-white/10'
                }`}
              animate={currentSpeaker === 'bear' && isPlaying ? {
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
              {currentSpeaker === 'bear' && isPlaying && (
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
              {currentSpeaker === 'bear' && isPlaying && (
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
            <p className={`mt-3 font-semibold transition-colors ${currentSpeaker === 'bear' ? 'text-red-400' : 'text-gray-500'}`}>
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
            onClick={() => setCurrentTime(segment.start)}
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
            style={{ width: `${(currentTime / simulatedDuration) * 100}%` }}
          />
          <motion.div 
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `calc(${(currentTime / simulatedDuration) * 100}% - 6px)` }}
          />
        </div>

        {/* Time Display */}
        <div className="flex justify-between text-xs text-gray-500 mb-4 font-mono">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(simulatedDuration)}</span>
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
      </div>
    </div>
  )
}

