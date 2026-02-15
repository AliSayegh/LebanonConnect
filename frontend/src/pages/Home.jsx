import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { api } from "../api";
import { useAuth } from "../auth/useAuth";
import Loader from "../components/Loader";
import { Link } from "react-router-dom";
import HeroCarousel from "../components/HeroCarousel";

const cities = ["Beirut", "Mount Lebanon", "Tripoli", "Saida", "Tyre", "Zahle"];

export default function Home({ notify }) {
  const { token } = useAuth();
  const client = useMemo(() => api(token), [token]);

  const [stats, setStats] = useState({
    totalProviders: null,
    verifiedProviders: null,
    cities: 6,
  });

  const [city, setCity] = useState("Beirut");
  const [verified, setVerified] = useState(false);
  const [sort, setSort] = useState("rating");
  const [page, setPage] = useState(1);

  const [data, setData] = useState({ items: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(false);

  // ✅ Reset page when filters change (so you don't land on empty page 3 etc.)
  useEffect(() => {
    setPage(1);
  }, [city, verified, sort]);

  const loadStats = useCallback(async () => {
    try {
      const totalRes = await client.get(
        `/api/providers/search?city=${encodeURIComponent(city)}&page=1&limit=1`,
      );

      const verRes = await client.get(
        `/api/providers/search?city=${encodeURIComponent(city)}&verified=true&page=1&limit=1`,
      );

      setStats({
        totalProviders: totalRes.data.total ?? 0,
        verifiedProviders: verRes.data.total ?? 0,
        cities: 6,
      });
    } catch {
      // ignore (don’t break UI)
    }
  }, [client, city]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        city,
        sort,
        page: String(page),
        limit: "12",
      });

      // ✅ ONLY send verified filter if enabled
      if (verified) qs.set("verified", "true");

      const res = await client.get(`/api/providers/search?${qs.toString()}`);
      setData(res.data);
    } catch (e) {
      notify?.(
        "error",
        "Failed to load providers",
        e?.response?.data?.message || e?.message || "Check backend is running",
      );
    } finally {
      setLoading(false);
    }
  }, [client, city, verified, sort, page, notify]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="home">
      <section className="homeHero">
        <div className="homeHeroBg" />
        <motion.div
          className="homeHeroInner"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <div className="kicker">Lebanon-first marketplace</div>
          <h1 className="heroTitle">
            Find trusted providers.
            <span className="heroAccent"> Chat inside the app.</span>
          </h1>
          <p className="heroSub">
            Electricians, plumbers, AC, carpentry and more — with secure
            job-based messaging (no WhatsApp).
          </p>

          <HeroCarousel stats={stats} />

          <div className="filters">
            <div className="field">
              <div className="fieldLabel">City</div>
              <select
                className="input"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              >
                {cities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <div className="fieldLabel">Sort</div>
              <select
                className="input"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="rating">Top rated</option>
                <option value="jobs">Most jobs</option>
                <option value="recent">Newest</option>
              </select>
            </div>

            <button
              className={verified ? "btn primary" : "btn ghost"}
              onClick={() => setVerified((v) => !v)}
              title="Show verified only"
            >
              {verified ? "Verified ✓" : "Verified only"}
            </button>
          </div>
        </motion.div>
      </section>

      <section className="homeBody">
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
                    <div className="statNum">
                      {(p.ratingAvg || 0).toFixed(1)}
                    </div>
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
                  {p.bio ||
                    "Professional provider. Fast response and reliable service."}
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
      </section>
    </div>
  );
}
