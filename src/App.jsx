import { Routes, Route } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { useLocation } from 'react-router-dom'
import Landing from './pages/Landing'
import Terminal from './pages/Terminal'
import Dashboard from './pages/Dashboard'

export default function App() {
  const location = useLocation()

  return (
    <div className="app-wrapper min-h-screen bg-cypher-bg text-white font-sans antialiased overflow-x-hidden">
      {/* Grid texture background */}
      <div className="grid-background" />
      
      {/* Vignette overlay */}
      <div className="vignette" />
      
      {/* Main content */}
      <div className="relative z-10">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Landing />} />
            <Route path="/terminal" element={<Terminal />} />
            <Route path="/dashboard" element={<Dashboard />} />
          </Routes>
        </AnimatePresence>
      </div>
    </div>
  )
}
