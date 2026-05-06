"""
AI Developer Workflow Demo — FastAPI Backend
Sandbox mode: uses mock GitHub, JIRA, and CI/CD data.
Connects to OpenAI GPT-4o for real AI features.
"""

import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from openai import OpenAI
from data.sandbox import (
    SANDBOX_PRS, SANDBOX_STORIES, SANDBOX_PIPELINES, get_dashboard_summary
)

load_dotenv()

app = FastAPI(title="AI Workflow Demo API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
MODEL = "gpt-4o"

# ─── Helpers ─────────────────────────────────────────────────────────────────

def chat(system: str, user: str) -> str:
    """Call OpenAI with a system + user prompt."""
    resp = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": system},
            {"role": "user",   "content": user},
        ],
        temperature=0.4,
    )
    return resp.choices[0].message.content.strip()

# ─── Dashboard ───────────────────────────────────────────────────────────────

@app.get("/api/dashboard")
def get_dashboard():
    return get_dashboard_summary()

# ─── GitHub / PR Endpoints ────────────────────────────────────────────────────

@app.get("/api/github/prs")
def list_prs():
    return SANDBOX_PRS

@app.get("/api/github/prs/{pr_id}")
def get_pr(pr_id: int):
    pr = next((p for p in SANDBOX_PRS if p["id"] == pr_id), None)
    if not pr:
        raise HTTPException(status_code=404, detail="PR not found")
    return pr

@app.post("/api/github/prs/{pr_id}/generate-description")
def generate_pr_description(pr_id: int):
    pr = next((p for p in SANDBOX_PRS if p["id"] == pr_id), None)
    if not pr:
        raise HTTPException(status_code=404, detail="PR not found")

    system = """You are an expert software engineer writing professional GitHub Pull Request descriptions.
Output a clean, structured PR description in Markdown with these sections:
## Summary
## Changes Made
## Testing Done
## Linked Story
## Notes (optional)
Be concise, specific, and technical. Focus on the WHY not just the WHAT."""

    user = f"""Generate a PR description for this pull request:

Title: {pr['title']}
Branch: {pr['branch']} → {pr['base']}
Changed files: {', '.join(pr['file_list'])}
Additions: +{pr['additions']} lines | Deletions: -{pr['deletions']} lines
JIRA Story: {pr['jira_story']}

Code Diff:
{pr['diff'][:3000]}"""

    result = chat(system, user)
    return {"description": result, "pr_number": pr["number"]}


@app.post("/api/github/prs/{pr_id}/review")
def ai_code_review(pr_id: int):
    pr = next((p for p in SANDBOX_PRS if p["id"] == pr_id), None)
    if not pr:
        raise HTTPException(status_code=404, detail="PR not found")

    system = """You are a senior software engineer performing a thorough code review.
Analyze the diff and provide feedback in this exact JSON structure:
{
  "summary": "one line overall assessment",
  "verdict": "APPROVE | REQUEST_CHANGES | COMMENT",
  "score": 1-10,
  "issues": [
    {"severity": "critical|major|minor|suggestion", "file": "filename", "description": "what the issue is", "suggestion": "how to fix it"}
  ],
  "positives": ["list of good things about this code"],
  "suggested_reviewers_reason": "brief note on who should review based on file types"
}
Return ONLY valid JSON, no markdown fences."""

    user = f"""Review this pull request:

Title: {pr['title']}
Files changed: {', '.join(pr['file_list'])}
PR Size: {pr['size']} (+{pr['additions']} / -{pr['deletions']})

Diff:
{pr['diff'][:3500]}"""

    result = chat(system, user)

    import json
    try:
        review_data = json.loads(result)
    except Exception:
        review_data = {"summary": result, "verdict": "COMMENT", "score": 7, "issues": [], "positives": []}

    return {"review": review_data, "pr_number": pr["number"]}


@app.post("/api/github/prs/{pr_id}/suggest-reviewers")
def suggest_reviewers(pr_id: int):
    pr = next((p for p in SANDBOX_PRS if p["id"] == pr_id), None)
    if not pr:
        raise HTTPException(status_code=404, detail="PR not found")

    system = "You are a tech lead assigning PR reviewers. Return a JSON object with 'reviewers' (array of {name, reason}) and 'labels' (array of strings). Return ONLY valid JSON."

    user = f"""Suggest reviewers and labels for this PR:
Title: {pr['title']}
Files: {', '.join(pr['file_list'])}
Branch: {pr['branch']}
Size: {pr['size']} (additions: {pr['additions']}, deletions: {pr['deletions']})
Existing labels: {pr['labels']}"""

    result = chat(system, user)
    import json
    try:
        data = json.loads(result)
    except Exception:
        data = {"reviewers": [], "labels": pr["labels"]}
    return data


# ─── JIRA Endpoints ───────────────────────────────────────────────────────────

@app.get("/api/jira/stories")
def list_stories():
    return SANDBOX_STORIES

@app.get("/api/jira/stories/{story_id}")
def get_story(story_id: str):
    story = next((s for s in SANDBOX_STORIES if s["id"] == story_id), None)
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    return story

@app.post("/api/jira/briefing")
def generate_daily_briefing():
    active_stories = [s for s in SANDBOX_STORIES if s["status"] not in ["Done"]]
    done_stories   = [s for s in SANDBOX_STORIES if s["status"] == "Done"]
    risk_stories   = [s for s in SANDBOX_STORIES if s.get("sprint_risk")]

    stories_text = "\n".join([
        f"- [{s['id']}] {s['title']} | Status: {s['status']} | Priority: {s['priority']} | Points: {s['points']}"
        for s in active_stories
    ])

    system = """You are an AI assistant helping a senior full-stack developer start their day.
Generate a friendly, concise daily briefing in plain text (no excessive markdown) covering:
1. Good morning greeting
2. Quick summary of the day ahead
3. Today's priority items (ordered by urgency)
4. Any blockers or risks to call out
5. A motivational closing line
Keep it under 200 words. Be conversational, not robotic."""

    user = f"""Today is Monday. Developer: Milon (Full-Stack Developer)

Active JIRA stories in Sprint 24:
{stories_text}

Recently completed: {', '.join([s['id'] for s in done_stories])}
Sprint risk items: {', '.join([s['id'] for s in risk_stories]) or 'None'}
Open PRs awaiting review: PR #142 (PROJ-142), PR #140 (PROJ-140)
Failed build: PR #145 needs attention"""

    result = chat(system, user)
    return {"briefing": result, "story_count": len(active_stories), "risk_count": len(risk_stories)}


@app.post("/api/jira/standup")
def generate_standup():
    yesterday = [s for s in SANDBOX_STORIES if s["status"] in ["In Review", "Done"]]
    today     = [s for s in SANDBOX_STORIES if s["status"] in ["In Progress", "To Do"]]

    system = """You are helping a developer write their daily standup update.
Format:
**Yesterday:** [what was done]
**Today:** [what will be worked on]
**Blockers:** [any blockers, or 'None']

Keep it concise (3-5 lines total). Use past tense for yesterday, future/present for today."""

    user = f"""Generate a standup based on:

Yesterday's work (In Review / Done):
{chr(10).join([f"- {s['id']}: {s['title']} ({s['status']})" for s in yesterday])}

Today's plan (In Progress / To Do):
{chr(10).join([f"- {s['id']}: {s['title']} ({s['status']})" for s in today])}

PRs raised: PR #142 (pagination), PR #145 (dashboard widget - draft)
CI fix needed: PR #145 build failing"""

    result = chat(system, user)
    return {"standup": result}


@app.post("/api/jira/stories/{story_id}/summarize")
def summarize_story(story_id: str):
    story = next((s for s in SANDBOX_STORIES if s["id"] == story_id), None)
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")

    comments_text = "\n".join([f"{c['author']} ({c['time']}): {c['text']}" for c in story.get("comments", [])])

    system = "You are a developer assistant. Summarize this JIRA story in 3 bullet points: context, key requirement, and current state. Be concise."

    user = f"""Story: {story['id']} — {story['title']}
Status: {story['status']} | Priority: {story['priority']} | Points: {story['points']}
Description: {story['description']}
Comments:
{comments_text or 'No comments yet'}"""

    result = chat(system, user)
    return {"summary": result, "story_id": story_id}


# ─── CI/CD Endpoints ─────────────────────────────────────────────────────────

@app.get("/api/cicd/pipelines")
def list_pipelines():
    return SANDBOX_PIPELINES

@app.get("/api/cicd/pipelines/{build_id}")
def get_pipeline(build_id: str):
    build = next((b for b in SANDBOX_PIPELINES if b["id"] == build_id), None)
    if not build:
        raise HTTPException(status_code=404, detail="Build not found")
    return build

@app.post("/api/cicd/pipelines/{build_id}/analyze")
def analyze_build(build_id: str):
    build = next((b for b in SANDBOX_PIPELINES if b["id"] == build_id), None)
    if not build:
        raise HTTPException(status_code=404, detail="Build not found")

    system = """You are a CI/CD expert analyzing a build failure.
Return a JSON object with:
{
  "root_cause": "one-sentence plain English explanation",
  "category": "code_bug | flaky_test | dependency_issue | environment | config_error",
  "confidence": "high | medium | low",
  "failing_location": "file:line or stage name",
  "fix_suggestion": "specific, actionable fix in 2-3 sentences",
  "is_flaky": true/false,
  "estimated_fix_time": "5 min | 15 min | 30 min | 1 hour"
}
Return ONLY valid JSON."""

    user = f"""Analyze this CI/CD build failure:

Build: {build['id']}
Branch: {build['branch']}
Trigger: {build['trigger']}
Failed stage: {next((s['name'] for s in build['stages'] if s['status'] == 'failed'), 'Unknown')}
Test results: {build['test_summary']['passed']} passed, {build['test_summary']['failed']} failed

Build log:
{build['log_snippet']}"""

    result = chat(system, user)
    import json
    try:
        analysis = json.loads(result)
    except Exception:
        analysis = {"root_cause": result, "category": "unknown", "confidence": "medium", "fix_suggestion": result}

    return {"analysis": analysis, "build_id": build_id, "status": build["status"]}


# ─── Health Check ─────────────────────────────────────────────────────────────

@app.get("/api/health")
def health_check():
    api_key_set = bool(os.getenv("OPENAI_API_KEY"))
    return {
        "status": "ok",
        "mode": "sandbox",
        "openai_configured": api_key_set,
        "model": MODEL,
        "data": {
            "prs": len(SANDBOX_PRS),
            "stories": len(SANDBOX_STORIES),
            "pipelines": len(SANDBOX_PIPELINES),
        }
    }
