import axios from 'axios'

const api = axios.create({ baseURL: '/api', timeout: 60000 })

// ── Dashboard ──────────────────────────────────────────────────────────────
export const getDashboard   = ()       => api.get('/dashboard').then(r => r.data)
export const getHealth      = ()       => api.get('/health').then(r => r.data)

// ── GitHub / PRs ───────────────────────────────────────────────────────────
export const getPRs               = ()      => api.get('/github/prs').then(r => r.data)
export const getPR                = id      => api.get(`/github/prs/${id}`).then(r => r.data)
export const generatePRDescription = id     => api.post(`/github/prs/${id}/generate-description`).then(r => r.data)
export const reviewPR             = id      => api.post(`/github/prs/${id}/review`).then(r => r.data)
export const suggestReviewers     = id      => api.post(`/github/prs/${id}/suggest-reviewers`).then(r => r.data)

// ── JIRA ───────────────────────────────────────────────────────────────────
export const getStories     = ()       => api.get('/jira/stories').then(r => r.data)
export const getStory       = id       => api.get(`/jira/stories/${id}`).then(r => r.data)
export const getDailyBriefing = ()     => api.post('/jira/briefing').then(r => r.data)
export const getStandup     = ()       => api.post('/jira/standup').then(r => r.data)
export const summarizeStory = id       => api.post(`/jira/stories/${id}/summarize`).then(r => r.data)

// ── CI/CD ──────────────────────────────────────────────────────────────────
export const getPipelines   = ()       => api.get('/cicd/pipelines').then(r => r.data)
export const getPipeline    = id       => api.get(`/cicd/pipelines/${id}`).then(r => r.data)
export const analyzeBuild   = id       => api.post(`/cicd/pipelines/${id}/analyze`).then(r => r.data)
