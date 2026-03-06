import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import Auth from './Auth.jsx'
import { OrgPicker } from './components/OrgPicker.jsx'
import { supabase } from './lib/supabaseClient.js'

function Root() {
  const [session, setSession] = useState(null)
  const [checking, setChecking] = useState(true)
  const [currentOrg, setCurrentOrg] = useState(null)
  const [orgRole, setOrgRole] = useState(null)

  // Scope sessionStorage keys to user so different users don't share org
  const uid = session?.user?.id || 'anon'
  const ORG_KEY  = `uf_current_org_${uid}`
  const ROLE_KEY = `uf_org_role_${uid}`

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setChecking(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      // Clear org when user signs out
      if (!session) { setCurrentOrg(null); setOrgRole(null); }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Restore org from sessionStorage when session loads
  useEffect(() => {
    if (!session) return
    const savedOrg  = sessionStorage.getItem(ORG_KEY)
    const savedRole = sessionStorage.getItem(ROLE_KEY)
    if (savedOrg && savedRole) {
      setCurrentOrg(JSON.parse(savedOrg))
      setOrgRole(savedRole)
    }
  }, [session?.user?.id])

  function handleOrgSelect(org, role) {
    setCurrentOrg(org)
    setOrgRole(role)
    sessionStorage.setItem(ORG_KEY, JSON.stringify(org))
    sessionStorage.setItem(ROLE_KEY, role)
  }

  function handleSwitchOrg() {
    setCurrentOrg(null)
    setOrgRole(null)
    sessionStorage.removeItem(ORG_KEY)
    sessionStorage.removeItem(ROLE_KEY)
  }

  if (checking) return null

  if (!session) return <Auth />

  if (!currentOrg) return (
    <OrgPicker
      session={session}
      onSelect={handleOrgSelect}
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