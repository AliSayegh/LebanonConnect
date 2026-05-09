import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { cities, getAreaByCity } from "../constants/locations";
import { validateStrongPassword, validateEmail } from "../constants/validation";
import CustomSelect from "../components/CustomSelect";

export default function Register({ notify }) {
  const { register } = useAuth();
  const nav = useNavigate();

  const [role, setRole] = useState("customer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [fullName, setFullName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;

    const nextErrors = {};
    if (!city?.trim()) nextErrors.city = "City is required.";
    else if (!getAreaByCity(city)) nextErrors.city = "Please select a valid Lebanese city.";

    const emailErr = validateEmail(email);
    if (emailErr) nextErrors.email = emailErr;

    const pwErr = validateStrongPassword(password);
    if (pwErr) nextErrors.password = pwErr;

    if (role === "customer" && !fullName.trim()) nextErrors.fullName = "Full name is required.";
    if (role === "provider" && !displayName.trim())
      nextErrors.displayName = "Business / display name is required.";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      notify?.("error", "Fix the highlighted fields", "Please review the form and try again.");
      return;
    }

    setBusy(true);
    try {
      const payload =
        role === "customer"
          ? { role, email, password, city, fullName: fullName || "Customer" }
          : { role, email, password, city, displayName: displayName || "Provider" };
      payload.district = district || getAreaByCity(city);

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
                className={errors.fullName ? "input inputErr" : "input"}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ali Sayegh"
                autoComplete="name"
              />
              {errors.fullName && <div className="fieldErr">{errors.fullName}</div>}
            </>
          ) : (
            <>
              <label className="label">Business / display name</label>
              <input
                className={errors.displayName ? "input inputErr" : "input"}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ali Electric"
              />
              {errors.displayName && <div className="fieldErr">{errors.displayName}</div>}
            </>
          )}

          <label className="label">City</label>
          <div className={errors.city ? "inputErrWrap" : ""}>
            <CustomSelect
              value={city}
              onChange={(v) => {
                setCity(v);
                setDistrict(getAreaByCity(v));
              }}
              options={cities}
              placeholder="Select city…"
              ariaLabel="City"
            />
          </div>
          {errors.city && <div className="fieldErr">{errors.city}</div>}

          <label className="label">District</label>
          <input className="input" value={district} disabled placeholder="Auto-filled" />

          <label className="label">Email</label>
          <input
            className={errors.email ? "input inputErr" : "input"}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors((p) => ({ ...p, email: null }));
            }}
            onBlur={() => {
              const err = validateEmail(email);
              if (err) setErrors((p) => ({ ...p, email: err }));
            }}
            placeholder="you@email.com"
            autoComplete="email"
          />
          {errors.email && <div className="fieldErr">{errors.email}</div>}

          <label className="label">Password</label>
          <input
            className={errors.password ? "input inputErr" : "input"}
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
          />
          {errors.password && <div className="fieldErr">{errors.password}</div>}

          <label className="rowCheck">
            <input
              type="checkbox"
              checked={showPassword}
              onChange={(e) => setShowPassword(e.target.checked)}
            />
            Show password
          </label>

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

      <style>{`
        .fieldErr{ margin-top: 6px; font-size: 12px; font-weight: 700; color: rgba(255,120,120,.95); }
        .inputErr{ border-color: rgba(255,120,120,.55) !important; box-shadow: 0 0 0 3px rgba(255,120,120,.10) !important; }
        .inputErrWrap .csSelect{ border-color: rgba(255,120,120,.55) !important; box-shadow: 0 0 0 3px rgba(255,120,120,.10) !important; }
        .rowCheck{ display:flex; align-items:center; gap:10px; margin-top: 10px; font-size: 13px; color: rgba(255,255,255,.78); user-select:none; }
        .rowCheck input{ width: 16px; height: 16px; }
      `}</style>
    </div>
  );
}
