import { useState, useEffect } from "react";
import { supabase } from "./lib/supabaseClient.js";
import { useAppData } from "./hooks/useAppData.js";
import { Avatar, SkeletonTab, ToastContainer, ConfirmDialog, toast } from "./components/ui/index.jsx";
import { OverviewTab }    from "./components/tabs/OverviewTab.jsx";
import { PeopleTab }      from "./components/tabs/PeopleTab.jsx";
import { PaymentTypesTab } from "./components/tabs/PaymentTypesTab.jsx";
import { ExpensesTab }    from "./components/tabs/ExpensesTab.jsx";
import { ActivityTab }    from "./components/tabs/ActivityTab.jsx";
import { AuditTab }       from "./components/tabs/AuditTab.jsx";
import { SettingsTab }    from "./components/tabs/SettingsTab.jsx";
import { IncomeTab }      from "./components/tabs/IncomeTab.jsx";
import { FinancialSummaryTab } from "./components/tabs/FinancialSummaryTab.jsx";
import { Modals }         from "./components/modals/Modals.jsx";

const ACTIVITY_PAGE_SIZE = 20;

export default function App({ session, currentOrg, orgRole, onSwitchOrg }) {
  const [viewingFY, setViewingFY] = useState(null); // null = current year
  const app = useAppData({ session, currentOrg, orgRole, viewingFY });
  const { t, isDark, toggleTheme, activeTab, setActiveTab, navItems,
          orgName, loading, isSuperAdmin, visible } = app;
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [profileOpen, setProfileOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [nameSaving, setNameSaving] = useState(false);

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

  // ── Confirm dialog state ──
  const [confirm, setConfirm] = useState(null);
  const withConfirm = (title, message, action, onConfirm) => {
    setConfirm({ title, message, action, onConfirm });
  };
  const handleConfirm = () => { if (confirm?.onConfirm) confirm.onConfirm(); setConfirm(null); };
  const handleCancelConfirm = () => setConfirm(null);

  // ── Wrapped delete handlers with confirm + toast ──
  const confirmDeleteContribution = (c) => withConfirm("Delete Contribution", `Remove this contribution of ${c.amount ? `GHS ${Number(c.amount).toLocaleString()}` : "this entry"}? This cannot be undone.`, "Delete", () => { app.handleDeleteContribution(c); toast("Contribution deleted"); });
  const confirmDeleteExpenseEntry = (ex) => withConfirm("Delete Expense", `Remove "${ex.label || "this expense"}"? This cannot be undone.`, "Delete", () => { app.handleDeleteExpenseEntry(ex); toast("Expense deleted"); });
  const confirmDeletePerson = (id, name) => withConfirm("Delete Person", `Remove ${name || "this person"} and all their contributions? This cannot be undone.`, "Delete", () => { app.handleDeletePerson(id); toast(`${name || "Person"} deleted`); });
  const confirmDeletePaymentType = (id, name) => withConfirm("Delete Payment Type", `Remove "${name || "this payment type"}"? This cannot be undone.`, "Delete", () => { app.handleDeletePaymentType(id); toast("Payment type deleted"); });
  const confirmDeleteExpenseCategory = (id, name) => withConfirm("Delete Category", `Remove "${name || "this category"}" and all its expenses? This cannot be undone.`, "Delete", () => { app.handleDeleteExpenseCategory(id); toast("Category deleted"); });
  const confirmDeleteIncomeSource = (id, label) => withConfirm("Delete Income", `Remove "${label || "this income entry"}"? This cannot be undone.`, "Delete", () => app.handleDeleteIncomeSource(id));

  // ── User profile ──
  const myProfile = (app.data.users||[]).find(u => u.id === session?.user?.id);
  const [localDisplayName, setLocalDisplayName] = useState(null);
  const displayName = localDisplayName || myProfile?.full_name || session?.user?.email?.split("@")[0] || "You";

  const handleSaveName = async () => {
    if (!nameValue.trim()) return;
    setNameSaving(true);
    // Upsert: super_admins may have no profiles row (org creation doesn't insert one).
    // A plain update silently affects 0 rows, so the name reverts on reload.
    await supabase.from("profiles").upsert({
      id: session?.user?.id,
      full_name: nameValue.trim(),
      org_id: currentOrg.id,
      role: orgRole,
      email: session?.user?.email,
      status: "active",
    }, { onConflict: "id,org_id" });
    setLocalDisplayName(nameValue.trim()); // instant UI patch while fetch runs
    setNameSaving(false);
    setEditingName(false);
    toast("Name updated");
    if (app.fetchAllData) app.fetchAllData(); // refresh so myProfile reflects new name
  };

  const fyText = app.data.org?.financial_year_start
    ? `FY ${app.data.org.financial_year_start}`
    : null;

  // Reset to current year when switching orgs
  useEffect(() => { setViewingFY(null); }, [currentOrg?.id]);

  const isViewingPastYear = viewingFY !== null && viewingFY !== app.data.org?.financial_year_start;

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
        @keyframes slideInToast { from{opacity:0;transform:translateX(40px) scale(0.95)} to{opacity:1;transform:translateX(0) scale(1)} }
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
      <div className="mobile-topbar" style={{ display:"none", position:"fixed", top:0, left:0, right:0, height:56, background:t.sidebar, backdropFilter:"blur(40px)", borderBottom:`1px solid ${t.border}`, alignItems:"center", justifyContent:"space-between", padding:"0 16px", zIndex:200, visibility: mobileOpen ? "hidden" : "visible" }}>
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
        display:"flex", flexDirection:"column", padding:"0 0 28px",
        paddingTop: isMobile ? "env(safe-area-inset-top, 28px)" : "28px",
        zIndex: isMobile ? 220 : 100,
        transition: isMobile ? "transform 0.3s cubic-bezier(0.4,0,0.2,1)" : "width 0.3s cubic-bezier(0.4,0,0.2,1), background 0.3s",
        transform: isMobile ? (mobileOpen ? "translateX(0)" : "translateX(-100%)") : "translateX(0)",
        overflow:"hidden",
        minHeight:0,
      }}>
        
        {/* Logo + collapse toggle */}
        <div style={{ padding:"0 12px 32px", display:"flex", alignItems:"center", justifyContent:collapsed&&!isMobile?"center":"space-between", minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, minWidth:0, overflow:"hidden" }}>
            <div onClick={collapsed&&!isMobile?()=>setCollapsed(false):undefined} style={{ width:34, height:34, borderRadius:10, background:t.heroGrad, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 4px 12px rgba(0,113,227,0.35)", flexShrink:0, cursor:collapsed&&!isMobile?"pointer":"default" }} title={collapsed&&!isMobile?"Expand sidebar":""}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 8h5M9 8h5M8 2v5M8 9v5" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
            </div>
            {(isMobile || !collapsed) && (
              <div style={{ minWidth:0 }}>
                <div style={{ fontSize:15, fontWeight:700, letterSpacing:"-0.3px", color:t.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{orgName}</div>
                {fyText && (() => {
                  const currentFY = app.data.org?.financial_year_start || new Date().getFullYear();
                  const activeFY = viewingFY ?? currentFY;
                  const startFY = Math.min(currentFY, 2024);
                  const years = Array.from({ length: currentFY - startFY + 1 }, (_, i) => startFY + i);
                  const isPast = activeFY !== currentFY;
                  const cycleYear = (dir) => {
                    const idx = years.indexOf(activeFY);
                    const next = years[Math.max(0, Math.min(years.length - 1, idx + dir))];
                    setViewingFY(next === currentFY ? null : next);
                  };
                  return (
                    <div style={{ display:"flex", alignItems:"center", gap:4, marginTop:3 }}>
                      {years.length > 1 && (
                        <button onClick={e=>{e.stopPropagation();cycleYear(-1);}} disabled={activeFY===startFY}
                          style={{ background:"none", border:"none", cursor:activeFY===startFY?"default":"pointer", color:activeFY===startFY?t.border:t.textSub, fontSize:10, padding:"0 1px", lineHeight:1, opacity:activeFY===startFY?0.3:1 }}>‹</button>
                      )}
                      <div onClick={e=>{e.stopPropagation(); setViewingFY(isPast?null:null);}}
                        style={{ display:"flex", alignItems:"center", gap:4, padding:"2px 7px", borderRadius:20, background:isPast?`rgba(255,159,10,0.15)`:`${t.accent}15`, border:`1px solid ${isPast?"rgba(255,159,10,0.4)":`${t.accent}30`}`, cursor:"default" }}>
                        <div style={{ width:5, height:5, borderRadius:"50%", background:isPast?"#FF9F0A":t.accent, flexShrink:0 }}/>
                        <span style={{ fontSize:10, fontWeight:700, color:isPast?"#FF9F0A":t.accent, letterSpacing:"0.02em" }}>FY {activeFY}</span>
                      </div>
                      {years.length > 1 && (
                        <button onClick={e=>{e.stopPropagation();cycleYear(1);}} disabled={activeFY===currentFY}
                          style={{ background:"none", border:"none", cursor:activeFY===currentFY?"default":"pointer", color:activeFY===currentFY?t.border:t.textSub, fontSize:10, padding:"0 1px", lineHeight:1, opacity:activeFY===currentFY?0.3:1 }}>›</button>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
          {isMobile ? (
            <button onClick={()=>setMobileOpen(false)} style={{ background:"none", border:"none", cursor:"pointer", color:t.textSub, fontSize:20, padding:4, borderRadius:6, lineHeight:1 }}>✕</button>
          ) : !collapsed ? (
            <button onClick={()=>setCollapsed(true)} style={{ background:"none", border:"none", cursor:"pointer", color:t.textSub, fontSize:16, padding:4, borderRadius:6, flexShrink:0, lineHeight:1, display:"flex", alignItems:"center", justifyContent:"center" }} title="Collapse">←</button>
          ) : null}
        </div>

        <nav style={{ flex:1, padding:"0 8px", display:"flex", flexDirection:"column", gap:2, overflowY:"auto", minHeight:0 }}>
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

        <div style={{ padding:"0 8px", display:"flex", flexDirection:"column", gap:6, flexShrink:0 }}>
          {/* Theme toggle */}
          {!isMobile && (
            <button onClick={toggleTheme} title={isDark?"Light mode":"Dark mode"} style={{ background:"none", border:"none", cursor:"pointer", color:t.textSub, fontSize:18, padding:"8px 12px", textAlign:collapsed&&!isMobile?"center":"left", borderRadius:8, width:"100%", transition:"color 0.15s" }}>
              {isDark?"☀️":"🌙"}
            </button>
          )}

          {/* ── Account block ── */}
          <div
            onClick={() => { if (!collapsed || isMobile) { setProfileOpen(p=>!p); setEditingName(false); setNameValue(displayName); } }}
            className="card-hover"
            style={{ display:"flex", alignItems:"center", gap:(!collapsed||isMobile)?10:0, padding:"10px 12px", borderRadius:14, background:profileOpen?`${t.accent}10`:t.surfaceAlt, border:`1px solid ${profileOpen?`${t.accent}40`:t.border}`, justifyContent:collapsed&&!isMobile?"center":"flex-start", cursor:(!collapsed||isMobile)?"pointer":"default", transition:"all 0.2s ease" }}>
            <div style={{ position:"relative", flexShrink:0 }}>
              <Avatar name={displayName} size={32}/>
              <div style={{ position:"absolute", bottom:0, right:0, width:8, height:8, borderRadius:"50%", background:"#34C759", border:`1.5px solid ${t.surface}` }}/>
            </div>
            {(!collapsed || isMobile) && (
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:600, color:t.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{displayName}</div>
                <div style={{ fontSize:10, fontWeight:700, color:t.accent, textTransform:"uppercase", letterSpacing:"0.06em" }}>{isSuperAdmin?"Super Admin":"Admin"}</div>
              </div>
            )}
            {(!collapsed || isMobile) && (
              <span style={{ fontSize:12, color:t.textSub, transition:"transform 0.2s", transform:profileOpen?"rotate(180deg)":"rotate(0deg)", flexShrink:0 }}>▾</span>
            )}
          </div>

          {/* ── Profile panel (slides open) ── */}
          {profileOpen && (!collapsed || isMobile) && (
            <div style={{ background:t.surface, borderRadius:14, border:`1px solid ${t.border}`, padding:"16px", animation:"slideUp 0.2s ease", boxShadow:t.cardShadow }}>
              {/* Display name */}
              <p style={{ fontSize:10, fontWeight:700, color:t.textSub, textTransform:"uppercase", letterSpacing:"0.07em", margin:"0 0 8px" }}>Display Name</p>
              {editingName ? (
                <div style={{ display:"flex", gap:6, marginBottom:12 }}>
                  <input
                    value={nameValue}
                    onChange={e=>setNameValue(e.target.value)}
                    onKeyDown={e=>{ if(e.key==="Enter") handleSaveName(); if(e.key==="Escape") setEditingName(false); }}
                    autoFocus
                    style={{ flex:1, padding:"7px 10px", borderRadius:8, border:`1px solid ${t.accent}`, background:t.inputBg||t.surfaceAlt, color:t.text, fontSize:13, outline:"none", fontFamily:"inherit" }}
                  />
                  <button onClick={handleSaveName} disabled={nameSaving} style={{ padding:"7px 12px", borderRadius:8, border:"none", background:t.accent, color:"white", fontSize:12, fontWeight:600, cursor:"pointer" }}>
                    {nameSaving?"...":"Save"}
                  </button>
                  <button onClick={()=>setEditingName(false)} style={{ padding:"7px 10px", borderRadius:8, border:`1px solid ${t.border}`, background:"none", color:t.textSub, fontSize:12, cursor:"pointer" }}>✕</button>
                </div>
              ) : (
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
                  <span style={{ fontSize:14, fontWeight:600, color:t.text }}>{displayName}</span>
                  <button onClick={()=>{ setEditingName(true); setNameValue(displayName); }} style={{ fontSize:11, color:t.accent, background:`${t.accent}12`, border:"none", borderRadius:6, padding:"4px 10px", cursor:"pointer", fontWeight:600 }}>Edit</button>
                </div>
              )}

              {/* Role */}
              <p style={{ fontSize:10, fontWeight:700, color:t.textSub, textTransform:"uppercase", letterSpacing:"0.07em", margin:"0 0 4px" }}>Role</p>
              <div style={{ marginBottom:12 }}>
                <span style={{ fontSize:12, fontWeight:700, padding:"4px 10px", borderRadius:20, background:isSuperAdmin?`${t.accent}18`:"rgba(52,199,89,0.1)", color:isSuperAdmin?t.accent:"#34C759", textTransform:"uppercase", letterSpacing:"0.04em" }}>
                  {isSuperAdmin?"Super Admin":"Admin"}
                </span>
              </div>

              {/* Org */}
              <p style={{ fontSize:10, fontWeight:700, color:t.textSub, textTransform:"uppercase", letterSpacing:"0.07em", margin:"0 0 4px" }}>Organisation</p>
              <p style={{ fontSize:13, fontWeight:500, color:t.text, margin:"0 0 4px" }}>{orgName}</p>
              <p style={{ fontSize:11, color:t.textSub, margin:0 }}>{session?.user?.email}</p>
            </div>
          )}

          {/* ── Switch Org + Sign Out — side by side ── */}
          {(!collapsed || isMobile) ? (
            <div style={{ display:"flex", gap:6 }}>
              <button
                onClick={onSwitchOrg}
                title="Switch organisation"
                style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:6, padding:"8px 10px", borderRadius:10, border:`1px solid ${t.border}`, background:"none", color:t.textSub, fontSize:12, fontWeight:500, cursor:"pointer", transition:"all 0.15s ease" }}
                onMouseEnter={e=>{ e.currentTarget.style.background=t.surfaceAlt; e.currentTarget.style.color=t.text; }}
                onMouseLeave={e=>{ e.currentTarget.style.background="none"; e.currentTarget.style.color=t.textSub; }}
              >
                <span style={{ fontSize:14 }}>⇄</span>
                <span>Switch</span>
              </button>
              <button
                onClick={()=>supabase.auth.signOut()}
                title="Sign out"
                style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:6, padding:"8px 10px", borderRadius:10, border:"1px solid rgba(255,55,95,0.2)", background:"rgba(255,55,95,0.04)", color:"#FF375F", fontSize:12, fontWeight:500, cursor:"pointer", transition:"all 0.15s ease" }}
                onMouseEnter={e=>{ e.currentTarget.style.background="rgba(255,55,95,0.1)"; e.currentTarget.style.borderColor="rgba(255,55,95,0.4)"; }}
                onMouseLeave={e=>{ e.currentTarget.style.background="rgba(255,55,95,0.04)"; e.currentTarget.style.borderColor="rgba(255,55,95,0.2)"; }}
              >
                <span style={{ fontSize:14 }}>↪</span>
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
              <button onClick={onSwitchOrg} title="Switch organisation" style={{ width:"100%", padding:"8px 0", background:"none", border:"none", cursor:"pointer", color:t.textSub, fontSize:16, display:"flex", alignItems:"center", justifyContent:"center", borderRadius:8 }}>⇄</button>
              <button onClick={()=>supabase.auth.signOut()} title="Sign out" style={{ width:"100%", padding:"8px 0", background:"rgba(255,55,95,0.06)", border:"1px solid rgba(255,55,95,0.15)", cursor:"pointer", color:"#FF375F", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center", borderRadius:8 }}>↪</button>
            </div>
          )}
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="main-content" style={{ marginLeft:SW, padding:"40px 48px", maxWidth:1100, transition:"margin-left 0.3s cubic-bezier(0.4,0,0.2,1)" }}>
        <div style={{ marginBottom:40, animation:"slideUp 0.3s ease" }}>
          {activeTab === "overview" ? (() => {
            const hour = new Date().getHours();
            const greetings = [
              { range:[5,9],   emoji:"🌅", lines:["Early start!", "Rise and shine,", "Up with the sun,"] },
              { range:[9,12],  emoji:"☀️",  lines:["Good morning,", "Morning,", "Hey,"] },
              { range:[12,17], emoji:"🌤",  lines:["Good afternoon,", "Afternoon,", "Hey there,"] },
              { range:[17,21], emoji:"🌆",  lines:["Good evening,", "Evening,", "Hey,"] },
              { range:[21,24], emoji:"🌙",  lines:["Burning the midnight oil,", "Still at it,", "Night owl energy,"] },
              { range:[0,5],   emoji:"🌙",  lines:["Burning the midnight oil,", "Still at it,", "Night owl energy,"] },
            ];
            const slot = greetings.find(g => hour >= g.range[0] && hour < g.range[1]) || greetings[1];
            const line = slot.lines[new Date().getDate() % slot.lines.length];
            const suffixes = [
              "let's see how things are looking.",
              "here's what's been happening.",
              "ready to dig in?",
              "your numbers are waiting.",
            ];
            const suffix = suffixes[new Date().getDay() % suffixes.length];
            return (
              <div>
                <p style={{ fontSize:13, color:t.textSub, fontWeight:500, marginBottom:6, letterSpacing:"0.02em", textTransform:"uppercase" }}>
                  {new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}
                </p>
                <h1 style={{ fontSize:isMobile?22:32, fontWeight:700, letterSpacing:"-0.8px", margin:0, color:t.text, lineHeight:1.2 }}>
                  {slot.emoji} {line} <span style={{ color:t.accent }}>{displayName}</span> — {suffix}
                </h1>
              </div>
            );
          })() : (
            <>
              <p style={{ fontSize:13, color:t.textSub, fontWeight:500, marginBottom:4, letterSpacing:"0.02em", textTransform:"uppercase" }}>
                {new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}
              </p>
              <h1 style={{ fontSize:isMobile?24:34, fontWeight:700, letterSpacing:"-0.8px", margin:0, color:t.text }}>
                {navItems.find(n=>n.id===activeTab)?.label}
              </h1>
            </>
          )}
        </div>

        {/* ── Viewing past year banner ── */}
        {isViewingPastYear && (
          <div style={{ marginBottom:20, padding:"12px 18px", borderRadius:12, background:"rgba(255,159,10,0.1)", border:"1px solid rgba(255,159,10,0.3)", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <span style={{ fontSize:16 }}>📅</span>
              <div>
                <p style={{ fontSize:13, fontWeight:600, margin:0, color:"#FF9F0A" }}>Viewing FY {viewingFY} — Read Only</p>
                <p style={{ fontSize:11, color:t.textSub, margin:0 }}>You are browsing historical data. Switch back to record new transactions.</p>
              </div>
            </div>
            <button onClick={()=>setViewingFY(null)} style={{ fontSize:12, fontWeight:600, color:t.accent, background:`${t.accent}12`, border:"none", borderRadius:8, padding:"6px 14px", cursor:"pointer", whiteSpace:"nowrap" }}>
              Back to FY {app.data.org?.financial_year_start} →
            </button>
          </div>
        )}

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
              setEditingIncomeSource={app.setEditingIncomeSource}
              handleDeleteIncomeSource={(id) => { const inc=(app.data.rawIncome||[]).find(i=>i.id===id); confirmDeleteIncomeSource(id, inc?.label); }}
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
              handleDeactivatePerson={app.handleDeactivatePerson}
              isViewingPastYear={isViewingPastYear}
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
              setEditingContribution={app.setEditingContribution}
              handleDeleteContribution={confirmDeleteContribution}
              setBulkContributions={app.setBulkContributions}
              isViewingPastYear={isViewingPastYear}
            />
          )}

          {activeTab==="expenses" && (
            <ExpensesTab
              data={app.data} t={t} fmt={app.fmt}
              isSuperAdmin={isSuperAdmin} openModal={app.openModal}
              setEditingExpenseCategory={app.setEditingExpenseCategory}
              handleDeleteExpenseCategory={(id) => confirmDeleteExpenseCategory(id, app.data?.expenses?.find(c=>c.id===id)?.label)}
              setEditingExpenseEntry={app.setEditingExpenseEntry}
              handleDeleteExpenseEntry={confirmDeleteExpenseEntry}
              isViewingPastYear={isViewingPastYear}
            />
          )}

          {activeTab==="income" && (
            <IncomeTab
              data={app.data} t={t} fmt={app.fmt}
              isSuperAdmin={isSuperAdmin} openModal={app.openModal}
              setEditingIncomeSource={app.setEditingIncomeSource}
              handleDeleteIncomeSource={(id) => { const inc=(app.data.rawIncome||[]).find(i=>i.id===id); confirmDeleteIncomeSource(id, inc?.label); }}
              isViewingPastYear={isViewingPastYear}
            />
          )}

          {activeTab==="summary" && (
            <FinancialSummaryTab
              data={app.data} t={t} fmt={app.fmt}
              isSuperAdmin={isSuperAdmin} orgName={orgName}
              exportDateFrom={app.exportDateFrom} setExportDateFrom={app.setExportDateFrom}
              exportDateTo={app.exportDateTo} setExportDateTo={app.setExportDateTo}
              exportFinancialReport={app.exportFinancialReport}
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
              handleDeleteContribution={confirmDeleteContribution}
              handleDeleteExpenseEntry={confirmDeleteExpenseEntry}
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
              handleDeleteUser={(id, name) => withConfirm("Delete User", `Remove ${name}? Their account will be permanently deleted.`, "Delete", () => app.handleDeleteUser(id, name))}
              setEditingPaymentType={app.setEditingPaymentType}
              handleDeletePaymentType={(id) => confirmDeletePaymentType(id, app.data?.paymentTypes?.find(p=>p.id===id)?.name)}
              setEditingExpenseCategory={app.setEditingExpenseCategory}
              handleDeleteExpenseCategory={(id) => confirmDeleteExpenseCategory(id, app.data?.expenseCategories?.find(c=>c.id===id)?.name)}
              onStartNewYear={() => withConfirm(
                "Start New Financial Year",
                `This will archive FY${app.data?.org?.financial_year_start} and start FY${(app.data?.org?.financial_year_start||0)+1}. Your current balance of ${app.fmt(app.data?.totalBalance||0)} becomes the new opening balance. This cannot be undone.`,
                "Start New Year",
                () => app.handleStartNewYear()
              )}
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

    </div>
  );
}