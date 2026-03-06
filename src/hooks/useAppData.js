import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { toast } from "../components/ui/index.jsx";
import { makeFmt, light, dark, buildMonthly, buildTimeline, fyLabel } from "../constants.js";

export function useAppData({ session, currentOrg, orgRole: initialOrgRole, viewingFY }) {
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

  // Income sources
  const [newIncome, setNewIncome] = useState({ label:"", amount:"", source:"", note:"", date: new Date().toISOString().slice(0,10) });
  const [editingIncomeSource, setEditingIncomeSource] = useState(null);

  // Bulk contributions
  const [bulkContributions, setBulkContributions] = useState(null);

  // Export date range
  const [exportDateFrom, setExportDateFrom] = useState("");
  const [exportDateTo, setExportDateTo] = useState("");

  // Search & filter
  const [peopleSearch, setPeopleSearch] = useState("");
  const [activitySearch, setActivitySearch] = useState("");
  const [activityFilter, setActivityFilter] = useState("all");
  const [activityPage, setActivityPage] = useState(1);
  const ACTIVITY_PAGE_SIZE = 20; // all | contributions | expenses
  const [activityDateFrom, setActivityDateFrom] = useState("");
  const [activityDateTo, setActivityDateTo] = useState("");
  const [showPrintView, setShowPrintView] = useState(false);
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
  useEffect(() => { if(currentOrg?.id) fetchAllData(); }, [currentOrg?.id, viewingFY]);

  const openModal = (name) => { setFormError(null); setModal(name); };
  const closeModal = () => { setModal(null); setEditingPaymentType(null); setEditingExpenseCategory(null); setEditingPerson(null); };

  async function fetchAllData() {
    setLoading(true);
    try {
      const orgId = currentOrg.id;
      // Get org first to know the current financial year
      const { data: orgRowsFirst } = await supabase.from("org_settings").select("*").eq("id", orgId).limit(1);
      const currentFY = orgRowsFirst?.[0]?.financial_year_start || new Date().getFullYear();
      const activeFY = viewingFY ?? currentFY;

      const [{ data: profiles }, { data: contributions }, { data: categories }, { data: expenses }, { data: paymentTypes }, { data: orgRows }, { data: auditRows }, { data: incomeRows }] = await Promise.all([
        supabase.from("profiles").select("*").eq("org_id", orgId).order("created_at",{ascending:false}),
        supabase.from("contributions").select("*, profiles(full_name), payment_types(name,color)").eq("org_id", orgId).eq("financial_year", activeFY).order("created_at",{ascending:false}),
        supabase.from("expense_categories").select("*").eq("org_id", orgId).order("created_at",{ascending:false}),
        supabase.from("expenses").select("*, expense_categories(name,color)").eq("org_id", orgId).eq("financial_year", activeFY).order("created_at",{ascending:false}),
        supabase.from("payment_types").select("*").eq("org_id", orgId).order("created_at",{ascending:false}),
        supabase.from("org_settings").select("*").eq("id", orgId).limit(1),
        supabase.from("audit_log").select("*").eq("org_id", orgId).order("created_at",{ascending:false}).limit(200),
        supabase.from("income_sources").select("*").eq("org_id", orgId).eq("financial_year", activeFY).order("created_at",{ascending:false}),
      ]);

      const org = orgRows?.[0] || null;
      if (org) {
        setFmt(() => makeFmt(org.currency || "USD"));
        setOrgForm({ name:org.name, address:org.address||"", contact_email:org.contact_email||"", contact_phone:org.contact_phone||"", currency:org.currency||"USD", financial_year_format:org.financial_year_format||"single", financial_year_start:org.financial_year_start||new Date().getFullYear() });
      }

      const me = (profiles||[]).find(p=>p.id===session?.user?.id);
      setUserRole(me?.role || initialOrgRole || "admin");

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

      const openingBalance = Number(org?.opening_balance || 0);
      const totalBalance = totalC - totalE + openingBalance;
      setData({ totalBalance, totalContributions:totalC, totalExpenses:totalE, people, expenses:expenseData, recentActivity:[...cA,...eA].slice(0,10), users:(profiles||[]).filter(p=>["super_admin","admin"].includes(p.role)), paymentTypes:paymentTypeData, allPeople:profiles||[], org, categories:categories||[], rawContributions:contributions||[], rawExpenses:expenses||[], rawIncome:incomeRows||[] });
      setAuditLog(auditRows || []);
    } catch(err) { console.error(err); } finally { setLoading(false); }
  }

  async function handleDeleteUser(userId, userName) {
    try {
      const { data: { session: adminSession } } = await supabase.auth.getSession();
      const response = await fetch(
        "https://jsxixfwjupxwruybyeut.supabase.co/functions/v1/delete-user",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${adminSession.access_token}`,
          },
          body: JSON.stringify({
            user_id: userId,
            requester_id: session?.user?.id,
          }),
        }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to delete user");
      await logAudit("delete","user",userId,userName,`Deleted user ${userName}`,{full_name:userName},null);
      fetchAllData(); toast(`${userName} removed`);
    } catch(err) { alert(err.message); }
  }

  async function handleAddUser(e) {
    e.preventDefault(); setFormLoading(true); setFormError(null);
    try {
      // Call Edge Function — creates auth user server-side with no session disruption
      const { data: { session: adminSession } } = await supabase.auth.getSession();
      const response = await fetch(
        "https://jsxixfwjupxwruybyeut.supabase.co/functions/v1/create-user",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${adminSession.access_token}`,
          },
          body: JSON.stringify({
            email: newUser.email,
            password: newUser.password,
            full_name: newUser.full_name,
            role: newUser.role,
            org_id: currentOrg.id,
          }),
        }
      );

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to create user");

      await logAudit("create","user",result.user_id,newUser.full_name,`Created user ${newUser.full_name} (${newUser.email})`,null,{email:newUser.email,role:newUser.role});
      closeModal(); setNewUser({full_name:"",email:"",password:"",role:"admin"}); fetchAllData(); toast("User created successfully");
    } catch(err){setFormError(err.message);} finally{setFormLoading(false);}
  }
  async function handleAddPerson(e) {
    e.preventDefault(); setFormLoading(true); setFormError(null);
    try {
      const {error}=await supabase.from("profiles").insert({id:crypto.randomUUID(),full_name:newPerson.full_name,role:"member",status:newPerson.status,monthly_target:newPerson.monthly_target?Number(newPerson.monthly_target):0,org_id:currentOrg.id});
      if(error)throw error;
      await logAudit("create","person",null,newPerson.full_name,`Added person ${newPerson.full_name}`,null,{full_name:newPerson.full_name,status:newPerson.status});
      closeModal(); setNewPerson({full_name:"",status:"active",monthly_target:""}); fetchAllData(); toast("Member added");
    } catch(err){setFormError(err.message);} finally{setFormLoading(false);}
  }
  async function handleAddContribution(e) {
    e.preventDefault(); setFormLoading(true); setFormError(null);
    try {
      const {error}=await supabase.from("contributions").insert({member_id:newContribution.member_id,amount:Number(newContribution.amount),payment_type_id:newContribution.payment_type_id||null,note:newContribution.note,type:"other",org_id:currentOrg.id,financial_year:data.org?.financial_year_start||new Date().getFullYear(),created_at:newContribution.date?new Date(newContribution.date).toISOString():new Date().toISOString()});
      if(error)throw error;
      const memberName = data.allPeople.find(p=>p.id===newContribution.member_id)?.full_name||"Member";
      await logAudit("create","contribution",null,memberName,`Recorded contribution of ${newContribution.amount} for ${memberName}`,null,{amount:newContribution.amount,note:newContribution.note});
      closeModal(); setNewContribution({member_id:"",amount:"",payment_type_id:"",note:""}); fetchAllData(); toast("Contribution recorded");
    } catch(err){setFormError(err.message);} finally{setFormLoading(false);}
  }
  async function handleAddExpense(e) {
    e.preventDefault(); setFormLoading(true); setFormError(null);
    try {
      const {error}=await supabase.from("expenses").insert({category_id:newExpense.category_id,amount:Number(newExpense.amount),label:newExpense.label,recorded_by:session?.user?.id,org_id:currentOrg.id,financial_year:data.org?.financial_year_start||new Date().getFullYear(),created_at:newExpense.date?new Date(newExpense.date).toISOString():new Date().toISOString()});
      if(error)throw error;
      const catName = data.categories?.find(c=>c.id===newExpense.category_id)?.name||"Expense";
      await logAudit("create","expense",null,null,`Recorded expense: ${newExpense.label} (${newExpense.amount}) under ${catName}`,null,{amount:newExpense.amount,label:newExpense.label});
      closeModal(); setNewExpense({category_id:"",amount:"",label:""}); fetchAllData(); toast("Expense recorded");
    } catch(err){setFormError(err.message);} finally{setFormLoading(false);}
  }
  async function handleAddPaymentType(e) {
    e.preventDefault(); setFormLoading(true); setFormError(null);
    try {
      const {error}=await supabase.from("payment_types").insert({name:newPaymentType.name,description:newPaymentType.description||null,goal:newPaymentType.goal?Number(newPaymentType.goal):null,color:newPaymentType.color,created_by:session?.user?.id,org_id:currentOrg.id});
      if(error)throw error;
      await logAudit("create","payment_type",null,null,`Created payment type: ${newPaymentType.name}`,null,{name:newPaymentType.name,goal:newPaymentType.goal});
      closeModal(); setNewPaymentType({name:"",description:"",goal:"",color:"#0071E3"}); fetchAllData(); toast("Payment type created");
    } catch(err){setFormError(err.message);} finally{setFormLoading(false);}
  }
  async function handleAddExpenseCategory(e) {
    e.preventDefault(); setFormLoading(true); setFormError(null);
    try {
      const {error}=await supabase.from("expense_categories").insert({name:newExpenseCategory.name,description:newExpenseCategory.description||null,budget:newExpenseCategory.budget?Number(newExpenseCategory.budget):0,color:newExpenseCategory.color,created_by:session?.user?.id,org_id:currentOrg.id});
      if(error)throw error;
      await logAudit("create","expense_category",null,null,`Created expense category: ${newExpenseCategory.name}`,null,{name:newExpenseCategory.name,budget:newExpenseCategory.budget});
      closeModal(); setNewExpenseCategory({name:"",description:"",budget:"",color:"#0071E3"}); fetchAllData(); toast("Expense category created");
    } catch(err){setFormError(err.message);} finally{setFormLoading(false);}
  }
  async function handleEditPaymentType(e) {
    e.preventDefault(); setFormLoading(true); setFormError(null);
    try {
      const old = data.paymentTypes.find(p=>p.id===editingPaymentType.id);
      const {error}=await supabase.from("payment_types").update({name:editingPaymentType.name,description:editingPaymentType.description||null,goal:editingPaymentType.goal?Number(editingPaymentType.goal):null,color:editingPaymentType.color}).eq("id",editingPaymentType.id);
      if(error)throw error;
      await logAudit("edit","payment_type",editingPaymentType.id,null,`Edited payment type: ${editingPaymentType.name}`,{name:old?.name,goal:old?.goal},{name:editingPaymentType.name,goal:editingPaymentType.goal});
      closeModal(); fetchAllData(); toast("Payment type updated");
    } catch(err){setFormError(err.message);} finally{setFormLoading(false);}
  }
  async function handleDeletePaymentType(id) {
    const pt = data.paymentTypes.find(p=>p.id===id);
    await supabase.from("payment_types").delete().eq("id",id);
    await logAudit("delete","payment_type",id,null,`Deleted payment type: ${pt?.name||id}`,{name:pt?.name},null);
    fetchAllData();
  }
  async function handleEditExpenseCategory(e) {
    e.preventDefault(); setFormLoading(true); setFormError(null);
    try {
      const old = data.expenses.find(c=>c.id===editingExpenseCategory.id);
      const {error}=await supabase.from("expense_categories").update({name:editingExpenseCategory.name,description:editingExpenseCategory.description||null,budget:editingExpenseCategory.budget?Number(editingExpenseCategory.budget):0,color:editingExpenseCategory.color}).eq("id",editingExpenseCategory.id);
      if(error)throw error;
      await logAudit("edit","expense_category",editingExpenseCategory.id,null,`Edited expense category: ${editingExpenseCategory.name}`,{name:old?.label,budget:old?.budget},{name:editingExpenseCategory.name,budget:editingExpenseCategory.budget});
      closeModal(); fetchAllData(); toast("Expense category updated");
    } catch(err){setFormError(err.message);} finally{setFormLoading(false);}
  }
  async function handleDeleteExpenseCategory(id) {
    const cat = data.expenses.find(c=>c.id===id);
    await supabase.from("expenses").delete().eq("category_id",id);
    await supabase.from("expense_categories").delete().eq("id",id);
    await logAudit("delete","expense_category",id,null,`Deleted expense category: ${cat?.label||id}`,{name:cat?.label},null);
    fetchAllData();
  }
  async function handleStartNewYear() {
    try {
      const org = data.org;
      if (!org) return;
      const newYear = (org.financial_year_start || new Date().getFullYear()) + 1;
      const closingBalance = data.totalBalance || 0;

      const { error } = await supabase.from("org_settings").update({
        financial_year_start: newYear,
        opening_balance: closingBalance,
        updated_by: session?.user?.id,
        updated_at: new Date().toISOString(),
      }).eq("id", org.id);

      if (error) throw error;

      await logAudit("edit","org",org.id,null,
        `Started new financial year FY${newYear}. Opening balance: ${closingBalance}`,
        { financial_year_start: org.financial_year_start, opening_balance: org.opening_balance },
        { financial_year_start: newYear, opening_balance: closingBalance }
      );

      fetchAllData();
      const currency = data.org?.currency || "USD";
      const fmtBalance = new Intl.NumberFormat("en-US",{style:"currency",currency,maximumFractionDigits:0}).format(closingBalance);
      toast(`FY${newYear} started — opening balance set to ${fmtBalance}`);
    } catch(err) { alert(err.message); }
  }

  async function handleSaveOrg(e) {
    e.preventDefault(); setFormLoading(true); setFormError(null);
    try {
      const {error}=await supabase.from("org_settings").update({...orgForm,financial_year_start:Number(orgForm.financial_year_start),opening_balance:orgForm.opening_balance?Number(orgForm.opening_balance):0,updated_by:session?.user?.id,updated_at:new Date().toISOString()}).eq("id",data.org?.id);
      if(error)throw error;
      await logAudit("edit","org",data.org?.id,null,`Updated organisation settings`,{name:data.org?.name},{name:orgForm.name,currency:orgForm.currency});
      closeModal(); fetchAllData(); toast("Organisation settings saved");
    } catch(err){setFormError(err.message);} finally{setFormLoading(false);}
  }

  async function handleEditPerson(e) {
    e.preventDefault(); setFormLoading(true); setFormError(null);
    try {
      const old = data.allPeople.find(p=>p.id===editingPerson.id);
      const {error} = await supabase.from("profiles").update({
        full_name: editingPerson.full_name,
        status: editingPerson.status,
        monthly_target: editingPerson.monthly_target ? Number(editingPerson.monthly_target) : 0,
      }).eq("id", editingPerson.id);
      if (error) throw error;
      await logAudit("edit","person",editingPerson.id,editingPerson.full_name,`Edited person: ${editingPerson.full_name}`,{full_name:old?.full_name,status:old?.status},{full_name:editingPerson.full_name,status:editingPerson.status});
      closeModal(); fetchAllData(); toast("Member updated");
    } catch(err) { setFormError(err.message); } finally { setFormLoading(false); }
  }

  async function handleDeactivatePerson(id, currentStatus) {
    const newStatus = currentStatus === "Active" ? "inactive" : "active";
    const person = data.allPeople.find(p=>p.id===id);
    await supabase.from("profiles").update({ status: newStatus }).eq("id", id);
    await logAudit("edit","person",id,person?.full_name,`${newStatus==="active"?"Activated":"Deactivated"} person: ${person?.full_name||id}`,{status:currentStatus},{status:newStatus});
    fetchAllData();
  }

  async function handleDeletePerson(id) {
    const person = data.allPeople.find(p=>p.id===id);
    await supabase.from("contributions").delete().eq("member_id", id);
    await supabase.from("profiles").delete().eq("id", id);
    await logAudit("delete","person",id,person?.full_name,`Deleted person: ${person?.full_name||id}`,{full_name:person?.full_name},null);
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

  // ── Income handlers ───────────────────────────────────────────
  async function handleDeleteIncomeSource(id) {
    const item = (data.rawIncome||[]).find(i=>i.id===id);
    await supabase.from("income_sources").delete().eq("id", id);
    await logAudit("delete","income",id,null,`Deleted income: ${item?.label||id}`,{label:item?.label,amount:item?.amount},null);
    fetchAllData();
  }

  async function handleAddIncome(e) {
    e.preventDefault(); setFormLoading(true); setFormError(null);
    try {
      const {error}=await supabase.from("income_sources").insert({
        label:newIncome.label, amount:Number(newIncome.amount),
        source:newIncome.source||null, note:newIncome.note||null,
        date:newIncome.date||new Date().toISOString().slice(0,10),
        recorded_by:session?.user?.id, org_id:currentOrg.id,
        financial_year:data.org?.financial_year_start||new Date().getFullYear(),
      });
      if(error)throw error;
      await logAudit("create","income",null,null,`Recorded income: ${newIncome.label} (${newIncome.amount})`,null,{label:newIncome.label,amount:newIncome.amount});
      closeModal(); setNewIncome({label:"",amount:"",source:"",note:"",date:new Date().toISOString().slice(0,10)}); fetchAllData(); toast("Income recorded");
    } catch(err){setFormError(err.message);} finally{setFormLoading(false);}
  }

  async function handleEditIncome(e) {
    e.preventDefault(); setFormLoading(true); setFormError(null);
    try {
      const {error}=await supabase.from("income_sources").update({
        label:editingIncomeSource.label, amount:Number(editingIncomeSource.amount),
        source:editingIncomeSource.source||null, note:editingIncomeSource.note||null,
        date:editingIncomeSource.date||null,
      }).eq("id",editingIncomeSource.id);
      if(error)throw error;
      await logAudit("edit","income",editingIncomeSource.id,null,`Edited income: ${editingIncomeSource.label}`,null,{label:editingIncomeSource.label,amount:editingIncomeSource.amount});
      closeModal(); fetchAllData(); toast("Income updated");
    } catch(err){setFormError(err.message);} finally{setFormLoading(false);}
  }

  // ── Bulk contribution handler ──────────────────────────────────
  async function handleBulkAddContributions(e) {
    e.preventDefault(); setFormLoading(true); setFormError(null);
    try {
      const entries = Object.entries(bulkContributions.amounts)
        .filter(([,v]) => v !== "" && Number(v) > 0)
        .map(([memberId, amount]) => ({
          member_id: memberId,
          amount: Number(amount),
          payment_type_id: bulkContributions.payment_type_id || null,
          note: bulkContributions.note || null,
          type: "other",
          org_id: currentOrg.id,
          financial_year: data.org?.financial_year_start || new Date().getFullYear(),
          created_at: bulkContributions.date ? new Date(bulkContributions.date).toISOString() : new Date().toISOString(),
        }));
      if (entries.length === 0) { setFormError("No amounts entered."); setFormLoading(false); return; }
      const {error} = await supabase.from("contributions").insert(entries);
      if(error) throw error;
      await logAudit("create","contribution",null,null,`Bulk recorded ${entries.length} contributions`,null,{count:entries.length});
      closeModal(); setBulkContributions(null); fetchAllData(); toast("Bulk contributions saved");
    } catch(err){setFormError(err.message);} finally{setFormLoading(false);}
  }

  // ── Audit log helper ──────────────────────────────────────────
  async function logAudit(action, entity, entityId, memberName, description, oldVal, newVal) {
    try {
      await supabase.from("audit_log").insert({
        action, entity, entity_id: entityId, member_name: memberName,
        description, old_value: oldVal || null, new_value: newVal || null,
        performed_by: session?.user?.id, performed_by_email: session?.user?.email,
        org_id: currentOrg?.id,
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
      closeModal(); fetchAllData(); toast("Contribution updated");
    } catch(err) { setFormError(err.message); } finally { setFormLoading(false); }
  }

  async function handleDeleteContribution(c) {
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
    {id:"income",label:"Income",icon:"◆"},
    {id:"activity",label:"Activity",icon:"◷"},
    {id:"summary",label:"Summary",icon:"◧"},
    ...(isSuperAdmin?[{id:"settings",label:"Settings",icon:"⊙"},{id:"audit",label:"Audit Log",icon:"◑"}]:[]),
  ];

  return {
    data, loading, activeTab, setActiveTab, isDark, toggleTheme, t, visible,
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
    handleDeleteUser, handleAddUser, handleAddPerson, handleAddContribution, handleAddExpense,
    handleAddPaymentType, handleAddExpenseCategory,
    handleEditPaymentType, handleDeletePaymentType,
    handleEditExpenseCategory, handleDeleteExpenseCategory,
    handleStartNewYear, handleSaveOrg, handleEditPerson, handleDeletePerson, handleDeactivatePerson,
    handleEditContribution, handleDeleteContribution,
    handleEditExpenseEntry, handleDeleteExpenseEntry,
    handleAddIncome, handleEditIncome, handleDeleteIncomeSource,
    handleBulkAddContributions,
    newIncome, setNewIncome, editingIncomeSource, setEditingIncomeSource,
    bulkContributions, setBulkContributions,
    exportFinancialReport, exportDateFrom, setExportDateFrom, exportDateTo, setExportDateTo,
    fmt: makeFmt(data.org?.currency || 'USD'),
  };
}