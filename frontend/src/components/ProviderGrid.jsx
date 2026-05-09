import Loader from "./Loader";
import ProviderCard from "./ProviderCard";

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
            <ProviderCard key={p.userId} p={p} idx={idx} />
          ))}
        </div>
      )}
    </div>
  );
}
