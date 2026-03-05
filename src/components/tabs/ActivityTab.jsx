import { createPortal } from "react-dom";
import { Card, Btn, EmptyState } from "../ui/index.jsx";

export function ActivityTab({
  data, t, fmt, isSuperAdmin, openModal,
  activitySearch, setActivitySearch,
  activityFilter, setActivityFilter,
  activityDateFrom, setActivityDateFrom,
  activityDateTo, setActivityDateTo,
  activityPage, setActivityPage,
  showPrintView, setShowPrintView,
  exportFinancialReport, orgName,
  handleDeleteContribution, handleDeleteExpenseEntry,
  setEditingContribution, setEditingExpenseEntry,
  ACTIVITY_PAGE_SIZE,
}) {
  const iStyle = (t) => ({ width:"100%", padding:"11px 14px", borderRadius:10, border:`1px solid ${t.borderStrong}`, fontSize:14, color:t.text, background:t.inputBg, outline:"none", boxSizing:"border-box", fontFamily:"inherit", transition:"border-color 0.15s" });
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
                  ...(data.rawIncome||[]).map(i=>({
                    id:`i-${i.id}`, name:i.source||"Other Income",
                    action:i.label,
                    amount:`+${fmtLocal(i.amount)}`, rawAmount:Number(i.amount),
                    time:new Date(i.created_at).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}),
                    date:i.created_at, positive:true,
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
      
                if (showPrintView) return createPortal(
                  <div style={{ position:"fixed", inset:0, background:"white", zIndex:9999, overflowY:"auto", padding:"24px" }}>
                    <div className="no-print" style={{ marginBottom:20, display:"flex", gap:10 }}>
                      <Btn t={t} onClick={()=>{ window.print(); }} variant="secondary">🖨 Print</Btn>
                      <Btn t={t} onClick={()=>setShowPrintView(false)} variant="secondary">← Back</Btn>
                    </div>
                    <div id="print-area" style={{ background:"white", color:"#1C1C1E", padding:"24px 20px", borderRadius:16, border:"1px solid #E5E5EA", maxWidth:900, margin:"0 auto" }}>
                      <div style={{ borderBottom:"2px solid #1C1C1E", paddingBottom:16, marginBottom:28 }}>
                        <h1 style={{ fontSize:22, fontWeight:700, margin:"0 0 4px" }}>{orgName} — Financial Report</h1>
                        <p style={{ fontSize:13, color:"#636366", margin:0 }}>
                          {hasDateFilter
                            ? `Period: ${activityDateFrom||"All time"} → ${activityDateTo||"Today"}`
                            : `Generated ${new Date().toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})}`}
                          {" · "}{filtered.length} transactions
                        </p>
                      </div>
                      <div className="grid-3 print-stats" style={{ marginBottom:28 }}>
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
                      <div style={{ overflowX:"auto", WebkitOverflowScrolling:"touch" }}>
                      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13, minWidth:500 }}>
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
                      </div>
                      <p style={{ fontSize:11, color:"#AEAEB2", marginTop:24, borderTop:"1px solid #E5E5EA", paddingTop:12 }}>
                        Generated by {orgName} · {new Date().toLocaleString()}
                      </p>
                    </div>
                  </div>,
                  document.body
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
}