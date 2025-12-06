import express from 'express';
import Anthropic from '@anthropic-ai/sdk';

const router = express.Router();

// Initialize Anthropic client
const getAnthropicClient = () => {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
};

/**
 * System prompt for generating broadcast scripts
 * Creates narrative, human-sounding audio scripts
 */
const BROADCAST_SYSTEM_PROMPT = `You are "The Anchor," the host of a premium financial daily broadcast. Your voice is professional, insightful, and narrative-driven (similar to 'The Daily' or 'Bloomberg Surveillance').

### TASK
Convert the provided Market Analysis Report and Key Insights into a 2-3 minute spoken-word script.

### CRITICAL INSTRUCTION: NARRATIVE CONNECTIVITY
You must NOT simply list facts. You must create "connective tissue" between paragraphs.

- Bad: "Apple is up 2%. The P/E ratio is 30. Risks are high."
- Good: "Apple is up 2% today, which is fascinating when you look at its P/E ratio of 30. That high valuation implies investors are ignoring the risks..."

### WRITING RULES (For Human Audio)

1. **The Hook:** Start with the single most important insight from the report. Grab attention immediately.

2. **Transitions:** Explicitly link the "Financial Metrics" to the "Key Risks". Use phrases like:
   - "Now, this connects directly to..."
   - "But here is the catch..."
   - "What the data is really telling us is..."
   - "And this is where it gets interesting..."
   - "Looking deeper, we find..."

3. **Tone:** Analytical but conversational. Use "We" and "Us" to include the listener.
   - Say "we're seeing" not "there is"
   - Say "what this tells us" not "the implication is"

4. **Structure:**
   - Opening hook (15-20 seconds)
   - Key strength analysis (30-40 seconds)
   - Risk assessment with narrative bridge (30-40 seconds)
   - Market outlook connection (20-30 seconds)
   - Closing thought/takeaway (15-20 seconds)

5. **Formatting for TTS (IMPORTANT):**
   - Use [breath] where the speaker should take a brief breath
   - Use ... for short pauses (thinking time)
   - Use *word* for words that need slight emphasis
   - Keep sentences relatively short for natural speaking rhythm
   - Avoid jargon - explain in plain terms

6. **Length:** Aim for approximately 400-500 words (2-3 minutes when spoken)

### OUTPUT FORMAT
Return ONLY the script text. No headers, no formatting notes, just the spoken words.`;

/**
 * POST /api/broadcast/generate-script
 * Generate a narrative broadcast script from analysis report
 */
router.post('/generate-script', async (req, res, next) => {
  const startTime = Date.now();
  
  try {
    const { analysisReport, keyInsights, ticker, company } = req.body;

    console.log('[Broadcast] === GENERATE SCRIPT REQUEST ===');
    console.log('[Broadcast] Ticker:', ticker);
    console.log('[Broadcast] Company:', company);
    console.log('[Broadcast] Has analysisReport:', !!analysisReport);
    console.log('[Broadcast] Has keyInsights:', !!keyInsights);

    if (!analysisReport && !keyInsights) {
      return res.status(400).json({
        error: 'analysisReport or keyInsights is required',
        code: 'INVALID_INPUT'
      });
    }

    const anthropic = getAnthropicClient();

    // Build the input data for the LLM
    const reportData = {
      ticker: ticker || 'Unknown',
      company: company || 'Unknown Company',
      summary: analysisReport?.report?.summary || analysisReport?.summary || '',
      financialAnalysis: analysisReport?.report?.financialAnalysis || '',
      keyStrengths: analysisReport?.report?.keyStrengths || [],
      keyRisks: analysisReport?.report?.keyRisks || [],
      marketOutlook: analysisReport?.report?.marketOutlook || '',
      recommendation: analysisReport?.report?.recommendation || '',
      insights: keyInsights || []
    };

    const userPrompt = `Generate a broadcast script for the following analysis:

COMPANY: ${reportData.company} (${reportData.ticker})

EXECUTIVE SUMMARY:
${reportData.summary}

FINANCIAL ANALYSIS:
${reportData.financialAnalysis}

KEY STRENGTHS:
${reportData.keyStrengths.map((s, i) => `${i + 1}. ${s}`).join('\n')}

KEY RISKS:
${reportData.keyRisks.map((r, i) => `${i + 1}. ${r}`).join('\n')}

MARKET OUTLOOK:
${reportData.marketOutlook}

RECOMMENDATION:
${reportData.recommendation}

${reportData.insights.length > 0 ? `
ADDITIONAL INSIGHTS:
${reportData.insights.map((ins, i) => `- [${ins.type?.toUpperCase() || 'INSIGHT'}] ${ins.title}: ${ins.text}`).join('\n')}
` : ''}

Now generate an engaging, narrative broadcast script that connects these elements naturally.`;

    console.log('[Broadcast] Calling Claude API...');

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: BROADCAST_SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: userPrompt }
      ]
    });

    const script = response.content[0].text;
    
    // Estimate duration (roughly 150 words per minute for natural speech)
    const wordCount = script.split(/\s+/).length;
    const estimatedDuration = Math.round((wordCount / 150) * 60); // in seconds

    const duration = Date.now() - startTime;
    console.log('[Broadcast] Script generated successfully');
    console.log('[Broadcast] Word count:', wordCount);
    console.log('[Broadcast] Estimated duration:', estimatedDuration, 'seconds');
    console.log('[Broadcast] API duration:', duration + 'ms');

    res.json({
      success: true,
      script,
      meta: {
        wordCount,
        estimatedDuration,
        ticker: reportData.ticker,
        company: reportData.company,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[Broadcast] Error:', error.message);
    console.error('[Broadcast] Duration:', duration + 'ms');
    next({
      status: 500,
      message: error.message,
      code: 'SCRIPT_GENERATION_FAILED'
    });
  }
});

/**
 * POST /api/broadcast/synthesize
 * Generate audio from broadcast script using ElevenLabs
 */
router.post('/synthesize', async (req, res, next) => {
  try {
    const { script, voice = 'narrator' } = req.body;

    if (!script) {
      return res.status(400).json({
        error: 'script is required',
        code: 'INVALID_INPUT'
      });
    }

    if (!process.env.ELEVENLABS_API_KEY) {
      return res.status(500).json({
        error: 'ElevenLabs API key not configured',
        code: 'CONFIG_ERROR'
      });
    }

    console.log('[Broadcast Audio] Synthesizing broadcast script...');
    console.log('[Broadcast Audio] Script length:', script.length, 'chars');

    // Clean script for TTS - remove formatting markers
    const cleanScript = script
      .replace(/\[breath\]/gi, '... ')
      .replace(/\*([^*]+)\*/g, '$1') // Remove emphasis markers
      .replace(/\.{3,}/g, '... '); // Normalize ellipsis

    // Use a narrator voice - smooth, professional
    const voiceId = 'pNInz6obpgDQGcFmaJgB'; // Adam - deep, authoritative narrator voice

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
          text: cleanScript,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.4,           // Lower for more natural variation
            similarity_boost: 0.75,
            style: 0.6,               // Some expressiveness but professional
            use_speaker_boost: true
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Broadcast Audio] ElevenLabs error:', errorText);
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    // Return audio as binary
    const audioBuffer = await response.arrayBuffer();
    
    console.log('[Broadcast Audio] Audio generated, size:', audioBuffer.byteLength, 'bytes');

    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.byteLength
    });
    res.send(Buffer.from(audioBuffer));

  } catch (error) {
    console.error('[Broadcast Audio] Error:', error);
    next({
      status: 500,
      message: error.message,
      code: 'SYNTHESIS_FAILED'
    });
  }
});

export default router;

