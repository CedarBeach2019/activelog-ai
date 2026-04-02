# ACTIVELOG-AI

> Fitness & Activity AI Tracker — part of the [Cocapn](https://cocapn.ai) ecosystem

![Build](https://img.shields.io/badge/build-passing-brightgreen) ![License](https://img.shields.io/badge/license-MIT-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-24_files-blue) ![Lines](https://img.shields.io/badge/lines-4717-green)

## Description

Fitness & Activity AI Tracker. Part of the Cocapn ecosystem of AI-powered log and analysis tools.

## ✨ Features

- **Workout Logger** — Log strength, cardio, HIIT, flexibility, and sports sessions with exercises, sets, reps, weight, and RPE
- **Nutrition Tracker** — Track meals, macros (protein/carbs/fat), calories, and water intake with daily summaries
- **Recovery Dashboard** — Monitor sleep, soreness, energy, mood; get recovery scores and readiness badges
- **Progress Charts** — Weekly volume, strength progression by exercise, body weight/body fat tracking
- **Fitness Coach Chat** — AI-powered coaching via the log-origin chat pipeline
- **Workout Planner** — Periodized training plans (foundation → volume → intensity → peak → deload)
- **Progressive Overload** — Automatic weight/rep increase suggestions based on training history
- **Streak Tracker** — Current and longest workout streaks, weekly goal progress
- **Deload Detection** — Fatigue analysis from recovery data, training streak, and RPE trends

## 🚀 Quick Start

```bash
git clone https://github.com/Lucineer/activelog-ai.git
cd activelog-ai
npm install
npx wrangler dev
```

## 🤖 Claude Code Integration

Optimized for Claude Code with full agent support:

- **CLAUDE.md** — Complete project context, conventions, and architecture
- **.claude/agents/** — Specialized sub-agents for exploration, architecture, and review
- **.claude/settings.json** — Permissions and plugin configuration

## 🏗️ Architecture

| Component | File | Description |
|-----------|------|-------------|
| Worker | `src/worker.ts` | Cloudflare Worker with inline HTML |
| BYOK | `src/lib/byok.ts` | 7 LLM providers, encrypted keys |
| Health | `/health` | Health check endpoint |
| Setup | `/setup` | BYOK configuration wizard |
| Chat | `/api/chat` | LLM chat endpoint |
| Assets | `/public/*` | KV-served images |

**Zero runtime dependencies.** Pure TypeScript on Cloudflare Workers.

## 🔑 BYOK (Bring Your Own Key)

Supports 7 LLM providers — no vendor lock-in:

- OpenAI (GPT-4, GPT-4o)
- Anthropic (Claude 3.5, Claude 4)
- Google (Gemini Pro, Gemini Flash)
- DeepSeek (Chat, Reasoner)
- Groq (Llama, Mixtral)
- Mistral (Large, Medium)
- OpenRouter (100+ models)

Configuration discovery: URL params → Auth header → Cookie → KV → fail.

## 📦 Deployment

```bash
npx wrangler deploy
```

Requires `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` environment variables.

## 🔗 Links

- 🌐 **Live**: https://activelog-ai.magnus-digennaro.workers.dev
- ❤️ **Health**: https://activelog-ai.magnus-digennaro.workers.dev/health
- ⚙️ **Setup**: https://activelog-ai.magnus-digennaro.workers.dev/setup
- 🧠 **Cocapn**: https://cocapn.ai

## License

MIT — Built with ❤️ by [Superinstance](https://github.com/superinstance) & [Lucineer](https://github.com/Lucineer) (DiGennaro et al.)
