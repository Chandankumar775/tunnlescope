import { useMemo } from 'react'
import { useStore } from './store'
import { ANALYSES } from '../data/analyses'
import type { Analysis } from './types'

export function useAllAnalyses(): Analysis[] {
  const custom = useStore((s) => s.custom)
  return useMemo(() => [...custom, ...ANALYSES], [custom])
}
export function useAnalysis(id: string | undefined): Analysis | undefined {
  const all = useAllAnalyses()
  return all.find((a) => a.id === id)
}
