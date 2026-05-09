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

  useEffect(() => {
    load();
  }, [load]);

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

  return (
    <div className="page">
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

      <div className="gridJobs">
        {loading && (
          <div className="card">
            <div className="skeletonLine" />
            <div className="skeletonLine short" />
          </div>
        )}

        {empty && (
          <div className="card">
            <h3>No jobs yet</h3>
            <p className="muted">
              Create a job request or wait for customers to request you.
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
                  <button
                    className="btn primary"
                    onClick={() => acceptJob(job._id)}
                  >
                    Accept
                  </button>
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

      <style>{`
        .gridJobs {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 16px;
          margin-top: 20px;
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
      `}</style>
    </div>
  );
}
