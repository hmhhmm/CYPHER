import { motion } from 'framer-motion'
import { 
  Lightbulb, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Sparkles
} from 'lucide-react'

// Sentiment configuration - minimal, using only thin left border and small dot
const sentimentConfig = {
  positive: {
    borderColor: 'border-l-green-500',
    dotColor: 'bg-green-500',
    dotGlow: 'shadow-[0_0_8px_rgba(34,197,94,0.6)]',
    icon: TrendingUp,
  },
  negative: {
    borderColor: 'border-l-red-500',
    dotColor: 'bg-red-500',
    dotGlow: 'shadow-[0_0_8px_rgba(239,68,68,0.6)]',
    icon: TrendingDown,
  },
  neutral: {
    borderColor: 'border-l-gray-500',
    dotColor: 'bg-gray-500',
    dotGlow: '',
    icon: Minus,
  },
  // Support legacy type names
  bullish: {
    borderColor: 'border-l-green-500',
    dotColor: 'bg-green-500',
    dotGlow: 'shadow-[0_0_8px_rgba(34,197,94,0.6)]',
    icon: TrendingUp,
  },
  bearish: {
    borderColor: 'border-l-red-500',
    dotColor: 'bg-red-500',
    dotGlow: 'shadow-[0_0_8px_rgba(239,68,68,0.6)]',
    icon: TrendingDown,
  },
}

export default function KeyInsights({ insights = [], ticker }) {
  // Normalize insight format (support both 'sentiment' and 'type' keys)
  const normalizedInsights = insights.map(insight => ({
    ...insight,
    sentiment: insight.sentiment || insight.type || 'neutral',
    text: insight.detail || insight.text || '',
  }))

  // Count sentiments
  const positiveCount = normalizedInsights.filter(i => 
    i.sentiment === 'positive' || i.sentiment === 'bullish'
  ).length
  const negativeCount = normalizedInsights.filter(i => 
    i.sentiment === 'negative' || i.sentiment === 'bearish'
  ).length
  const neutralCount = normalizedInsights.filter(i => 
    i.sentiment === 'neutral'
  ).length

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Lightbulb size={18} className="text-purple-400" />
          <h2 className="font-semibold text-white">Key Insights</h2>
        </div>
        <div className="flex items-center gap-1 text-xs text-purple-400">
          <Sparkles size={12} />
          <span>AI Generated</span>
        </div>
      </div>

      {/* Insights Grid */}
      <div className="flex-1 overflow-y-auto p-3 scrollbar-thin">
        <div className="grid gap-2">
          {normalizedInsights.map((insight, index) => {
            const config = sentimentConfig[insight.sentiment] || sentimentConfig.neutral
            
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] border-l-2 ${config.borderColor} backdrop-blur-sm`}
              >
                <div className="flex items-start gap-3">
                  {/* Glowing sentiment dot */}
                  <div className="pt-1">
                    <div className={`w-2 h-2 rounded-full ${config.dotColor} ${config.dotGlow}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-white">
                      {insight.title}
                    </h3>
                    <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                      {insight.text}
                    </p>
                  </div>
                </div>
              </motion.div>
            )
          })}

          {/* Empty state */}
          {normalizedInsights.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Lightbulb size={32} className="mb-3 opacity-50" />
              <p className="text-sm">No insights available</p>
            </div>
          )}
        </div>
      </div>

      {/* Sentiment Summary */}
      <div className="px-4 py-3 border-t border-white/10 bg-white/[0.02]">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Overall Sentiment</span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-gray-400">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]" />
              {positiveCount}
            </span>
            <span className="flex items-center gap-1.5 text-gray-400">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]" />
              {negativeCount}
            </span>
            <span className="flex items-center gap-1.5 text-gray-400">
              <div className="w-1.5 h-1.5 rounded-full bg-gray-500" />
              {neutralCount}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
