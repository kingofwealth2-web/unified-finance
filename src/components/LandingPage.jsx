import { useState, useEffect, useRef } from "react";

// ── Animated Donut ────────────────────────────────────────────
function AnimatedDonut({ segments, size = 120, delay = 0 }) {
  const [prog, setProg] = useState(0);
  useEffect(() => {
    const tm = setTimeout(() => {
      let start = null;
      const run = (ts) => {
        if (!start) start = ts;
        const p = Math.min((ts - start) / 1200, 1);
        setProg(1 - Math.pow(1 - p, 4));
        if (p < 1) requestAnimationFrame(run);
      };
      requestAnimationFrame(run);
    }, delay);
    return () => clearTimeout(tm);
  }, [delay]);

  const cx = size / 2, cy = size / 2, R = size * 0.38, r = size * 0.22;
  const gap = 0.04;
  let cum = -Math.PI / 2;
  const total = segments.reduce((s, d) => s + d.value, 0);
  const slices = segments.map((d) => {
    const frac = (d.value / total) * prog;
    const span = frac * Math.PI * 2 - gap;
    const start = cum + gap / 2;
    const end = cum + span + gap / 2;
    cum += (d.value / total) * prog * Math.PI * 2;
    const large = span > Math.PI ? 1 : 0;
    const safe = span > 0.01;
    const x1 = cx + R * Math.cos(start), y1 = cy + R * Math.sin(start);
    const x2 = cx + R * Math.cos(end),   y2 = cy + R * Math.sin(end);
    const ix1 = cx + r * Math.cos(end),  iy1 = cy + r * Math.sin(end);
    const ix2 = cx + r * Math.cos(start),iy2 = cy + r * Math.sin(start);
    const path = safe ? `M${x1} ${y1}A${R} ${R} 0 ${large} 1 ${x2} ${y2}L${ix1} ${iy1}A${r} ${r} 0 ${large} 0 ${ix2} ${iy2}Z` : "";
    return { ...d, path };
  });

  return (
    <svg width={size} height={size} style={{ display: "block", overflow: "visible" }}>
      <defs>
        {segments.map((d, i) => (
          <radialGradient key={i} id={`ldg-${i}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={d.color} stopOpacity="1"/>
            <stop offset="100%" stopColor={d.color} stopOpacity="0.65"/>
          </radialGradient>
        ))}
      </defs>
      {slices.map((s, i) => s.path ? (
        <path key={i} d={s.path} fill={`url(#ldg-${i})`}
          style={{ filter: `drop-shadow(0 0 5px ${s.color}55)` }}
        />
      ) : null)}
      <text x={cx} y={cy - 4} textAnchor="middle"
        style={{ fill: "#fff", fontSize: size * 0.15, fontWeight: 800, fontFamily: "inherit" }}>
        {Math.round(prog * 62)}%
      </text>
      <text x={cx} y={cy + size * 0.13} textAnchor="middle"
        style={{ fill: "rgba(255,255,255,0.4)", fontSize: size * 0.09, fontFamily: "inherit" }}>
        collected
      </text>
    </svg>
  );
}

// ── Animated Bars ─────────────────────────────────────────────
function AnimatedBars({ data, delay = 0 }) {
  const [prog, setProg] = useState(0);
  useEffect(() => {
    const tm = setTimeout(() => {
      let start = null;
      const run = (ts) => {
        if (!start) start = ts;
        const p = Math.min((ts - start) / 1000, 1);
        setProg(1 - Math.pow(1 - p, 3));
        if (p < 1) requestAnimationFrame(run);
      };
      requestAnimationFrame(run);
    }, delay);
    return () => clearTimeout(tm);
  }, [delay]);

  const max = Math.max(...data.map(d => d.value)) * 1.1 || 1;

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 90 }}>
      {data.map((d, i) => {
        const pct = (d.value / max) * 100 * prog;
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, height: "100%", justifyContent: "flex-end" }}>
            <div style={{
              width: "100%", borderRadius: "4px 4px 0 0",
              height: `${pct}%`,
              background: "linear-gradient(180deg,#0071E3 0%,rgba(0,113,227,0.3) 100%)",
              boxShadow: "0 0 6px rgba(0,113,227,0.3)",
              minHeight: pct > 0 ? 2 : 0,
            }}/>
            <span style={{ fontSize: 8, color: "rgba(255,255,255,0.35)", whiteSpace: "nowrap" }}>{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Animated Line ─────────────────────────────────────────────
function AnimatedLine({ data, delay = 0 }) {
  const [prog, setProg] = useState(0);
  useEffect(() => {
    const tm = setTimeout(() => {
      let start = null;
      const run = (ts) => {
        if (!start) start = ts;
        const p = Math.min((ts - start) / 1400, 1);
        setProg(1 - Math.pow(1 - p, 3));
        if (p < 1) requestAnimationFrame(run);
      };
      requestAnimationFrame(run);
    }, delay);
    return () => clearTimeout(tm);
  }, [delay]);

  const W = 280, H = 72;
  const pL = 6, pR = 6, pT = 8, pB = 6;
  const cW = W - pL - pR, cH = H - pT - pB;
  const max = Math.max(...data.map(d => d.v)) * 1.2 || 1;

  const pts = data.map((d, i) => ({
    x: pL + (i / (data.length - 1)) * cW,
    y: pT + cH - (d.v / max) * cH,
  }));

  const linePath = pts.reduce((acc, pt, i) => {
    if (i === 0) return `M${pt.x} ${pt.y}`;
    const prev = pts[i - 1];
    const cx1 = prev.x + (pt.x - prev.x) * 0.5;
    return `${acc}C${cx1} ${prev.y},${cx1} ${pt.y},${pt.x} ${pt.y}`;
  }, "");

  const areaPath = `${linePath}L${pts[pts.length-1].x} ${H}L${pts[0].x} ${H}Z`;
  const clipW = Math.max(0, cW * prog);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block", overflow: "visible" }}>
      <defs>
        <linearGradient id="ll-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#A78BFA" stopOpacity="0.28"/>
          <stop offset="100%" stopColor="#A78BFA" stopOpacity="0.01"/>
        </linearGradient>
        <clipPath id="ll-clip"><rect x={pL} y={0} width={clipW} height={H}/></clipPath>
      </defs>
      {[0,1,2].map(i => (
        <line key={i} x1={pL} x2={W-pR} y1={pT+(cH/2)*i} y2={pT+(cH/2)*i}
          stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
      ))}
      <path d={areaPath} fill="url(#ll-area)" clipPath="url(#ll-clip)"/>
      <path d={linePath} fill="none" stroke="#A78BFA" strokeWidth="2"
        strokeLinecap="round" clipPath="url(#ll-clip)"
        style={{ filter: "drop-shadow(0 0 3px rgba(167,139,250,0.6))" }}
      />
    </svg>
  );
}

// ── Counter ───────────────────────────────────────────────────
function Counter({ target, prefix = "", suffix = "", delay = 0, decimals = 0 }) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      setTimeout(() => {
        let start = null;
        const run = (ts) => {
          if (!start) start = ts;
          const p = Math.min((ts - start) / 1800, 1);
          setVal((1 - Math.pow(1 - p, 4)) * target);
          if (p < 1) requestAnimationFrame(run);
        };
        requestAnimationFrame(run);
      }, delay);
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, delay]);

  return (
    <span ref={ref}>
      {prefix}{decimals > 0 ? val.toFixed(decimals) : Math.floor(val).toLocaleString()}{suffix}
    </span>
  );
}

// ── Main ──────────────────────────────────────────────────────
export default function LandingPage({ onSignIn }) {
  const [scrollY, setScrollY] = useState(0);
  const [visible, setVisible] = useState({});

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const els = document.querySelectorAll("[data-reveal]");
    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) setVisible(v => ({ ...v, [e.target.dataset.reveal]: true }));
      });
    }, { threshold: 0.1 });
    els.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const rv = (id, delay = 0) => ({
    "data-reveal": id,
    style: {
      opacity: visible[id] ? 1 : 0,
      transform: visible[id] ? "translateY(0)" : "translateY(24px)",
      transition: `opacity 0.6s ease ${delay}s, transform 0.6s ease ${delay}s`,
    },
  });

  const donutData = [
    { value: 62, color: "#0071E3" },
    { value: 23, color: "#A78BFA" },
    { value: 15, color: "#FB7185" },
  ];
  const barData = [
    { label: "Jan", value: 42 }, { label: "Feb", value: 67 },
    { label: "Mar", value: 54 }, { label: "Apr", value: 89 },
    { label: "May", value: 73 }, { label: "Jun", value: 95 },
  ];
  const lineData = [
    { v: 12 }, { v: 28 }, { v: 19 }, { v: 44 },
    { v: 38 }, { v: 61 }, { v: 52 }, { v: 79 }, { v: 88 },
  ];

  const features = [
    { icon: "💳", title: "Payment Tracking",     desc: "Record contributions with custom payment types, goals, and live rankings.",         color: "#0071E3" },
    { icon: "📊", title: "Financial Insights",   desc: "Charts reveal income trends, expense breakdowns, and top contributors instantly.", color: "#A78BFA" },
    { icon: "👥", title: "Member Management",    desc: "Track history, set monthly targets, and manage active vs. inactive members.",       color: "#FB7185" },
    { icon: "🏛",  title: "Multi-Organisation",  desc: "Manage multiple orgs from one account with full isolation and role-based access.",  color: "#FBBF24" },
    { icon: "📋", title: "Audit Trail",           desc: "Every action logged. Know who did what and when with a full audit history.",        color: "#34D399" },
    { icon: "📤", title: "Export & Reports",      desc: "PDF-ready summaries and CSV exports in seconds — ready for any meeting.",          color: "#60A5FA" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#080A12", color: "#fff", fontFamily: "'DM Sans','Helvetica Neue',Arial,sans-serif", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Syne:wght@700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .lp-btn-primary {
          background: linear-gradient(135deg,#0071E3,#34AADC);
          color: #020810; border: none;
          padding: 13px 28px; border-radius: 100px;
          font-size: 14px; font-weight: 700; cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          font-family: inherit;
          box-shadow: 0 0 24px rgba(0,113,227,0.28);
          white-space: nowrap;
        }
        .lp-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 0 36px rgba(0,113,227,0.45); }

        .lp-btn-ghost {
          background: rgba(255,255,255,0.07); color: #fff;
          border: 1px solid rgba(255,255,255,0.14);
          padding: 12px 24px; border-radius: 100px;
          font-size: 14px; font-weight: 600; cursor: pointer;
          transition: background 0.2s, border-color 0.2s;
          font-family: inherit; white-space: nowrap;
        }
        .lp-btn-ghost:hover { background: rgba(255,255,255,0.12); border-color: rgba(255,255,255,0.28); }

        .lp-feat-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px; padding: 26px;
          transition: transform 0.3s, border-color 0.3s, box-shadow 0.3s;
        }
        .lp-feat-card:hover {
          transform: translateY(-4px);
          border-color: rgba(255,255,255,0.15);
          box-shadow: 0 16px 48px rgba(0,0,0,0.4);
        }

        .lp-mock-card {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px; padding: 14px;
        }

        @keyframes lp-pulse { 0%,100%{opacity:0.25;transform:scale(1)} 50%{opacity:0.45;transform:scale(1.04)} }
        @keyframes lp-fadeup { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }

        /* ── Responsive ── */
        @media (max-width:900px) {
          .mock-grid-top    { grid-template-columns: 1fr 1fr !important; }
          .mock-grid-bottom { grid-template-columns: 1fr 1fr !important; }
          .feat-grid        { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width:600px) {
          .lp-nav           { padding: 14px 18px !important; }
          .lp-nav-right a   { display: none; }
          .lp-hero          { padding: 96px 18px 56px !important; }
          .lp-section       { padding: 56px 18px !important; }
          .lp-hero-btns     { flex-direction: column !important; }
          .lp-hero-btns > * { width: 100% !important; text-align: center; }
          .mock-grid-top    { grid-template-columns: 1fr !important; }
          .mock-grid-bottom { display: none !important; }
          .mock-mobile-only { display: flex !important; }
          .feat-grid        { grid-template-columns: 1fr !important; }
          .stats-grid       { grid-template-columns: 1fr 1fr !important; }
          .lp-footer        { flex-direction: column !important; text-align: center; }
          .cta-box          { padding: 36px 22px !important; }
        }
      `}</style>

      {/* Background glows */}
      <div aria-hidden="true" style={{ position:"fixed",inset:0,pointerEvents:"none",zIndex:0,overflow:"hidden" }}>
        <div style={{ position:"absolute",top:"-15%",left:"-15%",width:600,height:600,borderRadius:"50%",background:"radial-gradient(circle,rgba(0,113,227,0.09) 0%,transparent 70%)",animation:"lp-pulse 9s ease-in-out infinite" }}/>
        <div style={{ position:"absolute",bottom:"-15%",right:"-10%",width:500,height:500,borderRadius:"50%",background:"radial-gradient(circle,rgba(167,139,250,0.07) 0%,transparent 70%)",animation:"lp-pulse 12s ease-in-out infinite 3s" }}/>
      </div>

      {/* ── NAV ── */}
      <nav className="lp-nav" style={{
        position:"fixed",top:0,left:0,right:0,zIndex:100,
        display:"flex",alignItems:"center",justifyContent:"space-between",
        padding:"16px 40px",
        background: scrollY > 40 ? "rgba(8,10,18,0.88)" : "transparent",
        backdropFilter: scrollY > 40 ? "blur(20px)" : "none",
        borderBottom: scrollY > 40 ? "1px solid rgba(255,255,255,0.07)" : "none",
        transition:"all 0.3s",
        animation:"lp-fadeup 0.5s ease",
      }}>
        <div style={{ display:"flex",alignItems:"center",gap:9,flexShrink:0 }}>
          <div style={{ width:32,height:32,borderRadius:9,background:"linear-gradient(135deg,#0071E3,#34AADC)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:"0 0 16px rgba(0,113,227,0.35)" }}>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <path d="M2 8h5M9 8h5M8 2v5M8 9v5" stroke="#020810" strokeWidth="2.2" strokeLinecap="round"/>
            </svg>
          </div>
          <span style={{ fontSize:15,fontWeight:700,letterSpacing:"-0.3px",fontFamily:"Syne,sans-serif",whiteSpace:"nowrap" }}>Unified Finance</span>
        </div>
        <div className="lp-nav-right" style={{ display:"flex",gap:14,alignItems:"center" }}>
          <a href="#features" style={{ color:"rgba(255,255,255,0.55)",fontSize:13,textDecoration:"none",fontWeight:500 }}>Features</a>
          <button className="lp-btn-primary" onClick={onSignIn} style={{ padding:"9px 20px",fontSize:13 }}>Sign In →</button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="lp-hero" style={{ position:"relative",zIndex:1,minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"110px 40px 72px",textAlign:"center" }}>

        {/* Badge */}
        <div style={{ display:"inline-flex",alignItems:"center",gap:8,padding:"5px 14px 5px 6px",borderRadius:100,background:"rgba(0,113,227,0.1)",border:"1px solid rgba(0,113,227,0.22)",marginBottom:26,animation:"lp-fadeup 0.6s ease 0.1s both",flexWrap:"nowrap" }}>
          <span style={{ fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:100,background:"#0071E3",color:"#020810",letterSpacing:"0.06em",whiteSpace:"nowrap" }}>NEW</span>
          <span style={{ fontSize:12,color:"rgba(255,255,255,0.6)",fontWeight:500,whiteSpace:"nowrap" }}>Multi-organisation finance management</span>
        </div>

        {/* Headline — clamp prevents stretching, normal letter-spacing */}
        <h1 style={{
          fontFamily:"Syne,sans-serif",
          fontSize:"clamp(30px,5.5vw,64px)",
          fontWeight:800,
          lineHeight:1.1,
          letterSpacing:"-0.5px",
          marginBottom:20,
          maxWidth:700,
          animation:"lp-fadeup 0.7s ease 0.2s both",
        }}>
          Your organisation's{" "}
          <span style={{ background:"linear-gradient(120deg,#0071E3 0%,#A78BFA 55%,#FB7185 100%)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>
            finances, mastered.
          </span>
        </h1>

        <p style={{ fontSize:"clamp(13px,1.8vw,16px)",color:"rgba(255,255,255,0.5)",maxWidth:480,lineHeight:1.7,marginBottom:36,animation:"lp-fadeup 0.7s ease 0.32s both" }}>
          Track contributions, manage expenses, generate reports, and keep your team aligned — all in one place.
        </p>

        <div className="lp-hero-btns" style={{ display:"flex",gap:12,flexWrap:"wrap",justifyContent:"center",animation:"lp-fadeup 0.7s ease 0.46s both" }}>
          <button className="lp-btn-primary" onClick={onSignIn}>Get Started →</button>
          <a href="#features" style={{ textDecoration:"none" }}>
            <button className="lp-btn-ghost">See features</button>
          </a>
        </div>

        {/* ── DASHBOARD MOCKUP ── */}
        <div style={{ position:"relative",marginTop:60,width:"100%",maxWidth:920,animation:"lp-fadeup 0.9s ease 0.62s both" }}>
          {/* glow under */}
          <div style={{ position:"absolute",bottom:-32,left:"50%",transform:"translateX(-50%)",width:"50%",height:64,background:"radial-gradient(ellipse,rgba(0,113,227,0.15) 0%,transparent 70%)",pointerEvents:"none" }}/>

          <div style={{ background:"rgba(10,12,22,0.94)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:22,padding:"18px 18px 22px",boxShadow:"0 28px 80px rgba(0,0,0,0.65),inset 0 1px 0 rgba(255,255,255,0.06)" }}>
            {/* Fake title bar */}
            <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:16 }}>
              <div style={{ display:"flex",gap:5 }}>
                {["#FF5F57","#FEBC2E","#28C840"].map(c => <div key={c} style={{ width:8,height:8,borderRadius:"50%",background:c }}/>)}
              </div>
              <div style={{ flex:1,height:1,background:"rgba(255,255,255,0.05)",borderRadius:1,marginLeft:4 }}/>
              <span style={{ fontSize:9,color:"rgba(255,255,255,0.2)" }}>unified.finance</span>
            </div>

            {/* Stat cards — 3 col desktop, 1 col mobile */}
            <div className="mock-grid-top" style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:10 }}>
              {[
                { label:"Contributions", value:"GHS 284,500", sub:"+12.4% this month", color:"#0071E3" },
                { label:"Expenses",      value:"GHS 61,200",  sub:"8 categories",      color:"#FB7185" },
                { label:"Net Balance",   value:"GHS 223,300", sub:"Healthy surplus ✓", color:"#A78BFA" },
              ].map((s,i) => (
                <div key={i} className="lp-mock-card">
                  <p style={{ fontSize:9,color:"rgba(255,255,255,0.36)",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:6 }}>{s.label}</p>
                  <p style={{ fontSize:"clamp(13px,1.8vw,18px)",fontWeight:700,color:s.color,letterSpacing:"-0.4px",marginBottom:3,fontFamily:"Syne,sans-serif",lineHeight:1.1 }}>{s.value}</p>
                  <p style={{ fontSize:9,color:"rgba(255,255,255,0.28)" }}>{s.sub}</p>
                </div>
              ))}
            </div>

            {/* Charts row — hidden on mobile */}
            <div className="mock-grid-bottom" style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10 }}>
              {/* Donut */}
              <div className="lp-mock-card" style={{ display:"flex",flexDirection:"column",gap:10 }}>
                <p style={{ fontSize:9,color:"rgba(255,255,255,0.36)",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.07em" }}>By Type</p>
                <div style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:8 }}>
                  <AnimatedDonut segments={donutData} size={110} delay={900}/>
                  <div style={{ width:"100%",display:"flex",flexDirection:"column",gap:5 }}>
                    {[["Monthly Dues","#0071E3","62%"],["Annual Levy","#A78BFA","23%"],["Building Fund","#FB7185","15%"]].map(([l,c,p]) => (
                      <div key={l} style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                        <div style={{ display:"flex",alignItems:"center",gap:5 }}>
                          <div style={{ width:6,height:6,borderRadius:2,background:c,flexShrink:0 }}/>
                          <span style={{ fontSize:9,color:"rgba(255,255,255,0.42)" }}>{l}</span>
                        </div>
                        <span style={{ fontSize:9,fontWeight:700,color:c }}>{p}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bars */}
              <div className="lp-mock-card" style={{ display:"flex",flexDirection:"column",gap:8 }}>
                <p style={{ fontSize:9,color:"rgba(255,255,255,0.36)",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.07em" }}>Monthly Income</p>
                <AnimatedBars data={barData} delay={1000}/>
              </div>

              {/* Line + activity */}
              <div className="lp-mock-card" style={{ display:"flex",flexDirection:"column",gap:8 }}>
                <p style={{ fontSize:9,color:"rgba(255,255,255,0.36)",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.07em" }}>Trend</p>
                <AnimatedLine data={lineData} delay={1100}/>
                <div style={{ borderTop:"1px solid rgba(255,255,255,0.06)",paddingTop:8,display:"flex",flexDirection:"column",gap:5 }}>
                  {[
                    { name:"Kwame M.",   amt:"+500",    color:"#0071E3" },
                    { name:"Abena O.",   amt:"+1,200",  color:"#A78BFA" },
                    { name:"Office Rent",amt:"-4,500",  color:"#FB7185" },
                  ].map((a,i) => (
                    <div key={i} style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                      <span style={{ fontSize:9,color:"rgba(255,255,255,0.44)" }}>{a.name}</span>
                      <span style={{ fontSize:9,fontWeight:700,color:a.color }}>{a.amt}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Mobile-only simplified view */}
            <div className="mock-mobile-only" style={{ display:"none",flexDirection:"column",gap:10 }}>
              <div className="lp-mock-card">
                <p style={{ fontSize:9,color:"rgba(255,255,255,0.36)",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:8 }}>Contribution Trend</p>
                <AnimatedLine data={lineData} delay={800}/>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="lp-section" style={{ position:"relative",zIndex:1,padding:"60px 40px",borderTop:"1px solid rgba(255,255,255,0.06)" }}>
        <div className="stats-grid" style={{ maxWidth:800,margin:"0 auto",display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:28,textAlign:"center" }}>
          {[
            { n:50000, s:"+",  label:"Contributions tracked" },
            { n:99.9,  s:"%",  label:"Uptime reliability", dec:1 },
            { n:1000,  s:"+",  label:"Reports generated" },
            { n:5,     s:"×",  label:"Faster than spreadsheets" },
          ].map((s,i) => (
            <div key={i} {...rv(`stat-${i}`, i*0.1)}>
              <div style={{ fontFamily:"Syne,sans-serif",fontSize:"clamp(26px,3.5vw,40px)",fontWeight:800,letterSpacing:"-1px",background:"linear-gradient(135deg,#0071E3,#A78BFA)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text",lineHeight:1 }}>
                <Counter target={s.n} suffix={s.s} delay={i*100} decimals={s.dec||0}/>
              </div>
              <p style={{ fontSize:12,color:"rgba(255,255,255,0.38)",marginTop:6,lineHeight:1.4 }}>{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="lp-section" style={{ position:"relative",zIndex:1,padding:"72px 40px",maxWidth:1080,margin:"0 auto" }}>
        <div {...rv("feat-head")} style={{ textAlign:"center",marginBottom:48,...rv("feat-head").style }}>
          <p style={{ fontSize:11,fontWeight:700,color:"#0071E3",textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:12 }}>Everything you need</p>
          <h2 style={{ fontFamily:"Syne,sans-serif",fontSize:"clamp(24px,4vw,42px)",fontWeight:800,letterSpacing:"-0.8px",lineHeight:1.18,color:"#fff" }}>
            Built for organisations that{" "}
            <span style={{ color:"rgba(255,255,255,0.28)" }}>take finances seriously.</span>
          </h2>
        </div>

        <div className="feat-grid" style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14 }}>
          {features.map((f,i) => (
            <div key={i} className="lp-feat-card" {...rv(`feat-${i}`, i*0.07)} style={{ ...rv(`feat-${i}`,i*0.07).style }}>
              <div style={{ width:42,height:42,borderRadius:12,background:`${f.color}18`,border:`1px solid ${f.color}30`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,marginBottom:14,flexShrink:0 }}>
                {f.icon}
              </div>
              <h3 style={{ fontSize:15,fontWeight:700,color:"#fff",marginBottom:7,letterSpacing:"-0.2px" }}>{f.title}</h3>
              <p style={{ fontSize:13,color:"rgba(255,255,255,0.45)",lineHeight:1.62 }}>{f.desc}</p>
              <div style={{ marginTop:16,width:26,height:2,borderRadius:2,background:f.color,boxShadow:`0 0 5px ${f.color}` }}/>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="lp-section" style={{ position:"relative",zIndex:1,padding:"72px 40px",textAlign:"center" }}>
        <div {...rv("cta")} style={{ maxWidth:560,margin:"0 auto",...rv("cta").style }}>
          <div className="cta-box" style={{ padding:"48px 40px",background:"linear-gradient(135deg,rgba(0,113,227,0.07) 0%,rgba(167,139,250,0.07) 100%)",border:"1px solid rgba(0,113,227,0.17)",borderRadius:26,boxShadow:"0 0 50px rgba(0,113,227,0.06)" }}>
            <div style={{ fontSize:32,marginBottom:14 }}>✦</div>
            <h2 style={{ fontFamily:"Syne,sans-serif",fontSize:"clamp(22px,4vw,36px)",fontWeight:800,letterSpacing:"-0.6px",marginBottom:12,lineHeight:1.18 }}>
              Ready to take control?
            </h2>
            <p style={{ fontSize:14,color:"rgba(255,255,255,0.46)",marginBottom:30,lineHeight:1.65 }}>
              Sign in and see your organisation's finances come to life.
            </p>
            <button className="lp-btn-primary" onClick={onSignIn} style={{ fontSize:14,padding:"13px 34px" }}>
              Sign In to Unified Finance →
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="lp-footer" style={{ position:"relative",zIndex:1,padding:"24px 40px",borderTop:"1px solid rgba(255,255,255,0.06)",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:14 }}>
        <div style={{ display:"flex",alignItems:"center",gap:8 }}>
          <div style={{ width:26,height:26,borderRadius:7,background:"linear-gradient(135deg,#0071E3,#34AADC)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path d="M2 8h5M9 8h5M8 2v5M8 9v5" stroke="#020810" strokeWidth="2.2" strokeLinecap="round"/>
            </svg>
          </div>
          <span style={{ fontSize:13,fontWeight:700,color:"rgba(255,255,255,0.45)",fontFamily:"Syne,sans-serif" }}>Unified Finance</span>
        </div>
        <p style={{ fontSize:11,color:"rgba(255,255,255,0.2)" }}>© {new Date().getFullYear()} Unified Finance. All rights reserved.</p>
        <button onClick={onSignIn} style={{ background:"none",border:"none",color:"rgba(255,255,255,0.38)",fontSize:12,cursor:"pointer",fontFamily:"inherit",padding:0 }}>
          Sign In →
        </button>
      </footer>
    </div>
  );
}
