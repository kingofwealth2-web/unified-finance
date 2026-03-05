import { useState, useEffect } from "react";
import { supabase } from "./lib/supabaseClient.js";
import { useAppData } from "./hooks/useAppData.js";
import { OrgPicker, CreateOrgModal } from "./components/OrgPicker.jsx";
import { Avatar, SkeletonTab, ToastContainer, ConfirmDialog, toast } from "./components/ui/index.jsx";
import { OverviewTab }     from "./components/tabs/OverviewTab.jsx";
import { PeopleTab }       from "./components/tabs/PeopleTab.jsx";
import { PaymentTypesTab } from "./components/tabs/PaymentTypesTab.jsx";
import { ExpensesTab }     from "./components/tabs/ExpensesTab.jsx";
import { IncomeTab }       from "./components/tabs/IncomeTab.jsx";
import { FinancialSummaryTab } from "./components/tabs/FinancialSummaryTab.jsx";
import { ActivityTab }     from "./components/tabs/ActivityTab.jsx";
import { AuditTab }        from "./components/tabs/AuditTab.jsx";
import { SettingsTab }     from "./components/tabs/SettingsTab.jsx";
import { Modals }          from "./components/modals/Modals.jsx";

const ACTIVITY_PAGE_SIZE = 20;

export default function App({ session }) {
  // ── Org selection state ──────────────────────────────────────
  const [currentOrg, setCurrentOrg] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem("uf_current_org")) || null; } catch { return null; }
  });
  const [orgRole, setOrgRole] = useState(() => sessionStorage.getItem("uf_org_role") || null);
  const [exitingOrg, setExitingOrg] = useState(false);
  const [manualSwitch, setManualSwitch] = useState(false);

  function handleOrgSelect(org, role) {
    sessionStorage.setItem("uf_current_org", JSON.stringify(org));
    sessionStorage.setItem("uf_org_role", role);
    setCurrentOrg(org);
    setOrgRole(role);
    setManualSwitch(false);
  }

  function handleSwitchOrg() {
    setExitingOrg(true);
    setTimeout(() => {
      sessionStorage.removeItem("uf_current_org");
      sessionStorage.removeItem("uf_org_role");
      setCurrentOrg(null);
      setOrgRole(null);
      setExitingOrg(false);
      setManualSwitch(true);
    }, 400);
  }

  if (!currentOrg) {
    return <OrgPicker session={session} onSelect={handleOrgSelect} allowAutoEnter={!manualSwitch} />;
  }

  return (
    <Dashboard
      session={session}
      currentOrg={currentOrg}
      orgRole={orgRole}
      onSwitchOrg={handleSwitchOrg}
      exitingOrg={exitingOrg}
    />
  );
}

// ── Dashboard — only mounts after an org is chosen ────────────
function Dashboard({ session, currentOrg, orgRole, onSwitchOrg, exitingOrg }) {
  const app = useAppData({ session, currentOrg, orgRole });
  const { t, isDark, toggleTheme, activeTab, setActiveTab, navItems,
          orgName, loading, isSuperAdmin, visible } = app;

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [showNewOrg, setShowNewOrg] = useState(false);

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
  const orgColor = currentOrg?.color || "#0071E3";

  // ── Confirm dialog ───────────────────────────────────────────
  const [confirm, setConfirm] = useState(null);
  const withConfirm = (title, message, action, onConfirm) => setConfirm({ title, message, action, onConfirm });
  const handleConfirm = () => { if (confirm?.onConfirm) confirm.onConfirm(); setConfirm(null); };
  const handleCancelConfirm = () => setConfirm(null);

  const confirmDeleteContribution    = (c)      => withConfirm("Delete Contribution", `Remove this contribution? This cannot be undone.`, "Delete", () => { app.handleDeleteContribution(c); toast("Contribution deleted"); });
  const confirmDeleteExpenseEntry    = (ex)     => withConfirm("Delete Expense", `Remove "${ex.label || "this expense"}"? This cannot be undone.`, "Delete", () => { app.handleDeleteExpenseEntry(ex); toast("Expense deleted"); });
  const confirmDeletePerson          = (id, name) => withConfirm("Delete Person", `Remove ${name || "this person"} and all their contributions? This cannot be undone.`, "Delete", () => { app.handleDeletePerson(id); toast(`${name || "Person"} deleted`); });
  const confirmDeletePaymentType     = (id, name) => withConfirm("Delete Payment Type", `Remove "${name || "this payment type"}"? This cannot be undone.`, "Delete", () => { app.handleDeletePaymentType(id); toast("Payment type deleted"); });
  const confirmDeleteExpenseCategory = (id, name) => withConfirm("Delete Category", `Remove "${name || "this category"}" and all its expenses? This cannot be undone.`, "Delete", () => { app.handleDeleteExpenseCategory(id); toast("Category deleted"); });

  const fyText = app.data.org?.financial_year_start ? `FY ${app.data.org.financial_year_start}` : null;

  if (loading) return (
    <div style={{ minHeight:"100vh", background:t.bg, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"-apple-system,sans-serif" }}>
      <style>{`@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.7;transform:scale(0.95)}}`}</style>
      <div style={{ textAlign:"center" }}>
        <div style={{ width:48, height:48, borderRadius:14, background:`linear-gradient(135deg, ${orgColor}, ${orgColor}bb)`, margin:"0 auto 16px", animation:"pulse 1.5s ease-in-out infinite", boxShadow:`0 8px 32px ${orgColor}40` }}/>
        <p style={{ color:t.textSub, fontSize:14 }}>Loading {orgName}…</p>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:t.bg, fontFamily:"-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif", color:t.text, opacity:exitingOrg?0:1, transition:"opacity 0.4s ease, background 0.3s, color 0.3s" }}>
      <style>{`
        @keyframes fadeIn       { from{opacity:0} to{opacity:1} }
        @keyframes slideUp      { from{opacity:0;transform:translateY(24px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes slideIn      { from{opacity:0;transform:translateX(-12px)} to{opacity:1;transform:translateX(0)} }
        @keyframes pulse        { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.7;transform:scale(0.95)} }
        @keyframes shimmer      { 0%{background-position:200% center} 100%{background-position:-200% center} }
        @keyframes slideInToast { from{opacity:0;transform:translateX(40px) scale(0.95)} to{opacity:1;transform:translateX(0) scale(1)} }
        .nav-btn:hover   { background:rgba(0,113,227,0.07) !important; color:#0071E3 !important; }
        .row-hover:hover { background:rgba(0,113,227,0.04) !important; transition:background 0.15s; }
        .card-hover      { transition:transform 0.2s ease, box-shadow 0.2s ease; }
        .card-hover:hover { transform:translateY(-2px); box-shadow:0 10px 36px rgba(0,0,0,0.13) !important; }
        .grid-3  { display:grid; grid-template-columns:1fr 1fr 1fr; gap:16px; }
        .grid-2  { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
        .col-span-2 { grid-column:span 2; }
        .sidebar-nav::-webkit-scrollbar { width:3px; }
        .sidebar-nav::-webkit-scrollbar-track { background:transparent; }
        .sidebar-nav::-webkit-scrollbar-thumb { background:rgba(128,128,128,0.2); border-radius:99px; }
        .sidebar-nav::-webkit-scrollbar-thumb:hover { background:rgba(128,128,128,0.4); }
        .subtle-scroll::-webkit-scrollbar { width:3px; }
        .subtle-scroll::-webkit-scrollbar-track { background:transparent; }
        .subtle-scroll::-webkit-scrollbar-thumb { background:rgba(128,128,128,0.2); border-radius:99px; }
        .subtle-scroll::-webkit-scrollbar-thumb:hover { background:rgba(128,128,128,0.4); }
        .sidebar-logo-area .switch-btn { opacity:0; transition:opacity 0.2s; }
        .sidebar-logo-area:hover .switch-btn { opacity:1; }
        @media (max-width:767px) {
          .main-content  { margin-left:0 !important; padding:72px 16px 24px !important; }
          .mobile-topbar { display:flex !important; }
          .grid-3 { grid-template-columns:1fr !important; gap:12px !important; }
          .grid-2 { grid-template-columns:1fr !important; gap:12px !important; }
          .col-span-2 { grid-column:span 1 !important; }
          .hero-amount { font-size:36px !important; }
          .row-actions { flex-wrap:wrap; }
          .sidebar-logo-area .switch-btn { opacity:1 !important; }
        }
        @media (min-width:768px) { .mobile-topbar { display:none !important; } }
        @media print {
          body * { visibility:hidden; }
          #print-area, #print-area * { visibility:visible; }
          #print-area { position:fixed !important; inset:0 !important; border:none !important; border-radius:0 !important; box-shadow:none !important; padding:32px 40px !important; margin:0 !important; overflow:visible !important; }
          .print-stats { display:grid !important; grid-template-columns:1fr 1fr 1fr !important; gap:16px !important; }
        }
      `}</style>

      {/* ── Mobile top bar ── */}
      <div className="mobile-topbar" style={{ display:"none", position:"fixed", top:0, left:0, right:0, height:56, background:t.sidebar, backdropFilter:"blur(40px)", borderBottom:`1px solid ${t.border}`, alignItems:"center", justifyContent:"space-between", padding:"0 16px", zIndex:200 }}>
        <button onClick={()=>setMobileOpen(true)} style={{ background:"none", border:"none", cursor:"pointer", color:t.text, fontSize:22, padding:4, display:"flex", alignItems:"center", justifyContent:"center" }}>☰</button>
        <div style={{ fontSize:15, fontWeight:700, color:t.text, letterSpacing:"-0.3px" }}>{orgName}</div>
        <button onClick={toggleTheme} style={{ background:"none", border:"none", cursor:"pointer", fontSize:18, padding:4 }}>{isDark?"☀️":"🌙"}</button>
      </div>

      {/* ── Mobile overlay ── */}
      {isMobile && mobileOpen && (
        <div onClick={()=>setMobileOpen(false)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:150, animation:"fadeIn 0.2s ease" }}/>
      )}

      {/* ── Sidebar ── */}
      <div style={{
        position:"fixed", left:0, top:0, bottom:0,
        width: isMobile ? 260 : SW,
        height:"100vh",
        background:t.sidebar, backdropFilter:"blur(40px)",
        borderRight:`1px solid ${t.border}`,
        display:"flex", flexDirection:"column", padding:"28px 0",
        zIndex: isMobile ? 160 : 100,
        transition: isMobile
          ? "transform 0.3s cubic-bezier(0.4,0,0.2,1)"
          : "width 0.3s cubic-bezier(0.4,0,0.2,1), background 0.3s",
        transform: isMobile ? (mobileOpen ? "translateX(0)" : "translateX(-100%)") : "translateX(0)",
        overflow:"hidden",
        boxSizing:"border-box",
      }}>

        {/* ── Org identity header ── */}
        <div className="sidebar-logo-area" style={{ padding:"0 12px 32px", display:"flex", alignItems:"center", justifyContent:collapsed&&!isMobile?"center":"space-between", minWidth:0, gap:8 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, minWidth:0, overflow:"hidden", flex:1 }}>
            {/* Org initial avatar */}
            <div
              onClick={collapsed&&!isMobile ? ()=>setCollapsed(false) : undefined}
              style={{ width:34, height:34, borderRadius:10, background:`linear-gradient(135deg, ${orgColor} 0%, ${orgColor}bb 100%)`, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:`0 4px 12px ${orgColor}50`, flexShrink:0, cursor:collapsed&&!isMobile?"pointer":"default", fontSize:16, fontWeight:800, color:"white" }}
              title={collapsed&&!isMobile?"Expand sidebar":""}
            >
              {orgName?.[0]?.toUpperCase() || "U"}
            </div>

            {(!collapsed || isMobile) && (
              <div style={{ minWidth:0 }}>
                <div style={{ fontSize:15, fontWeight:700, letterSpacing:"-0.3px", color:t.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{orgName}</div>
                {fyText && <div style={{ fontSize:10, color:t.textSub, fontWeight:500 }}>{fyText}</div>}
              </div>
            )}
          </div>

          <div style={{ display:"flex", alignItems:"center", gap:4, flexShrink:0 }}>
            {/* ⇄ Switch org — fades in on hover */}
            {(!collapsed || isMobile) && (
              <button
                className="switch-btn"
                onClick={onSwitchOrg}
                title="Switch organisation"
                style={{ background:"none", border:`1px solid ${t.border}`, cursor:"pointer", color:t.textSub, fontSize:11, padding:"3px 8px", borderRadius:6, fontFamily:"inherit", fontWeight:600, letterSpacing:"0.02em", lineHeight:1.5, whiteSpace:"nowrap" }}
                onMouseEnter={e=>{ e.currentTarget.style.background=t.surfaceAlt; e.currentTarget.style.color=t.text; e.currentTarget.style.borderColor=t.borderStrong; }}
                onMouseLeave={e=>{ e.currentTarget.style.background="none"; e.currentTarget.style.color=t.textSub; e.currentTarget.style.borderColor=t.border; }}
              >
                ⇄ Switch
              </button>
            )}
            {isMobile ? (
              <button onClick={()=>setMobileOpen(false)} style={{ background:"none", border:"none", cursor:"pointer", color:t.textSub, fontSize:20, padding:4, borderRadius:6, lineHeight:1 }}>✕</button>
            ) : !collapsed ? (
              <button onClick={()=>setCollapsed(true)} style={{ background:"none", border:"none", cursor:"pointer", color:t.textSub, fontSize:16, padding:4, borderRadius:6, lineHeight:1, display:"flex", alignItems:"center" }} title="Collapse">←</button>
            ) : null}
          </div>
        </div>

        {/* ── Nav ── */}
        <nav className="sidebar-nav" style={{ flex:1, padding:"0 8px", display:"flex", flexDirection:"column", gap:2, overflowY:"auto", overflowX:"hidden" }}>
          {navItems.map((item,i)=>(
            <button key={item.id} className="nav-btn"
              onClick={()=>{ setActiveTab(item.id); if(isMobile) setMobileOpen(false); }}
              title={collapsed&&!isMobile?item.label:""}
              style={{ display:"flex", alignItems:"center", gap:10, width:"100%", padding:"10px 12px", borderRadius:10, border:"none", cursor:"pointer", fontSize:13, fontWeight:activeTab===item.id?600:500, background:activeTab===item.id?`${t.accent}12`:"transparent", color:activeTab===item.id?t.accent:t.textSub, textAlign:"left", transition:"all 0.15s", animation:`slideIn 0.3s ease ${i*0.04}s both`, justifyContent:collapsed&&!isMobile?"center":"flex-start" }}
            >
              <span style={{ fontSize:17, flexShrink:0 }}>{item.icon}</span>
              {(!collapsed || isMobile) && <span>{item.label}</span>}
              {(!collapsed || isMobile) && activeTab===item.id && <div style={{ marginLeft:"auto", width:6, height:6, borderRadius:"50%", background:t.accent }}/>}
            </button>
          ))}
        </nav>

        {/* ── Bottom ── */}
        <div style={{ padding:"0 8px", display:"flex", flexDirection:"column", gap:8 }}>
          <button onClick={toggleTheme} title={isDark?"Light mode":"Dark mode"} style={{ background:"none", border:"none", cursor:"pointer", color:t.textSub, fontSize:18, padding:"8px 12px", textAlign:collapsed&&!isMobile?"center":"left", borderRadius:8, width:"100%" }}>
            {isDark?"☀️":"🌙"}
          </button>
          {isSuperAdmin && (!collapsed || isMobile) && (
            <button
              onClick={() => setShowNewOrg(true)}
              style={{ display:"flex", alignItems:"center", gap:8, width:"100%", padding:"9px 12px", borderRadius:10, border:`1px dashed ${t.border}`, background:"none", cursor:"pointer", color:t.textSub, fontSize:12, fontWeight:600, fontFamily:"inherit", transition:"all 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = orgColor; e.currentTarget.style.color = orgColor; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.color = t.textSub; }}
            >
              <span style={{ fontSize:16, lineHeight:1 }}>+</span>
              New Organisation
            </button>
          )}
          <div style={{ display:"flex", alignItems:"center", gap:collapsed&&!isMobile?0:10, padding:"10px 12px", borderRadius:12, background:t.surfaceAlt, border:`1px solid ${t.border}`, justifyContent:collapsed&&!isMobile?"center":"flex-start" }}>
            <Avatar name={session?.user?.email||"A"} size={30}/>
            {(!collapsed || isMobile) && (
              <>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:10, fontWeight:700, color:orgColor, textTransform:"uppercase", letterSpacing:"0.06em" }}>{isSuperAdmin?"Owner":"Admin"}</div>
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
              handleDeleteContribution={confirmDeleteContribution}
              setEditingExpenseEntry={app.setEditingExpenseEntry}
              handleDeleteExpenseEntry={confirmDeleteExpenseEntry}
            />
          )}
          {activeTab==="people" && (
            <PeopleTab
              data={app.data} t={t} fmt={app.fmt}
              isSuperAdmin={isSuperAdmin} openModal={app.openModal}
              setEditingPerson={app.setEditingPerson}
              handleDeletePerson={(id) => confirmDeletePerson(id, app.data?.people?.find(p=>p.id===id)?.name)}
              handleDeleteContribution={confirmDeleteContribution}
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
              handleDeletePaymentType={(id) => confirmDeletePaymentType(id, app.data?.paymentTypes?.find(p=>p.id===id)?.name)}
            />
          )}
          {activeTab==="income" && (
            <IncomeTab
              data={app.data} t={t} fmt={app.fmt}
              isSuperAdmin={isSuperAdmin} openModal={app.openModal}
              setEditingIncomeSource={app.setEditingIncomeSource}
              handleDeleteIncomeSource={app.handleDeleteIncomeSource}
            />
          )}
          {activeTab==="expenses" && (
            <ExpensesTab
              data={app.data} t={t} fmt={app.fmt}
              isSuperAdmin={isSuperAdmin} openModal={app.openModal}
              setEditingExpenseCategory={app.setEditingExpenseCategory}
              handleDeleteExpenseCategory={(id) => confirmDeleteExpenseCategory(id, app.data?.expenses?.find(c=>c.id===id)?.label)}
            />
          )}
          {activeTab==="activity" && (
            <ActivityTab
              data={app.data} t={t} fmt={app.fmt}
              isSuperAdmin={isSuperAdmin} openModal={app.openModal}
              activitySearch={app.activitySearch}     setActivitySearch={app.setActivitySearch}
              activityFilter={app.activityFilter}     setActivityFilter={app.setActivityFilter}
              activityDateFrom={app.activityDateFrom} setActivityDateFrom={app.setActivityDateFrom}
              activityDateTo={app.activityDateTo}     setActivityDateTo={app.setActivityDateTo}
              activityPage={app.activityPage}         setActivityPage={app.setActivityPage}
              showPrintView={app.showPrintView}       setShowPrintView={app.setShowPrintView}
              exportFinancialReport={app.exportFinancialReport}
              orgName={orgName}
              handleDeleteContribution={confirmDeleteContribution}
              handleDeleteExpenseEntry={confirmDeleteExpenseEntry}
              setEditingContribution={app.setEditingContribution}
              setEditingExpenseEntry={app.setEditingExpenseEntry}
              ACTIVITY_PAGE_SIZE={ACTIVITY_PAGE_SIZE}
            />
          )}
          {activeTab==="summary" && (
            <FinancialSummaryTab
              data={app.data} t={t} fmt={app.fmt}
              orgName={orgName}
              exportDateFrom={app.exportDateFrom} setExportDateFrom={app.setExportDateFrom}
              exportDateTo={app.exportDateTo}     setExportDateTo={app.setExportDateTo}
            />
          )}
          {activeTab==="audit" && isSuperAdmin && <AuditTab auditLog={app.auditLog} t={t}/>}
          {activeTab==="settings" && isSuperAdmin && (
            <SettingsTab
              data={app.data} t={t} fmt={app.fmt}
              isSuperAdmin={isSuperAdmin} openModal={app.openModal}
              orgName={orgName} session={session}
              setEditingPaymentType={app.setEditingPaymentType}
              handleDeletePaymentType={(id) => confirmDeletePaymentType(id, app.data?.paymentTypes?.find(p=>p.id===id)?.name)}
              setEditingExpenseCategory={app.setEditingExpenseCategory}
              handleDeleteExpenseCategory={(id) => confirmDeleteExpenseCategory(id, app.data?.expenses?.find(c=>c.id===id)?.label)}
            />
          )}

        </div>}
      </div>

      <Modals
        modal={app.modal} closeModal={app.closeModal} t={t}
        data={app.data} fmt={app.fmt}
        orgForm={app.orgForm} setOrgForm={app.setOrgForm}
        formLoading={app.formLoading} formError={app.formError}
        handleSaveOrg={app.handleSaveOrg}
        newUser={app.newUser} setNewUser={app.setNewUser} handleAddUser={app.handleAddUser}
        newPerson={app.newPerson} setNewPerson={app.setNewPerson} handleAddPerson={app.handleAddPerson}
        newContribution={app.newContribution} setNewContribution={app.setNewContribution} handleAddContribution={app.handleAddContribution}
        bulkContributions={app.bulkContributions} setBulkContributions={app.setBulkContributions} handleBulkAddContributions={app.handleBulkAddContributions}
        newExpense={app.newExpense} setNewExpense={app.setNewExpense} handleAddExpense={app.handleAddExpense}
        newPaymentType={app.newPaymentType} setNewPaymentType={app.setNewPaymentType} handleAddPaymentType={app.handleAddPaymentType}
        newExpenseCategory={app.newExpenseCategory} setNewExpenseCategory={app.setNewExpenseCategory} handleAddExpenseCategory={app.handleAddExpenseCategory}
        editingPaymentType={app.editingPaymentType} setEditingPaymentType={app.setEditingPaymentType} handleEditPaymentType={app.handleEditPaymentType}
        editingExpenseCategory={app.editingExpenseCategory} setEditingExpenseCategory={app.setEditingExpenseCategory} handleEditExpenseCategory={app.handleEditExpenseCategory}
        editingContribution={app.editingContribution} setEditingContribution={app.setEditingContribution} handleEditContribution={app.handleEditContribution}
        editingExpenseEntry={app.editingExpenseEntry} setEditingExpenseEntry={app.setEditingExpenseEntry} handleEditExpenseEntry={app.handleEditExpenseEntry}
        editingPerson={app.editingPerson} setEditingPerson={app.setEditingPerson} handleEditPerson={app.handleEditPerson}
        newIncome={app.newIncome} setNewIncome={app.setNewIncome} handleAddIncome={app.handleAddIncome}
        editingIncomeSource={app.editingIncomeSource} setEditingIncomeSource={app.setEditingIncomeSource} handleEditIncome={app.handleEditIncome}
      />
      <ToastContainer/>
      <ConfirmDialog confirm={confirm} onConfirm={handleConfirm} onCancel={handleCancelConfirm} t={t}/>
      {showNewOrg && (
        <CreateOrgModal
          session={session}
          onCreated={(newOrg) => { setShowNewOrg(false); onSwitchOrg(); toast("Organisation created! Switching…"); setTimeout(() => {}, 100); }}
          onClose={() => setShowNewOrg(false)}
        />
      )}
    </div>
  );
}