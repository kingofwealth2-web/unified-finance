import { Card, ChartCard, Btn, EmptyState } from "../ui/index.jsx";
import { DonutChart } from "../Charts.jsx";

export function IncomeTab({
  data, t, fmt, isSuperAdmin, openModal,
  setEditingIncomeSource, handleDeleteIncomeSource,
}) {
  // Group by source for donut chart
  const bySource = (data.rawIncome||[]).reduce((acc, item) => {
    const key = item.source || "Other";
    acc[key] = (acc[key]||0) + Number(item.amount);
    return acc;
  }, {});
  const COLORS = ["#0071E3","#34C759","#FF9F0A","#FF375F","#BF5AF2","#00C7BE","#FFD60A","#30D158"];
  const chartData = Object.entries(bySource).map(([name, value], i) => ({
    name, value, color: COLORS[i % COLORS.length],
  }));
  const total = (data.rawIncome||[]).reduce((s,i)=>s+Number(i.amount),0);

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div>
          <p style={{ fontSize:11, color:t.textSub, margin:0, textTransform:"uppercase", letterSpacing:"0.06em", fontWeight:600 }}>Total Non-Member Income</p>
          <p style={{ fontSize:28, fontWeight:700, margin:"2px 0 0", color:t.accent, letterSpacing:"-1px" }}>{fmt(total)}</p>
        </div>
        <Btn t={t} onClick={()=>openModal("addIncome")}>+ Record Income</Btn>
      </div>

      {chartData.length > 0 && (
        <ChartCard title="Income Breakdown" subtitle="Distribution by source" t={t} style={{ marginBottom:20, animation:"slideUp 0.3s ease" }}>
          <DonutChart data={chartData} fmt={fmt} t={t} size={200}/>
        </ChartCard>
      )}

      {(data.rawIncome||[]).length === 0
        ? <Card t={t}><EmptyState message="No income sources recorded yet." action={<Btn t={t} onClick={()=>openModal("addIncome")}>Record First Income</Btn>} t={t}/></Card>
        : <Card t={t} style={{ animation:"slideUp 0.3s ease 0.08s both" }}>
            <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
              {(data.rawIncome||[]).map((item, i) => (
                <div key={item.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 16px", borderRadius:12, background:i%2===0?t.surfaceAlt:"transparent", animation:`slideIn 0.3s ease ${i*0.03}s both`, flexWrap:"wrap", gap:10 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:12, flex:1, minWidth:0 }}>
                    <div style={{ width:36, height:36, borderRadius:10, background:`${COLORS[(Object.keys(bySource).indexOf(item.source||"Other")) % COLORS.length]}18`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <div style={{ width:10, height:10, borderRadius:"50%", background:COLORS[(Object.keys(bySource).indexOf(item.source||"Other")) % COLORS.length] }}/>
                    </div>
                    <div style={{ minWidth:0 }}>
                      <p style={{ fontSize:14, fontWeight:600, margin:0, color:t.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.label}</p>
                      <p style={{ fontSize:11, color:t.textSub, margin:"2px 0 0" }}>
                        {item.source||"Other"}{item.note ? ` · ${item.note}` : ""} · {new Date(item.created_at).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}
                      </p>
                    </div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
                    <p style={{ fontSize:15, fontWeight:700, margin:0, color:"#34C759" }}>{fmt(item.amount)}</p>
                    {isSuperAdmin && (
                      <div style={{ display:"flex", gap:6 }}>
                        <Btn size="sm" variant="secondary" t={t} onClick={()=>{ setEditingIncomeSource({ id:item.id, label:item.label, amount:item.amount, source:item.source||"", note:item.note||"", date:item.created_at?new Date(item.created_at).toISOString().slice(0,10):new Date().toISOString().slice(0,10) }); openModal("editIncome"); }}>Edit</Btn>
                        <Btn size="sm" variant="danger" t={t} onClick={()=>handleDeleteIncomeSource(item.id)}>Delete</Btn>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
      }
    </div>
  );
}
