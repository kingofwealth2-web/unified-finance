import { useState, useMemo } from "react";
import { Card, EmptyState } from "../ui/index.jsx";

// ── Entity icons ─────────────────────────────────────────────
const ENTITY_ICONS = {
  contribution: "💳",
  expense:      "📤",
  expense_category: "🗂",
  income:       "💰",
  person:       "👤",
  payment_type: "🏷",
  user:         "🔐",
  org:          "🏛",
};

// ── Human-readable summaries ──────────────────────────────────
function buildSummary(entry) {
  const { action, entity, description, old_value, new_value, member_name } = entry;

  // Contributions
  if (entity === "contribution") {
    if (action === "create") {
      const amt = new_value?.amount;
      const name = member_name || "a member";
      return amt ? `${name} paid ${Number(amt).toLocaleString()}` : description;
    }
    if (action === "edit") {
      const changes = [];
      if (old_value?.amount !== undefined && new_value?.amount !== undefined && String(old_value.amount) !== String(new_value.amount))
        changes.push(`amount changed from ${Number(old_value.amount).toLocaleString()} to ${Number(new_value.amount).toLocaleString()}`);
      if (old_value?.note !== new_value?.note && new_value?.note)
        changes.push(`note updated`);
      return changes.length ? `${member_name || "Contribution"} — ${changes.join(", ")}` : description;
    }
    if (action === "delete") {
      return `${member_name || "Member"}'s contribution of ${Number(old_value?.amount||0).toLocaleString()} removed`;
    }
  }

  // Expenses
  if (entity === "expense") {
    if (action === "create") {
      const amt = new_value?.amount;
      const lbl = new_value?.label || "Expense";
      return `${lbl}${amt ? ` — ${Number(amt).toLocaleString()}` : ""} recorded`;
    }
    if (action === "edit") {
      const changes = [];
      if (old_value?.amount !== undefined && String(old_value.amount) !== String(new_value?.amount))
        changes.push(`amount: ${Number(old_value.amount).toLocaleString()} → ${Number(new_value?.amount||0).toLocaleString()}`);
      if (old_value?.label !== new_value?.label)
        changes.push(`label: "${old_value?.label}" → "${new_value?.label}"`);
      return changes.length ? `Expense updated — ${changes.join(", ")}` : description;
    }
    if (action === "delete") {
      return `"${old_value?.label || "Expense"}" deleted${old_value?.amount ? ` (${Number(old_value.amount).toLocaleString()})` : ""}`;
    }
  }

  // Expense categories
  if (entity === "expense_category") {
    if (action === "create") return `New category "${new_value?.name}" created${new_value?.budget ? ` with budget ${Number(new_value.budget).toLocaleString()}` : ""}`;
    if (action === "edit") {
      const changes = [];
      if (old_value?.name !== new_value?.name) changes.push(`name: "${old_value?.name}" → "${new_value?.name}"`);
      if (String(old_value?.budget) !== String(new_value?.budget)) changes.push(`budget: ${Number(old_value?.budget||0).toLocaleString()} → ${Number(new_value?.budget||0).toLocaleString()}`);
      return changes.length ? `Category updated — ${changes.join(", ")}` : description;
    }
    if (action === "delete") return `Category "${old_value?.name || "Unknown"}" and all its expenses deleted`;
  }

  // Income
  if (entity === "income") {
    if (action === "create") return `${new_value?.label || "Income"} recorded — ${Number(new_value?.amount||0).toLocaleString()}`;
    if (action === "edit") return `${new_value?.label || "Income"} updated to ${Number(new_value?.amount||0).toLocaleString()}`;
    if (action === "delete") return `Income "${old_value?.label || "entry"}" (${Number(old_value?.amount||0).toLocaleString()}) removed`;
  }

  // People
  if (entity === "person") {
    if (action === "create") return `${new_value?.full_name || member_name || "New member"} added as ${new_value?.status || "active"} member`;
    if (action === "edit") {
      const changes = [];
      if (old_value?.full_name !== new_value?.full_name) changes.push(`name: "${old_value?.full_name}" → "${new_value?.full_name}"`);
      if (old_value?.status !== new_value?.status) changes.push(`status: ${old_value?.status} → ${new_value?.status}`);
      return changes.length ? `${member_name || "Member"} — ${changes.join(", ")}` : description;
    }
    if (action === "delete") return `${old_value?.full_name || member_name || "Member"} removed from the system`;
  }

  // Payment types
  if (entity === "payment_type") {
    if (action === "create") return `Payment type "${new_value?.name}" created${new_value?.goal ? ` with goal ${Number(new_value.goal).toLocaleString()}` : ""}`;
    if (action === "edit") {
      const changes = [];
      if (old_value?.name !== new_value?.name) changes.push(`"${old_value?.name}" → "${new_value?.name}"`);
      if (String(old_value?.goal) !== String(new_value?.goal)) changes.push(`goal updated`);
      return changes.length ? `Payment type updated — ${changes.join(", ")}` : description;
    }
    if (action === "delete") return `Payment type "${old_value?.name || "Unknown"}" deleted`;
  }

  // Users
  if (entity === "user") {
    if (action === "create") return `New user ${new_value?.email || member_name} added as ${new_value?.role || "admin"}`;
    if (action === "delete") return `User ${member_name} removed from the system`;
  }

  // Org
  if (entity === "org") {
    if (description?.includes("Started new financial year")) return description;
    if (action === "edit") return `Organisation settings updated`;
  }

  return description || "Action performed";
}

// ── Main component ────────────────────────────────────────────
export function AuditTab({ auditLog, t }) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo,   setDateTo]   = useState("");
  const [filterAction, setFilterAction] = useState("all");
  const [filterEntity, setFilterEntity] = useState("all");

  const iStyle = { padding:"8px 12px", borderRadius:9, border:`1px solid ${t.border}`, background:t.inputBg||t.surfaceAlt, color:t.text, fontSize:12, outline:"none", fontFamily:"inherit", cursor:"pointer" };

  const filtered = useMemo(() => {
    return (auditLog||[]).filter(e => {
      if (filterAction !== "all" && e.action !== filterAction) return false;
      if (filterEntity !== "all" && e.entity !== filterEntity) return false;
      if (dateFrom) { const d = new Date(e.created_at); if (d < new Date(dateFrom)) return false; }
      if (dateTo)   { const d = new Date(e.created_at); if (d > new Date(dateTo + "T23:59:59")) return false; }
      return true;
    });
  }, [auditLog, filterAction, filterEntity, dateFrom, dateTo]);

  const ACTION_COLOR = { create:"#34C759", edit:"#FF9F0A", delete:"#FF375F" };
  const ACTION_LABEL = { create:"Created", edit:"Edited", delete:"Deleted" };
  const ACTION_BG    = { create:"rgba(52,199,89,0.1)", edit:"rgba(255,159,10,0.1)", delete:"rgba(255,55,95,0.1)" };

  const entities = [...new Set((auditLog||[]).map(e=>e.entity))].filter(Boolean);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>

      {/* ── Filters ── */}
      <div style={{ background:t.surface, borderRadius:20, padding:"20px 24px", border:`1px solid ${t.border}`, boxShadow:t.cardShadow, display:"flex", flexWrap:"wrap", gap:12, alignItems:"flex-end" }}>
        <div>
          <p style={{ fontSize:10, fontWeight:700, color:t.textSub, textTransform:"uppercase", letterSpacing:"0.06em", margin:"0 0 6px" }}>From</p>
          <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={iStyle}/>
        </div>
        <div>
          <p style={{ fontSize:10, fontWeight:700, color:t.textSub, textTransform:"uppercase", letterSpacing:"0.06em", margin:"0 0 6px" }}>To</p>
          <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} style={iStyle}/>
        </div>
        <div>
          <p style={{ fontSize:10, fontWeight:700, color:t.textSub, textTransform:"uppercase", letterSpacing:"0.06em", margin:"0 0 6px" }}>Action</p>
          <select value={filterAction} onChange={e=>setFilterAction(e.target.value)} style={iStyle}>
            <option value="all">All Actions</option>
            <option value="create">Created</option>
            <option value="edit">Edited</option>
            <option value="delete">Deleted</option>
          </select>
        </div>
        <div>
          <p style={{ fontSize:10, fontWeight:700, color:t.textSub, textTransform:"uppercase", letterSpacing:"0.06em", margin:"0 0 6px" }}>Type</p>
          <select value={filterEntity} onChange={e=>setFilterEntity(e.target.value)} style={iStyle}>
            <option value="all">All Types</option>
            {entities.map(en=><option key={en} value={en}>{en.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase())}</option>)}
          </select>
        </div>
        {(dateFrom||dateTo||filterAction!=="all"||filterEntity!=="all") && (
          <button onClick={()=>{ setDateFrom(""); setDateTo(""); setFilterAction("all"); setFilterEntity("all"); }} style={{ padding:"8px 14px", borderRadius:9, border:`1px solid ${t.border}`, background:"none", color:t.textSub, fontSize:12, cursor:"pointer", fontWeight:500, alignSelf:"flex-end" }}>
            Clear filters ✕
          </button>
        )}
        <div style={{ marginLeft:"auto", alignSelf:"flex-end" }}>
          <span style={{ fontSize:12, color:t.textSub }}>{filtered.length} {filtered.length===1?"entry":"entries"}</span>
        </div>
      </div>

      {/* ── Log entries ── */}
      {filtered.length === 0
        ? <Card t={t}><EmptyState message="No audit entries match your filters." t={t}/></Card>
        : (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {filtered.map((entry, i) => {
              const ac  = ACTION_COLOR[entry.action] || "#8E8E93";
              const al  = ACTION_LABEL[entry.action] || entry.action;
              const abg = ACTION_BG[entry.action]    || "rgba(142,142,147,0.1)";
              const icon = ENTITY_ICONS[entry.entity] || "📋";
              const summary = buildSummary(entry);
              const ts = new Date(entry.created_at);
              const dateStr = ts.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
              const timeStr = ts.toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"});

              return (
                <div key={entry.id} style={{ background:t.surface, borderRadius:16, border:`1px solid ${t.border}`, overflow:"hidden", boxShadow:t.cardShadow, animation:`slideIn 0.25s ease ${Math.min(i,12)*0.03}s both` }}>
                  {/* Colour accent strip */}
                  <div style={{ height:3, background:`linear-gradient(90deg, ${ac}, ${ac}44)` }}/>
                  <div style={{ padding:"16px 20px", display:"flex", alignItems:"flex-start", gap:14 }}>

                    {/* Entity icon */}
                    <div style={{ width:40, height:40, borderRadius:12, background:abg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>
                      {icon}
                    </div>

                    {/* Content */}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4, flexWrap:"wrap" }}>
                        <span style={{ fontSize:10, fontWeight:700, padding:"3px 9px", borderRadius:20, background:abg, color:ac, letterSpacing:"0.04em", textTransform:"uppercase", flexShrink:0 }}>{al}</span>
                        <span style={{ fontSize:11, fontWeight:600, color:t.textSub, textTransform:"capitalize" }}>{entry.entity?.replace(/_/g," ")}</span>
                      </div>
                      <p style={{ fontSize:14, fontWeight:600, margin:"0 0 4px", color:t.text, lineHeight:1.4 }}>{summary}</p>
                      <p style={{ fontSize:11, color:t.textSub, margin:0 }}>
                        by <span style={{ fontWeight:600, color:t.text }}>{entry.performed_by_email||"unknown"}</span>
                      </p>
                    </div>

                    {/* Timestamp */}
                    <div style={{ flexShrink:0, textAlign:"right" }}>
                      <p style={{ fontSize:12, fontWeight:600, color:t.text, margin:"0 0 2px" }}>{dateStr}</p>
                      <p style={{ fontSize:11, color:t.textSub, margin:0 }}>{timeStr}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      }
    </div>
  );
}
