import type { Category, Cfg, ComplianceResult, Finding, Grade, Severity, Threat } from '../lib/types'
import { DH, REFS } from './constants'

/* ---------- naming helpers ---------- */
export const encName = (c: Cfg) => {
  if (c.protocol === 'AH') return 'None (AH, integrity only)'
  switch (c.enc) {
    case 'AES-GCM-16': return `AES-${c.keyBits}-GCM-16`
    case 'AES-GCM-12': return `AES-${c.keyBits}-GCM-12`
    case 'AES-GCM-8': return `AES-${c.keyBits}-GCM-8`
    case 'AES-CBC': return `AES-${c.keyBits}-CBC`
    case '3DES-CBC': return '3DES-CBC'
    case 'CHACHA20': return 'ChaCha20-Poly1305'
    default: return 'NULL (no encryption)'
  }
}
export const integName = (i: Cfg['integ']) => (i === 'NONE' ? 'None (AEAD)' : `HMAC-${i}`)
export const isAead = (c: Cfg) => c.enc.startsWith('AES-GCM') || c.enc === 'CHACHA20'
export const ikeEncName = (c: Cfg) =>
  c.ikeEnc === '3DES-CBC' ? '3DES-CBC' : c.ikeEnc === 'AES-GCM-16' ? `AES-${c.ikeBits}-GCM-16` : `AES-${c.ikeBits}-CBC`
export const prfName = (p: Cfg['prf']) => `HMAC-${p === 'MD5' ? 'MD5' : p === 'SHA1' ? 'SHA1' : 'SHA2-' + p.slice(3)}`
export const dhName = (g: number) => `Group ${g} · ${DH[g]?.name ?? 'unknown'}`
export const icvBytes = (c: Cfg) => {
  if (c.protocol === 'AH') return icvOf(c.integ)
  if (c.enc === 'AES-GCM-16' || c.enc === 'CHACHA20') return 16
  if (c.enc === 'AES-GCM-12') return 12
  if (c.enc === 'AES-GCM-8') return 8
  return icvOf(c.integ)
}
const icvOf = (i: Cfg['integ']) =>
  ({ 'SHA2-256-128': 16, 'SHA2-384-192': 24, 'SHA2-512-256': 32, 'SHA1-96': 12, 'MD5-96': 12, NONE: 0 })[i]

const dhSw = (g: number) => DH[g]?.sw ?? 'modp2048'
export function ikeProposalStr(c: Cfg) {
  const enc = c.ikeEnc === 'AES-GCM-16' ? `aes${c.ikeBits}gcm16` : c.ikeEnc === '3DES-CBC' ? '3des' : `aes${c.ikeBits}`
  const integ = c.ikeEnc === 'AES-GCM-16' ? '' : `-${c.prf === 'SHA1' ? 'sha1' : c.prf === 'MD5' ? 'md5' : 'sha' + c.prf.slice(3)}`
  const prf = `-prf${c.prf === 'SHA1' ? 'sha1' : c.prf === 'MD5' ? 'md5' : 'sha' + c.prf.slice(3)}`
  return `${enc}${integ}${prf}-${dhSw(c.dh)}`
}
export function espProposalStr(c: Cfg) {
  if (c.protocol === 'AH') return `sha256${c.pfs ? '-' + dhSw(c.dh) : ''}`
  const enc =
    c.enc === 'AES-GCM-16' ? `aes${c.keyBits}gcm16` : c.enc === 'AES-GCM-12' ? `aes${c.keyBits}gcm12` :
    c.enc === 'AES-GCM-8' ? `aes${c.keyBits}gcm8` : c.enc === 'CHACHA20' ? 'chacha20poly1305' :
    c.enc === '3DES-CBC' ? '3des' : c.enc === 'NULL' ? 'null' : `aes${c.keyBits}`
  const integMap: Record<string, string> = { 'SHA2-256-128': 'sha256', 'SHA2-384-192': 'sha384', 'SHA2-512-256': 'sha512', 'SHA1-96': 'sha1', 'MD5-96': 'md5', NONE: '' }
  const integ = integMap[c.integ] ? `-${integMap[c.integ]}` : ''
  return `${enc}${integ}${c.pfs ? '-' + dhSw(c.dh) : ''}`
}

/* ---------- checks ---------- */
const CAT = {
  crypto: 'Cryptographic strength',
  kex: 'Key exchange & PFS',
  auth: 'Authentication',
  proto: 'Protocol',
  sal: 'SA lifecycle',
  rpl: 'Replay protection',
  meta: 'Metadata exposure',
  info: 'Informational',
}
export const CATEGORY_WEIGHTS: { name: string; weight: number }[] = [
  { name: CAT.crypto, weight: 30 },
  { name: CAT.kex, weight: 20 },
  { name: CAT.auth, weight: 15 },
  { name: CAT.proto, weight: 10 },
  { name: CAT.sal, weight: 10 },
  { name: CAT.rpl, weight: 10 },
  { name: CAT.meta, weight: 5 },
]

const GOOD_FIX = {
  proposals: 'proposals = aes256gcm16-prfsha384-ecp384',
  esp: 'esp_proposals = aes256gcm16-ecp384',
}

function F(
  id: string, title: string, severity: Severity, category: string, description: string, impact: string,
  evText: string, packets: number[], recommendation: string, references: string[], config_fix: string | null = null,
): Finding {
  return { id, title, severity, category, description, impact, evidence: { text: evText, packets }, recommendation, references, config_fix }
}

export function runChecks(c: Cfg): Finding[] {
  const out: Finding[] = []
  const ah = c.protocol === 'AH'
  const aead = isAead(c)
  const dh = DH[c.dh]

  /* CRY-001 */
  if (ah) {
    out.push(F('CRY-001', 'No payload encryption (AH only)', 'critical', CAT.crypto,
      'Only AH was observed on the wire, so every payload byte is readable by a passive observer.',
      'Anyone on the path can read the full inner protocol and payload.',
      'Protocol 51 (AH) carries all IPsec data traffic; no ESP SPIs were seen.', [8, 9, 10],
      'Switch the child SA to ESP with an AEAD cipher such as AES-GCM-16.', [REFS.rfc4302, REFS.rfc8221],
      `children {\n  net {\n    ah_proposals = # remove\n    ${GOOD_FIX.esp}\n  }\n}`))
  } else if (c.enc === 'NULL') {
    out.push(F('CRY-001', 'ESP NULL encryption', 'critical', CAT.crypto, 'ESP is configured with the NULL cipher, so payloads are not encrypted.',
      'Traffic is readable in transit.', 'Bytes after the ESP header parse as a valid inner IP header.', [8, 9], 'Use AES-GCM-16 or ChaCha20-Poly1305.', [REFS.rfc8221], GOOD_FIX.esp))
  } else if (c.enc === '3DES-CBC') {
    out.push(F('CRY-001', '3DES encryption in ESP', 'high', CAT.crypto,
      'Triple-DES uses a 64-bit block size and is vulnerable to Sweet32 birthday attacks on long-lived keys.',
      'Large volumes under one key allow plaintext recovery; RFC 8221 lists 3DES as SHOULD NOT.',
      'Every ESP packet fits 8-byte block alignment with an 8-byte IV (AES-CBC alignment failed on 48% of packets).', [41, 42, 43],
      'Replace 3DES with AES-256-GCM-16.', [REFS.rfc8221], GOOD_FIX.esp))
  } else if (c.enc === 'AES-GCM-8' || c.enc === 'AES-GCM-12') {
    out.push(F('CRY-001', 'AEAD with truncated tag', 'medium', CAT.crypto, 'The AEAD tag is shorter than 16 bytes.', 'Higher forgery probability per packet.',
      'ESP length residues match a short ICV hypothesis.', [41, 42], 'Use GCM-16.', [REFS.rfc8221], GOOD_FIX.esp))
  } else {
    out.push(F('CRY-001', 'ESP encryption algorithm', 'pass', CAT.crypto,
      `${encName(c)} is a strong, standards-recommended ESP cipher.`, 'No action required.',
      aead ? 'ESP length residues are spread over {0,4,8,12} mod 16 as expected for AES-GCM.' : 'All ESP packets fit 16-byte block alignment.',
      [41, 42, 43], 'Keep this algorithm.', [REFS.rfc8221]))
  }

  /* CRY-002 */
  if (c.integ === 'MD5-96' && !aead && !ah) {
    out.push(F('CRY-002', 'Weak integrity: HMAC-MD5-96', 'high', CAT.crypto, 'HMAC-MD5-96 is deprecated and offers a truncated 96-bit tag.',
      'Weaker authentication of ESP packets than modern SHA-2 HMACs.', 'ICV length is 12 bytes, consistent with HMAC-MD5-96 or HMAC-SHA1-96; the IKE SA prior selects MD5.', [41, 42],
      'Use HMAC-SHA2-256-128 or an AEAD cipher.', [REFS.rfc8221, REFS.nist800], 'esp_proposals = aes256gcm16-ecp384'))
  } else if (c.integ === 'SHA1-96' && !aead && !ah) {
    out.push(F('CRY-002', 'Legacy integrity: HMAC-SHA1-96', 'low', CAT.crypto, 'HMAC-SHA1-96 is still permitted but on a deprecation trend.',
      'Reduced security margin compared with SHA-2.', 'ICV length is 12 bytes in every ESP packet.', [41, 42],
      'Move to HMAC-SHA2-256-128 or AES-GCM.', [REFS.rfc8221], 'esp_proposals = aes256-sha256-ecp384'))
  } else if (c.enc === 'NULL' && c.integ === 'NONE') {
    out.push(F('CRY-002', 'No integrity protection', 'critical', CAT.crypto, 'Neither an integrity algorithm nor an AEAD tag was found.', 'Packets can be modified undetected.', 'No ICV bytes.', [8], 'Enable HMAC-SHA2 or AEAD.', [REFS.rfc4303]))
  } else {
    out.push(F('CRY-002', 'ESP integrity / AEAD tag length', 'pass', CAT.crypto,
      aead ? `${icvBytes(c)}-byte AEAD tag provides authenticated encryption.` : `${integName(c.integ)} with a ${icvBytes(c)}-byte ICV.`,
      'No action required.', `Observed ICV length is ${icvBytes(c)} bytes.`, [41, 42], 'Keep this configuration.', [REFS.rfc8221]))
  }

  /* CRY-003 */
  if (c.ikeEnc === '3DES-CBC' || c.prf === 'MD5') {
    out.push(F('CRY-003', 'Weak IKE SA cipher or PRF', 'high', CAT.crypto,
      `The IKE SA negotiated ${ikeEncName(c)} with ${prfName(c.prf)}.`, 'Control-channel keys are protected by deprecated primitives.',
      'Selected transforms are readable in the cleartext SA payload of the first handshake messages.', [0, 1],
      'Use AES-256-GCM-16 with PRF-HMAC-SHA2-384.', [REFS.rfc8247], GOOD_FIX.proposals))
  } else if (c.prf === 'SHA1') {
    out.push(F('CRY-003', 'IKE SA uses PRF-HMAC-SHA1', 'low', CAT.crypto, 'SHA-1 is deprecated for new deployments.', 'Reduced security margin for IKE key derivation.',
      'PRF transform ID 2 in the selected proposal.', [0, 1], 'Move to PRF-HMAC-SHA2-256 or stronger.', [REFS.rfc8247], 'proposals = aes256-sha256-prfsha256-modp2048'))
  } else {
    out.push(F('CRY-003', 'IKE SA encryption and PRF', 'pass', CAT.crypto, `${ikeEncName(c)} with ${prfName(c.prf)} is a strong IKE SA choice.`, 'No action required.',
      'Selected proposal read from IKE_SA_INIT.', [0, 1], 'Keep this configuration.', [REFS.rfc8247]))
  }

  /* CRY-004 */
  if (c.enc === '3DES-CBC') {
    out.push(F('CRY-004', 'Effective key length 112 bits', 'medium', CAT.crypto, '3DES offers at most 112 bits of effective security.', 'Below the 128-bit floor recommended for new systems.', 'Key length implied by cipher family.', [41], 'Use AES-256.', [REFS.nist800]))
  } else if (!ah && c.keyBits === 128) {
    out.push(F('CRY-004', 'AES-128 key length', 'low', CAT.crypto, 'AES-128 is adequate today but below the CNSA suite requirement of AES-256.', 'Acceptable for most enterprise profiles.', 'Key size is not visible on the wire; taken from the IKE SA prior.', [0, 1], 'Use AES-256 where the CNSA profile applies.', [REFS.nist800], 'esp_proposals = aes256gcm16-ecp384'))
  } else {
    out.push(F('CRY-004', 'Key length', 'pass', CAT.crypto, ah ? 'No encryption key in use.' : `${c.keyBits}-bit keys meet all profiles.`, 'No action required.', 'Inferred from IKE SA prior.', [0, 1], 'Keep.', [REFS.nist800]))
  }

  /* KEX-001 */
  if (dh.rating === 'critical') {
    out.push(F('KEX-001', `Critical DH group ${c.dh} (${dh.name})`, 'critical', CAT.kex,
      `${dh.name} is small enough for nation-state precomputation (Logjam-class attacks).`,
      'A well-resourced attacker can recover session keys from captured traffic.',
      `KE payload length ${dh.ke} bytes in IKE messages ${c.ikeVersion === 1 ? '1–2' : '0–1'}.`, [0, 1],
      'Use ECP-384 or Curve25519; MODP-3072 at the minimum.', [REFS.rfc8247, REFS.nist800], `proposals = ${ikeProposalStr({ ...c, dh: 20 })}`))
  } else if (dh.rating === 'weak') {
    out.push(F('KEX-001', `Weak DH group ${c.dh} (${dh.name})`, 'high', CAT.kex,
      'MODP-1536 is below the NIST minimum of 2048-bit.', 'Weakens the strength of all keys derived on this SA.', `KE payload length ${dh.ke} bytes.`, [0, 1],
      'Move to ECP-384 or Curve25519.', [REFS.rfc8247, REFS.nist800], `proposals = ${ikeProposalStr({ ...c, dh: 20 })}`))
  } else if (dh.rating === 'acceptable') {
    out.push(F('KEX-001', 'DH group 14 is the accepted minimum', 'low', CAT.kex,
      'MODP-2048 meets the NIST floor but offers less margin than elliptic-curve groups.', 'No immediate risk; plan to migrate.', `KE payload length ${dh.ke} bytes.`, [0, 1],
      'Prefer ECP-384 or Curve25519.', [REFS.nist800], `proposals = ${ikeProposalStr({ ...c, dh: 20 })}`))
  } else {
    out.push(F('KEX-001', 'DH group strength', 'pass', CAT.kex, `${dh.name} is a strong key-exchange group.`, 'No action required.', `KE payload length ${dh.ke} bytes.`, [0, 1], 'Keep.', [REFS.rfc8247]))
  }

  /* KEX-002 */
  if (!c.pfs) {
    out.push(F('KEX-002', 'Perfect forward secrecy not enabled', 'medium', CAT.kex,
      'CREATE_CHILD_SA exchanges carry no fresh key-exchange payload, so child keys derive from the IKE SA alone.',
      'Compromise of the IKE SA key exposes every past and future child SA.',
      `Rekey request size matches the no-KE baseline (delta ${c.ikeVersion === 2 ? '+0' : '+0'} B vs. expected +${dh.ke + 8} B).`, [c.ikeVersion === 2 ? 6 : 9, c.ikeVersion === 2 ? 7 : 10],
      'Add a DH group to esp_proposals.', [REFS.rfc7296, REFS.nist800], GOOD_FIX.esp))
  } else {
    out.push(F('KEX-002', 'Perfect forward secrecy', 'pass', CAT.kex, 'Rekey messages are larger by the KE payload size, indicating fresh Diffie-Hellman per child SA.', 'Past traffic stays protected if a long-term key leaks.',
      `Rekey request +${dh.ke + 8} B over the no-KE baseline.`, [c.ikeVersion === 2 ? 6 : 9], 'Keep PFS on.', [REFS.rfc7296]))
  }

  /* KEX-003 */
  if (c.weakOffered) {
    out.push(F('KEX-003', 'Weak proposals still offered', 'high', CAT.kex,
      'The initiator also offers a legacy proposal (3DES, HMAC-SHA1, MODP-1024). A strong one was selected, but the weak option stays on the table.',
      'An active attacker can strip the strong proposal and force a downgrade.', 'Proposal 2 in IKE_SA_INIT: 3DES, HMAC-SHA1, MODP-1024.', [0],
      'Remove legacy proposals from the initiator.', [REFS.rfc8247], 'proposals = aes256gcm16-prfsha384-ecp384  # single strong proposal'))
  } else {
    out.push(F('KEX-003', 'Downgrade surface', 'pass', CAT.kex, 'Every offered proposal meets the minimum strength.', 'No downgrade path found.', 'All offered transforms were rated acceptable or strong.', [0], 'Keep.', [REFS.rfc8247]))
  }

  /* AUT-001 / 002 */
  if (c.auth === 'psk') {
    out.push(F('AUT-001', 'Pre-shared key authentication', 'low', CAT.auth, 'Peers authenticate with a shared secret rather than certificates.', 'Weak or reused secrets are a common failure point and scale poorly.',
      c.ikeVersion === 1 ? 'Authentication method attribute = 1 (PSK) in cleartext.' : 'IKE_AUTH is small (~300 B), which suggests no certificate payload.', [2, 3],
      'Move to certificate or EAP-based authentication.', [REFS.nist800], 'local { auth = pubkey; certs = gw-a.pem }\nremote { auth = pubkey }'))
  } else {
    out.push(F('AUT-001', 'IKE authentication method', 'pass', CAT.auth, 'Certificate-based authentication (large fragmented IKE_AUTH).', 'No shared secret to crack.', 'IKE_AUTH exceeds 1,400 B with fragmentation (RFC 7383).', [2, 3], 'Keep.', [REFS.rfc7296]))
  }
  if (c.exchange === 'aggressive' && c.auth === 'psk') {
    out.push(F('AUT-002', 'IKEv1 Aggressive Mode with PSK', 'critical', CAT.auth,
      'The responder returns a hash derived from the PSK in cleartext, and the initiator identity is exposed.',
      'Anyone who captures message 2 can crack the pre-shared key offline.', 'Exchange type 4 with HASH and ID payloads in messages 1–2.', [0, 1],
      'Disable Aggressive Mode; use IKEv2 with certificates.', [REFS.nist800, REFS.rfc7296], 'aggressive = no\nversion = 2'))
  } else {
    out.push(F('AUT-002', 'Aggressive Mode exposure', 'pass', CAT.auth, 'Aggressive Mode is not used.', 'No offline PSK-cracking material in cleartext.', 'No exchange type 4 observed.', [0], 'Keep.', [REFS.nist800]))
  }

  /* PRO */
  if (c.ikeVersion === 1) {
    out.push(F('PRO-001', c.exchange === 'aggressive' ? 'Deprecated IKEv1 (Aggressive Mode)' : 'Deprecated IKEv1', c.exchange === 'aggressive' ? 'high' : 'medium', CAT.proto,
      'IKEv1 is deprecated by RFC 7296 and lacks modern features like MOBIKE and fragmentation.', 'Larger attack surface and weaker defaults than IKEv2.', 'Version byte 0x10 in every handshake message.', [0, 1, 2],
      'Migrate to IKEv2.', [REFS.rfc7296], 'version = 2'))
  } else {
    out.push(F('PRO-001', 'IKE version', 'pass', CAT.proto, 'IKEv2 in use.', 'No action required.', 'Version byte 0x20.', [0, 1], 'Keep.', [REFS.rfc7296]))
  }
  if (ah) {
    out.push(F('PRO-002', 'AH-only protection', 'high', CAT.proto, 'AH authenticates packets but gives no confidentiality and breaks behind NAT.', 'Payload exposure plus poor NAT compatibility.', 'IP protocol 51 on all data packets.', [8, 9], 'Use ESP.', [REFS.rfc4302, REFS.rfc8221]))
  } else {
    out.push(F('PRO-002', 'AH-only usage', 'pass', CAT.proto, 'Traffic is protected by ESP.', 'No action required.', 'IP protocol 50 observed.', [8], 'Keep.', [REFS.rfc4303]))
  }
  out.push(F('PRO-003', 'NULL encryption', c.enc === 'NULL' && !ah ? 'critical' : 'pass', CAT.proto,
    c.enc === 'NULL' && !ah ? 'ESP NULL cipher in use.' : 'No NULL-cipher SAs observed.', c.enc === 'NULL' && !ah ? 'Plaintext traffic.' : 'No action required.',
    c.enc === 'NULL' && !ah ? 'Inner headers parse directly.' : 'Ciphertext entropy is high.', [8], 'Use AEAD.', [REFS.rfc8221]))

  /* SAL */
  const ch = c.childLifetimeH
  if (ch > 24) {
    out.push(F('SAL-001', `Child SA lifetime ${ch} h`, 'medium', CAT.sal, 'Keys stay in use far longer than the recommended 8 hours.', 'A longer window for key compromise and more data under one key (relevant for 64-bit block ciphers).',
      `SPI rollover interval ≈ ${ch} h (scaled).`, [6, 7], 'Set rekey_time to 1–8 hours.', [REFS.nist800], 'rekey_time = 4h'))
  } else if (ch > 8) {
    out.push(F('SAL-001', `Child SA lifetime ${ch} h`, 'low', CAT.sal, 'Longer than the 8-hour guidance, but under 24 hours.', 'Slightly larger key-compromise window.', `SPI rollover interval ≈ ${ch} h (scaled).`, [6, 7], 'Set rekey_time to 8 h or less.', [REFS.nist800], 'rekey_time = 4h'))
  } else {
    out.push(F('SAL-001', 'Child SA lifetime', 'pass', CAT.sal, `${ch} h child SA lifetime is within guidance.`, 'No action required.', `SPI rollover ≈ ${ch} h (scaled).`, [6, 7], 'Keep.', [REFS.nist800]))
  }
  if (c.ikeLifetimeH > 24) {
    out.push(F('SAL-002', `IKE SA lifetime ${c.ikeLifetimeH} h`, 'medium', CAT.sal, 'The IKE SA outlives the recommended 24 hours.', 'Control-channel key is exposed for longer.', 'IKE SA lifetime attribute read in cleartext.', [0, 1], 'Set ikelifetime to 8 h.', [REFS.nist800], 'reauth_time = 8h'))
  } else {
    out.push(F('SAL-002', 'IKE SA lifetime', 'pass', CAT.sal, `${c.ikeLifetimeH} h IKE SA lifetime is within guidance.`, 'No action required.', 'Lifetime inferred from rekey cadence.', [0], 'Keep.', [REFS.nist800]))
  }
  out.push(F('SAL-003', 'Rekey behaviour observed', 'pass', CAT.sal, 'At least one clean rekey was captured, so PFS and lifetimes could be determined.', 'No action required.', '2 CREATE_CHILD_SA exchanges followed by new SPIs.', [6, 7], 'Keep.', [REFS.rfc7296]))

  /* RPL */
  if (c.duplicates > 0 || c.backwardJump) {
    out.push(F('RPL-001', 'Duplicate and out-of-order ESP sequence numbers', 'high', CAT.rpl,
      `${c.duplicates} duplicated ESP packets and ${c.backwardJump ? 'one backwards sequence jump' : 'no backward jump'} were seen on a single SA.`,
      'The receiver may be accepting replayed packets, or a replay attack is in progress.', 'Sequence number repeated on SPI 0x' + 'c3a1f90e' + ' at packets 1,204–1,243.', [1204, 1205, 1243],
      'Enable the replay window (replay_window = 32+) and investigate the sender.', [REFS.rfc4303], 'replay_window = 128'))
  } else {
    out.push(F('RPL-001', 'Sequence monotonicity', 'pass', CAT.rpl, 'Sequence numbers increase strictly on every SA.', 'No replay indicators.', 'No duplicates or backward jumps.', [41], 'Keep.', [REFS.rfc4303]))
  }
  if (c.throughput === 'high' && !c.esn && !ah) {
    out.push(F('RPL-002', 'ESN recommended for high-throughput SA', 'info', CAT.rpl, '32-bit sequence numbers wrap quickly at this packet rate.', 'Forced rekeys under load.', 'Peak 420 pps on the busiest SA.', [41], 'Enable ESN.', [REFS.rfc4303], 'esn = yes'))
  } else {
    out.push(F('RPL-002', 'ESN usage', 'pass', CAT.rpl, c.esn ? 'Extended sequence numbers are enabled.' : 'Packet rates do not require ESN.', 'No action required.', 'Sequence behaviour is normal.', [41], 'Keep.', [REFS.rfc4303]))
  }

  /* MET */
  if (c.exchange === 'aggressive') {
    out.push(F('MET-001', 'Identity disclosed in cleartext', 'high', CAT.meta, `Aggressive Mode reveals the initiator identity (${c.identity ?? 'FQDN'}) before authentication.`, 'Observers learn which branch is connecting.',
      'ID payload visible in message 1.', [0], 'Use Main Mode or IKEv2, which encrypt identities.', [REFS.nist800]))
  } else {
    out.push(F('MET-001', 'Identity disclosure', 'pass', CAT.meta, 'Identities travel inside encrypted IKE_AUTH / Main Mode messages.', 'No action required.', 'No ID payload in cleartext.', [2], 'Keep.', [REFS.rfc7296]))
  }
  out.push(F('MET-002', 'Implementation fingerprint', 'low', CAT.meta, 'Vendor ID payloads reveal the VPN implementation.', 'Helps attackers choose targeted exploits.', 'Vendor ID payloads in IKE_SA_INIT.', [0, 1], 'Disable vendor-ID advertisement where possible.', [REFS.rfc7296], 'send_vendor_id = no'))
  out.push(F('MET-003', 'Traffic type can be inferred', c.classifierConf > 0.8 ? 'low' : 'info', CAT.meta, `The classifier identifies the traffic inside the tunnel with ${(c.classifierConf * 100).toFixed(0)}% confidence.`, 'Encryption hides content but not behavior.',
    'Packet size and timing patterns per 5-second window.', [41, 42, 43], 'Consider traffic shaping or padding for sensitive links.', [REFS.nist800]))
  if (c.mode === 'transport') {
    out.push(F('MET-004', 'Host endpoints exposed (transport mode)', 'low', CAT.meta, 'Transport mode leaves the real host IP addresses visible on the wire.', 'Topology disclosure.', 'Outer IP addresses are the communicating hosts.', [8], 'Use tunnel mode between gateways when topology matters.', [REFS.rfc4303]))
  } else {
    out.push(F('MET-004', 'Endpoint and topology disclosure', 'pass', CAT.meta, 'Tunnel mode hides the inner endpoints.', 'Only gateway addresses are visible.', 'Inner IP header is encrypted.', [8], 'Keep.', [REFS.rfc4303]))
  }

  /* QNT */
  out.push(F('QNT-001', 'Quantum readiness', 'info', CAT.info, 'All classical Diffie-Hellman groups are exposed to harvest-now-decrypt-later attacks.', 'Long-lived secrets captured today may be decrypted by future quantum computers.',
    'No hybrid post-quantum key exchange observed.', [0, 1], 'Plan for RFC 9370 hybrid key exchange.', [REFS.rfc9370]))

  return out
}

/* ---------- scoring ---------- */
const PEN: Record<Severity, number> = { critical: 100, high: 50, medium: 25, low: 10, info: 0, pass: 0 }
export function gradeOf(score: number): Grade {
  return score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 55 ? 'D' : score >= 40 ? 'E' : 'F'
}
export function riskLevelOf(g: Grade) {
  return g === 'A' || g === 'B' ? 'Low' : g === 'C' ? 'Moderate' : g === 'D' || g === 'E' ? 'High' : 'Critical'
}
export function score(findings: Finding[]) {
  const categories: Category[] = CATEGORY_WEIGHTS.map((cw) => {
    const pen = findings.filter((f) => f.category === cw.name).reduce((a, f) => a + PEN[f.severity], 0)
    return { ...cw, score: Math.max(0, 100 - pen) }
  })
  let overall = categories.reduce((a, c) => a + (c.weight * c.score) / 100, 0)
  if (findings.some((f) => f.severity === 'critical')) overall = Math.min(overall, 40)
  const s = Math.round(overall)
  const grade = gradeOf(s)
  const counts: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0, pass: 0 }
  findings.forEach((f) => counts[f.severity]++)
  return { categories, score: s, grade, risk_level: riskLevelOf(grade), risk_score: 100 - s, counts }
}

/* ---------- compliance ---------- */
export function compliance(c: Cfg, org = { minDh: 14, maxChildH: 8, requirePfs: true }): ComplianceResult[] {
  const ah = c.protocol === 'AH'
  const mk = (profile: string, name: string, checks: { name: string; passed: boolean; detail: string }[]): ComplianceResult => {
    const rate = checks.filter((x) => x.passed).length / checks.length
    return { profile, name, status: rate === 1 ? 'compliant' : rate >= 0.6 ? 'partially compliant' : 'non-compliant', pass_rate: rate, checks }
  }
  const noLegacy = c.enc !== '3DES-CBC' && c.enc !== 'NULL' && c.integ !== 'MD5-96' && c.ikeEnc !== '3DES-CBC' && c.prf !== 'MD5'
  const sha2 = c.prf !== 'SHA1' && c.prf !== 'MD5' && c.integ !== 'SHA1-96' && c.integ !== 'MD5-96'
  return [
    mk('nist', 'NIST SP 800-77 Rev. 1 baseline', [
      { name: 'IKEv2 in use', passed: c.ikeVersion === 2, detail: `IKEv${c.ikeVersion} observed` },
      { name: 'DH group ≥ 14', passed: c.dh >= 14, detail: `Group ${c.dh}` },
      { name: 'AES encryption', passed: !ah && c.enc !== '3DES-CBC' && c.enc !== 'NULL', detail: encName(c) },
      { name: 'SHA-2 based integrity / PRF', passed: sha2, detail: `${prfName(c.prf)}, ${integName(c.integ)}` },
      { name: 'No 3DES / MD5', passed: noLegacy, detail: noLegacy ? 'None present' : 'Legacy primitive found' },
      { name: 'PFS enabled', passed: c.pfs, detail: c.pfs ? 'Fresh DH on rekey' : 'No KE on rekey' },
    ]),
    mk('rfc8221', 'RFC 8221 / RFC 8247 algorithm requirements', [
      { name: 'ESP cipher is MUST / SHOULD', passed: !ah && c.enc !== '3DES-CBC' && c.enc !== 'NULL' && c.enc !== 'AES-GCM-8', detail: encName(c) },
      { name: 'No SHOULD NOT algorithms', passed: noLegacy && c.dh > 2, detail: noLegacy ? 'None present' : '3DES / MD5 in use' },
      { name: 'IKE group is MUST- or SHOULD-level', passed: c.dh >= 14, detail: `Group ${c.dh}` },
      { name: 'ESP not replaced by AH', passed: !ah, detail: ah ? 'AH only' : 'ESP in use' },
    ]),
    mk('cnsa', 'CNSA suite profile', [
      { name: 'AES-256', passed: !ah && c.keyBits === 256, detail: ah ? 'No encryption' : `${c.keyBits}-bit` },
      { name: 'ECP-384 or larger', passed: c.dh === 20 || c.dh === 21, detail: `Group ${c.dh}` },
      { name: 'SHA-384 or larger', passed: c.prf === 'SHA384' || c.prf === 'SHA512', detail: prfName(c.prf) },
      { name: 'Certificate authentication', passed: c.auth === 'cert', detail: c.auth === 'cert' ? 'Certificates' : 'PSK' },
    ]),
    mk('org', 'Organisation custom policy', [
      { name: `DH group ≥ ${org.minDh}`, passed: c.dh >= org.minDh, detail: `Group ${c.dh}` },
      { name: `Child SA lifetime ≤ ${org.maxChildH} h`, passed: c.childLifetimeH <= org.maxChildH, detail: `${c.childLifetimeH} h` },
      { name: 'PFS required', passed: !org.requirePfs || c.pfs, detail: c.pfs ? 'Enabled' : 'Disabled' },
      { name: 'IKEv2 required', passed: c.ikeVersion === 2, detail: `IKEv${c.ikeVersion}` },
    ]),
  ]
}

/* ---------- threats ---------- */
const lvl = (r: number): Threat['level'] => (r >= 17 ? 'critical' : r >= 10 ? 'high' : r >= 5 ? 'medium' : 'low')
export function threats(c: Cfg, findings: Finding[]): Threat[] {
  const fid = (...ids: string[]) => ids.filter((i) => findings.some((f) => f.id === i && f.severity !== 'pass'))
  const clamp = (n: number) => Math.max(1, Math.min(5, n))
  const ah = c.protocol === 'AH'
  const t = (id: string, name: string, l: number, i: number, mitre: string[], rel: string[], description: string): Threat => {
    l = clamp(l); i = clamp(i)
    return { id, name, likelihood: l, impact: i, risk: l * i, level: lvl(l * i), mitre, related_findings: rel, description }
  }
  return [
    t('T01', 'Passive decryption via weak DH', c.dh <= 2 ? 5 : c.dh === 5 ? 4 : c.dh === 14 ? 2 : 1, 5, ['T1040'], fid('KEX-001'),
      'Weak Diffie-Hellman groups allow precomputed attacks against recorded handshakes.'),
    t('T02', 'Harvest now, decrypt later', (c.pfs ? 2 : 4) + (c.dh <= 5 ? 1 : 0), 4, [], fid('KEX-002', 'QNT-001'),
      'Captured traffic is stored today and decrypted when keys or quantum capability become available.'),
    t('T03', 'Offline PSK cracking', c.auth === 'cert' ? 1 : c.exchange === 'aggressive' ? 5 : c.ikeVersion === 1 ? 3 : 2, c.exchange === 'aggressive' ? 5 : 4, ['T1110'], fid('AUT-001', 'AUT-002'),
      'A captured handshake hash is brute-forced offline to recover the pre-shared key.'),
    t('T04', 'Cipher weakness exploitation', ah ? 5 : c.enc === '3DES-CBC' ? 4 : c.enc === 'NULL' ? 5 : c.integ === 'MD5-96' ? 3 : c.enc.startsWith('AES-GCM-') && c.enc !== 'AES-GCM-16' ? 3 : 1,
      ah || c.enc === 'NULL' ? 5 : 4, [], fid('CRY-001', 'CRY-002', 'CRY-003'), 'Sweet32-style birthday attacks, short tag forgery or direct plaintext readout.'),
    t('T05', 'Downgrade via weak offered proposals', c.weakOffered ? 4 : c.ikeVersion === 1 ? 3 : 1, 4, ['T1557'], fid('KEX-003', 'PRO-001'),
      'An active attacker strips strong proposals so both peers select a weak one.'),
    t('T06', 'Replay of captured ESP packets', c.duplicates > 0 ? 4 : 1, 3, [], fid('RPL-001', 'RPL-002'), 'Recorded ESP packets are re-injected to trigger duplicate actions.'),
    t('T07', 'Traffic analysis and activity inference', ah ? 5 : c.classifierConf > 0.85 ? 4 : 3, c.mode === 'transport' ? 3 : 2, ['T1040'], fid('MET-003'),
      'Packet sizes and timing reveal which applications run inside the tunnel.'),
    t('T08', 'Identity and topology disclosure', c.exchange === 'aggressive' ? 5 : c.mode === 'transport' ? 4 : c.natT ? 3 : 2, c.exchange === 'aggressive' ? 3 : 2, [], fid('MET-001', 'MET-004'),
      'Cleartext identities and host addresses map the organisation.'),
    t('T09', 'Long-lived key compromise window', (c.childLifetimeH > 24 ? 4 : c.childLifetimeH > 8 ? 3 : 1) + (c.pfs ? 0 : 1), c.childLifetimeH > 24 ? 4 : 3, [], fid('SAL-001', 'SAL-002', 'KEX-002'),
      'Keys that live for days enlarge the window in which a compromise exposes data.'),
    t('T10', 'Implementation fingerprinting', 3, 3, ['T1595'], fid('MET-002'), 'Vendor IDs identify the gateway software for targeted exploitation.'),
  ]
}
