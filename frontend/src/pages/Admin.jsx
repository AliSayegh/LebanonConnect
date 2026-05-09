import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../api";
import { useAuth } from "../auth/useAuth";
import { Link, useNavigate } from "react-router-dom";

function Modal({ open, title, children, onClose }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="modalOverlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div className="modalCard" initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={(e) => e.stopPropagation()}>
            <div className="modalHead">
              <h3 className="h3">{title}</h3>
              <button className="btn ghost" style={{ padding: "0 8px" }} onClick={onClose}>✕</button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

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
  const [showBanned, setShowBanned] = useState(false);
  const nav = useNavigate();

  const [strikeOpen, setStrikeOpen] = useState(false);
  const [strikeTarget, setStrikeTarget] = useState(null);
  const [strikeReason, setStrikeReason] = useState("");
  const [strikeLoading, setStrikeLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const [res, provRes] = await Promise.all([
        client.get("/api/admin/stats"),
        client.get(`/api/admin/providers?showBanned=${showBanned}`)
      ]);
      setStats(res.data);
      setProviders(provRes.data.items || []);
    } catch (e) {
      notify?.("error", "Admin", e?.response?.data?.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, [showBanned]);

  const openStrikeModal = (userId) => {
    setStrikeTarget(userId);
    setStrikeReason("");
    setStrikeOpen(true);
  };

  const submitStrike = async () => {
    if (!strikeReason.trim()) return notify?.("error", "Error", "Reason is required");
    try {
      setStrikeLoading(true);
      await client.patch(`/api/admin/provider/${strikeTarget}/strike/add`, { reason: strikeReason });
      notify?.("success", "Strike Issued", "Provider has been given a strike.");
      setStrikeOpen(false);
      load();
    } catch (e) {
      notify?.("error", "Error", e?.response?.data?.message || "Failed to issue strike");
    } finally {
      setStrikeLoading(false);
    }
  };

  const openSupportChat = async (userId) => {
    try {
      const { data } = await client.post(`/api/admin/provider/${userId}/chat`);
      nav(`/chat/${data.jobId}`);
    } catch (e) {
      notify?.("error", "Chat Error", e?.response?.data?.message || "Could not open chat");
    }
  };

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
          <p className="muted">Platform health, activity, and provider management.</p>
        </div>
        <button className="btn ghost" onClick={load}>{loading ? "Refreshing…" : "Refresh"}</button>
      </motion.div>

      <div className="gridStats">
        <StatCard label="Total users" value={stats?.totalUsers ?? "—"} />
        <StatCard label="Total providers" value={stats?.totalProviders ?? "—"} />
        <StatCard label="Total services" value={stats?.totalServices ?? "—"} />
        <StatCard label="Completed jobs" value={stats?.completedJobsTotal ?? "—"} />
        <StatCard label="Total jobs" value={stats?.jobsTotal ?? "—"} />
        <StatCard label="Confirmed jobs" value={stats?.confirmedJobs ?? "—"} />
        <StatCard label="Revenue (commission)" value={`${(stats?.revenue ?? 0).toLocaleString()} LBP`} />
        <StatCard label="Subscriptions" value={`free ${subs.free || 0} • basic ${subs.basic || 0} • pro ${subs.pro || 0}`} />
      </div>

      <motion.div className="card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="tableHead" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3>Providers</h3>
            <p className="muted tiny">Latest providers (profiles)</p>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input 
              type="checkbox" 
              checked={showBanned} 
              onChange={(e) => setShowBanned(e.target.checked)} 
              style={{ accentColor: "var(--accent2)" }}
            />
            <span className="muted small">Show Banned Users</span>
          </label>
        </div>

        <div className="table">
          <div className="tr th" style={{ gridTemplateColumns: "1.5fr 1fr 1fr 1fr 1fr 2fr" }}>
            <div>Name</div>
            <div>City</div>
            <div>Verified</div>
            <div>Strikes</div>
            <div>Rating</div>
            <div>Actions</div>
          </div>

          {providers.map((p) => (
            <div className="tr" key={p._id} style={{ gridTemplateColumns: "1.5fr 1fr 1fr 1fr 1fr 2fr" }}>
              <div className="mono" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {p.displayName || "—"}
                {(p.strike >= 3 || p.isActive === false) && (
                  <span style={{ fontSize: "10px", padding: "2px 6px", background: "var(--accent2)", color: "black", borderRadius: "4px", fontWeight: "bold" }}>BANNED</span>
                )}
              </div>
              <div>{p.city || "—"}</div>
              <div>{p.isVerified ? "✅" : "—"}</div>
              <div>
                <span className="pill warn">{p.strike || 0}/3</span>
              </div>
              <div>{(p.ratingAvg || 0).toFixed(1)} ({p.ratingCount || 0})</div>
              <div style={{ display: "flex", gap: "8px" }}>
                <Link to={`/provider/${p.userId}`} className="btn ghost" style={{ padding: "4px 10px", fontSize: "12px", minHeight: "28px", height: "auto" }}>
                  View
                </Link>
                <button onClick={() => openSupportChat(p.userId)} className="btn primary" style={{ padding: "4px 10px", fontSize: "12px", minHeight: "28px", height: "auto" }}>
                  Chat
                </button>
                <button onClick={() => openStrikeModal(p.userId)} className="btn primary" style={{ padding: "4px 10px", fontSize: "12px", minHeight: "28px", height: "auto", background: "rgba(255,80,80,0.2)", color: "#ff8080" }}>
                  Strike
                </button>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      <Modal open={strikeOpen} title="Issue a Strike" onClose={() => setStrikeOpen(false)}>
        <div style={{ padding: 24 }}>
          <p className="muted" style={{ marginBottom: 16 }}>
            Strikes warn the provider about community guidelines violations. 3 strikes result in an automatic, permanent ban.
          </p>
          <label className="label">Reason for strike *</label>
          <textarea
            className="input"
            rows={4}
            value={strikeReason}
            onChange={(e) => setStrikeReason(e.target.value)}
            placeholder="Describe the violation..."
          />
          <div style={{ display: "flex", gap: 12, marginTop: 24, justifyContent: "flex-end" }}>
            <button className="btn ghost" onClick={() => setStrikeOpen(false)}>Cancel</button>
            <button className="btn primary" onClick={submitStrike} disabled={strikeLoading}>
              {strikeLoading ? "Issuing..." : "Submit Strike"}
            </button>
          </div>
        </div>
      </Modal>

      <style>{`
        .gridStats{
          display:grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 14px;
        }
        @media(max-width: 980px){ .gridStats{ grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @media(max-width: 520px){ .gridStats{ grid-template-columns: 1fr; } }
        .statCard{ padding: 14px !important; border-radius: 18px; }
        .statValue{ font-size: 28px; font-weight: 900; margin-top: 6px; }
      `}</style>
    </div>
  );
}
