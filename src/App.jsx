import { useState, useEffect, useRef } from "react";
import { supabase } from "./lib/supabaseClient";

// ─── Formatting ───────────────────────────────────────────────
const makeFmt = (currency = "USD") => (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);

const COLORS = ["#0071E3", "#34C759", "#FF9F0A", "#FF375F", "#BF5AF2", "#5AC8FA", "#FF6B35", "#00C7BE"];

const CURRENCIES = ["USD", "GHS", "GBP", "EUR", "NGN", "KES", "ZAR", "CAD", "AUD"];

// ─── Theme ────────────────────────────────────────────────────
const light = {
  bg: "#F2F2F7", surface: "#FFFFFF", surfaceAlt: "#FAFAFA",
  border: "rgba(0,0,0,0.06)", borderStrong: "rgba(0,0,0,0.1)",
  text: "#1C1C1E", textSub: "#8E8E93", textMuted: "#6E6E73",
  sidebar: "rgba(255,255,255,0.85)", accent: "#0071E3",
  inputBg: "#FAFAFA", heroGrad: "linear-gradient(135deg,#0071E3 0%,#34AADC 100%)",
  shadow: "0 20px 60px rgba(0,0,0,0.08)", cardShadow: "0 2px 12px rgba(0,0,0,0.04)",
};
const dark = {
  bg: "#0F0F12", surface: "#1C1C1E", surfaceAlt: "#2C2C2E",
  border: "rgba(255,255,255,0.08)", borderStrong: "rgba(255,255,255,0.12)",
  text: "#F5F5F7", textSub: "#8E8E93", textMuted: "#636366",
  sidebar: "rgba(28,28,30,0.92)", accent: "#0A84FF",
  inputBg: "#2C2C2E", heroGrad: "linear-gradient(135deg,#0A84FF 0%,#0071E3 100%)",
  shadow: "0 20px 60px rgba(0,0,0,0.4)", cardShadow: "0 2px 12px rgba(0,0,0,0.2)",
};

// ─── Animation hook ───────────────────────────────────────────
function useFadeIn(deps = []) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { setVisible(false); const t = setTimeout(() => setVisible(true), 30); return () => clearTimeout(t); }, deps);
  return visible;
}

// ─── Avatar ───────────────────────────────────────────────────
const Avatar = ({ name, size = 36 }) => {
  const initials = (name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const palette = ["#0071E3","#34C759","#FF9F0A","#FF375F","#BF5AF2","#5AC8FA"];
  const color = palette[(name || "?").charCodeAt(0) % palette.length];
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: `linear-gradient(135deg,${color}22,${color}55)`, border: `1.5px solid ${color}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.33, fontWeight: 600, color, flexShrink: 0 }}>
      {initials}
    </div>
  );
};

// ─── Reusable UI ──────────────────────────────────────────────
const Modal = ({ title, onClose, children, t }) => (
  <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, animation: "fadeIn 0.15s ease" }} onClick={onClose}>
    <div style={{ background: t.surface, borderRadius: 24, padding: "36px 40px", width: "100%", maxWidth: 460, boxShadow: t.shadow, maxHeight: "90vh", overflowY: "auto", border: `1px solid ${t.border}`, animation: "slideUp 0.2s cubic-bezier(0.34,1.56,0.64,1)" }} onClick={e => e.stopPropagation()}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, letterSpacing: "-0.4px", color: t.text }}>{title}</h3>
        <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: t.textSub, lineHeight: 1, transition: "color 0.15s" }}>×</button>
      </div>
      {children}
    </div>
  </div>
);

const Field = ({ label, children, t }) => (
  <div style={{ marginBottom: 16 }}>
    <label style={{ fontSize: 13, fontWeight: 500, color: t.text, display: "block", marginBottom: 8 }}>{label}</label>
    {children}
  </div>
);

const inputStyle = (t) => ({ width: "100%", padding: "11px 14px", borderRadius: 10, border: `1px solid ${t.borderStrong}`, fontSize: 14, color: t.text, background: t.inputBg, outline: "none", boxSizing: "border-box", fontFamily: "inherit", transition: "border-color 0.15s ease" });

const Input = ({ t, ...props }) => (
  <input {...props} style={{ ...inputStyle(t), ...(props.style || {}) }}
    onFocus={e => e.target.style.borderColor = t.accent}
    onBlur={e => e.target.style.borderColor = t.borderStrong}
  />
);

const Textarea = ({ t, ...props }) => (
  <textarea {...props} style={{ ...inputStyle(t), resize: "vertical", minHeight: 80, ...(props.style || {}) }}
    onFocus={e => e.target.style.borderColor = t.accent}
    onBlur={e => e.target.style.borderColor = t.borderStrong}
  />
);

const Select = ({ t, children, ...props }) => (
  <select {...props} style={{ ...inputStyle(t), cursor: "pointer" }}>{children}</select>
);

const Btn = ({ children, variant = "primary", size = "md", t, ...props }) => (
  <button {...props} style={{
    padding: size === "sm" ? "7px 14px" : "11px 20px", borderRadius: size === "sm" ? 8 : 10, border: "none", cursor: props.disabled ? "not-allowed" : "pointer",
    fontSize: size === "sm" ? 12 : 14, fontWeight: 600, transition: "all 0.15s ease",
    background: variant === "primary" ? t.accent : variant === "danger" ? "rgba(255,55,95,0.12)" : t.surfaceAlt,
    color: variant === "primary" ? "white" : variant === "danger" ? "#FF375F" : t.text,
    opacity: props.disabled ? 0.6 : 1,
    ...(props.style || {}),
  }}>{children}</button>
);

const ColorPicker = ({ value, onChange }) => (
  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
    {COLORS.map(c => (
      <div key={c} onClick={() => onChange(c)} style={{ width: 28, height: 28, borderRadius: "50%", background: c, cursor: "pointer", border: value === c ? "3px solid #1C1C1E" : "3px solid transparent", boxSizing: "border-box", transition: "transform 0.15s ease, border 0.15s ease", transform: value === c ? "scale(1.15)" : "scale(1)" }} />
    ))}
  </div>
);

const EmptyState = ({ message, action, t }) => (
  <div style={{ textAlign: "center", padding: "48px 32px" }}>
    <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }}>◎</div>
    <p style={{ color: t.textSub, fontSize: 14, margin: "0 0 16px" }}>{message}</p>
    {action}
  </div>
);

const Card = ({ children, t, style = {} }) => (
  <div style={{ background: t.surface, borderRadius: 24, padding: "32px", border: `1px solid ${t.border}`, boxShadow: t.cardShadow, overflow: "hidden", ...style }}>{children}</div>
);

const StatCard = ({ label, value, t, style = {} }) => (
  <div style={{ background: t.surface, borderRadius: 20, padding: "24px", border: `1px solid ${t.border}`, flex: 1, boxShadow: t.cardShadow, overflow: "hidden", ...style }}>
    <p style={{ fontSize: 12, color: t.textSub, fontWeight: 500, marginBottom: 8 }}>{label}</p>
    <p style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-1px", margin: 0, color: t.text }}>{value}</p>
  </div>
);

// ─── Financial year label ─────────────────────────────────────
const fyLabel = (start, format) => format === "split" ? `${start}/${start + 1}` : `${start}`;

// ─── Main App ─────────────────────────────────────────────────
export default function App({ session }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [isDark, setIsDark] = useState(() => localStorage.getItem("unified-theme") === "dark");
  const t = isDark ? dark : light;
  const toggleTheme = () => { const next = !isDark; setIsDark(next); localStorage.setItem("unified-theme", next ? "dark" : "light"); };

  const [data, setData] = useState({ totalBalance: 0, totalContributions: 0, totalExpenses: 0, people: [], expenses: [], recentActivity: [], users: [], paymentTypes: [], allPeople: [], org: null });
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [fmt, setFmt] = useState(() => makeFmt("USD"));

  const [modal, setModal] = useState(null);
  const [newUser, setNewUser] = useState({ full_name: "", email: "", password: "", role: "admin" });
  const [newPerson, setNewPerson] = useState({ full_name: "", status: "active" });
  const [newContribution, setNewContribution] = useState({ member_id: "", amount: "", payment_type_id: "", note: "" });
  const [newExpense, setNewExpense] = useState({ category_id: "", amount: "", label: "" });
  const [newPaymentType, setNewPaymentType] = useState({ name: "", description: "", goal: "", color: "#0071E3" });
  const [newExpenseCategory, setNewExpenseCategory] = useState({ name: "", description: "", budget: "", color: "#0071E3" });
  const [editingPaymentType, setEditingPaymentType] = useState(null);
  const [editingExpenseCategory, setEditingExpenseCategory] = useState(null);
  const [orgForm, setOrgForm] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState(null);

  const visible = useFadeIn([activeTab]);

  useEffect(() => { fetchAllData(); }, []);

  const openModal = (name) => { setFormError(null); setModal(name); };
  const closeModal = () => { setModal(null); setEditingPaymentType(null); setEditingExpenseCategory(null); };

  async function fetchAllData() {
    setLoading(true);
    try {
      const [{ data: profiles }, { data: contributions }, { data: categories }, { data: expenses }, { data: paymentTypes }, { data: orgRows }] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("contributions").select("*, profiles(full_name), payment_types(name,color)").order("created_at", { ascending: false }),
        supabase.from("expense_categories").select("*").order("created_at", { ascending: false }),
        supabase.from("expenses").select("*, expense_categories(name,color)").order("created_at", { ascending: false }),
        supabase.from("payment_types").select("*").order("created_at", { ascending: false }),
        supabase.from("org_settings").select("*").limit(1),
      ]);

      const org = orgRows?.[0] || null;
      if (org) { setFmt(() => makeFmt(org.currency || "USD")); setOrgForm({ name: org.name, address: org.address || "", contact_email: org.contact_email || "", contact_phone: org.contact_phone || "", currency: org.currency || "USD", financial_year_format: org.financial_year_format || "single", financial_year_start: org.financial_year_start || new Date().getFullYear() }); }

      const me = (profiles || []).find(p => p.id === session?.user?.id);
      setUserRole(me?.role || "admin");

      const people = (profiles || []).filter(p => p.role === "member").map(p => {
        const total = (contributions || []).filter(c => c.member_id === p.id).reduce((s, c) => s + Number(c.amount), 0);
        const last = (contributions || []).find(c => c.member_id === p.id);
        return { id: p.id, name: p.full_name, status: p.status === "active" ? "Active" : "Inactive", contributions: total, lastActivity: last ? new Date(last.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "No activity" };
      });

      const fmtLocal = makeFmt(org?.currency || "USD");
      const expenseData = (categories || []).map(cat => {
        const spent = (expenses || []).filter(e => e.category_id === cat.id).reduce((s, e) => s + Number(e.amount), 0);
        return { id: cat.id, label: cat.name, description: cat.description, amount: spent, budget: Number(cat.budget || 0), color: cat.color || "#0071E3" };
      });
      const paymentTypeData = (paymentTypes || []).map(pt => {
        const total = (contributions || []).filter(c => c.payment_type_id === pt.id).reduce((s, c) => s + Number(c.amount), 0);
        return { id: pt.id, name: pt.name, description: pt.description, total, goal: Number(pt.goal || 0), color: pt.color || "#0071E3" };
      });

      const contribActivity = (contributions || []).slice(0, 6).map(c => ({ id: `c-${c.id}`, name: c.profiles?.full_name || "Member", action: c.payment_types?.name || "Contribution", amount: `+${fmtLocal(c.amount)}`, time: new Date(c.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }), positive: true }));
      const expenseActivity = (expenses || []).slice(0, 6).map(e => ({ id: `e-${e.id}`, name: e.expense_categories?.name || "Expense", action: e.label, amount: `-${fmtLocal(e.amount)}`, time: new Date(e.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }), positive: false }));

      const totalContributions = (contributions || []).reduce((s, c) => s + Number(c.amount), 0);
      const totalExpenses = (expenses || []).reduce((s, e) => s + Number(e.amount), 0);

      setData({ totalBalance: totalContributions - totalExpenses, totalContributions, totalExpenses, people, expenses: expenseData, recentActivity: [...contribActivity, ...expenseActivity].slice(0, 10), users: (profiles || []).filter(p => ["super_admin","admin"].includes(p.role)), paymentTypes: paymentTypeData, allPeople: profiles || [], org, categories: categories || [] });
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function handleAddUser(e) {
    e.preventDefault(); setFormLoading(true); setFormError(null);
    try {
      const { error } = await supabase.auth.signUp({ email: newUser.email, password: newUser.password, options: { data: { full_name: newUser.full_name, role: newUser.role } } });
      if (error) throw error;
      closeModal(); setNewUser({ full_name: "", email: "", password: "", role: "admin" }); fetchAllData();
    } catch (err) { setFormError(err.message); } finally { setFormLoading(false); }
  }

  async function handleAddPerson(e) {
    e.preventDefault(); setFormLoading(true); setFormError(null);
    try {
      const { error } = await supabase.from("profiles").insert({ id: crypto.randomUUID(), full_name: newPerson.full_name, role: "member", status: newPerson.status });
      if (error) throw error;
      closeModal(); setNewPerson({ full_name: "", status: "active" }); fetchAllData();
    } catch (err) { setFormError(err.message); } finally { setFormLoading(false); }
  }

  async function handleAddContribution(e) {
    e.preventDefault(); setFormLoading(true); setFormError(null);
    try {
      const { error } = await supabase.from("contributions").insert({ member_id: newContribution.member_id, amount: Number(newContribution.amount), payment_type_id: newContribution.payment_type_id || null, note: newContribution.note, type: "other" });
      if (error) throw error;
      closeModal(); setNewContribution({ member_id: "", amount: "", payment_type_id: "", note: "" }); fetchAllData();
    } catch (err) { setFormError(err.message); } finally { setFormLoading(false); }
  }

  async function handleAddExpense(e) {
    e.preventDefault(); setFormLoading(true); setFormError(null);
    try {
      const { error } = await supabase.from("expenses").insert({ category_id: newExpense.category_id, amount: Number(newExpense.amount), label: newExpense.label, recorded_by: session?.user?.id });
      if (error) throw error;
      closeModal(); setNewExpense({ category_id: "", amount: "", label: "" }); fetchAllData();
    } catch (err) { setFormError(err.message); } finally { setFormLoading(false); }
  }

  async function handleAddPaymentType(e) {
    e.preventDefault(); setFormLoading(true); setFormError(null);
    try {
      const { error } = await supabase.from("payment_types").insert({ name: newPaymentType.name, description: newPaymentType.description || null, goal: newPaymentType.goal ? Number(newPaymentType.goal) : null, color: newPaymentType.color, created_by: session?.user?.id });
      if (error) throw error;
      closeModal(); setNewPaymentType({ name: "", description: "", goal: "", color: "#0071E3" }); fetchAllData();
    } catch (err) { setFormError(err.message); } finally { setFormLoading(false); }
  }

  async function handleAddExpenseCategory(e) {
    e.preventDefault(); setFormLoading(true); setFormError(null);
    try {
      const { error } = await supabase.from("expense_categories").insert({ name: newExpenseCategory.name, description: newExpenseCategory.description || null, budget: newExpenseCategory.budget ? Number(newExpenseCategory.budget) : 0, color: newExpenseCategory.color, created_by: session?.user?.id });
      if (error) throw error;
      closeModal(); setNewExpenseCategory({ name: "", description: "", budget: "", color: "#0071E3" }); fetchAllData();
    } catch (err) { setFormError(err.message); } finally { setFormLoading(false); }
  }

  async function handleEditPaymentType(e) {
    e.preventDefault(); setFormLoading(true); setFormError(null);
    try {
      const { error } = await supabase.from("payment_types").update({ name: editingPaymentType.name, description: editingPaymentType.description || null, goal: editingPaymentType.goal ? Number(editingPaymentType.goal) : null, color: editingPaymentType.color }).eq("id", editingPaymentType.id);
      if (error) throw error;
      closeModal(); fetchAllData();
    } catch (err) { setFormError(err.message); } finally { setFormLoading(false); }
  }

  async function handleDeletePaymentType(id) {
    if (!confirm("Delete this payment type? This cannot be undone.")) return;
    await supabase.from("payment_types").delete().eq("id", id); fetchAllData();
  }

  async function handleEditExpenseCategory(e) {
    e.preventDefault(); setFormLoading(true); setFormError(null);
    try {
      const { error } = await supabase.from("expense_categories").update({ name: editingExpenseCategory.name, description: editingExpenseCategory.description || null, budget: editingExpenseCategory.budget ? Number(editingExpenseCategory.budget) : 0, color: editingExpenseCategory.color }).eq("id", editingExpenseCategory.id);
      if (error) throw error;
      closeModal(); fetchAllData();
    } catch (err) { setFormError(err.message); } finally { setFormLoading(false); }
  }

  async function handleDeleteExpenseCategory(id) {
    if (!confirm("Delete this category? This cannot be undone.")) return;
    await supabase.from("expense_categories").delete().eq("id", id); fetchAllData();
  }

  async function handleSaveOrg(e) {
    e.preventDefault(); setFormLoading(true); setFormError(null);
    try {
      const { error } = await supabase.from("org_settings").update({ ...orgForm, financial_year_start: Number(orgForm.financial_year_start), updated_by: session?.user?.id, updated_at: new Date().toISOString() }).eq("id", data.org.id);
      if (error) throw error;
      closeModal(); fetchAllData();
    } catch (err) { setFormError(err.message); } finally { setFormLoading(false); }
  }

  const isSuperAdmin = userRole === "super_admin";
  const orgName = data.org?.name || "Unified";
  const fyText = data.org ? fyLabel(data.org.financial_year_start, data.org.financial_year_format) : "";

  const navItems = [
    { id: "overview", label: "Overview", icon: "⊞" },
    { id: "people", label: "People", icon: "◎" },
    { id: "payments", label: "Payments", icon: "◈" },
    { id: "expenses", label: "Expenses", icon: "◉" },
    { id: "activity", label: "Activity", icon: "◷" },
    ...(isSuperAdmin ? [{ id: "settings", label: "Settings", icon: "⊙" }] : []),
  ];

  if (loading) return (
    <div style={{ minHeight: "100vh", background: t.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif", transition: "background 0.3s" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: t.heroGrad, margin: "0 auto 16px", animation: "pulse 1.5s ease-in-out infinite", boxShadow: "0 8px 32px rgba(0,113,227,0.4)" }} />
        <p style={{ color: t.textSub, fontSize: 14 }}>Loading {orgName}...</p>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: t.bg, fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif", color: t.text, transition: "background 0.3s, color 0.3s" }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(24px) scale(0.97) } to { opacity: 1; transform: translateY(0) scale(1) } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(-12px) } to { opacity: 1; transform: translateX(0) } }
        @keyframes pulse { 0%,100% { opacity: 1; transform: scale(1) } 50% { opacity: 0.7; transform: scale(0.95) } }
        @keyframes barGrow { from { width: 0% } to { width: var(--w) } }
        .nav-btn:hover { background: rgba(0,113,227,0.07) !important; color: #0071E3 !important; }
        .row-hover:hover { background: rgba(0,113,227,0.04) !important; transition: background 0.15s; }
        .card-hover { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .card-hover:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(0,0,0,0.1) !important; }
      `}</style>

      {/* Sidebar */}
      <div style={{ position: "fixed", left: 0, top: 0, bottom: 0, width: 240, background: t.sidebar, backdropFilter: "blur(40px)", borderRight: `1px solid ${t.border}`, display: "flex", flexDirection: "column", padding: "28px 0", zIndex: 100, transition: "background 0.3s, border-color 0.3s" }}>

        {/* Logo / Org name */}
        <div style={{ padding: "0 20px 32px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: t.heroGrad, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(0,113,227,0.35)", flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 8h5M9 8h5M8 2v5M8 9v5" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.3px", color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{orgName}</div>
              {fyText && <div style={{ fontSize: 10, color: t.textSub, fontWeight: 500 }}>FY {fyText}</div>}
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "0 10px", display: "flex", flexDirection: "column", gap: 2 }}>
          {navItems.map((item, i) => (
            <button key={item.id} className="nav-btn" onClick={() => setActiveTab(item.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, border: "none", cursor: "pointer", background: activeTab === item.id ? `${t.accent}18` : "transparent", color: activeTab === item.id ? t.accent : t.textMuted, fontSize: 14, fontWeight: activeTab === item.id ? 600 : 400, textAlign: "left", transition: "all 0.15s ease", animation: `slideIn 0.3s ease ${i * 0.04}s both` }}>
              <span style={{ fontSize: 15 }}>{item.icon}</span>
              {item.label}
              {activeTab === item.id && <div style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", background: t.accent }} />}
            </button>
          ))}
        </nav>

        {/* Dark mode toggle + user */}
        <div style={{ padding: "0 12px", display: "flex", flexDirection: "column", gap: 8 }}>
          {/* Theme toggle */}
          <button onClick={toggleTheme} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, border: "none", cursor: "pointer", background: t.surfaceAlt, color: t.textSub, fontSize: 13, fontWeight: 500, transition: "all 0.2s ease", width: "100%" }}>
            <span style={{ fontSize: 16 }}>{isDark ? "☀️" : "🌙"}</span>
            {isDark ? "Light Mode" : "Dark Mode"}
            <div style={{ marginLeft: "auto", width: 32, height: 18, borderRadius: 99, background: isDark ? t.accent : t.borderStrong, position: "relative", transition: "background 0.3s" }}>
              <div style={{ position: "absolute", top: 2, left: isDark ? 16 : 2, width: 14, height: 14, borderRadius: "50%", background: "white", transition: "left 0.25s cubic-bezier(0.34,1.56,0.64,1)", boxShadow: "0 1px 4px rgba(0,0,0,0.3)" }} />
            </div>
          </button>

          {/* User card */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, background: t.surfaceAlt }}>
            <Avatar name={session?.user?.email || "A"} size={30} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: t.accent, textTransform: "uppercase", letterSpacing: "0.06em" }}>{isSuperAdmin ? "Super Admin" : "Admin"}</div>
              <div style={{ fontSize: 11, color: t.textSub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{session?.user?.email}</div>
            </div>
            <button onClick={() => supabase.auth.signOut()} title="Sign out" style={{ background: "none", border: "none", cursor: "pointer", color: t.textSub, fontSize: 15, padding: 4, flexShrink: 0, transition: "color 0.15s" }}>↪</button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ marginLeft: 240, padding: "40px 48px", maxWidth: 1100 }}>
        {/* Page header */}
        <div style={{ marginBottom: 40, animation: "slideUp 0.3s ease" }}>
          <p style={{ fontSize: 13, color: t.textSub, fontWeight: 500, marginBottom: 4, letterSpacing: "0.02em" }}>{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
          <h1 style={{ fontSize: 34, fontWeight: 700, letterSpacing: "-0.8px", margin: 0, color: t.text }}>{navItems.find(n => n.id === activeTab)?.label}</h1>
        </div>

        <div style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(16px)", transition: "opacity 0.3s ease, transform 0.3s ease" }}>

        {/* ── OVERVIEW ── */}
        {activeTab === "overview" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
              <div className="card-hover" style={{ gridColumn: "span 2", background: t.heroGrad, borderRadius: 24, padding: "36px 40px", position: "relative", overflow: "hidden", boxShadow: "0 8px 32px rgba(0,113,227,0.3)" }}>
                <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.07)" }} />
                <div style={{ position: "absolute", bottom: -60, right: 60, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />
                <p style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.7)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>Net Balance</p>
                <h2 style={{ fontSize: 52, fontWeight: 700, color: "white", letterSpacing: "-2px", margin: "0 0 20px", animation: "slideUp 0.4s ease" }}>{fmt(data.totalBalance)}</h2>
                <div style={{ display: "flex", gap: 20 }}>
                  <div><p style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", margin: "0 0 2px" }}>Total In</p><p style={{ fontSize: 16, fontWeight: 700, color: "white", margin: 0 }}>{fmt(data.totalContributions)}</p></div>
                  <div style={{ width: 1, background: "rgba(255,255,255,0.2)" }} />
                  <div><p style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", margin: "0 0 2px" }}>Total Out</p><p style={{ fontSize: 16, fontWeight: 700, color: "white", margin: 0 }}>{fmt(data.totalExpenses)}</p></div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <StatCard label="People Tracked" value={data.people.length} t={t} style={{ animation: "slideUp 0.35s ease 0.05s both" }} />
                <StatCard label="Payment Types" value={data.paymentTypes.length} t={t} style={{ animation: "slideUp 0.35s ease 0.1s both" }} />
              </div>
            </div>

            {data.paymentTypes.length > 0 && (
              <Card t={t} style={{ marginBottom: 24, animation: "slideUp 0.35s ease 0.1s both" }}>
                <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 24, letterSpacing: "-0.3px", color: t.text }}>Payment Breakdown</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  {data.paymentTypes.map((pt, i) => {
                    const pct = pt.goal > 0 ? Math.min(Math.round((pt.total / pt.goal) * 100), 100) : 0;
                    return (
                      <div key={pt.id} style={{ animation: `slideIn 0.3s ease ${i * 0.06}s both` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 8, height: 8, borderRadius: "50%", background: pt.color }} />
                            <span style={{ fontSize: 14, fontWeight: 500, color: t.text }}>{pt.name}</span>
                          </div>
                          <div>
                            <span style={{ fontSize: 14, fontWeight: 600, color: t.text }}>{fmt(pt.total)}</span>
                            {pt.goal > 0 && <span style={{ fontSize: 12, color: t.textSub, marginLeft: 6 }}>of {fmt(pt.goal)}</span>}
                          </div>
                        </div>
                        {pt.goal > 0 && (
                          <div style={{ height: 6, background: t.surfaceAlt, borderRadius: 99, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${pct}%`, background: pt.color, borderRadius: 99, transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)" }} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            <Card t={t} style={{ animation: "slideUp 0.35s ease 0.15s both" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <h3 style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.3px", margin: 0, color: t.text }}>Recent Activity</h3>
                <button onClick={() => setActiveTab("activity")} style={{ background: "none", border: "none", color: t.accent, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>View all</button>
              </div>
              {data.recentActivity.length === 0 ? <EmptyState message="No activity yet." t={t} /> :
                <div>{data.recentActivity.slice(0, 5).map((item, i) => (
                  <div key={item.id} className="row-hover" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 8px", borderBottom: i < 4 ? `1px solid ${t.border}` : "none", borderRadius: 8, animation: `slideIn 0.3s ease ${i * 0.05}s both` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <Avatar name={item.name} size={36} />
                      <div><p style={{ fontSize: 14, fontWeight: 500, margin: 0, color: t.text }}>{item.name}</p><p style={{ fontSize: 12, color: t.textSub, margin: 0 }}>{item.action}</p></div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ fontSize: 14, fontWeight: 600, margin: 0, color: item.positive ? "#34C759" : "#FF375F" }}>{item.amount}</p>
                      <p style={{ fontSize: 11, color: t.textSub, margin: 0 }}>{item.time}</p>
                    </div>
                  </div>
                ))}</div>
              }
            </Card>
          </div>
        )}

        {/* ── PEOPLE ── */}
        {activeTab === "people" && (
          <Card t={t}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
              <h3 style={{ fontSize: 17, fontWeight: 600, margin: 0, color: t.text }}>{data.people.length} People</h3>
              <div style={{ display: "flex", gap: 10 }}>
                <Btn t={t} onClick={() => openModal("addContribution")} variant="secondary">+ Contribution</Btn>
                <Btn t={t} onClick={() => openModal("addPerson")}>+ Add Person</Btn>
              </div>
            </div>
            {data.people.length === 0 ? <EmptyState message="No people added yet." action={<Btn t={t} onClick={() => openModal("addPerson")}>Add First Person</Btn>} t={t} /> :
              <div>{data.people.map((person, i) => (
                <div key={person.id} className="row-hover" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px", borderRadius: 12, background: i % 2 === 0 ? t.surfaceAlt : "transparent", animation: `slideIn 0.3s ease ${i * 0.04}s both` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <Avatar name={person.name} size={42} />
                    <div><p style={{ fontSize: 15, fontWeight: 600, margin: 0, color: t.text }}>{person.name}</p><p style={{ fontSize: 12, color: t.textSub, margin: 0 }}>Last active {person.lastActivity}</p></div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ fontSize: 15, fontWeight: 700, margin: 0, letterSpacing: "-0.3px", color: t.text }}>{fmt(person.contributions)}</p>
                      <p style={{ fontSize: 11, color: t.textSub, margin: 0 }}>Total contributed</p>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 20, background: person.status === "Active" ? "rgba(52,199,89,0.12)" : "rgba(142,142,147,0.12)", color: person.status === "Active" ? "#34C759" : "#8E8E93" }}>{person.status}</span>
                  </div>
                </div>
              ))}</div>
            }
          </Card>
        )}

        {/* ── PAYMENTS ── */}
        {activeTab === "payments" && (
          <div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20, gap: 10 }}>
              <Btn t={t} onClick={() => openModal("addContribution")} variant="secondary">+ Record Payment</Btn>
              {isSuperAdmin && <Btn t={t} onClick={() => openModal("addPaymentType")}>+ New Payment Type</Btn>}
            </div>
            {data.paymentTypes.length === 0 ? <Card t={t}><EmptyState message="No payment types yet." action={isSuperAdmin ? <Btn t={t} onClick={() => openModal("addPaymentType")}>Create First Payment Type</Btn> : null} t={t} /></Card> :
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {data.paymentTypes.map((pt, i) => {
                  const pct = pt.goal > 0 ? Math.min(Math.round((pt.total / pt.goal) * 100), 100) : 0;
                  return (
                    <div key={pt.id} className="card-hover" style={{ background: t.surface, borderRadius: 24, padding: "28px 32px", border: `1px solid ${t.border}`, boxShadow: t.cardShadow, overflow: "hidden", animation: `slideUp 0.3s ease ${i * 0.06}s both` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: pt.goal > 0 ? 20 : 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                          <div style={{ width: 48, height: 48, borderRadius: 14, background: `${pt.color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <div style={{ width: 16, height: 16, borderRadius: "50%", background: pt.color }} />
                          </div>
                          <div>
                            <h4 style={{ fontSize: 17, fontWeight: 600, margin: 0, letterSpacing: "-0.3px", color: t.text }}>{pt.name}</h4>
                            {pt.description && <p style={{ fontSize: 12, color: t.textSub, margin: "2px 0 0" }}>{pt.description}</p>}
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <p style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-1px", margin: 0, color: t.text }}>{fmt(pt.total)}</p>
                          {pt.goal > 0 && <p style={{ fontSize: 12, color: t.textSub, margin: 0 }}>of {fmt(pt.goal)} goal</p>}
                        </div>
                      </div>
                      {pt.goal > 0 && <>
                        <div style={{ height: 8, background: t.surfaceAlt, borderRadius: 99, overflow: "hidden", marginBottom: 10 }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: pt.color, borderRadius: 99, transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)" }} />
                        </div>
                        <p style={{ fontSize: 12, color: t.textSub, margin: 0 }}><span style={{ color: "#34C759", fontWeight: 600 }}>{fmt(pt.goal - pt.total)} remaining</span> · {pct}% reached</p>
                      </>}
                    </div>
                  );
                })}
              </div>
            }
          </div>
        )}

        {/* ── EXPENSES ── */}
        {activeTab === "expenses" && (
          <div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20, gap: 10 }}>
              <Btn t={t} onClick={() => openModal("addExpense")} variant="secondary">+ Record Expense</Btn>
              {isSuperAdmin && <Btn t={t} onClick={() => openModal("addExpenseCategory")}>+ New Category</Btn>}
            </div>
            {data.expenses.length === 0 ? <Card t={t}><EmptyState message="No expense categories yet." action={isSuperAdmin ? <Btn t={t} onClick={() => openModal("addExpenseCategory")}>Create First Category</Btn> : null} t={t} /></Card> :
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {data.expenses.map((exp, i) => {
                  const pct = exp.budget > 0 ? Math.min(Math.round((exp.amount / exp.budget) * 100), 100) : 0;
                  return (
                    <div key={exp.id} className="card-hover" style={{ background: t.surface, borderRadius: 24, padding: "28px 32px", border: `1px solid ${t.border}`, boxShadow: t.cardShadow, overflow: "hidden", animation: `slideUp 0.3s ease ${i * 0.06}s both` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: exp.budget > 0 ? 20 : 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                          <div style={{ width: 48, height: 48, borderRadius: 14, background: `${exp.color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <div style={{ width: 16, height: 16, borderRadius: "50%", background: exp.color }} />
                          </div>
                          <div>
                            <h4 style={{ fontSize: 17, fontWeight: 600, margin: 0, letterSpacing: "-0.3px", color: t.text }}>{exp.label}</h4>
                            {exp.description && <p style={{ fontSize: 12, color: t.textSub, margin: "2px 0 0" }}>{exp.description}</p>}
                            {exp.budget > 0 && <p style={{ fontSize: 12, color: t.textSub, margin: "2px 0 0" }}>{pct}% of budget used</p>}
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <p style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-1px", margin: 0, color: t.text }}>{fmt(exp.amount)}</p>
                          {exp.budget > 0 && <p style={{ fontSize: 12, color: t.textSub, margin: 0 }}>of {fmt(exp.budget)} budget</p>}
                        </div>
                      </div>
                      {exp.budget > 0 && <>
                        <div style={{ height: 8, background: t.surfaceAlt, borderRadius: 99, overflow: "hidden", marginBottom: 10 }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: exp.color, borderRadius: 99, transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)" }} />
                        </div>
                        <p style={{ fontSize: 12, color: t.textSub, margin: 0 }}><span style={{ color: "#34C759", fontWeight: 600 }}>{fmt(exp.budget - exp.amount)} remaining</span></p>
                      </>}
                    </div>
                  );
                })}
              </div>
            }
          </div>
        )}

        {/* ── ACTIVITY ── */}
        {activeTab === "activity" && (
          <Card t={t}>
            <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 24, color: t.text }}>All Activity</h3>
            {data.recentActivity.length === 0 ? <EmptyState message="No activity yet." t={t} /> :
              <div>{data.recentActivity.map((item, i) => (
                <div key={item.id} className="row-hover" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 8px", borderBottom: i < data.recentActivity.length - 1 ? `1px solid ${t.border}` : "none", borderRadius: 8, animation: `slideIn 0.3s ease ${i * 0.04}s both` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <Avatar name={item.name} size={42} />
                    <div><p style={{ fontSize: 14, fontWeight: 600, margin: 0, color: t.text }}>{item.name}</p><p style={{ fontSize: 12, color: t.textSub, margin: 0 }}>{item.action} · {item.time}</p></div>
                  </div>
                  <span style={{ fontSize: 15, fontWeight: 700, color: item.positive ? "#34C759" : "#FF375F" }}>{item.amount}</span>
                </div>
              ))}</div>
            }
          </Card>
        )}

        {/* ── SETTINGS ── */}
        {activeTab === "settings" && isSuperAdmin && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

            {/* Organisation Info */}
            <Card t={t} style={{ animation: "slideUp 0.3s ease" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 600, margin: 0, color: t.text }}>Organisation</h3>
                  <p style={{ fontSize: 13, color: t.textSub, margin: "4px 0 0" }}>Your organisation's profile and preferences</p>
                </div>
                <Btn t={t} onClick={() => openModal("editOrg")}>Edit</Btn>
              </div>
              {data.org && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                  {[
                    { label: "Name", value: data.org.name },
                    { label: "Currency", value: data.org.currency },
                    { label: "Contact Email", value: data.org.contact_email || "—" },
                    { label: "Contact Phone", value: data.org.contact_phone || "—" },
                    { label: "Address", value: data.org.address || "—" },
                    { label: "Financial Year", value: fyLabel(data.org.financial_year_start, data.org.financial_year_format) },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p style={{ fontSize: 11, fontWeight: 600, color: t.textSub, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 4px" }}>{label}</p>
                      <p style={{ fontSize: 14, fontWeight: 500, color: t.text, margin: 0 }}>{value}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Users */}
            <Card t={t} style={{ animation: "slideUp 0.3s ease 0.05s both" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <div><h3 style={{ fontSize: 17, fontWeight: 600, margin: 0, color: t.text }}>System Users</h3><p style={{ fontSize: 13, color: t.textSub, margin: "4px 0 0" }}>People who can log into {orgName}</p></div>
                <Btn t={t} onClick={() => openModal("addUser")}>+ Add User</Btn>
              </div>
              <div>{(data.users || []).map((user, i) => (
                <div key={user.id} className="row-hover" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 8px", borderRadius: 12, animation: `slideIn 0.3s ease ${i * 0.05}s both` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <Avatar name={user.full_name || user.email} size={40} />
                    <div><p style={{ fontSize: 14, fontWeight: 600, margin: 0, color: t.text }}>{user.full_name || "—"}</p><p style={{ fontSize: 12, color: t.textSub, margin: 0 }}>{user.email}</p></div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20, textTransform: "uppercase", letterSpacing: "0.04em", background: user.role === "super_admin" ? `${t.accent}18` : "rgba(52,199,89,0.1)", color: user.role === "super_admin" ? t.accent : "#34C759" }}>{user.role === "super_admin" ? "Super Admin" : "Admin"}</span>
                    {user.id === session?.user?.id && <span style={{ fontSize: 11, color: t.textSub, fontStyle: "italic" }}>You</span>}
                  </div>
                </div>
              ))}</div>
            </Card>

            {/* Payment Types */}
            <Card t={t} style={{ animation: "slideUp 0.3s ease 0.1s both" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <div><h3 style={{ fontSize: 17, fontWeight: 600, margin: 0, color: t.text }}>Payment Types</h3><p style={{ fontSize: 13, color: t.textSub, margin: "4px 0 0" }}>Categories people can contribute towards</p></div>
                <Btn t={t} onClick={() => openModal("addPaymentType")}>+ New Type</Btn>
              </div>
              {data.paymentTypes.length === 0 ? <EmptyState message="No payment types yet." t={t} /> :
                <div>{data.paymentTypes.map((pt, i) => (
                  <div key={pt.id} className="row-hover" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 8px", borderRadius: 12, animation: `slideIn 0.3s ease ${i * 0.05}s both` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 12, height: 12, borderRadius: "50%", background: pt.color, flexShrink: 0 }} />
                      <div><p style={{ fontSize: 14, fontWeight: 600, margin: 0, color: t.text }}>{pt.name}</p>{pt.description && <p style={{ fontSize: 12, color: t.textSub, margin: 0 }}>{pt.description}</p>}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ textAlign: "right", marginRight: 4 }}>
                        <p style={{ fontSize: 14, fontWeight: 600, margin: 0, color: t.text }}>{fmt(pt.total)}</p>
                        {pt.goal > 0 && <p style={{ fontSize: 11, color: t.textSub, margin: 0 }}>Goal: {fmt(pt.goal)}</p>}
                      </div>
                      <Btn size="sm" variant="secondary" t={t} onClick={() => { setEditingPaymentType({ ...pt, goal: pt.goal || "" }); openModal("editPaymentType"); }}>Edit</Btn>
                      <Btn size="sm" variant="danger" t={t} onClick={() => handleDeletePaymentType(pt.id)}>Delete</Btn>
                    </div>
                  </div>
                ))}</div>
              }
            </Card>

            {/* Expense Categories */}
            <Card t={t} style={{ animation: "slideUp 0.3s ease 0.15s both" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <div><h3 style={{ fontSize: 17, fontWeight: 600, margin: 0, color: t.text }}>Expense Categories</h3><p style={{ fontSize: 13, color: t.textSub, margin: "4px 0 0" }}>Categories for tracking organisational spending</p></div>
                <Btn t={t} onClick={() => openModal("addExpenseCategory")}>+ New Category</Btn>
              </div>
              {data.expenses.length === 0 ? <EmptyState message="No expense categories yet." t={t} /> :
                <div>{data.expenses.map((exp, i) => (
                  <div key={exp.id} className="row-hover" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 8px", borderRadius: 12, animation: `slideIn 0.3s ease ${i * 0.05}s both` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 12, height: 12, borderRadius: "50%", background: exp.color, flexShrink: 0 }} />
                      <div><p style={{ fontSize: 14, fontWeight: 600, margin: 0, color: t.text }}>{exp.label}</p>{exp.description && <p style={{ fontSize: 12, color: t.textSub, margin: 0 }}>{exp.description}</p>}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ textAlign: "right", marginRight: 4 }}>
                        <p style={{ fontSize: 14, fontWeight: 600, margin: 0, color: t.text }}>{fmt(exp.amount)} spent</p>
                        {exp.budget > 0 && <p style={{ fontSize: 11, color: t.textSub, margin: 0 }}>Budget: {fmt(exp.budget)}</p>}
                      </div>
                      <Btn size="sm" variant="secondary" t={t} onClick={() => { setEditingExpenseCategory({ ...exp, budget: exp.budget || "", name: exp.label }); openModal("editExpenseCategory"); }}>Edit</Btn>
                      <Btn size="sm" variant="danger" t={t} onClick={() => handleDeleteExpenseCategory(exp.id)}>Delete</Btn>
                    </div>
                  </div>
                ))}</div>
              }
            </Card>
          </div>
        )}

        </div>
      </div>

      {/* ── MODALS ── */}

      {modal === "editOrg" && orgForm && (
        <Modal title="Organisation Settings" onClose={closeModal} t={t}>
          <form onSubmit={handleSaveOrg}>
            <Field label="Organisation Name" t={t}><Input t={t} value={orgForm.name} onChange={e => setOrgForm({ ...orgForm, name: e.target.value })} required /></Field>
            <Field label="Address" t={t}><Textarea t={t} value={orgForm.address} onChange={e => setOrgForm({ ...orgForm, address: e.target.value })} placeholder="Street, City, Country" /></Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Contact Email" t={t}><Input t={t} type="email" value={orgForm.contact_email} onChange={e => setOrgForm({ ...orgForm, contact_email: e.target.value })} placeholder="info@org.com" /></Field>
              <Field label="Contact Phone" t={t}><Input t={t} value={orgForm.contact_phone} onChange={e => setOrgForm({ ...orgForm, contact_phone: e.target.value })} placeholder="+1 234 567 8900" /></Field>
            </div>
            <Field label="Currency" t={t}>
              <Select t={t} value={orgForm.currency} onChange={e => setOrgForm({ ...orgForm, currency: e.target.value })}>
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Financial Year Start" t={t}><Input t={t} type="number" value={orgForm.financial_year_start} onChange={e => setOrgForm({ ...orgForm, financial_year_start: e.target.value })} placeholder="2026" /></Field>
              <Field label="Year Format" t={t}>
                <Select t={t} value={orgForm.financial_year_format} onChange={e => setOrgForm({ ...orgForm, financial_year_format: e.target.value })}>
                  <option value="single">Single (2026)</option>
                  <option value="split">Split (2026/2027)</option>
                </Select>
              </Field>
            </div>
            {formError && <p style={{ fontSize: 13, color: "#FF375F", marginBottom: 16 }}>{formError}</p>}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
              <Btn variant="secondary" t={t} type="button" onClick={closeModal}>Cancel</Btn>
              <Btn t={t} type="submit" disabled={formLoading}>{formLoading ? "Saving..." : "Save Changes"}</Btn>
            </div>
          </form>
        </Modal>
      )}

      {modal === "addUser" && (
        <Modal title="Add New User" onClose={closeModal} t={t}>
          <form onSubmit={handleAddUser}>
            <Field label="Full Name" t={t}><Input t={t} value={newUser.full_name} onChange={e => setNewUser({ ...newUser, full_name: e.target.value })} placeholder="John Doe" required /></Field>
            <Field label="Email" t={t}><Input t={t} type="email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} placeholder="john@example.com" required /></Field>
            <Field label="Password" t={t}><Input t={t} type="password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} placeholder="Min. 6 characters" required minLength={6} /></Field>
            <Field label="Role" t={t}>
              <Select t={t} value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
                <option value="admin">Admin (Manager)</option>
                <option value="super_admin">Super Admin (Owner)</option>
              </Select>
            </Field>
            {formError && <p style={{ fontSize: 13, color: "#FF375F", marginBottom: 16 }}>{formError}</p>}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
              <Btn variant="secondary" t={t} type="button" onClick={closeModal}>Cancel</Btn>
              <Btn t={t} type="submit" disabled={formLoading}>{formLoading ? "Creating..." : "Create User"}</Btn>
            </div>
          </form>
        </Modal>
      )}

      {modal === "addPerson" && (
        <Modal title="Add Person" onClose={closeModal} t={t}>
          <form onSubmit={handleAddPerson}>
            <Field label="Full Name" t={t}><Input t={t} value={newPerson.full_name} onChange={e => setNewPerson({ ...newPerson, full_name: e.target.value })} placeholder="Jane Doe" required /></Field>
            <Field label="Status" t={t}>
              <Select t={t} value={newPerson.status} onChange={e => setNewPerson({ ...newPerson, status: e.target.value })}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </Field>
            {formError && <p style={{ fontSize: 13, color: "#FF375F", marginBottom: 16 }}>{formError}</p>}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
              <Btn variant="secondary" t={t} type="button" onClick={closeModal}>Cancel</Btn>
              <Btn t={t} type="submit" disabled={formLoading}>{formLoading ? "Saving..." : "Add Person"}</Btn>
            </div>
          </form>
        </Modal>
      )}

      {modal === "addContribution" && (
        <Modal title="Record Contribution" onClose={closeModal} t={t}>
          <form onSubmit={handleAddContribution}>
            <Field label="Person" t={t}>
              <Select t={t} value={newContribution.member_id} onChange={e => setNewContribution({ ...newContribution, member_id: e.target.value })} required>
                <option value="">Select person...</option>
                {(data.allPeople || []).filter(p => p.role === "member").map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </Select>
            </Field>
            <Field label="Payment Type" t={t}>
              <Select t={t} value={newContribution.payment_type_id} onChange={e => setNewContribution({ ...newContribution, payment_type_id: e.target.value })}>
                <option value="">Select type...</option>
                {data.paymentTypes.map(pt => <option key={pt.id} value={pt.id}>{pt.name}</option>)}
              </Select>
            </Field>
            <Field label="Amount" t={t}><Input t={t} type="number" min="1" step="0.01" value={newContribution.amount} onChange={e => setNewContribution({ ...newContribution, amount: e.target.value })} placeholder="0.00" required /></Field>
            <Field label="Note (optional)" t={t}><Textarea t={t} value={newContribution.note} onChange={e => setNewContribution({ ...newContribution, note: e.target.value })} placeholder="Any notes..." /></Field>
            {formError && <p style={{ fontSize: 13, color: "#FF375F", marginBottom: 16 }}>{formError}</p>}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
              <Btn variant="secondary" t={t} type="button" onClick={closeModal}>Cancel</Btn>
              <Btn t={t} type="submit" disabled={formLoading}>{formLoading ? "Saving..." : "Record"}</Btn>
            </div>
          </form>
        </Modal>
      )}

      {modal === "addExpense" && (
        <Modal title="Record Expense" onClose={closeModal} t={t}>
          <form onSubmit={handleAddExpense}>
            <Field label="Category" t={t}>
              <Select t={t} value={newExpense.category_id} onChange={e => setNewExpense({ ...newExpense, category_id: e.target.value })} required>
                <option value="">Select category...</option>
                {data.expenses.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </Select>
            </Field>
            <Field label="Amount" t={t}><Input t={t} type="number" min="1" step="0.01" value={newExpense.amount} onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })} placeholder="0.00" required /></Field>
            <Field label="Description" t={t}><Input t={t} value={newExpense.label} onChange={e => setNewExpense({ ...newExpense, label: e.target.value })} placeholder="What was this for?" required /></Field>
            {formError && <p style={{ fontSize: 13, color: "#FF375F", marginBottom: 16 }}>{formError}</p>}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
              <Btn variant="secondary" t={t} type="button" onClick={closeModal}>Cancel</Btn>
              <Btn t={t} type="submit" disabled={formLoading}>{formLoading ? "Saving..." : "Record"}</Btn>
            </div>
          </form>
        </Modal>
      )}

      {modal === "addPaymentType" && (
        <Modal title="New Payment Type" onClose={closeModal} t={t}>
          <form onSubmit={handleAddPaymentType}>
            <Field label="Name" t={t}><Input t={t} value={newPaymentType.name} onChange={e => setNewPaymentType({ ...newPaymentType, name: e.target.value })} placeholder="e.g. Rhapsody, Healing School" required /></Field>
            <Field label="Description (optional)" t={t}><Textarea t={t} value={newPaymentType.description} onChange={e => setNewPaymentType({ ...newPaymentType, description: e.target.value })} placeholder="Brief description..." /></Field>
            <Field label="Goal Amount (optional)" t={t}><Input t={t} type="number" min="0" step="0.01" value={newPaymentType.goal} onChange={e => setNewPaymentType({ ...newPaymentType, goal: e.target.value })} placeholder="e.g. 10000" /></Field>
            <Field label="Color" t={t}><ColorPicker value={newPaymentType.color} onChange={color => setNewPaymentType({ ...newPaymentType, color })} /></Field>
            {formError && <p style={{ fontSize: 13, color: "#FF375F", marginBottom: 16 }}>{formError}</p>}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 24 }}>
              <Btn variant="secondary" t={t} type="button" onClick={closeModal}>Cancel</Btn>
              <Btn t={t} type="submit" disabled={formLoading}>{formLoading ? "Creating..." : "Create"}</Btn>
            </div>
          </form>
        </Modal>
      )}

      {modal === "addExpenseCategory" && (
        <Modal title="New Expense Category" onClose={closeModal} t={t}>
          <form onSubmit={handleAddExpenseCategory}>
            <Field label="Name" t={t}><Input t={t} value={newExpenseCategory.name} onChange={e => setNewExpenseCategory({ ...newExpenseCategory, name: e.target.value })} placeholder="e.g. Rent, Salaries, Equipment" required /></Field>
            <Field label="Description (optional)" t={t}><Textarea t={t} value={newExpenseCategory.description} onChange={e => setNewExpenseCategory({ ...newExpenseCategory, description: e.target.value })} placeholder="Brief description..." /></Field>
            <Field label="Budget (optional)" t={t}><Input t={t} type="number" min="0" step="0.01" value={newExpenseCategory.budget} onChange={e => setNewExpenseCategory({ ...newExpenseCategory, budget: e.target.value })} placeholder="e.g. 50000" /></Field>
            <Field label="Color" t={t}><ColorPicker value={newExpenseCategory.color} onChange={color => setNewExpenseCategory({ ...newExpenseCategory, color })} /></Field>
            {formError && <p style={{ fontSize: 13, color: "#FF375F", marginBottom: 16 }}>{formError}</p>}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 24 }}>
              <Btn variant="secondary" t={t} type="button" onClick={closeModal}>Cancel</Btn>
              <Btn t={t} type="submit" disabled={formLoading}>{formLoading ? "Creating..." : "Create"}</Btn>
            </div>
          </form>
        </Modal>
      )}

      {modal === "editPaymentType" && editingPaymentType && (
        <Modal title="Edit Payment Type" onClose={closeModal} t={t}>
          <form onSubmit={handleEditPaymentType}>
            <Field label="Name" t={t}><Input t={t} value={editingPaymentType.name} onChange={e => setEditingPaymentType({ ...editingPaymentType, name: e.target.value })} required /></Field>
            <Field label="Description (optional)" t={t}><Textarea t={t} value={editingPaymentType.description || ""} onChange={e => setEditingPaymentType({ ...editingPaymentType, description: e.target.value })} /></Field>
            <Field label="Goal Amount (optional)" t={t}><Input t={t} type="number" min="0" step="0.01" value={editingPaymentType.goal || ""} onChange={e => setEditingPaymentType({ ...editingPaymentType, goal: e.target.value })} /></Field>
            <Field label="Color" t={t}><ColorPicker value={editingPaymentType.color} onChange={color => setEditingPaymentType({ ...editingPaymentType, color })} /></Field>
            {formError && <p style={{ fontSize: 13, color: "#FF375F", marginBottom: 16 }}>{formError}</p>}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 24 }}>
              <Btn variant="secondary" t={t} type="button" onClick={closeModal}>Cancel</Btn>
              <Btn t={t} type="submit" disabled={formLoading}>{formLoading ? "Saving..." : "Save Changes"}</Btn>
            </div>
          </form>
        </Modal>
      )}

      {modal === "editExpenseCategory" && editingExpenseCategory && (
        <Modal title="Edit Expense Category" onClose={closeModal} t={t}>
          <form onSubmit={handleEditExpenseCategory}>
            <Field label="Name" t={t}><Input t={t} value={editingExpenseCategory.name} onChange={e => setEditingExpenseCategory({ ...editingExpenseCategory, name: e.target.value })} required /></Field>
            <Field label="Description (optional)" t={t}><Textarea t={t} value={editingExpenseCategory.description || ""} onChange={e => setEditingExpenseCategory({ ...editingExpenseCategory, description: e.target.value })} /></Field>
            <Field label="Budget (optional)" t={t}><Input t={t} type="number" min="0" step="0.01" value={editingExpenseCategory.budget || ""} onChange={e => setEditingExpenseCategory({ ...editingExpenseCategory, budget: e.target.value })} /></Field>
            <Field label="Color" t={t}><ColorPicker value={editingExpenseCategory.color} onChange={color => setEditingExpenseCategory({ ...editingExpenseCategory, color })} /></Field>
            {formError && <p style={{ fontSize: 13, color: "#FF375F", marginBottom: 16 }}>{formError}</p>}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 24 }}>
              <Btn variant="secondary" t={t} type="button" onClick={closeModal}>Cancel</Btn>
              <Btn t={t} type="submit" disabled={formLoading}>{formLoading ? "Saving..." : "Save Changes"}</Btn>
            </div>
          </form>
        </Modal>
      )}

    </div>
  );
}