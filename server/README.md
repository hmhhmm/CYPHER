# CYPHER Backend Server

Express.js API server for the CYPHER financial analysis platform. It powers:
- SEC filing search/harvest, news enrichment, and Claude-based analysis
- Bull vs Bear debate scripts + optional audio synthesis
- Daily Broadcast script + audio for narrated summaries
- PDF report generation (Anthropic + PDFKit)

## Quick Start

1. **Install dependencies**:
   ```bash
   cd server
   npm install
   ```

2. **Configure environment variables** (create `server/.env`):
   ```env
   PORT=3001
   ANTHROPIC_API_KEY=sk-ant-...
   ASSEMBLYAI_API_KEY=...
   ELEVENLABS_API_KEY=...
   APIFY_API_TOKEN=...
   CONVEX_URL=https://your-project.convex.cloud   # optional; REST flow works without Convex
   ```
   - Do **not** commit `.env`.
   - Restart the server after changing keys.

3. **Start the server** (from repo root):
   ```bash
   npm run dev
   ```

## What This Project Does
- **SEC Filing Intake**: Search, fetch, and parse 10-K/10-Q/8-K to structured `harvestedData`.
- **Analysis & Debate**: Claude generates investment summaries plus balanced bull/bear debate scripts.
- **Audio**: ElevenLabs voices for debate; narrated “Daily Broadcast” via broadcast endpoints.
- **Reports**: PDF report generation (Anthropic formatting + PDFKit) with data URLs.
- **Pipelines**: REST-only flow (Convex optional/disabled by default).

## Key Benefits
- **Fast onboarding**: Single `npm run dev` to bring up the API.
- **All REST**: No Convex required; works with plain HTTP + env keys.
- **Resilient**: Graceful fallbacks when audio quotas are exceeded.
- **Shareable outputs**: PDF data URLs and audio URLs for immediate UI display.
- **Modular**: Routes separated by concern (`pdf`, `debate`, `broadcast`, `audio`, `analysis`).

## API Endpoints

### Health Check
- `GET /api/health` - Server status

### Audio Transcription
- `POST /api/transcribe` - Upload audio file for transcription
- `POST /api/transcribe/url` - Transcribe from URL

### Intent Extraction
- `POST /api/intent/extract` - Extract company/ticker from text
- `POST /api/intent/validate` - Validate a ticker symbol
- `GET /api/intent/tickers` - Search tickers

### PDF Processing
- `POST /api/pdf/search` - Search for SEC filings
- `POST /api/pdf/harvest` - Download and extract data from PDF
- `POST /api/pdf/parse` - Parse PDF to raw text

### Debate Generation
- `POST /api/debate/generate` - Generate Bull vs Bear script
- `POST /api/debate/enhance` - Add news context

### Audio & Broadcast
- `POST /api/audio/synthesize` - Generate full debate audio
- `POST /api/audio/synthesize-line` - Generate single line
- `GET /api/audio/voices` - List available voices
- `POST /api/broadcast/generate-script` - Generate narrated Daily Broadcast script
- `POST /api/broadcast/synthesize` - Generate audio for broadcast script

## Getting API Keys

### Anthropic Claude
1. Go to https://console.anthropic.com
2. Create an API key
3. Set `ANTHROPIC_API_KEY` in .env

### AssemblyAI
1. Go to https://www.assemblyai.com
2. Sign up and get API key
3. Set `ASSEMBLYAI_API_KEY` in .env

### ElevenLabs
1. Go to https://elevenlabs.io
2. Sign up and get API key
3. Set `ELEVENLABS_API_KEY` in .env

### Apify
1. Go to https://apify.com
2. Sign up and get API token
3. Set `APIFY_API_TOKEN` in .env

### Convex
1. Go to https://convex.dev
2. Create a project
3. Run `npx convex dev` to get the URL
4. Set `CONVEX_URL` in .env

## Notes
- ElevenLabs: if you hit quota, audio will fail; update the key and restart the server.
- Frontend: set `VITE_API_URL=http://localhost:3001` in `./.env`.
- Convex: optional; REST flow works without Convex. Leave `CONVEX_URL` empty if unused.