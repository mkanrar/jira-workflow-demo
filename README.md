
# jira-workflow-demo
Its a demo to show the higher management to manage Jira, git, CI/CD all in a single page with sandbox api
=======
# AI Developer Workflow Demo

> **POC for AI-Assisted Developer Automation** — GitHub PRs · JIRA Stories · CI/CD Pipelines

Built with **Python FastAPI** + **React + Tailwind CSS** + **OpenAI GPT-4o**

---

## What This Demo Does

| Module | AI Features |
|---|---|
| **Dashboard** | Live stats: open PRs, build pass rate, sprint progress, activity feed |
| **Pull Requests** | AI-generated PR descriptions · AI code review with severity scoring · Reviewer suggestions |
| **JIRA Stories** | Kanban board · Daily morning briefing · Standup auto-draft · Story summarizer |
| **CI/CD Pipelines** | Build status tracker · AI failure root-cause analysis · Fix suggestions |

All AI actions are **human-in-the-loop** — AI suggests, you approve.

---

## Prerequisites

- Python 3.10+
- Node.js 18+
- An **OpenAI API key** → https://platform.openai.com/api-keys

---

## Quick Start (Windows)

```
1. Double-click  start.bat
2. It will create backend\.env — open it and paste your OpenAI key
3. Re-run start.bat
4. Browser opens at http://localhost:5173
```

---

## Manual Setup

### Backend (FastAPI)

```bash
cd backend

# 1. Copy env file and add your key
copy .env.example .env
# Edit .env → set OPENAI_API_KEY=sk-...

# 2. Install dependencies
pip install -r requirements.txt

# 3. Start server
uvicorn main:app --reload --port 8000
# API running at http://localhost:8000
# Swagger docs at http://localhost:8000/docs
```

### Frontend (React + Vite)

```bash
cd frontend

npm install
npm run dev
# Opens at http://localhost:5173
```

---

## Project Structure

```
ai-workflow-demo/
├── backend/
│   ├── main.py              ← FastAPI routes + OpenAI calls
│   ├── requirements.txt
│   ├── .env.example         ← Copy to .env, add your key
│   └── data/
│       └── sandbox.py       ← All mock GitHub/JIRA/CI data
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx          ← Main layout + tab navigation
│   │   ├── api/client.js    ← All API call functions
│   │   └── components/
│   │       ├── Dashboard.jsx   ← Overview stats + activity feed
│   │       ├── PRModule.jsx    ← PR list + AI review + description
│   │       ├── JIRAModule.jsx  ← Sprint board + briefing + standup
│   │       └── CICDModule.jsx  ← Pipeline status + failure analysis
│   └── vite.config.js       ← Proxies /api → localhost:8000
│
├── start.bat                ← One-click start (Windows)
└── README.md
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard` | Overview stats + activity |
| GET | `/api/github/prs` | List all sandbox PRs |
| POST | `/api/github/prs/{id}/generate-description` | AI-generated PR description |
| POST | `/api/github/prs/{id}/review` | AI code review |
| POST | `/api/github/prs/{id}/suggest-reviewers` | Reviewer + label suggestions |
| GET | `/api/jira/stories` | List JIRA stories |
| POST | `/api/jira/briefing` | Daily morning briefing |
| POST | `/api/jira/standup` | Standup draft |
| POST | `/api/jira/stories/{id}/summarize` | Summarize a story |
| GET | `/api/cicd/pipelines` | List CI/CD pipelines |
| POST | `/api/cicd/pipelines/{id}/analyze` | Analyze a failed build |

Interactive API docs: **http://localhost:8000/docs**

---

## Connecting Real APIs (Next Step)

After POC approval, replace sandbox data with real calls:

| Platform | SDK / Docs |
|---|---|
| GitHub | `PyGithub` or GitHub REST API v3 |
| JIRA | `jira` Python library or Atlassian REST API v3 |
| CI/CD | GitHub Actions API / Jenkins API / Azure DevOps REST |

Each is a drop-in replacement in `backend/data/sandbox.py` — the routes stay the same.

---

## Tech Stack

- **Backend**: Python 3.10 · FastAPI · Uvicorn · OpenAI SDK · python-dotenv
- **Frontend**: React 18 · Vite · Tailwind CSS 3 · Axios · react-markdown · Lucide Icons
- **AI**: OpenAI GPT-4o (via API)

---

*Prepared by Milon — AI Workflow POC v1.0*
