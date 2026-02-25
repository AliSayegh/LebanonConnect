import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { api } from "../api";
import { useAuth } from "../auth/useAuth";
import { Link } from "react-router-dom";

function StatCard({ label, value }) {
  return (
    <motion.div className="card statCard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="muted tiny">{label}</div>
      <div className="statValue">{value}</div>
    </motion.div>
  );
}

export default function Admin({ notify }) {
  const { token, user } = useAuth();
  const client = useMemo(() => api(token), [token]);

  const [stats, setStats] = useState(null);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const [a, b] = await Promise.all([
        client.get("/api/admin/stats"),
        client.get("/api/admin/providers?page=1&limit=30"),
      ]);

      setStats(a.data);
      setProviders(b.data.items || []);
    } catch (e) {
      notify?.("error", "Admin", e?.response?.data?.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, []);

  if (user?.role !== "admin") {
    return (
      <div className="page">
        <div className="card">
          <h2>Admin only</h2>
          <p className="muted">You don’t have access.</p>
        </div>
      </div>
    );
  }

  const subs = (stats?.subscriptions || []).reduce((acc, x) => {
    acc[x._id] = x.count;
    return acc;
  }, {});

  return (
    <div className="page">
      <motion.div className="pageHead" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div>
          <h1 className="h1">Admin Dashboard</h1>
          <p className="muted">Revenue, jobs, subscriptions, providers.</p>
        </div>
        <button className="btn ghost" onClick={load}>{loading ? "Refreshing…" : "Refresh"}</button>
      </motion.div>

      <div className="gridStats">
        <StatCard label="Total jobs" value={stats?.jobsTotal ?? "—"} />
        <StatCard label="Confirmed jobs" value={stats?.confirmedJobs ?? "—"} />
        <StatCard label="Revenue (commission)" value={`${(stats?.revenue ?? 0).toLocaleString()} LBP`} />
        <StatCard label="Subscriptions" value={`free ${subs.free || 0} • basic ${subs.basic || 0} • pro ${subs.pro || 0}`} />
      </div>

      <motion.div className="card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="tableHead">
          <h3>Providers</h3>
          <p className="muted tiny">Latest providers (profiles)</p>
        </div>

        <div className="table">
          <div className="tr th">
            <div>Name</div>
            <div>City</div>
            <div>Verified</div>
            <div>Plan</div>
            <div>Rating</div>
            <div>Profile</div>
          </div>

          {providers.map((p) => (
            <div className="tr" key={p._id}>
              <div className="mono">{p.displayName || "—"}</div>
              <div>{p.city || "—"}</div>
              <div>{p.isVerified ? "✅" : "—"}</div>
              <div>{p.subscription?.plan || "free"}</div>
              <div>{(p.ratingAvg || 0).toFixed(1)} ({p.ratingCount || 0})</div>
              <div>
      <Link to={`/provider/${p.userId}`} className="viewBtn">
  View
</Link>
    </div>
              
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
