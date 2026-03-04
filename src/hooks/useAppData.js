import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { makeFmt, light, dark, buildMonthly, buildTimeline, fyLabel } from "../constants.js";
import { toast } from "../components/ui/index.jsx";

export function useAppData({ session, currentOrg, orgRole }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [isDark, setIsDark] = useState(() => localStorage.getItem("unified-theme") === "dark");
  const t = isDark ? dark : light;
  const toggleTheme = () => { const n = !isDark; setIsDark(n); localStorage.setItem("unified-theme", n?"dark":"light"); };

  const orgId = currentOrg?.id;

  const [data, setData] = useState({ totalBalance:0, totalContributions:0, totalExpenses:0, people:[], expenses:[], recentActivity:[], users:[], paymentTypes:[], allPeople:[], org:null, rawContributions:[], rawExpenses:[], categories:[] });
  const [loading, setLoading] = useState(true);
  const [fmt, setFmt] = useState(() => makeFmt(currentOrg?.currency || "USD"));

  const [modal, setModal] = useState(null);
  const [newUser, setNewUser] = useState({ full_name:"", email:"", password:"", role:"admin" });
  const [newPerson, setNewPerson] = useState({ full_name:"", status:"active", monthly_target:"" });
  const [newContribution, setNewContribution] = useState({ member_id:"", amount:"", payment_type_id:"", note:"" });
  const [bulkContributions, setBulkContributions] = useState({ payment_type_id:"", note:"", amounts:{} });
  const [newExpense, setNewExpense] = useState({ category_id:"", amount:"", label:"" });
  const [newPaymentType, setNewPaymentType] = useState({ name:"", description:"", goal:"", color:"#0071E3" });
  const [newExpenseCategory, setNewExpenseCategory] = useState({ name:"", description:"", budget:"", color:"#0071E3" });
  const [editingPaymentType, setEditingPaymentType] = useState(null);
  const [editingExpenseCategory, setEditingExpenseCategory] = useState(null);
  const [editingPerson, setEditingPerson] = useState(null);
  const [orgForm, setOrgForm] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState(null);

  const [expandedPaymentType, setExpandedPaymentType] = useState(null);

  const [activitySearch, setActivitySearch] = useState("");
  const [activityFilter, setActivityFilter] = useState("all");
  const [activityPage, setActivityPage] = useState(1);
  const [activityDateFrom, setActivityDateFrom] = useState("");
  const [activityDateTo, setActivityDateTo] = useState("");
  const [showPrintView, setShowPrintView] = useState(false);
  const [exportDateFrom, setExportDateFrom] = useState("");
  const [exportDateTo, setExportDateTo] = useState("");

  const [selectedMember, setSelectedMember] = useState(null);
  const [editingContribution, setEditingContribution] = useState(null);
  const [editingExpenseEntry, setEditingExpenseEntry] = useState(null);
  const [auditLog, setAuditLog] = useState([]);

  const [visible, setVisible] = useState(false);
  useEffect(() => { setVisible(false); const timer = setTimeout(() => setVisible(true), 30); return () => clearTimeout(timer); }, [activeTab]);
  useEffect(() => { if (orgId) fetchAllData(); }, [orgId]);

  const openModal  = (name) => { setFormError(null); setModal(name); };
  const closeModal = () => { setModal(null); setEditingPaymentType(null); setEditingExpenseCategory(null); setEditingPerson(null); };

  // ── Core data fetch — all queries scoped to current org ──────
  async function fetchAllData() {
    if (!orgId) return;
    setLoading(true);
    try {
      const [
        { data: profiles },
        { data: contributions },
        { data: categories },
        { data: expenses },
        { data: paymentTypes },
        { data: orgRows },
        { data: auditRows },
        { data: orgMembers },
      ] = await Promise.all([
        supabase.from("profiles").select("*").eq("org_id", orgId).order("created_at",{ascending:false}),
        supabase.from("contributions").select("*, profiles(full_name), payment_types(name,color)").eq("org_id", orgId).order("created_at",{ascending:false}),
        supabase.from("expense_categories").select("*").eq("org_id", orgId).order("created_at",{ascending:false}),
        supabase.from("expenses").select("*, expense_categories(name,color)").eq("org_id", orgId).order("created_at",{ascending:false}),
        supabase.from("payment_types").select("*").eq("org_id", orgId).order("created_at",{ascending:false}),
        supabase.from("org_settings").select("*").eq("id", orgId).limit(1),
        supabase.from("audit_log").select("*").eq("org_id", orgId).order("created_at",{ascending:false}).limit(200),
        supabase.from("org_members").select("user_id, role").eq("org_id", orgId),
      ]);

      const org = orgRows?.[0] || currentOrg;
      if (org) {
        setFmt(() => makeFmt(org.currency || "USD"));
        setOrgForm({ name:org.name, address:org.address||"", contact_email:org.contact_email||"", contact_phone:org.contact_phone||"", currency:org.currency||"USD", financial_year_format:org.financial_year_format||"single", financial_year_start:org.financial_year_start||new Date().getFullYear(), opening_balance:org.opening_balance||0 });
      }

      const fmtLocal = makeFmt(org?.currency || "USD");
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const people = (profiles||[]).filter(p=>p.role==="member").map(p=>{
        const total=(contributions||[]).filter(c=>c.member_id===p.id).reduce((s,c)=>s+Number(c.amount),0);
        const thisMonth=(contributions||[]).filter(c=>c.member_id===p.id&&new Date(c.created_at)>=monthStart).reduce((s,c)=>s+Number(c.amount),0);
        const last=(contributions||[]).find(c=>c.member_id===p.id);
        const target=Number(p.monthly_target||0);
        return {id:p.id,name:p.full_name,status:p.status==="active"?"Active":"Inactive",contributions:total,thisMonth,target,lastActivity:last?new Date(last.created_at).toLocaleDateString("en-US",{month:"short",day:"numeric"}):"No activity"};
      });

      const expenseData=(categories||[]).map(cat=>{
        const spent=(expenses||[]).filter(e=>e.category_id===cat.id).reduce((s,e)=>s+Number(e.amount),0);
        return {id:cat.id,label:cat.name,description:cat.description,amount:spent,budget:Number(cat.budget||0),color:cat.color||"#0071E3"};
      });

      const paymentTypeData=(paymentTypes||[]).map(pt=>{
        const ptContribs=(contributions||[]).filter(c=>c.payment_type_id===pt.id);
        const total=ptContribs.reduce((s,c)=>s+Number(c.amount),0);
        const memberMap={};
        ptContribs.forEach(c=>{ const mid=c.member_id; const name=c.profiles?.full_name||"Unknown"; if(!memberMap[mid]) memberMap[mid]={id:mid,name,total:0}; memberMap[mid].total+=Number(c.amount); });
        const members=Object.values(memberMap).sort((a,b)=>b.total-a.total);
        return {id:pt.id,name:pt.name,description:pt.description,total,goal:Number(pt.goal||0),color:pt.color||"#0071E3",members};
      });

      const cA=(contributions||[]).slice(0,6).map(c=>({id:`c-${c.id}`,name:c.profiles?.full_name||"Member",action:c.payment_types?.name||"Contribution",amount:`+${fmtLocal(c.amount)}`,time:new Date(c.created_at).toLocaleDateString("en-US",{month:"short",day:"numeric"}),positive:true}));
      const eA=(expenses||[]).slice(0,6).map(e=>({id:`e-${e.id}`,name:e.expense_categories?.name||"Expense",action:e.label,amount:`-${fmtLocal(e.amount)}`,time:new Date(e.created_at).toLocaleDateString("en-US",{month:"short",day:"numeric"}),positive:false}));
      const totalC=(contributions||[]).reduce((s,c)=>s+Number(c.amount),0);
      const totalE=(expenses||[]).reduce((s,e)=>s+Number(e.amount),0);
      const openingBalance=Number(org?.opening_balance||0);

      // Build users list: match org_members to the admin/super_admin profiles already fetched
      // profiles in this org that have an admin role (stored in profiles.role for display purposes)
      // email is stored in profiles.email if you add it, otherwise fall back to user_id
      const memberRoleMap = Object.fromEntries((orgMembers||[]).map(m => [m.user_id, m.role]));
      const users = (profiles||[])
        .filter(p => ["super_admin","admin"].includes(memberRoleMap[p.id] || p.role))
        .map(p => ({
          id: p.id,
          full_name: p.full_name || "",
          email: p.email || "",          // populated if profiles has an email column
          role: memberRoleMap[p.id] || p.role,
        }));

      setData({ totalBalance:openingBalance+totalC-totalE, totalContributions:totalC, totalExpenses:totalE, people, expenses:expenseData, recentActivity:[...cA,...eA].slice(0,10), users, paymentTypes:paymentTypeData, allPeople:profiles||[], org, categories:categories||[], rawContributions:contributions||[], rawExpenses:expenses||[] });
      setAuditLog(auditRows || []);
    } catch(err) { console.error(err); } finally { setLoading(false); }
  }

  // ── Audit log helper ─────────────────────────────────────────
  async function logAudit(action, entity, entityId, memberName, description, oldVal, newVal) {
    if (!orgId) return;
    try {
      await supabase.from("audit_log").insert({
        action, entity, entity_id: entityId, member_name: memberName,
        description, old_value: oldVal || null, new_value: newVal || null,
        performed_by: session?.user?.id, performed_by_email: session?.user?.email,
        org_id: orgId,
      });
    } catch(e) { console.error("audit log failed", e); }
  }

  // ── CRUD handlers — all inserts now include org_id ───────────

  async function handleAddUser(e) {
    e.preventDefault(); setFormLoading(true); setFormError(null);
    try {
      // ⚠️  supabase.auth.signUp() can sign out the current user in some client versions.
      // For production, replace this with a Supabase Edge Function using the Admin API
      // (supabaseAdmin.auth.admin.createUser) so the current session is preserved.
      const { data: authData, error } = await supabase.auth.signUp({
        email: newUser.email, password: newUser.password,
        options: { data: { full_name: newUser.full_name, role: newUser.role } },
      });
      if (error) throw error;

      const userId = authData.user?.id;
      if (userId) {
        // Add to org_members for this org
        await supabase.from("org_members").insert({ org_id: orgId, user_id: userId, role: newUser.role });
        // Add profile scoped to this org
        await supabase.from("profiles").insert({ id: userId, org_id: orgId, full_name: newUser.full_name, role: newUser.role, status: "active" });
      }

      await logAudit("create","user",userId,newUser.full_name,`Created user ${newUser.full_name} (${newUser.email})`,null,{email:newUser.email,role:newUser.role});
      closeModal(); setNewUser({full_name:"",email:"",password:"",role:"admin"}); fetchAllData();
    } catch(err) { setFormError(err.message); } finally { setFormLoading(false); }
  }

  async function handleAddPerson(e) {
    e.preventDefault(); setFormLoading(true); setFormError(null);
    try {
      const { error } = await supabase.from("profiles").insert({
        id: crypto.randomUUID(), full_name: newPerson.full_name,
        role: "member", status: newPerson.status,
        monthly_target: newPerson.monthly_target ? Number(newPerson.monthly_target) : 0,
        org_id: orgId,
      });
      if (error) throw error;
      await logAudit("create","person",null,newPerson.full_name,`Added person ${newPerson.full_name}`,null,{full_name:newPerson.full_name,status:newPerson.status});
      closeModal(); setNewPerson({full_name:"",status:"active",monthly_target:""}); fetchAllData();
    } catch(err) { setFormError(err.message); } finally { setFormLoading(false); }
  }

  async function handleAddContribution(e) {
    e.preventDefault(); setFormLoading(true); setFormError(null);
    try {
      const { error } = await supabase.from("contributions").insert({
        member_id: newContribution.member_id, amount: Number(newContribution.amount),
        payment_type_id: newContribution.payment_type_id || null,
        note: newContribution.note, type: "other", org_id: orgId,
      });
      if (error) throw error;
      const memberName = data.allPeople.find(p=>p.id===newContribution.member_id)?.full_name||"Member";
      await logAudit("create","contribution",null,memberName,`Recorded contribution of ${newContribution.amount} for ${memberName}`,null,{amount:newContribution.amount,note:newContribution.note});
      closeModal(); setNewContribution({member_id:"",amount:"",payment_type_id:"",note:""}); fetchAllData();
    } catch(err) { setFormError(err.message); } finally { setFormLoading(false); }
  }

  async function handleBulkAddContributions(e) {
    e.preventDefault(); setFormLoading(true); setFormError(null);
    try {
      const entries = Object.entries(bulkContributions.amounts)
        .filter(([_, amt]) => amt !== "" && Number(amt) > 0);
      if (entries.length === 0) { setFormError("Enter at least one amount."); setFormLoading(false); return; }
      const rows = entries.map(([member_id, amt]) => ({
        member_id, amount: Number(amt),
        payment_type_id: bulkContributions.payment_type_id || null,
        note: bulkContributions.note, type: "other", org_id: orgId,
      }));
      const { error } = await supabase.from("contributions").insert(rows);
      if (error) throw error;
      await logAudit("create","contribution",null,"Bulk","Bulk contribution entry",null,{ count: rows.length, total: rows.reduce((s,r)=>s+r.amount,0) });
      toast(`✓ ${rows.length} contribution${rows.length>1?"s":""} recorded`, "success");
      closeModal(); setBulkContributions({ payment_type_id:"", note:"", amounts:{} }); fetchAllData();
    } catch(err) { setFormError(err.message); } finally { setFormLoading(false); }
  }

  async function handleAddExpense(e) {
    e.preventDefault(); setFormLoading(true); setFormError(null);
    try {
      const { error } = await supabase.from("expenses").insert({
        category_id: newExpense.category_id, amount: Number(newExpense.amount),
        label: newExpense.label, recorded_by: session?.user?.id, org_id: orgId,
      });
      if (error) throw error;
      const catName = data.categories?.find(c=>c.id===newExpense.category_id)?.name||"Expense";
      await logAudit("create","expense",null,null,`Recorded expense: ${newExpense.label} (${newExpense.amount}) under ${catName}`,null,{amount:newExpense.amount,label:newExpense.label});
      closeModal(); setNewExpense({category_id:"",amount:"",label:""});

      const cat = data.expenses?.find(c=>c.id===newExpense.category_id);
      if (cat && cat.budget > 0) {
        const newSpent = cat.amount + Number(newExpense.amount);
        const pct = Math.round((newSpent / cat.budget) * 100);
        if (newSpent >= cat.budget) toast(`⚠️ ${cat.label} is over budget (${pct}% used)`, "error");
        else if (pct >= 80) toast(`${cat.label} is at ${pct}% of its budget`, "warning");
      }

      fetchAllData();
    } catch(err) { setFormError(err.message); } finally { setFormLoading(false); }
  }

  async function handleAddPaymentType(e) {
    e.preventDefault(); setFormLoading(true); setFormError(null);
    try {
      const { error } = await supabase.from("payment_types").insert({
        name: newPaymentType.name, description: newPaymentType.description||null,
        goal: newPaymentType.goal ? Number(newPaymentType.goal) : null,
        color: newPaymentType.color, created_by: session?.user?.id, org_id: orgId,
      });
      if (error) throw error;
      await logAudit("create","payment_type",null,null,`Created payment type: ${newPaymentType.name}`,null,{name:newPaymentType.name,goal:newPaymentType.goal});
      closeModal(); setNewPaymentType({name:"",description:"",goal:"",color:"#0071E3"}); fetchAllData();
    } catch(err) { setFormError(err.message); } finally { setFormLoading(false); }
  }

  async function handleAddExpenseCategory(e) {
    e.preventDefault(); setFormLoading(true); setFormError(null);
    try {
      const { error } = await supabase.from("expense_categories").insert({
        name: newExpenseCategory.name, description: newExpenseCategory.description||null,
        budget: newExpenseCategory.budget ? Number(newExpenseCategory.budget) : 0,
        color: newExpenseCategory.color, created_by: session?.user?.id, org_id: orgId,
      });
      if (error) throw error;
      await logAudit("create","expense_category",null,null,`Created expense category: ${newExpenseCategory.name}`,null,{name:newExpenseCategory.name,budget:newExpenseCategory.budget});
      closeModal(); setNewExpenseCategory({name:"",description:"",budget:"",color:"#0071E3"}); fetchAllData();
    } catch(err) { setFormError(err.message); } finally { setFormLoading(false); }
  }

  async function handleEditPaymentType(e) {
    e.preventDefault(); setFormLoading(true); setFormError(null);
    try {
      const old = data.paymentTypes.find(p=>p.id===editingPaymentType.id);
      const { error } = await supabase.from("payment_types").update({
        name: editingPaymentType.name, description: editingPaymentType.description||null,
        goal: editingPaymentType.goal ? Number(editingPaymentType.goal) : null,
        color: editingPaymentType.color,
      }).eq("id", editingPaymentType.id).eq("org_id", orgId);
      if (error) throw error;
      await logAudit("edit","payment_type",editingPaymentType.id,null,`Edited payment type: ${editingPaymentType.name}`,{name:old?.name,goal:old?.goal},{name:editingPaymentType.name,goal:editingPaymentType.goal});
      closeModal(); fetchAllData();
    } catch(err) { setFormError(err.message); } finally { setFormLoading(false); }
  }

  async function handleDeletePaymentType(id) {
    const pt = data.paymentTypes.find(p=>p.id===id);
    await supabase.from("payment_types").delete().eq("id", id).eq("org_id", orgId);
    await logAudit("delete","payment_type",id,null,`Deleted payment type: ${pt?.name||id}`,{name:pt?.name},null);
    fetchAllData();
  }

  async function handleEditExpenseCategory(e) {
    e.preventDefault(); setFormLoading(true); setFormError(null);
    try {
      const old = data.expenses.find(c=>c.id===editingExpenseCategory.id);
      const { error } = await supabase.from("expense_categories").update({
        name: editingExpenseCategory.name, description: editingExpenseCategory.description||null,
        budget: editingExpenseCategory.budget ? Number(editingExpenseCategory.budget) : 0,
        color: editingExpenseCategory.color,
      }).eq("id", editingExpenseCategory.id).eq("org_id", orgId);
      if (error) throw error;
      await logAudit("edit","expense_category",editingExpenseCategory.id,null,`Edited expense category: ${editingExpenseCategory.name}`,{name:old?.label,budget:old?.budget},{name:editingExpenseCategory.name,budget:editingExpenseCategory.budget});
      closeModal(); fetchAllData();
    } catch(err) { setFormError(err.message); } finally { setFormLoading(false); }
  }

  async function handleDeleteExpenseCategory(id) {
    const cat = data.expenses.find(c=>c.id===id);
    await supabase.from("expenses").delete().eq("category_id", id).eq("org_id", orgId);
    await supabase.from("expense_categories").delete().eq("id", id).eq("org_id", orgId);
    await logAudit("delete","expense_category",id,null,`Deleted expense category: ${cat?.label||id}`,{name:cat?.label},null);
    fetchAllData();
  }

  async function handleSaveOrg(e) {
    e.preventDefault(); setFormLoading(true); setFormError(null);
    try {
      const { error } = await supabase.from("org_settings").update({
        ...orgForm,
        financial_year_start: Number(orgForm.financial_year_start),
        opening_balance: Number(orgForm.opening_balance||0),
        updated_by: session?.user?.id,
        updated_at: new Date().toISOString(),
      }).eq("id", orgId);
      if (error) throw error;
      await logAudit("edit","org",orgId,null,`Updated organisation settings`,{name:data.org?.name},{name:orgForm.name,currency:orgForm.currency});
      closeModal(); fetchAllData();
    } catch(err) { setFormError(err.message); } finally { setFormLoading(false); }
  }

  async function handleEditPerson(e) {
    e.preventDefault(); setFormLoading(true); setFormError(null);
    try {
      const old = data.allPeople.find(p=>p.id===editingPerson.id);
      const { error } = await supabase.from("profiles").update({
        full_name: editingPerson.full_name,
        status: editingPerson.status,
        monthly_target: editingPerson.monthly_target ? Number(editingPerson.monthly_target) : 0,
      }).eq("id", editingPerson.id).eq("org_id", orgId);
      if (error) throw error;
      await logAudit("edit","person",editingPerson.id,editingPerson.full_name,`Edited person: ${editingPerson.full_name}`,{full_name:old?.full_name,status:old?.status},{full_name:editingPerson.full_name,status:editingPerson.status});
      closeModal(); fetchAllData();
    } catch(err) { setFormError(err.message); } finally { setFormLoading(false); }
  }

  async function handleDeactivatePerson(id, currentStatus) {
    const newStatus = currentStatus === "Active" ? "inactive" : "active";
    const person = data.allPeople.find(p=>p.id===id);
    await supabase.from("profiles").update({ status: newStatus }).eq("id", id).eq("org_id", orgId);
    await logAudit("edit","person",id,person?.full_name,`${newStatus==="active"?"Activated":"Deactivated"} person: ${person?.full_name||id}`,{status:currentStatus},{status:newStatus});
    fetchAllData();
  }

  async function handleDeletePerson(id) {
    const person = data.allPeople.find(p=>p.id===id);
    await supabase.from("contributions").delete().eq("member_id", id).eq("org_id", orgId);
    await supabase.from("profiles").delete().eq("id", id).eq("org_id", orgId);
    await logAudit("delete","person",id,person?.full_name,`Deleted person: ${person?.full_name||id}`,{full_name:person?.full_name},null);
    fetchAllData();
  }

  async function handleEditContribution(e) {
    e.preventDefault(); setFormLoading(true); setFormError(null);
    try {
      const old = data.rawContributions.find(c => c.id === editingContribution.id);
      const { error } = await supabase.from("contributions").update({
        amount: Number(editingContribution.amount),
        payment_type_id: editingContribution.payment_type_id || null,
        note: editingContribution.note,
      }).eq("id", editingContribution.id).eq("org_id", orgId);
      if (error) throw error;
      await logAudit("edit","contribution",editingContribution.id,editingContribution.member_name,`Edited contribution for ${editingContribution.member_name}`,{amount:old?.amount,note:old?.note},{amount:editingContribution.amount,note:editingContribution.note});
      closeModal(); fetchAllData();
    } catch(err) { setFormError(err.message); } finally { setFormLoading(false); }
  }

  async function handleDeleteContribution(c) {
    await supabase.from("contributions").delete().eq("id", c.id).eq("org_id", orgId);
    await logAudit("delete","contribution",c.id,c.profiles?.full_name||"Member",`Deleted contribution of ${c.amount} for ${c.profiles?.full_name||"Member"}`,{amount:c.amount},null);
    fetchAllData();
  }

  async function handleEditExpenseEntry(e) {
    e.preventDefault(); setFormLoading(true); setFormError(null);
    try {
      const old = data.rawExpenses.find(ex => ex.id === editingExpenseEntry.id);
      const { error } = await supabase.from("expenses").update({
        amount: Number(editingExpenseEntry.amount),
        label: editingExpenseEntry.label,
        category_id: editingExpenseEntry.category_id,
      }).eq("id", editingExpenseEntry.id).eq("org_id", orgId);
      if (error) throw error;
      await logAudit("edit","expense",editingExpenseEntry.id,null,`Edited expense: ${editingExpenseEntry.label}`,{amount:old?.amount,label:old?.label},{amount:editingExpenseEntry.amount,label:editingExpenseEntry.label});
      closeModal(); fetchAllData();
    } catch(err) { setFormError(err.message); } finally { setFormLoading(false); }
  }

  async function handleDeleteExpenseEntry(ex) {
    await supabase.from("expenses").delete().eq("id", ex.id).eq("org_id", orgId);
    await logAudit("delete","expense",ex.id,null,`Deleted expense: ${ex.label} (${ex.amount})`,{amount:ex.amount,label:ex.label},null);
    fetchAllData();
  }

  // ── CSV export helpers ───────────────────────────────────────
  function exportToCSV(filename, headers, rows) {
    const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [headers.map(escape).join(","), ...rows.map(r => r.map(escape).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  function inExportRange(dateStr) {
    const d = new Date(dateStr);
    if (exportDateFrom && d < new Date(exportDateFrom)) return false;
    if (exportDateTo   && d > new Date(exportDateTo + "T23:59:59")) return false;
    return true;
  }

  function exportFinancialReport() {
    const headers = ["Date","Type","Category / Person","Description","Amount"];
    const contribRows = (data.rawContributions||[]).filter(c=>inExportRange(c.created_at)).map(c=>[new Date(c.created_at).toLocaleDateString(),"Income",c.profiles?.full_name||"Member",c.payment_types?.name||"Contribution",c.amount]);
    const expenseRows = (data.rawExpenses||[]).filter(e=>inExportRange(e.created_at)).map(e=>[new Date(e.created_at).toLocaleDateString(),"Expense",e.expense_categories?.name||"Expense",e.label,`-${e.amount}`]);
    const rows = [...contribRows,...expenseRows].sort((a,b)=>new Date(b[0])-new Date(a[0]));
    const suffix = exportDateFrom||exportDateTo ? `_${exportDateFrom||"start"}_to_${exportDateTo||"today"}` : "";
    exportToCSV(`financial-report${suffix}-${new Date().toISOString().slice(0,10)}.csv`, headers, rows);
  }

  // ── Derived values ───────────────────────────────────────────
  const isSuperAdmin       = orgRole === "super_admin";
  const currentMonth       = new Date().toLocaleString("en-US",{month:"long"});
  const membersWithTarget  = data.people.filter(p=>p.target>0);
  const onTrack            = membersWithTarget.filter(p=>p.thisMonth>=p.target).length;
  const behind             = membersWithTarget.filter(p=>p.thisMonth>0&&p.thisMonth<p.target).length;
  const missed             = membersWithTarget.filter(p=>p.thisMonth===0&&p.target>0).length;
  const totalTargetThisMonth  = membersWithTarget.reduce((s,p)=>s+p.target,0);
  const totalActualThisMonth  = data.people.reduce((s,p)=>s+(p.thisMonth||0),0);
  const orgName            = data.org?.name || currentOrg?.name || "Unified";
  const fyText             = data.org ? fyLabel(data.org.financial_year_start, data.org.financial_year_format) : "";
  const monthlyData        = buildMonthly(data.rawContributions, data.rawExpenses);
  const timelineData       = buildTimeline(data.rawContributions);

  const navItems = [
    {id:"overview", label:"Overview", icon:"⊞"},
    {id:"people",   label:"People",   icon:"◎"},
    {id:"payments", label:"Payments", icon:"◈"},
    {id:"expenses", label:"Expenses", icon:"◉"},
    {id:"activity", label:"Activity", icon:"◷"},
    ...(isSuperAdmin ? [{id:"settings",label:"Settings",icon:"⊙"},{id:"audit",label:"Audit Log",icon:"◑"}] : []),
  ];

  return {
    data, loading, activeTab, setActiveTab, isDark, toggleTheme, t, visible,
    modal, openModal, closeModal, formLoading, formError, setFormError,
    isSuperAdmin, orgName, navItems, monthlyData, timelineData, auditLog,
    fmt: makeFmt(data.org?.currency || currentOrg?.currency || "USD"),
    newUser, setNewUser, newPerson, setNewPerson,
    newContribution, setNewContribution, newExpense, setNewExpense,
    bulkContributions, setBulkContributions,
    newPaymentType, setNewPaymentType, newExpenseCategory, setNewExpenseCategory,
    orgForm, setOrgForm,
    editingContribution, setEditingContribution,
    editingExpenseEntry, setEditingExpenseEntry,
    editingPaymentType, setEditingPaymentType,
    editingExpenseCategory, setEditingExpenseCategory,
    editingPerson, setEditingPerson,
    expandedPaymentType, setExpandedPaymentType,
    activitySearch, setActivitySearch, activityFilter, setActivityFilter,
    activityDateFrom, setActivityDateFrom, activityDateTo, setActivityDateTo,
    activityPage, setActivityPage, showPrintView, setShowPrintView,
    exportDateFrom, setExportDateFrom, exportDateTo, setExportDateTo,
    handleAddUser, handleAddPerson, handleAddContribution, handleBulkAddContributions, handleAddExpense,
    handleAddPaymentType, handleAddExpenseCategory,
    handleEditPaymentType, handleDeletePaymentType,
    handleEditExpenseCategory, handleDeleteExpenseCategory,
    handleSaveOrg, handleEditPerson, handleDeletePerson, handleDeactivatePerson,
    handleEditContribution, handleDeleteContribution,
    handleEditExpenseEntry, handleDeleteExpenseEntry,
    exportFinancialReport,
    currentOrg, orgRole,
  };
}