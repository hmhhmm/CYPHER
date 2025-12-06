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
    const { harvestedData, sessionId, newsArticles } = req.body;

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

    // Fetch news articles from Convex if not provided and sessionId is available
    let newsContext = newsArticles || [];
    if (!newsContext.length && sessionId && convex) {
      try {
        // Try to get news from the analysis session's sourceDocuments
        const analysis = await convex.query(api.analyses.getBySession, { sessionId });
        if (analysis && analysis.sourceDocuments) {
          // Filter for news articles (non-PDF sources or news-type sources)
          newsContext = analysis.sourceDocuments
            .filter(doc => {
              const url = doc.url || '';
              const source = doc.source || '';
              // Identify news articles: not PDFs and from news sources
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
        
        // Also try to get from news table as fallback
        if (!newsContext.length) {
          const newsData = await convex.query(api.news.getByTicker, { ticker: meta.ticker });
          if (newsData && newsData.articles) {
            newsContext = newsData.articles.slice(0, 5); // Limit to 5 most recent
          }
        }
        
        console.log(`[Debate] Found ${newsContext.length} news articles for context`);
      } catch (newsError) {
        console.warn('[Debate] Failed to fetch news context:', newsError);
        // Continue without news - not critical
      }
    }

    const client = getAnthropicClient();

    // Build news context section for prompt
    let newsSection = '';
    if (newsContext.length > 0) {
      newsSection = `

**Recent News Context (for additional market perspective):**
${newsContext.slice(0, 5).map((article, idx) => 
  `${idx + 1}. ${article.title || 'News Article'}\n   ${article.snippet || ''}\n   Source: ${article.source || 'Unknown'}`
).join('\n\n')}`;
    }

    const debatePrompt = `You are a financial debate scriptwriter. Create a compelling Bull vs Bear debate about ${meta.company} (${meta.ticker}) based on their ${meta.report_type} filing${newsContext.length > 0 ? ' and recent news' : ''}.

COMPANY DATA:

**Management's Discussion (Bullish perspective source):**
${content.management_discussion}

**Risk Factors (Bearish perspective source):**
${content.risk_factors}

**Key Financials:**
${content.key_financials}${newsSection}

INSTRUCTIONS:
Create a debate script between BULL (optimistic investor) and BEAR (skeptical investor).
- 8-12 exchanges total
- Each speaker should make substantive points backed by the data${newsContext.length > 0 ? ' and recent news' : ''}
- BULL focuses on growth, opportunities, management's positive outlook${newsContext.length > 0 ? ', and positive news developments' : ''}
- BEAR focuses on risks, challenges, valuation concerns${newsContext.length > 0 ? ', and negative news or market headwinds' : ''}
- Make it conversational but professional
- Include specific numbers and facts from the filing${newsContext.length > 0 ? ' and reference relevant news when appropriate' : ''}
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

