import { useState, useEffect } from "react";
import { supabase } from "./lib/supabaseClient";

const emptyData = {
  totalBalance: 0,
  people: [],
  expenses: [],
  recentActivity: [],
};

const fmt = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

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
    display: "flex", alignItems: "center", justifyContent: "center",
  }} onClick={onClose}>
    <div style={{
      background: "white", borderRadius: 24, padding: "36px 40px",
      width: "100%", maxWidth: 440, boxShadow: "0 24px 80px rgba(0,0,0,0.15)",
    }} onClick={e => e.stopPropagation()}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, letterSpacing: "-0.4px" }}>{title}</h3>
        <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#8E8E93" }}>×</button>
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

const Input = ({ ...props }) => (
  <input {...props} style={{
    width: "100%", padding: "11px 14px", borderRadius: 10,
    border: "1px solid rgba(0,0,0,0.1)", fontSize: 14, color: "#1C1C1E",
    background: "#FAFAFA", outline: "none", boxSizing: "border-box",
    ...props.style,
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

const Btn = ({ children, variant = "primary", ...props }) => (
  <button {...props} style={{
    padding: "11px 20px", borderRadius: 10, border: "none", cursor: "pointer",
    fontSize: 14, fontWeight: 600,
    background: variant === "primary" ? "#0071E3" : "rgba(0,0,0,0.05)",
    color: variant === "primary" ? "white" : "#1C1C1E",
    ...props.style,
  }}>{children}</button>
);

export default function App({ session }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [data, setData] = useState(emptyData);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);

  // Modals
  const [showAddUser, setShowAddUser] = useState(false);
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [showAddContribution, setShowAddContribution] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);

  // Forms
  const [newUser, setNewUser] = useState({ full_name: "", email: "", password: "", role: "admin" });
  const [newPerson, setNewPerson] = useState({ full_name: "", status: "active" });
  const [newContribution, setNewContribution] = useState({ member_id: "", amount: "", type: "partnership", note: "" });
  const [newExpense, setNewExpense] = useState({ category_id: "", amount: "", label: "" });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState(null);

  useEffect(() => { fetchAllData(); }, []);

  async function fetchAllData() {
    setLoading(true);
    try {
      const { data: profiles } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      const { data: contributions } = await supabase.from("contributions").select("*, profiles(full_name)").order("created_at", { ascending: false });
      const { data: categories } = await supabase.from("expense_categories").select("*");
      const { data: expenses } = await supabase.from("expenses").select("*, expense_categories(name, color)").order("created_at", { ascending: false });

      // Current user role
      const me = (profiles || []).find(p => p.id === session?.user?.id);
      setUserRole(me?.role || "admin");

      // People (records only — role = member)
      const people = (profiles || [])
        .filter(p => p.role === "member")
        .map(p => {
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
        return { id: cat.id, label: cat.name, amount: spent, budget: Number(cat.budget), color: cat.color || "#0071E3" };
      });

      const contribActivity = (contributions || []).slice(0, 6).map(c => ({
        id: c.id, name: c.profiles?.full_name || "Member",
        action: "Contribution received", amount: `+${fmt(c.amount)}`,
        time: new Date(c.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }), positive: true,
      }));
      const expenseActivity = (expenses || []).slice(0, 6).map(e => ({
        id: e.id, name: e.expense_categories?.name || "Expense",
        action: e.label, amount: `-${fmt(e.amount)}`,
        time: new Date(e.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }), positive: false,
      }));
      const recentActivity = [...contribActivity, ...expenseActivity].slice(0, 8);

      const totalContributions = (contributions || []).reduce((s, c) => s + Number(c.amount), 0);
      const totalExpenses = (expenses || []).reduce((s, e) => s + Number(e.amount), 0);

      setData({
        totalBalance: totalContributions - totalExpenses,
        people,
        expenses: expenseData,
        recentActivity,
        users: (profiles || []).filter(p => ["super_admin", "admin"].includes(p.role)),
        categories: categories || [],
        allPeople: profiles || [],
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddUser(e) {
    e.preventDefault();
    setFormLoading(true); setFormError(null);
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
        options: {
          data: { full_name: newUser.full_name, role: newUser.role },
        },
      });
      if (signUpError) throw signUpError;
      setShowAddUser(false);
      setNewUser({ full_name: "", email: "", password: "", role: "admin" });
      fetchAllData();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  }

  async function handleAddPerson(e) {
    e.preventDefault();
    setFormLoading(true); setFormError(null);
    try {
      const { error } = await supabase.from("profiles").insert({
        id: crypto.randomUUID(),
        full_name: newPerson.full_name,
        email: null,
        role: "member",
        status: newPerson.status,
      });
      if (error) throw error;
      setShowAddPerson(false);
      setNewPerson({ full_name: "", status: "active" });
      fetchAllData();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  }

  async function handleAddContribution(e) {
    e.preventDefault();
    setFormLoading(true); setFormError(null);
    try {
      const { error } = await supabase.from("contributions").insert({
        member_id: newContribution.member_id,
        amount: Number(newContribution.amount),
        type: newContribution.type,
        note: newContribution.note,
      });
      if (error) throw error;
      setShowAddContribution(false);
      setNewContribution({ member_id: "", amount: "", type: "partnership", note: "" });
      fetchAllData();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  }

  async function handleAddExpense(e) {
    e.preventDefault();
    setFormLoading(true); setFormError(null);
    try {
      const { error } = await supabase.from("expenses").insert({
        category_id: newExpense.category_id,
        amount: Number(newExpense.amount),
        label: newExpense.label,
        recorded_by: session?.user?.id,
      });
      if (error) throw error;
      setShowAddExpense(false);
      setNewExpense({ category_id: "", amount: "", label: "" });
      fetchAllData();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  }

  const isSuperAdmin = userRole === "super_admin";

  const navItems = [
    { id: "overview", label: "Overview", icon: "⊞" },
    { id: "people", label: "People", icon: "◎" },
    { id: "expenses", label: "Expenses", icon: "◈" },
    { id: "activity", label: "Activity", icon: "◷" },
    ...(isSuperAdmin ? [{ id: "users", label: "Users", icon: "⊙" }] : []),
  ];

  if (loading) return (
    <div style={{
      minHeight: "100vh", background: "#F2F2F7",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg, #0071E3, #34AADC)", margin: "0 auto 16px" }} />
        <p style={{ color: "#8E8E93", fontSize: 14 }}>Loading Unified...</p>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#F2F2F7", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif", color: "#1C1C1E" }}>

      {/* Sidebar */}
      <div style={{
        position: "fixed", left: 0, top: 0, bottom: 0, width: 240,
        background: "rgba(255,255,255,0.85)", backdropFilter: "blur(40px)",
        borderRight: "1px solid rgba(0,0,0,0.06)",
        display: "flex", flexDirection: "column", padding: "32px 0", zIndex: 100,
      }}>
        <div style={{ padding: "0 24px 40px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg, #0071E3, #34AADC)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 8h5M9 8h5M8 2v5M8 9v5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.4px" }}>Unified</span>
          </div>
        </div>

        <nav style={{ flex: 1, padding: "0 12px", display: "flex", flexDirection: "column", gap: 2 }}>
          {navItems.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 12px", borderRadius: 10, border: "none", cursor: "pointer",
              background: activeTab === item.id ? "rgba(0,113,227,0.1)" : "transparent",
              color: activeTab === item.id ? "#0071E3" : "#6E6E73",
              fontSize: 14, fontWeight: activeTab === item.id ? 600 : 400,
              textAlign: "left", transition: "all 0.15s ease",
            }}>
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              {item.label}
              {item.id === "users" && (
                <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 700, background: "#0071E3", color: "white", borderRadius: 20, padding: "2px 6px" }}>
                  SA
                </span>
              )}
            </button>
          ))}
        </nav>

        <div style={{ padding: "0 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px", borderRadius: 12, background: "rgba(0,0,0,0.03)" }}>
            <Avatar name={session?.user?.email || "A"} size={32} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#1C1C1E", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                {isSuperAdmin ? "Super Admin" : "Admin"}
              </div>
              <div style={{ fontSize: 11, color: "#8E8E93", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {session?.user?.email}
              </div>
            </div>
            <button onClick={() => supabase.auth.signOut()} title="Sign out" style={{ background: "none", border: "none", cursor: "pointer", color: "#8E8E93", fontSize: 16, padding: 4, flexShrink: 0 }}>↪</button>
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={{ marginLeft: 240, padding: "40px 48px", maxWidth: 1100 }}>
        <div style={{ marginBottom: 40 }}>
          <p style={{ fontSize: 13, color: "#8E8E93", fontWeight: 500, marginBottom: 4, letterSpacing: "0.02em" }}>
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <h1 style={{ fontSize: 34, fontWeight: 700, letterSpacing: "-0.8px", margin: 0 }}>
            {navItems.find(n => n.id === activeTab)?.label}
          </h1>
        </div>

        {/* OVERVIEW */}
        {activeTab === "overview" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
              <div style={{ gridColumn: "span 2", background: "linear-gradient(135deg, #0071E3 0%, #34AADC 100%)", borderRadius: 24, padding: "36px 40px", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.07)" }} />
                <div style={{ position: "absolute", bottom: -60, right: 60, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />
                <p style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.7)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>Total Balance</p>
                <h2 style={{ fontSize: 52, fontWeight: 700, color: "white", letterSpacing: "-2px", margin: "0 0 16px" }}>{fmt(data.totalBalance)}</h2>
                <span style={{ background: "rgba(255,255,255,0.2)", color: "white", borderRadius: 20, padding: "4px 10px", fontSize: 12, fontWeight: 600 }}>
                  Contributions − Expenses
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ background: "white", borderRadius: 20, padding: "24px", border: "1px solid rgba(0,0,0,0.05)", flex: 1 }}>
                  <p style={{ fontSize: 12, color: "#8E8E93", fontWeight: 500, marginBottom: 8 }}>People Tracked</p>
                  <p style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-1px", margin: 0 }}>{data.people.length}</p>
                </div>
                <div style={{ background: "white", borderRadius: 20, padding: "24px", border: "1px solid rgba(0,0,0,0.05)", flex: 1 }}>
                  <p style={{ fontSize: 12, color: "#8E8E93", fontWeight: 500, marginBottom: 8 }}>Expense Categories</p>
                  <p style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-1px", margin: 0 }}>{data.expenses.length}</p>
                </div>
              </div>
            </div>

            <div style={{ background: "white", borderRadius: 24, padding: "32px", border: "1px solid rgba(0,0,0,0.05)", marginBottom: 24 }}>
              <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 24, letterSpacing: "-0.3px" }}>Budget Utilization</h3>
              {data.expenses.length === 0 ? (
                <p style={{ color: "#8E8E93", fontSize: 14 }}>No expense categories yet.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  {data.expenses.map(exp => {
                    const pct = exp.budget > 0 ? Math.min(Math.round((exp.amount / exp.budget) * 100), 100) : 0;
                    return (
                      <div key={exp.id}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 8, height: 8, borderRadius: "50%", background: exp.color }} />
                            <span style={{ fontSize: 14, fontWeight: 500 }}>{exp.label}</span>
                          </div>
                          <div>
                            <span style={{ fontSize: 14, fontWeight: 600 }}>{fmt(exp.amount)}</span>
                            <span style={{ fontSize: 12, color: "#8E8E93", marginLeft: 6 }}>of {fmt(exp.budget)}</span>
                          </div>
                        </div>
                        <div style={{ height: 6, background: "#F2F2F7", borderRadius: 99, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: exp.color, borderRadius: 99, transition: "width 0.6s ease" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ background: "white", borderRadius: 24, padding: "32px", border: "1px solid rgba(0,0,0,0.05)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <h3 style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.3px", margin: 0 }}>Recent Activity</h3>
                <button onClick={() => setActiveTab("activity")} style={{ background: "none", border: "none", color: "#0071E3", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>View all</button>
              </div>
              {data.recentActivity.length === 0 ? (
                <p style={{ color: "#8E8E93", fontSize: 14 }}>No activity yet.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {data.recentActivity.slice(0, 4).map(item => (
                    <div key={item.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #F2F2F7" }}>
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
              )}
            </div>
          </div>
        )}

        {/* PEOPLE */}
        {activeTab === "people" && (
          <div style={{ background: "white", borderRadius: 24, padding: "32px", border: "1px solid rgba(0,0,0,0.05)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
              <h3 style={{ fontSize: 17, fontWeight: 600, margin: 0 }}>{data.people.length} People</h3>
              <div style={{ display: "flex", gap: 10 }}>
                <Btn onClick={() => { setFormError(null); setShowAddContribution(true); }} variant="secondary">+ Contribution</Btn>
                <Btn onClick={() => { setFormError(null); setShowAddPerson(true); }}>+ Add Person</Btn>
              </div>
            </div>
            {data.people.length === 0 ? (
              <p style={{ color: "#8E8E93", fontSize: 14 }}>No people added yet. Click "Add Person" to get started.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
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
                        <p style={{ fontSize: 11, color: "#8E8E93", margin: 0 }}>Total contributions</p>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 20, background: person.status === "Active" ? "rgba(52,199,89,0.12)" : "rgba(142,142,147,0.12)", color: person.status === "Active" ? "#34C759" : "#8E8E93" }}>
                        {person.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* EXPENSES */}
        {activeTab === "expenses" && (
          <div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
              <Btn onClick={() => { setFormError(null); setShowAddExpense(true); }}>+ Record Expense</Btn>
            </div>
            {data.expenses.length === 0 ? (
              <div style={{ background: "white", borderRadius: 24, padding: "48px 32px", border: "1px solid rgba(0,0,0,0.05)", textAlign: "center" }}>
                <p style={{ color: "#8E8E93", fontSize: 14 }}>No expenses recorded yet.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {data.expenses.map(exp => {
                  const pct = exp.budget > 0 ? Math.min(Math.round((exp.amount / exp.budget) * 100), 100) : 0;
                  return (
                    <div key={exp.id} style={{ background: "white", borderRadius: 24, padding: "28px 32px", border: "1px solid rgba(0,0,0,0.05)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ width: 44, height: 44, borderRadius: 14, background: `${exp.color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <div style={{ width: 14, height: 14, borderRadius: "50%", background: exp.color }} />
                          </div>
                          <div>
                            <h4 style={{ fontSize: 17, fontWeight: 600, margin: 0, letterSpacing: "-0.3px" }}>{exp.label}</h4>
                            <p style={{ fontSize: 12, color: "#8E8E93", margin: 0 }}>{pct}% of budget used</p>
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <p style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.8px", margin: 0 }}>{fmt(exp.amount)}</p>
                          <p style={{ fontSize: 12, color: "#8E8E93", margin: 0 }}>of {fmt(exp.budget)} budget</p>
                        </div>
                      </div>
                      <div style={{ height: 8, background: "#F2F2F7", borderRadius: 99, overflow: "hidden", marginBottom: 12 }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: exp.color, borderRadius: 99 }} />
                      </div>
                      <p style={{ fontSize: 12, color: "#8E8E93", margin: 0 }}>
                        <span style={{ color: "#34C759", fontWeight: 600 }}>{fmt(exp.budget - exp.amount)} remaining</span>
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ACTIVITY */}
        {activeTab === "activity" && (
          <div style={{ background: "white", borderRadius: 24, padding: "32px", border: "1px solid rgba(0,0,0,0.05)" }}>
            <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 24, letterSpacing: "-0.3px" }}>All Activity</h3>
            {data.recentActivity.length === 0 ? (
              <p style={{ color: "#8E8E93", fontSize: 14 }}>No activity yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
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
            )}
          </div>
        )}

        {/* USERS — Super Admin only */}
        {activeTab === "users" && isSuperAdmin && (
          <div style={{ background: "white", borderRadius: 24, padding: "32px", border: "1px solid rgba(0,0,0,0.05)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
              <h3 style={{ fontSize: 17, fontWeight: 600, margin: 0 }}>{(data.users || []).length} System Users</h3>
              <Btn onClick={() => { setFormError(null); setShowAddUser(true); }}>+ Add User</Btn>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {(data.users || []).map((user, i) => (
                <div key={user.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px", borderRadius: 14, background: i % 2 === 0 ? "#FAFAFA" : "white" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <Avatar name={user.full_name || user.email} size={42} />
                    <div>
                      <p style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>{user.full_name || "—"}</p>
                      <p style={{ fontSize: 12, color: "#8E8E93", margin: 0 }}>{user.email}</p>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20, textTransform: "uppercase", letterSpacing: "0.04em",
                      background: user.role === "super_admin" ? "rgba(0,113,227,0.1)" : "rgba(52,199,89,0.1)",
                      color: user.role === "super_admin" ? "#0071E3" : "#34C759",
                    }}>
                      {user.role === "super_admin" ? "Super Admin" : "Admin"}
                    </span>
                    {user.id !== session?.user?.id && (
                      <span style={{ fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 20, background: user.status === "active" ? "rgba(52,199,89,0.1)" : "rgba(142,142,147,0.1)", color: user.status === "active" ? "#34C759" : "#8E8E93" }}>
                        {user.status === "active" ? "Active" : "Inactive"}
                      </span>
                    )}
                    {user.id === session?.user?.id && (
                      <span style={{ fontSize: 11, color: "#8E8E93", fontStyle: "italic" }}>You</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* MODAL: Add User */}
      {showAddUser && (
        <Modal title="Add New User" onClose={() => setShowAddUser(false)}>
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
              <Btn variant="secondary" type="button" onClick={() => setShowAddUser(false)}>Cancel</Btn>
              <Btn type="submit" disabled={formLoading}>{formLoading ? "Creating..." : "Create User"}</Btn>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: Add Person */}
      {showAddPerson && (
        <Modal title="Add Person" onClose={() => setShowAddPerson(false)}>
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
              <Btn variant="secondary" type="button" onClick={() => setShowAddPerson(false)}>Cancel</Btn>
              <Btn type="submit" disabled={formLoading}>{formLoading ? "Saving..." : "Add Person"}</Btn>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: Add Contribution */}
      {showAddContribution && (
        <Modal title="Record Contribution" onClose={() => setShowAddContribution(false)}>
          <form onSubmit={handleAddContribution}>
            <Field label="Person">
              <Select value={newContribution.member_id} onChange={e => setNewContribution({ ...newContribution, member_id: e.target.value })} required>
                <option value="">Select person...</option>
                {(data.allPeople || []).filter(p => p.role === "member").map(p => (
                  <option key={p.id} value={p.id}>{p.full_name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Amount ($)"><Input type="number" min="1" value={newContribution.amount} onChange={e => setNewContribution({ ...newContribution, amount: e.target.value })} placeholder="0.00" required /></Field>
            <Field label="Type">
              <Select value={newContribution.type} onChange={e => setNewContribution({ ...newContribution, type: e.target.value })}>
                <option value="partnership">Partnership</option>
                <option value="welfare">Welfare</option>
                <option value="education">Education</option>
                <option value="other">Other</option>
              </Select>
            </Field>
            <Field label="Note (optional)"><Input value={newContribution.note} onChange={e => setNewContribution({ ...newContribution, note: e.target.value })} placeholder="Any notes..." /></Field>
            {formError && <p style={{ fontSize: 13, color: "#FF375F", marginBottom: 16 }}>{formError}</p>}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
              <Btn variant="secondary" type="button" onClick={() => setShowAddContribution(false)}>Cancel</Btn>
              <Btn type="submit" disabled={formLoading}>{formLoading ? "Saving..." : "Record"}</Btn>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: Add Expense */}
      {showAddExpense && (
        <Modal title="Record Expense" onClose={() => setShowAddExpense(false)}>
          <form onSubmit={handleAddExpense}>
            <Field label="Category">
              <Select value={newExpense.category_id} onChange={e => setNewExpense({ ...newExpense, category_id: e.target.value })} required>
                <option value="">Select category...</option>
                {(data.categories || []).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Amount ($)"><Input type="number" min="1" value={newExpense.amount} onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })} placeholder="0.00" required /></Field>
            <Field label="Description"><Input value={newExpense.label} onChange={e => setNewExpense({ ...newExpense, label: e.target.value })} placeholder="What was this for?" required /></Field>
            {formError && <p style={{ fontSize: 13, color: "#FF375F", marginBottom: 16 }}>{formError}</p>}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
              <Btn variant="secondary" type="button" onClick={() => setShowAddExpense(false)}>Cancel</Btn>
              <Btn type="submit" disabled={formLoading}>{formLoading ? "Saving..." : "Record"}</Btn>
            </div>
          </form>
        </Modal>
      )}

    </div>
  );
}