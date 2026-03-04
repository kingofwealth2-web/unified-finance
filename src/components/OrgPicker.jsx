import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { makeFmt, CURRENCIES, COLORS } from "../constants.js";

// ── Animated gradient mesh background ────────────────────────
function MeshBackground({ color = "#0071E3" }) {
  return (
    <div style={{ position:"absolute", inset:0, overflow:"hidden", zIndex:0 }}>
      <div style={{
        position:"absolute", inset:0,
        background:`radial-gradient(ellipse 80% 60% at 20% 20%, ${color}22 0%, transparent 60%),
                    radial-gradient(ellipse 60% 80% at 80% 80%, ${color}18 0%, transparent 60%),
                    radial-gradient(ellipse 40% 40% at 50% 50%, ${color}10 0%, transparent 70%)`,
        animation:"meshShift 8s ease-in-out infinite alternate",
      }}/>
      {[...Array(6)].map((_, i) => (
        <div key={i} style={{
          position:"absolute",
          width: `${120 + i * 40}px`,
          height: `${120 + i * 40}px`,
          borderRadius:"50%",
          background:`${color}0${Math.floor(3 + i * 1.5).toString(16)}`,
          left:`${10 + i * 15}%`,
          top:`${5 + i * 12}%`,
          filter:"blur(40px)",
          animation:`float${i} ${6 + i}s ease-in-out infinite alternate`,
          animationDelay:`${i * 0.7}s`,
        }}/>
      ))}
    </div>
  );
}

// ── Single org card ────────────────────────────────────────────
function OrgCard({ org, role, onSelect, delay = 0, isSuperAdmin }) {
  const [hovered, setHovered] = useState(false);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    async function loadStats() {
      const [{ data: contribs }, { data: expenses }] = await Promise.all([
        supabase.from("contributions").select("amount").eq("org_id", org.id),
        supabase.from("expenses").select("amount").eq("org_id", org.id),
      ]);
      const totalIn  = (contribs || []).reduce((s, c) => s + Number(c.amount), 0);
      const totalOut = (expenses || []).reduce((s, e) => s + Number(e.amount), 0);
      const fmt = makeFmt(org.currency || "USD");
      setStats({ balance: fmt(totalIn - totalOut), totalIn: fmt(totalIn), members: contribs?.length || 0 });
    }
    loadStats();
  }, [org.id]);

  const color = org.color || "#0071E3";

  return (
    <div
      onClick={() => onSelect(org)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position:"relative", overflow:"hidden",
        background: hovered
          ? `linear-gradient(135deg, ${color}18 0%, ${color}08 100%)`
          : "rgba(255,255,255,0.03)",
        border: `1px solid ${hovered ? color + "50" : "rgba(255,255,255,0.08)"}`,
        borderRadius:24,
        padding:"28px 28px 24px",
        cursor:"pointer",
        transition:"all 0.3s cubic-bezier(0.34,1.2,0.64,1)",
        transform: hovered ? "translateY(-4px) scale(1.01)" : "translateY(0) scale(1)",
        boxShadow: hovered
          ? `0 20px 60px ${color}25, 0 0 0 1px ${color}30`
          : "0 4px 24px rgba(0,0,0,0.2)",
        animation:`cardIn 0.5s cubic-bezier(0.34,1.2,0.64,1) ${delay}s both`,
      }}
    >
      {/* Subtle inner glow on hover */}
      {hovered && (
        <div style={{
          position:"absolute", top:-40, right:-40,
          width:160, height:160, borderRadius:"50%",
          background:`radial-gradient(circle, ${color}20 0%, transparent 70%)`,
          pointerEvents:"none",
        }}/>
      )}

      {/* Header row */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:20 }}>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <div style={{
            width:48, height:48, borderRadius:14, flexShrink:0,
            background:`linear-gradient(135deg, ${color} 0%, ${color}bb 100%)`,
            display:"flex", alignItems:"center", justifyContent:"center",
            boxShadow:`0 8px 20px ${color}40`,
            fontSize:20, fontWeight:700, color:"white",
            transition:"transform 0.3s",
            transform: hovered ? "rotate(-5deg) scale(1.08)" : "rotate(0deg) scale(1)",
          }}>
            {org.name?.[0]?.toUpperCase() || "O"}
          </div>
          <div>
            <p style={{ fontSize:17, fontWeight:700, margin:0, color:"white", letterSpacing:"-0.3px" }}>{org.name}</p>
            <p style={{ fontSize:12, color:"rgba(255,255,255,0.45)", margin:"3px 0 0" }}>
              {org.currency || "USD"} · {org.address ? org.address.split(",")[0] : "No address"}
            </p>
          </div>
        </div>
        <span style={{
          fontSize:10, fontWeight:700, padding:"4px 10px", borderRadius:20,
          background: role === "super_admin" ? `${color}25` : "rgba(255,255,255,0.08)",
          color: role === "super_admin" ? color : "rgba(255,255,255,0.5)",
          border: `1px solid ${role === "super_admin" ? color + "40" : "rgba(255,255,255,0.1)"}`,
          textTransform:"uppercase", letterSpacing:"0.06em", whiteSpace:"nowrap",
        }}>
          {role === "super_admin" ? "Owner" : "Admin"}
        </span>
      </div>

      {/* Stats row */}
      <div style={{
        display:"grid", gridTemplateColumns:"1fr 1fr 1fr",
        gap:12, padding:"16px 0 0",
        borderTop:"1px solid rgba(255,255,255,0.06)",
      }}>
        {[
          { label:"Balance", value: stats?.balance ?? "—" },
          { label:"Total In", value: stats?.totalIn ?? "—" },
          { label:"Records", value: stats?.members ?? "—" },
        ].map(({ label, value }) => (
          <div key={label}>
            <p style={{ fontSize:10, color:"rgba(255,255,255,0.35)", margin:"0 0 4px", textTransform:"uppercase", letterSpacing:"0.06em" }}>{label}</p>
            <p style={{ fontSize:15, fontWeight:700, color:"white", margin:0, letterSpacing:"-0.3px" }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Hover arrow */}
      <div style={{
        position:"absolute", right:24, bottom:24,
        opacity: hovered ? 1 : 0,
        transform: hovered ? "translateX(0)" : "translateX(-8px)",
        transition:"all 0.25s ease",
        color: color, fontSize:18, fontWeight:700,
      }}>→</div>
    </div>
  );
}

// ── New org card ───────────────────────────────────────────────
function NewOrgCard({ onClick, delay = 0 }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        border:`1.5px dashed ${hovered ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.12)"}`,
        borderRadius:24, padding:"28px 28px 24px",
        cursor:"pointer", display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center", gap:12,
        minHeight:160,
        background: hovered ? "rgba(255,255,255,0.04)" : "transparent",
        transition:"all 0.25s ease",
        animation:`cardIn 0.5s cubic-bezier(0.34,1.2,0.64,1) ${delay}s both`,
      }}
    >
      <div style={{
        width:44, height:44, borderRadius:"50%",
        background:"rgba(255,255,255,0.08)",
        display:"flex", alignItems:"center", justifyContent:"center",
        fontSize:22, color:"rgba(255,255,255,0.5)",
        transition:"all 0.25s",
        transform: hovered ? "scale(1.1) rotate(90deg)" : "scale(1) rotate(0deg)",
      }}>+</div>
      <div style={{ textAlign:"center" }}>
        <p style={{ fontSize:14, fontWeight:600, color:"rgba(255,255,255,0.6)", margin:0 }}>New Organisation</p>
        <p style={{ fontSize:12, color:"rgba(255,255,255,0.3)", margin:"4px 0 0" }}>Create & become its owner</p>
      </div>
    </div>
  );
}

// ── Create org modal ───────────────────────────────────────────
function CreateOrgModal({ session, onCreated, onClose }) {
  const [form, setForm] = useState({ name:"", currency:"USD", color:"#0071E3" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      // Insert org
      const { data: newOrg, error: orgErr } = await supabase
        .from("org_settings")
        .insert({
          name: form.name,
          currency: form.currency,
          color: form.color,
          created_by: session.user.id,
          financial_year_format: "single",
          financial_year_start: new Date().getFullYear(),
        })
        .select()
        .single();
      if (orgErr) throw orgErr;

      // Make creator super_admin of new org
      const { error: memErr } = await supabase
        .from("org_members")
        .insert({ org_id: newOrg.id, user_id: session.user.id, role: "super_admin" });
      if (memErr) throw memErr;

      // Also add them to profiles for this org
      const { error: profErr } = await supabase
        .from("profiles")
        .insert({
          id: session.user.id,
          org_id: newOrg.id,
          full_name: session.user.user_metadata?.full_name || session.user.email,
          role: "super_admin",
          status: "active",
        })
        .select()
        .single();
      // Ignore conflict — same user can have profiles in multiple orgs (different org_id)
      // but the profiles PK is (id, org_id) so a true duplicate here means concurrent create
      if (profErr && !profErr.code?.includes("23505")) throw profErr;

      onCreated(newOrg);
    } catch(err) { setError(err.message); } finally { setLoading(false); }
  }

  return (
    <div
      onClick={onClose}
      style={{ position:"fixed", inset:0, zIndex:500, background:"rgba(0,0,0,0.7)", backdropFilter:"blur(12px)", display:"flex", alignItems:"center", justifyContent:"center", padding:20, animation:"fadeIn 0.2s ease" }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background:"#1C1C1E", border:"1px solid rgba(255,255,255,0.1)", borderRadius:24, padding:"36px 40px", width:"100%", maxWidth:440, boxShadow:"0 40px 80px rgba(0,0,0,0.5)", animation:"slideUp 0.3s cubic-bezier(0.34,1.2,0.64,1)" }}
      >
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:28 }}>
          <h2 style={{ fontSize:20, fontWeight:700, color:"white", margin:0, letterSpacing:"-0.5px" }}>New Organisation</h2>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.4)", fontSize:22, cursor:"pointer", lineHeight:1, padding:4 }}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:12, fontWeight:600, color:"rgba(255,255,255,0.5)", textTransform:"uppercase", letterSpacing:"0.06em", display:"block", marginBottom:8 }}>Organisation Name</label>
            <input
              value={form.name} onChange={e => setForm({...form, name:e.target.value})}
              required placeholder="e.g. Grace Chapel, City Youth"
              style={{ width:"100%", padding:"12px 14px", borderRadius:10, border:"1px solid rgba(255,255,255,0.12)", background:"rgba(255,255,255,0.05)", color:"white", fontSize:14, outline:"none", boxSizing:"border-box", fontFamily:"inherit" }}
              onFocus={e => e.target.style.borderColor = form.color}
              onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.12)"}
            />
          </div>
          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:12, fontWeight:600, color:"rgba(255,255,255,0.5)", textTransform:"uppercase", letterSpacing:"0.06em", display:"block", marginBottom:8 }}>Currency</label>
            <select
              value={form.currency} onChange={e => setForm({...form, currency:e.target.value})}
              style={{ width:"100%", padding:"12px 14px", borderRadius:10, border:"1px solid rgba(255,255,255,0.12)", background:"#2C2C2E", color:"white", fontSize:14, outline:"none", boxSizing:"border-box", fontFamily:"inherit", cursor:"pointer" }}
            >
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ marginBottom:28 }}>
            <label style={{ fontSize:12, fontWeight:600, color:"rgba(255,255,255,0.5)", textTransform:"uppercase", letterSpacing:"0.06em", display:"block", marginBottom:10 }}>Accent Colour</label>
            <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
              {COLORS.map(c => (
                <div
                  key={c} onClick={() => setForm({...form, color:c})}
                  style={{ width:30, height:30, borderRadius:"50%", background:c, cursor:"pointer", border: form.color===c ? "3px solid white" : "3px solid transparent", boxSizing:"border-box", transition:"transform 0.15s", transform:form.color===c?"scale(1.2)":"scale(1)", boxShadow: form.color===c ? `0 0 12px ${c}80` : "none" }}
                />
              ))}
            </div>
          </div>
          {error && <p style={{ fontSize:13, color:"#FF375F", marginBottom:16 }}>{error}</p>}
          <button
            type="submit" disabled={loading}
            style={{ width:"100%", padding:"14px", borderRadius:12, border:"none", cursor:loading?"not-allowed":"pointer", fontSize:15, fontWeight:700, background:`linear-gradient(135deg, ${form.color} 0%, ${form.color}bb 100%)`, color:"white", opacity:loading?0.6:1, transition:"all 0.2s", boxShadow:`0 8px 24px ${form.color}40` }}
          >
            {loading ? "Creating…" : "Create Organisation"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Main OrgPicker ─────────────────────────────────────────────
export function OrgPicker({ session, onSelect }) {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [userMemberships, setUserMemberships] = useState([]);

  // Any user can create an org (first org = no memberships yet, or they're super_admin somewhere)
  const canCreateOrg = true;

  useEffect(() => {
    async function loadOrgs() {
      const { data: memberships } = await supabase
        .from("org_members")
        .select("org_id, role")
        .eq("user_id", session.user.id);

      setUserMemberships(memberships || []);

      if (!memberships?.length) { setLoading(false); return; }

      const orgIds = memberships.map(m => m.org_id);
      const { data: orgRows } = await supabase
        .from("org_settings")
        .select("*")
        .in("id", orgIds)
        .order("created_at", { ascending: true });

      setOrgs(orgRows || []);

      // Auto-enter if only one org
      if (orgRows?.length === 1) {
        const role = memberships.find(m => m.org_id === orgRows[0].id)?.role || "admin";
        handleSelect(orgRows[0], role, true);
      }

      setLoading(false);
    }
    loadOrgs();
  }, []);

  function handleSelect(org, roleOverride, instant = false) {
    const role = roleOverride || userMemberships.find(m => m.org_id === org.id)?.role || "admin";
    if (instant) { onSelect(org, role); return; }
    setSelectedOrg(org);
    setTransitioning(true);
    setTimeout(() => onSelect(org, role), 600);
  }

  function handleCreated(newOrg) {
    setShowCreate(false);
    handleSelect(newOrg, "super_admin");
  }

  const dominantColor = orgs[0]?.color || "#0071E3";

  if (loading) return (
    <div style={{ minHeight:"100vh", background:"#0F0F12", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <style>{`@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.6;transform:scale(0.95)}}`}</style>
      <div style={{ width:48, height:48, borderRadius:14, background:`linear-gradient(135deg, #0071E3, #34AADC)`, animation:"pulse 1.5s ease-in-out infinite", boxShadow:"0 8px 32px rgba(0,113,227,0.4)" }}/>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:"#0F0F12", position:"relative", overflow:"hidden", fontFamily:"-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" }}>
      <style>{`
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes slideUp { from{opacity:0;transform:translateY(30px) scale(0.96)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes cardIn { from{opacity:0;transform:translateY(20px) scale(0.95)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.6;transform:scale(0.95)} }
        @keyframes meshShift { from{opacity:0.6} to{opacity:1} }
        @keyframes fadeOut { to{opacity:0;transform:scale(1.05)} }
        @keyframes enterOrg { from{opacity:0;transform:scale(0.92)} to{opacity:1;transform:scale(1)} }
        ${[0,1,2,3,4,5].map(i => `
          @keyframes float${i} {
            from { transform: translate(0px, 0px) scale(1); }
            to   { transform: translate(${(i%2===0?1:-1)*15}px, ${(i%3===0?-1:1)*20}px) scale(${1 + i*0.03}); }
          }
        `).join("")}
        @media (max-width: 640px) {
          .picker-grid { grid-template-columns: 1fr !important; }
          .picker-inner { padding: 32px 20px !important; }
        }
      `}</style>

      <MeshBackground color={dominantColor} />

      {/* Transition overlay */}
      {transitioning && (
        <div style={{
          position:"fixed", inset:0, zIndex:400,
          background: selectedOrg?.color || "#0071E3",
          animation:"enterOrg 0.6s cubic-bezier(0.4,0,0.2,1) forwards",
          display:"flex", alignItems:"center", justifyContent:"center",
        }}>
          <div style={{ textAlign:"center", animation:"slideUp 0.4s ease 0.1s both" }}>
            <div style={{ width:60, height:60, borderRadius:18, background:"rgba(255,255,255,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, fontWeight:800, color:"white", margin:"0 auto 16px", backdropFilter:"blur(10px)" }}>
              {selectedOrg?.name?.[0]?.toUpperCase()}
            </div>
            <p style={{ color:"rgba(255,255,255,0.9)", fontSize:16, fontWeight:600, margin:0 }}>Entering {selectedOrg?.name}…</p>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="picker-inner" style={{ position:"relative", zIndex:10, maxWidth:720, margin:"0 auto", padding:"80px 32px 60px" }}>

        {/* Top bar */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:56 }}>
          <div>
            <p style={{ fontSize:12, fontWeight:600, color:"rgba(255,255,255,0.3)", textTransform:"uppercase", letterSpacing:"0.1em", margin:"0 0 6px" }}>Unified Finance</p>
            <h1 style={{ fontSize:28, fontWeight:700, color:"white", margin:0, letterSpacing:"-0.8px" }}>
              {orgs.length > 0 ? "Your Organisations" : "Welcome"}
            </h1>
          </div>
          <button
            onClick={() => supabase.auth.signOut()}
            style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:10, padding:"8px 16px", color:"rgba(255,255,255,0.5)", fontSize:13, cursor:"pointer", fontFamily:"inherit", transition:"all 0.2s" }}
            onMouseEnter={e => e.target.style.background="rgba(255,255,255,0.1)"}
            onMouseLeave={e => e.target.style.background="rgba(255,255,255,0.06)"}
          >
            Sign out
          </button>
        </div>

        {/* No orgs state */}
        {orgs.length === 0 && (
          <div style={{ textAlign:"center", padding:"60px 0", animation:"slideUp 0.5s ease" }}>
            <div style={{ fontSize:48, marginBottom:16, opacity:0.3 }}>◎</div>
            <p style={{ fontSize:18, color:"rgba(255,255,255,0.5)", marginBottom:8 }}>You're not part of any organisation yet.</p>
            <p style={{ fontSize:14, color:"rgba(255,255,255,0.25)", marginBottom:32 }}>Ask your administrator to add you, or create one below.</p>
            <button
              onClick={() => setShowCreate(true)}
              style={{ padding:"14px 32px", borderRadius:14, border:"none", cursor:"pointer", fontSize:15, fontWeight:700, background:"linear-gradient(135deg, #0071E3, #34AADC)", color:"white", boxShadow:"0 8px 24px rgba(0,113,227,0.4)", fontFamily:"inherit" }}
            >
              Create Organisation
            </button>
          </div>
        )}

        {/* Org grid */}
        {orgs.length > 0 && (
          <div className="picker-grid" style={{ display:"grid", gridTemplateColumns: orgs.length === 1 ? "1fr" : "1fr 1fr", gap:16 }}>
            {orgs.map((org, i) => {
              const role = userMemberships.find(m => m.org_id === org.id)?.role || "admin";
              return (
                <OrgCard
                  key={org.id}
                  org={org}
                  role={role}
                  isSuperAdmin={role === "super_admin"}
                  onSelect={o => handleSelect(o, role)}
                  delay={i * 0.07}
                />
              );
            })}
            {canCreateOrg && (
              <NewOrgCard onClick={() => setShowCreate(true)} delay={orgs.length * 0.07} />
            )}
          </div>
        )}

        {/* Footer */}
        <p style={{ textAlign:"center", fontSize:12, color:"rgba(255,255,255,0.15)", marginTop:48 }}>
          Signed in as {session.user.email}
        </p>
      </div>

      {showCreate && (
        <CreateOrgModal
          session={session}
          onCreated={handleCreated}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}