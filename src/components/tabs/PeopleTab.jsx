import { useState } from "react";
import { createPortal } from "react-dom";
import { Card, ChartCard, Btn, Avatar, EmptyState } from "../ui/index.jsx";
import { ContributorBars } from "../Charts.jsx";

export function PeopleTab({
  data, t, fmt, isSuperAdmin, openModal,
  setEditingPerson, handleDeletePerson, handleDeleteContribution, handleDeactivatePerson,
  setEditingContribution, isViewingPastYear,
}) {
  const [peopleSearch, setPeopleSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberReport, setMemberReport] = useState(null); // full report view
  const [reportFilters, setReportFilters] = useState({ from:"", to:"", payment_type_id:"", search:"" });
  const iStyle = (t) => ({ width:"100%", padding:"11px 14px", borderRadius:10, border:`1px solid ${t.borderStrong}`, fontSize:14, color:t.text, background:t.inputBg, outline:"none", boxSizing:"border-box", fontFamily:"inherit", transition:"border-color 0.15s" });
  const exportPeopleReport = () => {
    const headers = ["Name","Status","Total Contributed","Last Activity"];
    const rows = data.people.map(p=>[p.name,p.status,p.contributions,p.lastActivity]);
    const escape = v=>`"${String(v??"").replace(/"/g,'""')}"`;
    const csv=[headers.map(escape).join(","),...rows.map(r=>r.map(escape).join(","))].join("\n");
    const blob=new Blob([csv],{type:"text/csv"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download=`people-report-${new Date().toISOString().slice(0,10)}.csv`;a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div>
                  {/* ── Status Summary ── */}
                  {(() => {
                    const total = data.people.length;
                    const active = data.people.filter(p=>p.status==="Active").length;
                    const inactive = total - active;
                    const now = new Date();
                    const thisMonth = (data.rawContributions||[]).filter(c => {
                      const d = new Date(c.created_at);
                      return d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear();
                    });
                    const contributedThisMonth = new Set(thisMonth.map(c=>c.member_id)).size;
                    const hitTarget = data.people.filter(p => {
                      if (!p.target) return false;
                      const memberTotal = thisMonth.filter(c=>c.member_id===p.id).reduce((s,c)=>s+Number(c.amount),0);
                      return memberTotal >= p.target;
                    }).length;
                    const chips = [
                      { label:"Total Members", value:total, color:t.accent },
                      { label:"Active", value:active, color:"#34C759" },
                      { label:"Inactive", value:inactive, color:"#8E8E93" },
                      { label:"Contributed This Month", value:contributedThisMonth, color:t.accent },
                      ...(hitTarget > 0 ? [{ label:"Hit Target", value:hitTarget, color:"#FFD700" }] : []),
                    ];
                    return total === 0 ? null : (
                      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:20, animation:"slideUp 0.3s ease" }}>
                        {chips.map(chip => (
                          <div key={chip.label} style={{ flex:1, minWidth:120, background:t.surface, border:`1px solid ${t.border}`, borderRadius:16, padding:"14px 18px", boxShadow:t.cardShadow }}>
                            <p style={{ fontSize:22, fontWeight:700, margin:"0 0 2px", color:chip.color, letterSpacing:"-0.5px" }}>{chip.value}</p>
                            <p style={{ fontSize:11, color:t.textSub, margin:0, fontWeight:500 }}>{chip.label}</p>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                  {data.people.length>0 && (
                    <ChartCard title="Top Contributors" subtitle="Ranked by total contributions" t={t} style={{ marginBottom:20, animation:"slideUp 0.3s ease" }}>
                      <ContributorBars people={data.people} fmt={fmt} t={t}/>
                    </ChartCard>
                  )}
                  <Card t={t} style={{ animation:"slideUp 0.3s ease 0.08s both" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20, flexWrap:"wrap", gap:10 }}>
                      <h3 style={{ fontSize:15, fontWeight:700, margin:0, color:t.text }}>{data.people.length} People</h3>
                      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                        <Btn t={t} onClick={exportPeopleReport} variant="secondary" style={{ fontSize:12 }}>↓ Export</Btn>
                        {!isViewingPastYear && <Btn t={t} onClick={()=>openModal("addPerson")}>+ Add Person</Btn>}
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
                          <div className="row-hover" onClick={()=>setSelectedMember(selectedMember?.id===p.id?null:p)} style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", padding:"14px", borderRadius:12, cursor:"pointer", flexWrap:"wrap", gap:10 }}>
                            <div style={{ display:"flex", alignItems:"center", gap:14, flex:1, minWidth:0 }}>
                              <Avatar name={p.name} size={42}/>
                              <div style={{ minWidth:0 }}>
                                <p
                                  style={{ fontSize:15, fontWeight:600, margin:0, color:t.accent, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", cursor:"pointer", textDecoration:"underline", textUnderlineOffset:3 }}
                                  onClick={e=>{ e.stopPropagation(); setMemberReport(p); setReportFilters({ from:"", to:"", payment_type_id:"", search:"" }); }}
                                >{p.name}</p>
                                <p style={{ fontSize:12, color:t.textSub, margin:0 }}>Last active {p.lastActivity} · tap to view history</p>
                              </div>
                            </div>
                            <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                              <div style={{ textAlign:"right" }}>
                                <p style={{ fontSize:15, fontWeight:700, margin:0, color:t.text }}>{fmt(p.contributions)}</p>
                                <p style={{ fontSize:11, color:t.textSub, margin:0 }}>Total contributed</p>
                              </div>
                              <span style={{ fontSize:11, fontWeight:600, padding:"4px 10px", borderRadius:20, background:p.status==="Active"?"rgba(52,199,89,0.12)":"rgba(142,142,147,0.12)", color:p.status==="Active"?"#34C759":"#8E8E93" }}>{p.status}</span>
                              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                                {!isViewingPastYear && <>
                                  <Btn size="sm" variant="secondary" t={t} onClick={e=>{e.stopPropagation();setEditingPerson({id:p.id,full_name:p.name,status:p.status==="Active"?"active":"inactive",monthly_target:p.target||""});openModal("editPerson");}}>Edit</Btn>
                                  <Btn size="sm" variant="secondary" t={t} onClick={e=>{e.stopPropagation();handleDeactivatePerson(p.id,p.status);}}>{p.status==="Active"?"Deactivate":"Activate"}</Btn>
                                  {isSuperAdmin && <Btn size="sm" variant="danger" t={t} onClick={e=>{e.stopPropagation();handleDeletePerson(p.id);}}>Delete</Btn>}
                                </>}
                              </div>
                            </div>
                          </div>
                          {/* Member detail panel */}
                          {selectedMember?.id===p.id && (() => {
                            const memberContribs = (data.allTimeContributions||data.rawContributions||[]).filter(c=>c.member_id===p.id);
                            return (
                              <div style={{ margin:"0 14px 14px", background:t.bg, borderRadius:14, padding:"20px 24px", border:`1px solid ${t.border}`, animation:"slideUp 0.25s ease" }}>
                                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                                  <div>
                                    <p style={{ fontSize:13, fontWeight:700, color:t.text, margin:0 }}>Contribution History</p>
                                    {p.created_at && <p style={{ fontSize:11, color:t.textSub, margin:"3px 0 0" }}>Member since {new Date(p.created_at).toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})}</p>}
                                  </div>
                                  <p style={{ fontSize:12, color:t.textSub, margin:0 }}>{memberContribs.length} records · {fmt(p.contributions)} total</p>
                                </div>
                                {memberContribs.length===0?<p style={{ fontSize:13, color:t.textSub, margin:0, textAlign:"center", padding:"16px 0" }}>No contributions yet.</p>:
                                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                                    {memberContribs.map((c,ci)=>(
                                      <div key={c.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 14px", background:t.surface, borderRadius:10, border:`1px solid ${t.border}`, animation:`slideIn 0.2s ease ${ci*0.04}s both`, flexWrap:"wrap", gap:8 }}>
                                        <div style={{ display:"flex", alignItems:"center", gap:10, flex:1, minWidth:0 }}>
                                          <div style={{ width:8, height:8, borderRadius:"50%", background:c.payment_types?.color||t.accent, flexShrink:0 }}/>
                                          <div style={{ minWidth:0 }}>
                                            <p style={{ fontSize:13, fontWeight:600, margin:0, color:t.text }}>{c.payment_types?.name||"General"}</p>
                                            {c.note&&<p style={{ fontSize:11, color:t.textSub, margin:0 }}>{c.note}</p>}
                                          </div>
                                        </div>
                                        <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
                                          <div style={{ textAlign:"right" }}>
                                            <p style={{ fontSize:13, fontWeight:700, color:"#34C759", margin:0 }}>{fmt(c.amount)}</p>
                                            <p style={{ fontSize:11, color:t.textSub, margin:0 }}>{new Date(c.created_at).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</p>
                                          </div>
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
      {/* ── Member Report Portal ── */}
      {memberReport && createPortal(
        (() => {
          const allContribs = (data.allTimeContributions||data.rawContributions||[]).filter(c=>c.member_id===memberReport.id);
          const filtered = allContribs.filter(c => {
            if (reportFilters.from && new Date(c.created_at) < new Date(reportFilters.from)) return false;
            if (reportFilters.to && new Date(c.created_at) > new Date(reportFilters.to+"T23:59:59")) return false;
            if (reportFilters.payment_type_id && c.payment_type_id !== reportFilters.payment_type_id) return false;
            if (reportFilters.search && !(c.note||"").toLowerCase().includes(reportFilters.search.toLowerCase()) && !(c.payment_types?.name||"").toLowerCase().includes(reportFilters.search.toLowerCase())) return false;
            return true;
          });
          const filteredTotal = filtered.reduce((s,c)=>s+Number(c.amount),0);
          const allTime = allContribs.reduce((s,c)=>s+Number(c.amount),0);
          return (
            <>
              <div style={{ position:"fixed", inset:0, zIndex:9998, display:"flex", alignItems:"center", justifyContent:"center", padding:24, animation:"fadeIn 0.2s ease" }}>
                {/* Backdrop */}
                <div onClick={()=>setMemberReport(null)} style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.6)", backdropFilter:"blur(8px)" }}/>
                {/* Panel */}
                <div style={{ position:"relative", width:"100%", maxWidth:680, maxHeight:"92vh", background:t.surface, borderRadius:24, border:`1px solid ${t.border}`, display:"flex", flexDirection:"column", animation:"bulkIn 0.25s cubic-bezier(0.34,1.2,0.64,1)", boxShadow:"0 32px 80px rgba(0,0,0,0.5)" }}>

                  {/* Header */}
                  <div style={{ padding:"28px 28px 20px", borderBottom:`1px solid ${t.border}`, flexShrink:0 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                        <Avatar name={memberReport.name} size={48}/>
                        <div>
                          <h2 style={{ fontSize:20, fontWeight:700, margin:0, color:t.text, letterSpacing:"-0.4px" }}>{memberReport.name}</h2>
                          <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:4 }}>
                            <span style={{ fontSize:11, fontWeight:600, padding:"3px 9px", borderRadius:20, background:memberReport.status==="Active"?"rgba(52,199,89,0.12)":"rgba(142,142,147,0.12)", color:memberReport.status==="Active"?"#34C759":"#8E8E93" }}>{memberReport.status}</span>
                            {memberReport.created_at && <span style={{ fontSize:12, color:t.textSub }}>Member since {new Date(memberReport.created_at).toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})}</span>}
                          </div>
                        </div>
                      </div>
                      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                        <Btn variant="secondary" t={t} onClick={()=>{
                          const rows = filtered.map((c,ci) => `
                            <tr style="border-bottom:1px solid #F0F0F5;background:${ci%2===0?"#FAFAFA":"white"}">
                              <td style="padding:9px 12px">${new Date(c.created_at).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}</td>
                              <td style="padding:9px 12px;color:#8E8E93;font-size:11px">FY${c.financial_year||""}</td>
                              <td style="padding:9px 12px;font-weight:500">${c.payment_types?.name||"General"}</td>
                              <td style="padding:9px 12px;color:#666">${c.note||"—"}</td>
                              <td style="padding:9px 12px;text-align:right;font-weight:600">${data.org?.currency||""} ${Number(c.amount).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
                            </tr>`).join("");
                          const memberSince = memberReport.created_at ? `Member since ${new Date(memberReport.created_at).toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})}` : "";
                          const period = reportFilters.from||reportFilters.to ? `${reportFilters.from||"Start"} — ${reportFilters.to||"Today"}` : "All time";
                          const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${memberReport.name} — Statement</title>
                            <style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  @page{margin:14mm 16mm;}
  body{font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;background:#fff;color:#111827;font-size:13px;line-height:1.5;}
  .doc-header{background:linear-gradient(135deg,#1e1f2e 0%,#2d2f4a 100%);color:#fff;padding:28px 32px 24px;position:relative;overflow:hidden;}
  .doc-header::before{content:'';position:absolute;top:-40px;right:-40px;width:180px;height:180px;border-radius:50%;background:rgba(79,110,247,0.18);pointer-events:none;}
  .doc-header::after{content:'';position:absolute;bottom:-30px;left:30%;width:120px;height:120px;border-radius:50%;background:rgba(45,216,138,0.1);pointer-events:none;}
  .doc-org{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:rgba(255,255,255,0.5);margin-bottom:5px;}
  .doc-title{font-size:22px;font-weight:800;letter-spacing:-0.5px;color:#fff;margin-bottom:4px;}
  .doc-meta{font-size:11px;color:rgba(255,255,255,0.5);display:flex;gap:14px;flex-wrap:wrap;margin-top:6px;}
  .doc-logo{position:absolute;right:32px;top:50%;transform:translateY(-50%);width:44px;height:44px;background:rgba(79,110,247,0.25);border:1px solid rgba(79,110,247,0.45);border-radius:13px;display:flex;align-items:center;justify-content:center;}
  .body-wrap{padding:20px 32px 24px;}
  .stat-row{display:grid;gap:10px;margin:0 0 24px;}
  .stat-card{padding:14px 18px;border-radius:10px;border:1px solid #e5e7eb;}
  .stat-label{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;}
  .stat-value{font-size:20px;font-weight:800;letter-spacing:-0.5px;line-height:1.1;}
  .stat-sub{font-size:10px;margin-top:3px;opacity:0.75;}
  .c-green .stat-label{color:#059669;}.c-green{background:#f0fdf4;border-color:#bbf7d0;}.c-green .stat-value{color:#047857;}.c-green .stat-sub{color:#047857;}
  .c-red .stat-label{color:#dc2626;}.c-red{background:#fff1f2;border-color:#fecdd3;}.c-red .stat-value{color:#b91c1c;}.c-red .stat-sub{color:#b91c1c;}
  .c-blue .stat-label{color:#2563eb;}.c-blue{background:#eff6ff;border-color:#bfdbfe;}.c-blue .stat-value{color:#1d4ed8;}.c-blue .stat-sub{color:#1d4ed8;}
  .c-purple .stat-label{color:#7c3aed;}.c-purple{background:#f5f3ff;border-color:#ddd6fe;}.c-purple .stat-value{color:#6d28d9;}
  .section-head{display:flex;align-items:center;gap:8px;margin:22px 0 10px;}
  .section-bar{width:3px;height:15px;border-radius:2px;background:linear-gradient(180deg,#4F6EF7,#2dd88a);flex-shrink:0;}
  .section-head h2{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#374151;}
  table{width:100%;border-collapse:collapse;font-size:12px;}
  thead tr{background:#f9fafb;}
  th{padding:8px 12px;text-align:left;font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em;border-bottom:1px solid #e5e7eb;}
  td{padding:8px 12px;border-bottom:1px solid #f3f4f6;color:#374151;vertical-align:middle;}
  tr:last-child td{border-bottom:none;}
  tfoot td{background:#f9fafb;font-weight:700;color:#111827;border-top:1px solid #e5e7eb;border-bottom:none;padding:9px 12px;}
  .amt{text-align:right;font-weight:600;font-variant-numeric:tabular-nums;}
  .amt-g{color:#047857;}.amt-r{color:#b91c1c;}.amt-b{color:#1d4ed8;}
  .tag{display:inline-block;padding:1px 7px;border-radius:20px;font-size:10px;font-weight:600;}
  .tag-g{background:#dcfce7;color:#15803d;}.tag-r{background:#fee2e2;color:#b91c1c;}.tag-b{background:#dbeafe;color:#1d4ed8;}.tag-gray{background:#f3f4f6;color:#4b5563;}
  .rank-1{color:#b45309;font-weight:800;}.rank-2{color:#6b7280;font-weight:700;}.rank-3{color:#92400e;font-weight:700;}
  .goal-bg{height:5px;background:#e5e7eb;border-radius:99px;overflow:hidden;margin:3px 0 2px;}
  .goal-fill{height:100%;border-radius:99px;}
  .doc-footer{margin-top:24px;padding-top:12px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;font-size:10px;color:#9ca3af;}
  @media print{.doc-header,.stat-card{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
</style></head><body>
                            <div class="doc-header">
                              <div class="doc-logo"><svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M2 8h5M9 8h5M8 2v5M8 9v5" stroke="white" stroke-width="2" stroke-linecap="round"/></svg></div>
                              <div class="doc-org">${data.org?.name||""}</div>
                              <div class="doc-title">${memberReport.name}</div>
                              <div class="doc-meta">
                                <span>Contribution Statement</span>
                                ${memberSince?`<span>${memberSince}</span>`:""}
                                <span>Period: ${period}</span>
                                <span>Printed ${new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})}</span>
                              </div>
                            </div>
                            <div class="body-wrap">
                              <div class="stat-row" style="grid-template-columns:repeat(2,1fr)">
                                <div class="stat-card c-blue">
                                  <div class="stat-label">Total Contributed</div>
                                  <div class="stat-value">${data.org?.currency||""} ${filteredTotal.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
                                  <div class="stat-sub">${period}</div>
                                </div>
                                <div class="stat-card c-green">
                                  <div class="stat-label">Records</div>
                                  <div class="stat-value">${filtered.length}</div>
                                  <div class="stat-sub">contributions in period</div>
                                </div>
                              </div>
                              <div class="section-head"><div class="section-bar"></div><h2>Contribution History</h2></div>
                              <table>
                                <thead><tr><th>Date</th><th>Payment Type</th><th>Note</th><th class="amt">Amount</th></tr></thead>
                                <tbody>${rows}</tbody>
                                <tfoot><tr><td colspan="3">Total (${filtered.length} records)</td><td class="amt">${data.org?.currency||""} ${filteredTotal.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</td></tr></tfoot>
                              </table>
                              <div class="doc-footer">
                                <span>${data.org?.name||""} · Confidential</span>
                                <span>Unified Finance</span>
                              </div>
                            </div>
                            </body></html>`;
                          const w = window.open("","_blank","width=900,height=700");
                          w.document.write(html); w.document.close(); w.focus();
                          setTimeout(()=>{ w.print(); }, 300);
                        }} style={{ fontSize:12 }}>🖨 Print</Btn>
                        <button onClick={()=>setMemberReport(null)} style={{ background:"none", border:"none", color:t.textSub, fontSize:22, cursor:"pointer", padding:4 }}>×</button>
                      </div>
                    </div>
                    {/* All-time stat */}
                    <div style={{ display:"flex", gap:10 }}>
                      <div style={{ flex:1, background:t.surfaceAlt, borderRadius:12, padding:"12px 16px" }}>
                        <p style={{ fontSize:11, color:t.textSub, margin:"0 0 2px", textTransform:"uppercase", letterSpacing:"0.06em", fontWeight:600 }}>All-time Total</p>
                        <p style={{ fontSize:22, fontWeight:700, margin:0, color:t.accent, letterSpacing:"-0.5px" }}>{fmt(allTime)}</p>
                      </div>
                      <div style={{ flex:1, background:t.surfaceAlt, borderRadius:12, padding:"12px 16px" }}>
                        <p style={{ fontSize:11, color:t.textSub, margin:"0 0 2px", textTransform:"uppercase", letterSpacing:"0.06em", fontWeight:600 }}>Total Records</p>
                        <p style={{ fontSize:22, fontWeight:700, margin:0, color:t.text, letterSpacing:"-0.5px" }}>{allContribs.length}</p>
                      </div>
                    </div>
                  </div>

                  {/* Filters */}
                  <div style={{ padding:"16px 28px", borderBottom:`1px solid ${t.border}`, flexShrink:0, display:"flex", gap:10, flexWrap:"wrap" }}>
                    <input type="date" value={reportFilters.from} onChange={e=>setReportFilters(f=>({...f,from:e.target.value}))} style={{ flex:1, minWidth:120, padding:"8px 12px", borderRadius:10, border:`1px solid ${t.borderStrong}`, background:t.surfaceAlt, color:t.text, fontSize:13, outline:"none", fontFamily:"inherit" }}/>
                    <input type="date" value={reportFilters.to} onChange={e=>setReportFilters(f=>({...f,to:e.target.value}))} style={{ flex:1, minWidth:120, padding:"8px 12px", borderRadius:10, border:`1px solid ${t.borderStrong}`, background:t.surfaceAlt, color:t.text, fontSize:13, outline:"none", fontFamily:"inherit" }}/>
                    <select value={reportFilters.payment_type_id} onChange={e=>setReportFilters(f=>({...f,payment_type_id:e.target.value}))} style={{ flex:1, minWidth:130, padding:"8px 12px", borderRadius:10, border:`1px solid ${t.borderStrong}`, background:t.surfaceAlt, color:t.text, fontSize:13, outline:"none", fontFamily:"inherit" }}>
                      <option value="">All types</option>
                      {(data.paymentTypes||[]).map(pt=><option key={pt.id} value={pt.id}>{pt.name}</option>)}
                    </select>
                    <input value={reportFilters.search} onChange={e=>setReportFilters(f=>({...f,search:e.target.value}))} placeholder="Search notes..." style={{ flex:1, minWidth:130, padding:"8px 12px", borderRadius:10, border:`1px solid ${t.borderStrong}`, background:t.surfaceAlt, color:t.text, fontSize:13, outline:"none", fontFamily:"inherit" }}/>
                    {(reportFilters.from||reportFilters.to||reportFilters.payment_type_id||reportFilters.search) &&
                      <button onClick={()=>setReportFilters({from:"",to:"",payment_type_id:"",search:""})} style={{ padding:"8px 14px", borderRadius:10, border:`1px solid ${t.borderStrong}`, background:"none", color:t.textSub, fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>Clear</button>
                    }
                  </div>

                  {/* List */}
                  <div className="subtle-scroll" style={{ flex:1, overflowY:"auto", padding:"12px 28px" }}>
                    {filtered.length===0
                      ? <p style={{ fontSize:13, color:t.textSub, textAlign:"center", padding:"32px 0" }}>No contributions match your filters.</p>
                      : filtered.map((c,ci) => (
                        <div key={c.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 14px", background: ci%2===0?t.surfaceAlt:"transparent", borderRadius:10, marginBottom:4, gap:10, flexWrap:"wrap" }}>
                          <div style={{ display:"flex", alignItems:"center", gap:10, flex:1, minWidth:0 }}>
                            <div style={{ width:8, height:8, borderRadius:"50%", background:c.payment_types?.color||t.accent, flexShrink:0 }}/>
                            <div>
                              <p style={{ fontSize:13, fontWeight:600, margin:0, color:t.text }}>{c.payment_types?.name||"General"}</p>
                              {c.note && <p style={{ fontSize:11, color:t.textSub, margin:"2px 0 0" }}>{c.note}</p>}
                            </div>
                          </div>
                          <div style={{ textAlign:"right", flexShrink:0 }}>
                            <p style={{ fontSize:13, fontWeight:700, color:"#34C759", margin:0 }}>{fmt(c.amount)}</p>
                            <div style={{ display:"flex", alignItems:"center", gap:5, justifyContent:"flex-end" }}>
                              <p style={{ fontSize:11, color:t.textSub, margin:"2px 0 0" }}>{new Date(c.created_at).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}</p>
                              {c.financial_year && <span style={{ fontSize:9, fontWeight:700, padding:"1px 5px", borderRadius:8, background:`${t.accent}15`, color:t.accent }}>FY{c.financial_year}</span>}
                            </div>
                          </div>
                        </div>
                      ))
                    }
                  </div>

                  {/* Footer summary */}
                  <div style={{ padding:"16px 28px 24px", borderTop:`1px solid ${t.border}`, flexShrink:0, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ fontSize:13, color:t.textSub }}>{filtered.length} record{filtered.length!==1?"s":""}{(reportFilters.from||reportFilters.to||reportFilters.payment_type_id||reportFilters.search)?" (filtered)":""}</span>
                    <span style={{ fontSize:16, fontWeight:700, color:t.accent }}>{fmt(filteredTotal)}</span>
                  </div>
                </div>
              </div>
            </>
          );
        })(),
        document.body
      )}
  </div>
  );
}