import { motion } from 'framer-motion'
import { 
  FileText, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  Target,
  Sparkles,
  CheckCircle2,
  XCircle
} from 'lucide-react'

export default function AnalysisReport({ report, ticker, company }) {
  if (!report) {
    return null
  }

  return (
    <div className="space-y-4">
      {/* Executive Summary - Bright Cyan */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="p-5 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border-2 border-cyan-400/50 shadow-[0_0_20px_rgba(6,182,212,0.3)]"
      >
        <div className="flex items-center gap-2 mb-3">
          <FileText size={20} className="text-cyan-300" />
          <h3 className="text-lg font-bold text-cyan-200">Executive Summary</h3>
        </div>
        <p className="text-sm text-white leading-relaxed">{report.summary}</p>
      </motion.div>

      {/* Financial Performance - Bright Yellow */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="p-5 rounded-xl bg-gradient-to-br from-yellow-400/20 to-yellow-500/10 border-2 border-yellow-400/50 shadow-[0_0_20px_rgba(250,204,21,0.3)]"
      >
        <div className="flex items-center gap-2 mb-3">
          <Target size={20} className="text-yellow-300" />
          <h3 className="text-lg font-bold text-yellow-200">Financial Performance Analysis</h3>
        </div>
        <p className="text-sm text-white leading-relaxed">{report.financialAnalysis}</p>
      </motion.div>

      {/* Key Strengths - Bright Green */}
      {report.keyStrengths && report.keyStrengths.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-5 rounded-xl bg-gradient-to-br from-green-400/20 to-green-500/10 border-2 border-green-400/50 shadow-[0_0_20px_rgba(74,222,128,0.3)]"
        >
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={20} className="text-green-300" />
            <h3 className="text-lg font-bold text-green-200">Key Strengths</h3>
          </div>
          <div className="space-y-3">
            {report.keyStrengths.map((strength, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="flex items-start gap-3 p-3 rounded-lg bg-green-400/10 border border-green-400/30"
              >
                <CheckCircle2 size={18} className="text-green-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-white leading-relaxed flex-1">{strength}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Key Risks - Bright Orange */}
      {report.keyRisks && report.keyRisks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="p-5 rounded-xl bg-gradient-to-br from-orange-400/20 to-orange-500/10 border-2 border-orange-400/50 shadow-[0_0_20px_rgba(251,146,60,0.3)]"
        >
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={20} className="text-orange-300" />
            <h3 className="text-lg font-bold text-orange-200">Key Risks</h3>
          </div>
          <div className="space-y-3">
            {report.keyRisks.map((risk, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
                className="flex items-start gap-3 p-3 rounded-lg bg-orange-400/10 border border-orange-400/30"
              >
                <XCircle size={18} className="text-orange-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-white leading-relaxed flex-1">{risk}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Market Outlook - Bright Magenta */}
      {report.marketOutlook && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="p-5 rounded-xl bg-gradient-to-br from-fuchsia-400/20 to-fuchsia-500/10 border-2 border-fuchsia-400/50 shadow-[0_0_20px_rgba(232,121,249,0.3)]"
        >
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={20} className="text-fuchsia-300" />
            <h3 className="text-lg font-bold text-fuchsia-200">Market Outlook</h3>
          </div>
          <p className="text-sm text-white leading-relaxed">{report.marketOutlook}</p>
        </motion.div>
      )}

      {/* Recommendation - Bright Purple */}
      {report.recommendation && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="p-5 rounded-xl bg-gradient-to-br from-purple-400/20 to-purple-500/10 border-2 border-purple-400/50 shadow-[0_0_20px_rgba(192,132,252,0.3)]"
        >
          <div className="flex items-center gap-2 mb-3">
            <Target size={20} className="text-purple-300" />
            <h3 className="text-lg font-bold text-purple-200">Investment Recommendation</h3>
          </div>
          <p className="text-sm text-white leading-relaxed">{report.recommendation}</p>
        </motion.div>
      )}
    </div>
  )
}

