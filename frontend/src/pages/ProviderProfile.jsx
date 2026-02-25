import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../api";
import { useAuth } from "../auth/useAuth";
import Loader from "../components/Loader";

function Stars({ value = 0 }) {
  const v = Math.max(0, Math.min(5, Number(value || 0)));
  const full = Math.floor(v);
  const half = v - full >= 0.5;

  return (
    <div className="ppStars">
      {Array.from({ length: 5 }).map((_, i) => {
        const idx = i + 1;
        const on = idx <= full || (idx === full + 1 && half);
        return (
          <span key={i} className={on ? "ppStar on" : "ppStar"}>
            ★
          </span>
        );
      })}
      <span className="ppStarNum">{v.toFixed(1)}</span>
    </div>
  );
}

function ReviewCard({ r }) {
  return (
    <motion.div
      className="ppReviewCard"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="ppReviewTop">
        <Stars value={r.rating} />
        <span className="pill mono">{new Date(r.createdAt).toLocaleDateString()}</span>
      </div>
      <div className="muted">{r.text || "—"}</div>
    </motion.div>
  );
}

export default function ProviderProfile({ notify }) {
  const { userId } = useParams();
  const nav = useNavigate();
  const { token, user } = useAuth();
  const client = useMemo(() => api(token), [token]);

  const [p, setP] = useState(null);
  const [loading, setLoading] = useState(true);

  // Reviews state
  const [revLoading, setRevLoading] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [revPage, setRevPage] = useState(1);
  const [revPages, setRevPages] = useState(1);

  // Fetch provider info (robust: tries with city, then without)
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);

        // 1) Try with a common city filter (fast)
        let res = await client.get(`/api/providers/search?city=Beirut&limit=200&page=1`);
        let found = (res.data.items || []).find((x) => String(x.userId) === String(userId));

        // 2) If not found, retry without city filter (you must support it OR ignore city on backend)
        if (!found) {
          res = await client.get(`/api/providers/search?limit=300&page=1`);
          found = (res.data.items || []).find((x) => String(x.userId) === String(userId));
        }

        if (!found) {
          throw new Error("Provider not found.");
        }

         if (alive) {
        
        setP({ ...found, strike: Number(found.strike || 0) });
      }
      } catch (e) {
        const msg = e?.response?.data?.message || e?.message || "Not found";
        notify?.("error", "Provider load failed", msg);
        if (alive) setP(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [userId, client, notify]);

  // Fetch reviews (public)
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setRevLoading(true);
        const res = await client.get(`/api/reviews/provider/${userId}?page=${revPage}&limit=6`);
        if (!alive) return;

        setReviews(res.data.items || []);
        setRevPages(res.data.pages || 1);
      } catch (e) {
        const msg = e?.response?.data?.message || e?.message || "Error loading reviews";
        notify?.("error", "Reviews load failed", msg);
        if (!alive) {
          return;
        }
        setReviews([]);
        setRevPages(1);
      } finally {
        if (alive) setRevLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [userId, revPage, client, notify]);

  const startRequest = () => {
    if (!token) return nav("/login");
    if (user?.role !== "customer") {
      return notify?.("info", "Customer only", "Only customers can request jobs.");
    }
    nav(`/create?providerId=${userId}`);
  };

  if (loading) {
    return (
      <div className="page">
        <div className="card pad">
          <Loader label="Loading provider..." />
        </div>
      </div>
    );
  }

  if (!p) {
    return (
      <div className="page">
        <div className="card pad">
          <h2 className="h2">Provider not found</h2>
          <p className="muted">
            This provider may not appear in the current filters. Try opening from Explore again.
          </p>
          <div style={{ marginTop: 12 }}>
            <button className="btn ghost" onClick={() => nav("/")}>
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // admin functions

  const handleDelete = async () => {
  if (!window.confirm("Are you sure you want to delete this provider?")) return;

  try {
    await client.delete(`/api/admin/provider/${userId}`);
    notify?.("success", "Deleted", "Provider deleted successfully");
    nav("/");
  } catch (e) {
    notify?.("error", "Error", "Failed to delete provider");
  }
};

const handleVerify = async () => {
  try {
    const res = await client.patch(`/api/admin/provider/${userId}/verify`);
    setP(res.data);
    notify?.("success", "Verified", "Provider verified");
  } catch {
    notify?.("error", "Error", "Verification failed");
  }
};

const handleUnverify = async () => {
  try {
    const res = await client.patch(`/api/admin/provider/${userId}/unverify`);
    setP(res.data);
    notify?.("success", "Updated", "Verification removed");
  } catch {
    notify?.("error", "Error", "Operation failed");
  }
};

const handleAddStrike = async () => {
  if (!p) return;
  const currentStrike = Number(p.strike || 0);
  if (currentStrike >= 3) return;

  // Optimistic UI update
  setP(prev => ({ ...prev, strike: currentStrike + 1 }));

  try {
    const res = await client.patch(`/api/admin/provider/${userId}/strike/add`);
    const updatedStrike = Number(res.data.strike ?? currentStrike + 1);
    setP(prev => ({ ...prev, ...res.data, strike: updatedStrike }));
    notify?.("success", "Strike added");
  } catch {
    // rollback
    setP(prev => ({ ...prev, strike: currentStrike }));
    notify?.("error", "Error", "Cannot add strike");
  }
};

const handleRemoveStrike = async () => {
  if (!p) return;
  const currentStrike = Number(p.strike || 0);
  if (currentStrike <= 0) return;

  setP(prev => ({ ...prev, strike: currentStrike - 1 }));

  try {
    const res = await client.patch(`/api/admin/provider/${userId}/strike/remove`);
    const updatedStrike = Number(res.data.strike ?? currentStrike - 1);
    setP(prev => ({ ...prev, ...res.data, strike: updatedStrike }));
    notify?.("success", "Strike removed");
  } catch {
    setP(prev => ({ ...prev, strike: currentStrike }));
    notify?.("error", "Error", "Cannot remove strike");
  }
};

function Strikes({ count = 0, max = 3 }) {
  const c = Number(count || 0);
  return (
    <div className="strikeContainer">
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} className={`strikeCircle ${i < c ? "filled" : ""}`} />
      ))}
    </div>
  );
}
  return (
    <div className="page">
      {user?.role === "admin" && (
  <div className="adminPanel">
    <div className="adminTitle">Admin Controls </div>

    <div className="adminActions">
      <button className="btn danger" onClick={handleDelete}>
        Delete Provider
      </button>

      {!p.isVerified ? (
        <button className="btn success" onClick={handleVerify}>
          Verify
        </button>
      ) : (
        <button className="btn ghost" onClick={handleUnverify}>
          Remove Verification
        </button>
      )}

     <button
  className="btn warning"
  disabled={p.strike >= 3}
  onClick={handleAddStrike}
>
  + Add Strike
</button>

<button
  className="btn ghost"
  onClick={handleRemoveStrike}
>
  - Remove Strike
</button>
    </div>

  <div className="strike counter">
  Current Strikes: <Strikes count={p.strike} max={3} />
  
</div>
  </div>
)}
      <motion.div
        className="card profileCard"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        {/* --- Provider header --- */}
        <div className="profileTop">
          <div className="avatar xl">{p.displayName?.slice(0, 1)?.toUpperCase()}</div>

          <div className="profileMeta">
            <div className="profileName">
              {p.displayName} {p.isVerified && <span className="badge">Verified</span>}
            </div>

            <div className="muted">
              {p.city} • {p.addressArea || "Area"}
            </div>

            <div className="profileStats">
              <span className="pill">
                ⭐ {(p.ratingAvg || 0).toFixed(1)} ({p.ratingCount || 0})
              </span>
              <span className="pill">{p.completedJobsCount || 0} jobs</span>
            </div>
          </div>
        </div>

        <div className="bio big">
          {p.bio || "Professional provider with fast response and high-quality service."}
        </div>

        <div className="split">
          <div className="miniCard">
            <div className="miniTitle">Pricing</div>
            <div className="miniVal">{p.pricingType?.toUpperCase() || "QUOTE"}</div>
            <div className="muted small">Base: {p.basePrice || 0}</div>
          </div>

          <div className="miniCard">
            <div className="miniTitle">Safety</div>
            <div className="miniVal">{p.isVerified ? "VERIFIED" : "STANDARD"}</div>
            <div className="muted small">Chat inside app</div>
          </div>
        </div>

        <div className="cardActions">
          <button className="btn primary" onClick={startRequest}>
            Request a job
          </button>
          <button className="btn ghost" onClick={() => nav("/")}>
            Back
          </button>
        </div>

        {/* --- Reviews section --- */}
        <div className="ppReviewsSection">
          <div className="ppReviewsHead">
            <div>
              <div className="ppReviewsTitle">Customer Reviews</div>
              <div className="muted small">
                {p.ratingCount || 0} reviews • average {(p.ratingAvg || 0).toFixed(1)}
              </div>
            </div>

            <div className="ppPager">
              <button
                className="btn ghost sm"
                disabled={revPage <= 1 || revLoading}
                onClick={() => setRevPage((x) => Math.max(1, x - 1))}
              >
                Prev
              </button>

              <span className="pill mono">
                {revPage} / {revPages}
              </span>

              <button
                className="btn ghost sm"
                disabled={revPage >= revPages || revLoading}
                onClick={() => setRevPage((x) => Math.min(revPages, x + 1))}
              >
                Next
              </button>
            </div>
          </div>

          {revLoading ? (
            <div className="ppReviewsGrid">
              <div className="ppReviewCard">
                <div className="skeletonLine" />
                <div className="skeletonLine short" />
              </div>
              <div className="ppReviewCard">
                <div className="skeletonLine" />
                <div className="skeletonLine short" />
              </div>
            </div>
          ) : reviews.length === 0 ? (
            <div className="ppEmptyReviews">
              <div className="muted">
                No reviews yet. Reviews appear after customers confirm a job and submit feedback.
              </div>
            </div>
          ) : (
            <div className="ppReviewsGrid">
              {reviews.map((r) => (
                <ReviewCard key={r._id} r={r} />
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* Local styles */}
      <style>{`
        .profileCard{ padding: 18px !important; border-radius: 22px; }
        .ppReviewsSection{
          margin-top: 18px;
          padding-top: 16px;
          border-top: 1px solid rgba(255,255,255,.10);
        }
        .ppReviewsHead{
          display:flex;
          align-items:flex-end;
          justify-content:space-between;
          gap: 12px;
          margin-bottom: 12px;
        }
        .ppReviewsTitle{
          font-weight: 900;
          font-size: 16px;
        }
        .ppPager{
          display:flex;
          align-items:center;
          gap: 10px;
          flex-wrap: wrap;
          justify-content:flex-end;
        }
        .ppReviewsGrid{
          display:grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }
        @media(max-width:900px){
          .ppReviewsGrid{ grid-template-columns: 1fr; }
        }
        .ppReviewCard{
          padding: 14px;
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(0,0,0,.18);
        }
        .ppReviewTop{
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap: 10px;
          margin-bottom: 10px;
        }
        .ppEmptyReviews{
          padding: 14px;
          border-radius: 18px;
          border: 1px dashed rgba(255,255,255,.14);
          background: rgba(0,0,0,.10);
        }
        .ppStars{
          display:flex;
          align-items:center;
          gap: 6px;
        }
        .ppStar{
          font-size: 16px;
          color: rgba(255,255,255,.22);
        }
        .ppStar.on{
          color: var(--accent2);
        }
        .ppStarNum{
          font-weight: 900;
          margin-left: 6px;
        }
      `}</style>
    </div>
  );
}
