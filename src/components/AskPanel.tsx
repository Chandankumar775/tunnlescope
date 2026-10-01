import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowUp, MessageSquareText, WifiOff, X } from 'lucide-react'
import { useStore } from '../lib/store'
import { useAnalysis } from '../lib/useAnalyses'
import { answer, SUGGESTIONS, type Answer } from '../lib/ask'

interface Turn { q: string; a: Answer }

function Typed({ text, onDone }: { text: string; onDone?: () => void }) {
  const reduce = useReducedMotion()
  const [n, setN] = useState(reduce ? text.length : 0)
  useEffect(() => {
    if (reduce) { onDone?.(); return }
    let i = 0
    const t = setInterval(() => { i += 3; setN(i); if (i >= text.length) { clearInterval(t); onDone?.() } }, 12)
    return () => clearInterval(t)
  }, [text]) // eslint-disable-line react-hooks/exhaustive-deps
  return <>{text.slice(0, n)}</>
}

export default function AskPanel() {
  const { ask, setAsk, current } = useStore()
  const a = useAnalysis(current)
  const [q, setQ] = useState('')
  const [turns, setTurns] = useState<Turn[]>([])
  const end = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => { setTurns([]) }, [current])
  useEffect(() => { if (ask) setTimeout(() => input.current?.focus(), 50) }, [ask])
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }) }, [turns])

  const send = (text: string) => {
    if (!a || !text.trim()) return
    setTurns((t) => [...t, { q: text.trim(), a: answer(a, text) }])
    setQ('')
  }
  const submit = (e: FormEvent) => { e.preventDefault(); send(q) }

  return (
    <AnimatePresence>
      {ask && (
        <motion.aside role="dialog" aria-label="Ask TunnelScope" initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }} transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="glass fixed bottom-4 right-4 top-4 z-50 flex w-[min(420px,calc(100vw-32px))] flex-col rounded-[28px] !bg-panel/95">
          <div className="flex items-center gap-3 border-b border-rule/60 px-5 py-4">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-solid text-lime"><MessageSquareText size={17} /></span>
            <div className="min-w-0 flex-1">
              <div className="font-semibold">Ask TunnelScope</div>
              <div className="truncate text-[12.5px] text-muted">{a ? a.capture_name : 'Pick a capture first'}</div>
            </div>
            <button onClick={() => setAsk(false)} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full hover:bg-panel2"><X size={17} /></button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <div className="flex items-start gap-2 rounded-2xl bg-panel2/70 p-3 text-[13px] text-muted">
              <WifiOff size={15} className="mt-0.5 shrink-0" />Answers are assembled offline from this analysis. No AI service is called and nothing leaves this machine.
            </div>
            {turns.map((t, i) => (
              <div key={i} className="space-y-2">
                <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-solid px-3.5 py-2 text-[14px] text-[#e7edf4]">{t.q}</div>
                <div className="max-w-[95%] rounded-2xl rounded-bl-md border border-rule/60 bg-panel px-3.5 py-2.5 text-[14px] leading-relaxed">
                  <Typed text={t.a.text} />
                  {(t.a.cites.length > 0 || t.a.link) && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {t.a.cites.map((c) => <span key={c} className="mono rounded-md bg-panel2 px-1.5 py-0.5 text-[11.5px] text-muted">{c}</span>)}
                      {t.a.link && <Link to={t.a.link.to} onClick={() => setAsk(false)} className="text-[13px] font-medium text-esp underline-offset-4 hover:underline">{t.a.link.label}</Link>}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {turns.length === 0 && (
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => <button key={s} onClick={() => send(s)} className="rounded-full border border-rule/70 bg-panel px-3 py-1.5 text-left text-[13px] hover:border-esp">{s}</button>)}
              </div>
            )}
            <div ref={end} />
          </div>

          <form onSubmit={submit} className="border-t border-rule/60 p-3">
            <div className="flex items-center gap-2 rounded-full border border-rule/70 bg-panel px-2 py-1.5 focus-within:border-esp">
              <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask about this capture" aria-label="Question" className="h-9 flex-1 bg-transparent px-2 text-[14px] outline-none placeholder:text-muted/70" />
              <button disabled={!q.trim() || !a} aria-label="Send" className="grid h-9 w-9 place-items-center rounded-full bg-solid text-[#e7edf4] disabled:opacity-40"><ArrowUp size={16} /></button>
            </div>
          </form>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
