import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { motion } from 'framer-motion'
import {
  Bell, BookOpen, BrainCircuit, Check, ChevronsLeft, ChevronsRight, FileText, FlaskConical, GitCompare, LayoutGrid, LogOut, Moon,
  MessageSquareText, Network, PlayCircle, Radio, Search, Settings, ShieldAlert, Sun, UploadCloud,
} from 'lucide-react'
import { Toaster, toast } from 'sonner'
import { useStore } from '../lib/store'
import { useAuth } from '../lib/auth'
import { ALERTS } from '../lib/alerts'
import { useAllAnalyses } from '../lib/useAnalyses'
import CommandPalette from './CommandPalette'
import AskPanel from './AskPanel'
import Tour from './Tour'
import { SEV } from './ui'

export function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <rect width="64" height="64" rx="18" fill="#0F1B2D" />
      <path d="M32 12 14 20v12c0 11 8 18 18 22 10-4 18-11 18-22V20z" fill="none" stroke="#4CC9F0" strokeWidth="4" strokeLinejoin="round" />
      <path d="M22 32h20" stroke="#F4A261" strokeWidth="3" strokeLinecap="round" />
      <circle cx="32" cy="32" r="5.5" fill="#C6F560" />
    </svg>
  )
}

const NAV = [
  { to: '/', label: 'Overview', icon: LayoutGrid, end: true },
  { to: '/captures', label: 'Captures', icon: UploadCloud },
  { to: '/findings', label: 'Findings', icon: ShieldAlert },
  { to: '/fleet', label: 'Fleet map', icon: Network },
  { to: '/live', label: 'Live monitor', icon: Radio },
  { to: '/testbed', label: 'Testbed', icon: FlaskConical },
  { to: '/models', label: 'Model lab', icon: BrainCircuit },
  { to: '/compare', label: 'Compare', icon: GitCompare },
  { to: '/reports', label: 'Reports', icon: FileText },
  { to: '/methodology', label: 'Methodology', icon: BookOpen },
]

function useOutside(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const on = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) close() }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && close()
    document.addEventListener('mousedown', on)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', on); document.removeEventListener('keydown', esc) }
  }, [open, close])
  return ref
}

function Bell_() {
  const [open, setOpen] = useState(false)
  const { resolved, resolve } = useStore()
  const nav = useNavigate()
  const ref = useOutside(open, () => setOpen(false))
  const live = ALERTS.filter((a) => !resolved.includes(a.id))
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} aria-label={`Alerts, ${live.length} open`} aria-expanded={open} className="relative grid h-10 w-10 place-items-center rounded-full bg-panel/70 hover:bg-panel">
        <Bell size={17} />
        {live.length > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-critical px-1 text-[10px] font-bold text-white">{live.length > 99 ? '99+' : live.length}</span>}
      </button>
      {open && (
        <div className="glass absolute right-0 top-12 z-30 w-[min(400px,90vw)] rounded-3xl !bg-panel/95 p-2">
          <div className="flex items-center justify-between px-3 py-2"><span className="title-wide text-[16px]">Open alerts</span><span className="label">{live.length} to resolve</span></div>
          <ul className="max-h-[380px] overflow-auto">
            {live.length === 0 && <li className="px-3 py-8 text-center text-muted">All alerts resolved. Nice work.</li>}
            {live.slice(0, 8).map((a) => (
              <li key={a.id} className="flex items-start gap-3 rounded-2xl px-3 py-2.5 hover:bg-panel2/60">
                <button className="min-w-0 flex-1 text-left" onClick={() => { setOpen(false); nav(`/analysis/${a.analysisId}/assessment`) }}>
                  <div className="flex items-center gap-2"><span className={clsx('rounded-md px-1.5 py-0.5 text-[11px] font-semibold', SEV[a.severity].text, SEV[a.severity].bg)}>{SEV[a.severity].label}</span><span className="truncate text-[14px] font-medium">{a.title}</span></div>
                  <div className="truncate text-[12.5px] text-muted">{a.capture}</div>
                </button>
                <button onClick={() => { resolve(a.id); toast.success('Alert resolved') }} className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-pass/12 px-2.5 py-1 text-[12px] font-medium text-pass hover:bg-pass/20"><Check size={12} />Resolve</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function UserMenu() {
  const [open, setOpen] = useState(false)
  const { user, signOut, demo } = useAuth()
  const nav = useNavigate()
  const ref = useOutside(open, () => setOpen(false))
  const initials = (user?.name ?? 'TS').split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} aria-label="Account menu" aria-expanded={open} className="grid h-10 w-10 place-items-center rounded-full bg-solid text-[13px] font-semibold text-[#C6F560]">{initials}</button>
      {open && (
        <div className="glass absolute right-0 top-12 z-30 w-[280px] rounded-3xl !bg-panel/95 p-2">
          <div className="px-3 py-3">
            <div className="truncate font-medium">{user?.name}</div>
            <div className="truncate text-[13px] text-muted">{user?.email}</div>
            {demo && <div className="mt-2 inline-block rounded-full bg-medium/15 px-2.5 py-0.5 text-[11.5px] font-medium text-medium">Demo account</div>}
          </div>
          <button onClick={() => { setOpen(false); nav('/settings') }} className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left hover:bg-panel2/60"><Settings size={16} />Settings</button>
          <button onClick={async () => { await signOut(); toast.success('Signed out'); nav('/login') }} className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-critical hover:bg-critical/10"><LogOut size={16} />Sign out</button>
        </div>
      )}
    </div>
  )
}

export default function Layout() {
  const { collapsed, setCollapsed, theme, toggleTheme, current, setCurrent, setPalette, setAsk, ask, setTour } = useStore()
  const nav = useNavigate()
  const loc = useLocation()
  const all = useAllAnalyses()
  const sidebarItems = useMemo(() => NAV, [])

  useEffect(() => { window.scrollTo({ top: 0 }) }, [loc.pathname])
  useEffect(() => {
    const m = loc.pathname.match(/^\/analysis\/([^/]+)/)
    if (m && m[1] !== current && all.some((a) => a.id === m[1])) setCurrent(m[1])
  }, [loc.pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex min-h-full gap-4 p-3 md:p-4">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-solid focus:px-4 focus:py-2 focus:text-[#e7edf4]">Skip to content</a>
      <aside className={clsx('glass sticky top-4 z-20 hidden h-[calc(100vh-2rem)] shrink-0 flex-col rounded-[28px] p-3 transition-[width] duration-200 md:flex', collapsed ? 'w-[76px]' : 'w-[236px]')}>
        <div className="flex items-center gap-3 px-1.5 pb-4 pt-1.5">
          <Logo />
          {!collapsed && <div className="title-wide text-[20px]">TunnelScope</div>}
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto" aria-label="Main">
          {sidebarItems.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} title={n.label}
              className={({ isActive }) => clsx('flex h-11 shrink-0 items-center gap-3 rounded-2xl px-3.5 text-[14px] font-medium transition-colors',
                isActive ? 'bg-solid text-[#e7edf4] shadow-lg' : 'text-muted hover:bg-panel/70 hover:text-paper')}>
              <n.icon size={19} className="shrink-0" />
              {!collapsed && n.label}
            </NavLink>
          ))}
        </nav>
        <NavLink to="/settings" title="Settings" className={({ isActive }) => clsx('mb-2 mt-2 flex h-11 shrink-0 items-center gap-3 rounded-2xl px-3.5 text-[14px] font-medium transition-colors', isActive ? 'bg-solid text-[#e7edf4]' : 'text-muted hover:bg-panel/70 hover:text-paper')}>
          <Settings size={19} className="shrink-0" />{!collapsed && 'Settings'}
        </NavLink>
        {!collapsed && (
          <div className="solid-card mb-3 rounded-2xl p-4">
            <div className="text-[13px] text-[#93a4ba]">Runs fully offline</div>
            <div className="mt-1 text-[14px] leading-snug">No cloud calls for analysis. Built for air-gapped analyst desks.</div>
          </div>
        )}
        <button onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
          className="flex h-10 items-center justify-center gap-2 rounded-2xl text-[13px] text-muted hover:bg-panel/70 hover:text-paper">
          {collapsed ? <ChevronsRight size={18} /> : <><ChevronsLeft size={18} />Collapse</>}
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="glass sticky top-3 z-10 mb-5 flex flex-wrap items-center gap-3 rounded-full px-3 py-2 md:top-4">
          <div className="md:hidden"><Logo size={32} /></div>
          <button onClick={() => setPalette(true)} aria-label="Open command palette" className="flex h-10 min-w-[180px] flex-1 items-center gap-3 rounded-full bg-panel2/70 px-4 text-left text-[14px] text-muted hover:bg-panel2 md:max-w-[420px]">
            <Search size={16} />Search captures, pages, actions
            <kbd className="mono ml-auto hidden rounded-md bg-panel px-1.5 py-0.5 text-[11px] sm:block">Ctrl K</kbd>
          </button>
          <div className="ml-auto flex items-center gap-2">
            <label className="hidden items-center gap-2 text-[13px] text-muted lg:flex">
              Capture
              <select value={current} onChange={(e) => { setCurrent(e.target.value); nav(`/analysis/${e.target.value}`) }}
                className="h-10 max-w-[240px] rounded-full border border-rule/60 bg-panel/70 px-4 text-[14px] text-paper outline-none" aria-label="Current capture">
                {all.map((a) => <option key={a.id} value={a.id}>{a.capture_name}</option>)}
              </select>
            </label>
            <button onClick={() => setTour(0)} className="hidden h-10 items-center gap-2 rounded-full bg-lime px-4 text-[13px] font-semibold text-[#0F1B2D] hover:brightness-95 md:inline-flex" data-tour-start>
              <PlayCircle size={16} />Demo tour
            </button>
            <button onClick={() => setAsk(!ask)} aria-label="Ask TunnelScope" aria-expanded={ask} title="Ask TunnelScope" className="grid h-10 w-10 place-items-center rounded-full bg-panel/70 hover:bg-panel">
              <MessageSquareText size={17} />
            </button>
            <span className="hidden items-center gap-2 rounded-full bg-pass/12 px-3.5 py-2 text-[13px] font-medium text-pass 2xl:inline-flex">
              <span className="live-dot h-2 w-2 rounded-full bg-pass" />Engine ready
            </span>
            <Bell_ />
            <button onClick={toggleTheme} aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'} className="grid h-10 w-10 place-items-center rounded-full bg-panel/70 hover:bg-panel">
              {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
            </button>
            <UserMenu />
          </div>
        </header>

        <nav className="glass mb-4 flex gap-1 overflow-x-auto rounded-full p-1.5 md:hidden" aria-label="Mobile">
          {[...NAV, { to: '/settings', label: 'Settings', icon: Settings, end: false }].map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => clsx('flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-[13px] font-medium', isActive ? 'bg-solid text-[#e7edf4]' : 'text-muted')}>
              <n.icon size={15} />{n.label}
            </NavLink>
          ))}
        </nav>

        <main id="main" className="mx-auto w-full max-w-[1440px] flex-1 pb-10">
            <motion.div key={loc.pathname.split('/')[1] + (loc.pathname.split('/')[2] ?? '')} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}>
              <Outlet />
            </motion.div>
        </main>
      </div>
      <CommandPalette />
      <AskPanel />
      <Tour />
      <Toaster position="bottom-right" toastOptions={{ style: { borderRadius: 16, fontFamily: 'Archivo Variable, system-ui' } }} />
    </div>
  )
}
