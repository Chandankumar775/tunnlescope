import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { BookOpen, BrainCircuit, CornerDownLeft, FileText, FlaskConical, GitCompare, LayoutGrid, MessageSquareText, Moon, Network, PlayCircle, Radio, Search, Settings, ShieldAlert, UploadCloud, type LucideIcon } from 'lucide-react'
import { useStore } from '../lib/store'
import { useAllAnalyses } from '../lib/useAnalyses'

interface Item { id: string; label: string; hint: string; icon: LucideIcon; run: () => void }

export default function CommandPalette() {
  const { palette, setPalette, toggleTheme, setCurrent, setTour, setAsk } = useStore()
  const nav = useNavigate()
  const all = useAllAnalyses()
  const [q, setQ] = useState('')
  const [i, setI] = useState(0)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette(!useStore.getState().palette) }
      if (e.key === 'Escape') setPalette(false)
      if (e.key === '/' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement) && !(e.target instanceof HTMLSelectElement)) { e.preventDefault(); setPalette(true) }
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [setPalette])

  useEffect(() => { if (palette) { setQ(''); setI(0); setTimeout(() => input.current?.focus(), 30) } }, [palette])

  const go = (to: string) => () => { setPalette(false); nav(to) }
  const items = useMemo<Item[]>(() => [
    { id: 'p-ov', label: 'Overview', hint: 'Page', icon: LayoutGrid, run: go('/') },
    { id: 'p-cap', label: 'Captures', hint: 'Page', icon: UploadCloud, run: go('/captures') },
    { id: 'p-find', label: 'Findings explorer', hint: 'Page', icon: ShieldAlert, run: go('/findings') },
    { id: 'a-tour', label: 'Start demo tour', hint: 'Action', icon: PlayCircle, run: () => { setPalette(false); setTour(0) } },
    { id: 'a-ask', label: 'Ask TunnelScope', hint: 'Action', icon: MessageSquareText, run: () => { setPalette(false); setAsk(true) } },
    { id: 'p-fleet', label: 'Fleet map', hint: 'Page', icon: Network, run: go('/fleet') },
    { id: 'p-live', label: 'Start live monitor', hint: 'Page', icon: Radio, run: go('/live') },
    { id: 'p-tb', label: 'Testbed', hint: 'Page', icon: FlaskConical, run: go('/testbed') },
    { id: 'p-ml', label: 'Model lab', hint: 'Page', icon: BrainCircuit, run: go('/models') },
    { id: 'p-cmp', label: 'Compare analyses', hint: 'Page', icon: GitCompare, run: go('/compare') },
    { id: 'p-rep', label: 'Reports', hint: 'Page', icon: FileText, run: go('/reports') },
    { id: 'p-meth', label: 'Methodology', hint: 'Page', icon: BookOpen, run: go('/methodology') },
    { id: 'p-set', label: 'Settings', hint: 'Page', icon: Settings, run: go('/settings') },
    { id: 'a-theme', label: 'Toggle light / dark theme', hint: 'Action', icon: Moon, run: () => { toggleTheme(); setPalette(false) } },
    ...all.map((a) => ({ id: 'c-' + a.id, label: a.capture_name, hint: `Grade ${a.summary.grade} · ${a.summary.score}`, icon: FileText, run: () => { setCurrent(a.id); setPalette(false); nav(`/analysis/${a.id}`) } })),
  ], [all]) // eslint-disable-line react-hooks/exhaustive-deps

  const shown = items.filter((x) => (x.label + ' ' + x.hint).toLowerCase().includes(q.toLowerCase())).slice(0, 12)
  useEffect(() => setI(0), [q])

  const key = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setI((v) => Math.min(shown.length - 1, v + 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setI((v) => Math.max(0, v - 1)) }
    if (e.key === 'Enter') shown[i]?.run()
  }

  return (
    <AnimatePresence>
      {palette && (
        <motion.div className="fixed inset-0 z-50 grid place-items-start bg-[#0F1B2D]/45 p-4 pt-[14vh] backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={() => setPalette(false)}>
          <motion.div role="dialog" aria-label="Command palette" className="glass mx-auto w-full max-w-[600px] overflow-hidden rounded-[28px] !bg-panel/95"
            initial={{ y: -12, scale: 0.98 }} animate={{ y: 0, scale: 1 }} exit={{ y: -8, opacity: 0 }} transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }} onMouseDown={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 border-b border-rule/60 px-5">
              <Search size={18} className="text-muted" />
              <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={key} placeholder="Jump to a page, capture or action" aria-label="Search commands" className="h-14 flex-1 bg-transparent text-[16px] outline-none placeholder:text-muted/70" />
              <kbd className="mono rounded-md bg-panel2 px-1.5 py-0.5 text-[11px] text-muted">Esc</kbd>
            </div>
            <ul className="max-h-[360px] overflow-auto p-2" role="listbox">
              {shown.length === 0 && <li className="px-4 py-8 text-center text-muted">Nothing matches “{q}”. Try a scenario id such as S06.</li>}
              {shown.map((x, n) => (
                <li key={x.id} role="option" aria-selected={n === i}>
                  <button onMouseEnter={() => setI(n)} onClick={x.run} className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left ${n === i ? 'bg-solid text-[#e7edf4]' : ''}`}>
                    <x.icon size={17} className={n === i ? 'text-lime' : 'text-muted'} />
                    <span className="flex-1 truncate">{x.label}</span>
                    <span className={`text-[12px] ${n === i ? 'text-[#93a4ba]' : 'text-muted'}`}>{x.hint}</span>
                    {n === i && <CornerDownLeft size={14} className="text-[#93a4ba]" />}
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
