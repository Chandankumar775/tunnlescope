import type { Analysis } from './types'
import { TRAFFIC } from '../data/constants'
import { METRICS } from '../data/models'
import { topFindings } from '../data/build'
import { applicableFixes, applyFixes, evaluate } from '../data/fixes'
import { ANALYSES } from '../data/analyses'

export interface Answer { text: string; cites: string[]; link?: { label: string; to: string } }

export const SUGGESTIONS = [
  'Why did it get this grade?',
  'How do I fix it?',
  'What can an eavesdropper learn?',
  'Is it NIST compliant?',
  'Which cipher is it using?',
  'How sure are you?',
]

const pct = (n: number) => `${Math.round(n * 100)}%`
const lc = (x: string) => x.charAt(0).toLowerCase() + x.slice(1)
const list = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`)

/**
 * Answers questions about one analysis entirely offline. Intents are matched by keyword
 * and every sentence is assembled from the analysis data; nothing is sent anywhere.
 */
export function answer(a: Analysis, q: string): Answer {
  const s = q.toLowerCase()
  const f = (k: string) => a.identification.find((x) => x.key === k)
  const name = a.scenario.name
  const top = topFindings(a.assessment.findings, 3)

  if (/fix|improve|remed|harden|better|upgrade|recommend/.test(s)) {
    const fixes = applicableFixes(a.scenario)
    if (!fixes.length) return { text: `${name} already follows every recommendation TunnelScope makes. Nothing material to fix.`, cites: [] }
    const after = evaluate(applyFixes(a.scenario, fixes.map((x) => x.id)))
    return {
      text: `Fix these first: ${top.map((x, i) => `(${i + 1}) ${lc(x.recommendation.replace(/\.$/, ''))}`).join('; ')}. Applying all ${fixes.length} recommended changes moves ${name} from ${a.summary.score} (${a.summary.grade}) to ${after.score} (${after.grade}). The Fix simulator lets you toggle them one at a time and copy the strongSwan lines.`,
      cites: top.map((x) => x.id),
      link: { label: 'Open Fix simulator', to: `/analysis/${a.id}/simulate` },
    }
  }
  if (/leak|metadata|observer|eavesdrop|learn|privacy|expose|see/.test(s)) {
    const high = a.metadata_exposure.filter((m) => m.sensitivity === 'high')
    return {
      text: `A passive observer can learn ${a.metadata_exposure.length} facts without decrypting anything. The most sensitive: ${list(high.map((m) => `${lc(m.item)} (${m.exposed_value})`))}.`,
      cites: ['MET-001', 'MET-003', 'MET-004'].filter((id) => a.assessment.findings.some((x) => x.id === id && x.severity !== 'pass')),
      link: { label: 'Open metadata exposure', to: `/analysis/${a.id}/metadata` },
    }
  }
  if (/complian|nist|cnsa|rfc|policy|standard|audit/.test(s)) {
    return {
      text: a.compliance.map((c) => `${c.name}: ${c.status} (${c.checks.filter((x) => x.passed).length} of ${c.checks.length} checks).`).join(' '),
      cites: [],
      link: { label: 'Open summary', to: `/analysis/${a.id}` },
    }
  }
  if (/cipher|encrypt|aes|3des|gcm|cbc|algorithm/.test(s)) {
    const c = f('esp_cipher_family')!
    return { text: `ESP encryption is ${c.value}, found by ${c.method} with ${pct(c.confidence)} confidence. ${c.explanation}`, cites: ['CRY-001', 'CRY-002'], link: { label: 'See how we know', to: `/analysis/${a.id}/identification` } }
  }
  if (/pfs|forward secrecy|secrecy|rekey/.test(s)) {
    const p = f('pfs')!
    return { text: `Perfect forward secrecy: ${lc(p.value)} (${p.method}, ${pct(p.confidence)}). ${p.explanation}`, cites: ['KEX-002'] }
  }
  if (/traffic|voip|video|inside|carry|app|web|email|whatsapp/.test(s)) {
    const d = a.traffic.distribution.slice(0, 3)
    return { text: `Inside the tunnel the classifier sees ${list(d.map((x) => `${TRAFFIC[x.label].label} (${pct(x.pct_time)} of the time)`))}, at ${pct(a.scenario.classifierConf)} average confidence, from packet sizes and timing alone.`, cites: ['MET-003'], link: { label: 'Open traffic view', to: `/analysis/${a.id}/traffic` } }
  }
  if (/threat|attack|risk|danger|exploit|hack/.test(s)) {
    const t = [...a.threats].sort((x, y) => y.risk - x.risk).slice(0, 3)
    return { text: `Highest risks: ${list(t.map((x) => `${lc(x.name)} (risk ${x.risk} of 25${x.mitre.length ? `, ${x.mitre.join(', ')}` : ''})`))}.`, cites: t.flatMap((x) => x.related_findings).slice(0, 4), link: { label: 'Open threat matrix', to: `/analysis/${a.id}/threats` } }
  }
  if (/sure|confiden|trust|accura|reliab|how do you know|proof/.test(s)) {
    const by = (m: string) => a.identification.filter((x) => x.method === m).length
    return { text: `AI confidence is ${pct(a.summary.ai_confidence)}. ${by('cleartext')} fields were read in cleartext, ${by('side-channel')} inferred from packet sizes, ${by('ml')} predicted by the classifier and ${by('heuristic')} estimated. The traffic classifier scores ${(METRICS.accuracy * 100).toFixed(1)}% on held-out synthetic data.`, cites: [], link: { label: 'Open model lab', to: '/models' } }
  }
  if (/quantum|pqc|post-quantum|future/.test(s)) {
    return { text: 'Every classical Diffie-Hellman group, strong or not, is exposed to harvest-now-decrypt-later. TunnelScope flags this as informational and points to RFC 9370 hybrid key exchange as the path forward.', cites: ['QNT-001'] }
  }
  if (/compare|versus| vs |best|other|worst/.test(s)) {
    const best = [...ANALYSES].sort((x, y) => y.summary.score - x.summary.score)[0]
    return { text: `${name} scores ${a.summary.score}. The strongest built-in capture, ${best.scenario.name}, scores ${best.summary.score} with ${best.scenario.ikeVersion === 2 ? 'IKEv2' : 'IKEv1'}, DH group ${best.scenario.dh} and forward secrecy ${best.scenario.pfs ? 'on' : 'off'}.`, cites: [], link: { label: 'Compare side by side', to: '/compare' } }
  }
  if (/why|grade|score|bad|fail|f\b|low|safe/.test(s)) {
    const crit = a.summary.counts.critical
    return {
      text: `${name} scored ${a.summary.score}/100, grade ${a.summary.grade}. ${crit ? `${crit} critical finding${crit > 1 ? 's' : ''} cap the score at 40. ` : ''}The biggest problems: ${list(top.map((x) => x.title))}. ${top[0] ? top[0].impact : ''}`,
      cites: top.map((x) => x.id),
      link: { label: 'Open security assessment', to: `/analysis/${a.id}/assessment` },
    }
  }
  return { text: `I can explain this analysis offline: why it got its grade, how to fix it, what leaks, compliance, the cipher, forward secrecy, traffic inside the tunnel, threats, confidence, or how it compares.`, cites: [] }
}
