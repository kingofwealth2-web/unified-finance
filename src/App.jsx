import { useState, useEffect } from "react";
import { supabase } from "./lib/supabaseClient";

const fmt = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

const COLORS = ["#0071E3", "#34C759", "#FF9F0A", "#FF375F", "#BF5AF2", "#5AC8FA", "#FF6B35", "#00C7BE"];

const Avatar = ({ name, size = 36 }) => {
  const initials = (name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const colors = ["#0071E3", "#34C759", "#FF9F0A", "#FF375F", "#BF5AF2", "#5AC8FA"];
  const color = colors[(name || "?").charCodeAt(0) % colors.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: `linear-gradient(135deg, ${color}22, ${color}55)`,
      border: `1.5px solid ${color}44`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.33, fontWeight: 600, color, flexShrink: 0,
    }}>{initials}</div>
  );
};

const Modal = ({ title, onClose, children }) => (
  <div style={{
    position: "fixed", inset: 0, zIndex: 1000,
    background: "rgba(0,0,0,0.3)", backdropFilter: "blur(4px)",
    display: "flex", alignItems: "center", justifyContent: "center", padding: "20px",
  }} onClick={onClose}>
    <div style={{
      background: "white", borderRadius: 24, padding: "36px 40px",
      width: "100%", maxWidth: 460, boxShadow: "0 24px 80px rgba(0,0,0,0.15)",
      maxHeight: "90vh", overflowY: "auto",
    }} onClick={e => e.stopPropagation()}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, letterSpacing: "-0.4px" }}>{title}</h3>
        <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#8E8E93", lineHeight: 1 }}>×</button>
      </div>
      {children}
    </div>
  </div>
);

const Field = ({ label, children }) => (
  <div style={{ marginBottom: 16 }}>
    <label style={{ fontSize: 13, fontWeight: 500, color: "#1C1C1E", display: "block", marginBottom: 8 }}>{label}</label>
    {children}
  </div>
);

const Input = (props) => (
  <input {...props} style={{
    width: "100%", padding: "11px 14px", borderRadius: 10,
    border: "1px solid rgba(0,0,0,0.1)", fontSize: 14, color: "#1C1C1E",
    background: "#FAFAFA", outline: "none", boxSizing: "border-box",
    ...(props.style || {}),
  }}
    onFocus={e => e.target.style.borderColor = "#0071E3"}
    onBlur={e => e.target.style.borderColor = "rgba(0,0,0,0.1)"}
  />
);

const Textarea = (props) => (
  <textarea {...props} style={{
    width: "100%", padding: "11px 14px", borderRadius: 10,
    border: "1px solid rgba(0,0,0,0.1)", fontSize: 14, color: "#1C1C1E",
    background: "#FAFAFA", outline: "none", boxSizing: "border-box",
    resize: "vertical", minHeight: 80, fontFamily: "inherit",
    ...(props.style || {}),
  }}
    onFocus={e => e.target.style.borderColor = "#0071E3"}
    onBlur={e => e.target.style.borderColor = "rgba(0,0,0,0.1)"}
  />
);

const Select = ({ children, ...props }) => (
  <select {...props} style={{
    width: "100%", padding: "11px 14px", borderRadius: 10,
    border: "1px solid rgba(0,0,0,0.1)", fontSize: 14, color: "#1C1C1E",
    background: "#FAFAFA", outline: "none", boxSizing: "border-box", cursor: "pointer",
  }}>{children}</select>
);

const Btn = ({ children, variant = "primary", size = "md", ...props }) => (
  <button {...props} style={{
    padding: size === "sm" ? "7px 14px" : "11px 20px",
    borderRadius: size === "sm" ? 8 : 10, border: "none", cursor: "pointer",
    fontSize: size === "sm" ? 12 : 14, fontWeight: 600,
    background: variant === "primary" ? "#0071E3" : variant === "danger" ? "rgba(255,55,95,0.1)" : "rgba(0,0,0,0.05)",
    color: variant === "primary" ? "white" : variant === "danger" ? "#FF375F" : "#1C1C1E",
    opacity: props.disabled ? 0.6 : 1,
    ...(props.style || {}),
  }}>{children}</button>
);

const ColorPicker = ({ value, onChange }) => (
  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
    {COLORS.map(c => (
      <div key={c} onClick={() => onChange(c)} style={{
        width: 28, height: 28, borderRadius: "50%", background: c, cursor: "pointer",
        border: value === c ? "3px solid #1C1C1E" : "3px solid transparent",
        boxSizing: "border-box", transition: "border 0.15s ease",
      }} />
    ))}
  </div>
);

const EmptyState = ({ message, action }) => (
  <div style={{ textAlign: "center", padding: "48px 32px" }}>
    <div style={{ fontSize: 40, marginBottom: 12 }}>◎</div>
    <p style={{ color: "#8E8E93", fontSize: 14, margin: "0 0 16px" }}>{message}</p>
    {action}
  </div>
);

export default function App({ session }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [data, setData] = useState({ totalBalance: 0, people: [], expenses: [], recentActivity: [], users: [], categories: [], paymentTypes: [], allPeople: [] });
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);

  // Modals
  const [modal, setModal] = useState(null); // 'addUser','addPerson','addContribution','addExpense','addPaymentType','addExpenseCategory'

  // Forms
  const [newUser, setNewUser] = useState({ full_name: "", email: "", password: "", role: "admin" });
  const [newPerson, setNewPerson] = useState({ full_name: "", status: "active" });
  const [newContribution, setNewContribution] = useState({ member_id: "", amount: "", payment_type_id: "", note: "" });
  const [newExpense, setNewExpense] = useState({ category_id: "", amount: "", label: "" });
  const [newPaymentType, setNewPaymentType] = useState({ name: "", description: "", goal: "", color: "#0071E3" });
  const [newExpenseCategory, setNewExpenseCategory] = useState({ name: "", description: "", budget: "", color: "#0071E3" });
  const [editingPaymentType, setEditingPaymentType] = useState(null);
  const [editingExpenseCategory, setEditingExpenseCategory] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState(null);

  useEffect(() => { fetchAllData(); }, []);

  const openModal = (name) => { setFormError(null); setModal(name); };
  const closeModal = () => { setModal(null); setEditingPaymentType(null); setEditingExpenseCategory(null); };

  async function fetchAllData() {
    setLoading(true);
    try {
      const [{ data: profiles }, { data: contributions }, { data: categories }, { data: expenses }, { data: paymentTypes }] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("contributions").select("*, profiles(full_name), payment_types(name, color)").order("created_at", { ascending: false }),
        supabase.from("expense_categories").select("*").order("created_at", { ascending: false }),
        supabase.from("expenses").select("*, expense_categories(name, color)").order("created_at", { ascending: false }),
        supabase.from("payment_types").select("*").order("created_at", { ascending: false }),
      ]);

      const me = (profiles || []).find(p => p.id === session?.user?.id);
      setUserRole(me?.role || "admin");

      const people = (profiles || []).filter(p => p.role === "member").map(p => {
        const total = (contributions || []).filter(c => c.member_id === p.id).reduce((s, c) => s + Number(c.amount), 0);
        const last = (contributions || []).find(c => c.member_id === p.id);
        return {
          id: p.id, name: p.full_name,
          status: p.status === "active" ? "Active" : "Inactive",
          contributions: total,
          lastActivity: last ? new Date(last.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "No activity",
        };
      });

      const expenseData = (categories || []).map(cat => {
        const spent = (expenses || []).filter(e => e.category_id === cat.id).reduce((s, e) => s + Number(e.amount), 0);
        return { id: cat.id, label: cat.name, description: cat.description, amount: spent, budget: Number(cat.budget || 0), color: cat.color || "#0071E3" };
      });

      const paymentTypeData = (paymentTypes || []).map(pt => {
        const total = (contributions || []).filter(c => c.payment_type_id === pt.id).reduce((s, c) => s + Number(c.amount), 0);
        return { id: pt.id, name: pt.name, description: pt.description, total, goal: Number(pt.goal || 0), color: pt.color || "#0071E3", active: pt.active };
      });

      const contribActivity = (contributions || []).slice(0, 6).map(c => ({
        id: `c-${c.id}`, name: c.profiles?.full_name || "Member",
        action: c.payment_types?.name || "Contribution",
        amount: `+${fmt(c.amount)}`, time: new Date(c.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }), positive: true,
      }));
      const expenseActivity = (expenses || []).slice(0, 6).map(e => ({
        id: `e-${e.id}`, name: e.expense_categories?.name || "Expense",
        action: e.label, amount: `-${fmt(e.amount)}`,
        time: new Date(e.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }), positive: false,
      }));
      const recentActivity = [...contribActivity, ...expenseActivity].slice(0, 10);

      const totalContributions = (contributions || []).reduce((s, c) => s + Number(c.amount), 0);
      const totalExpenses = (expenses || []).reduce((s, e) => s + Number(e.amount), 0);

      setData({
        totalBalance: totalContributions - totalExpenses,
        totalContributions, totalExpenses,
        people, expenses: expenseData, recentActivity,
        users: (profiles || []).filter(p => ["super_admin", "admin"].includes(p.role)),
        categories: categories || [],
        paymentTypes: paymentTypeData,
        allPeople: profiles || [],
      });
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function handleAddUser(e) {
    e.preventDefault(); setFormLoading(true); setFormError(null);
    try {
      const { error } = await supabase.auth.signUp({
        email: newUser.email, password: newUser.password,
        options: { data: { full_name: newUser.full_name, role: newUser.role } },
      });
      if (error) throw error;
      closeModal(); setNewUser({ full_name: "", email: "", password: "", role: "admin" }); fetchAllData();
    } catch (err) { setFormError(err.message); }
    finally { setFormLoading(false); }
  }

  async function handleAddPerson(e) {
    e.preventDefault(); setFormLoading(true); setFormError(null);
    try {
      const { error } = await supabase.from("profiles").insert({ id: crypto.randomUUID(), full_name: newPerson.full_name, role: "member", status: newPerson.status });
      if (error) throw error;
      closeModal(); setNewPerson({ full_name: "", status: "active" }); fetchAllData();
    } catch (err) { setFormError(err.message); }
    finally { setFormLoading(false); }
  }

  async function handleAddContribution(e) {
    e.preventDefault(); setFormLoading(true); setFormError(null);
    try {
      const { error } = await supabase.from("contributions").insert({
        member_id: newContribution.member_id, amount: Number(newContribution.amount),
        payment_type_id: newContribution.payment_type_id || null, note: newContribution.note, type: "other",
      });
      if (error) throw error;
      closeModal(); setNewContribution({ member_id: "", amount: "", payment_type_id: "", note: "" }); fetchAllData();
    } catch (err) { setFormError(err.message); }
    finally { setFormLoading(false); }
  }

  async function handleAddExpense(e) {
    e.preventDefault(); setFormLoading(true); setFormError(null);
    try {
      const { error } = await supabase.from("expenses").insert({
        category_id: newExpense.category_id, amount: Number(newExpense.amount),
        label: newExpense.label, recorded_by: session?.user?.id,
      });
      if (error) throw error;
      closeModal(); setNewExpense({ category_id: "", amount: "", label: "" }); fetchAllData();
    } catch (err) { setFormError(err.message); }
    finally { setFormLoading(false); }
  }

  async function handleAddPaymentType(e) {
    e.preventDefault(); setFormLoading(true); setFormError(null);
    try {
      const { error } = await supabase.from("payment_types").insert({
        name: newPaymentType.name, description: newPaymentType.description || null,
        goal: newPaymentType.goal ? Number(newPaymentType.goal) : null,
        color: newPaymentType.color, created_by: session?.user?.id,
      });
      if (error) throw error;
      closeModal(); setNewPaymentType({ name: "", description: "", goal: "", color: "#0071E3" }); fetchAllData();
    } catch (err) { setFormError(err.message); }
    finally { setFormLoading(false); }
  }

  async function handleAddExpenseCategory(e) {
    e.preventDefault(); setFormLoading(true); setFormError(null);
    try {
      const { error } = await supabase.from("expense_categories").insert({
        name: newExpenseCategory.name, description: newExpenseCategory.description || null,
        budget: newExpenseCategory.budget ? Number(newExpenseCategory.budget) : 0,
        color: newExpenseCategory.color, created_by: session?.user?.id,
      });
      if (error) throw error;
      closeModal(); setNewExpenseCategory({ name: "", description: "", budget: "", color: "#0071E3" }); fetchAllData();
    } catch (err) { setFormError(err.message); }
    finally { setFormLoading(false); }
  }


  async function handleEditPaymentType(e) {
    e.preventDefault(); setFormLoading(true); setFormError(null);
    try {
      const { error } = await supabase.from("payment_types").update({
        name: editingPaymentType.name,
        description: editingPaymentType.description || null,
        goal: editingPaymentType.goal ? Number(editingPaymentType.goal) : null,
        color: editingPaymentType.color,
      }).eq("id", editingPaymentType.id);
      if (error) throw error;
      closeModal(); fetchAllData();
    } catch (err) { setFormError(err.message); }
    finally { setFormLoading(false); }
  }

  async function handleDeletePaymentType(id) {
    if (!confirm("Delete this payment type? This cannot be undone.")) return;
    await supabase.from("payment_types").delete().eq("id", id);
    fetchAllData();
  }

  async function handleEditExpenseCategory(e) {
    e.preventDefault(); setFormLoading(true); setFormError(null);
    try {
      const { error } = await supabase.from("expense_categories").update({
        name: editingExpenseCategory.name,
        description: editingExpenseCategory.description || null,
        budget: editingExpenseCategory.budget ? Number(editingExpenseCategory.budget) : 0,
        color: editingExpenseCategory.color,
      }).eq("id", editingExpenseCategory.id);
      if (error) throw error;
      closeModal(); fetchAllData();
    } catch (err) { setFormError(err.message); }
    finally { setFormLoading(false); }
  }

  async function handleDeleteExpenseCategory(id) {
    if (!confirm("Delete this category? This cannot be undone.")) return;
    await supabase.from("expense_categories").delete().eq("id", id);
    fetchAllData();
  }
  const isSuperAdmin = userRole === "super_admin";

  const navItems = [
    { id: "overview", label: "Overview", icon: "⊞" },
    { id: "people", label: "People", icon: "◎" },
    { id: "payments", label: "Payments", icon: "◈" },
    { id: "expenses", label: "Expenses", icon: "◉" },
    { id: "activity", label: "Activity", icon: "◷" },
    ...(isSuperAdmin ? [{ id: "settings", label: "Settings", icon: "⊙" }] : []),
  ];

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#F2F2F7", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg, #0071E3, #34AADC)", margin: "0 auto 16px" }} />
        <p style={{ color: "#8E8E93", fontSize: 14 }}>Loading Unified...</p>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#F2F2F7", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif", color: "#1C1C1E" }}>

      {/* Sidebar */}
      <div style={{ position: "fixed", left: 0, top: 0, bottom: 0, width: 240, background: "rgba(255,255,255,0.85)", backdropFilter: "blur(40px)", borderRight: "1px solid rgba(0,0,0,0.06)", display: "flex", flexDirection: "column", padding: "32px 0", zIndex: 100 }}>
        <div style={{ padding: "0 24px 40px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg, #0071E3, #34AADC)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 8h5M9 8h5M8 2v5M8 9v5" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
            </div>
            <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.4px" }}>Unified</span>
          </div>
        </div>

        <nav style={{ flex: 1, padding: "0 12px", display: "flex", flexDirection: "column", gap: 2 }}>
          {navItems.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, border: "none", cursor: "pointer",
              background: activeTab === item.id ? "rgba(0,113,227,0.1)" : "transparent",
              color: activeTab === item.id ? "#0071E3" : "#6E6E73",
              fontSize: 14, fontWeight: activeTab === item.id ? 600 : 400, textAlign: "left", transition: "all 0.15s ease",
            }}>
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div style={{ padding: "0 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px", borderRadius: 12, background: "rgba(0,0,0,0.03)" }}>
            <Avatar name={session?.user?.email || "A"} size={32} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#1C1C1E", textTransform: "uppercase", letterSpacing: "0.04em" }}>{isSuperAdmin ? "Super Admin" : "Admin"}</div>
              <div style={{ fontSize: 11, color: "#8E8E93", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{session?.user?.email}</div>
            </div>
            <button onClick={() => supabase.auth.signOut()} title="Sign out" style={{ background: "none", border: "none", cursor: "pointer", color: "#8E8E93", fontSize: 16, padding: 4, flexShrink: 0 }}>↪</button>
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={{ marginLeft: 240, padding: "40px 48px", maxWidth: 1100 }}>
        <div style={{ marginBottom: 40 }}>
          <p style={{ fontSize: 13, color: "#8E8E93", fontWeight: 500, marginBottom: 4, letterSpacing: "0.02em" }}>{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
          <h1 style={{ fontSize: 34, fontWeight: 700, letterSpacing: "-0.8px", margin: 0 }}>{navItems.find(n => n.id === activeTab)?.label}</h1>
        </div>

        {/* OVERVIEW */}
        {activeTab === "overview" && (
          <div>
            {/* Hero + stats */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
              <div style={{ gridColumn: "span 2", background: "linear-gradient(135deg, #0071E3 0%, #34AADC 100%)", borderRadius: 24, padding: "36px 40px", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.07)" }} />
                <div style={{ position: "absolute", bottom: -60, right: 60, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />
                <p style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.7)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>Net Balance</p>
                <h2 style={{ fontSize: 52, fontWeight: 700, color: "white", letterSpacing: "-2px", margin: "0 0 20px" }}>{fmt(data.totalBalance)}</h2>
                <div style={{ display: "flex", gap: 16 }}>
                  <div>
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", margin: "0 0 2px" }}>Total In</p>
                    <p style={{ fontSize: 16, fontWeight: 700, color: "white", margin: 0 }}>{fmt(data.totalContributions)}</p>
                  </div>
                  <div style={{ width: 1, background: "rgba(255,255,255,0.2)" }} />
                  <div>
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", margin: "0 0 2px" }}>Total Out</p>
                    <p style={{ fontSize: 16, fontWeight: 700, color: "white", margin: 0 }}>{fmt(data.totalExpenses)}</p>
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ background: "white", borderRadius: 20, padding: "24px", border: "1px solid rgba(0,0,0,0.05)", flex: 1 }}>
                  <p style={{ fontSize: 12, color: "#8E8E93", fontWeight: 500, marginBottom: 8 }}>People Tracked</p>
                  <p style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-1px", margin: 0 }}>{data.people.length}</p>
                </div>
                <div style={{ background: "white", borderRadius: 20, padding: "24px", border: "1px solid rgba(0,0,0,0.05)", flex: 1 }}>
                  <p style={{ fontSize: 12, color: "#8E8E93", fontWeight: 500, marginBottom: 8 }}>Payment Types</p>
                  <p style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-1px", margin: 0 }}>{data.paymentTypes.length}</p>
                </div>
              </div>
            </div>

            {/* Payment types overview */}
            {data.paymentTypes.length > 0 && (
              <div style={{ background: "white", borderRadius: 24, padding: "32px", border: "1px solid rgba(0,0,0,0.05)", marginBottom: 24 }}>
                <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 24, letterSpacing: "-0.3px" }}>Payment Breakdown</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  {data.paymentTypes.map(pt => {
                    const pct = pt.goal > 0 ? Math.min(Math.round((pt.total / pt.goal) * 100), 100) : 0;
                    return (
                      <div key={pt.id}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 8, height: 8, borderRadius: "50%", background: pt.color }} />
                            <span style={{ fontSize: 14, fontWeight: 500 }}>{pt.name}</span>
                          </div>
                          <div>
                            <span style={{ fontSize: 14, fontWeight: 600 }}>{fmt(pt.total)}</span>
                            {pt.goal > 0 && <span style={{ fontSize: 12, color: "#8E8E93", marginLeft: 6 }}>of {fmt(pt.goal)} goal</span>}
                          </div>
                        </div>
                        {pt.goal > 0 && (
                          <div style={{ height: 6, background: "#F2F2F7", borderRadius: 99, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${pct}%`, background: pt.color, borderRadius: 99, transition: "width 0.6s ease" }} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recent activity */}
            <div style={{ background: "white", borderRadius: 24, padding: "32px", border: "1px solid rgba(0,0,0,0.05)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <h3 style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.3px", margin: 0 }}>Recent Activity</h3>
                <button onClick={() => setActiveTab("activity")} style={{ background: "none", border: "none", color: "#0071E3", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>View all</button>
              </div>
              {data.recentActivity.length === 0
                ? <EmptyState message="No activity yet." />
                : <div style={{ display: "flex", flexDirection: "column" }}>
                    {data.recentActivity.slice(0, 5).map((item, i) => (
                      <div key={item.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: i < 4 ? "1px solid #F2F2F7" : "none" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <Avatar name={item.name} size={36} />
                          <div>
                            <p style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>{item.name}</p>
                            <p style={{ fontSize: 12, color: "#8E8E93", margin: 0 }}>{item.action}</p>
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <p style={{ fontSize: 14, fontWeight: 600, margin: 0, color: item.positive ? "#34C759" : "#FF375F" }}>{item.amount}</p>
                          <p style={{ fontSize: 11, color: "#8E8E93", margin: 0 }}>{item.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
              }
            </div>
          </div>
        )}

        {/* PEOPLE */}
        {activeTab === "people" && (
          <div style={{ background: "white", borderRadius: 24, padding: "32px", border: "1px solid rgba(0,0,0,0.05)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
              <h3 style={{ fontSize: 17, fontWeight: 600, margin: 0 }}>{data.people.length} People</h3>
              <div style={{ display: "flex", gap: 10 }}>
                <Btn onClick={() => openModal("addContribution")} variant="secondary">+ Contribution</Btn>
                <Btn onClick={() => openModal("addPerson")}>+ Add Person</Btn>
              </div>
            </div>
            {data.people.length === 0
              ? <EmptyState message='No people added yet.' action={<Btn onClick={() => openModal("addPerson")}>Add First Person</Btn>} />
              : <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {data.people.map((person, i) => (
                    <div key={person.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px", borderRadius: 14, background: i % 2 === 0 ? "#FAFAFA" : "white" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <Avatar name={person.name} size={42} />
                        <div>
                          <p style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>{person.name}</p>
                          <p style={{ fontSize: 12, color: "#8E8E93", margin: 0 }}>Last active {person.lastActivity}</p>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
                        <div style={{ textAlign: "right" }}>
                          <p style={{ fontSize: 15, fontWeight: 700, margin: 0, letterSpacing: "-0.3px" }}>{fmt(person.contributions)}</p>
                          <p style={{ fontSize: 11, color: "#8E8E93", margin: 0 }}>Total contributed</p>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 20, background: person.status === "Active" ? "rgba(52,199,89,0.12)" : "rgba(142,142,147,0.12)", color: person.status === "Active" ? "#34C759" : "#8E8E93" }}>
                          {person.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
            }
          </div>
        )}

        {/* PAYMENTS */}
        {activeTab === "payments" && (
          <div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20, gap: 10 }}>
              <Btn onClick={() => openModal("addContribution")} variant="secondary">+ Record Payment</Btn>
              {isSuperAdmin && <Btn onClick={() => openModal("addPaymentType")}>+ New Payment Type</Btn>}
            </div>
            {data.paymentTypes.length === 0
              ? <div style={{ background: "white", borderRadius: 24, border: "1px solid rgba(0,0,0,0.05)" }}>
                  <EmptyState message="No payment types yet." action={isSuperAdmin ? <Btn onClick={() => openModal("addPaymentType")}>Create First Payment Type</Btn> : null} />
                </div>
              : <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {data.paymentTypes.map(pt => {
                    const pct = pt.goal > 0 ? Math.min(Math.round((pt.total / pt.goal) * 100), 100) : 0;
                    return (
                      <div key={pt.id} style={{ background: "white", borderRadius: 24, padding: "28px 32px", border: "1px solid rgba(0,0,0,0.05)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: pt.goal > 0 ? 20 : 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                            <div style={{ width: 48, height: 48, borderRadius: 14, background: `${pt.color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <div style={{ width: 16, height: 16, borderRadius: "50%", background: pt.color }} />
                            </div>
                            <div>
                              <h4 style={{ fontSize: 17, fontWeight: 600, margin: 0, letterSpacing: "-0.3px" }}>{pt.name}</h4>
                              {pt.description && <p style={{ fontSize: 12, color: "#8E8E93", margin: "2px 0 0" }}>{pt.description}</p>}
                            </div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <p style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-1px", margin: 0 }}>{fmt(pt.total)}</p>
                            {pt.goal > 0 && <p style={{ fontSize: 12, color: "#8E8E93", margin: 0 }}>of {fmt(pt.goal)} goal</p>}
                          </div>
                        </div>
                        {pt.goal > 0 && (
                          <>
                            <div style={{ height: 8, background: "#F2F2F7", borderRadius: 99, overflow: "hidden", marginBottom: 10 }}>
                              <div style={{ height: "100%", width: `${pct}%`, background: pt.color, borderRadius: 99 }} />
                            </div>
                            <p style={{ fontSize: 12, color: "#8E8E93", margin: 0 }}>
                              <span style={{ color: "#34C759", fontWeight: 600 }}>{fmt(pt.goal - pt.total)} remaining</span> · {pct}% reached
                            </p>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
            }
          </div>
        )}

        {/* EXPENSES */}
        {activeTab === "expenses" && (
          <div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20, gap: 10 }}>
              <Btn onClick={() => openModal("addExpense")} variant="secondary">+ Record Expense</Btn>
              {isSuperAdmin && <Btn onClick={() => openModal("addExpenseCategory")}>+ New Category</Btn>}
            </div>
            {data.expenses.length === 0
              ? <div style={{ background: "white", borderRadius: 24, border: "1px solid rgba(0,0,0,0.05)" }}>
                  <EmptyState message="No expense categories yet." action={isSuperAdmin ? <Btn onClick={() => openModal("addExpenseCategory")}>Create First Category</Btn> : null} />
                </div>
              : <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {data.expenses.map(exp => {
                    const pct = exp.budget > 0 ? Math.min(Math.round((exp.amount / exp.budget) * 100), 100) : 0;
                    return (
                      <div key={exp.id} style={{ background: "white", borderRadius: 24, padding: "28px 32px", border: "1px solid rgba(0,0,0,0.05)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: exp.budget > 0 ? 20 : 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                            <div style={{ width: 48, height: 48, borderRadius: 14, background: `${exp.color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <div style={{ width: 16, height: 16, borderRadius: "50%", background: exp.color }} />
                            </div>
                            <div>
                              <h4 style={{ fontSize: 17, fontWeight: 600, margin: 0, letterSpacing: "-0.3px" }}>{exp.label}</h4>
                              {exp.description && <p style={{ fontSize: 12, color: "#8E8E93", margin: "2px 0 0" }}>{exp.description}</p>}
                              {exp.budget > 0 && <p style={{ fontSize: 12, color: "#8E8E93", margin: "2px 0 0" }}>{pct}% of budget used</p>}
                            </div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <p style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-1px", margin: 0 }}>{fmt(exp.amount)}</p>
                            {exp.budget > 0 && <p style={{ fontSize: 12, color: "#8E8E93", margin: 0 }}>of {fmt(exp.budget)} budget</p>}
                          </div>
                        </div>
                        {exp.budget > 0 && (
                          <>
                            <div style={{ height: 8, background: "#F2F2F7", borderRadius: 99, overflow: "hidden", marginBottom: 10 }}>
                              <div style={{ height: "100%", width: `${pct}%`, background: exp.color, borderRadius: 99 }} />
                            </div>
                            <p style={{ fontSize: 12, color: "#8E8E93", margin: 0 }}>
                              <span style={{ color: "#34C759", fontWeight: 600 }}>{fmt(exp.budget - exp.amount)} remaining</span>
                            </p>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
            }
          </div>
        )}

        {/* ACTIVITY */}
        {activeTab === "activity" && (
          <div style={{ background: "white", borderRadius: 24, padding: "32px", border: "1px solid rgba(0,0,0,0.05)" }}>
            <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 24, letterSpacing: "-0.3px" }}>All Activity</h3>
            {data.recentActivity.length === 0
              ? <EmptyState message="No activity yet." />
              : <div style={{ display: "flex", flexDirection: "column" }}>
                  {data.recentActivity.map((item, i) => (
                    <div key={item.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0", borderBottom: i < data.recentActivity.length - 1 ? "1px solid #F2F2F7" : "none" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <Avatar name={item.name} size={42} />
                        <div>
                          <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{item.name}</p>
                          <p style={{ fontSize: 12, color: "#8E8E93", margin: 0 }}>{item.action} · {item.time}</p>
                        </div>
                      </div>
                      <span style={{ fontSize: 15, fontWeight: 700, color: item.positive ? "#34C759" : "#FF375F" }}>{item.amount}</span>
                    </div>
                  ))}
                </div>
            }
          </div>
        )}

        {/* SETTINGS — Super Admin only */}
        {activeTab === "settings" && isSuperAdmin && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

            {/* Users */}
            <div style={{ background: "white", borderRadius: 24, padding: "32px", border: "1px solid rgba(0,0,0,0.05)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 600, margin: 0 }}>System Users</h3>
                  <p style={{ fontSize: 13, color: "#8E8E93", margin: "4px 0 0" }}>People who can log into Unified</p>
                </div>
                <Btn onClick={() => openModal("addUser")}>+ Add User</Btn>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {(data.users || []).map((user, i) => (
                  <div key={user.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderRadius: 14, background: i % 2 === 0 ? "#FAFAFA" : "white" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <Avatar name={user.full_name || user.email} size={40} />
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{user.full_name || "—"}</p>
                        <p style={{ fontSize: 12, color: "#8E8E93", margin: 0 }}>{user.email}</p>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20, textTransform: "uppercase", letterSpacing: "0.04em", background: user.role === "super_admin" ? "rgba(0,113,227,0.1)" : "rgba(52,199,89,0.1)", color: user.role === "super_admin" ? "#0071E3" : "#34C759" }}>
                        {user.role === "super_admin" ? "Super Admin" : "Admin"}
                      </span>
                      {user.id === session?.user?.id && <span style={{ fontSize: 11, color: "#8E8E93", fontStyle: "italic" }}>You</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Types */}
            <div style={{ background: "white", borderRadius: 24, padding: "32px", border: "1px solid rgba(0,0,0,0.05)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 600, margin: 0 }}>Payment Types</h3>
                  <p style={{ fontSize: 13, color: "#8E8E93", margin: "4px 0 0" }}>Categories people can contribute towards</p>
                </div>
                <Btn onClick={() => openModal("addPaymentType")}>+ New Type</Btn>
              </div>
              {data.paymentTypes.length === 0
                ? <EmptyState message="No payment types yet." />
                : <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {data.paymentTypes.map((pt, i) => (
                      <div key={pt.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderRadius: 14, background: i % 2 === 0 ? "#FAFAFA" : "white" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ width: 12, height: 12, borderRadius: "50%", background: pt.color, flexShrink: 0 }} />
                          <div>
                            <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{pt.name}</p>
                            {pt.description && <p style={{ fontSize: 12, color: "#8E8E93", margin: 0 }}>{pt.description}</p>}
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ textAlign: "right", marginRight: 8 }}>
                            <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{fmt(pt.total)}</p>
                            {pt.goal > 0 && <p style={{ fontSize: 11, color: "#8E8E93", margin: 0 }}>Goal: {fmt(pt.goal)}</p>}
                          </div>
                          <Btn size="sm" variant="secondary" onClick={() => { setEditingPaymentType({ ...pt, goal: pt.goal || "" }); openModal("editPaymentType"); }}>Edit</Btn>
                          <Btn size="sm" variant="danger" onClick={() => handleDeletePaymentType(pt.id)}>Delete</Btn>
                        </div>
                      </div>
                    ))}
                  </div>
              }
            </div>

            {/* Expense Categories */}
            <div style={{ background: "white", borderRadius: 24, padding: "32px", border: "1px solid rgba(0,0,0,0.05)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 600, margin: 0 }}>Expense Categories</h3>
                  <p style={{ fontSize: 13, color: "#8E8E93", margin: "4px 0 0" }}>Categories for tracking organizational spending</p>
                </div>
                <Btn onClick={() => openModal("addExpenseCategory")}>+ New Category</Btn>
              </div>
              {data.expenses.length === 0
                ? <EmptyState message="No expense categories yet." />
                : <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {data.expenses.map((exp, i) => (
                      <div key={exp.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderRadius: 14, background: i % 2 === 0 ? "#FAFAFA" : "white" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ width: 12, height: 12, borderRadius: "50%", background: exp.color, flexShrink: 0 }} />
                          <div>
                            <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{exp.label}</p>
                            {exp.description && <p style={{ fontSize: 12, color: "#8E8E93", margin: 0 }}>{exp.description}</p>}
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ textAlign: "right", marginRight: 8 }}>
                            <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{fmt(exp.amount)} spent</p>
                            {exp.budget > 0 && <p style={{ fontSize: 11, color: "#8E8E93", margin: 0 }}>Budget: {fmt(exp.budget)}</p>}
                          </div>
                          <Btn size="sm" variant="secondary" onClick={() => { setEditingExpenseCategory({ ...exp, budget: exp.budget || "", name: exp.label }); openModal("editExpenseCategory"); }}>Edit</Btn>
                          <Btn size="sm" variant="danger" onClick={() => handleDeleteExpenseCategory(exp.id)}>Delete</Btn>
                        </div>
                      </div>
                    ))}
                  </div>
              }
            </div>
          </div>
        )}
      </div>

      {/* MODAL: Add User */}
      {modal === "addUser" && (
        <Modal title="Add New User" onClose={closeModal}>
          <form onSubmit={handleAddUser}>
            <Field label="Full Name"><Input value={newUser.full_name} onChange={e => setNewUser({ ...newUser, full_name: e.target.value })} placeholder="John Doe" required /></Field>
            <Field label="Email"><Input type="email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} placeholder="john@example.com" required /></Field>
            <Field label="Password"><Input type="password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} placeholder="Min. 6 characters" required minLength={6} /></Field>
            <Field label="Role">
              <Select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
                <option value="admin">Admin (Manager)</option>
                <option value="super_admin">Super Admin (Owner)</option>
              </Select>
            </Field>
            {formError && <p style={{ fontSize: 13, color: "#FF375F", marginBottom: 16 }}>{formError}</p>}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
              <Btn variant="secondary" type="button" onClick={closeModal}>Cancel</Btn>
              <Btn type="submit" disabled={formLoading}>{formLoading ? "Creating..." : "Create User"}</Btn>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: Add Person */}
      {modal === "addPerson" && (
        <Modal title="Add Person" onClose={closeModal}>
          <form onSubmit={handleAddPerson}>
            <Field label="Full Name"><Input value={newPerson.full_name} onChange={e => setNewPerson({ ...newPerson, full_name: e.target.value })} placeholder="Jane Doe" required /></Field>
            <Field label="Status">
              <Select value={newPerson.status} onChange={e => setNewPerson({ ...newPerson, status: e.target.value })}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </Field>
            {formError && <p style={{ fontSize: 13, color: "#FF375F", marginBottom: 16 }}>{formError}</p>}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
              <Btn variant="secondary" type="button" onClick={closeModal}>Cancel</Btn>
              <Btn type="submit" disabled={formLoading}>{formLoading ? "Saving..." : "Add Person"}</Btn>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: Record Contribution */}
      {modal === "addContribution" && (
        <Modal title="Record Contribution" onClose={closeModal}>
          <form onSubmit={handleAddContribution}>
            <Field label="Person">
              <Select value={newContribution.member_id} onChange={e => setNewContribution({ ...newContribution, member_id: e.target.value })} required>
                <option value="">Select person...</option>
                {(data.allPeople || []).filter(p => p.role === "member").map(p => (
                  <option key={p.id} value={p.id}>{p.full_name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Payment Type">
              <Select value={newContribution.payment_type_id} onChange={e => setNewContribution({ ...newContribution, payment_type_id: e.target.value })}>
                <option value="">Select type...</option>
                {data.paymentTypes.map(pt => (
                  <option key={pt.id} value={pt.id}>{pt.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Amount ($)"><Input type="number" min="1" step="0.01" value={newContribution.amount} onChange={e => setNewContribution({ ...newContribution, amount: e.target.value })} placeholder="0.00" required /></Field>
            <Field label="Note (optional)"><Textarea value={newContribution.note} onChange={e => setNewContribution({ ...newContribution, note: e.target.value })} placeholder="Any notes..." /></Field>
            {formError && <p style={{ fontSize: 13, color: "#FF375F", marginBottom: 16 }}>{formError}</p>}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
              <Btn variant="secondary" type="button" onClick={closeModal}>Cancel</Btn>
              <Btn type="submit" disabled={formLoading}>{formLoading ? "Saving..." : "Record"}</Btn>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: Record Expense */}
      {modal === "addExpense" && (
        <Modal title="Record Expense" onClose={closeModal}>
          <form onSubmit={handleAddExpense}>
            <Field label="Category">
              <Select value={newExpense.category_id} onChange={e => setNewExpense({ ...newExpense, category_id: e.target.value })} required>
                <option value="">Select category...</option>
                {data.expenses.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </Select>
            </Field>
            <Field label="Amount ($)"><Input type="number" min="1" step="0.01" value={newExpense.amount} onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })} placeholder="0.00" required /></Field>
            <Field label="Description"><Input value={newExpense.label} onChange={e => setNewExpense({ ...newExpense, label: e.target.value })} placeholder="What was this for?" required /></Field>
            {formError && <p style={{ fontSize: 13, color: "#FF375F", marginBottom: 16 }}>{formError}</p>}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
              <Btn variant="secondary" type="button" onClick={closeModal}>Cancel</Btn>
              <Btn type="submit" disabled={formLoading}>{formLoading ? "Saving..." : "Record"}</Btn>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: Add Payment Type */}
      {modal === "addPaymentType" && (
        <Modal title="New Payment Type" onClose={closeModal}>
          <form onSubmit={handleAddPaymentType}>
            <Field label="Name"><Input value={newPaymentType.name} onChange={e => setNewPaymentType({ ...newPaymentType, name: e.target.value })} placeholder="e.g. Rhapsody, Healing School" required /></Field>
            <Field label="Description (optional)"><Textarea value={newPaymentType.description} onChange={e => setNewPaymentType({ ...newPaymentType, description: e.target.value })} placeholder="Brief description..." /></Field>
            <Field label="Goal Amount (optional)"><Input type="number" min="0" step="0.01" value={newPaymentType.goal} onChange={e => setNewPaymentType({ ...newPaymentType, goal: e.target.value })} placeholder="e.g. 10000" /></Field>
            <Field label="Color">
              <ColorPicker value={newPaymentType.color} onChange={color => setNewPaymentType({ ...newPaymentType, color })} />
            </Field>
            {formError && <p style={{ fontSize: 13, color: "#FF375F", marginBottom: 16 }}>{formError}</p>}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 24 }}>
              <Btn variant="secondary" type="button" onClick={closeModal}>Cancel</Btn>
              <Btn type="submit" disabled={formLoading}>{formLoading ? "Creating..." : "Create"}</Btn>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: Add Expense Category */}
      {modal === "addExpenseCategory" && (
        <Modal title="New Expense Category" onClose={closeModal}>
          <form onSubmit={handleAddExpenseCategory}>
            <Field label="Name"><Input value={newExpenseCategory.name} onChange={e => setNewExpenseCategory({ ...newExpenseCategory, name: e.target.value })} placeholder="e.g. Rent, Salaries, Equipment" required /></Field>
            <Field label="Description (optional)"><Textarea value={newExpenseCategory.description} onChange={e => setNewExpenseCategory({ ...newExpenseCategory, description: e.target.value })} placeholder="Brief description..." /></Field>
            <Field label="Budget (optional)"><Input type="number" min="0" step="0.01" value={newExpenseCategory.budget} onChange={e => setNewExpenseCategory({ ...newExpenseCategory, budget: e.target.value })} placeholder="e.g. 50000" /></Field>
            <Field label="Color">
              <ColorPicker value={newExpenseCategory.color} onChange={color => setNewExpenseCategory({ ...newExpenseCategory, color })} />
            </Field>
            {formError && <p style={{ fontSize: 13, color: "#FF375F", marginBottom: 16 }}>{formError}</p>}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 24 }}>
              <Btn variant="secondary" type="button" onClick={closeModal}>Cancel</Btn>
              <Btn type="submit" disabled={formLoading}>{formLoading ? "Creating..." : "Create"}</Btn>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: Edit Payment Type */}
      {modal === "editPaymentType" && editingPaymentType && (
        <Modal title="Edit Payment Type" onClose={closeModal}>
          <form onSubmit={handleEditPaymentType}>
            <Field label="Name"><Input value={editingPaymentType.name} onChange={e => setEditingPaymentType({ ...editingPaymentType, name: e.target.value })} required /></Field>
            <Field label="Description (optional)"><Textarea value={editingPaymentType.description || ""} onChange={e => setEditingPaymentType({ ...editingPaymentType, description: e.target.value })} placeholder="Brief description..." /></Field>
            <Field label="Goal Amount (optional)"><Input type="number" min="0" step="0.01" value={editingPaymentType.goal || ""} onChange={e => setEditingPaymentType({ ...editingPaymentType, goal: e.target.value })} placeholder="e.g. 10000" /></Field>
            <Field label="Color"><ColorPicker value={editingPaymentType.color} onChange={color => setEditingPaymentType({ ...editingPaymentType, color })} /></Field>
            {formError && <p style={{ fontSize: 13, color: "#FF375F", marginBottom: 16 }}>{formError}</p>}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 24 }}>
              <Btn variant="secondary" type="button" onClick={closeModal}>Cancel</Btn>
              <Btn type="submit" disabled={formLoading}>{formLoading ? "Saving..." : "Save Changes"}</Btn>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: Edit Expense Category */}
      {modal === "editExpenseCategory" && editingExpenseCategory && (
        <Modal title="Edit Expense Category" onClose={closeModal}>
          <form onSubmit={handleEditExpenseCategory}>
            <Field label="Name"><Input value={editingExpenseCategory.name} onChange={e => setEditingExpenseCategory({ ...editingExpenseCategory, name: e.target.value })} required /></Field>
            <Field label="Description (optional)"><Textarea value={editingExpenseCategory.description || ""} onChange={e => setEditingExpenseCategory({ ...editingExpenseCategory, description: e.target.value })} placeholder="Brief description..." /></Field>
            <Field label="Budget (optional)"><Input type="number" min="0" step="0.01" value={editingExpenseCategory.budget || ""} onChange={e => setEditingExpenseCategory({ ...editingExpenseCategory, budget: e.target.value })} placeholder="e.g. 50000" /></Field>
            <Field label="Color"><ColorPicker value={editingExpenseCategory.color} onChange={color => setEditingExpenseCategory({ ...editingExpenseCategory, color })} /></Field>
            {formError && <p style={{ fontSize: 13, color: "#FF375F", marginBottom: 16 }}>{formError}</p>}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 24 }}>
              <Btn variant="secondary" type="button" onClick={closeModal}>Cancel</Btn>
              <Btn type="submit" disabled={formLoading}>{formLoading ? "Saving..." : "Save Changes"}</Btn>
            </div>
          </form>
        </Modal>
      )}

    </div>
  );
}