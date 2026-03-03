import { Modal, Field, Input, Textarea, Select, Btn, ColorPicker } from "../ui/index.jsx";
import { CURRENCIES } from "../../constants.js";

export function Modals({
  modal, closeModal, t, data, orgForm, setOrgForm, formLoading, formError,
  handleSaveOrg,
  newUser, setNewUser, handleAddUser,
  newPerson, setNewPerson, handleAddPerson,
  newContribution, setNewContribution, handleAddContribution,
  newExpense, setNewExpense, handleAddExpense,
  newPaymentType, setNewPaymentType, handleAddPaymentType,
  newExpenseCategory, setNewExpenseCategory, handleAddExpenseCategory,
  editingPaymentType, setEditingPaymentType, handleEditPaymentType,
  editingExpenseCategory, setEditingExpenseCategory, handleEditExpenseCategory,
  editingContribution, setEditingContribution, handleEditContribution,
  editingExpenseEntry, setEditingExpenseEntry, handleEditExpenseEntry,
  editingPerson, setEditingPerson, handleEditPerson,
  fmt,
}) {
  return (
    <>
      {/* ── MODALS ── */}
              {modal==="editOrg"&&orgForm&&(
                <Modal title="Organisation Settings" onClose={closeModal} t={t}>
                  <form onSubmit={handleSaveOrg}>
                    <Field label="Organisation Name" t={t}><Input t={t} value={orgForm.name} onChange={e=>setOrgForm({...orgForm,name:e.target.value})} required/></Field>
                    <Field label="Address" t={t}><Textarea t={t} value={orgForm.address} onChange={e=>setOrgForm({...orgForm,address:e.target.value})} placeholder="Street, City, Country"/></Field>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                      <Field label="Contact Email" t={t}><Input t={t} type="email" value={orgForm.contact_email} onChange={e=>setOrgForm({...orgForm,contact_email:e.target.value})} placeholder="info@org.com"/></Field>
                      <Field label="Contact Phone" t={t}><Input t={t} value={orgForm.contact_phone} onChange={e=>setOrgForm({...orgForm,contact_phone:e.target.value})} placeholder="+1 234 567 8900"/></Field>
                    </div>
                    <Field label="Currency" t={t}><Select t={t} value={orgForm.currency} onChange={e=>setOrgForm({...orgForm,currency:e.target.value})}>{CURRENCIES.map(c=><option key={c} value={c}>{c}</option>)}</Select></Field>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                      <Field label="Financial Year Start" t={t}><Input t={t} type="number" value={orgForm.financial_year_start} onChange={e=>setOrgForm({...orgForm,financial_year_start:e.target.value})} placeholder="2026"/></Field>
                      <Field label="Year Format" t={t}><Select t={t} value={orgForm.financial_year_format} onChange={e=>setOrgForm({...orgForm,financial_year_format:e.target.value})}><option value="single">Single (2026)</option><option value="split">Split (2026/2027)</option></Select></Field>
                    </div>
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
                <Modal title="Record Contribution" onClose={closeModal} t={t}>
                  <form onSubmit={handleAddContribution}>
                    <Field label="Person" t={t}><Select t={t} value={newContribution.member_id} onChange={e=>setNewContribution({...newContribution,member_id:e.target.value})} required><option value="">Select person...</option>{(data.allPeople||[]).filter(p=>p.role==="member").map(p=><option key={p.id} value={p.id}>{p.full_name}</option>)}</Select></Field>
                    <Field label="Payment Type" t={t}><Select t={t} value={newContribution.payment_type_id} onChange={e=>setNewContribution({...newContribution,payment_type_id:e.target.value})}><option value="">Select type...</option>{data.paymentTypes.map(pt=><option key={pt.id} value={pt.id}>{pt.name}</option>)}</Select></Field>
                    <Field label="Amount" t={t}><Input t={t} type="number" min="1" step="0.01" value={newContribution.amount} onChange={e=>setNewContribution({...newContribution,amount:e.target.value})} placeholder="0.00" required/></Field>
                    <Field label="Note (optional)" t={t}><Textarea t={t} value={newContribution.note} onChange={e=>setNewContribution({...newContribution,note:e.target.value})} placeholder="Any notes..."/></Field>
                    {formError&&<p style={{ fontSize:13, color:"#FF375F", marginBottom:16 }}>{formError}</p>}
                    <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8 }}>
                      <Btn variant="secondary" t={t} type="button" onClick={closeModal}>Cancel</Btn>
                      <Btn t={t} type="submit" disabled={formLoading}>{formLoading?"Saving...":"Record"}</Btn>
                    </div>
                  </form>
                </Modal>
              )}
              {modal==="addExpense"&&(
                <Modal title="Record Expense" onClose={closeModal} t={t}>
                  <form onSubmit={handleAddExpense}>
                    <Field label="Category" t={t}><Select t={t} value={newExpense.category_id} onChange={e=>setNewExpense({...newExpense,category_id:e.target.value})} required><option value="">Select category...</option>{data.expenses.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</Select></Field>
                    <Field label="Amount" t={t}><Input t={t} type="number" min="1" step="0.01" value={newExpense.amount} onChange={e=>setNewExpense({...newExpense,amount:e.target.value})} placeholder="0.00" required/></Field>
                    <Field label="Description" t={t}><Input t={t} value={newExpense.label} onChange={e=>setNewExpense({...newExpense,label:e.target.value})} placeholder="What was this for?" required/></Field>
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
                    <Field label="Name" t={t}><Input t={t} value={newPaymentType.name} onChange={e=>setNewPaymentType({...newPaymentType,name:e.target.value})} placeholder="e.g. Rhapsody, Healing School" required/></Field>
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