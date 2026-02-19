import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth/useAuth";
import ProviderCard from "./ProviderCard";
import Loader from "./Loader";

export default function FeaturedProviders() {
  const { token } = useAuth();
  const client = useMemo(() => api(token), [token]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFeatured() {
      try {
        const res = await client.get("/api/providers/featured");
        setProviders(res.data || []);
      } catch (err) {
        console.error("Failed to load featured providers", err);
      } finally {
        setLoading(false);
      }
    }
    loadFeatured();
  }, [client]);

  return (
    <section className="featured-section">
      <div className="container">
        <div className="section-header">
          <div className="miniBadge" style={{ marginBottom: "12px" }}>Top Rated</div>
          <h2 className="section-title">Featured <span>Providers</span></h2>
          <p className="section-subtitle">Work with the most trusted professionals in our community</p>
        </div>

        {loading ? (
          <div className="center pad">
            <Loader label="Finding the best professionals..." />
          </div>
        ) : (
          <>
            <div className="provider-grid featured-grid">
              {providers.map((p, idx) => (
                <ProviderCard key={p.userId} p={p} idx={idx} />
              ))}
            </div>
            
            <div className="section-footer center" style={{ marginTop: "3rem" }}>
              <Link to="/search" className="btn ghost">
                View all providers
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
