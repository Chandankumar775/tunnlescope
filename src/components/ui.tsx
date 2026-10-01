import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { motion } from 'framer-motion'
import { Check, Compass, Copy, Eye, Ruler, Sparkles, type LucideIcon } from 'lucide-react'
import type { Grade, Method, Severity } from '../lib/types'

/* ---------- surfaces ---------- */
export function Glass({ className, children, ...rest }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx('glass rounded-[28px]', className)} {...rest}>{children}</div>
}
export function Solid({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={clsx('solid-card rounded-[28px]', className)}>{children}</div>
}
export function PageHead({ title, sub, actions }: { title: ReactNode; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="title-wide text-[32px] leading-tight">{title}</h1>
        {sub && <p className="mt-1 max-w-[72ch] text-muted">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="title-wide text-[18px]">{children}</h2>
      {aside}
    </div>
  )
}

/* ---------- buttons ---------- */
type Variant = 'ink' | 'lime' | 'glass' | 'ghost'
const VARIANTS: Record<Variant, string> = {
  ink: 'bg-solid text-[#e7edf4] hover:bg-solid/85',
  lime: 'bg-lime text-[#0F1B2D] hover:brightness-95 shadow-[0_8px_24px_-10px_rgba(150,210,40,.8)]',
  glass: 'bg-panel/60 text-paper border border-rule/70 hover:bg-panel/90',
  ghost: 'text-paper hover:bg-panel/60',
}
export function Btn({
  children, icon: Icon, variant = 'ink', to, onClick, disabled, className, title, size = 'md',
}: {
  children?: ReactNode; icon?: LucideIcon; variant?: Variant; to?: string; onClick?: () => void; disabled?: boolean
  className?: string; title?: string; size?: 'sm' | 'md'
}) {
  const cls = clsx(
    'inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50',
    size === 'md' ? 'h-10 px-5 text-[14px]' : 'h-8 px-3.5 text-[13px]',
    VARIANTS[variant], className,
  )
  const inner = (<>{Icon && <Icon size={size === 'md' ? 16 : 14} strokeWidth={2.2} />}{children}</>)
  if (to) return <Link to={to} className={cls} title={title}>{inner}</Link>
  return <button type="button" onClick={onClick} disabled={disabled} className={cls} title={title}>{inner}</button>
}

/* ---------- chips & badges ---------- */
export const SEV: Record<Severity, { label: string; text: string; bg: string; bar: string }> = {
  critical: { label: 'Critical', text: 'text-critical', bg: 'bg-critical/12', bar: 'bg-critical' },
  high: { label: 'High', text: 'text-high', bg: 'bg-high/12', bar: 'bg-high' },
  medium: { label: 'Medium', text: 'text-medium', bg: 'bg-medium/15', bar: 'bg-medium' },
  low: { label: 'Low', text: 'text-low', bg: 'bg-low/15', bar: 'bg-low' },
  info: { label: 'Info', text: 'text-muted', bg: 'bg-muted/12', bar: 'bg-muted' },
  pass: { label: 'Pass', text: 'text-pass', bg: 'bg-pass/12', bar: 'bg-pass' },
}
export function SeverityChip({ s, className }: { s: Severity; className?: string }) {
  const v = SEV[s]
  return <span className={clsx('inline-flex items-center rounded-md px-2 py-0.5 text-[12px] font-semibold', v.text, v.bg, className)}>{v.label}</span>
}
export const GRADE_COLOR: Record<Grade, string> = {
  A: 'text-pass', B: 'text-low', C: 'text-medium', D: 'text-high', E: 'text-high', F: 'text-critical',
}
export const GRADE_HEX: Record<Grade, string> = { A: '#168F58', B: '#588E26', C: '#B07C08', D: '#C45018', E: '#C45018', F: '#C41E28' }
export function GradeLetter({ g, className }: { g: Grade; className?: string }) {
  return <span className={clsx('num-wide', GRADE_COLOR[g], className)}>{g}</span>
}
export function ProtocolChip({ p }: { p: 'IKE' | 'ESP' | 'AH' | 'Other' }) {
  const m = { IKE: 'text-ike bg-ike/12', ESP: 'text-esp bg-esp/12', AH: 'text-ah bg-ah/14', Other: 'text-muted bg-muted/12' }[p]
  return <span className={clsx('inline-flex rounded-md px-2 py-0.5 mono text-[12px] font-medium', m)}>{p}</span>
}
export function Chip({ children, tone = 'muted', className }: { children: ReactNode; tone?: 'muted' | 'esp' | 'ike' | 'ah' | 'pass' | 'medium' | 'critical' | 'high'; className?: string }) {
  const m = { muted: 'text-muted bg-muted/12', esp: 'text-esp bg-esp/12', ike: 'text-ike bg-ike/12', ah: 'text-ah bg-ah/14', pass: 'text-pass bg-pass/12', medium: 'text-medium bg-medium/15', critical: 'text-critical bg-critical/12', high: 'text-high bg-high/12' }[tone]
  return <span className={clsx('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-medium', m, className)}>{children}</span>
}

const METHOD: Record<Method, { icon: LucideIcon; label: string; tip: string; tone: string }> = {
  cleartext: { icon: Eye, label: 'Cleartext', tip: 'Read directly from unencrypted handshake fields.', tone: 'text-ike bg-ike/12' },
  'side-channel': { icon: Ruler, label: 'Side-channel', tip: 'Inferred from packet sizes and timing without decrypting.', tone: 'text-esp bg-esp/12' },
  ml: { icon: Sparkles, label: 'ML', tip: 'Predicted by the trained classifier.', tone: 'text-ah bg-ah/14' },
  heuristic: { icon: Compass, label: 'Heuristic', tip: 'Best estimate from protocol patterns; treat as a lead, not proof.', tone: 'text-muted bg-muted/14' },
}
export function MethodBadge({ m }: { m: Method }) {
  const v = METHOD[m]
  return (
    <span title={v.tip} className={clsx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-medium', v.tone)}>
      <v.icon size={13} />{v.label}
    </span>
  )
}
export const METHOD_TIPS = METHOD

export function ConfidenceBar({ value, className, animate = true }: { value: number; className?: string; animate?: boolean }) {
  return (
    <div className={clsx('flex items-center gap-2.5', className)} role="img" aria-label={`Confidence ${Math.round(value * 100)} percent`}>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-rule/60">
        <motion.div
          className={clsx('h-full rounded-full', value >= 0.85 ? 'bg-esp' : value >= 0.7 ? 'bg-esp/75' : 'bg-medium')}
          initial={animate ? { width: 0 } : false}
          animate={{ width: `${value * 100}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
      <span className="w-10 text-right text-[13px] tabular-nums text-muted">{Math.round(value * 100)}%</span>
    </div>
  )
}

/* ---------- stat tile ---------- */
export function StatTile({ label, value, sub, icon: Icon, tone }: { label: string; value: ReactNode; sub?: ReactNode; icon?: LucideIcon; tone?: string }) {
  return (
    <div className="glass flex min-w-[150px] flex-1 items-center gap-3 rounded-2xl px-4 py-3">
      {Icon && (
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-panel/80 text-paper"><Icon size={18} /></span>
      )}
      <div className="min-w-0">
        <div className="label truncate">{label}</div>
        <div className={clsx('num-wide text-[24px] leading-none', tone)}>{value}</div>
        {sub && <div className="mt-1 text-[12px] text-muted">{sub}</div>}
      </div>
    </div>
  )
}

/* ---------- tabs / segmented ---------- */
export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div role="tablist" className="glass flex max-w-full gap-1 overflow-x-auto rounded-full p-1.5">
      {tabs.map((t) => (
        <button
          key={t.id} role="tab" aria-selected={value === t.id} onClick={() => onChange(t.id)}
          className={clsx('whitespace-nowrap rounded-full px-4 py-2 text-[14px] font-medium transition-colors', value === t.id ? 'bg-solid text-[#e7edf4]' : 'text-muted hover:text-paper')}
        >{t.label}</button>
      ))}
    </div>
  )
}
export function Segmented<T extends string | number>({ options, value, onChange, small }: { options: { id: T; label: string }[]; value: T; onChange: (v: T) => void; small?: boolean }) {
  return (
    <div className="inline-flex rounded-full bg-panel2/70 p-1">
      {options.map((o) => (
        <button
          key={String(o.id)} onClick={() => onChange(o.id)} aria-pressed={value === o.id}
          className={clsx('rounded-full font-medium transition-colors', small ? 'px-3 py-1 text-[13px]' : 'px-4 py-1.5 text-[14px]', value === o.id ? 'bg-solid text-[#e7edf4] shadow-sm' : 'text-muted hover:text-paper')}
        >{o.label}</button>
      ))}
    </div>
  )
}
export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
      className={clsx('relative h-7 w-12 rounded-full transition-colors', on ? 'bg-pass' : 'bg-rule')}>
      <span className={clsx('absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all', on ? 'left-6' : 'left-1')} />
    </button>
  )
}
export function Select<T extends string | number>({ value, onChange, options, className, label }: { value: T; onChange: (v: T) => void; options: { id: T; label: string }[]; className?: string; label?: string }) {
  return (
    <select
      aria-label={label}
      value={String(value)}
      onChange={(e) => {
        const o = options.find((x) => String(x.id) === e.target.value)
        if (o) onChange(o.id)
      }}
      className={clsx('h-10 rounded-xl border border-rule/70 bg-panel/70 px-3 text-[14px] text-paper outline-none', className)}
    >
      {options.map((o) => <option key={String(o.id)} value={String(o.id)}>{o.label}</option>)}
    </select>
  )
}

/* ---------- code ---------- */
export function CodeBlock({ code, className, copyLabel = 'Copy fix' }: { code: string; className?: string; copyLabel?: string }) {
  const [done, setDone] = useState(false)
  const lines = code.split('\n')
  const copy = () => {
    navigator.clipboard?.writeText(code).catch(() => undefined)
    setDone(true)
    setTimeout(() => setDone(false), 1400)
  }
  return (
    <div className={clsx('solid-card relative rounded-2xl', className)}>
      <button onClick={copy} className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[12px] font-medium text-[#e7edf4] hover:bg-white/20">
        {done ? <Check size={13} /> : <Copy size={13} />}{done ? 'Copied' : copyLabel}
      </button>
      <pre className="mono overflow-x-auto p-4 pr-28 text-[13px] leading-6">
        {lines.map((l, i) => (
          <div key={i} className="flex gap-4">
            <span className="w-5 shrink-0 select-none text-right text-[#5d7090]">{i + 1}</span>
            <code className={clsx(/^\s*#/.test(l) ? 'text-[#7d93b2]' : '')}>{highlight(l)}</code>
          </div>
        ))}
      </pre>
    </div>
  )
}
function highlight(l: string): ReactNode {
  const m = l.match(/^(\s*)([A-Za-z_][\w-]*)(\s*=\s*)(.*)$/)
  if (m) return (<>{m[1]}<span className="text-[#4CC9F0]">{m[2]}</span><span className="text-[#93a4ba]">{m[3]}</span><span className="text-[#F4A261]">{m[4]}</span></>)
  const b = l.match(/^(\s*)([A-Za-z_][\w-]*)(\s*\{.*)$/)
  if (b) return (<>{b[1]}<span className="text-[#B79CED]">{b[2]}</span>{b[3]}</>)
  return l
}

/* ---------- state ---------- */
export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <Glass className="grid place-items-center px-6 py-14 text-center">
      <div className="title-wide text-[20px]">{title}</div>
      <p className="mt-1 max-w-[52ch] text-muted">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </Glass>
  )
}

export const cx = clsx
