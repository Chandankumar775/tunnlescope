import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail, User as UserIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Logo } from '../components/Layout'
import PacketRibbon from '../components/PacketRibbon'
import { Btn } from '../components/ui'
import { authMessage, useAuth } from '../lib/auth'
import { ANALYSES } from '../data/analyses'

type Mode = 'in' | 'up' | 'reset'

function Field({ icon: Icon, label, ...p }: { icon: typeof Mail; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-muted">{label}</span>
      <span className="relative block">
        <Icon size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
        <input {...p} className="h-12 w-full rounded-2xl border border-rule/70 bg-panel/80 pl-11 pr-4 text-[15px] outline-none transition-shadow placeholder:text-muted/60 focus:border-esp focus:ring-4 focus:ring-esp/15" />
      </span>
    </label>
  )
}

export default function Login() {
  const { user, signIn, signUp, google, reset, demo } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const [mode, setMode] = useState<Mode>('in')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const from = (loc.state as { from?: string } | null)?.from ?? '/'
  const s06 = ANALYSES.find((a) => a.id === 'S06')!

  if (user) return <Navigate to={from} replace />

  const run = async (fn: () => Promise<void>, ok: string) => {
    setBusy(true); setErr('')
    try { await fn(); toast.success(ok); if (mode !== 'reset') nav(from, { replace: true }) }
    catch (e) { setErr(authMessage(e)) }
    finally { setBusy(false) }
  }
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (mode === 'in') run(() => signIn(email, pw), 'Signed in')
    else if (mode === 'up') run(() => signUp(name || email.split('@')[0], email, pw), 'Account created')
    else run(() => reset(email), 'Reset link sent — check your inbox')
  }

  return (
    <div className="grid min-h-full gap-4 p-3 md:p-4 lg:grid-cols-[1.1fr_1fr]">
      <section className="solid-card relative hidden flex-col justify-between overflow-hidden rounded-[32px] p-10 lg:flex">
        <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-esp/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 right-0 h-96 w-96 rounded-full bg-ah/20 blur-3xl" />
        <div className="relative flex items-center gap-3"><Logo size={44} /><span className="title-wide text-[24px]">TunnelScope</span></div>
        <div className="relative">
          <h1 className="title-wide max-w-[14ch] text-[56px] leading-[1.02] text-balance">See inside IPsec without breaking it.</h1>
          <p className="mt-4 max-w-[46ch] text-[16px] text-[#b6c4d8]">Upload a capture. Get the configuration, the score, the threats and the fix, with the method and confidence behind every claim.</p>
          <div className="mt-8 rounded-3xl bg-white/5 p-5 ring-1 ring-white/10">
            <div className="mb-3 flex items-center justify-between text-[13px] text-[#93a4ba]"><span>{s06.scenario.name}</span><span className="rounded-md bg-critical/20 px-2 py-0.5 font-semibold text-critical">Grade {s06.summary.grade} · {s06.summary.score}</span></div>
            <PacketRibbon segments={s06.representative_packet.segments} protocol="ESP" />
          </div>
        </div>
        <ul className="relative grid grid-cols-3 gap-4 text-[13px] text-[#93a4ba]">
          <li><b className="mb-0.5 block text-[15px] text-[#e7edf4]">Offline</b>No cloud calls for analysis</li>
          <li><b className="mb-0.5 block text-[15px] text-[#e7edf4]">Evidence-led</b>Every field shows how it was found</li>
          <li><b className="mb-0.5 block text-[15px] text-[#e7edf4]">Reportable</b>Executive and technical PDFs</li>
        </ul>
      </section>

      <section className="grid place-items-center">
        <div className="glass w-full max-w-[460px] rounded-[32px] p-8 md:p-10">
          <div className="mb-6 flex items-center justify-between"><Link to="/welcome" className="flex items-center gap-3"><Logo /><span className="title-wide text-[20px]">TunnelScope</span></Link><Link to="/welcome" className="text-[13px] text-muted hover:text-paper">Back to site</Link></div>
          <h2 className="title-wide text-[30px] leading-tight">{mode === 'in' ? 'Welcome back' : mode === 'up' ? 'Create your account' : 'Reset your password'}</h2>
          <p className="mt-1 text-muted">{mode === 'in' ? 'Sign in to open your captures and reports.' : mode === 'up' ? 'Takes under a minute. No card required.' : 'Enter your email and we will send a reset link.'}</p>

          {demo && (
            <div className="mt-4 rounded-2xl bg-medium/12 p-3 text-[13px] text-paper" role="note">
              <b>Demo sign-in.</b> Firebase keys are not set, so accounts are stored only in this browser. Add the <span className="mono">VITE_FIREBASE_*</span> values to <span className="mono">.env</span> for real authentication.
            </div>
          )}

          <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
            {mode === 'up' && <Field icon={UserIcon} label="Full name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Asha Verma" />}
            <Field icon={Mail} label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="you@organisation.in" required />
            {mode !== 'reset' && (
              <div className="relative">
                <Field icon={Lock} label="Password" type={show ? 'text' : 'password'} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} placeholder="At least 6 characters" required />
                <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute bottom-3 right-3 grid h-6 w-6 place-items-center text-muted hover:text-paper">{show ? <EyeOff size={17} /> : <Eye size={17} />}</button>
              </div>
            )}
            {err && <p role="alert" className="rounded-xl bg-critical/10 px-3 py-2 text-[13.5px] text-critical">{err}</p>}
            <button disabled={busy || !email || (mode !== 'reset' && !pw)} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-solid text-[15px] font-medium text-[#e7edf4] transition-all hover:bg-solid/85 active:scale-[.99] disabled:opacity-50">
              {busy ? <Loader2 size={18} className="animate-spin" /> : null}
              {mode === 'in' ? 'Sign in' : mode === 'up' ? 'Create account' : 'Send reset link'}
              {!busy && <ArrowRight size={17} />}
            </button>
          </form>

          {mode !== 'reset' && (
            <>
              <div className="my-5 flex items-center gap-3 text-[12px] text-muted"><span className="h-px flex-1 bg-rule/70" />or<span className="h-px flex-1 bg-rule/70" /></div>
              <Btn variant="glass" className="w-full !h-12" onClick={() => run(google, 'Signed in with Google')} disabled={busy}>
                <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" /><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" /><path fill="#FBBC05" d="M10.5 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.100 0 24s.9 7.600 2.600 10.800l7.900-6.100z" /><path fill="#34A853" d="M24 48c6.300 0 11.600-2.100 15.500-5.700l-7.500-5.800c-2.100 1.400-4.800 2.300-8 2.300-6.300 0-11.600-4.100-13.500-9.800l-7.900 6.100C6.500 42.600 14.600 48 24 48z" /></svg>
                Continue with Google
              </Btn>
            </>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-2 text-[14px]">
            {mode === 'in' ? (
              <>
                <button className="text-muted underline-offset-4 hover:text-paper hover:underline" onClick={() => { setMode('reset'); setErr('') }}>Forgot password?</button>
                <button className="font-medium underline-offset-4 hover:underline" onClick={() => { setMode('up'); setErr('') }}>Create an account</button>
              </>
            ) : (
              <button className="font-medium underline-offset-4 hover:underline" onClick={() => { setMode('in'); setErr('') }}>Back to sign in</button>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
