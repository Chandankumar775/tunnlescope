import type { Cfg, Finding } from '../lib/types'
import { espProposalStr, ikeProposalStr, runChecks, score } from './engine'

export interface Fix {
  id: string
  label: string
  why: string
  applies: (c: Cfg) => boolean
  apply: (c: Cfg) => Cfg
}

/** Recommended configuration changes, each a pure transform on the scenario config. */
export const FIXES: Fix[] = [
  {
    id: 'ikev2', label: 'Move to IKEv2', why: 'IKEv1 is deprecated and Aggressive Mode leaks a crackable PSK hash and the identity.',
    applies: (c) => c.ikeVersion === 1, apply: (c) => ({ ...c, ikeVersion: 2, exchange: 'ikev2', identity: undefined }),
  },
  {
    id: 'esp', label: 'Encrypt with ESP AES-256-GCM', why: 'Replaces AH-only, 3DES or weaker AEAD with a strong authenticated cipher.',
    applies: (c) => c.protocol === 'AH' || c.enc !== 'AES-GCM-16' || c.keyBits !== 256,
    apply: (c) => ({ ...c, protocol: 'ESP', enc: 'AES-GCM-16', keyBits: 256, integ: 'NONE' }),
  },
  {
    id: 'ike-crypto', label: 'Strengthen IKE cipher and PRF', why: 'AES-256-GCM with PRF-HMAC-SHA2-384 protects the control channel.',
    applies: (c) => c.ikeEnc !== 'AES-GCM-16' || !['SHA384', 'SHA512'].includes(c.prf),
    apply: (c) => ({ ...c, ikeEnc: 'AES-GCM-16', ikeBits: 256, prf: 'SHA384' }),
  },
  {
    id: 'dh', label: 'Use DH group 20 (ECP-384)', why: 'Closes Logjam-class precomputation on weak MODP groups.',
    applies: (c) => ![15, 16, 19, 20, 21, 31].includes(c.dh), apply: (c) => ({ ...c, dh: 20 }),
  },
  {
    id: 'pfs', label: 'Turn on forward secrecy', why: 'A fresh key exchange per child SA keeps past traffic safe if a key leaks.',
    applies: (c) => !c.pfs, apply: (c) => ({ ...c, pfs: true }),
  },
  {
    id: 'cert', label: 'Authenticate with certificates', why: 'Removes the shared secret an attacker could brute-force.',
    applies: (c) => c.auth === 'psk', apply: (c) => ({ ...c, auth: 'cert' }),
  },
  {
    id: 'proposals', label: 'Remove legacy proposals', why: 'Stops an attacker forcing a downgrade to 3DES and DH group 2.',
    applies: (c) => c.weakOffered, apply: (c) => ({ ...c, weakOffered: false }),
  },
  {
    id: 'lifetime', label: 'Rekey every hour', why: 'Shrinks the window in which one compromised key exposes traffic.',
    applies: (c) => c.childLifetimeH > 8 || c.ikeLifetimeH > 24, apply: (c) => ({ ...c, childLifetimeH: 1, ikeLifetimeH: 8 }),
  },
  {
    id: 'tunnel', label: 'Switch to tunnel mode', why: 'Hides the real host addresses inside the encrypted packet.',
    applies: (c) => c.mode === 'transport', apply: (c) => ({ ...c, mode: 'tunnel' }),
  },
  {
    id: 'esn', label: 'Enable extended sequence numbers', why: 'Avoids forced rekeys on high-throughput links.',
    applies: (c) => c.throughput === 'high' && !c.esn && c.protocol === 'ESP', apply: (c) => ({ ...c, esn: true }),
  },
]

export const applicableFixes = (c: Cfg) => FIXES.filter((f) => f.applies(c))

export function applyFixes(c: Cfg, ids: string[]): Cfg {
  // apply in catalog order so later fixes see earlier ones (e.g. ESP before ESN)
  return FIXES.reduce((acc, f) => (ids.includes(f.id) && f.applies(acc) ? f.apply(acc) : acc), c)
}

export function evaluate(c: Cfg) {
  const findings = runChecks(c)
  return { findings, ...score(findings) }
}

export const openIds = (fs: Finding[]) => new Set(fs.filter((f) => f.severity !== 'pass' && f.severity !== 'info').map((f) => f.id))

/**
 * What one fix is worth on top of the fixes already selected: score points and findings closed.
 * Points can be zero while a critical finding elsewhere still caps the score at 40, so the
 * closed-findings count keeps every fix's value visible.
 */
export function fixGain(c: Cfg, selected: string[], id: string) {
  const base = evaluate(applyFixes(c, selected.filter((x) => x !== id)))
  const next = evaluate(applyFixes(c, [...selected.filter((x) => x !== id), id]))
  const a = openIds(base.findings)
  const b = openIds(next.findings)
  return { points: next.score - base.score, closes: [...a].filter((x) => !b.has(x)).length }
}

export function configDiff(before: Cfg, after: Cfg) {
  const line = (k: string, a: string, b: string) => (a === b ? `${k.padEnd(14)}= ${b}` : `# ${k.padEnd(12)}= ${a}\n${k.padEnd(14)}= ${b}`)
  return [
    line('version', String(before.ikeVersion), String(after.ikeVersion)),
    line('proposals', ikeProposalStr(before), ikeProposalStr(after)),
    line(after.protocol === 'AH' ? 'ah_proposals' : 'esp_proposals', espProposalStr(before), espProposalStr(after)),
    line('mode', before.mode, after.mode),
    line('rekey_time', `${before.childLifetimeH}h`, `${after.childLifetimeH}h`),
    line('auth', before.auth === 'psk' ? 'psk' : 'pubkey', after.auth === 'psk' ? 'psk' : 'pubkey'),
  ].join('\n')
}
