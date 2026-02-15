import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { api } from "../api";
import { useAuth } from "../auth/useAuth";

function PlanCard({ title, price, perks, active, onChoose }) {
  return (
    <motion.div
      className={`card planCard ${active ? "active" : ""}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
    >
      <div className="planTop">
        <div className="planTitle">{title}</div>
        <div className="planPrice">{price}</div>
      </div>

      <div className="planPerks">
        {perks.map((p, i) => (
          <div className="perk" key={i}>
            <span className="dot" /> {p}
          </div>
        ))}
      </div>

      <button className={active ? "btn ghost" : "btn primary"} onClick={onChoose}>
        {active ? "Current plan" : "Choose"}
      </button>
    </motion.div>
  );
}

export default function Subscribe({ notify }) {
  const { token, user } = useAuth();
  const client = useMemo(() => api(token), [token]);

  const [sub, setSub] = useState({ plan: "free", expiresAt: null });
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await client.get("/api/subscriptions/me");
      setSub(res.data.subscription || { plan: "free" });
    } catch (e) {
      notify?.("error", "Subscription", e?.response?.data?.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, []);

  const start = async (plan) => {
    try {
      const res = await client.post("/api/subscriptions/start", { plan });
      notify?.("success", "Activated", "Subscription activated ✅");
      setSub(res.data.subscription);
    } catch (e) {
      notify?.("error", "Cannot activate", e?.response?.data?.message || "Error");
    }
  };

  if (user?.role !== "provider") {
    return (
      <div className="page">
        <div className="card">
          <h2>Provider only</h2>
          <p className="muted">Subscriptions are for providers.</p>
        </div>
      </div>
    );
  }

  const expires = sub?.expiresAt ? new Date(sub.expiresAt).toLocaleString() : "—";

  return (
    <div className="page">
      <motion.div
        className="pageHead"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <div>
          <h1 className="h1">Subscription</h1>
          <p className="muted">Upgrade to accept unlimited jobs and get higher visibility.</p>
        </div>

        <div className="subInfo">
          <span className="pill">Plan: {sub?.plan || "free"}</span>
          <span className="pill">Expires: {expires}</span>
          {loading && <span className="pill">Loading…</span>}
        </div>
      </motion.div>

      <div className="gridPlans">
        <PlanCard
          title="Free"
          price="0$/month"
          active={sub?.plan === "free"}
          perks={[
            "Accept up to 3 jobs / month",
            "Basic listing visibility",
            "In-platform chat"
          ]}
          onChoose={() => notify?.("info", "Free", "Free plan is always available")}
        />

        <PlanCard
          title="Basic"
          price="5$/month"
          active={sub?.plan === "basic"}
          perks={[
            "Unlimited job accepts",
            "Higher ranking",
            "Priority support"
          ]}
          onChoose={() => start("basic")}
        />

        <PlanCard
          title="Pro"
          price="15$/month"
          active={sub?.plan === "pro"}
          perks={[
            "Top ranking boost",
            "Verified-style highlight",
            "Featured provider badge"
          ]}
          onChoose={() => start("pro")}
        />
      </div>

      <div className="card noteCard">
        <h3>Next upgrade</h3>
        <p className="muted">
          When you are ready to go live, we connect this screen to real payments (Stripe / local gateway) and
          auto-renew subscriptions.
        </p>
      </div>
    </div>
  );
}
