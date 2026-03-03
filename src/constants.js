// Shared constants and theme tokens

export const makeFmt = (currency = "USD") => (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);

export const COLORS = ["#0071E3","#34C759","#FF9F0A","#FF375F","#BF5AF2","#5AC8FA","#FF6B35","#00C7BE"];
export const CURRENCIES = ["USD","GHS","GBP","EUR","NGN","KES","ZAR","CAD","AUD"];

export const light = {
  bg: "#F2F2F7", surface: "#FFFFFF", surfaceAlt: "#FAFAFA",
  border: "rgba(0,0,0,0.06)", borderStrong: "rgba(0,0,0,0.1)",
  text: "#1C1C1E", textSub: "#8E8E93", textMuted: "#6E6E73",
  sidebar: "rgba(255,255,255,0.85)", accent: "#0071E3",
  inputBg: "#FAFAFA", heroGrad: "linear-gradient(135deg,#0071E3 0%,#34AADC 100%)",
  shadow: "0 20px 60px rgba(0,0,0,0.08)", cardShadow: "0 2px 12px rgba(0,0,0,0.04)",
  gridLine: "rgba(0,0,0,0.05)",
};

export const dark = {
  bg: "#0F0F12", surface: "#1C1C1E", surfaceAlt: "#2C2C2E",
  border: "rgba(255,255,255,0.08)", borderStrong: "rgba(255,255,255,0.12)",
  text: "#F5F5F7", textSub: "#8E8E93", textMuted: "#636366",
  sidebar: "rgba(28,28,30,0.92)", accent: "#0A84FF",
  inputBg: "#2C2C2E", heroGrad: "linear-gradient(135deg,#0A84FF 0%,#0071E3 100%)",
  shadow: "0 20px 60px rgba(0,0,0,0.4)", cardShadow: "0 2px 12px rgba(0,0,0,0.2)",
  gridLine: "rgba(255,255,255,0.05)",
};

export const fyLabel = (start, format) => format === "split" ? `${start}/${start+1}` : `${start}`;

export function buildMonthly(contributions, expenses) {
  const months = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    months[key] = { label: d.toLocaleString("en-US",{month:"short"}), income:0, expense:0 };
  }
  (contributions||[]).forEach(c=>{const d=new Date(c.created_at);const k=`${d.getFullYear()}-${d.getMonth()}`;if(months[k])months[k].income+=Number(c.amount);});
  (expenses||[]).forEach(e=>{const d=new Date(e.created_at);const k=`${d.getFullYear()}-${d.getMonth()}`;if(months[k])months[k].expense+=Number(e.amount);});
  return Object.values(months);
}

export function buildTimeline(contributions) {
  const months = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    months[key] = { label: d.toLocaleString("en-US",{month:"short"}), value:0 };
  }
  (contributions||[]).forEach(c=>{const d=new Date(c.created_at);const k=`${d.getFullYear()}-${d.getMonth()}`;if(months[k])months[k].value+=Number(c.amount);});
  return Object.values(months);
}