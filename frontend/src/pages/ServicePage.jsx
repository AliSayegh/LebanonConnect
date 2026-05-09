import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth/useAuth";
import ProviderGrid from "../components/ProviderGrid";
import { LEBANON_CITIES } from "../constants/lebanonCities";

const cities = LEBANON_CITIES;

export default function ServicePage({ notify }) {
  const { serviceType } = useParams();
  const { token } = useAuth();
  const client = useMemo(() => api(token), [token]);

  const [city, setCity] = useState("Beirut");
  const [verified, setVerified] = useState(false);
  const [sort, setSort] = useState("rating");
  const [page, setPage] = useState(1);

  const [data, setData] = useState({ items: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(false);

  // ✅ Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [city, verified, sort, serviceType]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        city,
        sort,
        page: String(page),
        limit: "12",
        serviceSlug: serviceType, // Using our new backend parameter
      });

      if (verified) qs.set("verified", "true");

      const res = await client.get(`/api/providers/search?${qs.toString()}`);
      setData(res.data);
    } catch (e) {
      notify?.(
        "error",
        "Failed to load providers",
        e?.response?.data?.message || e?.message || "Check backend is running"
      );
    } finally {
      setLoading(false);
    }
  }, [client, city, verified, sort, page, serviceType, notify]);

  useEffect(() => {
    load();
  }, [load]);

  const serviceNameDisplay = (serviceType || "").replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase());

  return (
    <div className="service-page container pad">
      <section className="service-header">
        <h1 className="heroMegaTitle">
          {serviceNameDisplay} <span>Providers</span>
        </h1>
        <p className="muted">Find the best {serviceNameDisplay.toLowerCase()} experts in {city}</p>

        <div className="heroMegaFilters" style={{ marginTop: "2rem" }}>
          <div className="field">
            <div className="fieldLabel">City</div>
            <select
              className="input"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            >
              <option value="">All Cities</option>
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
      </section>

      <div style={{ marginTop: "3rem" }}>
        <ProviderGrid 
          data={data} 
          loading={loading} 
          page={page} 
          setPage={setPage} 
        />
      </div>
    </div>
  );
}
