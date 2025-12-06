import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { ConvexHttpClient } from 'convex/browser';

// Route imports
import transcribeRoutes from './routes/transcribe.js';
import intentRoutes from './routes/intent.js';
import pdfRoutes from './routes/pdf.js';
import debateRoutes from './routes/debate.js';
import audioRoutes from './routes/audio.js';

// Load environment variables
dotenv.config();

// Initialize Convex client
const convexUrl = process.env.CONVEX_URL;
if (!convexUrl) {
  console.warn('⚠️  CONVEX_URL not configured - database features disabled');
}
export const convex = convexUrl ? new ConvexHttpClient(convexUrl) : null;

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Configure multer for file uploads
const storage = multer.memoryStorage();
export const upload = multer({ 
  storage,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB limit
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API Routes
app.use('/api/transcribe', transcribeRoutes);
app.use('/api/intent', intentRoutes);
app.use('/api/pdf', pdfRoutes);
app.use('/api/debate', debateRoutes);
app.use('/api/audio', audioRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  // Multer errors
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      error: 'File upload error',
      code: 'UPLOAD_ERROR',
      details: err.message
    });
  }

  // Generic errors
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    code: err.code || 'INTERNAL_ERROR'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    code: 'NOT_FOUND'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════╗
  ║          CYPHER API Server                ║
  ║─────────────────────────────────────────--║
  ║  Status:  🟢 Running                      ║
  ║  Port:    ${PORT}                            ║
  ║  Mode:    ${process.env.NODE_ENV || 'development'}                     ║
  ║  Convex:  ${convex ? '🟢 Connected' : '⚠️  Not configured'}              ║
  ╚═══════════════════════════════════════════╝
  `);
});

export default app;

