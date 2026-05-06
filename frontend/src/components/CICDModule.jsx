import { useState, useEffect } from 'react'
import {
  Cpu, CheckCircle, XCircle, Clock, Bot, Loader2,
  ChevronDown, ChevronUp, AlertTriangle, Zap, RefreshCw, Terminal
} from 'lucide-react'
import { getPipelines, analyzeBuild } from '../api/client.js'

const BUILD_STATUS = {
  passing: { label: 'Passing', color: 'text-emerald-400', bg: 'bg-emerald-900/30 border-emerald-800', dot: 'bg-emerald-400' },
  failing: { label: 'Failing', color: 'text-red-400',     bg: 'bg-red-900/30 border-red-800',         dot: 'bg-red-400 animate-pulse' },
}
const STAGE_STATUS = {
  passed:  { color: 'bg-emerald-500', icon: CheckCircle, textColor: 'text-emerald-400' },
  failed:  { color: 'bg-red-500',     icon: XCircle,     textColor: 'text-red-400' },
  skipped: { color: 'bg-slate-600',   icon: Clock,       textColor: 'text-slate-500' },
  running: { color: 'bg-blue-500 animate-pulse', icon: Loader2, textColor: 'text-blue-400' },
}
const CATEGORY_COLOR = {
  code_bug:         'bg-red-900 text-red-300 border-red-700',
  flaky_test:       'bg-amber-900 text-amber-300 border-amber-700',
  dependency_issue: 'bg-orange-900 text-orange-300 border-orange-700',
  environment:      'bg-violet-900 text-violet-300 border-violet-700',
  config_error:     'bg-cyan-900 text-cyan-300 border-cyan-700',
  unknown:          'bg-slate-800 text-slate-300 border-slate-700',
}

function StageBar({ stages }) {
  return (
    <div className="flex items-center gap-1 flex-wrap mt-2">
      {stages.map((stage, i) => {
        const s = STAGE_STATUS[stage.status] || STAGE_STATUS.skipped
        const SIcon = stage.status === 'running' ? Loader2 : s.icon
        return (
          <div key={i} className="flex items-center gap-1">
            <div className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-slate-800 ${s.textColor}`}>
              <SIcon size={10} className={stage.status === 'running' ? 'animate-spin' : ''} />
              {stage.name}
              <span className="text-slate-500 text-xs">({stage.duration})</span>
            </div>
            {i < stages.length - 1 && <span className="text-slate-700 text-xs">›</span>}
          </div>
        )
      })}
    </div>
  )
}

function BuildCard({ build }) {
  const [open,     setOpen]     = useState(false)
  const [analysis, setAnalysis] = useState(null)
  const [loading,  setLoading]  = useState(false)

  const runAnalysis = async (e) => {
    e.stopPropagation()
    setLoading(true); setOpen(true)
    try { const d = await analyzeBuild(build.id); setAnalysis(d.analysis) }
    catch { setAnalysis({ root_cause: 'Error calling API. Check OPENAI_API_KEY.', category: 'unknown', confidence: 'low', fix_suggestion: '' }) }
    finally { setLoading(false) }
  }

  const bs = BUILD_STATUS[build.status] || BUILD_STATUS.passing
  const failedStage = build.stages.find(s => s.status === 'failed')
  const startedAgo = new Date(build.started_at).toLocaleString()

  return (
    <div className={`bg-slate-900 border rounded-xl overflow-hidden transition-colors hover:border-slate-700 ${
      build.status === 'failing' ? 'border-red-900' : 'border-slate-800'
    }`}>
      {/* Header */}
      <div className="p-4 cursor-pointer" onClick={() => setOpen(o => !o)}>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${bs.bg}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${bs.dot}`} />
            <span className={bs.color + ' font-semibold'}>{bs.label}</span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-white font-semibold">{build.id}</span>
              <span className="text-slate-500 text-xs">·</span>
              <span className="text-xs text-blue-400 font-mono">PR #{build.pr_number}</span>
              <span className="text-slate-500 text-xs">·</span>
              <span className="text-xs text-slate-400 font-mono truncate">{build.branch}</span>
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
              <span>Trigger: {build.trigger}</span>
              <span>Duration: {build.duration}</span>
              <span>{startedAgo}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Test pill */}
            <div className="flex items-center gap-1.5 text-xs bg-slate-800 px-2 py-0.5 rounded">
              <CheckCircle size={10} className="text-emerald-400" />
              <span className="text-emerald-400">{build.test_summary.passed}</span>
              {build.test_summary.failed > 0 && (
                <>
                  <XCircle size={10} className="text-red-400" />
                  <span className="text-red-400">{build.test_summary.failed}</span>
                </>
              )}
            </div>

            {/* Analyze button for failed builds */}
            {build.status === 'failing' && (
              <button
                onClick={runAnalysis}
                disabled={loading}
                className="flex items-center gap-1.5 bg-red-700 hover:bg-red-600 disabled:opacity-60 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
              >
                {loading ? <Loader2 size={11} className="animate-spin" /> : <Bot size={11} />}
                Analyze Failure
              </button>
            )}
            {open ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
          </div>
        </div>

        {/* Stage bar always visible */}
        <StageBar stages={build.stages} />
      </div>

      {/* Expanded */}
      {open && (
        <div className="border-t border-slate-800 p-4 space-y-4">

          {/* Build log */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Terminal size={13} className="text-slate-400" />
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Build Log</span>
            </div>
            <div className="bg-slate-950 rounded-xl border border-slate-800 p-3 overflow-auto max-h-48">
              <pre className="text-xs mono text-slate-400 leading-5 whitespace-pre-wrap">{build.log_snippet}</pre>
            </div>
          </div>

          {/* AI Analysis */}
          {(loading || analysis) && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Bot size={13} className="text-blue-400" />
                <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">GPT-4o Failure Analysis</span>
              </div>
              {loading ? (
                <div className="bg-blue-950/30 border border-blue-900 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-blue-400 text-sm mb-3">
                    <Loader2 size={14} className="animate-spin" /> Analyzing build logs…
                  </div>
                  {[100,80,90,60].map((w,i) => <div key={i} className="shimmer rounded h-3 mb-2" style={{width:`${w}%`}} />)}
                </div>
              ) : (
                <div className="bg-red-950/20 border border-red-900 rounded-xl p-4 space-y-3">
                  {/* Category + Confidence */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${CATEGORY_COLOR[analysis.category] || CATEGORY_COLOR.unknown}`}>
                      {(analysis.category || 'unknown').replace(/_/g, ' ').toUpperCase()}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded border ${
                      analysis.confidence === 'high' ? 'bg-emerald-900 text-emerald-300 border-emerald-700'
                      : analysis.confidence === 'medium' ? 'bg-amber-900 text-amber-300 border-amber-700'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      {analysis.confidence} confidence
                    </span>
                    {analysis.is_flaky && (
                      <span className="text-xs px-2 py-0.5 rounded border bg-amber-900 text-amber-300 border-amber-700">⚠ Possibly Flaky</span>
                    )}
                    {analysis.estimated_fix_time && (
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <Clock size={10} /> Est. fix: {analysis.estimated_fix_time}
                      </span>
                    )}
                  </div>

                  {/* Root cause */}
                  <div>
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Root Cause</div>
                    <p className="text-sm text-red-300">{analysis.root_cause}</p>
                  </div>

                  {/* Failing location */}
                  {analysis.failing_location && (
                    <div>
                      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Location</div>
                      <code className="text-xs mono bg-slate-800 text-amber-300 px-2 py-1 rounded">{analysis.failing_location}</code>
                    </div>
                  )}

                  {/* Fix suggestion */}
                  {analysis.fix_suggestion && (
                    <div className="bg-emerald-950/30 border border-emerald-900 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Zap size={12} className="text-emerald-400" />
                        <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Suggested Fix</span>
                      </div>
                      <p className="text-sm text-emerald-300">{analysis.fix_suggestion}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Prompt for passing builds */}
          {build.status === 'passing' && !analysis && (
            <div className="flex items-center gap-2 text-emerald-400 text-sm bg-emerald-950/20 border border-emerald-900 rounded-lg p-3">
              <CheckCircle size={16} />
              All stages passed — no analysis needed.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function CICDModule() {
  const [pipelines, setPipelines] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [filter,    setFilter]    = useState('all')

  const load = () => {
    setLoading(true)
    getPipelines().then(setPipelines).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const visible = filter === 'all' ? pipelines : pipelines.filter(p => p.status === filter)
  const failingCount = pipelines.filter(p => p.status === 'failing').length
  const passingCount = pipelines.filter(p => p.status === 'passing').length

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">CI / CD Pipelines</h2>
          <p className="text-slate-400 text-sm">
            <span className="text-emerald-400 font-semibold">{passingCount} passing</span>
            {' · '}
            {failingCount > 0
              ? <span className="text-red-400 font-semibold">{failingCount} failing</span>
              : <span className="text-slate-500">{failingCount} failing</span>}
          </p>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Failing banner */}
      {failingCount > 0 && (
        <div className="flex items-center gap-3 bg-red-950/30 border border-red-900 rounded-xl p-4">
          <AlertTriangle size={18} className="text-red-400 shrink-0" />
          <div>
            <div className="text-sm font-semibold text-red-300">{failingCount} build{failingCount > 1 ? 's' : ''} failing</div>
            <div className="text-xs text-slate-400">Click "Analyze Failure" on any failing build to get AI root cause analysis and a suggested fix.</div>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 w-fit">
        {[['all','All'],['passing','Passing'],['failing','Failing']].map(([id,label]) => (
          <button key={id} onClick={() => setFilter(id)}
            className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${filter===id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            {label}
            <span className="ml-1 opacity-60">
              {id === 'all' ? pipelines.length : id === 'passing' ? passingCount : failingCount}
            </span>
          </button>
        ))}
      </div>

      {loading
        ? [...Array(3)].map((_,i) => <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl h-24 shimmer" />)
        : visible.map(b => <BuildCard key={b.id} build={b} />)
      }
    </div>
  )
}
