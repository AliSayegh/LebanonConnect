import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../api";
import { useAuth } from "../auth/useAuth";
import ProviderGrid from "../components/ProviderGrid";

export default function Search({ notify }) {
  const { token } = useAuth();
  const client = useMemo(() => api(token), [token]);
  const [sp] = useSearchParams();

  const query = (sp.get("q") || "").trim();

  const [sort] = useState("rating");
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [query]);

  const load = useCallback(async () => {
    if (!query) {
      setData({ items: [], total: 0, pages: 1 });
      return;
    }

    setLoading(true);
    try {
      const qs = new URLSearchParams({
        q: query,
        sort,
        page: String(page),
        limit: "12",
      });
      const res = await client.get(`/api/providers/search?${qs.toString()}`);
      setData(res.data);
    } catch (e) {
      notify?.(
        "error",
        "Search failed",
        e?.response?.data?.message || e?.message || "Backend error"
      );
    } finally {
      setLoading(false);
    }
  }, [client, notify, page, query, sort]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="service-page container pad">
      <section className="service-header">
        <h1 className="heroMegaTitle">
          Search <span>Results</span>
        </h1>
        <p className="muted">
          {query ? (
            <>
              Showing matches for <span className="mono">{query}</span>
            </>
          ) : (
            "Enter a search term in the navbar to find providers and services."
          )}
        </p>
      </section>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: "2rem" }}>
        <ProviderGrid data={data} loading={loading} page={page} setPage={setPage} />
      </motion.div>
    </div>
  );
}

