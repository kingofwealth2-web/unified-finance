import { Card, EmptyState } from "../ui/index.jsx";

export function AuditTab({ auditLog, t }) {
  return (
    <Card t={t}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
        <div>
          <h3 style={{ fontSize:15, fontWeight:700, margin:0, color:t.text }}>Audit Log</h3>
          <p style={{ fontSize:12, color:t.textSub, margin:"4px 0 0" }}>Every create, edit and delete — who did it and when</p>
        </div>
      </div>
      {auditLog.length===0 ? <EmptyState message="No audit entries yet." t={t}/> :
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {auditLog.map((entry, i) => {
            const ac = entry.action==="create" ? "#34C759" : entry.action==="edit" ? "#FF9F0A" : "#FF375F";
            const al = entry.action==="create" ? "Created" : entry.action==="edit" ? "Edited" : "Deleted";
            return (
              <div key={entry.id} style={{ padding:"14px 16px", background:t.surfaceAlt, borderRadius:12, border:`1px solid ${t.border}`, animation:`slideIn 0.25s ease ${Math.min(i,10)*0.03}s both` }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12 }}>
                  <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
                    <span style={{ fontSize:10, fontWeight:700, padding:"3px 8px", borderRadius:6, background:`${ac}18`, color:ac, flexShrink:0, marginTop:1 }}>{al}</span>
                    <div>
                      <p style={{ fontSize:13, fontWeight:600, margin:0, color:t.text }}>{entry.description}</p>
                      <p style={{ fontSize:11, color:t.textSub, margin:"3px 0 0" }}>by {entry.performed_by_email||"unknown"}</p>
                      {entry.old_value && entry.new_value && (
                        <p style={{ fontSize:11, color:t.textMuted, margin:"3px 0 0" }}>
                          {Object.keys(entry.new_value).filter(k=>String(entry.old_value[k])!==String(entry.new_value[k])).map(k=>`${k}: ${entry.old_value[k]} → ${entry.new_value[k]}`).join(" · ")}
                        </p>
                      )}
                    </div>
                  </div>
                  <p style={{ fontSize:11, color:t.textSub, margin:0, flexShrink:0, whiteSpace:"nowrap" }}>
                    {new Date(entry.created_at).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}
                    {" · "}
                    {new Date(entry.created_at).toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"})}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      }
    </Card>
  );
}
