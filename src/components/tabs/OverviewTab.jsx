import { useState } from "react";
import { Card, StatCard, ChartCard, Btn, EmptyState, Avatar } from "../ui/index.jsx";
import { BarChart, LineChart } from "../Charts.jsx";
import { fyLabel } from "../../constants.js";

export function OverviewTab({
  data, t, fmt, monthlyData, timelineData, isSuperAdmin, openModal,
  setActiveTab, setEditingContribution, handleDeleteContribution,
  setEditingExpenseEntry, handleDeleteExpenseEntry,
}) {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth()); // 0-indexed
  const [monthAnimDir, setMonthAnimDir] = useState(null); // 'left' | 'right'
  const [monthVisible, setMonthVisible] = useState(true);

  const navigateMonth = (dir) => {
    setMonthAnimDir(dir);
    setMonthVisible(false);
    setTimeout(() => {
      let nm = viewMonth + dir;
      let ny = viewYear;
      if (nm < 0) { nm = 11; ny = viewYear - 1; }
      if (nm > 11) { nm = 0; ny = viewYear + 1; }
      setViewMonth(nm);
      setViewYear(ny);
      setMonthVisible(true);
      setMonthAnimDir(null);
    }, 180);
  };

  // Filter transactions for selected month
  const monthContribs = (data.rawContributions||[]).filter(c => {
    const d = new Date(c.created_at);
    return d.getFullYear() === viewYear && d.getMonth() === viewMonth;
  });
  const monthExpenses = (data.rawExpenses||[]).filter(e => {
    const d = new Date(e.created_at);
    return d.getFullYear() === viewYear && d.getMonth() === viewMonth;
  });
  const monthIncome = monthContribs.reduce((s,c) => s + Number(c.amount), 0);
  const monthExpTotal = monthExpenses.reduce((s,e) => s + Number(e.amount), 0);
  const monthNet = monthIncome - monthExpTotal;

  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth();
  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleString("en-US", { month: "long", year: "numeric" });

  // Merge and sort month transactions
  const monthTxns = [
    ...monthContribs.map(c => ({ id:`c-${c.id}`, name:c.profiles?.full_name||"Member", action:c.payment_types?.name||"Contribution", amount:Number(c.amount), date:c.created_at, positive:true, raw:c })),
    ...monthExpenses.map(e => ({ id:`e-${e.id}`, name:e.expense_categories?.name||"Expense", action:e.label, amount:Number(e.amount), date:e.created_at, positive:false, raw:e })),
  ].sort((a,b) => new Date(b.date) - new Date(a.date));

  const currentMonth = new Date().toLocaleString("en-US",{month:"long"});
  const membersWithTarget = data.people.filter(p=>p.target>0);

  // ── Budget alerts ─────────────────────────────────────────
  const budgetAlerts = (data.expenses||[])
    .filter(exp => exp.budget > 0)
    .map(exp => ({ ...exp, pct: Math.round((exp.amount / exp.budget) * 100) }))
    .filter(exp => exp.pct >= 80)
    .sort((a,b) => b.pct - a.pct);

  // ── Year-to-date calculations ──────────────────────────────
  const fyStart = data.org?.financial_year_start || now.getFullYear();
  const fyFormat = data.org?.financial_year_format || "single";
  // Determine FY start date: Jan 1 of fyStart year (or April 1 etc if you ever add month)
  const fyStartDate = new Date(fyStart, 0, 1); // Jan 1
  const fyEndDate = new Date(fyStart + 1, 0, 1); // Jan 1 next year

  const ytdContribs = (data.rawContributions||[]).filter(c => {
    const d = new Date(c.created_at);
    return d >= fyStartDate && d < fyEndDate;
  });
  const ytdExpenses = (data.rawExpenses||[]).filter(e => {
    const d = new Date(e.created_at);
    return d >= fyStartDate && d < fyEndDate;
  });
  const ytdIncome   = ytdContribs.reduce((s,c) => s + Number(c.amount), 0);
  const ytdExpTotal = ytdExpenses.reduce((s,e) => s + Number(e.amount), 0);
  const ytdNet      = ytdIncome - ytdExpTotal;
  const fyLabelText = fyLabel(fyStart, fyFormat);

  // ── Monthly report export ──────────────────────────────────
  const exportMonthlyCSV = () => {
    const rows = [
      ["Monthly Breakdown Report", monthLabel],
      [],
      ["Type", "Name/Category", "Payment Type / Note", "Amount", "Date"],
      ...monthContribs.map(c => [
        "Income",
        c.profiles?.full_name || "Member",
        c.payment_types?.name || "",
        c.amount,
        new Date(c.created_at).toLocaleDateString("en-US"),
      ]),
      ...monthExpenses.map(e => [
        "Expense",
        e.label || e.expense_categories?.name || "Expense",
        e.note || "",
        e.amount,
        new Date(e.created_at).toLocaleDateString("en-US"),
      ]),
      [],
      ["", "", "Total Income",  monthIncome,   ""],
      ["", "", "Total Expenses", monthExpTotal, ""],
      ["", "", "Net",           monthNet,       ""],
    ];
    const escape = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = rows.map(r => r.map(escape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `monthly-report-${viewYear}-${String(viewMonth+1).padStart(2,"0")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportMonthlyPDF = () => {
    const win = window.open("", "_blank");
    if (!win) return;
    const rows = [
      ...monthContribs.map(c => `
        <tr>
          <td style="color:#34C759;font-weight:600">Income</td>
          <td>${c.profiles?.full_name || "Member"}</td>
          <td>${c.payment_types?.name || "—"}</td>
          <td style="text-align:right;font-weight:700;color:#34C759">+${fmt(c.amount)}</td>
          <td style="color:#888">${new Date(c.created_at).toLocaleDateString("en-US",{month:"short",day:"numeric"})}</td>
        </tr>`),
      ...monthExpenses.map(e => `
        <tr>
          <td style="color:#FF375F;font-weight:600">Expense</td>
          <td>${e.label || e.expense_categories?.name || "Expense"}</td>
          <td>${e.note || "—"}</td>
          <td style="text-align:right;font-weight:700;color:#FF375F">-${fmt(e.amount)}</td>
          <td style="color:#888">${new Date(e.created_at).toLocaleDateString("en-US",{month:"short",day:"numeric"})}</td>
        </tr>`),
    ].join("");

    win.document.write(`<!DOCTYPE html><html><head><title>${monthLabel} Report</title>
      <style>
        body { font-family: -apple-system, sans-serif; padding: 40px; color: #1C1C1E; }
        h1 { font-size: 24px; font-weight: 700; margin: 0 0 4px; }
        p.sub { color: #8E8E93; font-size: 13px; margin: 0 0 32px; }
        .stats { display: flex; gap: 20px; margin-bottom: 32px; }
        .stat { flex: 1; padding: 16px 20px; border-radius: 12px; }
        .stat .label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; margin: 0 0 4px; }
        .stat .value { font-size: 22px; font-weight: 700; margin: 0; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th { text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: #8E8E93; padding: 8px 12px; border-bottom: 2px solid #E5E5EA; }
        td { padding: 10px 12px; border-bottom: 1px solid #F2F2F7; }
        tr:last-child td { border-bottom: none; }
        @media print { body { padding: 20px; } }
      </style></head><body>
      <h1>${data.org?.name || "Organisation"}</h1>
      <p class="sub">Monthly Report · ${monthLabel}</p>
      <div class="stats">
        <div class="stat" style="background:rgba(52,199,89,0.1)">
          <p class="label" style="color:#34C759">Income</p>
          <p class="value" style="color:#34C759">${fmt(monthIncome)}</p>
          <p style="font-size:11px;color:#34C759;margin:2px 0 0;opacity:.7">${monthContribs.length} transactions</p>
        </div>
        <div class="stat" style="background:rgba(255,55,95,0.1)">
          <p class="label" style="color:#FF375F">Expenses</p>
          <p class="value" style="color:#FF375F">${fmt(monthExpTotal)}</p>
          <p style="font-size:11px;color:#FF375F;margin:2px 0 0;opacity:.7">${monthExpenses.length} transactions</p>
        </div>
        <div class="stat" style="background:${ytdNet>=0?"rgba(0,113,227,0.1)":"rgba(255,55,95,0.08)"}">
          <p class="label" style="color:${monthNet>=0?"#0071E3":"#FF375F"}">Net</p>
          <p class="value" style="color:${monthNet>=0?"#0071E3":"#FF375F"}">${fmt(monthNet)}</p>
          <p style="font-size:11px;color:${monthNet>=0?"#0071E3":"#FF375F"};margin:2px 0 0;opacity:.7">${monthNet>=0?"surplus":"deficit"}</p>
        </div>
      </div>
      <table>
        <thead><tr><th>Type</th><th>Name</th><th>Category / Note</th><th style="text-align:right">Amount</th><th>Date</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <script>window.onload=()=>{window.print();}</script>
      </body></html>`);
    win.document.close();
  };
  const onTrack = membersWithTarget.filter(p=>p.thisMonth>=p.target).length;
  const behind = membersWithTarget.filter(p=>p.thisMonth>0&&p.thisMonth<p.target).length;
  const missed = membersWithTarget.filter(p=>p.thisMonth===0&&p.target>0).length;
  const totalTargetThisMonth = membersWithTarget.reduce((s,p)=>s+p.target,0);
  const totalActualThisMonth = data.people.reduce((s,p)=>s+(p.thisMonth||0),0);

  // ── Empty state for brand new orgs ───────────────────────
  const isNewOrg = data.people.length === 0 && (data.rawContributions||[]).length === 0;
  if (isNewOrg) {
    const steps = [
      { num:1, title:"Add your members", desc:"Go to People and add the members of your organisation.", tab:"people", btn:"Go to People" },
      { num:2, title:"Set up payment types", desc:"Go to Settings and create payment types like Tithes or Dues.", tab:"settings", btn:"Go to Settings" },
      { num:3, title:"Record contributions", desc:"Once members are added, record their payments in Payments.", tab:"payments", btn:"Go to Payments" },
    ];
    return (
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"40px 20px", minHeight:400 }}>
        <div style={{ width:64, height:64, borderRadius:20, background:`${t.accent}18`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:32, marginBottom:20 }}>🎉</div>
        <h2 style={{ fontSize:22, fontWeight:700, color:t.text, margin:"0 0 8px", textAlign:"center" }}>Welcome to {data.org?.name || "your organisation"}</h2>
        <p style={{ fontSize:14, color:t.textSub, margin:"0 0 36px", textAlign:"center", maxWidth:400 }}>Get started in 3 simple steps to begin tracking your finances.</p>
        <div style={{ display:"flex", flexDirection:"column", gap:16, width:"100%", maxWidth:480 }}>
          {steps.map((step, i) => (
            <div key={step.num} style={{ display:"flex", alignItems:"center", gap:16, padding:"18px 20px", background:t.surface, borderRadius:16, border:`1px solid ${t.border}`, boxShadow:t.cardShadow, animation:`slideUp 0.3s ease ${i*0.08}s both` }}>
              <div style={{ width:36, height:36, borderRadius:11, background:`${t.accent}18`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, fontWeight:700, color:t.accent, flexShrink:0 }}>{step.num}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontSize:14, fontWeight:600, margin:"0 0 2px", color:t.text }}>{step.title}</p>
                <p style={{ fontSize:12, color:t.textSub, margin:0 }}>{step.desc}</p>
              </div>
              <button onClick={()=>setActiveTab(step.tab)} style={{ fontSize:12, fontWeight:600, color:t.accent, background:`${t.accent}12`, border:"none", borderRadius:8, padding:"6px 12px", cursor:"pointer", flexShrink:0, whiteSpace:"nowrap" }}>{step.btn}</button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
                  <div className="grid-3" style={{ marginBottom:24 }}>
                    <div className="card-hover col-span-2" style={{ background:t.heroGrad, borderRadius:24, padding:"36px 40px", position:"relative", overflow:"hidden", boxShadow:"0 8px 32px rgba(0,113,227,0.3)" }}>
                      <div style={{ position:"absolute", top:-40, right:-40, width:200, height:200, borderRadius:"50%", background:"rgba(255,255,255,0.07)" }}/>
                      <div style={{ position:"absolute", bottom:-60, right:60, width:160, height:160, borderRadius:"50%", background:"rgba(255,255,255,0.05)" }}/>
                      <p style={{ fontSize:11, fontWeight:600, color:"rgba(255,255,255,0.7)", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:10 }}>Net Balance</p>
                      <h2 className="hero-amount" style={{ fontSize:52, fontWeight:700, color:"white", letterSpacing:"-2px", margin:"0 0 20px" }}>{fmt(data.totalBalance)}</h2>
                      <div style={{ display:"flex", gap:20 }}>
                        <div><p style={{ fontSize:11, color:"rgba(255,255,255,0.6)", margin:"0 0 2px" }}>Total In</p><p style={{ fontSize:16, fontWeight:700, color:"white", margin:0 }}>{fmt(data.totalContributions)}</p></div>
                        <div style={{ width:1, background:"rgba(255,255,255,0.2)" }}/>
                        <div><p style={{ fontSize:11, color:"rgba(255,255,255,0.6)", margin:"0 0 2px" }}>Total Out</p><p style={{ fontSize:16, fontWeight:700, color:"white", margin:0 }}>{fmt(data.totalExpenses)}</p></div>
                      </div>
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                      <StatCard label="People Tracked" value={data.people.length} t={t} style={{ animation:"slideUp 0.35s ease 0.05s both" }}/>
                      {/* Interactive month navigator card */}
                      <div className="card-hover" style={{ background:t.surface, borderRadius:20, padding:"20px 24px", border:`1px solid ${t.border}`, flex:1, boxShadow:t.cardShadow, overflow:"hidden", animation:"slideUp 0.35s ease 0.1s both" }}>
                        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                          <button onClick={()=>navigateMonth(-1)} style={{ background:"none", border:"none", cursor:"pointer", color:t.textSub, fontSize:16, padding:"2px 6px", borderRadius:6, lineHeight:1, transition:"color 0.15s" }}>‹</button>
                          <p style={{ fontSize:11, fontWeight:600, color:t.textSub, margin:0, letterSpacing:"0.04em", textTransform:"uppercase", textAlign:"center" }}>
                            {isCurrentMonth ? "This Month" : monthLabel}
                          </p>
                          <button onClick={()=>navigateMonth(1)} disabled={isCurrentMonth} style={{ background:"none", border:"none", cursor:isCurrentMonth?"default":"pointer", color:isCurrentMonth?t.surfaceAlt:t.textSub, fontSize:16, padding:"2px 6px", borderRadius:6, lineHeight:1, transition:"color 0.15s" }}>›</button>
                        </div>
                        <div style={{ overflow:"hidden" }}>
                          <p style={{ fontSize:28, fontWeight:700, letterSpacing:"-1px", margin:0, color:t.text, opacity:monthVisible?1:0, transform:monthVisible?"translateX(0)":`translateX(${monthAnimDir===1?"-":"+"}20px)`, transition:"opacity 0.18s ease, transform 0.18s ease" }}>
                            {fmt(monthIncome)}
                          </p>
                        </div>
                        {!isCurrentMonth && (
                          <p style={{ fontSize:11, color:t.textSub, margin:"4px 0 0", opacity:monthVisible?1:0, transition:"opacity 0.18s ease" }}>
                            {new Date(viewYear, viewMonth, 1).toLocaleString("en-US",{month:"short"})} {viewYear}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
      
                  <div className="grid-2" style={{ marginBottom:20 }}>
                    <ChartCard title="Income vs Expenses" subtitle="Last 6 months" t={t} style={{ animation:"slideUp 0.35s ease 0.1s both" }}>
                      <BarChart data={monthlyData} fmt={fmt} t={t} height={210}/>
                    </ChartCard>
                    <ChartCard title="Contribution Trend" subtitle="Last 6 months" t={t} style={{ animation:"slideUp 0.35s ease 0.15s both" }}>
                      <LineChart data={timelineData} fmt={fmt} t={t} height={210}/>
                    </ChartCard>
                  </div>

                  {/* ── Budget Alerts ── */}
                  {budgetAlerts.length > 0 && (
                    <Card t={t} style={{ marginBottom:20, animation:"slideUp 0.3s ease", border:`1px solid rgba(255,159,10,0.3)`, background:t.surface }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
                        <div style={{ width:32, height:32, borderRadius:10, background:"rgba(255,159,10,0.12)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>⚠️</div>
                        <div>
                          <h3 style={{ fontSize:15, fontWeight:700, margin:0, color:t.text }}>Budget Alerts</h3>
                          <p style={{ fontSize:12, color:t.textSub, margin:"2px 0 0" }}>{budgetAlerts.length} {budgetAlerts.length===1?"category":"categories"} need attention</p>
                        </div>
                      </div>
                      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                        {budgetAlerts.map((exp, i) => {
                          const isOver = exp.pct >= 100;
                          const color  = isOver ? "#FF375F" : "#FF9F0A";
                          const bg     = isOver ? "rgba(255,55,95,0.08)" : "rgba(255,159,10,0.08)";
                          return (
                            <div key={exp.id} style={{ padding:"12px 16px", borderRadius:12, background:bg, border:`1px solid ${color}22`, animation:`slideIn 0.25s ease ${i*0.05}s both` }}>
                              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                                  <div style={{ width:8, height:8, borderRadius:"50%", background:exp.color, flexShrink:0 }}/>
                                  <span style={{ fontSize:13, fontWeight:600, color:t.text }}>{exp.label}</span>
                                  <span style={{ fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:20, background:`${color}18`, color }}>{isOver ? "OVER BUDGET" : "WARNING"}</span>
                                </div>
                                <span style={{ fontSize:13, fontWeight:700, color }}>{exp.pct}%</span>
                              </div>
                              <div style={{ height:6, background:t.surfaceAlt, borderRadius:99, overflow:"hidden" }}>
                                <div style={{ height:"100%", width:`${Math.min(exp.pct,100)}%`, background:color, borderRadius:99, transition:"width 0.8s cubic-bezier(0.34,1.1,0.64,1)", boxShadow:`0 0 6px ${color}55` }}/>
                              </div>
                              <div style={{ display:"flex", justifyContent:"space-between", marginTop:6 }}>
                                <span style={{ fontSize:11, color:t.textSub }}>{fmt(exp.amount)} spent</span>
                                <span style={{ fontSize:11, color:t.textSub }}>of {fmt(exp.budget)} budget</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </Card>
                  )}

                  {/* ── Year-to-Date Summary ── */}
                  <Card t={t} style={{ marginBottom:20, animation:"slideUp 0.35s ease 0.12s both" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:10 }}>
                      <div>
                        <h3 style={{ fontSize:15, fontWeight:700, margin:0, color:t.text }}>Year-to-Date Summary</h3>
                        <p style={{ fontSize:12, color:t.textSub, margin:"3px 0 0" }}>FY {fyLabelText} · {ytdContribs.length + ytdExpenses.length} transactions</p>
                      </div>
                    </div>
                    <div className="grid-3" style={{ marginBottom: ytdIncome > 0 || ytdExpTotal > 0 ? 20 : 0 }}>
                      {[
                        { label:"YTD Income",   value:ytdIncome,   color:"#34C759", bg:"rgba(52,199,89,0.1)" },
                        { label:"YTD Expenses", value:ytdExpTotal, color:"#FF375F", bg:"rgba(255,55,95,0.1)" },
                        { label:"YTD Net",      value:ytdNet,      color:ytdNet>=0?"#0071E3":"#FF375F", bg:ytdNet>=0?"rgba(0,113,227,0.1)":"rgba(255,55,95,0.08)" },
                      ].map((s,i) => (
                        <div key={s.label} style={{ padding:"16px 18px", borderRadius:14, background:s.bg }}>
                          <p style={{ fontSize:11, fontWeight:600, color:s.color, margin:"0 0 4px", textTransform:"uppercase", letterSpacing:"0.06em" }}>{s.label}</p>
                          <p style={{ fontSize:22, fontWeight:700, color:s.color, margin:0, letterSpacing:"-0.5px" }}>{fmt(s.value)}</p>
                        </div>
                      ))}
                    </div>
                    {(ytdIncome > 0 || ytdExpTotal > 0) && (
                      <div>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                          <span style={{ fontSize:12, color:t.textSub }}>Income vs Expenses</span>
                          <span style={{ fontSize:12, fontWeight:600, color:ytdNet>=0?"#34C759":"#FF375F" }}>{ytdNet>=0?"+":""}{fmt(ytdNet)} {ytdNet>=0?"surplus":"deficit"}</span>
                        </div>
                        <div style={{ height:8, background:t.surfaceAlt, borderRadius:99, overflow:"hidden", display:"flex" }}>
                          <div style={{ height:"100%", width:`${Math.round((ytdIncome/(ytdIncome+ytdExpTotal))*100)}%`, background:"linear-gradient(90deg,#34C759,#30D158)", borderRadius:99, transition:"width 0.9s cubic-bezier(0.34,1.1,0.64,1)", boxShadow:"0 0 8px rgba(52,199,89,0.4)" }}/>
                        </div>
                      </div>
                    )}
                  </Card>

                  {/* Monthly Breakdown Card */}
                  <Card t={t} style={{ marginBottom:20, animation:"slideUp 0.35s ease 0.18s both", overflow:"hidden" }}>
                    {/* Header with month navigation */}
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:10 }}>
                      <div>
                        <h3 style={{ fontSize:15, fontWeight:700, margin:0, color:t.text }}>Monthly Breakdown</h3>
                        <p style={{ fontSize:12, color:t.textSub, margin:"3px 0 0", opacity:monthVisible?1:0, transform:monthVisible?"translateY(0)":"translateY(4px)", transition:"opacity 0.18s, transform 0.18s" }}>{monthLabel}</p>
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <Btn size="sm" variant="secondary" t={t} onClick={exportMonthlyCSV} title="Export as CSV">↓ CSV</Btn>
                        <Btn size="sm" variant="secondary" t={t} onClick={exportMonthlyPDF} title="Export as PDF">↓ PDF</Btn>
                        <button onClick={()=>navigateMonth(-1)} style={{ width:32, height:32, borderRadius:10, border:`1px solid ${t.border}`, background:t.surfaceAlt, cursor:"pointer", color:t.text, fontSize:16, display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.15s" }}>‹</button>
                        <span style={{ fontSize:13, fontWeight:600, color:t.text, minWidth:120, textAlign:"center", opacity:monthVisible?1:0, transform:monthVisible?"translateX(0)":`translateX(${monthAnimDir===1?"-":"+"}12px)`, transition:"opacity 0.18s, transform 0.18s", display:"inline-block" }}>{monthLabel}</span>
                        <button onClick={()=>navigateMonth(1)} disabled={isCurrentMonth} style={{ width:32, height:32, borderRadius:10, border:`1px solid ${t.border}`, background:t.surfaceAlt, cursor:isCurrentMonth?"default":"pointer", color:isCurrentMonth?t.textSub:t.text, fontSize:16, display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.15s", opacity:isCurrentMonth?0.4:1 }}>›</button>
                      </div>
                    </div>

                    {/* 3 stat chips */}
                    <div className="grid-3" style={{ marginBottom:20 }}>
                      {[
                        { label:"Income", value:monthIncome, color:"#34C759", bg:"rgba(52,199,89,0.1)" },
                        { label:"Expenses", value:monthExpTotal, color:"#FF375F", bg:"rgba(255,55,95,0.1)" },
                        { label:"Net", value:monthNet, color:monthNet>=0?"#0071E3":"#FF375F", bg:monthNet>=0?"rgba(0,113,227,0.1)":"rgba(255,55,95,0.08)" },
                      ].map((s,i) => (
                        <div key={s.label} style={{ padding:"14px 16px", borderRadius:14, background:s.bg, opacity:monthVisible?1:0, transform:monthVisible?"translateY(0)":"translateY(8px)", transition:`opacity 0.2s ease ${i*0.05}s, transform 0.2s ease ${i*0.05}s` }}>
                          <p style={{ fontSize:11, fontWeight:600, color:s.color, margin:"0 0 4px", textTransform:"uppercase", letterSpacing:"0.06em" }}>{s.label}</p>
                          <p style={{ fontSize:20, fontWeight:700, color:s.color, margin:0, letterSpacing:"-0.5px" }}>{fmt(s.value)}</p>
                          <p style={{ fontSize:11, color:s.color, margin:"2px 0 0", opacity:0.7 }}>{s.label==="Net"?(monthNet>=0?"surplus":"deficit"):s.label==="Income"?`${monthContribs.length} transactions`:`${monthExpenses.length} transactions`}</p>
                        </div>
                      ))}
                    </div>

                    {/* Visual income vs expense bar */}
                    {(monthIncome > 0 || monthExpTotal > 0) && (
                      <div style={{ marginBottom:20 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                          <span style={{ fontSize:12, color:t.textSub }}>Income vs Expenses</span>
                          <span style={{ fontSize:12, fontWeight:600, color:monthNet>=0?"#34C759":"#FF375F" }}>{monthNet>=0?"+":""}{fmt(monthNet)}</span>
                        </div>
                        <div style={{ height:8, background:t.surfaceAlt, borderRadius:99, overflow:"hidden", display:"flex" }}>
                          <div style={{ height:"100%", width:monthVisible?`${Math.round((monthIncome/(monthIncome+monthExpTotal))*100)}%`:"0%", background:"linear-gradient(90deg,#34C759,#30D158)", borderRadius:99, transition:"width 0.8s cubic-bezier(0.34,1.1,0.64,1)", boxShadow:"0 0 8px rgba(52,199,89,0.4)" }}/>
                        </div>
                      </div>
                    )}

                    {/* Transaction list */}
                    {monthTxns.length === 0
                      ? <EmptyState message={`No transactions in ${monthLabel}.`} t={t}/>
                      : (
                        <div>
                          <p style={{ fontSize:12, fontWeight:600, color:t.textSub, margin:"0 0 10px", textTransform:"uppercase", letterSpacing:"0.06em" }}>{monthTxns.length} Transactions</p>
                          <div style={{ maxHeight:280, overflowY:"auto", paddingRight:4 }}>
                            {monthTxns.map((item,i) => (
                              <div key={item.id} className="row-hover" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 8px", borderBottom:i<monthTxns.length-1?`1px solid ${t.border}`:"none", borderRadius:8, flexWrap:"wrap", gap:6, opacity:monthVisible?1:0, transform:monthVisible?"translateX(0)":"translateX(-8px)", transition:`opacity 0.2s ease ${Math.min(i*0.03,0.3)}s, transform 0.2s ease ${Math.min(i*0.03,0.3)}s` }}>
                                <div style={{ display:"flex", alignItems:"center", gap:10, flex:1, minWidth:0 }}>
                                  <div style={{ width:32, height:32, borderRadius:9, background:item.positive?"rgba(52,199,89,0.12)":"rgba(255,55,95,0.1)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0 }}>{item.positive?"↑":"↓"}</div>
                                  <div style={{ minWidth:0 }}>
                                    <p style={{ fontSize:13, fontWeight:600, margin:0, color:t.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.name}</p>
                                    <p style={{ fontSize:11, color:t.textSub, margin:0 }}>{item.action} · {new Date(item.date).toLocaleDateString("en-US",{month:"short",day:"numeric"})}</p>
                                  </div>
                                </div>
                                <span style={{ fontSize:14, fontWeight:700, color:item.positive?"#34C759":"#FF375F", flexShrink:0 }}>{item.positive?"+":"-"}{fmt(item.amount)}</span>
                              </div>
                            ))}
                          </div>
                          {monthTxns.length > 8 && (
                            <button onClick={()=>setActiveTab("activity")} style={{ marginTop:12, background:"none", border:"none", color:t.accent, fontSize:13, fontWeight:500, cursor:"pointer", width:"100%", textAlign:"center", padding:"8px" }}>
                              View all in Activity →
                            </button>
                          )}
                        </div>
                      )
                    }
                  </Card>
      
                  {membersWithTarget.length>0&&(
                    <Card t={t} style={{ marginBottom:20, animation:"slideUp 0.35s ease 0.18s both" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
                        <div>
                          <h3 style={{ fontSize:15, fontWeight:700, margin:0, color:t.text }}>Consistency Tracker</h3>
                          <p style={{ fontSize:12, color:t.textSub, margin:"3px 0 0" }}>{currentMonth} - {membersWithTarget.length} members with targets</p>
                        </div>
                        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                          <span style={{ fontSize:12, fontWeight:600, padding:"4px 10px", borderRadius:20, background:"rgba(52,199,89,0.12)", color:"#34C759" }}>{onTrack} on track</span>
                          {behind>0&&<span style={{ fontSize:12, fontWeight:600, padding:"4px 10px", borderRadius:20, background:"rgba(255,159,10,0.12)", color:"#FF9F0A" }}>{behind} behind</span>}
                          {missed>0&&<span style={{ fontSize:12, fontWeight:600, padding:"4px 10px", borderRadius:20, background:"rgba(255,55,95,0.12)", color:"#FF375F" }}>{missed} missed</span>}
                        </div>
                      </div>
                      {totalTargetThisMonth>0&&(
                        <div style={{ marginBottom:20 }}>
                          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                            <span style={{ fontSize:12, color:t.textSub }}>Overall progress</span>
                            <span style={{ fontSize:12, fontWeight:700, color:t.text }}>{fmt(totalActualThisMonth)} / {fmt(totalTargetThisMonth)}</span>
                          </div>
                          <div style={{ height:10, background:t.surfaceAlt, borderRadius:99, overflow:"hidden" }}>
                            <div style={{ height:"100%", width:`${Math.min(Math.round((totalActualThisMonth/totalTargetThisMonth)*100),100)}%`, background:`linear-gradient(90deg,${t.accent},#34C759)`, borderRadius:99, transition:"width 0.9s cubic-bezier(0.34,1.1,0.64,1)", boxShadow:`0 0 10px ${t.accent}55` }}/>
                          </div>
                        </div>
                      )}
                      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                        {membersWithTarget.map((p,i)=>{
                          const pct=Math.min(Math.round((p.thisMonth/p.target)*100),100);
                          const clr=p.thisMonth>=p.target?"#34C759":p.thisMonth>0?"#FF9F0A":"#FF375F";
                          return (
                            <div key={p.id} style={{ animation:`slideIn 0.3s ease ${i*0.05}s both` }}>
                              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
                                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                                  <div style={{ width:8, height:8, borderRadius:"50%", background:clr, flexShrink:0 }}/>
                                  <span style={{ fontSize:13, fontWeight:600, color:t.text }}>{p.name}</span>
                                </div>
                                <span style={{ fontSize:12, color:t.textSub }}>{fmt(p.thisMonth)} / {fmt(p.target)}</span>
                              </div>
                              <div style={{ height:6, background:t.surfaceAlt, borderRadius:99, overflow:"hidden" }}>
                                <div style={{ height:"100%", width:`${pct}%`, background:clr, borderRadius:99, transition:`width 0.8s cubic-bezier(0.34,1.1,0.64,1) ${i*0.06}s`, boxShadow:`0 0 6px ${clr}66` }}/>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </Card>
                  )}
      
                  <Card t={t} style={{ animation:"slideUp 0.35s ease 0.2s both" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
                      <h3 style={{ fontSize:15, fontWeight:700, margin:0, color:t.text }}>Recent Activity</h3>
                      <button onClick={()=>setActiveTab("activity")} style={{ background:"none", border:"none", color:t.accent, fontSize:13, fontWeight:500, cursor:"pointer" }}>View all</button>
                    </div>
                    {data.recentActivity.length===0?<EmptyState message="No activity yet." t={t}/>:
                      <div>{data.recentActivity.slice(0,5).map((item,i)=>(
                        <div key={item.id} className="row-hover" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 8px", borderBottom:i<4?`1px solid ${t.border}`:"none", borderRadius:8, animation:`slideIn 0.3s ease ${i*0.05}s both`, flexWrap:"wrap", gap:8 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:12, flex:1, minWidth:0 }}>
                            <Avatar name={item.name} size={36}/>
                            <div style={{ minWidth:0 }}><p style={{ fontSize:14, fontWeight:500, margin:0, color:t.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.name}</p><p style={{ fontSize:12, color:t.textSub, margin:0 }}>{item.action}</p></div>
                          </div>
                          <div className="row-actions" style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
                            <span style={{ fontSize:15, fontWeight:700, color:item.positive?"#34C759":"#FF375F" }}>{item.amount}</span>
                            {item.positive?(
                              <><Btn size="sm" variant="secondary" t={t} onClick={()=>{const c=data.rawContributions.find(r=>`c-${r.id}`===item.id);if(c){setEditingContribution({id:c.id,member_name:c.profiles?.full_name||"",amount:c.amount,payment_type_id:c.payment_type_id||"",note:c.note||"",date:c.created_at?new Date(c.created_at).toISOString().slice(0,10):new Date().toISOString().slice(0,10)});openModal("editContribution");}}}>Edit</Btn>
                              <Btn size="sm" variant="danger" t={t} onClick={()=>{const c=data.rawContributions.find(r=>`c-${r.id}`===item.id);if(c)handleDeleteContribution(c);}}>Del</Btn></>
                            ):(
                              <><Btn size="sm" variant="secondary" t={t} onClick={()=>{const ex=data.rawExpenses.find(r=>`e-${r.id}`===item.id);if(ex){setEditingExpenseEntry({id:ex.id,label:ex.label,amount:ex.amount,category_id:ex.category_id||""});openModal("editExpenseEntry");}}}>Edit</Btn>
                              <Btn size="sm" variant="danger" t={t} onClick={()=>{const ex=data.rawExpenses.find(r=>`e-${r.id}`===item.id);if(ex)handleDeleteExpenseEntry(ex);}}>Del</Btn></>
                            )}
                          </div>
                        </div>
                      ))}</div>
                    }
                  </Card>
                </div>
  );
}