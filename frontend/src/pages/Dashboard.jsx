import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../api";
import { useAuth } from "../auth/useAuth";
import CustomSelect from "../components/CustomSelect";

function StatusBadge({ status }) {
  const s = status || "open";
  return <span className={`statusBadge ${s}`}>{s.toUpperCase()}</span>;
}

function Money({ n }) {
  const v = Number(n || 0);
  return <span className="mono">{v.toLocaleString()} LBP</span>;
}

function Modal({ open, title, children, onClose }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modalOverlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={onClose}
        >
          <motion.div
            className="modalCard"
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.98 }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="modalHead">
              <div className="modalTitle">{title}</div>
              <button className="btn ghost sm" onClick={onClose}>
                Close
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function Dashboard({ notify }) {
  const { token, user } = useAuth();
  const client = useMemo(() => api(token), [token]);
  const nav = useNavigate();

  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState([]);

  const [providerProfile, setProviderProfile] = useState(null);
  const [strikePopupOpen, setStrikePopupOpen] = useState(false);
  const [latestStrikeReason, setLatestStrikeReason] = useState("");

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmJob, setConfirmJob] = useState(null);
  const [finalPrice, setFinalPrice] = useState("");

  const [reportOpen, setReportOpen] = useState(false);
  const [reportJob, setReportJob] = useState(null);
  const [reportType, setReportType] = useState("");
  const [reportDetails, setReportDetails] = useState("");

  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewJob, setReviewJob] = useState(null);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");

  // Admin-only: reports list
  const [reports, setReports] = useState([]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await client.get("/api/jobs/mine?page=1&limit=50");
      setJobs(res.data.items || []);
    } catch (e) {
      notify?.(
        "error",
        "Dashboard failed",
        e?.response?.data?.message || "Server error",
      );
    } finally {
      setLoading(false);
    }
  }, [client, notify]);

  const loadProviderData = useCallback(async () => {
    if (user?.role !== "provider") return;
    try {
      const [profileRes, strikesRes] = await Promise.all([
        client.get("/api/providers/me"),
        client.get("/api/providers/me/strikes")
      ]);
      setProviderProfile(profileRes.data.provider);
      
      const unread = strikesRes.data.strikes;
      if (unread && unread.length > 0) {
        setLatestStrikeReason(unread[unread.length - 1].reason);
        setStrikePopupOpen(true);
      }
    } catch (e) {
      console.error("Provider data load error", e);
    }
  }, [client, user]);

  // Load reports for admin
  const loadReports = useCallback(async () => {
    if (user?.role !== "admin") return;
    try {
      const res = await client.get("/api/reports");
      setReports(res.data || []);
    } catch (e) {
      console.error("Reports load error", e);
    }
  }, [client, user]);

  useEffect(() => {
    load();
    loadProviderData();
    loadReports();
  }, [load, loadProviderData, loadReports]);

  const updateReportStatus = async (reportId, newStatus) => {
    try {
      await client.patch(`/api/reports/${reportId}/status`, { status: newStatus });
      notify?.("success", "Updated", `Report marked as ${newStatus}`);
      setReports((prev) => prev.map((r) => r._id === reportId ? { ...r, status: newStatus } : r));
    } catch (e) {
      notify?.("error", "Error", e?.response?.data?.message || "Failed to update report");
    }
  };

  const acceptJob = async (jobId) => {
    try {
      await client.patch(`/api/jobs/${jobId}/accept`);
      notify?.("success", "Accepted", "Job accepted ✅");
      load();
    } catch (e) {
      notify?.("error", "Cannot accept", e?.response?.data?.message || "Error");
    }
  };

  const completeJob = async (jobId) => {
    try {
      await client.patch(`/api/jobs/${jobId}/complete`);
      notify?.("success", "Completed", "Marked completed ✅");
      load();
    } catch (e) {
      notify?.(
        "error",
        "Cannot complete",
        e?.response?.data?.message || "Error",
      );
    }
  };

  const openConfirm = (job) => {
    setConfirmJob(job);
    setFinalPrice(String(job.finalPrice || job.quotedPrice || ""));
    setConfirmOpen(true);
  };

  const confirmJobDone = async () => {
    try {
      const price = Number(finalPrice);
      if (!price || price <= 0)
        return notify?.("error", "Invalid price", "Enter final price");
      await client.patch(`/api/jobs/${confirmJob._id}/confirm`, {
        finalPrice: price,
      });
      notify?.("success", "Confirmed", "Job confirmed ✅");
      setConfirmOpen(false);
      setConfirmJob(null);
      load();
    } catch (e) {
      notify?.(
        "error",
        "Cannot confirm",
        e?.response?.data?.message || "Error",
      );
    }
  };

  const openReview = (job) => {
    setReviewJob(job);
    setRating(5);
    setReviewText("");
    setReviewOpen(true);
  };

  const submitReview = async () => {
    try {
      await client.post("/api/reviews", {
        jobId: reviewJob._id,
        rating,
        text: reviewText,
      });
      notify?.("success", "Review added", "Thanks ✅");
      setReviewOpen(false);
      setReviewJob(null);
      load();
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        "Server error";
      notify?.("error", "Review failed", msg);
    }
  };

  const submitReport = async () => {
  try {
    if (!reportType) {
      return notify?.(
        "error",
        "Missing type",
        "Please select a report type"
      );
    }

    if (!reportJob) return;

    // determine who is being reported
    const reportedUserId =
      user?.role === "customer"
        ? reportJob.providerId
        : reportJob.customerId;

    await client.post("/api/reports", {
      reportedUserId,
      jobId: reportJob._id,
      type: reportType,
      details: reportDetails,
    });

    notify?.("success", "Report submitted", "We will review it.");

    setReportOpen(false);
    setReportJob(null);
    setReportType("");
    setReportDetails("");

  } catch (e) {
    notify?.(
      "error",
      "Report failed",
      e?.response?.data?.message || "Server error"
    );
  }
};

  const empty = !loading && jobs.length === 0;
  const [dashTab, setDashTab] = useState("jobs");

  return (
    <div className="page" style={{ alignItems: 'flex-start', padding: '28px 24px' }}>
      <motion.div
        className="pageHead"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <div>
          <h1 className="h1">Dashboard</h1>
          <p className="muted">
            Manage your jobs, status, and chat — all inside ServiceHub.
          </p>
        </div>

        {user?.role === "customer" && (
          <button className="btn primary" onClick={() => nav("/create")}>
            Request Job
          </button>
        )}
        {user?.role === "provider" && (
          <button className="btn ghost" onClick={() => nav("/subscribe")}>
            Subscription
          </button>
        )}
      </motion.div>

      {/* Tab Bar */}
      {user?.role === "admin" && (
        <div className="dashTabs">
          <button
            className={`dashTab ${dashTab === "jobs" ? "active" : ""}`}
            onClick={() => setDashTab("jobs")}
          >My Jobs</button>
          <button
            className={`dashTab ${dashTab === "reports" ? "active" : ""}`}
            onClick={() => setDashTab("reports")}
          >Reports{reports.length > 0 ? ` (${reports.length})` : ""}</button>
        </div>
      )}

      {/* Jobs Tab */}
      {dashTab === "jobs" && (
      <div className="gridJobs">
        {loading && (
          <div className="card">
            <div className="skeletonLine" />
            <div className="skeletonLine short" />
          </div>
        )}

        {empty && (
          <div className="card" style={{ padding: 32, textAlign: 'center', gridColumn: '1 / -1' }}>
            <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.6 }}>📋</div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: 20 }}>No data available</h3>
            <p className="muted" style={{ maxWidth: 360, margin: '0 auto' }}>
              {user?.role === 'customer'
                ? 'You haven\'t requested any jobs yet. Click "Request Job" to get started.'
                : 'No job requests have been received yet. They will appear here once a customer sends one.'}
            </p>
          </div>
        )}

        {(jobs || []).map((job) => {
          const status = job.status || "open";

          return (
            <motion.div
              key={job._id}
              className="card jobCard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="jobTop">
                <div className="jobTitleRow">
                  <div className="jobTitle">{job.title || "Job request"}</div>
                  <StatusBadge status={status} />
                </div>
                <div className="jobMeta">
                  <span className="pill">{job.city}</span>
                  <span className="pill">{job.addressArea || "—"}</span>
                  <span className="pill mono">
                    {new Date(job.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="jobBody">
                <div className="muted">
                  {job.description || "No description"}
                </div>

                <div className="jobMoneyRow">
                  <div>
                    <div className="muted tiny">Quoted</div>
                    <Money n={job.quotedPrice} />
                  </div>
                  <div>
                    <div className="muted tiny">Final</div>
                    <Money n={job.finalPrice} />
                  </div>
                  <div>
                    <div className="muted tiny">Commission</div>
                    <Money n={job?.commission?.amount} />
                  </div>
                </div>
              </div>

              <div className="jobActions">
                <Link className="btn ghost" to={`/chat/${job._id}`}>
                  Open Chat
                </Link>

                {user?.role === "customer"  && (
                  <button
                    className="btn report"
                    onClick={() => {
                          setReportJob(job);
                         setReportOpen(true);
                        }}
                  >
                    Report
                  </button>
                )}

                {user?.role === "provider" && status === "open" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1 }}>
                    <button
                      className="btn primary"
                      disabled={!providerProfile?.isVerified}
                      onClick={() => acceptJob(job._id)}
                      style={{ width: "100%" }}
                    >
                      Accept
                    </button>
                    {!providerProfile?.isVerified && (
                      <span className="muted tiny" style={{ textAlign: "center", color: "var(--accent2)" }}>
                        You must be verified by admin to accept jobs.
                      </span>
                    )}
                  </div>
                )}

                {user?.role === "provider" && status === "accepted" && (
                  <button
                    className="btn primary"
                    onClick={() => completeJob(job._id)}
                  >
                    Mark Completed
                  </button>
                )}

                {user?.role === "customer" && status === "completed" && (
                  <button
                    className="btn primary"
                    onClick={() => openConfirm(job)}
                  >
                    Confirm
                  </button>
                )}

                {user?.role === "customer" && status === "confirmed" && (
                  <button
                    className="btn primary"
                    onClick={() => openReview(job)}
                  >
                    Leave Review
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
      )}

      {/* Reports Tab (admin only) */}
      {dashTab === "reports" && user?.role === "admin" && (
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginTop: 24, width: "100%" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <h3 style={{ margin: 0, fontWeight: 900, fontSize: 20 }}>Reports</h3>
              <p className="muted tiny" style={{ marginTop: 4 }}>User-submitted reports ({reports.length} total)</p>
            </div>
            <button className="btn ghost" onClick={loadReports} style={{ fontSize: 13 }}>Refresh</button>
          </div>

          <div className="table">
            <div className="tr th" style={{ gridTemplateColumns: "1.2fr 1.2fr 0.9fr 2fr 0.8fr 1.2fr" }}>
              <div>Reporter</div>
              <div>Reported User</div>
              <div>Type</div>
              <div>Details</div>
              <div>Status</div>
              <div>Actions</div>
            </div>

            {reports.length === 0 && (
              <div style={{ padding: 32, textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.6 }}>📭</div>
                <h3 style={{ margin: '0 0 8px 0', fontSize: 18 }}>No reports</h3>
                <p className="muted">No reports have been submitted yet.</p>
              </div>
            )}

            {reports.map((r) => (
              <div className="tr" key={r._id} style={{ gridTemplateColumns: "1.2fr 1.2fr 0.9fr 2fr 0.8fr 1.2fr" }}>
                <div className="mono" style={{ fontSize: 13 }}>
                  {r.reporterId?.name || r.reporterId?.email || "—"}
                </div>
                <div className="mono" style={{ fontSize: 13 }}>
                  {r.reportedUserId?.name || r.reportedUserId?.email || "—"}
                </div>
                <div>
                  <span className="pill" style={{ fontSize: 11, textTransform: "capitalize" }}>{(r.type || "—").replace("_", " ")}</span>
                </div>
                <div className="muted" style={{ fontSize: 13, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  {r.details || "—"}
                </div>
                <div>
                  <span className={`reportStatus ${r.status}`}>{(r.status || "open").toUpperCase()}</span>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {r.status !== "reviewing" && (
                    <button
                      className="btn ghost"
                      style={{ padding: "4px 10px", fontSize: 12, minHeight: 28, height: "auto" }}
                      onClick={() => updateReportStatus(r._id, "reviewing")}
                    >Reviewing</button>
                  )}
                  {r.status !== "closed" && (
                    <button
                      className="btn ghost"
                      style={{ padding: "4px 10px", fontSize: 12, minHeight: 28, height: "auto", background: "rgba(60,255,120,0.1)", color: "#80ffaa" }}
                      onClick={() => updateReportStatus(r._id, "closed")}
                    >Close</button>
                  )}
                  {r.status === "closed" && (
                    <button
                      className="btn ghost"
                      style={{ padding: "4px 10px", fontSize: 12, minHeight: 28, height: "auto" }}
                      onClick={() => updateReportStatus(r._id, "open")}
                    >Reopen</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Confirm Modal */}
      <Modal
        open={confirmOpen}
        title="Confirm completion"
        onClose={() => setConfirmOpen(false)}
      >
        <div className="modalBody">
          <p className="muted">
            Enter the final price you paid. This confirms the job and calculates
            commission.
          </p>

          <label className="field">
            <div className="label">Final price (LBP)</div>
            <input
              value={finalPrice}
              onChange={(e) => setFinalPrice(e.target.value)}
              placeholder="e.g. 500000"
              className="input"
            />
          </label>

          <div className="rowEnd">
            <button className="btn ghost" onClick={() => setConfirmOpen(false)}>
              Cancel
            </button>
            <button className="btn primary" onClick={confirmJobDone}>
              Confirm
            </button>
          </div>
        </div>
      </Modal>

      {/* Review Modal */}
      <Modal
        open={reviewOpen}
        title="Leave a review"
        onClose={() => setReviewOpen(false)}
      >
        <div className="modalBody">
          <label className="field">
            <div className="label">Rating</div>
            <div className="starsRow">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  className={n <= rating ? "star on" : "star"}
                  onClick={() => setRating(n)}
                  type="button"
                >
                  ★
                </button>
              ))}
            </div>
          </label>

          <label className="field">
            <div className="label">Review (optional)</div>
            <textarea
              className="input"
              rows={4}
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="How was the service?"
            />
          </label>

          <div className="rowEnd">
            <button className="btn ghost" onClick={() => setReviewOpen(false)}>
              Cancel
            </button>
            <button className="btn primary" onClick={submitReview}>
              Submit
            </button>
          </div>
        </div>
      </Modal>
       {/* Report Modal */}
      <Modal
        open={reportOpen}
        title="Leave a report"
        onClose={() => setReportOpen(false)}
      >
        <div className="modalBody">
  <p className="muted">
    Please select the reason for reporting this user.
  </p>

  <label className="field">
    <div className="label">Report Type *</div>
    <CustomSelect
      value={reportType}
      onChange={(v) => setReportType(v)}
      options={[
        { value: "phone_share", label: "Phone number sharing" },
        { value: "scam", label: "Scam / Fraud" },
        { value: "abuse", label: "Abusive behavior" },
        { value: "spam", label: "Spam" },
      ]}
      placeholder="Select type"
      ariaLabel="Report type"
    />
  </label>

  <label className="field">
    <div className="label">Details (optional)</div>
    <textarea
      className="input"
      rows={4}
      value={reportDetails}
      onChange={(e) => setReportDetails(e.target.value)}
      placeholder="Describe what happened..."
    />
  </label>

  <div className="rowEnd">
    <button
      className="btn ghost"
      onClick={() => setReportOpen(false)}
    >
      Cancel
    </button>
    <button
      className="btn primary"
      onClick={submitReport}
    >
      Submit Report
    </button>
  </div>
</div>
</Modal>
      {/* Strike Modal */}
      <Modal open={strikePopupOpen} title="⚠️ Strike Received" onClose={() => setStrikePopupOpen(false)}>
        <div className="modalBody">
          <p className="muted" style={{ marginBottom: 16 }}>
            You have received a strike from an administrator. 
            Accumulating 3 strikes will result in a permanent ban.
          </p>
          <div style={{ padding: 16, background: "rgba(255,80,80,0.1)", border: "1px solid rgba(255,80,80,0.3)", borderRadius: 12 }}>
            <span style={{ color: "#ff8080", fontWeight: "bold" }}>Reason: </span>
            <span>{latestStrikeReason}</span>
          </div>
          <div className="rowEnd" style={{ marginTop: 24 }}>
            <button className="btn primary" onClick={() => setStrikePopupOpen(false)}>I Understand</button>
          </div>
        </div>
      </Modal>

      <style>{`
        .dashTabs {
          display: flex;
          gap: 4px;
          padding: 4px;
          background: rgba(255,255,255,.06);
          border-radius: 14px;
          margin-bottom: 8px;
          width: fit-content;
        }
        .dashTab {
          padding: 8px 20px;
          border-radius: 10px;
          border: none;
          background: transparent;
          color: rgba(255,255,255,.5);
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .dashTab:hover {
          color: rgba(255,255,255,.8);
          background: rgba(255,255,255,.04);
        }
        .dashTab.active {
          background: rgba(212,160,23,.15);
          color: var(--accent2);
          border: 1px solid rgba(212,160,23,.3);
        }
        .gridJobs {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-top: 20px;
        }
        @media (max-width: 1024px) {
          .gridJobs { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 640px) {
          .gridJobs { grid-template-columns: 1fr; }
        }
        .jobCard {
          display: flex;
          flex-direction: column;
          padding: 18px;
          transition: transform 0.2s ease, border-color 0.2s ease;
        }
        .jobCard:hover {
          border-color: rgba(212,160,23,.35);
        }
        .jobTop {
          border-bottom: 1px solid rgba(255,255,255,.08);
          padding-bottom: 12px;
          margin-bottom: 12px;
        }
        .jobTitleRow {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .jobTitle {
          font-weight: 900;
          font-size: 18px;
        }
        .jobMeta {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .jobBody {
          flex: 1;
        }
        .jobMoneyRow {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-top: 16px;
          padding: 12px;
          background: rgba(0,0,0,.25);
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,.08);
        }
        .jobActions {
          display: flex;
          gap: 10px;
          margin-top: 16px;
        }
        .jobActions .btn {
          flex: 1;
          display: grid;
          place-items: center;
          text-align: center;
        }
        .statusBadge {
          padding: 4px 8px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
        }
        .statusBadge.open { background: rgba(212,160,23,.2); color: var(--accent2); border: 1px solid rgba(212,160,23,.4); }
        .statusBadge.accepted { background: rgba(60,180,255,.2); color: #80cfff; border: 1px solid rgba(60,180,255,.4); }
        .statusBadge.completed { background: rgba(60,255,120,.2); color: #80ffaa; border: 1px solid rgba(60,255,120,.4); }
        .statusBadge.confirmed { background: rgba(180,60,255,.2); color: #d480ff; border: 1px solid rgba(180,60,255,.4); }
        .reportStatus{
          padding: 3px 8px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
        }
        .reportStatus.open{ background: rgba(255,180,60,.15); color: #ffb83c; border: 1px solid rgba(255,180,60,.35); }
        .reportStatus.reviewing{ background: rgba(60,180,255,.15); color: #80cfff; border: 1px solid rgba(60,180,255,.35); }
        .reportStatus.closed{ background: rgba(60,255,120,.15); color: #80ffaa; border: 1px solid rgba(60,255,120,.35); }
      `}</style>
    </div>
  );
}
