import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { api } from "../api";
import { useAuth } from "../auth/useAuth";

/* ── custom hook: animate a number from 0 → target ── */
function useCountUp(target, duration = 2000, started = false) {
  const [value, setValue] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!started || target == null) return;
    const start = performance.now();

    function tick(now) {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      const eased = t * (2 - t); // ease‑out quadratic
      setValue(eased * target);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration, started]);

  return value;
}

/* ── format helpers ── */
const fmtInt = (n) => Math.round(n).toLocaleString("en-US");
const fmtDec = (n) => n.toFixed(1);

/* ── stat config: maps API keys → labels + icons ── */
const STATS = [
  { key: "totalUsers",      label: "Registered Users",   icon: "/stats-icons/users.svg" },
  { key: "totalProviders",  label: "Active Providers",    icon: "/stats-icons/providers.svg" },
  { key: "completedJobs",   label: "Completed Jobs",      icon: "/stats-icons/jobs.svg" },
  { key: "averageRating",   label: "Average Rating",      icon: "/stats-icons/rating.svg",   decimal: true },
  { key: "totalReviews",    label: "Client Reviews",      icon: "/stats-icons/reviews.svg" },
  { key: "totalCategories", label: "Service Categories",  icon: "/stats-icons/categories.svg" },
];

/* ── single animated card ── */
function StatCard({ stat, value, started }) {
  const count = useCountUp(value ?? 0, 2000, started);
  const display = stat.decimal ? fmtDec(count) : fmtInt(count);

  return (
    <div className="platform-stat-card">
      <div className="platform-stat-icon-wrap">
        <img src={stat.icon} alt={stat.label} className="platform-stat-icon" />
      </div>
      <span className="platform-stat-number">{display}{stat.decimal ? " ★" : "+"}</span>
      <span className="platform-stat-label">{stat.label}</span>
    </div>
  );
}

/* ── main section ── */
export default function StatsSection() {
  const { token } = useAuth();
  const client = useMemo(() => api(token), [token]);

  const [data, setData] = useState(null);
  const [started, setStarted] = useState(false);
  const sectionRef = useRef(null);

  /* fetch stats */
  useEffect(() => {
    async function load() {
      try {
        const res = await client.get("/api/platform/stats");
        setData(res.data);
      } catch (err) {
        console.error("Failed to load platform stats", err);
      }
    }
    load();
  }, [client]);

  /* Intersection Observer — trigger animation once */
  const observerCb = useCallback((entries) => {
    if (entries[0].isIntersecting) setStarted(true);
  }, []);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(observerCb, {
      threshold: 0.2,
      rootMargin: "0px",
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [observerCb]);

  return (
    <section className="platform-stats" ref={sectionRef}>
      <div className="container">
        <div className="section-header">
          <div className="miniBadge" style={{ marginBottom: "12px" }}>Platform Highlights</div>
          <h2 className="section-title">Our <span>Numbers</span></h2>
          <p className="section-subtitle">
            Real statistics from our growing community of professionals and clients
          </p>
        </div>

        <div className="platform-stats-grid">
          {STATS.map((stat) => (
            <StatCard
              key={stat.key}
              stat={stat}
              value={data ? data[stat.key] : 0}
              started={started && data != null}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
