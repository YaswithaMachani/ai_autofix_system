# AI Autofix System

Automatic bug fixing: read `logs/error.log` → OpenAI fix → safe overwrite → retest → `autofix/*` PR (never `main`).

## Layout

```
ai-autofix-system/
├── .github/
│   └── workflows/
│       └── ci.yml                 # PR tests, lint, n8n webhook on failure
├── logs/
│   ├── .gitkeep
│   ├── error.log                  # Failure output for AI (generated)
│   ├── pipeline.log               # Step-by-step audit (generated)
│   └── autofix-YYYY-MM-DD.log     # Winston daily rotate (generated)
├── n8n/
│   └── workflows/
│       └── autofix-pipeline.json  # Legacy copy — prefer workflows/
├── workflows/
│   └── autofix-pipeline.json      # n8n import (canonical)
├── sandbox/
│   ├── Dockerfile                 # Isolated test image
│   └── entrypoint.sh              # npm install + test + lint in container
├── scripts/                       # CLI entry points
│   ├── logger.js
│   ├── openai.js
│   ├── github.js
│   ├── retry.js
│   ├── monitor.js
│   ├── autofix.js
│   └── sandbox.js
├── src/                           # Core modules + Express API
│   ├── index.js                   # API server (orchestrator)
│   ├── autofix/
│   │   └── runner.js              # Delegates to scripts/autofix.js
│   ├── config/
│   │   └── index.js
│   ├── github/
│   │   └── automation.js
│   ├── logger/
│   │   └── index.js
│   ├── monitor/
│   │   └── processMonitor.js
│   ├── notifications/
│   │   └── discord.js
│   ├── openai/
│   │   ├── client.js
│   │   └── promptManager.js       # Legacy JSON prompt (scripts/openai.js is primary)
│   ├── parser/
│   │   └── errorParser.js
│   ├── retry/
│   │   └── retryLoop.js
│   ├── rollback/
│   │   └── backupManager.js
│   ├── sandbox/
│   │   ├── dockerRunner.js        # Used by scripts/sandbox.js
│   │   └── entrypoint.js
│   ├── security/
│   │   ├── fileGuard.js
│   │   └── shellGuard.js
│   └── validator/
│       └── testRunner.js
├── sample-app/                    # Intentionally buggy Express app
│   ├── index.js
│   ├── lib/
│   │   └── log.js
│   ├── utils/
│   │   └── math.js
│   ├── services/
│   │   ├── userService.js
│   │   └── apiClient.js
│   ├── fixed-reference/           # Example fixes (not used at runtime)
│   │   └── math.fixed.js
│   └── __tests__/
│       ├── math.test.js
│       ├── userService.test.js
│       └── apiClient.test.js
├── tests/                         # Core unit tests
│   ├── openai-pipeline.test.js
│   ├── parser.test.js
│   ├── promptManager.test.js
│   └── security.test.js
├── .autofix-backups/              # Rollback snapshots (generated, gitignored)
├── .env.example
├── .eslintrc.cjs
├── .gitignore
├── docker-compose.yml
├── Dockerfile                     # Orchestrator image
├── Dockerfile.api                 # Optional API-only image
├── jest.config.js
├── package.json
└── README.md
```

## OpenAI pipeline

1. **Read** `logs/error.log`
2. **Parse** stack trace → primary affected file
3. **Read** file content (allowlisted paths only)
4. **Prompt** with logs + path + code → **Return ONLY corrected code**
5. **Overwrite** via `fileGuard`
6. **Rerun** Jest + ESLint
7. **Log** each step to `logs/pipeline.log`

## CI/CD flow

```
Developer Push → GitHub Actions (test + lint)
       ↓ fail
n8n Webhook → Orchestrator /api/n8n/webhook
       ↓
AI reads logs/error.log → fixes code
       ↓
Tests rerun
       ↓ pass → autofix/* branch + PR
       ↓ fail → Discord alert
```

**Production branches (`main`, `master`) are never modified by AI.** Only `autofix/*` branches.

---

## 🧠 How It Works — Plain English Guide

> Think of this system as a **self-healing robot** for your code. When your code breaks, instead of you manually finding and fixing the bug, the AI does it for you — automatically.

### Roles in the System

| Role | What does it |
|---|---|
| 👷 Quality Checker | `npm run monitor` — runs your tests |
| 🤖 AI Engineer | OpenAI / Groq — reads the error and fixes the code |
| 🛡️ Safety Officer | Rollback system — undoes bad fixes |
| 📣 Alarm System | Discord — alerts you if AI couldn't fix it |

### Full Flow in Simple Terms

```
YOUR CODE BREAKS
      ↓
System runs tests → FAIL ❌
      ↓
Error details saved to logs/error.log
      ↓
AI reads the log → "Oh, this line has a bug"
      ↓
AI reads the broken file → rewrites it
      ↓
Tests run again → PASS ✅?
      ↓
YES → Opens a GitHub PR for you to review & merge
NO  → Tries again (up to 3 times)
        Still failing? → Puts the original file back + sends Discord alert
```

### What Each Command Does

| Command | What it does | Think of it as |
|---|---|---|
| `npm run monitor` | Runs tests → writes failures to `logs/error.log` | "Run the quality check" |
| `npm run autofix` | AI reads error → fixes code → reruns tests → opens PR | "AI, please fix the bug" |
| `npm start` | Starts Express API on port 3847 for remote triggers | "Start the control panel" |
| `npm test` | Runs just the test suite | "Just check if it works" |

### Safety Features

| Feature | What it does |
|---|---|
| 💾 **Backup before edit** | Always saves original file before AI touches it |
| 🔁 **3 retry attempts** | Tries 3 times before giving up |
| ♻️ **Auto rollback** | If all 3 attempts fail, restores the original file |
| 🚫 **Never touches `main`** | AI only creates `autofix/*` branches, never commits to main |
| 🛡️ **File allowlist** | AI can only edit files inside allowed paths (default: `sample-app/`) |
| 📣 **Discord alerts** | Notifies you when human intervention is needed |

---

## Setup

```bash
cp .env.example .env
npm install
```

| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | API key (OpenAI or Groq) |
| `AI_BASE_URL` | Provider endpoint (e.g. `https://api.groq.com/openai/v1`) |
| `OPENAI_MODEL` | Model id (e.g. `llama-3.3-70b-versatile` on Groq) |
| `GITHUB_TOKEN` | Push + PR |
| `DISCORD_WEBHOOK_URL` | Failure alerts |
| `N8N_WEBHOOK_URL` | GitHub Actions → n8n |
| `API_SECRET` | Secure API/webhooks |
| `ALLOWED_EDIT_PATHS` | Writable dirs (default `sample-app`) |

## Commands

| Command | Description |
|---------|-------------|
| `npm run monitor` | Tests + runtime check → `logs/error.log` |
| `npm run autofix` | Full AI pipeline |
| `npm run sandbox` | Docker isolated `npm install` + `npm test` |
| `npm start` | Express API (`:3847`) |

## Docker

```bash
# Isolated tests (repo mounted read-only at /repo)
npm run sandbox

# API orchestrator
docker compose --profile orchestrator up orchestrator
```

## n8n

Import `workflows/autofix-pipeline.json` (or the duplicate under `n8n/workflows/`):

1. GitHub trigger  
2. Pull repository  
3. Run tests (`POST /api/ci/run-tests`)  
4. Detect failure  
5. Call bug-fix (`POST /api/autofix/run`)  
6. Rerun tests  
7–8. Push + PR (handled in autofix script; nodes verify)  
9. Discord notification  

Set `ORCHESTRATOR_URL`, `API_SECRET`, `DISCORD_WEBHOOK_URL` in n8n.

## GitHub Actions

`.github/workflows/ci.yml` runs on PRs:

- `npm run lint`
- `npm test`
- On failure: `POST` to `N8N_WEBHOOK_URL` (repository secret)

Enable branch protection on `main` to **block merge** when CI fails.

## License

MIT
