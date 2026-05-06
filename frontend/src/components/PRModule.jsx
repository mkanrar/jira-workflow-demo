import { useState, useEffect } from 'react'
import {
  GitPullRequest, GitMerge, FileCode, Plus, Minus, Bot,
  ChevronDown, ChevronUp, Loader2, CheckCircle, XCircle,
  AlertTriangle, Lightbulb, Star, Users, Tag, RefreshCw
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { getPRs, generatePRDescription, reviewPR, suggestReviewers } from '../api/client.js'

const STATUS = {
  open:   { label: 'Open',   color: 'bg-emerald-500/15 text-emerald-400 border-emerald-700' },
  draft:  { label: 'Draft',  color: 'bg-slate-500/15 text-slate-400 border-slate-600' },
  merged: { label: 'Merged', color: 'bg-violet-500/15 text-violet-400 border-violet-700' },
}
const SIZE = {
  XS: 'bg-emerald-900 text-emerald-300', S: 'bg-blue-900 text-blue-300',
  M: 'bg-amber-900 text-amber-300', L: 'bg-orange-900 text-orange-300',
  XL: 'bg-red-900 text-red-300',
}
const SEVERITY = {
  critical:   { color: 'bg-red-500/15 text-red-400 border-red-700',     icon: XCircle },
  major:      { color: 'bg-orange-500/15 text-orange-400 border-orange-700', icon: AlertTriangle },
  minor:      { color: 'bg-amber-500/15 text-amber-400 border-amber-700',  icon: AlertTriangle },
  suggestion: { color: 'bg-blue-500/15 text-blue-400 border-blue-700',    icon: Lightbulb },
}

function AiBox({ loading, title, children }) {
  if (loading) return (
    <div className="mt-3 rounded-xl border border-blue-900 bg-blue-950/30 p-4">
      <div className="flex items-center gap-2 text-blue-400 text-sm mb-3">
        <Loader2 size={14} className="animate-spin" /> GPT-4o is thinking…
      </div>
      {[100, 80, 90, 65].map((w, i) => (
        <div key={i} className="shimmer rounded h-3 mb-2" style={{ width: `${w}%` }} />
      ))}
    </div>
  )
  return (
    <div className="mt-3 rounded-xl border border-blue-900 bg-blue-950/20 p-4">
      <div className="flex items-center gap-2 text-blue-400 text-xs font-semibold mb-3">
        <Bot size={13} /> {title}
      </div>
      {children}
    </div>
  )
}

function DiffViewer({ diff }) {
  const lines = diff.split('\n')
  return (
    <div className="mt-3 rounded-xl border border-slate-700 overflow-hidden">
      <div className="bg-slate-800 px-3 py-1.5 text-xs text-slate-400 font-semibold">Code Diff</div>
      <div className="bg-slate-950 overflow-auto max-h-72 p-3 text-xs mono">
        {lines.map((line, i) => {
          const cls = line.startsWith('+') && !line.startsWith('+++')
            ? 'diff-add'
            : line.startsWith('-') && !line.startsWith('---')
            ? 'diff-remove'
            : line.startsWith('@@') || line.startsWith('diff')
            ? 'diff-header'
            : 'text-slate-400'
          return <div key={i} className={`${cls} px-1 leading-5`}>{line || ' '}</div>
        })}
      </div>
    </div>
  )
}

function PRCard({ pr }) {
  const [open,        setOpen]        = useState(false)
  const [description, setDescription] = useState(null)
  const [descLoading, setDescLoading] = useState(false)
  const [review,      setReview]      = useState(null)
  const [revLoading,  setRevLoading]  = useState(false)
  const [reviewers,   setReviewers]   = useState(null)
  const [revrsLoading,setRevrsLoading]= useState(false)
  const [activeTab,   setActiveTab]   = useState('diff')

  const runDesc = async () => {
    setDescLoading(true); setActiveTab('description')
    try { const d = await generatePRDescription(pr.id); setDescription(d.description) }
    catch { setDescription('Error calling API. Check your OPENAI_API_KEY in backend/.env') }
    finally { setDescLoading(false) }
  }
  const runReview = async () => {
    setRevLoading(true); setActiveTab('review')
    try { const d = await reviewPR(pr.id); setReview(d.review) }
    catch { setReview({ summary: 'Error calling API.', verdict: 'COMMENT', score: 0, issues: [], positives: [] }) }
    finally { setRevLoading(false) }
  }
  const runReviewers = async () => {
    setRevrsLoading(true); setActiveTab('reviewers')
    try { const d = await suggestReviewers(pr.id); setReviewers(d) }
    catch { setReviewers({ reviewers: [], labels: [] }) }
    finally { setRevrsLoading(false) }
  }

  const s = STATUS[pr.status] || STATUS.open

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition-colors">
      {/* Header row */}
      <div
        className="flex items-start gap-3 p-4 cursor-pointer"
        onClick={() => setOpen(o => !o)}
      >
        <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
          pr.status === 'merged' ? 'bg-violet-900' : pr.status === 'draft' ? 'bg-slate-800' : 'bg-emerald-900'
        }`}>
          {pr.status === 'merged'
            ? <GitMerge size={16} className="text-violet-400" />
            : <GitPullRequest size={16} className={pr.status === 'draft' ? 'text-slate-400' : 'text-emerald-400'} />
          }
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-white text-sm">#{pr.number} {pr.title}</span>
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-slate-500">
            <span>by <span className="text-slate-300">{pr.author}</span></span>
            <span>·</span>
            <span className="font-mono text-slate-400">{pr.branch} → {pr.base}</span>
            <span>·</span>
            <span className="text-slate-400">{pr.jira_story}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${SIZE[pr.size] || SIZE.M}`}>{pr.size}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full border ${s.color}`}>{s.label}</span>
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Plus size={10} className="text-emerald-400" />{pr.additions}
            <Minus size={10} className="text-red-400" />{pr.deletions}
          </div>
          {open ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
        </div>
      </div>

      {/* Expanded body */}
      {open && (
        <div className="border-t border-slate-800 p-4">

          {/* Changed files */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {pr.file_list.map(f => (
              <span key={f} className="flex items-center gap-1 bg-slate-800 text-slate-300 text-xs px-2 py-0.5 rounded font-mono">
                <FileCode size={10} className="text-slate-500" />{f}
              </span>
            ))}
          </div>

          {/* AI action buttons */}
          <div className="flex gap-2 flex-wrap mb-4">
            <button onClick={runDesc}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
              disabled={descLoading}
            >
              {descLoading ? <Loader2 size={12} className="animate-spin" /> : <Bot size={12} />}
              Generate PR Description
            </button>
            <button onClick={runReview}
              className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
              disabled={revLoading}
            >
              {revLoading ? <Loader2 size={12} className="animate-spin" /> : <Star size={12} />}
              AI Code Review
            </button>
            <button onClick={runReviewers}
              className="flex items-center gap-1.5 bg-teal-700 hover:bg-teal-600 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
              disabled={revrsLoading}
            >
              {revrsLoading ? <Loader2 size={12} className="animate-spin" /> : <Users size={12} />}
              Suggest Reviewers
            </button>
          </div>

          {/* Inner tabs */}
          <div className="flex gap-1 mb-3 border-b border-slate-800">
            {[['diff','Diff'],['description','Description'],['review','Review'],['reviewers','Reviewers']].map(([id,label]) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={`text-xs px-3 py-2 border-b-2 transition-colors ${
                  activeTab === id ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >{label}</button>
            ))}
          </div>

          {/* Tab panels */}
          {activeTab === 'diff' && <DiffViewer diff={pr.diff} />}

          {activeTab === 'description' && (
            descLoading
              ? <AiBox loading title="" />
              : description
              ? <AiBox title="GPT-4o Generated PR Description">
                  <div className="ai-output text-sm text-slate-300">
                    <ReactMarkdown>{description}</ReactMarkdown>
                  </div>
                </AiBox>
              : <div className="text-slate-500 text-sm text-center py-6">Click "Generate PR Description" to run AI</div>
          )}

          {activeTab === 'review' && (
            revLoading
              ? <AiBox loading title="" />
              : review
              ? <AiBox title={`GPT-4o Code Review — Score ${review.score}/10`}>
                  {/* Verdict badge */}
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-bold border ${
                      review.verdict === 'APPROVE' ? 'bg-emerald-900 text-emerald-300 border-emerald-700'
                      : review.verdict === 'REQUEST_CHANGES' ? 'bg-red-900 text-red-300 border-red-700'
                      : 'bg-amber-900 text-amber-300 border-amber-700'
                    }`}>{review.verdict}</span>
                    <div className="flex gap-1">
                      {[...Array(10)].map((_,i) => (
                        <div key={i} className={`w-3 h-1.5 rounded-full ${i < review.score ? 'bg-blue-500' : 'bg-slate-700'}`} />
                      ))}
                    </div>
                    <span className="text-slate-400 text-xs">{review.summary}</span>
                  </div>

                  {/* Issues */}
                  {review.issues?.length > 0 && (
                    <div className="space-y-2 mb-3">
                      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Issues Found</div>
                      {review.issues.map((issue, i) => {
                        const sv = SEVERITY[issue.severity] || SEVERITY.suggestion
                        const SIcon = sv.icon
                        return (
                          <div key={i} className={`rounded-lg border p-3 ${sv.color}`}>
                            <div className="flex items-center gap-2 mb-1">
                              <SIcon size={12} />
                              <span className="text-xs font-semibold uppercase">{issue.severity}</span>
                              <span className="text-xs font-mono text-slate-400">{issue.file}</span>
                            </div>
                            <p className="text-xs">{issue.description}</p>
                            {issue.suggestion && <p className="text-xs mt-1 opacity-80">💡 {issue.suggestion}</p>}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Positives */}
                  {review.positives?.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">What's Good</div>
                      <ul className="space-y-1">
                        {review.positives.map((p, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-emerald-300">
                            <CheckCircle size={11} className="mt-0.5 shrink-0" />{p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </AiBox>
              : <div className="text-slate-500 text-sm text-center py-6">Click "AI Code Review" to run AI</div>
          )}

          {activeTab === 'reviewers' && (
            revrsLoading
              ? <AiBox loading title="" />
              : reviewers
              ? <AiBox title="GPT-4o Reviewer & Label Suggestions">
                  <div className="space-y-3">
                    {reviewers.reviewers?.length > 0 && (
                      <div>
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Suggested Reviewers</div>
                        {reviewers.reviewers.map((r, i) => (
                          <div key={i} className="flex items-start gap-2 mb-2">
                            <div className="w-6 h-6 rounded-full bg-blue-900 text-blue-300 text-xs flex items-center justify-center font-bold shrink-0">
                              {(r.name || 'R')[0].toUpperCase()}
                            </div>
                            <div>
                              <div className="text-sm text-white font-medium">{r.name}</div>
                              <div className="text-xs text-slate-400">{r.reason}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {reviewers.labels?.length > 0 && (
                      <div>
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Suggested Labels</div>
                        <div className="flex flex-wrap gap-1.5">
                          {reviewers.labels.map((l, i) => (
                            <span key={i} className="flex items-center gap-1 bg-slate-800 text-slate-300 text-xs px-2 py-0.5 rounded-full border border-slate-700">
                              <Tag size={9} />{l}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </AiBox>
              : <div className="text-slate-500 text-sm text-center py-6">Click "Suggest Reviewers" to run AI</div>
          )}
        </div>
      )}
    </div>
  )
}

export default function PRModule() {
  const [prs,     setPRs]    = useState([])
  const [loading, setLoading]= useState(true)
  const [filter,  setFilter] = useState('all')

  const load = () => {
    setLoading(true)
    getPRs().then(setPRs).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const visible = filter === 'all' ? prs : prs.filter(p => p.status === filter)
  const counts  = { all: prs.length, open: prs.filter(p=>p.status==='open').length, draft: prs.filter(p=>p.status==='draft').length, merged: prs.filter(p=>p.status==='merged').length }

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Pull Requests</h2>
        <button onClick={load} className="flex items-center gap-2 text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 w-fit">
        {[['all','All'],['open','Open'],['draft','Draft'],['merged','Merged']].map(([id, label]) => (
          <button key={id} onClick={() => setFilter(id)}
            className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${filter===id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >{label} <span className="ml-1 opacity-60">{counts[id]}</span></button>
        ))}
      </div>

      {loading
        ? [...Array(3)].map((_,i) => <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl h-20 shimmer" />)
        : visible.map(pr => <PRCard key={pr.id} pr={pr} />)
      }
    </div>
  )
}
