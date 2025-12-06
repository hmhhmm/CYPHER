import express from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { convex } from '../index.js';
import { api } from '../../convex/_generated/api.js';

const router = express.Router();

// Initialize Anthropic client
const getAnthropicClient = () => {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
};

/**
 * POST /api/debate/generate
 * Generate Bull vs Bear debate script from HarvestedData
 */
router.post('/generate', async (req, res, next) => {
  try {
    const { harvestedData, sessionId } = req.body;

    if (!harvestedData || !harvestedData.meta || !harvestedData.content) {
      return res.status(400).json({
        error: 'Valid harvestedData is required',
        code: 'INVALID_INPUT'
      });
    }

    const { meta, content } = harvestedData;
    console.log(`[Debate] Generating script for ${meta.ticker}`);

    // Update status if sessionId provided
    if (sessionId && convex) {
      try {
        await convex.mutation(api.analyses.updateStatus, {
          sessionId,
          status: 'generating_debate'
        });
      } catch (err) {
        console.warn('[Debate] Failed to update status:', err);
      }
    }

    const client = getAnthropicClient();

    const debatePrompt = `You are a financial debate scriptwriter. Create a compelling Bull vs Bear debate about ${meta.company} (${meta.ticker}) based on their ${meta.report_type} filing.

COMPANY DATA:

**Management's Discussion (Bullish perspective source):**
${content.management_discussion}

**Risk Factors (Bearish perspective source):**
${content.risk_factors}

**Key Financials:**
${content.key_financials}

INSTRUCTIONS:
Create a debate script between BULL (optimistic investor) and BEAR (skeptical investor).
- 8-12 exchanges total
- Each speaker should make substantive points backed by the data
- BULL focuses on growth, opportunities, management's positive outlook
- BEAR focuses on risks, challenges, valuation concerns
- Make it conversational but professional
- Include specific numbers and facts from the filing
- Each line should be 1-3 sentences, suitable for audio narration

OUTPUT FORMAT - Return a JSON array:
[
  {
    "speaker": "BULL" or "BEAR",
    "text": "The spoken dialogue",
    "duration_estimate": estimated seconds to speak this (typically 4-8 seconds per line),
    "visual_evidence": "Optional reference like 'Revenue Chart' or 'Risk Factor #3'"
  }
]

Start with BULL making the opening statement about the company's strengths.
Respond ONLY with the JSON array:`;

    const response = await client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 4000,
      messages: [{ role: 'user', content: debatePrompt }]
    });

    const responseText = response.content[0].text.trim();

    // Parse debate script
    let debateScript;
    try {
      debateScript = JSON.parse(responseText);
    } catch (parseError) {
      // Try to extract JSON array from response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        debateScript = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse debate script');
      }
    }

    // Validate and enhance script
    if (!Array.isArray(debateScript)) {
      throw new Error('Debate script must be an array');
    }

    // Calculate cumulative timestamps
    let currentTime = 0;
    const enhancedScript = debateScript.map((line, index) => {
      const duration = line.duration_estimate || 5;
      const enhanced = {
        id: index + 1,
        speaker: line.speaker?.toLowerCase() || (index % 2 === 0 ? 'bull' : 'bear'),
        text: line.text,
        duration_estimate: duration,
        start: currentTime,
        end: currentTime + duration,
        visual_evidence: line.visual_evidence || null
      };
      currentTime += duration;
      return enhanced;
    });

    const totalDuration = currentTime;

    console.log(`[Debate] Generated ${enhancedScript.length} lines, ${totalDuration}s total`);

    // Save to Convex if sessionId provided
    if (sessionId && convex) {
      try {
        await convex.mutation(api.analyses.storeDebateScript, {
          sessionId,
          debateScript: enhancedScript
        });
        console.log(`[Debate] Saved to Convex session: ${sessionId}`);
      } catch (convexError) {
        console.error('[Debate] Failed to save to Convex:', convexError);
        // Continue - don't fail the request
      }
    }

    res.json({
      meta: {
        ticker: meta.ticker,
        company: meta.company,
        lineCount: enhancedScript.length,
        totalDuration,
        generatedAt: new Date().toISOString()
      },
      script: enhancedScript
    });

  } catch (error) {
    console.error('[Debate] Error:', error);
    next({
      status: 500,
      message: error.message,
      code: 'DEBATE_GENERATION_FAILED'
    });
  }
});

/**
 * POST /api/debate/enhance
 * Add external news context to debate (optional enhancement)
 */
router.post('/enhance', async (req, res, next) => {
  try {
    const { debateScript, externalNews } = req.body;

    if (!debateScript || !externalNews) {
      return res.status(400).json({
        error: 'debateScript and externalNews are required',
        code: 'INVALID_INPUT'
      });
    }

    // This would integrate external news to enhance the debate
    // For now, return the script as-is with news attached
    res.json({
      script: debateScript,
      newsContext: externalNews,
      enhanced: true
    });

  } catch (error) {
    console.error('[Debate] Enhance error:', error);
    next({
      status: 500,
      message: error.message,
      code: 'ENHANCEMENT_FAILED'
    });
  }
});

export default router;

