import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
const Overview = lazy(() => import('./pages/Overview'))
const Captures = lazy(() => import('./pages/Captures'))
const AnalysisPage = lazy(() => import('./pages/Analysis'))
const Live = lazy(() => import('./pages/Live'))
const Testbed = lazy(() => import('./pages/Testbed'))
const Models = lazy(() => import('./pages/Models'))
const Compare = lazy(() => import('./pages/Compare'))
const Reports = lazy(() => import('./pages/Reports'))
const Methodology = lazy(() => import('./pages/Methodology'))
const Login = lazy(() => import('./pages/Login'))
const Landing = lazy(() => import('./pages/Landing'))
const Findings = lazy(() => import('./pages/Findings'))
const Settings = lazy(() => import('./pages/Settings'))
const Fleet = lazy(() => import('./pages/Fleet'))
import { Btn, EmptyState } from './components/ui'
import { useAuth } from './lib/auth'
import { Navigate, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'

const Spinner = () => <div className="grid h-full min-h-[60vh] place-items-center text-muted"><Loader2 className="animate-spin" aria-label="Loading" /></div>

function RequireAuth({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth()
  const loc = useLocation()
  if (loading) return <div className="grid h-full min-h-screen place-items-center text-muted"><Loader2 className="animate-spin" /></div>
  if (!user) return <Navigate to="/welcome" state={{ from: loc.pathname }} replace />
  return children
}

export default function App() {
  return (
    <Suspense fallback={<Spinner />}>
    <Routes>
      <Route path="welcome" element={<Landing />} />
      <Route path="login" element={<Login />} />
      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={<Overview />} />
        <Route path="captures" element={<Captures />} />
        <Route path="analysis/:id" element={<AnalysisPage />} />
        <Route path="analysis/:id/:tab" element={<AnalysisPage />} />
        <Route path="findings" element={<Findings />} />
        <Route path="settings" element={<Settings />} />
        <Route path="fleet" element={<Fleet />} />
        <Route path="live" element={<Live />} />
        <Route path="testbed" element={<Testbed />} />
        <Route path="models" element={<Models />} />
        <Route path="compare" element={<Compare />} />
        <Route path="reports" element={<Reports />} />
        <Route path="methodology" element={<Methodology />} />
        <Route path="*" element={<EmptyState title="This page doesn't exist" body="The address you followed doesn't match any TunnelScope page." action={<Btn to="/">Go to Overview</Btn>} />} />
      </Route>
    </Routes>
    </Suspense>
  )
}
