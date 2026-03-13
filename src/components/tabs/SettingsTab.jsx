import { useState } from "react";
import { supabase } from "../../lib/supabaseClient.js";
import { Card, Btn, Avatar, EmptyState } from "../ui/index.jsx";
import { fyLabel } from "../../constants.js";

export function SettingsTab({ data, t, fmt, isSuperAdmin, openModal, orgName, session,
  setEditingPaymentType, handleDeletePaymentType,
  setEditingExpenseCategory, handleDeleteExpenseCategory,
  handleDeleteUser, onStartNewYear, toast }) {

  const [notifMemberId, setNotifMemberId] = useState("");
  const [notifTitle, setNotifTitle]       = useState("");
  const [notifMsg, setNotifMsg]           = useState("");
  const [notifLoading, setNotifLoading]   = useState(false);
  const [reminderLoading, setReminderLoading] = useState(false);
  const [sentNotifs, setSentNotifs]       = useState([]);
  const [sentLoading, setSentLoading]     = useState(false);
  const [historyOpen, setHistoryOpen]     = useState(false);

  const members = (data.allPeople || []).filter(p => p.role === "member" && p.status === "active");

  // Members with zero contributions this FY
  const currentFY = data.org?.financial_year_start;
  const unpaidMembers = members.filter(m => {
    const hasPaid = (data.contributions || []).some(c => c.member_id === m.id && c.financial_year === currentFY);
    return !hasPaid;
  });

  async function sendNotification(memberId, type, title, message) {
    const { error } = await supabase.from("notifications").insert({
      org_id: data.org?.id,
      member_id: memberId,
      type,
      title,
      message,
      created_by: session?.user?.id,
    });
    if (error) throw error;
  }

  async function fetchSentNotifs() {
    setSentLoading(true);
    const { data: rows } = await supabase
      .from("notifications")
      .select("*, profiles!notifications_member_id_fkey(full_name)")
      .eq("org_id", data.org?.id)
      .order("created_at", { ascending: false })
      .limit(100);
    setSentNotifs(rows || []);
    setSentLoading(false);
  }

  async function handleDeleteNotif(id) {
    await supabase.from("notifications").delete().eq("id", id);
    setSentNotifs(prev => prev.filter(n => n.id !== id));
    toast("Notification deleted");
  }

  async function handleSendCustom(e) {
    e.preventDefault();
    if (!notifMemberId || !notifTitle || !notifMsg) return;
    setNotifLoading(true);
    try {
      await sendNotification(notifMemberId, "message", notifTitle, notifMsg);
      toast("Message sent");
      setNotifMemberId(""); setNotifTitle(""); setNotifMsg("");
    } catch(err) { toast("Failed: " + err.message); }
    finally { setNotifLoading(false); }
  }

  async function handleSendReminder(memberId, memberName) {
    setReminderLoading(true);
    try {
      await sendNotification(memberId, "reminder",
        "Payment Reminder",
        `Hi ${memberName.split(" ")[0]}, this is a reminder that you have an outstanding payment for the current financial year. Please make your contribution at your earliest convenience.`
      );
      toast("Reminder sent to " + memberName);
    } catch(err) { toast("Failed: " + err.message); }
    finally { setReminderLoading(false); }
  }

  async function handleSendAllReminders() {
    setReminderLoading(true);
    try {
      await Promise.all(unpaidMembers.map(m =>
        sendNotification(m.id, "reminder",
          "Payment Reminder",
          `Hi ${m.full_name.split(" ")[0]}, this is a reminder that you have an outstanding payment for the current financial year. Please make your contribution at your earliest convenience.`
        )
      ));
      toast(`Reminders sent to ${unpaidMembers.length} member${unpaidMembers.length !== 1 ? "s" : ""}`);
    } catch(err) { toast("Failed: " + err.message); }
    finally { setReminderLoading(false); }
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:24 }}>

      {isSuperAdmin && (
        <Card t={t} style={{ animation:"slideUp 0.3s ease", border:`1px solid ${t.accent}30`, background:`${t.accent}06` }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <h3 style={{ fontSize:15, fontWeight:700, margin:0, color:t.text }}>Financial Year</h3>
              <p style={{ fontSize:13, color:t.textSub, margin:"4px 0 0" }}>
                Currently in <strong style={{ color:t.accent }}>{data.org ? fyLabel(data.org.financial_year_start, data.org.financial_year_format) : "—"}</strong> · Closing balance will become next year's opening balance
              </p>
            </div>
            <Btn t={t} onClick={onStartNewYear} variant="secondary">Start New Year →</Btn>
          </div>
        </Card>
      )}

      <Card t={t} style={{ animation:"slideUp 0.3s ease" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
          <div>
            <h3 style={{ fontSize:15, fontWeight:700, margin:0, color:t.text }}>Organisation</h3>
            <p style={{ fontSize:13, color:t.textSub, margin:"4px 0 0" }}>Your organisation's profile and preferences</p>
          </div>
          <Btn t={t} onClick={()=>openModal("editOrg")}>Edit</Btn>
        </div>
        {data.org && (
          <div className="grid-2" style={{ gap:20 }}>
            {[
              { label:"Name",           value:data.org.name },
              { label:"Currency",       value:data.org.currency },
              { label:"Opening Balance",value:fmt(data.org.opening_balance||0) },
              { label:"Contact Email",  value:data.org.contact_email  || "—" },
              { label:"Contact Phone",  value:data.org.contact_phone  || "—" },
              { label:"Address",        value:data.org.address        || "—" },
              { label:"Financial Year", value:fyLabel(data.org.financial_year_start, data.org.financial_year_format) },
            ].map(({ label, value }) => (
              <div key={label}>
                <p style={{ fontSize:11, fontWeight:600, color:t.textSub, textTransform:"uppercase", letterSpacing:"0.06em", margin:"0 0 4px" }}>{label}</p>
                <p style={{ fontSize:14, fontWeight:500, color:t.text, margin:0 }}>{value}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card t={t} style={{ animation:"slideUp 0.3s ease 0.05s both" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
          <div>
            <h3 style={{ fontSize:15, fontWeight:700, margin:0, color:t.text }}>System Users</h3>
            <p style={{ fontSize:13, color:t.textSub, margin:"4px 0 0" }}>People who can log into {orgName}</p>
          </div>
          {isSuperAdmin && <Btn t={t} onClick={()=>openModal("addUser")}>+ Add User</Btn>}
        </div>
        <div>
          {(data.users||[]).map((user, i) => (
            <div key={user.id} className="row-hover" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 8px", borderRadius:12, animation:`slideIn 0.3s ease ${i*0.05}s both` }}>
              <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                <Avatar name={user.full_name||user.email} size={40}/>
                <div>
                  <p style={{ fontSize:14, fontWeight:600, margin:0, color:t.text }}>{user.full_name||"—"}</p>
                  <p style={{ fontSize:12, color:t.textSub, margin:0 }}>{user.email}</p>
                </div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ fontSize:11, fontWeight:700, padding:"4px 10px", borderRadius:20, textTransform:"uppercase", letterSpacing:"0.04em",
                  background: user.role==="super_admin" ? `${t.accent}18` : user.role==="member" ? "rgba(167,139,250,0.12)" : "rgba(52,199,89,0.1)",
                  color:      user.role==="super_admin" ? t.accent            : user.role==="member" ? "#A78BFA"                 : "#34C759" }}>
                  {user.role==="super_admin" ? "Super Admin" : user.role==="member" ? "Member" : "Admin"}
                </span>
                {user.id===session?.user?.id && <span style={{ fontSize:11, color:t.textSub, fontStyle:"italic" }}>You</span>}
                {isSuperAdmin && user.id!==session?.user?.id && user.role!=="super_admin" && (
                  <Btn size="sm" variant="danger" t={t} onClick={()=>handleDeleteUser(user.id, user.full_name||user.email)}>Delete</Btn>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card t={t} style={{ animation:"slideUp 0.3s ease 0.1s both" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
          <div>
            <h3 style={{ fontSize:15, fontWeight:700, margin:0, color:t.text }}>Payment Types</h3>
            <p style={{ fontSize:13, color:t.textSub, margin:"4px 0 0" }}>Categories people can contribute towards</p>
          </div>
          {isSuperAdmin && <Btn t={t} onClick={()=>openModal("addPaymentType")}>+ New Type</Btn>}
        </div>
        {data.paymentTypes.length===0 ? <EmptyState message="No payment types yet." t={t}/> :
          <div>
            {data.paymentTypes.map((pt, i) => (
              <div key={pt.id} className="row-hover" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 8px", borderRadius:12, animation:`slideIn 0.3s ease ${i*0.05}s both` }}>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ width:10, height:10, borderRadius:3, background:pt.color, flexShrink:0, boxShadow:`0 0 6px ${pt.color}66` }}/>
                  <div>
                    <p style={{ fontSize:14, fontWeight:600, margin:0, color:t.text }}>{pt.name}</p>
                    {pt.description && <p style={{ fontSize:12, color:t.textSub, margin:0 }}>{pt.description}</p>}
                  </div>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ textAlign:"right", marginRight:4 }}>
                    <p style={{ fontSize:14, fontWeight:600, margin:0, color:t.text }}>{fmt(pt.total)}</p>
                    {pt.goal>0 && <p style={{ fontSize:11, color:t.textSub, margin:0 }}>Goal: {fmt(pt.goal)}</p>}
                  </div>
                  {isSuperAdmin && <Btn size="sm" variant="secondary" t={t} onClick={()=>{ setEditingPaymentType({...pt,goal:pt.goal||""}); openModal("editPaymentType"); }}>Edit</Btn>}
                  {isSuperAdmin && <Btn size="sm" variant="danger" t={t} onClick={()=>handleDeletePaymentType(pt.id)}>Delete</Btn>}
                </div>
              </div>
            ))}
          </div>
        }
      </Card>

      <Card t={t} style={{ animation:"slideUp 0.3s ease 0.15s both" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
          <div>
            <h3 style={{ fontSize:15, fontWeight:700, margin:0, color:t.text }}>Expense Categories</h3>
            <p style={{ fontSize:13, color:t.textSub, margin:"4px 0 0" }}>Categories for tracking organisational spending</p>
          </div>
          {isSuperAdmin && <Btn t={t} onClick={()=>openModal("addExpenseCategory")}>+ New Category</Btn>}
        </div>
        {data.expenses.length===0 ? <EmptyState message="No expense categories yet." t={t}/> :
          <div>
            {data.expenses.map((exp, i) => {
              const pct = exp.budget>0 ? Math.round((exp.amount/exp.budget)*100) : 0;
              return (
                <div key={exp.id} className="row-hover" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 8px", borderRadius:12, animation:`slideIn 0.3s ease ${i*0.05}s both` }}>
                  <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                    <div style={{ width:10, height:10, borderRadius:3, background:exp.color, flexShrink:0, boxShadow:`0 0 6px ${exp.color}66` }}/>
                    <div>
                      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                        <p style={{ fontSize:14, fontWeight:600, margin:0, color:t.text }}>{exp.label}</p>
                        {exp.budget>0 && pct>=100 && <span style={{ fontSize:10, fontWeight:700, padding:"2px 6px", borderRadius:5, background:"rgba(255,55,95,0.12)", color:"#FF375F" }}>OVER BUDGET</span>}
                        {exp.budget>0 && pct>=80 && pct<100 && <span style={{ fontSize:10, fontWeight:700, padding:"2px 6px", borderRadius:5, background:"rgba(255,159,10,0.12)", color:"#FF9F0A" }}>WARNING</span>}
                      </div>
                      {exp.description && <p style={{ fontSize:12, color:t.textSub, margin:0 }}>{exp.description}</p>}
                    </div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ textAlign:"right", marginRight:4 }}>
                      <p style={{ fontSize:14, fontWeight:600, margin:0, color:t.text }}>{fmt(exp.amount)} spent</p>
                      {exp.budget>0 && <p style={{ fontSize:11, color:t.textSub, margin:0 }}>Budget: {fmt(exp.budget)}</p>}
                    </div>
                    {isSuperAdmin && <Btn size="sm" variant="secondary" t={t} onClick={()=>{ setEditingExpenseCategory({...exp,budget:exp.budget||"",name:exp.label}); openModal("editExpenseCategory"); }}>Edit</Btn>}
                    {isSuperAdmin && <Btn size="sm" variant="danger" t={t} onClick={()=>handleDeleteExpenseCategory(exp.id)}>Delete</Btn>}
                  </div>
                </div>
              );
            })}
          </div>
        }
      </Card>


      {/* ── Notifications ── */}
      {isSuperAdmin && (
        <Card t={t} style={{ animation:"slideUp 0.3s ease" }}>
          <h3 style={{ fontSize:15, fontWeight:700, margin:"0 0 4px", color:t.text }}>Notifications</h3>
          <p style={{ fontSize:13, color:t.textSub, margin:"0 0 20px" }}>Send in-app messages to members</p>

          {/* Payment reminders */}
          <div style={{ marginBottom:24, paddingBottom:24, borderBottom:`1px solid ${t.border}` }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <div>
                <p style={{ fontSize:13, fontWeight:600, color:t.text, margin:0 }}>Payment Reminders</p>
                <p style={{ fontSize:12, color:t.textSub, margin:"2px 0 0" }}>
                  {unpaidMembers.length === 0 ? "All members have paid this year 🎉" : `${unpaidMembers.length} member${unpaidMembers.length !== 1 ? "s" : ""} yet to contribute this year`}
                </p>
              </div>
              {unpaidMembers.length > 0 && (
                <Btn t={t} size="sm" onClick={handleSendAllReminders} disabled={reminderLoading}>
                  {reminderLoading ? "Sending…" : `Remind All (${unpaidMembers.length})`}
                </Btn>
              )}
            </div>
            {unpaidMembers.length > 0 && (
              <div style={{ display:"flex", flexDirection:"column", gap:8, maxHeight:220, overflowY:"auto" }}>
                {unpaidMembers.map(m => (
                  <div key={m.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px", background:`${t.border}`, borderRadius:10 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <Avatar name={m.full_name} size={30} t={t}/>
                      <span style={{ fontSize:13, fontWeight:500, color:t.text }}>{m.full_name}</span>
                    </div>
                    <Btn t={t} size="sm" variant="secondary" onClick={() => handleSendReminder(m.id, m.full_name)} disabled={reminderLoading}>
                      Send Reminder
                    </Btn>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Custom message */}
          <p style={{ fontSize:13, fontWeight:600, color:t.text, margin:"0 0 12px" }}>Custom Message</p>
          <form onSubmit={handleSendCustom} style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <select value={notifMemberId} onChange={e => setNotifMemberId(e.target.value)} required
              style={{ padding:"10px 12px", borderRadius:10, border:`1px solid ${t.border}`, background:t.inputBg||t.surface, color:notifMemberId ? t.text : t.textSub, fontSize:13, fontFamily:"inherit", outline:"none" }}>
              <option value="">Select member…</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
            </select>
            <input value={notifTitle} onChange={e => setNotifTitle(e.target.value)} placeholder="Title" required
              style={{ padding:"10px 12px", borderRadius:10, border:`1px solid ${t.border}`, background:t.inputBg||t.surface, color:t.text, fontSize:13, fontFamily:"inherit", outline:"none" }}/>
            <textarea value={notifMsg} onChange={e => setNotifMsg(e.target.value)} placeholder="Message…" required rows={3}
              style={{ padding:"10px 12px", borderRadius:10, border:`1px solid ${t.border}`, background:t.inputBg||t.surface, color:t.text, fontSize:13, fontFamily:"inherit", outline:"none", resize:"vertical" }}/>
            <div style={{ display:"flex", justifyContent:"flex-end" }}>
              <Btn t={t} type="submit" disabled={notifLoading}>{notifLoading ? "Sending…" : "Send Message"}</Btn>
            </div>
          </form>

          {/* ── Notification History ── */}
          <div style={{ marginTop:24, paddingTop:24, borderTop:`1px solid ${t.border}` }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <p style={{ fontSize:13, fontWeight:600, color:t.text, margin:0 }}>Sent History</p>
              <Btn t={t} size="sm" variant="secondary" onClick={() => { setHistoryOpen(o=>!o); if (!historyOpen) fetchSentNotifs(); }}>
                {historyOpen ? "Hide" : "Show"}
              </Btn>
            </div>
            {historyOpen && (
              sentLoading ? (
                <p style={{ fontSize:13, color:t.textSub }}>Loading…</p>
              ) : sentNotifs.length === 0 ? (
                <p style={{ fontSize:13, color:t.textSub }}>No notifications sent yet.</p>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:8, maxHeight:320, overflowY:"auto" }}>
                  {sentNotifs.map(n => (
                    <div key={n.id} style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"11px 14px", background:`${t.border}`, borderRadius:10 }}>
                      <span style={{ fontSize:16, flexShrink:0, marginTop:1 }}>{n.type==="reminder"?"⏰":"💬"}</span>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
                          <div>
                            <span style={{ fontSize:13, fontWeight:700, color:t.text }}>{n.title}</span>
                            <span style={{ fontSize:11, color:t.textSub, marginLeft:8 }}>→ {n.profiles?.full_name || "Unknown"}</span>
                          </div>
                          <span style={{ fontSize:10, color:t.textSub, flexShrink:0 }}>{new Date(n.created_at).toLocaleDateString("en-US",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}</span>
                        </div>
                        <p style={{ fontSize:12, color:t.textSub, margin:"3px 0 0", lineHeight:1.5 }}>{n.body}</p>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:6 }}>
                          <span style={{ fontSize:10, fontWeight:600, padding:"2px 8px", borderRadius:20, background:n.is_read?"rgba(52,199,89,0.1)":"rgba(255,159,10,0.1)", color:n.is_read?"#34C759":"#FF9F0A" }}>
                            {n.is_read ? "Read" : "Unread"}
                          </span>
                          <button onClick={() => handleDeleteNotif(n.id)}
                            style={{ fontSize:11, color:t.negative, background:"none", border:"none", cursor:"pointer", fontFamily:"inherit", fontWeight:600, padding:0 }}>
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </Card>
      )}

    </div>
  );
}