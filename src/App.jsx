import { useState, useEffect } from "react";
import { supabase } from "./lib/supabaseClient.js";
import { useAppData } from "./hooks/useAppData.js";
import { Avatar, SkeletonTab } from "./components/ui/index.jsx";
import { OverviewTab }    from "./components/tabs/OverviewTab.jsx";
import { PeopleTab }      from "./components/tabs/PeopleTab.jsx";
import { PaymentTypesTab } from "./components/tabs/PaymentTypesTab.jsx";
import { ExpensesTab }    from "./components/tabs/ExpensesTab.jsx";
import { ActivityTab }    from "./components/tabs/ActivityTab.jsx";
import { AuditTab }       from "./components/tabs/AuditTab.jsx";
import { SettingsTab }    from "./components/tabs/SettingsTab.jsx";
import { Modals }         from "./components/modals/Modals.jsx";

const ACTIVITY_PAGE_SIZE = 20;

export default function App({ session }) {
  const app = useAppData({ session });
  const { t, isDark, toggleTheme, activeTab, setActiveTab, navItems,
          orgName, loading, isSuperAdmin, visible } = app;
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    const handler = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setMobileOpen(false);
    };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const SW = isMobile ? 0 : collapsed ? 64 : 240;

  const fyText = app.data.org?.financial_year_start
    ? `FY ${app.data.org.financial_year_start}`
    : null;

  if (loading) return (
    <div style={{ minHeight:"100vh", background:t.bg, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"-apple-system,sans-serif" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ width:48, height:48, borderRadius:14, background:t.heroGrad, margin:"0 auto 16px", animation:"pulse 1.5s ease-in-out infinite", boxShadow:"0 8px 32px rgba(0,113,227,0.4)" }}/>
        <p style={{ color:t.textSub, fontSize:14 }}>Loading {orgName}...</p>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:t.bg, fontFamily:"-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif", color:t.text, transition:"background 0.3s, color 0.3s" }}>
      <style>{`
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes slideUp { from{opacity:0;transform:translateY(24px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes slideIn { from{opacity:0;transform:translateX(-12px)} to{opacity:1;transform:translateX(0)} }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.7;transform:scale(0.95)} }
        @keyframes shimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }
        .nav-btn:hover { background:rgba(0,113,227,0.07) !important; color:#0071E3 !important; }
        .row-hover:hover { background:rgba(0,113,227,0.04) !important; transition:background 0.15s; }
        .card-hover { transition:transform 0.2s ease, box-shadow 0.2s ease; }
        .card-hover:hover { transform:translateY(-2px); box-shadow:0 10px 36px rgba(0,0,0,0.13) !important; }
        .grid-3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:16px; }
        .grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
        .col-span-2 { grid-column:span 2; }
        @media (max-width:767px) {
          .main-content { margin-left:0 !important; padding:72px 16px 24px !important; }
          .mobile-topbar { display:flex !important; }
          .grid-3 { grid-template-columns:1fr !important; gap:12px !important; }
          .grid-2 { grid-template-columns:1fr !important; gap:12px !important; }
          .col-span-2 { grid-column:span 1 !important; }
          .hero-amount { font-size:36px !important; }
          .row-actions { flex-wrap:wrap; }
        }
        @media (min-width:768px) {
          .mobile-topbar { display:none !important; }
        }
        @media print {
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { position: fixed !important; inset: 0 !important; border: none !important; border-radius: 0 !important; box-shadow: none !important; padding: 32px 40px !important; margin: 0 !important; overflow: visible !important; }
          .print-stats { display: grid !important; grid-template-columns: 1fr 1fr 1fr !important; gap: 16px !important; }
        }
      `}</style>

      {/* ── Mobile top bar ── */}
      <div className="mobile-topbar" style={{ display:"none", position:"fixed", top:0, left:0, right:0, height:56, background:t.sidebar, backdropFilter:"blur(40px)", borderBottom:`1px solid ${t.border}`, alignItems:"center", justifyContent:"space-between", padding:"0 16px", zIndex:200 }}>
        <button onClick={()=>setMobileOpen(true)} style={{ background:"none", border:"none", cursor:"pointer", color:t.text, fontSize:22, padding:4, display:"flex", alignItems:"center", justifyContent:"center" }}>☰</button>
        <div style={{ fontSize:15, fontWeight:700, color:t.text, letterSpacing:"-0.3px" }}>{orgName}</div>
        <button onClick={toggleTheme} style={{ background:"none", border:"none", cursor:"pointer", fontSize:18, padding:4 }}>{isDark?"☀️":"🌙"}</button>
      </div>

      {/* ── Mobile overlay backdrop ── */}
      {isMobile && mobileOpen && (
        <div onClick={()=>setMobileOpen(false)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:150, animation:"fadeIn 0.2s ease" }}/>
      )}

      {/* ── Sidebar ── */}
      <div style={{
        position:"fixed", left:0, top:0, bottom:0,
        width: isMobile ? 260 : SW,
        background:t.sidebar, backdropFilter:"blur(40px)",
        borderRight:`1px solid ${t.border}`,
        display:"flex", flexDirection:"column", padding:"28px 0",
        zIndex: isMobile ? 160 : 100,
        transition: isMobile ? "transform 0.3s cubic-bezier(0.4,0,0.2,1)" : "width 0.3s cubic-bezier(0.4,0,0.2,1), background 0.3s",
        transform: isMobile ? (mobileOpen ? "translateX(0)" : "translateX(-100%)") : "translateX(0)",
        overflow:"hidden",
      }}>
        
        {/* Logo + collapse toggle */}
        <div style={{ padding:"0 12px 32px", display:"flex", alignItems:"center", justifyContent:collapsed&&!isMobile?"center":"space-between", minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, minWidth:0, overflow:"hidden" }}>
            <div onClick={collapsed&&!isMobile?()=>setCollapsed(false):undefined} style={{ width:34, height:34, borderRadius:10, background:t.heroGrad, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 4px 12px rgba(0,113,227,0.35)", flexShrink:0, cursor:collapsed&&!isMobile?"pointer":"default" }} title={collapsed&&!isMobile?"Expand sidebar":""}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 8h5M9 8h5M8 2v5M8 9v5" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
            </div>
            {(!collapsed || isMobile) && (
              <div style={{ minWidth:0 }}>
                <div style={{ fontSize:15, fontWeight:700, letterSpacing:"-0.3px", color:t.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{orgName}</div>
                {fyText && <div style={{ fontSize:10, color:t.textSub, fontWeight:500 }}>FY {fyText}</div>}
              </div>
            )}
          </div>
          {isMobile ? (
            <button onClick={()=>setMobileOpen(false)} style={{ background:"none", border:"none", cursor:"pointer", color:t.textSub, fontSize:20, padding:4, borderRadius:6, lineHeight:1 }}>✕</button>
          ) : !collapsed ? (
            <button onClick={()=>setCollapsed(true)} style={{ background:"none", border:"none", cursor:"pointer", color:t.textSub, fontSize:16, padding:4, borderRadius:6, flexShrink:0, lineHeight:1, display:"flex", alignItems:"center", justifyContent:"center" }} title="Collapse">←</button>
          ) : null}
        </div>

        <nav style={{ flex:1, padding:"0 8px", display:"flex", flexDirection:"column", gap:2 }}>
          {navItems.map((item,i)=>(
            <button key={item.id} className="nav-btn" onClick={()=>{ setActiveTab(item.id); if(isMobile) setMobileOpen(false); }}
              title={collapsed&&!isMobile?item.label:""}
              style={{ display:"flex", alignItems:"center", gap:10, width:"100%", padding:"10px 12px", borderRadius:10, border:"none", cursor:"pointer", fontSize:13, fontWeight:activeTab===item.id?600:500, background:activeTab===item.id?`${t.accent}12`:"transparent", color:activeTab===item.id?t.accent:t.textSub, textAlign:"left", transition:"all 0.15s", animation:`slideIn 0.3s ease ${i*0.04}s both`, justifyContent:collapsed&&!isMobile?"center":"flex-start" }}>
              <span style={{ fontSize:17, flexShrink:0 }}>{item.icon}</span>
              {(!collapsed || isMobile) && <span>{item.label}</span>}
              {(!collapsed || isMobile) && activeTab===item.id && <div style={{ marginLeft:"auto", width:6, height:6, borderRadius:"50%", background:t.accent }}/>}
            </button>
          ))}
        </nav>

        <div style={{ padding:"0 8px", display:"flex", flexDirection:"column", gap:8 }}>
          <button onClick={toggleTheme} title={isDark?"Light mode":"Dark mode"} style={{ background:"none", border:"none", cursor:"pointer", color:t.textSub, fontSize:18, padding:"8px 12px", textAlign:collapsed&&!isMobile?"center":"left", borderRadius:8, width:"100%" }}>
            {isDark?"☀️":"🌙"}
          </button>
          <div style={{ display:"flex", alignItems:"center", gap:collapsed&&!isMobile?0:10, padding:"10px 12px", borderRadius:12, background:t.surfaceAlt, border:`1px solid ${t.border}`, justifyContent:collapsed&&!isMobile?"center":"flex-start" }}>
            <Avatar name={session?.user?.email||"A"} size={30}/>
            {(!collapsed || isMobile) && (
              <>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:10, fontWeight:700, color:t.accent, textTransform:"uppercase", letterSpacing:"0.06em" }}>{isSuperAdmin?"Super Admin":"Admin"}</div>
                  <div style={{ fontSize:11, color:t.textSub, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{session?.user?.email}</div>
                </div>
                <button onClick={()=>supabase.auth.signOut()} style={{ background:"none", border:"none", cursor:"pointer", color:t.textMuted, fontSize:16, padding:2 }} title="Sign out">⎋</button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="main-content" style={{ marginLeft:SW, padding:"40px 48px", maxWidth:1100, transition:"margin-left 0.3s cubic-bezier(0.4,0,0.2,1)" }}>
        <div style={{ marginBottom:40, animation:"slideUp 0.3s ease" }}>
          <p style={{ fontSize:13, color:t.textSub, fontWeight:500, marginBottom:4, letterSpacing:"0.02em", textTransform:"uppercase" }}>
            {new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}
          </p>
          <h1 style={{ fontSize:isMobile?24:34, fontWeight:700, letterSpacing:"-0.8px", margin:0, color:t.text }}>
            {navItems.find(n=>n.id===activeTab)?.label}
          </h1>
        </div>

        {!app.visible
          ? <SkeletonTab activeTab={activeTab} t={t}/>
          : <div style={{ animation:"slideUp 0.25s ease" }}>

          {activeTab==="overview" && (
            <OverviewTab
              data={app.data} t={t} fmt={app.fmt}
              monthlyData={app.monthlyData} timelineData={app.timelineData}
              isSuperAdmin={isSuperAdmin} openModal={app.openModal}
              setActiveTab={setActiveTab}
              setEditingContribution={app.setEditingContribution}
              handleDeleteContribution={app.handleDeleteContribution}
              setEditingExpenseEntry={app.setEditingExpenseEntry}
              handleDeleteExpenseEntry={app.handleDeleteExpenseEntry}
            />
          )}

          {activeTab==="people" && (
            <PeopleTab
              data={app.data} t={t} fmt={app.fmt}
              isSuperAdmin={isSuperAdmin} openModal={app.openModal}
              setEditingPerson={app.setEditingPerson}
              handleDeletePerson={app.handleDeletePerson}
              handleDeleteContribution={app.handleDeleteContribution}
              setEditingContribution={app.setEditingContribution}
            />
          )}

          {activeTab==="payments" && (
            <PaymentTypesTab
              data={app.data} t={t} fmt={app.fmt}
              isSuperAdmin={isSuperAdmin} openModal={app.openModal}
              expandedPaymentType={app.expandedPaymentType}
              setExpandedPaymentType={app.setExpandedPaymentType}
              setEditingPaymentType={app.setEditingPaymentType}
              handleDeletePaymentType={app.handleDeletePaymentType}
            />
          )}

          {activeTab==="expenses" && (
            <ExpensesTab
              data={app.data} t={t} fmt={app.fmt}
              isSuperAdmin={isSuperAdmin} openModal={app.openModal}
              setEditingExpenseCategory={app.setEditingExpenseCategory}
              handleDeleteExpenseCategory={app.handleDeleteExpenseCategory}
            />
          )}

          {activeTab==="activity" && (
            <ActivityTab
              data={app.data} t={t} fmt={app.fmt}
              isSuperAdmin={isSuperAdmin} openModal={app.openModal}
              activitySearch={app.activitySearch} setActivitySearch={app.setActivitySearch}
              activityFilter={app.activityFilter} setActivityFilter={app.setActivityFilter}
              activityDateFrom={app.activityDateFrom} setActivityDateFrom={app.setActivityDateFrom}
              activityDateTo={app.activityDateTo} setActivityDateTo={app.setActivityDateTo}
              activityPage={app.activityPage} setActivityPage={app.setActivityPage}
              showPrintView={app.showPrintView} setShowPrintView={app.setShowPrintView}
              exportFinancialReport={app.exportFinancialReport}
              orgName={orgName}
              handleDeleteContribution={app.handleDeleteContribution}
              handleDeleteExpenseEntry={app.handleDeleteExpenseEntry}
              setEditingContribution={app.setEditingContribution}
              setEditingExpenseEntry={app.setEditingExpenseEntry}
              ACTIVITY_PAGE_SIZE={ACTIVITY_PAGE_SIZE}
            />
          )}

          {activeTab==="audit" && isSuperAdmin && (
            <AuditTab auditLog={app.auditLog} t={t} />
          )}

          {activeTab==="settings" && isSuperAdmin && (
            <SettingsTab
              data={app.data} t={t} fmt={app.fmt}
              isSuperAdmin={isSuperAdmin} openModal={app.openModal}
              orgName={orgName} session={session}
              setEditingPaymentType={app.setEditingPaymentType}
              handleDeletePaymentType={app.handleDeletePaymentType}
              setEditingExpenseCategory={app.setEditingExpenseCategory}
              handleDeleteExpenseCategory={app.handleDeleteExpenseCategory}
            />
          )}

        </div>}
      </div>

      {/* ── Modals ── */}
      <Modals
        modal={app.modal} closeModal={app.closeModal} t={t}
        data={app.data} fmt={app.fmt}
        orgForm={app.orgForm} setOrgForm={app.setOrgForm}
        formLoading={app.formLoading} formError={app.formError}
        handleSaveOrg={app.handleSaveOrg}
        newUser={app.newUser} setNewUser={app.setNewUser} handleAddUser={app.handleAddUser}
        newPerson={app.newPerson} setNewPerson={app.setNewPerson} handleAddPerson={app.handleAddPerson}
        newContribution={app.newContribution} setNewContribution={app.setNewContribution} handleAddContribution={app.handleAddContribution}
        newExpense={app.newExpense} setNewExpense={app.setNewExpense} handleAddExpense={app.handleAddExpense}
        newPaymentType={app.newPaymentType} setNewPaymentType={app.setNewPaymentType} handleAddPaymentType={app.handleAddPaymentType}
        newExpenseCategory={app.newExpenseCategory} setNewExpenseCategory={app.setNewExpenseCategory} handleAddExpenseCategory={app.handleAddExpenseCategory}
        editingPaymentType={app.editingPaymentType} setEditingPaymentType={app.setEditingPaymentType} handleEditPaymentType={app.handleEditPaymentType}
        editingExpenseCategory={app.editingExpenseCategory} setEditingExpenseCategory={app.setEditingExpenseCategory} handleEditExpenseCategory={app.handleEditExpenseCategory}
        editingContribution={app.editingContribution} setEditingContribution={app.setEditingContribution} handleEditContribution={app.handleEditContribution}
        editingExpenseEntry={app.editingExpenseEntry} setEditingExpenseEntry={app.setEditingExpenseEntry} handleEditExpenseEntry={app.handleEditExpenseEntry}
        editingPerson={app.editingPerson} setEditingPerson={app.setEditingPerson} handleEditPerson={app.handleEditPerson}
      />

    </div>
  );
}