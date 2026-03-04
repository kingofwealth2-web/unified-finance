import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { makeFmt, light, dark, buildMonthly, buildTimeline, fyLabel } from "../constants.js";

export function useAppData({ session }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [isDark, setIsDark] = useState(() => localStorage.getItem("unified-theme") === "dark");
  const t = isDark ? dark : light;
  const toggleTheme = () => { const n = !isDark; setIsDark(n); localStorage.setItem("unified-theme", n?"dark":"light"); };

  const [data, setData] = useState({ totalBalance:0, totalContributions:0, totalExpenses:0, people:[], expenses:[], recentActivity:[], users:[], paymentTypes:[], allPeople:[], org:null, rawContributions:[], rawExpenses:[] });
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [fmt, setFmt] = useState(() => makeFmt("USD"));

  const [modal, setModal] = useState(null);
  const [newUser, setNewUser] = useState({ full_name:"", email:"", password:"", role:"admin" });
  const [newPerson, setNewPerson] = useState({ full_name:"", status:"active", monthly_target:"" });
  const [newContribution, setNewContribution] = useState({ member_id:"", amount:"", payment_type_id:"", note:"" });
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

  // Search & filter
  const [peopleSearch, setPeopleSearch] = useState("");
  const [activitySearch, setActivitySearch] = useState("");
  const [activityFilter, setActivityFilter] = useState("all");
  const [activityPage, setActivityPage] = useState(1);
  const ACTIVITY_PAGE_SIZE = 20; // all | contributions | expenses
  const [activityDateFrom, setActivityDateFrom] = useState("");
  const [activityDateTo, setActivityDateTo] = useState("");
  const [showPrintView, setShowPrintView] = useState(false);
  const [exportDateFrom, setExportDateFrom] = useState("");
  const [exportDateTo, setExportDateTo] = useState("");

  // Member detail panel
  const [selectedMember, setSelectedMember] = useState(null);

  // Edit contribution / expense entries
  const [editingContribution, setEditingContribution] = useState(null);
  const [editingExpenseEntry, setEditingExpenseEntry] = useState(null);

  // Audit log
  const [auditLog, setAuditLog] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const [visible, setVisible] = useState(false);
  useEffect(() => { setVisible(false); const timer = setTimeout(() => setVisible(true), 30); return () => clearTimeout(timer); }, [activeTab]);
  useEffect(() => { fetchAllData(); }, []);

  const openModal = (name) => { setFormError(null); setModal(name); };
  const closeModal = () => { setModal(null); setEditingPaymentType(null); setEditingExpenseCategory(null); setEditingPerson(null); };

  async function fetchAllData() {
    setLoading(true);
    try {
      const [{ data: profiles }, { data: contributions }, { data: categories }, { data: expenses }, { data: paymentTypes }, { data: orgRows }, { data: auditRows }] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at",{ascending:false}),
        supabase.from("contributions").select("*, profiles(full_name), payment_types(name,color)").order("created_at",{ascending:false}),
        supabase.from("expense_categories").select("*").order("created_at",{ascending:false}),
        supabase.from("expenses").select("*, expense_categories(name,color)").order("created_at",{ascending:false}),
        supabase.from("payment_types").select("*").order("created_at",{ascending:false}),
        supabase.from("org_settings").select("*").limit(1),
        supabase.from("audit_log").select("*").order("created_at",{ascending:false}).limit(200),
      ]);

      const org = orgRows?.[0] || null;
      if (org) {
        setFmt(() => makeFmt(org.currency || "USD"));
        setOrgForm({ name:org.name, address:org.address||"", contact_email:org.contact_email||"", contact_phone:org.contact_phone||"", currency:org.currency||"USD", financial_year_format:org.financial_year_format||"single", financial_year_start:org.financial_year_start||new Date().getFullYear() });
      }

      const me = (profiles||[]).find(p=>p.id===session?.user?.id);
      setUserRole(me?.role || "admin");

      const fmtLocal = makeFmt(org?.currency||"USD");
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

      setData({ totalBalance:totalC-totalE, totalContributions:totalC, totalExpenses:totalE, people, expenses:expenseData, recentActivity:[...cA,...eA].slice(0,10), users:(profiles||[]).filter(p=>["super_admin","admin"].includes(p.role)), paymentTypes:paymentTypeData, allPeople:profiles||[], org, categories:categories||[], rawContributions:contributions||[], rawExpenses:expenses||[] });
      setAuditLog(auditRows || []);
    } catch(err) { console.error(err); } finally { setLoading(false); }
  }

  async function handleAddUser(e) {
    e.preventDefault(); setFormLoading(true); setFormError(null);
    try { const {error}=await supabase.auth.signUp({email:newUser.email,password:newUser.password,options:{data:{full_name:newUser.full_name,role:newUser.role}}}); if(error)throw error; closeModal(); setNewUser({full_name:"",email:"",password:"",role:"admin"}); fetchAllData(); } catch(err){setFormError(err.message);} finally{setFormLoading(false);}
  }
  async function handleAddPerson(e) {
    e.preventDefault(); setFormLoading(true); setFormError(null);
    try { const {error}=await supabase.from("profiles").insert({id:crypto.randomUUID(),full_name:newPerson.full_name,role:"member",status:newPerson.status,monthly_target:newPerson.monthly_target?Number(newPerson.monthly_target):0}); if(error)throw error; closeModal(); setNewPerson({full_name:"",status:"active",monthly_target:""}); fetchAllData(); } catch(err){setFormError(err.message);} finally{setFormLoading(false);}
  }
  async function handleAddContribution(e) {
    e.preventDefault(); setFormLoading(true); setFormError(null);
    try { const {error}=await supabase.from("contributions").insert({member_id:newContribution.member_id,amount:Number(newContribution.amount),payment_type_id:newContribution.payment_type_id||null,note:newContribution.note,type:"other"}); if(error)throw error; closeModal(); setNewContribution({member_id:"",amount:"",payment_type_id:"",note:""}); fetchAllData(); } catch(err){setFormError(err.message);} finally{setFormLoading(false);}
  }
  async function handleAddExpense(e) {
    e.preventDefault(); setFormLoading(true); setFormError(null);
    try { const {error}=await supabase.from("expenses").insert({category_id:newExpense.category_id,amount:Number(newExpense.amount),label:newExpense.label,recorded_by:session?.user?.id}); if(error)throw error; closeModal(); setNewExpense({category_id:"",amount:"",label:""}); fetchAllData(); } catch(err){setFormError(err.message);} finally{setFormLoading(false);}
  }
  async function handleAddPaymentType(e) {
    e.preventDefault(); setFormLoading(true); setFormError(null);
    try { const {error}=await supabase.from("payment_types").insert({name:newPaymentType.name,description:newPaymentType.description||null,goal:newPaymentType.goal?Number(newPaymentType.goal):null,color:newPaymentType.color,created_by:session?.user?.id}); if(error)throw error; closeModal(); setNewPaymentType({name:"",description:"",goal:"",color:"#0071E3"}); fetchAllData(); } catch(err){setFormError(err.message);} finally{setFormLoading(false);}
  }
  async function handleAddExpenseCategory(e) {
    e.preventDefault(); setFormLoading(true); setFormError(null);
    try { const {error}=await supabase.from("expense_categories").insert({name:newExpenseCategory.name,description:newExpenseCategory.description||null,budget:newExpenseCategory.budget?Number(newExpenseCategory.budget):0,color:newExpenseCategory.color,created_by:session?.user?.id}); if(error)throw error; closeModal(); setNewExpenseCategory({name:"",description:"",budget:"",color:"#0071E3"}); fetchAllData(); } catch(err){setFormError(err.message);} finally{setFormLoading(false);}
  }
  async function handleEditPaymentType(e) {
    e.preventDefault(); setFormLoading(true); setFormError(null);
    try { const {error}=await supabase.from("payment_types").update({name:editingPaymentType.name,description:editingPaymentType.description||null,goal:editingPaymentType.goal?Number(editingPaymentType.goal):null,color:editingPaymentType.color}).eq("id",editingPaymentType.id); if(error)throw error; closeModal(); fetchAllData(); } catch(err){setFormError(err.message);} finally{setFormLoading(false);}
  }
  async function handleDeletePaymentType(id) {
    if(!confirm("Delete this payment type? This cannot be undone."))return;
    await supabase.from("payment_types").delete().eq("id",id); fetchAllData();
  }
  async function handleEditExpenseCategory(e) {
    e.preventDefault(); setFormLoading(true); setFormError(null);
    try { const {error}=await supabase.from("expense_categories").update({name:editingExpenseCategory.name,description:editingExpenseCategory.description||null,budget:editingExpenseCategory.budget?Number(editingExpenseCategory.budget):0,color:editingExpenseCategory.color}).eq("id",editingExpenseCategory.id); if(error)throw error; closeModal(); fetchAllData(); } catch(err){setFormError(err.message);} finally{setFormLoading(false);}
  }
  async function handleDeleteExpenseCategory(id) {
    if(!confirm("Delete this category? This cannot be undone."))return;
    await supabase.from("expenses").delete().eq("category_id",id);
    await supabase.from("expense_categories").delete().eq("id",id);
    fetchAllData();
  }
  async function handleSaveOrg(e) {
    e.preventDefault(); setFormLoading(true); setFormError(null);
    try { const {error}=await supabase.from("org_settings").update({...orgForm,financial_year_start:Number(orgForm.financial_year_start),updated_by:session?.user?.id,updated_at:new Date().toISOString()}).eq("id",data.org.id); if(error)throw error; closeModal(); fetchAllData(); } catch(err){setFormError(err.message);} finally{setFormLoading(false);}
  }

  async function handleEditPerson(e) {
    e.preventDefault(); setFormLoading(true); setFormError(null);
    try {
      const {error} = await supabase.from("profiles").update({
        full_name: editingPerson.full_name,
        status: editingPerson.status,
        monthly_target: editingPerson.monthly_target ? Number(editingPerson.monthly_target) : 0,
      }).eq("id", editingPerson.id);
      if (error) throw error;
      closeModal(); fetchAllData();
    } catch(err) { setFormError(err.message); } finally { setFormLoading(false); }
  }

    async function handleDeactivatePerson(id, currentStatus) {
    const newStatus = currentStatus === "Active" ? "inactive" : "active";
    await supabase.from("profiles").update({ status: newStatus }).eq("id", id);
    fetchAllData();
  }

  async function handleDeletePerson(id) {
    if (!confirm("Permanently delete this person and all their contribution records? This cannot be undone.")) return;
    await supabase.from("contributions").delete().eq("member_id", id);
    await supabase.from("profiles").delete().eq("id", id);
    fetchAllData();
  }

  function exportToCSV(filename, headers, rows) {
    const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [headers.map(escape).join(","), ...rows.map(r => r.map(escape).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  function exportPeopleReport() {
    const headers = ["Name", "Status", "Total Contributed", "Last Activity"];
    const rows = data.people.map(p => [p.name, p.status, p.contributions, p.lastActivity]);
    exportToCSV(`people-report-${new Date().toISOString().slice(0,10)}.csv`, headers, rows);
  }

  function inExportRange(dateStr) {
    const d = new Date(dateStr);
    if (exportDateFrom && d < new Date(exportDateFrom)) return false;
    if (exportDateTo && d > new Date(exportDateTo + "T23:59:59")) return false;
    return true;
  }

  function exportFinancialReport() {
    const headers = ["Date", "Type", "Category / Person", "Description", "Amount"];
    const contribRows = (data.rawContributions || []).filter(c => inExportRange(c.created_at)).map(c => [
      new Date(c.created_at).toLocaleDateString(),
      "Income",
      c.profiles?.full_name || "Member",
      c.payment_types?.name || "Contribution",
      c.amount,
    ]);
    const expenseRows = (data.rawExpenses || []).filter(e => inExportRange(e.created_at)).map(e => [
      new Date(e.created_at).toLocaleDateString(),
      "Expense",
      e.expense_categories?.name || "Expense",
      e.label,
      `-${e.amount}`,
    ]);
    const rows = [...contribRows, ...expenseRows].sort((a, b) => new Date(b[0]) - new Date(a[0]));
    const suffix = exportDateFrom || exportDateTo
      ? `_${exportDateFrom||"start"}_to_${exportDateTo||"today"}`
      : "";
    exportToCSV(`financial-report${suffix}-${new Date().toISOString().slice(0,10)}.csv`, headers, rows);
  }

  // ── Audit log helper ──────────────────────────────────────────
  async function logAudit(action, entity, entityId, memberName, description, oldVal, newVal) {
    try {
      await supabase.from("audit_log").insert({
        action, entity, entity_id: entityId, member_name: memberName,
        description, old_value: oldVal || null, new_value: newVal || null,
        performed_by: session?.user?.id, performed_by_email: session?.user?.email,
      });
    } catch(e) { console.error("audit log failed", e); }
  }

  // ── Edit contribution ──────────────────────────────────────────
  async function handleEditContribution(e) {
    e.preventDefault(); setFormLoading(true); setFormError(null);
    try {
      const old = data.rawContributions.find(c => c.id === editingContribution.id);
      const { error } = await supabase.from("contributions").update({
        amount: Number(editingContribution.amount),
        payment_type_id: editingContribution.payment_type_id || null,
        note: editingContribution.note,
      }).eq("id", editingContribution.id);
      if (error) throw error;
      await logAudit("edit", "contribution", editingContribution.id,
        editingContribution.member_name,
        `Edited contribution for ${editingContribution.member_name}`,
        { amount: old?.amount, note: old?.note },
        { amount: editingContribution.amount, note: editingContribution.note }
      );
      closeModal(); fetchAllData();
    } catch(err) { setFormError(err.message); } finally { setFormLoading(false); }
  }

  async function handleDeleteContribution(c) {
    if (!confirm(`Delete this ${fmt(c.amount)} contribution? This cannot be undone.`)) return;
    await supabase.from("contributions").delete().eq("id", c.id);
    await logAudit("delete", "contribution", c.id, c.profiles?.full_name || "Member",
      `Deleted contribution of ${c.amount} for ${c.profiles?.full_name || "Member"}`,
      { amount: c.amount }, null
    );
    fetchAllData();
  }

  // ── Edit expense entry ─────────────────────────────────────────
  async function handleEditExpenseEntry(e) {
    e.preventDefault(); setFormLoading(true); setFormError(null);
    try {
      const old = data.rawExpenses.find(ex => ex.id === editingExpenseEntry.id);
      const { error } = await supabase.from("expenses").update({
        amount: Number(editingExpenseEntry.amount),
        label: editingExpenseEntry.label,
        category_id: editingExpenseEntry.category_id,
      }).eq("id", editingExpenseEntry.id);
      if (error) throw error;
      await logAudit("edit", "expense", editingExpenseEntry.id,
        null,
        `Edited expense: ${editingExpenseEntry.label}`,
        { amount: old?.amount, label: old?.label },
        { amount: editingExpenseEntry.amount, label: editingExpenseEntry.label }
      );
      closeModal(); fetchAllData();
    } catch(err) { setFormError(err.message); } finally { setFormLoading(false); }
  }

  async function handleDeleteExpenseEntry(ex) {
    if (!confirm(`Delete "${ex.label}" (${fmt(ex.amount)})? This cannot be undone.`)) return;
    await supabase.from("expenses").delete().eq("id", ex.id);
    await logAudit("delete", "expense", ex.id, null,
      `Deleted expense: ${ex.label} (${ex.amount})`,
      { amount: ex.amount, label: ex.label }, null
    );
    fetchAllData();
  }

  const isSuperAdmin = userRole === "super_admin";
  const currentMonth = new Date().toLocaleString("en-US",{month:"long"});
  const membersWithTarget = data.people.filter(p=>p.target>0);
  const onTrack = membersWithTarget.filter(p=>p.thisMonth>=p.target).length;
  const behind = membersWithTarget.filter(p=>p.thisMonth>0&&p.thisMonth<p.target).length;
  const missed = membersWithTarget.filter(p=>p.thisMonth===0&&p.target>0).length;
  const totalTargetThisMonth = membersWithTarget.reduce((s,p)=>s+p.target,0);
  const totalActualThisMonth = data.people.reduce((s,p)=>s+(p.thisMonth||0),0);
  const orgName = data.org?.name || "Unified";
  const fyText = data.org ? fyLabel(data.org.financial_year_start, data.org.financial_year_format) : "";
  const monthlyData = buildMonthly(data.rawContributions, data.rawExpenses);
  const timelineData = buildTimeline(data.rawContributions);

  const navItems = [
    {id:"overview",label:"Overview",icon:"⊞"},
    {id:"people",label:"People",icon:"◎"},
    {id:"payments",label:"Payments",icon:"◈"},
    {id:"expenses",label:"Expenses",icon:"◉"},
    {id:"activity",label:"Activity",icon:"◷"},
    ...(isSuperAdmin?[{id:"settings",label:"Settings",icon:"⊙"},{id:"audit",label:"Audit Log",icon:"◑"}]:[]),
  ];

  return {
    data, loading, activeTab, setActiveTab, isDark, toggleTheme, t,
    modal, openModal, closeModal, formLoading, formError, setFormError,
    userRole, isSuperAdmin, orgName, navItems, monthlyData, timelineData,
    auditLog,
    newUser, setNewUser, newPerson, setNewPerson,
    newContribution, setNewContribution, newExpense, setNewExpense,
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
    handleAddUser, handleAddPerson, handleAddContribution, handleAddExpense,
    handleAddPaymentType, handleAddExpenseCategory,
    handleEditPaymentType, handleDeletePaymentType,
    handleEditExpenseCategory, handleDeleteExpenseCategory,
    handleSaveOrg, handleEditPerson, handleDeletePerson,
    handleEditContribution, handleDeleteContribution,
    handleEditExpenseEntry, handleDeleteExpenseEntry,
    exportFinancialReport,
    fmt: makeFmt(data.org?.currency || 'USD'),
  };
}