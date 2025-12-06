import express from 'express';
import { convex } from '../index.js';
import { api } from '../convex/_generated/api.js';

const router = express.Router();

// ElevenLabs voice IDs (these are example IDs - replace with actual ones)
const VOICES = {
  bull: 'pNInz6obpgDQGcFmaJgB', // Adam - confident, assertive
  bear: 'yoZ06aMxZJJ28mfd3POQ'  // Sam - analytical, cautious
};

/**
 * POST /api/audio/synthesize
 * Generate audio from debate script using ElevenLabs
 */
router.post('/synthesize', async (req, res, next) => {
  try {
    const { debateScript, sessionId, options = {} } = req.body;

    if (!debateScript || !Array.isArray(debateScript)) {
      return res.status(400).json({
        error: 'Valid debateScript array is required',
        code: 'INVALID_INPUT'
      });
    }

    if (!process.env.ELEVENLABS_API_KEY) {
      return res.status(500).json({
        error: 'ElevenLabs API key not configured',
        code: 'CONFIG_ERROR'
      });
    }

    console.log(`[Audio] Synthesizing ${debateScript.length} lines`);

    // Update status if sessionId provided
    if (sessionId && convex) {
      try {
        await convex.mutation(api.analyses.updateStatus, {
          sessionId,
          status: 'synthesizing_audio'
        });
      } catch (err) {
        console.warn('[Audio] Failed to update status:', err);
      }
    }

    const audioSegments = [];
    let totalDuration = 0;

    // Process each line
    for (const line of debateScript) {
      const voiceId = line.speaker === 'bull' ? VOICES.bull : VOICES.bear;
      
      try {
        const response = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
          {
            method: 'POST',
            headers: {
              'Accept': 'audio/mpeg',
              'Content-Type': 'application/json',
              'xi-api-key': process.env.ELEVENLABS_API_KEY
            },
            body: JSON.stringify({
              text: line.text,
              model_id: 'eleven_monolingual_v1',
              voice_settings: {
                stability: 0.5,
                similarity_boost: 0.75,
                style: line.speaker === 'bull' ? 0.3 : 0.1, // Bull more expressive
                use_speaker_boost: true
              }
            })
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[Audio] ElevenLabs error for line ${line.id}:`, errorText);
          continue;
        }

        const audioBuffer = await response.arrayBuffer();
        audioSegments.push({
          id: line.id,
          speaker: line.speaker,
          buffer: Buffer.from(audioBuffer),
          duration: line.duration_estimate
        });
        
        totalDuration += line.duration_estimate;
        
        console.log(`[Audio] Generated line ${line.id}/${debateScript.length}`);

      } catch (lineError) {
        console.error(`[Audio] Error on line ${line.id}:`, lineError.message);
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // For now, return metadata about generated audio
    // In production, you would:
    // 1. Concatenate audio buffers
    // 2. Upload to cloud storage (S3, Cloudflare R2, etc.)
    // 3. Return the URL

    // Placeholder URL (in production this would be actual storage URL)
    const audioUrl = sessionId 
      ? `https://storage.example.com/audio/${sessionId}.mp3`
      : null;

    // Save to Convex if sessionId provided
    if (sessionId && convex && audioUrl) {
      try {
        await convex.mutation(api.analyses.storeAudio, {
          sessionId,
          audioUrl,
          audioDuration: totalDuration
        });
        console.log(`[Audio] Saved to Convex session: ${sessionId}`);
      } catch (convexError) {
        console.error('[Audio] Failed to save to Convex:', convexError);
        // Continue - don't fail the request
      }
    }

    res.json({
      success: true,
      segments: audioSegments.length,
      totalSegments: debateScript.length,
      estimatedDuration: totalDuration,
      message: 'Audio segments generated. Upload to storage for URL.',
      // In production, this would be the actual audio URL
      audioUrl
    });

  } catch (error) {
    console.error('[Audio] Synthesis error:', error);
    next({
      status: 500,
      message: error.message,
      code: 'SYNTHESIS_FAILED'
    });
  }
});

/**
 * POST /api/audio/synthesize-line
 * Generate audio for a single line (for testing)
 */
router.post('/synthesize-line', async (req, res, next) => {
  try {
    const { text, speaker = 'bull' } = req.body;

    if (!text) {
      return res.status(400).json({
        error: 'Text is required',
        code: 'INVALID_INPUT'
      });
    }

    if (!process.env.ELEVENLABS_API_KEY) {
      return res.status(500).json({
        error: 'ElevenLabs API key not configured',
        code: 'CONFIG_ERROR'
      });
    }

    const voiceId = speaker === 'bull' ? VOICES.bull : VOICES.bear;

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': process.env.ELEVENLABS_API_KEY
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs error: ${errorText}`);
    }

    // Return audio as binary
    const audioBuffer = await response.arrayBuffer();
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.byteLength
    });
    res.send(Buffer.from(audioBuffer));

  } catch (error) {
    console.error('[Audio] Single line error:', error);
    next({
      status: 500,
      message: error.message,
      code: 'SYNTHESIS_FAILED'
    });
  }
});

/**
 * GET /api/audio/voices
 * List available voices
 */
router.get('/voices', async (req, res, next) => {
  try {
    if (!process.env.ELEVENLABS_API_KEY) {
      return res.json({
        configured: false,
        voices: VOICES,
        message: 'Using default voice IDs'
      });
    }

    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch voices');
    }

    const data = await response.json();
    
    res.json({
      configured: true,
      defaultVoices: VOICES,
      availableVoices: data.voices?.map(v => ({
        id: v.voice_id,
        name: v.name,
        category: v.category
      })) || []
    });

  } catch (error) {
    console.error('[Audio] Voices error:', error);
    res.json({
      configured: false,
      voices: VOICES,
      error: error.message
    });
  }
});

export default router;

