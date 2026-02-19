import { motion } from "framer-motion";
import { Link } from "react-router-dom";

export default function ProviderCard({ p, idx = 0 }) {
  return (
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
  );
}
