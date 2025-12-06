import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  FileText, 
  Eye, 
  Download,
  ChevronRight,
  BarChart3,
  TrendingUp,
  TrendingDown
} from 'lucide-react'

export default function AnalysisReportViewer({ analysisData, ticker }) {
  const [isExpanded, setIsExpanded] = useState(false)

  const hasReport = analysisData?.analysisReport
  const report = analysisData?.analysisReport?.report || analysisData?.analysisReport
  const pdfDataUrl = analysisData?.analysisReport?.pdfDataUrl

  if (!hasReport) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <BarChart3 size={18} className="text-purple-400" />
            <h2 className="font-semibold text-purple-300">Analysis Report</h2>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center py-12 text-gray-500">
          <FileText size={32} className="mb-3 opacity-50" />
          <p className="text-sm">No analysis report available</p>
          <p className="text-xs text-gray-600 mt-1">Generate an analysis to view the report</p>
        </div>
      </div>
    )
  }

  const handleViewReport = (e) => {
    e.stopPropagation()
    if (pdfDataUrl) {
      // Open PDF in new tab
      window.open(pdfDataUrl, '_blank')
    }
  }

  const handleDownload = (e) => {
    e.stopPropagation()
    if (pdfDataUrl) {
      const link = document.createElement('a')
      link.href = pdfDataUrl
      link.download = `${ticker}_Analysis_Report.pdf`
      link.click()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <BarChart3 size={18} className="text-purple-400" />
          <h2 className="font-semibold text-purple-300">Analysis Report</h2>
        </div>
        {pdfDataUrl && (
          <button
            onClick={handleViewReport}
            className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
          >
            <Eye size={12} />
            View PDF
          </button>
        )}
      </div>

      {/* Report Card */}
      <div className="flex-1 overflow-y-auto p-3 scrollbar-thin">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`relative p-3 rounded-xl border transition-all cursor-pointer ${
            isExpanded
              ? 'bg-purple-500/10 border-purple-500/30' 
              : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]'
          }`}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <FileText size={16} />
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-white truncate pr-2">
                {ticker} Investment Analysis
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                PDF Report • AI Generated
              </p>
            </div>

            <motion.div
              animate={{ rotate: isExpanded ? 90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronRight size={16} className="text-gray-500" />
            </motion.div>
          </div>

          {/* Expanded Content */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-3 pt-3 border-t border-white/10 space-y-3">
                  {/* Summary Preview */}
                  {report?.summary && (
                    <p className="text-xs text-gray-400 line-clamp-3">
                      {report.summary}
                    </p>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02]">
                      <TrendingUp size={12} className="text-green-400" />
                      <span className="text-xs text-gray-400">
                        {report?.keyStrengths?.length || 0} Strengths
                      </span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02]">
                      <TrendingDown size={12} className="text-red-400" />
                      <span className="text-xs text-gray-400">
                        {report?.keyRisks?.length || 0} Risks
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button 
                      onClick={handleViewReport}
                      disabled={!pdfDataUrl}
                      className="flex-1 flex items-center justify-center gap-2 py-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded-lg text-purple-400 text-xs transition-all disabled:opacity-50"
                    >
                      <Eye size={14} />
                      View Report
                    </button>
                    <button 
                      onClick={handleDownload}
                      disabled={!pdfDataUrl}
                      className="flex-1 flex items-center justify-center gap-2 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-gray-400 text-xs transition-all disabled:opacity-50"
                    >
                      <Download size={14} />
                      Download
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Quick Stats when collapsed */}
        {!isExpanded && report && (
          <div className="mt-3 space-y-2">
            {report.keyStrengths?.slice(0, 2).map((strength, i) => (
              <div key={i} className="flex items-start gap-2 px-2 py-1.5 text-xs text-gray-500">
                <TrendingUp size={10} className="text-green-400/60 mt-0.5 flex-shrink-0" />
                <span className="line-clamp-1">{strength}</span>
              </div>
            ))}
            {report.keyRisks?.slice(0, 1).map((risk, i) => (
              <div key={i} className="flex items-start gap-2 px-2 py-1.5 text-xs text-gray-500">
                <TrendingDown size={10} className="text-red-400/60 mt-0.5 flex-shrink-0" />
                <span className="line-clamp-1">{risk}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
