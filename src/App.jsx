import { useState, useEffect } from "react";
import { supabase } from "./lib/supabaseClient";

const emptyData = {
  user: { name: "Admin", role: "Administrator" },
  totalBalance: 0,
  monthlyGrowth: 0,
  people: [],
  expenses: [],
  recentActivity: [],
};

const fmt = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

const Avatar = ({ name, size = 36 }) => {
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2);
  const colors = ["#0071E3", "#34C759", "#FF9F0A", "#FF375F", "#BF5AF2", "#5AC8FA"];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: `linear-gradient(135deg, ${color}33, ${color}66)`,
      border: `1.5px solid ${color}44`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.33, fontWeight: 600, color: color, flexShrink: 0
    }}>{initials}</div>
  );
};

export default function App({ session }) {
  async function handleSignOut() {
    await supabase.auth.signOut();
  }
  const [activeTab, setActiveTab] = useState("overview");
  const [data, setData] = useState(emptyData);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllData();
  }, []);

  async function fetchAllData() {
    setLoading(true);
    try {
      // Fetch members/profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      // Fetch contributions
      const { data: contributions } = await supabase
        .from("contributions")
        .select("*, profiles(full_name)")
        .order("created_at", { ascending: false });

      // Fetch expense categories
      const { data: categories } = await supabase
        .from("expense_categories")
        .select("*");

      // Fetch expenses
      const { data: expenses } = await supabase
        .from("expenses")
        .select("*, expense_categories(name, color)")
        .order("created_at", { ascending: false });

      // Build people list with total contributions per member
      const people = (profiles || []).map(p => {
        const total = (contributions || [])
          .filter(c => c.member_id === p.id)
          .reduce((sum, c) => sum + Number(c.amount), 0);
        const last = (contributions || []).find(c => c.member_id === p.id);
        return {
          id: p.id,
          name: p.full_name,
          status: p.status === "active" ? "Active" : "Inactive",
          contributions: total,
          lastActivity: last
            ? new Date(last.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
            : "No activity",
        };
      });

      // Build expense categories with spent amounts
      const expenseData = (categories || []).map(cat => {
        const spent = (expenses || [])
          .filter(e => e.category_id === cat.id)
          .reduce((sum, e) => sum + Number(e.amount), 0);
        return {
          id: cat.id,
          label: cat.name,
          amount: spent,
          budget: Number(cat.budget),
          color: cat.color || "#0071E3",
        };
      });

      // Build recent activity from both contributions and expenses
      const contribActivity = (contributions || []).slice(0, 5).map(c => ({
        id: c.id,
        name: c.profiles?.full_name || "Member",
        action: "Contribution received",
        amount: `+$${Number(c.amount).toLocaleString()}`,
        time: new Date(c.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        positive: true,
      }));

      const expenseActivity = (expenses || []).slice(0, 5).map(e => ({
        id: e.id,
        name: e.expense_categories?.name || "Expense",
        action: e.label,
        amount: `-$${Number(e.amount).toLocaleString()}`,
        time: new Date(e.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        positive: false,
      }));

      const recentActivity = [...contribActivity, ...expenseActivity]
        .sort((a, b) => new Date(b.time) - new Date(a.time))
        .slice(0, 8);

      // Total balance = total contributions - total expenses
      const totalContributions = (contributions || []).reduce((sum, c) => sum + Number(c.amount), 0);
      const totalExpenses = (expenses || []).reduce((sum, e) => sum + Number(e.amount), 0);
      const totalBalance = totalContributions - totalExpenses;

      setData({
        user: { name: "Admin", role: "Administrator" },
        totalBalance,
        monthlyGrowth: 0,
        people,
        expenses: expenseData,
        recentActivity,
      });
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return (
    <div style={{
      minHeight: "100vh", background: "#F2F2F7",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: "linear-gradient(135deg, #0071E3, #34AADC)",
          margin: "0 auto 16px",
        }} />
        <p style={{ color: "#8E8E93", fontSize: 14 }}>Loading Unified...</p>
      </div>
    </div>
  );

  return (
    <div style={{
      minHeight: "100vh",
      background: "#F2F2F7",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif",
      color: "#1C1C1E",
    }}>

      {/* Sidebar */}
      <div style={{
        position: "fixed", left: 0, top: 0, bottom: 0, width: 240,
        background: "rgba(255,255,255,0.85)",
        backdropFilter: "blur(40px)",
        borderRight: "1px solid rgba(0,0,0,0.06)",
        display: "flex", flexDirection: "column",
        padding: "32px 0", zIndex: 100,
      }}>
        {/* Logo */}
        <div style={{ padding: "0 24px 40px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10,
              background: "linear-gradient(135deg, #0071E3, #34AADC)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 8h5M9 8h5M8 2v5M8 9v5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.4px", color: "#1C1C1E" }}>Unified</span>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "0 12px", display: "flex", flexDirection: "column", gap: 2 }}>
          {[
            { id: "overview", label: "Overview", icon: "⊞" },
            { id: "people", label: "People", icon: "◎" },
            { id: "expenses", label: "Expenses", icon: "◈" },
            { id: "activity", label: "Activity", icon: "◷" },
          ].map(item => (
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
            </button>
          ))}
        </nav>

        {/* User */}
        <div style={{ padding: "0 16px" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "12px", borderRadius: 12,
            background: "rgba(0,0,0,0.03)",
          }}>
            <Avatar name={session?.user?.email || "Admin"} size={32} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: "#8E8E93", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {session?.user?.email || "Admin"}
              </div>
            </div>
            <button onClick={handleSignOut} title="Sign out" style={{
              background: "none", border: "none", cursor: "pointer",
              color: "#8E8E93", fontSize: 16, padding: 4, flexShrink: 0,
            }}>↪</button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ marginLeft: 240, padding: "40px 48px", maxWidth: 1100, }}>

        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <p style={{ fontSize: 13, color: "#8E8E93", fontWeight: 500, marginBottom: 4, letterSpacing: "0.02em" }}>
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <h1 style={{ fontSize: 34, fontWeight: 700, letterSpacing: "-0.8px", color: "#1C1C1E", margin: 0 }}>
            {activeTab === "overview" && "Overview"}
            {activeTab === "people" && "People"}
            {activeTab === "expenses" && "Expenses"}
            {activeTab === "activity" && "Activity"}
          </h1>
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div>
            {/* Top Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
              {/* Hero Card */}
              <div style={{
                gridColumn: "span 2",
                background: "linear-gradient(135deg, #0071E3 0%, #34AADC 100%)",
                borderRadius: 24, padding: "36px 40px",
                position: "relative", overflow: "hidden",
              }}>
                <div style={{
                  position: "absolute", top: -40, right: -40,
                  width: 200, height: 200, borderRadius: "50%",
                  background: "rgba(255,255,255,0.07)",
                }} />
                <div style={{
                  position: "absolute", bottom: -60, right: 60,
                  width: 160, height: 160, borderRadius: "50%",
                  background: "rgba(255,255,255,0.05)",
                }} />
                <p style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.7)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>Total Balance</p>
                <h2 style={{ fontSize: 52, fontWeight: 700, color: "white", letterSpacing: "-2px", margin: "0 0 16px" }}>
                  {fmt(data.totalBalance)}
                </h2>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{
                    background: "rgba(255,255,255,0.2)", color: "white",
                    borderRadius: 20, padding: "4px 10px", fontSize: 12, fontWeight: 600
                  }}>↑ {data.monthlyGrowth}%</span>
                  <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>vs last month</span>
                </div>
              </div>

              {/* Quick Stats */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{
                  background: "white", borderRadius: 20, padding: "24px",
                  border: "1px solid rgba(0,0,0,0.05)", flex: 1,
                }}>
                  <p style={{ fontSize: 12, color: "#8E8E93", fontWeight: 500, marginBottom: 8 }}>Active Members</p>
                  <p style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-1px", color: "#1C1C1E", margin: 0 }}>
                    {data.people.filter(p => p.status === "Active").length}
                    <span style={{ fontSize: 14, fontWeight: 400, color: "#8E8E93", marginLeft: 4 }}>/ {data.people.length}</span>
                  </p>
                </div>
                <div style={{
                  background: "white", borderRadius: 20, padding: "24px",
                  border: "1px solid rgba(0,0,0,0.05)", flex: 1,
                }}>
                  <p style={{ fontSize: 12, color: "#8E8E93", fontWeight: 500, marginBottom: 8 }}>Expense Categories</p>
                  <p style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-1px", color: "#1C1C1E", margin: 0 }}>
                    {data.expenses.length}
                  </p>
                </div>
              </div>
            </div>

            {/* Expense Breakdown */}
            <div style={{
              background: "white", borderRadius: 24, padding: "32px",
              border: "1px solid rgba(0,0,0,0.05)", marginBottom: 24,
            }}>
              <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 24, letterSpacing: "-0.3px" }}>Budget Utilization</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {data.expenses.map(exp => {
                  const pct = Math.round((exp.amount / exp.budget) * 100);
                  return (
                    <div key={exp.id}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: exp.color }} />
                          <span style={{ fontSize: 14, fontWeight: 500, color: "#1C1C1E" }}>{exp.label}</span>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: "#1C1C1E" }}>{fmt(exp.amount)}</span>
                          <span style={{ fontSize: 12, color: "#8E8E93", marginLeft: 6 }}>of {fmt(exp.budget)}</span>
                        </div>
                      </div>
                      <div style={{ height: 6, background: "#F2F2F7", borderRadius: 99, overflow: "hidden" }}>
                        <div style={{
                          height: "100%", width: `${pct}%`,
                          background: exp.color, borderRadius: 99,
                          transition: "width 0.6s cubic-bezier(0.4,0,0.2,1)"
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Activity Preview */}
            <div style={{
              background: "white", borderRadius: 24, padding: "32px",
              border: "1px solid rgba(0,0,0,0.05)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <h3 style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.3px", margin: 0 }}>Recent Activity</h3>
                <button onClick={() => setActiveTab("activity")} style={{
                  background: "none", border: "none", color: "#0071E3",
                  fontSize: 13, fontWeight: 500, cursor: "pointer"
                }}>View all</button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {data.recentActivity.slice(0, 3).map(item => (
                  <div key={item.id} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "12px 0",
                    borderBottom: "1px solid #F2F2F7",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <Avatar name={item.name} size={36} />
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 500, margin: 0, color: "#1C1C1E" }}>{item.name}</p>
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
            </div>
          </div>
        )}

        {/* PEOPLE TAB */}
        {activeTab === "people" && (
          <div style={{
            background: "white", borderRadius: 24, padding: "32px",
            border: "1px solid rgba(0,0,0,0.05)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
              <h3 style={{ fontSize: 17, fontWeight: 600, margin: 0 }}>{data.people.length} Members</h3>
              <button style={{
                background: "#0071E3", color: "white", border: "none",
                borderRadius: 10, padding: "8px 16px", fontSize: 13,
                fontWeight: 600, cursor: "pointer"
              }}>+ Add Member</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {data.people.map((person, i) => (
                <div key={person.id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "16px 16px", borderRadius: 14,
                  background: i % 2 === 0 ? "#FAFAFA" : "white",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <Avatar name={person.name} size={42} />
                    <div>
                      <p style={{ fontSize: 15, fontWeight: 600, margin: 0, color: "#1C1C1E" }}>{person.name}</p>
                      <p style={{ fontSize: 12, color: "#8E8E93", margin: 0 }}>Last active {person.lastActivity}</p>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ fontSize: 15, fontWeight: 700, margin: 0, letterSpacing: "-0.3px" }}>{fmt(person.contributions)}</p>
                      <p style={{ fontSize: 11, color: "#8E8E93", margin: 0 }}>Total contributions</p>
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 20,
                      background: person.status === "Active" ? "rgba(52,199,89,0.12)" : "rgba(142,142,147,0.12)",
                      color: person.status === "Active" ? "#34C759" : "#8E8E93",
                    }}>{person.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* EXPENSES TAB */}
        {activeTab === "expenses" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {data.expenses.map(exp => {
              const pct = Math.round((exp.amount / exp.budget) * 100);
              const remaining = exp.budget - exp.amount;
              return (
                <div key={exp.id} style={{
                  background: "white", borderRadius: 24, padding: "28px 32px",
                  border: "1px solid rgba(0,0,0,0.05)",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: 14,
                        background: `${exp.color}18`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
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
                    <div style={{
                      height: "100%", width: `${pct}%`,
                      background: exp.color, borderRadius: 99,
                    }} />
                  </div>
                  <p style={{ fontSize: 12, color: "#8E8E93", margin: 0 }}>
                    <span style={{ color: "#34C759", fontWeight: 600 }}>{fmt(remaining)} remaining</span>
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* ACTIVITY TAB */}
        {activeTab === "activity" && (
          <div style={{
            background: "white", borderRadius: 24, padding: "32px",
            border: "1px solid rgba(0,0,0,0.05)",
          }}>
            <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 24, letterSpacing: "-0.3px" }}>All Activity</h3>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {data.recentActivity.map((item, i) => (
                <div key={item.id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "16px 0",
                  borderBottom: i < data.recentActivity.length - 1 ? "1px solid #F2F2F7" : "none",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <Avatar name={item.name} size={42} />
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600, margin: 0, color: "#1C1C1E" }}>{item.name}</p>
                      <p style={{ fontSize: 12, color: "#8E8E93", margin: 0 }}>{item.action} · {item.time}</p>
                    </div>
                  </div>
                  <span style={{
                    fontSize: 15, fontWeight: 700,
                    color: item.positive ? "#34C759" : "#FF375F"
                  }}>{item.amount}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}