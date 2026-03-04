import { useState, useEffect } from "react";
import { COLORS } from "../../constants.js";

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

// ── Skeleton loading components ───────────────────────────────
const SkeletonBox = ({ w="100%", h=16, r=8, style={} }) => (
  <div style={{ width:w, height:h, borderRadius:r, background:"linear-gradient(90deg,rgba(128,128,128,0.1) 25%,rgba(128,128,128,0.2) 50%,rgba(128,128,128,0.1) 75%)", backgroundSize:"200% 100%", animation:"shimmer 1.4s ease-in-out infinite", ...style }}/>
);

const SkeletonCard = ({ t, children, style={} }) => (
  <div style={{ background:t.surface, borderRadius:24, padding:"32px", border:`1px solid ${t.border}`, boxShadow:t.cardShadow, overflow:"hidden", ...style }}>{children}</div>
);

const SkeletonTab = ({ activeTab, t }) => {
  const b = (w, h=14, r=8, s={}) => <SkeletonBox w={w} h={h} r={r} style={s}/>;
  if (activeTab === "overview") return (
    <div>
      <div className="grid-3" style={{ marginBottom:24 }}>
        <div className="col-span-2" style={{ background:"linear-gradient(135deg,rgba(0,113,227,0.25),rgba(52,170,220,0.2))", borderRadius:24, padding:"36px 40px" }}>
          {b("40%",11,6,{marginBottom:12})}{b("55%",44,10,{marginBottom:20})}{b("70%",14,6)}
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {[0,1].map(i=><SkeletonCard key={i} t={t}>{b("50%",11,6,{marginBottom:10})}{b("65%",32,8)}</SkeletonCard>)}
        </div>
      </div>
      <div className="grid-2" style={{ marginBottom:20 }}>
        {[0,1].map(i=><SkeletonCard key={i} t={t}>{b("40%",12,6,{marginBottom:16})}{b("100%",120,12)}</SkeletonCard>)}
      </div>
      <SkeletonCard t={t}>
        {b("30%",14,6,{marginBottom:20})}
        {[0,1,2,3,4].map(i=><div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 0", borderBottom:`1px solid ${t.border}` }}>
          <SkeletonBox w={36} h={36} r={18}/>{b("40%",12,6)}<SkeletonBox w={60} h={12} r={6} style={{ marginLeft:"auto" }}/>
        </div>)}
      </SkeletonCard>
    </div>
  );
  if (activeTab === "people") return (
    <div>
      <SkeletonCard t={t} style={{ marginBottom:20 }}>{b("35%",14,6,{marginBottom:16})}{[0,1,2,3].map(i=><div key={i} style={{ height:8, background:"linear-gradient(90deg,rgba(128,128,128,0.1) 25%,rgba(128,128,128,0.2) 50%,rgba(128,128,128,0.1) 75%)", backgroundSize:"200% 100%", animation:"shimmer 1.4s ease-in-out infinite", borderRadius:99, marginBottom:12, width:`${70-i*10}%` }}/>)}</SkeletonCard>
      <SkeletonCard t={t}>
        {b("25%",14,6,{marginBottom:16})}{b("100%",42,10,{marginBottom:16})}
        {[0,1,2,3].map(i=><div key={i} style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 0", borderBottom:`1px solid ${t.border}` }}>
          <SkeletonBox w={42} h={42} r={21}/><div style={{ flex:1 }}>{b("45%",13,6,{marginBottom:6})}{b("60%",11,6)}</div>{b(80,13,6)}
        </div>)}
      </SkeletonCard>
    </div>
  );
  // Generic skeleton for other tabs
  return (
    <SkeletonCard t={t}>
      {b("35%",16,8,{marginBottom:24})}
      {[0,1,2,3,4,5].map(i=><div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 0", borderBottom:`1px solid ${t.border}` }}>
        <SkeletonBox w={36} h={36} r={10}/><div style={{ flex:1 }}>{b("50%",13,6,{marginBottom:6})}{b("35%",11,6)}</div>{b(70,13,6)}
      </div>)}
    </SkeletonCard>
  );
};

// ── Main App ──────────────────────────────────────────────────

export { Avatar, Modal, Field, iStyle, Input, Textarea, Select, Btn, ColorPicker, EmptyState, Card, StatCard, ChartCard, SkeletonTab };