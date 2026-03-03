import { useState, useEffect, useRef } from "react";
import { supabase } from "./lib/supabaseClient";

const makeFmt = (currency = "USD") => (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);

const COLORS = ["#0071E3","#34C759","#FF9F0A","#FF375F","#BF5AF2","#5AC8FA","#FF6B35","#00C7BE"];
const CURRENCIES = ["USD","GHS","GBP","EUR","NGN","KES","ZAR","CAD","AUD"];

const light = {
  bg: "#F2F2F7", surface: "#FFFFFF", surfaceAlt: "#FAFAFA",
  border: "rgba(0,0,0,0.06)", borderStrong: "rgba(0,0,0,0.1)",
  text: "#1C1C1E", textSub: "#8E8E93", textMuted: "#6E6E73",
  sidebar: "rgba(255,255,255,0.85)", accent: "#0071E3",
  inputBg: "#FAFAFA", heroGrad: "linear-gradient(135deg,#0071E3 0%,#34AADC 100%)",
  shadow: "0 20px 60px rgba(0,0,0,0.08)", cardShadow: "0 2px 12px rgba(0,0,0,0.04)",
  gridLine: "rgba(0,0,0,0.05)",
};
const dark = {
  bg: "#0F0F12", surface: "#1C1C1E", surfaceAlt: "#2C2C2E",
  border: "rgba(255,255,255,0.08)", borderStrong: "rgba(255,255,255,0.12)",
  text: "#F5F5F7", textSub: "#8E8E93", textMuted: "#636366",
  sidebar: "rgba(28,28,30,0.92)", accent: "#0A84FF",
  inputBg: "#2C2C2E", heroGrad: "linear-gradient(135deg,#0A84FF 0%,#0071E3 100%)",
  shadow: "0 20px 60px rgba(0,0,0,0.4)", cardShadow: "0 2px 12px rgba(0,0,0,0.2)",
  gridLine: "rgba(255,255,255,0.05)",
};

function useFadeIn(deps = []) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(false);
    const tm = setTimeout(() => setVisible(true), 30);
    return () => clearTimeout(tm);
  }, deps);
  return visible;
}

// ── Custom Donut Chart (pure SVG, no library) ─────────────────
function DonutChart({ data, fmt, t, size = 220 }) {
  const [hovered, setHovered] = useState(null);
  const [animated, setAnimated] = useState(false);
  useEffect(() => { const tm = setTimeout(() => setAnimated(true), 120); return () => clearTimeout(tm); }, []);

  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <EmptyState message="No data yet." t={t} />;

  const cx = size / 2, cy = size / 2, R = size * 0.38, r = size * 0.24, gap = 0.028;
  let cum = -Math.PI / 2;

  const slices = data.map((d, i) => {
    const frac = d.value / total;
    const span = frac * Math.PI * 2 - gap;
    const start = cum + gap / 2;
    const end = cum + span + gap / 2;
    cum += frac * Math.PI * 2;
    const large = span > Math.PI ? 1 : 0;
    const x1 = cx + R * Math.cos(start), y1 = cy + R * Math.sin(start);
    const x2 = cx + R * Math.cos(end),   y2 = cy + R * Math.sin(end);
    const ix1 = cx + r * Math.cos(end),  iy1 = cy + r * Math.sin(end);
    const ix2 = cx + r * Math.cos(start),iy2 = cy + r * Math.sin(start);
    const path = `M${x1} ${y1}A${R} ${R} 0 ${large} 1 ${x2} ${y2}L${ix1} ${iy1}A${r} ${r} 0 ${large} 0 ${ix2} ${iy2}Z`;
    return { ...d, path, frac, pct: Math.round(frac * 100), i };
  });

  const active = hovered !== null ? slices[hovered] : null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
      <div style={{ position: "relative", flexShrink: 0 }}>
        <svg width={size} height={size} style={{ overflow: "visible" }}>
          <defs>
            <filter id="dslice-glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="4" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          {slices.map((s, i) => {
            const isHov = hovered === i;
            return (
              <path key={i} d={s.path}
                fill={s.color}
                opacity={animated ? (hovered === null ? 1 : isHov ? 1 : 0.4) : 0}
                style={{
                  transformOrigin: `${cx}px ${cy}px`,
                  transform: isHov ? "scale(1.05)" : "scale(1)",
                  transition: "opacity 0.2s ease, transform 0.25s cubic-bezier(0.34,1.56,0.64,1)",
                  cursor: "pointer",
                  filter: isHov ? "url(#dslice-glow)" : "none",
                }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              />
            );
          })}
          <text x={cx} y={cy - 8} textAnchor="middle" style={{ fill: t.text, fontSize: 20, fontWeight: 700, fontFamily: "inherit" }}>
            {active ? `${active.pct}%` : fmt(total)}
          </text>
          <text x={cx} y={cy + 13} textAnchor="middle" style={{ fill: t.textSub, fontSize: 11, fontFamily: "inherit" }}>
            {active ? active.name : "Total"}
          </text>
          {active && (
            <text x={cx} y={cy + 30} textAnchor="middle" style={{ fill: active.color, fontSize: 12, fontWeight: 600, fontFamily: "inherit" }}>
              {fmt(active.value)}
            </text>
          )}
        </svg>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
        {slices.map((s, i) => (
          <div key={i} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}
            style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", opacity: hovered === null ? 1 : hovered === i ? 1 : 0.35, transition: "opacity 0.2s" }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: s.color, flexShrink: 0, boxShadow: `0 0 6px ${s.color}88` }} />
            <span style={{ fontSize: 13, fontWeight: 500, color: t.text, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: t.text }}>{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Custom Bar Chart (pure SVG) ───────────────────────────────
function BarChart({ data, fmt, t, height = 220 }) {
  const [animated, setAnimated] = useState(false);
  const [hovered, setHovered] = useState(null);
  useEffect(() => { const tm = setTimeout(() => setAnimated(true), 160); return () => clearTimeout(tm); }, []);
  if (!data || data.length === 0) return <EmptyState message="No data yet." t={t} />;

  const max = Math.max(...data.map(d => Math.max(d.income || 0, d.expense || 0))) * 1.2 || 1;
  const padL = 48, padR = 12, padT = 20, padB = 38;
  const svgW = 560, chartH = height - padT - padB, chartW = svgW - padL - padR;
  const grpW = chartW / data.length;
  const bW = Math.min(22, grpW * 0.3);
  const gridN = 4;

  return (
    <svg width="100%" viewBox={`0 0 ${svgW} ${height}`} preserveAspectRatio="xMidYMid meet" style={{ overflow: "visible", minWidth: 280 }}>
      <defs>
        <linearGradient id="ig" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#34C759" stopOpacity="1"/>
          <stop offset="100%" stopColor="#34C759" stopOpacity="0.55"/>
        </linearGradient>
        <linearGradient id="eg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FF375F" stopOpacity="1"/>
          <stop offset="100%" stopColor="#FF375F" stopOpacity="0.55"/>
        </linearGradient>
      </defs>

      {Array.from({ length: gridN + 1 }, (_, i) => {
        const y = padT + (chartH / gridN) * i;
        const v = max * (1 - i / gridN);
        return (
          <g key={i}>
            <line x1={padL} y1={y} x2={svgW - padR} y2={y} stroke={t.gridLine} strokeWidth="1"/>
            <text x={padL - 6} y={y + 4} textAnchor="end" style={{ fill: t.textSub, fontSize: 9, fontFamily: "inherit" }}>
              {v >= 1000 ? `${(v/1000).toFixed(0)}k` : Math.round(v)}
            </text>
          </g>
        );
      })}

      {data.map((d, i) => {
        const cx = padL + grpW * i + grpW / 2;
        const incH = animated ? (d.income / max) * chartH : 0;
        const expH = animated ? (d.expense / max) * chartH : 0;
        const isHov = hovered === i;
        return (
          <g key={i} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)} style={{ cursor: "pointer" }}>
            {isHov && <rect x={cx - bW - 6} y={padT} width={bW * 2 + 18} height={chartH} fill={t.accent} fillOpacity={0.04} rx={6}/>}
            <rect x={cx - bW - 4} y={padT + chartH - incH} width={bW} height={incH} fill="url(#ig)" rx={4}
              style={{ transition: `height 0.75s cubic-bezier(0.34,1.1,0.64,1) ${i*0.06}s, y 0.75s cubic-bezier(0.34,1.1,0.64,1) ${i*0.06}s` }}
              opacity={hovered === null ? 1 : isHov ? 1 : 0.45}
            />
            <rect x={cx + 4} y={padT + chartH - expH} width={bW} height={expH} fill="url(#eg)" rx={4}
              style={{ transition: `height 0.75s cubic-bezier(0.34,1.1,0.64,1) ${i*0.06+0.04}s, y 0.75s cubic-bezier(0.34,1.1,0.64,1) ${i*0.06+0.04}s` }}
              opacity={hovered === null ? 1 : isHov ? 1 : 0.45}
            />
            {isHov && d.income + d.expense > 0 && (
              <g>
                <rect x={cx - 38} y={padT - 50} width={76} height={42} fill={t.surface} rx={8} filter="drop-shadow(0 4px 14px rgba(0,0,0,0.22))" stroke={t.border} strokeWidth="1"/>
                <text x={cx} y={padT - 32} textAnchor="middle" style={{ fill: "#34C759", fontSize: 10, fontWeight: 700, fontFamily: "inherit" }}>+{fmt(d.income)}</text>
                <text x={cx} y={padT - 16} textAnchor="middle" style={{ fill: "#FF375F", fontSize: 10, fontWeight: 700, fontFamily: "inherit" }}>-{fmt(d.expense)}</text>
              </g>
            )}
            <text x={cx} y={height - padB + 14} textAnchor="middle" style={{ fill: t.textSub, fontSize: 10, fontFamily: "inherit" }}>{d.label}</text>
          </g>
        );
      })}

      <rect x={svgW - padR - 108} y={padT + 2} width={8} height={8} fill="#34C759" rx={2}/>
      <text x={svgW - padR - 96} y={padT + 9} style={{ fill: t.textSub, fontSize: 9, fontFamily: "inherit" }}>Income</text>
      <rect x={svgW - padR - 52} y={padT + 2} width={8} height={8} fill="#FF375F" rx={2}/>
      <text x={svgW - padR - 40} y={padT + 9} style={{ fill: t.textSub, fontSize: 9, fontFamily: "inherit" }}>Expenses</text>
    </svg>
  );
}

// ── Custom Line Chart (pure SVG) ──────────────────────────────
function LineChart({ data, fmt, t, height = 220 }) {
  const [prog, setProg] = useState(0);
  const [hovered, setHovered] = useState(null);
  useEffect(() => {
    let start = null;
    const run = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / 1000, 1);
      setProg(1 - Math.pow(1 - p, 3));
      if (p < 1) requestAnimationFrame(run);
    };
    const tm = setTimeout(() => requestAnimationFrame(run), 120);
    return () => clearTimeout(tm);
  }, [data.map(d => d.value).join(",")]);

  if (!data || data.length < 2) return <EmptyState message="Not enough data yet." t={t} />;

  const padL = 48, padR = 12, padT = 20, padB = 36;
  const svgW = 560, chartH = height - padT - padB, chartW = svgW - padL - padR;
  const max = Math.max(...data.map(d => d.value)) * 1.2 || 1;

  const pts = data.map((d, i) => ({
    x: padL + (i / (data.length - 1)) * chartW,
    y: padT + chartH - (d.value / max) * chartH,
    ...d,
  }));

  const linePath = pts.reduce((acc, pt, i) => {
    if (i === 0) return `M${pt.x} ${pt.y}`;
    const prev = pts[i - 1];
    const c1x = prev.x + (pt.x - prev.x) * 0.5, c1y = prev.y;
    const c2x = prev.x + (pt.x - prev.x) * 0.5, c2y = pt.y;
    return `${acc}C${c1x} ${c1y},${c2x} ${c2y},${pt.x} ${pt.y}`;
  }, "");

  const areaPath = `${linePath}L${pts[pts.length-1].x} ${padT+chartH}L${pts[0].x} ${padT+chartH}Z`;
  const clipW = chartW * prog;

  return (
    <svg width="100%" viewBox={`0 0 ${svgW} ${height}`} preserveAspectRatio="xMidYMid meet" style={{ overflow: "visible", minWidth: 280 }}>
      <defs>
        <linearGradient id="lag" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={t.accent} stopOpacity="0.28"/>
          <stop offset="100%" stopColor={t.accent} stopOpacity="0.02"/>
        </linearGradient>
        <clipPath id="lcp"><rect x={padL} y={0} width={clipW} height={height}/></clipPath>
        <filter id="lglow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {[0,1,2,3].map(i => {
        const y = padT + (chartH / 3) * i;
        const v = max * (1 - i/3);
        return (
          <g key={i}>
            <line x1={padL} y1={y} x2={svgW-padR} y2={y} stroke={t.gridLine} strokeWidth="1"/>
            <text x={padL-6} y={y+4} textAnchor="end" style={{ fill: t.textSub, fontSize: 9, fontFamily: "inherit" }}>
              {v >= 1000 ? `${(v/1000).toFixed(0)}k` : Math.round(v)}
            </text>
          </g>
        );
      })}

      <path d={areaPath} fill="url(#lag)" clipPath="url(#lcp)"/>
      <path d={linePath} fill="none" stroke={t.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" clipPath="url(#lcp)" filter="url(#lglow)"/>

      {pts.map((pt, i) => {
        const shown = pt.x - padL <= clipW;
        const isHov = hovered === i;
        return (
          <g key={i} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)} style={{ cursor: "pointer" }}>
            {shown && (
              <circle cx={pt.x} cy={pt.y} r={isHov ? 6 : 4} fill={t.accent} stroke={t.surface} strokeWidth="2"
                style={{ transition: "r 0.2s", filter: isHov ? `drop-shadow(0 0 6px ${t.accent})` : "none" }}
              />
            )}
            {shown && isHov && (
              <g>
                <rect x={pt.x-36} y={pt.y-40} width={72} height={28} fill={t.surface} rx={7} filter="drop-shadow(0 4px 12px rgba(0,0,0,0.2))" stroke={t.border} strokeWidth="1"/>
                <text x={pt.x} y={pt.y-22} textAnchor="middle" style={{ fill: t.text, fontSize: 10, fontWeight: 700, fontFamily: "inherit" }}>{fmt(pt.value)}</text>
              </g>
            )}
            <text x={pt.x} y={height-padB+14} textAnchor="middle" style={{ fill: t.textSub, fontSize: 10, fontFamily: "inherit" }}>{pt.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Top Contributors bar chart ────────────────────────────────
function ContributorBars({ people, fmt, t }) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => { const tm = setTimeout(() => setAnimated(true), 160); return () => clearTimeout(tm); }, []);
  const top = [...people].sort((a, b) => b.contributions - a.contributions).slice(0, 6);
  if (!top.length) return <EmptyState message="No contributions yet." t={t} />;
  const max = top[0].contributions || 1;
  const pal = ["#0071E3","#34C759","#FF9F0A","#FF375F","#BF5AF2","#5AC8FA"];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {top.map((p, i) => {
        const pct = (p.contributions / max) * 100;
        const color = pal[i % pal.length];
        return (
          <div key={p.id} style={{ animation: `slideIn 0.4s ease ${i * 0.07}s both` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 20, height: 20, borderRadius: "50%", background: `${color}22`, border: `1.5px solid ${color}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color, flexShrink: 0 }}>{i+1}</div>
                <span style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{p.name}</span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color }}>{fmt(p.contributions)}</span>
            </div>
            <div style={{ height: 8, background: t.surfaceAlt, borderRadius: 99, overflow: "hidden" }}>
              <div style={{ height: "100%", width: animated ? `${pct}%` : "0%", background: `linear-gradient(90deg,${color},${color}88)`, borderRadius: 99, transition: `width 0.9s cubic-bezier(0.34,1.1,0.64,1) ${i*0.08}s`, boxShadow: `0 0 10px ${color}55` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── UI primitives ─────────────────────────────────────────────
const Avatar = ({ name, size = 36 }) => {
  const initials = (name||"?").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
  const pal = ["#0071E3","#34C759","#FF9F0A","#FF375F","#BF5AF2","#5AC8FA"];
  const color = pal[(name||"?").charCodeAt(0) % pal.length];
  return <div style={{ width:size, height:size, borderRadius:"50%", background:`linear-gradient(135deg,${color}22,${color}55)`, border:`1.5px solid ${color}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*0.33, fontWeight:600, color, flexShrink:0 }}>{initials}</div>;
};

const Modal = ({ title, onClose, children, t }) => (
  <div style={{ position:"fixed", inset:0, zIndex:1000, background:"rgba(0,0,0,0.5)", backdropFilter:"blur(8px)", display:"flex", alignItems:"center", justifyContent:"center", padding:20, animation:"fadeIn 0.15s ease" }} onClick={onClose}>
    <div style={{ background:t.surface, borderRadius:24, padding:"36px 40px", width:"100%", maxWidth:460, boxShadow:t.shadow, maxHeight:"90vh", overflowY:"auto", border:`1px solid ${t.border}`, animation:"slideUp 0.2s cubic-bezier(0.34,1.56,0.64,1)" }} onClick={e=>e.stopPropagation()}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:28 }}>
        <h3 style={{ fontSize:18, fontWeight:700, margin:0, letterSpacing:"-0.4px", color:t.text }}>{title}</h3>
        <button onClick={onClose} style={{ background:"none", border:"none", fontSize:22, cursor:"pointer", color:t.textSub, lineHeight:1 }}>×</button>
      </div>
      {children}
    </div>
  </div>
);

const Field = ({ label, children, t }) => (
  <div style={{ marginBottom:16 }}>
    <label style={{ fontSize:13, fontWeight:500, color:t.text, display:"block", marginBottom:8 }}>{label}</label>
    {children}
  </div>
);

const iStyle = (t) => ({ width:"100%", padding:"11px 14px", borderRadius:10, border:`1px solid ${t.borderStrong}`, fontSize:14, color:t.text, background:t.inputBg, outline:"none", boxSizing:"border-box", fontFamily:"inherit", transition:"border-color 0.15s" });
const Input = ({t,...p}) => <input {...p} style={{...iStyle(t),...(p.style||{})}} onFocus={e=>e.target.style.borderColor=t.accent} onBlur={e=>e.target.style.borderColor=t.borderStrong}/>;
const Textarea = ({t,...p}) => <textarea {...p} style={{...iStyle(t),resize:"vertical",minHeight:80,...(p.style||{})}} onFocus={e=>e.target.style.borderColor=t.accent} onBlur={e=>e.target.style.borderColor=t.borderStrong}/>;
const Select = ({t,children,...p}) => <select {...p} style={{...iStyle(t),cursor:"pointer"}}>{children}</select>;

const Btn = ({children,variant="primary",size="md",t,...p}) => (
  <button {...p} style={{ padding:size==="sm"?"7px 14px":"11px 20px", borderRadius:size==="sm"?8:10, border:"none", cursor:p.disabled?"not-allowed":"pointer", fontSize:size==="sm"?12:14, fontWeight:600, transition:"all 0.15s", background:variant==="primary"?t.accent:variant==="danger"?"rgba(255,55,95,0.12)":t.surfaceAlt, color:variant==="primary"?"white":variant==="danger"?"#FF375F":t.text, opacity:p.disabled?0.6:1, ...(p.style||{}) }}>{children}</button>
);

const ColorPicker = ({value,onChange}) => (
  <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
    {COLORS.map(c=><div key={c} onClick={()=>onChange(c)} style={{ width:28, height:28, borderRadius:"50%", background:c, cursor:"pointer", border:value===c?"3px solid #1C1C1E":"3px solid transparent", boxSizing:"border-box", transition:"transform 0.15s", transform:value===c?"scale(1.15)":"scale(1)" }}/>)}
  </div>
);

const EmptyState = ({message,action,t}) => (
  <div style={{ textAlign:"center", padding:"40px 32px" }}>
    <div style={{ fontSize:36, marginBottom:10, opacity:0.25 }}>◎</div>
    <p style={{ color:t.textSub, fontSize:14, margin:"0 0 14px" }}>{message}</p>
    {action}
  </div>
);

const Card = ({children,t,style={}}) => (
  <div style={{ background:t.surface, borderRadius:24, padding:"32px", border:`1px solid ${t.border}`, boxShadow:t.cardShadow, overflow:"hidden", ...style }}>{children}</div>
);

const StatCard = ({label,value,t,style={}}) => (
  <div style={{ background:t.surface, borderRadius:20, padding:"24px", border:`1px solid ${t.border}`, flex:1, boxShadow:t.cardShadow, overflow:"hidden", ...style }}>
    <p style={{ fontSize:12, color:t.textSub, fontWeight:500, marginBottom:8 }}>{label}</p>
    <p style={{ fontSize:32, fontWeight:700, letterSpacing:"-1px", margin:0, color:t.text }}>{value}</p>
  </div>
);

const ChartCard = ({title,subtitle,children,t,style={}}) => (
  <Card t={t} style={style}>
    <div style={{ marginBottom:20 }}>
      <h3 style={{ fontSize:15, fontWeight:700, margin:0, letterSpacing:"-0.3px", color:t.text }}>{title}</h3>
      {subtitle && <p style={{ fontSize:12, color:t.textSub, margin:"3px 0 0" }}>{subtitle}</p>}
    </div>
    {children}
  </Card>
);

const fyLabel = (start, format) => format === "split" ? `${start}/${start+1}` : `${start}`;

function buildMonthly(contributions, expenses) {
  const months = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    months[key] = { label: d.toLocaleString("en-US",{month:"short"}), income:0, expense:0 };
  }
  (contributions||[]).forEach(c=>{const d=new Date(c.created_at);const k=`${d.getFullYear()}-${d.getMonth()}`;if(months[k])months[k].income+=Number(c.amount);});
  (expenses||[]).forEach(e=>{const d=new Date(e.created_at);const k=`${d.getFullYear()}-${d.getMonth()}`;if(months[k])months[k].expense+=Number(e.amount);});
  return Object.values(months);
}

function buildTimeline(contributions) {
  const months = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    months[key] = { label: d.toLocaleString("en-US",{month:"short"}), value:0 };
  }
  (contributions||[]).forEach(c=>{const d=new Date(c.created_at);const k=`${d.getFullYear()}-${d.getMonth()}`;if(months[k])months[k].value+=Number(c.amount);});
  return Object.values(months);
}

// ── Main App ──────────────────────────────────────────────────
export default function App({ session }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [isDark, setIsDark] = useState(() => localStorage.getItem("unified-theme") === "dark");
  const t = isDark ? dark : light;
  const toggleTheme = () => { const n = !isDark; setIsDark(n); localStorage.setItem("unified-theme", n?"dark":"light"); };

  const [data, setData] = useState({ totalBalance:0, totalContributions:0, totalExpenses:0, people:[], expenses:[], recentActivity:[], users:[], paymentTypes:[], allPeople:[], org:null, rawContributions:[], rawExpenses:[] });
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [fmt, setFmt] = useState(() => makeFmt("USD"));

  const [modal, setModal] = useState(null);
  const [newUser, setNewUser] = useState({ full_name:"", email:"", password:"", role:"admin" });
  const [newPerson, setNewPerson] = useState({ full_name:"", status:"active", monthly_target:"" });
  const [newContribution, setNewContribution] = useState({ member_id:"", amount:"", payment_type_id:"", note:"" });
  const [newExpense, setNewExpense] = useState({ category_id:"", amount:"", label:"" });
  const [newPaymentType, setNewPaymentType] = useState({ name:"", description:"", goal:"", color:"#0071E3" });
  const [newExpenseCategory, setNewExpenseCategory] = useState({ name:"", description:"", budget:"", color:"#0071E3" });
  const [editingPaymentType, setEditingPaymentType] = useState(null);
  const [editingExpenseCategory, setEditingExpenseCategory] = useState(null);
  const [editingPerson, setEditingPerson] = useState(null);
  const [orgForm, setOrgForm] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState(null);

  const [expandedPaymentType, setExpandedPaymentType] = useState(null);

  // Search & filter
  const [peopleSearch, setPeopleSearch] = useState("");
  const [activitySearch, setActivitySearch] = useState("");
  const [activityFilter, setActivityFilter] = useState("all");
  const [activityPage, setActivityPage] = useState(1);
  const ACTIVITY_PAGE_SIZE = 20; // all | contributions | expenses
  const [activityDateFrom, setActivityDateFrom] = useState("");
  const [activityDateTo, setActivityDateTo] = useState("");
  const [showPrintView, setShowPrintView] = useState(false);
  const [exportDateFrom, setExportDateFrom] = useState("");
  const [exportDateTo, setExportDateTo] = useState("");

  // Member detail panel
  const [selectedMember, setSelectedMember] = useState(null);

  // Edit contribution / expense entries
  const [editingContribution, setEditingContribution] = useState(null);
  const [editingExpenseEntry, setEditingExpenseEntry] = useState(null);

  // Audit log
  const [auditLog, setAuditLog] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const visible = useFadeIn([activeTab]);
  useEffect(() => { fetchAllData(); }, []);

  const openModal = (name) => { setFormError(null); setModal(name); };
  const closeModal = () => { setModal(null); setEditingPaymentType(null); setEditingExpenseCategory(null); setEditingPerson(null); };

  async function fetchAllData() {
    setLoading(true);
    try {
      const [{ data: profiles }, { data: contributions }, { data: categories }, { data: expenses }, { data: paymentTypes }, { data: orgRows }, { data: auditRows }] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at",{ascending:false}),
        supabase.from("contributions").select("*, profiles(full_name), payment_types(name,color)").order("created_at",{ascending:false}),
        supabase.from("expense_categories").select("*").order("created_at",{ascending:false}),
        supabase.from("expenses").select("*, expense_categories(name,color)").order("created_at",{ascending:false}),
        supabase.from("payment_types").select("*").order("created_at",{ascending:false}),
        supabase.from("org_settings").select("*").limit(1),
        supabase.from("audit_log").select("*").order("created_at",{ascending:false}).limit(200),
      ]);

      const org = orgRows?.[0] || null;
      if (org) {
        setFmt(() => makeFmt(org.currency || "USD"));
        setOrgForm({ name:org.name, address:org.address||"", contact_email:org.contact_email||"", contact_phone:org.contact_phone||"", currency:org.currency||"USD", financial_year_format:org.financial_year_format||"single", financial_year_start:org.financial_year_start||new Date().getFullYear() });
      }

      const me = (profiles||[]).find(p=>p.id===session?.user?.id);
      setUserRole(me?.role || "admin");

      const fmtLocal = makeFmt(org?.currency||"USD");
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const people = (profiles||[]).filter(p=>p.role==="member").map(p=>{
        const total=(contributions||[]).filter(c=>c.member_id===p.id).reduce((s,c)=>s+Number(c.amount),0);
        const thisMonth=(contributions||[]).filter(c=>c.member_id===p.id&&new Date(c.created_at)>=monthStart).reduce((s,c)=>s+Number(c.amount),0);
        const last=(contributions||[]).find(c=>c.member_id===p.id);
        const target=Number(p.monthly_target||0);
        return {id:p.id,name:p.full_name,status:p.status==="active"?"Active":"Inactive",contributions:total,thisMonth,target,lastActivity:last?new Date(last.created_at).toLocaleDateString("en-US",{month:"short",day:"numeric"}):"No activity"};
      });

      const expenseData=(categories||[]).map(cat=>{
        const spent=(expenses||[]).filter(e=>e.category_id===cat.id).reduce((s,e)=>s+Number(e.amount),0);
        return {id:cat.id,label:cat.name,description:cat.description,amount:spent,budget:Number(cat.budget||0),color:cat.color||"#0071E3"};
      });
      const paymentTypeData=(paymentTypes||[]).map(pt=>{
        const ptContribs=(contributions||[]).filter(c=>c.payment_type_id===pt.id);
        const total=ptContribs.reduce((s,c)=>s+Number(c.amount),0);
        const memberMap={};
        ptContribs.forEach(c=>{ const mid=c.member_id; const name=c.profiles?.full_name||"Unknown"; if(!memberMap[mid]) memberMap[mid]={id:mid,name,total:0}; memberMap[mid].total+=Number(c.amount); });
        const members=Object.values(memberMap).sort((a,b)=>b.total-a.total);
        return {id:pt.id,name:pt.name,description:pt.description,total,goal:Number(pt.goal||0),color:pt.color||"#0071E3",members};
      });

      const cA=(contributions||[]).slice(0,6).map(c=>({id:`c-${c.id}`,name:c.profiles?.full_name||"Member",action:c.payment_types?.name||"Contribution",amount:`+${fmtLocal(c.amount)}`,time:new Date(c.created_at).toLocaleDateString("en-US",{month:"short",day:"numeric"}),positive:true}));
      const eA=(expenses||[]).slice(0,6).map(e=>({id:`e-${e.id}`,name:e.expense_categories?.name||"Expense",action:e.label,amount:`-${fmtLocal(e.amount)}`,time:new Date(e.created_at).toLocaleDateString("en-US",{month:"short",day:"numeric"}),positive:false}));
      const totalC=(contributions||[]).reduce((s,c)=>s+Number(c.amount),0);
      const totalE=(expenses||[]).reduce((s,e)=>s+Number(e.amount),0);

      setData({ totalBalance:totalC-totalE, totalContributions:totalC, totalExpenses:totalE, people, expenses:expenseData, recentActivity:[...cA,...eA].slice(0,10), users:(profiles||[]).filter(p=>["super_admin","admin"].includes(p.role)), paymentTypes:paymentTypeData, allPeople:profiles||[], org, categories:categories||[], rawContributions:contributions||[], rawExpenses:expenses||[] });
      setAuditLog(auditRows || []);
    } catch(err) { console.error(err); } finally { setLoading(false); }
  }

  async function handleAddUser(e) {
    e.preventDefault(); setFormLoading(true); setFormError(null);
    try { const {error}=await supabase.auth.signUp({email:newUser.email,password:newUser.password,options:{data:{full_name:newUser.full_name,role:newUser.role}}}); if(error)throw error; await logAudit("create","user",null,newUser.full_name,`Added user ${newUser.full_name} (${newUser.email}) as ${newUser.role}`,null,{full_name:newUser.full_name,email:newUser.email,role:newUser.role}); closeModal(); setNewUser({full_name:"",email:"",password:"",role:"admin"}); fetchAllData(); } catch(err){setFormError(err.message);} finally{setFormLoading(false);}
  }
  async function handleAddPerson(e) {
    e.preventDefault(); setFormLoading(true); setFormError(null);
    try { const {error}=await supabase.from("profiles").insert({id:crypto.randomUUID(),full_name:newPerson.full_name,role:"member",status:newPerson.status,monthly_target:newPerson.monthly_target?Number(newPerson.monthly_target):0}); if(error)throw error; await logAudit("create","person",null,newPerson.full_name,`Added member ${newPerson.full_name}`,null,{full_name:newPerson.full_name,status:newPerson.status}); closeModal(); setNewPerson({full_name:"",status:"active",monthly_target:""}); fetchAllData(); } catch(err){setFormError(err.message);} finally{setFormLoading(false);}
  }
  async function handleAddContribution(e) {
    e.preventDefault(); setFormLoading(true); setFormError(null);
    try { const {error}=await supabase.from("contributions").insert({member_id:newContribution.member_id,amount:Number(newContribution.amount),payment_type_id:newContribution.payment_type_id||null,note:newContribution.note,type:"other"}); if(error)throw error; const mName=(data.allPeople.find(p=>p.id===newContribution.member_id)||{}).full_name||"Member"; await logAudit("create","contribution",null,mName,`Recorded contribution of ${fmt(Number(newContribution.amount))} for ${mName}`,null,{amount:newContribution.amount,note:newContribution.note}); closeModal(); setNewContribution({member_id:"",amount:"",payment_type_id:"",note:""}); fetchAllData(); } catch(err){setFormError(err.message);} finally{setFormLoading(false);}
  }
  async function handleAddExpense(e) {
    e.preventDefault(); setFormLoading(true); setFormError(null);
    try { const {error}=await supabase.from("expenses").insert({category_id:newExpense.category_id,amount:Number(newExpense.amount),label:newExpense.label,recorded_by:session?.user?.id}); if(error)throw error; const catName=(data.categories.find(c=>c.id===newExpense.category_id)||{}).name||"Category"; await logAudit("create","expense",null,null,`Recorded expense of ${fmt(Number(newExpense.amount))} under ${catName}: ${newExpense.label}`,null,{amount:newExpense.amount,label:newExpense.label,category:catName}); closeModal(); setNewExpense({category_id:"",amount:"",label:""}); fetchAllData(); } catch(err){setFormError(err.message);} finally{setFormLoading(false);}
  }
  async function handleAddPaymentType(e) {
    e.preventDefault(); setFormLoading(true); setFormError(null);
    try { const {error}=await supabase.from("payment_types").insert({name:newPaymentType.name,description:newPaymentType.description||null,goal:newPaymentType.goal?Number(newPaymentType.goal):null,color:newPaymentType.color,created_by:session?.user?.id}); if(error)throw error; await logAudit("create","payment_type",null,null,`Created payment type "${newPaymentType.name}"`,null,{name:newPaymentType.name,goal:newPaymentType.goal||null}); closeModal(); setNewPaymentType({name:"",description:"",goal:"",color:"#0071E3"}); fetchAllData(); } catch(err){setFormError(err.message);} finally{setFormLoading(false);}
  }
  async function handleAddExpenseCategory(e) {
    e.preventDefault(); setFormLoading(true); setFormError(null);
    try { const {error}=await supabase.from("expense_categories").insert({name:newExpenseCategory.name,description:newExpenseCategory.description||null,budget:newExpenseCategory.budget?Number(newExpenseCategory.budget):0,color:newExpenseCategory.color,created_by:session?.user?.id}); if(error)throw error; await logAudit("create","expense_category",null,null,`Created expense category "${newExpenseCategory.name}"`,null,{name:newExpenseCategory.name,budget:newExpenseCategory.budget||null}); closeModal(); setNewExpenseCategory({name:"",description:"",budget:"",color:"#0071E3"}); fetchAllData(); } catch(err){setFormError(err.message);} finally{setFormLoading(false);}
  }
  async function handleEditPaymentType(e) {
    e.preventDefault(); setFormLoading(true); setFormError(null);
    try { const prev=data.paymentTypes.find(p=>p.id===editingPaymentType.id)||{}; const {error}=await supabase.from("payment_types").update({name:editingPaymentType.name,description:editingPaymentType.description||null,goal:editingPaymentType.goal?Number(editingPaymentType.goal):null,color:editingPaymentType.color}).eq("id",editingPaymentType.id); if(error)throw error; await logAudit("edit","payment_type",editingPaymentType.id,null,`Edited payment type "${editingPaymentType.name}"`,{name:prev.name,goal:prev.goal},{name:editingPaymentType.name,goal:editingPaymentType.goal||null}); closeModal(); fetchAllData(); } catch(err){setFormError(err.message);} finally{setFormLoading(false);}
  }
  async function handleDeletePaymentType(id) {
    if(!confirm("Delete this payment type? This cannot be undone."))return;
    const pt=data.paymentTypes.find(p=>p.id===id)||{};
    await supabase.from("payment_types").delete().eq("id",id);
    await logAudit("delete","payment_type",id,null,`Deleted payment type "${pt.name||id}"`,{name:pt.name},null);
    fetchAllData();
  }
  async function handleEditExpenseCategory(e) {
    e.preventDefault(); setFormLoading(true); setFormError(null);
    try { const prevCat=data.categories.find(c=>c.id===editingExpenseCategory.id)||{}; const {error}=await supabase.from("expense_categories").update({name:editingExpenseCategory.name,description:editingExpenseCategory.description||null,budget:editingExpenseCategory.budget?Number(editingExpenseCategory.budget):0,color:editingExpenseCategory.color}).eq("id",editingExpenseCategory.id); if(error)throw error; await logAudit("edit","expense_category",editingExpenseCategory.id,null,`Edited expense category "${editingExpenseCategory.name}"`,{name:prevCat.name,budget:prevCat.budget},{name:editingExpenseCategory.name,budget:editingExpenseCategory.budget||null}); closeModal(); fetchAllData(); } catch(err){setFormError(err.message);} finally{setFormLoading(false);}
  }
  async function handleDeleteExpenseCategory(id) {
    if(!confirm("Delete this category? This cannot be undone."))return;
    const cat=data.categories.find(c=>c.id===id)||{};
    await supabase.from("expenses").delete().eq("category_id",id);
    await supabase.from("expense_categories").delete().eq("id",id);
    await logAudit("delete","expense_category",id,null,`Deleted expense category "${cat.name||id}"`,{name:cat.name},null);
    fetchAllData();
  }
  async function handleSaveOrg(e) {
    e.preventDefault(); setFormLoading(true); setFormError(null);
    try { const prevOrg=data.org||{}; const {error}=await supabase.from("org_settings").update({...orgForm,financial_year_start:Number(orgForm.financial_year_start),updated_by:session?.user?.id,updated_at:new Date().toISOString()}).eq("id",data.org.id); if(error)throw error; await logAudit("edit","org_settings",data.org.id,null,`Updated organisation settings for "${orgForm.name}"`,{name:prevOrg.name,currency:prevOrg.currency},{name:orgForm.name,currency:orgForm.currency}); closeModal(); fetchAllData(); } catch(err){setFormError(err.message);} finally{setFormLoading(false);}
  }

  async function handleEditPerson(e) {
    e.preventDefault(); setFormLoading(true); setFormError(null);
    try {
      const prevP=data.allPeople.find(p=>p.id===editingPerson.id)||{};
      const {error} = await supabase.from("profiles").update({
        full_name: editingPerson.full_name,
        status: editingPerson.status,
        monthly_target: editingPerson.monthly_target ? Number(editingPerson.monthly_target) : 0,
      }).eq("id", editingPerson.id);
      if (error) throw error;
      await logAudit("edit","person",editingPerson.id,editingPerson.full_name,`Edited member "${editingPerson.full_name}"`,{full_name:prevP.full_name,status:prevP.status},{full_name:editingPerson.full_name,status:editingPerson.status});
      closeModal(); fetchAllData();
    } catch(err) { setFormError(err.message); } finally { setFormLoading(false); }
  }

    async function handleDeactivatePerson(id, currentStatus) {
    const newStatus = currentStatus === "Active" ? "inactive" : "active";
    await supabase.from("profiles").update({ status: newStatus }).eq("id", id);
    fetchAllData();
  }

  async function handleDeletePerson(id) {
    if (!confirm("Permanently delete this person and all their contribution records? This cannot be undone.")) return;
    const delP=data.allPeople.find(p=>p.id===id)||{};
    await supabase.from("contributions").delete().eq("member_id", id);
    await supabase.from("profiles").delete().eq("id", id);
    await logAudit("delete","person",id,delP.full_name,`Deleted member "${delP.full_name||id}" and all their contributions`,{full_name:delP.full_name},null);
    fetchAllData();
  }

  function exportToCSV(filename, headers, rows) {
    const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [headers.map(escape).join(","), ...rows.map(r => r.map(escape).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  function exportPeopleReport() {
    const headers = ["Name", "Status", "Total Contributed", "Last Activity"];
    const rows = data.people.map(p => [p.name, p.status, p.contributions, p.lastActivity]);
    exportToCSV(`people-report-${new Date().toISOString().slice(0,10)}.csv`, headers, rows);
  }

  function inExportRange(dateStr) {
    const d = new Date(dateStr);
    if (exportDateFrom && d < new Date(exportDateFrom)) return false;
    if (exportDateTo && d > new Date(exportDateTo + "T23:59:59")) return false;
    return true;
  }

  function exportFinancialReport() {
    const headers = ["Date", "Type", "Category / Person", "Description", "Amount"];
    const contribRows = (data.rawContributions || []).filter(c => inExportRange(c.created_at)).map(c => [
      new Date(c.created_at).toLocaleDateString(),
      "Income",
      c.profiles?.full_name || "Member",
      c.payment_types?.name || "Contribution",
      c.amount,
    ]);
    const expenseRows = (data.rawExpenses || []).filter(e => inExportRange(e.created_at)).map(e => [
      new Date(e.created_at).toLocaleDateString(),
      "Expense",
      e.expense_categories?.name || "Expense",
      e.label,
      `-${e.amount}`,
    ]);
    const rows = [...contribRows, ...expenseRows].sort((a, b) => new Date(b[0]) - new Date(a[0]));
    const suffix = exportDateFrom || exportDateTo
      ? `_${exportDateFrom||"start"}_to_${exportDateTo||"today"}`
      : "";
    exportToCSV(`financial-report${suffix}-${new Date().toISOString().slice(0,10)}.csv`, headers, rows);
  }

  // ── Audit log helper ──────────────────────────────────────────
  async function logAudit(action, entity, entityId, memberName, description, oldVal, newVal) {
    try {
      await supabase.from("audit_log").insert({
        action, entity, entity_id: entityId, member_name: memberName,
        description, old_value: oldVal || null, new_value: newVal || null,
        performed_by: session?.user?.id, performed_by_email: session?.user?.email,
      });
    } catch(e) { console.error("audit log failed", e); }
  }

  // ── Edit contribution ──────────────────────────────────────────
  async function handleEditContribution(e) {
    e.preventDefault(); setFormLoading(true); setFormError(null);
    try {
      const old = data.rawContributions.find(c => c.id === editingContribution.id);
      const { error } = await supabase.from("contributions").update({
        amount: Number(editingContribution.amount),
        payment_type_id: editingContribution.payment_type_id || null,
        note: editingContribution.note,
      }).eq("id", editingContribution.id);
      if (error) throw error;
      await logAudit("edit", "contribution", editingContribution.id,
        editingContribution.member_name,
        `Edited contribution for ${editingContribution.member_name}`,
        { amount: old?.amount, note: old?.note },
        { amount: editingContribution.amount, note: editingContribution.note }
      );
      closeModal(); fetchAllData();
    } catch(err) { setFormError(err.message); } finally { setFormLoading(false); }
  }

  async function handleDeleteContribution(c) {
    if (!confirm(`Delete this ${fmt(c.amount)} contribution? This cannot be undone.`)) return;
    await supabase.from("contributions").delete().eq("id", c.id);
    await logAudit("delete", "contribution", c.id, c.profiles?.full_name || "Member",
      `Deleted contribution of ${c.amount} for ${c.profiles?.full_name || "Member"}`,
      { amount: c.amount }, null
    );
    fetchAllData();
  }

  // ── Edit expense entry ─────────────────────────────────────────
  async function handleEditExpenseEntry(e) {
    e.preventDefault(); setFormLoading(true); setFormError(null);
    try {
      const old = data.rawExpenses.find(ex => ex.id === editingExpenseEntry.id);
      const { error } = await supabase.from("expenses").update({
        amount: Number(editingExpenseEntry.amount),
        label: editingExpenseEntry.label,
        category_id: editingExpenseEntry.category_id,
      }).eq("id", editingExpenseEntry.id);
      if (error) throw error;
      await logAudit("edit", "expense", editingExpenseEntry.id,
        null,
        `Edited expense: ${editingExpenseEntry.label}`,
        { amount: old?.amount, label: old?.label },
        { amount: editingExpenseEntry.amount, label: editingExpenseEntry.label }
      );
      closeModal(); fetchAllData();
    } catch(err) { setFormError(err.message); } finally { setFormLoading(false); }
  }

  async function handleDeleteExpenseEntry(ex) {
    if (!confirm(`Delete "${ex.label}" (${fmt(ex.amount)})? This cannot be undone.`)) return;
    await supabase.from("expenses").delete().eq("id", ex.id);
    await logAudit("delete", "expense", ex.id, null,
      `Deleted expense: ${ex.label} (${ex.amount})`,
      { amount: ex.amount, label: ex.label }, null
    );
    fetchAllData();
  }

  const isSuperAdmin = userRole === "super_admin";
  const currentMonth = new Date().toLocaleString("en-US",{month:"long"});
  const membersWithTarget = data.people.filter(p=>p.target>0);
  const onTrack = membersWithTarget.filter(p=>p.thisMonth>=p.target).length;
  const behind = membersWithTarget.filter(p=>p.thisMonth>0&&p.thisMonth<p.target).length;
  const missed = membersWithTarget.filter(p=>p.thisMonth===0&&p.target>0).length;
  const totalTargetThisMonth = membersWithTarget.reduce((s,p)=>s+p.target,0);
  const totalActualThisMonth = data.people.reduce((s,p)=>s+(p.thisMonth||0),0);
  const orgName = data.org?.name || "Unified";
  const fyText = data.org ? fyLabel(data.org.financial_year_start, data.org.financial_year_format) : "";
  const monthlyData = buildMonthly(data.rawContributions, data.rawExpenses);
  const timelineData = buildTimeline(data.rawContributions);

  const navItems = [
    {id:"overview",label:"Overview",icon:"⊞"},
    {id:"people",label:"People",icon:"◎"},
    {id:"payments",label:"Payments",icon:"◈"},
    {id:"expenses",label:"Expenses",icon:"◉"},
    {id:"activity",label:"Activity",icon:"◷"},
    ...(isSuperAdmin?[{id:"settings",label:"Settings",icon:"⊙"},{id:"audit",label:"Audit Log",icon:"◑"}]:[]),
  ];

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
        .nav-btn:hover { background:rgba(0,113,227,0.07) !important; color:#0071E3 !important; }
        .row-hover:hover { background:rgba(0,113,227,0.04) !important; transition:background 0.15s; }
        .card-hover { transition:transform 0.2s ease, box-shadow 0.2s ease; }
        .card-hover:hover { transform:translateY(-2px); box-shadow:0 10px 36px rgba(0,0,0,0.13) !important; }
        @media print {
          .no-print { display:none !important; }
          body { background:white !important; }
          #print-area { border:none !important; border-radius:0 !important; box-shadow:none !important; padding:0 !important; }
        }
      `}</style>

      {/* Sidebar */}
      <div style={{ position:"fixed", left:0, top:0, bottom:0, width:240, background:t.sidebar, backdropFilter:"blur(40px)", borderRight:`1px solid ${t.border}`, display:"flex", flexDirection:"column", padding:"28px 0", zIndex:100, transition:"background 0.3s" }}>
        <div style={{ padding:"0 20px 32px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:34, height:34, borderRadius:10, background:t.heroGrad, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 4px 12px rgba(0,113,227,0.35)", flexShrink:0 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 8h5M9 8h5M8 2v5M8 9v5" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
            </div>
            <div style={{ minWidth:0 }}>
              <div style={{ fontSize:15, fontWeight:700, letterSpacing:"-0.3px", color:t.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{orgName}</div>
              {fyText && <div style={{ fontSize:10, color:t.textSub, fontWeight:500 }}>FY {fyText}</div>}
            </div>
          </div>
        </div>

        <nav style={{ flex:1, padding:"0 10px", display:"flex", flexDirection:"column", gap:2 }}>
          {navItems.map((item,i)=>(
            <button key={item.id} className="nav-btn" onClick={()=>setActiveTab(item.id)} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:10, border:"none", cursor:"pointer", background:activeTab===item.id?`${t.accent}18`:"transparent", color:activeTab===item.id?t.accent:t.textMuted, fontSize:14, fontWeight:activeTab===item.id?600:400, textAlign:"left", transition:"all 0.15s", animation:`slideIn 0.3s ease ${i*0.04}s both` }}>
              <span style={{ fontSize:15 }}>{item.icon}</span>
              {item.label}
              {activeTab===item.id && <div style={{ marginLeft:"auto", width:6, height:6, borderRadius:"50%", background:t.accent }}/>}
            </button>
          ))}
        </nav>

        <div style={{ padding:"0 12px", display:"flex", flexDirection:"column", gap:8 }}>
          <button onClick={toggleTheme} style={{ background:"none", border:"none", cursor:"pointer", color:t.textSub, fontSize:18, padding:4, lineHeight:1, alignSelf:"flex-end" }} title="Toggle theme">
            {isDark?"☀️":"🌙"}
          </button>
          <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:12, background:t.surfaceAlt }}>
            <Avatar name={session?.user?.email||"A"} size={30}/>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:10, fontWeight:700, color:t.accent, textTransform:"uppercase", letterSpacing:"0.06em" }}>{isSuperAdmin?"Super Admin":"Admin"}</div>
              <div style={{ fontSize:11, color:t.textSub, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{session?.user?.email}</div>
            </div>
            <button onClick={()=>supabase.auth.signOut()} style={{ background:"none", border:"none", cursor:"pointer", color:t.textSub, fontSize:15, padding:4, flexShrink:0 }}>↪</button>
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={{ marginLeft:240, padding:"40px 48px", maxWidth:1100 }}>
        <div style={{ marginBottom:40, animation:"slideUp 0.3s ease" }}>
          <p style={{ fontSize:13, color:t.textSub, fontWeight:500, marginBottom:4, letterSpacing:"0.02em" }}>{new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}</p>
          <h1 style={{ fontSize:34, fontWeight:700, letterSpacing:"-0.8px", margin:0, color:t.text }}>{navItems.find(n=>n.id===activeTab)?.label}</h1>
        </div>

        <div style={{ opacity:visible?1:0, transform:visible?"translateY(0)":"translateY(16px)", transition:"opacity 0.35s ease, transform 0.35s ease" }}>

        {/* ── OVERVIEW ── */}
        {activeTab==="overview" && (
          <div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:16, marginBottom:24 }}>
              <div className="card-hover" style={{ gridColumn:"span 2", background:t.heroGrad, borderRadius:24, padding:"36px 40px", position:"relative", overflow:"hidden", boxShadow:"0 8px 32px rgba(0,113,227,0.3)" }}>
                <div style={{ position:"absolute", top:-40, right:-40, width:200, height:200, borderRadius:"50%", background:"rgba(255,255,255,0.07)" }}/>
                <div style={{ position:"absolute", bottom:-60, right:60, width:160, height:160, borderRadius:"50%", background:"rgba(255,255,255,0.05)" }}/>
                <p style={{ fontSize:11, fontWeight:600, color:"rgba(255,255,255,0.7)", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:10 }}>Net Balance</p>
                <h2 style={{ fontSize:52, fontWeight:700, color:"white", letterSpacing:"-2px", margin:"0 0 20px" }}>{fmt(data.totalBalance)}</h2>
                <div style={{ display:"flex", gap:20 }}>
                  <div><p style={{ fontSize:11, color:"rgba(255,255,255,0.6)", margin:"0 0 2px" }}>Total In</p><p style={{ fontSize:16, fontWeight:700, color:"white", margin:0 }}>{fmt(data.totalContributions)}</p></div>
                  <div style={{ width:1, background:"rgba(255,255,255,0.2)" }}/>
                  <div><p style={{ fontSize:11, color:"rgba(255,255,255,0.6)", margin:"0 0 2px" }}>Total Out</p><p style={{ fontSize:16, fontWeight:700, color:"white", margin:0 }}>{fmt(data.totalExpenses)}</p></div>
                </div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                <StatCard label="People Tracked" value={data.people.length} t={t} style={{ animation:"slideUp 0.35s ease 0.05s both" }}/>
                <StatCard label="This Month" value={fmt(totalActualThisMonth)} t={t} style={{ animation:"slideUp 0.35s ease 0.1s both" }}/>
              </div>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, marginBottom:20 }}>
              <ChartCard title="Income vs Expenses" subtitle="Last 6 months" t={t} style={{ animation:"slideUp 0.35s ease 0.1s both" }}>
                <BarChart data={monthlyData} fmt={fmt} t={t} height={210}/>
              </ChartCard>
              <ChartCard title="Contribution Trend" subtitle="Last 6 months" t={t} style={{ animation:"slideUp 0.35s ease 0.15s both" }}>
                <LineChart data={timelineData} fmt={fmt} t={t} height={210}/>
              </ChartCard>
            </div>

            {membersWithTarget.length>0&&(
              <Card t={t} style={{ marginBottom:20, animation:"slideUp 0.35s ease 0.18s both" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
                  <div>
                    <h3 style={{ fontSize:15, fontWeight:700, margin:0, color:t.text }}>Consistency Tracker</h3>
                    <p style={{ fontSize:12, color:t.textSub, margin:"3px 0 0" }}>{currentMonth} - {membersWithTarget.length} members with targets</p>
                  </div>
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                    <span style={{ fontSize:12, fontWeight:600, padding:"4px 10px", borderRadius:20, background:"rgba(52,199,89,0.12)", color:"#34C759" }}>{onTrack} on track</span>
                    {behind>0&&<span style={{ fontSize:12, fontWeight:600, padding:"4px 10px", borderRadius:20, background:"rgba(255,159,10,0.12)", color:"#FF9F0A" }}>{behind} behind</span>}
                    {missed>0&&<span style={{ fontSize:12, fontWeight:600, padding:"4px 10px", borderRadius:20, background:"rgba(255,55,95,0.12)", color:"#FF375F" }}>{missed} missed</span>}
                  </div>
                </div>
                {totalTargetThisMonth>0&&(
                  <div style={{ marginBottom:20 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                      <span style={{ fontSize:12, color:t.textSub }}>Overall progress</span>
                      <span style={{ fontSize:12, fontWeight:700, color:t.text }}>{fmt(totalActualThisMonth)} / {fmt(totalTargetThisMonth)}</span>
                    </div>
                    <div style={{ height:10, background:t.surfaceAlt, borderRadius:99, overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${Math.min(Math.round((totalActualThisMonth/totalTargetThisMonth)*100),100)}%`, background:`linear-gradient(90deg,${t.accent},#34C759)`, borderRadius:99, transition:"width 0.9s cubic-bezier(0.34,1.1,0.64,1)", boxShadow:`0 0 10px ${t.accent}55` }}/>
                    </div>
                  </div>
                )}
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {membersWithTarget.map((p,i)=>{
                    const pct=Math.min(Math.round((p.thisMonth/p.target)*100),100);
                    const clr=p.thisMonth>=p.target?"#34C759":p.thisMonth>0?"#FF9F0A":"#FF375F";
                    return (
                      <div key={p.id} style={{ animation:`slideIn 0.3s ease ${i*0.05}s both` }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                            <div style={{ width:8, height:8, borderRadius:"50%", background:clr, flexShrink:0 }}/>
                            <span style={{ fontSize:13, fontWeight:600, color:t.text }}>{p.name}</span>
                          </div>
                          <span style={{ fontSize:12, color:t.textSub }}>{fmt(p.thisMonth)} / {fmt(p.target)}</span>
                        </div>
                        <div style={{ height:6, background:t.surfaceAlt, borderRadius:99, overflow:"hidden" }}>
                          <div style={{ height:"100%", width:`${pct}%`, background:clr, borderRadius:99, transition:`width 0.8s cubic-bezier(0.34,1.1,0.64,1) ${i*0.06}s`, boxShadow:`0 0 6px ${clr}66` }}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            <Card t={t} style={{ animation:"slideUp 0.35s ease 0.2s both" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
                <h3 style={{ fontSize:15, fontWeight:700, margin:0, color:t.text }}>Recent Activity</h3>
                <button onClick={()=>setActiveTab("activity")} style={{ background:"none", border:"none", color:t.accent, fontSize:13, fontWeight:500, cursor:"pointer" }}>View all</button>
              </div>
              {data.recentActivity.length===0?<EmptyState message="No activity yet." t={t}/>:
                <div>{data.recentActivity.slice(0,5).map((item,i)=>(
                  <div key={item.id} className="row-hover" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 8px", borderBottom:i<4?`1px solid ${t.border}`:"none", borderRadius:8, animation:`slideIn 0.3s ease ${i*0.05}s both` }}>
                    <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                      <Avatar name={item.name} size={36}/>
                      <div><p style={{ fontSize:14, fontWeight:500, margin:0, color:t.text }}>{item.name}</p><p style={{ fontSize:12, color:t.textSub, margin:0 }}>{item.action}</p></div>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ fontSize:15, fontWeight:700, color:item.positive?"#34C759":"#FF375F" }}>{item.amount}</span>
                      {item.positive?(
                        <><Btn size="sm" variant="secondary" t={t} onClick={()=>{const c=data.rawContributions.find(r=>`c-${r.id}`===item.id);if(c){setEditingContribution({id:c.id,member_name:c.profiles?.full_name||"",amount:c.amount,payment_type_id:c.payment_type_id||"",note:c.note||""});openModal("editContribution");}}}>Edit</Btn>
                        <Btn size="sm" variant="danger" t={t} onClick={()=>{const c=data.rawContributions.find(r=>`c-${r.id}`===item.id);if(c)handleDeleteContribution(c);}}>Del</Btn></>
                      ):(
                        <><Btn size="sm" variant="secondary" t={t} onClick={()=>{const ex=data.rawExpenses.find(r=>`e-${r.id}`===item.id);if(ex){setEditingExpenseEntry({id:ex.id,label:ex.label,amount:ex.amount,category_id:ex.category_id||""});openModal("editExpenseEntry");}}}>Edit</Btn>
                        <Btn size="sm" variant="danger" t={t} onClick={()=>{const ex=data.rawExpenses.find(r=>`e-${r.id}`===item.id);if(ex)handleDeleteExpenseEntry(ex);}}>Del</Btn></>
                      )}
                    </div>
                  </div>
                ))}</div>
              }
            </Card>
          </div>
        )}

        {/* ── PEOPLE ── */}
        {activeTab==="people" && (
          <div>
            {data.people.length>0 && (
              <ChartCard title="Top Contributors" subtitle="Ranked by total contributions" t={t} style={{ marginBottom:20, animation:"slideUp 0.3s ease" }}>
                <ContributorBars people={data.people} fmt={fmt} t={t}/>
              </ChartCard>
            )}
            <Card t={t} style={{ animation:"slideUp 0.3s ease 0.08s both" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
                <h3 style={{ fontSize:15, fontWeight:700, margin:0, color:t.text }}>{data.people.length} People</h3>
                <div style={{ display:"flex", gap:10 }}>
                  <Btn t={t} onClick={exportPeopleReport} variant="secondary" style={{ fontSize:12 }}>↓ Export</Btn>
                  <Btn t={t} onClick={()=>openModal("addContribution")} variant="secondary">+ Contribution</Btn>
                  <Btn t={t} onClick={()=>openModal("addPerson")}>+ Add Person</Btn>
                </div>
              </div>
              {/* Search */}
              <div style={{ marginBottom:20, position:"relative" }}>
                <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:t.textSub, fontSize:14, pointerEvents:"none" }}>🔍</span>
                <input value={peopleSearch} onChange={e=>setPeopleSearch(e.target.value)} placeholder="Search people..." style={{ ...iStyle(t), paddingLeft:36 }}/>
              </div>
              {data.people.length===0?<EmptyState message="No people added yet." action={<Btn t={t} onClick={()=>openModal("addPerson")}>Add First Person</Btn>} t={t}/>:(() => {
                const filtered = data.people.filter(p=>p.name.toLowerCase().includes(peopleSearch.toLowerCase()));
                return filtered.length===0?<EmptyState message="No people match your search." t={t}/>:
                <div>{filtered.map((p,i)=>(
                  <div key={p.id} style={{ borderRadius:12, background:i%2===0?t.surfaceAlt:"transparent", animation:`slideIn 0.3s ease ${i*0.04}s both`, marginBottom:2 }}>
                    <div className="row-hover" onClick={()=>setSelectedMember(selectedMember?.id===p.id?null:p)} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px", borderRadius:12, cursor:"pointer" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                        <Avatar name={p.name} size={42}/>
                        <div>
                          <p style={{ fontSize:15, fontWeight:600, margin:0, color:t.text }}>{p.name}</p>
                          <p style={{ fontSize:12, color:t.textSub, margin:0 }}>Last active {p.lastActivity} · click to view history</p>
                        </div>
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                        <div style={{ textAlign:"right" }}>
                          <p style={{ fontSize:15, fontWeight:700, margin:0, color:t.text }}>{fmt(p.contributions)}</p>
                          <p style={{ fontSize:11, color:t.textSub, margin:0 }}>Total contributed</p>
                        </div>
                        <span style={{ fontSize:11, fontWeight:600, padding:"4px 10px", borderRadius:20, background:p.status==="Active"?"rgba(52,199,89,0.12)":"rgba(142,142,147,0.12)", color:p.status==="Active"?"#34C759":"#8E8E93" }}>{p.status}</span>
                        <div style={{ display:"flex", gap:6 }}>
                          <Btn size="sm" variant="secondary" t={t} onClick={e=>{e.stopPropagation();setEditingPerson({id:p.id,full_name:p.name,status:p.status==="Active"?"active":"inactive",monthly_target:p.target||""});openModal("editPerson");}}>Edit</Btn>
                          <Btn size="sm" variant="secondary" t={t} onClick={e=>{e.stopPropagation();handleDeactivatePerson(p.id,p.status);}}>{p.status==="Active"?"Deactivate":"Activate"}</Btn>
                          <Btn size="sm" variant="danger" t={t} onClick={e=>{e.stopPropagation();handleDeletePerson(p.id);}}>Delete</Btn>
                        </div>
                      </div>
                    </div>
                    {/* Member detail panel */}
                    {selectedMember?.id===p.id && (() => {
                      const memberContribs = (data.rawContributions||[]).filter(c=>c.member_id===p.id);
                      return (
                        <div style={{ margin:"0 14px 14px", background:t.bg, borderRadius:14, padding:"20px 24px", border:`1px solid ${t.border}`, animation:"slideUp 0.25s ease" }}>
                          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                            <p style={{ fontSize:13, fontWeight:700, color:t.text, margin:0 }}>Contribution History</p>
                            <p style={{ fontSize:12, color:t.textSub, margin:0 }}>{memberContribs.length} records · {fmt(p.contributions)} total</p>
                          </div>
                          {memberContribs.length===0?<p style={{ fontSize:13, color:t.textSub, margin:0, textAlign:"center", padding:"16px 0" }}>No contributions yet.</p>:
                            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                              {memberContribs.map((c,ci)=>(
                                <div key={c.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 14px", background:t.surface, borderRadius:10, border:`1px solid ${t.border}`, animation:`slideIn 0.2s ease ${ci*0.04}s both` }}>
                                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                                    <div style={{ width:8, height:8, borderRadius:"50%", background:c.payment_types?.color||t.accent, flexShrink:0 }}/>
                                    <div>
                                      <p style={{ fontSize:13, fontWeight:600, margin:0, color:t.text }}>{c.payment_types?.name||"General"}</p>
                                      {c.note&&<p style={{ fontSize:11, color:t.textSub, margin:0 }}>{c.note}</p>}
                                    </div>
                                  </div>
                                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                                    <div style={{ textAlign:"right" }}>
                                      <p style={{ fontSize:13, fontWeight:700, color:"#34C759", margin:0 }}>{fmt(c.amount)}</p>
                                      <p style={{ fontSize:11, color:t.textSub, margin:0 }}>{new Date(c.created_at).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</p>
                                    </div>
                                    <Btn size="sm" variant="secondary" t={t} onClick={()=>{setEditingContribution({id:c.id,member_name:p.name,amount:c.amount,payment_type_id:c.payment_type_id||"",note:c.note||""});openModal("editContribution");}}>Edit</Btn>
                                    <Btn size="sm" variant="danger" t={t} onClick={()=>handleDeleteContribution(c)}>Del</Btn>
                                  </div>
                                </div>
                              ))}
                            </div>
                          }
                        </div>
                      );
                    })()}
                  </div>
                ))}</div>;
              })()}
            </Card>
          </div>
        )}

        {/* ── PAYMENTS ── */}
        {activeTab==="payments" && (
          <div>
            <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:20, gap:10 }}>
              <Btn t={t} onClick={()=>openModal("addContribution")} variant="secondary">+ Record Payment</Btn>
              {isSuperAdmin&&<Btn t={t} onClick={()=>openModal("addPaymentType")}>+ New Payment Type</Btn>}
            </div>
            {data.paymentTypes.length>0&&(
              <ChartCard title="Payment Breakdown" subtitle="Distribution across all types" t={t} style={{ marginBottom:20, animation:"slideUp 0.3s ease" }}>
                <DonutChart data={data.paymentTypes.map(pt=>({name:pt.name,value:pt.total,color:pt.color}))} fmt={fmt} t={t} size={200}/>
              </ChartCard>
            )}
            {data.paymentTypes.length===0?<Card t={t}><EmptyState message="No payment types yet." action={isSuperAdmin?<Btn t={t} onClick={()=>openModal("addPaymentType")}>Create First Payment Type</Btn>:null} t={t}/></Card>:
              <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                {data.paymentTypes.map((pt,i)=>{
                  const pct=pt.goal>0?Math.min(Math.round((pt.total/pt.goal)*100),100):0;
                  return (
                    <div key={pt.id} style={{ background:t.surface, borderRadius:24, border:`1px solid ${t.border}`, boxShadow:t.cardShadow, overflow:"hidden", animation:`slideUp 0.3s ease ${i*0.06}s both` }}>
                      <div className="card-hover" onClick={()=>setExpandedPaymentType(expandedPaymentType===pt.id?null:pt.id)} style={{ padding:"28px 32px", cursor:"pointer" }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:pt.goal>0?20:0 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                            <div style={{ width:48, height:48, borderRadius:14, background:`${pt.color}18`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                              <div style={{ width:16, height:16, borderRadius:"50%", background:pt.color, boxShadow:`0 0 8px ${pt.color}88` }}/>
                            </div>
                            <div>
                              <h4 style={{ fontSize:17, fontWeight:600, margin:0, color:t.text }}>{pt.name}</h4>
                              {pt.description&&<p style={{ fontSize:12, color:t.textSub, margin:"2px 0 0" }}>{pt.description}</p>}
                              <p style={{ fontSize:11, color:t.textMuted, margin:"4px 0 0" }}>{pt.members.length} contributor{pt.members.length!==1?"s":""} clicked to {expandedPaymentType===pt.id?"hide":"view"} rankings</p>
                            </div>
                          </div>
                          <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:8 }}>
                            <p style={{ fontSize:28, fontWeight:700, letterSpacing:"-1px", margin:0, color:t.text }}>{fmt(pt.total)}</p>
                            {pt.goal>0&&<p style={{ fontSize:12, color:t.textSub, margin:0 }}>of {fmt(pt.goal)} goal</p>}
                            <div style={{ display:"flex", gap:6 }} onClick={e=>e.stopPropagation()}>
                              <Btn size="sm" variant="secondary" t={t} onClick={()=>{setEditingPaymentType({...pt,goal:pt.goal||""});openModal("editPaymentType");}}>Edit</Btn>
                              <Btn size="sm" variant="danger" t={t} onClick={()=>handleDeletePaymentType(pt.id)}>Delete</Btn>
                            </div>
                          </div>
                        </div>
                        {pt.goal>0&&<><div style={{ height:8, background:t.surfaceAlt, borderRadius:99, overflow:"hidden", marginBottom:10 }}><div style={{ height:"100%", width:`${pct}%`, background:pt.color, borderRadius:99, transition:"width 0.8s cubic-bezier(0.4,0,0.2,1)", boxShadow:`0 0 8px ${pt.color}55` }}/></div><p style={{ fontSize:12, color:t.textSub, margin:0 }}><span style={{ color:"#34C759", fontWeight:600 }}>{fmt(pt.goal-pt.total)} remaining</span> . {pct}% reached</p></> }
                      </div>
                      {expandedPaymentType===pt.id&&(
                        <div style={{ borderTop:`1px solid ${t.border}`, padding:"20px 32px", background:t.surfaceAlt, animation:"slideUp 0.2s ease" }}>
                          {pt.members.length===0?(
                            <p style={{ fontSize:13, color:t.textSub, margin:0, textAlign:"center", padding:"8px 0" }}>No contributions recorded yet.</p>
                          ):(
                            <>
                              <p style={{ fontSize:12, fontWeight:700, color:t.textSub, textTransform:"uppercase", letterSpacing:"0.06em", margin:"0 0 14px" }}>Member Rankings</p>
                              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                                {pt.members.map((m,ri)=>{
                                  const pct2=Math.round((m.total/pt.total)*100);
                                  const medal=ri===0?"ð¥":ri===1?"ð¥":ri===2?"ð¥":null;
                                  return (
                                    <div key={m.id} style={{ animation:`slideIn 0.25s ease ${ri*0.04}s both` }}>
                                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
                                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                                          {medal?<span style={{ fontSize:16, lineHeight:1 }}>{medal}</span>:<span style={{ width:20, height:20, borderRadius:"50%", background:`${pt.color}22`, border:`1.5px solid ${pt.color}55`, display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:700, color:pt.color }}>{ri+1}</span>}
                                          <span style={{ fontSize:13, fontWeight:600, color:t.text }}>{m.name}</span>
                                        </div>
                                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                                          <span style={{ fontSize:11, color:t.textSub }}>{pct2}%</span>
                                          <span style={{ fontSize:13, fontWeight:700, color:pt.color }}>{fmt(m.total)}</span>
                                        </div>
                                      </div>
                                      <div style={{ height:5, background:t.bg, borderRadius:99, overflow:"hidden" }}>
                                        <div style={{ height:"100%", width:`${pct2}%`, background:`linear-gradient(90deg,${pt.color},${pt.color}88)`, borderRadius:99, transition:`width 0.7s cubic-bezier(0.34,1.1,0.64,1) ${ri*0.05}s`, boxShadow:`0 0 6px ${pt.color}55` }}/>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            }
          </div>
        )}


        {/* ── EXPENSES ── */}
        {activeTab==="expenses" && (
          <div>
            <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:20, gap:10 }}>
              <Btn t={t} onClick={()=>openModal("addExpense")} variant="secondary">+ Record Expense</Btn>
              {isSuperAdmin&&<Btn t={t} onClick={()=>openModal("addExpenseCategory")}>+ New Category</Btn>}
            </div>
            {data.expenses.length>0&&(
              <ChartCard title="Expense Breakdown" subtitle="Distribution across categories" t={t} style={{ marginBottom:20, animation:"slideUp 0.3s ease" }}>
                <DonutChart data={data.expenses.map(e=>({name:e.label,value:e.amount,color:e.color}))} fmt={fmt} t={t} size={200}/>
              </ChartCard>
            )}
            {data.expenses.length===0?<Card t={t}><EmptyState message="No expense categories yet." action={isSuperAdmin?<Btn t={t} onClick={()=>openModal("addExpenseCategory")}>Create First Category</Btn>:null} t={t}/></Card>:
              <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                {data.expenses.map((exp,i)=>{
                  const pct=exp.budget>0?Math.min(Math.round((exp.amount/exp.budget)*100),100):0;
                  return (
                    <div key={exp.id} className="card-hover" style={{ background:t.surface, borderRadius:24, padding:"28px 32px", border:`1px solid ${t.border}`, boxShadow:t.cardShadow, overflow:"hidden", animation:`slideUp 0.3s ease ${i*0.06}s both` }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:exp.budget>0?20:0 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                          <div style={{ width:48, height:48, borderRadius:14, background:`${exp.color}18`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                            <div style={{ width:16, height:16, borderRadius:"50%", background:exp.color, boxShadow:`0 0 8px ${exp.color}88` }}/>
                          </div>
                          <div><h4 style={{ fontSize:17, fontWeight:600, margin:0, color:t.text }}>{exp.label}</h4>{exp.description&&<p style={{ fontSize:12, color:t.textSub, margin:"2px 0 0" }}>{exp.description}</p>}{exp.budget>0&&<p style={{ fontSize:12, color:t.textSub, margin:"2px 0 0" }}>{pct}% of budget used</p>}</div>
                        </div>
                        <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:8 }}>
                          <p style={{ fontSize:28, fontWeight:700, letterSpacing:"-1px", margin:0, color:t.text }}>{fmt(exp.amount)}</p>
                          {exp.budget>0&&<p style={{ fontSize:12, color:t.textSub, margin:0 }}>of {fmt(exp.budget)} budget</p>}
                          <div style={{ display:"flex", gap:6 }}>
                            <Btn size="sm" variant="secondary" t={t} onClick={()=>{setEditingExpenseCategory({...exp,budget:exp.budget||"",name:exp.label});openModal("editExpenseCategory");}}>Edit</Btn>
                            <Btn size="sm" variant="danger" t={t} onClick={()=>handleDeleteExpenseCategory(exp.id)}>Delete</Btn>
                          </div>
                        </div>
                      </div>
                      {exp.budget>0&&<><div style={{ height:8, background:t.surfaceAlt, borderRadius:99, overflow:"hidden", marginBottom:10 }}><div style={{ height:"100%", width:`${pct}%`, background:exp.color, borderRadius:99, transition:"width 0.8s cubic-bezier(0.4,0,0.2,1)", boxShadow:`0 0 8px ${exp.color}55` }}/></div><p style={{ fontSize:12, color:t.textSub, margin:0 }}><span style={{ color:"#34C759", fontWeight:600 }}>{fmt(exp.budget-exp.amount)} remaining</span></p></>}
                    </div>
                  );
                })}
              </div>
            }
          </div>
        )}

        {/* ── ACTIVITY ── */}
        {activeTab==="activity" && (() => {
          // Build full activity list from raw data (not capped at 10)
          const fmtLocal = fmt;
          const allActivity = [
            ...(data.rawContributions||[]).map(c=>({
              id:`c-${c.id}`, name:c.profiles?.full_name||"Member",
              action:c.payment_types?.name||"Contribution",
              amount:`+${fmtLocal(c.amount)}`, rawAmount:Number(c.amount),
              time:new Date(c.created_at).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}),
              date:c.created_at, positive:true,
            })),
            ...(data.rawExpenses||[]).map(e=>({
              id:`e-${e.id}`, name:e.expense_categories?.name||"Expense",
              action:e.label, amount:`-${fmtLocal(e.amount)}`, rawAmount:Number(e.amount),
              time:new Date(e.created_at).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}),
              date:e.created_at, positive:false,
            })),
          ].sort((a,b)=>new Date(b.date)-new Date(a.date));

          const filtered = allActivity.filter(item => {
            const matchSearch = item.name.toLowerCase().includes(activitySearch.toLowerCase()) || item.action.toLowerCase().includes(activitySearch.toLowerCase());
            const matchFilter = activityFilter==="all" || (activityFilter==="contributions"&&item.positive) || (activityFilter==="expenses"&&!item.positive);
            const d = new Date(item.date);
            const matchFrom = !activityDateFrom || d >= new Date(activityDateFrom);
            const matchTo = !activityDateTo || d <= new Date(activityDateTo+"T23:59:59");
            return matchSearch && matchFilter && matchFrom && matchTo;
          });

          const filteredIncome = filtered.filter(i=>i.positive).reduce((s,i)=>s+i.rawAmount,0);
          const filteredExpense = filtered.filter(i=>!i.positive).reduce((s,i)=>s+i.rawAmount,0);
          const hasDateFilter = activityDateFrom || activityDateTo;

          if (showPrintView) return (
            <div>
              <div className="no-print" style={{ marginBottom:20, display:"flex", gap:10 }}>
                <Btn t={t} onClick={()=>{ window.print(); }} variant="secondary">🖨 Print</Btn>
                <Btn t={t} onClick={()=>setShowPrintView(false)} variant="secondary">← Back</Btn>
              </div>
              <div id="print-area" style={{ background:"white", color:"#1C1C1E", padding:"40px 48px", borderRadius:16, border:`1px solid ${t.border}` }}>
                <div style={{ borderBottom:"2px solid #1C1C1E", paddingBottom:16, marginBottom:28 }}>
                  <h1 style={{ fontSize:22, fontWeight:700, margin:"0 0 4px" }}>{orgName} — Financial Report</h1>
                  <p style={{ fontSize:13, color:"#636366", margin:0 }}>
                    {hasDateFilter
                      ? `Period: ${activityDateFrom||"All time"} → ${activityDateTo||"Today"}`
                      : `Generated ${new Date().toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})}`}
                    {" · "}{filtered.length} transactions
                  </p>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:20, marginBottom:28 }}>
                  {[
                    {label:"Total Income", value:fmt(filteredIncome), color:"#34C759"},
                    {label:"Total Expenses", value:fmt(filteredExpense), color:"#FF375F"},
                    {label:"Net", value:fmt(filteredIncome-filteredExpense), color:"#0071E3"},
                  ].map(({label,value,color})=>(
                    <div key={label} style={{ padding:"16px 20px", background:"#F2F2F7", borderRadius:12 }}>
                      <p style={{ fontSize:11, fontWeight:600, color:"#8E8E93", textTransform:"uppercase", letterSpacing:"0.06em", margin:"0 0 6px" }}>{label}</p>
                      <p style={{ fontSize:22, fontWeight:700, color, margin:0 }}>{value}</p>
                    </div>
                  ))}
                </div>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                  <thead>
                    <tr style={{ borderBottom:"2px solid #E5E5EA" }}>
                      {["Date","Type","Name / Category","Description","Amount"].map(h=>(
                        <th key={h} style={{ textAlign:"left", padding:"8px 12px", fontSize:11, fontWeight:700, color:"#8E8E93", textTransform:"uppercase", letterSpacing:"0.05em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((item,i)=>(
                      <tr key={item.id} style={{ borderBottom:"1px solid #F2F2F7", background:i%2===0?"white":"#FAFAFA" }}>
                        <td style={{ padding:"10px 12px", color:"#636366", whiteSpace:"nowrap" }}>{item.time}</td>
                        <td style={{ padding:"10px 12px" }}>
                          <span style={{ fontSize:11, fontWeight:600, padding:"2px 8px", borderRadius:6, background:item.positive?"rgba(52,199,89,0.12)":"rgba(255,55,95,0.1)", color:item.positive?"#34C759":"#FF375F" }}>
                            {item.positive?"Income":"Expense"}
                          </span>
                        </td>
                        <td style={{ padding:"10px 12px", fontWeight:600 }}>{item.name}</td>
                        <td style={{ padding:"10px 12px", color:"#636366" }}>{item.action}</td>
                        <td style={{ padding:"10px 12px", fontWeight:700, color:item.positive?"#34C759":"#FF375F", textAlign:"right" }}>{item.amount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p style={{ fontSize:11, color:"#AEAEB2", marginTop:24, borderTop:"1px solid #E5E5EA", paddingTop:12 }}>
                  Generated by {orgName} · {new Date().toLocaleString()}
                </p>
              </div>
            </div>
          );

          return (
            <Card t={t}>
              {/* Header */}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:10 }}>
                <h3 style={{ fontSize:15, fontWeight:700, margin:0, color:t.text }}>All Activity <span style={{ fontSize:13, fontWeight:400, color:t.textSub }}>({filtered.length})</span></h3>
                <div style={{ display:"flex", gap:8 }}>
                  <Btn t={t} onClick={()=>setShowPrintView(true)} variant="secondary" style={{ fontSize:12 }}>🖨 Print View</Btn>
                  <Btn t={t} onClick={exportFinancialReport} variant="secondary" style={{ fontSize:12 }}>↓ Export CSV</Btn>
                </div>
              </div>

              {/* Date range */}
              <div style={{ display:"flex", gap:10, marginBottom:14, alignItems:"center", flexWrap:"wrap" }}>
                <span style={{ fontSize:12, fontWeight:500, color:t.textSub, whiteSpace:"nowrap" }}>Date range:</span>
                <input type="date" value={activityDateFrom} onChange={e=>{setActivityDateFrom(e.target.value);setActivityPage(1);}} style={{ ...iStyle(t), width:"auto", fontSize:13, padding:"8px 12px" }}/>
                <span style={{ fontSize:12, color:t.textSub }}>→</span>
                <input type="date" value={activityDateTo} onChange={e=>{setActivityDateTo(e.target.value);setActivityPage(1);}} style={{ ...iStyle(t), width:"auto", fontSize:13, padding:"8px 12px" }}/>
                {hasDateFilter && (
                  <button onClick={()=>{setActivityDateFrom("");setActivityDateTo("");}} style={{ fontSize:12, color:t.accent, background:"none", border:"none", cursor:"pointer", fontWeight:500 }}>Clear</button>
                )}
              </div>

              {/* Search + type filter */}
              <div style={{ display:"flex", gap:10, marginBottom:20, flexWrap:"wrap" }}>
                <div style={{ flex:1, minWidth:180, position:"relative" }}>
                  <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:t.textSub, fontSize:14, pointerEvents:"none" }}>🔍</span>
                  <input value={activitySearch} onChange={e=>{setActivitySearch(e.target.value);setActivityPage(1);}} placeholder="Search activity..." style={{ ...iStyle(t), paddingLeft:36 }}/>
                </div>
                {["all","contributions","expenses"].map(f=>(
                  <button key={f} onClick={()=>{setActivityFilter(f);setActivityPage(1);}} style={{ padding:"10px 16px", borderRadius:10, border:"none", cursor:"pointer", fontSize:13, fontWeight:600, background:activityFilter===f?t.accent:t.surfaceAlt, color:activityFilter===f?"white":t.textSub, transition:"all 0.15s" }}>
                    {f==="all"?"All":f==="contributions"?"Income":"Expenses"}
                  </button>
                ))}
              </div>

              {/* Summary strip when date filter active */}
              {hasDateFilter && filtered.length>0 && (
                <div style={{ display:"flex", gap:12, marginBottom:16, padding:"12px 16px", background:t.surfaceAlt, borderRadius:12 }}>
                  <span style={{ fontSize:13, color:"#34C759", fontWeight:600 }}>+{fmt(filteredIncome)}</span>
                  <span style={{ fontSize:13, color:t.textSub }}>·</span>
                  <span style={{ fontSize:13, color:"#FF375F", fontWeight:600 }}>-{fmt(filteredExpense)}</span>
                  <span style={{ fontSize:13, color:t.textSub }}>·</span>
                  <span style={{ fontSize:13, color:t.accent, fontWeight:600 }}>Net {fmt(filteredIncome-filteredExpense)}</span>
                </div>
              )}

              {filtered.length===0
                ? <EmptyState message="No activity matches your filters." t={t}/>
                : (() => {
                    const totalPages = Math.ceil(filtered.length / ACTIVITY_PAGE_SIZE);
                    const safePage = Math.min(activityPage, totalPages);
                    const pageItems = filtered.slice((safePage-1)*ACTIVITY_PAGE_SIZE, safePage*ACTIVITY_PAGE_SIZE);
                    return (
                      <>
                        <div>{pageItems.map((item,i)=>(
                          <div key={item.id} className="row-hover" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 8px", borderBottom:i<pageItems.length-1?`1px solid ${t.border}`:"none", borderRadius:8, animation:`slideIn 0.3s ease ${i*0.03}s both` }}>
                            <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                              <div style={{ width:36, height:36, borderRadius:10, background:item.positive?"rgba(52,199,89,0.12)":"rgba(255,55,95,0.1)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>{item.positive?"↑":"↓"}</div>
                              <div><p style={{ fontSize:14, fontWeight:600, margin:0, color:t.text }}>{item.name}</p><p style={{ fontSize:12, color:t.textSub, margin:0 }}>{item.action} · {item.time}</p></div>
                            </div>
                            <span style={{ fontSize:15, fontWeight:700, color:item.positive?"#34C759":"#FF375F" }}>{item.amount}</span>
                          </div>
                        ))}</div>
                        {totalPages > 1 && (
                          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:20, paddingTop:16, borderTop:`1px solid ${t.border}` }}>
                            <span style={{ fontSize:12, color:t.textSub }}>Showing {(safePage-1)*ACTIVITY_PAGE_SIZE+1}–{Math.min(safePage*ACTIVITY_PAGE_SIZE,filtered.length)} of {filtered.length}</span>
                            <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                              <button onClick={()=>setActivityPage(p=>Math.max(1,p-1))} disabled={safePage===1} style={{ padding:"6px 14px", borderRadius:8, border:`1px solid ${t.border}`, background:t.surfaceAlt, color:safePage===1?t.textMuted:t.text, cursor:safePage===1?"default":"pointer", fontSize:13, fontWeight:500 }}>← Prev</button>
                              {Array.from({length:totalPages},(_,pi)=>pi+1).filter(pg=>pg===1||pg===totalPages||Math.abs(pg-safePage)<=1).reduce((acc,pg,idx,arr)=>{ if(idx>0&&pg-arr[idx-1]>1)acc.push("dot"); acc.push(pg); return acc; },[]).map((pg,idx)=> pg==="dot"?(<span key={"d"+idx} style={{ fontSize:13, color:t.textMuted, padding:"0 4px" }}>…</span>):(<button key={pg} onClick={()=>setActivityPage(pg)} style={{ width:32, height:32, borderRadius:8, border:`1px solid ${pg===safePage?t.accent:t.border}`, background:pg===safePage?t.accent:t.surfaceAlt, color:pg===safePage?"white":t.text, cursor:"pointer", fontSize:13, fontWeight:pg===safePage?700:500 }}>{pg}</button>))}
                              <button onClick={()=>setActivityPage(p=>Math.min(totalPages,p+1))} disabled={safePage===totalPages} style={{ padding:"6px 14px", borderRadius:8, border:`1px solid ${t.border}`, background:t.surfaceAlt, color:safePage===totalPages?t.textMuted:t.text, cursor:safePage===totalPages?"default":"pointer", fontSize:13, fontWeight:500 }}>Next →</button>
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()
              }
            </Card>
          );
        })()}


        {/* ── AUDIT LOG ── */}
        {activeTab==="audit" && isSuperAdmin && (
          <Card t={t}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
              <div>
                <h3 style={{ fontSize:15, fontWeight:700, margin:0, color:t.text }}>Audit Log</h3>
                <p style={{ fontSize:12, color:t.textSub, margin:"4px 0 0" }}>Every create, edit and delete — who did it and when</p>
              </div>
            </div>
            {auditLog.length===0?<EmptyState message="No audit entries yet." t={t}/>:
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {auditLog.map((entry,i)=>{
                  const ac=entry.action==="create"?"#34C759":entry.action==="edit"?"#FF9F0A":"#FF375F";
                  const al=entry.action==="create"?"Created":entry.action==="edit"?"Edited":"Deleted";
                  return (
                    <div key={entry.id} style={{ padding:"14px 16px", background:t.surfaceAlt, borderRadius:12, border:`1px solid ${t.border}`, animation:`slideIn 0.25s ease ${Math.min(i,10)*0.03}s both` }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12 }}>
                        <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
                          <span style={{ fontSize:10, fontWeight:700, padding:"3px 8px", borderRadius:6, background:`${ac}18`, color:ac, flexShrink:0, marginTop:1 }}>{al}</span>
                          <div>
                            <p style={{ fontSize:13, fontWeight:600, margin:0, color:t.text }}>{entry.description}</p>
                            <p style={{ fontSize:11, color:t.textSub, margin:"3px 0 0" }}>by {entry.performed_by_email||"unknown"}</p>
                            {entry.old_value&&entry.new_value&&(
                              <p style={{ fontSize:11, color:t.textMuted, margin:"3px 0 0" }}>
                                {Object.keys(entry.new_value).filter(k=>String(entry.old_value[k])!==String(entry.new_value[k])).map(k=>`${k}: ${entry.old_value[k]} → ${entry.new_value[k]}`).join(" · ")}
                              </p>
                            )}
                          </div>
                        </div>
                        <p style={{ fontSize:11, color:t.textSub, margin:0, flexShrink:0, whiteSpace:"nowrap" }}>{new Date(entry.created_at).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            }
          </Card>
        )}

        {/* ── SETTINGS ── */}
        {activeTab==="settings" && isSuperAdmin && (
          <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
            <Card t={t} style={{ animation:"slideUp 0.3s ease" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
                <div><h3 style={{ fontSize:15, fontWeight:700, margin:0, color:t.text }}>Organisation</h3><p style={{ fontSize:13, color:t.textSub, margin:"4px 0 0" }}>Your organisation's profile and preferences</p></div>
                <Btn t={t} onClick={()=>openModal("editOrg")}>Edit</Btn>
              </div>
              {data.org&&(
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
                  {[{label:"Name",value:data.org.name},{label:"Currency",value:data.org.currency},{label:"Contact Email",value:data.org.contact_email||"—"},{label:"Contact Phone",value:data.org.contact_phone||"—"},{label:"Address",value:data.org.address||"—"},{label:"Financial Year",value:fyLabel(data.org.financial_year_start,data.org.financial_year_format)}].map(({label,value})=>(
                    <div key={label}><p style={{ fontSize:11, fontWeight:600, color:t.textSub, textTransform:"uppercase", letterSpacing:"0.06em", margin:"0 0 4px" }}>{label}</p><p style={{ fontSize:14, fontWeight:500, color:t.text, margin:0 }}>{value}</p></div>
                  ))}
                </div>
              )}
            </Card>

            <Card t={t} style={{ animation:"slideUp 0.3s ease 0.05s both" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
                <div><h3 style={{ fontSize:15, fontWeight:700, margin:0, color:t.text }}>System Users</h3><p style={{ fontSize:13, color:t.textSub, margin:"4px 0 0" }}>People who can log into {orgName}</p></div>
                <Btn t={t} onClick={()=>openModal("addUser")}>+ Add User</Btn>
              </div>
              <div>{(data.users||[]).map((user,i)=>(
                <div key={user.id} className="row-hover" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 8px", borderRadius:12, animation:`slideIn 0.3s ease ${i*0.05}s both` }}>
                  <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                    <Avatar name={user.full_name||user.email} size={40}/>
                    <div><p style={{ fontSize:14, fontWeight:600, margin:0, color:t.text }}>{user.full_name||"—"}</p><p style={{ fontSize:12, color:t.textSub, margin:0 }}>{user.email}</p></div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <span style={{ fontSize:11, fontWeight:700, padding:"4px 10px", borderRadius:20, textTransform:"uppercase", letterSpacing:"0.04em", background:user.role==="super_admin"?`${t.accent}18`:"rgba(52,199,89,0.1)", color:user.role==="super_admin"?t.accent:"#34C759" }}>{user.role==="super_admin"?"Super Admin":"Admin"}</span>
                    {user.id===session?.user?.id&&<span style={{ fontSize:11, color:t.textSub, fontStyle:"italic" }}>You</span>}
                  </div>
                </div>
              ))}</div>
            </Card>

            <Card t={t} style={{ animation:"slideUp 0.3s ease 0.1s both" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
                <div><h3 style={{ fontSize:15, fontWeight:700, margin:0, color:t.text }}>Payment Types</h3><p style={{ fontSize:13, color:t.textSub, margin:"4px 0 0" }}>Categories people can contribute towards</p></div>
                <Btn t={t} onClick={()=>openModal("addPaymentType")}>+ New Type</Btn>
              </div>
              {data.paymentTypes.length===0?<EmptyState message="No payment types yet." t={t}/>:
                <div>{data.paymentTypes.map((pt,i)=>(
                  <div key={pt.id} className="row-hover" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 8px", borderRadius:12, animation:`slideIn 0.3s ease ${i*0.05}s both` }}>
                    <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                      <div style={{ width:10, height:10, borderRadius:3, background:pt.color, flexShrink:0, boxShadow:`0 0 6px ${pt.color}66` }}/>
                      <div><p style={{ fontSize:14, fontWeight:600, margin:0, color:t.text }}>{pt.name}</p>{pt.description&&<p style={{ fontSize:12, color:t.textSub, margin:0 }}>{pt.description}</p>}</div>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <div style={{ textAlign:"right", marginRight:4 }}><p style={{ fontSize:14, fontWeight:600, margin:0, color:t.text }}>{fmt(pt.total)}</p>{pt.goal>0&&<p style={{ fontSize:11, color:t.textSub, margin:0 }}>Goal: {fmt(pt.goal)}</p>}</div>
                      <Btn size="sm" variant="secondary" t={t} onClick={()=>{setEditingPaymentType({...pt,goal:pt.goal||""});openModal("editPaymentType");}}>Edit</Btn>
                      <Btn size="sm" variant="danger" t={t} onClick={()=>handleDeletePaymentType(pt.id)}>Delete</Btn>
                    </div>
                  </div>
                ))}</div>
              }
            </Card>

            <Card t={t} style={{ animation:"slideUp 0.3s ease 0.15s both" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
                <div><h3 style={{ fontSize:15, fontWeight:700, margin:0, color:t.text }}>Expense Categories</h3><p style={{ fontSize:13, color:t.textSub, margin:"4px 0 0" }}>Categories for tracking organisational spending</p></div>
                <Btn t={t} onClick={()=>openModal("addExpenseCategory")}>+ New Category</Btn>
              </div>
              {data.expenses.length===0?<EmptyState message="No expense categories yet." t={t}/>:
                <div>{data.expenses.map((exp,i)=>(
                  <div key={exp.id} className="row-hover" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 8px", borderRadius:12, animation:`slideIn 0.3s ease ${i*0.05}s both` }}>
                    <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                      <div style={{ width:10, height:10, borderRadius:3, background:exp.color, flexShrink:0, boxShadow:`0 0 6px ${exp.color}66` }}/>
                      <div><div style={{ display:chr(34)+chr(102)+chr(108)+chr(101)+chr(120)+chr(34), alignItems:chr(34)+chr(99)+chr(101)+chr(110)+chr(116)+chr(101)+chr(114)+chr(34), gap:6 }}><p style={{ fontSize:14, fontWeight:600, margin:0, color:t.text }}>{exp.label}</p>{exp.budget>0&&Math.round((exp.amount/exp.budget)*100)>=100&&<span style={{ fontSize:10, fontWeight:700, padding:chr(34)+chr(50)+chr(112)+chr(120)+chr(32)+chr(54)+chr(112)+chr(120)+chr(34), borderRadius:5, background:chr(34)+chr(114)+chr(103)+chr(98)+chr(97)+chr(40)+chr(50)+chr(53)+chr(53)+chr(44)+chr(53)+chr(53)+chr(44)+chr(57)+chr(53)+chr(44)+chr(48)+chr(46)+chr(49)+chr(50)+chr(41)+chr(34), color:chr(34)+chr(35)+chr(70)+chr(70)+chr(51)+chr(55)+chr(53)+chr(70)+chr(34) }}>OVER BUDGET</span>}</div>{exp.description&&<p style={{ fontSize:12, color:t.textSub, margin:0 }}>{exp.description}</p>}</div>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <div style={{ textAlign:"right", marginRight:4 }}><p style={{ fontSize:14, fontWeight:600, margin:0, color:t.text }}>{fmt(exp.amount)} spent</p>{exp.budget>0&&<p style={{ fontSize:11, color:t.textSub, margin:0 }}>Budget: {fmt(exp.budget)}</p>}</div>
                      <Btn size="sm" variant="secondary" t={t} onClick={()=>{setEditingExpenseCategory({...exp,budget:exp.budget||"",name:exp.label});openModal("editExpenseCategory");}}>Edit</Btn>
                      <Btn size="sm" variant="danger" t={t} onClick={()=>handleDeleteExpenseCategory(exp.id)}>Delete</Btn>
                    </div>
                  </div>
                ))}</div>
              }
            </Card>
          </div>
        )}

        </div>
      </div>

      {/* ── MODALS ── */}
      {modal==="editOrg"&&orgForm&&(
        <Modal title="Organisation Settings" onClose={closeModal} t={t}>
          <form onSubmit={handleSaveOrg}>
            <Field label="Organisation Name" t={t}><Input t={t} value={orgForm.name} onChange={e=>setOrgForm({...orgForm,name:e.target.value})} required/></Field>
            <Field label="Address" t={t}><Textarea t={t} value={orgForm.address} onChange={e=>setOrgForm({...orgForm,address:e.target.value})} placeholder="Street, City, Country"/></Field>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <Field label="Contact Email" t={t}><Input t={t} type="email" value={orgForm.contact_email} onChange={e=>setOrgForm({...orgForm,contact_email:e.target.value})} placeholder="info@org.com"/></Field>
              <Field label="Contact Phone" t={t}><Input t={t} value={orgForm.contact_phone} onChange={e=>setOrgForm({...orgForm,contact_phone:e.target.value})} placeholder="+1 234 567 8900"/></Field>
            </div>
            <Field label="Currency" t={t}><Select t={t} value={orgForm.currency} onChange={e=>setOrgForm({...orgForm,currency:e.target.value})}>{CURRENCIES.map(c=><option key={c} value={c}>{c}</option>)}</Select></Field>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <Field label="Financial Year Start" t={t}><Input t={t} type="number" value={orgForm.financial_year_start} onChange={e=>setOrgForm({...orgForm,financial_year_start:e.target.value})} placeholder="2026"/></Field>
              <Field label="Year Format" t={t}><Select t={t} value={orgForm.financial_year_format} onChange={e=>setOrgForm({...orgForm,financial_year_format:e.target.value})}><option value="single">Single (2026)</option><option value="split">Split (2026/2027)</option></Select></Field>
            </div>
            {formError&&<p style={{ fontSize:13, color:"#FF375F", marginBottom:16 }}>{formError}</p>}
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8 }}>
              <Btn variant="secondary" t={t} type="button" onClick={closeModal}>Cancel</Btn>
              <Btn t={t} type="submit" disabled={formLoading}>{formLoading?"Saving...":"Save Changes"}</Btn>
            </div>
          </form>
        </Modal>
      )}
      {modal==="addUser"&&(
        <Modal title="Add New User" onClose={closeModal} t={t}>
          <form onSubmit={handleAddUser}>
            <Field label="Full Name" t={t}><Input t={t} value={newUser.full_name} onChange={e=>setNewUser({...newUser,full_name:e.target.value})} placeholder="John Doe" required/></Field>
            <Field label="Email" t={t}><Input t={t} type="email" value={newUser.email} onChange={e=>setNewUser({...newUser,email:e.target.value})} placeholder="john@example.com" required/></Field>
            <Field label="Password" t={t}><Input t={t} type="password" value={newUser.password} onChange={e=>setNewUser({...newUser,password:e.target.value})} placeholder="Min. 6 characters" required minLength={6}/></Field>
            <Field label="Role" t={t}><Select t={t} value={newUser.role} onChange={e=>setNewUser({...newUser,role:e.target.value})}><option value="admin">Admin (Manager)</option><option value="super_admin">Super Admin (Owner)</option></Select></Field>
            {formError&&<p style={{ fontSize:13, color:"#FF375F", marginBottom:16 }}>{formError}</p>}
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8 }}>
              <Btn variant="secondary" t={t} type="button" onClick={closeModal}>Cancel</Btn>
              <Btn t={t} type="submit" disabled={formLoading}>{formLoading?"Creating...":"Create User"}</Btn>
            </div>
          </form>
        </Modal>
      )}
      {modal==="addPerson"&&(
        <Modal title="Add Person" onClose={closeModal} t={t}>
          <form onSubmit={handleAddPerson}>
            <Field label="Full Name" t={t}><Input t={t} value={newPerson.full_name} onChange={e=>setNewPerson({...newPerson,full_name:e.target.value})} placeholder="Jane Doe" required/></Field>
            <Field label="Status" t={t}><Select t={t} value={newPerson.status} onChange={e=>setNewPerson({...newPerson,status:e.target.value})}><option value="active">Active</option><option value="inactive">Inactive</option></Select></Field>
            <Field label="Monthly Target (optional)" t={t}><Input t={t} type="number" min="0" step="0.01" value={newPerson.monthly_target||""} onChange={e=>setNewPerson({...newPerson,monthly_target:e.target.value})} placeholder="e.g. 100"/></Field>
            {formError&&<p style={{ fontSize:13, color:"#FF375F", marginBottom:16 }}>{formError}</p>}
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8 }}>
              <Btn variant="secondary" t={t} type="button" onClick={closeModal}>Cancel</Btn>
              <Btn t={t} type="submit" disabled={formLoading}>{formLoading?"Saving...":"Add Person"}</Btn>
            </div>
          </form>
        </Modal>
      )}
      {modal==="addContribution"&&(
        <Modal title="Record Contribution" onClose={closeModal} t={t}>
          <form onSubmit={handleAddContribution}>
            <Field label="Person" t={t}><Select t={t} value={newContribution.member_id} onChange={e=>setNewContribution({...newContribution,member_id:e.target.value})} required><option value="">Select person...</option>{(data.allPeople||[]).filter(p=>p.role==="member").map(p=><option key={p.id} value={p.id}>{p.full_name}</option>)}</Select></Field>
            <Field label="Payment Type" t={t}><Select t={t} value={newContribution.payment_type_id} onChange={e=>setNewContribution({...newContribution,payment_type_id:e.target.value})}><option value="">Select type...</option>{data.paymentTypes.map(pt=><option key={pt.id} value={pt.id}>{pt.name}</option>)}</Select></Field>
            <Field label="Amount" t={t}><Input t={t} type="number" min="1" step="0.01" value={newContribution.amount} onChange={e=>setNewContribution({...newContribution,amount:e.target.value})} placeholder="0.00" required/></Field>
            <Field label="Note (optional)" t={t}><Textarea t={t} value={newContribution.note} onChange={e=>setNewContribution({...newContribution,note:e.target.value})} placeholder="Any notes..."/></Field>
            {formError&&<p style={{ fontSize:13, color:"#FF375F", marginBottom:16 }}>{formError}</p>}
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8 }}>
              <Btn variant="secondary" t={t} type="button" onClick={closeModal}>Cancel</Btn>
              <Btn t={t} type="submit" disabled={formLoading}>{formLoading?"Saving...":"Record"}</Btn>
            </div>
          </form>
        </Modal>
      )}
      {modal==="addExpense"&&(
        <Modal title="Record Expense" onClose={closeModal} t={t}>
          <form onSubmit={handleAddExpense}>
            <Field label="Category" t={t}><Select t={t} value={newExpense.category_id} onChange={e=>setNewExpense({...newExpense,category_id:e.target.value})} required><option value="">Select category...</option>{data.expenses.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</Select></Field>
            <Field label="Amount" t={t}><Input t={t} type="number" min="1" step="0.01" value={newExpense.amount} onChange={e=>setNewExpense({...newExpense,amount:e.target.value})} placeholder="0.00" required/></Field>
            <Field label="Description" t={t}><Input t={t} value={newExpense.label} onChange={e=>setNewExpense({...newExpense,label:e.target.value})} placeholder="What was this for?" required/></Field>
            {formError&&<p style={{ fontSize:13, color:"#FF375F", marginBottom:16 }}>{formError}</p>}
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8 }}>
              <Btn variant="secondary" t={t} type="button" onClick={closeModal}>Cancel</Btn>
              <Btn t={t} type="submit" disabled={formLoading}>{formLoading?"Saving...":"Record"}</Btn>
            </div>
          </form>
        </Modal>
      )}
      {modal==="addPaymentType"&&(
        <Modal title="New Payment Type" onClose={closeModal} t={t}>
          <form onSubmit={handleAddPaymentType}>
            <Field label="Name" t={t}><Input t={t} value={newPaymentType.name} onChange={e=>setNewPaymentType({...newPaymentType,name:e.target.value})} placeholder="e.g. Rhapsody, Healing School" required/></Field>
            <Field label="Description (optional)" t={t}><Textarea t={t} value={newPaymentType.description} onChange={e=>setNewPaymentType({...newPaymentType,description:e.target.value})} placeholder="Brief description..."/></Field>
            <Field label="Goal Amount (optional)" t={t}><Input t={t} type="number" min="0" step="0.01" value={newPaymentType.goal} onChange={e=>setNewPaymentType({...newPaymentType,goal:e.target.value})} placeholder="e.g. 10000"/></Field>
            <Field label="Color" t={t}><ColorPicker value={newPaymentType.color} onChange={color=>setNewPaymentType({...newPaymentType,color})}/></Field>
            {formError&&<p style={{ fontSize:13, color:"#FF375F", marginBottom:16 }}>{formError}</p>}
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:24 }}>
              <Btn variant="secondary" t={t} type="button" onClick={closeModal}>Cancel</Btn>
              <Btn t={t} type="submit" disabled={formLoading}>{formLoading?"Creating...":"Create"}</Btn>
            </div>
          </form>
        </Modal>
      )}
      {modal==="addExpenseCategory"&&(
        <Modal title="New Expense Category" onClose={closeModal} t={t}>
          <form onSubmit={handleAddExpenseCategory}>
            <Field label="Name" t={t}><Input t={t} value={newExpenseCategory.name} onChange={e=>setNewExpenseCategory({...newExpenseCategory,name:e.target.value})} placeholder="e.g. Rent, Salaries" required/></Field>
            <Field label="Description (optional)" t={t}><Textarea t={t} value={newExpenseCategory.description} onChange={e=>setNewExpenseCategory({...newExpenseCategory,description:e.target.value})} placeholder="Brief description..."/></Field>
            <Field label="Budget (optional)" t={t}><Input t={t} type="number" min="0" step="0.01" value={newExpenseCategory.budget} onChange={e=>setNewExpenseCategory({...newExpenseCategory,budget:e.target.value})} placeholder="e.g. 50000"/></Field>
            <Field label="Color" t={t}><ColorPicker value={newExpenseCategory.color} onChange={color=>setNewExpenseCategory({...newExpenseCategory,color})}/></Field>
            {formError&&<p style={{ fontSize:13, color:"#FF375F", marginBottom:16 }}>{formError}</p>}
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:24 }}>
              <Btn variant="secondary" t={t} type="button" onClick={closeModal}>Cancel</Btn>
              <Btn t={t} type="submit" disabled={formLoading}>{formLoading?"Creating...":"Create"}</Btn>
            </div>
          </form>
        </Modal>
      )}
      {modal==="editPaymentType"&&editingPaymentType&&(
        <Modal title="Edit Payment Type" onClose={closeModal} t={t}>
          <form onSubmit={handleEditPaymentType}>
            <Field label="Name" t={t}><Input t={t} value={editingPaymentType.name} onChange={e=>setEditingPaymentType({...editingPaymentType,name:e.target.value})} required/></Field>
            <Field label="Description (optional)" t={t}><Textarea t={t} value={editingPaymentType.description||""} onChange={e=>setEditingPaymentType({...editingPaymentType,description:e.target.value})}/></Field>
            <Field label="Goal Amount (optional)" t={t}><Input t={t} type="number" min="0" step="0.01" value={editingPaymentType.goal||""} onChange={e=>setEditingPaymentType({...editingPaymentType,goal:e.target.value})}/></Field>
            <Field label="Color" t={t}><ColorPicker value={editingPaymentType.color} onChange={color=>setEditingPaymentType({...editingPaymentType,color})}/></Field>
            {formError&&<p style={{ fontSize:13, color:"#FF375F", marginBottom:16 }}>{formError}</p>}
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:24 }}>
              <Btn variant="secondary" t={t} type="button" onClick={closeModal}>Cancel</Btn>
              <Btn t={t} type="submit" disabled={formLoading}>{formLoading?"Saving...":"Save Changes"}</Btn>
            </div>
          </form>
        </Modal>
      )}
      {modal==="editExpenseCategory"&&editingExpenseCategory&&(
        <Modal title="Edit Expense Category" onClose={closeModal} t={t}>
          <form onSubmit={handleEditExpenseCategory}>
            <Field label="Name" t={t}><Input t={t} value={editingExpenseCategory.name} onChange={e=>setEditingExpenseCategory({...editingExpenseCategory,name:e.target.value})} required/></Field>
            <Field label="Description (optional)" t={t}><Textarea t={t} value={editingExpenseCategory.description||""} onChange={e=>setEditingExpenseCategory({...editingExpenseCategory,description:e.target.value})}/></Field>
            <Field label="Budget (optional)" t={t}><Input t={t} type="number" min="0" step="0.01" value={editingExpenseCategory.budget||""} onChange={e=>setEditingExpenseCategory({...editingExpenseCategory,budget:e.target.value})}/></Field>
            <Field label="Color" t={t}><ColorPicker value={editingExpenseCategory.color} onChange={color=>setEditingExpenseCategory({...editingExpenseCategory,color})}/></Field>
            {formError&&<p style={{ fontSize:13, color:"#FF375F", marginBottom:16 }}>{formError}</p>}
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:24 }}>
              <Btn variant="secondary" t={t} type="button" onClick={closeModal}>Cancel</Btn>
              <Btn t={t} type="submit" disabled={formLoading}>{formLoading?"Saving...":"Save Changes"}</Btn>
            </div>
          </form>
        </Modal>
      )}


      {modal==="editPerson"&&editingPerson&&(
        <Modal title="Edit Person" onClose={closeModal} t={t}>
          <form onSubmit={handleEditPerson}>
            <Field label="Full Name" t={t}><Input t={t} value={editingPerson.full_name} onChange={e=>setEditingPerson({...editingPerson,full_name:e.target.value})} required/></Field>
            <Field label="Status" t={t}><Select t={t} value={editingPerson.status} onChange={e=>setEditingPerson({...editingPerson,status:e.target.value})}><option value="active">Active</option><option value="inactive">Inactive</option></Select></Field>
            <Field label="Monthly Target (optional)" t={t}><Input t={t} type="number" min="0" step="0.01" value={editingPerson.monthly_target||""} onChange={e=>setEditingPerson({...editingPerson,monthly_target:e.target.value})} placeholder="e.g. 100"/></Field>
            {formError&&<p style={{ fontSize:13, color:"#FF375F", marginBottom:16 }}>{formError}</p>}
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8 }}>
              <Btn variant="secondary" t={t} type="button" onClick={closeModal}>Cancel</Btn>
              <Btn t={t} type="submit" disabled={formLoading}>{formLoading?"Saving...":"Save Changes"}</Btn>
            </div>
          </form>
        </Modal>
      )}

      {modal==="editContribution"&&editingContribution&&(
        <Modal title="Edit Contribution" onClose={closeModal} t={t}>
          <form onSubmit={handleEditContribution}>
            <div style={{ marginBottom:16, padding:"12px 16px", background:t.surfaceAlt, borderRadius:10 }}>
              <p style={{ fontSize:12, color:t.textSub, margin:0 }}>Editing contribution for</p>
              <p style={{ fontSize:15, fontWeight:700, color:t.text, margin:"2px 0 0" }}>{editingContribution.member_name}</p>
            </div>
            <Field label="Amount" t={t}><Input t={t} type="number" min="1" step="0.01" value={editingContribution.amount} onChange={e=>setEditingContribution({...editingContribution,amount:e.target.value})} required/></Field>
            <Field label="Payment Type" t={t}><Select t={t} value={editingContribution.payment_type_id} onChange={e=>setEditingContribution({...editingContribution,payment_type_id:e.target.value})}><option value="">None</option>{data.paymentTypes.map(pt=><option key={pt.id} value={pt.id}>{pt.name}</option>)}</Select></Field>
            <Field label="Note (optional)" t={t}><Textarea t={t} value={editingContribution.note} onChange={e=>setEditingContribution({...editingContribution,note:e.target.value})}/></Field>
            {formError&&<p style={{ fontSize:13, color:"#FF375F", marginBottom:16 }}>{formError}</p>}
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8 }}>
              <Btn variant="secondary" t={t} type="button" onClick={closeModal}>Cancel</Btn>
              <Btn t={t} type="submit" disabled={formLoading}>{formLoading?"Saving...":"Save Changes"}</Btn>
            </div>
          </form>
        </Modal>
      )}

      {modal==="editExpenseEntry"&&editingExpenseEntry&&(
        <Modal title="Edit Expense" onClose={closeModal} t={t}>
          <form onSubmit={handleEditExpenseEntry}>
            <Field label="Description" t={t}><Input t={t} value={editingExpenseEntry.label} onChange={e=>setEditingExpenseEntry({...editingExpenseEntry,label:e.target.value})} required/></Field>
            <Field label="Amount" t={t}><Input t={t} type="number" min="1" step="0.01" value={editingExpenseEntry.amount} onChange={e=>setEditingExpenseEntry({...editingExpenseEntry,amount:e.target.value})} required/></Field>
            <Field label="Category" t={t}><Select t={t} value={editingExpenseEntry.category_id} onChange={e=>setEditingExpenseEntry({...editingExpenseEntry,category_id:e.target.value})} required><option value="">Select category...</option>{data.expenses.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</Select></Field>
            {formError&&<p style={{ fontSize:13, color:"#FF375F", marginBottom:16 }}>{formError}</p>}
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8 }}>
              <Btn variant="secondary" t={t} type="button" onClick={closeModal}>Cancel</Btn>
              <Btn t={t} type="submit" disabled={formLoading}>{formLoading?"Saving...":"Save Changes"}</Btn>
            </div>
          </form>
        </Modal>
      )}

    </div>
  );
}