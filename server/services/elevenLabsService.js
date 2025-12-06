/**
 * ElevenLabs Service for Audio Synthesis
 */

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

// Voice IDs for Bull and Bear characters
const VOICE_CONFIG = {
  bull: {
    id: 'pNInz6obpgDQGcFmaJgB', // Adam - confident, assertive
    name: 'Bull (Adam)',
    settings: {
      stability: 0.5,
      similarity_boost: 0.75,
      style: 0.3, // More expressive
      use_speaker_boost: true,
    },
  },
  bear: {
    id: 'yoZ06aMxZJJ28mfd3POQ', // Sam - analytical, cautious
    name: 'Bear (Sam)',
    settings: {
      stability: 0.6,
      similarity_boost: 0.75,
      style: 0.1, // More reserved
      use_speaker_boost: true,
    },
  },
};

/**
 * Check if ElevenLabs API is configured
 */
export function isConfigured() {
  return !!process.env.ELEVENLABS_API_KEY;
}

/**
 * Synthesize text to speech
 * @param {string} text - Text to synthesize
 * @param {string} speaker - 'bull' or 'bear'
 * @returns {Promise<Buffer>} Audio buffer
 */
export async function synthesizeText(text, speaker = 'bull') {
  if (!isConfigured()) {
    throw new Error('ElevenLabs API key not configured');
  }

  const voiceConfig = VOICE_CONFIG[speaker] || VOICE_CONFIG.bull;

  const response = await fetch(
    `${ELEVENLABS_API_URL}/text-to-speech/${voiceConfig.id}`,
    {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: voiceConfig.settings,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs error: ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Synthesize full debate script
 * @param {array} debateScript - Array of debate lines
 * @param {function} onProgress - Progress callback
 * @returns {Promise<{segments: array, totalDuration: number}>}
 */
export async function synthesizeDebate(debateScript, onProgress = () => {}) {
  if (!isConfigured()) {
    throw new Error('ElevenLabs API key not configured');
  }

  const segments = [];
  let totalDuration = 0;

  for (let i = 0; i < debateScript.length; i++) {
    const line = debateScript[i];
    
    onProgress({
      current: i + 1,
      total: debateScript.length,
      speaker: line.speaker,
    });

    try {
      const audioBuffer = await synthesizeText(line.text, line.speaker);
      
      segments.push({
        id: line.id,
        speaker: line.speaker,
        buffer: audioBuffer,
        duration: line.duration_estimate,
        start: totalDuration,
        end: totalDuration + line.duration_estimate,
      });
      
      totalDuration += line.duration_estimate;

      // Small delay to avoid rate limiting
      if (i < debateScript.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }

    } catch (error) {
      console.error(`[ElevenLabs] Error on line ${line.id}:`, error.message);
      // Continue with remaining lines
    }
  }

  return {
    segments,
    totalDuration,
    completedLines: segments.length,
    totalLines: debateScript.length,
  };
}

/**
 * Get available voices
 */
export async function getVoices() {
  if (!isConfigured()) {
    return {
      configured: false,
      defaultVoices: VOICE_CONFIG,
    };
  }

  try {
    const response = await fetch(`${ELEVENLABS_API_URL}/voices`, {
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch voices');
    }

    const data = await response.json();
    
    return {
      configured: true,
      defaultVoices: VOICE_CONFIG,
      availableVoices: data.voices?.map(v => ({
        id: v.voice_id,
        name: v.name,
        category: v.category,
        preview_url: v.preview_url,
      })) || [],
    };
  } catch (error) {
    return {
      configured: true,
      defaultVoices: VOICE_CONFIG,
      error: error.message,
    };
  }
}

/**
 * Get voice configuration
 */
export function getVoiceConfig() {
  return VOICE_CONFIG;
}

export default {
  isConfigured,
  synthesizeText,
  synthesizeDebate,
  getVoices,
  getVoiceConfig,
};

