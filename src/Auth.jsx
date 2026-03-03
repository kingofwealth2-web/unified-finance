import { useState } from "react";
import { supabase } from "./lib/supabaseClient";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSignIn(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setLoading(false);
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#F2F2F7",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif",
    }}>
      {/* Background blobs */}
      <div style={{
        position: "fixed", top: -200, right: -200,
        width: 600, height: 600, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(0,113,227,0.08) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "fixed", bottom: -200, left: -200,
        width: 500, height: 500, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(52,199,89,0.06) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <div style={{
        width: "100%", maxWidth: 400,
        background: "rgba(255,255,255,0.85)",
        backdropFilter: "blur(40px)",
        borderRadius: 28,
        border: "1px solid rgba(0,0,0,0.06)",
        padding: "48px 40px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.08)",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 16,
            background: "linear-gradient(135deg, #0071E3, #34AADC)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px",
            boxShadow: "0 8px 24px rgba(0,113,227,0.3)",
          }}>
            <svg width="22" height="22" viewBox="0 0 16 16" fill="none">
              <path d="M2 8h5M9 8h5M8 2v5M8 9v5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.6px", color: "#1C1C1E", margin: "0 0 6px" }}>
            Unified
          </h1>
          <p style={{ fontSize: 14, color: "#8E8E93", margin: 0 }}>Sign in to your account</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSignIn}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: "#1C1C1E", display: "block", marginBottom: 8 }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              style={{
                width: "100%", padding: "12px 16px",
                borderRadius: 12, border: "1px solid rgba(0,0,0,0.1)",
                fontSize: 15, color: "#1C1C1E",
                background: "rgba(255,255,255,0.8)",
                outline: "none", boxSizing: "border-box",
                transition: "border-color 0.15s ease",
              }}
              onFocus={e => e.target.style.borderColor = "#0071E3"}
              onBlur={e => e.target.style.borderColor = "rgba(0,0,0,0.1)"}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: "#1C1C1E", display: "block", marginBottom: 8 }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                width: "100%", padding: "12px 16px",
                borderRadius: 12, border: "1px solid rgba(0,0,0,0.1)",
                fontSize: 15, color: "#1C1C1E",
                background: "rgba(255,255,255,0.8)",
                outline: "none", boxSizing: "border-box",
                transition: "border-color 0.15s ease",
              }}
              onFocus={e => e.target.style.borderColor = "#0071E3"}
              onBlur={e => e.target.style.borderColor = "rgba(0,0,0,0.1)"}
            />
          </div>

          {error && (
            <div style={{
              background: "rgba(255,55,95,0.08)", border: "1px solid rgba(255,55,95,0.2)",
              borderRadius: 10, padding: "10px 14px", marginBottom: 16,
            }}>
              <p style={{ fontSize: 13, color: "#FF375F", margin: 0 }}>{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%", padding: "14px",
              background: loading ? "#8E8E93" : "linear-gradient(135deg, #0071E3, #34AADC)",
              color: "white", border: "none", borderRadius: 12,
              fontSize: 15, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
              boxShadow: loading ? "none" : "0 4px 16px rgba(0,113,227,0.3)",
              transition: "all 0.15s ease",
            }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
