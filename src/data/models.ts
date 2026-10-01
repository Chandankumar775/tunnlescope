import { rngFor } from '../lib/rng'
import { MODEL_FEATURES, TRAFFIC, TRAFFIC_ORDER } from './constants'
import type { TrafficClass } from '../lib/types'

export const CLASS_LABELS = TRAFFIC_ORDER

const BASE_MATRIX: number[][] = [
  [571, 2, 3, 2, 12, 5, 5],
  [1, 566, 9, 1, 0, 0, 23],
  [3, 6, 547, 26, 14, 1, 3],
  [2, 0, 31, 548, 17, 0, 2],
  [14, 0, 16, 19, 540, 6, 5],
  [6, 0, 1, 0, 7, 585, 1],
  [0, 24, 6, 1, 2, 0, 567],
]

export interface Metrics {
  accuracy: number
  macro_f1: number
  labels: TrafficClass[]
  matrix: number[][]
  per_class: { label: TrafficClass; precision: number; recall: number; f1: number; support: number }[]
  importances: { feature: string; value: number }[]
  mode: { accuracy: number; matrix: number[][] }
  train_size: number
  test_size: number
  training_time_s: number
  trained_at: string
  dataset_hash: string
}

export function metricsFrom(matrix: number[][], mode: number[][], opts: { time: number; at: string; hash: string }): Metrics {
  const n = matrix.length
  const total = matrix.flat().reduce((a, b) => a + b, 0)
  const diag = matrix.reduce((a, row, i) => a + row[i], 0)
  const per = CLASS_LABELS.map((label, i) => {
    const support = matrix[i].reduce((a, b) => a + b, 0)
    const colSum = matrix.reduce((a, row) => a + row[i], 0)
    const precision = matrix[i][i] / colSum
    const recall = matrix[i][i] / support
    return { label, precision, recall, f1: (2 * precision * recall) / (precision + recall), support }
  })
  const modeTotal = mode.flat().reduce((a, b) => a + b, 0)
  void n
  return {
    accuracy: diag / total,
    macro_f1: per.reduce((a, p) => a + p.f1, 0) / per.length,
    labels: CLASS_LABELS,
    matrix,
    per_class: per,
    importances: [
      ['periodicity_score', 0.131], ['size_std', 0.108], ['iat_cv', 0.094], ['frac_large', 0.082], ['up_ratio_bytes', 0.071],
      ['pps', 0.064], ['size_mean', 0.058], ['burst_count', 0.051], ['iat_p50', 0.047], ['size_p90', 0.041], ['mean_burst_len', 0.037],
      ['frac_small', 0.033], ['size_mod16_entropy', 0.026], ['est_plaintext_floor', 0.022], ['up_ratio_pkts', 0.019],
    ].map(([feature, value]) => ({ feature: feature as string, value: value as number })),
    mode: { accuracy: (mode[0][0] + mode[1][1]) / modeTotal, matrix: mode },
    train_size: 16800,
    test_size: total,
    training_time_s: opts.time,
    trained_at: opts.at,
    dataset_hash: opts.hash,
  }
}

export const METRICS = metricsFrom(BASE_MATRIX, [[2005, 95], [100, 2000]], { time: 38.4, at: '2026-10-01T08:05:00Z', hash: 'sha256:9f2c4a1e7b' })

export function retrained(): Metrics {
  const m = BASE_MATRIX.map((r) => [...r])
  // deterministic reshuffle of a few borderline windows
  m[4][0] -= 3; m[4][4] += 3
  m[2][3] -= 4; m[2][2] += 4
  m[1][6] -= 2; m[1][1] += 2
  m[6][1] -= 3; m[6][6] += 3
  m[0][4] += 2; m[0][0] -= 2
  return metricsFrom(m, [[2012, 88], [95, 2005]], { time: 41.7, at: new Date().toISOString(), hash: 'sha256:c71e08d3a5' })
}

export const DATASET_STATS = {
  rows: 21000,
  per_class: 3000,
  split: { train: 16800, test: 4200 },
  window: '5 s or 64 ESP packets',
  noise: '5% label-noise / mixed-traffic windows',
  features: MODEL_FEATURES,
}

export function datasetCsv(rows = 1200): string {
  const r = rngFor('dataset')
  const head = [...MODEL_FEATURES, 'label', 'mode', 'split'].join(',')
  const lines = [head]
  for (let i = 0; i < rows; i++) {
    const cls = TRAFFIC_ORDER[i % TRAFFIC_ORDER.length]
    const t = TRAFFIC[cls]
    const pps = t.pps * (0.8 + r() * 0.4)
    const sizeMean = t.avg * (0.85 + r() * 0.3)
    const vals = MODEL_FEATURES.map((f) => {
      switch (f) {
        case 'pkt_count': return Math.min(64, Math.round(pps * 5))
        case 'bytes_total': return Math.round(Math.min(64, pps * 5) * sizeMean)
        case 'dur': return (5 * (0.9 + r() * 0.1)).toFixed(2)
        case 'pps': return pps.toFixed(1)
        case 'bps': return Math.round(pps * sizeMean * 8)
        case 'size_mean': return sizeMean.toFixed(1)
        case 'size_std': return (sizeMean * (0.05 + r() * 0.5)).toFixed(1)
        case 'size_min': return Math.round(60 + r() * 40)
        case 'size_p10': return Math.round(sizeMean * 0.4)
        case 'size_p50': return Math.round(sizeMean * 0.95)
        case 'size_p90': return Math.round(sizeMean * 1.3)
        case 'size_max': return Math.min(1514, Math.round(sizeMean * 1.6))
        case 'iat_mean': return (1000 / pps).toFixed(1)
        case 'iat_std': return ((1000 / pps) * r()).toFixed(1)
        case 'iat_p50': return ((1000 / pps) * 0.9).toFixed(1)
        case 'iat_cv': return (r() * 2).toFixed(2)
        case 'up_ratio_pkts': return (0.3 + r() * 0.4).toFixed(2)
        case 'up_ratio_bytes': return (r() * 0.8).toFixed(2)
        case 'frac_small': return (r() * 0.9).toFixed(2)
        case 'frac_large': return (r() * 0.9).toFixed(2)
        case 'burst_count': return Math.round(1 + r() * 8)
        case 'mean_burst_len': return Math.round(2 + r() * 60)
        case 'periodicity_score': return r().toFixed(2)
        case 'est_plaintext_floor': return Math.round(40 + r() * 60)
        default: return (2 + r() * 2).toFixed(2)
      }
    })
    lines.push([...vals, cls, r() < 0.5 ? 'tunnel' : 'transport', r() < 0.8 ? 'train' : 'test'].join(','))
  }
  return lines.join('\n')
}
