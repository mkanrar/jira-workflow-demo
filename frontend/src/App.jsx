import { useState, useEffect } from 'react'
import { LayoutDashboard, GitPullRequest, Layers, Cpu, Wifi, WifiOff, Bot } from 'lucide-react'
import Dashboard  from './components/Dashboard.jsx'
import PRModule   from './components/PRModule.jsx'
import JIRAModule from './components/JIRAModule.jsx'
import CICDModule from './components/CICDModule.jsx'
import { getHealth } from './api/client.js'

const TABS = [
  { id: 'dashboard', label: 'Dashboard',    Icon: LayoutDashboard },
  { id: 'prs',       label: 'Pull Requests', Icon: GitPullRequest  },
  { id: 'jira',      label: 'JIRA Stories',  Icon: Layers          },
  { id: 'cicd',      label: 'CI / CD',       Icon: Cpu             },
]

export default function App() {
  const [tab, setTab]       = useState('dashboard')
  const [health, setHealth] = useState(null)

  useEffect(() => {
    getHealth()
      .then(setHealth)
      .catch(() => setHealth({ status: 'error', openai_configured: false }))
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-slate-950">

      {/* ── Top Nav ───────────────────────────────────────────────────── */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <Bot size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-base leading-tight">AI Workflow Demo</h1>
            <p className="text-slate-400 text-xs">Developer Automation POC — Sandbox Mode</p>
          </div>
        </div>

        {/* Status pill */}
        <div className="flex items-center gap-4">
          {health && (
            <div className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border ${
              health.openai_configured
                ? 'bg-emerald-950 border-emerald-700 text-emerald-400'
                : 'bg-amber-950 border-amber-700 text-amber-400'
            }`}>
              {health.openai_configured ? <Wifi size={11} /> : <WifiOff size={11} />}
              {health.openai_configured ? 'GPT-4o Connected' : 'No API Key — Set OPENAI_API_KEY'}
            </div>
          )}
          <div className="flex items-center gap-1.5 text-xs bg-blue-950 border border-blue-800 text-blue-400 px-3 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            Sandbox Mode
          </div>
        </div>
      </header>

      {/* ── Tab Bar ───────────────────────────────────────────────────── */}
      <nav className="bg-slate-900 border-b border-slate-800 px-6 flex gap-1">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === id
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600'
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </nav>

      {/* ── Content ───────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-auto p-6">
        {tab === 'dashboard' && <Dashboard onNavigate={setTab} />}
        {tab === 'prs'       && <PRModule />}
        {tab === 'jira'      && <JIRAModule />}
        {tab === 'cicd'      && <CICDModule />}
      </main>

    </div>
  )
}
