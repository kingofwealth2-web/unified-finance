import { useState } from "react";
import { Card, ChartCard, Btn, EmptyState, toast } from "../ui/index.jsx";
import { DonutChart } from "../Charts.jsx";

export function PaymentTypesTab({
  data, t, fmt, isSuperAdmin, openModal,
  expandedPaymentType, setExpandedPaymentType,
  setEditingPaymentType, handleDeletePaymentType,
  setEditingContribution, handleDeleteContribution,
  setBulkContributions, isViewingPastYear,
}) {
  const currency = data.org?.currency || "";
  const [ptView, setPtView] = useState({});
  const [memberSearchMap, setMemberSearchMap] = useState({});
  const getMemberSearch = (ptId) => memberSearchMap[ptId] || "";
  const setMemberSearch = (ptId, val) => setMemberSearchMap(prev => ({ ...prev, [ptId]: val }));

  function getView(ptId) { return ptView[ptId] || "rankings"; }
  function setView(ptId, v) { setPtView(prev => ({ ...prev, [ptId]: v })); }

  function getContributions(ptId) {
    return (data.rawContributions || [])
      .filter(c => c.payment_type_id === ptId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  function triggerPrint(target) {
    const pts = target === "all" ? data.paymentTypes : data.paymentTypes.filter(p => p.id === target);
    const categoriesHtml = pts.map(pt => {
      const pct = pt.goal > 0 ? Math.min(100, Math.round((pt.total / pt.goal) * 100)) : 0;
      const goalBar = pt.goal > 0 ? `
        <div class="goal-bg"><div class="goal-fill" style="width:${pct}%;background:${pt.color}"></div></div>
        <p class="goal-meta">Goal: ${currency} ${Number(pt.goal).toLocaleString()} &nbsp;·&nbsp; ${pct}% reached</p>` : "";
      const rows = pt.members.map((m, ri) => {
        const share = Math.round((m.total / pt.total) * 100);
        const rank = ri === 0 ? "1st" : ri === 1 ? "2nd" : ri === 2 ? "3rd" : `${ri+1}th`;
        const rankCls = ri===0?"rank-1":ri===1?"rank-2":ri===2?"rank-3":"";
        return `<tr>
          <td class="${rankCls}">${rank}</td>
          <td style="font-weight:500">${m.name}</td>
          <td class="amt">${currency} ${Number(m.total).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
          <td class="amt" style="color:#6b7280">${share}%</td>
        </tr>`;
      }).join("");
      return `
        <div style="margin-bottom:28px;page-break-inside:avoid">
          <div class="section-head">
            <div class="section-bar"></div>
            <h2><span style="display:inline-block;width:9px;height:9px;border-radius:3px;background:${pt.color};margin-right:7px;vertical-align:middle"></span>${pt.name}${pt.description?` <span style="font-weight:400;color:#6b7280;font-size:10px">— ${pt.description}</span>`:""}</h2>
            <span style="margin-left:auto;font-size:12px;font-weight:700;color:#111827">${currency} ${Number(pt.total).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
          </div>
          ${goalBar}
          ${pt.members.length > 0 ? `
          <table>
            <thead><tr><th>Rank</th><th>Member</th><th class="amt">Amount</th><th class="amt">Share</th></tr></thead>
            <tbody>${rows}</tbody>
            <tfoot><tr><td colspan="2">Total contributions</td><td class="amt">${currency} ${Number(pt.total).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</td><td class="amt">100%</td></tr></tfoot>
          </table>` : `<p style="color:#6b7280;font-size:12px;padding:8px 0">No contributions recorded.</p>`}
        </div>`;
    }).join("");

    const grandTotal = target === "all"
      ? `<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:14px 18px;display:flex;justify-content:space-between;align-items:center;margin-top:8px">
           <span style="font-size:12px;color:#374151">Grand Total across all categories</span>
           <span style="font-size:16px;font-weight:800;color:#1d4ed8">${currency} ${data.paymentTypes.reduce((s,p)=>s+Number(p.total),0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
         </div>` : "";

    const ptTitle = target==="all" ? "All Payment Categories" : `${data.paymentTypes.find(p=>p.id===target)?.name||""} — Rankings`;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Payment Report</title>
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
        <div class="doc-title">${ptTitle}</div>
        <div class="doc-meta">
          <span>${new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})}</span>
          <span>Unified Finance</span>
        </div>
      </div>
      <div class="body-wrap">
        ${categoriesHtml}
        ${grandTotal}
        <div class="doc-footer">
          <span>${data.org?.name||""} · Confidential</span>
          <span>Payment Report · Unified Finance</span>
        </div>
      </div>
    </body></html>`;

    const w = window.open("", "_blank", "width=900,height=700");
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 300);
  }

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:20, gap:10 }}>
        <Btn t={t} onClick={()=>triggerPrint("all")} variant="secondary">🖨 Print All</Btn>
        {!isViewingPastYear && <>
          <Btn t={t} onClick={()=>{ if(data.paymentTypes.length===0){toast("Create a payment type first.");return;} openModal("addContribution"); }} variant="secondary">+ Record Payment</Btn>
          <Btn t={t} onClick={()=>{ setBulkContributions({ payment_type_id:"", note:"", date:new Date().toISOString().slice(0,10), amounts:{} }); openModal("bulkContribution"); }} variant="secondary">+ Bulk Add</Btn>
          {isSuperAdmin&&<Btn t={t} onClick={()=>openModal("addPaymentType")}>+ New Payment Type</Btn>}
        </>}
      </div>

      {data.paymentTypes.length>0&&(
        <ChartCard title="Payment Breakdown" subtitle="Distribution across all types" t={t} style={{ marginBottom:20, animation:"slideUp 0.3s ease" }}>
          <DonutChart data={data.paymentTypes.map(pt=>({name:pt.name,value:pt.total,color:pt.color}))} fmt={fmt} t={t} size={200}/>
        </ChartCard>
      )}

      {data.paymentTypes.length===0
        ? <Card t={t}><EmptyState message="No payment types yet." action={isSuperAdmin?<Btn t={t} onClick={()=>openModal("addPaymentType")}>Create First Payment Type</Btn>:null} t={t}/></Card>
        : <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            {data.paymentTypes.map((pt,i)=>{
              const pct=pt.goal>0?Math.min(Math.round((pt.total/pt.goal)*100),100):0;
              const isExpanded = expandedPaymentType===pt.id;
              const view = getView(pt.id);
              const contributions = getContributions(pt.id);

              return (
                <div key={pt.id} style={{ background:t.surface, borderRadius:24, border:`1px solid ${t.border}`, boxShadow:t.cardShadow, overflow:"hidden", animation:`slideUp 0.3s ease ${i*0.06}s both` }}>

                  {/* Header */}
                  <div className="card-hover" onClick={()=>setExpandedPaymentType(isExpanded?null:pt.id)} style={{ padding:"28px 32px", cursor:"pointer" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:pt.goal>0?20:0 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                        <div style={{ width:48, height:48, borderRadius:14, background:`${pt.color}18`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                          <div style={{ width:16, height:16, borderRadius:"50%", background:pt.color, boxShadow:`0 0 8px ${pt.color}88` }}/>
                        </div>
                        <div>
                          <h4 style={{ fontSize:17, fontWeight:600, margin:0, color:t.text }}>{pt.name}</h4>
                          {pt.description&&<p style={{ fontSize:12, color:t.textSub, margin:"2px 0 0" }}>{pt.description}</p>}
                          <p style={{ fontSize:11, color:t.textMuted, margin:"4px 0 0" }}>{pt.members.length} contributor{pt.members.length!==1?"s":""} · click to {isExpanded?"hide":"view"}</p>
                        </div>
                      </div>
                      <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:8 }}>
                        <p style={{ fontSize:28, fontWeight:700, letterSpacing:"-1px", margin:0, color:t.text }}>{fmt(pt.total)}</p>
                        {pt.goal>0&&<p style={{ fontSize:12, color:t.textSub, margin:0 }}>of {fmt(pt.goal)} goal</p>}
                        {isSuperAdmin&&(
                          <div style={{ display:"flex", gap:6 }} onClick={e=>e.stopPropagation()}>
                            <Btn size="sm" variant="secondary" t={t} onClick={()=>{setEditingPaymentType({...pt,goal:pt.goal||""});openModal("editPaymentType");}}>Edit</Btn>
                            <Btn size="sm" variant="danger" t={t} onClick={()=>handleDeletePaymentType(pt.id)}>Delete</Btn>
                          </div>
                        )}
                      </div>
                    </div>
                    {pt.goal>0&&(
                      <>
                        <div style={{ height:8, background:t.surfaceAlt, borderRadius:99, overflow:"hidden", marginBottom:10 }}>
                          <div style={{ height:"100%", width:`${pct}%`, background:pt.color, borderRadius:99, transition:"width 0.8s cubic-bezier(0.4,0,0.2,1)", boxShadow:`0 0 8px ${pt.color}55` }}/>
                        </div>
                        <p style={{ fontSize:12, color:t.textSub, margin:0 }}>{pt.goal-pt.total>=0?<span style={{ color:"#34C759", fontWeight:600 }}>{fmt(pt.goal-pt.total)} remaining</span>:<span style={{ color:t.negative, fontWeight:600 }}>{fmt(pt.total-pt.goal)} over goal</span>} · {pct}% reached</p>
                      </>
                    )}
                  </div>

                  {/* Expanded panel */}
                  {isExpanded&&(
                    <div style={{ borderTop:`1px solid ${t.border}`, background:t.surfaceAlt, animation:"slideUp 0.2s ease" }}>

                      {/* Toggle bar */}
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 32px", borderBottom:`1px solid ${t.border}` }}>
                        <div style={{ display:"flex", background:t.surface, borderRadius:10, overflow:"hidden", border:`1px solid ${t.border}` }}>
                          {["rankings","contributions"].map(v=>(
                            <button key={v} onClick={e=>{e.stopPropagation();setView(pt.id,v);}}
                              style={{ padding:"6px 14px", fontSize:12, fontWeight:600, border:"none", cursor:"pointer", fontFamily:"inherit",
                                background:view===v?t.accent:"transparent", color:view===v?"white":t.textSub, transition:"all 0.15s" }}>
                              {v==="rankings"?"🏆 Rankings":"📋 Contributions"}
                            </button>
                          ))}
                        </div>
                        <Btn size="sm" variant="secondary" t={t} onClick={e=>{e.stopPropagation();triggerPrint(pt.id);}}>🖨 Print</Btn>
                      </div>

                      {/* Member search */}
                      <div style={{ padding:"0 32px 16px" }} onClick={e=>e.stopPropagation()}>
                        <input
                          type="text"
                          placeholder="Search members..."
                          value={getMemberSearch(pt.id)}
                          onChange={e=>setMemberSearch(pt.id, e.target.value)}
                          style={{ width:"100%", padding:"9px 14px", borderRadius:10, border:`1px solid ${t.border}`, background:t.inputBg, color:t.text, fontSize:13, outline:"none", boxSizing:"border-box" }}
                        />
                      </div>

                      {/* Rankings */}
                      {view==="rankings"&&(
                        <div style={{ padding:"20px 32px" }}>
                          {(() => {
                            // Keep original index (ri) so rankings don't re-number when filtering
                            const memberSearch = getMemberSearch(pt.id);
                            const filteredMembers = memberSearch.trim()
                              ? pt.members.map((m, ri) => ({ m, ri })).filter(({ m }) => m.name.toLowerCase().includes(memberSearch.toLowerCase()))
                              : pt.members.map((m, ri) => ({ m, ri }));
                            return filteredMembers.length===0
                              ? <p style={{ fontSize:13, color:t.textSub, margin:0, textAlign:"center", padding:"8px 0" }}>{memberSearch ? `No members matching "${memberSearch}".` : "No contributions recorded yet."}</p>
                              : <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                                  {filteredMembers.map(({ m, ri })=>{
                                  const pct2=Math.round((m.total/pt.total)*100);
                                  // Medal is based on original rank (ri) — always preserved regardless of filtering
                                  const medal = ri===0?{label:"1",bg:"linear-gradient(135deg,#FFD700,#FFA500)",color:"#7A4F00",shadow:"0 2px 8px rgba(255,180,0,0.5)"}
                                              : ri===1?{label:"2",bg:"linear-gradient(135deg,#C0C0C0,#A8A8A8)",color:"#3A3A3A",shadow:"0 2px 8px rgba(160,160,160,0.4)"}
                                              : ri===2?{label:"3",bg:"linear-gradient(135deg,#CD7F32,#A0522D)",color:"#fff",shadow:"0 2px 8px rgba(180,100,40,0.4)"}
                                              : null;
                                  return (
                                    <div key={m.id} style={{ animation:`slideIn 0.25s ease ${ri*0.04}s both` }}>
                                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
                                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                                          {medal
                                            ? <span style={{ width:22,height:22,borderRadius:"50%",background:medal.bg,boxShadow:medal.shadow,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:medal.color,flexShrink:0 }}>{medal.label}</span>
                                            : <span style={{ width:22,height:22,borderRadius:"50%",background:`${pt.color}22`,border:`1.5px solid ${pt.color}55`,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:pt.color,flexShrink:0 }}>{ri+1}</span>
                                          }
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
                          })()}
                        </div>
                      )}

                      {/* Contributions */}
                      {view==="contributions"&&(
                        <div style={{ padding:"20px 32px" }}>
                          {(() => {
                            const memberSearch = getMemberSearch(pt.id);
                            const filteredContribs = memberSearch.trim()
                              ? contributions.filter(c => (c.profiles?.full_name||"Unknown").toLowerCase().includes(memberSearch.toLowerCase()))
                              : contributions;
                            return filteredContribs.length===0
                              ? <p style={{ fontSize:13, color:t.textSub, margin:0, textAlign:"center", padding:"8px 0" }}>{memberSearch ? `No contributions matching "${memberSearch}".` : "No contributions recorded yet."}</p>
                              : <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
                                  {filteredContribs.map((c,ci)=>{
                                    const memberName = c.profiles?.full_name || "Unknown";
                                  const dateStr = c.created_at ? new Date(c.created_at).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}) : "";
                                  return (
                                    <div key={c.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 14px", borderRadius:10, background:ci%2===0?t.surface:"transparent", animation:`slideIn 0.2s ease ${ci*0.02}s both`, gap:10, flexWrap:"wrap" }}>
                                      <div style={{ display:"flex", alignItems:"center", gap:10, flex:1, minWidth:0 }}>
                                        <div style={{ width:8, height:8, borderRadius:"50%", background:pt.color, flexShrink:0 }}/>
                                        <div style={{ minWidth:0 }}>
                                          <p style={{ fontSize:13, fontWeight:600, margin:0, color:t.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{memberName}</p>
                                          <p style={{ fontSize:11, color:t.textSub, margin:"2px 0 0" }}>{dateStr}{c.note?` · ${c.note}`:""}</p>
                                        </div>
                                      </div>
                                      <div style={{ display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
                                        <span style={{ fontSize:14, fontWeight:700, color:pt.color }}>{fmt(c.amount)}</span>
                                        <div style={{ display:"flex", gap:5 }} onClick={e=>e.stopPropagation()}>
                                          <Btn size="sm" variant="secondary" t={t} onClick={()=>{
                                            setEditingContribution({
                                              id:c.id, member_name:memberName, amount:c.amount,
                                              payment_type_id:c.payment_type_id||"", note:c.note||"",
                                              date:c.created_at?c.created_at.slice(0,10):new Date().toISOString().slice(0,10),
                                            });
                                            openModal("editContribution");
                                          }}>Edit</Btn>
                                          {isSuperAdmin&&<Btn size="sm" variant="danger" t={t} onClick={()=>handleDeleteContribution(c)}>Delete</Btn>}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                  })}
                              </div>
                          })()}
                        </div>
                      )}

                    </div>
                  )}
                </div>
              );
            })}
          </div>
      }
    </div>
  );
}