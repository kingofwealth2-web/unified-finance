import { Card, Btn, EmptyState } from "../ui/index.jsx";
import { fyLabel } from "../../constants.js";

export function SettingsTab({ data, t, fmt, isSuperAdmin, openModal, setEditingPaymentType, handleDeletePaymentType, setEditingExpenseCategory, handleDeleteExpenseCategory }) {
  {activeTab==="settings" && isSuperAdmin && (
            <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
              <Card t={t} style={{ animation:"slideUp 0.3s ease" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
                  <div><h3 style={{ fontSize:15, fontWeight:700, margin:0, color:t.text }}>Organisation</h3><p style={{ fontSize:13, color:t.textSub, margin:"4px 0 0" }}>Your organisation's profile and preferences</p></div>
                  <Btn t={t} onClick={()=>openModal("editOrg")}>Edit</Btn>
                </div>
                {data.org&&(
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
                    {[{label:"Name",value:data.org.name},{label:"Currency",value:data.org.currency},{label:"Contact Email",value:data.org.contact_email||"—"},{label:"Contact Phone",value:data.org.contact_phone||"—"},{label:"Address",value:data.org.address||"—"},{label:"Financial Year",value:fyLabel(data.org.financial_year_start,data.org.financial_year_format)}].map(({label,value})=>(
                      <div key={label}><p style={{ fontSize:11, fontWeight:600, color:t.textSub, textTransform:"uppercase", letterSpacing:"0.06em", margin:"0 0 4px" }}>{label}</p><p style={{ fontSize:14, fontWeight:500, color:t.text, margin:0 }}>{value}</p></div>
                    ))}
                  </div>
                )}
              </Card>
  
              <Card t={t} style={{ animation:"slideUp 0.3s ease 0.05s both" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
                  <div><h3 style={{ fontSize:15, fontWeight:700, margin:0, color:t.text }}>System Users</h3><p style={{ fontSize:13, color:t.textSub, margin:"4px 0 0" }}>People who can log into {orgName}</p></div>
                  <Btn t={t} onClick={()=>openModal("addUser")}>+ Add User</Btn>
                </div>
                <div>{(data.users||[]).map((user,i)=>(
                  <div key={user.id} className="row-hover" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 8px", borderRadius:12, animation:`slideIn 0.3s ease ${i*0.05}s both` }}>
                    <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                      <Avatar name={user.full_name||user.email} size={40}/>
                      <div><p style={{ fontSize:14, fontWeight:600, margin:0, color:t.text }}>{user.full_name||"—"}</p><p style={{ fontSize:12, color:t.textSub, margin:0 }}>{user.email}</p></div>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <span style={{ fontSize:11, fontWeight:700, padding:"4px 10px", borderRadius:20, textTransform:"uppercase", letterSpacing:"0.04em", background:user.role==="super_admin"?`${t.accent}18`:"rgba(52,199,89,0.1)", color:user.role==="super_admin"?t.accent:"#34C759" }}>{user.role==="super_admin"?"Super Admin":"Admin"}</span>
                      {user.id===session?.user?.id&&<span style={{ fontSize:11, color:t.textSub, fontStyle:"italic" }}>You</span>}
                    </div>
                  </div>
                ))}</div>
              </Card>
  
              <Card t={t} style={{ animation:"slideUp 0.3s ease 0.1s both" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
                  <div><h3 style={{ fontSize:15, fontWeight:700, margin:0, color:t.text }}>Payment Types</h3><p style={{ fontSize:13, color:t.textSub, margin:"4px 0 0" }}>Categories people can contribute towards</p></div>
                  <Btn t={t} onClick={()=>openModal("addPaymentType")}>+ New Type</Btn>
                </div>
                {data.paymentTypes.length===0?<EmptyState message="No payment types yet." t={t}/>:
                  <div>{data.paymentTypes.map((pt,i)=>(
                    <div key={pt.id} className="row-hover" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 8px", borderRadius:12, animation:`slideIn 0.3s ease ${i*0.05}s both` }}>
                      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                        <div style={{ width:10, height:10, borderRadius:3, background:pt.color, flexShrink:0, boxShadow:`0 0 6px ${pt.color}66` }}/>
                        <div><p style={{ fontSize:14, fontWeight:600, margin:0, color:t.text }}>{pt.name}</p>{pt.description&&<p style={{ fontSize:12, color:t.textSub, margin:0 }}>{pt.description}</p>}</div>
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <div style={{ textAlign:"right", marginRight:4 }}><p style={{ fontSize:14, fontWeight:600, margin:0, color:t.text }}>{fmt(pt.total)}</p>{pt.goal>0&&<p style={{ fontSize:11, color:t.textSub, margin:0 }}>Goal: {fmt(pt.goal)}</p>}</div>
                        <Btn size="sm" variant="secondary" t={t} onClick={()=>{setEditingPaymentType({...pt,goal:pt.goal||""});openModal("editPaymentType");}}>Edit</Btn>
                        <Btn size="sm" variant="danger" t={t} onClick={()=>handleDeletePaymentType(pt.id)}>Delete</Btn>
                      </div>
                    </div>
                  ))}</div>
                }
              </Card>
  
              <Card t={t} style={{ animation:"slideUp 0.3s ease 0.15s both" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
                  <div><h3 style={{ fontSize:15, fontWeight:700, margin:0, color:t.text }}>Expense Categories</h3><p style={{ fontSize:13, color:t.textSub, margin:"4px 0 0" }}>Categories for tracking organisational spending</p></div>
                  <Btn t={t} onClick={()=>openModal("addExpenseCategory")}>+ New Category</Btn>
                </div>
                {data.expenses.length===0?<EmptyState message="No expense categories yet." t={t}/>:
                  <div>{data.expenses.map((exp,i)=>(
                    <div key={exp.id} className="row-hover" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 8px", borderRadius:12, animation:`slideIn 0.3s ease ${i*0.05}s both` }}>
                      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                        <div style={{ width:10, height:10, borderRadius:3, background:exp.color, flexShrink:0, boxShadow:`0 0 6px ${exp.color}66` }}/>
                        <div><div style={{ display:chr(34)+chr(102)+chr(108)+chr(101)+chr(120)+chr(34), alignItems:chr(34)+chr(99)+chr(101)+chr(110)+chr(116)+chr(101)+chr(114)+chr(34), gap:6 }}><p style={{ fontSize:14, fontWeight:600, margin:0, color:t.text }}>{exp.label}</p>{exp.budget>0&&Math.round((exp.amount/exp.budget)*100)>=100&&<span style={{ fontSize:10, fontWeight:700, padding:chr(34)+chr(50)+chr(112)+chr(120)+chr(32)+chr(54)+chr(112)+chr(120)+chr(34), borderRadius:5, background:chr(34)+chr(114)+chr(103)+chr(98)+chr(97)+chr(40)+chr(50)+chr(53)+chr(53)+chr(44)+chr(53)+chr(53)+chr(44)+chr(57)+chr(53)+chr(44)+chr(48)+chr(46)+chr(49)+chr(50)+chr(41)+chr(34), color:chr(34)+chr(35)+chr(70)+chr(70)+chr(51)+chr(55)+chr(53)+chr(70)+chr(34) }}>OVER BUDGET</span>}</div>{exp.description&&<p style={{ fontSize:12, color:t.textSub, margin:0 }}>{exp.description}</p>}</div>
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <div style={{ textAlign:"right", marginRight:4 }}><p style={{ fontSize:14, fontWeight:600, margin:0, color:t.text }}>{fmt(exp.amount)} spent</p>{exp.budget>0&&<p style={{ fontSize:11, color:t.textSub, margin:0 }}>Budget: {fmt(exp.budget)}</p>}</div>
                        <Btn size="sm" variant="secondary" t={t} onClick={()=>{setEditingExpenseCategory({...exp,budget:exp.budget||"",name:exp.label});openModal("editExpenseCategory");}}>Edit</Btn>
                        <Btn size="sm" variant="danger" t={t} onClick={()=>handleDeleteExpenseCategory(exp.id)}>Delete</Btn>
                      </div>
                    </div>
                  ))}</div>
                }
              </Card>
            </div>
          )}
  
          </div>
        </div>
}
