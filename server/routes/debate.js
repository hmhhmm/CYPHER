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

// Preferred model - Claude 3.5 Sonnet for high-quality debate generation
const DEBATE_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';

/**
 * System prompt to force JSON-only output
 */
const SYSTEM_PROMPT = `You are a financial podcast producer and scriptwriter. You create compelling, data-driven Bull vs Bear debates.

CRITICAL RULES:
1. Output ONLY valid JSON - no markdown, no explanation, no text before or after
2. Always cite specific numbers, percentages, and facts from the source material
3. Make dialogue natural and engaging - like a real financial podcast
4. Balance optimism with skepticism fairly
5. Duration estimates: approximately 1 second per 2.5 words`;

/**
 * Calculate duration estimate from text
 * Rule: ~2.5 words per second for natural speech
 */
function estimateDuration(text) {
  const words = text.split(/\s+/).length;
  return Math.max(3, Math.round(words / 2.5));
}

/**
 * POST /api/debate/generate
 * Generate Bull vs Bear debate script from HarvestedData
 */
router.post('/generate', async (req, res, next) => {
  try {
    const { harvestedData, sessionId, newsArticles } = req.body;

    if (!harvestedData || !harvestedData.meta || !harvestedData.content) {
      return res.status(400).json({
        error: 'Valid harvestedData is required',
        code: 'INVALID_INPUT'
      });
    }

    const { meta, content } = harvestedData;
    console.log(`[Debate] Generating script for ${meta.ticker} using ${DEBATE_MODEL}`);

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

    // Fetch news articles from Convex if not provided
    let newsContext = newsArticles || [];
    if (!newsContext.length && sessionId && convex) {
      try {
        const analysis = await convex.query(api.analyses.getBySession, { sessionId });
        if (analysis && analysis.sourceDocuments) {
          newsContext = analysis.sourceDocuments
            .filter(doc => {
              const url = doc.url || '';
              const source = doc.source || '';
              return (!url.endsWith('.pdf') && !url.includes('.pdf')) &&
                     (source === 'news' || source.includes('wsj') || 
                      source.includes('bloomberg') || source.includes('reuters') || 
                      source.includes('ft') || url.includes('wsj.com') || 
                      url.includes('bloomberg.com') || url.includes('reuters.com') || 
                      url.includes('ft.com'));
            })
            .map(doc => ({
              title: doc.title,
              url: doc.url,
              snippet: doc.snippet,
              source: doc.source,
            }));
        }
        
        if (!newsContext.length) {
          const newsData = await convex.query(api.news.getByTicker, { ticker: meta.ticker });
          if (newsData && newsData.articles) {
            newsContext = newsData.articles.slice(0, 5);
          }
        }
        
        console.log(`[Debate] Found ${newsContext.length} news articles for context`);
      } catch (newsError) {
        console.warn('[Debate] Failed to fetch news context:', newsError);
      }
    }

    const client = getAnthropicClient();

    // Build structured news context
    const newsSection = newsContext.length > 0 
      ? `\n\nRECENT NEWS CONTEXT (use to add market perspective):\n${newsContext.slice(0, 5).map((article, idx) => 
          `${idx + 1}. "${article.title || 'News'}"\n   Summary: ${article.snippet || 'No summary'}\n   Source: ${article.source || 'Unknown'}`
        ).join('\n\n')}`
      : '';

    // Enhanced debate prompt with clear JSON structure
    const debatePrompt = `Create a 2-minute debate script between a BULL (Optimist) and BEAR (Skeptic) about ${meta.company} (${meta.ticker}).

REPORT CONTEXT:
Company: ${meta.company} (${meta.ticker})
Report Type: ${meta.report_type}
Period: ${meta.period}

MANAGEMENT'S DISCUSSION (Source for BULL arguments):
${content.management_discussion}

RISK FACTORS (Source for BEAR arguments):
${content.risk_factors}

KEY FINANCIAL METRICS:
${content.key_financials}${newsSection}

DEBATE REQUIREMENTS:
1. Generate 8-12 exchanges (alternating BULL and BEAR)
2. BULL starts with an opening statement about strengths
3. Each line: 1-3 sentences, natural conversational tone
4. BULL focuses on: growth, revenue, market opportunity, positive news
5. BEAR counters with: risks, margin pressure, competition, concerns
6. Include SPECIFIC numbers/percentages from the data above
7. Duration estimate: ~1 second per 2.5 words
8. Visual evidence: reference specific charts, pages, or metrics

RETURN FORMAT (JSON ARRAY ONLY):
[
  {
    "speaker": "BULL",
    "text": "${meta.company}'s revenue is up significantly, showing strong execution in a challenging market.",
    "duration_estimate": 5,
    "visual_evidence": "Revenue Chart - Q3 Results"
  },
  {
    "speaker": "BEAR",
    "text": "But margins are shrinking. That revenue growth came at the cost of profitability.",
    "duration_estimate": 5,
    "visual_evidence": "Margin Trend Graph"
  }
]`;

    console.log('[Debate] Calling Claude API...');
    
    const response = await client.messages.create({
      model: DEBATE_MODEL,
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: debatePrompt }]
    });

    const responseText = response.content[0].text.trim();
    console.log('[Debate] Raw response length:', responseText.length);

    // Robust JSON parsing with fallback extraction
    let debateScript;
    try {
      // First attempt: direct parse
      debateScript = JSON.parse(responseText);
    } catch (parseError) {
      console.warn('[Debate] Direct JSON parse failed, attempting extraction...');
      
      // Second attempt: extract JSON array from response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          debateScript = JSON.parse(jsonMatch[0]);
        } catch (extractError) {
          console.error('[Debate] JSON extraction failed:', extractError.message);
          console.log('[Debate] Raw response (first 500 chars):', responseText.substring(0, 500));
          throw new Error('Failed to parse debate script from AI response');
        }
      } else {
        console.error('[Debate] No JSON array found in response');
        console.log('[Debate] Raw response (first 500 chars):', responseText.substring(0, 500));
        throw new Error('No valid JSON array in AI response');
      }
    }

    // Validate script structure
    if (!Array.isArray(debateScript)) {
      throw new Error('Debate script must be an array');
    }

    if (debateScript.length === 0) {
      throw new Error('Debate script is empty');
    }

    // Enhance script with calculated timestamps and normalized data
    let currentTime = 0;
    const enhancedScript = debateScript.map((line, index) => {
      // Calculate duration from text if not provided or seems off
      const textDuration = estimateDuration(line.text || '');
      const duration = line.duration_estimate && line.duration_estimate >= 2 && line.duration_estimate <= 15
        ? line.duration_estimate 
        : textDuration;
      
      // Normalize speaker name
      const speaker = (line.speaker || '').toUpperCase();
      const normalizedSpeaker = speaker === 'BULL' ? 'bull' : 'bear';
      
      const enhanced = {
        id: index + 1,
        speaker: normalizedSpeaker,
        text: line.text || '',
        duration_estimate: duration,
        start: currentTime,
        end: currentTime + duration,
        visual_evidence: line.visual_evidence || null
      };
      
      currentTime += duration;
      return enhanced;
    });

    const totalDuration = currentTime;

    console.log(`[Debate] Generated ${enhancedScript.length} lines, ${totalDuration}s total duration`);

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
      }
    }

    res.json({
      meta: {
        ticker: meta.ticker,
        company: meta.company,
        lineCount: enhancedScript.length,
        totalDuration,
        model: DEBATE_MODEL,
        generatedAt: new Date().toISOString(),
        hasNewsContext: newsContext.length > 0
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
 * Add external news context to existing debate
 */
router.post('/enhance', async (req, res, next) => {
  try {
    const { debateScript, externalNews, ticker, company } = req.body;

    if (!debateScript || !Array.isArray(debateScript)) {
      return res.status(400).json({
        error: 'Valid debateScript array is required',
        code: 'INVALID_INPUT'
      });
    }

    if (!externalNews || !Array.isArray(externalNews) || externalNews.length === 0) {
      return res.json({
        script: debateScript,
        enhanced: false,
        message: 'No news to add'
      });
    }

    const client = getAnthropicClient();

    // Create enhancement prompt
    const enhancePrompt = `You have an existing Bull vs Bear debate script. Add 2-4 new exchanges that incorporate this recent news.

EXISTING SCRIPT:
${JSON.stringify(debateScript, null, 2)}

RECENT NEWS TO INCORPORATE:
${externalNews.map((n, i) => `${i+1}. ${n.title}: ${n.snippet}`).join('\n')}

Add new exchanges that reference this news. BULL should highlight positive news, BEAR should cite concerning news.

Return ONLY a JSON array of the NEW exchanges to add (not the full script):
[
  { "speaker": "BULL", "text": "...", "duration_estimate": 5, "visual_evidence": "Recent News" },
  { "speaker": "BEAR", "text": "...", "duration_estimate": 5, "visual_evidence": "Market Headlines" }
]`;

    const response = await client.messages.create({
      model: DEBATE_MODEL,
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: enhancePrompt }]
    });

    const responseText = response.content[0].text.trim();
    
    let newExchanges;
    try {
      newExchanges = JSON.parse(responseText);
    } catch {
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        newExchanges = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse enhancement response');
      }
    }

    // Calculate new IDs and timestamps
    const lastItem = debateScript[debateScript.length - 1];
    let currentTime = lastItem?.end || 0;
    let currentId = lastItem?.id || debateScript.length;

    const enhancedNewExchanges = newExchanges.map((line) => {
      currentId++;
      const duration = line.duration_estimate || estimateDuration(line.text || '');
      const enhanced = {
        id: currentId,
        speaker: (line.speaker || '').toLowerCase() === 'bull' ? 'bull' : 'bear',
        text: line.text,
        duration_estimate: duration,
        start: currentTime,
        end: currentTime + duration,
        visual_evidence: line.visual_evidence || 'News Update'
      };
      currentTime += duration;
      return enhanced;
    });

    // Merge scripts
    const mergedScript = [...debateScript, ...enhancedNewExchanges];

    res.json({
      script: mergedScript,
      enhanced: true,
      addedExchanges: enhancedNewExchanges.length,
      newsContext: externalNews
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

/**
 * POST /api/debate/regenerate
 * Regenerate specific parts of the debate or add focus areas
 */
router.post('/regenerate', async (req, res, next) => {
  try {
    const { harvestedData, focusTopics, tone, targetDuration } = req.body;

    if (!harvestedData) {
      return res.status(400).json({
        error: 'harvestedData is required',
        code: 'INVALID_INPUT'
      });
    }

    const { meta, content } = harvestedData;
    const client = getAnthropicClient();

    // Custom regeneration with user preferences
    const focusSection = focusTopics?.length > 0
      ? `\nFOCUS AREAS (emphasize these topics):\n${focusTopics.map(t => `- ${t}`).join('\n')}`
      : '';

    const toneDirection = tone === 'bullish' 
      ? '\nTONE: Lean slightly more optimistic, but keep it balanced.'
      : tone === 'bearish'
      ? '\nTONE: Lean slightly more skeptical, but keep it balanced.'
      : '';

    const durationDirection = targetDuration
      ? `\nTARGET DURATION: Aim for approximately ${targetDuration} seconds total (~${Math.round(targetDuration / 6)} exchanges).`
      : '\nTARGET DURATION: Aim for approximately 2 minutes (~10 exchanges).';

    const customPrompt = `Create a debate script for ${meta.company} (${meta.ticker}).

${content.management_discussion}

${content.risk_factors}

${content.key_financials}${focusSection}${toneDirection}${durationDirection}

Return ONLY a JSON array:
[{ "speaker": "BULL"|"BEAR", "text": "...", "duration_estimate": N, "visual_evidence": "..." }]`;

    const response = await client.messages.create({
      model: DEBATE_MODEL,
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: customPrompt }]
    });

    const responseText = response.content[0].text.trim();
    
    let debateScript;
    try {
      debateScript = JSON.parse(responseText);
    } catch {
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      debateScript = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    }

    // Process script
    let currentTime = 0;
    const enhancedScript = debateScript.map((line, index) => {
      const duration = line.duration_estimate || estimateDuration(line.text || '');
      const enhanced = {
        id: index + 1,
        speaker: (line.speaker || '').toLowerCase() === 'bull' ? 'bull' : 'bear',
        text: line.text,
        duration_estimate: duration,
        start: currentTime,
        end: currentTime + duration,
        visual_evidence: line.visual_evidence || null
      };
      currentTime += duration;
      return enhanced;
    });

    res.json({
      meta: {
        ticker: meta.ticker,
        company: meta.company,
        lineCount: enhancedScript.length,
        totalDuration: currentTime,
        focusTopics,
        tone,
        model: DEBATE_MODEL
      },
      script: enhancedScript
    });

  } catch (error) {
    console.error('[Debate] Regenerate error:', error);
    next({
      status: 500,
      message: error.message,
      code: 'REGENERATION_FAILED'
    });
  }
});

export default router;
