import { useState, useEffect } from "react";
import { supabase } from "./lib/supabaseClient";

const features = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="3"/><path d="M2 10h20"/><path d="M7 15h2M12 15h5"/>
      </svg>
    ),
    title: "Contribution Tracking",
    desc: "Record and monitor member payments across multiple categories in real time.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>
    ),
    title: "Expense Management",
    desc: "Set budgets per category, track spend, and get alerted before you overshoot.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><path d="M2 20h20"/>
      </svg>
    ),
    title: "Live Analytics",
    desc: "Beautiful charts showing income vs expenses, trends, and top contributors.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    ),
    title: "Audit & Reports",
    desc: "Full audit trail of every transaction. Export filtered reports as CSV.",
  },
];

export default function Auth({ isPasswordRecovery = false, onPasswordReset = () => {}, onGoHome = null, isForceReset = false, onForceResetComplete = () => {} }) {
  // ── view: "login" | "signup" | "forgot" | "reset" | "invite" | "force_reset"
  const [view, setView] = useState(isPasswordRecovery ? "reset" : isForceReset ? "force_reset" : "login");

  // shared fields
  const [email, setEmail]             = useState("");
  const [password, setPassword]       = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName]       = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // ui state
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);
  const [success, setSuccess]         = useState(null);
  const [isDark, setIsDark]           = useState(() => localStorage.getItem("unified-theme") === "dark");
  const [mounted, setMounted]         = useState(false);

  useEffect(() => {
    const tm = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(tm);
  }, []);

  // Detect password reset token or error in URL on mount
  useEffect(() => {
    // Primary: listen for Supabase auth events (most reliable)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setView("reset");
        setError(null);
      }
    });

    // Fallback: check URL hash directly
    const hash = window.location.hash;
    if (hash.includes("type=invite")) {
      setView("invite");
    } else if (hash.includes("type=recovery")) {
      setView("reset");
    } else if (hash.includes("error=access_denied") && hash.includes("otp_expired")) {
      setView("forgot");
      setError("This reset link has expired. Please request a new one.");
    } else if (hash.includes("error=")) {
      setView("forgot");
      setError("Reset link is invalid or has already been used. Please request a new one.");
    }

    return () => subscription.unsubscribe();
  }, []);

  function switchView(v) {
    setView(v);
    setError(null);
    setSuccess(null);
    setPassword("");
    setConfirmPassword("");
  }

  // ── Handlers ──────────────────────────────────────────────────

  async function handleSignIn(e) {
    e.preventDefault();
    setLoading(true); setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setLoading(false);
  }

  async function handleSignUp(e) {
    e.preventDefault();
    if (password !== confirmPassword) { setError("Passwords don't match."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true); setError(null);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    // If email confirmation is disabled, session is returned immediately — sign in directly
    if (data.session) {
      // onAuthStateChange in main.jsx will pick up the session automatically
      return;
    }
    // Email confirmation required
    setSuccess("Account created! Check your email to confirm, then sign in.");
    setLoading(false);
  }

  async function handleForgotPassword(e) {
    e.preventDefault();
    setLoading(true); setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname,
    });
    if (error) { setError(error.message); }
    else { setSuccess("Password reset link sent — check your inbox."); }
    setLoading(false);
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    if (password !== confirmPassword) { setError("Passwords don't match."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true); setError(null);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { setError(error.message); }
    else {
      setSuccess("Password updated! Redirecting to sign in…");
      setTimeout(() => {
        window.location.hash = "";
        onPasswordReset();
        switchView("login");
      }, 2000);
    }
    setLoading(false);
  }

  async function handleAcceptInvite(e) {
    e.preventDefault();
    if (password !== confirmPassword) { setError("Passwords don't match."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true); setError(null);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { setError(error.message); setLoading(false); return; }
    setSuccess("Password set! Welcome to Unified Finance.");
    setTimeout(() => {
      window.location.hash = "";
      onPasswordReset();
      switchView("login");
    }, 1500);
    setLoading(false);
  }

  async function handleForceReset(e) {
    e.preventDefault();
    if (password !== confirmPassword) { setError("Passwords don't match."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true); setError(null);
    const { error } = await supabase.auth.updateUser({
      password,
      data: { force_password_reset: false },
    });
    if (error) { setError(error.message); }
    else {
      setSuccess("Password updated! Taking you in…");
      setTimeout(() => { onForceResetComplete(); }, 1500);
    }
    setLoading(false);
  }

  // ── Theme tokens ──────────────────────────────────────────────
  const bg        = isDark ? "#0A0A0F"              : "#F5F5FA";
  const surface   = isDark ? "rgba(28,28,36,0.95)"  : "rgba(255,255,255,0.92)";
  const panel     = isDark ? "rgba(18,18,26,0.98)"  : "rgba(248,248,255,0.95)";
  const text      = isDark ? "#F0F0F5"              : "#16161E";
  const textSub   = isDark ? "#9090A8"              : "#8E8E9E";
  const textMuted = isDark ? "#5A5A72"              : "#AEAEBE";
  const border    = isDark ? "rgba(255,255,255,0.07)": "rgba(0,0,0,0.07)";
  const inputBg   = isDark ? "rgba(255,255,255,0.04)": "rgba(0,0,0,0.03)";
  const accent    = "#0071E3";
  const accentGlow= isDark ? "rgba(0,113,227,0.35)" : "rgba(0,113,227,0.2)";

  const fadeUp = (delay = 0) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(20px)",
    transition: `opacity 0.6s ease ${delay}s, transform 0.6s cubic-bezier(0.34,1.2,0.64,1) ${delay}s`,
  });

  const inputStyle = {
    width: "100%", padding: "13px 16px",
    borderRadius: 12, border: `1.5px solid ${border}`,
    fontSize: 15, color: text,
    background: inputBg,
    outline: "none", boxSizing: "border-box",
    fontFamily: "inherit",
  };

  // ── Left panel content by view ────────────────────────────────
  function renderForm() {

    // ── Force password reset (temp password, first login) ──
    if (view === "force_reset") return (
      <div key="force_reset">
        <div style={{ marginBottom:28 }}>
          <div style={{ width:48, height:48, borderRadius:14, background:`${accent}18`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, marginBottom:16 }}>🔒</div>
          <h1 className="auth-heading" style={{ fontSize:28, fontWeight:800, letterSpacing:"-1px", color:text, margin:"0 0 8px", lineHeight:1.1 }}>
            Set your password
          </h1>
          <p style={{ fontSize:14, color:textSub, margin:0, lineHeight:1.6 }}>
            You're using a temporary password. Choose a new one to continue.
          </p>
        </div>
        <form onSubmit={handleForceReset}>
          <div style={{ marginBottom:16 }}>
            <label style={{ display:"block", fontSize:12, fontWeight:600, color:textSub, marginBottom:6, textTransform:"uppercase", letterSpacing:"0.05em" }}>New Password</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={6}
              placeholder="Min. 6 characters"
              className="auth-input"
              style={{ width:"100%", padding:"13px 16px", borderRadius:12, border:`1.5px solid ${border}`, background:inputBg, color:text, fontSize:15, outline:"none", fontFamily:"inherit", boxSizing:"border-box" }}
            />
          </div>
          <div style={{ marginBottom:24 }}>
            <label style={{ display:"block", fontSize:12, fontWeight:600, color:textSub, marginBottom:6, textTransform:"uppercase", letterSpacing:"0.05em" }}>Confirm Password</label>
            <input type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} required minLength={6}
              placeholder="Repeat password"
              className="auth-input"
              style={{ width:"100%", padding:"13px 16px", borderRadius:12, border:`1.5px solid ${border}`, background:inputBg, color:text, fontSize:15, outline:"none", fontFamily:"inherit", boxSizing:"border-box" }}
            />
          </div>
          {error   && <div style={{ background:"rgba(255,55,95,0.08)", border:"1px solid rgba(255,55,95,0.2)", borderRadius:10, padding:"10px 14px", marginBottom:18 }}><p style={{ fontSize:13, color:"#FF375F", margin:0 }}>{error}</p></div>}
          {success && <div style={{ background:"rgba(52,199,89,0.08)",  border:"1px solid rgba(52,199,89,0.2)",  borderRadius:10, padding:"10px 14px", marginBottom:18 }}><p style={{ fontSize:13, color:"#34C759",  margin:0 }}>{success}</p></div>}
          <button className="sign-btn" type="submit" disabled={loading}
            style={{ width:"100%", padding:"15px", background: loading ? textMuted : `linear-gradient(135deg, ${accent} 0%, #34AADC 100%)`, color:"white", border:"none", borderRadius:12, fontSize:15, fontWeight:700, cursor: loading ? "not-allowed" : "pointer", boxShadow: loading ? "none" : `0 4px 20px ${accentGlow}` }}>
            {loading ? "Saving…" : "Set Password & Continue →"}
          </button>
        </form>
      </div>
    );

    // ── Reset password ──
    if (view === "invite") return (
      <div key="invite">
        <p style={{ fontSize:14, color:textSub, marginBottom:24, lineHeight:1.6 }}>
          You've been invited to <strong style={{ color:text }}>Unified Finance</strong>. Set a password to activate your account.
        </p>
        <form onSubmit={handleAcceptInvite}>
          <div style={{ marginBottom:16 }}>
            <label style={{ display:"block", fontSize:12, fontWeight:600, color:textSub, marginBottom:6, textTransform:"uppercase", letterSpacing:"0.05em" }}>New Password</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={6}
              placeholder="Min. 6 characters"
              style={{ width:"100%", padding:"12px 14px", borderRadius:10, border:`1px solid ${border}`, background:inputBg, color:text, fontSize:14, outline:"none", fontFamily:"inherit", boxSizing:"border-box" }}
            />
          </div>
          <div style={{ marginBottom:20 }}>
            <label style={{ display:"block", fontSize:12, fontWeight:600, color:textSub, marginBottom:6, textTransform:"uppercase", letterSpacing:"0.05em" }}>Confirm Password</label>
            <input type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} required minLength={6}
              placeholder="Repeat password"
              style={{ width:"100%", padding:"12px 14px", borderRadius:10, border:`1px solid ${border}`, background:inputBg, color:text, fontSize:14, outline:"none", fontFamily:"inherit", boxSizing:"border-box" }}
            />
          </div>
          {error   && <p style={{ fontSize:13, color:"#FF375F", marginBottom:14 }}>{error}</p>}
          {success && <p style={{ fontSize:13, color:"#34C759", marginBottom:14 }}>{success}</p>}
          <button type="submit" disabled={loading}
            style={{ width:"100%", padding:"13px", borderRadius:10, background:`linear-gradient(135deg, ${accent}, #34AADC)`, color:"#fff", border:"none", fontSize:14, fontWeight:700, cursor:loading?"not-allowed":"pointer", opacity:loading?0.7:1, fontFamily:"inherit" }}>
            {loading ? "Activating…" : "Activate Account"}
          </button>
        </form>
      </div>
    );

    if (view === "reset") return (
      <div key="reset">
        <div style={{ marginBottom: 44, ...fadeUp(0.08) }}>
          <h1 className="auth-heading" style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-1.5px", color: text, margin: "0 0 10px", lineHeight: 1.1 }}>
            Set new<br/>password.
          </h1>
          <p style={{ fontSize: 15, color: textSub, margin: 0, lineHeight: 1.5 }}>
            Choose a strong password for your account.
          </p>
        </div>
        <form onSubmit={handleResetPassword}>
          <div style={{ marginBottom: 18, ...fadeUp(0.14) }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: textSub, display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.07em" }}>New Password</label>
            <div style={{ position: "relative" }}>
              <input className="auth-input" type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 6 characters" required style={{ ...inputStyle, paddingRight: 48 }}/>
              <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: textMuted, fontSize: 16, padding: 2 }}>{showPassword ? "🙈" : "👁"}</button>
            </div>
          </div>
          <div style={{ marginBottom: 28, ...fadeUp(0.18) }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: textSub, display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.07em" }}>Confirm Password</label>
            <div style={{ position: "relative" }}>
              <input className="auth-input" type={showConfirm ? "text" : "password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repeat password" required style={{ ...inputStyle, paddingRight: 48 }}/>
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: textMuted, fontSize: 16, padding: 2 }}>{showConfirm ? "🙈" : "👁"}</button>
            </div>
          </div>
          {error   && <div style={{ background:"rgba(255,55,95,0.08)", border:"1px solid rgba(255,55,95,0.2)", borderRadius:10, padding:"10px 14px", marginBottom:18 }}><p style={{ fontSize:13, color:"#FF375F", margin:0 }}>{error}</p></div>}
          {success && <div style={{ background:"rgba(52,199,89,0.08)",  border:"1px solid rgba(52,199,89,0.2)",  borderRadius:10, padding:"10px 14px", marginBottom:18 }}><p style={{ fontSize:13, color:"#34C759",  margin:0 }}>{success}</p></div>}
          <div style={fadeUp(0.22)}>
            <button className="sign-btn" type="submit" disabled={loading} style={{ width:"100%", padding:"15px", background: loading ? textMuted : `linear-gradient(135deg, ${accent} 0%, #34AADC 100%)`, color:"white", border:"none", borderRadius:12, fontSize:15, fontWeight:700, cursor: loading ? "not-allowed" : "pointer", boxShadow: loading ? "none" : `0 4px 20px ${accentGlow}` }}>
              {loading ? "Updating…" : "Update Password →"}
            </button>
          </div>
        </form>
      </div>
    );

    // ── Forgot password ──
    if (view === "forgot") return (
      <div key="forgot">
        <div style={{ marginBottom: 44, ...fadeUp(0.08) }}>
          <h1 className="auth-heading" style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-1.5px", color: text, margin: "0 0 10px", lineHeight: 1.1 }}>
            Forgot<br/>password?
          </h1>
          <p style={{ fontSize: 15, color: textSub, margin: 0, lineHeight: 1.5 }}>
            Enter your email and we'll send a reset link.
          </p>
        </div>
        <form onSubmit={handleForgotPassword}>
          <div style={{ marginBottom: 28, ...fadeUp(0.14) }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: textSub, display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.07em" }}>Email Address</label>
            <input className="auth-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required style={inputStyle}/>
          </div>
          {error   && <div style={{ background:"rgba(255,55,95,0.08)", border:"1px solid rgba(255,55,95,0.2)", borderRadius:10, padding:"10px 14px", marginBottom:18 }}><p style={{ fontSize:13, color:"#FF375F", margin:0 }}>{error}</p></div>}
          {success && <div style={{ background:"rgba(52,199,89,0.08)",  border:"1px solid rgba(52,199,89,0.2)",  borderRadius:10, padding:"10px 14px", marginBottom:18 }}><p style={{ fontSize:13, color:"#34C759",  margin:0 }}>{success}</p></div>}
          <div style={fadeUp(0.18)}>
            <button className="sign-btn" type="submit" disabled={loading} style={{ width:"100%", padding:"15px", background: loading ? textMuted : `linear-gradient(135deg, ${accent} 0%, #34AADC 100%)`, color:"white", border:"none", borderRadius:12, fontSize:15, fontWeight:700, cursor: loading ? "not-allowed" : "pointer", boxShadow: loading ? "none" : `0 4px 20px ${accentGlow}` }}>
              {loading ? "Sending…" : "Send Reset Link →"}
            </button>
          </div>
          <div style={{ marginTop: 20, textAlign: "center", ...fadeUp(0.22) }}>
            <button type="button" onClick={() => switchView("login")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: textSub, fontFamily: "inherit" }}>
              ← Back to sign in
            </button>
          </div>
        </form>
      </div>
    );

    // ── Sign up ──
    if (view === "signup") return (
      <div key="signup">
        <div style={{ marginBottom: 36, ...fadeUp(0.08) }}>
          <h1 className="auth-heading" style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-1.5px", color: text, margin: "0 0 10px", lineHeight: 1.1 }}>
            Create your<br/>account.
          </h1>
          <p style={{ fontSize: 15, color: textSub, margin: 0, lineHeight: 1.5 }}>
            Set up your account and create your first organisation.
          </p>
        </div>
        <form onSubmit={handleSignUp}>
          <div style={{ marginBottom: 16, ...fadeUp(0.12) }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: textSub, display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.07em" }}>Full Name</label>
            <input className="auth-input" type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Jane Smith" required style={inputStyle}/>
          </div>
          <div style={{ marginBottom: 16, ...fadeUp(0.15) }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: textSub, display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.07em" }}>Email Address</label>
            <input className="auth-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required style={inputStyle}/>
          </div>
          <div style={{ marginBottom: 16, ...fadeUp(0.18) }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: textSub, display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.07em" }}>Password</label>
            <div style={{ position: "relative" }}>
              <input className="auth-input" type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 6 characters" required style={{ ...inputStyle, paddingRight: 48 }}/>
              <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: textMuted, fontSize: 16, padding: 2 }}>{showPassword ? "🙈" : "👁"}</button>
            </div>
          </div>
          <div style={{ marginBottom: 24, ...fadeUp(0.21) }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: textSub, display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.07em" }}>Confirm Password</label>
            <div style={{ position: "relative" }}>
              <input className="auth-input" type={showConfirm ? "text" : "password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repeat password" required style={{ ...inputStyle, paddingRight: 48 }}/>
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: textMuted, fontSize: 16, padding: 2 }}>{showConfirm ? "🙈" : "👁"}</button>
            </div>
          </div>
          {error   && <div style={{ background:"rgba(255,55,95,0.08)", border:"1px solid rgba(255,55,95,0.2)", borderRadius:10, padding:"10px 14px", marginBottom:18 }}><p style={{ fontSize:13, color:"#FF375F", margin:0 }}>{error}</p></div>}
          {success && <div style={{ background:"rgba(52,199,89,0.08)",  border:"1px solid rgba(52,199,89,0.2)",  borderRadius:10, padding:"10px 14px", marginBottom:18 }}><p style={{ fontSize:13, color:"#34C759",  margin:0 }}>{success}</p></div>}
          <div style={fadeUp(0.24)}>
            <button className="sign-btn" type="submit" disabled={loading} style={{ width:"100%", padding:"15px", background: loading ? textMuted : `linear-gradient(135deg, ${accent} 0%, #34AADC 100%)`, color:"white", border:"none", borderRadius:12, fontSize:15, fontWeight:700, cursor: loading ? "not-allowed" : "pointer", boxShadow: loading ? "none" : `0 4px 20px ${accentGlow}` }}>
              {loading ? "Creating account…" : "Create Account →"}
            </button>
          </div>
          <div style={{ marginTop: 20, textAlign: "center", ...fadeUp(0.28) }}>
            <span style={{ fontSize: 13, color: textSub }}>Already have an account? </span>
            <button type="button" onClick={() => switchView("login")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: accent, fontWeight: 600, fontFamily: "inherit" }}>Sign in</button>
          </div>
        </form>
      </div>
    );

    // ── Login (default) ──
    return (
      <div key="login">
        <div style={{ marginBottom: 44, ...fadeUp(0.08) }}>
          <h1 className="auth-heading" style={{ fontSize: 38, fontWeight: 800, letterSpacing: "-1.5px", color: text, margin: "0 0 10px", lineHeight: 1.1 }}>
            Welcome<br/>back.
          </h1>
          <p style={{ fontSize: 15, color: textSub, margin: 0, lineHeight: 1.5 }}>
            Sign in to manage your organisation's<br/>finances and records.
          </p>
        </div>
        <form onSubmit={handleSignIn}>
          <div style={{ marginBottom: 18, ...fadeUp(0.14) }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: textSub, display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.07em" }}>Email Address</label>
            <input className="auth-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required style={inputStyle}/>
          </div>
          <div style={{ marginBottom: 10, ...fadeUp(0.18) }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: textSub, display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.07em" }}>Password</label>
            <div style={{ position: "relative" }}>
              <input className="auth-input" type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required style={{ ...inputStyle, paddingRight: 48 }}/>
              <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: textMuted, fontSize: 16, padding: 2 }}>{showPassword ? "🙈" : "👁"}</button>
            </div>
          </div>
          <div style={{ marginBottom: 24, textAlign: "right", ...fadeUp(0.2) }}>
            <button type="button" onClick={() => switchView("forgot")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: accent, fontFamily: "inherit", fontWeight: 500 }}>
              Forgot password?
            </button>
          </div>
          {error && <div style={{ background:"rgba(255,55,95,0.08)", border:"1px solid rgba(255,55,95,0.2)", borderRadius:10, padding:"10px 14px", marginBottom:18 }}><p style={{ fontSize:13, color:"#FF375F", margin:0 }}>{error}</p></div>}
          <div style={fadeUp(0.22)}>
            <button className="sign-btn" type="submit" disabled={loading} style={{ width:"100%", padding:"15px", background: loading ? textMuted : `linear-gradient(135deg, ${accent} 0%, #34AADC 100%)`, color:"white", border:"none", borderRadius:12, fontSize:15, fontWeight:700, cursor: loading ? "not-allowed" : "pointer", boxShadow: loading ? "none" : `0 4px 20px ${accentGlow}` }}>
              {loading ? "Signing in…" : "Sign In →"}
            </button>
          </div>
          <div style={{ marginTop: 20, textAlign: "center", ...fadeUp(0.26) }}>
            <span style={{ fontSize: 13, color: textSub }}>Don't have an account? </span>
            <button type="button" onClick={() => switchView("signup")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: accent, fontWeight: 600, fontFamily: "inherit" }}>Sign up</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div style={{ minHeight:"100vh", background: bg, display:"flex", fontFamily:"'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif", transition:"background 0.4s ease", overflow:"hidden" }}>
      <style>{`
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        @keyframes pulse-ring { 0%{opacity:0.6;transform:scale(1)} 100%{opacity:0;transform:scale(1.8)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        .auth-input:focus { border-color: ${accent} !important; box-shadow: 0 0 0 3px ${accentGlow} !important; }
        .auth-input { transition: border-color 0.2s, box-shadow 0.2s; }
        .sign-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 28px ${accentGlow} !important; }
        .sign-btn:active:not(:disabled) { transform: translateY(0); }
        .sign-btn { transition: all 0.2s cubic-bezier(0.34,1.56,0.64,1); }
        .feature-row:hover { background: ${isDark ? "rgba(255,255,255,0.04)" : "rgba(0,113,227,0.04)"} !important; }
        .feature-row { transition: background 0.2s; }
        .toggle-theme:hover { opacity: 0.8; }
        @media (max-width: 767px) {
          .auth-right { display: none !important; }
          .auth-left { width: 100% !important; min-width: 0 !important; padding: 32px 24px !important; border-right: none !important; box-shadow: none !important; }
          .auth-heading { font-size: 28px !important; letter-spacing: -1px !important; }
        }
      `}</style>

      {/* ── LEFT PANEL ─────────────────────────────────────────── */}
      <div className="auth-left" style={{ width:"42%", minWidth:420, background: surface, backdropFilter:"blur(40px)", borderRight:`1px solid ${border}`, display:"flex", flexDirection:"column", padding:"40px 52px", position:"relative", zIndex:2, boxShadow: isDark ? "4px 0 60px rgba(0,0,0,0.5)" : "4px 0 40px rgba(0,0,0,0.06)" }}>

        {/* Top bar */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: view === "signup" ? 32 : 60, ...fadeUp(0) }}>
          <div
            onClick={onGoHome || undefined}
            title={onGoHome ? "Back to home" : undefined}
            style={{ display:"flex", alignItems:"center", gap:10, cursor: onGoHome ? "pointer" : "default", userSelect:"none" }}>
            <div style={{ width:36, height:36, borderRadius:10, background:`linear-gradient(135deg, ${accent}, #34AADC)`, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:`0 4px 14px ${accentGlow}`, flexShrink:0, transition:"transform 0.15s, box-shadow 0.15s" }}
              onMouseEnter={e=>{ if(onGoHome){ e.currentTarget.style.transform="scale(1.08)"; e.currentTarget.style.boxShadow=`0 6px 20px ${accentGlow}`; }}}
              onMouseLeave={e=>{ e.currentTarget.style.transform="scale(1)"; e.currentTarget.style.boxShadow=`0 4px 14px ${accentGlow}`; }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 8h5M9 8h5M8 2v5M8 9v5" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
            </div>
            <div>
              <div style={{ fontSize:14, fontWeight:700, letterSpacing:"-0.3px", color:text }}>Unified</div>
              <div style={{ fontSize:10, color:textMuted, fontWeight:500, letterSpacing:"0.02em" }}>Finance</div>
            </div>
          </div>
          <button className="toggle-theme" onClick={() => { const n = !isDark; setIsDark(n); localStorage.setItem("unified-theme", n ? "dark" : "light"); }} style={{ background:"none", border:"none", cursor:"pointer", color:textSub, fontSize:18, padding:4, lineHeight:1 }} title="Toggle theme">
            {isDark ? "☀️" : "🌙"}
          </button>
        </div>

        {/* Form content */}
        <div style={{ flex:1 }}>
          {renderForm()}
        </div>

        {/* Footer */}
        <div style={{ marginTop: 24, ...fadeUp(0.32) }}>
          <p style={{ fontSize:12, color:textMuted, margin:0, textAlign:"center" }}>
            Secure access · Role-based permissions
          </p>
        </div>
      </div>

      {/* ── RIGHT PANEL ────────────────────────────────────────── */}
      <div className="auth-right" style={{ flex:1, background:panel, backdropFilter:"blur(20px)", display:"flex", flexDirection:"column", justifyContent:"center", padding:"60px 72px", position:"relative", overflow:"hidden" }}>

        {/* Ambient orbs */}
        <div style={{ position:"absolute", top:"-15%", right:"-10%", width:500, height:500, borderRadius:"50%", background:`radial-gradient(circle, ${isDark?"rgba(0,113,227,0.12)":"rgba(0,113,227,0.07)"} 0%, transparent 70%)`, pointerEvents:"none", animation:"float 8s ease-in-out infinite" }}/>
        <div style={{ position:"absolute", bottom:"-10%", left:"10%", width:400, height:400, borderRadius:"50%", background:`radial-gradient(circle, ${isDark?"rgba(52,199,89,0.08)":"rgba(52,199,89,0.05)"} 0%, transparent 70%)`, pointerEvents:"none", animation:"float 11s ease-in-out infinite reverse" }}/>
        <div style={{ position:"absolute", top:"40%", left:"-5%", width:300, height:300, borderRadius:"50%", background:`radial-gradient(circle, ${isDark?"rgba(191,90,242,0.06)":"rgba(191,90,242,0.04)"} 0%, transparent 70%)`, pointerEvents:"none", animation:"float 14s ease-in-out infinite" }}/>

        {/* Icon hero */}
        <div style={{ marginBottom:40, ...fadeUp(0.1) }}>
          <div style={{ position:"relative", display:"inline-block" }}>
            <div style={{ width:80, height:80, borderRadius:24, background:`linear-gradient(135deg, ${accent}22, ${accent}44)`, border:`1.5px solid ${accent}44`, display:"flex", alignItems:"center", justifyContent:"center", color:accent }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/><path d="M6 7h4M6 11h8"/><path d="M14 7l2 2-2 2"/>
              </svg>
            </div>
            <div style={{ position:"absolute", inset:-8, borderRadius:32, border:`1px solid ${accent}44`, animation:"pulse-ring 2.5s ease-out infinite", pointerEvents:"none" }}/>
          </div>
        </div>

        {/* Headline */}
        <div style={{ marginBottom:48, ...fadeUp(0.16) }}>
          <h2 style={{ fontSize:44, fontWeight:800, letterSpacing:"-2px", color:text, margin:"0 0 14px", lineHeight:1.08 }}>
            Financial clarity<br/>
            <span style={{ background:`linear-gradient(135deg, ${accent}, #34AADC)`, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>
              for your community.
            </span>
          </h2>
          <p style={{ fontSize:16, color:textSub, margin:0, lineHeight:1.6, maxWidth:380 }}>
            One place to track every contribution, manage every expense, and keep your organisation accountable.
          </p>
        </div>

        {/* Feature list */}
        <div style={{ display:"flex", flexDirection:"column", gap:6, maxWidth:420, ...fadeUp(0.22) }}>
          {features.map((f, i) => (
            <div key={f.title} className="feature-row" style={{ display:"flex", alignItems:"flex-start", gap:16, padding:"14px 16px", borderRadius:14, background:"transparent", opacity: mounted ? 1 : 0, transform: mounted ? "translateX(0)" : "translateX(-16px)", transition:`opacity 0.5s ease ${0.28 + i * 0.08}s, transform 0.5s cubic-bezier(0.34,1.2,0.64,1) ${0.28 + i * 0.08}s` }}>
              <div style={{ width:38, height:38, borderRadius:10, flexShrink:0, background:`linear-gradient(135deg, ${accent}18, ${accent}2A)`, border:`1px solid ${accent}30`, display:"flex", alignItems:"center", justifyContent:"center", color:accent }}>
                {f.icon}
              </div>
              <div>
                <p style={{ fontSize:14, fontWeight:700, color:text, margin:"0 0 2px", letterSpacing:"-0.2px" }}>{f.title}</p>
                <p style={{ fontSize:13, color:textSub, margin:0, lineHeight:1.4 }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom tag */}
        <div style={{ marginTop:48, ...fadeUp(0.6) }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:6, height:6, borderRadius:"50%", background:"#34C759", boxShadow:"0 0 6px #34C75988" }}/>
            <p style={{ fontSize:12, color:textMuted, margin:0, letterSpacing:"0.02em" }}>Secure · Role-based · Always up to date</p>
          </div>
        </div>
      </div>
    </div>
  );
}