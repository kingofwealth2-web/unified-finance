import { useState } from "react";
import { createPortal } from "react-dom";
import { Card, Btn } from "../ui/index.jsx";

export function FinancialSummaryTab({
  data, t, fmt, orgName,
  exportDateFrom, setExportDateFrom,
  exportDateTo, setExportDateTo,
}) {
  // ── Date filter helpers ──────────────────────────────────────
  const inRange = (dateStr) => {
    if (!dateStr) return true;
    const d = new Date(dateStr);
    if (exportDateFrom && d < new Date(exportDateFrom + "T00:00:00")) return false;
    if (exportDateTo   && d > new Date(exportDateTo + "T23:59:59")) return false;
    return true;
  };

  const hasFilter = exportDateFrom || exportDateTo;
  const periodLabel = hasFilter
    ? `${exportDateFrom || "All time"} → ${exportDateTo || "Today"}`
    : "All time";

  // ── Filtered data ────────────────────────────────────────────
  const contributions = (data.rawContributions||[]).filter(c => inRange(c.created_at));
  const incomeRows    = (data.rawIncome||[]).filter(i => inRange(i.created_at));
  const expenseRows   = (data.rawExpenses||[]).filter(e => inRange(e.created_at));

  const totalContribs = contributions.reduce((s,c) => s+Number(c.amount), 0);
  const totalIncome   = incomeRows.reduce((s,i) => s+Number(i.amount), 0);
  const totalExpenses = expenseRows.reduce((s,e) => s+Number(e.amount), 0);
  const totalAllIncome = totalContribs + totalIncome;
  const net = totalAllIncome - totalExpenses;
  const openingBalance = Number(data.org?.opening_balance||0);

  // ── Payment type breakdown ───────────────────────────────────
  const byPaymentType = (data.paymentTypes||[]).map(pt => {
    const ptContribs = contributions.filter(c => c.payment_type_id === pt.id);
    const total = ptContribs.reduce((s,c) => s+Number(c.amount), 0);
    const count = ptContribs.length;
    return { name: pt.name, color: pt.color, total, count };
  }).filter(pt => pt.total > 0);

  const uncat = contributions.filter(c => !c.payment_type_id);
  if (uncat.length > 0) {
    byPaymentType.push({
      name: "Uncategorised", color: "#8E8E93",
      total: uncat.reduce((s,c) => s+Number(c.amount), 0),
      count: uncat.length,
    });
  }

  // ── Expense category breakdown ───────────────────────────────
  const byExpenseCategory = (data.expenses||[]).map(cat => {
    const catExpenses = expenseRows.filter(e => e.category_id === cat.id);
    const total = catExpenses.reduce((s,e) => s+Number(e.amount), 0);
    const count = catExpenses.length;
    return { name: cat.label, color: cat.color, total, count };
  }).filter(c => c.total > 0);

  // ── Income source breakdown ──────────────────────────────────
  const byIncomeSource = incomeRows.reduce((acc, i) => {
    const key = i.source || "Other";
    if (!acc[key]) acc[key] = { total: 0, count: 0 };
    acc[key].total += Number(i.amount);
    acc[key].count++;
    return acc;
  }, {});

  // ── Top contributors ─────────────────────────────────────────
  const topContributors = Object.values(
    contributions.reduce((acc, c) => {
      const id = c.member_id;
      const name = c.profiles?.full_name || "Unknown";
      if (!acc[id]) acc[id] = { id, name, total: 0, count: 0 };
      acc[id].total += Number(c.amount);
      acc[id].count++;
      return acc;
    }, {})
  ).sort((a,b) => b.total - a.total).slice(0, 10);

  // ── Print trigger ─────────────────────────────────────────── 
  function triggerPrint() {
    // Build HTML for popup print window
    const statCards = [
      { label: "Member Contributions", value: fmt(totalContribs), color: "#34C759" },
      { label: "Other Income",         value: fmt(totalIncome),   color: "#30D158" },
      { label: "Total Income",         value: fmt(totalAllIncome),color: "#0071E3" },
      { label: "Total Expenses",       value: fmt(totalExpenses), color: "#FF375F" },
      { label: "Net Balance",          value: fmt(net),           color: net>=0?"#34C759":"#FF375F" },
      ...(openingBalance > 0 ? [{ label: "Opening Balance", value: fmt(openingBalance), color: "#8E8E93" }] : []),
    ];

    const colorMap = { "#34C759":"c-green", "#30D158":"c-green", "#0071E3":"c-blue", "#FF375F":"c-red", "#8E8E93":"c-purple" };
    const statCardsHtml = statCards.map(s => `
      <div class="stat-card ${colorMap[s.color]||'c-blue'}">
        <div class="stat-label">${s.label}</div>
        <div class="stat-value">${s.value}</div>
      </div>`).join("");

    const paymentTypeRows = byPaymentType.map(pt => `
      <tr>
        <td><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${pt.color};margin-right:7px;vertical-align:middle"></span>${pt.name}</td>
        <td style="text-align:center;color:#6b7280">${pt.count}</td>
        <td class="amt amt-g">${fmt(pt.total)}</td>
        <td class="amt" style="color:#6b7280">${totalContribs>0?Math.round((pt.total/totalContribs)*100):0}%</td>
      </tr>`).join("");

    const expenseCatRows = byExpenseCategory.map(c => `
      <tr>
        <td>${c.name}</td>
        <td style="text-align:center;color:#6b7280">${c.count}</td>
        <td class="amt amt-r">${fmt(c.total)}</td>
        <td class="amt" style="color:#6b7280">${totalExpenses>0?Math.round((c.total/totalExpenses)*100):0}%</td>
      </tr>`).join("");

    const incomeSourceRows = Object.entries(byIncomeSource).map(([src, v]) => `
      <tr>
        <td>${src}</td>
        <td style="text-align:center;color:#6b7280">${v.count}</td>
        <td class="amt amt-g">${fmt(v.total)}</td>
        <td class="amt" style="color:#6b7280">${totalIncome>0?Math.round((v.total/totalIncome)*100):0}%</td>
      </tr>`).join("");

    const topContribRows = topContributors.map((m, ri) => `
      <tr>
        <td class="${ri===0?"rank-1":ri===1?"rank-2":ri===2?"rank-3":""}" style="font-weight:700">${ri+1}</td>
        <td style="font-weight:500">${m.name}</td>
        <td style="text-align:center;color:#6b7280">${m.count}</td>
        <td class="amt amt-g">${fmt(m.total)}</td>
      </tr>`).join("");

    const section = (title, tableHtml) => tableHtml ? `
      <div style="margin-bottom:24px;page-break-inside:avoid">
        <div class="section-head"><div class="section-bar"></div><h2>${title}</h2></div>
        <table>${tableHtml}</table>
      </div>` : "";

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>${orgName} — Financial Summary</title>
      <style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  @page{margin:14mm 16mm;}
  body{font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;background:#fff;color:#111827;font-size:13px;line-height:1.5;}
  .doc-header{background:linear-gradient(135deg,#1e1f2e 0%,#2d2f4a 100%);color:#fff;padding:28px 32px 24px;position:relative;overflow:hidden;}
  .doc-header::before{content:'';position:absolute;top:-40px;right:-40px;width:180px;height:180px;border-radius:50%;background:rgba(79,110,247,0.18);pointer-events:none;}
  .doc-header::after{content:'';position:absolute;bottom:-30px;left:30%;width:120px;height:120px;border-radius:50%;background:rgba(45,216,138,0.1);pointer-events:none;}
  .doc-org{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:rgba(255,255,255,0.5);margin-bottom:5px;}
  .doc-title{font-size:22px;font-weight:800;letter-spacing:-0.5px;color:#fff;margin-bottom:4px;}
  .doc-meta{font-size:11px;color:rgba(255,255,255,0.5);display:flex;gap:14px;flex-wrap:wrap;margin-top:6px;}
  .doc-logo{position:absolute;right:32px;top:50%;transform:translateY(-50%);width:44px;height:44px;background:rgba(79,110,247,0.25);border:1px solid rgba(79,110,247,0.45);border-radius:13px;display:flex;align-items:center;justify-content:center;}
  .body-wrap{padding:20px 32px 24px;}
  .stat-row{display:grid;gap:10px;margin:0 0 24px;}
  .stat-card{padding:14px 18px;border-radius:10px;border:1px solid #e5e7eb;}
  .stat-label{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;}
  .stat-value{font-size:20px;font-weight:800;letter-spacing:-0.5px;line-height:1.1;}
  .stat-sub{font-size:10px;margin-top:3px;opacity:0.75;}
  .c-green .stat-label{color:#059669;}.c-green{background:#f0fdf4;border-color:#bbf7d0;}.c-green .stat-value{color:#047857;}.c-green .stat-sub{color:#047857;}
  .c-red .stat-label{color:#dc2626;}.c-red{background:#fff1f2;border-color:#fecdd3;}.c-red .stat-value{color:#b91c1c;}.c-red .stat-sub{color:#b91c1c;}
  .c-blue .stat-label{color:#2563eb;}.c-blue{background:#eff6ff;border-color:#bfdbfe;}.c-blue .stat-value{color:#1d4ed8;}.c-blue .stat-sub{color:#1d4ed8;}
  .c-purple .stat-label{color:#7c3aed;}.c-purple{background:#f5f3ff;border-color:#ddd6fe;}.c-purple .stat-value{color:#6d28d9;}
  .section-head{display:flex;align-items:center;gap:8px;margin:22px 0 10px;}
  .section-bar{width:3px;height:15px;border-radius:2px;background:linear-gradient(180deg,#4F6EF7,#2dd88a);flex-shrink:0;}
  .section-head h2{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#374151;}
  table{width:100%;border-collapse:collapse;font-size:12px;}
  thead tr{background:#f9fafb;}
  th{padding:8px 12px;text-align:left;font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em;border-bottom:1px solid #e5e7eb;}
  td{padding:8px 12px;border-bottom:1px solid #f3f4f6;color:#374151;vertical-align:middle;}
  tr:last-child td{border-bottom:none;}
  tfoot td{background:#f9fafb;font-weight:700;color:#111827;border-top:1px solid #e5e7eb;border-bottom:none;padding:9px 12px;}
  .amt{text-align:right;font-weight:600;font-variant-numeric:tabular-nums;}
  .amt-g{color:#047857;}.amt-r{color:#b91c1c;}.amt-b{color:#1d4ed8;}
  .tag{display:inline-block;padding:1px 7px;border-radius:20px;font-size:10px;font-weight:600;}
  .tag-g{background:#dcfce7;color:#15803d;}.tag-r{background:#fee2e2;color:#b91c1c;}.tag-b{background:#dbeafe;color:#1d4ed8;}.tag-gray{background:#f3f4f6;color:#4b5563;}
  .rank-1{color:#b45309;font-weight:800;}.rank-2{color:#6b7280;font-weight:700;}.rank-3{color:#92400e;font-weight:700;}
  .goal-bg{height:5px;background:#e5e7eb;border-radius:99px;overflow:hidden;margin:3px 0 2px;}
  .goal-fill{height:100%;border-radius:99px;}
  .doc-footer{margin-top:24px;padding-top:12px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;font-size:10px;color:#9ca3af;}
  @media print{.doc-header,.stat-card{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
</style>
      </head><body>
      <div class="doc-header">
        <div class="doc-logo"><svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M2 8h5M9 8h5M8 2v5M8 9v5" stroke="white" stroke-width="2" stroke-linecap="round"/></svg></div>
        <div class="doc-org">${orgName}</div>
        <div class="doc-title">Financial Summary</div>
        <div class="doc-meta">
          <span>${periodLabel}</span>
          <span>Generated ${new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})}</span>
        </div>
      </div>
      <div class="body-wrap">
        <div class="stat-row" style="grid-template-columns:repeat(3,1fr)">
          ${statCardsHtml}
        </div>

        ${byPaymentType.length > 0 ? section("Member Contributions by Payment Type",
          `<thead><tr><th>Payment Type</th><th style="text-align:center">Records</th><th class="amt">Amount</th><th class="amt">Share</th></tr></thead><tbody>${paymentTypeRows}</tbody>
           <tfoot><tr><td colspan="2">Total</td><td class="amt">${fmt(totalContribs)}</td><td class="amt">100%</td></tr></tfoot>`) : ""}

        ${Object.keys(byIncomeSource).length > 0 ? section("Other Income by Source",
          `<thead><tr><th>Source</th><th style="text-align:center">Records</th><th class="amt">Amount</th><th class="amt">Share</th></tr></thead><tbody>${incomeSourceRows}</tbody>
           <tfoot><tr><td colspan="2">Total</td><td class="amt">${fmt(totalIncome)}</td><td class="amt">100%</td></tr></tfoot>`) : ""}

        ${byExpenseCategory.length > 0 ? section("Expenses by Category",
          `<thead><tr><th>Category</th><th style="text-align:center">Records</th><th class="amt">Amount</th><th class="amt">Share</th></tr></thead><tbody>${expenseCatRows}</tbody>
           <tfoot><tr><td colspan="2">Total</td><td class="amt">${fmt(totalExpenses)}</td><td class="amt">100%</td></tr></tfoot>`) : ""}

        ${topContributors.length > 0 ? section("Top Contributors",
          `<thead><tr><th>#</th><th>Member</th><th style="text-align:center">Records</th><th class="amt">Total</th></tr></thead><tbody>${topContribRows}</tbody>`) : ""}

        <div class="doc-footer">
          <span>${orgName} · Confidential</span>
          <span>Net: <strong style="color:${net>=0?"#047857":"#b91c1c"}">${fmt(net)}</strong> · Unified Finance</span>
        </div>
      </div>
    </body></html>`;

    const w = window.open("", "_blank", "width=1000,height=750");
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 300);
  }

  // ── CSV Export ───────────────────────────────────────────────
  function exportCSV() {
    const escape = v => `"${String(v ?? "").replace(/"/g, '""')}"`;

    const rows = [
      // Header
      [`${orgName} — Financial Summary Export`],
      [`Period: ${periodLabel}`],
      [`Generated: ${new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})}`],
      [],

      // Contributions
      ["MEMBER CONTRIBUTIONS"],
      ["Date", "Member", "Payment Type", "Note", "Amount"],
      ...contributions.map(c => [
        c.created_at ? c.created_at.slice(0,10) : "",
        c.profiles?.full_name || "Unknown",
        c.payment_types?.name || "Uncategorised",
        c.note || "",
        Number(c.amount),
      ]),
      ["", "", "", "TOTAL", totalContribs],
      [],

      // Other Income
      ...(incomeRows.length > 0 ? [
        ["OTHER INCOME"],
        ["Date", "Label", "Source", "Note", "Amount"],
        ...incomeRows.map(i => [
          i.created_at ? i.created_at.slice(0,10) : "",
          i.label || "",
          i.source || "",
          i.note || "",
          Number(i.amount),
        ]),
        ["", "", "", "TOTAL", totalIncome],
        [],
      ] : []),

      // Expenses
      ...(expenseRows.length > 0 ? [
        ["EXPENSES"],
        ["Date", "Label", "Category", "Amount"],
        ...expenseRows.map(e => [
          e.created_at ? e.created_at.slice(0,10) : "",
          e.label || "",
          e.expense_categories?.name || "Uncategorised",
          Number(e.amount),
        ]),
        ["", "", "TOTAL", totalExpenses],
        [],
      ] : []),

      // Summary
      ["SUMMARY"],
      ["Member Contributions", totalContribs],
      ["Other Income", totalIncome],
      ["Total Income", totalAllIncome],
      ["Total Expenses", totalExpenses],
      ["Net", net],
      ...(openingBalance > 0 ? [["Opening Balance", openingBalance]] : []),
    ];

    const csv = rows.map(r => r.map(escape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const dateTag = exportDateFrom || new Date().toISOString().slice(0,10);
    a.download = `financial-summary-${dateTag}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── UI ───────────────────────────────────────────────────────
  const StatCard = ({ label, value, sub, color }) => (
    <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:20, padding:"20px 24px", boxShadow:t.cardShadow, animation:"slideUp 0.3s ease" }}>
      <p style={{ fontSize:11, fontWeight:600, color:t.textSub, textTransform:"uppercase", letterSpacing:"0.06em", margin:"0 0 6px" }}>{label}</p>
      <p style={{ fontSize:26, fontWeight:700, margin:"0 0 2px", color:color||t.accent, letterSpacing:"-0.8px" }}>{value}</p>
      {sub && <p style={{ fontSize:12, color:t.textMuted, margin:0 }}>{sub}</p>}
    </div>
  );

  const SectionCard = ({ title, children }) => (
    <Card t={t} style={{ marginBottom:20, animation:"slideUp 0.3s ease 0.1s both" }}>
      <p style={{ fontSize:11, fontWeight:700, color:t.textSub, textTransform:"uppercase", letterSpacing:"0.06em", margin:"0 0 16px", paddingBottom:10, borderBottom:`1px solid ${t.border}` }}>{title}</p>
      {children}
    </Card>
  );

  const BreakdownRow = ({ label, color, total, count, shareOf }) => {
    const pct = shareOf > 0 ? Math.round((total/shareOf)*100) : 0;
    return (
      <div style={{ marginBottom:12 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            {color && <span style={{ width:8, height:8, borderRadius:"50%", background:color, display:"inline-block", flexShrink:0 }}/>}
            <span style={{ fontSize:13, fontWeight:500, color:t.text }}>{label}</span>
            <span style={{ fontSize:11, color:t.textMuted }}>({count} record{count!==1?"s":""})</span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:11, color:t.textSub }}>{pct}%</span>
            <span style={{ fontSize:14, fontWeight:700, color:t.text }}>{fmt(total)}</span>
          </div>
        </div>
        <div style={{ height:5, background:t.surfaceAlt, borderRadius:99, overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${pct}%`, background:color||t.accent, borderRadius:99, transition:"width 0.7s cubic-bezier(0.34,1.1,0.64,1)" }}/>
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20, flexWrap:"wrap", gap:12 }}>
        <div>
          <h2 style={{ fontSize:20, fontWeight:700, margin:"0 0 4px", color:t.text, letterSpacing:"-0.4px" }}>Financial Summary</h2>
          <p style={{ fontSize:13, color:t.textSub, margin:0 }}>{hasFilter ? `Period: ${periodLabel}` : "All time"}</p>
        </div>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
          <input type="date" value={exportDateFrom} onChange={e=>setExportDateFrom(e.target.value)}
            style={{ padding:"8px 12px", borderRadius:10, border:`1px solid ${t.borderStrong}`, background:t.surfaceAlt, color:t.text, fontSize:13, outline:"none", fontFamily:"inherit" }}/>
          <input type="date" value={exportDateTo} onChange={e=>setExportDateTo(e.target.value)}
            style={{ padding:"8px 12px", borderRadius:10, border:`1px solid ${t.borderStrong}`, background:t.surfaceAlt, color:t.text, fontSize:13, outline:"none", fontFamily:"inherit" }}/>
          {hasFilter && (
            <button onClick={()=>{ setExportDateFrom(""); setExportDateTo(""); }}
              style={{ padding:"8px 14px", borderRadius:10, border:`1px solid ${t.borderStrong}`, background:"none", color:t.textSub, fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>
              Clear
            </button>
          )}
          <Btn t={t} onClick={exportCSV} variant="secondary">↓ CSV</Btn>
          <Btn t={t} onClick={triggerPrint} variant="secondary">🖨 Print / PDF</Btn>
        </div>
      </div>

      {/* ── Summary stat cards ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:14, marginBottom:24 }}>
        <StatCard label="Member Contributions" value={fmt(totalContribs)} sub={`${contributions.length} records`} color="#34C759"/>
        <StatCard label="Other Income"          value={fmt(totalIncome)}   sub={`${incomeRows.length} records`}    color="#30D158"/>
        <StatCard label="Total Income"          value={fmt(totalAllIncome)} color={t.accent}/>
        <StatCard label="Total Expenses"        value={fmt(totalExpenses)} sub={`${expenseRows.length} records`}   color="#FF375F"/>
        <StatCard label="Net"                   value={fmt(net)}           color={net>=0?"#34C759":"#FF375F"}/>
        {openingBalance > 0 && <StatCard label="Opening Balance" value={fmt(openingBalance)} color={t.textSub}/>}
      </div>

      {/* ── Payment type breakdown ── */}
      {byPaymentType.length > 0 && (
        <SectionCard title="Member Contributions by Payment Type">
          {byPaymentType.map(pt => (
            <BreakdownRow key={pt.name} label={pt.name} color={pt.color} total={pt.total} count={pt.count} shareOf={totalContribs}/>
          ))}
          <div style={{ borderTop:`1px solid ${t.border}`, paddingTop:10, marginTop:6, display:"flex", justifyContent:"space-between" }}>
            <span style={{ fontSize:12, color:t.textSub, fontWeight:600 }}>Total</span>
            <span style={{ fontSize:14, fontWeight:700, color:t.text }}>{fmt(totalContribs)}</span>
          </div>
        </SectionCard>
      )}

      {/* ── Other income breakdown ── */}
      {Object.keys(byIncomeSource).length > 0 && (
        <SectionCard title="Other Income by Source">
          {Object.entries(byIncomeSource).map(([src, v]) => (
            <BreakdownRow key={src} label={src} total={v.total} count={v.count} shareOf={totalIncome}/>
          ))}
          <div style={{ borderTop:`1px solid ${t.border}`, paddingTop:10, marginTop:6, display:"flex", justifyContent:"space-between" }}>
            <span style={{ fontSize:12, color:t.textSub, fontWeight:600 }}>Total</span>
            <span style={{ fontSize:14, fontWeight:700, color:t.text }}>{fmt(totalIncome)}</span>
          </div>
        </SectionCard>
      )}

      {/* ── Expense category breakdown ── */}
      {byExpenseCategory.length > 0 && (
        <SectionCard title="Expenses by Category">
          {byExpenseCategory.map(cat => (
            <BreakdownRow key={cat.name} label={cat.name} color={cat.color} total={cat.total} count={cat.count} shareOf={totalExpenses}/>
          ))}
          <div style={{ borderTop:`1px solid ${t.border}`, paddingTop:10, marginTop:6, display:"flex", justifyContent:"space-between" }}>
            <span style={{ fontSize:12, color:t.textSub, fontWeight:600 }}>Total</span>
            <span style={{ fontSize:14, fontWeight:700, color:"#FF375F" }}>{fmt(totalExpenses)}</span>
          </div>
        </SectionCard>
      )}

      {/* ── Top contributors ── */}
      {topContributors.length > 0 && (
        <SectionCard title="Top Contributors">
          {topContributors.map((m, ri) => {
            const medal = ri===0 ? { bg:"linear-gradient(135deg,#FFD700,#FFA500)", color:"#7A4F00" }
                        : ri===1 ? { bg:"linear-gradient(135deg,#C0C0C0,#A8A8A8)", color:"#3A3A3A" }
                        : ri===2 ? { bg:"linear-gradient(135deg,#CD7F32,#A0522D)", color:"#fff" }
                        : null;
            return (
              <div key={m.id||m.name} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:`1px solid ${t.border}` }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  {medal
                    ? <span style={{ width:22, height:22, borderRadius:"50%", background:medal.bg, display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:800, color:medal.color, flexShrink:0 }}>{ri+1}</span>
                    : <span style={{ width:22, height:22, borderRadius:"50%", background:t.surfaceAlt, display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:t.textSub, flexShrink:0 }}>{ri+1}</span>
                  }
                  <span style={{ fontSize:13, fontWeight:600, color:t.text }}>{m.name}</span>
                  <span style={{ fontSize:11, color:t.textMuted }}>{m.count} record{m.count!==1?"s":""}</span>
                </div>
                <span style={{ fontSize:14, fontWeight:700, color:"#34C759" }}>{fmt(m.total)}</span>
              </div>
            );
          })}
        </SectionCard>
      )}

      {/* ── Empty state ── */}
      {contributions.length===0 && incomeRows.length===0 && expenseRows.length===0 && (
        <Card t={t}>
          <div style={{ textAlign:"center", padding:"40px 20px", color:t.textSub }}>
            <p style={{ fontSize:32, margin:"0 0 8px" }}>📊</p>
            <p style={{ fontSize:15, fontWeight:600, margin:"0 0 4px", color:t.text }}>No data for this period</p>
            <p style={{ fontSize:13, margin:0 }}>Try adjusting the date range or add some records first.</p>
          </div>
        </Card>
      )}
    </div>
  );
}