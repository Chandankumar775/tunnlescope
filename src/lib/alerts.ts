import { ANALYSES } from '../data/analyses'
import type { Severity } from './types'

export interface Alert { id: string; analysisId: string; capture: string; title: string; detail: string; severity: Severity; findingId: string }

/** Every critical or high finding across the built-in captures, worst first. */
export const ALERTS: Alert[] = ANALYSES.flatMap((a) =>
  a.assessment.findings
    .filter((f) => f.severity === 'critical' || f.severity === 'high')
    .map((f) => ({ id: `${a.id}:${f.id}`, analysisId: a.id, capture: a.scenario.name, title: f.title, detail: f.impact, severity: f.severity, findingId: f.id })),
).sort((x, y) => (x.severity === y.severity ? 0 : x.severity === 'critical' ? -1 : 1))
