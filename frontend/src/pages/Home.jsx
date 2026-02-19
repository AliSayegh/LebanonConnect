import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { api } from "../api";
import { useAuth } from "../auth/useAuth";
import HeroCarousel from "../components/HeroCarousel";
import ServicesSection from "../components/ServicesSection";

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

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const scrollToServices = () => {
    const el = document.getElementById("services-anchor");
    el?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="home">
      {/* ✅ HERO SECTION */}
      <section className="heroMega">
        <HeroCarousel stats={stats} className="heroMegaCarousel" />
        <div className="heroMegaOverlay" />
        <motion.div
          className="heroMegaInner"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="heroMegaTop">
            <div className="heroMegaKicker">Lebanon-first marketplace</div>
            <div className="heroMegaChips">
              <span className="miniBadge">Verified providers</span>
              <span className="miniBadge">In-app secure chat</span>
              <span className="miniBadge">Fast booking</span>
            </div>
          </div>

          <h1 className="heroMegaTitle">
            Find trusted providers.
            <span> Hire with confidence.</span>
          </h1>

          <p className="heroMegaSub">
            Electricians, plumbers, AC, carpentry and more — with secure job-based
            messaging (no WhatsApp).
          </p>

          <div className="heroMegaActions">
            <button className="btn primary" onClick={scrollToServices}>
              Explore services
            </button>
          </div>
        </motion.div>
      </section>

      {/* ✅ NEW SERVICES SECTION */}
      <div id="services-anchor">
        <ServicesSection />
      </div>
    </div>
  );
}
