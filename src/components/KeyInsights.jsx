import { motion } from 'framer-motion'
import { 
  Lightbulb, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'

const insightConfig = {
  bullish: {
    icon: TrendingUp,
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/20',
    arrow: ArrowUpRight,
  },
  bearish: {
    icon: TrendingDown,
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    arrow: ArrowDownRight,
  },
  neutral: {
    icon: Minus,
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/20',
    arrow: null,
  },
}

export default function KeyInsights({ insights, ticker }) {
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
          {insights.map((insight, index) => {
            const config = insightConfig[insight.type]
            const IconComponent = config.icon
            const ArrowComponent = config.arrow
            
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-3 rounded-xl border ${config.border} ${config.bg} backdrop-blur-sm`}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className={`p-1.5 rounded-lg ${config.bg} ${config.color}`}>
                    <IconComponent size={14} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className={`text-sm font-medium ${config.color}`}>
                        {insight.title}
                      </h3>
                      {ArrowComponent && (
                        <ArrowComponent size={12} className={config.color} />
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                      {insight.text}
                    </p>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Sentiment Summary */}
      <div className="px-4 py-3 border-t border-white/10 bg-white/[0.02]">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Overall Sentiment</span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-green-400">
              <TrendingUp size={12} />
              {insights.filter(i => i.type === 'bullish').length}
            </span>
            <span className="flex items-center gap-1 text-red-400">
              <TrendingDown size={12} />
              {insights.filter(i => i.type === 'bearish').length}
            </span>
            <span className="flex items-center gap-1 text-yellow-400">
              <Minus size={12} />
              {insights.filter(i => i.type === 'neutral').length}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

