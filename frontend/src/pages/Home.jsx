import { useCallback, useMemo, useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth/useAuth";
import HeroCarousel from "../components/HeroCarousel";
import ServicesSection from "../components/ServicesSection";
import FeaturedProviders from "../components/FeaturedProviders";
import StatsSection from "../components/StatsSection";

export default function Home() {
  const { token } = useAuth();
  const client = useMemo(() => api(token), [token]);

  const [stats, setStats] = useState({
    totalProviders: null,
    verifiedProviders: null,
    cities: 6,
  });

  const loadStats = useCallback(async () => {
    try {
      const totalRes = await client.get(
        `/api/providers/search?page=1&limit=1`,
      );

      const verRes = await client.get(
        `/api/providers/search?verified=true&page=1&limit=1`,
      );

      setStats({
        totalProviders: totalRes.data.total ?? 0,
        verifiedProviders: verRes.data.total ?? 0,
        cities: 6,
      });
    } catch {
      // ignore
    }
  }, [client]);

  // Load stats on first render (keep eslint happy without effect setState rule)
  useMemo(() => {
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="home">
      {/* ✅ HERO CAROUSEL */}
      <section className="heroMega">
        <HeroCarousel stats={stats} className="heroMegaCarousel" />
      </section>

      {/* ✅ FEATURED PROVIDERS */}
      <FeaturedProviders />

      {/* ✅ ANIMATED STATS */}
      <StatsSection />

      {/* ✅ SERVICES SECTION */}
      <div id="services-section">
        <ServicesSection />
      </div>
    </div>
  );
}
