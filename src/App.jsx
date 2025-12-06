import { Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'

export default function App() {
  return (
    <div className="app-wrapper min-h-screen bg-cypher-bg text-white font-sans antialiased overflow-x-hidden">
      {/* Grid texture background */}
      <div className="grid-background" />
      
      {/* Vignette overlay */}
      <div className="vignette" />
      
      {/* Main content */}
      <div className="relative z-10">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </div>
    </div>
  )
}
