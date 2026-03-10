# 🧠 CodeThinker

> AI coding assistant with chain-of-thought, 6 modes, WebLLM local inference & multi-model fallback.

[![MIT License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Live Demo](https://img.shields.io/badge/demo-godlocal.ai%2Fcodethinker-blue)](https://godlocal.ai/codethinker)
[![Built with Next.js](https://img.shields.io/badge/built%20with-Next.js%2014-black)](https://nextjs.org)

## ✨ Features

- **6 Thinking Modes** — `vibe` · `debug` · `refactor` · `architect` · `explain` · `search`
- **Chain-of-Thought Streaming** — watch the AI reason step-by-step in real time
- **Local AI (WebLLM)** — run `Qwen2.5-1.5B` fully in-browser via WebGPU, zero data leaves your machine
- **Multi-Model Fallback** — Groq (llama-3.3-70b) → Groq fallbacks → DeepSeek V3 → optional GPT-4o
- **Real-Time Tool Use** — `web_search` (Tavily), `crypto_price` (CoinGecko), `get_datetime` with parallel execution
- **Voice Input & Vision** — paste screenshots, speak your prompts
- **Chat Persistence** — sessions saved to Supabase, full history in UI

## 🚀 Quick Start

```bash
git clone https://github.com/GodLocal2026/codethinker.git
cd codethinker
npm install
cp .env.example .env.local
# Fill in your API keys in .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 🏗️ Architecture

```
codethinker/
├── app/                    # Next.js 14 App Router
│   ├── api/
│   │   ├── chat/           # Main inference endpoint
│   │   └── tools/          # Tool-use handlers
│   └── page.tsx            # Main UI
├── components/
│   ├── CodeThinker.tsx     # Core chat component
│   ├── ModeSelector.tsx    # 6-mode switcher
│   ├── ThinkingSteps.tsx   # CoT streaming display
│   └── LocalAIToggle.tsx   # CLOUD/LOCAL switch
├── lib/
│   ├── providers/          # AI provider clients
│   ├── tools/              # Tool definitions
│   └── webllm/             # WebLLM/WebGPU integration
└── types/
```

## 🔧 Environment Variables

```env
# Required
GROQ_API_KEY=your_groq_key

# Optional (for tool-use web search)
TAVILY_API_KEY=your_tavily_key

# Optional (for chat persistence)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key

# Optional (users can provide their own key in Settings)
OPENAI_API_KEY=

# Optional (emergency fallback)
DEEPSEEK_API_KEY=
```

## 🤖 AI Models

| Priority | Provider | Model | Notes |
|----------|----------|-------|-------|
| 1 | Groq | llama-3.3-70b-versatile | Primary |
| 2 | Groq | llama-3.1-8b-instant | Fallback |
| 3 | Groq | gemma2-9b-it | Fallback |
| 4 | DeepSeek | deepseek-chat (V3) | Emergency fallback |
| 5 | OpenAI | gpt-4o | User-provided key |
| 6 | WebLLM | Qwen2.5-1.5B | 100% local, WebGPU |

## 🛠️ Modes

| Mode | Icon | Purpose |
|------|------|---------|
| `vibe` | ✨ | Creative coding, ideas |
| `debug` | 🐛 | Find and fix bugs |
| `refactor` | 🔧 | Clean up and optimize code |
| `architect` | 🏛️ | System design, structure |
| `explain` | 📖 | Understand code |
| `search` | 🌐 | Web search + code answers |

## 🤝 Contributing

PRs welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

1. Fork the repo
2. Create your branch (`git checkout -b feat/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feat/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT © [GodLocal](https://godlocal.ai)

---

<p align="center">
  <a href="https://godlocal.ai/codethinker">🌐 Live Demo</a> ·
  <a href="https://github.com/GodLocal2026/codethinker/issues">🐛 Report Bug</a> ·
  <a href="https://github.com/GodLocal2026/codethinker/issues">💡 Request Feature</a>
</p>