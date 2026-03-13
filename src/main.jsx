import { StrictMode, useState, useEffect, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import Auth from './Auth.jsx'
import { OrgPicker } from './components/OrgPicker.jsx'
import { supabase } from './lib/supabaseClient.js'
import LandingPage from './components/LandingPage.jsx'
import MemberPortal from './components/MemberPortal.jsx'

function Root() {
  const [session, setSession] = useState(null)
  const [checking, setChecking] = useState(true)
  const [currentOrg, setCurrentOrg] = useState(null)
  const [orgRole, setOrgRole] = useState(null)
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false)
  const [showLanding, setShowLanding] = useState(true)
  const [userRole, setUserRole] = useState(null)
  const [memberOrgId, setMemberOrgId] = useState(null)
  const switchedRef = useRef(false)

  // Scope sessionStorage keys to user so different users don't share org
  const uid = session?.user?.id || 'anon'
  const ORG_KEY  = `uf_current_org_${uid}`
  const ROLE_KEY = `uf_org_role_${uid}`

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setChecking(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true)
        setSession(session)
        return
      }
      setSession(session)
      // Clear org when user signs out
      if (!session) { setCurrentOrg(null); setOrgRole(null); switchedRef.current = false; setIsPasswordRecovery(false); }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Fetch role from profiles when session loads
  useEffect(() => {
    if (!session) { setUserRole(null); return; }
    supabase.from("profiles").select("role, org_id").eq("id", session.user.id).maybeSingle()
      .then(({ data }) => { setUserRole(data?.role || null); setMemberOrgId(data?.org_id || null); })
  }, [session?.user?.id])

  // Restore org from sessionStorage when session loads — but not if user just switched
  useEffect(() => {
    if (!session) return
    if (switchedRef.current) return
    const savedOrg  = sessionStorage.getItem(ORG_KEY)
    const savedRole = sessionStorage.getItem(ROLE_KEY)
    if (savedOrg && savedRole) {
      setCurrentOrg(JSON.parse(savedOrg))
      setOrgRole(savedRole)
    }
  }, [session?.user?.id])

  function handleOrgSelect(org, role) {
    switchedRef.current = false
    setCurrentOrg(org)
    setOrgRole(role)
    sessionStorage.setItem(ORG_KEY, JSON.stringify(org))
    sessionStorage.setItem(ROLE_KEY, role)
  }

  function handleSwitchOrg() {
    switchedRef.current = true
    setCurrentOrg(null)
    setOrgRole(null)
    sessionStorage.removeItem(ORG_KEY)
    sessionStorage.removeItem(ROLE_KEY)
  }


  if (checking) return null

  if (showLanding && !session && !isPasswordRecovery) return <LandingPage onSignIn={() => setShowLanding(false)} />

  if (!session || isPasswordRecovery) return <Auth isPasswordRecovery={isPasswordRecovery} onPasswordReset={() => setIsPasswordRecovery(false)} onGoHome={() => setShowLanding(true)} />

  // Members skip OrgPicker — their org is stored on their profile row
  if (session && userRole === "member") {
    return <MemberPortal session={session} orgId={memberOrgId}/>
  }

  if (!currentOrg) return (
    <OrgPicker
      session={session}
      onSelect={handleOrgSelect}
      allowAutoEnter={!switchedRef.current}
    />
  )

  return (
    <App
      session={session}
      currentOrg={currentOrg}
      orgRole={orgRole}
      onSwitchOrg={handleSwitchOrg}
    />
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)