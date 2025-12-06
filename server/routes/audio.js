import express from 'express';
import { convex } from '../index.js';
import { api } from '../../convex/_generated/api.js';

const router = express.Router();

// ElevenLabs voice IDs - Smooth natural conversational voices
const VOICES = {
  bull: 'nPczCjzI2devNBz1zQrb',  // Brian - smooth American male, natural flow
  bear: 'EXAVITQu4vr4xnSDxMaL'   // Sarah - soft American female, smooth and warm
};

/**
 * Humanized Voice Settings
 * 
 * Key insight: Lower stability = more human-like fluctuations and emotion
 * Standard AI voices use ~0.7 stability which sounds robotic
 * We use 0.35 to force natural voice fluctuations
 * 
 * Acoustic goal: Generate speech with audible breaths, subtle mouth clicks,
 * varying pacing. Avoid 'News Anchor' prosody. Conversational and candid tone,
 * as if recorded in a room, not a sterile studio.
 */
const VOICE_SETTINGS = {
  bull: {
    stability: 0.35,            // LOW - forces voice to fluctuate, adds emotion/imperfections
    similarity_boost: 0.75,     // Keep voice recognizable but allow variation
    style: 0.85,                // HIGH style exaggeration for expressiveness
    use_speaker_boost: true     // Enhanced presence
  },
  bear: {
    stability: 0.35,            // LOW - more human-like, less robotic
    similarity_boost: 0.75,     // Balanced similarity
    style: 0.9,                 // HIGH style for dramatic skeptical tone
    use_speaker_boost: true     // Enhanced presence
  }
};

/**
 * TODO: Implement real cloud storage for audio files
 * 
 * Options to implement:
 * 1. AWS S3 - Most common, requires aws-sdk
 *    - npm install @aws-sdk/client-s3
 *    - Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, S3_BUCKET
 * 
 * 2. Cloudflare R2 - S3-compatible, cheaper egress
 *    - npm install @aws-sdk/client-s3 (S3-compatible API)
 *    - Set R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT, R2_BUCKET
 * 
 * 3. Google Cloud Storage
 *    - npm install @google-cloud/storage
 *    - Set GOOGLE_APPLICATION_CREDENTIALS
 * 
 * 4. Convex File Storage (recommended for this stack)
 *    - Use ctx.storage.store() in a Convex action
 *    - Returns a storage ID that can be converted to URL
 * 
 * Implementation steps:
 * 1. Concatenate audio buffers into single MP3 file
 * 2. Upload to storage provider
 * 3. Return public URL
 * 4. Store URL in Convex database
 */

/**
 * Concatenate audio buffers into a single file
 * Note: For proper MP3 concatenation, you may need ffmpeg or similar
 * Simple buffer concatenation works for basic cases
 */
function concatenateAudioBuffers(audioSegments) {
  if (audioSegments.length === 0) return null;
  
  // Calculate total size
  const totalSize = audioSegments.reduce((sum, seg) => sum + seg.buffer.length, 0);
  
  // Create combined buffer
  const combined = Buffer.alloc(totalSize);
  let offset = 0;
  
  for (const segment of audioSegments) {
    segment.buffer.copy(combined, offset);
    offset += segment.buffer.length;
  }
  
  return combined;
} 

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
        code: 'CONFIG_ERROR',
        message: 'Set ELEVENLABS_API_KEY in your .env file'
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
    let successCount = 0;

    // Process each line
    for (const line of debateScript) {
      const speaker = (line.speaker || '').toLowerCase();
      const voiceId = speaker === 'bull' || speaker === 'BULL' ? VOICES.bull : VOICES.bear;
      const settings = speaker === 'bull' || speaker === 'BULL' ? VOICE_SETTINGS.bull : VOICE_SETTINGS.bear;
      
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
              model_id: 'eleven_multilingual_v2',
              voice_settings: settings
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
          duration: line.duration_estimate || 5
        });
        
        totalDuration += line.duration_estimate || 5;
        successCount++;
        
        console.log(`[Audio] Generated line ${successCount}/${debateScript.length}`);

      } catch (lineError) {
        console.error(`[Audio] Error on line ${line.id}:`, lineError.message);
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Check if we generated any audio
    if (audioSegments.length === 0) {
      return res.status(500).json({
        success: false,
        error: 'Failed to generate any audio segments',
        code: 'SYNTHESIS_FAILED'
      });
    }

    // Concatenate audio buffers
    const combinedAudio = concatenateAudioBuffers(audioSegments);
    
    /**
     * TODO: Upload to cloud storage and get real URL
     * 
     * Example with S3:
     * const s3Client = new S3Client({ region: process.env.AWS_REGION });
     * const key = `audio/${sessionId || Date.now()}.mp3`;
     * await s3Client.send(new PutObjectCommand({
     *   Bucket: process.env.S3_BUCKET,
     *   Key: key,
     *   Body: combinedAudio,
     *   ContentType: 'audio/mpeg',
     *   ACL: 'public-read'
     * }));
     * const audioUrl = `https://${process.env.S3_BUCKET}.s3.amazonaws.com/${key}`;
     */
    
    // For now, audio URL is null until storage is implemented
    // The audio data is generated but not persisted
    const audioUrl = null;
    const audioGenerated = combinedAudio !== null;

    // Save to Convex if sessionId provided (even without URL, save the duration)
    if (sessionId && convex) {
      try {
        // Only save if we have a real URL
        // When storage is implemented, uncomment this:
        // await convex.mutation(api.analyses.storeAudio, {
        //   sessionId,
        //   audioUrl,
        //   audioDuration: totalDuration
        // });
        console.log(`[Audio] Generated ${successCount} segments for session: ${sessionId}`);
        console.log('[Audio] NOTE: Cloud storage not configured - audio not persisted');
      } catch (convexError) {
        console.error('[Audio] Failed to save to Convex:', convexError);
      }
    }

    res.json({
      success: true,
      segments: audioSegments.length,
      totalSegments: debateScript.length,
      estimatedDuration: totalDuration,
      audioGenerated,
      audioUrl, // Will be null until storage is implemented
      message: audioUrl 
        ? 'Audio generated and uploaded successfully'
        : 'Audio generated but storage not configured. Implement cloud storage to persist audio.',
      // TODO: Remove this note when storage is implemented
      _storageNote: 'Configure S3, R2, or Convex storage to persist audio files'
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

    const speakerLower = speaker.toLowerCase();
    const voiceId = speakerLower === 'bull' ? VOICES.bull : VOICES.bear;
    const settings = speakerLower === 'bull' ? VOICE_SETTINGS.bull : VOICE_SETTINGS.bear;

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
          model_id: 'eleven_multilingual_v2',
          voice_settings: settings
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
        message: 'Using default voice IDs - set ELEVENLABS_API_KEY to enable'
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
