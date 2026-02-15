import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

export default function Register({ notify }) {
  const { register } = useAuth();
  const nav = useNavigate();

  const [role, setRole] = useState("customer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [city, setCity] = useState("Beirut");
  const [fullName, setFullName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;

    setBusy(true);
    try {
      const payload =
        role === "customer"
          ? { role, email, password, city, fullName: fullName || "Customer" }
          : { role, email, password, city, displayName: displayName || "Provider" };

      // ✅ IMPORTANT: capture returned data
      const data = await register(payload); // should return { token, user } or { user }

      notify?.("success", "Account created", "Welcome to ServiceHub ✅");

      const roleFromServer = data?.user?.role || role;

      if (roleFromServer === "provider") nav("/provider/setup");
      else nav("/dashboard");
    } catch (e2) {
      notify?.(
        "error",
        "Register failed",
        e2?.response?.data?.message || e2?.message || "Try another email"
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
          <div className="miniBadge">Premium look • Fast • Animated</div>
          <h1 className="h1">Create account</h1>
          <p className="muted">Choose role. Providers can monetize with subscriptions later.</p>
        </div>

        <form className="form" onSubmit={submit}>
          <div className="seg">
            <button
              type="button"
              className={role === "customer" ? "segBtn on" : "segBtn"}
              onClick={() => setRole("customer")}
            >
              Customer
            </button>
            <button
              type="button"
              className={role === "provider" ? "segBtn on" : "segBtn"}
              onClick={() => setRole("provider")}
            >
              Provider
            </button>
          </div>

          {role === "customer" ? (
            <>
              <label className="label">Full name</label>
              <input
                className="input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ali Sayegh"
                autoComplete="name"
              />
            </>
          ) : (
            <>
              <label className="label">Business / display name</label>
              <input
                className="input"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ali Electric"
              />
            </>
          )}

          <label className="label">City</label>
          <input
            className="input"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Beirut"
          />

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
            autoComplete="new-password"
          />

          <button className="btn primary full" disabled={busy}>
            {busy ? "Creating..." : "Create account"}
          </button>

          <p className="muted small">
            Already have an account?{" "}
            <Link to="/login" className="inlineLink">
              Login
            </Link>
          </p>
        </form>
      </motion.div>
    </div>
  );
}
