import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  GoogleAuthProvider, createUserWithEmailAndPassword, onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword,
  signInWithPopup, signOut as fbSignOut, updateProfile,
} from 'firebase/auth'
import { auth, firebaseConfigured } from './firebase'

export interface User { uid: string; email: string; name: string; demo: boolean }

interface AuthCtx {
  user: User | null
  loading: boolean
  demo: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (name: string, email: string, password: string) => Promise<void>
  google: () => Promise<void>
  reset: (email: string) => Promise<void>
  signOut: () => Promise<void>
}

const Ctx = createContext<AuthCtx | null>(null)
const DEMO_KEY = 'ts-demo-user'
const DEMO_USERS = 'ts-demo-accounts'

/** Turns Firebase error codes into sentences that name the problem and the fix. */
export function authMessage(e: unknown): string {
  const code = (e as { code?: string })?.code ?? ''
  const map: Record<string, string> = {
    'auth/invalid-credential': 'Email or password is incorrect. Check both and try again.',
    'auth/wrong-password': 'Password is incorrect. Try again or reset it.',
    'auth/user-not-found': 'No account uses that email. Create one instead.',
    'auth/email-already-in-use': 'That email already has an account. Sign in instead.',
    'auth/weak-password': 'Use a password with at least 6 characters.',
    'auth/invalid-email': 'That email address is not valid.',
    'auth/too-many-requests': 'Too many attempts. Wait a minute, then try again.',
    'auth/popup-closed-by-user': 'The Google window was closed before sign-in finished.',
    'auth/network-request-failed': 'Network request failed. Check your connection and retry.',
    'auth/operation-not-allowed': 'This sign-in method is not enabled in the Firebase console.',
    'auth/unauthorized-domain': 'This domain is not authorised in Firebase. Add localhost under Authentication → Settings.',
  }
  return map[code] ?? (e instanceof Error ? e.message : 'Something went wrong. Try again.')
}

function readDemo(): User | null {
  try { const r = localStorage.getItem(DEMO_KEY); return r ? (JSON.parse(r) as User) : null } catch { return null }
}
function accounts(): Record<string, { name: string; password: string }> {
  try { return JSON.parse(localStorage.getItem(DEMO_USERS) ?? '{}') } catch { return {} }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => (firebaseConfigured ? null : readDemo()))
  const [loading, setLoading] = useState(firebaseConfigured)

  useEffect(() => {
    if (!auth) return
    return onAuthStateChanged(auth, (u) => {
      setUser(u ? { uid: u.uid, email: u.email ?? '', name: u.displayName || (u.email ?? 'Analyst').split('@')[0], demo: false } : null)
      setLoading(false)
    })
  }, [])

  const value = useMemo<AuthCtx>(() => {
    const setDemo = (u: User | null) => {
      setUser(u)
      try { u ? localStorage.setItem(DEMO_KEY, JSON.stringify(u)) : localStorage.removeItem(DEMO_KEY) } catch { /* ignore */ }
    }
    return {
      user, loading, demo: !firebaseConfigured,
      async signIn(email, password) {
        if (auth) { await signInWithEmailAndPassword(auth, email, password); return }
        const acc = accounts()[email.toLowerCase()]
        if (!acc || acc.password !== password) throw { code: acc ? 'auth/wrong-password' : 'auth/user-not-found' }
        setDemo({ uid: 'demo-' + email, email, name: acc.name, demo: true })
      },
      async signUp(name, email, password) {
        if (auth) {
          const cred = await createUserWithEmailAndPassword(auth, email, password)
          await updateProfile(cred.user, { displayName: name })
          setUser({ uid: cred.user.uid, email, name, demo: false })
          return
        }
        const all = accounts()
        if (all[email.toLowerCase()]) throw { code: 'auth/email-already-in-use' }
        if (password.length < 6) throw { code: 'auth/weak-password' }
        all[email.toLowerCase()] = { name, password }
        try { localStorage.setItem(DEMO_USERS, JSON.stringify(all)) } catch { /* ignore */ }
        setDemo({ uid: 'demo-' + email, email, name, demo: true })
      },
      async google() {
        if (auth) { await signInWithPopup(auth, new GoogleAuthProvider()); return }
        setDemo({ uid: 'demo-google', email: 'analyst@demo.local', name: 'Demo analyst', demo: true })
      },
      async reset(email) {
        if (auth) { await sendPasswordResetEmail(auth, email); return }
        if (!accounts()[email.toLowerCase()]) throw { code: 'auth/user-not-found' }
      },
      async signOut() {
        if (auth) { await fbSignOut(auth); return }
        setDemo(null)
      },
    }
  }, [user, loading])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useAuth must be used inside AuthProvider')
  return c
}
