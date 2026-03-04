import { Card, ChartCard, Btn, EmptyState } from "../ui/index.jsx";
import { DonutChart } from "../Charts.jsx";

export function PaymentTypesTab({
  data, t, fmt, isSuperAdmin, openModal,
  expandedPaymentType, setExpandedPaymentType,
  setEditingPaymentType, handleDeletePaymentType,
}) {
  return (
    <div>
                  <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:20, gap:10 }}>
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
                                    <p style={{ fontSize:12, fontWeight:700, color:t.textSub, textTransform:"uppercase", letterSpacing:"0.06em", margin:"0 0 14px" }}>Member Rankings</p>
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