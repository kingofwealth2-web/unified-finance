import { useState } from "react";
import { createPortal } from "react-dom";
import { Modal, Field, Input, Textarea, Select, Btn, ColorPicker } from "../ui/index.jsx";
import { CURRENCIES } from "../../constants.js";

export function Modals({
  modal, closeModal, t, data, orgForm, setOrgForm, formLoading, formError,
  handleSaveOrg,
  newUser, setNewUser, handleAddUser,
  newPerson, setNewPerson, handleAddPerson,
  newContribution, setNewContribution, handleAddContribution,
  bulkContributions, setBulkContributions, handleBulkAddContributions,
  newExpense, setNewExpense, handleAddExpense,
  newPaymentType, setNewPaymentType, handleAddPaymentType,
  newExpenseCategory, setNewExpenseCategory, handleAddExpenseCategory,
  editingPaymentType, setEditingPaymentType, handleEditPaymentType,
  editingExpenseCategory, setEditingExpenseCategory, handleEditExpenseCategory,
  editingContribution, setEditingContribution, handleEditContribution,
  editingExpenseEntry, setEditingExpenseEntry, handleEditExpenseEntry,
  editingPerson, setEditingPerson, handleEditPerson,
  newIncome, setNewIncome, handleAddIncome,
  editingIncomeSource, setEditingIncomeSource, handleEditIncome,
  fmt,
}) {
  const [memberSearch, setMemberSearch] = useState("");
  const [bulkSearch, setBulkSearch] = useState("");
  const iStyle = (t) => ({ width:"100%", padding:"11px 14px", borderRadius:10, border:`1px solid ${t.borderStrong}`, fontSize:14, color:t.text, background:t.inputBg, outline:"none", boxSizing:"border-box", fontFamily:"inherit", transition:"border-color 0.15s" });
  const filteredMembers = (data.allPeople||[]).filter(p =>
    p.role === "member" &&
    memberSearch !== "" &&
    p.full_name?.toLowerCase().includes(memberSearch.toLowerCase())
  );

  return (
    <>
      {/* ── MODALS ── */}
              {modal==="editOrg"&&orgForm&&(
                <Modal title="Organisation Settings" onClose={closeModal} t={t}>
                  <form onSubmit={handleSaveOrg}>
                    <Field label="Organisation Name" t={t}><Input t={t} value={orgForm.name} onChange={e=>setOrgForm({...orgForm,name:e.target.value})} required/></Field>
                    <Field label="Address" t={t}><Textarea t={t} value={orgForm.address} onChange={e=>setOrgForm({...orgForm,address:e.target.value})} placeholder="Street, City, Country"/></Field>
                    <div className="grid-2" style={{ gap:12 }}>
                      <Field label="Contact Email" t={t}><Input t={t} type="email" value={orgForm.contact_email} onChange={e=>setOrgForm({...orgForm,contact_email:e.target.value})} placeholder="info@org.com"/></Field>
                      <Field label="Contact Phone" t={t}><Input t={t} value={orgForm.contact_phone} onChange={e=>setOrgForm({...orgForm,contact_phone:e.target.value})} placeholder="+1 234 567 8900"/></Field>
                    </div>
                    <Field label="Currency" t={t}><Select t={t} value={orgForm.currency} onChange={e=>setOrgForm({...orgForm,currency:e.target.value})}>{CURRENCIES.map(c=><option key={c} value={c}>{c}</option>)}</Select></Field>
                    <div className="grid-2" style={{ gap:12 }}>
                      <Field label="Financial Year Start" t={t}><Input t={t} type="number" value={orgForm.financial_year_start} onChange={e=>setOrgForm({...orgForm,financial_year_start:e.target.value})} placeholder="2026"/></Field>
                      <Field label="Year Format" t={t}><Select t={t} value={orgForm.financial_year_format} onChange={e=>setOrgForm({...orgForm,financial_year_format:e.target.value})}><option value="single">Single (2026)</option><option value="split">Split (2026/2027)</option></Select></Field>
                    </div>
                    <Field label="Opening Balance" t={t}>
                      <Input t={t} type="number" min="0" step="0.01" value={orgForm.opening_balance||""} onChange={e=>setOrgForm({...orgForm,opening_balance:e.target.value})} placeholder="0.00"/>
                      <p style={{ fontSize:12, color:t.textSub, margin:"5px 0 0" }}>Any funds your organisation held before using this app.</p>
                    </Field>
                    {formError&&<p style={{ fontSize:13, color:"#FF375F", marginBottom:16 }}>{formError}</p>}
                    <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8 }}>
                      <Btn variant="secondary" t={t} type="button" onClick={closeModal}>Cancel</Btn>
                      <Btn t={t} type="submit" disabled={formLoading}>{formLoading?"Saving...":"Save Changes"}</Btn>
                    </div>
                  </form>
                </Modal>
              )}
              {modal==="addUser"&&(
                <Modal title="Add New User" onClose={closeModal} t={t}>
                  <form onSubmit={handleAddUser}>
                    <Field label="Full Name" t={t}><Input t={t} value={newUser.full_name} onChange={e=>setNewUser({...newUser,full_name:e.target.value})} placeholder="John Doe" required/></Field>
                    <Field label="Email" t={t}><Input t={t} type="email" value={newUser.email} onChange={e=>setNewUser({...newUser,email:e.target.value})} placeholder="john@example.com" required/></Field>
                    <Field label="Password" t={t}><Input t={t} type="password" value={newUser.password} onChange={e=>setNewUser({...newUser,password:e.target.value})} placeholder="Min. 6 characters" required minLength={6}/></Field>
                    <Field label="Role" t={t}><Select t={t} value={newUser.role} onChange={e=>setNewUser({...newUser,role:e.target.value})}><option value="admin">Admin (Manager)</option><option value="super_admin">Super Admin (Owner)</option></Select></Field>
                    {formError&&<p style={{ fontSize:13, color:"#FF375F", marginBottom:16 }}>{formError}</p>}
                    <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8 }}>
                      <Btn variant="secondary" t={t} type="button" onClick={closeModal}>Cancel</Btn>
                      <Btn t={t} type="submit" disabled={formLoading}>{formLoading?"Creating...":"Create User"}</Btn>
                    </div>
                  </form>
                </Modal>
              )}
              {modal==="addPerson"&&(
                <Modal title="Add Person" onClose={closeModal} t={t}>
                  <form onSubmit={handleAddPerson}>
                    <Field label="Full Name" t={t}><Input t={t} value={newPerson.full_name} onChange={e=>setNewPerson({...newPerson,full_name:e.target.value})} placeholder="Jane Doe" required/></Field>
                    <Field label="Status" t={t}><Select t={t} value={newPerson.status} onChange={e=>setNewPerson({...newPerson,status:e.target.value})}><option value="active">Active</option><option value="inactive">Inactive</option></Select></Field>
                    <Field label="Monthly Target (optional)" t={t}><Input t={t} type="number" min="0" step="0.01" value={newPerson.monthly_target||""} onChange={e=>setNewPerson({...newPerson,monthly_target:e.target.value})} placeholder="e.g. 100"/></Field>
                    {formError&&<p style={{ fontSize:13, color:"#FF375F", marginBottom:16 }}>{formError}</p>}
                    <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8 }}>
                      <Btn variant="secondary" t={t} type="button" onClick={closeModal}>Cancel</Btn>
                      <Btn t={t} type="submit" disabled={formLoading}>{formLoading?"Saving...":"Add Person"}</Btn>
                    </div>
                  </form>
                </Modal>
              )}
              {modal==="addContribution"&&(
                <Modal title="Record Contribution" onClose={()=>{closeModal();setMemberSearch("");}} t={t}>
                  <form onSubmit={handleAddContribution}>
                    <Field label="Person" t={t}>
                      <div style={{ position:"relative" }}>
                        <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:t.textSub, fontSize:13, pointerEvents:"none" }}>🔍</span>
                        <input
                          value={memberSearch}
                          onChange={e=>setMemberSearch(e.target.value)}
                          placeholder="Search members..."
                          style={{ ...iStyle(t), paddingLeft:34 }}
                          autoComplete="off"
                        />
                      </div>
                      {memberSearch && (
                        <div className="subtle-scroll" style={{ border:`1px solid ${t.borderStrong}`, borderRadius:10, marginTop:4, overflow:"hidden", maxHeight:200, overflowY:"auto" }}>
                          {filteredMembers.length === 0
                            ? <p style={{ fontSize:13, color:t.textSub, margin:0, padding:"10px 14px" }}>No members match "{memberSearch}"</p>
                            : filteredMembers.map(p => (
                                <div key={p.id}
                                  onClick={()=>{ setNewContribution({...newContribution,member_id:p.id}); setMemberSearch(p.full_name); }}
                                  style={{ padding:"10px 14px", cursor:"pointer", fontSize:14, color:newContribution.member_id===p.id?t.accent:t.text, background:newContribution.member_id===p.id?`${t.accent}12`:t.surface, fontWeight:newContribution.member_id===p.id?600:400, transition:"background 0.12s" }}
                                  onMouseEnter={e=>{ if(newContribution.member_id!==p.id) e.currentTarget.style.background=t.surfaceAlt; }}
                                  onMouseLeave={e=>{ if(newContribution.member_id!==p.id) e.currentTarget.style.background=t.surface; }}
                                >{p.full_name}</div>
                              ))
                          }
                        </div>
                      )}
                      {!memberSearch && newContribution.member_id && (
                        <p style={{ fontSize:12, color:t.accent, margin:"4px 0 0", paddingLeft:4 }}>
                          ✓ {(data.allPeople||[]).find(p=>p.id===newContribution.member_id)?.full_name}
                        </p>
                      )}
                      <input type="hidden" value={newContribution.member_id} required/>
                    </Field>
                    <Field label="Payment Type" t={t}><Select t={t} value={newContribution.payment_type_id} onChange={e=>setNewContribution({...newContribution,payment_type_id:e.target.value})}><option value="">Select type...</option>{data.paymentTypes.map(pt=><option key={pt.id} value={pt.id}>{pt.name}</option>)}</Select></Field>
                    <Field label="Amount" t={t}><Input t={t} type="number" min="1" step="0.01" value={newContribution.amount} onChange={e=>setNewContribution({...newContribution,amount:e.target.value})} placeholder="0.00" required/></Field>
                    <Field label="Note (optional)" t={t}><Textarea t={t} value={newContribution.note} onChange={e=>setNewContribution({...newContribution,note:e.target.value})} placeholder="Any notes..."/></Field>
                    <Field label="Date" t={t}><Input t={t} type="date" value={newContribution.date} onChange={e=>setNewContribution({...newContribution,date:e.target.value})} required/></Field>
                    {formError&&<p style={{ fontSize:13, color:"#FF375F", marginBottom:16 }}>{formError}</p>}
                    <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8 }}>
                      <Btn variant="secondary" t={t} type="button" onClick={closeModal}>Cancel</Btn>
                      <Btn t={t} type="submit" disabled={formLoading}>{formLoading?"Saving...":"Record"}</Btn>
                    </div>
                  </form>
                </Modal>
              )}
              {modal==="bulkContribution"&&bulkContributions&&createPortal(
                <div style={{ position:"fixed", inset:0, zIndex:9997, display:"flex", alignItems:"center", justifyContent:"center", padding:24, animation:"fadeIn 0.2s ease" }}>
                  <style>{`
                    @keyframes bulkIn { from { opacity:0; transform:scale(0.97) } to { opacity:1; transform:scale(1) } }
                  `}</style>
                  {/* Backdrop */}
                  <div onClick={closeModal} style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.6)", backdropFilter:"blur(8px)" }}/>
                  {/* Panel */}
                  <div style={{ position:"relative", width:"100%", maxWidth:560, maxHeight:"90vh", background:t.surface, borderRadius:24, border:`1px solid ${t.border}`, display:"flex", flexDirection:"column", animation:"bulkIn 0.25s cubic-bezier(0.34,1.2,0.64,1)", boxShadow:"0 32px 80px rgba(0,0,0,0.5)" }}>

                    {/* Header */}
                    <div style={{ padding:"28px 28px 20px", borderBottom:`1px solid ${t.border}`, flexShrink:0 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
                        <div>
                          <h2 style={{ fontSize:20, fontWeight:700, margin:0, color:t.text, letterSpacing:"-0.4px" }}>Bulk Add Contributions</h2>
                          <p style={{ fontSize:13, color:t.textSub, margin:"4px 0 0" }}>Enter amounts for each member, leave blank to skip</p>
                        </div>
                        <button onClick={closeModal} style={{ background:"none", border:"none", color:t.textSub, fontSize:22, cursor:"pointer", lineHeight:1, padding:4, marginTop:-4 }}>×</button>
                      </div>
                      {/* Payment type + note + date */}
                      <div style={{ display:"flex", gap:12 }}>
                        <div style={{ flex:1 }}>
                          <p style={{ fontSize:11, fontWeight:600, color:t.textSub, textTransform:"uppercase", letterSpacing:"0.06em", margin:"0 0 6px" }}>Payment Type</p>
                          <Select t={t} value={bulkContributions.payment_type_id} onChange={e=>setBulkContributions({...bulkContributions,payment_type_id:e.target.value})}>
                            <option value="">Select type...</option>
                            {data.paymentTypes.map(pt=><option key={pt.id} value={pt.id}>{pt.name}</option>)}
                          </Select>
                        </div>
                        <div style={{ flex:1 }}>
                          <p style={{ fontSize:11, fontWeight:600, color:t.textSub, textTransform:"uppercase", letterSpacing:"0.06em", margin:"0 0 6px" }}>Note (optional)</p>
                          <Input t={t} value={bulkContributions.note} onChange={e=>setBulkContributions({...bulkContributions,note:e.target.value})} placeholder="e.g. April dues, Q1 payment"/>
                        </div>
                        <div style={{ flex:1 }}>
                          <p style={{ fontSize:11, fontWeight:600, color:t.textSub, textTransform:"uppercase", letterSpacing:"0.06em", margin:"0 0 6px" }}>Date</p>
                          <Input t={t} type="date" value={bulkContributions.date} onChange={e=>setBulkContributions({...bulkContributions,date:e.target.value})}/>
                        </div>
                      </div>
                      {/* Search */}
                      <div style={{ position:"relative", marginTop:14 }}>
                        <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", fontSize:13, color:t.textSub, pointerEvents:"none" }}>🔍</span>
                        <input
                          value={bulkSearch}
                          onChange={e=>setBulkSearch(e.target.value)}
                          placeholder="Search members..."
                          style={{ width:"100%", padding:"10px 14px 10px 34px", borderRadius:10, border:`1px solid ${t.borderStrong}`, background:t.surfaceAlt, color:t.text, fontSize:14, outline:"none", boxSizing:"border-box", fontFamily:"inherit" }}
                        />
                      </div>
                    </div>

                    {/* Member list */}
                    <div className="bulk-scroll" style={{ flex:1, overflowY:"auto", padding:"12px 28px" }}>
                      {(data.allPeople||[])
                        .filter(p => p.status==="active" && p.role==="member" && (!bulkSearch || p.full_name?.toLowerCase().includes(bulkSearch.toLowerCase())))
                        .map((p,i) => {
                          const val = bulkContributions.amounts[p.id] ?? "";
                          const hasVal = val !== "" && Number(val) > 0;
                          return (
                            <div key={p.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 12px", borderRadius:12, marginBottom:6, background: hasVal ? `${t.accent}10` : t.surfaceAlt, border:`1px solid ${hasVal ? t.accent+"40" : "transparent"}`, transition:"all 0.15s", animation:`slideIn 0.2s ease ${i*0.03}s both` }}>
                              <div style={{ width:36, height:36, borderRadius:"50%", background:`${t.accent}22`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, color:t.accent, flexShrink:0 }}>
                                {p.full_name?.charAt(0).toUpperCase()}
                              </div>
                              <span style={{ flex:1, fontSize:14, fontWeight:500, color:t.text }}>{p.full_name}</span>
                              <input
                                type="number" min="0" step="0.01"
                                value={val}
                                onChange={e => setBulkContributions(prev => ({ ...prev, amounts:{ ...prev.amounts, [p.id]: e.target.value } }))}
                                placeholder="0.00"
                                style={{ width:110, padding:"8px 12px", borderRadius:8, border:`1px solid ${hasVal ? t.accent+"60" : t.borderStrong}`, background:t.surface, color:t.text, fontSize:14, outline:"none", textAlign:"right", fontFamily:"inherit", transition:"border-color 0.15s" }}
                              />
                            </div>
                          );
                        })
                      }
                    </div>

                    {/* Footer */}
                    <div style={{ padding:"16px 28px 28px", borderTop:`1px solid ${t.border}`, flexShrink:0 }}>
                      {(() => {
                        const total = Object.values(bulkContributions.amounts).filter(v=>v!==""&&Number(v)>0).reduce((s,v)=>s+Number(v),0);
                        const count = Object.values(bulkContributions.amounts).filter(v=>v!==""&&Number(v)>0).length;
                        return count > 0 ? (
                          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 14px", borderRadius:10, background:t.surfaceAlt, marginBottom:14 }}>
                            <span style={{ fontSize:13, color:t.textSub }}>{count} member{count>1?"s":""} · ready to record</span>
                            <span style={{ fontSize:15, fontWeight:700, color:t.accent }}>{data.org?.currency||""} {total.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
                          </div>
                        ) : null;
                      })()}
                      {formError&&<p style={{ fontSize:13, color:"#FF375F", margin:"0 0 12px" }}>{formError}</p>}
                      <form onSubmit={handleBulkAddContributions} style={{ display:"flex", gap:10 }}>
                        <Btn variant="secondary" t={t} type="button" onClick={closeModal} style={{ flex:1 }}>Cancel</Btn>
                        <Btn t={t} type="submit" disabled={formLoading} style={{ flex:2 }}>{formLoading?"Saving...":"Record All"}</Btn>
                      </form>
                    </div>
                  </div>
                </div>,
                document.body
              )}
              {modal==="addExpense"&&(
                <Modal title="Record Expense" onClose={closeModal} t={t}>
                  <form onSubmit={handleAddExpense}>
                    <Field label="Category" t={t}><Select t={t} value={newExpense.category_id} onChange={e=>setNewExpense({...newExpense,category_id:e.target.value})} required><option value="">Select category...</option>{data.expenses.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</Select></Field>
                    <Field label="Amount" t={t}><Input t={t} type="number" min="1" step="0.01" value={newExpense.amount} onChange={e=>setNewExpense({...newExpense,amount:e.target.value})} placeholder="0.00" required/></Field>
                    <Field label="Description" t={t}><Input t={t} value={newExpense.label} onChange={e=>setNewExpense({...newExpense,label:e.target.value})} placeholder="What was this for?" required/></Field>
                    <Field label="Date" t={t}><Input t={t} type="date" value={newExpense.date} onChange={e=>setNewExpense({...newExpense,date:e.target.value})} required/></Field>
                    {formError&&<p style={{ fontSize:13, color:"#FF375F", marginBottom:16 }}>{formError}</p>}
                    <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8 }}>
                      <Btn variant="secondary" t={t} type="button" onClick={closeModal}>Cancel</Btn>
                      <Btn t={t} type="submit" disabled={formLoading}>{formLoading?"Saving...":"Record"}</Btn>
                    </div>
                  </form>
                </Modal>
              )}
              {modal==="addPaymentType"&&(
                <Modal title="New Payment Type" onClose={closeModal} t={t}>
                  <form onSubmit={handleAddPaymentType}>
                    <Field label="Name" t={t}><Input t={t} value={newPaymentType.name} onChange={e=>setNewPaymentType({...newPaymentType,name:e.target.value})} placeholder="e.g. Monthly Dues, Annual Levy" required/></Field>
                    <Field label="Description (optional)" t={t}><Textarea t={t} value={newPaymentType.description} onChange={e=>setNewPaymentType({...newPaymentType,description:e.target.value})} placeholder="Brief description..."/></Field>
                    <Field label="Goal Amount (optional)" t={t}><Input t={t} type="number" min="0" step="0.01" value={newPaymentType.goal} onChange={e=>setNewPaymentType({...newPaymentType,goal:e.target.value})} placeholder="e.g. 10000"/></Field>
                    <Field label="Color" t={t}><ColorPicker value={newPaymentType.color} onChange={color=>setNewPaymentType({...newPaymentType,color})}/></Field>
                    {formError&&<p style={{ fontSize:13, color:"#FF375F", marginBottom:16 }}>{formError}</p>}
                    <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:24 }}>
                      <Btn variant="secondary" t={t} type="button" onClick={closeModal}>Cancel</Btn>
                      <Btn t={t} type="submit" disabled={formLoading}>{formLoading?"Creating...":"Create"}</Btn>
                    </div>
                  </form>
                </Modal>
              )}
              {modal==="addExpenseCategory"&&(
                <Modal title="New Expense Category" onClose={closeModal} t={t}>
                  <form onSubmit={handleAddExpenseCategory}>
                    <Field label="Name" t={t}><Input t={t} value={newExpenseCategory.name} onChange={e=>setNewExpenseCategory({...newExpenseCategory,name:e.target.value})} placeholder="e.g. Rent, Salaries" required/></Field>
                    <Field label="Description (optional)" t={t}><Textarea t={t} value={newExpenseCategory.description} onChange={e=>setNewExpenseCategory({...newExpenseCategory,description:e.target.value})} placeholder="Brief description..."/></Field>
                    <Field label="Budget (optional)" t={t}><Input t={t} type="number" min="0" step="0.01" value={newExpenseCategory.budget} onChange={e=>setNewExpenseCategory({...newExpenseCategory,budget:e.target.value})} placeholder="e.g. 50000"/></Field>
                    <Field label="Color" t={t}><ColorPicker value={newExpenseCategory.color} onChange={color=>setNewExpenseCategory({...newExpenseCategory,color})}/></Field>
                    {formError&&<p style={{ fontSize:13, color:"#FF375F", marginBottom:16 }}>{formError}</p>}
                    <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:24 }}>
                      <Btn variant="secondary" t={t} type="button" onClick={closeModal}>Cancel</Btn>
                      <Btn t={t} type="submit" disabled={formLoading}>{formLoading?"Creating...":"Create"}</Btn>
                    </div>
                  </form>
                </Modal>
              )}
              {modal==="editPaymentType"&&editingPaymentType&&(
                <Modal title="Edit Payment Type" onClose={closeModal} t={t}>
                  <form onSubmit={handleEditPaymentType}>
                    <Field label="Name" t={t}><Input t={t} value={editingPaymentType.name} onChange={e=>setEditingPaymentType({...editingPaymentType,name:e.target.value})} required/></Field>
                    <Field label="Description (optional)" t={t}><Textarea t={t} value={editingPaymentType.description||""} onChange={e=>setEditingPaymentType({...editingPaymentType,description:e.target.value})}/></Field>
                    <Field label="Goal Amount (optional)" t={t}><Input t={t} type="number" min="0" step="0.01" value={editingPaymentType.goal||""} onChange={e=>setEditingPaymentType({...editingPaymentType,goal:e.target.value})}/></Field>
                    <Field label="Color" t={t}><ColorPicker value={editingPaymentType.color} onChange={color=>setEditingPaymentType({...editingPaymentType,color})}/></Field>
                    {formError&&<p style={{ fontSize:13, color:"#FF375F", marginBottom:16 }}>{formError}</p>}
                    <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:24 }}>
                      <Btn variant="secondary" t={t} type="button" onClick={closeModal}>Cancel</Btn>
                      <Btn t={t} type="submit" disabled={formLoading}>{formLoading?"Saving...":"Save Changes"}</Btn>
                    </div>
                  </form>
                </Modal>
              )}
              {modal==="editExpenseCategory"&&editingExpenseCategory&&(
                <Modal title="Edit Expense Category" onClose={closeModal} t={t}>
                  <form onSubmit={handleEditExpenseCategory}>
                    <Field label="Name" t={t}><Input t={t} value={editingExpenseCategory.name} onChange={e=>setEditingExpenseCategory({...editingExpenseCategory,name:e.target.value})} required/></Field>
                    <Field label="Description (optional)" t={t}><Textarea t={t} value={editingExpenseCategory.description||""} onChange={e=>setEditingExpenseCategory({...editingExpenseCategory,description:e.target.value})}/></Field>
                    <Field label="Budget (optional)" t={t}><Input t={t} type="number" min="0" step="0.01" value={editingExpenseCategory.budget||""} onChange={e=>setEditingExpenseCategory({...editingExpenseCategory,budget:e.target.value})}/></Field>
                    <Field label="Color" t={t}><ColorPicker value={editingExpenseCategory.color} onChange={color=>setEditingExpenseCategory({...editingExpenseCategory,color})}/></Field>
                    {formError&&<p style={{ fontSize:13, color:"#FF375F", marginBottom:16 }}>{formError}</p>}
                    <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:24 }}>
                      <Btn variant="secondary" t={t} type="button" onClick={closeModal}>Cancel</Btn>
                      <Btn t={t} type="submit" disabled={formLoading}>{formLoading?"Saving...":"Save Changes"}</Btn>
                    </div>
                  </form>
                </Modal>
              )}
        
        
              {modal==="editPerson"&&editingPerson&&(
                <Modal title="Edit Person" onClose={closeModal} t={t}>
                  <form onSubmit={handleEditPerson}>
                    <Field label="Full Name" t={t}><Input t={t} value={editingPerson.full_name} onChange={e=>setEditingPerson({...editingPerson,full_name:e.target.value})} required/></Field>
                    <Field label="Status" t={t}><Select t={t} value={editingPerson.status} onChange={e=>setEditingPerson({...editingPerson,status:e.target.value})}><option value="active">Active</option><option value="inactive">Inactive</option></Select></Field>
                    <Field label="Monthly Target (optional)" t={t}><Input t={t} type="number" min="0" step="0.01" value={editingPerson.monthly_target||""} onChange={e=>setEditingPerson({...editingPerson,monthly_target:e.target.value})} placeholder="e.g. 100"/></Field>
                    {formError&&<p style={{ fontSize:13, color:"#FF375F", marginBottom:16 }}>{formError}</p>}
                    <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8 }}>
                      <Btn variant="secondary" t={t} type="button" onClick={closeModal}>Cancel</Btn>
                      <Btn t={t} type="submit" disabled={formLoading}>{formLoading?"Saving...":"Save Changes"}</Btn>
                    </div>
                  </form>
                </Modal>
              )}
        
              {modal==="editContribution"&&editingContribution&&(
                <Modal title="Edit Contribution" onClose={closeModal} t={t}>
                  <form onSubmit={handleEditContribution}>
                    <div style={{ marginBottom:16, padding:"12px 16px", background:t.surfaceAlt, borderRadius:10 }}>
                      <p style={{ fontSize:12, color:t.textSub, margin:0 }}>Editing contribution for</p>
                      <p style={{ fontSize:15, fontWeight:700, color:t.text, margin:"2px 0 0" }}>{editingContribution.member_name}</p>
                    </div>
                    <Field label="Amount" t={t}><Input t={t} type="number" min="1" step="0.01" value={editingContribution.amount} onChange={e=>setEditingContribution({...editingContribution,amount:e.target.value})} required/></Field>
                    <Field label="Payment Type" t={t}><Select t={t} value={editingContribution.payment_type_id} onChange={e=>setEditingContribution({...editingContribution,payment_type_id:e.target.value})}><option value="">None</option>{data.paymentTypes.map(pt=><option key={pt.id} value={pt.id}>{pt.name}</option>)}</Select></Field>
                    <Field label="Note (optional)" t={t}><Textarea t={t} value={editingContribution.note} onChange={e=>setEditingContribution({...editingContribution,note:e.target.value})}/></Field>
                    <Field label="Date" t={t}><Input t={t} type="date" value={editingContribution.date||""} onChange={e=>setEditingContribution({...editingContribution,date:e.target.value})}/></Field>
                    {formError&&<p style={{ fontSize:13, color:"#FF375F", marginBottom:16 }}>{formError}</p>}
                    <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8 }}>
                      <Btn variant="secondary" t={t} type="button" onClick={closeModal}>Cancel</Btn>
                      <Btn t={t} type="submit" disabled={formLoading}>{formLoading?"Saving...":"Save Changes"}</Btn>
                    </div>
                  </form>
                </Modal>
              )}
        
              {modal==="editExpenseEntry"&&editingExpenseEntry&&(
                <Modal title="Edit Expense" onClose={closeModal} t={t}>
                  <form onSubmit={handleEditExpenseEntry}>
                    <Field label="Description" t={t}><Input t={t} value={editingExpenseEntry.label} onChange={e=>setEditingExpenseEntry({...editingExpenseEntry,label:e.target.value})} required/></Field>
                    <Field label="Amount" t={t}><Input t={t} type="number" min="1" step="0.01" value={editingExpenseEntry.amount} onChange={e=>setEditingExpenseEntry({...editingExpenseEntry,amount:e.target.value})} required/></Field>
                    <Field label="Category" t={t}><Select t={t} value={editingExpenseEntry.category_id} onChange={e=>setEditingExpenseEntry({...editingExpenseEntry,category_id:e.target.value})} required><option value="">Select category...</option>{data.expenses.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</Select></Field>
                    <Field label="Date" t={t}><Input t={t} type="date" value={editingExpenseEntry.date||""} onChange={e=>setEditingExpenseEntry({...editingExpenseEntry,date:e.target.value})}/></Field>
                    {formError&&<p style={{ fontSize:13, color:"#FF375F", marginBottom:16 }}>{formError}</p>}
                    <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8 }}>
                      <Btn variant="secondary" t={t} type="button" onClick={closeModal}>Cancel</Btn>
                      <Btn t={t} type="submit" disabled={formLoading}>{formLoading?"Saving...":"Save Changes"}</Btn>
                    </div>
                  </form>
                </Modal>
              )}

              {modal==="addIncome"&&(
                <Modal title="Record Income" onClose={closeModal} t={t}>
                  <form onSubmit={handleAddIncome}>
                    <Field label="Description" t={t}><Input t={t} value={newIncome.label} onChange={e=>setNewIncome({...newIncome,label:e.target.value})} placeholder="e.g. Annual fundraiser proceeds" required/></Field>
                    <Field label="Amount" t={t}><Input t={t} type="number" min="0.01" step="0.01" value={newIncome.amount} onChange={e=>setNewIncome({...newIncome,amount:e.target.value})} placeholder="0.00" required/></Field>
                    <Field label="Source (optional)" t={t}><Input t={t} value={newIncome.source} onChange={e=>setNewIncome({...newIncome,source:e.target.value})} placeholder="e.g. Donation, Grant, Investment, Interest"/></Field>
                    <Field label="Note (optional)" t={t}><Textarea t={t} value={newIncome.note} onChange={e=>setNewIncome({...newIncome,note:e.target.value})} placeholder="Any additional details..."/></Field>
                    <Field label="Date" t={t}><Input t={t} type="date" value={newIncome.date} onChange={e=>setNewIncome({...newIncome,date:e.target.value})} required/></Field>
                    {formError&&<p style={{ fontSize:13, color:"#FF375F", marginBottom:16 }}>{formError}</p>}
                    <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8 }}>
                      <Btn variant="secondary" t={t} type="button" onClick={closeModal}>Cancel</Btn>
                      <Btn t={t} type="submit" disabled={formLoading}>{formLoading?"Saving...":"Record"}</Btn>
                    </div>
                  </form>
                </Modal>
              )}

              {modal==="editIncome"&&editingIncomeSource&&(
                <Modal title="Edit Income" onClose={closeModal} t={t}>
                  <form onSubmit={handleEditIncome}>
                    <Field label="Description" t={t}><Input t={t} value={editingIncomeSource.label} onChange={e=>setEditingIncomeSource({...editingIncomeSource,label:e.target.value})} required/></Field>
                    <Field label="Amount" t={t}><Input t={t} type="number" min="0.01" step="0.01" value={editingIncomeSource.amount} onChange={e=>setEditingIncomeSource({...editingIncomeSource,amount:e.target.value})} required/></Field>
                    <Field label="Source (optional)" t={t}><Input t={t} value={editingIncomeSource.source} onChange={e=>setEditingIncomeSource({...editingIncomeSource,source:e.target.value})} placeholder="e.g. Donation, Grant, Investment"/></Field>
                    <Field label="Note (optional)" t={t}><Textarea t={t} value={editingIncomeSource.note} onChange={e=>setEditingIncomeSource({...editingIncomeSource,note:e.target.value})}/></Field>
                    <Field label="Date" t={t}><Input t={t} type="date" value={editingIncomeSource.date||""} onChange={e=>setEditingIncomeSource({...editingIncomeSource,date:e.target.value})}/></Field>
                    {formError&&<p style={{ fontSize:13, color:"#FF375F", marginBottom:16 }}>{formError}</p>}
                    <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8 }}>
                      <Btn variant="secondary" t={t} type="button" onClick={closeModal}>Cancel</Btn>
                      <Btn t={t} type="submit" disabled={formLoading}>{formLoading?"Saving...":"Save Changes"}</Btn>
                    </div>
                  </form>
                </Modal>
              )}
    </>
  );
}