import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import Loader from "./Loader";

export default function ProviderGrid({ data, loading, page, setPage }) {
  return (
    <div className="provider-grid-container">
      <div className="homeTopRow">
        <div className="muted">
          Showing <b>{data.items.length}</b> of <b>{data.total}</b>
        </div>

        <div className="pager">
          <button
            className="btn ghost"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            ← Prev
          </button>

          <div className="pill">
            Page {page} / {data.pages || 1}
          </div>

          <button
            className="btn ghost"
            onClick={() => setPage((p) => Math.min(data.pages || 1, p + 1))}
            disabled={page >= (data.pages || 1)}
          >
            Next →
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card pad">
          <Loader label="Loading providers..." />
        </div>
      ) : (
        <div className="grid">
          {data.items.length === 0 && (
            <div className="muted pad tall center">No providers found matching these filters.</div>
          )}
          {data.items.map((p, idx) => (
            <motion.div
              key={p.userId}
              className="providerCard"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.25,
                delay: Math.min(idx * 0.03, 0.25),
              }}
            >
              <div className="providerTop">
                <div className="avatar">
                  {(p.displayName || "P").slice(0, 1).toUpperCase()}
                </div>
                <div className="providerMeta">
                  <div className="providerName">
                    {p.displayName || "Provider"}
                    {p.isVerified && <span className="badge">Verified</span>}
                  </div>
                  <div className="muted small">
                    {p.city} • {p.addressArea || "Area"}
                  </div>
                </div>
              </div>

              <div className="statsRow">
                <div className="stat">
                  <div className="statNum">{(p.ratingAvg || 0).toFixed(1)}</div>
                  <div className="statLab">rating</div>
                </div>
                <div className="stat">
                  <div className="statNum">{p.ratingCount || 0}</div>
                  <div className="statLab">reviews</div>
                </div>
                <div className="stat">
                  <div className="statNum">{p.completedJobsCount || 0}</div>
                  <div className="statLab">jobs</div>
                </div>
              </div>

              <div className="bio">
                {p.bio || "Professional provider. Fast response and reliable service."}
              </div>

              <div className="cardActions">
                <Link className="btn ghost" to={`/provider/${p.userId}`}>
                  View profile
                </Link>
                <Link className="btn primary" to={`/provider/${p.userId}`}>
                  Request
                </Link>
              </div>

              <div className="shine" />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
