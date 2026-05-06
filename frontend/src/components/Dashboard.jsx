import { useEffect, useState } from 'react'
import {
  GitPullRequest, CheckCircle, XCircle, Clock, AlertTriangle,
  Layers, Cpu, TrendingUp, RefreshCw, Activity, ArrowRight
} from 'lucide-react'
import { getDashboard } from '../api/client.js'

const activityIcon = { success: CheckCircle, error: XCircle, info: GitPullRequest }
const activityColor = { success: 'text-emerald-400', error: 'text-red-400', info: 'text-blue-400' }

function StatCard({ label, value, sub, color, icon: Icon, onClick }) {
  return (
    <button
      onClick={onClick}
      className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-left hover:border-slate-600 transition-all group w-full"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg ${color} bg-opacity-15 flex items-center justify-center`}>
          <Icon size={20} className={color.replace('bg-', 'text-')} />
        </div>
        <ArrowRight size={14} className="text-slate-600 group-hover:text-slate-400 transition-colors mt-1" />
      </div>
      <div className="text-3xl font-bold text-white mb-1">{value}</div>
      <div className="text-slate-400 text-sm font-medium">{label}</div>
      {sub && <div className="text-slate-500 text-xs mt-1">{sub}</div>}
    </button>
  )
}

function MiniBar({ label, value, max, color }) {
  const pct = Math.round((value / max) * 100)
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-400 mb-1">
        <span>{label}</span>
        <span className="font-mono">{value}</span>
      </div>
      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function Dashboard({ onNavigate }) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [ts,      setTs]      = useState(new Date())

  const load = () => {
    setLoading(true)
    getDashboard()
      .then(d => { setData(d); setTs(new Date()) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  if (loading) return (
    <div className="grid grid-cols-4 gap-4 animate-pulse">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl h-32 shimmer" />
      ))}
    </div>
  )

  if (!data) return <div className="text-red-400 text-center mt-20">Failed to load dashboard. Is the backend running?</div>

  const { prs, builds, jira, activity } = data

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Developer Dashboard</h2>
          <p className="text-slate-400 text-sm">Last updated: {ts.toLocaleTimeString()}</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg transition-colors"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Open Pull Requests"
          value={prs.open}
          sub={`${prs.draft} draft · ${prs.merged} merged`}
          color="bg-blue-500"
          icon={GitPullRequest}
          onClick={() => onNavigate('prs')}
        />
        <StatCard
          label="Build Pass Rate"
          value={`${builds.pass_rate}%`}
          sub={`${builds.passing} passing · ${builds.failing} failing`}
          color={builds.failing > 0 ? 'bg-red-500' : 'bg-emerald-500'}
          icon={builds.failing > 0 ? XCircle : CheckCircle}
          onClick={() => onNavigate('cicd')}
        />
        <StatCard
          label="Stories In Progress"
          value={jira.in_progress}
          sub={`${jira.todo} to do · ${jira.done} done`}
          color="bg-violet-500"
          icon={Layers}
          onClick={() => onNavigate('jira')}
        />
        <StatCard
          label="Sprint Risk"
          value={jira.sprint_risk}
          sub="stories not started near deadline"
          color={jira.sprint_risk > 0 ? 'bg-amber-500' : 'bg-emerald-500'}
          icon={jira.sprint_risk > 0 ? AlertTriangle : TrendingUp}
          onClick={() => onNavigate('jira')}
        />
      </div>

      {/* Middle Row */}
      <div className="grid grid-cols-3 gap-4">

        {/* PR Breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <GitPullRequest size={16} className="text-blue-400" />
            <span className="text-sm font-semibold text-white">PR Breakdown</span>
          </div>
          <div className="space-y-3">
            <MiniBar label="Open"   value={prs.open}   max={prs.total} color="bg-blue-500" />
            <MiniBar label="Draft"  value={prs.draft}  max={prs.total} color="bg-amber-500" />
            <MiniBar label="Merged" value={prs.merged} max={prs.total} color="bg-emerald-500" />
          </div>
          <button
            onClick={() => onNavigate('prs')}
            className="mt-4 w-full text-xs text-blue-400 hover:text-blue-300 flex items-center justify-center gap-1 transition-colors"
          >
            View all PRs <ArrowRight size={11} />
          </button>
        </div>

        {/* JIRA Sprint */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Layers size={16} className="text-violet-400" />
            <span className="text-sm font-semibold text-white">Sprint 24 Progress</span>
          </div>
          <div className="space-y-3">
            <MiniBar label="In Progress / In Review" value={jira.in_progress} max={jira.total} color="bg-blue-500" />
            <MiniBar label="To Do"  value={jira.todo} max={jira.total} color="bg-slate-500" />
            <MiniBar label="Done"   value={jira.done} max={jira.total} color="bg-emerald-500" />
          </div>
          <button
            onClick={() => onNavigate('jira')}
            className="mt-4 w-full text-xs text-violet-400 hover:text-violet-300 flex items-center justify-center gap-1 transition-colors"
          >
            View JIRA board <ArrowRight size={11} />
          </button>
        </div>

        {/* Build Health */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Cpu size={16} className="text-cyan-400" />
            <span className="text-sm font-semibold text-white">Build Health</span>
          </div>
          <div className="flex items-center justify-center my-3">
            <div className="relative w-24 h-24">
              <svg viewBox="0 0 36 36" className="w-24 h-24 -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1e293b" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="15.9" fill="none"
                  stroke={builds.pass_rate >= 80 ? '#10b981' : builds.pass_rate >= 50 ? '#f59e0b' : '#ef4444'}
                  strokeWidth="3"
                  strokeDasharray={`${builds.pass_rate} ${100 - builds.pass_rate}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-white">{builds.pass_rate}%</span>
                <span className="text-xs text-slate-400">pass rate</span>
              </div>
            </div>
          </div>
          <div className="flex justify-around text-center">
            <div><div className="text-lg font-bold text-emerald-400">{builds.passing}</div><div className="text-xs text-slate-500">Passing</div></div>
            <div><div className="text-lg font-bold text-red-400">{builds.failing}</div><div className="text-xs text-slate-500">Failing</div></div>
          </div>
          <button
            onClick={() => onNavigate('cicd')}
            className="mt-4 w-full text-xs text-cyan-400 hover:text-cyan-300 flex items-center justify-center gap-1 transition-colors"
          >
            View pipelines <ArrowRight size={11} />
          </button>
        </div>
      </div>

      {/* Activity Feed */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Activity size={16} className="text-slate-400" />
          <span className="text-sm font-semibold text-white">Recent Activity</span>
        </div>
        <div className="space-y-2">
          {activity.map((item, i) => {
            const Icon = activityIcon[item.status] || Clock
            const col  = activityColor[item.status] || 'text-slate-400'
            return (
              <div key={i} className="flex items-start gap-3 py-2 border-b border-slate-800 last:border-0">
                <Icon size={14} className={`${col} mt-0.5 shrink-0`} />
                <span className="text-slate-300 text-sm flex-1">{item.message}</span>
                <span className="text-slate-500 text-xs shrink-0">{item.time}</span>
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}
