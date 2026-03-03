import { Card, StatCard, ChartCard, Btn, EmptyState } from "../ui/index.jsx";
import { DonutChart, BarChart, LineChart, ContributorBars } from "../Charts.jsx";

export function OverviewTab({ data, t, fmt, monthlyData, timelineData, isSuperAdmin, openModal }) {
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
}
