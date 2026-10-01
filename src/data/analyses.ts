import type { Analysis } from '../lib/types'
import { SCENARIOS } from './scenarios'
import { buildAnalysis } from './build'

const stamp = (i: number) => `2026-10-01T${String(8 + Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '40' : '12'}:00Z`

export const ANALYSES: Analysis[] = SCENARIOS.map((s, i) => buildAnalysis(s, stamp(i)))

export const analysisById = (id: string) => ANALYSES.find((a) => a.id === id)

export function gradeDistribution(list: Analysis[] = ANALYSES) {
  const m: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 }
  list.forEach((a) => m[a.summary.grade]++)
  return m
}

export function commonFindings(list: Analysis[] = ANALYSES) {
  const m = new Map<string, { id: string; title: string; n: number; severity: string }>()
  list.forEach((a) =>
    a.assessment.findings.forEach((f) => {
      if (f.severity === 'pass' || f.severity === 'info') return
      const cur = m.get(f.id)
      if (cur) cur.n++
      else m.set(f.id, { id: f.id, title: f.title.replace(/ \(.*\)$/, ''), n: 1, severity: f.severity })
    }),
  )
  return [...m.values()].sort((a, b) => b.n - a.n).slice(0, 6)
}
