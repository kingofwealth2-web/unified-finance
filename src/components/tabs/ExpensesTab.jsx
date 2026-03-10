import { useState } from "react";
import { Card, ChartCard, Btn, EmptyState } from "../ui/index.jsx";
import { DonutChart } from "../Charts.jsx";

export function ExpensesTab({
  data, t, fmt, isSuperAdmin, openModal,
  setEditingExpenseCategory, handleDeleteExpenseCategory,
  setEditingExpenseEntry, handleDeleteExpenseEntry,
  isViewingPastYear,
}) {
  const [expandedCat, setExpandedCat] = useState(null);

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:20, gap:10 }}>
        {!isViewingPastYear && (
          <Btn t={t} onClick={()=>openModal("addExpense")} variant="secondary">+ Record Expense</Btn>
        )}
        {isSuperAdmin && !isViewingPastYear && (
          <Btn t={t} onClick={()=>openModal("addExpenseCategory")}>+ New Category</Btn>
        )}
      </div>

      {data.expenses.length > 0 && (
        <ChartCard title="Expense Breakdown" subtitle="Distribution across categories" t={t} style={{ marginBottom:20, animation:"slideUp 0.3s ease" }}>
          <DonutChart data={data.expenses.map(e=>({name:e.label,value:e.amount,color:e.color}))} fmt={fmt} t={t} size={200}/>
        </ChartCard>
      )}

      {data.expenses.length === 0
        ? <Card t={t}><EmptyState message="No expense categories yet." action={isSuperAdmin && !isViewingPastYear ? <Btn t={t} onClick={()=>openModal("addExpenseCategory")}>Create First Category</Btn> : null} t={t}/></Card>
        : (
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            {data.expenses.map((exp, i) => {
              const pct = exp.budget > 0 ? Math.min(Math.round((exp.amount / exp.budget) * 100), 100) : 0;
              const isExpanded = expandedCat === exp.id;
              const catExpenses = (data.rawExpenses||[]).filter(e => e.category_id === exp.id);

              return (
                <div key={exp.id} className="card-hover" style={{ background:t.surface, borderRadius:24, padding:"28px 32px", border:`1px solid ${t.border}`, boxShadow:t.cardShadow, overflow:"hidden", animation:`slideUp 0.3s ease ${i*0.06}s both` }}>
                  {/* Category header */}
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:exp.budget>0?16:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                      <div style={{ width:48, height:48, borderRadius:14, background:`${exp.color}18`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <div style={{ width:16, height:16, borderRadius:"50%", background:exp.color, boxShadow:`0 0 8px ${exp.color}88` }}/>
                      </div>
                      <div>
                        <h4 style={{ fontSize:17, fontWeight:600, margin:0, color:t.text }}>{exp.label}</h4>
                        {exp.description && <p style={{ fontSize:12, color:t.textSub, margin:"2px 0 0" }}>{exp.description}</p>}
                        {exp.budget > 0 && <p style={{ fontSize:12, color:t.textSub, margin:"2px 0 0" }}>{pct}% of budget used</p>}
                      </div>
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:8 }}>
                      <p style={{ fontSize:28, fontWeight:700, letterSpacing:"-1px", margin:0, color:t.text }}>{fmt(exp.amount)}</p>
                      {exp.budget > 0 && <p style={{ fontSize:12, color:t.textSub, margin:0 }}>of {fmt(exp.budget)} budget</p>}
                      <div style={{ display:"flex", gap:6 }}>
                        {catExpenses.length > 0 && (
                          <Btn size="sm" variant="secondary" t={t} onClick={()=>setExpandedCat(isExpanded ? null : exp.id)}>
                            {isExpanded ? "Hide" : `${catExpenses.length} expense${catExpenses.length!==1?"s":""} ▾`}
                          </Btn>
                        )}
                        {isSuperAdmin && !isViewingPastYear && (
                          <>
                            <Btn size="sm" variant="secondary" t={t} onClick={()=>{setEditingExpenseCategory({...exp,budget:exp.budget||"",name:exp.label});openModal("editExpenseCategory");}}>Edit</Btn>
                            <Btn size="sm" variant="danger" t={t} onClick={()=>handleDeleteExpenseCategory(exp.id)}>Delete</Btn>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Budget bar */}
                  {exp.budget > 0 && (
                    <>
                      <div style={{ height:8, background:t.surfaceAlt, borderRadius:99, overflow:"hidden", marginBottom:10 }}>
                        <div style={{ height:"100%", width:`${pct}%`, background:exp.color, borderRadius:99, transition:"width 0.8s cubic-bezier(0.4,0,0.2,1)", boxShadow:`0 0 8px ${exp.color}55` }}/>
                      </div>
                      <p style={{ fontSize:12, color:t.textSub, margin:"0 0 0" }}>
                        {exp.budget-exp.amount>=0
                          ?<span style={{ color:"#34C759", fontWeight:600 }}>{fmt(exp.budget-exp.amount)} remaining</span>
                          :<span style={{ color:t.negative, fontWeight:600 }}>{fmt(exp.amount-exp.budget)} over budget</span>}
                      </p>
                    </>
                  )}

                  {/* Individual expense records */}
                  {isExpanded && catExpenses.length > 0 && (
                    <div style={{ marginTop:20, borderTop:`1px solid ${t.border}`, paddingTop:16 }}>
                      <p style={{ fontSize:12, fontWeight:600, color:t.textSub, margin:"0 0 12px", textTransform:"uppercase", letterSpacing:"0.06em" }}>
                        Individual Records
                      </p>
                      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                        {catExpenses.map((entry, ei) => (
                          <div key={entry.id} className="row-hover" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 12px", borderRadius:10, border:`1px solid ${t.border}`, background:t.surfaceAlt, flexWrap:"wrap", gap:8, animation:`slideIn 0.2s ease ${ei*0.04}s both` }}>
                            <div style={{ flex:1, minWidth:0 }}>
                              <p style={{ fontSize:13, fontWeight:600, margin:0, color:t.text }}>{entry.label || "Expense"}</p>
                              <p style={{ fontSize:11, color:t.textSub, margin:"2px 0 0" }}>
                                {new Date(entry.created_at).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}
                                {entry.note && ` · ${entry.note}`}
                              </p>
                            </div>
                            <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
                              <span style={{ fontSize:14, fontWeight:700, color:"#FF375F" }}>-{fmt(entry.amount)}</span>
                              {!isViewingPastYear && (
                                <>
                                  <Btn size="sm" variant="secondary" t={t} onClick={()=>{setEditingExpenseEntry({id:entry.id,label:entry.label,amount:entry.amount,category_id:entry.category_id||"",date:entry.created_at?entry.created_at.slice(0,10):new Date().toISOString().slice(0,10)});openModal("editExpenseEntry");}}>Edit</Btn>
                                  <Btn size="sm" variant="danger" t={t} onClick={()=>handleDeleteExpenseEntry(entry)}>Del</Btn>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      }
    </div>
  );
}
