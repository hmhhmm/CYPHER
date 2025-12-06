import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  FileText, 
  Eye, 
  Download,
  ChevronRight,
  Sparkles,
  BarChart3
} from 'lucide-react'

export default function AnalysisReportViewer({ analysisData, ticker }) {
  const sessionId = analysisData?.sessionId
  const [isExpanded, setIsExpanded] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  // Check if we have an analysis report
  const hasReport = analysisData?.analysisReport

  if (!hasReport) {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <BarChart3 size={18} className="text-purple-400" />
            <h2 className="font-semibold text-purple-300">Analysis Report</h2>
          </div>
        </div>

        {/* Empty state */}
        <div className="flex-1 flex flex-col items-center justify-center py-12 text-gray-500">
          <FileText size={32} className="mb-3 opacity-50" />
          <p className="text-sm">No analysis report available</p>
          <p className="text-xs text-gray-600 mt-1">Generate an analysis to view the report</p>
        </div>
      </div>
    )
  }

  const report = analysisData.analysisReport

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <BarChart3 size={18} className="text-purple-400" />
          <h2 className="font-semibold text-purple-300">Analysis Report</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-purple-400 bg-purple-500/10 px-2 py-1 rounded-full flex items-center gap-1">
            <Sparkles size={10} />
            AI Generated
          </span>
        </div>
      </div>

      {/* Report Card */}
      <div className="flex-1 overflow-y-auto p-3 scrollbar-thin">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className={`relative p-3 rounded-xl border transition-all cursor-pointer ${
            isExpanded
              ? 'bg-purple-500/10 border-purple-500/30' 
              : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/10'
          }`}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <FileText size={16} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-white truncate pr-2">
                {ticker} Investment Analysis Report
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400">
                  Analysis Report
                </span>
                <span className="text-xs text-gray-500">
                  PDF Format
                </span>
              </div>
              {sessionId && (
                <p className="text-xs text-gray-500 mt-1">
                  Session: {sessionId.substring(0, 8)}...
                </p>
              )}
            </div>

            {/* Action indicator */}
            <motion.div
              animate={{ rotate: isExpanded ? 90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronRight size={16} className="text-gray-500" />
            </motion.div>
          </div>

          {/* Expanded Preview and Actions */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                {/* Report Preview */}
                <div className="mt-3 pt-3 border-t border-white/10">
                  <div className="space-y-3 text-xs">
                    {/* Executive Summary Preview */}
                    {report.summary && (
                      <div className="p-2 rounded-lg bg-purple-500/5 border border-purple-500/10">
                        <p className="font-medium text-purple-300 mb-1">Executive Summary</p>
                        <p className="text-gray-400 line-clamp-2">{report.summary}</p>
                      </div>
                    )}

                    {/* Key Metrics Preview */}
                    <div className="grid grid-cols-2 gap-2">
                      {report.keyStrengths && (
                        <div className="p-2 rounded-lg bg-green-500/5 border border-green-500/10">
                          <p className="font-medium text-green-400">{report.keyStrengths.length}</p>
                          <p className="text-gray-500">Strengths</p>
                        </div>
                      )}
                      {report.keyRisks && (
                        <div className="p-2 rounded-lg bg-orange-500/5 border border-orange-500/10">
                          <p className="font-medium text-orange-400">{report.keyRisks.length}</p>
                          <p className="text-gray-500">Risks</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 mt-3">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        // Open in new tab to view
                        const url = `http://localhost:3001/api/analysis/download-pdf?sessionId=${sessionId}&ticker=${ticker}`;
                        window.open(url, '_blank', 'noopener,noreferrer');
                      }}
                      className="flex-1 flex items-center justify-center gap-2 py-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded-lg text-purple-400 text-xs transition-all"
                    >
                      <Eye size={14} />
                      View Report
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        // Trigger download
                        const url = `http://localhost:3001/api/analysis/download-pdf?sessionId=${sessionId}&ticker=${ticker}`;
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `${ticker}_Analysis_Report.pdf`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-gray-400 text-xs transition-all"
                    >
                      <Download size={14} />
                      Download
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Hover glow effect */}
          {isHovered && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-transparent rounded-xl pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
          )}
        </motion.div>

        {/* Report Sections Preview (when collapsed) */}
        {!isExpanded && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-3 space-y-2"
          >
            <p className="text-xs text-gray-500 px-2">Report includes:</p>
            <div className="space-y-1">
              {[
                { label: 'Executive Summary', color: 'cyan' },
                { label: 'Financial Analysis', color: 'yellow' },
                { label: 'Key Strengths', color: 'green' },
                { label: 'Risk Assessment', color: 'orange' },
                { label: 'Market Outlook', color: 'fuchsia' },
                { label: 'Recommendation', color: 'purple' }
              ].map((section, index) => (
                <motion.div
                  key={section.label}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.05 }}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-lg bg-${section.color}-500/5 border border-${section.color}-500/10`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full bg-${section.color}-400`} />
                  <span className="text-xs text-gray-400">{section.label}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-white/10 bg-white/[0.02]">
        <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
          <Sparkles size={12} className="text-purple-400" />
          <span>Generated by AI Analysis Engine</span>
        </div>
      </div>
    </div>
  )
}