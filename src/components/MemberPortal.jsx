import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { useMemberData } from "../hooks/useMemberData.js";

// ── Tiny UI helpers ───────────────────────────────────────────
function Card({ children, style = {} }) {
  return (
    <div style={{ background: "var(--mp-surface)", border: "1px solid var(--mp-border)", borderRadius: 20, padding: "22px 24px", boxShadow: "0 2px 16px rgba(0,0,0,0.08)", ...style }}>
      {children}
    </div>
  );
}

function Badge({ label, color }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 20, textTransform: "uppercase", letterSpacing: "0.05em", background: `${color}18`, color, border: `1px solid ${color}33` }}>
      {label}
    </span>
  );
}

// ── Donut chart ───────────────────────────────────────────────
function Donut({ segments, size = 160 }) {
  const [prog, setProg] = useState(0);
  useEffect(() => {
    let start = null;
    const run = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / 1000, 1);
      setProg(1 - Math.pow(1 - p, 3));
      if (p < 1) requestAnimationFrame(run);
    };
    requestAnimationFrame(run);
  }, []);

  const cx = size / 2, cy = size / 2, R = size * 0.39, r = size * 0.24;
  const gap = 0.035;
  const total = segments.reduce((s, d) => s + d.value, 0) || 1;
  let cum = -Math.PI / 2;

  const slices = segments.map((d) => {
    const span = (d.value / total) * Math.PI * 2 * prog - gap;
    const start = cum + gap / 2;
    const end = cum + span + gap / 2;
    cum += (d.value / total) * Math.PI * 2 * prog;
    const safe = span > 0.01;
    const large = span > Math.PI ? 1 : 0;
    const path = safe
      ? `M${cx + R * Math.cos(start)} ${cy + R * Math.sin(start)}A${R} ${R} 0 ${large} 1 ${cx + R * Math.cos(end)} ${cy + R * Math.sin(end)}L${cx + r * Math.cos(end)} ${cy + r * Math.sin(end)}A${r} ${r} 0 ${large} 0 ${cx + r * Math.cos(start)} ${cy + r * Math.sin(start)}Z`
      : "";
    return { ...d, path };
  });

  return (
    <svg width={size} height={size} style={{ display: "block", overflow: "visible" }}>
      {slices.map((s, i) => s.path ? (
        <path key={i} d={s.path} fill={s.color} style={{ filter: `drop-shadow(0 0 6px ${s.color}55)` }}/>
      ) : null)}
      {total === 0 && (
        <circle cx={cx} cy={cy} r={(R + r) / 2} fill="none" stroke="var(--mp-border)" strokeWidth={R - r}/>
      )}
    </svg>
  );
}

// ── Rank badge ────────────────────────────────────────────────
function RankCard({ rank, total, label, color, t }) {
  const ordinal = (n) => {
    if (!n) return "—";
    const s = ["th","st","nd","rd"];
    const v = n % 100;
    return n + (s[(v-20)%10] || s[v] || s[0]);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "18px 16px", background: `${color}0e`, border: `1px solid ${color}33`, borderRadius: 16, textAlign: "center" }}>
      <span style={{ fontSize: 32, fontWeight: 800, color, lineHeight: 1, fontFamily: "inherit" }}>{ordinal(rank)}</span>
      <span style={{ fontSize: 11, color: "var(--mp-text-sub)", fontWeight: 500, lineHeight: 1.4 }}>{label}</span>
      {total && <span style={{ fontSize: 10, color: "var(--mp-text-sub)", opacity: 0.6 }}>of {total} members</span>}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────
export default function MemberPortal({ session, orgId }) {
  const { data, fmt, refresh } = useMemberData({ session, orgId });
  const [tab, setTab] = useState("dashboard");
  const [filterType, setFilterType] = useState("all");
  const [isDark, setIsDark] = useState(() => localStorage.getItem("unified-theme") === "dark");

  // Theme tokens
  const t = isDark ? {
    bg:        "#0A0A0F",
    surface:   "#13141A",
    border:    "rgba(255,255,255,0.09)",
    text:      "#F5F5F7",
    textSub:   "rgba(255,255,255,0.45)",
    accent:    "#4ECDC4",
    positive:  "#34C759",
    negative:  "#FF375F",
    warning:   "#FF9F0A",
  } : {
    bg:        "#F5F5FA",
    surface:   "#FFFFFF",
    border:    "rgba(0,0,0,0.09)",
    text:      "#1A1A1E",
    textSub:   "rgba(0,0,0,0.45)",
    accent:    "#007AFF",
    positive:  "#34C759",
    negative:  "#FF375F",
    warning:   "#FF9F0A",
  };

  const COLORS = ["#4ECDC4","#A78BFA","#FB7185","#FBBF24","#34D399","#60A5FA","#F97316","#EC4899"];

  const filtered = data.contributions.filter(c =>
    filterType === "all" || c.payment_type_id === filterType
  );

  const totalPaid = data.contributions.reduce((s, c) => s + Number(c.amount), 0);
  const currentYear = data.org?.financial_year_start || new Date().getFullYear();
  const thisYearTotal = data.contributions
    .filter(c => c.financial_year === currentYear)
    .reduce((s, c) => s + Number(c.amount), 0);
  const lastPayment = data.contributions[0];

  // Donut segments from contributions by payment type
  const typeMap = {};
  data.contributions.forEach((c) => {
    const name = c.payment_types?.name || "Other";
    const color = c.payment_types?.color || "#8E8E93";
    if (!typeMap[name]) typeMap[name] = { value: 0, color, name };
    typeMap[name].value += Number(c.amount);
  });
  const donutSegments = Object.values(typeMap).sort((a, b) => b.value - a.value).slice(0, 6);

  if (data.loading) return (
    <div style={{ minHeight: "100vh", background: t.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontSize: 14, color: t.textSub, fontFamily: "-apple-system, sans-serif" }}>Loading your dashboard…</div>
    </div>
  );

  return (
    <div style={{
      "--mp-surface": t.surface,
      "--mp-border": t.border,
      "--mp-text": t.text,
      "--mp-text-sub": t.textSub,
      "--mp-accent": t.accent,
      minHeight: "100vh",
      background: t.bg,
      color: t.text,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif",
      transition: "background 0.3s, color 0.3s",
    }}>
      <style>{`
        @keyframes mpSlideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .mp-anim { animation: mpSlideUp 0.35s ease both; }
        .mp-tab-btn { background:none; border:none; cursor:pointer; font-family:inherit; transition:color 0.15s; }
        .mp-row:hover { background: ${t.surface === "#FFFFFF" ? "rgba(0,0,0,0.025)" : "rgba(255,255,255,0.035)"}; }
        @media(max-width:600px) {
          .mp-stats-grid { grid-template-columns: 1fr 1fr !important; }
          .mp-dash-grid  { grid-template-columns: 1fr !important; }
          .mp-rank-grid  { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>

      {/* ── Header ── */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: t.surface, borderBottom: `1px solid ${t.border}`, padding: "0 24px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: `linear-gradient(135deg, ${t.accent}, #34AADC)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: `0 0 12px ${t.accent}44` }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M2 8h5M9 8h5M8 2v5M8 9v5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: t.text, letterSpacing: "-0.2px", lineHeight: 1.1 }}>Unified Finance</div>
              <div style={{ fontSize: 10, color: t.textSub, fontWeight: 500 }}>Member Portal</div>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 2 }}>
            {[
              { id: "dashboard", label: "Dashboard" },
              { id: "history",   label: "My Payments" },
              { id: "profile",   label: "Profile" },
            ].map(tb => (
              <button key={tb.id} className="mp-tab-btn"
                onClick={() => setTab(tb.id)}
                style={{ fontSize: 13, fontWeight: tab === tb.id ? 700 : 500, color: tab === tb.id ? t.accent : t.textSub, padding: "8px 14px", borderRadius: 8, background: tab === tb.id ? `${t.accent}14` : "none" }}>
                {tb.label}
              </button>
            ))}
          </div>

          {/* Right controls */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => { const n = !isDark; setIsDark(n); localStorage.setItem("unified-theme", n ? "dark" : "light"); }}
              style={{ background: "none", border: "none", cursor: "pointer", color: t.textSub, fontSize: 17, padding: 4, lineHeight: 1 }}>
              {isDark ? "☀️" : "🌙"}
            </button>
            <button onClick={() => supabase.auth.signOut()}
              style={{ fontSize: 12, fontWeight: 600, color: t.negative, background: `${t.negative}12`, border: `1px solid ${t.negative}25`, borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontFamily: "inherit" }}>
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 24px 60px" }}>

        {/* Greeting */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.4px", color: t.text, margin: 0 }}>
            Hi, {data.profile?.full_name?.split(" ")[0] || "there"} 👋
          </h1>
          <p style={{ fontSize: 13, color: t.textSub, margin: "4px 0 0" }}>Here's an overview of your contributions.</p>
        </div>

        {/* ── DASHBOARD TAB ── */}
        {tab === "dashboard" && (
          <div className="mp-anim" style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Stat cards */}
            <div className="mp-stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
              {[
                { label: "Total Paid (All Time)", value: fmt(totalPaid), color: t.accent },
                { label: `Paid in FY ${currentYear}`, value: fmt(thisYearTotal), color: t.positive },
                { label: "Last Payment", value: lastPayment ? fmt(lastPayment.amount) : "—", sub: lastPayment ? new Date(lastPayment.created_at).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) : "No payments yet", color: t.warning },
              ].map((s, i) => (
                <Card key={i} style={{ animation: `mpSlideUp 0.35s ease ${i*0.06}s both` }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: t.textSub, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>{s.label}</p>
                  <p style={{ fontSize: 20, fontWeight: 700, color: s.color, letterSpacing: "-0.5px", marginBottom: s.sub ? 2 : 0, lineHeight: 1.1 }}>{s.value}</p>
                  {s.sub && <p style={{ fontSize: 11, color: t.textSub }}>{s.sub}</p>}
                </Card>
              ))}
            </div>

            {/* Donut + Rankings */}
            <div className="mp-dash-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

              {/* Payment breakdown donut */}
              <Card>
                <p style={{ fontSize: 12, fontWeight: 700, color: t.textSub, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 20 }}>Payment Breakdown</p>
                {donutSegments.length === 0 ? (
                  <p style={{ fontSize: 13, color: t.textSub, textAlign: "center", padding: "24px 0" }}>No payments recorded yet.</p>
                ) : (
                  <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
                    <div style={{ flexShrink: 0 }}>
                      <Donut segments={donutSegments} size={140}/>
                    </div>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                      {donutSegments.map((s, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color, flexShrink: 0 }}/>
                            <span style={{ fontSize: 12, color: t.textSub, fontWeight: 500 }}>{s.name}</span>
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: t.text }}>{fmt(s.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>

              {/* Overall ranking */}
              <Card style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: t.textSub, textTransform: "uppercase", letterSpacing: "0.07em" }}>Your Rankings</p>
                <RankCard
                  rank={data.rankOverall?.rank}
                  total={data.rankOverall?.total_members}
                  label="Overall — All Time"
                  color={t.accent}
                />
                <p style={{ fontSize: 11, color: t.textSub, textAlign: "center" }}>
                  Total contributed: <strong style={{ color: t.text }}>{fmt(data.rankOverall?.member_total || 0)}</strong>
                </p>
              </Card>
            </div>

            {/* Per-type rankings */}
            {data.rankByType.length > 0 && (
              <Card>
                <p style={{ fontSize: 12, fontWeight: 700, color: t.textSub, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 16 }}>Rankings by Payment Type</p>
                <div className="mp-rank-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
                  {data.rankByType.map((r, i) => (
                    <RankCard key={r.payment_type_id}
                      rank={r.rank}
                      total={r.total_members}
                      label={r.payment_type_name}
                      color={COLORS[i % COLORS.length]}
                    />
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}

        {/* ── HISTORY TAB ── */}
        {tab === "history" && (
          <div className="mp-anim" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Filter bar */}
            <Card style={{ padding: "14px 20px" }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: t.textSub }}>Filter:</span>
                {[{ id: "all", name: "All Types" }, ...data.paymentTypes].map(pt => (
                  <button key={pt.id} onClick={() => setFilterType(pt.id)}
                    style={{ fontSize: 12, fontWeight: 600, padding: "5px 14px", borderRadius: 20, border: `1px solid ${filterType === pt.id ? t.accent : t.border}`, background: filterType === pt.id ? `${t.accent}18` : "none", color: filterType === pt.id ? t.accent : t.textSub, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}>
                    {pt.name}
                  </button>
                ))}
                <span style={{ marginLeft: "auto", fontSize: 12, color: t.textSub }}>{filtered.length} payment{filtered.length !== 1 ? "s" : ""}</span>
              </div>
            </Card>

            {filtered.length === 0 ? (
              <Card><p style={{ fontSize: 13, color: t.textSub, textAlign: "center", padding: "32px 0" }}>No payments found.</p></Card>
            ) : (
              <Card style={{ padding: "8px 0" }}>
                {filtered.map((c, i) => {
                  const dateStr = new Date(c.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                  const ptColor = c.payment_types?.color || "#8E8E93";
                  const ptName  = c.payment_types?.name  || "Uncategorised";
                  return (
                    <div key={c.id} className="mp-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 20px", borderBottom: i < filtered.length - 1 ? `1px solid ${t.border}` : "none", transition: "background 0.12s", borderRadius: i === 0 ? "20px 20px 0 0" : i === filtered.length - 1 ? "0 0 20px 20px" : 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${ptColor}18`, border: `1px solid ${ptColor}33`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 16 }}>💳</div>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 14, fontWeight: 600, color: t.text }}>{ptName}</span>
                            {c.financial_year && <Badge label={`FY ${c.financial_year}`} color={ptColor}/>}
                          </div>
                          {c.note && <p style={{ fontSize: 12, color: t.textSub, margin: "2px 0 0" }}>{c.note}</p>}
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <p style={{ fontSize: 15, fontWeight: 700, color: t.positive, margin: 0 }}>{fmt(c.amount)}</p>
                        <p style={{ fontSize: 11, color: t.textSub, margin: "2px 0 0" }}>{dateStr}</p>
                      </div>
                    </div>
                  );
                })}
              </Card>
            )}
          </div>
        )}

        {/* ── PROFILE TAB ── */}
        {tab === "profile" && (
          <div className="mp-anim" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Card>
              <p style={{ fontSize: 12, fontWeight: 700, color: t.textSub, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 20 }}>Your Profile</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                {[
                  { label: "Full Name",       value: data.profile?.full_name || "—" },
                  { label: "Email",           value: session.user.email },
                  { label: "Status",          value: data.profile?.status || "active" },
                  { label: "Monthly Target",  value: data.profile?.monthly_target > 0 ? fmt(data.profile.monthly_target) : "Not set" },
                  { label: "Organisation",    value: data.org?.name || "—" },
                  { label: "Member Since",    value: new Date(data.profile?.created_at || Date.now()).toLocaleDateString("en-US",{month:"long",year:"numeric"}) },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: t.textSub, textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 4px" }}>{label}</p>
                    <p style={{ fontSize: 14, fontWeight: 600, color: t.text, margin: 0 }}>{value}</p>
                  </div>
                ))}
              </div>
            </Card>

            {data.profile?.monthly_target > 0 && (
              <Card>
                <p style={{ fontSize: 12, fontWeight: 700, color: t.textSub, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 16 }}>Monthly Target Progress</p>
                {(() => {
                  const now = new Date();
                  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                  const thisMonth = data.contributions
                    .filter(c => new Date(c.created_at) >= monthStart)
                    .reduce((s, c) => s + Number(c.amount), 0);
                  const pct = Math.min((thisMonth / data.profile.monthly_target) * 100, 100);
                  const color = pct >= 100 ? t.positive : pct >= 60 ? t.warning : t.negative;
                  return (
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ fontSize: 13, color: t.textSub }}>This month</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color }}>{fmt(thisMonth)} / {fmt(data.profile.monthly_target)}</span>
                      </div>
                      <div style={{ height: 8, borderRadius: 4, background: t.border, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 4, transition: "width 1s ease", boxShadow: `0 0 8px ${color}66` }}/>
                      </div>
                      <p style={{ fontSize: 11, color: t.textSub, marginTop: 6 }}>{Math.round(pct)}% of target reached</p>
                    </div>
                  );
                })()}
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
