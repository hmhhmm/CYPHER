# CYPHER Backend Server

Express.js API server for the CYPHER financial analysis platform.

## Quick Start

1. **Install dependencies**:
   ```bash
   cd server
   npm install
   ```

2. **Configure environment variables**:
   Create a `.env` file in the server directory:
   ```env
   PORT=3001
   ANTHROPIC_API_KEY=sk-ant-...
   ASSEMBLYAI_API_KEY=...
   ELEVENLABS_API_KEY=...
   APIFY_API_TOKEN=...
   CONVEX_URL=https://your-project.convex.cloud
   ```

3. **Start the server**:
   ```bash
   npm run dev
   ```

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

### Audio Synthesis
- `POST /api/audio/synthesize` - Generate full debate audio
- `POST /api/audio/synthesize-line` - Generate single line
- `GET /api/audio/voices` - List available voices

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

## Sample Data

For development without API keys, use the sample data in `data/`:
- `sample-harvested-data.json` - Example HarvestedData for Tesla
- `tickers.json` - List of supported stock tickers


Run 
```bash
   npm run dev
```
Run
```bash
   npx convex dev
```

Run 
```bash
   server/npm run dev
```
https://rapid-warthog-324.convex.cloud