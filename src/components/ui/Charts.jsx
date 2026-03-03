import { useState, useEffect, useRef } from "react";
import { EmptyState } from "./ui/index.jsx";

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

export { DonutChart, BarChart, LineChart, ContributorBars };
