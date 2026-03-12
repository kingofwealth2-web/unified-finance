import { useState, useEffect, useRef } from "react";

// ── Animated Donut ────────────────────────────────────────────
function AnimatedDonut({ segments, size = 180, delay = 0 }) {
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
    const safe = span > 0;
    const x1 = cx + R * Math.cos(start), y1 = cy + R * Math.sin(start);
    const x2 = cx + R * Math.cos(end),   y2 = cy + R * Math.sin(end);
    const ix1 = cx + r * Math.cos(end),  iy1 = cy + r * Math.sin(end);
    const ix2 = cx + r * Math.cos(start),iy2 = cy + r * Math.sin(start);
    const path = safe ? `M${x1} ${y1}A${R} ${R} 0 ${large} 1 ${x2} ${y2}L${ix1} ${iy1}A${r} ${r} 0 ${large} 0 ${ix2} ${iy2}Z` : "";
    return { ...d, path };
  });

  return (
    <svg width={size} height={size} style={{ overflow: "visible" }}>
      <defs>
        {segments.map((d, i) => (
          <radialGradient key={i} id={`dg-${i}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={d.color} stopOpacity="1"/>
            <stop offset="100%" stopColor={d.color} stopOpacity="0.7"/>
          </radialGradient>
        ))}
      </defs>
      {slices.map((s, i) => s.path ? (
        <path key={i} d={s.path} fill={`url(#dg-${i})`}
          style={{ filter: `drop-shadow(0 0 8px ${s.color}66)` }}
        />
      ) : null)}
      <text x={cx} y={cy - 6} textAnchor="middle"
        style={{ fill: "#fff", fontSize: size * 0.13, fontWeight: 800, fontFamily: "inherit" }}>
        {Math.round(prog * 100)}%
      </text>
      <text x={cx} y={cy + size * 0.1} textAnchor="middle"
        style={{ fill: "rgba(255,255,255,0.5)", fontSize: size * 0.07, fontFamily: "inherit" }}>
        collected
      </text>
    </svg>
  );
}

// ── Animated Bar Chart ────────────────────────────────────────
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
  const h = 120, w = 220;
  const bW = 24, gap = (w - data.length * bW) / (data.length + 1);

  return (
    <svg width={w} height={h + 24} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="bar-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4ECDC4"/>
          <stop offset="100%" stopColor="#4ECDC4" stopOpacity="0.3"/>
        </linearGradient>
      </defs>
      {data.map((d, i) => {
        const barH = (d.value / max) * h * prog;
        const x = gap + i * (bW + gap);
        return (
          <g key={i}>
            <rect x={x} y={h - barH} width={bW} height={barH}
              fill="url(#bar-grad)" rx={5}
              style={{ filter: `drop-shadow(0 0 6px #4ECDC466)` }}
            />
            <text x={x + bW / 2} y={h + 16} textAnchor="middle"
              style={{ fill: "rgba(255,255,255,0.45)", fontSize: 9, fontFamily: "inherit" }}>
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
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

  const w = 240, h = 90;
  const padL = 8, padR = 8, padT = 12, padB = 8;
  const chartW = w - padL - padR, chartH = h - padT - padB;
  const max = Math.max(...data.map(d => d.v)) * 1.15 || 1;

  const pts = data.map((d, i) => ({
    x: padL + (i / (data.length - 1)) * chartW,
    y: padT + chartH - (d.v / max) * chartH,
    ...d,
  }));

  const linePath = pts.reduce((acc, pt, i) => {
    if (i === 0) return `M${pt.x} ${pt.y}`;
    const prev = pts[i - 1];
    const c1x = prev.x + (pt.x - prev.x) * 0.5;
    return `${acc}C${c1x} ${prev.y},${c1x} ${pt.y},${pt.x} ${pt.y}`;
  }, "");

  const areaPath = `${linePath}L${pts[pts.length-1].x} ${h}L${pts[0].x} ${h}Z`;
  const clipW = chartW * prog;

  return (
    <svg width={w} height={h} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="line-area-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#A78BFA" stopOpacity="0.35"/>
          <stop offset="100%" stopColor="#A78BFA" stopOpacity="0.02"/>
        </linearGradient>
        <clipPath id="line-clip">
          <rect x={padL} y={0} width={clipW} height={h}/>
        </clipPath>
        <filter id="line-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      {[0, 1, 2].map(i => (
        <line key={i} x1={padL} x2={w - padR}
          y1={padT + (chartH / 2) * i} y2={padT + (chartH / 2) * i}
          stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>
      ))}
      <path d={areaPath} fill="url(#line-area-grad)" clipPath="url(#line-clip)"/>
      <path d={linePath} fill="none" stroke="#A78BFA" strokeWidth="2.5"
        strokeLinecap="round" clipPath="url(#line-clip)"
        filter="url(#line-glow)"/>
      {pts.map((pt, i) => pt.x - padL <= clipW && (
        <circle key={i} cx={pt.x} cy={pt.y} r={3.5}
          fill="#A78BFA" stroke="rgba(15,17,26,1)" strokeWidth="2"
          style={{ filter: "drop-shadow(0 0 5px #A78BFA)" }}
        />
      ))}
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
          const eased = 1 - Math.pow(1 - p, 4);
          setVal(eased * target);
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

// ── Dashboard Mockup Card ─────────────────────────────────────
function MockupCard({ children, style = {} }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 20,
      padding: "20px 24px",
      backdropFilter: "blur(12px)",
      boxShadow: "0 8px 40px rgba(0,0,0,0.4)",
      ...style,
    }}>
      {children}
    </div>
  );
}

// ── Main Landing Page ─────────────────────────────────────────
export default function LandingPage({ onSignIn }) {
  const [scrollY, setScrollY] = useState(0);
  const [visible, setVisible] = useState({});

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) setVisible(v => ({ ...v, [e.target.dataset.reveal]: true }));
      });
    }, { threshold: 0.15 });
    document.querySelectorAll("[data-reveal]").forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const reveal = (id, extra = {}) => ({
    "data-reveal": id,
    style: {
      opacity: visible[id] ? 1 : 0,
      transform: visible[id] ? "translateY(0)" : "translateY(32px)",
      transition: "opacity 0.7s ease, transform 0.7s ease",
      ...extra,
    },
  });

  const donutData = [
    { value: 62, color: "#4ECDC4" },
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
    {
      icon: "💳",
      title: "Payment Tracking",
      desc: "Record and categorise every contribution with custom payment types, goals, and real-time rankings.",
      color: "#4ECDC4",
    },
    {
      icon: "📊",
      title: "Financial Insights",
      desc: "Interactive charts and reports reveal income trends, expense breakdowns, and top contributors at a glance.",
      color: "#A78BFA",
    },
    {
      icon: "👥",
      title: "Member Management",
      desc: "Track every member's contribution history, set monthly targets, and manage active vs. inactive status.",
      color: "#FB7185",
    },
    {
      icon: "🏛",
      title: "Multi-Organisation",
      desc: "Manage multiple organisations from a single account with full data isolation and role-based access.",
      color: "#FBBF24",
    },
    {
      icon: "📋",
      title: "Audit Trail",
      desc: "Every action is logged. Know exactly who did what and when with a full, filterable audit history.",
      color: "#34D399",
    },
    {
      icon: "📤",
      title: "Export & Print",
      desc: "Beautiful PDF-ready financial summaries and CSV exports in seconds — ready for meetings.",
      color: "#60A5FA",
    },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: "#080A12",
      color: "#fff",
      fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
      overflowX: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Syne:wght@700;800&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .land-btn-primary {
          background: linear-gradient(135deg, #4ECDC4, #2DD4BF);
          color: #020810;
          border: none;
          padding: 14px 32px;
          border-radius: 100px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.25s;
          font-family: inherit;
          letter-spacing: -0.2px;
          box-shadow: 0 0 32px rgba(78,205,196,0.3);
        }
        .land-btn-primary:hover {
          transform: translateY(-2px) scale(1.03);
          box-shadow: 0 0 48px rgba(78,205,196,0.45);
        }
        .land-btn-secondary {
          background: rgba(255,255,255,0.07);
          color: #fff;
          border: 1px solid rgba(255,255,255,0.15);
          padding: 13px 28px;
          border-radius: 100px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
          backdrop-filter: blur(8px);
        }
        .land-btn-secondary:hover {
          background: rgba(255,255,255,0.12);
          border-color: rgba(255,255,255,0.3);
        }
        .feature-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 24px;
          padding: 32px;
          transition: all 0.3s;
          position: relative;
          overflow: hidden;
        }
        .feature-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, var(--card-color, #4ECDC4)08, transparent);
          opacity: 0;
          transition: opacity 0.3s;
        }
        .feature-card:hover {
          border-color: rgba(255,255,255,0.18);
          transform: translateY(-4px);
          box-shadow: 0 20px 60px rgba(0,0,0,0.5);
        }
        .feature-card:hover::before { opacity: 1; }

        .noise-overlay {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          opacity: 0.025;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
        }

        @keyframes float { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }
        @keyframes pulse-ring { 0%,100% { opacity: 0.3; transform: scale(1); } 50% { opacity: 0.6; transform: scale(1.05); } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        @keyframes slideInNav { from { opacity:0; transform: translateY(-12px); } to { opacity:1; transform: translateY(0); } }
        @keyframes heroText { from { opacity:0; transform: translateY(24px); } to { opacity:1; transform: translateY(0); } }
        @keyframes heroDash { from { opacity:0; transform: scale(0.96); } to { opacity:1; transform: scale(1); } }
        @keyframes orbit { from { transform: rotate(0deg) translateX(110px) rotate(0deg); } to { transform: rotate(360deg) translateX(110px) rotate(-360deg); } }
      `}</style>

      {/* Noise texture */}
      <div className="noise-overlay"/>

      {/* Background orbs */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "-20%", left: "-10%", width: 700, height: 700, borderRadius: "50%", background: "radial-gradient(circle, rgba(78,205,196,0.12) 0%, transparent 70%)", animation: "pulse-ring 8s ease-in-out infinite" }}/>
        <div style={{ position: "absolute", bottom: "-20%", right: "-10%", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(167,139,250,0.1) 0%, transparent 70%)", animation: "pulse-ring 10s ease-in-out infinite 2s" }}/>
        <div style={{ position: "absolute", top: "40%", right: "20%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(251,113,133,0.06) 0%, transparent 70%)" }}/>
      </div>

      {/* ── NAV ── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "20px 48px",
        background: scrollY > 40 ? "rgba(8,10,18,0.85)" : "transparent",
        backdropFilter: scrollY > 40 ? "blur(20px)" : "none",
        borderBottom: scrollY > 40 ? "1px solid rgba(255,255,255,0.07)" : "none",
        transition: "all 0.3s",
        animation: "slideInNav 0.6s ease",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg, #4ECDC4, #2DD4BF)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 20px rgba(78,205,196,0.4)",
          }}>
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
              <path d="M2 8h5M9 8h5M8 2v5M8 9v5" stroke="#020810" strokeWidth="2.2" strokeLinecap="round"/>
            </svg>
          </div>
          <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.4px", fontFamily: "Syne, sans-serif" }}>
            Unified Finance
          </span>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <a href="#features" style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, textDecoration: "none", fontWeight: 500, transition: "color 0.2s" }}
            onMouseEnter={e => e.target.style.color = "#fff"} onMouseLeave={e => e.target.style.color = "rgba(255,255,255,0.6)"}>
            Features
          </a>
          <button className="land-btn-secondary" onClick={onSignIn} style={{ padding: "10px 22px", fontSize: 13 }}>
            Sign In →
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ position: "relative", zIndex: 1, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "120px 24px 80px", textAlign: "center" }}>

        {/* Badge */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px 6px 8px", borderRadius: 100, background: "rgba(78,205,196,0.1)", border: "1px solid rgba(78,205,196,0.25)", marginBottom: 32, animation: "heroText 0.7s ease 0.1s both" }}>
          <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 100, background: "#4ECDC4", color: "#020810", letterSpacing: "0.06em" }}>NEW</span>
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>Multi-organisation financial management</span>
        </div>

        {/* Headline */}
        <h1 style={{
          fontFamily: "Syne, sans-serif",
          fontSize: "clamp(42px, 7vw, 88px)",
          fontWeight: 800,
          lineHeight: 1.0,
          letterSpacing: "-3px",
          marginBottom: 28,
          maxWidth: 900,
          animation: "heroText 0.8s ease 0.2s both",
        }}>
          <span style={{ color: "#fff" }}>Your organisation's</span>
          <br/>
          <span style={{ background: "linear-gradient(135deg, #4ECDC4 0%, #A78BFA 50%, #FB7185 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            finances, mastered.
          </span>
        </h1>

        <p style={{ fontSize: "clamp(15px, 2vw, 19px)", color: "rgba(255,255,255,0.55)", maxWidth: 560, lineHeight: 1.65, marginBottom: 44, fontWeight: 400, animation: "heroText 0.8s ease 0.35s both" }}>
          Track contributions, manage expenses, generate reports, and keep your whole team on the same page — beautifully.
        </p>

        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center", animation: "heroText 0.8s ease 0.5s both" }}>
          <button className="land-btn-primary" onClick={onSignIn}>
            Get Started Free →
          </button>
          <a href="#features">
            <button className="land-btn-secondary">See the features</button>
          </a>
        </div>

        {/* Dashboard Mockup */}
        <div style={{ position: "relative", marginTop: 80, width: "100%", maxWidth: 1100, animation: "heroDash 1s ease 0.6s both" }}>

          {/* Glow under */}
          <div style={{ position: "absolute", bottom: -60, left: "50%", transform: "translateX(-50%)", width: "60%", height: 120, background: "radial-gradient(ellipse, rgba(78,205,196,0.2) 0%, transparent 70%)", pointerEvents: "none" }}/>

          {/* Main dashboard frame */}
          <div style={{
            background: "rgba(10,12,22,0.9)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 28,
            padding: 28,
            backdropFilter: "blur(20px)",
            boxShadow: "0 40px 120px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.08)",
          }}>
            {/* Fake title bar */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
              <div style={{ display: "flex", gap: 6 }}>
                {["#FF5F57","#FEBC2E","#28C840"].map(c => (
                  <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c }}/>
                ))}
              </div>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)", borderRadius: 1 }}/>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", fontWeight: 500 }}>unified.finance</div>
            </div>

            {/* Dashboard grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>

              {/* Stat cards row */}
              <div style={{ display: "contents" }}>
                {[
                  { label: "Total Contributions", value: "GHS 284,500", sub: "+12.4% this month", color: "#4ECDC4" },
                  { label: "Total Expenses", value: "GHS 61,200", sub: "8 categories", color: "#FB7185" },
                  { label: "Net Balance", value: "GHS 223,300", sub: "Healthy surplus ✓", color: "#A78BFA" },
                ].map((s, i) => (
                  <MockupCard key={i} style={{ animation: `heroText 0.6s ease ${0.8 + i * 0.1}s both` }}>
                    <p style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{s.label}</p>
                    <p style={{ fontSize: 22, fontWeight: 700, color: s.color, letterSpacing: "-0.8px", marginBottom: 4, fontFamily: "Syne, sans-serif" }}>{s.value}</p>
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{s.sub}</p>
                  </MockupCard>
                ))}
              </div>

              {/* Donut chart */}
              <MockupCard style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", alignSelf: "flex-start" }}>Contributions by Type</p>
                <AnimatedDonut segments={donutData} size={130} delay={900}/>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
                  {[["Monthly Dues","#4ECDC4","62%"],["Annual Levy","#A78BFA","23%"],["Building Fund","#FB7185","15%"]].map(([l,c,p]) => (
                    <div key={l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 6, height: 6, borderRadius: 2, background: c }}/>
                        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>{l}</span>
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 700, color: c }}>{p}</span>
                    </div>
                  ))}
                </div>
              </MockupCard>

              {/* Bar chart */}
              <MockupCard style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>Monthly Income</p>
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <AnimatedBars data={barData} delay={1000}/>
                </div>
              </MockupCard>

              {/* Line chart */}
              <MockupCard style={{ gridColumn: "1 / 3", display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>Contribution Trend</p>
                  <span style={{ fontSize: 11, color: "#34D399", fontWeight: 600 }}>↑ 23% vs last year</span>
                </div>
                <AnimatedLine data={lineData} delay={1100}/>
              </MockupCard>

              {/* Activity feed */}
              <MockupCard style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Recent Activity</p>
                {[
                  { name: "Kwame Mensah", amt: "+GHS 500", type: "Monthly Dues", color: "#4ECDC4" },
                  { name: "Abena Osei",   amt: "+GHS 1,200", type: "Annual Levy",  color: "#A78BFA" },
                  { name: "Office Rent",  amt: "-GHS 4,500", type: "Expense",      color: "#FB7185" },
                ].map((a, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 600, color: "#fff", margin: 0 }}>{a.name}</p>
                      <p style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", margin: 0 }}>{a.type}</p>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: a.color }}>{a.amt}</span>
                  </div>
                ))}
              </MockupCard>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section style={{ position: "relative", zIndex: 1, padding: "80px 48px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 40, textAlign: "center" }}>
          {[
            { n: 50000, suffix: "+", label: "Contributions tracked", prefix: "" },
            { n: 99.9, suffix: "%", label: "Uptime reliability", prefix: "", decimals: 1 },
            { n: 1000, suffix: "+", label: "Transactions exported", prefix: "" },
            { n: 5, suffix: "x", label: "Faster than spreadsheets", prefix: "" },
          ].map((s, i) => (
            <div key={i} {...reveal(`stat-${i}`, { transitionDelay: `${i * 0.12}s` })}>
              <div style={{ fontFamily: "Syne, sans-serif", fontSize: 48, fontWeight: 800, letterSpacing: "-2px", background: "linear-gradient(135deg, #4ECDC4, #A78BFA)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                <Counter target={s.n} suffix={s.suffix} prefix={s.prefix} delay={i * 120} decimals={s.decimals || 0}/>
              </div>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginTop: 6, fontWeight: 500 }}>{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" style={{ position: "relative", zIndex: 1, padding: "100px 48px", maxWidth: 1200, margin: "0 auto" }}>
        <div {...reveal("feat-head")} style={{ textAlign: "center", marginBottom: 64, ...reveal("feat-head").style }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#4ECDC4", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 16 }}>Everything you need</p>
          <h2 style={{ fontFamily: "Syne, sans-serif", fontSize: "clamp(32px, 5vw, 54px)", fontWeight: 800, letterSpacing: "-1.5px", color: "#fff", lineHeight: 1.1 }}>
            Built for organisations<br/>
            <span style={{ color: "rgba(255,255,255,0.35)" }}>that take finances seriously.</span>
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
          {features.map((f, i) => (
            <div key={i} className="feature-card" {...reveal(`feat-${i}`)}
              style={{ "--card-color": f.color, ...reveal(`feat-${i}`).style, transitionDelay: `${i * 0.08}s` }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: `${f.color}18`, border: `1px solid ${f.color}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, marginBottom: 20 }}>
                {f.icon}
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: "#fff", marginBottom: 10, letterSpacing: "-0.3px" }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.65 }}>{f.desc}</p>
              <div style={{ marginTop: 20, width: 32, height: 2, borderRadius: 2, background: f.color, boxShadow: `0 0 8px ${f.color}` }}/>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ position: "relative", zIndex: 1, padding: "100px 48px", textAlign: "center" }}>
        <div {...reveal("cta")} style={{ maxWidth: 700, margin: "0 auto", ...reveal("cta").style }}>
          <div style={{
            padding: "64px 48px",
            background: "linear-gradient(135deg, rgba(78,205,196,0.08) 0%, rgba(167,139,250,0.08) 100%)",
            border: "1px solid rgba(78,205,196,0.2)",
            borderRadius: 32,
            boxShadow: "0 0 80px rgba(78,205,196,0.08)",
          }}>
            <div style={{ fontSize: 48, marginBottom: 20 }}>✦</div>
            <h2 style={{ fontFamily: "Syne, sans-serif", fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, letterSpacing: "-1px", marginBottom: 16, lineHeight: 1.1 }}>
              Ready to take control?
            </h2>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.5)", marginBottom: 36, lineHeight: 1.6 }}>
              Sign in and see your organisation's finances come to life.
            </p>
            <button className="land-btn-primary" onClick={onSignIn} style={{ fontSize: 16, padding: "16px 40px" }}>
              Sign In to Unified Finance →
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ position: "relative", zIndex: 1, padding: "32px 48px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg,#4ECDC4,#2DD4BF)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
              <path d="M2 8h5M9 8h5M8 2v5M8 9v5" stroke="#020810" strokeWidth="2.2" strokeLinecap="round"/>
            </svg>
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.6)", fontFamily: "Syne, sans-serif" }}>Unified Finance</span>
        </div>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.25)" }}>© {new Date().getFullYear()} Unified Finance. All rights reserved.</p>
        <button onClick={onSignIn} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 13, cursor: "pointer", fontFamily: "inherit", transition: "color 0.2s" }}
          onMouseEnter={e => e.target.style.color = "#fff"} onMouseLeave={e => e.target.style.color = "rgba(255,255,255,0.4)"}>
          Sign In →
        </button>
      </footer>
    </div>
  );
}
