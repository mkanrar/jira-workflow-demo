import { useState, useEffect } from 'react'
import { Layers, Bot, Loader2, AlertTriangle, GitPullRequest,
         Calendar, ChevronDown, ChevronUp, RefreshCw, Send, BookOpen } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { getStories, getDailyBriefing, getStandup, summarizeStory } from '../api/client.js'

const PRIORITY = {
  Critical: 'text-red-400 bg-red-900/30 border-red-800',
  High:     'text-orange-400 bg-orange-900/30 border-orange-800',
  Medium:   'text-amber-400 bg-amber-900/30 border-amber-800',
  Low:      'text-slate-400 bg-slate-800 border-slate-700',
}
const STATUS_COLS = {
  'To Do':       { label: 'To Do',       color: 'border-t-slate-500',   badge: 'bg-slate-700 text-slate-300' },
  'In Progress': { label: 'In Progress', color: 'border-t-blue-500',    badge: 'bg-blue-900 text-blue-300' },
  'In Review':   { label: 'In Review',   color: 'border-t-violet-500',  badge: 'bg-violet-900 text-violet-300' },
  'Done':        { label: 'Done',        color: 'border-t-emerald-500', badge: 'bg-emerald-900 text-emerald-300' },
}
const TYPE_ICON = { Story: '📖', Bug: '🐛', Task: '✅' }

function AiPanel({ loading, children }) {
  if (loading) return (
    <div className="bg-blue-950/30 border border-blue-900 rounded-xl p-4">
      <div className="flex items-center gap-2 text-blue-400 text-sm mb-3">
        <Loader2 size={14} className="animate-spin" /> GPT-4o is thinking…
      </div>
      {[100,85,90,70,80].map((w,i)=>(
        <div key={i} className="shimmer rounded h-3 mb-2" style={{width:`${w}%`}} />
      ))}
    </div>
  )
  return (
    <div className="bg-blue-950/20 border border-blue-900 rounded-xl p-4">
      <div className="flex items-center gap-2 text-blue-400 text-xs font-semibold mb-3">
        <Bot size={13} /> AI Output
      </div>
      {children}
    </div>
  )
}

function StoryCard({ story }) {
  const [open,       setOpen]      = useState(false)
  const [summary,    setSummary]   = useState(null)
  const [sumLoading, setSumLoading]= useState(false)

  const runSummarize = async (e) => {
    e.stopPropagation()
    setSumLoading(true); setOpen(true)
    try { const d = await summarizeStory(story.id); setSummary(d.summary) }
    catch { setSummary('Error calling API.') }
    finally { setSumLoading(false) }
  }

  const sc = STATUS_COLS[story.status] || STATUS_COLS['To Do']
  const pc = PRIORITY[story.priority] || PRIORITY.Low

  return (
    <div className={`bg-slate-900 rounded-lg border border-slate-800 overflow-hidden hover:border-slate-700 transition-colors border-t-2 ${sc.color}`}>
      <div className="p-3 cursor-pointer" onClick={() => setOpen(o => !o)}>
        <div className="flex items-start gap-2">
          <span className="text-base leading-none mt-0.5">{TYPE_ICON[story.type] || '📄'}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-xs font-mono text-slate-500">{story.id}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded border ${pc}`}>{story.priority}</span>
              {story.sprint_risk && (
                <span className="flex items-center gap-0.5 text-xs text-amber-400">
                  <AlertTriangle size={10} /> Risk
                </span>
              )}
            </div>
            <p className="text-sm text-white font-medium leading-tight">{story.title}</p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="text-xs text-slate-500">{story.points} pts</span>
              {story.linked_pr && (
                <span className="flex items-center gap-0.5 text-xs text-blue-400">
                  <GitPullRequest size={9} />PR #{story.linked_pr}
                </span>
              )}
              {story.comments?.length > 0 && (
                <span className="text-xs text-slate-500">💬 {story.comments.length}</span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            {open ? <ChevronUp size={13} className="text-slate-600" /> : <ChevronDown size={13} className="text-slate-600" />}
          </div>
        </div>
      </div>

      {open && (
        <div className="border-t border-slate-800 p-3 space-y-3">
          <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">{story.description}</p>

          {story.comments?.length > 0 && (
            <div className="space-y-1.5">
              {story.comments.map((c, i) => (
                <div key={i} className="bg-slate-800 rounded-lg p-2">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-xs font-semibold text-slate-300">{c.author}</span>
                    <span className="text-xs text-slate-600">{c.time}</span>
                  </div>
                  <p className="text-xs text-slate-400">{c.text}</p>
                </div>
              ))}
            </div>
          )}

          <button onClick={runSummarize}
            className="flex items-center gap-1.5 bg-violet-700 hover:bg-violet-600 text-white text-xs px-3 py-1.5 rounded-lg transition-colors w-full justify-center"
            disabled={sumLoading}
          >
            {sumLoading ? <Loader2 size={11} className="animate-spin" /> : <Bot size={11} />}
            AI Summarize Story
          </button>

          {(sumLoading || summary) && (
            <AiPanel loading={sumLoading}>
              {summary && <div className="ai-output text-xs text-slate-300"><ReactMarkdown>{summary}</ReactMarkdown></div>}
            </AiPanel>
          )}
        </div>
      )}
    </div>
  )
}

export default function JIRAModule() {
  const [stories,  setStories]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [briefing, setBriefing] = useState(null)
  const [brLoading,setBrLoading]= useState(false)
  const [standup,  setStandup]  = useState(null)
  const [stLoading,setStLoading]= useState(false)
  const [view,     setView]     = useState('board')  // board | list

  const load = () => {
    setLoading(true)
    getStories().then(setStories).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const runBriefing = async () => {
    setBrLoading(true)
    try { const d = await getDailyBriefing(); setBriefing(d.briefing) }
    catch { setBriefing('Error calling API. Check OPENAI_API_KEY.') }
    finally { setBrLoading(false) }
  }
  const runStandup = async () => {
    setStLoading(true)
    try { const d = await getStandup(); setStandup(d.standup) }
    catch { setStandup('Error calling API.') }
    finally { setStLoading(false) }
  }

  const byStatus = (status) => stories.filter(s => s.status === status)

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">JIRA Stories</h2>
          <p className="text-slate-400 text-sm">Sprint 24 · {stories.length} stories assigned to Milon</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setView(v => v === 'board' ? 'list' : 'board')}
            className="text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg"
          >
            {view === 'board' ? 'List View' : 'Board View'}
          </button>
          <button onClick={load} className="flex items-center gap-2 text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg">
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {/* AI Action Bar */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen size={15} className="text-blue-400" />
            <span className="text-sm font-semibold text-white">Daily Briefing</span>
          </div>
          <p className="text-xs text-slate-400 mb-3">AI reads all your sprint stories and generates a prioritized morning briefing with blockers and risks.</p>
          <button onClick={runBriefing} disabled={brLoading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-sm px-4 py-2 rounded-lg transition-colors w-full justify-center"
          >
            {brLoading ? <Loader2 size={14} className="animate-spin" /> : <Bot size={14} />}
            {brLoading ? 'Generating…' : 'Generate Daily Briefing'}
          </button>
          {(brLoading || briefing) && (
            <div className="mt-3">
              <AiPanel loading={brLoading}>
                {briefing && <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{briefing}</p>}
              </AiPanel>
            </div>
          )}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Send size={15} className="text-violet-400" />
            <span className="text-sm font-semibold text-white">Standup Generator</span>
          </div>
          <p className="text-xs text-slate-400 mb-3">AI drafts your daily standup update — Yesterday / Today / Blockers — based on your story statuses and PRs.</p>
          <button onClick={runStandup} disabled={stLoading}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white text-sm px-4 py-2 rounded-lg transition-colors w-full justify-center"
          >
            {stLoading ? <Loader2 size={14} className="animate-spin" /> : <Bot size={14} />}
            {stLoading ? 'Generating…' : 'Generate Standup Update'}
          </button>
          {(stLoading || standup) && (
            <div className="mt-3">
              <AiPanel loading={stLoading}>
                {standup && <div className="ai-output text-sm text-slate-300"><ReactMarkdown>{standup}</ReactMarkdown></div>}
              </AiPanel>
            </div>
          )}
        </div>
      </div>

      {/* Board / List */}
      {loading ? (
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_,i) => (
            <div key={i} className="space-y-2">
              <div className="shimmer h-6 rounded w-24" />
              {[...Array(2)].map((_,j) => <div key={j} className="shimmer h-24 rounded-xl" />)}
            </div>
          ))}
        </div>
      ) : view === 'board' ? (
        /* Kanban Board */
        <div className="grid grid-cols-4 gap-4">
          {Object.keys(STATUS_COLS).map(status => {
            const col = STATUS_COLS[status]
            const cards = byStatus(status)
            return (
              <div key={status}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${col.badge}`}>{col.label}</span>
                    <span className="text-xs text-slate-500">{cards.length}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  {cards.length === 0
                    ? <div className="text-center text-slate-600 text-xs py-6 border border-dashed border-slate-800 rounded-xl">No stories</div>
                    : cards.map(s => <StoryCard key={s.id} story={s} />)
                  }
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* List View */
        <div className="space-y-2">
          {stories.map(s => (
            <div key={s.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <StoryCard story={s} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
