import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

export default function Login({ notify }) {
  const { login } = useAuth();
  const nav = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;

    setBusy(true);
    try {
      // ✅ IMPORTANT: capture returned data
      const data = await login(email, password); // should return { token, user } or { user }

      notify?.("success", "Logged in", "Welcome back ✅");

      const roleFromServer = data?.user?.role;

      if (roleFromServer === "provider") nav("/provider/setup");
      else nav("/dashboard");
    } catch (e2) {
      notify?.(
        "error",
        "Login failed",
        e2?.response?.data?.message || e2?.message || "Invalid credentials"
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <div className="heroGlow" />
      <motion.div
        className="card authCard"
        initial={{ opacity: 0, y: 22, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45 }}
      >
        <div className="authHeader">
          <div className="miniBadge">Secure • Real-time • Lebanon</div>
          <h1 className="h1">Sign in</h1>
          <p className="muted">Chat inside the platform — no phone numbers.</p>
        </div>

        <form className="form" onSubmit={submit}>
          <label className="label">Email</label>
          <input
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            autoComplete="email"
          />

          <label className="label">Password</label>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
          />

          <button className="btn primary full" disabled={busy}>
            {busy ? "Signing in..." : "Sign in"}
          </button>

          <p className="muted small">
            No account?{" "}
            <Link to="/register" className="inlineLink">
              Create one
            </Link>
          </p>
        </form>
      </motion.div>
    </div>
  );
}
