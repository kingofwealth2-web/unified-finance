import { useState } from "react";
import { Card, ChartCard, Btn, Avatar, EmptyState } from "../ui/index.jsx";
import { ContributorBars } from "../Charts.jsx";

export function PeopleTab({
  return (
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
  )
  );
}
