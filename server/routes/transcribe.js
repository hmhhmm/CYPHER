import express from 'express';
import { AssemblyAI } from 'assemblyai';
import multer from 'multer';

const router = express.Router();

// Configure multer for audio uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB limit
});

// Initialize AssemblyAI client
const getAssemblyAIClient = () => {
  if (!process.env.ASSEMBLYAI_API_KEY) {
    throw new Error('ASSEMBLYAI_API_KEY is not configured');
  }
  return new AssemblyAI({ apiKey: process.env.ASSEMBLYAI_API_KEY });
};

/**
 * POST /api/transcribe
 * Transcribe audio file to text using AssemblyAI
 */
router.post('/', upload.single('audio'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No audio file provided',
        code: 'INVALID_INPUT'
      });
    }

    console.log(`[Transcribe] Processing audio file: ${req.file.originalname}, size: ${req.file.size} bytes`);

    const client = getAssemblyAIClient();
    
    // Upload audio buffer to AssemblyAI
    const uploadUrl = await client.files.upload(req.file.buffer);
    
    // Create transcription
    const transcript = await client.transcripts.transcribe({
      audio_url: uploadUrl,
      language_code: 'en'
    });

    if (transcript.status === 'error') {
      throw new Error(transcript.error || 'Transcription failed');
    }

    console.log(`[Transcribe] Success: "${transcript.text?.substring(0, 50)}..."`);

    res.json({
      transcript: transcript.text,
      confidence: transcript.confidence,
      duration: transcript.audio_duration,
      words: transcript.words?.length || 0
    });

  } catch (error) {
    console.error('[Transcribe] Error:', error);
    next({
      status: 500,
      message: error.message,
      code: 'TRANSCRIPTION_FAILED'
    });
  }
});

/**
 * POST /api/transcribe/url
 * Transcribe audio from URL
 */
router.post('/url', async (req, res, next) => {
  try {
    const { audioUrl } = req.body;

    if (!audioUrl) {
      return res.status(400).json({
        error: 'No audio URL provided',
        code: 'INVALID_INPUT'
      });
    }

    console.log(`[Transcribe] Processing audio URL: ${audioUrl}`);

    const client = getAssemblyAIClient();
    
    const transcript = await client.transcripts.transcribe({
      audio_url: audioUrl,
      language_code: 'en'
    });

    if (transcript.status === 'error') {
      throw new Error(transcript.error || 'Transcription failed');
    }

    res.json({
      transcript: transcript.text,
      confidence: transcript.confidence,
      duration: transcript.audio_duration
    });

  } catch (error) {
    console.error('[Transcribe] Error:', error);
    next({
      status: 500,
      message: error.message,
      code: 'TRANSCRIPTION_FAILED'
    });
  }
});

export default router;


