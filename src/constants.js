// Shared constants and theme tokens

export const makeFmt = (currency = "USD") => (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);

export const COLORS = ["#0071E3","#34C759","#FF9F0A","#FF375F","#BF5AF2","#5AC8FA","#FF6B35","#00C7BE"];
export const CURRENCIES = ["USD","GHS","GBP","EUR","NGN","KES","ZAR","CAD","AUD"];

export const light = {
  // Layout
  bg: "#F4F5F7",
  surface: "#FFFFFF",
  surfaceAlt: "#EEF0F3",
  // Borders
  border: "rgba(0,0,0,0.07)",
  borderStrong: "rgba(0,0,0,0.13)",
  // Typography
  text: "#111827",
  textSub: "#6B7280",
  textMuted: "#9CA3AF",
  // UI
  sidebar: "rgba(248,249,251,0.94)",
  accent: "#2563EB",
  inputBg: "#FFFFFF",
  heroGrad: "linear-gradient(135deg,#2563EB 0%,#1D4ED8 100%)",
  shadow: "0 4px 24px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04)",
  cardShadow: "0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)",
  gridLine: "rgba(0,0,0,0.06)",
  // Semantic — deliberately muted for readability on white
  positive: "#16A34A",
  negative: "#DC2626",
  warning: "#D97706",
  positiveBg: "rgba(22,163,74,0.09)",
  negativeBg: "rgba(220,38,38,0.09)",
  warningBg: "rgba(217,119,6,0.09)",
};

export const dark = {
  // Layout
  bg: "#0F0F12",
  surface: "#1C1C1E",
  surfaceAlt: "#2C2C2E",
  // Borders
  border: "rgba(255,255,255,0.08)",
  borderStrong: "rgba(255,255,255,0.12)",
  // Typography
  text: "#F5F5F7",
  textSub: "#8E8E93",
  textMuted: "#636366",
  // UI
  sidebar: "rgba(28,28,30,0.92)",
  accent: "#0A84FF",
  inputBg: "#2C2C2E",
  heroGrad: "linear-gradient(135deg,#0A84FF 0%,#0071E3 100%)",
  shadow: "0 20px 60px rgba(0,0,0,0.4)",
  cardShadow: "0 2px 12px rgba(0,0,0,0.2)",
  gridLine: "rgba(255,255,255,0.05)",
  // Semantic — vibrant on dark backgrounds
  positive: "#34C759",
  negative: "#FF375F",
  warning: "#FF9F0A",
  positiveBg: "rgba(52,199,89,0.12)",
  negativeBg: "rgba(255,55,95,0.12)",
  warningBg: "rgba(255,159,10,0.12)",
};

export const fyLabel = (start, format) => format === "split" ? `${start}/${start+1}` : `${start}`;

export function buildMonthly(contributions, expenses, income) {
  const months = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    months[key] = { label: d.toLocaleString("en-US",{month:"short"}), income:0, expense:0 };
  }
  (contributions||[]).forEach(c=>{const d=new Date(c.created_at);const k=`${d.getFullYear()}-${d.getMonth()}`;if(months[k])months[k].income+=Number(c.amount);});
  (expenses||[]).forEach(e=>{const d=new Date(e.created_at);const k=`${d.getFullYear()}-${d.getMonth()}`;if(months[k])months[k].expense+=Number(e.amount);});
  (income||[]).forEach(i=>{const d=new Date(i.created_at);const k=`${d.getFullYear()}-${d.getMonth()}`;if(months[k])months[k].income+=Number(i.amount);});
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