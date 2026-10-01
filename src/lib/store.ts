import { create } from 'zustand'
import type { Analysis } from './types'

type Theme = 'light' | 'dark'

function initialTheme(): Theme {
  try {
    const saved = localStorage.getItem('ts-theme')
    if (saved === 'light' || saved === 'dark') return saved
  } catch { /* storage unavailable */ }
  return 'light'
}

function apply(theme: Theme) {
  document.documentElement.dataset.theme = theme
  try { localStorage.setItem('ts-theme', theme) } catch { /* ignore */ }
}

interface State {
  theme: Theme
  toggleTheme: () => void
  collapsed: boolean
  setCollapsed: (v: boolean) => void
  custom: Analysis[]
  addCustom: (a: Analysis) => void
  current: string
  setCurrent: (id: string) => void
  org: { minDh: number; maxChildH: number; requirePfs: boolean }
  setOrg: (o: Partial<State['org']>) => void
  resolved: string[]
  resolve: (id: string) => void
  reopenAll: () => void
  palette: boolean
  setPalette: (v: boolean) => void
  ask: boolean
  setAsk: (v: boolean) => void
  tour: number | null
  setTour: (v: number | null) => void
}

function loadResolved(): string[] {
  try { return JSON.parse(localStorage.getItem('ts-resolved') ?? '[]') } catch { return [] }
}
function saveResolved(v: string[]) {
  try { localStorage.setItem('ts-resolved', JSON.stringify(v)) } catch { /* ignore */ }
}

const theme0 = initialTheme()
if (typeof document !== 'undefined') apply(theme0)

export const useStore = create<State>((set) => ({
  theme: theme0,
  toggleTheme: () => set((s) => { const t: Theme = s.theme === 'light' ? 'dark' : 'light'; apply(t); return { theme: t } }),
  collapsed: typeof window !== 'undefined' && window.innerWidth < 1100,
  setCollapsed: (collapsed) => set({ collapsed }),
  custom: [],
  addCustom: (a) => set((s) => ({ custom: [a, ...s.custom.filter((x) => x.id !== a.id)] })),
  current: 'S06',
  setCurrent: (current) => set({ current }),
  org: { minDh: 14, maxChildH: 8, requirePfs: true },
  setOrg: (o) => set((s) => ({ org: { ...s.org, ...o } })),
  resolved: loadResolved(),
  resolve: (id) => set((s) => { const r = [...new Set([...s.resolved, id])]; saveResolved(r); return { resolved: r } }),
  reopenAll: () => { saveResolved([]); set({ resolved: [] }) },
  palette: false,
  setPalette: (palette) => set({ palette }),
  ask: false,
  setAsk: (ask) => set({ ask }),
  tour: null,
  setTour: (tour) => set({ tour, ask: false, palette: false }),
}))
