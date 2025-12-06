import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  FileText, 
  FileSpreadsheet, 
  Newspaper, 
  Eye, 
  Download,
  FolderOpen,
  ChevronRight,
  ExternalLink,
  BarChart3,
  Mic
} from 'lucide-react'

// Unified monochrome icons - all use the same dark slate background
const fileTypeIcons = {
  'SEC Filing': FileSpreadsheet,
  '10-K': FileSpreadsheet,
  '10-Q': FileSpreadsheet,
  'Earnings Report': BarChart3,
  'Earnings': BarChart3,
  'Research': FileText,
  'News Article': Newspaper,
  'News': Newspaper,
  'Interview': Mic,
}

export default function SourceDocuments({ documents = [], ticker }) {
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [hoveredDoc, setHoveredDoc] = useState(null)

  // Generate source documents from API data if needed
  const displayDocs = documents.length > 0 ? documents : []

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <FolderOpen size={18} className="text-purple-400" />
          <h2 className="font-semibold text-white">Source Documents</h2>
        </div>
        <span className="text-xs text-gray-500 bg-white/5 px-2 py-1 rounded-full">
          {displayDocs.length} files
        </span>
      </div>

      {/* Document List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
        {displayDocs.map((doc, index) => {
          const IconComponent = fileTypeIcons[doc.type] || FileText
          
          return (
            <motion.div
              key={doc.id || index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`relative p-3 rounded-xl border transition-all cursor-pointer ${
                selectedDoc === (doc.id || index)
                  ? 'bg-purple-500/10 border-purple-500/30' 
                  : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/10'
              }`}
              onMouseEnter={() => setHoveredDoc(doc.id || index)}
              onMouseLeave={() => setHoveredDoc(null)}
              onClick={() => setSelectedDoc(selectedDoc === (doc.id || index) ? null : (doc.id || index))}
            >
              <div className="flex items-start gap-3">
                {/* Icon - Unified dark slate/glass background */}
                <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-purple-400/80">
                  <IconComponent size={16} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-white truncate pr-2">
                    {doc.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/[0.03] border border-white/[0.06] text-gray-400">
                      {doc.type}
                    </span>
                    {doc.pages && (
                      <span className="text-xs text-gray-500">
                        {doc.pages} pages
                      </span>
                    )}
                  </div>
                  {doc.date && (
                    <p className="text-xs text-gray-500 mt-1">
                      {doc.date}
                    </p>
                  )}
                </div>

                {/* Action indicator */}
                <motion.div
                  animate={{ rotate: selectedDoc === (doc.id || index) ? 90 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronRight size={16} className="text-gray-500" />
                </motion.div>
              </div>

              {/* Expanded Actions */}
              <AnimatePresence>
                {selectedDoc === (doc.id || index) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="flex gap-2 mt-3 pt-3 border-t border-white/10">
                      <button className="flex-1 flex items-center justify-center gap-2 py-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded-lg text-purple-400 text-xs transition-all">
                        <Eye size={14} />
                        View
                      </button>
                      <button className="flex-1 flex items-center justify-center gap-2 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-gray-400 text-xs transition-all">
                        <Download size={14} />
                        Download
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Hover glow effect */}
              {hoveredDoc === (doc.id || index) && (
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-transparent rounded-xl pointer-events-none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                />
              )}
            </motion.div>
          )
        })}

        {/* Empty state */}
        {displayDocs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <FolderOpen size={32} className="mb-3 opacity-50" />
            <p className="text-sm">No source documents</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-white/10 bg-white/[0.02]">
        <button className="w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-400 hover:text-purple-400 transition-colors">
          <ExternalLink size={14} />
          View All Sources
        </button>
      </div>
    </div>
  )
}
