import { Card, ChartCard, Btn, EmptyState } from "../ui/index.jsx";
import { DonutChart } from "../Charts.jsx";

export function PaymentTypesTab({
  data, t, fmt, isSuperAdmin, openModal,
  expandedPaymentType, setExpandedPaymentType,
  setEditingPaymentType, handleDeletePaymentType,
}) {
  const currency = data.org?.currency || "";

  function triggerPrint(target) {
    const pts = target === "all" ? data.paymentTypes : data.paymentTypes.filter(p => p.id === target);

    const categoriesHtml = pts.map(pt => {
      const pct = pt.goal > 0 ? Math.min(100, Math.round((pt.total / pt.goal) * 100)) : 0;
      const goalBar = pt.goal > 0 ? `
        <div style="height:6px;background:#E5E5EA;border-radius:99px;overflow:hidden;margin-bottom:6px">
          <div style="height:100%;width:${pct}%;background:${pt.color};border-radius:99px"></div>
        </div>
        <p style="font-size:11px;color:#666;margin:0 0 12px">Goal: ${currency} ${Number(pt.goal).toLocaleString()} · ${pct}% reached</p>` : "";
      const rows = pt.members.map((m, ri) => {
        const share = Math.round((m.total / pt.total) * 100);
        const rank = ri === 0 ? "1st" : ri === 1 ? "2nd" : ri === 2 ? "3rd" : `${ri+1}th`;
        return `<tr style="border-bottom:1px solid #F0F0F5;background:${ri%2===0?"#FAFAFA":"white"}">
          <td style="padding:9px 12px;font-weight:700;color:${ri===0?"#B8860B":ri===1?"#888":ri===2?"#8B4513":"#999"}">${rank}</td>
          <td style="padding:9px 12px;font-weight:500">${m.name}</td>
          <td style="padding:9px 12px;text-align:right;font-weight:600">${currency} ${Number(m.total).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
          <td style="padding:9px 12px;text-align:right;color:#666">${share}%</td>
        </tr>`;
      }).join("");
      return `
        <div style="margin-bottom:32px;page-break-inside:avoid">
          <div style="display:flex;justify-content:space-between;align-items:baseline;border-bottom:1px solid #E5E5EA;padding-bottom:8px;margin-bottom:10px">
            <div><span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:${pt.color};margin-right:8px"></span>
            <strong style="font-size:16px">${pt.name}</strong>${pt.description?`<span style="font-size:12px;color:#666;margin-left:8px">${pt.description}</span>`:""}</div>
            <strong style="font-size:16px">${currency} ${Number(pt.total).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</strong>
          </div>
          ${goalBar}
          ${pt.members.length > 0 ? `
          <table style="width:100%;border-collapse:collapse;font-size:13px">
            <thead><tr style="background:#F5F5F7">
              <th style="padding:8px 12px;text-align:left;font-size:11px;color:#666;text-transform:uppercase">Rank</th>
              <th style="padding:8px 12px;text-align:left;font-size:11px;color:#666;text-transform:uppercase">Member</th>
              <th style="padding:8px 12px;text-align:right;font-size:11px;color:#666;text-transform:uppercase">Amount</th>
              <th style="padding:8px 12px;text-align:right;font-size:11px;color:#666;text-transform:uppercase">Share</th>
            </tr></thead>
            <tbody>${rows}</tbody>
            <tfoot><tr style="background:#F5F5F7;font-weight:700">
              <td colspan="2" style="padding:9px 12px">Total</td>
              <td style="padding:9px 12px;text-align:right">${currency} ${Number(pt.total).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
              <td style="padding:9px 12px;text-align:right">100%</td>
            </tr></tfoot>
          </table>` : `<p style="color:#666;font-size:13px">No contributions recorded.</p>`}
        </div>`;
    }).join("");

    const grandTotal = target === "all"
      ? `<div style="border-top:2px solid #1C1C1E;padding-top:12px;display:flex;justify-content:space-between;font-size:13px;margin-top:8px">
           <span>Total across all categories: <strong>${currency} ${data.paymentTypes.reduce((s,p)=>s+Number(p.total),0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</strong></span>
           <span style="color:#666">Printed ${new Date().toLocaleString()}</span>
         </div>` : "";

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Payment Report</title>
      <style>body{font-family:-apple-system,sans-serif;color:#1C1C1E;padding:20px;margin:0}@page{margin:20mm}</style>
      </head><body>
      <div style="border-bottom:2px solid #1C1C1E;padding-bottom:12px;margin-bottom:24px">
        <h1 style="font-size:22px;font-weight:700;margin:0 0 4px">${data.org?.name||""}</h1>
        <p style="font-size:13px;color:#666;margin:0">${target==="all"?"All Payment Categories — Full Report":`Rankings: ${data.paymentTypes.find(p=>p.id===target)?.name||""}`} · ${new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})}</p>
      </div>
      ${categoriesHtml}
      ${grandTotal}
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
                    <Btn t={t} onClick={()=>openModal("addContribution")} variant="secondary">+ Record Payment</Btn>
                    <Btn t={t} onClick={()=>openModal("bulkContribution")} variant="secondary">+ Bulk Add</Btn>
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
                                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", margin:"0 0 14px" }}>
                                      <p style={{ fontSize:12, fontWeight:700, color:t.textSub, textTransform:"uppercase", letterSpacing:"0.06em", margin:0 }}>Member Rankings</p>
                                      <Btn size="sm" variant="secondary" t={t} onClick={e=>{e.stopPropagation();triggerPrint(pt.id);}}>🖨 Print Rankings</Btn>
                                    </div>
                                    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                                      {pt.members.map((m,ri)=>{
                                        const pct2=Math.round((m.total/pt.total)*100);
                                        const medal = ri===0 ? { label:"1", bg:"linear-gradient(135deg,#FFD700,#FFA500)", color:"#7A4F00", shadow:"0 2px 8px rgba(255,180,0,0.5)" } : ri===1 ? { label:"2", bg:"linear-gradient(135deg,#C0C0C0,#A8A8A8)", color:"#3A3A3A", shadow:"0 2px 8px rgba(160,160,160,0.4)" } : ri===2 ? { label:"3", bg:"linear-gradient(135deg,#CD7F32,#A0522D)", color:"#fff", shadow:"0 2px 8px rgba(180,100,40,0.4)" } : null;
                                        return (
                                          <div key={m.id} style={{ animation:`slideIn 0.25s ease ${ri*0.04}s both` }}>
                                            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
                                              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                                                {medal ? <span style={{ width:22, height:22, borderRadius:"50%", background:medal.bg, boxShadow:medal.shadow, display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:800, color:medal.color, flexShrink:0, letterSpacing:"-0.3px" }}>{medal.label}</span> : <span style={{ width:22, height:22, borderRadius:"50%", background:`${pt.color}22`, border:`1.5px solid ${pt.color}55`, display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:700, color:pt.color, flexShrink:0 }}>{ri+1}</span>}
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
  );
}