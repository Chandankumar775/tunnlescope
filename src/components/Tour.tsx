import { useEffect, useLayoutEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, X } from 'lucide-react'
import { useStore } from '../lib/store'

interface Step { route: string; target?: string; title: string; body: string }

/** A 90-second guided path through the strongest screens, made for a judging slot. */
export const TOUR: Step[] = [
  { route: '/', target: 'ledger', title: '11 VPN deployments, graded A to F', body: 'Each row is a real IPsec capture TunnelScope analysed without decrypting it. Grades range from a hardened gateway (A) to a misconfigured branch office (F).' },
  { route: '/analysis/S06', target: 'ribbon', title: 'Inside one encrypted packet', body: 'The ribbon shows what is visible on the wire and what is ciphertext. Its sizes come from the cipher TunnelScope identified from packet lengths alone.' },
  { route: '/analysis/S06/identification', target: 'identification', title: 'Every claim shows how we know', body: 'Each field carries its method (cleartext, side-channel, ML or heuristic) and a confidence. Expand a row to read the reasoning and the evidence packets.' },
  { route: '/analysis/S06/simulate', target: 'simulator', title: 'Fix it live', body: 'Toggle the recommended changes and watch the grade climb. The exact strongSwan lines update with every switch.' },
  { route: '/analysis/S06/threats', target: 'threats', title: 'Threats in attacker terms', body: 'Ten threats scored by likelihood and impact and mapped to MITRE ATT&CK, each linked to the findings that cause it.' },
  { route: '/fleet', target: 'fleet', title: 'The whole fleet at a glance', body: 'Every tunnel on one map. Preview all fixes applied to see the fleet-wide gain an auditor could promise.' },
  { route: '/live', target: 'live', title: 'Works on live traffic too', body: 'Replay any capture in real time and watch fields fill in as evidence arrives. Press Start live monitor.' },
  { route: '/reports', target: 'reports', title: 'Reports for both audiences', body: 'A two-page executive brief and a full technical report, generated offline for every analysis.' },
]

export default function Tour() {
  const { tour, setTour } = useStore()
  const nav = useNavigate()
  const loc = useLocation()
  const [rect, setRect] = useState<DOMRect | null>(null)
  const step = tour === null ? null : TOUR[tour]

  useEffect(() => {
    if (step && loc.pathname !== step.route) nav(step.route)
  }, [tour]) // eslint-disable-line react-hooks/exhaustive-deps

  useLayoutEffect(() => {
    if (!step?.target) { setRect(null); return }
    let raf = 0
    let tries = 0
    const find = () => {
      const el = document.querySelector(`[data-tour="${step.target}"]`)
      if (el) {
        el.scrollIntoView({ block: 'center', behavior: 'smooth' })
        setTimeout(() => setRect(el.getBoundingClientRect()), 450)
      } else if (tries++ < 40) raf = requestAnimationFrame(find)
      else setRect(null)
    }
    setRect(null)
    raf = requestAnimationFrame(find)
    const onResize = () => { const el = document.querySelector(`[data-tour="${step.target}"]`); if (el) setRect(el.getBoundingClientRect()) }
    window.addEventListener('resize', onResize)
    window.addEventListener('scroll', onResize, true)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); window.removeEventListener('scroll', onResize, true) }
  }, [tour, loc.pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (tour === null) return
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setTour(null)
      if (e.key === 'ArrowRight') setTour(Math.min(TOUR.length - 1, tour + 1))
      if (e.key === 'ArrowLeft') setTour(Math.max(0, tour - 1))
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [tour, setTour])

  if (tour === null || !step) return null
  const last = tour === TOUR.length - 1
  return (
    <>
      {rect && (
        <div aria-hidden className="pointer-events-none fixed z-40 rounded-[24px] transition-all duration-300"
          style={{ left: rect.left - 8, top: rect.top - 8, width: rect.width + 16, height: rect.height + 16, boxShadow: '0 0 0 3px #C6F560, 0 0 0 9999px rgba(8,16,30,.55)' }} />
      )}
      <AnimatePresence mode="wait">
        <motion.div key={tour} role="dialog" aria-label={`Demo tour step ${tour + 1} of ${TOUR.length}`} initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 8, opacity: 0 }} transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="solid-card fixed bottom-5 left-1/2 z-50 w-[min(520px,calc(100vw-32px))] -translate-x-1/2 rounded-[26px] p-5">
          <div className="flex items-center justify-between text-[12.5px] text-[#93a4ba]">
            <span>Demo tour · {tour + 1} of {TOUR.length}</span>
            <button onClick={() => setTour(null)} aria-label="End tour" className="grid h-8 w-8 place-items-center rounded-full hover:bg-white/10"><X size={16} /></button>
          </div>
          <div className="title-wide mt-1 text-[20px] text-[#e7edf4]">{step.title}</div>
          <p className="mt-1.5 text-[14.5px] leading-relaxed text-[#c3cfdf]">{step.body}</p>
          <div className="mt-4 flex items-center gap-3">
            <div className="flex flex-1 gap-1">{TOUR.map((_, i) => <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= tour ? 'bg-lime' : 'bg-white/15'}`} />)}</div>
            <button onClick={() => setTour(Math.max(0, tour - 1))} disabled={tour === 0} className="inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-[14px] text-[#e7edf4] hover:bg-white/10 disabled:opacity-40"><ArrowLeft size={15} />Back</button>
            <button onClick={() => (last ? setTour(null) : setTour(tour + 1))} className="inline-flex h-10 items-center gap-1.5 rounded-full bg-lime px-5 text-[14px] font-semibold text-[#0F1B2D]">
              {last ? 'Finish tour' : 'Next'}{!last && <ArrowRight size={15} />}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  )
}
