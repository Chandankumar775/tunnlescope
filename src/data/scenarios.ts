import type { Cfg, Scenario } from '../lib/types'

export const BASE: Cfg = {
  ikeVersion: 2,
  exchange: 'ikev2',
  mode: 'tunnel',
  ipVersion: 4,
  natT: false,
  protocol: 'ESP',
  enc: 'AES-GCM-16',
  keyBits: 256,
  integ: 'NONE',
  ikeEnc: 'AES-GCM-16',
  ikeBits: 256,
  prf: 'SHA384',
  dh: 20,
  pfs: true,
  auth: 'cert',
  ikeLifetimeH: 8,
  childLifetimeH: 1,
  esn: false,
  weakOffered: false,
  duplicates: 0,
  backwardJump: false,
  throughput: 'low',
  classifierConf: 0.92,
}

type S = Omit<Scenario, keyof Cfg> & Partial<Cfg>
const mk = (s: S): Scenario => ({ ...BASE, ...s }) as Scenario

export const SCENARIOS: Scenario[] = [
  mk({
    id: 'S01', name: 'Hardened gateway', expectedGrade: 'A', durationS: 120, vendor: 'strongSwan',
    description: 'Modern IKEv2 tunnel with AES-256-GCM, ECP-384 and forward secrecy.',
    traffic: [{ cls: 'voip', start: 0, dur: 60 }, { cls: 'web', start: 60, dur: 60 }],
    classifierConf: 0.94,
  }),
  mk({
    id: 'S02', name: 'Modern IPv6 site-to-site', expectedGrade: 'A', durationS: 120, vendor: 'strongSwan',
    description: 'IPv6 tunnel with AES-128-GCM and ECP-256.',
    ipVersion: 6, keyBits: 128, ikeBits: 128, prf: 'SHA256', dh: 19, throughput: 'high',
    traffic: [{ cls: 'video', start: 0, dur: 120 }], classifierConf: 0.95,
  }),
  mk({
    id: 'S03', name: 'Host-to-host transport', expectedGrade: 'B', durationS: 120, vendor: 'strongSwan',
    description: 'Transport mode between two servers using AES-256-CBC with HMAC-SHA256; one legacy proposal still offered.',
    mode: 'transport', enc: 'AES-CBC', keyBits: 256, integ: 'SHA2-256-128', ikeEnc: 'AES-CBC', ikeBits: 256,
    prf: 'SHA256', dh: 14, auth: 'psk', childLifetimeH: 12, weakOffered: true,
    traffic: [{ cls: 'email', start: 0, dur: 70 }, { cls: 'icmp', start: 70, dur: 50 }], classifierConf: 0.88,
  }),
  mk({
    id: 'S04', name: 'Legacy-compatible tunnel', expectedGrade: 'C', durationS: 120, vendor: 'Libreswan',
    description: 'AES-128-CBC with SHA1, no forward secrecy, and a 3DES fallback still offered.',
    enc: 'AES-CBC', keyBits: 128, integ: 'SHA1-96', ikeEnc: 'AES-CBC', ikeBits: 128, prf: 'SHA1', dh: 14,
    pfs: false, auth: 'psk', ikeLifetimeH: 24, childLifetimeH: 8, weakOffered: true,
    traffic: [{ cls: 'web', start: 0, dur: 120 }], classifierConf: 0.86,
  }),
  mk({
    id: 'S05', name: 'IKEv1 main mode', expectedGrade: 'E', durationS: 120, vendor: 'Cisco IOS',
    description: 'Older IKEv1 deployment with DH group 2 and long child SA lifetime.',
    ikeVersion: 1, exchange: 'main', enc: 'AES-CBC', keyBits: 128, integ: 'SHA1-96', ikeEnc: 'AES-CBC', ikeBits: 128,
    prf: 'SHA1', dh: 2, pfs: false, auth: 'psk', ikeLifetimeH: 24, childLifetimeH: 24,
    traffic: [{ cls: 'icmp', start: 0, dur: 40 }, { cls: 'web', start: 40, dur: 80 }], classifierConf: 0.89,
  }),
  mk({
    id: 'S06', name: 'Misconfigured branch office', expectedGrade: 'F', durationS: 120, vendor: 'Cisco IOS',
    description: 'IKEv1 aggressive mode with PSK, 3DES, MD5 and DH group 1.',
    ikeVersion: 1, exchange: 'aggressive', enc: '3DES-CBC', keyBits: 168, integ: 'MD5-96', ikeEnc: '3DES-CBC', ikeBits: 168,
    prf: 'MD5', dh: 1, pfs: false, auth: 'psk', ikeLifetimeH: 48, childLifetimeH: 48, identity: 'branch-07.example.in',
    traffic: [{ cls: 'email', start: 0, dur: 60 }, { cls: 'messaging', start: 60, dur: 60 }], classifierConf: 0.86,
  }),
  mk({
    id: 'S07', name: 'Mobile workforce over NAT', expectedGrade: 'C', durationS: 120, vendor: 'Windows IKEv2',
    description: 'Remote users behind NAT on IPv6 with a weak DH group, no PFS and legacy client proposals.',
    ipVersion: 6, natT: true, prf: 'SHA256', dh: 5, pfs: false, childLifetimeH: 4, weakOffered: true,
    traffic: [{ cls: 'messaging', start: 0, dur: 120 }], classifierConf: 0.9,
  }),
  mk({
    id: 'S08', name: 'Integrity-only AH', expectedGrade: 'E', durationS: 120, vendor: 'strongSwan',
    description: 'AH transport mode: packets are authenticated but not encrypted.',
    protocol: 'AH', mode: 'transport', enc: 'NULL', keyBits: 0, integ: 'SHA2-256-128', ikeEnc: 'AES-CBC', ikeBits: 256,
    prf: 'SHA256', dh: 14, auth: 'psk',
    traffic: [{ cls: 'web', start: 0, dur: 80 }, { cls: 'icmp', start: 80, dur: 40 }], classifierConf: 0.97,
  }),
  mk({
    id: 'S09', name: 'Data-centre interconnect', expectedGrade: 'A', durationS: 120, vendor: 'Libreswan',
    description: 'High-throughput tunnel over NAT-T with AES-256-CBC, SHA-512 and ECP-521.',
    natT: true, enc: 'AES-CBC', keyBits: 256, integ: 'SHA2-512-256', ikeEnc: 'AES-CBC', ikeBits: 256, prf: 'SHA512', dh: 21,
    esn: true, throughput: 'high',
    traffic: [{ cls: 'file_transfer', start: 0, dur: 60 }, { cls: 'video', start: 60, dur: 60 }], classifierConf: 0.93,
  }),
  mk({
    id: 'S10', name: 'Replay anomaly', expectedGrade: 'C', durationS: 120, vendor: 'strongSwan',
    description: 'Transport mode capture containing duplicated ESP sequence numbers.',
    mode: 'transport', enc: 'AES-CBC', keyBits: 256, integ: 'SHA2-256-128', ikeEnc: 'AES-CBC', ikeBits: 256,
    prf: 'SHA256', dh: 14, auth: 'psk', childLifetimeH: 12, weakOffered: true, duplicates: 40, backwardJump: true,
    traffic: [{ cls: 'email', start: 0, dur: 120 }], classifierConf: 0.87,
  }),
  mk({
    id: 'S11', name: 'Mixed enterprise day', expectedGrade: 'A', durationS: 119, vendor: 'strongSwan',
    description: 'Strong IKEv2 tunnel carrying every traffic type in sequence.',
    dh: 31, throughput: 'high', classifierConf: 0.82,
    traffic: [
      { cls: 'voip', start: 0, dur: 17 }, { cls: 'video', start: 17, dur: 17 }, { cls: 'web', start: 34, dur: 17 },
      { cls: 'email', start: 51, dur: 17 }, { cls: 'messaging', start: 68, dur: 17 }, { cls: 'icmp', start: 85, dur: 17 },
      { cls: 'file_transfer', start: 102, dur: 17 },
    ],
  }),
]

export function scenarioById(id: string) {
  return SCENARIOS.find((s) => s.id === id)
}
