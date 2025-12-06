# CYPHER - Autonomous Institutional Analysis

AI-powered financial analysis platform that generates institutional-grade investment research with Bull vs Bear debates and audio summaries.

## Features

- **SEC Filing Analysis** - Auto-extracts 10-K/10-Q filings with AI insights
- **Bull vs Bear Debate** - AI-generated balanced investment perspectives
- **Daily Broadcast** - Professional audio summaries narrated by AI
- **PDF Reports** - Downloadable comprehensive analysis reports
- **Real-time Data** - Live market integration with TradingView

## Tech Stack

- **Frontend**: React + Vite + Framer Motion + TailwindCSS
- **Backend**: Express.js + Node.js
- **AI**: Claude Sonnet 4 (Anthropic)
- **Audio**: ElevenLabs TTS
- **Data**: Apify (SEC filings), AssemblyAI (transcription)

## Quick Start

### Local Development

1. **Install dependencies**:
```bash
npm install
cd server && npm install && cd ..
```

2. **Configure environment variables**:

Create `server/.env`:
```env
PORT=3001
ANTHROPIC_API_KEY=sk-ant-...
ELEVENLABS_API_KEY=sk_...
APIFY_API_TOKEN=apify_api_...
ASSEMBLYAI_API_KEY=...
```

Create `.env` (frontend):
```env
VITE_API_URL=http://localhost:3001
```

3. **Run development servers**:
```bash
# Terminal 1 - Frontend
npm run dev

# Terminal 2 - Backend
cd server && npm run dev
```

Frontend: http://localhost:5173  
Backend: http://localhost:3001

## Deployment

### Vercel (Frontend + Backend)

The project is configured for Vercel with `vercel.json`.

**Environment Variables** (set in Vercel dashboard):
- `ANTHROPIC_API_KEY`
- `ELEVENLABS_API_KEY`
- `APIFY_API_TOKEN`
- `ASSEMBLYAI_API_KEY`
- `NODE_ENV=production`

**Deploy**:
```bash
git push origin main
```

Vercel will auto-deploy from GitHub.

### Alternative: Split Deployment

**Backend** → Railway/Render (better for Express):
- Deploy `server/` folder
- Set all env variables
- Get deployment URL (e.g., `https://your-app.railway.app`)

**Frontend** → Vercel:
- Set `VITE_API_URL=https://your-app.railway.app`
- Deploy

## API Endpoints

See [server/README.md](server/README.md) for detailed API documentation.

## Project Structure

```
CYPHER/
├── src/                    # Frontend React app
│   ├── components/         # UI components
│   ├── pages/             # Route pages
│   ├── hooks/             # Custom React hooks
│   └── utils/             # API client & helpers
├── server/                # Backend Express API
│   ├── routes/            # API route handlers
│   ├── services/          # External service integrations
│   └── index.js           # Server entry point
├── api/                   # Vercel serverless functions
│   └── server.js          # Backend wrapper for Vercel
└── vercel.json           # Vercel deployment config
```

## License

MIT

